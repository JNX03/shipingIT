import type { CategorizeExercise, SortExercise } from '../../domain/types';

const reason = (explanation: string) => explanation.split(/(?<=[.!?])\s+/)[0];

export function checkCategoryStatement(exercise: CategorizeExercise, itemId: string, categoryId: string) {
  const expected = exercise.correctCategories[itemId];
  const label = exercise.categories.find((category) => category.id === expected)?.label;
  const valid = exercise.items.some((item) => item.id === itemId) && Boolean(label);
  const correct = valid && categoryId === expected;
  return {
    correct,
    message: correct ? `Right — ${label}.` : valid ? `This belongs in “${label}”. ${reason(exercise.explanation)}` : 'Choose an available statement and category.',
  };
}

export function checkNextSortStep(exercise: SortExercise, selected: readonly string[], chosen: string) {
  const expected = exercise.correctOrder[selected.length];
  const correct = Boolean(expected) && !selected.includes(chosen) && chosen === expected && selected.every((id, index) => id === exercise.correctOrder[index]);
  const expectedText = exercise.items.find((item) => item.id === expected)?.text;
  return {
    correct,
    nextAnswer: correct ? [...selected, chosen] : [...selected],
    message: correct ? `Step ${selected.length + 1} is right.` : expectedText ? `Next comes “${expectedText}”. ${reason(exercise.explanation)}` : 'This sequence is complete. Check your answer.',
  };
}
