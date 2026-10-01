import { getLesson, getMission } from '../data/curriculum';
import { readCompletionReceipt } from './completion-receipt';
import { projectFieldLabels } from './project';
import type { PersistedAppState } from './types';

/** Saved progress allows a result page; a current receipt establishes its new rewards. */
export function getCompletionInfo(
  params: { id?: unknown; receipt?: unknown; xp?: unknown; mission?: unknown; badges?: unknown },
  progress: Pick<PersistedAppState, 'completedLessonIds' | 'achievements' | 'project'>,
) {
  if (typeof params.id !== 'string') return null;
  const lesson = getLesson(params.id);
  if (!lesson || !progress.completedLessonIds.includes(lesson.id)) return null;
  const receipt = readCompletionReceipt(params.receipt, lesson.id);
  const candidate = receipt?.result.missionCompleted
    ? getMission(receipt.result.missionCompleted)
    : undefined;
  const mission =
    candidate?.id === lesson.missionId &&
    candidate.lessonIds.every((id) => progress.completedLessonIds.includes(id))
      ? candidate
      : undefined;
  const requestedXP = receipt?.result.xpEarned ?? 0;
  const earned = Number.isFinite(requestedXP)
    ? Math.max(0, Math.min(lesson.xp, Math.floor(requestedXP)))
    : 0;
  const newAchievements = [...new Set(receipt?.result.newAchievements ?? [])].filter((id) =>
    progress.achievements.includes(id),
  );
  const completedLessons = mission
    ? mission.lessonIds.flatMap((lessonId) => {
        const completedLesson = getLesson(lessonId);
        return completedLesson ? [completedLesson] : [];
      })
    : [lesson];
  const fieldKeys = new Set(
    completedLessons.flatMap((item) =>
      item.exercises.flatMap((exercise) =>
        exercise.type === 'project' ? exercise.fields.map((field) => field.key) : [],
      ),
    ),
  );
  const projectFields = [...fieldKeys]
    .filter((key) => progress.project[key].trim().length > 0)
    .map((key) => ({ key, label: projectFieldLabels[key] }));
  const nextMission = mission && earned > 0 ? getMission(mission.id + 1) : undefined;
  return { lesson, mission, earned, newAchievements, projectFields, nextMission };
}
