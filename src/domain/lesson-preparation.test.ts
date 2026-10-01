import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createLessonPreparationController,
  LESSON_ENTRY_MINIMUM_MS,
  LESSON_ENTRY_TIMEOUT_MS,
  type LessonPreparationState,
} from './lesson-preparation';

function deferred() {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function fakeClock() {
  let time = 0;
  let nextId = 0;
  const pending = new Map<number, { at: number; callback: () => void }>();
  const callbacks: { id: number; callback: () => void }[] = [];
  return {
    now: () => time,
    schedule(callback: () => void, delay: number) {
      const id = nextId++;
      pending.set(id, { at: time + delay, callback });
      callbacks.push({ id, callback });
      return () => pending.delete(id);
    },
    async advance(ms: number) {
      const target = time + ms;
      for (;;) {
        const next = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > target) break;
        time = next[1].at;
        pending.delete(next[0]);
        next[1].callback();
        await flush();
      }
      time = target;
      await flush();
    },
    fireStaleCallbacks() {
      for (const { id, callback } of [...callbacks]) if (!pending.has(id)) callback();
    },
    captureCallbacks: () => callbacks.map(({ callback }) => callback),
    pendingCount: () => pending.size,
  };
}

type PreparationOptions = Parameters<typeof createLessonPreparationController>[0];

function fixture(options: Pick<PreparationOptions, 'minimumMs' | 'timeoutMs' | 'dataReady' | 'recoverData'> = {}) {
  const clock = fakeClock();
  const loads: ReturnType<typeof deferred>[] = [];
  const events: { at: number; state: LessonPreparationState }[] = [];
  const controllerOptions: PreparationOptions = {
    ...options,
    load: () => {
      const load = deferred();
      loads.push(load);
      return load.promise;
    },
    onChange: (state) => events.push({ at: clock.now(), state }),
    schedule: clock.schedule,
  };
  const controller = createLessonPreparationController(controllerOptions);
  return {
    controller, clock, loads, events, options: controllerOptions,
    states: () => events.map((event) => event.state),
  };
}

const loading = { status: 'loading' } as const;
const ready = { status: 'ready' } as const;
const timeout = { status: 'error', reason: 'timeout' } as const;
const assetError = { status: 'error', reason: 'asset-error' } as const;
const dataTimeout = { status: 'error', reason: 'data-timeout' } as const;
const dataError = { status: 'error', reason: 'data-error' } as const;

test('early asset success waits for the minimum entry time before becoming ready', async () => {
  const f = fixture();
  f.controller.start();
  assert.deepEqual(f.states(), [loading]);
  assert.equal(f.loads.length, 1);
  f.loads[0].resolve();
  await flush();
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS - 1);
  assert.deepEqual(f.states(), [loading]);
  await f.clock.advance(1);
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 600, state: ready }]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('the minimum timer never substitutes for a real pending asset load', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
  assert.deepEqual(f.states(), [loading]);
  assert.equal(f.clock.pendingCount(), 1);
  await f.clock.advance(1_000);
  f.loads[0].resolve();
  await flush();
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 1_600, state: ready }]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('a stalled load reaches a bounded timeout and never becomes falsely ready', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS - 1);
  assert.deepEqual(f.states(), [loading]);
  await f.clock.advance(1);
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 12_000, state: timeout }]);
  assert.equal(f.clock.pendingCount(), 0);
  await f.clock.advance(24_000);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading, timeout]);
});

for (const settlement of ['resolve', 'reject'] as const) {
  test(`a load that ${settlement}s after timeout cannot replace the timeout state`, async () => {
    const f = fixture();
    f.controller.start();
    await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
    if (settlement === 'resolve') f.loads[0].resolve();
    else f.loads[0].reject(new Error('Download failed late'));
    await flush();
    assert.deepEqual(f.states(), [loading, timeout]);
    assert.equal(f.clock.pendingCount(), 0);
  });
}

test('an asset rejection fails immediately without waiting for minimum or deadline timers', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(100);
  f.loads[0].reject(new Error('Missing lesson asset'));
  await flush();
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 100, state: assetError }]);
  assert.equal(f.clock.pendingCount(), 0);
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading, assetError]);
});

test('an asset rejection after the minimum still clears the deadline and keeps its error reason', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(700);
  f.loads[0].reject(new Error('Network failure'));
  await flush();
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 700, state: assetError }]);
  assert.equal(f.clock.pendingCount(), 0);
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  assert.deepEqual(f.states(), [loading, assetError]);
});

test('a synchronous loader throw is contained as an asset error and clears both timers', () => {
  const clock = fakeClock();
  const states: LessonPreparationState[] = [];
  const controller = createLessonPreparationController({
    load: () => { throw new Error('Loader unavailable'); },
    onChange: (state) => states.push(state),
    schedule: clock.schedule,
  });
  assert.doesNotThrow(() => controller.start());
  assert.deepEqual(states, [loading, assetError]);
  assert.equal(clock.pendingCount(), 0);
  clock.fireStaleCallbacks();
  assert.deepEqual(states, [loading, assetError]);
});

for (const order of ['old-first', 'new-first'] as const) {
  test(`restarting a pending load gives the new generation its own minimum: ${order}`, async () => {
    const f = fixture();
    f.controller.start();
    await f.clock.advance(100);
    f.controller.start();
    assert.equal(f.loads.length, 2);
    assert.equal(f.clock.pendingCount(), 2);
    if (order === 'old-first') {
      f.loads[0].resolve();
      await flush();
      assert.deepEqual(f.states(), [loading, loading]);
    }
    f.loads[1].resolve();
    await flush();
    await f.clock.advance(LESSON_ENTRY_MINIMUM_MS - 1);
    assert.deepEqual(f.states(), [loading, loading]);
    await f.clock.advance(1);
    assert.deepEqual(f.events, [
      { at: 0, state: loading }, { at: 100, state: loading }, { at: 700, state: ready },
    ]);
    if (order === 'new-first') {
      f.loads[0].resolve();
      await flush();
    }
    f.clock.fireStaleCallbacks();
    assert.deepEqual(f.states(), [loading, loading, ready]);
    assert.equal(f.clock.pendingCount(), 0);
  });
}

for (const phase of ['loading', 'ready'] as const) {
  test(`an older rejected load cannot turn the newer ${phase} state into an error`, async () => {
    const f = fixture();
    f.controller.start();
    f.controller.start();
    if (phase === 'ready') {
      f.loads[1].resolve();
      await flush();
      await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
    }
    f.loads[0].reject(new Error('Stale request failure'));
    await flush();
    assert.deepEqual(f.states(), phase === 'ready' ? [loading, loading, ready] : [loading, loading]);
    if (phase === 'loading') {
      f.loads[1].resolve();
      await flush();
      await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
    }
    assert.deepEqual(f.states(), [loading, loading, ready]);
    assert.equal(f.clock.pendingCount(), 0);
  });
}

test('an old successful load cannot overwrite a newer asset failure', async () => {
  const f = fixture();
  f.controller.start();
  f.controller.start();
  f.loads[1].reject(new Error('Current load failed'));
  await flush();
  f.loads[0].resolve();
  await flush();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  assert.deepEqual(f.states(), [loading, loading, assetError]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('a retry after asset failure performs a new real load and starts a fresh minimum', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(100);
  f.loads[0].reject(new Error('Temporary failure'));
  await flush();
  await f.clock.advance(100);
  f.controller.start();
  f.loads[1].resolve();
  await flush();
  await f.clock.advance(599);
  assert.deepEqual(f.states(), [loading, assetError, loading]);
  await f.clock.advance(1);
  assert.deepEqual(f.events, [
    { at: 0, state: loading }, { at: 100, state: assetError },
    { at: 200, state: loading }, { at: 800, state: ready },
  ]);
  assert.equal(f.loads.length, 2);
  assert.equal(f.clock.pendingCount(), 0);
});

test('a timeout retry remains pending until its own load succeeds despite the old load resolving', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  f.controller.start();
  f.loads[0].resolve();
  await flush();
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
  assert.deepEqual(f.states(), [loading, timeout, loading]);
  assert.equal(f.clock.pendingCount(), 1);
  f.loads[1].resolve();
  await flush();
  assert.deepEqual(f.states(), [loading, timeout, loading, ready]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('a retried stalled load gets a complete new timeout period', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  const oldCallbacks = f.clock.captureCallbacks();
  f.controller.start();
  for (const callback of oldCallbacks) callback();
  assert.deepEqual(f.states(), [loading, timeout, loading]);
  assert.equal(f.clock.pendingCount(), 2);
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS - 1);
  assert.deepEqual(f.states(), [loading, timeout, loading]);
  await f.clock.advance(1);
  assert.equal(f.clock.pendingCount(), 0);
  assert.deepEqual(f.events, [
    { at: 0, state: loading }, { at: 12_000, state: timeout },
    { at: 12_000, state: loading }, { at: 24_000, state: timeout },
  ]);
});

test('cancelling after early asset success clears the pending minimum without emitting ready', async () => {
  const f = fixture();
  f.controller.start();
  f.loads[0].resolve();
  await flush();
  await f.clock.advance(100);
  f.controller.cancel();
  assert.equal(f.clock.pendingCount(), 0);
  await f.clock.advance(24_000);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading]);
});

test('cancelling after the minimum invalidates a pending load and its deadline', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
  f.controller.cancel();
  f.loads[0].resolve();
  await flush();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('repeated cancellation is safe before start and against already queued callbacks', async () => {
  const f = fixture();
  assert.doesNotThrow(() => { f.controller.cancel(); f.controller.cancel(); });
  assert.deepEqual(f.states(), []);
  f.controller.start();
  f.controller.cancel();
  f.controller.cancel();
  f.clock.fireStaleCallbacks();
  f.loads[0].reject(new Error('Cancelled request failed'));
  await flush();
  assert.deepEqual(f.states(), [loading]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('cancellation is reversible and a later start can prepare successfully', async () => {
  const f = fixture();
  f.controller.start();
  f.controller.cancel();
  f.controller.start();
  f.loads[1].resolve();
  await flush();
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
  f.loads[0].resolve();
  await flush();
  assert.deepEqual(f.states(), [loading, loading, ready]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('successful preparation cancels the deadline and cannot emit a later timeout', async () => {
  const f = fixture();
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS - 1);
  f.loads[0].resolve();
  await flush();
  assert.deepEqual(f.states(), [loading, ready]);
  assert.equal(f.clock.pendingCount(), 0);
  await f.clock.advance(1);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading, ready]);
});

test('configured minimum and timeout durations control success and stalled-load boundaries', async () => {
  const success = fixture({ minimumMs: 20, timeoutMs: 100 });
  success.controller.start();
  success.loads[0].resolve();
  await flush();
  await success.clock.advance(19);
  assert.deepEqual(success.states(), [loading]);
  await success.clock.advance(1);
  assert.deepEqual(success.events, [{ at: 0, state: loading }, { at: 20, state: ready }]);

  const stalled = fixture({ minimumMs: 20, timeoutMs: 100 });
  stalled.controller.start();
  await stalled.clock.advance(99);
  assert.deepEqual(stalled.states(), [loading]);
  await stalled.clock.advance(1);
  assert.deepEqual(stalled.events, [{ at: 0, state: loading }, { at: 100, state: timeout }]);
  assert.equal(success.clock.pendingCount(), 0);
  assert.equal(stalled.clock.pendingCount(), 0);
});

test('cancellation from the loading callback prevents scheduling and loading work', () => {
  const clock = fakeClock();
  const states: LessonPreparationState[] = [];
  let loads = 0;
  const controller = createLessonPreparationController({
    load: async () => { loads += 1; },
    onChange: (state) => {
      states.push(state);
      controller.cancel();
    },
    schedule: clock.schedule,
  });
  controller.start();
  assert.deepEqual(states, [loading]);
  assert.equal(loads, 0);
  assert.equal(clock.pendingCount(), 0);
});

test('unready data never starts assets and gets an honest bounded data timeout', async () => {
  const f = fixture({ dataReady: false });
  f.controller.start();
  assert.equal(f.loads.length, 0);
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
  assert.deepEqual(f.states(), [loading]);
  assert.equal(f.loads.length, 0);
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS - LESSON_ENTRY_MINIMUM_MS - 1);
  assert.deepEqual(f.states(), [loading]);
  await f.clock.advance(1);
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 12_000, state: dataTimeout }]);
  assert.equal(f.options.dataReady, false);
  assert.equal(f.loads.length, 0);
  assert.equal(f.clock.pendingCount(), 0);
});

test('stalled data recovery remains bounded without opening the asset gate', async () => {
  const recovery = deferred();
  let recoveries = 0;
  const f = fixture({
    dataReady: false,
    recoverData: () => {
      recoveries += 1;
      return recovery.promise.then(() => {});
    },
  });
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  assert.equal(recoveries, 1);
  assert.equal(f.loads.length, 0);
  assert.deepEqual(f.states(), [loading, dataTimeout]);
  recovery.resolve();
  await flush();
  assert.deepEqual(f.states(), [loading, dataTimeout]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('successful data recovery alone cannot declare hydration, start assets, or award readiness', async () => {
  const recovery = deferred();
  const f = fixture({ dataReady: false, recoverData: () => recovery.promise.then(() => {}) });
  f.controller.start();
  await f.clock.advance(100);
  recovery.resolve();
  await flush();
  assert.equal(f.options.dataReady, false);
  assert.equal(f.loads.length, 0);
  assert.deepEqual(f.states(), [loading]);
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS - 101);
  assert.deepEqual(f.states(), [loading]);
  assert.equal(f.loads.length, 0);
  await f.clock.advance(1);
  assert.deepEqual(f.states(), [loading, dataTimeout]);
  assert.equal(f.clock.pendingCount(), 0);
});

test('a data recovery rejection reports data-error immediately and clears both timers', async () => {
  const recovery = deferred();
  const f = fixture({ dataReady: false, recoverData: () => recovery.promise.then(() => {}) });
  f.controller.start();
  await f.clock.advance(100);
  recovery.reject(new Error('Persisted lesson data unavailable'));
  await flush();
  assert.deepEqual(f.events, [{ at: 0, state: loading }, { at: 100, state: dataError }]);
  assert.equal(f.loads.length, 0);
  assert.equal(f.clock.pendingCount(), 0);
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading, dataError]);
});

test('a synchronous data recovery throw is contained as data-error without attempting assets', () => {
  const f = fixture({
    dataReady: false,
    recoverData: () => { throw new Error('Hydration request unavailable'); },
  });
  assert.doesNotThrow(() => f.controller.start());
  assert.deepEqual(f.states(), [loading, dataError]);
  assert.equal(f.loads.length, 0);
  assert.equal(f.clock.pendingCount(), 0);
  f.clock.fireStaleCallbacks();
  assert.deepEqual(f.states(), [loading, dataError]);
});

test('a stale recovery rejection cannot fail a newer data retry', async () => {
  const recoveries: ReturnType<typeof deferred>[] = [];
  const f = fixture({
    dataReady: false,
    recoverData: () => {
      const recovery = deferred();
      recoveries.push(recovery);
      return recovery.promise.then(() => {});
    },
  });
  f.controller.start();
  await f.clock.advance(100);
  f.controller.start();
  assert.equal(recoveries.length, 2);
  recoveries[0].reject(new Error('Old recovery failed'));
  await flush();
  assert.deepEqual(f.states(), [loading, loading]);
  assert.equal(f.clock.pendingCount(), 2);
  recoveries[1].reject(new Error('Current recovery failed'));
  await flush();
  assert.deepEqual(f.states(), [loading, loading, dataError]);
  assert.equal(f.loads.length, 0);
  assert.equal(f.clock.pendingCount(), 0);
});

for (const phase of ['loading', 'ready'] as const) {
  test(`late recovery failure cannot replace the actual asset phase while ${phase}`, async () => {
    const recovery = deferred();
    let recoveries = 0;
    const f = fixture({
      dataReady: false,
      recoverData: () => {
        recoveries += 1;
        return recovery.promise.then(() => {});
      },
    });
    f.controller.start();
    await f.clock.advance(1_000);
    f.options.dataReady = true;
    f.controller.start();
    assert.equal(recoveries, 1);
    assert.equal(f.loads.length, 1);
    if (phase === 'ready') {
      f.loads[0].resolve();
      await flush();
      await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
    }
    recovery.reject(new Error('Previous recovery failed late'));
    await flush();
    assert.deepEqual(f.states(), phase === 'ready' ? [loading, loading, ready] : [loading, loading]);
    if (phase === 'loading') {
      f.loads[0].resolve();
      await flush();
      await f.clock.advance(LESSON_ENTRY_MINIMUM_MS - 1);
      assert.deepEqual(f.states(), [loading, loading]);
      await f.clock.advance(1);
    }
    assert.deepEqual(f.events, [
      { at: 0, state: loading }, { at: 1_000, state: loading }, { at: 1_600, state: ready },
    ]);
    assert.equal(f.clock.pendingCount(), 0);
  });
}

test('real data readiness starts a fresh asset phase that old recovery success cannot finish', async () => {
  const recovery = deferred();
  const f = fixture({ dataReady: false, recoverData: () => recovery.promise.then(() => {}) });
  f.controller.start();
  await f.clock.advance(1_000);
  f.options.dataReady = true;
  f.controller.start();
  recovery.resolve();
  await flush();
  await f.clock.advance(LESSON_ENTRY_MINIMUM_MS);
  assert.equal(f.loads.length, 1);
  assert.deepEqual(f.states(), [loading, loading]);
  f.loads[0].resolve();
  await flush();
  assert.deepEqual(f.events, [
    { at: 0, state: loading }, { at: 1_000, state: loading }, { at: 1_600, state: ready },
  ]);
  assert.equal(f.clock.pendingCount(), 0);
});

for (const elapsed of [100, LESSON_ENTRY_MINIMUM_MS]) {
  test(`cancellation after ${elapsed} ms suppresses late data recovery failure and queued timers`, async () => {
    const recovery = deferred();
    const f = fixture({ dataReady: false, recoverData: () => recovery.promise.then(() => {}) });
    f.controller.start();
    await f.clock.advance(elapsed);
    f.controller.cancel();
    recovery.reject(new Error('Unmounted recovery failed'));
    await flush();
    f.clock.fireStaleCallbacks();
    await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
    assert.deepEqual(f.states(), [loading]);
    assert.equal(f.loads.length, 0);
    assert.equal(f.clock.pendingCount(), 0);
  });
}

test('a data retry receives its own complete deadline even when recovery resolves', async () => {
  const recoveries: ReturnType<typeof deferred>[] = [];
  const f = fixture({
    dataReady: false,
    recoverData: () => {
      const recovery = deferred();
      recoveries.push(recovery);
      return recovery.promise.then(() => {});
    },
  });
  f.controller.start();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS);
  const oldCallbacks = f.clock.captureCallbacks();
  f.controller.start();
  recoveries[0].reject(new Error('Old recovery timed out then failed'));
  recoveries[1].resolve();
  await flush();
  for (const callback of oldCallbacks) callback();
  await f.clock.advance(LESSON_ENTRY_TIMEOUT_MS - 1);
  assert.deepEqual(f.states(), [loading, dataTimeout, loading]);
  assert.equal(f.loads.length, 0);
  await f.clock.advance(1);
  assert.deepEqual(f.events, [
    { at: 0, state: loading }, { at: 12_000, state: dataTimeout },
    { at: 12_000, state: loading }, { at: 24_000, state: dataTimeout },
  ]);
  assert.equal(f.clock.pendingCount(), 0);
});
