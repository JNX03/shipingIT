import type { MentorRequest, MentorResponse } from './contracts';
import { isRecord } from './validation';
import { projectFields } from '../domain/project';

export type MentorFailureCode =
  'consent' | 'unconfigured' | 'auth' | 'limit' | 'context' | 'unavailable' | 'cancelled';
export class MentorUnavailableError extends Error {
  constructor(
    public readonly code: MentorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'MentorUnavailableError';
  }
}

/** The body is also the frozen consent preview: no paid flag or hidden client context. */
export function buildMentorBody(request: MentorRequest) {
  const prompt = request.prompt.trim();
  if (!prompt || prompt.length > 2000)
    throw new MentorUnavailableError(
      'context',
      'Keep your question between 1 and 2,000 characters.',
    );
  const intent = request.intent ?? 'answer';
  if (
    !['answer', 'hint'].includes(intent) ||
    (request.hintLevel !== undefined &&
      (intent !== 'hint' || ![1, 2, 3].includes(request.hintLevel)))
  )
    throw new MentorUnavailableError('context', 'Choose a valid question or hint.');
  const history = (request.history ?? []).slice(-6).map(({ question, answer }) => {
    if (
      typeof question !== 'string' ||
      typeof answer !== 'string' ||
      !question.trim() ||
      !answer.trim() ||
      question.length > 2000 ||
      answer.length > 2000
    )
      throw new MentorUnavailableError(
        'context',
        'A previous chat message is too long. Start a new question.',
      );
    return { question, answer };
  });
  const body: {
    prompt: string;
    intent: 'answer' | 'hint';
    focus?: MentorRequest['focus'];
    hintLevel?: 1 | 2 | 3;
    history?: { question: string; answer: string }[];
    attachProject?: true;
    project?: Record<string, string>;
  } = { prompt, intent };
  if (request.focus !== undefined) {
    if (!['problem', 'evidence', 'scope', 'validation', 'pitch'].includes(request.focus))
      throw new MentorUnavailableError('context', 'Choose a valid topic for your question.');
    body.focus = request.focus;
  }
  if (intent === 'hint') body.hintLevel = request.hintLevel ?? 1;
  if (history.length) body.history = history;
  if (request.attachProject === true) {
    body.attachProject = true;
    body.project = {};
    for (const key of projectFields) {
      const value = request.project?.[key];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > 3000)
        throw new MentorUnavailableError(
          'context',
          'An attached note is too long. Review it or send without notes.',
        );
      body.project[key] = value;
    }
  }
  const encoded = JSON.stringify(body);
  const byteLength = Array.from(encoded).reduce((total, char) => {
    const point = char.codePointAt(0)!;
    return total + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4);
  }, 0);
  if (encoded.length > 32000 || byteLength > 65536)
    throw new MentorUnavailableError(
      'context',
      'This message and its attached context are too long. Shorten it or send without notes.',
    );
  return body;
}

export function parseMentorResponse(value: unknown): MentorResponse | null {
  if (!isRecord(value) || value.mode !== 'live') return null;
  const keys = ['message', 'challenge', 'evidencePrompt', 'nextAction'] as const;
  if (
    !keys.every(
      (key) =>
        typeof value[key] === 'string' &&
        value[key].length <= 2000 &&
        (key !== 'message' || value[key].trim().length > 0),
    )
  )
    return null;
  return {
    mode: 'live',
    message: String(value.message),
    challenge: String(value.challenge),
    evidencePrompt: String(value.evidencePrompt),
    nextAction: String(value.nextAction),
  };
}
