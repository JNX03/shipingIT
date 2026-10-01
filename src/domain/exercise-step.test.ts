import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons } from '../data/curriculum';
import { checkCategoryStatement, checkNextSortStep } from '../components/learning/exercise-step';

test('every categorization checks one statement and names the authored correct category on a mistake', () => {
  for (const exercise of lessons.flatMap((lesson) => lesson.exercises)) {
    if (exercise.type !== 'categorize') continue;
    const original = structuredClone(exercise);
    for (const item of exercise.items) {
      const expected: string = exercise.correctCategories[item.id];
      assert.equal(checkCategoryStatement(exercise, item.id, expected).correct, true);
      const wrong = exercise.categories.find((category) => category.id !== expected)!;
      const result = checkCategoryStatement(exercise, item.id, wrong.id);
      assert.equal(result.correct, false);
      assert.ok(result.message.includes(exercise.categories.find((category) => category.id === expected)!.label));
    }
    assert.equal(checkCategoryStatement(exercise, 'missing', 'missing').correct, false);
    assert.deepEqual(exercise, original);
  }
});

test('every sorting task accepts each real next step and never appends a wrong or duplicate step', () => {
  for (const exercise of lessons.flatMap((lesson) => lesson.exercises)) {
    if (exercise.type !== 'sort') continue;
    let selected: string[] = [];
    for (const next of exercise.correctOrder) {
      const before = [...selected];
      const wrong = exercise.items.find((item) => item.id !== next)!;
      const rejected = checkNextSortStep(exercise, selected, wrong.id);
      assert.equal(rejected.correct, false);
      assert.deepEqual(rejected.nextAnswer, before);
      assert.deepEqual(selected, before);
      const accepted = checkNextSortStep(exercise, selected, next);
      assert.equal(accepted.correct, true);
      selected = accepted.nextAnswer;
    }
    assert.deepEqual(selected, exercise.correctOrder);
    assert.equal(checkNextSortStep(exercise, selected, selected[0]!).correct, false);
  }
});
