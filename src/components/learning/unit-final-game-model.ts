import type { Exercise, ExerciseAnswer, Lesson, ProjectField } from '../../domain/types';

export type UnitFinalLayout =
  | 'evidence-board'
  | 'cause-map'
  | 'backpack'
  | 'prototype'
  | 'test-bay'
  | 'resource-balance'
  | 'wire-journey'
  | 'launch-route';
export interface UnitFinalGameDefinition {
  lessonId: string;
  unitId: number;
  layout: UnitFinalLayout;
  title: string;
  npc: 'mali' | 'noa' | 'ken';
  goal: string;
  icon: 'discover' | 'define' | 'scope' | 'prototype' | 'validate' | 'business' | 'build' | 'ship';
  action: string;
  destination: string;
  checkLabel: string;
  stages: [string, string, string];
}

/** Presentation only. The original lesson/exercise IDs, answer keys and ledgers remain authoritative. */
export const unitFinalGames: readonly UnitFinalGameDefinition[] = [
  {
    lessonId: 'discover-4',
    unitId: 1,
    layout: 'evidence-board',
    title: 'The discovery board',
    npc: 'mali',
    goal: 'Help me choose a problem we can actually investigate, then leave a question to check it.',
    icon: 'discover',
    action: 'Pin',
    destination: 'Discovery plan',
    checkLabel: 'Check the board',
    stages: ['Choose a lead', 'Find evidence', 'Leave a plan'],
  },
  {
    lessonId: 'define-4',
    unitId: 2,
    layout: 'cause-map',
    title: 'Connect the need',
    npc: 'ken',
    goal: 'Connect the situation to the difficulty so I know what progress would help.',
    icon: 'define',
    action: 'Connect',
    destination: 'Problem brief',
    checkLabel: 'Check the connections',
    stages: ['Find the pattern', 'Name the progress', 'Write the brief'],
  },
  {
    lessonId: 'scope-4',
    unitId: 3,
    layout: 'backpack',
    title: 'Pack the route',
    npc: 'noa',
    goal: 'Pack a complete route to the useful result. Leave decoration behind and plan a way back when blocked.',
    icon: 'scope',
    action: 'Pack',
    destination: 'Core journey',
    checkLabel: 'Check the route',
    stages: ['Pack the steps', 'Remove a blocker', 'Map recovery'],
  },
  {
    lessonId: 'prototype-4',
    unitId: 4,
    layout: 'prototype',
    title: 'Rehearsal studio',
    npc: 'mali',
    goal: 'Prepare a task I can attempt without being told which button to press.',
    icon: 'prototype',
    action: 'Use',
    destination: 'Participant task',
    checkLabel: 'Check the rehearsal',
    stages: ['Rehearse', 'Choose the task', 'Record blockers'],
  },
  {
    lessonId: 'validate-4',
    unitId: 5,
    layout: 'test-bay',
    title: 'The decision workshop',
    npc: 'ken',
    goal: 'Use what the practice case shows to choose a next experiment. Keep unknowns visible.',
    icon: 'validate',
    action: 'Try',
    destination: 'Next experiment',
    checkLabel: 'Check the decision',
    stages: ['Choose a change', 'Route the cases', 'Plan a retest'],
  },
  {
    lessonId: 'business-4',
    unitId: 6,
    layout: 'resource-balance',
    title: 'Keep the promise possible',
    npc: 'noa',
    goal: 'Check access, time, permission and running costs before we depend on the plan.',
    icon: 'business',
    action: 'Include',
    destination: 'Delivery checks',
    checkLabel: 'Check the balance',
    stages: ['Check resources', 'Handle lost access', 'Test feasibility'],
  },
  {
    lessonId: 'build-4',
    unitId: 7,
    layout: 'wire-journey',
    title: 'Wire a reliable outcome',
    npc: 'ken',
    goal: 'Connect the promise to a useful measure, then decide if people can rely on the saved result.',
    icon: 'build',
    action: 'Wire',
    destination: 'Outcome check',
    checkLabel: 'Check the journey',
    stages: ['Choose the measure', 'Judge reliability', 'Record readiness'],
  },
  {
    lessonId: 'ship-4',
    unitId: 8,
    layout: 'launch-route',
    title: 'The handoff run',
    npc: 'mali',
    goal: 'Leave an inspectable project pack, then choose what to learn from the next version.',
    icon: 'ship',
    action: 'Load',
    destination: 'Project pack',
    checkLabel: 'Check the handoff',
    stages: ['Pack the artifact', 'Choose improvement', 'Leave next steps'],
  },
];

type LessonIdentity = string | Pick<Lesson, 'id' | 'missionId'>;
export function unitFinalGameForLesson(lesson: LessonIdentity) {
  return unitFinalGames.find(
    (game) =>
      game.lessonId === (typeof lesson === 'string' ? lesson : lesson.id) &&
      (typeof lesson === 'string' || game.unitId === lesson.missionId),
  );
}
export function isUnitFinalLesson(lesson: LessonIdentity): boolean {
  return Boolean(unitFinalGameForLesson(lesson));
}

export type UnitFinalMove =
  | { type: 'choose'; id: string }
  | { type: 'sequence'; id: string; index?: number }
  | { type: 'undo-sequence'; index: number }
  | { type: 'categorize'; itemId: string; categoryId: string }
  | { type: 'write'; field: ProjectField; text: string };

/** All moves retain source IDs. This never evaluates completion, writes storage or grants rewards. */
export function applyUnitFinalMove(
  exercise: Exercise,
  answer: ExerciseAnswer,
  move: UnitFinalMove,
): ExerciseAnswer {
  if (move.type === 'choose' && (exercise.type === 'choice' || exercise.type === 'multi')) {
    if (!exercise.options.some((option) => option.id === move.id)) return answer;
    const selected = Array.isArray(answer) ? answer : [];
    return exercise.type === 'choice'
      ? [move.id]
      : selected.includes(move.id)
        ? selected.filter((id) => id !== move.id)
        : [...selected, move.id];
  }
  if (exercise.type === 'sort' && Array.isArray(answer)) {
    if (move.type === 'sequence' && exercise.items.some((item) => item.id === move.id)) {
      const index = move.index ?? answer.length;
      if (!Number.isInteger(index) || index < 0 || index > answer.length) return answer;
      const prefix = answer.slice(0, index);
      return prefix.includes(move.id) ? answer : [...prefix, move.id];
    }
    if (
      move.type === 'undo-sequence' &&
      Number.isInteger(move.index) &&
      move.index >= 0 &&
      move.index < answer.length
    )
      return answer.slice(0, move.index);
  }
  if (
    move.type === 'categorize' &&
    exercise.type === 'categorize' &&
    !Array.isArray(answer) &&
    exercise.items.some((item) => item.id === move.itemId) &&
    exercise.categories.some((category) => category.id === move.categoryId)
  )
    return { ...answer, [move.itemId]: move.categoryId };
  if (
    move.type === 'write' &&
    exercise.type === 'project' &&
    !Array.isArray(answer) &&
    exercise.fields.some((field) => field.key === move.field)
  )
    return { ...answer, [move.field]: move.text };
  return answer;
}

/** A preview describes the user's current draft, never a passed test or a real-world result. */
export function unitFinalDraftLabels(exercise: Exercise, answer: ExerciseAnswer): string[] {
  if (exercise.type === 'choice' || exercise.type === 'multi') {
    const selected = Array.isArray(answer) ? answer : [];
    return selected.flatMap((id) => {
      const option = exercise.options.find((item) => item.id === id);
      return option ? [option.text] : [];
    });
  }
  if (exercise.type === 'sort')
    return (Array.isArray(answer) ? answer : []).flatMap((id) => {
      const item = exercise.items.find((item) => item.id === id);
      return item ? [item.text] : [];
    });
  if (Array.isArray(answer)) return [];
  if (exercise.type === 'categorize')
    return exercise.items.flatMap((item) => {
      const category = exercise.categories.find(
        (category) => category.id === (answer as Record<string, string>)[item.id],
      );
      return category ? [`${item.text} → ${category.label}`] : [];
    });
  return exercise.fields.flatMap((field) => {
    const text = String((answer as Record<string, string>)[field.key] ?? '').trim();
    return text ? [`${field.label}: ${text}`] : [];
  });
}
