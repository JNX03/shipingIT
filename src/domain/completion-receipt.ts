import { getLesson } from '../data/curriculum';
import type { CompletionResult } from './types';

export interface CompletionReceipt {
  readonly token: string;
  readonly lessonId: string;
  readonly result: Readonly<Omit<CompletionResult, 'newAchievements'>> & {
    readonly newAchievements: readonly string[];
  };
}

let latestReceipt: CompletionReceipt | null = null;
let receiptSequence = 0;

/** Session-only presentation data. Issue only after the completion has been saved. */
export function issueCompletionReceipt(lessonId: string, result: CompletionResult): string | null {
  latestReceipt = null;
  const lesson = getLesson(lessonId);
  if (
    !lesson ||
    !result ||
    result.success !== true ||
    typeof result.alreadyCompleted !== 'boolean' ||
    !Number.isInteger(result.xpEarned) ||
    result.xpEarned < 0 ||
    result.xpEarned > lesson.xp ||
    (result.alreadyCompleted && result.xpEarned !== 0) ||
    !Array.isArray(result.newAchievements) ||
    !result.newAchievements.every((id) => typeof id === 'string') ||
    (result.missionCompleted !== null && result.missionCompleted !== lesson.missionId) ||
    (result.alreadyCompleted && result.missionCompleted !== null)
  )
    return null;
  // An opaque handle identifies this result; it is never an entitlement or a saved reward.
  const token = `${(++receiptSequence).toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  latestReceipt = Object.freeze({
    token,
    lessonId,
    result: Object.freeze({
      ...result,
      newAchievements: Object.freeze([...result.newAchievements]),
    }),
  });
  return token;
}

export function readCompletionReceipt(token: unknown, lessonId: string): CompletionReceipt | null {
  return typeof token === 'string' &&
    latestReceipt?.token === token &&
    latestReceipt.lessonId === lessonId
    ? latestReceipt
    : null;
}

/** No argument clears the session; a token revokes only its own result. */
export function revokeCompletionReceipt(token?: unknown): void {
  if (arguments.length === 0 || latestReceipt?.token === token) latestReceipt = null;
}
