import { studyGoals, studyHintStyles } from './model';
import { authoredStudyService, type StudyGuideService, type StudyRequest } from './service';

/** Minimal question-only seam. Root supplies a verified review function after service readiness. */
export interface StudyMentorRequest {
  prompt: string;
  history: { question: string; answer: string }[];
  intent: 'answer' | 'hint';
  hintLevel?: 1 | 2 | 3;
  allowRemote: true;
  attachProject: false;
  project: Record<string, never>;
}
export interface StudyMentorResponse {
  mode: 'live' | 'offline';
  message: string;
}
export type StudyMentorReview = (
  request: StudyMentorRequest,
  signal?: AbortSignal,
) => Promise<StudyMentorResponse>;

export function buildStudyMentorRequest(request: StudyRequest): StudyMentorRequest {
  const goal = studyGoals.find((item) => item.id === request.goal)!.label;
  const style = studyHintStyles.find((item) => item.id === request.hintStyle)!.label;
  const prompt = [
    `Study practice: ${request.question}`,
    `My goal: ${goal}. Hint style: ${style}.`,
    request.action === 'hint'
      ? 'Give a nudge for my next step without revealing the final answer.'
      : `My ${request.action === 'reply' ? 'attempt' : 'question'}: ${request.text}`,
  ].join('\n');
  if (prompt.length > 2000)
    throw new Error('The practice question and message exceed the mentor limit.');
  return {
    prompt,
    history: request.history.slice(-6).map((turn) => ({
      question: turn.question.slice(0, 2000),
      answer: turn.answer.slice(0, 2000),
    })),
    intent: request.action === 'hint' ? 'hint' : 'answer',
    ...(request.action === 'hint'
      ? { hintLevel: Math.max(1, Math.min(3, request.hintIndex + 1)) as 1 | 2 | 3 }
      : {}),
    allowRemote: true,
    attachProject: false,
    project: {},
  };
}

/** Construction does not call the service. The template still requires explicit session consent. */
export function createStudyMentorAdapter(review: StudyMentorReview): StudyGuideService {
  return {
    async respond(request, signal) {
      const response = await review(buildStudyMentorRequest(request), signal);
      if (signal?.aborted) throw new Error('Study request cancelled.');
      if (response.mode === 'offline') {
        const fallback = await authoredStudyService.respond(request, signal);
        return {
          ...fallback,
          text: `Live AI is unavailable. This is authored practice.\n${fallback.text}`,
        };
      }
      if (response.mode !== 'live' || !response.message.trim())
        throw new Error('Invalid live mentor response.');
      return {
        source: 'ai',
        text: response.message,
        ...(request.action === 'hint' ? { hintIndex: request.hintIndex } : {}),
      };
    },
  };
}
