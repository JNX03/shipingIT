import type { Lesson } from '../../domain/types';

export interface TaskGuide {
  title: string;
  goal: string;
  why: string;
  steps: string[];
  success: string;
  hint: string;
  feedback?: Record<string, string>;
}

export interface ExerciseCopy {
  prompt?: string;
  context?: string;
  explanation?: string;
  hint?: string;
}

export interface LessonGuide extends TaskGuide {
  exerciseCopy: Record<string, ExerciseCopy>;
}

export interface UnitContent {
  unitId: number;
  title: string;
  summary: string;
  lessons: Record<string, LessonGuide>;
  practices: Record<string, TaskGuide>;
  stages: Record<string, TaskGuide>;
  bonusLesson: Lesson;
}
