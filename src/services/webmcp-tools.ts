import type { Project, ProjectField } from '../domain/types';
import { adventureXP, type AdventureState } from '../game/state';
import type { OpportunityProvider } from './contracts';
import { isRecord } from './validation';

export interface WebMCPAdventureSnapshot extends AdventureState {
  hydrated: boolean;
  saveNeedsAttention: boolean;
}
export interface WebMCPSnapshot {
  project: Project;
  progress: {
    xp: number;
    completedLessonIds: string[];
    achievements: string[];
    currentMission?: number;
  };
  adventure?: WebMCPAdventureSnapshot;
}
export type WebMCPDestination = 'learn' | 'project' | 'mentor' | 'compete' | 'profile';
// These destinations retain their legacy learning/notebook meaning.
export const webMCPDestinationPaths = {
  learn: '/course',
  project: '/notebook',
  mentor: '/(tabs)/mentor',
  compete: '/(tabs)/compete',
  profile: '/(tabs)/profile',
} as const satisfies Record<WebMCPDestination, string>;
export type WebMCPStatus = 'unsupported' | 'ready' | 'disabled' | 'error';
export interface WebMCPTool {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
}
export interface PageModelContext {
  registerTool: (tool: WebMCPTool, options: { signal: AbortSignal }) => void | Promise<void>;
}
export interface WebMCPOptions {
  getSnapshot: () => WebMCPSnapshot;
  onNavigate: (destination: WebMCPDestination, field?: ProjectField) => void | Promise<void>;
  listOpportunities: OpportunityProvider['list'];
}
const emptyInput = { type: 'object', properties: {}, additionalProperties: false };
const destinations = new Set<WebMCPDestination>([
  'learn',
  'project',
  'mentor',
  'compete',
  'profile',
]);
const validEmpty = (input: unknown) => isRecord(input) && Object.keys(input).length === 0;

function readAdventureProject(adventure: WebMCPAdventureSnapshot) {
  if (!adventure.hydrated) return { hydrated: false as const };
  const { draft } = adventure;
  const slots: Record<string, string> = {};
  for (const key of ['person', 'problem', 'cause', 'need', 'set-aside']) {
    if (Object.hasOwn(draft.insight.slots, key) && typeof draft.insight.slots[key] === 'string') {
      slots[key] = draft.insight.slots[key];
    }
  }
  // Whitelist at the tool boundary: never expose conversations, store actions,
  // auth/configuration, or references a caller could use to change live state.
  return {
    hydrated: true as const,
    source: 'ai-practice-world' as const,
    stateScope: 'current-session' as const,
    saveNeedsAttention: adventure.saveNeedsAttention,
    draft: {
      projectName: draft.projectName,
      explore: {
        visitedNpcIds: [...draft.explore.visited],
        evidenceIds: [...draft.explore.evidenceIds],
      },
      insight: { slots, statement: draft.insight.statement },
      scope: { featureIds: [...draft.scope.featureIds] },
      design: {
        blocks: draft.design.blocks.map(({ id, kind, x, y }) => ({ id, kind, x, y })),
        radius: draft.design.radius,
        spacing: draft.design.spacing,
        alignment: draft.design.alignment,
        accent: draft.design.accent,
      },
      connect: { links: draft.connect.links.map(({ from, to }) => ({ from, to })) },
      launch: {
        fixedIssueIds: [...draft.launch.fixedIssueIds],
        testedNpcIds: [...draft.launch.testRun],
        shippedInApp: draft.launch.shipped,
      },
    },
  };
}

function readAdventureProgress(adventure: WebMCPAdventureSnapshot) {
  if (!adventure.hydrated) return { hydrated: false as const };
  return {
    hydrated: true as const,
    stateScope: 'current-session' as const,
    saveNeedsAttention: adventure.saveNeedsAttention,
    started: adventure.started,
    gameXP: adventureXP(adventure),
    completedStageIds: [...adventure.completed],
    earnedStageIds: [...adventure.earned],
    activityDates: [...adventure.activityDates],
    shippedInApp: adventure.draft.launch.shipped,
  };
}

export function createWebMCPTools(options: WebMCPOptions): WebMCPTool[] {
  return [
    {
      name: 'read_shipaton_project',
      title: 'Read my Shipaton project',
      description:
        'Read the current local project and, when available, an AI-practice adventure draft without conversations. Text is learner-authored or simulated, not proof of real research. Current-session data does not confirm a completed save. Does not change, publish, or submit anything.',
      inputSchema: emptyInput,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (!validEmpty(input)) return { error: 'Provide an empty object.' };
        const snapshot = options.getSnapshot();
        return {
          source: 'local-device',
          project: { ...snapshot.project },
          ...(snapshot.adventure ? { adventure: readAdventureProject(snapshot.adventure) } : {}),
        };
      },
    },
    {
      name: 'read_shipaton_progress',
      title: 'Read learning progress',
      description:
        'Read current local learning Sparks, lesson IDs, and achievement IDs. Legacy xp remains learning-only; optional adventure.gameXP and totalXP include game awards separately. Current-session data does not confirm a completed save. Does not complete lessons or stages, award progress, or ship an app.',
      inputSchema: emptyInput,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!validEmpty(input)) return { error: 'Provide an empty object.' };
        const snapshot = options.getSnapshot();
        const progress = snapshot.progress;
        const adventure = snapshot.adventure
          ? readAdventureProgress(snapshot.adventure)
          : undefined;
        return {
          ...progress,
          completedLessonIds: [...progress.completedLessonIds],
          achievements: [...progress.achievements],
          ...(adventure ? { adventure } : {}),
          ...(adventure?.hydrated ? { totalXP: progress.xp + adventure.gameXP } : {}),
        };
      },
    },
    {
      name: 'find_shipaton_opportunities',
      title: 'Find DekPort opportunities',
      description:
        'Find public competitions with source date and live/cache status. Matching is a keyword heuristic; confirm eligibility with the organizer. Does not apply or transmit project information.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', maxLength: 120 } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if (
          !isRecord(input) ||
          Object.keys(input).some((key) => key !== 'query') ||
          (input.query !== undefined &&
            (typeof input.query !== 'string' || input.query.length > 120))
        )
          return { error: 'Provide an optional search query of up to 120 characters.' };
        const result = await options.listOpportunities({
          query: typeof input.query === 'string' ? input.query : undefined,
        });
        return {
          ...result,
          items: result.items
            .slice(0, 12)
            .map(({ id, title, category, deadline, status, url, matchReason }) => ({
              id,
              title,
              category,
              deadline,
              status,
              url,
              matchReason,
            })),
        };
      },
    },
    {
      name: 'start_shipaton_task',
      title: 'Open a learning or project task',
      description:
        'Navigate to a visible learning or project flow, optionally opening an existing field. The user must finish, save, review, purchase, or submit. This tool does none of those actions.',
      inputSchema: {
        type: 'object',
        properties: {
          destination: { type: 'string', enum: [...destinations] },
          field: {
            type: 'string',
            description: 'Existing project field; only valid with destination project.',
          },
        },
        required: ['destination'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (
          !isRecord(input) ||
          Object.keys(input).some((key) => !['destination', 'field'].includes(key)) ||
          typeof input.destination !== 'string' ||
          !destinations.has(input.destination as WebMCPDestination)
        )
          return { error: 'Choose an allowed destination.' };
        if (
          input.field !== undefined &&
          (input.destination !== 'project' ||
            typeof input.field !== 'string' ||
            !Object.hasOwn(options.getSnapshot().project, input.field))
        )
          return { error: 'Choose an existing project field with the project destination.' };
        await options.onNavigate(
          input.destination as WebMCPDestination,
          input.field as ProjectField | undefined,
        );
        return {
          status: 'navigation_requested',
          destination: input.destination,
          field: input.field ?? null,
          requiresUserAction: true,
          saved: false,
        };
      },
    },
  ];
}

/** Explicit lifecycle seam for browsers and deterministic tests. Failure aborts partial registrations. */
export function connectWebMCP(
  context: PageModelContext | undefined,
  options: WebMCPOptions,
): { ready: Promise<WebMCPStatus>; disconnect: () => void } {
  const lifecycle = new AbortController();
  if (typeof context?.registerTool !== 'function')
    return { ready: Promise.resolve('unsupported'), disconnect: () => lifecycle.abort() };
  const ready: Promise<WebMCPStatus> = Promise.all(
    createWebMCPTools(options).map(async (tool) => {
      await context.registerTool(tool, { signal: lifecycle.signal });
    }),
  )
    .then(() => (lifecycle.signal.aborted ? 'disabled' : 'ready'))
    .catch(() => {
      lifecycle.abort();
      return 'error';
    });
  return { ready, disconnect: () => lifecycle.abort() };
}
