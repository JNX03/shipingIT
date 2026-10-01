import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGameAudioController, gameCueIds, type GameAudioPort, type GameCue } from './game-audio-controller';
import {
  attachGameAudio,
  getGameAudioSnapshot,
  isGameAudioAllowed,
  playGameSound,
  releaseGameAudioOwner,
  setGameAudioOwnerActive,
  setGameAudioWorld,
  suspendGameAmbienceForVoice,
} from './game-audio';

function bank() {
  const played: string[] = [];
  let allowed = true;
  const port = (id: string): GameAudioPort => ({
    ready: async () => true,
    rewind: async () => undefined,
    play: () => { played.push(id); },
    pause: () => undefined,
    volume: () => undefined,
  });
  const cues = Object.fromEntries(gameCueIds.map((id) => [id, port(id)])) as Record<GameCue, GameAudioPort>;
  const ambience = port('ambience');
  const gate = () => allowed;
  const controller = createGameAudioController(cues, ambience, {
    allowed: gate,
    prepare: async () => undefined,
    schedule: () => 1,
    cancel: () => undefined,
  });
  return { controller, played, gate, mute: () => { allowed = false; controller.sync(); } };
}

async function settle() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

test('feedback before bridge mount is dropped instead of replayed on attach', async () => {
  assert.equal(isGameAudioAllowed(), false);
  assert.equal(await playGameSound('correct'), false);
  const audio = bank();
  const detach = attachGameAudio(audio.controller, audio.gate);
  try {
    await settle();
    assert.deepEqual(audio.played, []);
    assert.equal(await playGameSound('correct'), true);
    assert.deepEqual(audio.played, ['correct']);
  } finally { detach(); }
  assert.equal(getGameAudioSnapshot(), null);
});

test('legacy lesson and button names route to authored profiles and duplicate result calls coalesce', async () => {
  const audio = bank();
  const detach = attachGameAudio(audio.controller, audio.gate);
  try {
    assert.equal(await playGameSound('correct'), true);
    assert.equal(getGameAudioSnapshot()?.sound, 'correct-step');
    assert.equal(await playGameSound('correct-step'), false);
    assert.deepEqual(audio.played, ['correct']);
    assert.equal(await playGameSound('wrong'), true);
    assert.equal(getGameAudioSnapshot()?.sound, 'heart-loss');
  } finally { detach(); }
});

test('a world registered before bridge mount restores on focus and rejects blurred cues', async () => {
  const owner = Symbol('world');
  setGameAudioWorld(owner, 'campus');
  setGameAudioOwnerActive(owner, true);
  const audio = bank();
  const detach = attachGameAudio(audio.controller, audio.gate);
  try {
    await settle();
    assert.equal(getGameAudioSnapshot()?.ambience, 'campus');
    setGameAudioOwnerActive(owner, false);
    assert.equal(await playGameSound('clue', owner), false);
    assert.equal(getGameAudioSnapshot()?.ambience, null);
    setGameAudioOwnerActive(owner, true);
    await settle();
    assert.equal(getGameAudioSnapshot()?.ambience, 'campus');
    assert.equal(audio.played.filter((id) => id === 'ambience').length, 2);
  } finally { releaseGameAudioOwner(owner); detach(); }
});

test('voice leases release independently and cannot resume ambience while muted', async () => {
  const audio = bank();
  const detach = attachGameAudio(audio.controller, audio.gate);
  const owner = Symbol('interview');
  let endFirst: (() => void) | undefined;
  let endSecond: (() => void) | undefined;
  try {
    setGameAudioOwnerActive(owner, true);
    setGameAudioWorld(owner, 'lab');
    await settle();
    endFirst = suspendGameAmbienceForVoice();
    endSecond = suspendGameAmbienceForVoice();
    endFirst();
    endFirst();
    assert.equal(getGameAudioSnapshot()?.voiceActive, true);
    assert.equal(getGameAudioSnapshot()?.ambience, null);
    audio.mute();
    endSecond();
    await settle();
    assert.equal(getGameAudioSnapshot()?.voiceActive, false);
    assert.equal(getGameAudioSnapshot()?.ambience, null);
    assert.equal(audio.played.filter((id) => id === 'ambience').length, 1);
    assert.equal(await playGameSound('completion'), false);
  } finally { endFirst?.(); endSecond?.(); releaseGameAudioOwner(owner); detach(); }
});

test('a stale bridge cleanup cannot detach the replacement controller', async () => {
  const first = bank();
  const second = bank();
  const detachFirst = attachGameAudio(first.controller, first.gate);
  const detachSecond = attachGameAudio(second.controller, second.gate);
  try {
    assert.equal(first.controller.snapshot().disposed, true);
    detachFirst();
    assert.equal(await playGameSound('snap'), true);
    assert.deepEqual(first.played, []);
    assert.deepEqual(second.played, ['snap']);
  } finally { detachFirst(); detachSecond(); }
});
