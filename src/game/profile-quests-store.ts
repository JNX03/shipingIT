import { create } from 'zustand';
import { toDateKey } from '../domain/progression';
import {
  claimQuest, initialProfileQuests, observeQuestSources, parseProfileQuests, questClaimKey,
  dailyQuestDefinitions, type DailyQuestId, type ProfileQuestState, type QuestSourceSnapshot,
} from './profile-quests';

export const PROFILE_QUESTS_STORAGE_KEY = 'shipingit:profile-quests:v1';
export interface ProfileQuestStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface QuestSaveResult { success: boolean; message: string }
export interface QuestClaimResult extends QuestSaveResult { xpEarned: number; alreadyClaimed: boolean }
export interface ProfileQuestStore extends ProfileQuestState {
  hydrated: boolean;
  ready: boolean;
  saving: boolean;
  error: string | null;
  sourceError: string | null;
  hydrate: () => Promise<void>;
  observe: (sources: QuestSourceSnapshot[], observedAt?: Date) => Promise<QuestSaveResult>;
  claim: (id: DailyQuestId, day?: string) => Promise<QuestClaimResult>;
  retry: () => Promise<QuestSaveResult>;
  reset: () => Promise<QuestSaveResult>;
  flush: () => Promise<void>;
  exportSnapshot: () => ProfileQuestState;
}
export function profileQuestSnapshot(state: ProfileQuestState): ProfileQuestState {
  return {
    version: 1,
    initializedSources: [...state.initializedSources],
    evidence: Object.fromEntries(Object.entries(state.evidence).map(([id, item]) => [id, { ...item }])),
    claims: Object.fromEntries(Object.entries(state.claims).map(([id, item]) => [id, { ...item, evidenceIds: [...item.evidenceIds] }])),
  };
}

export function createProfileQuestStore(storage: ProfileQuestStorage, clock: () => Date = () => new Date()) {
  let hydration: Promise<void> | null = null;
  let pending = Promise.resolve();
  let intended = initialProfileQuests();
  let readProtected = false;
  return create<ProfileQuestStore>()((set, get) => {
    const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
      const result = pending.then(operation);
      pending = result.then(() => undefined, () => undefined);
      return result;
    };
    const save = async (): Promise<QuestSaveResult> => {
      if (!get().hydrated || readProtected) return { success: false, message: 'Quest rewards are waiting for a safe load of this device’s save.' };
      set({ saving: true });
      try {
        await storage.setItem(PROFILE_QUESTS_STORAGE_KEY, JSON.stringify(intended));
        // A reward enters totals only after its claim and supporting evidence are durable together.
        set({ ...profileQuestSnapshot(intended), error: null });
        return { success: true, message: 'Quest progress saved.' };
      } catch {
        const message = 'Quest progress could not be saved. Retry saving before leaving; no unsaved bonus has been added.';
        set({ error: message });
        return { success: false, message };
      } finally { set({ saving: false }); }
    };
    const read = async () => {
      try {
        intended = parseProfileQuests(await storage.getItem(PROFILE_QUESTS_STORAGE_KEY));
        readProtected = false;
        set({ ...profileQuestSnapshot(intended), hydrated: true, error: null });
      } catch {
        readProtected = true;
        set({ hydrated: true, error: 'Saved quests could not be read safely. They have not been overwritten. Retry after restoring storage access.' });
      }
    };
    return {
      ...initialProfileQuests(), hydrated: false, ready: false, saving: false, error: null, sourceError: null,
      hydrate: () => { hydration ??= read(); return hydration; },
      observe: (sources, observedAt = clock()) => enqueue(async () => {
        if (!get().hydrated || readProtected) return { success: false, message: 'Quest progress is still loading safely.' };
        const next = observeQuestSources(intended, sources, observedAt);
        if (next === intended && !get().error) return { success: true, message: 'Quest progress is up to date.' };
        intended = next;
        return save();
      }),
      claim: (id, day = toDateKey(clock())) => enqueue(async () => {
        const failure = (message: string): QuestClaimResult => ({ success: false, message, xpEarned: 0, alreadyClaimed: false });
        if (!get().hydrated || readProtected) return failure('Quest rewards are still loading safely.');
        if (get().sourceError) return failure(get().sourceError!);
        if (day !== toDateKey(clock())) return failure('A new day has started. View today’s quests before claiming.');
        const key = questClaimKey(day, id);
        if (get().claims[key]) return { success: true, message: 'Already claimed today.', xpEarned: 0, alreadyClaimed: true };
        intended = claimQuest(intended, id, day, clock());
        if (!intended.claims[key]) return failure('Complete this quest with new stages or lessons first.');
        const saved = await save();
        return { ...saved, xpEarned: saved.success ? dailyQuestDefinitions.find((quest) => quest.id === id)!.rewardXP : 0, alreadyClaimed: false };
      }),
      retry: () => enqueue(async () => {
        if (!get().hydrated) return { success: false, message: 'Quest progress is still loading.' };
        if (readProtected) {
          await read();
          return { success: !readProtected, message: get().error ?? 'Quest save loaded safely.' };
        }
        return save();
      }),
      reset: () => enqueue(async () => {
        if (!get().hydrated) return { success: false, message: 'Wait for quests to load before resetting.' };
        readProtected = false;
        intended = initialProfileQuests();
        return save();
      }),
      flush: async () => {
        let observed: Promise<void>;
        do { observed = pending; await observed; } while (observed !== pending);
      },
      exportSnapshot: () => profileQuestSnapshot(get()),
    };
  });
}
