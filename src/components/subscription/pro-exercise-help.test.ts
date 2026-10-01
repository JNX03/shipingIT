import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons } from '../../data/curriculum';
import { buildProExerciseHelp } from './pro-exercise-help';

test('every core question has approach, authored reasoning and a complete worked example', () => {
  for (const lesson of lessons)
    for (const exercise of lesson.exercises) {
      const steps = buildProExerciseHelp(exercise);
      assert.equal(steps.length, 3, exercise.id);
      assert.ok(
        steps.every(
          (step) => step.lines.length > 0 && step.lines.every((line) => line.trim().length > 0),
        ),
        exercise.id,
      );
      assert.ok(steps[0].lines.includes(exercise.hint));
      assert.ok(steps[1].lines.includes(exercise.explanation));
      const worked = steps[2].lines.join('\n');
      if (exercise.type === 'choice' || exercise.type === 'multi') {
        for (const id of exercise.correctAnswerIds)
          assert.ok(
            worked.includes(exercise.options.find((option) => option.id === id)!.text),
            exercise.id,
          );
      } else if (exercise.type === 'sort') {
        for (const [index, id] of exercise.correctOrder.entries())
          assert.ok(
            worked.includes(`${index + 1}. ${exercise.items.find((item) => item.id === id)!.text}`),
            exercise.id,
          );
      } else if (exercise.type === 'categorize') {
        for (const item of exercise.items)
          assert.ok(
            worked.includes(
              `${item.text} → ${exercise.categories.find((category) => category.id === exercise.correctCategories[item.id])!.label}`,
            ),
            exercise.id,
          );
      } else {
        assert.ok(worked.includes('Fictional'), exercise.id);
        for (const field of exercise.fields)
          assert.ok(worked.includes(`${field.label}:`), exercise.id);
      }
    }
});
test('help generation does not mutate the authored free hint, answer key, or exercise', () => {
  const exercise = lessons[0].exercises[0];
  const before = JSON.stringify(exercise);
  buildProExerciseHelp(exercise);
  assert.equal(JSON.stringify(exercise), before);
});
