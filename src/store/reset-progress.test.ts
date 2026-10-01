import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppStore, STORAGE_KEY } from './createAppStore';
import { ADVENTURE_STORAGE_KEY, createAdventureStore } from '../game/create-adventure-store';
import { resetLocalProgress } from './reset-progress';

async function fixture() {
  const values = new Map<string, string>();
  let failingKey: string | undefined;
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      if (key === failingKey) throw new Error('disk full');
      values.set(key, value);
    },
  };
  const learning = createAppStore(storage);
  const adventure = createAdventureStore(storage);
  await Promise.all([learning.getState().hydrate(), adventure.getState().hydrate()]);
  learning.getState().completeOnboarding({ name: 'Sam' });
  learning.getState().updateProject({ name: 'Original notebook' });
  adventure.getState().begin();
  adventure.getState().patchDraft({ projectName: 'Original game' });
  await Promise.all([learning.getState().flushPersistence(), adventure.getState().flush()]);
  return {
    learning,
    adventure,
    storage,
    values,
    fail: (key?: string) => {
      failingKey = key;
    },
  };
}

test('only exact RESET can reset either persisted store', async () => {
  const disk = await fixture();
  const before = [...disk.values];
  for (const input of ['', 'reset', ' RESET', 'RESET ']) {
    assert.equal((await resetLocalProgress(input, disk.learning, disk.adventure)).success, false);
    assert.deepEqual([...disk.values], before);
  }
  assert.equal((await resetLocalProgress('RESET', disk.learning, disk.adventure)).success, true);
  const nextLearning = createAppStore(disk.storage);
  const nextGame = createAdventureStore(disk.storage);
  await Promise.all([nextLearning.getState().hydrate(), nextGame.getState().hydrate()]);
  assert.equal(nextLearning.getState().onboardingComplete, false);
  assert.equal(nextLearning.getState().project.name, '');
  assert.equal(nextGame.getState().started, false);
  assert.equal(nextGame.getState().draft.projectName, 'Lunch Lens');
});

for (const failedKey of [STORAGE_KEY, ADVENTURE_STORAGE_KEY]) {
  test(`a failed ${failedKey} reset is reported and retry persists both resets`, async () => {
    const disk = await fixture();
    disk.fail(failedKey);
    const failed = await resetLocalProgress('RESET', disk.learning, disk.adventure);
    assert.equal(failed.success, false);
    assert.match(failed.message, /could not be fully saved/);
    disk.fail();
    assert.equal((await resetLocalProgress('RESET', disk.learning, disk.adventure)).success, true);
    assert.equal(JSON.parse(disk.values.get(STORAGE_KEY)!).onboardingComplete, false);
    assert.equal(JSON.parse(disk.values.get(ADVENTURE_STORAGE_KEY)!).started, false);
  });
}

test('reset waits for both storage writes before reporting success', async () => {
  const disk = await fixture();
  const releases: (() => void)[] = [];
  const slowStorage = {
    getItem: disk.storage.getItem,
    setItem: (key: string, value: string) =>
      new Promise<void>((resolve) => {
        releases.push(() => {
          disk.values.set(key, value);
          resolve();
        });
      }),
  };
  const learning = createAppStore(slowStorage),
    adventure = createAdventureStore(slowStorage);
  await Promise.all([learning.getState().hydrate(), adventure.getState().hydrate()]);
  let finished = false;
  const reset = resetLocalProgress('RESET', learning, adventure).then((result) => {
    finished = true;
    return result;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releases.length, 2);
  releases[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(finished, false);
  releases[1]();
  assert.equal((await reset).success, true);
});

test('reset does not touch stores before both have hydrated', async () => {
  const disk = await fixture();
  const unhydrated = createAdventureStore(disk.storage);
  const before = [...disk.values];
  assert.equal((await resetLocalProgress('RESET', disk.learning, unhydrated)).success, false);
  assert.deepEqual([...disk.values], before);
  assert.equal(disk.learning.getState().onboardingComplete, true);
});
