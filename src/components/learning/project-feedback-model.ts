import type { Project, ProjectExercise } from '../../domain/types';
import type { AIProvider, MentorRequest, MentorResponse } from '../../services/contracts';
import { buildMentorBody } from '../../services/mentor-contract';

/** Typing updates this tiny session buffer, never the persisted learning store. */
export function createProjectDraftBuffer() {
  let draft: { exerciseId: string; value: Partial<Project> } | null = null;
  return {
    record(exerciseId: string, value: Partial<Project>) {
      draft = { exerciseId, value: { ...value } };
    },
    read(exerciseId: string, fallback: Partial<Project>) {
      return { ...(draft?.exerciseId === exerciseId ? draft.value : fallback) };
    },
    commit(
      exerciseId: string,
      fallback: Partial<Project>,
      write: (value: Partial<Project>) => void,
    ) {
      const value = { ...(draft?.exerciseId === exerciseId ? draft.value : fallback) };
      write(value);
      return value;
    },
  };
}
export interface ProjectFeedbackInput {
  lessonId: string;
  lessonTitle: string;
  exercise: ProjectExercise;
  answer: Partial<Project>;
}
export interface ProjectFeedbackSnapshot {
  lessonId: string;
  exerciseId: string;
  question: string;
  fields: readonly { label: string; value: string; excerpt: boolean }[];
  request: MentorRequest;
}
export function prepareProjectFeedback(input: ProjectFeedbackInput): ProjectFeedbackSnapshot {
  const project: Partial<Project> = {};
  const fields = input.exercise.fields.map((field) => {
    const typed = String(input.answer[field.key] ?? '');
    const value = typed.slice(0, 3000);
    project[field.key] = value;
    return Object.freeze({ label: field.label, value, excerpt: typed.length > value.length });
  });
  const focus = input.lessonId.startsWith('define')
    ? 'evidence'
    : input.lessonId.startsWith('validate')
      ? 'validation'
      : input.lessonId.startsWith('ship')
        ? 'pitch'
        : /^(scope|prototype|build)/.test(input.lessonId)
          ? 'scope'
          : 'problem';
  // Public question/context only. No expected answer, explanation, hint, or notebook extras.
  const question = input.exercise.prompt.slice(0, 600);
  const prompt = [
    'Give advisory feedback on this learner draft, not a grade. One short observation and one concrete next step. Never award points or claim pass/fail.',
    'Lesson: ' + input.lessonTitle.slice(0, 120),
    'Question: ' + question,
    input.exercise.context ? 'Public context: ' + input.exercise.context.slice(0, 400) : '',
    'The attached fields are ONLY the learner responses shown for this question.',
  ]
    .filter(Boolean)
    .join('\n');
  const request: MentorRequest = Object.freeze({
    prompt,
    project: Object.freeze(project),
    focus,
    history: Object.freeze([]),
    intent: 'answer',
    attachProject: true,
    allowRemote: false,
  });
  buildMentorBody(request);
  return Object.freeze({
    lessonId: input.lessonId,
    exerciseId: input.exercise.id,
    question,
    fields: Object.freeze(fields),
    request,
  });
}
export interface ProjectFeedbackState {
  snapshot: ProjectFeedbackSnapshot | null;
  consent: boolean;
  busy: boolean;
  result: MentorResponse | null;
  error: string | null;
}
const empty = (): ProjectFeedbackState => ({
  snapshot: null,
  consent: false,
  busy: false,
  result: null,
  error: null,
});
export function createProjectFeedback(provider: AIProvider, timeoutMs = 30000) {
  let state = empty();
  const listeners = new Set<() => void>();
  let active: { cancel: () => void } | null = null;
  let disposed = false;
  const publish = (next: ProjectFeedbackState) => {
    state = next;
    if (!disposed) listeners.forEach((fn) => fn());
  };
  const invalidate = () => {
    active?.cancel();
    if (state.snapshot || state.error || state.result) publish(empty());
  };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    requestReview(input: ProjectFeedbackInput) {
      if (disposed || active) return false;
      try {
        publish({ ...empty(), snapshot: prepareProjectFeedback(input), consent: true });
        return true;
      } catch {
        publish({
          ...empty(),
          error: 'This answer is too long for one review. Your full draft stays here.',
        });
        return false;
      }
    },
    decline() {
      if (!active) publish({ ...state, consent: false });
    },
    approve(): Promise<'answered' | 'failed' | 'cancelled' | 'ignored'> {
      if (disposed || active || !state.consent || !state.snapshot)
        return Promise.resolve('ignored');
      const snapshot = state.snapshot;
      const controller = new AbortController();
      return new Promise((resolve) => {
        const finish = (outcome: 'answered' | 'failed' | 'cancelled', result?: MentorResponse) => {
          if (active !== operation) return;
          clearTimeout(timer);
          active = null;
          if (outcome !== 'answered') controller.abort();
          publish({
            snapshot,
            consent: false,
            busy: false,
            result: result ?? null,
            error:
              outcome === 'failed'
                ? 'Ami feedback isn’t available right now. Your draft stays here; try the local hint.'
                : null,
          });
          resolve(outcome);
        };
        const operation = { cancel: () => finish('cancelled') };
        active = operation;
        const timer = setTimeout(() => finish('failed'), timeoutMs);
        publish({ ...state, consent: false, busy: true, result: null, error: null });
        Promise.resolve()
          .then(() =>
            controller.signal.aborted
              ? null
              : provider.review({ ...snapshot.request, allowRemote: true }, controller.signal),
          )
          .then(
            (result) => {
              if (result && !controller.signal.aborted)
                finish(
                  result.mode === 'live' ? 'answered' : 'failed',
                  result.mode === 'live' ? result : undefined,
                );
            },
            () => finish('failed'),
          );
      });
    },
    invalidate,
    cancel() {
      active?.cancel();
      if (state.consent) publish({ ...state, consent: false });
    },
    dispose() {
      disposed = true;
      listeners.clear();
      active?.cancel();
      state = empty();
    },
  };
}
