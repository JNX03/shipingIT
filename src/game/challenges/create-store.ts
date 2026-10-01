import { create } from 'zustand';
import { challengeById, challengeCatalog, isChallengeUnlocked } from './catalog';
import { subscribeToBrowserProgress } from '../../domain/progression';
import {
  applyChallengeAction,
  checkChallenge,
  compactInterviewActions,
  initialChallengeDraft,
  parseChallengeAction,
  replayChallenge,
} from './logic';
import type { ChallengeAction, ChallengeDraft } from './model';

export const CHALLENGE_STORAGE_KEY = 'shipingit:practice:v1';
interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
interface SavedPractice {
  version: 1;
  histories: Record<string, ChallengeAction[]>;
  proofs: Record<string, { at: string; actions: ChallengeAction[] }>;
}
export interface ChallengeState {
  hydrated: boolean;
  saveError: string | null;
  completed: Record<string, string>;
  drafts: Record<string, ChallengeDraft>;
  hydrate(): Promise<void>;
  act(id: string, action: ChallengeAction): void;
  finish(id: string): { valid: boolean; message: string; earned: number };
  flush(): Promise<void>;
  retry(): Promise<void>;
  reset(): Promise<void>;
  refreshFromStorage(): Promise<void>;
}
export function challengeXP(state: Pick<ChallengeState, 'completed'>) {
  return challengeCatalog.reduce(
    (sum, item) => sum + (state.completed[item.id] ? item.reward : 0),
    0,
  );
}
export function createChallengeStore(storage: Storage, clock: () => Date = () => new Date()) {
  let histories: SavedPractice['histories'] = {},
    proofs: SavedPractice['proofs'] = {};
  let hydration: Promise<void> | null = null,
    pending = Promise.resolve(),
    readProtected = false,
    externalRevision = 0;
  return create<ChallengeState>()((set, get) => {
    const persist = () => {
      if (!get().hydrated || readProtected) return;
      const text = JSON.stringify({ version: 1, histories, proofs } satisfies SavedPractice);
      const revision = externalRevision;
      pending = pending.then(async () => {
        try {
          if (revision !== externalRevision) return;
          await storage.setItem(CHALLENGE_STORAGE_KEY, text);
          set({ saveError: null });
        } catch {
          set({
            saveError:
              'Your practice is open, but this device could not save it. Retry before leaving.',
          });
        }
      });
    };
    const flush = async () => {
      let observed: Promise<void>;
      do {
        observed = pending;
        await observed;
      } while (observed !== pending);
    };
    const actions = (raw: unknown) =>
      Array.isArray(raw)
        ? raw
            .slice(0, 1000)
            .map(parseChallengeAction)
            .filter((entry): entry is ChallengeAction => Boolean(entry))
        : [];
    const hydrate = () => {
      if (hydration) return hydration;
      hydration = (async () => {
        try {
          const raw = await storage.getItem(CHALLENGE_STORAGE_KEY);
          let parsed: Record<string, unknown> = { version: 1 };
          try {
            parsed = raw ? JSON.parse(raw) : parsed;
          } catch {
            set({
              hydrated: true,
              saveError:
                'The practice save was unreadable. Retry saving to start a fresh practice journey.',
            });
            return;
          }
          if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
            readProtected = true;
            set({
              hydrated: true,
              saveError: 'This practice save uses a different version. It remains untouched.',
            });
            return;
          }
          const rawHistories =
            parsed.histories && typeof parsed.histories === 'object'
              ? (parsed.histories as Record<string, unknown>)
              : {};
          const rawProofs =
            parsed.proofs && typeof parsed.proofs === 'object'
              ? (parsed.proofs as Record<string, unknown>)
              : {};
          const drafts: Record<string, ChallengeDraft> = {},
            completed: Record<string, string> = {};
          histories = {};
          proofs = {};
          for (const challenge of challengeCatalog) {
            if (!isChallengeUnlocked(challenge.id, completed)) break;
            const history = compactInterviewActions(challenge, actions(rawHistories[challenge.id]));
            histories[challenge.id] = history;
            drafts[challenge.id] = replayChallenge(challenge, history);
            const proof = rawProofs[challenge.id];
            if (proof && typeof proof === 'object') {
              const record = proof as Record<string, unknown>,
                proofActions = actions(record.actions);
              const at = typeof record.at === 'string' ? record.at : '';
              if (
                at &&
                Number.isFinite(Date.parse(at)) &&
                Date.parse(at) <= clock().getTime() &&
                checkChallenge(challenge, replayChallenge(challenge, proofActions)).valid
              ) {
                proofs[challenge.id] = { at, actions: proofActions };
                completed[challenge.id] = at;
              }
            }
          }
          readProtected = false;
          set({ hydrated: true, drafts, completed, saveError: null });
        } catch {
          readProtected = true;
          set({
            hydrated: true,
            saveError:
              'Practice progress could not be loaded. Existing data has not been overwritten.',
          });
        }
      })();
      return hydration;
    };
    const refreshFromStorage = async () => {
      if (!get().hydrated || readProtected) return;
      await flush();
      try {
        const raw = await storage.getItem(CHALLENGE_STORAGE_KEY);
        if (raw === null) {
          set({ saveError: 'Practice progress changed in another tab. Reload to continue safely.' });
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1) {
          readProtected = true;
          set({ saveError: 'A newer practice save was found in another tab. It has not been overwritten.' });
          return;
        }
        const saved = parsed as Record<string, unknown>;
        const rawHistories = saved.histories && typeof saved.histories === 'object'
          ? saved.histories as Record<string, unknown> : {};
        const rawProofs = saved.proofs && typeof saved.proofs === 'object'
          ? saved.proofs as Record<string, unknown> : {};
        const nextHistories: SavedPractice['histories'] = {};
        const nextProofs: SavedPractice['proofs'] = {};
        const drafts: Record<string, ChallengeDraft> = {};
        const completed: Record<string, string> = {};
        for (const challenge of challengeCatalog) {
          if (!isChallengeUnlocked(challenge.id, completed)) break;
          const history = compactInterviewActions(challenge, actions(rawHistories[challenge.id]));
          nextHistories[challenge.id] = history;
          drafts[challenge.id] = replayChallenge(challenge, history);
          const proof = rawProofs[challenge.id];
          if (proof && typeof proof === 'object') {
            const record = proof as Record<string, unknown>;
            const proofActions = actions(record.actions);
            const at = typeof record.at === 'string' ? record.at : '';
            if (at && Number.isFinite(Date.parse(at)) && Date.parse(at) <= clock().getTime()
              && checkChallenge(challenge, replayChallenge(challenge, proofActions)).valid) {
              nextProofs[challenge.id] = { at, actions: proofActions };
              completed[challenge.id] = at;
            }
          }
        }
        histories = nextHistories;
        proofs = nextProofs;
        readProtected = false;
        set({ drafts, completed, saveError: null });
      } catch {
        readProtected = true;
        set({ saveError: 'Practice progress changed in another tab but could not be read. Your save has been protected.' });
      }
    };
    subscribeToBrowserProgress(CHALLENGE_STORAGE_KEY, () => {
      externalRevision++;
      void refreshFromStorage();
    });
    return {
      hydrated: false,
      saveError: null,
      completed: {},
      drafts: {},
      hydrate,
      refreshFromStorage,
      flush,
      act: (id, action) => {
        const challenge = challengeById(id),
          validAction = parseChallengeAction(action);
        if (
          !get().hydrated ||
          readProtected ||
          !challenge ||
          !validAction ||
          !isChallengeUnlocked(id, get().completed)
        )
          return;
        const history = compactInterviewActions(challenge, histories[id] ?? []);
        if (history.length >= 1000) {
          set({
            saveError:
              'This practice has reached its edit limit. Your saved work is still available.',
          });
          return;
        }
        const before = get().drafts[id] ?? initialChallengeDraft(challenge),
          draft = applyChallengeAction(challenge, before, validAction);
        if (draft === before) return;
        histories = {
          ...histories,
          [id]: compactInterviewActions(challenge, [...history, validAction]),
        };
        set({ drafts: { ...get().drafts, [id]: draft } });
        persist();
      },
      finish: (id) => {
        const challenge = challengeById(id);
        if (
          !get().hydrated ||
          readProtected ||
          !challenge ||
          !isChallengeUnlocked(id, get().completed)
        )
          return {
            valid: false,
            message: 'Finish the previous practice first, or restore storage access.',
            earned: 0,
          };
        const checked = checkChallenge(
          challenge,
          get().drafts[id] ?? initialChallengeDraft(challenge),
        );
        if (!checked.valid) return { ...checked, earned: 0 };
        const earned = get().completed[id] ? 0 : challenge.reward;
        if (earned) {
          const at = clock().toISOString();
          proofs = { ...proofs, [id]: { at, actions: [...(histories[id] ?? [])] } };
          set({ completed: { ...get().completed, [id]: at } });
          persist();
        }
        return { ...checked, earned };
      },
      retry: async () => {
        if (readProtected) {
          hydration = null;
          await hydrate();
          return;
        }
        persist();
        await flush();
      },
      reset: async () => {
        await hydrate();
        if (readProtected) throw new Error(get().saveError ?? 'Practice save is protected.');
        histories = {};
        proofs = {};
        set({ completed: {}, drafts: {}, saveError: null });
        persist();
        await flush();
        if (get().saveError) throw new Error(get().saveError!);
      },
    };
  });
}
export { isChallengeUnlocked };
