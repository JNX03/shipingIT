import type { GameDraft, NpcId } from '../types';
import { hasRecordedEvidence } from '../logic/research';

export interface InterviewTask {
  npcId: NpcId;
  evidenceId: string;
  title: string;
  question: string;
  kind: 'clue' | 'assumption';
}
/** Guided questions still go through the same actual interview and provenance gate. */
export const interviewTasks: readonly InterviewTask[] = [
  {
    npcId: 'mali',
    evidenceId: 'mali-problem',
    title: 'Ask Mali about her last lunch break',
    question: 'Tell me about the last time you bought lunch.',
    kind: 'clue',
  },
  {
    npcId: 'mali',
    evidenceId: 'mali-person',
    title: 'Find out who shares the problem',
    question: 'Who has the hardest time choosing a lunch queue?',
    kind: 'clue',
  },
  {
    npcId: 'noa',
    evidenceId: 'noa-cause',
    title: 'Ask Noa why the information gets old',
    question: 'Why does the noticeboard become out of date?',
    kind: 'clue',
  },
  {
    npcId: 'noa',
    evidenceId: 'noa-claim',
    title: 'Spot an assumption at the canteen',
    question: 'Would everyone want a payment app? Have you asked them?',
    kind: 'assumption',
  },
  {
    npcId: 'ken',
    evidenceId: 'ken-need',
    title: 'Ask Ken what information he trusts',
    question: 'What information would help you decide whether a queue is worth the walk?',
    kind: 'clue',
  },
];
export function nextInterviewTask(draft: GameDraft, npcId?: NpcId) {
  return interviewTasks.find(
    (task) => (!npcId || task.npcId === npcId) && !hasRecordedEvidence(draft, task.evidenceId),
  );
}
