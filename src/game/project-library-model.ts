import { createCampusCompassDraft, normalizeCampusCompassDraft } from './templates/map/logic';
import type { CampusCompassDraft } from './templates/map/types';
import {
  createStudyBuddyDraft,
  normalizeStudyDraft,
  type StudyBuddyDraft,
} from './templates/study/model';

export const projectIds = ['lunch', 'map', 'study'] as const;
export type ProjectId = (typeof projectIds)[number];
export interface ProjectLibraryData {
  version: 1;
  selected: ProjectId;
  drafts: { map: CampusCompassDraft | null; study: StudyBuddyDraft | null };
}
export const projectDefinitions = [
  {
    id: 'lunch',
    title: 'Lunch Lens',
    description: 'Check lunch queues and post fresh updates.',
    icon: 'project',
  },
  {
    id: 'map',
    title: 'CampusCompass',
    description: 'Find campus routes and avoid stairs.',
    icon: 'discover',
  },
  {
    id: 'study',
    title: 'StudyBuddy',
    description: 'Practise with hints and answer checks.',
    icon: 'interview',
  },
] as const;
export function isProjectId(value: unknown): value is ProjectId {
  return typeof value === 'string' && projectIds.includes(value as ProjectId);
}
export function emptyProjectLibrary(): ProjectLibraryData {
  return { version: 1, selected: 'lunch', drafts: { map: null, study: null } };
}
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Future schema bytes stay untouched. Known fields are normalized by each template's owner. */
export function parseProjectLibrary(raw: string | null): {
  data: ProjectLibraryData;
  blocked: boolean;
  error: string | null;
} {
  const data = emptyProjectLibrary();
  if (!raw) return { data, blocked: false, error: null };
  try {
    const source = record(JSON.parse(raw));
    const drafts = record(source?.drafts);
    if (
      !source ||
      source.version !== 1 ||
      [drafts?.map, drafts?.study].some(
        (draft) => record(draft)?.version !== undefined && record(draft)?.version !== 1,
      )
    ) {
      return {
        data,
        blocked: true,
        error: 'Your saved app library uses a different format. Its data has not been replaced.',
      };
    }
    return {
      data: {
        version: 1,
        selected: isProjectId(source.selected) ? source.selected : 'lunch',
        drafts: {
          map: record(drafts?.map) ? normalizeCampusCompassDraft(drafts?.map) : null,
          study: record(drafts?.study) ? normalizeStudyDraft(drafts?.study) : null,
        },
      },
      blocked: false,
      error: null,
    };
  } catch {
    return {
      data,
      blocked: true,
      error:
        'Your saved app choices could not be read. They have not been replaced. Retry loading.',
    };
  }
}

/** Selecting another builder never copies or migrates the existing Lunch Lens adventure. */
export function selectLibraryProject(
  data: ProjectLibraryData,
  selected: ProjectId,
): ProjectLibraryData {
  return {
    ...data,
    selected,
    drafts: {
      map: selected === 'map' && !data.drafts.map ? createCampusCompassDraft() : data.drafts.map,
      study:
        selected === 'study' && !data.drafts.study ? createStudyBuddyDraft() : data.drafts.study,
    },
  };
}
