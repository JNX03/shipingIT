import { useEffect, useMemo } from 'react';
import { getLessonAccessState, projectLessonAccess } from '../domain/lesson-access';
import { useAppStore } from '../store';
import { sparkWalletStore, useSavedSparkWallet } from '../store/spark-wallet-store';

/** Saved skips only pass prerequisites; earned progress always comes from actual completions. */
export function useLessonAccess() {
  const completed = useAppStore((state) => state.completedLessonIds);
  const completions = useAppStore((state) => state.lessonCompletions);
  const hydrated = useAppStore((state) => state.hydrated);
  const ready = useAppStore((state) => state.lessonAccessReady);
  const skipWallet = useAppStore((state) => state.lessonSkipWallet);
  const error = useAppStore((state) => state.storageError);
  const refresh = useAppStore((state) => state.refreshLessonAccess);
  const wallet = useSavedSparkWallet();
  const walletSkips = JSON.stringify(wallet.wallet.purchases.filter((purchase) => purchase.kind === 'skip'));
  const cachedSkips = JSON.stringify(skipWallet.purchases.filter((purchase) => purchase.kind === 'skip'));
  useEffect(() => {
    if (hydrated && wallet.hydrated && !wallet.error && walletSkips !== cachedSkips) void refresh();
  }, [hydrated, wallet.hydrated, walletSkips, cachedSkips, wallet.error, refresh]);
  const projection = useMemo(() => projectLessonAccess(completed, skipWallet), [completed, skipWallet]);
  return {
    ...projection,
    ready: hydrated && ready && wallet.hydrated && !wallet.error && walletSkips === cachedSkips,
    // A normal lesson-save failure stays in LessonActivity so its answers/retry receipt survive.
    error: wallet.error || (!ready ? error : null),
    refresh: async () => {
      await sparkWalletStore.refresh();
      await refresh();
    },
    lessonState: (id: string) => getLessonAccessState(id, completed, projection, completions),
  };
}
