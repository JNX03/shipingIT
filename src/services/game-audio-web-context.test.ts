import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as shared from './game-audio-bank.types';
import { createGameAudioController, gameCueIds } from './game-audio-controller';

const tick = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };

function fixture({ failFetch = false, failDecode = false } = {}) {
  const sources = {
    cues: Object.fromEntries(gameCueIds.map((cue) => [cue, `/${cue}.wav`])),
    ambience: '/ambience.wav',
  };
  const nodes: { loop: boolean; playbackRate: { value: number }; started: number; stopped: number; disconnected: number; onended: (() => void) | null }[] = [];
  const gains: { gain: { value: number }; disconnected: number }[] = [];
  const requests: { uri: string; signal: AbortSignal }[] = [];
  const context = {
    state: 'suspended', destination: {}, resumed: 0, closed: 0, decoded: 0,
    resume() { this.resumed += 1; this.state = 'running'; return Promise.resolve(); },
    close() { this.closed += 1; this.state = 'closed'; return Promise.resolve(); },
    decodeAudioData() {
      this.decoded += 1;
      return failDecode ? Promise.reject(new Error('Bad audio')) : Promise.resolve({ duration: 0.34 });
    },
    createGain() {
      const node = { gain: { value: 1 }, disconnected: 0, connect() {}, disconnect() { this.disconnected += 1; } };
      gains.push(node);
      return node;
    },
    createBufferSource() {
      const node = {
        loop: false, playbackRate: { value: 1 }, started: 0, stopped: 0, disconnected: 0, buffer: null, onended: null as (() => void) | null,
        connect() {}, start() { this.started += 1; }, stop() { this.stopped += 1; }, disconnect() { this.disconnected += 1; },
      };
      nodes.push(node);
      return node;
    },
  };
  const source = ts.transpileModule(readFileSync(resolve('src/services/game-audio-web-context.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as { createWebGameAudioBank(sources: unknown): shared.GameAudioBank };
  runInNewContext(source, {
    exports, require: () => shared, AbortController,
    AudioContext: function (options: { latencyHint: string }) { assert.equal(options.latencyHint, 'interactive'); return context; },
    fetch: (uri: string, options: { signal: AbortSignal }) => {
      requests.push({ uri, signal: options.signal });
      return Promise.resolve({ ok: !failFetch, status: failFetch ? 404 : 200, arrayBuffer: async () => new ArrayBuffer(1) });
    },
  });
  const bank = exports.createWebGameAudioBank(sources);
  return { bank, context, nodes, gains, requests };
}

test('preloads and decodes bundled assets once, but never resumes audio before a gesture', async () => {
  const f = fixture();
  await tick();
  assert.equal(f.requests.length, 7);
  assert.equal(f.context.decoded, 7);
  assert.equal(f.context.resumed, 0);
  assert.equal(await f.bank.cues.snap.ready(), true);
  await assert.rejects(f.bank.prepare(), /user gesture/);
  f.bank.activate?.();
  assert.equal(f.context.resumed, 1, 'resume must be called synchronously in the gesture');
  await f.bank.prepare();
  f.bank.activate?.();
  assert.equal(f.context.resumed, 1);
  for (let i = 0; i < 2; i += 1) {
    await f.bank.cues.snap.rewind();
    f.bank.cues.snap.play();
  }
  assert.equal(f.requests.length, 7, 'repeated click must not redownload media');
  assert.equal(f.nodes.length, 2, 'each cue needs a fresh one-shot source');
  assert.equal(f.nodes[0].stopped, 1);
  assert.equal(f.nodes[1].started, 1);
  assert.equal(f.bank.cues.snap.durationMs?.(), 340);
  f.bank.dispose();
});

test('web event profiles set the real source playback rate before starting', async () => {
  const f = fixture();
  await tick();
  f.bank.activate?.();
  f.bank.cues.snap.rate?.(1.4);
  f.bank.cues.snap.play();
  assert.equal(f.nodes[0].playbackRate.value, 1.4);
  f.bank.cues.snap.pause();
  f.bank.cues.snap.rate?.(1);
  f.bank.cues.snap.play();
  assert.equal(f.nodes[1].playbackRate.value, 1);
  f.bank.dispose();
});

test('gesture-unlocked web bank plays click, correct, wrong and completion through the controller', async () => {
  const f = fixture();
  let enabled = true;
  const controller = createGameAudioController(f.bank.cues, f.bank.ambience, {
    prepare: f.bank.prepare, allowed: () => enabled,
  });
  await tick();
  f.bank.activate?.();
  for (const cue of ['snap', 'correct', 'wrong', 'completion'] as const) {
    assert.equal(await controller.play(cue, 'lesson'), true);
    assert.equal(f.nodes.at(-1)?.started, 1);
    assert.equal(controller.snapshot().cue, cue);
  }
  enabled = false;
  controller.sync();
  assert.equal(f.nodes.at(-1)?.stopped, 1);
  assert.equal(await controller.play('correct', 'lesson'), false);
  controller.dispose();
  f.bank.dispose();
});

test('background/mute invalidates a cue waiting for browser resume and cannot revive it', async () => {
  const f = fixture();
  await tick();
  let resume!: () => void;
  f.context.resume = () => new Promise<void>((done) => { resume = () => { f.context.state = 'running'; done(); }; });
  f.bank.activate?.();
  let foreground = true;
  const controller = createGameAudioController(f.bank.cues, f.bank.ambience, {
    prepare: f.bank.prepare, allowed: () => foreground,
  });
  const result = controller.play('completion', 'lesson');
  foreground = false;
  controller.sync();
  foreground = true;
  controller.sync();
  resume();
  assert.equal(await result, false);
  assert.equal(f.nodes.length, 0);
  controller.dispose();
  f.bank.dispose();
});

test('foreground gesture resumes an interrupted context without replaying an old cue', async () => {
  const f = fixture();
  await tick();
  f.bank.activate?.();
  await f.bank.prepare();
  f.bank.cues.correct.play();
  f.bank.cues.correct.pause();
  f.context.state = 'suspended';
  f.bank.activate?.();
  await f.bank.prepare();
  assert.equal(f.context.resumed, 2);
  assert.equal(f.nodes.length, 1);
  assert.equal(f.nodes[0].stopped, 1);
  f.bank.dispose();
});

for (const failure of ['failFetch', 'failDecode'] as const) {
  test(`${failure} resolves readiness false without unhandled playback`, async () => {
    const f = fixture({ [failure]: true });
    const result = f.bank.cues.correct.ready();
    await tick();
    assert.equal(await result, false);
    assert.equal(await f.bank.cues.correct.ready(), false);
    assert.throws(() => f.bank.cues.correct.play(), /not ready/);
    f.bank.dispose();
  });
}

test('dispose aborts asset loads, disconnects sources/gains and closes the context once', async () => {
  const f = fixture();
  await tick();
  f.bank.activate?.();
  f.bank.ambience.play();
  assert.equal(f.nodes[0].loop, true);
  f.bank.dispose();
  f.bank.dispose();
  assert.equal(f.context.closed, 1);
  assert.ok(f.requests.every((request) => request.signal.aborted));
  assert.ok(f.gains.every((gain) => gain.disconnected === 1));
  assert.equal(f.nodes[0].stopped, 1);
  assert.equal(f.nodes[0].disconnected, 1);
  f.bank.activate?.();
  await assert.rejects(f.bank.prepare(), /disposed/);
  assert.equal(await f.bank.cues.correct.ready(), false);
});
