import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createGameAudioReadiness, type GameAudioBank } from './game-audio-bank.types';
import * as webContext from './game-audio-web-context';

const modules = {
  cues: { footstep: 1, clue: 2, snap: 3, correct: 4, wrong: 5, completion: 6 },
  ambience: 7,
};
const shared = { createGameAudioReadiness, gameAudioModules: () => modules };

/** Execute the real adapters with injected platform modules, without loading React Native. */
function loadAdapter(
  name: 'game-audio-bank.ts' | 'game-audio-bank.web.ts',
  dependencies: Record<string, unknown>,
  globals: Record<string, unknown> = {},
) {
  const filename = resolve('src/services', name);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(source, {
    module,
    exports: module.exports,
    require: (dependency: string) => {
      assert.ok(dependency in dependencies, `Unexpected platform dependency: ${dependency}`);
      return dependencies[dependency];
    },
    ...globals,
  }, { filename });
  return module.exports as { createGameAudioBank(): GameAudioBank };
}

function readinessFixture(initiallyReady = false) {
  let loaded = initiallyReady;
  let success = () => {};
  let failure = () => {};
  let timeout = () => {};
  const calls = { subscribed: 0, unsubscribed: 0, scheduled: 0, canceled: 0 };
  const gate = createGameAudioReadiness({
    isReady: () => loaded,
    subscribe: (onLoaded, onFailed) => {
      calls.subscribed += 1;
      success = onLoaded;
      failure = onFailed;
      return () => { calls.unsubscribed += 1; };
    },
  }, (callback, milliseconds) => {
    assert.equal(milliseconds, 1000);
    calls.scheduled += 1;
    timeout = callback;
    return () => { calls.canceled += 1; };
  });
  return {
    gate,
    calls,
    load: () => { loaded = true; success(); },
    fail: () => failure(),
    timeout: () => timeout(),
  };
}

test('already loaded audio avoids readiness listeners and timers', async () => {
  const f = readinessFixture(true);
  assert.equal(await f.gate.ready(), true);
  assert.equal(f.calls.subscribed, 0);
  assert.equal(f.calls.scheduled, 0);
});

for (const action of ['load', 'fail', 'timeout'] as const) {
  test(`readiness ${action} settles once and removes listeners and timeout`, async () => {
    const f = readinessFixture();
    const pending = f.gate.ready();
    f[action]();
    assert.equal(await pending, action === 'load');
    assert.equal(f.calls.unsubscribed, 1);
    assert.equal(f.calls.canceled, 1);
    f.load();
    assert.equal(f.calls.unsubscribed, 1);
  });
}

test('canceling readiness stays false after a late load and permits a new attempt', async () => {
  const f = readinessFixture();
  const pending = f.gate.ready();
  f.gate.cancelReady();
  f.load();
  assert.equal(await pending, false);
  assert.equal(f.calls.unsubscribed, 1);
  assert.equal(f.calls.canceled, 1);
  assert.equal(await f.gate.ready(), true);
});

test('readiness disposal cancels every pending wait and is idempotent', async () => {
  const f = readinessFixture();
  const pending = [f.gate.ready(), f.gate.ready()];
  f.gate.dispose();
  f.gate.dispose();
  assert.deepEqual(await Promise.all(pending), [false, false]);
  assert.equal(await f.gate.ready(), false);
  assert.equal(f.calls.unsubscribed, 2);
  assert.equal(f.calls.canceled, 2);
});

test('synchronous readiness delivery cleans its just-installed subscription', async () => {
  let removed = 0;
  let scheduled = 0;
  const gate = createGameAudioReadiness({
    isReady: () => false,
    subscribe: (loaded) => {
      loaded();
      return () => { removed += 1; };
    },
  }, () => {
    scheduled += 1;
    return () => {};
  });
  assert.equal(await gate.ready(), true);
  assert.equal(removed, 1);
  assert.equal(scheduled, 0);
});

test('loading during listener installation is detected and cleaned', async () => {
  let loaded = false;
  let removed = 0;
  let canceled = 0;
  const gate = createGameAudioReadiness({
    isReady: () => loaded,
    subscribe: () => {
      loaded = true;
      return () => { removed += 1; };
    },
  }, () => () => { canceled += 1; });
  assert.equal(await gate.ready(), true);
  assert.equal(removed, 1);
  assert.equal(canceled, 1);
});

test('a readiness clock failure removes an installed listener', async () => {
  let removed = 0;
  const gate = createGameAudioReadiness({
    isReady: () => false,
    subscribe: () => () => { removed += 1; },
  }, () => { throw new Error('Clock unavailable'); });
  assert.equal(await gate.ready(), false);
  assert.equal(removed, 1);
});

test('a readiness subscription failure resolves false', async () => {
  const gate = createGameAudioReadiness({
    isReady: () => false,
    subscribe: () => { throw new Error('Listener unavailable'); },
  });
  assert.equal(await gate.ready(), false);
});

class FakeNativePlayer {
  isLoaded = false;
  duration = 0.3;
  paused = 0;
  removed = 0;
  played = 0;
  seeked = 0;
  loop = false;
  volume = 0;
  shouldCorrectPitch = true;
  playbackRate = 1;
  listeners = new Set<(status: { isLoaded: boolean; error: string | null }) => void>();

  addListener(event: string, listener: (status: { isLoaded: boolean; error: string | null }) => void) {
    assert.equal(event, 'playbackStatusUpdate');
    this.listeners.add(listener);
    return { remove: () => this.listeners.delete(listener) };
  }
  async seekTo(value: number) { assert.equal(value, 0); this.seeked += 1; }
  play() { this.played += 1; }
  setPlaybackRate(value: number) { this.playbackRate = value; }
  pause() { this.paused += 1; }
  remove() { this.removed += 1; }
  loaded() {
    this.isLoaded = true;
    for (const listener of [...this.listeners]) listener({ isLoaded: true, error: null });
  }
}

function nativeFixture(failConstructorAt = 0, failConfigurationAt = 0, failFirstMode = false) {
  const players: FakeNativePlayer[] = [];
  let created = 0;
  let modes = 0;
  const adapter = loadAdapter('game-audio-bank.ts', {
    './game-audio-bank.types': shared,
    'expo-audio': {
      createAudioPlayer: (_source: number, options: { updateInterval: number; keepAudioSessionActive: boolean }) => {
        assert.equal(options.updateInterval, 1000);
        assert.equal(options.keepAudioSessionActive, false);
        created += 1;
        if (created === failConstructorAt) throw new Error('Constructor unavailable');
        const player = new FakeNativePlayer();
        if (created === failConfigurationAt) {
          Object.defineProperty(player, 'loop', { set: () => { throw new Error('Configuration unavailable'); } });
        }
        players.push(player);
        return player;
      },
      setAudioModeAsync: (mode: Record<string, unknown>) => {
        modes += 1;
        assert.deepEqual({ ...mode }, {
          allowsRecording: false, playsInSilentMode: true,
          shouldPlayInBackground: false, interruptionMode: 'mixWithOthers',
        });
        return failFirstMode && modes === 1 ? Promise.reject(new Error('Mode unavailable')) : Promise.resolve();
      },
    },
  });
  return { adapter, players, modes: () => modes };
}

test('native bank creates seven players only when called, caches mode and disposes every player', async () => {
  const f = nativeFixture();
  assert.equal(f.players.length, 0);
  const bank = f.adapter.createGameAudioBank();
  assert.equal(f.players.length, 7);
  assert.deepEqual(f.players.map((player) => player.loop), [false, false, false, false, false, false, true]);
  assert.equal(f.players[6].volume, 0.22);
  await Promise.all([bank.prepare(), bank.prepare()]);
  assert.equal(f.modes(), 1);
  const ready = bank.cues.correct.ready();
  assert.equal(f.players[3].listeners.size, 1);
  f.players[3].loaded();
  assert.equal(await ready, true);
  assert.equal(f.players[3].listeners.size, 0);
  await bank.cues.correct.rewind();
  bank.cues.correct.play();
  assert.equal(f.players[3].played, 1);
  assert.equal(bank.cues.correct.durationMs?.(), 300);
  bank.cues.correct.volume(10);
  assert.equal(f.players[3].volume, 1);
  const pending = bank.cues.wrong.ready();
  bank.dispose();
  bank.dispose();
  assert.equal(await pending, false);
  assert.equal(await bank.cues.wrong.ready(), false);
  for (const player of f.players) {
    assert.equal(player.removed, 1);
    assert.equal(player.paused, 1);
    assert.equal(player.listeners.size, 0);
  }
  assert.throws(() => bank.cues.correct.play(), /disposed/);
  await assert.rejects(bank.prepare(), /disposed/);
});

test('native event rate disables pitch correction and clamps to the SDK57 supported range', () => {
  const f = nativeFixture();
  const bank = f.adapter.createGameAudioBank();
  bank.cues.snap.rate?.(1.4);
  assert.equal(f.players[2].playbackRate, 1.4);
  assert.equal(f.players[2].shouldCorrectPitch, false);
  bank.cues.snap.rate?.(4);
  assert.equal(f.players[2].playbackRate, 2);
  bank.cues.snap.rate?.(0);
  assert.equal(f.players[2].playbackRate, 0.5);
  bank.cues.snap.rate?.(NaN);
  assert.equal(f.players[2].playbackRate, 1);
  bank.dispose();
});

for (const failure of [{ constructor: 4, configuration: 0 }, { constructor: 0, configuration: 3 }]) {
  test(`native ${failure.constructor ? 'construction' : 'configuration'} failure releases already created players`, () => {
    const f = nativeFixture(failure.constructor, failure.configuration);
    assert.throws(() => f.adapter.createGameAudioBank(), /unavailable/);
    assert.equal(f.players.length, 3);
    for (const player of f.players) {
      assert.equal(player.paused, 1);
      assert.equal(player.removed, 1);
    }
  });
}

test('native mode configuration can retry after its cached attempt rejects', async () => {
  const f = nativeFixture(0, 0, true);
  const bank = f.adapter.createGameAudioBank();
  await assert.rejects(bank.prepare(), /Mode unavailable/);
  await bank.prepare();
  assert.equal(f.modes(), 2);
  bank.dispose();
});

class FakeBrowserAudio {
  readyState = 0;
  duration = 0.34;
  volume = 1;
  playbackRate = 1;
  preservesPitch = true;
  loop = false;
  pausedCount = 0;
  removed = 0;
  loadedCount = 0;
  listeners = new Map<string, Set<() => void>>();
  playResolvers: (() => void)[] = [];
  constructor(public src?: string) {}
  addEventListener(event: string, callback: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }
  removeEventListener(event: string, callback: () => void) { this.listeners.get(event)?.delete(callback); }
  play(): Promise<void> { return new Promise((resolve) => { this.playResolvers.push(resolve); }); }
  pause() { this.pausedCount += 1; }
  load() { this.loadedCount += 1; }
  remove() { this.removed += 1; }
  removeAttribute(name: string) { assert.equal(name, 'src'); delete this.src; }
  dispatch(event: string) { for (const callback of [...(this.listeners.get(event) ?? [])]) callback(); }
  listenerCount() { return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0); }
}

function webFixture(failConstructorAt = 0, failConfigurationAt = 0) {
  const media: FakeBrowserAudio[] = [];
  let created = 0;
  class BrowserAudio extends FakeBrowserAudio {
    constructor(src: string) {
      super(src);
      created += 1;
      if (created === failConstructorAt) throw new Error('Browser constructor unavailable');
      if (created === failConfigurationAt) {
        Object.defineProperty(this, 'loop', { set: () => { throw new Error('Browser configuration unavailable'); } });
      }
      media.push(this);
    }
  }
  const dependencies = {
    './game-audio-web-context': webContext,
    './game-audio-bank.types': shared,
    'expo-asset': { Asset: { fromModule: (source: number) => ({ uri: `/asset/${source}.wav`, localUri: null }) } },
  };
  return {
    adapter: loadAdapter('game-audio-bank.web.ts', dependencies, { Audio: BrowserAudio }),
    media,
    dependencies,
  };
}

test('web bank uses resolved asset URIs, cancels readiness and clears all media idempotently', async () => {
  const f = webFixture();
  assert.equal(f.media.length, 0);
  const bank = f.adapter.createGameAudioBank();
  assert.equal(f.media.length, 7);
  assert.deepEqual(f.media.map((media) => media.loop), [false, false, false, false, false, false, true]);
  assert.equal(f.media[6].volume, 0.22);
  assert.equal(f.media[0].src, '/asset/1.wav');
  const ready = bank.cues.clue.ready();
  assert.equal(f.media[1].listenerCount(), 4);
  f.media[1].readyState = 2;
  f.media[1].dispatch('loadeddata');
  assert.equal(await ready, true);
  assert.equal(f.media[1].listenerCount(), 0);
  const pending = bank.cues.snap.ready();
  bank.cues.snap.cancelReady?.();
  assert.equal(await pending, false);
  assert.equal(f.media[2].listenerCount(), 0);
  bank.dispose();
  bank.dispose();
  for (const media of f.media) {
    assert.equal(media.pausedCount, 1);
    assert.equal(media.removed, 1);
    assert.equal(media.src, undefined);
    assert.equal(media.listenerCount(), 0);
  }
});

test('web bank selects the shared gesture context and passes Expo-resolved asset URIs', () => {
  let resolved: { cues: Record<string, string>; ambience: string } | undefined;
  const expected = { cues: {}, ambience: {}, prepare: async () => {}, dispose: () => {} } as GameAudioBank;
  const adapter = loadAdapter('game-audio-bank.web.ts', {
    './game-audio-bank.types': shared,
    './game-audio-web-context': {
      webAudioContextClass: () => function AudioContext() {},
      createWebGameAudioBank: (sources: typeof resolved) => { resolved = sources; return expected; },
    },
    'expo-asset': { Asset: { fromModule: (source: number) => ({ localUri: null, uri: `/bundled/${source}.wav` }) } },
  });
  assert.equal(adapter.createGameAudioBank(), expected);
  assert.equal(resolved?.cues.snap, '/bundled/3.wav');
  assert.equal(resolved?.cues.correct, '/bundled/4.wav');
  assert.equal(resolved?.cues.wrong, '/bundled/5.wav');
  assert.equal(resolved?.cues.completion, '/bundled/6.wav');
  assert.equal(resolved?.ambience, '/bundled/7.wav');
});

test('web construction failure releases every media element already created', () => {
  const f = webFixture(4);
  assert.throws(() => f.adapter.createGameAudioBank(), /unavailable/);
  assert.equal(f.media.length, 3);
  for (const media of f.media) {
    assert.equal(media.pausedCount, 1);
    assert.equal(media.removed, 1);
    assert.equal(media.src, undefined);
  }
});

test('web configuration failure releases its element and every earlier element', () => {
  const f = webFixture(0, 3);
  assert.throws(() => f.adapter.createGameAudioBank(), /configuration unavailable/);
  assert.equal(f.media.length, 3);
  for (const media of f.media) {
    assert.equal(media.pausedCount, 1);
    assert.equal(media.removed, 1);
    assert.equal(media.src, undefined);
  }
});

test('web factory reports unavailable SSR audio without constructing media', () => {
  const f = webFixture();
  const unavailable = loadAdapter('game-audio-bank.web.ts', f.dependencies);
  assert.throws(() => unavailable.createGameAudioBank(), /unavailable/);
  assert.equal(f.media.length, 0);
});

test('web autoplay rejection remains on the returned playback promise', async () => {
  const f = webFixture();
  const bank = f.adapter.createGameAudioBank();
  f.media[3].play = () => Promise.reject(new Error('NotAllowedError'));
  await assert.rejects(Promise.resolve(bank.cues.correct.play()), /NotAllowedError/);
  bank.dispose();
});

test('an older web play settlement never pauses a newer play on the shared element', async () => {
  const f = webFixture();
  const bank = f.adapter.createGameAudioBank();
  const oldRejected = assert.rejects(Promise.resolve(bank.cues.correct.play()), /canceled/);
  bank.cues.correct.pause();
  const newer = bank.cues.correct.play();
  const pauseCount = f.media[3].pausedCount;
  f.media[3].playResolvers.shift()!();
  await oldRejected;
  assert.equal(f.media[3].pausedCount, pauseCount);
  f.media[3].playResolvers.shift()!();
  await newer;
  bank.dispose();
});

test('web disposal cancels a playback promise that settles after the media was removed', async () => {
  const f = webFixture();
  const bank = f.adapter.createGameAudioBank();
  const rejected = assert.rejects(Promise.resolve(bank.ambience.play()), /canceled/);
  bank.dispose();
  f.media[6].playResolvers.shift()!();
  await rejected;
  assert.equal(f.media[6].removed, 1);
});
