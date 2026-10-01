import { getLesson, lessons } from '../data/curriculum';
import { getLessonState } from '../domain/progression';
import type { LessonCompletion } from '../domain/types';
import { gameStageById, gameStages } from './catalog';
import { challengeById, isChallengeUnlocked } from './challenges/catalog';
import { adventurePathAction } from './components/path-action';
import { mixedPathNodes, mixedPracticeDetail, type MixedPathNode } from './mixed-path';
import type { AdventureState } from './state';
import { stageIds } from './types';

export interface MixedPathProgress {
  adventure: Pick<AdventureState, 'completed' | 'earned' | 'started'>;
  completedLessonIds: string[];
  /** Validated completion-or-skip prefix; skips never become completion rewards. */
  passedLessonIds?: string[];
  skippedLessonIds?: string[];
  lessonCompletions?: Record<string, LessonCompletion>;
  practices: Record<string, string>;
  practicesReady: boolean;
}
export interface MixedNodeState {
  done: boolean;
  unlocked: boolean;
  earned: boolean;
  skipped?: boolean;
  action: string;
  detail: string;
}

/** Read the existing gates directly; path adjacency never creates a new prerequisite. */
export function mixedNodeState(node: MixedPathNode, progress: MixedPathProgress): MixedNodeState {
  const ref = node.ref;
  if (ref.kind === 'adventure') {
    const stage = gameStageById(ref.stageId)!;
    const done = progress.adventure.completed.includes(stage.id);
    const earned = progress.adventure.earned.includes(stage.id);
    const unlocked = stageIds.indexOf(stage.id) <= progress.adventure.completed.length;
    const prerequisite = gameStages
      .slice(0, stageIds.indexOf(stage.id))
      .find((entry) => !progress.adventure.completed.includes(entry.id));
    return {
      done,
      unlocked,
      earned,
      action: adventurePathAction(stage.id, progress.adventure),
      detail: `${unlocked ? stage.subtitle : `Complete “${prerequisite?.title}” to unlock this game.`}${earned && !done ? ' Its Sparks are already saved.' : ''}`,
    };
  }
  if (ref.kind === 'challenge') {
    const challenge = challengeById(ref.challengeId)!;
    const done = Boolean(progress.practices[challenge.id]);
    const unlocked =
      progress.practicesReady && isChallengeUnlocked(challenge.id, progress.practices);
    return {
      done,
      unlocked,
      earned: done,
      action: done ? 'Play again' : `Play +${challenge.reward} Sparks`,
      detail: unlocked
        ? done
          ? 'Play this project puzzle again.'
          : mixedPracticeDetail(challenge.id)
        : !progress.practicesReady
          ? 'Loading your saved practice…'
          : `Finish “${challengeById(challenge.prerequisite ?? '')?.title}” to unlock this practice.`,
    };
  }
  const lesson = getLesson(ref.lessonId)!;
  const completedState = getLessonState(
    lesson.id,
    progress.completedLessonIds,
    progress.lessonCompletions,
  );
  const passedLessonIds = progress.passedLessonIds ?? progress.completedLessonIds;
  const state = getLessonState(lesson.id, passedLessonIds, progress.lessonCompletions);
  const done = completedState === 'completed' || completedState === 'mastered';
  const skipped =
    !done &&
    passedLessonIds.includes(lesson.id) &&
    (progress.skippedLessonIds?.includes(lesson.id) ?? false);
  const unlocked = state !== 'locked';
  const prerequisite = lessons
    .slice(
      0,
      lessons.findIndex((entry) => entry.id === lesson.id),
    )
    .find((entry) => !passedLessonIds.includes(entry.id));
  return {
    done,
    unlocked,
    earned: done,
    skipped,
    action: done ? 'Practice lesson' : skipped ? 'Start lesson' : `Start +${lesson.xp} Sparks`,
    detail: skipped
      ? 'Skipped · Learn anytime'
      : unlocked
        ? `${lesson.minutes} min · ${lesson.subtitle}`
        : `Complete “${prerequisite?.title}” to unlock this lesson.`,
  };
}

/** Follow the first unfinished mixed activity, while preserving every existing ledger gate. */
export function mixedCurrentNode(progress: MixedPathProgress): MixedPathNode | undefined {
  const states = mixedPathNodes.map((node) => mixedNodeState(node, progress));
  // A historical award remains earned after a draft edit. Bring the learner to the
  // actual rebuild instead of suggesting that the old reward/progress was erased.
  const rebuild = mixedPathNodes.find(
    (node, index) =>
      node.ref.kind === 'adventure' &&
      states[index]!.earned &&
      !states[index]!.done &&
      states[index]!.unlocked,
  );
  if (rebuild) return rebuild;
  // Completing a game in a later unit must not skip earlier lessons or practices.
  // A purchased skip is passed for navigation only; its completion/reward stays false.
  return mixedPathNodes.find(
    (_, index) => states[index]!.unlocked && !states[index]!.done && !states[index]!.skipped,
  );
}

/** Keep tactile bends within a narrow path; large text uses the same normal-flow rows. */
export function mixedPathOffset(index: number, width: number, fontScale: number): number {
  const bend = [0, -42, -56, 0, 54, 30][index % 6]!;
  const limit = Math.max(0, (width - 112) / 2 - 16);
  return Math.max(-limit, Math.min(limit, fontScale >= 1.6 ? bend / 2 : bend));
}
