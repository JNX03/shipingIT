import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { getCompletionInfo } from './completion';
import { issueCompletionReceipt, revokeCompletionReceipt } from './completion-receipt';
import { createEmptyProject, projectFields } from './project';
import { createInitialState, reduceCompleteLesson } from './progression';
import type { CompletionResult, Project } from './types';

const project = createEmptyProject();
const now = new Date(2026, 8, 30);
afterEach(() => revokeCompletionReceipt());

function savedFirstLesson() {
  const initial = createInitialState();
  initial.project.problem = 'QA hypothesis: students lose time finding the current deadline.';
  return reduceCompleteLesson(initial, 'discover-1', {}, now);
}

function savedFirstMission() {
  let state = createInitialState();
  state.project = Object.fromEntries(
    projectFields.map((field) => [
      field,
      `QA fictional practice plan for ${field}; this is a review fixture, not observed evidence.`,
    ]),
  ) as unknown as Project;
  let result: CompletionResult;
  for (const id of ['discover-1', 'discover-2', 'discover-3', 'discover-4']) {
    const completion = reduceCompleteLesson(state, id, {}, now);
    assert.equal(completion.result.success, true);
    state = completion.state;
    result = completion.result;
  }
  return { state, result: result! };
}

test('a direct completion URL cannot celebrate an uncompleted or unknown lesson', () => {
  const completion = savedFirstLesson();
  const receipt = issueCompletionReceipt('discover-1', completion.result);
  assert.equal(
    getCompletionInfo(
      { id: 'discover-1', receipt, xp: '20' },
      { completedLessonIds: [], achievements: [], project },
    ),
    null,
  );
  assert.equal(
    getCompletionInfo(
      { id: 'unknown' },
      { completedLessonIds: ['unknown'], achievements: [], project },
    ),
    null,
  );
});

test('missing or invalid receipts ignore old URL XP, badges and mission metadata', () => {
  const completion = savedFirstMission();
  const receipt = issueCompletionReceipt('discover-4', completion.result);
  for (const token of [undefined, '', 'old-token', [receipt], 42]) {
    const result = getCompletionInfo(
      {
        id: 'discover-4',
        receipt: token,
        xp: '9000',
        mission: '1',
        badges: 'problem-hunter,curious-mind,pathfinder',
      },
      completion.state,
    )!;
    assert.equal(result.earned, 0);
    assert.deepEqual(result.newAchievements, []);
    assert.equal(result.mission, undefined);
    assert.equal(result.nextMission, undefined);
  }
});

test('a matching receipt uses the actual completion despite tampered URL metadata', () => {
  const completion = savedFirstLesson();
  assert.deepEqual(completion.result.newAchievements, ['problem-hunter']);
  const receipt = issueCompletionReceipt('discover-1', completion.result);
  const result = getCompletionInfo(
    { id: 'discover-1', receipt, xp: '0', mission: '8', badges: 'pathfinder' },
    completion.state,
  )!;
  assert.equal(result.earned, completion.result.xpEarned);
  assert.deepEqual(result.newAchievements, ['problem-hunter']);
  assert.equal(result.mission, undefined);
});

test('a receipt cannot celebrate another completed lesson', () => {
  const completion = savedFirstMission();
  const receipt = issueCompletionReceipt('discover-4', completion.result);
  const result = getCompletionInfo(
    { id: 'discover-1', receipt, xp: '20', badges: 'problem-hunter' },
    completion.state,
  )!;
  assert.equal(result.earned, 0);
  assert.deepEqual(result.newAchievements, []);
});

test('leaving results or starting another completion invalidates the old celebration', () => {
  const completion = savedFirstLesson();
  const receipt = issueCompletionReceipt('discover-1', completion.result);
  revokeCompletionReceipt(receipt);
  const stale = getCompletionInfo(
    { id: 'discover-1', receipt, xp: '20', badges: 'problem-hunter' },
    completion.state,
  )!;
  assert.equal(stale.earned, 0);
  assert.deepEqual(stale.newAchievements, []);

  const newReceipt = issueCompletionReceipt('discover-1', completion.result);
  const replay = reduceCompleteLesson(completion.state, 'discover-1', {}, now);
  const replayReceipt = issueCompletionReceipt('discover-1', replay.result);
  assert.equal(
    getCompletionInfo({ id: 'discover-1', receipt: newReceipt }, replay.state)?.earned,
    0,
  );
  const result = getCompletionInfo(
    { id: 'discover-1', receipt: replayReceipt, xp: '20', badges: 'problem-hunter' },
    replay.state,
  )!;
  assert.equal(result.earned, 0);
  assert.deepEqual(result.newAchievements, []);
  assert.equal(replay.state.xp, completion.state.xp);
});

test('mission results collect saved outputs and unlock only from the actual completed mission', () => {
  const completion = savedFirstMission();
  const receipt = issueCompletionReceipt('discover-4', completion.result);
  const result = getCompletionInfo({ id: 'discover-4', receipt }, completion.state)!;
  assert.equal(result.mission?.id, 1);
  assert.equal(result.earned, 40);
  assert.equal(result.nextMission?.id, 2);
  const keys = result.projectFields.map((field) => field.key);
  assert.ok(keys.includes('problem'));
  assert.ok(keys.includes('observations'));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(
    result.projectFields.every((field) => completion.state.project[field.key].trim().length > 0),
  );

  const incomplete = {
    ...completion.state,
    completedLessonIds: ['discover-4'],
    achievements: [],
  };
  const missingProgress = getCompletionInfo({ id: 'discover-4', receipt }, incomplete)!;
  assert.equal(missingProgress.mission, undefined);
  assert.equal(missingProgress.nextMission, undefined);
  assert.deepEqual(missingProgress.newAchievements, []);
});

test('completed lesson fallback keeps existing saved work without claiming a new mission', () => {
  const completion = savedFirstMission();
  completion.state.project.description = '';
  const result = getCompletionInfo(
    { id: 'discover-4', xp: '40', mission: '1', badges: 'problem-hunter' },
    completion.state,
  )!;
  assert.equal(result.earned, 0);
  assert.equal(result.mission, undefined);
  assert.ok(!result.projectFields.some((field) => field.key === 'problem'));
  assert.ok(
    result.projectFields.every((field) => completion.state.project[field.key].trim().length > 0),
  );
});
