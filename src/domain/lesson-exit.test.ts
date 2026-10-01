import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialLessonExitState, createLessonExitFlow } from './lesson-exit';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((pass, fail) => {
    resolve = pass;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/** Native presentation changes on a new instance or a changed prop, not on each React render. */
function harness(attempts: ReturnType<typeof deferred>[], deferParentClose = false) {
  let state = createInitialLessonExitState();
  let visible = true;
  let focused = true;
  let nativeKey = state.presentationKey;
  let nativeProp = true;
  let nativePresented = true;
  let writes = 0;
  let keeps = 0;
  let publications = 0;
  const render = () => {
    const presented = focused && (visible || state.retryVisible);
    if (nativeKey !== state.presentationKey || nativeProp !== presented) {
      nativePresented = presented;
    }
    nativeKey = state.presentationKey;
    nativeProp = presented;
  };
  const flow = createLessonExitFlow({
    onChange: (next) => {
      publications++;
      state = next;
      render();
    },
    onKeep: () => {
      keeps++;
      if (!deferParentClose) {
        visible = false;
        render();
      }
    },
    onLeave: () => {
      const attempt = attempts[writes++];
      assert.ok(attempt, 'No duplicate persistence request may be started');
      return attempt.promise;
    },
  });
  flow.activate();
  return {
    flow,
    state: () => state,
    nativePresented: () => nativePresented,
    key: () => nativeKey,
    writes: () => writes,
    keeps: () => keeps,
    publications: () => publications,
    nativeSwipe() {
      const dismissedKey = nativeKey;
      nativePresented = false;
      return () => flow.nativeDismiss(dismissedKey);
    },
    parentVisible(next: boolean) {
      visible = next;
      render();
    },
    blur() {
      focused = false;
      render();
      flow.dispose();
    },
    focus() {
      focused = true;
      flow.activate();
    },
  };
}

test('swipe during a failed save restores a fresh retry sheet without duplicate writes', async () => {
  const failed = deferred();
  const retry = deferred();
  const ui = harness([failed, retry]);
  const first = ui.flow.leave();
  await ui.flow.leave();
  ui.flow.keep();
  assert.equal(ui.writes(), 1);
  assert.equal(ui.keeps(), 0, 'Keep/escape cannot dismiss a pending save');
  ui.nativeSwipe()();
  assert.equal(ui.keeps(), 1, 'Actual native dismissal must reconcile the parent');
  assert.equal(ui.nativePresented(), false);
  assert.equal(ui.state().saving, true);
  failed.reject(new Error('Disk full'));
  await first;
  assert.equal(ui.nativePresented(), true, 'The retry must be visible on a fresh native instance');
  assert.equal(ui.state().failure, 'Disk full');
  assert.equal(ui.state().saving, false);
  const second = ui.flow.leave();
  await ui.flow.leave();
  assert.equal(ui.writes(), 2);
  retry.resolve();
  await second;
  assert.equal(ui.nativePresented(), false);
  assert.equal(ui.state().failure, '');
  assert.equal(ui.state().retryVisible, false);
});

test('a native dismissal callback arriving after rejection cannot hide the new retry sheet', async () => {
  const failed = deferred();
  const ui = harness([failed]);
  const first = ui.flow.leave();
  const finishOldDismissal = ui.nativeSwipe();
  failed.reject(new Error('Save unavailable'));
  await first;
  const retryKey = ui.key();
  finishOldDismissal();
  assert.equal(ui.key(), retryKey);
  assert.equal(ui.nativePresented(), true);
  assert.equal(ui.state().failure, 'Save unavailable');
  assert.equal(ui.keeps(), 0);
});

test('a queued parent close after rejection leaves the local retry visible', async () => {
  const failed = deferred();
  const ui = harness([failed], true);
  const first = ui.flow.leave();
  ui.nativeSwipe()();
  failed.reject(new Error('Retry needed'));
  await first;
  ui.parentVisible(false);
  assert.equal(ui.nativePresented(), true);
  assert.equal(ui.state().failure, 'Retry needed');
});

test('successful save closes the sheet even if native dismissal happened while it was pending', async () => {
  const saved = deferred();
  const ui = harness([saved]);
  const first = ui.flow.leave();
  ui.nativeSwipe()();
  saved.resolve();
  await first;
  assert.equal(ui.nativePresented(), false);
  assert.equal(ui.state().retryVisible, false);
  assert.equal(ui.state().failure, '');
  assert.equal(ui.state().saving, false);
});

test('unmount prevents either settled outcome from publishing or calling the parent', async () => {
  for (const shouldFail of [true, false]) {
    const save = deferred();
    const ui = harness([save]);
    const first = ui.flow.leave();
    ui.flow.dispose();
    const publications = ui.publications();
    if (shouldFail) save.reject(new Error('Late failure'));
    else save.resolve();
    await first;
    assert.equal(ui.publications(), publications);
    assert.equal(ui.keeps(), 0);
  }
});

test('blur and refocus suppress old failures while keeping one save in flight', async () => {
  const oldSave = deferred();
  const newSave = deferred();
  const ui = harness([oldSave, newSave]);
  const first = ui.flow.leave();
  ui.nativeSwipe()();
  ui.blur();
  ui.focus();
  await ui.flow.leave();
  assert.equal(ui.writes(), 1);
  assert.equal(ui.state().saving, true);
  oldSave.reject(new Error('Stale failure'));
  await first;
  assert.equal(ui.nativePresented(), false);
  assert.equal(ui.state().failure, '');
  assert.equal(ui.state().saving, false);
  ui.parentVisible(true);
  const second = ui.flow.leave();
  newSave.reject(new Error('Current failure'));
  await second;
  assert.equal(ui.nativePresented(), true);
  assert.equal(ui.state().failure, 'Current failure');
});

test('focus setup after cleanup permits saves and ignores retired native callbacks', async () => {
  const saved = deferred();
  const ui = harness([saved]);
  const oldDismissal = ui.nativeSwipe();
  ui.flow.dispose();
  ui.flow.activate();
  oldDismissal();
  assert.equal(ui.nativePresented(), true);
  const first = ui.flow.leave();
  saved.resolve();
  await first;
  assert.equal(ui.writes(), 1);
  assert.equal(ui.nativePresented(), false);
});

test('caller updates retain the pending save and use the current handler for its retry', async () => {
  const oldSave = deferred();
  const retrySave = deferred();
  const writes: string[] = [];
  const keeps: string[] = [];
  const flow = createLessonExitFlow({
    onChange: () => {},
    onKeep: () => keeps.push('old'),
    onLeave: () => {
      writes.push('old');
      return oldSave.promise;
    },
  });
  flow.activate();
  const first = flow.leave();
  flow.updateCallbacks({
    onKeep: () => keeps.push('current'),
    onLeave: () => {
      writes.push('current');
      return retrySave.promise;
    },
  });
  await flow.leave();
  assert.deepEqual(writes, ['old']);
  oldSave.reject(new Error('Retry'));
  await first;
  const retry = flow.leave();
  retrySave.resolve();
  await retry;
  assert.deepEqual(writes, ['old', 'current']);
  assert.deepEqual(keeps, ['current']);
});
