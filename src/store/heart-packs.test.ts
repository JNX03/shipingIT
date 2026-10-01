import assert from 'node:assert/strict';
import test from 'node:test';
import { createSparkWalletStore } from './spark-wallet-core';
import { heartCredits, HEART_PACK_ITEM, parseSparkWallet, walletSpent, type SparkAccess } from '../domain/spark-wallet';

const now = Date.parse('2026-10-01T18:00:00Z');
function fixture() {
  let raw: string | null = null;
  let fail = false;
  let time = now;
  let access: SparkAccess = { accountId: 'sam', configured: true, state: 'ready', entitled: false, expiresAt: null };
  const deps = {
    storage: { getItem: async () => raw, setItem: async (_key: string, value: string) => { if (fail) throw new Error('disk full'); raw = value; } },
    getCatalog: () => [HEART_PACK_ITEM], getEarnedSparks: async () => 100,
    getAccountId: async () => 'sam', getAccess: async () => access, clock: () => time,
  };
  const store = createSparkWalletStore(deps);
  const buy = (transactionId = 'pack-1', confirmedDebit = 20) => ({ transactionId, itemId: HEART_PACK_ITEM.id, confirmed: true, confirmedDebit });
  return { store, deps, buy, raw: () => raw, fail: (value: boolean) => { fail = value; }, pro: () => { access = { ...access, entitled: true, expiresAt: new Date(now + 1000).toISOString() }; }, expire: () => { time = now + 2000; } };
}

test('20 Sparks buy five durable hearts once; purchase replay and cold reads cannot double the pack', async () => {
  const f = fixture();
  const result = await Promise.all([f.store.spend(f.buy()), f.store.spend(f.buy())]);
  assert.equal(result.filter((item) => item.code === 'purchased').length, 1);
  assert.equal((await f.store.spend(f.buy())).code, 'replayed');
  const cold = createSparkWalletStore(f.deps);
  await cold.refresh();
  assert.equal(heartCredits(cold.getSnapshot().wallet), 5);
  assert.equal(walletSpent(cold.getSnapshot().wallet), 20);
  assert.equal('xp' in cold.getSnapshot().wallet, false);
});
test('partial and multiple packs retain unused hearts, and redemption replays grant no second refill', async () => {
  const f = fixture();
  await f.store.spend(f.buy());
  await f.store.spend(f.buy('pack-2'));
  const request = { id: 'refill-1', attemptId: 'lesson-attempt', hearts: 3 };
  const outcomes = await Promise.all([f.store.redeemHearts(request), f.store.redeemHearts(request)]);
  assert.equal(outcomes.filter((item) => item.heartsAdded === 3).length, 1);
  assert.equal((await f.store.redeemHearts(request)).heartsAdded, 0);
  assert.equal((await f.store.redeemHearts({ ...request, hearts: 5 })).success, false);
  assert.equal(heartCredits(parseSparkWallet(f.raw())), 7);
  assert.equal((await f.store.redeemHearts({ id: 'refill-2', attemptId: 'second-attempt', hearts: 5 })).heartsAdded, 5);
  assert.equal(heartCredits(parseSparkWallet(f.raw())), 2);
  assert.equal(walletSpent(parseSparkWallet(f.raw())), 40);
});
test('purchase and redemption failures give no optimistic credits or refill and retry the same nonce safely', async () => {
  const f = fixture();
  f.fail(true);
  assert.equal((await f.store.spend(f.buy())).success, false);
  assert.equal(heartCredits(f.store.getSnapshot().wallet), 0);
  f.fail(false);
  await f.store.spend(f.buy());
  const request = { id: 'refill', attemptId: 'attempt', hearts: 5 };
  f.fail(true);
  assert.equal((await f.store.redeemHearts(request)).success, false);
  assert.equal(heartCredits(parseSparkWallet(f.raw())), 5);
  f.fail(false);
  assert.equal((await f.store.redeemHearts(request)).heartsAdded, 5);
});
test('expired Pro cannot convert a zero-Spark heart quote into a finite debit without new confirmation', async () => {
  const f = fixture();
  f.pro();
  f.expire();
  assert.equal((await f.store.spend(f.buy('pack', 0))).code, 'quote-changed');
  assert.equal(f.raw(), null);
  assert.equal((await f.store.spend(f.buy('pack', 20))).success, true);
  assert.equal(walletSpent(parseSparkWallet(f.raw())), 20);
});
test('invalid or overdrawn redemption records are rejected on cold load', () => {
  assert.throws(() => parseSparkWallet(JSON.stringify({ version: 1, purchases: [], equippedOutfitId: null, equippedHeadwearId: null, heartRedemptions: [{ id: 'r', attemptId: 'a', hearts: 5, at: new Date(now).toISOString() }] })));
});
