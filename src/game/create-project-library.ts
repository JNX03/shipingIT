import {
  emptyProjectLibrary,
  isProjectId,
  parseProjectLibrary,
  selectLibraryProject,
  type ProjectLibraryData,
  type ProjectId,
} from './project-library-model';
import { normalizeCampusCompassDraft } from './templates/map/logic';
import type { CampusCompassDraft } from './templates/map/types';
import { normalizeStudyDraft, type StudyBuddyDraft } from './templates/study/model';

export const PROJECT_LIBRARY_KEY = 'shipingit:project-library:v1';
export interface ProjectLibraryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface ProjectLibrarySnapshot {
  data: ProjectLibraryData;
  hydrated: boolean;
  saving: boolean;
  readBlocked: boolean;
  error: string | null;
}

/** One independent key and a serialized write queue; no curriculum, award, or Notebook dependency. */
export function createProjectLibrary(storage: ProjectLibraryStorage) {
  let state: ProjectLibrarySnapshot = {
    data: emptyProjectLibrary(),
    hydrated: false,
    saving: false,
    readBlocked: false,
    error: null,
  };
  const listeners = new Set<() => void>();
  let hydration: Promise<void> | null = null;
  let writes = Promise.resolve();
  let queued = 0;
  const publish = (patch: Partial<ProjectLibrarySnapshot>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const hydrate = (retry = false): Promise<void> => {
    if (hydration) return hydration;
    if (state.hydrated && !retry) return Promise.resolve();
    hydration = (async () => {
      try {
        const parsed = parseProjectLibrary(await storage.getItem(PROJECT_LIBRARY_KEY));
        publish({
          data: parsed.data,
          hydrated: true,
          readBlocked: parsed.blocked,
          error: parsed.error,
        });
      } catch {
        publish({
          hydrated: true,
          readBlocked: true,
          error:
            'Your app library could not be loaded. Existing data has not been overwritten. Retry loading.',
        });
      }
    })().finally(() => {
      hydration = null;
    });
    return hydration;
  };
  const persist = () => {
    const serialized = JSON.stringify(state.data);
    queued++;
    publish({ saving: true });
    writes = writes.then(async () => {
      try {
        await storage.setItem(PROJECT_LIBRARY_KEY, serialized);
        publish({ error: null });
      } catch {
        publish({
          error:
            'Your app choices are kept in this session, but could not be saved on this device. Retry saving before leaving.',
        });
      } finally {
        queued--;
        publish({ saving: queued > 0 });
      }
    });
  };
  const change = (data: ProjectLibraryData) => {
    if (!state.hydrated || state.readBlocked) return false;
    if (JSON.stringify(data) === JSON.stringify(state.data)) return true;
    publish({ data });
    persist();
    return true;
  };
  const flush = async () => {
    let observed: Promise<void>;
    do {
      observed = writes;
      await observed;
    } while (observed !== writes);
    return !state.error && !state.readBlocked;
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate: () => hydrate(),
    select: (id: ProjectId) => isProjectId(id) && change(selectLibraryProject(state.data, id)),
    saveMap: (config: CampusCompassDraft) =>
      change({
        ...state.data,
        drafts: { ...state.data.drafts, map: normalizeCampusCompassDraft(config) },
      }),
    saveStudy: (draft: StudyBuddyDraft) =>
      change({
        ...state.data,
        drafts: { ...state.data.drafts, study: normalizeStudyDraft(draft) },
      }),
    flush,
    retry: async () => {
      if (state.readBlocked) await hydrate(true);
      else if (state.hydrated) persist();
      return flush();
    },
  };
}
