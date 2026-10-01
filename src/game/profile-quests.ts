import { isValidDateKey, toDateKey } from '../domain/progression';
import type { PersistedAppState } from '../domain/types';
import { adventureXP, type AdventureState } from './state';

export const dailyQuestDefinitions = [
  { id: 'first-step', title: 'Make one new step', detail: 'Complete 1 new stage, lesson, or practice.', target: 1, metric: 'steps', rewardXP: 10 },
  { id: 'two-steps', title: 'Keep building', detail: 'Complete 2 new stages, lessons, or practices.', target: 2, metric: 'steps', rewardXP: 15 },
  { id: 'earn-sparks', title: 'Learn and earn', detail: 'Earn 80 Sparks from new stages, lessons, or practices.', target: 80, metric: 'sparks', rewardXP: 20 },
] as const;
export type DailyQuestId = (typeof dailyQuestDefinitions)[number]['id'];

/** IDs are stable within a source. Dates are local calendar days of first completion. */
export interface QuestCompletion {
  id: string;
  completedAt: string | null;
  baseXP: number;
}
export interface QuestSourceSnapshot {
  id: string;
  completions: QuestCompletion[];
  /** Only immutable first-completion history may opt in. Undated stages never do. */
  allowInitialCredit?: boolean;
}
export interface QuestEvidence {
  date: string | null;
  baseXP: number;
}
export interface QuestClaim {
  day: string;
  questId: DailyQuestId;
  evidenceIds: string[];
}
export interface ProfileQuestState {
  version: 1;
  initializedSources: string[];
  evidence: Record<string, QuestEvidence>;
  claims: Record<string, QuestClaim>;
}
export function initialProfileQuests(): ProfileQuestState {
  return { version: 1, initializedSources: [], evidence: {}, claims: {} };
}
const validSource = (id: string) => /^[a-z][a-z0-9-]{0,31}$/.test(id);
const validId = (id: string) => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(id);
const validXP = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 1000;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export const questClaimKey = (day: string, id: DailyQuestId) => `${day}:${id}`;

/** First-seen evidence is immutable, including a null date used for an old-save baseline. */
export function observeQuestSources(
  state: ProfileQuestState,
  sources: QuestSourceSnapshot[],
  now = new Date(),
): ProfileQuestState {
  const today = toDateKey(now);
  const initialized = new Set(state.initializedSources);
  const evidence = { ...state.evidence };
  let changed = false;
  for (const source of sources) {
    if (!validSource(source.id)) continue;
    const baseline = !initialized.has(source.id);
    for (const completion of source.completions) {
      if (!validId(completion.id) || !validXP(completion.baseXP)) continue;
      const key = `${source.id}:${completion.id}`;
      if (evidence[key]) continue;
      const date = (!baseline || source.allowInitialCredit === true) &&
        isValidDateKey(completion.completedAt) && completion.completedAt <= today
        ? completion.completedAt : null;
      evidence[key] = { date, baseXP: completion.baseXP };
      changed = true;
    }
    if (baseline) {
      initialized.add(source.id);
      changed = true;
    }
  }
  return changed ? { ...state, initializedSources: [...initialized].sort(), evidence } : state;
}
export function selectDailyQuests(state: ProfileQuestState, now = new Date()) {
  const day = toDateKey(now);
  const evidence = Object.values(state.evidence).filter((item) => item.date === day);
  const sparks = evidence.reduce((sum, item) => sum + item.baseXP, 0);
  return dailyQuestDefinitions.map((quest) => {
    const progress = Math.min(quest.target, quest.metric === 'steps' ? evidence.length : sparks);
    const claimed = Boolean(state.claims[questClaimKey(day, quest.id)]);
    return { ...quest, day, progress, complete: progress >= quest.target, claimed, claimable: !claimed && progress >= quest.target };
  });
}
export function claimQuest(
  state: ProfileQuestState,
  id: DailyQuestId,
  day: string,
  now = new Date(),
): ProfileQuestState {
  if (day !== toDateKey(now)) return state;
  const quest = selectDailyQuests(state, now).find((item) => item.id === id);
  if (!quest?.claimable) return state;
  const claim: QuestClaim = {
    day,
    questId: id,
    evidenceIds: Object.keys(state.evidence).filter((key) => state.evidence[key]?.date === day).sort(),
  };
  return { ...state, claims: { ...state.claims, [questClaimKey(day, id)]: claim } };
}
export function questRewardXP(state: Pick<ProfileQuestState, 'claims'>): number {
  return Object.values(state.claims).reduce(
    (sum, claim) => sum + (dailyQuestDefinitions.find((quest) => quest.id === claim.questId)?.rewardXP ?? 0), 0,
  );
}
/** Quest rewards stay in their ledger; never add them into either source store's XP. */
export function totalProfileXP(
  app: Pick<PersistedAppState, 'xp'>,
  adventure: Pick<AdventureState, 'earned'>,
  quests: Pick<ProfileQuestState, 'claims'>,
  practiceXP = 0,
): number {
  return app.xp + adventureXP(adventure) + questRewardXP(quests) +
    (Number.isFinite(practiceXP) ? Math.max(0, practiceXP) : 0);
}

/** Fail closed: repairing a damaged claim ledger by dropping rows could award them twice. */
export function parseProfileQuests(raw: string | null): ProfileQuestState {
  if (raw === null) return initialProfileQuests();
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.initializedSources) ||
    !value.initializedSources.every((id) => typeof id === 'string' && validSource(id)) ||
    !isRecord(value.evidence) || !isRecord(value.claims)) throw new Error('Unsupported quest save');
  const state = initialProfileQuests();
  state.initializedSources = [...new Set(value.initializedSources as string[])].sort();
  for (const [id, item] of Object.entries(value.evidence)) {
    const [source, localId, extra] = id.split(':');
    if (!source || !localId || extra !== undefined || !validSource(source) || !validId(localId) ||
      !state.initializedSources.includes(source) || !isRecord(item) || !validXP(item.baseXP) ||
      (item.date !== null && !isValidDateKey(item.date))) throw new Error('Invalid quest evidence');
    state.evidence[id] = { date: item.date as string | null, baseXP: item.baseXP };
  }
  for (const [key, item] of Object.entries(value.claims)) {
    if (!isRecord(item) || !isValidDateKey(item.day) || !Array.isArray(item.evidenceIds) ||
      !item.evidenceIds.every((id) => typeof id === 'string') ||
      new Set(item.evidenceIds).size !== item.evidenceIds.length) throw new Error('Invalid quest claim');
    const quest = dailyQuestDefinitions.find((definition) => definition.id === item.questId);
    if (!quest || key !== questClaimKey(item.day, quest.id)) throw new Error('Invalid quest key');
    const supporting = item.evidenceIds.map((id) => state.evidence[id as string]);
    if (supporting.some((evidence) => !evidence || evidence.date !== item.day) ||
      (quest.metric === 'steps' ? supporting.length : supporting.reduce((sum, evidence) => sum + evidence!.baseXP, 0)) < quest.target)
      throw new Error('Unsupported quest claim');
    state.claims[key] = { day: item.day, questId: quest.id, evidenceIds: item.evidenceIds as string[] };
  }
  return state;
}
