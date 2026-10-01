import type { Lesson } from '../../domain/types';
import type { TaskGuide, UnitContent, LessonGuide } from './types';

/** Content is keyed by existing activity IDs; adding guidance never awards or resets progress. */
export function createLearningGuideIndex(units: readonly UnitContent[]) {
  const lessons: Record<string, LessonGuide> = {};
  const practices: Record<string, TaskGuide> = {};
  const stages: Record<string, TaskGuide> = {};
  const bonusLessons: Lesson[] = [];
  const unitIds = new Set<number>();
  for (const unit of units) {
    if (unitIds.has(unit.unitId)) throw new Error(`Duplicate unit ${unit.unitId}`);
    unitIds.add(unit.unitId);
    for (const [id, guide] of Object.entries(unit.lessons)) {
      if (lessons[id]) throw new Error(`Duplicate lesson guide ${id}`);
      lessons[id] = guide;
    }
    for (const [id, guide] of Object.entries(unit.practices)) {
      if (practices[id]) throw new Error(`Duplicate practice guide ${id}`);
      practices[id] = guide;
    }
    for (const [id, guide] of Object.entries(unit.stages)) {
      if (stages[id]) throw new Error(`Duplicate stage guide ${id}`);
      stages[id] = guide;
    }
    if (unit.bonusLesson.id !== `pro-unit-${unit.unitId}`)
      throw new Error(`Unexpected bonus lesson for unit ${unit.unitId}`);
    bonusLessons.push(unit.bonusLesson);
  }
  return {
    lessons,
    practices,
    stages,
    bonusLessons,
    guideFor(ref: { kind: string; lessonId?: string; challengeId?: string; stageId?: string }) {
      return ref.kind === 'lesson'
        ? lessons[ref.lessonId ?? '']
        : ref.kind === 'challenge'
          ? practices[ref.challengeId ?? '']
          : stages[ref.stageId ?? ''];
    },
    applyLessonCopy(lesson: Lesson): Lesson {
      const guide = lessons[lesson.id];
      if (!guide) return lesson;
      return {
        ...lesson,
        title: guide.title,
        subtitle: guide.goal,
        exercises: lesson.exercises.map((exercise) => {
          const copy = guide.exerciseCopy[exercise.id];
          if (!copy) return exercise;
          return {
            ...exercise,
            ...(typeof copy.prompt === 'string' ? { prompt: copy.prompt } : {}),
            ...(typeof copy.context === 'string' ? { context: copy.context } : {}),
            ...(typeof copy.explanation === 'string' ? { explanation: copy.explanation } : {}),
            ...(typeof copy.hint === 'string' ? { hint: copy.hint } : {}),
          };
        }),
      };
    },
  };
}
