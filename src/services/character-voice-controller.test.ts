import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import {
  createCharacterVoiceController,
  type CharacterVoiceCallbacks,
  type CharacterVoicePorts,
} from './character-voice-controller';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture() {
  const state = {
    allowed: true, manualStop: false, failStop: false, failSpeak: false,
    stopCalls: 0, leases: 0, releases: 0,
    events: [] as string[],
    stops: [] as ReturnType<typeof deferred>[],
    spoken: [] as { text: string; callbacks: CharacterVoiceCallbacks }[],
  };
  const ports: CharacterVoicePorts = {
    stop: () => {
      state.stopCalls += 1;
      if (state.manualStop) {
        const pending = deferred();
        state.stops.push(pending);
        return pending.promise;
      }
      return state.failStop ? Promise.reject(new Error('stop unavailable')) : Promise.resolve();
    },
    speak: (text, callbacks) => {
      if (state.failSpeak) throw new Error('speech unavailable');
      state.spoken.push({ text, callbacks });
    },
  };
  const controller = createCharacterVoiceController(ports, {
    allowed: () => state.allowed,
    suspendAmbience: () => {
      state.leases += 1;
      state.events.push(`acquire:${state.leases}`);
      return () => {
        state.leases -= 1;
        state.releases += 1;
        state.events.push(`release:${state.leases}`);
      };
    },
  });
  return { controller, state, ports };
}

test('muted explicit reads finish without acquiring ambience or speaking', async () => {
  const f = fixture();
  f.state.allowed = false;
  let ended = 0;
  await f.controller.read('silent line', () => { ended += 1; });
  assert.equal(f.state.spoken.length, 0);
  assert.equal(f.state.leases, 0);
  assert.equal(f.state.releases, 0);
  assert.equal(ended, 1);
});

test('empty or bounded whitespace reads never queue speech or acquire an ambience lease', async () => {
  for (const line of ['', ' \n\t ', ' '.repeat(1800) + 'outside the spoken limit']) {
    const f = fixture();
    let ended = 0;
    await f.controller.read(line, () => { ended += 1; });
    assert.equal(f.state.spoken.length, 0);
    assert.equal(f.state.leases, 0);
    assert.equal(f.state.releases, 0);
    assert.equal(f.state.stopCalls, 1);
    assert.equal(ended, 1);
  }
});

test('a whitespace read safely stops the previous voice and ends both requests once', async () => {
  const f = fixture();
  let previousEnded = 0;
  let blankEnded = 0;
  await f.controller.read('playing', () => { previousEnded += 1; });
  f.state.manualStop = true;
  await f.controller.read(' \t ', () => { blankEnded += 1; });
  assert.equal(blankEnded, 1);
  assert.equal(previousEnded, 0);
  assert.equal(f.state.spoken.length, 1);
  assert.equal(f.state.leases, 1, 'the previous voice retains its lease until stop settles');
  assert.deepEqual(f.state.events, ['acquire:1']);
  f.state.stops[0].resolve();
  await setImmediate();
  f.state.spoken[0].callbacks.stopped();
  f.state.spoken[0].callbacks.done();
  assert.equal(previousEnded, 1);
  assert.equal(blankEnded, 1);
  assert.equal(f.state.leases, 0);
  assert.equal(f.state.releases, 1);
});

test('a line is capped at 1800 characters and every terminal callback ends it once', async () => {
  for (const terminal of ['done', 'stopped', 'error'] as const) {
    const f = fixture();
    let ended = 0;
    await f.controller.read('a'.repeat(1900), () => { ended += 1; });
    assert.equal(f.state.spoken[0].text.length, 1800);
    assert.equal(f.state.leases, 1);
    const callbacks = f.state.spoken[0].callbacks;
    callbacks[terminal]();
    callbacks.done();
    callbacks.stopped();
    callbacks.error();
    assert.equal(ended, 1);
    assert.equal(f.state.releases, 1);
    assert.equal(f.state.leases, 0);
  }
});

test('overlapping pending reads replace without resuming ambience or starting stale voice', async () => {
  const f = fixture();
  f.state.manualStop = true;
  let firstEnded = 0;
  let secondEnded = 0;
  const first = f.controller.read('first', () => { firstEnded += 1; });
  const second = f.controller.read('second', () => { secondEnded += 1; });
  assert.deepEqual(f.state.events, ['acquire:1', 'acquire:2', 'release:1']);
  assert.equal(firstEnded, 1);
  f.state.stops[1].resolve();
  await setImmediate();
  assert.equal(f.state.spoken.length, 0, 'a delayed older stop must settle before newer speech');
  f.state.stops[0].resolve();
  await Promise.all([first, second]);
  assert.deepEqual(f.state.spoken.map((line) => line.text), ['second']);
  assert.equal(secondEnded, 0);
  f.state.spoken[0].callbacks.done();
  assert.equal(firstEnded, 1);
  assert.equal(secondEnded, 1);
  assert.equal(f.state.releases, 2);
});

test('old native callbacks cannot clear or release the newer current utterance', async () => {
  const f = fixture();
  let firstEnded = 0;
  let secondEnded = 0;
  await f.controller.read('first', () => { firstEnded += 1; });
  const oldCallbacks = f.state.spoken[0].callbacks;
  await f.controller.read('second', () => { secondEnded += 1; });
  oldCallbacks.done();
  oldCallbacks.error();
  oldCallbacks.stopped();
  assert.equal(firstEnded, 1);
  assert.equal(secondEnded, 0);
  assert.equal(f.state.leases, 1);
  assert.equal(f.state.releases, 1);
  f.state.manualStop = true;
  f.controller.stop();
  assert.equal(f.state.leases, 1, 'stop retains the newer lease until actual stop settlement');
  f.state.stops[0].resolve();
  await setImmediate();
  assert.equal(secondEnded, 1);
  assert.equal(f.state.leases, 0);
});

test('mute or background during pending stop prevents speech when permission changes', async () => {
  const f = fixture();
  f.state.manualStop = true;
  let ended = 0;
  const reading = f.controller.read('pending', () => { ended += 1; });
  f.state.allowed = false;
  f.state.stops[0].resolve();
  await reading;
  assert.equal(f.state.spoken.length, 0);
  assert.equal(ended, 1);
  assert.equal(f.state.releases, 1);
});

test('stop invalidates a pending read even if permission is restored before its stop resolves', async () => {
  const f = fixture();
  f.state.manualStop = true;
  let ended = 0;
  const reading = f.controller.read('pending', () => { ended += 1; });
  f.state.allowed = false;
  f.controller.stop();
  assert.equal(f.state.leases, 1);
  f.state.allowed = true;
  f.state.stops[1].resolve();
  await setImmediate();
  assert.equal(ended, 1);
  assert.equal(f.state.leases, 0);
  f.state.stops[0].resolve();
  await reading;
  assert.equal(f.state.spoken.length, 0);
  assert.equal(ended, 1);
  assert.equal(f.state.releases, 1);
});

test('a stopped callback releases immediately while native stop is pending, exactly once', async () => {
  const f = fixture();
  let ended = 0;
  await f.controller.read('playing', () => { ended += 1; });
  f.state.manualStop = true;
  f.controller.stop();
  assert.equal(f.state.leases, 1);
  f.state.spoken[0].callbacks.stopped();
  assert.equal(ended, 1);
  assert.equal(f.state.leases, 0);
  f.state.stops[0].resolve();
  await setImmediate();
  f.state.spoken[0].callbacks.error();
  assert.equal(ended, 1);
  assert.equal(f.state.releases, 1);
});

test('an older stop failure cannot end or release a newer line', async () => {
  const f = fixture();
  let firstEnded = 0;
  let secondEnded = 0;
  await f.controller.read('first', () => { firstEnded += 1; });
  f.state.manualStop = true;
  f.controller.stop();
  const second = f.controller.read('second', () => { secondEnded += 1; });
  f.state.stops[0].reject(new Error('old stop failed'));
  f.state.stops[1].resolve();
  await second;
  assert.equal(firstEnded, 1);
  assert.equal(secondEnded, 0);
  assert.equal(f.state.leases, 1);
  assert.equal(f.state.spoken[1].text, 'second');
  f.state.spoken[1].callbacks.done();
  assert.equal(secondEnded, 1);
  assert.equal(f.state.releases, 2);
});

test('a failing stop releases its current lease safely and later callbacks stay idempotent', async () => {
  const f = fixture();
  let ended = 0;
  await f.controller.read('playing', () => { ended += 1; });
  f.state.failStop = true;
  f.controller.stop();
  await setImmediate();
  assert.equal(ended, 1);
  assert.equal(f.state.leases, 0);
  f.state.spoken[0].callbacks.done();
  assert.equal(f.state.releases, 1);
  assert.equal(ended, 1);
});

test('stop and speak startup errors finish the read and release ambience without rejecting', async () => {
  for (const failure of ['failStop', 'failSpeak'] as const) {
    const f = fixture();
    f.state[failure] = true;
    let ended = 0;
    await f.controller.read('unavailable', () => { ended += 1; });
    assert.equal(f.state.spoken.length, 0);
    assert.equal(f.state.leases, 0);
    assert.equal(f.state.releases, 1);
    assert.equal(ended, 1);
  }
});

test('a previous onEnd can request a third line without reviving the superseded second line', async () => {
  const f = fixture();
  let secondEnded = 0;
  let third: Promise<void> | undefined;
  await f.controller.read('first', () => { third = f.controller.read('third'); });
  await f.controller.read('second', () => { secondEnded += 1; });
  await third;
  assert.deepEqual(f.state.spoken.map((line) => line.text), ['first', 'third']);
  assert.equal(secondEnded, 1);
  assert.equal(f.state.leases, 1);
  f.state.spoken[1].callbacks.done();
  assert.equal(f.state.releases, 3);
});

test('a previous onEnd can stop its replacement without releasing before stop settlement', async () => {
  const f = fixture();
  let secondEnded = 0;
  await f.controller.read('first', () => { f.controller.stop(); });
  f.state.manualStop = true;
  await f.controller.read('second', () => { secondEnded += 1; });
  assert.deepEqual(f.state.spoken.map((line) => line.text), ['first']);
  assert.equal(f.state.stops.length, 1);
  assert.equal(f.state.leases, 1);
  assert.equal(secondEnded, 0);
  f.state.stops[0].resolve();
  await setImmediate();
  assert.equal(secondEnded, 1);
  assert.equal(f.state.leases, 0);
  assert.equal(f.state.releases, 2);
});

test('UI callback exceptions cannot disrupt replacement or repeat a lease release', async () => {
  const f = fixture();
  let ended = 0;
  await f.controller.read('first', () => { ended += 1; throw new Error('UI callback'); });
  await f.controller.read('second');
  f.state.spoken[0].callbacks.error();
  assert.equal(ended, 1);
  assert.equal(f.state.leases, 1);
  f.state.spoken[1].callbacks.done();
  assert.equal(f.state.releases, 2);
});
