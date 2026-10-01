import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLessonAudioController, type LessonAudioPort } from './lesson-audio-controller';

function fakePlayer() {
  const calls = { played: 0, paused: 0, rewound: 0, ready: 0 };
  const player: LessonAudioPort = {
    ready: async () => {
      calls.ready += 1;
      return true;
    },
    rewind: async () => {
      calls.rewound += 1;
    },
    play: () => {
      calls.played += 1;
    },
    pause: () => {
      calls.paused += 1;
    },
  };
  return { calls, player };
}

function fixture(canPlay: () => boolean = () => true, prepare = async () => {}) {
  const correct = fakePlayer();
  const wrong = fakePlayer();
  const completion = fakePlayer();
  const controller = createLessonAudioController(
    { correct: correct.player, wrong: wrong.player, completion: completion.player },
    canPlay,
    prepare,
  );
  return { controller, correct, wrong, completion };
}

test('muted feedback does not initialize or play audio', async () => {
  let prepared = 0;
  const f = fixture(
    () => false,
    async () => {
      prepared += 1;
    },
  );
  assert.equal(await f.controller.play('correct'), false);
  assert.equal(prepared, 0);
  assert.equal(f.correct.calls.played, 0);
  assert.equal(f.correct.calls.ready, 0);
});

test('replays a selected cue from the beginning and stops other cues', async () => {
  const f = fixture();
  assert.equal(await f.controller.play('correct'), true);
  assert.equal(await f.controller.play('correct'), true);
  assert.equal(f.correct.calls.played, 2);
  assert.equal(f.correct.calls.rewound, 2);
  assert.equal(f.wrong.calls.paused, 2);
  assert.equal(f.completion.calls.played, 0);
});

test('device/session failure leaves the lesson silent and usable', async () => {
  const f = fixture(
    () => true,
    async () => {
      throw new Error('Audio unavailable');
    },
  );
  assert.equal(await f.controller.play('wrong'), false);
  assert.equal(f.wrong.calls.played, 0);
});

test('stop cancels a cue that is still seeking', async () => {
  const f = fixture();
  let resolveSeek = () => {};
  let seeking = false;
  f.correct.player.rewind = () =>
    new Promise<void>((resolve) => {
      resolveSeek = resolve;
      seeking = true;
    });
  const pending = f.controller.play('correct');
  while (!seeking) await Promise.resolve();
  f.controller.stop();
  resolveSeek();
  assert.equal(await pending, false);
  assert.equal(f.correct.calls.played, 0);
});

test('a newer cue supersedes a pending sound without overlap', async () => {
  const f = fixture();
  let resolveReady = (value: boolean) => {};
  let loading = false;
  f.correct.player.ready = () =>
    new Promise<boolean>((resolve) => {
      resolveReady = resolve;
      loading = true;
    });
  const oldSound = f.controller.play('correct');
  while (!loading) await Promise.resolve();
  assert.equal(await f.controller.play('completion'), true);
  resolveReady(true);
  assert.equal(await oldSound, false);
  assert.equal(f.correct.calls.played, 0);
  assert.equal(f.completion.calls.played, 1);
});

test('a mute change during loading prevents later playback', async () => {
  let enabled = true;
  const f = fixture(() => enabled);
  f.wrong.player.ready = async () => {
    enabled = false;
    return true;
  };
  assert.equal(await f.controller.play('wrong'), false);
  assert.equal(f.wrong.calls.played, 0);
});

test('load and rewind errors are contained', async () => {
  const f = fixture();
  f.correct.player.ready = async () => false;
  assert.equal(await f.controller.play('correct'), false);
  f.wrong.player.rewind = async () => {
    throw new Error('Released player');
  };
  assert.equal(await f.controller.play('wrong'), false);
  assert.equal(f.wrong.calls.played, 0);
});

test('component lifecycle suppresses cues before mount and after disposal', async () => {
  const f = fixture();
  f.controller.setActive(false);
  assert.equal(await f.controller.play('correct'), false);
  f.controller.setActive(true);
  assert.equal(await f.controller.play('correct'), true);
  f.controller.setActive(false);
  assert.equal(await f.controller.play('completion'), false);
});
