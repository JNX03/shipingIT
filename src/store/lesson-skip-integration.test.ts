import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons, getLesson } from '../data/curriculum';
import { createInitialState, getMissionProgress, parsePersistedState, reduceCompleteLesson } from '../domain/progression';
import { projectLessonAccess } from '../domain/lesson-access';
import { initialSparkWallet, SPARK_WALLET_STORAGE_KEY, type SparkWallet } from '../domain/spark-wallet';
import { projectFields } from '../domain/project';
import { createAppStore, STORAGE_KEY } from './createAppStore';
import { parseDurableSparkEarnings } from './spark-wallet-earned';

const now = new Date('2026-09-30T15:00:00Z');
const first = lessons[0]!.id;
const second = lessons[1]!.id;
const skipWallet: SparkWallet = {
  ...initialSparkWallet(),
  purchases: [{
    id: 'confirmed-first-skip', itemId: `skip:${first}`, kind: 'skip', targetId: first,
    price: 60, spent: 60, payment: 'earned', at: '2026-09-30T14:00:00Z',
  }],
};
const project = { ...createInitialState().project };
for (const field of projectFields)
  project[field] = 'Fictional practice: learners miss the latest deadline when updates are split.';

test('skip then actual completion survives a cold store without rewards for the skipped lesson', async () => {
  const values = new Map<string, string>([[SPARK_WALLET_STORAGE_KEY, JSON.stringify(skipWallet)]]);
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
  };
  const store = createAppStore(storage, () => now);
  await store.getState().hydrate();
  assert.deepEqual(store.getState().completedLessonIds, []);
  assert.equal(store.getState().xp, 0);
  const result = store.getState().completeLesson(second, { perfect: true, projectUpdates: project });
  assert.equal(result.success, true);
  assert.equal(result.xpEarned, getLesson(second)!.xp);
  await store.getState().flushPersistence();
  const raw = values.get(STORAGE_KEY)!;
  assert.equal(raw.includes('lessonSkipWallet'), false);
  assert.equal(raw.includes('passedLessonIds'), false);
  const cold = createAppStore(storage, () => now);
  await cold.getState().hydrate();
  assert.deepEqual(cold.getState().completedLessonIds, [second]);
  assert.equal(cold.getState().xp, getLesson(second)!.xp);
  assert.equal(cold.getState().recoveredState, false);
  assert.deepEqual(Object.keys(cold.getState().lessonCompletions), [second]);
  const access = projectLessonAccess(cold.getState().completedLessonIds, cold.getState().lessonSkipWallet, now.getTime());
  assert.equal(access.nextLesson?.id, lessons[2]!.id);
  const earned = parseDurableSparkEarnings({ learning: raw, wallet: JSON.stringify(skipWallet), adventure: null, quests: null, practice: null }, now.getTime());
  assert.equal(earned, getLesson(second)!.xp);
  assert.equal(cold.getState().completeLesson(second, { projectUpdates: project }).xpEarned, 0);
  const learned = cold.getState().completeLesson(first, { projectUpdates: project });
  assert.equal(learned.success, true);
  assert.equal(learned.xpEarned, getLesson(first)!.xp);
  assert.equal(cold.getState().xp, getLesson(first)!.xp + getLesson(second)!.xp);
});

test('a completion without its valid skipped prerequisite cannot become spendable earned XP', () => {
  const completed = reduceCompleteLesson(createInitialState(), second, { skipWallet, projectUpdates: project }, now);
  assert.equal(completed.result.success, true);
  const noWallet = parsePersistedState(JSON.stringify(completed.state), now);
  assert.equal(noWallet.recovered, true);
  assert.equal(noWallet.state.xp, 0);
  const invalidWallet = { ...skipWallet, purchases: [{ ...skipWallet.purchases[0]!, spent: 0 }] };
  assert.equal(reduceCompleteLesson(createInitialState(), second, { skipWallet: invalidWallet, projectUpdates: project }, now).result.success, false);
});

test('AppStore ignores caller-provided skip receipts and uses only its durable wallet', async () => {
  const store = createAppStore({ getItem: async () => null, setItem: async () => {} }, () => now);
  await store.getState().hydrate();
  assert.equal(store.getState().completeLesson(second, { skipWallet, projectUpdates: project }).success, false);
  assert.deepEqual(store.getState().completedLessonIds, []);
  assert.equal(store.getState().xp, 0);
});

test('skip receipts unlock the next mission without completing or rewarding the skipped mission', () => {
  const wallet = { ...initialSparkWallet(), purchases: lessons.slice(0, 4).map((lesson, index) => ({ ...skipWallet.purchases[0]!, id: `skip-${index}`, itemId: `skip:${lesson.id}`, targetId: lesson.id })) };
  const access = projectLessonAccess([], wallet, now.getTime());
  assert.equal(getMissionProgress(2, [], access.passedLessonIds).unlocked, true);
  const firstMission = getMissionProgress(1, [], access.passedLessonIds);
  assert.equal(firstMission.complete, false);
  assert.equal(firstMission.completed, 0);
  assert.equal(firstMission.percent, 0);
});

test('an unread wallet protects post-skip progress instead of normalizing away the real completion', async () => {
  const state = reduceCompleteLesson(createInitialState(), second, { skipWallet, projectUpdates: project }, now).state;
  const original = JSON.stringify(state);
  const writes: string[] = [];
  const store = createAppStore({
    getItem: async (key) => {
      if (key === SPARK_WALLET_STORAGE_KEY) throw new Error('unread wallet');
      return original;
    },
    setItem: async (_key, value) => { writes.push(value); },
  }, () => now);
  await store.getState().hydrate();
  assert.equal(store.getState().lessonAccessReady, false);
  assert.ok(store.getState().storageError);
  assert.equal(store.getState().completeLesson(second).success, false);
  store.getState().updateProject({ name: 'Session only' });
  await store.getState().flushPersistence();
  assert.deepEqual(writes, []);
});
