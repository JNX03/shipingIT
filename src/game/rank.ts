import { getLevelProgress } from '../domain/progression';

/** Rank reads lifetime earned Sparks, never the spendable wallet or membership state. */
export function builderRank(earnedSparks: number) {
  const earned = Math.floor(Math.max(0, Number.isFinite(earnedSparks) ? earnedSparks : 0));
  const progress = getLevelProgress(earned);
  return {
    earned,
    level: progress.level,
    nextLevel: progress.level + 1,
    towardNext: progress.current,
    remaining: progress.target - progress.current,
    percent: progress.percent,
  };
}
