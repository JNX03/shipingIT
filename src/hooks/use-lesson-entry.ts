import { useEffect, useRef, useState } from 'react';
import { originalAmiLoadingAssets } from '@/game/components/ami-original-art';
import { createLessonPreparationController } from '@/domain/lesson-preparation';
import { loadLessonArtwork, lessonArtworkSourceKey } from '@/services/lesson-artwork';

export type LessonEntryState = {
  ready: boolean;
  error: string | null;
  retry: () => void;
};

/** One brief character transition per lesson; the activity waits for real asset/data readiness. */
export function useLessonEntry(
  lessonKey: string,
  dataReady = true,
  lessonAssets: readonly number[] = [],
  retryData?: () => Promise<void>,
): LessonEntryState {
  const retryDataRef = useRef(retryData);
  useEffect(() => {
    retryDataRef.current = retryData;
  }, [retryData]);
  const [attempt, setAttempt] = useState(0);
  const [prepared, setPrepared] = useState<{ key: string; ready: boolean; error: string | null }>({
    key: '',
    ready: false,
    error: null,
  });
  const [dataPeriod, setDataPeriod] = useState({ ready: dataReady, epoch: 0 });
  const dataChanged = dataPeriod.ready !== dataReady;
  const dataEpoch = dataPeriod.epoch + (dataChanged ? 1 : 0);
  // Invalidate the prior period before children can render a stale ready activity.
  if (dataChanged) setDataPeriod({ ready: dataReady, epoch: dataEpoch });
  // The transition and lesson guide use Ami. Other actors/environments are supplied
  // by the activity that actually renders them, instead of blocking every quiz on
  // the full player/NPC wardrobe rig.
  const modules = [...originalAmiLoadingAssets, ...lessonAssets];
  const assetsKey = lessonArtworkSourceKey(modules);
  // Keep original descriptor identities; an equivalent replacement during HMR must load again.
  const modulesRef = useRef(modules);
  useEffect(() => {
    modulesRef.current = modules;
  });
  const preparationKey = `${lessonKey}:${assetsKey}:${attempt}:${dataEpoch}`;
  useEffect(() => {
    const modules = modulesRef.current;
    const preparation = createLessonPreparationController({
      dataReady,
      timeoutMs: attempt > 0 && dataReady ? 30_000 : undefined,
      recoverData: attempt > 0 ? () => retryDataRef.current?.() ?? Promise.resolve() : undefined,
      load: async () => {
        const loaded = await loadLessonArtwork(modules);
        if (loaded.length !== modules.length || loaded.some((asset) => !asset.downloaded))
          throw new Error('Lesson artwork is not fully loaded.');
      },
      onChange: (state) =>
        setPrepared({
          key: preparationKey,
          ready: state.status === 'ready',
          error:
            state.status !== 'error'
              ? null
              : state.reason === 'data-timeout' || state.reason === 'data-error'
                ? 'The lesson data did not finish loading. Your saved work is safe. Try again.'
                : state.reason === 'timeout'
                  ? 'The lesson artwork did not finish loading. Your saved work is safe. Try again.'
                  : 'The lesson artwork could not load. Your saved work is safe. Try again.',
        }),
    });
    preparation.start();
    return preparation.cancel;
  }, [dataReady, assetsKey, preparationKey, attempt]);
  return {
    ready: dataReady && !dataChanged && prepared.key === preparationKey && prepared.ready,
    error: !dataChanged && prepared.key === preparationKey ? prepared.error : null,
    retry: () => setAttempt((value) => value + 1),
  };
}
