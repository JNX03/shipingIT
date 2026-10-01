import {
  auditStudyHints,
  checkStudyAnswer,
  hintContainsAnswer,
  normalizeStudyDraft,
  studyGoals,
  STUDY_INPUT_LIMIT,
  STUDY_MESSAGE_LIMIT,
  type StudyAnswerCheck,
  type StudyBuddyDraft,
} from './model';

export type StudyAction = 'ask' | 'reply' | 'hint';
export type StudyHintFeedback = 'helped' | 'gave-answer' | 'unclear';
export interface StudyMessage {
  id: number;
  role: 'learner' | 'guide';
  source: 'learner' | 'authored' | 'ai';
  text: string;
  action?: StudyAction;
  hintIndex?: number;
  feedback?: StudyHintFeedback;
}
export interface StudyRequest {
  action: StudyAction;
  text: string;
  goal: StudyBuddyDraft['goal'];
  hintStyle: StudyBuddyDraft['hintStyle'];
  question: string;
  expectedAnswer: string;
  hints: [string, string, string];
  hintIndex: number;
  history: { question: string; answer: string }[];
}
export interface StudyResponse {
  source: 'authored' | 'ai';
  text: string;
  hintIndex?: number;
  check?: StudyAnswerCheck;
}
export interface StudyGuideService {
  respond(request: StudyRequest, signal?: AbortSignal): Promise<StudyResponse>;
}
export type AuthoredStudyService = StudyGuideService;

export function createStudyRequest(
  draft: StudyBuddyDraft,
  action: StudyAction,
  text: string,
  hintIndex: number,
): StudyRequest {
  return {
    action,
    text: text.trim().slice(0, STUDY_INPUT_LIMIT),
    goal: draft.goal,
    hintStyle: draft.hintStyle,
    question: draft.question,
    expectedAnswer: draft.expectedAnswer,
    hints: [...draft.hints],
    hintIndex,
    history: [],
  };
}

export const authoredStudyService: AuthoredStudyService = {
  async respond(request) {
    const goal = studyGoals.find((item) => item.id === request.goal) ?? studyGoals[0];
    if (request.action === 'hint') {
      const index = Math.max(0, Math.min(2, request.hintIndex));
      const hint = request.hints[index];
      if (!hint.trim() || hintContainsAnswer(hint, request.expectedAnswer)) {
        return {
          source: 'authored',
          text: 'This hint needs revision in the builder before it can be shown.',
        };
      }
      return { source: 'authored', text: `${hint.trim()}\n${goal.prompt}`, hintIndex: index };
    }
    if (request.action === 'reply') {
      const check = checkStudyAnswer({ ...normalizeStudyDraft(null), ...request }, request.text);
      return { source: 'authored', text: check.message, check };
    }
    const questionFirst =
      request.hintStyle === 'question'
        ? 'What do you already know, and which part of this question is unclear?'
        : 'Break your question into what you know and what you need to find. Choose one small step to try.';
    return {
      source: 'authored',
      text: `I can offer authored study prompts here, but cannot generate a subject-specific answer to your question.\n${questionFirst}\n${goal.prompt}`,
    };
  },
};

export interface StudySession {
  messages: readonly StudyMessage[];
  status: 'idle' | 'pending' | 'error';
  error: string | null;
  hintCount: number;
  check: StudyAnswerCheck | null;
  lastAction: StudyAction | null;
}
export interface StudySessionController {
  getSnapshot(): StudySession;
  subscribe(listener: () => void): () => void;
  send(action: StudyAction, text?: string): Promise<boolean>;
  recordHintFeedback(messageId: number, feedback: StudyHintFeedback): void;
  reset(draft?: StudyBuddyDraft, service?: StudyGuideService): void;
  dispose(): void;
}

function initialSession(draft: StudyBuddyDraft): StudySession {
  return {
    messages: [
      {
        id: 0,
        role: 'guide',
        source: 'authored',
        text: `Let's practise: ${draft.question}\nYour goal: ${studyGoals.find((item) => item.id === draft.goal)!.label}.`,
      },
    ],
    status: 'idle',
    error: null,
    hintCount: 0,
    check: null,
    lastAction: null,
  };
}

/** Owns race prevention, failure recovery and local history; asynchronous work has no artificial delay. */
export function createStudySessionController(
  initialDraft: StudyBuddyDraft,
  service: StudyGuideService = authoredStudyService,
  options: { timeoutMs?: number } = {},
): StudySessionController {
  let draft = normalizeStudyDraft(initialDraft);
  let snapshot = initialSession(draft);
  let nextId = 1;
  let generation = 0;
  let disposed = false;
  let cancelPending: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const publish = (value: StudySession) => {
    if (disposed) return;
    snapshot = value;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async send(action, text = '') {
      if (disposed || snapshot.status === 'pending') return false;
      if (action !== 'hint' && !text.trim()) {
        publish({ ...snapshot, status: 'error', error: 'Write a question or reply first.' });
        return false;
      }
      if (action === 'hint' && snapshot.hintCount >= 3) return false;
      if (action === 'hint' && !auditStudyHints(draft).valid) {
        publish({
          ...snapshot,
          status: 'error',
          error: 'Revise the hints in the builder before testing them.',
        });
        return false;
      }
      if (snapshot.messages.length + 2 > STUDY_MESSAGE_LIMIT) {
        publish({
          ...snapshot,
          status: 'error',
          error: 'This practice has reached its message limit. Restart practice for a fresh chat.',
        });
        return false;
      }
      const ownGeneration = ++generation;
      const request = createStudyRequest(draft, action, text, snapshot.hintCount);
      // Only completed, explicitly entered turns; never notebook or learner context.
      for (let index = 0; index < snapshot.messages.length - 1; index++) {
        const current = snapshot.messages[index];
        const next = snapshot.messages[index + 1];
        if (current.role === 'learner' && next.role === 'guide') {
          request.history.push({ question: current.text, answer: next.text });
        }
      }
      request.history = request.history.slice(-6);
      const learner: StudyMessage = {
        id: nextId++,
        role: 'learner',
        source: 'learner',
        action,
        text: action === 'hint' ? `I'd like hint ${snapshot.hintCount + 1}.` : request.text,
      };
      publish({
        ...snapshot,
        status: 'pending',
        error: null,
        lastAction: action,
        messages: [...snapshot.messages, learner],
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const abort = new AbortController();
      try {
        const response = await Promise.race([
          service.respond(request, abort.signal),
          new Promise<never>((_, reject) => {
            cancelPending = () => {
              abort.abort();
              reject(new Error('Practice was reset.'));
            };
            timer = setTimeout(() => {
              abort.abort();
              reject(new Error('Study prompt timed out.'));
            }, options.timeoutMs ?? 30000);
          }),
        ]);
        if (disposed || generation !== ownGeneration) return false;
        if (!['authored', 'ai'].includes(response.source) || !response.text?.trim())
          throw new Error('Invalid guide response.');
        const isHint = action === 'hint' && response.hintIndex === request.hintIndex;
        if (action === 'hint' && !isHint) throw new Error('Invalid hint response.');
        if (action === 'hint' && hintContainsAnswer(response.text, draft.expectedAnswer))
          throw new Error('Hint contains the answer.');
        const message: StudyMessage = {
          id: nextId++,
          role: 'guide',
          source: response.source,
          action,
          text: response.text.slice(0, 2400),
          ...(isHint ? { hintIndex: response.hintIndex } : {}),
        };
        publish({
          ...snapshot,
          status: 'idle',
          error: null,
          messages: [...snapshot.messages, message],
          hintCount: snapshot.hintCount + (isHint ? 1 : 0),
          check:
            action === 'reply'
              ? checkStudyAnswer(draft, request.text)
              : (response.check ?? snapshot.check),
        });
        return true;
      } catch {
        if (!disposed && generation === ownGeneration) {
          // Keep prior successful turns, but remove the failed attempt so retry cannot duplicate it.
          publish({
            ...snapshot,
            status: 'error',
            messages: snapshot.messages.filter((item) => item.id !== learner.id),
            error: 'The guide did not finish. Your text is still here; try again.',
          });
        }
        return false;
      } finally {
        if (timer) clearTimeout(timer);
        if (generation === ownGeneration) cancelPending = null;
      }
    },
    recordHintFeedback(messageId, feedback) {
      if (disposed || !['helped', 'gave-answer', 'unclear'].includes(feedback)) return;
      publish({
        ...snapshot,
        messages: snapshot.messages.map((message) =>
          message.id === messageId && message.role === 'guide' && message.hintIndex !== undefined
            ? { ...message, feedback }
            : message,
        ),
      });
    },
    reset(nextDraft = draft, nextService = service) {
      generation++;
      cancelPending?.();
      cancelPending = null;
      draft = normalizeStudyDraft(nextDraft);
      service = nextService;
      nextId = 1;
      publish(initialSession(draft));
    },
    dispose() {
      generation++;
      disposed = true;
      cancelPending?.();
      cancelPending = null;
      listeners.clear();
    },
  };
}
