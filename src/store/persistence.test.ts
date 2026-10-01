import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppStore, STORAGE_KEY } from './createAppStore';
import type { LocalStorageAdapter } from './createAppStore';

function memoryStorage(initial: string | null = null) {
  let saved = initial;
  const writes: string[] = [];
  const storage: LocalStorageAdapter = {
    getItem: async (key) => key === STORAGE_KEY ? saved : null,
    setItem: async (key, value) => {
      assert.equal(key, STORAGE_KEY);
      writes.push(value);
      saved = value;
    },
  };
  return { storage, writes, read: () => saved, write: (value: string) => { saved = value; } };
}

test('onboarding, project, settings and completed lesson survive a new store instance', async () => {
  const disk = memoryStorage();
  const first = createAppStore(disk.storage, () => new Date(2026, 8, 29));
  assert.equal(first.getState().hydrated, false);
  await first.getState().hydrate();
  first.getState().completeOnboarding({ name: 'Sam', dailyGoal: 2, world: 'environment' });
  first.getState().updateProject({
    problem: 'People waste time checking several places for the current assignment deadline.',
  });
  first.getState().updateSettings({ haptics: false });
  assert.equal(first.getState().completeLesson('discover-1', { perfect: true }).success, true);
  await first.getState().flushPersistence();
  const next = createAppStore(disk.storage, () => new Date(2026, 8, 29));
  await next.getState().hydrate();
  assert.equal(next.getState().onboardingComplete, true);
  assert.equal(next.getState().profile.name, 'Sam');
  assert.equal(next.getState().profile.dailyGoal, 2);
  assert.equal(next.getState().settings.haptics, false);
  assert.equal(next.getState().project.problem, first.getState().project.problem);
  assert.equal(next.getState().xp, 20);
  assert.deepEqual(next.getState().activityLog, { '2026-09-29': ['discover-1'] });
  assert.deepEqual(next.getState().completedLessonIds, ['discover-1']);
});

test('serialized writes keep the newest edit and preserve unrelated fields', async () => {
  const disk = memoryStorage();
  const store = createAppStore(disk.storage);
  await store.getState().hydrate();
  store.getState().updateProject({ name: 'First', problem: 'A problem we want to understand.' });
  store.getState().updateProject({ name: 'Second' });
  store.getState().updateProject({ name: 'Newest' });
  await store.getState().flushPersistence();
  const saved = JSON.parse(disk.read()!) as { project: { name: string; problem: string } };
  assert.equal(saved.project.name, 'Newest');
  assert.equal(saved.project.problem, 'A problem we want to understand.');
  assert.equal(disk.writes.length, 3);
  assert.equal(store.getState().xp, 0);
  assert.deepEqual(store.getState().completedLessonIds, []);
});

test('a stale store can refresh a completion saved by another tab', async () => {
  const disk = memoryStorage();
  const stale = createAppStore(disk.storage, () => new Date(2026, 8, 29));
  await stale.getState().hydrate();
  assert.equal(stale.getState().xp, 0);
  disk.write(JSON.stringify({
    schemaVersion: 1,
    onboardingComplete: true,
    profile: stale.getState().profile,
    settings: stale.getState().settings,
    project: stale.getState().project,
    completedLessonIds: ['discover-1'],
    xp: 20,
    activityDates: ['2026-09-29'],
    achievements: [],
    lessonCompletions: { 'discover-1': { completedAt: '2026-09-29', perfect: false } },
    activityLog: { '2026-09-29': ['discover-1'] },
  }));

  await stale.getState().refreshFromStorage();

  assert.deepEqual(stale.getState().completedLessonIds, ['discover-1']);
  assert.equal(stale.getState().xp, 20);
  assert.equal(stale.getState().storageError, null);
});

test('storage failures are visible and leave in-memory work intact', async () => {
  let fail = true;
  const store = createAppStore({
    getItem: async () => null,
    setItem: async () => {
      if (fail) throw new Error('disk full');
    },
  });
  await store.getState().hydrate();
  store.getState().updateProject({ name: 'Keep this work' });
  await store.getState().flushPersistence();
  assert.equal(store.getState().project.name, 'Keep this work');
  assert.match(store.getState().storageError!, /could not save/);
  fail = false;
  await store.getState().retryPersistence();
  assert.equal(store.getState().storageError, null);
});

test('failed reads never overwrite unread progress, and malformed JSON recovers', async () => {
  let writes = 0;
  const failed = createAppStore({
    getItem: async () => {
      throw new Error('unavailable');
    },
    setItem: async () => {
      writes++;
    },
  });
  await failed.getState().hydrate();
  failed.getState().updateProject({ name: 'Session work' });
  await failed.getState().flushPersistence();
  assert.equal(writes, 0);
  assert.equal(failed.getState().project.name, 'Session work');
  assert.ok(failed.getState().storageError);
  const malformed = createAppStore(memoryStorage('broken JSON').storage);
  await malformed.getState().hydrate();
  assert.equal(malformed.getState().hydrated, true);
  assert.equal(malformed.getState().recoveredState, true);
  assert.equal(malformed.getState().xp, 0);
});

test('unhydrated actions cannot overwrite an unread save, and reset persists', async () => {
  const disk = memoryStorage();
  const store = createAppStore(disk.storage);
  store.getState().updateProject({ name: 'Too early' });
  assert.equal(store.getState().project.name, '');
  assert.equal(store.getState().completeLesson('discover-1').success, false);
  assert.equal(disk.writes.length, 0);
  await store.getState().hydrate();
  store.getState().completeOnboarding({ name: 'Sam' });
  store.getState().updateProject({ name: 'Temporary' });
  store.getState().resetProgress();
  await store.getState().flushPersistence();
  const next = createAppStore(disk.storage);
  await next.getState().hydrate();
  assert.equal(next.getState().project.name, '');
  assert.equal(next.getState().onboardingComplete, false);
});

test('flush drains a newer write queued while an older write is still pending', async () => {
  const releases: (() => void)[] = [];
  let saved = '';
  const store = createAppStore({
    getItem: async () => null,
    setItem: (_key, value) =>
      new Promise<void>((resolve) => {
        releases.push(() => {
          saved = value;
          resolve();
        });
      }),
  });
  await store.getState().hydrate();
  store.getState().updateProject({ name: 'First' });
  let finished = false;
  const flush = store
    .getState()
    .flushPersistence()
    .then(() => {
      finished = true;
    });
  await new Promise((resolve) => setImmediate(resolve));
  store.getState().updateProject({ name: 'Newest' });
  releases[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(finished, false);
  releases[1]();
  await flush;
  assert.equal(JSON.parse(saved).project.name, 'Newest');
});

test('only explicit reset can replace a save after a failed storage read', async () => {
  const writes: string[] = [];
  const store = createAppStore({
    getItem: async () => {
      throw new Error('unavailable');
    },
    setItem: async (_key, value) => {
      writes.push(value);
    },
  });
  await store.getState().hydrate();
  store.getState().updateProject({ name: 'Session changes' });
  await store.getState().retryPersistence();
  assert.equal(writes.length, 0);
  store.getState().resetProgress();
  await store.getState().flushPersistence();
  assert.equal(writes.length, 1);
  assert.equal(JSON.parse(writes[0]).project.name, '');
  assert.equal(store.getState().storageError, null);
});
