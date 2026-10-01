import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, reduceCompleteLesson } from '../domain/progression';
import { initialAdventure } from '../game/state';
import { initialProfileQuests } from '../game/profile-quests';
import { SPARK_WALLET_STORAGE_KEY } from '../domain/spark-wallet';
import {
  parseDurableSparkEarnings,
  readDurableSparkEarnings,
  sparkEarningKeys,
} from './spark-wallet-earned';

const now = Date.parse('2026-09-30T12:00:00Z');
const empty = { learning: null, adventure: null, quests: null, practice: null };
test('a learner without saves has zero spendable earnings; no source is created', async () => {
  const keys: string[] = [];
  const earned = await readDurableSparkEarnings(
    {
      getItem: async (key) => {
        keys.push(key);
        return null;
      },
    },
    now,
  );
  assert.equal(earned, 0);
  assert.deepEqual(keys, [...Object.values(sparkEarningKeys), SPARK_WALLET_STORAGE_KEY]);
});
test('wallet reads verified first lesson XP from durable progress rather than an optimistic UI value', () => {
  const { state, result } = reduceCompleteLesson(
    { ...createInitialState(), onboardingComplete: true },
    'discover-1',
    {
      perfect: true,
      projectUpdates: {
        problem: 'People waste time checking several places for their next assignment deadline.',
      },
    },
    new Date(now),
  );
  assert.equal(result.success, true);
  const sources = {
    learning: JSON.stringify(state),
    adventure: JSON.stringify(initialAdventure()),
    quests: JSON.stringify(initialProfileQuests()),
    practice: JSON.stringify({ version: 1, histories: {}, proofs: {} }),
  };
  assert.equal(parseDurableSparkEarnings(sources, now), result.xpEarned);
  assert.equal(
    parseDurableSparkEarnings(
      {
        ...sources,
        practice: JSON.stringify({
          version: 1,
          proofs: { 'explore-last-time': { at: new Date(now).toISOString(), actions: [] } },
        }),
      },
      now,
    ),
    result.xpEarned,
  );
});
test('damaged or incompatible source saves fail closed without rewriting progress', () => {
  for (const field of Object.keys(empty) as (keyof typeof empty)[]) {
    assert.throws(() => parseDurableSparkEarnings({ ...empty, [field]: '{broken' }, now));
    assert.throws(() =>
      parseDurableSparkEarnings({ ...empty, [field]: JSON.stringify({ version: 99 }) }, now),
    );
  }
});
test('practice rewards need replayable real proof and cannot be granted by an arbitrary completed flag', () => {
  const forged = { version: 1, completed: { 'explore-last-time': '2026-09-30' }, proofs: {} };
  assert.equal(parseDurableSparkEarnings({ ...empty, practice: JSON.stringify(forged) }, now), 0);
});
