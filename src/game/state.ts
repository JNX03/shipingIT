import { isValidDateKey, toDateKey } from '../domain/progression';
import {
  checkResearchStage,
  evidenceById,
  hasRecordedEvidence,
  requiredEvidenceIds,
} from './logic/research';
import { checkBuildStage, checkPersonaWalkthrough, walkthroughs } from './logic/build';
import {
  stageIds,
  type GameDraft,
  type InterviewMessage,
  type NpcId,
  type StageCheck,
  type StageId,
} from './types';

export interface AdventureState {
  version: 1;
  draft: GameDraft;
  completed: StageId[];
  earned: StageId[];
  activityDates: string[];
  started: boolean;
}
export function emptyGameDraft(): GameDraft {
  return {
    projectName: 'Lunch Lens',
    explore: { visited: [], conversations: {}, evidenceIds: [] },
    insight: { slots: {}, statement: '' },
    scope: { featureIds: [] },
    design: { blocks: [], radius: 16, spacing: 8, alignment: 'left', accent: 'blue' },
    connect: { links: [] },
    launch: { fixedIssueIds: [], testRun: [], shipped: false },
  };
}
export function initialAdventure(): AdventureState {
  return {
    version: 1,
    draft: emptyGameDraft(),
    completed: [],
    earned: [],
    activityDates: [],
    started: false,
  };
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, max = 2000) => (typeof value === 'string' ? value.slice(0, max) : '');
const strings = (value: unknown, max = 50) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .slice(0, max * 2)
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.slice(0, 100)),
        ),
      ].slice(0, max)
    : [];
const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
const npcs: NpcId[] = ['mali', 'noa', 'ken'];
const slotIds = ['person', 'problem', 'cause', 'need', 'set-aside'];

function normalizeConversation(input: unknown, npc: NpcId): InterviewMessage[] {
  if (!Array.isArray(input)) return [];
  // Preserve early evidence and recent conversation while bounding corrupt oversized saves.
  const candidates = input.length > 320 ? [...input.slice(0, 80), ...input.slice(-240)] : input;
  const ids = new Set<string>();
  const messages = candidates.flatMap((entry, index): InterviewMessage[] => {
    const item = record(entry);
    if (!['learner', 'character'].includes(String(item.role)) || !text(item.text).trim()) return [];
    const role = item.role as InterviewMessage['role'];
    if (role === 'character' && item.source !== 'ai' && item.source !== 'scripted') return [];
    const base = text(item.id, 80) || `${npc}-message`;
    let id = base;
    if (ids.has(id) || !text(item.id)) id = `${base}-${index}`;
    while (ids.has(id)) id += '-r';
    ids.add(id);
    const evidence = evidenceById(text(item.evidenceId, 100));
    return [
      {
        id,
        role,
        text: text(item.text),
        source: role === 'learner' ? 'player' : (item.source as 'ai' | 'scripted'),
        ...(role === 'character' && evidence?.npcId === npc ? { evidenceId: evidence.id } : {}),
      },
    ];
  });
  if (messages.length <= 80) return messages;
  const keep = new Set<number>();
  const firstQuestion = messages.findIndex((message) => message.role === 'learner');
  if (firstQuestion >= 0) keep.add(firstQuestion);
  const seenClues = new Set<string>();
  messages.forEach((message, index) => {
    if (message.evidenceId && !seenClues.has(message.evidenceId)) {
      seenClues.add(message.evidenceId);
      keep.add(index);
    }
  });
  for (let index = messages.length - 1; index >= 0 && keep.size < 80; index--) keep.add(index);
  return [...keep].sort((a, b) => a - b).map((index) => messages[index]);
}

export function normalizeGameDraft(input: unknown): GameDraft {
  const root = record(input),
    explore = record(root.explore),
    insight = record(root.insight),
    scope = record(root.scope),
    design = record(root.design),
    connect = record(root.connect),
    launch = record(root.launch);
  const rawConversations = record(explore.conversations);
  const conversations: GameDraft['explore']['conversations'] = {};
  for (const npc of npcs) {
    if (Array.isArray(rawConversations[npc]))
      conversations[npc] = normalizeConversation(rawConversations[npc], npc);
  }
  const kinds = ['title', 'queue', 'updated', 'button', 'image', 'navigation'];
  const blocks: GameDraft['design']['blocks'] = Array.isArray(design.blocks)
    ? design.blocks.slice(0, 12).flatMap((entry) => {
        const block = record(entry);
        if (!kinds.includes(String(block.kind)) || !text(block.id, 64)) return [];
        return [
          {
            id: text(block.id, 64),
            kind: block.kind as GameDraft['design']['blocks'][number]['kind'],
            x: bounded(block.x, 0, 0, 1000),
            y: bounded(block.y, 0, 0, 1000),
          },
        ];
      })
    : [];
  const slots = record(insight.slots);
  const draft: GameDraft = {
    projectName: text(root.projectName, 80).trim() || 'Lunch Lens',
    explore: {
      visited: strings(explore.visited).filter((id): id is NpcId => npcs.includes(id as NpcId)),
      conversations,
      evidenceIds: strings(explore.evidenceIds).filter((id) => Boolean(evidenceById(id))),
    },
    insight: {
      slots: Object.fromEntries(
        slotIds
          .filter((key) => typeof slots[key] === 'string')
          .map((key) => [key, text(slots[key], 100)]),
      ),
      statement: text(insight.statement),
    },
    scope: { featureIds: strings(scope.featureIds, 12) },
    design: {
      blocks,
      radius: bounded(design.radius, 16, 0, 40),
      spacing: bounded(design.spacing, 8, 0, 32),
      alignment: design.alignment === 'center' ? 'center' : 'left',
      accent: design.accent === 'purple' ? 'purple' : design.accent === 'teal' ? 'teal' : 'blue',
    },
    connect: {
      links: Array.isArray(connect.links)
        ? connect.links.slice(0, 16).flatMap((entry) => {
            const link = record(entry);
            return text(link.from, 50) && text(link.to, 50)
              ? [{ from: text(link.from, 50), to: text(link.to, 50) }]
              : [];
          })
        : [],
    },
    launch: {
      fixedIssueIds: strings(launch.fixedIssueIds, 12).filter((id) =>
        walkthroughs.some((item) => item.issueId === id),
      ),
      testRun: strings(launch.testRun, 12).filter((id) => npcs.includes(id as NpcId)),
      shipped: launch.shipped === true,
    },
  };
  draft.launch.testRun = draft.launch.testRun.filter(
    (id) => checkPersonaWalkthrough(id as NpcId, draft).valid,
  );
  if (!checkBuildStage('launch', draft).valid) draft.launch.shipped = false;
  return draft;
}

export function checkAdventureStage(stage: StageId, draft: GameDraft): StageCheck {
  return stageIds.indexOf(stage) < 3
    ? checkResearchStage(stage, draft)
    : checkBuildStage(stage, draft);
}
export function validCompletedPrefix(requested: string[], draft: GameDraft): StageId[] {
  const completed: StageId[] = [];
  for (const id of stageIds) {
    if (!requested.includes(id) || !checkAdventureStage(id, draft).valid) break;
    completed.push(id);
  }
  return completed;
}
export function normalizeAdventure(input: unknown, now: Date = new Date()): AdventureState {
  const raw = record(input);
  const draft = normalizeGameDraft(raw.draft);
  const completed = validCompletedPrefix(strings(raw.completed), draft);
  const earned: StageId[] = [];
  const storedEarned = strings(raw.earned);
  for (const id of stageIds) {
    if (!storedEarned.includes(id) && !completed.includes(id)) break;
    earned.push(id);
  }
  const today = toDateKey(now);
  return {
    version: 1,
    draft,
    completed,
    earned,
    started: raw.started === true || earned.length > 0,
    activityDates: earned.length
      ? strings(raw.activityDates, 400)
          .filter((date) => isValidDateKey(date) && date <= today)
          .sort()
      : [],
  };
}
export function parseAdventure(
  raw: string | null,
  now: Date = new Date(),
): { state: AdventureState; recovered: boolean; incompatible: boolean } {
  if (raw === null) return { state: initialAdventure(), recovered: false, incompatible: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    const data = record(parsed);
    if (typeof data.version === 'number' && data.version > 1)
      return { state: initialAdventure(), recovered: false, incompatible: true };
    const state = normalizeAdventure(parsed, now);
    return {
      state,
      recovered: JSON.stringify(canonicalValue(state)) !== JSON.stringify(canonicalValue(parsed)),
      incompatible: false,
    };
  } catch {
    return { state: initialAdventure(), recovered: true, incompatible: false };
  }
}
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(record(value))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  return value;
}
export const stageXP: Record<StageId, number> = {
  explore: 60,
  insight: 40,
  scope: 50,
  design: 80,
  connect: 70,
  launch: 100,
};
export const adventureXP = (state: Pick<AdventureState, 'earned'>) =>
  [...new Set(state.earned)].reduce((sum, id) => sum + (stageXP[id] ?? 0), 0);

function fingerprint(id: StageId, draft: GameDraft) {
  if (id === 'scope') return JSON.stringify([...draft.scope.featureIds].sort());
  if (id === 'connect')
    return JSON.stringify(draft.connect.links.map((link) => `${link.from}>${link.to}`).sort());
  if (id === 'design')
    return JSON.stringify({
      ...draft.design,
      blocks: [...draft.design.blocks].sort((a, b) => a.id.localeCompare(b.id)),
    });
  if (id === 'launch')
    return JSON.stringify({
      ...draft.launch,
      fixedIssueIds: [...draft.launch.fixedIssueIds].sort(),
      testRun: [...draft.launch.testRun].sort(),
    });
  return JSON.stringify(draft[id]);
}
export function patchAdventure(state: AdventureState, patch: Partial<GameDraft>): AdventureState {
  const draft = normalizeGameDraft({ ...state.draft, ...patch });
  let changedAt: number = stageIds.length;
  for (const id of stageIds) {
    if (patch[id] === undefined) continue;
    const changed =
      id === 'explore'
        ? requiredEvidenceIds.some(
            (key) => hasRecordedEvidence(state.draft, key) && !hasRecordedEvidence(draft, key),
          ) || state.draft.explore.visited.some((npc) => !draft.explore.visited.includes(npc))
        : fingerprint(id, state.draft) !== fingerprint(id, draft);
    if (changed) changedAt = Math.min(changedAt, stageIds.indexOf(id));
  }
  let completed = state.completed.filter((id) => stageIds.indexOf(id) < changedAt);
  if (changedAt < stageIds.indexOf('launch'))
    draft.launch = { ...draft.launch, testRun: [], shipped: false };
  // Test-stage repairs co-submit their launch result. Never let that marker exempt
  // research changes, or preserve a prerequisite that the actual new draft fails.
  const launchRepair = Boolean(
    patch.launch &&
    (patch.design || patch.connect) &&
    !patch.explore &&
    !patch.insight &&
    !patch.scope &&
    state.completed.includes('connect'),
  );
  if (launchRepair) completed = state.completed.filter((id) => id !== 'launch');
  completed = validCompletedPrefix(completed, draft);
  return { ...state, draft, completed };
}
