import type { AnswerResult, Exercise, ExerciseAnswer } from './types';
import { evaluateExercise } from './progression';
import { checkCategoryStatement, checkNextSortStep } from '../components/learning/exercise-step';

export interface LessonAttempt { hearts: number; mistakes: number; practice: boolean }
export const createLessonAttempt = (): LessonAttempt => ({ hearts: 5, mistakes: 0, practice: false });
export function recordLessonCheck(attempt: LessonAttempt, correct: boolean): LessonAttempt {
  if (correct || (attempt.hearts === 0 && !attempt.practice)) return attempt;
  return { ...attempt, hearts: Math.max(0, attempt.hearts - 1), mistakes: attempt.mistakes + 1 };
}
export const practiceLessonAttempt = (attempt: LessonAttempt): LessonAttempt => ({ ...attempt, practice: true });
export const canAwardLessonAttempt = (attempt: LessonAttempt) => !attempt.practice && attempt.hearts > 0;
export const lessonStepCount = (exercise: Exercise) =>
  exercise.type === 'categorize' || exercise.type === 'sort' ? exercise.items.length : 1;

export function lessonStepReady(exercise: Exercise, answer: ExerciseAnswer, position = 0): boolean {
  if (!Number.isInteger(position) || position < 0 || position >= lessonStepCount(exercise)) return false;
  if (exercise.type === 'categorize')
    return !Array.isArray(answer) && Boolean((answer as Record<string, string>)[exercise.items[position].id]);
  if (exercise.type === 'sort') return Array.isArray(answer) && Boolean(answer[position]);
  if (exercise.type === 'project')
    return !Array.isArray(answer) && exercise.fields.every((field) => String(answer[field.key] ?? '').trim().length >= field.minLength);
  return Array.isArray(answer) && answer.length > 0;
}

/** The sticky footer checks one visible part. Corrections are taught only when Continue is pressed. */
export function checkLessonStep(exercise: Exercise, answer: ExerciseAnswer, position = 0): AnswerResult {
  if (!lessonStepReady(exercise, answer, position))
    return { correct: false, explanation: 'Choose an answer before checking.', errors: [] };
  if (exercise.type === 'categorize' && !Array.isArray(answer)) {
    const item = exercise.items[position];
    const checked = checkCategoryStatement(exercise, item.id, String((answer as Record<string, string>)[item.id]));
    return { correct: checked.correct, explanation: checked.message, errors: [] };
  }
  if (exercise.type === 'sort' && Array.isArray(answer)) {
    const checked = checkNextSortStep(exercise, answer.slice(0, position), answer[position]);
    return { correct: checked.correct, explanation: checked.message, errors: [] };
  }
  return evaluateExercise(exercise, answer);
}

/** Preserve the attempt's grade separately; a taught correction never makes a wrong check perfect. */
export function continueLessonStep(exercise: Exercise, answer: ExerciseAnswer, position = 0) {
  let correctedAnswer = answer;
  if (exercise.type === 'categorize' && !Array.isArray(answer)) {
    const item = exercise.items[position];
    if (item) correctedAnswer = { ...answer, [item.id]: exercise.correctCategories[item.id] };
  } else if (exercise.type === 'sort' && Array.isArray(answer)) {
    const expected = exercise.correctOrder[position];
    if (expected) correctedAnswer = [...answer.slice(0, position), expected];
  }
  return { answer: correctedAnswer, position: position + 1, finished: position + 1 >= lessonStepCount(exercise) };
}
