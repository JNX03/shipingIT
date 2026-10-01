import {
  initialSparkWallet,
  parseSparkWallet,
  reduceEquipWearable,
  reduceSparkSpend,
  reduceRedeemHearts,
  sparkWalletSnapshot,
  SPARK_WALLET_STORAGE_KEY,
  type SparkAccess,
  type SparkResult,
  type SparkShopItem,
  type SparkSpendCommand,
  type SparkWallet,
} from '../domain/spark-wallet';

export interface SparkWalletStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export type SparkWalletLock = <T>(operation: () => Promise<T>) => Promise<T>;
export interface SparkWalletDependencies {
  storage: SparkWalletStorage;
  getCatalog: () => readonly SparkShopItem[];
  getEarnedSparks: () => Promise<number>;
  getAccess: () => Promise<SparkAccess>;
  getAccountId: () => Promise<string | null>;
  /** Web uses an origin-wide Web Lock; native uses a shared in-process queue. */
  withLock?: SparkWalletLock;
  clock?: () => number;
}
export interface SparkWalletView {
  wallet: SparkWallet;
  hydrated: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}
const queues = new WeakMap<SparkWalletStorage, Promise<unknown>>();
export function storageWalletLock(storage: SparkWalletStorage): SparkWalletLock {
  return <T>(operation: () => Promise<T>) => {
    const running = (queues.get(storage) ?? Promise.resolve())
      .catch(() => undefined)
      .then(operation);
    queues.set(storage, running);
    return running;
  };
}
const failure = (code: SparkResult['code'], message: string): SparkResult => ({
  success: false,
  code,
  message,
  spent: 0,
});

/** No optimistic debit/unlock: consumers see success only after the entire ledger is durable. */
export function createSparkWalletStore(deps: SparkWalletDependencies) {
  const clock = deps.clock ?? Date.now;
  const lock = deps.withLock ?? storageWalletLock(deps.storage);
  let snapshot: SparkWalletView = {
    wallet: initialSparkWallet(),
    hydrated: false,
    loading: false,
    saving: false,
    error: null,
  };
  let refreshInFlight: Promise<void> | null = null;
  let actionInFlight = false;
  const listeners = new Set<() => void>();
  function publish(partial: Partial<SparkWalletView>) {
    snapshot = { ...snapshot, ...partial };
    listeners.forEach((listener) => listener());
  }
  async function read() {
    return parseSparkWallet(await deps.storage.getItem(SPARK_WALLET_STORAGE_KEY));
  }
  async function refresh() {
    if (refreshInFlight) return refreshInFlight;
    publish({ loading: true });
    refreshInFlight = lock(async () => {
      try {
        const wallet = await read();
        publish({ wallet, hydrated: true, error: null });
      } catch {
        // Never replace an unread/damaged save with an empty ledger: that would restore spent coins.
        publish({
          error:
            'Your Sparks wallet could not be read. Retry loading; your saved wallet has been kept.',
        });
      }
    })
      .catch(() => {
        publish({
          error:
            'Wallet saving is unavailable in this browser. Open the app in a secure browser to continue.',
        });
      })
      .finally(() => {
        publish({ loading: false });
        refreshInFlight = null;
      });
    return refreshInFlight;
  }
  async function mutate(
    action: (wallet: SparkWallet) => Promise<{ wallet: SparkWallet; result: SparkResult }>,
  ) {
    if (actionInFlight) return failure('busy', 'An unlock is already being saved.');
    actionInFlight = true;
    publish({ saving: true, error: null });
    try {
      return await lock(async () => {
        let wallet: SparkWallet;
        try {
          wallet = await read();
        } catch {
          const result = failure(
            'storage',
            'Your wallet could not be read. No Sparks were spent. Retry loading.',
          );
          publish({ error: result.message });
          return result;
        }
        const next = await action(wallet);
        if (!next.result.success || next.wallet === wallet) {
          publish({ wallet, hydrated: true });
          return next.result;
        }
        try {
          await deps.storage.setItem(
            SPARK_WALLET_STORAGE_KEY,
            JSON.stringify(sparkWalletSnapshot(next.wallet)),
          );
        } catch {
          const result = failure(
            'storage',
            'This unlock could not be confirmed. Reload the wallet before retrying.',
          );
          publish({ wallet, hydrated: true, error: result.message });
          return result;
        }
        publish({ wallet: next.wallet, hydrated: true, error: null });
        return next.result;
      });
    } catch {
      const result = failure(
        'storage',
        'Shop access could not be checked. No Sparks were spent. Please retry.',
      );
      publish({ error: result.message });
      return result;
    } finally {
      actionInFlight = false;
      publish({ saving: false });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    spend: (command: SparkSpendCommand): Promise<SparkResult> =>
      mutate(async (wallet) => {
        const accountBefore = await deps.getAccountId();
        const access = await deps.getAccess();
        const earned = await deps.getEarnedSparks();
        const accountAfter = await deps.getAccountId();
        if (accountBefore !== accountAfter || access.accountId !== accountAfter)
          return {
            wallet,
            result: failure(
              'account-changed',
              'Your account changed. Review the item again before unlocking.',
            ),
          };
        return reduceSparkSpend(wallet, deps.getCatalog(), earned, access, command, clock());
      }),
    equip: (kind: 'outfit' | 'headwear', targetId: string | null): Promise<SparkResult> =>
      mutate(async (wallet) => reduceEquipWearable(wallet, kind, targetId)),
    redeemHearts: (command: { id: string; attemptId: string; hearts: number }): Promise<SparkResult> =>
      mutate(async (wallet) => {
        const account = await deps.getAccountId();
        if (!account || account !== await deps.getAccountId()) return { wallet, result: failure('account-changed', 'Sign in again before using your saved hearts.') };
        return reduceRedeemHearts(wallet, command, clock());
      }),
  };
}
