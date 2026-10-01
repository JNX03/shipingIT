import { lessons } from '../data/curriculum';
import type { SparkPurchase, SparkWallet } from './spark-wallet';
import type { Lesson, LessonCompletion, LessonState } from './types';

export const LESSON_SKIP_COST = 60;

export interface LessonAccessProjection {
  /** Prerequisites only. Never persist these as completions or use them to calculate rewards. */
  passedLessonIds: string[];
  skippedLessonIds: string[];
  unlockedLessonIds: string[];
  nextLesson: Lesson | undefined;
}

function validSkipReceipt(purchase: SparkPurchase, now: number): boolean {
  return (
    purchase.kind === 'skip' &&
    typeof purchase.id === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(purchase.id) &&
    purchase.itemId === `skip:${purchase.targetId}` &&
    lessons.some((lesson) => lesson.id === purchase.targetId) &&
    purchase.price === LESSON_SKIP_COST &&
    ((purchase.payment === 'earned' && purchase.spent === LESSON_SKIP_COST) ||
      (purchase.payment === 'pro' && purchase.spent === 0)) &&
    typeof purchase.at === 'string' &&
    Number.isFinite(Date.parse(purchase.at)) &&
    Date.parse(purchase.at) <= now
  );
}

/** A saved skip can pass a prerequisite, but cannot manufacture a completion, XP or an award. */
export function projectLessonAccess(
  completedLessonIds: readonly string[],
  wallet: Pick<SparkWallet, 'purchases'>,
  now = Date.now(),
): LessonAccessProjection {
  const completed = new Set(completedLessonIds);
  const transactionCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();
  for (const purchase of wallet.purchases) {
    transactionCounts.set(purchase.id, (transactionCounts.get(purchase.id) ?? 0) + 1);
    if (purchase.kind === 'skip')
      targetCounts.set(purchase.targetId, (targetCounts.get(purchase.targetId) ?? 0) + 1);
  }
  const receiptIds = new Set(
    Number.isFinite(now)
      ? wallet.purchases
          .filter(
            (purchase) =>
              validSkipReceipt(purchase, now) &&
              transactionCounts.get(purchase.id) === 1 &&
              targetCounts.get(purchase.targetId) === 1,
          )
          .map((purchase) => purchase.targetId)
      : [],
  );
  const passedLessonIds: string[] = [];
  const skippedLessonIds: string[] = [];
  let nextLesson: Lesson | undefined;
  for (const lesson of lessons) {
    if (completed.has(lesson.id)) passedLessonIds.push(lesson.id);
    else if (receiptIds.has(lesson.id)) {
      passedLessonIds.push(lesson.id);
      skippedLessonIds.push(lesson.id);
    } else {
      nextLesson = lesson;
      break;
    }
  }
  return {
    passedLessonIds,
    skippedLessonIds,
    unlockedLessonIds: nextLesson ? [...passedLessonIds, nextLesson.id] : [...passedLessonIds],
    nextLesson,
  };
}

/** Completed/mastered always means the learner actually completed the lesson. */
export function getLessonAccessState(
  id: string,
  completedLessonIds: readonly string[],
  projection: LessonAccessProjection,
  completions: Record<string, LessonCompletion> = {},
): LessonState {
  if (!lessons.some((lesson) => lesson.id === id)) return 'locked';
  if (completedLessonIds.includes(id)) return completions[id]?.perfect ? 'mastered' : 'completed';
  if (projection.skippedLessonIds.includes(id)) return 'available';
  return projection.nextLesson?.id === id ? 'current' : 'locked';
}
