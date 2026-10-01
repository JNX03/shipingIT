import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyGameDraft } from '../state';
import {
  applyWalkthroughFix,
  arrangeScreen,
  requiredFlowEdges,
  staffFlowEdges,
} from '../logic/build';
import {
  canCheckLaunchTask,
  launchTaskAttemptComplete,
  launchTaskResult,
  recordLaunchTaskAction,
  tryLaunchTaskAction,
} from './launch-task';

function prototype() {
  const draft = emptyGameDraft();
  draft.design.spacing = 8;
  draft.design.blocks = ['title', 'queue', 'updated', 'button'].map((kind) => ({
    id: kind,
    kind: kind as 'title' | 'queue' | 'updated' | 'button',
    x: 16,
    y: 0,
  }));
  draft.design = arrangeScreen(draft.design);
  draft.connect.links = requiredFlowEdges.map((edge) => {
    const [from, to] = edge.split('>');
    return { from, to };
  });
  return draft;
}

test('a task requires its actual preview action and does not borrow another task attempt', () => {
  const draft = prototype();
  assert.equal(canCheckLaunchTask(null, draft, 'mali'), false);
  const attempt = recordLaunchTaskAction(null, draft, 'mali', 'refresh');
  assert.equal(attempt.completed, 0);
  const chosen = recordLaunchTaskAction(attempt, draft, 'mali', 'choose');
  assert.equal(launchTaskAttemptComplete(chosen, draft, 'mali'), true);
  assert.equal(canCheckLaunchTask(chosen, draft, 'mali'), true);
  assert.equal(launchTaskAttemptComplete(chosen, draft, 'ken'), false);
  assert.equal(tryLaunchTaskAction(null, draft, 'mali', 'choose', 'Rice stall').phase, 'issue');
  assert.equal(
    launchTaskResult('mali', draft).valid,
    false,
    'trying is not enough when spacing fails',
  );
});

test('freshness task requires refresh before choice, and repeated taps do not create extra progress', () => {
  const draft = prototype();
  let attempt = recordLaunchTaskAction(null, draft, 'ken', 'choose');
  assert.equal(attempt.completed, 0);
  attempt = recordLaunchTaskAction(attempt, draft, 'ken', 'refresh');
  assert.equal(canCheckLaunchTask(attempt, draft, 'ken'), false);
  attempt = recordLaunchTaskAction(attempt, draft, 'ken', 'choose');
  assert.equal(launchTaskAttemptComplete(attempt, draft, 'ken'), true);
  attempt = recordLaunchTaskAction(attempt, draft, 'ken', 'choose');
  assert.equal(attempt.completed, 2);
  const fixed = { ...draft, ...applyWalkthroughFix('freshness-first', draft) };
  const refreshed = tryLaunchTaskAction(null, fixed, 'ken', 'refresh');
  assert.equal(refreshed.phase, 'idle');
  assert.equal(tryLaunchTaskAction(refreshed.attempt, fixed, 'ken', 'choose').phase, 'passed');
});

test('changing layout or wires invalidates recorded task actions and resets progress on retry', () => {
  const draft = prototype();
  const attempt = recordLaunchTaskAction(null, draft, 'mali', 'choose');
  draft.design.spacing = 12;
  assert.equal(launchTaskAttemptComplete(attempt, draft, 'mali'), false);
  const retried = recordLaunchTaskAction(attempt, draft, 'mali', 'choose');
  assert.equal(launchTaskAttemptComplete(retried, draft, 'mali'), true);
  draft.connect.links.push({ from: 'report', to: 'save' });
  assert.equal(launchTaskAttemptComplete(retried, draft, 'mali'), false);
});

test('a blocked staff path can show a failure, while a repaired path requires a successful publish action', () => {
  const draft = prototype();
  assert.equal(canCheckLaunchTask(null, draft, 'noa'), true);
  assert.equal(launchTaskResult('noa', draft).valid, false);
  const failedAction = tryLaunchTaskAction(null, draft, 'noa', 'staff-update');
  assert.equal(failedAction.phase, 'issue');
  assert.equal(failedAction.actionResult.worked, false);
  assert.equal(failedAction.attempt, null);
  draft.connect.links.push(
    ...staffFlowEdges.map((edge) => {
      const [from, to] = edge.split('>');
      return { from, to };
    }),
  );
  assert.equal(launchTaskResult('noa', draft).valid, true);
  assert.equal(canCheckLaunchTask(null, draft, 'noa'), false);
  const refreshed = recordLaunchTaskAction(null, draft, 'noa', 'refresh');
  assert.equal(canCheckLaunchTask(refreshed, draft, 'noa'), false);
  const published = recordLaunchTaskAction(refreshed, draft, 'noa', 'staff-update');
  assert.equal(canCheckLaunchTask(published, draft, 'noa'), true);
  const publishedAction = tryLaunchTaskAction(null, draft, 'noa', 'staff-update');
  assert.equal(publishedAction.phase, 'passed');
  assert.equal(publishedAction.actionResult.worked, true);
});

test('each result changes with the real layout or staff wiring and repairs clear previous passes', () => {
  let draft = prototype();
  for (const id of ['mali', 'ken', 'noa'] as const)
    assert.equal(launchTaskResult(id, draft).valid, false);
  draft.launch.testRun = ['mali', 'ken', 'noa'];
  draft.launch.shipped = true;
  for (const issue of ['crowded-choices', 'freshness-first', 'staff-update'] as const) {
    draft = { ...draft, ...applyWalkthroughFix(issue, draft) };
    assert.deepEqual(draft.launch.testRun, []);
    assert.equal(draft.launch.shipped, false);
  }
  for (const id of ['mali', 'ken', 'noa'] as const)
    assert.equal(launchTaskResult(id, draft).valid, true);
});
