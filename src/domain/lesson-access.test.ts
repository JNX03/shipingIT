import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons } from '../data/curriculum';
import { getLessonAccessState, LESSON_SKIP_COST, projectLessonAccess } from './lesson-access';
import {
  initialSparkWallet,
  parseSparkWallet,
  reduceSparkSpend,
  type SparkPurchase,
  type SparkWallet,
} from './spark-wallet';

const now = Date.parse('2026-09-30T15:00:00Z');
const first = lessons[0]!.id;
const second = lessons[1]!.id;
const third = lessons[2]!.id;
const receipt = (targetId = first, patch: Partial<SparkPurchase> = {}): SparkPurchase => ({
  id: `request-${targetId}`,
  itemId: `skip:${targetId}`,
  kind: 'skip',
  targetId,
  price: LESSON_SKIP_COST,
  spent: LESSON_SKIP_COST,
  payment: 'earned',
  at: '2026-09-30T14:00:00Z',
  ...patch,
});
const wallet = (...purchases: SparkPurchase[]): SparkWallet => ({
  ...initialSparkWallet(),
  purchases,
});

test('an empty wallet exposes only the first core lesson', () => {
  const projection = projectLessonAccess([], wallet(), now);
  assert.deepEqual(projection.passedLessonIds, []);
  assert.deepEqual(projection.unlockedLessonIds, [first]);
  assert.equal(projection.nextLesson?.id, first);
  assert.equal(getLessonAccessState(second, [], projection), 'locked');
});

test('a purchased skip opens the next lesson without creating completion or rewards', () => {
  const progress = { xp: 125, completedLessonIds: [] as string[], achievements: ['existing'] };
  const savedWallet = wallet(receipt());
  const before = structuredClone({ progress, savedWallet });
  const projection = projectLessonAccess(progress.completedLessonIds, savedWallet, now);
  assert.deepEqual(projection.passedLessonIds, [first]);
  assert.deepEqual(projection.skippedLessonIds, [first]);
  assert.equal(projection.nextLesson?.id, second);
  assert.equal(getLessonAccessState(first, [], projection), 'available');
  assert.equal(getLessonAccessState(second, [], projection), 'current');
  assert.deepEqual({ progress, savedWallet }, before);
  assert.equal('xp' in projection, false);
  assert.equal('completedLessonIds' in projection, false);
});

test('an explicitly confirmed 60-Spark skip survives a cold wallet read and advances access once', () => {
  const { wallet: saved, result } = reduceSparkSpend(
    wallet(),
    [
      {
        id: `skip:${first}`,
        targetId: first,
        kind: 'skip',
        price: LESSON_SKIP_COST,
        name: 'Skip lesson',
        description: 'No rewards',
      },
    ],
    60,
    { accountId: 'learner', configured: true, state: 'ready', entitled: false, expiresAt: null },
    {
      transactionId: 'confirmed-skip',
      itemId: `skip:${first}`,
      confirmed: true,
      confirmedDebit: 60,
    },
    now,
  );
  assert.equal(result.success, true);
  assert.equal(result.spent, 60);
  const cold = parseSparkWallet(JSON.stringify(saved));
  const projection = projectLessonAccess([], cold, now);
  assert.equal(projection.nextLesson?.id, second);
  assert.deepEqual(projection.skippedLessonIds, [first]);
  assert.equal(getLessonAccessState(first, [], projection), 'available');
});

test('real completions after a skip pass prerequisites and keep completion state accurate', () => {
  const projection = projectLessonAccess([second], wallet(receipt()), now);
  assert.deepEqual(projection.passedLessonIds, [first, second]);
  assert.equal(projection.nextLesson?.id, third);
  assert.equal(getLessonAccessState(second, [second], projection), 'completed');
  assert.equal(
    getLessonAccessState(second, [second], projection, {
      [second]: { perfect: true, completedAt: '2026-09-30' },
    }),
    'mastered',
  );
});

test('finishing a previously skipped lesson replaces its skipped presentation, not its receipt', () => {
  const savedWallet = wallet(receipt());
  const projection = projectLessonAccess([first], savedWallet, now);
  assert.deepEqual(projection.skippedLessonIds, []);
  assert.equal(getLessonAccessState(first, [first], projection), 'completed');
  assert.equal(savedWallet.purchases.length, 1);
});

test('an out-of-order skip cannot open an arbitrary later lesson or pass an earlier gap', () => {
  const projection = projectLessonAccess([], wallet(receipt(third)), now);
  assert.deepEqual(projection.passedLessonIds, []);
  assert.deepEqual(projection.skippedLessonIds, []);
  assert.equal(projection.nextLesson?.id, first);
  assert.equal(getLessonAccessState(third, [], projection), 'locked');
});

test('consecutive valid skips and real completions form one prerequisite prefix', () => {
  const projection = projectLessonAccess([third], wallet(receipt(second), receipt(first)), now);
  assert.deepEqual(projection.passedLessonIds, [first, second, third]);
  assert.deepEqual(projection.skippedLessonIds, [first, second]);
  assert.equal(projection.nextLesson?.id, lessons[3]!.id);
});

test('only exact paid receipts are accepted; unknown, wrong-kind and future receipts fail closed', () => {
  const invalid: Partial<SparkPurchase>[] = [
    { itemId: `skip:${second}` },
    { targetId: 'made-up', itemId: 'skip:made-up' },
    { kind: 'practice' },
    { price: 1, spent: 1 },
    { spent: 0 },
    { payment: 'pro', spent: 60 },
    { at: 'not-a-date' },
    { at: '2026-10-01T00:00:00Z' },
    { id: '' },
  ];
  for (const patch of invalid) {
    const projection = projectLessonAccess([], wallet(receipt(first, patch)), now);
    assert.deepEqual(projection.skippedLessonIds, [], JSON.stringify(patch));
    assert.equal(projection.nextLesson?.id, first);
  }
});

test('verified historical Pro skip receipts remain usable after membership expires', () => {
  const projection = projectLessonAccess(
    [],
    wallet(receipt(first, { payment: 'pro', spent: 0 })),
    now,
  );
  assert.deepEqual(projection.skippedLessonIds, [first]);
});

test('duplicate transaction IDs or skip targets are rejected rather than opening more lessons', () => {
  for (const savedWallet of [
    wallet(receipt(first), receipt(second, { id: `request-${first}` })),
    wallet(receipt(first), receipt(first, { id: 'another-request' })),
  ]) {
    const projection = projectLessonAccess([], savedWallet, now);
    assert.deepEqual(projection.skippedLessonIds, []);
    assert.equal(projection.nextLesson?.id, first);
  }
});

test('an invalid clock rejects skip receipts and a completed course has no next lesson', () => {
  assert.deepEqual(projectLessonAccess([], wallet(receipt()), NaN).skippedLessonIds, []);
  const completed = lessons.map((lesson) => lesson.id);
  const projection = projectLessonAccess(completed, wallet(), now);
  assert.equal(projection.nextLesson, undefined);
  assert.deepEqual(projection.unlockedLessonIds, completed);
  assert.equal(getLessonAccessState('pro-unit1', completed, projection), 'locked');
});
