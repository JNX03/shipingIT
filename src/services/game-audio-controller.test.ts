import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createGameAudioController,
  gameCueIds,
  soundProfiles,
  type FeedbackSound,
  type GameAudioPort,
  type GameAudioTimer,
  type GameCue,
} from './game-audio-controller';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

function fakeClock() {
  let time = 0;
  let nextId = 1;
  const pending = new Map<GameAudioTimer, { at: number; callback: () => void }>();
  const cancelled: (() => void)[] = [];
  return {
    now: () => time,
    schedule(callback: () => void, delay: number): GameAudioTimer {
      const id = nextId++;
      pending.set(id, { at: time + delay, callback });
      return id;
    },
    cancel(id: GameAudioTimer) {
      const timer = pending.get(id);
      if (timer) cancelled.push(timer.callback);
      pending.delete(id);
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
    fireCancelled() {
      for (const callback of cancelled.splice(0)) callback();
    },
    pendingCount: () => pending.size,
  };
}

function fakePlayer() {
  const calls = { ready: 0, rewound: 0, played: 0, paused: 0, cancelled: 0 };
  const volumes: number[] = [];
  const rates: number[] = [];
  const state = { playing: false, duration: 0 };
  const behavior: {
    ready: () => Promise<boolean>;
    rewind: () => Promise<void>;
    play: () => void | Promise<void>;
  } = {
    ready: async () => true,
    rewind: async () => {},
    play: () => {},
  };
  const port: GameAudioPort = {
    ready: () => {
      calls.ready += 1;
      return behavior.ready();
    },
    rewind: () => {
      calls.rewound += 1;
      return behavior.rewind();
    },
    play: () => {
      calls.played += 1;
      state.playing = true;
      return behavior.play();
    },
    pause: () => {
      calls.paused += 1;
      state.playing = false;
    },
    volume: (value) => volumes.push(value),
    rate: (value) => rates.push(value),
    cancelReady: () => {
      calls.cancelled += 1;
    },
    durationMs: () => state.duration,
  };
  return { calls, volumes, rates, state, behavior, port };
}

function fixture() {
  const clock = fakeClock();
  const state = { enabled: true, foreground: true, prepared: 0 };
  const prepare = { run: async () => {} };
  const players = Object.fromEntries(gameCueIds.map((id) => [id, fakePlayer()])) as Record<
    GameCue,
    ReturnType<typeof fakePlayer>
  >;
  const ambience = fakePlayer();
  const controller = createGameAudioController(
    Object.fromEntries(gameCueIds.map((id) => [id, players[id].port])) as Record<GameCue, GameAudioPort>,
    ambience.port,
    {
      allowed: () => state.enabled && state.foreground,
      prepare: async () => {
        state.prepared += 1;
        await prepare.run();
      },
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
    },
  );
  return { controller, players, ambience, clock, state, prepare };
}

const ownerA = Symbol('screen A');
const ownerB = Symbol('screen B');

test('seven authored events select existing cue resources with distinct speed and gain', async () => {
  const signatures = new Set<string>();
  for (const name of Object.keys(soundProfiles) as FeedbackSound[]) {
    const f = fixture();
    const profile = soundProfiles[name];
    assert.equal(await f.controller.play(name, ownerA), true);
    const player = f.players[profile.cue];
    assert.equal(player.calls.played, 1);
    assert.equal(player.rates.at(-1), profile.rate);
    assert.equal(player.volumes.at(-1), profile.volume);
    assert.equal(f.controller.snapshot().sound, name);
    signatures.add(`${profile.cue}:${profile.rate}:${profile.volume}`);
    f.controller.dispose();
  }
  assert.equal(signatures.size, 7);
});

test('event voices do not overlap narration, revive on voice end, or outlive a blurred owner', async () => {
  const f = fixture();
  f.controller.setVoiceActive(true);
  assert.equal(await f.controller.play('heart-loss', ownerA), false);
  assert.equal(await f.controller.play('character-greet', ownerA), false);
  f.controller.setVoiceActive(false);
  await flush();
  assert.equal(f.players.wrong.calls.played, 0, 'there must be no stale queued feedback');
  assert.equal(await f.controller.play('correct-step', ownerA), true);
  f.controller.setVoiceActive(true);
  assert.equal(f.players.correct.state.playing, false);
  f.controller.setVoiceActive(false);
  assert.equal(await f.controller.play('unit-complete', ownerA), true);
  f.controller.setOwnerActive(ownerA, false);
  assert.equal(f.players.completion.state.playing, false);
  assert.equal(await f.controller.play('pro-charge', ownerA), false);
});

test('pitch-changing rate adjusts the important cue window and raw cues restore normal speed', async () => {
  const f = fixture();
  f.players.completion.state.duration = 760;
  assert.equal(await f.controller.play('unit-complete', ownerA), true);
  await f.clock.advance(840);
  assert.equal(f.controller.snapshot().sound, 'unit-complete');
  await f.clock.advance(80);
  assert.equal(f.controller.snapshot().sound, null);
  assert.equal(await f.controller.play('completion', ownerA), true);
  assert.equal(f.players.completion.rates.at(-1), 1);
  f.controller.dispose();
});

for (const gate of ['enabled', 'foreground'] as const) {
  test(`${gate} global gate prevents audio preparation, cues, ambience, and walking`, async () => {
    const f = fixture();
    f.state[gate] = false;
    assert.equal(await f.controller.play('completion', ownerA), false);
    f.controller.setWorld(ownerA, 'forest');
    f.controller.setWalking(ownerA, true);
    await flush();
    assert.equal(f.state.prepared, 0);
    assert.equal(f.ambience.calls.ready, 0);
    assert.equal(f.controller.snapshot().ambience, null);
    assert.equal(f.controller.snapshot().walkingOwners, 0);
    assert.equal(f.clock.pendingCount(), 0);
    for (const player of Object.values(f.players)) assert.equal(player.calls.played, 0);
  });

  for (const phase of ['prepare', 'ready', 'rewind'] as const) {
    test(`${gate} change cancels a cue pending ${phase} even after global audio becomes allowed again`, async () => {
      const f = fixture();
      const pendingVoid = deferred<void>();
      const pendingReady = deferred<boolean>();
      if (phase === 'prepare') f.prepare.run = () => pendingVoid.promise;
      if (phase === 'ready') f.players.clue.behavior.ready = () => pendingReady.promise;
      if (phase === 'rewind') f.players.clue.behavior.rewind = () => pendingVoid.promise;
      const result = f.controller.play('clue', ownerA);
      await flush();
      assert.equal(f.controller.snapshot().cuePending, true);
      if (phase === 'ready') assert.equal(f.players.clue.calls.ready, 1);
      if (phase === 'rewind') assert.equal(f.players.clue.calls.rewound, 1);

      f.state[gate] = false;
      f.controller.sync();
      f.state[gate] = true;
      f.controller.sync();
      pendingVoid.resolve();
      pendingReady.resolve(true);
      assert.equal(await result, false);
      assert.equal(f.players.clue.calls.played, 0);
      assert.ok(f.players.clue.calls.cancelled > 0);
      assert.equal(f.controller.snapshot().cue, null);
      assert.equal(f.clock.pendingCount(), 0);
    });
  }

  for (const phase of ['prepare', 'ready', 'rewind'] as const) {
    test(`${gate} change cancels pending ambience ${phase} without reviving it from its old request`, async () => {
      const f = fixture();
      const oldPrepare = deferred<void>();
      const oldReady = deferred<boolean>();
      const oldSeek = deferred<void>();
      if (phase === 'prepare') f.prepare.run = () => oldPrepare.promise;
      if (phase === 'ready') f.ambience.behavior.ready = () => oldReady.promise;
      if (phase === 'rewind') f.ambience.behavior.rewind = () => oldSeek.promise;
      f.controller.setWorld(ownerA, 'forest');
      await flush();
      assert.equal(f.controller.snapshot().ambiencePending, true);
      if (phase === 'rewind') assert.equal(f.ambience.calls.rewound, 1);

      f.state[gate] = false;
      f.controller.sync();
      oldPrepare.resolve();
      oldReady.resolve(true);
      oldSeek.resolve();
      await flush();
      assert.equal(f.ambience.calls.played, 0);
      assert.equal(f.controller.snapshot().ambience, null);
      assert.equal(f.controller.snapshot().ambiencePending, false);

      f.state[gate] = true;
      f.prepare.run = async () => {};
      f.ambience.behavior.ready = async () => true;
      f.ambience.behavior.rewind = async () => {};
      f.controller.sync();
      await flush();
      assert.equal(f.ambience.calls.played, 1);
      assert.equal(f.controller.snapshot().ambience, 'forest');
    });
  }
}

test('a policy change during ready blocks playback even before sync runs', async () => {
  const f = fixture();
  f.players.wrong.behavior.ready = async () => {
    f.state.enabled = false;
    return true;
  };
  assert.equal(await f.controller.play('wrong', ownerA), false);
  assert.equal(f.players.wrong.calls.rewound, 0);
  assert.equal(f.players.wrong.calls.played, 0);
  assert.equal(f.controller.snapshot().cuePending, false);
});

test('backgrounding pauses all active audio and foregrounding restores ambience without replaying cues or movement', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  f.controller.setWalking(ownerA, true);
  await flush();
  assert.equal(await f.controller.play('completion', ownerA), true);
  assert.equal(f.ambience.state.playing, true);
  const footsteps = f.players.footstep.calls.played;
  f.state.foreground = false;
  f.controller.sync();
  assert.equal(f.controller.snapshot().cue, null);
  assert.equal(f.controller.snapshot().ambience, null);
  assert.equal(f.controller.snapshot().walkingOwners, 0);
  assert.equal(f.clock.pendingCount(), 0);
  assert.equal(f.ambience.state.playing, false);
  for (const player of Object.values(f.players)) assert.equal(player.state.playing, false);

  f.state.foreground = true;
  f.controller.sync();
  await flush();
  await f.clock.advance(2_000);
  assert.equal(f.ambience.calls.played, 2);
  assert.equal(f.players.footstep.calls.played, footsteps);
  assert.equal(f.players.completion.calls.played, 1);
  assert.equal(f.clock.pendingCount(), 0);
});

test('cleanup of an old owner preserves a newer owner cue and the shared world ambience', async () => {
  const f = fixture();
  f.controller.setOwnerActive(ownerA, true);
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  f.controller.setOwnerActive(ownerB, true);
  f.controller.setWorld(ownerB, 'forest');
  assert.equal(await f.controller.play('correct', ownerB), true);
  const pauses = f.players.correct.calls.paused;
  const ambientPauses = f.ambience.calls.paused;

  f.controller.releaseOwner(ownerA);
  await flush();
  assert.equal(f.controller.snapshot().cue, 'correct');
  assert.equal(f.players.correct.calls.paused, pauses);
  assert.equal(f.players.correct.state.playing, true);
  assert.equal(f.ambience.calls.played, 1);
  assert.equal(f.ambience.calls.paused, ambientPauses);
  assert.equal(f.controller.snapshot().ambience, 'forest');
});

test('deactivating a pending owner cannot revive its cue or interfere with another owner', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.clue.behavior.ready = () => ready.promise;
  f.controller.setOwnerActive(ownerA, true);
  const oldCue = f.controller.play('clue', ownerA);
  await flush();
  f.controller.setOwnerActive(ownerA, false);
  f.controller.setOwnerActive(ownerB, true);
  assert.equal(await f.controller.play('correct', ownerB), true);
  ready.resolve(true);
  assert.equal(await oldCue, false);
  assert.equal(f.players.clue.calls.played, 0);
  assert.equal(f.controller.snapshot().cue, 'correct');
  assert.equal(await f.controller.play('completion', ownerA), false);
});

test('removing the cue owner restores shared ambience volume immediately', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  f.controller.setWorld(ownerB, 'forest');
  await flush();
  assert.equal(await f.controller.play('clue', ownerA), true);
  assert.equal(f.ambience.volumes.at(-1), 0.07);
  f.controller.stopOwner(ownerA);
  await flush();
  assert.equal(f.controller.snapshot().cue, null);
  assert.equal(f.controller.snapshot().ambience, 'forest');
  assert.equal(f.ambience.volumes.at(-1), 0.22);
  assert.equal(f.ambience.calls.played, 1);
});

test('lower-priority cues cannot interrupt a playing or pending important cue', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.completion.behavior.ready = () => ready.promise;
  const importantCue = f.controller.play('completion', ownerA);
  await flush();
  const prepared = f.state.prepared;
  assert.equal(await f.controller.play('correct', ownerB), false);
  assert.equal(await f.controller.play('footstep', ownerB), false);
  assert.equal(f.state.prepared, prepared);
  ready.resolve(true);
  assert.equal(await importantCue, true);
  assert.equal(await f.controller.play('snap', ownerB), false);
  assert.equal(await f.controller.play('clue', ownerB), false);
  assert.equal(f.players.completion.state.playing, true);
  assert.equal(f.players.correct.calls.played, 0);
});

test('correct feedback supersedes a pending clue so guidance cannot delay an answer response', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.clue.behavior.ready = () => ready.promise;
  const clue = f.controller.play('clue', ownerA);
  await flush();
  assert.equal(await f.controller.play('correct', ownerB), true);
  ready.resolve(true);
  assert.equal(await clue, false);
  assert.equal(f.players.clue.calls.played, 0);
  assert.equal(f.players.correct.state.playing, true);
  assert.equal(f.controller.snapshot().cue, 'correct');
});

test('completion supersedes a pending lower-priority cue and stale readiness stays cancelled', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.clue.behavior.ready = () => ready.promise;
  const oldCue = f.controller.play('clue', ownerA);
  await flush();
  assert.equal(await f.controller.play('completion', ownerB), true);
  ready.resolve(true);
  assert.equal(await oldCue, false);
  assert.equal(f.players.clue.calls.played, 0);
  assert.equal(f.players.completion.calls.played, 1);
  assert.equal(f.controller.snapshot().cue, 'completion');
  assert.equal(f.clock.pendingCount(), 1);
});

test('equal-priority feedback replaces the previous cue without overlapping players', async () => {
  const f = fixture();
  assert.equal(await f.controller.play('correct', ownerA), true);
  assert.equal(await f.controller.play('wrong', ownerB), true);
  assert.equal(f.players.correct.state.playing, false);
  assert.equal(f.players.wrong.state.playing, true);
  assert.equal(f.controller.snapshot().cue, 'wrong');
  assert.equal(f.clock.pendingCount(), 1);
});

test('repeated cues are throttled until their minimum gap and successful replays rewind', async () => {
  const f = fixture();
  assert.equal(await f.controller.play('snap', ownerA), true);
  const prepared = f.state.prepared;
  assert.equal(await f.controller.play('snap', ownerB), false);
  await f.clock.advance(89);
  assert.equal(await f.controller.play('snap', ownerA), false);
  assert.equal(f.state.prepared, prepared);
  await f.clock.advance(1);
  assert.equal(await f.controller.play('snap', ownerB), true);
  assert.equal(f.players.snap.calls.played, 2);
  assert.equal(f.players.snap.calls.rewound, 2);
  assert.equal(f.clock.pendingCount(), 1);
});

test('an older pending play resolution cannot pause a newer request on the same cue player', async () => {
  const f = fixture();
  const playing = deferred<void>();
  let request = 0;
  f.players.completion.behavior.play = () => (++request === 1 ? playing.promise : undefined);
  const oldCue = f.controller.play('completion', ownerA);
  await flush();
  assert.equal(f.players.completion.calls.played, 1);
  await f.clock.advance(1_000);
  assert.equal(await f.controller.play('completion', ownerB), true);
  const pauses = f.players.completion.calls.paused;
  playing.resolve();
  assert.equal(await oldCue, false);
  assert.equal(f.players.completion.calls.paused, pauses);
  assert.equal(f.players.completion.state.playing, true);
  assert.equal(f.controller.snapshot().cue, 'completion');
});

test('walking repeats while moving, and stopping clears its next tick', async () => {
  const f = fixture();
  f.controller.setWalking(ownerA, true);
  await flush();
  assert.equal(f.players.footstep.calls.played, 1);
  assert.ok((f.players.footstep.volumes.at(-1) ?? 0) > 0);
  assert.ok((f.players.footstep.volumes.at(-1) ?? Infinity) <= 1);
  await f.clock.advance(289);
  assert.equal(f.players.footstep.calls.played, 1);
  await f.clock.advance(1);
  assert.equal(f.players.footstep.calls.played, 2);
  f.controller.setWalking(ownerA, false);
  await f.clock.advance(2_000);
  assert.equal(f.players.footstep.calls.played, 2);
  assert.equal(f.controller.snapshot().walkingOwners, 0);
  assert.equal(f.clock.pendingCount(), 0);
});

for (const phase of ['ready', 'rewind'] as const) {
  test(`stopping movement cancels a footstep pending ${phase}`, async () => {
    const f = fixture();
    const ready = deferred<boolean>();
    const seeking = deferred<void>();
    if (phase === 'ready') f.players.footstep.behavior.ready = () => ready.promise;
    if (phase === 'rewind') f.players.footstep.behavior.rewind = () => seeking.promise;
    f.controller.setWalking(ownerA, true);
    await flush();
    assert.equal(f.controller.snapshot().cuePending, true);
    f.controller.setWalking(ownerA, false);
    ready.resolve(true);
    seeking.resolve();
    await flush();
    await f.clock.advance(1_000);
    assert.equal(f.players.footstep.calls.played, 0);
    assert.equal(f.controller.snapshot().cue, null);
    assert.equal(f.clock.pendingCount(), 0);
  });
}

test('cleanup of one walking owner preserves the other owner movement timer', async () => {
  const f = fixture();
  f.controller.setWalking(ownerA, true);
  f.controller.setWalking(ownerB, true);
  await flush();
  f.controller.releaseOwner(ownerA);
  assert.equal(f.controller.snapshot().walkingOwners, 1);
  await f.clock.advance(290);
  assert.equal(f.players.footstep.calls.played, 2);
  f.controller.releaseOwner(ownerB);
  await f.clock.advance(2_000);
  assert.equal(f.players.footstep.calls.played, 2);
  assert.equal(f.clock.pendingCount(), 0);
});

test('global stop cancels pending footsteps and movement does not resume when audio becomes allowed', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.footstep.behavior.ready = () => ready.promise;
  f.controller.setWalking(ownerA, true);
  await flush();
  f.state.foreground = false;
  f.controller.sync();
  f.state.foreground = true;
  f.controller.sync();
  ready.resolve(true);
  await flush();
  await f.clock.advance(2_000);
  assert.equal(f.players.footstep.calls.played, 0);
  assert.equal(f.controller.snapshot().walkingOwners, 0);
  assert.equal(f.clock.pendingCount(), 0);

  f.players.footstep.behavior.ready = async () => true;
  f.controller.setWalking(ownerA, true);
  await flush();
  assert.equal(f.players.footstep.calls.played, 1);
  f.controller.stop();
  assert.equal(f.clock.pendingCount(), 0);
});

test('repeated same-world requests preserve pending loading and do not restart playing ambience', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.ambience.behavior.ready = () => ready.promise;
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  f.controller.setWorld(ownerB, 'forest');
  f.controller.setWorld(ownerA, 'forest');
  assert.equal(await f.controller.refreshAmbience(), true);
  assert.equal(f.ambience.calls.ready, 1);
  assert.equal(f.state.prepared, 1);
  ready.resolve(true);
  await flush();
  assert.equal(f.ambience.calls.played, 1);
  const pauses = f.ambience.calls.paused;
  f.controller.sync();
  f.controller.setWorld(ownerB, 'forest');
  await flush();
  assert.equal(f.ambience.calls.played, 1);
  assert.equal(f.ambience.calls.rewound, 1);
  assert.equal(f.ambience.calls.paused, pauses);
});

test('a new world cancels the old pending ambience seek and only the latest world plays', async () => {
  const f = fixture();
  const seeking = deferred<void>();
  let seeks = 0;
  f.ambience.behavior.rewind = () => (++seeks === 1 ? seeking.promise : Promise.resolve());
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  assert.equal(f.ambience.calls.rewound, 1);
  f.controller.setWorld(ownerA, 'desert');
  await flush();
  assert.equal(f.ambience.calls.played, 1);
  seeking.resolve();
  await flush();
  assert.equal(f.ambience.calls.played, 1);
  assert.equal(f.ambience.state.playing, true);
  assert.equal(f.controller.snapshot().ambience, 'desert');
});

test('cue ducking uses actual duration and restores ambience gain when the cue expires', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  f.players.correct.state.duration = 1_000;
  assert.equal(await f.controller.play('correct', ownerA), true);
  assert.ok((f.players.correct.volumes.at(-1) ?? 0) > 0);
  assert.ok((f.players.correct.volumes.at(-1) ?? Infinity) <= 1);
  assert.equal(f.ambience.volumes.at(-1), 0.07);
  await f.clock.advance(1_059);
  assert.equal(f.controller.snapshot().cue, 'correct');
  assert.equal(f.ambience.volumes.at(-1), 0.07);
  await f.clock.advance(1);
  assert.equal(f.controller.snapshot().cue, null);
  assert.equal(f.ambience.volumes.at(-1), 0.22);
  assert.equal(f.ambience.calls.played, 1);
  assert.equal(f.clock.pendingCount(), 0);
});

test('voice pauses ambience and world cues, permits completion, and resumes only while globally allowed', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  assert.equal(await f.controller.play('clue', ownerA), true);
  f.controller.setVoiceActive(true);
  assert.equal(f.ambience.state.playing, false);
  assert.equal(f.players.clue.state.playing, false);
  assert.equal(await f.controller.play('clue', ownerA), false);
  assert.equal(await f.controller.play('completion', ownerA), true);

  f.state.enabled = false;
  f.controller.sync();
  const plays = f.ambience.calls.played;
  f.controller.setVoiceActive(false);
  await flush();
  assert.equal(f.ambience.calls.played, plays);
  assert.equal(f.controller.snapshot().ambience, null);
  f.state.enabled = true;
  f.controller.sync();
  await flush();
  assert.equal(f.ambience.calls.played, plays + 1);
  assert.equal(f.controller.snapshot().ambience, 'forest');
});

test('read-aloud never swallows button clicks or lesson check/result cues', async () => {
  const f = fixture();
  f.controller.setVoiceActive(true);
  assert.equal(await f.controller.play('footstep', ownerA), false);
  assert.equal(await f.controller.play('clue', ownerA), false);
  for (const id of ['snap', 'correct', 'wrong', 'completion'] as const) {
    assert.equal(await f.controller.play(id, ownerA), true);
    assert.equal(f.players[id].calls.played, 1);
    await f.clock.advance(1_000);
  }
});

test('voice start cancels a pending ordinary cue and stale readiness cannot resume it', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.clue.behavior.ready = () => ready.promise;
  const cue = f.controller.play('clue', ownerA);
  await flush();
  f.controller.setVoiceActive(true);
  f.controller.setVoiceActive(false);
  ready.resolve(true);
  assert.equal(await cue, false);
  assert.equal(f.players.clue.calls.played, 0);
});

test('an older ambience play resolution cannot silence ambience restarted after voice finishes', async () => {
  const f = fixture();
  const playing = deferred<void>();
  let request = 0;
  f.ambience.behavior.play = () => (++request === 1 ? playing.promise : undefined);
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  assert.equal(f.ambience.calls.played, 1);
  f.controller.setVoiceActive(true);
  f.controller.setVoiceActive(false);
  await flush();
  assert.equal(f.ambience.calls.played, 2);
  const pauses = f.ambience.calls.paused;
  playing.resolve();
  await flush();
  assert.equal(f.ambience.calls.paused, pauses);
  assert.equal(f.ambience.state.playing, true);
  assert.equal(f.controller.snapshot().ambience, 'forest');
  assert.equal(f.controller.snapshot().ambiencePending, false);
});

test('rejected cue playback is contained, paused, unducked, and allows later feedback', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  f.players.clue.behavior.play = async () => {
    throw new Error('Audio device failed');
  };
  assert.equal(await f.controller.play('clue', ownerA), false);
  assert.equal(f.players.clue.state.playing, false);
  assert.equal(f.controller.snapshot().cue, null);
  assert.equal(f.controller.snapshot().cuePending, false);
  assert.equal(f.ambience.volumes.at(-1), 0.22);
  assert.equal(f.clock.pendingCount(), 0);
  assert.equal(await f.controller.play('correct', ownerA), true);
});

test('rejected ambience playback resets its pending state and can be retried', async () => {
  const f = fixture();
  f.ambience.behavior.play = async () => {
    throw new Error('Audio unavailable');
  };
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  assert.equal(f.ambience.state.playing, false);
  assert.equal(f.controller.snapshot().ambience, null);
  assert.equal(f.controller.snapshot().ambiencePending, false);
  f.ambience.behavior.play = () => {};
  assert.equal(await f.controller.refreshAmbience(), true);
  assert.equal(f.ambience.calls.played, 2);
  assert.equal(f.ambience.state.playing, true);
});

test('load failure and seeking rejection clear pending priority and restore ambience volume', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  await flush();
  f.players.completion.behavior.ready = async () => false;
  assert.equal(await f.controller.play('completion', ownerA), false);
  assert.equal(f.players.completion.calls.played, 0);
  f.players.clue.behavior.rewind = async () => {
    throw new Error('Released player');
  };
  assert.equal(await f.controller.play('clue', ownerA), false);
  assert.equal(f.players.clue.calls.played, 0);
  assert.equal(f.controller.snapshot().cuePending, false);
  assert.equal(f.ambience.volumes.at(-1), 0.22);
  assert.equal(await f.controller.play('correct', ownerA), true);
});

test('dispose clears cue and walking timers and remains safe against stale timer callbacks', async () => {
  const f = fixture();
  f.controller.setWorld(ownerA, 'forest');
  f.controller.setWalking(ownerA, true);
  await flush();
  assert.equal(f.clock.pendingCount(), 2);
  const cuePlays = f.players.footstep.calls.played;
  const ambientPlays = f.ambience.calls.played;
  f.controller.dispose();
  assert.equal(f.clock.pendingCount(), 0);
  assert.equal(f.controller.snapshot().disposed, true);
  assert.equal(f.controller.snapshot().cue, null);
  assert.equal(f.controller.snapshot().ambience, null);
  assert.equal(f.controller.snapshot().walkingOwners, 0);
  assert.equal(f.players.footstep.state.playing, false);
  assert.equal(f.ambience.state.playing, false);

  f.clock.fireCancelled();
  await f.clock.advance(5_000);
  f.controller.dispose();
  f.controller.setWalking(ownerA, true);
  f.controller.setWorld(ownerA, 'desert');
  f.controller.setVoiceActive(false);
  f.controller.sync();
  assert.equal(await f.controller.play('completion', ownerA), false);
  await flush();
  assert.equal(f.players.footstep.calls.played, cuePlays);
  assert.equal(f.ambience.calls.played, ambientPlays);
  assert.equal(f.clock.pendingCount(), 0);
});

test('dispose invalidates pending cue and ambience work before either can play', async () => {
  const f = fixture();
  const ready = deferred<boolean>();
  f.players.clue.behavior.ready = () => ready.promise;
  f.ambience.behavior.ready = () => ready.promise;
  f.controller.setWorld(ownerA, 'forest');
  const cue = f.controller.play('clue', ownerA);
  await flush();
  assert.equal(f.players.clue.calls.ready, 1);
  assert.equal(f.ambience.calls.ready, 1);
  f.controller.dispose();
  ready.resolve(true);
  assert.equal(await cue, false);
  await flush();
  assert.equal(f.players.clue.calls.played, 0);
  assert.equal(f.ambience.calls.played, 0);
  assert.equal(f.clock.pendingCount(), 0);
  assert.equal(f.controller.snapshot().ambiencePending, false);
});
