import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasUnlimitedShopSparks,
  initialSparkWallet,
  parseSparkWallet,
  reduceEquipWearable,
  reduceSparkSpend,
  skippedLessonIds,
  walletBalance,
  walletOwns,
  walletSpent,
  type SparkAccess,
  type SparkShopItem,
  type SparkSpendCommand,
} from './spark-wallet';

const now = Date.parse('2026-09-30T12:00:00Z');
const free: SparkAccess = {
  accountId: 'sam',
  configured: true,
  state: 'ready',
  entitled: false,
  expiresAt: null,
};
const pro: SparkAccess = { ...free, entitled: true, expiresAt: '2026-09-30T12:10:00Z' };
const catalog: SparkShopItem[] = [
  {
    id: 'maker-hoodie',
    targetId: 'maker-hoodie',
    kind: 'outfit',
    price: 25,
    name: 'Maker hoodie',
    description: 'A hoodie',
  },
  {
    id: 'trail-cap',
    targetId: 'trail-cap',
    kind: 'headwear',
    price: 30,
    name: 'Trail cap',
    description: 'A cap',
  },
  {
    id: 'bonus-map',
    targetId: 'bonus-map',
    kind: 'practice',
    price: 40,
    name: 'Map lab',
    description: 'Optional practice',
  },
  {
    id: 'skip:discover-1',
    targetId: 'discover-1',
    kind: 'skip',
    price: 50,
    name: 'Skip lesson',
    description: 'No completion reward',
  },
];
const command = (
  itemId = 'maker-hoodie',
  confirmedDebit = 25,
  transactionId = 'request-1',
): SparkSpendCommand => ({ transactionId, itemId, confirmed: true, confirmedDebit });
const spend = (itemId = 'maker-hoodie', cost = 25) =>
  reduceSparkSpend(initialSparkWallet(), catalog, 100, free, command(itemId, cost), now);

test('existing earned progress migrates to an empty wallet without copying or spending XP', () => {
  const wallet = parseSparkWallet(null);
  assert.equal(walletBalance(wallet, 445), 445);
  assert.equal(walletSpent(wallet), 0);
  assert.deepEqual(wallet.purchases, []);
});
test('free unlock spends earned currency and leaves the original XP and completion history untouched', () => {
  const progress = { xp: 100, completedLessonIds: ['discover-1'], earned: ['explore'] };
  const before = structuredClone(progress);
  const original = initialSparkWallet();
  const { wallet, result } = reduceSparkSpend(original, catalog, progress.xp, free, command(), now);
  assert.equal(result.code, 'purchased');
  assert.equal(result.spent, 25);
  assert.equal(walletBalance(wallet, progress.xp), 75);
  assert.equal(walletOwns(wallet, catalog[0]), true);
  assert.deepEqual(progress, before);
  assert.deepEqual(original.purchases, []);
});
test('duplicate transaction replays without charging and conflicting replay is rejected', () => {
  const first = spend();
  const replay = reduceSparkSpend(first.wallet, catalog, 100, free, command(), now);
  assert.equal(replay.result.code, 'replayed');
  assert.equal(replay.result.spent, 0);
  assert.equal(replay.wallet.purchases.length, 1);
  const conflict = reduceSparkSpend(
    first.wallet,
    catalog,
    100,
    free,
    command('trail-cap', 30),
    now,
  );
  assert.equal(conflict.result.success, false);
});
test('new request for an owned target also avoids charging', () => {
  const first = spend();
  const next = reduceSparkSpend(
    first.wallet,
    catalog,
    100,
    free,
    command('maker-hoodie', 25, 'request-2'),
    now,
  );
  assert.equal(next.result.code, 'owned');
  assert.equal(walletSpent(next.wallet), 25);
});
test('insufficient balance, NaN, fractional, and negative earnings never spend', () => {
  for (const earned of [24, -1, 25.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const { wallet, result } = reduceSparkSpend(
      initialSparkWallet(),
      catalog,
      earned,
      free,
      command(),
      now,
    );
    assert.equal(result.code, 'insufficient');
    assert.equal(wallet.purchases.length, 0);
  }
  assert.equal(walletBalance(spend().wallet, 5), 0);
});
test('cost confirmation is mandatory and stale/forged prices are rejected', () => {
  assert.equal(
    reduceSparkSpend(
      initialSparkWallet(),
      catalog,
      100,
      free,
      { ...command(), confirmed: false },
      now,
    ).result.code,
    'confirmation',
  );
  for (const cost of [0, 24, 26])
    assert.equal(
      reduceSparkSpend(initialSparkWallet(), catalog, 100, free, command('maker-hoodie', cost), now)
        .result.code,
      'quote-changed',
    );
});
test('only verified current signed-in Pro has unlimited spending; earned XP stays finite', () => {
  const result = reduceSparkSpend(
    initialSparkWallet(),
    catalog,
    0,
    pro,
    command('maker-hoodie', 0),
    now,
  );
  assert.equal(result.result.success, true);
  assert.equal(result.wallet.purchases[0].payment, 'pro');
  assert.equal(walletSpent(result.wallet), 0);
  assert.equal(walletBalance(result.wallet, 0), 0);
  for (const invalid of [
    { ...pro, accountId: null },
    { ...pro, accountId: ' ' },
    { ...pro, configured: false },
    { ...pro, state: 'unavailable' as const },
    { ...pro, expiresAt: new Date(now).toISOString() },
    { ...pro, expiresAt: 'broken' },
    { ...pro, entitled: false },
  ])
    assert.equal(hasUnlimitedShopSparks(invalid, now), false);
  assert.equal(hasUnlimitedShopSparks({ ...pro, expiresAt: null }, now), true);
});
test('expired Pro cannot silently spend the finite wallet under a zero-debit confirmation', () => {
  const { wallet, result } = reduceSparkSpend(
    initialSparkWallet(),
    catalog,
    100,
    pro,
    command('maker-hoodie', 0),
    now + 600_000,
  );
  assert.equal(result.code, 'quote-changed');
  assert.equal(walletSpent(wallet), 0);
  assert.equal(
    reduceSparkSpend(wallet, catalog, 100, pro, command(), now + 600_000).result.spent,
    25,
  );
});
test('skips are separate from completions and require explicit spend confirmation', () => {
  const skipped = spend('skip:discover-1', 50);
  assert.equal(skipped.result.success, true);
  assert.deepEqual(skippedLessonIds(skipped.wallet), ['discover-1']);
  assert.equal(skipped.wallet.purchases[0].kind, 'skip');
  assert.match(skipped.result.message, /No rewards/);
  assert.equal('completedLessonIds' in skipped.wallet, false);
  assert.equal('xp' in skipped.wallet, false);
});
test('outfit and headwear equip independently, persist, and reject unowned IDs', () => {
  const first = spend();
  const second = reduceSparkSpend(
    first.wallet,
    catalog,
    100,
    free,
    command('trail-cap', 30, 'request-2'),
    now,
  );
  let equipped = reduceEquipWearable(second.wallet, 'outfit', 'maker-hoodie').wallet;
  equipped = reduceEquipWearable(equipped, 'headwear', 'trail-cap').wallet;
  assert.deepEqual(parseSparkWallet(JSON.stringify(equipped)), equipped);
  assert.equal(reduceEquipWearable(equipped, 'outfit', 'missing').result.success, false);
  const restored = reduceEquipWearable(equipped, 'outfit', null).wallet;
  assert.equal(restored.equippedHeadwearId, 'trail-cap');
  assert.equal(restored.equippedOutfitId, null);
});
test('parser rejects damaged, future, duplicate, forged free-price, and unowned equipped data', () => {
  const valid = spend().wallet;
  const purchase = valid.purchases[0];
  const bad = [
    '{bad',
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, purchases: [purchase, purchase] }),
    JSON.stringify({ ...valid, purchases: [{ ...purchase, spent: -25 }] }),
    JSON.stringify({ ...valid, purchases: [{ ...purchase, spent: 0 }] }),
    JSON.stringify({ ...valid, purchases: [{ ...purchase, at: 'broken' }] }),
    JSON.stringify({ ...valid, equippedHeadwearId: 'trail-cap' }),
  ];
  for (const raw of bad) assert.throws(() => parseSparkWallet(raw));
});
test('historical purchases keep their original debit when catalog pricing changes', () => {
  const historical = spend().wallet;
  const repriced = catalog.map((item) => ({ ...item, price: item.price + 5 }));
  const restored = parseSparkWallet(JSON.stringify(historical));
  assert.equal(walletSpent(restored), 25);
  assert.equal(
    reduceSparkSpend(restored, repriced, 100, free, command('maker-hoodie', 30, 'new-request'), now)
      .result.code,
    'owned',
  );
});
