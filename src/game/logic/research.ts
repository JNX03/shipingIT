import type { GameDraft, InterviewMessage, NpcId, StageCheck, StageId } from '../types';

export interface ResearchNpc {
  id: NpcId;
  name: string;
  role: string;
  location: string;
  position: { x: number; y: number };
  greeting: string;
  prompts: string[];
  evidenceIds: string[];
}
export const researchNpcs: ResearchNpc[] = [
  {
    id: 'mali',
    name: 'Mali',
    role: 'Student',
    location: 'Courtyard',
    position: { x: 0.27, y: 0.66 },
    greeting: 'Hi! I have twelve minutes before class. I’m deciding whether I can get lunch.',
    prompts: [
      'Tell me about the last time you bought lunch.',
      'Who has the hardest time choosing a lunch queue?',
    ],
    evidenceIds: ['mali-person', 'mali-problem'],
  },
  {
    id: 'noa',
    name: 'Noa',
    role: 'Canteen staff',
    location: 'Food stall',
    position: { x: 0.72, y: 0.32 },
    greeting:
      'Hello! I look after this stall. What would you like to find out about the lunch rush?',
    prompts: [
      'How do people find out when the queue changes?',
      'Why does the noticeboard become out of date?',
    ],
    evidenceIds: ['noa-cause', 'noa-claim'],
  },
  {
    id: 'ken',
    name: 'Ken',
    role: 'Campus runner',
    location: 'Sports path',
    position: { x: 0.78, y: 0.73 },
    greeting:
      'Hey! I’m heading to practice. I need to decide where to eat before walking across campus.',
    prompts: [
      'How do you decide whether a queue is worth the walk?',
      'What information would help you make that decision?',
    ],
    evidenceIds: ['ken-need'],
  },
];
export const NPCS = researchNpcs;
export type InsightSlotId = 'person' | 'problem' | 'cause' | 'need';
export interface ResearchEvidence {
  id: string;
  npcId: NpcId;
  title: string;
  quote: string;
  meaning: string;
  slot: InsightSlotId | null;
  kind: 'observation' | 'claim';
}
export const researchEvidence: ResearchEvidence[] = [
  {
    id: 'mali-person',
    npcId: 'mali',
    title: 'A short lunch break',
    quote:
      'My class break is twelve minutes. Other students in my timetable have the same problem.',
    meaning: 'Students with short breaks between classes',
    slot: 'person',
    kind: 'observation',
  },
  {
    id: 'mali-problem',
    npcId: 'mali',
    title: 'A wasted walk',
    quote:
      'Yesterday I walked to the noodle stall. The line was much longer than I expected, so I left without lunch.',
    meaning: 'Cannot judge the queue before walking to the stall',
    slot: 'problem',
    kind: 'observation',
  },
  {
    id: 'noa-cause',
    npcId: 'noa',
    title: 'The board is old',
    quote:
      'We write the queue on the board at opening. It changes during lunch, but the board has no time or quick way to update it.',
    meaning: 'Queue information becomes stale and has no update time',
    slot: 'cause',
    kind: 'observation',
  },
  {
    id: 'ken-need',
    npcId: 'ken',
    title: 'Fresh information',
    quote:
      'I need to see the queue and when someone checked it. A prediction alone would not tell me if it is still true.',
    meaning: 'A recent queue report with a visible update time',
    slot: 'need',
    kind: 'observation',
  },
  {
    id: 'noa-claim',
    npcId: 'noa',
    title: 'A tempting claim',
    quote: 'Everybody would love a payment app. Well… I haven’t actually asked them.',
    meaning: 'An opinion about payments, not evidence of the queue problem',
    slot: null,
    kind: 'claim',
  },
];
export const EVIDENCE = researchEvidence;
export const insightSlots: {
  id: InsightSlotId;
  title: string;
  question: string;
  connector: string;
}[] = [
  { id: 'person', title: 'Person', question: 'Who is affected?', connector: 'For…' },
  {
    id: 'problem',
    title: 'Problem',
    question: 'What goes wrong?',
    connector: 'it is difficult to…',
  },
  { id: 'cause', title: 'Cause', question: 'Why does it happen?', connector: 'because…' },
  { id: 'need', title: 'Need', question: 'What would help?', connector: 'so they need…' },
];
export const INSIGHT_SLOTS = insightSlots;
export const requiredEvidenceIds = [
  'mali-person',
  'mali-problem',
  'noa-cause',
  'ken-need',
] as const;
export function evidenceById(id: string) {
  return researchEvidence.find((item) => item.id === id);
}
export function npcById(id: NpcId) {
  return researchNpcs.find((item) => item.id === id)!;
}

/** Authored roleplay: never a claim that these conversations or observations happened in real life. */
export function scriptedInterview({
  npcId,
  question,
  history,
}: {
  npcId: NpcId;
  question: string;
  history: InterviewMessage[];
  projectName?: string;
}): { text: string; source: 'scripted'; evidenceId?: string } {
  const q = question.trim().toLowerCase();
  const revealed = new Set(history.map((message) => message.evidenceId).filter(Boolean));
  let evidenceId: string | undefined;
  if (/^(hi|hello|hey|สวัสดี)[.!\s]*$/i.test(q))
    return {
      text: npcById(npcId).greeting + ' Ask me about the last time I had to choose a queue.',
      source: 'scripted',
    };
  if (q.length < 6)
    return {
      text: 'Could you ask a little more? Try asking about a specific moment in my day.',
      source: 'scripted',
    };
  if (/password|secret|system prompt|ignore.*instruction/i.test(q))
    return {
      text: 'Let’s stay with our campus story. Ask what happens during the lunch rush.',
      source: 'scripted',
    };
  if (npcId === 'mali') {
    if (
      /who|student|class|break|timetable|คน|ใคร|เรียน|พัก/.test(q) &&
      !/last time|yesterday|happened|ล่าสุด|เมื่อวาน/.test(q)
    )
      evidenceId = 'mali-person';
    else if (/queue|wait|last|happen|lunch|problem|walk|tell|คิว|รอ|อาหาร|เดิน|เกิด/.test(q))
      evidenceId = 'mali-problem';
    else
      return {
        text: 'I can tell you who has a short break, or what happened on my last walk to lunch. Which part are you curious about?',
        source: 'scripted',
      };
  } else if (npcId === 'noa') {
    if (/payment|pay|buy.*app|would.*app|everyone|จ่าย|ซื้อ.*แอป/.test(q)) evidenceId = 'noa-claim';
    else if (
      /why|how|queue|board|change|update|time|tell|notice|ทำไม|อย่างไร|คิว|เวลา|เปลี่ยน/.test(q)
    )
      evidenceId = 'noa-cause';
    else
      return {
        text: 'At lunch the queue changes much faster than our noticeboard. Ask how we update it, or what I am assuming about a new app.',
        source: 'scripted',
      };
  } else {
    if (
      /how|what|need|help|choose|queue|check|time|last|tell|prediction|อย่างไร|อะไร|คิว|เวลา|ช่วย/.test(
        q,
      )
    )
      evidenceId = 'ken-need';
    else
      return {
        text: 'I have to choose before walking over. Ask what information I trust when deciding where to eat.',
        source: 'scripted',
      };
  }
  const evidence = evidenceById(evidenceId)!;
  const followup =
    npcId === 'mali'
      ? evidenceId === 'mali-person'
        ? 'Do you want to hear what happened yesterday?'
        : 'Ask who else shares my short timetable.'
      : npcId === 'noa' && evidenceId === 'noa-claim'
        ? 'That is my guess. It does not explain the queue problem.'
        : npcId === 'noa'
          ? 'A useful follow-up is who could make a small update while we are busy.'
          : 'Would your first version show when its information was last checked?';
  return {
    text: `${revealed.has(evidence.id) ? 'To be clear: ' : ''}${evidence.quote} ${followup}`,
    source: 'scripted',
    evidenceId,
  };
}

export function hasRecordedEvidence(draft: GameDraft, id: string) {
  const evidence = evidenceById(id);
  if (!evidence || !draft.explore.evidenceIds.includes(id)) return false;
  const history = draft.explore.conversations[evidence.npcId] ?? [];
  return (
    history.some((message) => message.role === 'learner' && message.text.trim().length > 0) &&
    history.some(
      (message) =>
        message.role === 'character' &&
        message.evidenceId === id &&
        (message.source === 'ai' || message.source === 'scripted'),
    )
  );
}
export function insightSentence(slots: Record<string, string>) {
  const part = (id: InsightSlotId) => evidenceById(slots[id])?.meaning.toLowerCase() ?? '___';
  return `For ${part('person')}, the problem is: ${part('problem')}. This happens because ${part('cause')}. They need ${part('need')}.`;
}
export function checkEvidenceSlot(slot: string, evidenceId: string): StageCheck {
  const evidence = evidenceById(evidenceId);
  const expected = insightSlots.find((item) => item.id === slot);
  if (!expected || !evidence)
    return { valid: false, message: 'Choose a collected evidence card and a puzzle space.' };
  if (evidence.kind === 'claim')
    return {
      valid: false,
      message:
        'This is an unsupported payment opinion. Put it in the “Set aside” area, not your insight.',
    };
  return evidence.slot === slot
    ? { valid: true, message: `${expected.title} connected: ${evidence.meaning}.` }
    : {
        valid: false,
        message: `${expected.title} asks “${expected.question}” This card explains ${evidence.slot}. Try another space.`,
      };
}

export const SCOPE_BUDGET = 7;
export interface ResearchFeature {
  id: string;
  title: string;
  cost: number;
  description: string;
  requires: string[];
  core: boolean;
  shape: number;
}
export const researchFeatures: ResearchFeature[] = [
  {
    id: 'queue-board',
    title: 'Queue board',
    cost: 3,
    description: 'Show the latest queue report before the walk.',
    requires: [],
    core: true,
    shape: 3,
  },
  {
    id: 'freshness',
    title: 'Updated time',
    cost: 2,
    description: 'Make old information visible.',
    requires: ['queue-board'],
    core: true,
    shape: 2,
  },
  {
    id: 'report-update',
    title: 'Report a queue',
    cost: 2,
    description: 'Give people a quick way to refresh the report.',
    requires: ['queue-board'],
    core: true,
    shape: 2,
  },
  {
    id: 'favorite-stall',
    title: 'Favorite stalls',
    cost: 2,
    description: 'Save a preferred stall for later.',
    requires: ['queue-board'],
    core: false,
    shape: 2,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    cost: 3,
    description: 'Send alerts when a new report arrives.',
    requires: ['report-update'],
    core: false,
    shape: 3,
  },
  {
    id: 'ai-predictions',
    title: 'AI predictions',
    cost: 5,
    description: 'Predict future queues; needs reports first.',
    requires: ['report-update'],
    core: false,
    shape: 5,
  },
  {
    id: 'payments',
    title: 'Payments',
    cost: 4,
    description: 'Take payment, including account handling.',
    requires: ['accounts'],
    core: false,
    shape: 4,
  },
  {
    id: 'accounts',
    title: 'Accounts',
    cost: 2,
    description: 'Build sign-in and account recovery.',
    requires: [],
    core: false,
    shape: 2,
  },
];
export const FEATURES = researchFeatures;
export const coreFeatureIds = researchFeatures.filter((item) => item.core).map((item) => item.id);
export function featureById(id: string) {
  return researchFeatures.find((item) => item.id === id);
}
export function featureCost(ids: string[]) {
  return [...new Set(ids)].reduce((sum, id) => sum + (featureById(id)?.cost ?? 0), 0);
}
export function scopeProblems(ids: string[]) {
  const errors: string[] = [];
  if (new Set(ids).size !== ids.length) errors.push('Each feature can only be packed once.');
  if (ids.some((id) => !featureById(id))) errors.push('Remove the unknown feature.');
  const used = featureCost(ids);
  if (used > SCOPE_BUDGET)
    errors.push(`Over budget by ${used - SCOPE_BUDGET}. Move an extra feature out of the tray.`);
  for (const id of ids) {
    const feature = featureById(id);
    for (const dependency of feature?.requires ?? []) {
      if (!ids.includes(dependency))
        errors.push(`${feature!.title} needs ${featureById(dependency)!.title}.`);
    }
  }
  return errors;
}
export function checkResearchStage(stageId: StageId, draft: GameDraft): StageCheck {
  if (stageId === 'explore') {
    const unvisited = researchNpcs.filter((npc) => !draft.explore.visited.includes(npc.id));
    if (unvisited.length)
      return {
        valid: false,
        message: `Visit ${unvisited.map((npc) => npc.name).join(', ')} on the map.`,
      };
    const missing = requiredEvidenceIds.filter((id) => !hasRecordedEvidence(draft, id));
    if (missing.length)
      return {
        valid: false,
        message: `Collect “${evidenceById(missing[0])!.title}” by asking ${npcById(evidenceById(missing[0])!.npcId).name} a useful follow-up.`,
      };
    return {
      valid: true,
      message: 'Four useful clues, three different perspectives. Build your insight.',
    };
  }
  if (stageId === 'insight') {
    for (const slot of insightSlots) {
      const id = draft.insight.slots[slot.id];
      if (!id || !hasRecordedEvidence(draft, id))
        return {
          valid: false,
          message: `Fill ${slot.title.toLowerCase()} with a card you collected in the conversations.`,
        };
      const check = checkEvidenceSlot(slot.id, id);
      if (!check.valid) return check;
    }
    if (new Set(insightSlots.map((slot) => draft.insight.slots[slot.id])).size !== 4)
      return { valid: false, message: 'Use a different clue for each puzzle space.' };
    if (draft.insight.slots['set-aside'] !== 'noa-claim')
      return {
        valid: false,
        message: 'Set aside the unsupported payment claim before continuing.',
      };
    return { valid: true, message: 'Your insight connects the person, problem, cause and need.' };
  }
  if (stageId === 'scope') {
    const errors = scopeProblems(draft.scope.featureIds);
    if (errors.length) return { valid: false, message: errors[0] };
    const missing = coreFeatureIds.find((id) => !draft.scope.featureIds.includes(id));
    if (missing)
      return {
        valid: false,
        message: `Your first version still needs ${featureById(missing)!.title.toLowerCase()}: ${featureById(missing)!.description}`,
      };
    return {
      valid: true,
      message: 'One complete queue-checking loop fits the seven-point build budget.',
    };
  }
  return { valid: false, message: 'Choose a research stage.' };
}
