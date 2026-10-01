import { create } from 'zustand';
import {
  createInitialState,
  parsePersistedState,
  reduceCompleteLesson,
  sanitizeProfile,
  sanitizeProject,
  subscribeToBrowserProgress,
} from '../domain/progression';
import type { CompleteLessonOptions } from '../domain/progression';
import {
  initialSparkWallet,
  parseSparkWallet,
  SPARK_WALLET_STORAGE_KEY,
  type SparkWallet,
} from '../domain/spark-wallet';
import type {
  CompletionResult,
  PersistedAppState,
  Profile,
  Project,
  Settings,
} from '../domain/types';

export const STORAGE_KEY = 'shipaton-nextgen:learning-state:v1';
export interface LocalStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface AppStore extends PersistedAppState {
  hydrated: boolean;
  storageError: string | null;
  recoveredState: boolean;
  lessonSkipWallet: SparkWallet;
  lessonAccessReady: boolean;
  refreshLessonAccess: () => Promise<void>;
  hydrate: () => Promise<void>;
  completeOnboarding: (profile: Partial<Profile>) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  updateProject: (project: Partial<Project>) => void;
  completeLesson: (id: string, options?: CompleteLessonOptions) => CompletionResult;
  resetProgress: () => void;
  flushPersistence: () => Promise<void>;
  retryPersistence: () => Promise<void>;
  refreshFromStorage: () => Promise<void>;
}
/** Only data goes on disk. Functions, service credentials, and paid entitlements never do. */
export function persistedSnapshot(state: PersistedAppState): PersistedAppState {
  return {
    schemaVersion: 1,
    onboardingComplete: state.onboardingComplete,
    profile: state.profile,
    settings: state.settings,
    project: state.project,
    completedLessonIds: state.completedLessonIds,
    xp: state.xp,
    activityDates: state.activityDates,
    achievements: state.achievements,
    lessonCompletions: state.lessonCompletions,
    activityLog: state.activityLog,
  };
}

export function createAppStore(storage: LocalStorageAdapter, clock: () => Date = () => new Date()) {
  let hydration: Promise<void> | null = null;
  let pendingWrite = Promise.resolve();
  let readFailed = false;
  let externalRevision = 0;
  let walletReadSequence = 0;
  return create<AppStore>()((set, get) => {
    const persist = () => {
      if (!get().hydrated || readFailed) return;
      const serialized = JSON.stringify(persistedSnapshot(get()));
      const revision = externalRevision;
      // Serialize writes so a slower old save cannot overwrite a newer project edit.
      pendingWrite = pendingWrite.then(async () => {
        try {
          if (revision !== externalRevision) return;
          await storage.setItem(STORAGE_KEY, serialized);
          set({ storageError: null });
        } catch {
          set({
            storageError:
              'Your latest changes are kept in this session, but this device could not save them. Try saving again before closing the app.',
          });
        }
      });
    };
    const mutate = (partial: Partial<PersistedAppState>) => {
      // Screens wait for hydration. This guard also prevents external tools overwriting an unread save.
      if (!get().hydrated) return;
      set(partial);
      persist();
    };
    const flush = async () => {
      let observed: Promise<void>;
      do {
        observed = pendingWrite;
        await observed;
      } while (observed !== pendingWrite);
    };
    const refreshFromStorage = async () => {
      if (!get().hydrated || readFailed) return;
      await flush();
      let raw: string | null;
      let skipWallet: SparkWallet;
      try {
        const values = await Promise.all([
          storage.getItem(STORAGE_KEY),
          storage.getItem(SPARK_WALLET_STORAGE_KEY),
        ]);
        raw = values[0];
        skipWallet = parseSparkWallet(values[1]);
      } catch {
        set({ storageError: 'Progress changed in another tab but could not be read. Your save has been protected.' });
        return;
      }
      if (raw === null) {
        // A key removal is not a request to reset this store.
        set({ storageError: 'Progress changed in another tab. Reload to continue safely.' });
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || (parsed as { schemaVersion?: unknown }).schemaVersion !== 1) {
          readFailed = true;
          set({ storageError: 'A newer progress save was found in another tab. It has not been overwritten.' });
          return;
        }
        const { state, recovered } = parsePersistedState(raw, clock(), skipWallet);
        set({ ...state, lessonSkipWallet: skipWallet, lessonAccessReady: true, recoveredState: recovered, storageError: null });
      } catch {
        readFailed = true;
        set({ storageError: 'Progress changed in another tab but could not be read. Your save has been protected.' });
      }
    };
    subscribeToBrowserProgress(STORAGE_KEY, () => {
      externalRevision++;
      void refreshFromStorage();
    });
    const refreshLessonAccess = async () => {
      const request = ++walletReadSequence;
      set({ lessonAccessReady: false });
      try {
        const wallet = parseSparkWallet(await storage.getItem(SPARK_WALLET_STORAGE_KEY));
        if (request === walletReadSequence)
          set({
            lessonSkipWallet: wallet,
            lessonAccessReady: true,
            ...(get().storageError?.startsWith('Your saved lesson skips could not be read.')
              ? { storageError: null }
              : {}),
          });
      } catch {
        if (request === walletReadSequence)
          set({ lessonAccessReady: false, storageError: 'Your saved lesson skips could not be read. Retry loading your Spark wallet before continuing.' });
      }
    };
    subscribeToBrowserProgress(SPARK_WALLET_STORAGE_KEY, () => {
      void refreshLessonAccess();
    });
    return {
      ...createInitialState(),
      hydrated: false,
      storageError: null,
      recoveredState: false,
      lessonSkipWallet: initialSparkWallet(),
      lessonAccessReady: false,
      refreshLessonAccess,
      hydrate: () => {
        if (hydration) return hydration;
        hydration = (async () => {
          try {
            const [raw, rawWallet] = await Promise.all([
              storage.getItem(STORAGE_KEY),
              storage.getItem(SPARK_WALLET_STORAGE_KEY),
            ]);
            const skipWallet = parseSparkWallet(rawWallet);
            const { state, recovered } = parsePersistedState(raw, clock(), skipWallet);
            readFailed = false;
            set({ ...state, lessonSkipWallet: skipWallet, lessonAccessReady: true, hydrated: true, recoveredState: recovered, storageError: null });
          } catch {
            readFailed = true;
            // A failed read is not an empty save: preserve disk data and surface the problem.
            set({
              hydrated: true,
              storageError:
                'Saved progress could not be read on this device. Your session is available, but check device storage before making changes.',
            });
          }
        })();
        return hydration;
      },
      completeOnboarding: (profile) =>
        mutate({
          profile: sanitizeProfile({ ...get().profile, ...profile }),
          onboardingComplete: true,
        }),
      updateProfile: (profile) =>
        mutate({ profile: sanitizeProfile({ ...get().profile, ...profile }) }),
      updateSettings: (settings) => {
        const next = { ...get().settings };
        if (typeof settings.sound === 'boolean') next.sound = settings.sound;
        if (typeof settings.haptics === 'boolean') next.haptics = settings.haptics;
        if (typeof settings.reducedMotion === 'boolean')
          next.reducedMotion = settings.reducedMotion;
        mutate({ settings: next });
      },
      updateProject: (project) => mutate({ project: sanitizeProject(project, get().project) }),
      completeLesson: (id, options) => {
        if (!get().hydrated || !get().lessonAccessReady)
          return {
            success: false,
            alreadyCompleted: false,
            xpEarned: 0,
            newAchievements: [],
            missionCompleted: null,
            reason: 'Your saved project is still loading. Please try again in a moment.',
          };
        const { state, result } = reduceCompleteLesson(
          persistedSnapshot(get()),
          id,
          { ...options, skipWallet: get().lessonSkipWallet },
          clock(),
        );
        if (result.success) mutate(state);
        return result;
      },
      resetProgress: () => {
        if (!get().hydrated) return;
        // Only an explicit reset may replace a save that could not be read.
        readFailed = false;
        mutate(createInitialState());
        set({ recoveredState: false });
      },
      flushPersistence: flush,
      retryPersistence: async () => {
        if (readFailed) {
          set({
            storageError:
              'The original save could not be read. To protect it, this session has not overwritten it. Restart the app after checking device storage.',
          });
          return;
        }
        persist();
        await flush();
      },
      refreshFromStorage,
    };
  });
}
