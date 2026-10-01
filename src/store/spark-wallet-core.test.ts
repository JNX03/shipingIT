import assert from 'node:assert/strict';
import test from 'node:test';
import { createSparkWalletStore } from './spark-wallet-core';
import {
  parseSparkWallet,
  walletSpent,
  type SparkAccess,
  type SparkShopItem,
  type SparkSpendCommand,
} from '../domain/spark-wallet';

const time = Date.parse('2026-09-30T12:00:00Z');
const catalog: SparkShopItem[] = [
  {
    id: 'hoodie',
    targetId: 'hoodie',
    kind: 'outfit',
    price: 25,
    name: 'Hoodie',
    description: 'Hoodie',
  },
  { id: 'cap', targetId: 'cap', kind: 'headwear', price: 30, name: 'Cap', description: 'Cap' },
];
const command = (
  itemId = 'hoodie',
  confirmedDebit = 25,
  transactionId = 'request-1',
): SparkSpendCommand => ({ transactionId, itemId, confirmed: true, confirmedDebit });
function fixture(raw: string | null = null) {
  let disk = raw;
  let writeFails = false;
  let readFails = false;
  let account: string | null = 'sam';
  let earned = 55;
  let access: SparkAccess = {
    accountId: account,
    configured: true,
    state: 'ready',
    entitled: false,
    expiresAt: null,
  };
  let now = time;
  const writes: string[] = [];
  const storage = {
    getItem: async () => {
      if (readFails) throw new Error('disk read');
      return disk;
    },
    setItem: async (_key: string, value: string) => {
      if (writeFails) throw new Error('disk write');
      disk = value;
      writes.push(value);
    },
  };
  const deps = {
    storage,
    getCatalog: () => catalog,
    getEarnedSparks: async () => earned,
    getAccess: async () => access,
    getAccountId: async () => account,
    clock: () => now,
  };
  return {
    deps,
    writes,
    read: () => disk,
    store: createSparkWalletStore(deps),
    failWrites: (fail: boolean) => {
      writeFails = fail;
    },
    failReads: (fail: boolean) => {
      readFails = fail;
    },
    setAccount: (id: string | null) => {
      account = id;
    },
    setAccess: (value: SparkAccess) => {
      access = value;
    },
    setEarned: (value: number) => {
      earned = value;
    },
    setTime: (value: number) => {
      now = value;
    },
  };
}
test('unlock and separately equipped selections survive creating another store', async () => {
  const f = fixture();
  await f.store.refresh();
  assert.equal((await f.store.spend(command())).success, true);
  assert.equal((await f.store.equip('outfit', 'hoodie')).success, true);
  const fresh = createSparkWalletStore(f.deps);
  await fresh.refresh();
  assert.equal(fresh.getSnapshot().wallet.equippedOutfitId, 'hoodie');
  assert.equal(walletSpent(fresh.getSnapshot().wallet), 25);
});
test('double tap is bounded to one durable transaction, then replay succeeds without another charge', async () => {
  const f = fixture();
  const outcomes = await Promise.all([f.store.spend(command()), f.store.spend(command())]);
  assert.equal(outcomes.filter((result) => result.code === 'purchased').length, 1);
  assert.equal(f.writes.length, 1);
  assert.equal((await f.store.spend(command())).code, 'replayed');
  assert.equal(f.writes.length, 1);
});
test('two independent stores share the disk lock and reread latest spending before purchase', async () => {
  const f = fixture();
  f.setEarned(30);
  const other = createSparkWalletStore(f.deps);
  const outcomes = await Promise.all([
    f.store.spend(command()),
    other.spend(command('cap', 30, 'request-2')),
  ]);
  assert.equal(outcomes.filter((result) => result.success).length, 1);
  assert.equal(outcomes.filter((result) => result.code === 'insufficient').length, 1);
  assert.equal(parseSparkWallet(f.read()).purchases.length, 1);
});
test('failed save gives no optimistic unlock and retry preserves the same request', async () => {
  const f = fixture();
  f.failWrites(true);
  assert.equal((await f.store.spend(command())).code, 'storage');
  assert.equal(f.store.getSnapshot().wallet.purchases.length, 0);
  assert.equal(f.read(), null);
  f.failWrites(false);
  assert.equal((await f.store.spend(command())).success, true);
  assert.equal(walletSpent(f.store.getSnapshot().wallet), 25);
});
test('corrupt/future/read-failed data cannot be overwritten with a new empty wallet', async () => {
  for (const raw of ['{broken', '{"version":99}']) {
    const f = fixture(raw);
    await f.store.refresh();
    assert.equal(f.store.getSnapshot().hydrated, false);
    assert.equal((await f.store.spend(command())).success, false);
    assert.equal(f.read(), raw);
    assert.equal(f.writes.length, 0);
  }
  const f = fixture();
  f.failReads(true);
  await f.store.refresh();
  assert.equal((await f.store.spend(command())).code, 'storage');
  f.failReads(false);
  await f.store.refresh();
  assert.equal(f.store.getSnapshot().hydrated, true);
});
test('stale UI wallet refresh never replaces newer spending from a second store', async () => {
  const f = fixture();
  await f.store.refresh();
  const other = createSparkWalletStore(f.deps);
  await other.spend(command());
  await f.store.spend(command('cap', 30, 'request-2'));
  assert.equal(walletSpent(parseSparkWallet(f.read())), 55);
  assert.equal(f.store.getSnapshot().wallet.purchases.length, 2);
});
test('Pro is fetched at each spend and expiry during awaited earnings prevents a zero-debit unlock', async () => {
  const f = fixture();
  const pro: SparkAccess = {
    accountId: 'sam',
    configured: true,
    state: 'ready',
    entitled: true,
    expiresAt: new Date(time + 100).toISOString(),
  };
  f.setAccess(pro);
  const expiryDeps = {
    ...f.deps,
    getEarnedSparks: async () => {
      f.setTime(time + 100);
      return 55;
    },
  };
  const store = createSparkWalletStore(expiryDeps);
  assert.equal((await store.spend(command('hoodie', 0))).code, 'quote-changed');
  assert.equal(f.writes.length, 0);
  assert.equal((await store.spend(command())).spent, 25);
});
test('account switching during provider/earned read fails without charging', async () => {
  const f = fixture();
  const store = createSparkWalletStore({
    ...f.deps,
    getEarnedSparks: async () => {
      f.setAccount('new-user');
      return 55;
    },
  });
  assert.equal((await store.spend(command())).code, 'account-changed');
  assert.equal(f.writes.length, 0);
});
test('sign-out removes unlimited shop spending and requires confirming the finite cost again', async () => {
  const f = fixture();
  f.setAccount(null);
  f.setAccess({
    accountId: null,
    configured: true,
    state: 'ready',
    entitled: true,
    expiresAt: null,
  });
  assert.equal((await f.store.spend(command('hoodie', 0))).code, 'quote-changed');
  assert.equal((await f.store.spend(command())).spent, 25);
});
test('unsupported web lock fails closed and can be retried without losing the saved wallet', async () => {
  const f = fixture();
  const store = createSparkWalletStore({
    ...f.deps,
    withLock: async () => {
      throw new Error('unsupported');
    },
  });
  await store.refresh();
  assert.equal(store.getSnapshot().loading, false);
  assert.ok(store.getSnapshot().error);
  assert.equal((await store.spend(command())).success, false);
  assert.equal(f.writes.length, 0);
});
