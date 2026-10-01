import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons } from '../data/curriculum';
import { canAwardLessonAttempt, checkLessonStep, continueLessonStep, createLessonAttempt, lessonStepCount, lessonStepReady, practiceLessonAttempt, recordLessonCheck } from './lesson-step-controller';
import type { ExerciseAnswer } from './types';

test('categorization checks only the visible statement and Continue teaches a correction without changing the grade', () => {
  const exercise = lessons.flatMap((lesson) => lesson.exercises).find((item) => item.type === 'categorize')!;
  assert.equal(exercise.type, 'categorize');
  if (exercise.type !== 'categorize') return;
  const item = exercise.items[0];
  const wrong = exercise.categories.find((category) => category.id !== exercise.correctCategories[item.id])!;
  const answer = { [item.id]: wrong.id };
  assert.equal(lessonStepReady(exercise, answer, 0), true);
  assert.equal(lessonStepReady(exercise, answer, 1), false);
  const checked = checkLessonStep(exercise, answer, 0);
  assert.equal(checked.correct, false);
  assert.ok(checked.explanation.includes(exercise.categories.find((category) => category.id === exercise.correctCategories[item.id])!.label));
  const attempt = recordLessonCheck(createLessonAttempt(), checked.correct);
  const continued = continueLessonStep(exercise, answer, 0);
  assert.equal(continued.position, 1);
  assert.deepEqual(continued.answer, { [item.id]: exercise.correctCategories[item.id] });
  assert.equal(attempt.mistakes, 1);
  assert.equal(attempt.hearts, 4);
  assert.deepEqual(answer, { [item.id]: wrong.id });
});

test('sort selections remain unchecked until the footer Check; Continue places only the taught next step', () => {
  const exercise = lessons.flatMap((lesson) => lesson.exercises).find((item) => item.type === 'sort')!;
  if (exercise.type !== 'sort') throw new Error('Missing sort exercise');
  const wrong = exercise.items.find((item) => item.id !== exercise.correctOrder[0])!;
  const answer = [wrong.id];
  assert.equal(lessonStepReady(exercise, answer), true);
  assert.equal(checkLessonStep(exercise, answer).correct, false);
  const continued = continueLessonStep(exercise, answer);
  assert.deepEqual(continued.answer, [exercise.correctOrder[0]]);
  assert.equal(continued.finished, false);
  assert.equal(lessonStepReady(exercise, continued.answer, continued.position), false);
});

test('five explicit wrong checks exhaust a lesson, with no paid flags and no reward eligibility', () => {
  let attempt = createLessonAttempt();
  const same = recordLessonCheck(attempt, true);
  assert.equal(same, attempt);
  for (let index = 0; index < 5; index++) attempt = recordLessonCheck(attempt, false);
  assert.equal(attempt.hearts, 0);
  assert.equal(attempt.mistakes, 5);
  assert.equal(canAwardLessonAttempt(attempt), false);
  assert.equal(recordLessonCheck(attempt, false), attempt);
  const practice = practiceLessonAttempt(attempt);
  assert.equal(practice.practice, true);
  assert.equal(canAwardLessonAttempt(practice), false);
  assert.equal(recordLessonCheck(practice, false).hearts, 0);
  assert.deepEqual(createLessonAttempt(), { hearts: 5, mistakes: 0, practice: false });
});

test('every authored sort and category advances through every part using the same Check/Continue model', () => {
  for (const exercise of lessons.flatMap((lesson) => lesson.exercises)) {
    if (exercise.type !== 'sort' && exercise.type !== 'categorize') continue;
    let answer: ExerciseAnswer = exercise.type === 'sort' ? [] : {};
    for (let position = 0; position < lessonStepCount(exercise); position++) {
      answer = exercise.type === 'sort'
        ? [...(answer as string[]), exercise.correctOrder[position]]
        : { ...(answer as Record<string, string>), [exercise.items[position].id]: exercise.correctCategories[exercise.items[position].id] };
      assert.equal(checkLessonStep(exercise, answer, position).correct, true);
      const continued = continueLessonStep(exercise, answer, position);
      assert.equal(continued.finished, position === lessonStepCount(exercise) - 1);
      answer = continued.answer;
    }
    assert.equal(lessonStepReady(exercise, answer, -1), false);
    assert.equal(lessonStepReady(exercise, answer, lessonStepCount(exercise)), false);
  }
});
