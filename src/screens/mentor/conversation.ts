import type { AIProvider, MentorRequest, MentorResponse } from '../../services/contracts';
import { offlineMentor } from '../../services/mentor-offline';
import {
  buildMentorBody,
  MentorUnavailableError,
  type MentorFailureCode,
} from '../../services/mentor-contract';
import { projectFields } from '../../domain/project';

export type MentorFocus = NonNullable<MentorRequest['focus']>;
/** Visible wording only: callers never pass expected answers or personal notes. */
export function learningPrompts(title: string, question: string) {
  return [
    'Why does ' + title + ' matter? The question is: ' + question,
    'Give me one small hint for ' + title + '.',
    'I tried … on ' + title + ' and got stuck. Can you explain my mistake?',
  ];
}
export function conciseLearningHint(text: string) {
  const first = text.split('\n').find((line) => line.trim()) ?? '';
  return first.length > 260 ? first.slice(0, 260).replace(/\s+\S*$/, '') + '…' : first;
}
export type Guidance = 'nextAction' | 'challenge' | 'evidencePrompt';
export type RequestOutcome = 'answered' | 'cancelled' | 'failed' | 'ignored' | 'consent';
export const focusChoices: { focus: MentorFocus; label: string; question: string }[] = [
  { focus: 'problem', label: 'Problem', question: 'Help me find the problem worth solving.' },
  { focus: 'evidence', label: 'Evidence', question: 'How can I gather useful evidence?' },
  { focus: 'scope', label: 'First version', question: 'What should I put in my first version?' },
  { focus: 'validation', label: 'Testing', question: 'How can I test my idea with someone?' },
  { focus: 'pitch', label: 'Pitch', question: 'Help me explain my project clearly.' },
];
/** Topic changes replace starter wording, while preserving a person's own draft. */
export function focusDraft(draft: string, focus: MentorFocus): string {
  const question = focusChoices.find((choice) => choice.focus === focus)!.question;
  return !draft.trim() || focusChoices.some((choice) => choice.question === draft)
    ? question
    : draft;
}
export interface ConversationAnswer {
  id: number;
  response: MentorResponse;
  guidance: Guidance;
  notice?: string;
}
export interface ConversationTurn {
  id: number;
  /** Selected context only; the visible thread is never hidden request history. */
  request: MentorRequest;
  answers: ConversationAnswer[];
  status: 'pending' | 'answered' | 'cancelled' | 'failed';
  followup?: boolean;
  notice?: string;
  errorCode?: MentorFailureCode;
}
export interface ConversationState {
  turns: ConversationTurn[];
  busy: boolean;
  consent: { request: MentorRequest; firstUse: boolean; retryTurnId?: number } | null;
  remoteConsentGranted: boolean;
  trimmed: boolean;
}

export const AMI_REPLY_TALK_MS = 2000;
export interface AmiPresentation {
  turnId: number | null;
  motion: 'idle' | 'talk' | 'thinking';
  active: boolean;
}

/** One current actor; motion follows actual request/answer state without delaying replies. */
export function deriveAmiPresentation(
  state: ConversationState,
  lifecycle: { focused: boolean; foreground: boolean; reduced: boolean },
  reply: { id: number; receivedAt: number } | null,
  now: number,
): AmiPresentation {
  const lastTurn = state.turns.at(-1);
  const pending = state.busy && lastTurn?.status === 'pending';
  const answered = state.turns
    .slice()
    .reverse()
    .find((turn) => turn.answers.length > 0);
  const latestAnswer = answered?.answers.at(-1);
  const replyAge = reply ? now - reply.receivedAt : Infinity;
  const talking = latestAnswer?.id === reply?.id && replyAge >= 0 && replyAge < AMI_REPLY_TALK_MS;
  return {
    turnId: pending ? lastTurn.id : (answered?.id ?? null),
    motion: pending ? 'thinking' : talking ? 'talk' : 'idle',
    active: lifecycle.focused && lifecycle.foreground && !lifecycle.reduced,
  };
}

/** Copy only reviewed notes; never attach the mutable notebook implicitly. */
export function snapshotRequest(
  prompt: string,
  project: MentorRequest['project'],
  focus: MentorFocus,
  options: {
    attachProject?: boolean;
    history?: MentorRequest['history'];
    intent?: 'answer' | 'hint';
  } = {},
): MentorRequest {
  const notes = Object.fromEntries(
    projectFields.flatMap((key) => {
      const value = project[key];
      return typeof value === 'string' && value.trim() ? [[key, value.slice(0, 3000)]] : [];
    }),
  );
  const history = Object.freeze(
    (options.history ?? []).slice(-6).map((pair) => Object.freeze({ ...pair })),
  );
  const request = Object.freeze({
    prompt: prompt.trim(),
    focus,
    intent: options.intent ?? 'answer',
    allowRemote: false,
    attachProject: options.attachProject === true,
    project: Object.freeze(options.attachProject ? notes : {}),
    history,
  });
  buildMentorBody(request);
  return request;
}
export function completedHistory(turns: ConversationTurn[]) {
  return turns
    .flatMap((turn) => {
      const live = turn.answers.find((answer) => answer.response.mode === 'live');
      return turn.status === 'answered' && live
        ? [{ question: turn.request.prompt, answer: live.response.message }]
        : [];
    })
    .slice(-6);
}
const initialState = (): ConversationState => ({
  turns: [],
  busy: false,
  consent: null,
  remoteConsentGranted: false,
  trimmed: false,
});

/** Ephemeral chat consent belongs to this conversation and authenticated identity only. */
export function createConversation(
  provider: AIProvider,
  {
    timeoutMs = 30000,
    maxTurns = 20,
    remoteConfigured = false,
  }: { timeoutMs?: number; maxTurns?: number; remoteConfigured?: boolean } = {},
) {
  let state = initialState();
  const listeners = new Set<() => void>();
  let nextId = 0;
  let disposed = false;
  let active: { cancel: () => void } | null = null;
  const publish = (next: ConversationState) => {
    state = next;
    if (!disposed) listeners.forEach((listener) => listener());
  };
  const updateTurn = (id: number, update: (turn: ConversationTurn) => ConversationTurn) =>
    state.turns.map((turn) => (turn.id === id ? update(turn) : turn));
  const append = (request: MentorRequest) => {
    const id = ++nextId;
    const turns = [...state.turns, { id, request, answers: [], status: 'pending' as const }];
    publish({
      ...state,
      turns: turns.slice(-Math.max(1, maxTurns)),
      trimmed: state.trimmed || turns.length > maxTurns,
    });
    return id;
  };
  const run = (
    turnId: number,
    request: MentorRequest,
    local?: MentorResponse,
  ): Promise<RequestOutcome> => {
    const controller = new AbortController();
    return new Promise((resolve) => {
      const finish = (
        outcome: RequestOutcome,
        response?: MentorResponse,
        notice?: string,
        code?: MentorFailureCode,
      ) => {
        if (active !== operation) return;
        clearTimeout(timer);
        active = null;
        if (outcome !== 'answered') controller.abort();
        publish({
          ...state,
          busy: false,
          turns: updateTurn(turnId, (turn) => ({
            ...turn,
            status: response ? 'answered' : outcome === 'cancelled' ? 'cancelled' : 'failed',
            notice,
            errorCode: code,
            answers: response ? [{ id: ++nextId, response, guidance: 'nextAction' }] : [],
          })),
        });
        resolve(outcome);
      };
      const operation = {
        cancel: () =>
          finish(
            'cancelled',
            undefined,
            'Reply cancelled. Your question is still here.',
            'cancelled',
          ),
      };
      active = operation;
      const timer = setTimeout(
        () =>
          finish(
            'failed',
            undefined,
            'That took too long. Try again or ask for a local hint.',
            'unavailable',
          ),
        timeoutMs,
      );
      publish({
        ...state,
        busy: true,
        consent: null,
        turns: updateTurn(turnId, (turn) => ({
          ...turn,
          status: 'pending',
          notice: undefined,
          errorCode: undefined,
        })),
      });
      Promise.resolve()
        .then(() =>
          controller.signal.aborted ? null : (local ?? provider.review(request, controller.signal)),
        )
        .then(
          (response) => {
            if (!response || controller.signal.aborted) return;
            if (request.allowRemote && response.mode !== 'live') {
              finish(
                'failed',
                undefined,
                'Ami couldn’t connect. Try again or ask for a local hint.',
                'unavailable',
              );
            } else finish('answered', response);
          },
          (error: unknown) =>
            finish(
              'failed',
              undefined,
              error instanceof MentorUnavailableError
                ? error.message
                : 'Ami couldn’t load that reply. Try again or ask for a local hint.',
              error instanceof MentorUnavailableError ? error.code : 'unavailable',
            ),
        );
    });
  };
  const prepare = (request: MentorRequest, retryTurnId?: number): Promise<RequestOutcome> => {
    if (!remoteConfigured) {
      const id = retryTurnId ?? append(request);
      publish({
        ...state,
        turns: updateTurn(id, (turn) => ({
          ...turn,
          status: 'failed',
          notice: 'Ami’s chat is not connected yet. You can still ask for a local hint.',
          errorCode: 'unconfigured',
        })),
      });
      return Promise.resolve('failed');
    }
    const approved = Object.freeze({ ...request, allowRemote: true });
    if (!state.remoteConsentGranted || approved.attachProject) {
      publish({
        ...state,
        consent: { request: approved, firstUse: !state.remoteConsentGranted, retryTurnId },
      });
      return Promise.resolve('consent');
    }
    return run(retryTurnId ?? append(approved), approved);
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sendChat: (
      prompt: string,
      project: MentorRequest['project'],
      focus: MentorFocus,
      attachProject = false,
    ) => {
      if (disposed || active || state.consent || !prompt.trim() || prompt.trim().length > 2000)
        return Promise.resolve<RequestOutcome>('ignored');
      try {
        const request = snapshotRequest(prompt, project, focus, {
          attachProject,
          history: completedHistory(state.turns),
        });
        return prepare(request);
      } catch (error) {
        const id = append({
          prompt: prompt.trim(),
          project: {},
          focus,
          intent: 'answer',
          allowRemote: false,
        });
        publish({
          ...state,
          turns: updateTurn(id, (turn) => ({
            ...turn,
            status: 'failed',
            notice:
              error instanceof MentorUnavailableError ? error.message : 'This message is too long.',
            errorCode: 'context',
          })),
        });
        return Promise.resolve<RequestOutcome>('failed');
      }
    },
    giveHint: (prompt: string, focus: MentorFocus, authored?: MentorResponse) => {
      if (disposed || active || state.consent) return Promise.resolve<RequestOutcome>('ignored');
      const request = snapshotRequest(
        prompt.trim() || focusChoices.find((item) => item.focus === focus)!.question,
        {},
        focus,
        { intent: 'hint' },
      );
      const response = authored?.mode === 'offline' ? authored : offlineMentor(request);
      return run(append(request), request, response);
    },
    confirmConsent: () => {
      if (disposed || active || !state.consent) return Promise.resolve<RequestOutcome>('ignored');
      const { request, retryTurnId } = state.consent;
      publish({ ...state, consent: null, remoteConsentGranted: true });
      return run(retryTurnId ?? append(request), request);
    },
    dismissConsent: () => publish({ ...state, consent: null }),
    retry: (id: number) => {
      const turn = state.turns.find((item) => item.id === id);
      if (
        disposed ||
        active ||
        state.consent ||
        !turn ||
        turn.errorCode === 'context' ||
        !['failed', 'cancelled'].includes(turn.status)
      )
        return Promise.resolve<RequestOutcome>('ignored');
      return prepare(turn.request, turn.id);
    },
    selectGuidance: (turnId: number, answerId: number, guidance: Guidance) =>
      publish({
        ...state,
        turns: updateTurn(turnId, (turn) => ({
          ...turn,
          answers: turn.answers.map((answer) =>
            answer.id === answerId ? { ...answer, guidance } : answer,
          ),
        })),
      }),
    cancel: () => {
      active?.cancel();
      if (state.consent) publish({ ...state, consent: null });
    },
    newChat: () => {
      active?.cancel();
      publish(initialState());
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
      active?.cancel();
      state = initialState();
    },
  };
}
export type Conversation = ReturnType<typeof createConversation>;
