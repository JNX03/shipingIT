import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLesson } from '../data/curriculum';
import { toDateKey } from '../domain/progression';
import { useAppStore } from '../store/app-store';
import { useAdventure } from './store';
import { stageXP } from './state';
import type { StageId } from './types';
import { useChallenges } from './challenge-store';
import { challengeCatalog } from './challenges/catalog';
import { createProfileQuestStore } from './profile-quests-store';
import type { QuestCompletion, QuestSourceSnapshot } from './profile-quests';

export { questRewardXP, selectDailyQuests, totalProfileXP } from './profile-quests';
export const profileQuestStore = createProfileQuestStore(AsyncStorage);
export interface ProfileQuestSource {
  id: string;
  getSnapshot: () => { hydrated: boolean; error?: string | null; completions: QuestCompletion[] };
  subscribe: (listener: () => void) => () => void;
  flush?: () => Promise<void>;
  allowInitialCredit?: boolean;
}
const sources = new Map<string, ProfileQuestSource>();
const subscriptions = new Map<string, () => void>();
let initialization: Promise<void> | null = null;
let synchronizing = Promise.resolve();
let suspended = false;
const fingerprints = new Map<string, string>();

function sourceError() {
  const failed = [...sources.values()].some((source) => Boolean(source.getSnapshot().error));
  profileQuestStore.setState({
    sourceError: failed
      ? 'Save your stage or lesson progress before claiming quest rewards.'
      : null,
  });
}
function synchronize(source: ProfileQuestSource) {
  if (suspended) return;
  const snapshot = source.getSnapshot();
  sourceError();
  if (!snapshot.hydrated || snapshot.error) return;
  const fingerprint = JSON.stringify(snapshot.completions);
  if (fingerprints.get(source.id) === fingerprint) return;
  const observedAt = new Date();
  const captured: QuestSourceSnapshot = {
    id: source.id,
    completions: snapshot.completions.map((completion) => ({ ...completion })),
    allowInitialCredit: source.allowInitialCredit,
  };
  fingerprints.set(source.id, fingerprint);
  synchronizing = synchronizing
    .then(async () => {
      await profileQuestStore.getState().hydrate();
      await source.flush?.();
      if (source.getSnapshot().error) {
        fingerprints.delete(source.id);
        sourceError();
        return;
      }
      const saved = await profileQuestStore.getState().observe([captured], observedAt);
      if (!saved.success) fingerprints.delete(source.id);
    })
    .catch(() => {
      fingerprints.delete(source.id);
      profileQuestStore.setState({
        sourceError: 'Quest progress could not be checked. Retry saving before claiming.',
      });
    });
}
function connect(source: ProfileQuestSource) {
  if (subscriptions.has(source.id)) return;
  subscriptions.set(
    source.id,
    source.subscribe(() => synchronize(source)),
  );
  synchronize(source);
}

/** Register before initializing. Existing first-load evidence is baseline-only by default. */
export function registerProfileQuestSource(source: ProfileQuestSource): () => void {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(source.id))
    throw new Error('Use a stable lowercase quest source ID.');
  if (sources.has(source.id)) throw new Error(`Quest source already registered: ${source.id}`);
  sources.set(source.id, source);
  if (initialization) connect(source);
  return () => {
    subscriptions.get(source.id)?.();
    subscriptions.delete(source.id);
    sources.delete(source.id);
    fingerprints.delete(source.id);
    sourceError();
  };
}

// Adventure saves have no first-completion timestamps. Only transitions witnessed
// after hydration are dated; unseen stages present on launch are permanently baseline-only.
const adventureDates = new Map<StageId, string>();
registerProfileQuestSource({
  id: 'adventure',
  getSnapshot: () => {
    const state = useAdventure.getState();
    return {
      hydrated: state.hydrated,
      error: state.error,
      completions: state.earned.map((id) => ({
        id,
        completedAt: adventureDates.get(id) ?? null,
        baseXP: stageXP[id],
      })),
    };
  },
  subscribe: (listener) =>
    useAdventure.subscribe((state, before) => {
      if (before.hydrated)
        for (const id of state.earned) {
          if (!before.earned.includes(id) && !adventureDates.has(id))
            adventureDates.set(id, toDateKey());
        }
      listener();
    }),
  flush: () => useAdventure.getState().flush(),
});
registerProfileQuestSource({
  id: 'lessons',
  allowInitialCredit: true,
  getSnapshot: () => {
    const state = useAppStore.getState();
    return {
      hydrated: state.hydrated,
      error: state.storageError,
      completions: state.completedLessonIds.map((id) => ({
        id,
        completedAt: state.lessonCompletions[id]?.completedAt ?? null,
        baseXP: getLesson(id)?.xp ?? 0,
      })),
    };
  },
  subscribe: (listener) => useAppStore.subscribe(listener),
  flush: () => useAppStore.getState().flushPersistence(),
});
// Practice proofs contain their immutable first-completion time. Existing proofs
// are baselined when this source is first registered, never treated as new work.
registerProfileQuestSource({
  id: 'practice',
  getSnapshot: () => {
    const state = useChallenges.getState();
    return {
      hydrated: state.hydrated,
      error: state.saveError,
      completions: challengeCatalog.flatMap((challenge) => {
        const completedAt = state.completed[challenge.id];
        return completedAt
          ? [
              {
                id: challenge.id,
                completedAt: toDateKey(new Date(completedAt)),
                baseXP: challenge.reward,
              },
            ]
          : [];
      }),
    };
  },
  subscribe: (listener) => useChallenges.subscribe(listener),
  flush: () => useChallenges.getState().flush(),
});

/** App shell: await once before presenting gameplay so the initial baseline is established. */
export function initializeProfileQuests(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    for (const source of sources.values()) connect(source);
    await Promise.all([
      profileQuestStore.getState().hydrate(),
      useAppStore.getState().hydrate(),
      useAdventure.getState().hydrate(),
      useChallenges.getState().hydrate(),
    ]);
    for (const source of sources.values()) synchronize(source);
    let observed: Promise<void>;
    do {
      observed = synchronizing;
      await observed;
    } while (observed !== synchronizing);
    profileQuestStore.setState({ ready: true });
  })();
  return initialization;
}
export function useProfileQuests() {
  // RootLayout initializes the bridge before exposing app routes. Keep this
  // selector a single stable hook so React Compiler sees the same hook order
  // before and after asynchronous store hydration.
  return profileQuestStore();
}
export async function retryProfileQuests() {
  const result = await profileQuestStore.getState().retry();
  if (!result.success) return result;
  fingerprints.clear();
  for (const source of sources.values()) synchronize(source);
  await synchronizing;
  const state = profileQuestStore.getState();
  return {
    success: !state.error && !state.sourceError,
    message: state.error ?? state.sourceError ?? 'Quest progress saved.',
  };
}
/** Call only after all source stores have reset and flushed successfully. */
export async function resetProfileQuests() {
  suspended = true;
  let succeeded = false;
  try {
    await synchronizing;
    const result = await profileQuestStore.getState().reset();
    if (result.success) {
      adventureDates.clear();
      fingerprints.clear();
      succeeded = true;
    }
    return result;
  } finally {
    suspended = false;
    if (succeeded) {
      for (const source of sources.values()) synchronize(source);
      await synchronizing;
    }
  }
}
