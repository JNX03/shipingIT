import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { lessons } from '../data/curriculum';
import { wardrobeCatalog } from '../game/wardrobe-catalog';
import { authProvider } from '../services/auth';
import { subscriptionService } from '../services/purchases';
import {
  hasUnlimitedShopSparks,
  HEART_PACK_ITEM,
  SPARK_WALLET_STORAGE_KEY,
  type SparkAccess,
  type SparkShopItem,
} from '../domain/spark-wallet';
import {
  createSparkWalletStore,
  storageWalletLock,
  type SparkWalletLock,
} from './spark-wallet-core';
import { readDurableSparkEarnings, sparkEarningKeys } from './spark-wallet-earned';

export const LESSON_SKIP_SPARK_PRICE = 60;
export const sparkShopCatalog: readonly SparkShopItem[] = [
  HEART_PACK_ITEM,
  ...wardrobeCatalog.map((item): SparkShopItem => ({
    id: item.id,
    targetId: item.id,
    kind: item.slot,
    price: item.price,
    name: item.name,
    description: item.description,
  })),
  ...lessons.map((lesson): SparkShopItem => ({
    id: `skip:${lesson.id}`,
    targetId: lesson.id,
    kind: 'skip',
    price: LESSON_SKIP_SPARK_PRICE,
    name: `Skip ${lesson.title}`,
    description: 'Move past this lesson without earning its Sparks. Return to learn it anytime.',
  })),
];

export async function getSparkShopAccess(): Promise<SparkAccess> {
  const before = await authProvider.getStatus();
  const status = await subscriptionService.getStatus();
  const after = await authProvider.getStatus();
  const unchanged = before.identity?.id === after.identity?.id;
  return {
    accountId: after.identity?.id ?? null,
    configured: unchanged && after.configured && after.mode === 'cloud' && status.configured,
    state: unchanged ? status.state : 'unavailable',
    entitled: unchanged && status.entitled,
    expiresAt: status.expiresAt,
  };
}
const nativeLock = storageWalletLock(AsyncStorage);
const withWalletLock: SparkWalletLock = (operation) => {
  if (Platform.OS !== 'web') return nativeLock(operation);
  if (typeof navigator === 'undefined' || !navigator.locks)
    return Promise.reject(new Error('Origin-wide wallet locking is unavailable'));
  return navigator.locks.request('shipingit:spark-wallet:transactions', operation);
};
export const sparkWalletStore = createSparkWalletStore({
  storage: AsyncStorage,
  getCatalog: () => sparkShopCatalog,
  getEarnedSparks: () => readDurableSparkEarnings(AsyncStorage),
  getAccess: getSparkShopAccess,
  getAccountId: async () => (await authProvider.getStatus()).identity?.id ?? null,
  withLock: withWalletLock,
});

/** Lightweight avatar integration: saved selections only, with no entitlement/provider requests. */
export function useSavedSparkWallet() {
  const view = useSyncExternalStore(
    sparkWalletStore.subscribe,
    sparkWalletStore.getSnapshot,
    sparkWalletStore.getSnapshot,
  );
  useEffect(() => {
    if (!sparkWalletStore.getSnapshot().hydrated) void sparkWalletStore.refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === SPARK_WALLET_STORAGE_KEY || event.key === null)
        void sparkWalletStore.refresh();
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined')
      window.addEventListener('storage', onStorage);
    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined')
        window.removeEventListener('storage', onStorage);
    };
  }, []);
  return view;
}

/** A read-only projection; no hydration or wallet read can write to progress sources. */
export function useSparkWallet() {
  const view = useSavedSparkWallet();
  const [access, setAccess] = useState<SparkAccess | null>(null);
  const [earnedSparks, setEarnedSparks] = useState<number | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [clock, setClock] = useState(() => Date.now());
  const active = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const generation = ++request.current;
    setAccessLoading(true);
    setAccess(null);
    try {
      const [nextAccess, earned] = await Promise.all([
        getSparkShopAccess(),
        readDurableSparkEarnings(AsyncStorage),
        sparkWalletStore.refresh(),
      ]);
      if (active.current && generation === request.current) {
        setAccess(nextAccess);
        setEarnedSparks(earned);
        setAccessError(null);
        setClock(Date.now());
      }
    } catch {
      if (active.current && generation === request.current) {
        setAccess(null);
        setEarnedSparks(null);
        setAccessError(
          'Your saved Sparks could not be checked. Retry after your progress has saved.',
        );
      }
    } finally {
      if (active.current && generation === request.current) setAccessLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void refresh();
      const unsubscribe = authProvider.subscribe(() => {
        setAccess(null);
        void refresh();
      });
      const foreground = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refresh();
      });
      const keys: string[] = [SPARK_WALLET_STORAGE_KEY, ...Object.values(sparkEarningKeys)];
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || keys.includes(event.key)) void refresh();
      };
      if (Platform.OS === 'web' && typeof window !== 'undefined')
        window.addEventListener('storage', onStorage);
      return () => {
        active.current = false;
        request.current++;
        unsubscribe();
        foreground.remove();
        if (Platform.OS === 'web' && typeof window !== 'undefined')
          window.removeEventListener('storage', onStorage);
      };
    }, [refresh]),
  );
  useEffect(() => {
    if (!access?.expiresAt) return;
    const expires = Date.parse(access.expiresAt);
    if (!Number.isFinite(expires)) return;
    const wait = expires - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(wait + 1, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [access, clock]);
  return {
    ...view,
    access,
    accessError,
    accessLoading,
    earnedSparks,
    unlimited: hasUnlimitedShopSparks(access, clock),
    refresh,
  };
}
