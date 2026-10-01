import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState } from '../domain/progression';
import { initialAdventure } from './state';
import {
  claimQuest,
  initialProfileQuests,
  observeQuestSources,
  parseProfileQuests,
  questRewardXP,
  selectDailyQuests,
  totalProfileXP,
  type QuestSourceSnapshot,
} from './profile-quests';
import {
  createProfileQuestStore,
  PROFILE_QUESTS_STORAGE_KEY,
  type ProfileQuestStorage,
} from './profile-quests-store';

const day = '2026-09-29';
const today = () => new Date(2026, 8, 29, 12);
const emptySource: QuestSourceSnapshot = { id: 'adventure', completions: [] };
const earned = (date = day): QuestSourceSnapshot => ({
  id: 'adventure',
  completions: [
    { id: 'explore', completedAt: date, baseXP: 60 },
    { id: 'insight', completedAt: date, baseXP: 40 },
  ],
});
function disk(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  const storage: ProfileQuestStorage = {
    getItem: async (key) => {
      assert.equal(key, PROFILE_QUESTS_STORAGE_KEY);
      return raw;
    },
    setItem: async (key, value) => {
      assert.equal(key, PROFILE_QUESTS_STORAGE_KEY);
      raw = value;
      writes++;
    },
  };
  return { storage, raw: () => raw, writes: () => writes };
}
async function eligible(storage: ProfileQuestStorage, clock = today) {
  const store = createProfileQuestStore(storage, clock);
  await store.getState().hydrate();
  await store.getState().observe([emptySource]);
  await store.getState().observe([earned()]);
  return store;
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

test('old untimestamped adventure stages and first-load practice never receive invented daily credit', () => {
  const state = observeQuestSources(
    initialProfileQuests(),
    [
      earned(),
      {
        id: 'practice',
        completions: [{ id: 'practice-1', completedAt: day, baseXP: 25 }],
      },
    ],
    today(),
  );
  assert.ok(Object.values(state.evidence).every((item) => item.date === null));
  assert.ok(selectDailyQuests(state, today()).every((quest) => quest.progress === 0));
  const replay = observeQuestSources(state, [earned()], today());
  assert.equal(replay, state);
});

test('immutable lesson first dates count; replays, duplicate IDs and changed dates cannot raise progress', () => {
  const source: QuestSourceSnapshot = {
    id: 'lessons',
    allowInitialCredit: true,
    completions: [{ id: 'discover-1', completedAt: day, baseXP: 20 }],
  };
  const state = observeQuestSources(initialProfileQuests(), [source], today());
  const replay = observeQuestSources(
    state,
    [
      {
        ...source,
        completions: [
          ...source.completions,
          { id: 'discover-1', completedAt: '2026-09-30', baseXP: 999 },
        ],
      },
    ],
    new Date(2026, 8, 30),
  );
  assert.equal(replay, state);
  assert.equal(selectDailyQuests(state, today())[0]!.progress, 1);
  assert.equal(selectDailyQuests(replay, new Date(2026, 8, 30))[0]!.progress, 0);
});

test('pure selectors count base Sparks only and totals add every claim once', () => {
  let state = observeQuestSources(initialProfileQuests(), [emptySource], today());
  state = observeQuestSources(state, [earned()], today());
  for (const quest of selectDailyQuests(state, today()))
    state = claimQuest(state, quest.id, day, today());
  assert.equal(questRewardXP(state), 45);
  assert.equal(selectDailyQuests(state, today())[2]!.progress, 80);
  const app = createInitialState();
  app.xp = 20;
  const adventure = initialAdventure();
  adventure.earned = ['explore', 'insight'];
  assert.equal(totalProfileXP(app, adventure, state, 25), 190);
  assert.equal(totalProfileXP(app, adventure, state, Infinity), 165);
  assert.deepEqual(parseProfileQuests(JSON.stringify(state)), state);
});

test('claim hydration gate never overwrites an unread save', async () => {
  const gate = deferred();
  const data = disk();
  const store = createProfileQuestStore(
    {
      ...data.storage,
      getItem: async () => {
        await gate.promise;
        return null;
      },
    },
    today,
  );
  const loading = store.getState().hydrate();
  assert.equal(loading, store.getState().hydrate());
  assert.equal((await store.getState().claim('first-step')).success, false);
  assert.equal((await store.getState().reset()).success, false);
  assert.equal(data.writes(), 0);
  gate.resolve();
  await loading;
});

test('duplicate and concurrent claims award once, and survive a new store instance', async () => {
  const data = disk();
  const store = await eligible(data.storage);
  const results = await Promise.all(
    Array.from({ length: 10 }, () => store.getState().claim('first-step')),
  );
  assert.equal(results.filter((result) => result.xpEarned === 10).length, 1);
  assert.equal(results.filter((result) => result.alreadyClaimed).length, 9);
  assert.equal(questRewardXP(store.getState()), 10);
  const loaded = createProfileQuestStore(data.storage, today);
  await loaded.getState().hydrate();
  assert.equal((await loaded.getState().claim('first-step')).xpEarned, 0);
  assert.equal(questRewardXP(loaded.getState()), 10);
  assert.deepEqual(loaded.getState().exportSnapshot(), store.getState().exportSnapshot());
});

test('date rollover rejects yesterday buttons and old evidence cannot be replayed for new rewards', async () => {
  let now = today();
  const store = await eligible(disk().storage, () => now);
  await store.getState().claim('first-step');
  now = new Date(2026, 8, 30, 0, 1);
  assert.equal((await store.getState().claim('two-steps', day)).success, false);
  await store.getState().observe([earned('2026-09-30')]);
  assert.equal(selectDailyQuests(store.getState(), now)[0]!.progress, 0);
  assert.equal((await store.getState().claim('first-step')).success, false);
  await store
    .getState()
    .observe([
      {
        id: 'adventure',
        completions: [
          ...earned().completions,
          { id: 'scope', completedAt: '2026-09-30', baseXP: 40 },
        ],
      },
    ]);
  assert.equal((await store.getState().claim('first-step')).xpEarned, 10);
  assert.equal(questRewardXP(store.getState()), 20);
});

test('source replay after reset or invalidation retains consumed evidence IDs', async () => {
  const store = await eligible(disk().storage);
  await store.getState().claim('first-step');
  await store.getState().observe([emptySource]);
  await store.getState().observe([earned()]);
  assert.equal((await store.getState().claim('first-step')).xpEarned, 0);
  assert.equal(Object.keys(store.getState().evidence).length, 2);
});

test('failed claim writes never inflate visible XP and retry commits one durable reward', async () => {
  const data = disk();
  let fail = false;
  const store = await eligible({
    ...data.storage,
    setItem: async (key, value) => {
      if (fail) throw new Error('storage full');
      await data.storage.setItem(key, value);
    },
  });
  fail = true;
  const failed = await store.getState().claim('first-step');
  assert.equal(failed.success, false);
  assert.equal(failed.xpEarned, 0);
  assert.equal(questRewardXP(store.getState()), 0);
  assert.equal(questRewardXP(parseProfileQuests(data.raw())), 0);
  assert.ok(store.getState().error);
  fail = false;
  assert.equal((await store.getState().retry()).success, true);
  assert.equal(questRewardXP(store.getState()), 10);
  assert.equal((await store.getState().claim('first-step')).xpEarned, 0);
});

test('a save that succeeds then throws still reloads and cannot double-grant', async () => {
  const data = disk();
  let uncertain = false;
  const store = await eligible({
    ...data.storage,
    setItem: async (key, value) => {
      await data.storage.setItem(key, value);
      if (uncertain) throw new Error('response lost');
    },
  });
  uncertain = true;
  assert.equal((await store.getState().claim('first-step')).success, false);
  const reloaded = createProfileQuestStore(data.storage, today);
  await reloaded.getState().hydrate();
  assert.equal(questRewardXP(reloaded.getState()), 10);
  assert.equal((await reloaded.getState().claim('first-step')).xpEarned, 0);
});

test('failed evidence saves keep their original date across midnight retry', async () => {
  const data = disk();
  let now = today();
  let fail = false;
  const store = createProfileQuestStore(
    {
      ...data.storage,
      setItem: async (key, value) => {
        if (fail) throw new Error('unavailable');
        await data.storage.setItem(key, value);
      },
    },
    () => now,
  );
  await store.getState().hydrate();
  await store.getState().observe([emptySource]);
  fail = true;
  await store.getState().observe([earned()]);
  assert.equal(Object.keys(store.getState().evidence).length, 0);
  now = new Date(2026, 8, 30, 0, 2);
  fail = false;
  await store.getState().retry();
  assert.equal(store.getState().evidence['adventure:explore']?.date, day);
  assert.equal(selectDailyQuests(store.getState(), now)[0]!.progress, 0);
});

test('read failures and incompatible/corrupt reward ledgers stay protected until safe reread or explicit reset', async () => {
  for (const saved of [
    '{bad',
    '{"version":2}',
    JSON.stringify({
      ...initialProfileQuests(),
      claims: { fake: { day, questId: 'first-step', evidenceIds: [] } },
    }),
  ]) {
    const data = disk(saved);
    const store = createProfileQuestStore(data.storage, today);
    await store.getState().hydrate();
    assert.ok(store.getState().error);
    await store.getState().observe([emptySource]);
    await store.getState().claim('first-step');
    assert.equal((await store.getState().retry()).success, false);
    assert.equal(data.writes(), 0);
    assert.equal(data.raw(), saved);
    assert.equal((await store.getState().reset()).success, true);
    assert.deepEqual(parseProfileQuests(data.raw()), initialProfileQuests());
  }
  const data = disk();
  let fail = true;
  const store = createProfileQuestStore(
    {
      ...data.storage,
      getItem: async (key) => {
        if (fail) throw new Error('blocked');
        return data.storage.getItem(key);
      },
    },
    today,
  );
  await store.getState().hydrate();
  assert.equal((await store.getState().retry()).success, false);
  fail = false;
  assert.equal((await store.getState().retry()).success, true);
  assert.equal(data.writes(), 0);
});

test('serialized writes and flush include a claim queued while a prior save is pending', async () => {
  const data = disk();
  const gate = deferred();
  let delay = false;
  let active = 0;
  let maxActive = 0;
  const store = await eligible({
    ...data.storage,
    setItem: async (key, value) => {
      active++;
      maxActive = Math.max(maxActive, active);
      if (delay) {
        delay = false;
        await gate.promise;
      }
      await data.storage.setItem(key, value);
      active--;
    },
  });
  delay = true;
  const first = store.getState().claim('first-step');
  let flushed = false;
  const flushing = store
    .getState()
    .flush()
    .then(() => {
      flushed = true;
    });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(questRewardXP(store.getState()), 0);
  const second = store.getState().claim('two-steps');
  assert.equal(flushed, false);
  gate.resolve();
  await Promise.all([first, second, flushing]);
  assert.equal(maxActive, 1);
  assert.equal(questRewardXP(parseProfileQuests(data.raw())), 25);
});

test('practice source IDs remain independent, baseline existing work and count only new first completions', () => {
  let state = observeQuestSources(
    initialProfileQuests(),
    [{ id: 'practice', completions: [{ id: 'one', completedAt: day, baseXP: 25 }] }],
    today(),
  );
  state = observeQuestSources(
    state,
    [
      {
        id: 'practice',
        completions: [
          { id: 'one', completedAt: day, baseXP: 25 },
          { id: 'two', completedAt: day, baseXP: 25 },
        ],
      },
    ],
    today(),
  );
  const quests = selectDailyQuests(state, today());
  assert.equal(quests[0]!.progress, 1);
  assert.equal(quests[2]!.progress, 25);
  const rewarded = claimQuest(state, 'first-step', day, today());
  assert.equal(
    selectDailyQuests(rewarded, today())[2]!.progress,
    25,
    '10 bonus Sparks do not count as base progress',
  );
});

test('explicit full reset persists and failed reset reports failure without inventing zero durable totals', async () => {
  const data = disk();
  let fail = false;
  const store = await eligible({
    ...data.storage,
    setItem: async (key, value) => {
      if (fail) throw new Error('full');
      await data.storage.setItem(key, value);
    },
  });
  await store.getState().claim('first-step');
  fail = true;
  assert.equal((await store.getState().reset()).success, false);
  assert.equal(questRewardXP(store.getState()), 10);
  fail = false;
  assert.equal((await store.getState().reset()).success, true);
  assert.deepEqual(parseProfileQuests(data.raw()), initialProfileQuests());
  assert.equal(questRewardXP(store.getState()), 0);
});
