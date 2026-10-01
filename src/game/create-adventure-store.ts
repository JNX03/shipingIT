import { create } from 'zustand';
import { subscribeToBrowserProgress, toDateKey } from '../domain/progression';
import {
  adventureXP,
  checkAdventureStage,
  initialAdventure,
  parseAdventure,
  patchAdventure,
  stageXP,
  validCompletedPrefix,
  type AdventureState,
} from './state';
import { stageIds, type GameDraft, type StageId } from './types';

export const ADVENTURE_STORAGE_KEY = 'shipingit:adventure:v1';
export interface AdventureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface AdventureStore extends AdventureState {
  hydrated: boolean;
  error: string | null;
  recoveredState: boolean;
  hydrate: () => Promise<void>;
  begin: () => void;
  patchDraft: (patch: Partial<GameDraft>) => void;
  finishStage: (stage: StageId) => { success: boolean; xp: number; message: string };
  flush: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  refreshFromStorage: () => Promise<void>;
}
export function adventureSnapshot(state: AdventureState): AdventureState {
  const { version, draft, completed, earned, activityDates, started } = state;
  return { version, draft, completed, earned, activityDates, started };
}
export function createAdventureStore(
  storage: AdventureStorage,
  clock: () => Date = () => new Date(),
) {
  let hydration: Promise<void> | null = null;
  let pending = Promise.resolve();
  let readProtected = false;
  let externalRevision = 0;
  return create<AdventureStore>()((set, get) => {
    const persist = () => {
      if (!get().hydrated || readProtected) return;
      const serialized = JSON.stringify(adventureSnapshot(get()));
      const revision = externalRevision;
      pending = pending.then(async () => {
        try {
          if (revision !== externalRevision) return;
          await storage.setItem(ADVENTURE_STORAGE_KEY, serialized);
          set({ error: null, recoveredState: false });
        } catch {
          set({
            error:
              'Your game is still open, but this device could not save it. Retry before leaving.',
          });
        }
      });
    };
    const flush = async () => {
      // Include writes queued while a previous storage operation was pending.
      let observed: Promise<void>;
      do {
        observed = pending;
        await observed;
      } while (observed !== pending);
    };
    const refreshFromStorage = async () => {
      if (!get().hydrated || readProtected) return;
      await flush();
      try {
        const raw = await storage.getItem(ADVENTURE_STORAGE_KEY);
        if (raw === null) {
          set({ error: 'Adventure progress changed in another tab. Reload to continue safely.' });
          return;
        }
        const parsed = parseAdventure(raw, clock());
        if (parsed.incompatible) {
          readProtected = true;
          set({ error: 'A newer adventure save was found in another tab. It has not been overwritten.' });
          return;
        }
        set({ ...parsed.state, recoveredState: parsed.recovered, error: parsed.recovered
          ? 'Some adventure data needed repair. Valid notes were kept; review them and retry saving.'
          : null });
      } catch {
        readProtected = true;
        set({ error: 'Adventure progress changed in another tab but could not be read. Your save has been protected.' });
      }
    };
    subscribeToBrowserProgress(ADVENTURE_STORAGE_KEY, () => {
      externalRevision++;
      void refreshFromStorage();
    });
    const mutate = (state: Partial<AdventureState>) => {
      if (!get().hydrated) return;
      set(state);
      persist();
    };
    return {
      ...initialAdventure(),
      hydrated: false,
      error: null,
      recoveredState: false,
      hydrate: () => {
        if (hydration) return hydration;
        hydration = (async () => {
          try {
            const parsed = parseAdventure(await storage.getItem(ADVENTURE_STORAGE_KEY), clock());
            readProtected = parsed.incompatible;
            set({
              ...parsed.state,
              hydrated: true,
              recoveredState: parsed.recovered,
              error: parsed.incompatible
                ? 'This adventure was saved by a newer app version. It has not been overwritten. Update the app to continue safely.'
                : parsed.recovered
                  ? 'Some adventure data needed repair. Valid notes were kept; review them and retry saving.'
                  : null,
            });
          } catch {
            readProtected = true;
            set({
              hydrated: true,
              error: 'Saved adventure could not be loaded. Existing data will not be overwritten.',
            });
          }
        })();
        return hydration;
      },
      begin: () => {
        if (!get().started) mutate({ started: true });
      },
      patchDraft: (patch) => {
        if (get().hydrated) mutate(patchAdventure(adventureSnapshot(get()), patch));
      },
      finishStage: (stage) => {
        if (!get().hydrated)
          return { success: false, xp: 0, message: 'Your adventure is still loading.' };
        const state = get(),
          index = stageIds.indexOf(stage);
        const currentPrefix = validCompletedPrefix(state.completed, state.draft);
        if (index < 0 || index > currentPrefix.length)
          return { success: false, xp: 0, message: 'Finish the previous stage first.' };
        const checked = checkAdventureStage(stage, state.draft);
        if (!checked.valid) return { success: false, xp: 0, message: checked.message };
        const first = !state.earned.includes(stage);
        const earned = stageIds.filter((id) => state.earned.includes(id) || id === stage);
        const completed = stageIds.slice(0, Math.max(currentPrefix.length, index + 1));
        const activityDates = [...new Set([...state.activityDates, toDateKey(clock())])].sort();
        mutate({ earned, completed, activityDates, started: true });
        return { success: true, xp: first ? stageXP[stage] : 0, message: checked.message };
      },
      flush,
      retry: async () => {
        if (!get().hydrated) return;
        if (readProtected) {
          set({
            error:
              'The original save could not be safely read. It remains untouched. Restart after restoring storage access or updating the app.',
          });
          return;
        }
        persist();
        await flush();
      },
      reset: () => {
        if (!get().hydrated) return;
        // An explicit reset is the owner's decision to replace even an unread
        // or newer-format save. Ordinary edits and Retry never clear protection.
        readProtected = false;
        mutate(initialAdventure());
      },
      refreshFromStorage,
    };
  });
}
export { adventureXP };
