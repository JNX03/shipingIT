import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons, missions, worlds } from '../data/curriculum';
import { achievementDefinitions } from '../data/achievements';
import {
  createEmptyProject,
  getProjectProgress,
  makeProjectPack,
  projectFields,
  projectStages,
} from './project';
import {
  createInitialState,
  evaluateExercise,
  getDailyProgress,
  getLessonState,
  getLevel,
  getMissionProgress,
  getStreak,
  isValidDateKey,
  normalizePersistedState,
  parsePersistedState,
  reduceCompleteLesson,
} from './progression';
import type { Exercise, ExerciseAnswer, Project } from './types';

function completedProject(): Project {
  return Object.fromEntries(
    projectFields.map((field) => [
      field,
      `Test fixture for ${field}: a specific, clearly labeled practice plan with a target user and next step. Not real evidence.`,
    ]),
  ) as unknown as Project;
}
test('every project field has one editable milestone and appears in the pack', () => {
  const editable = projectStages.flatMap((stage) => stage.fields);
  assert.deepEqual([...editable].sort(), [...projectFields].sort());
  assert.equal(new Set(editable).size, editable.length);
  const filled = completedProject();
  assert.equal(getProjectProgress(filled).percent, 100);
  const pack = makeProjectPack(filled);
  for (const key of projectFields) assert.ok(pack.includes(filled[key]));
});
function answerFor(exercise: Exercise): ExerciseAnswer {
  if (exercise.type === 'choice' || exercise.type === 'multi') return exercise.correctAnswerIds;
  if (exercise.type === 'sort') return exercise.correctOrder;
  if (exercise.type === 'categorize') return exercise.correctCategories;
  return completedProject();
}

test('curriculum has eight connected missions, 32 unique lessons and executable exercises', () => {
  assert.equal(missions.length, 8);
  assert.equal(lessons.length, 32);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 32);
  assert.equal(worlds.length, 8);
  const exerciseIds = lessons.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id));
  assert.equal(new Set(exerciseIds).size, exerciseIds.length);
  for (const mission of missions) {
    assert.equal(mission.lessonIds.length, 4);
    assert.ok(mission.guidebook.length > 0);
    assert.ok(
      mission.lessonIds.every((id) =>
        lessons.some((lesson) => lesson.id === id && lesson.missionId === mission.id),
      ),
    );
  }
  for (const lesson of lessons) {
    assert.ok(lesson.exercises.length >= 3);
    assert.ok(
      lesson.exercises.some((exercise) => exercise.type === 'project'),
      `${lesson.id} creates a project artifact`,
    );
    for (const exercise of lesson.exercises) {
      assert.ok(exercise.explanation.length > 30);
      assert.equal(evaluateExercise(exercise, answerFor(exercise)).correct, true, exercise.id);
      assert.equal(
        evaluateExercise(exercise, []).correct,
        false,
        `${exercise.id} rejects an empty response`,
      );
      if (exercise.type === 'choice' || exercise.type === 'multi')
        assert.ok(
          exercise.correctAnswerIds.every((id) =>
            exercise.options.some((option) => option.id === id),
          ),
        );
    }
  }
});

test('answers reject duplicate selections, wrong order, incorrect categories and empty project fields', () => {
  const first = lessons[0]!.exercises[0]!;
  assert.equal(evaluateExercise(first, ['1', '1']).correct, false);
  const sort = lessons
    .flatMap((lesson) => lesson.exercises)
    .find((exercise) => exercise.type === 'sort')!;
  assert.equal(evaluateExercise(sort, ['0', '1', '2', '3']).correct, false);
  const category = lessons[0]!.exercises[1]!;
  assert.equal(
    evaluateExercise(category, { '0': '0', '1': '0', '2': '0', '3': '0' }).correct,
    false,
  );
  const task = lessons[0]!.exercises.find((exercise) => exercise.type === 'project')!;
  assert.equal(evaluateExercise(task, { problem: ' '.repeat(100) }).correct, false);
  assert.equal(evaluateExercise(task, { problem: 'a'.repeat(12_001) }).correct, false);
});

test('completion is gated, awards XP once, and project edits alone cannot unlock lessons', () => {
  const initial = createInitialState();
  initial.project = completedProject();
  assert.equal(getLessonState('discover-1', initial.completedLessonIds), 'current');
  assert.equal(getLessonState('discover-2', initial.completedLessonIds), 'locked');
  assert.equal(reduceCompleteLesson(initial, 'discover-2').result.success, false);
  assert.equal(reduceCompleteLesson(initial, 'unknown').result.success, false);
  assert.equal(reduceCompleteLesson(createInitialState(), 'discover-1').result.success, false);
  const first = reduceCompleteLesson(
    initial,
    'discover-1',
    { perfect: true },
    new Date(2026, 8, 28, 23, 59),
  );
  assert.equal(first.result.xpEarned, 20);
  assert.ok(first.result.newAchievements.includes('problem-hunter'));
  assert.equal(getLessonState('discover-2', first.state.completedLessonIds), 'current');
  assert.equal(
    getLessonState('discover-1', first.state.completedLessonIds, first.state.lessonCompletions),
    'mastered',
  );
  const repeat = reduceCompleteLesson(
    first.state,
    'discover-1',
    { perfect: true },
    new Date(2026, 8, 28, 23, 59),
  );
  assert.equal(repeat.result.xpEarned, 0);
  assert.equal(repeat.state.xp, 20);
  assert.equal(repeat.state.completedLessonIds.length, 1);
  assert.deepEqual(repeat.result.newAchievements, []);
  assert.equal(getDailyProgress(repeat.state, new Date(2026, 8, 28)).completed, 1);
});

test('replay counts once on a new calendar day without XP farming', () => {
  const initial = createInitialState();
  initial.project = completedProject();
  initial.profile.dailyGoal = 2;
  const dayOne = new Date(2026, 8, 28, 23, 59);
  const dayTwo = new Date(2026, 8, 29, 0, 1);
  const first = reduceCompleteLesson(initial, 'discover-1', {}, dayOne).state;
  const replay = reduceCompleteLesson(first, 'discover-1', {}, dayTwo).state;
  const repeat = reduceCompleteLesson(replay, 'discover-1', {}, dayTwo).state;
  assert.equal(repeat.xp, first.xp);
  assert.equal(getDailyProgress(repeat, dayTwo).completed, 1);
  assert.equal(getDailyProgress(repeat, dayTwo).complete, false);
  assert.equal(getStreak(repeat.activityDates, dayTwo), 2);
  assert.equal(repeat.lessonCompletions['discover-1']?.completedAt, '2026-09-28');
});

test('calendar streak handles yesterday grace, gaps, leap days, duplicates, and invalid/future dates', () => {
  const today = new Date(2026, 8, 29, 0, 1);
  assert.equal(getStreak(['2026-09-27', '2026-09-28', '2026-09-29'], today), 3);
  assert.equal(getStreak(['2026-09-27', '2026-09-28'], today), 2);
  assert.equal(getStreak(['2026-09-27'], today), 0);
  assert.equal(getStreak(['2026-09-28', '2026-09-28', '2026-09-30', 'broken'], today), 1);
  assert.equal(getStreak(['2024-02-28', '2024-02-29', '2024-03-01'], new Date(2024, 2, 1)), 3);
  assert.equal(isValidDateKey('2026-02-29'), false);
  assert.equal(isValidDateKey('2026-09-31'), false);
  assert.equal(isValidDateKey('2024-02-29'), true);
});

test('all missions can complete sequentially and final progression remains stable', () => {
  let state = createInitialState();
  state.project = completedProject();
  for (const lesson of lessons) {
    const result = reduceCompleteLesson(state, lesson.id, {}, new Date(2026, 8, 29));
    assert.equal(result.result.success, true, lesson.id);
    const mission = missions.find((item) => item.id === lesson.missionId)!;
    assert.equal(
      result.result.missionCompleted,
      mission.lessonIds.at(-1) === lesson.id ? mission.id : null,
    );
    state = result.state;
  }
  assert.equal(
    state.xp,
    lessons.reduce((sum, lesson) => sum + lesson.xp, 0),
  );
  assert.equal(getMissionProgress(8, state.completedLessonIds).complete, true);
  assert.equal(getLevel(state.xp), Math.floor(state.xp / 100) + 1);
  assert.ok(state.achievements.includes('pathfinder'));
  assert.ok(
    state.achievements.every((id) => achievementDefinitions.some((item) => item.id === id)),
  );
});

test('malformed saves recover safely and forged counters do not unlock the path', () => {
  assert.equal(parsePersistedState('{not json').recovered, true);
  assert.equal(parsePersistedState(JSON.stringify(createInitialState())).recovered, false);
  assert.equal(
    parsePersistedState(
      JSON.stringify({
        ...createInitialState(),
        project: { problem: 'Preserve the valid note.', targetUser: 42 },
      }),
    ).recovered,
    true,
  );
  assert.deepEqual(parsePersistedState(null).state, createInitialState());
  const state = normalizePersistedState(
    {
      schemaVersion: 1,
      xp: 99_999,
      completedLessonIds: ['discover-1', 'discover-1', 'ship-4'],
      project: { problem: 'A valid problem survives a broken neighboring field.', targetUser: 42 },
      profile: { name: 'Sam', dailyGoal: 999, world: 'not-a-world' },
      settings: { sound: false, haptics: 'yes' },
      achievements: ['pathfinder'],
      activityDates: ['2026-09-28', '2099-01-01', '2026-02-31'],
      lessonCompletions: { 'ship-4': { perfect: true, completedAt: '2026-09-28' } },
    },
    new Date(2026, 8, 29),
  );
  assert.equal(state.project.problem, 'A valid problem survives a broken neighboring field.');
  assert.equal(state.project.targetUser, '');
  assert.deepEqual(state.completedLessonIds, ['discover-1']);
  assert.equal(state.xp, 20);
  assert.equal(state.profile.dailyGoal, 1);
  assert.equal(state.profile.world, 'school');
  assert.equal(state.settings.sound, false);
  assert.equal(state.settings.haptics, true);
  assert.equal(state.achievements.includes('pathfinder'), false);
  assert.deepEqual(state.activityDates, ['2026-09-28']);
});

test('daily goals count distinct lessons and awards persist after a streak expires', () => {
  let state = createInitialState();
  state.project = completedProject();
  state.profile.dailyGoal = 2;
  const day = new Date(2026, 8, 27);
  state = reduceCompleteLesson(state, 'discover-1', {}, day).state;
  assert.equal(getDailyProgress(state, day).complete, false);
  state = reduceCompleteLesson(state, 'discover-2', {}, day).state;
  assert.equal(getDailyProgress(state, day).complete, true);
  state = reduceCompleteLesson(state, 'discover-2', {}, new Date(2026, 8, 28)).state;
  state = reduceCompleteLesson(state, 'discover-2', {}, new Date(2026, 8, 29)).state;
  assert.ok(state.achievements.includes('three-day-streak'));
  const recovered = normalizePersistedState(state, new Date(2026, 9, 5));
  assert.equal(getStreak(recovered.activityDates, new Date(2026, 9, 5)), 0);
  assert.ok(recovered.achievements.includes('three-day-streak'));
});

test('project completeness and pack never invent project evidence', () => {
  const empty = createEmptyProject();
  assert.equal(getProjectProgress(empty).percent, 0);
  const full = completedProject();
  assert.equal(getProjectProgress(full).percent, 100);
  assert.equal(getProjectProgress(full).completedStages, 10);
  const pack = makeProjectPack(empty, 'Sam');
  assert.ok(pack.includes('Not recorded yet.'));
  assert.ok(pack.includes('not independently verified'));
  assert.ok(pack.includes('Prepared by Sam'));
});
