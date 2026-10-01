import {
  applyChallengeAction,
  compactInterviewActions,
  initialChallengeDraft,
  parseChallengeAction,
  replayChallenge,
} from '../challenges/logic';
import type { ChallengeAction, ChallengeDraft } from '../challenges/model';
import { practiceById, practiceCatalog } from './catalog';
import { practiceFeedback } from './feedback';

export const OPTIONAL_PRACTICE_STORAGE_KEY = 'shipingit:optional-practice:v1';
export const PRACTICE_ACTION_LIMIT = 800;
export interface PracticeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
interface SavedAttempt {
  actions: ChallengeAction[];
  checked: boolean;
}
interface SavedSession extends SavedAttempt {
  attempt: number;
  previous: SavedAttempt[];
}
export interface PracticeSession {
  draft: ChallengeDraft;
  attempt: number;
  checked: boolean;
  hasEdits: boolean;
}
export interface PracticeSnapshot {
  hydrated: boolean;
  protected: boolean;
  saving: boolean;
  saveError: string | null;
  sessions: Record<string, PracticeSession>;
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

/** Independent device-only drafts. This module has no earned progress, finish, rewards, or reset API. */
export function createPracticeSession(storage: PracticeStorage) {
  let snapshot: PracticeSnapshot = {
    hydrated: false,
    protected: false,
    saving: false,
    saveError: null,
    sessions: {},
  };
  let records: Record<string, SavedSession> = {};
  let hydration: Promise<void> | null = null;
  let pending = Promise.resolve();
  let revision = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<PracticeSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const materialize = (id: string, record: SavedSession): PracticeSession => ({
    draft: replayChallenge(practiceById(id)!, record.actions),
    attempt: record.attempt,
    checked: record.checked,
    hasEdits: record.actions.length > 0,
  });
  const persist = () => {
    if (!snapshot.hydrated || snapshot.protected) return;
    const text = JSON.stringify({ version: 1, sessions: records });
    const thisRevision = ++revision;
    publish({ saving: true });
    pending = pending.then(async () => {
      try {
        await storage.setItem(OPTIONAL_PRACTICE_STORAGE_KEY, text);
        if (thisRevision === revision) publish({ saving: false, saveError: null });
      } catch {
        if (thisRevision === revision)
          publish({
            saving: false,
            saveError: 'This practice draft could not save. Retry before leaving.',
          });
      }
    });
  };
  const flush = async () => {
    let observed;
    do {
      observed = pending;
      await observed;
    } while (observed !== pending);
  };
  const hydrate = (): Promise<void> => {
    if (hydration) return hydration;
    hydration = (async () => {
      try {
        const raw = await storage.getItem(OPTIONAL_PRACTICE_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : { version: 1, sessions: {} };
        if (!object(parsed) || parsed.version !== 1 || !object(parsed.sessions))
          throw new Error('unsupported');
        if (Object.keys(parsed.sessions).some((id) => !practiceById(id)))
          throw new Error('unsupported exercise');
        const restored: Record<string, SavedSession> = {};
        const sessions: PracticeSnapshot['sessions'] = {};
        const readAttempt = (value: unknown): SavedAttempt => {
          if (
            !object(value) ||
            !Array.isArray(value.actions) ||
            value.actions.length > PRACTICE_ACTION_LIMIT
          )
            throw new Error('invalid');
          const actions = value.actions.map(parseChallengeAction);
          if (actions.some((action) => action === null)) throw new Error('invalid');
          return { actions: actions as ChallengeAction[], checked: value.checked === true };
        };
        for (const challenge of practiceCatalog) {
          const entry = parsed.sessions[challenge.id];
          if (entry === undefined) continue;
          if (
            !object(entry) ||
            !Number.isSafeInteger(entry.attempt) ||
            Number(entry.attempt) < 1 ||
            !Array.isArray(entry.previous) ||
            entry.previous.length > 2
          )
            throw new Error('invalid');
          const current = readAttempt(entry);
          const record = {
            ...current,
            actions: compactInterviewActions(challenge, current.actions),
            attempt: Number(entry.attempt),
            previous: entry.previous.map(readAttempt),
          };
          restored[challenge.id] = record;
          sessions[challenge.id] = materialize(challenge.id, record);
        }
        records = restored;
        publish({ hydrated: true, protected: false, saveError: null, sessions });
      } catch {
        publish({
          hydrated: true,
          protected: true,
          saveError:
            'Saved practice could not be read. It remains untouched. Retry loading to continue.',
        });
      }
    })();
    return hydration;
  };
  const canEdit = (id: string) =>
    snapshot.hydrated && !snapshot.protected && Boolean(practiceById(id));
  const currentRecord = (id: string): SavedSession =>
    records[id] ?? { actions: [], checked: false, attempt: 1, previous: [] };
  const saveRecord = (id: string, record: SavedSession) => {
    records = { ...records, [id]: record };
    publish({ sessions: { ...snapshot.sessions, [id]: materialize(id, record) } });
    persist();
  };
  const act = (id: string, value: ChallengeAction) => {
    const action = parseChallengeAction(value);
    if (!canEdit(id) || !action) return false;
    const challenge = practiceById(id)!;
    const record = currentRecord(id);
    const before = snapshot.sessions[id]?.draft ?? initialChallengeDraft(challenge);
    const after = applyChallengeAction(challenge, before, action);
    if (after === before) return false;
    const actions = compactInterviewActions(challenge, [...record.actions, action]);
    if (actions.length > PRACTICE_ACTION_LIMIT) {
      publish({
        saveError:
          'This attempt reached its edit limit. Your draft is kept. Choose another exercise.',
      });
      return false;
    }
    saveRecord(id, { ...record, actions, checked: false });
    return true;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    flush,
    act,
    check: (id: string) => {
      if (!canEdit(id)) return null;
      const challenge = practiceById(id)!;
      if (['wire', 'repair', 'layout'].includes(challenge.kind)) act(id, { type: 'run' });
      const record = currentRecord(id);
      saveRecord(id, { ...record, checked: true });
      return practiceFeedback(challenge, snapshot.sessions[id].draft);
    },
    anotherAttempt: (id: string) => {
      if (!canEdit(id)) return false;
      const record = currentRecord(id);
      const draft = snapshot.sessions[id]?.draft ?? initialChallengeDraft(practiceById(id)!);
      if (
        !record.checked ||
        !practiceFeedback(practiceById(id)!, draft).valid ||
        record.attempt >= Number.MAX_SAFE_INTEGER
      )
        return false;
      saveRecord(id, {
        actions: [],
        checked: false,
        attempt: record.attempt + 1,
        previous: [...record.previous, { actions: record.actions, checked: true }].slice(-2),
      });
      return true;
    },
    retry: async () => {
      if (snapshot.protected) {
        hydration = null;
        await hydrate();
      } else {
        persist();
        await flush();
      }
    },
  };
}
