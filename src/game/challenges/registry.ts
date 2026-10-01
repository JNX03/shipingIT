import type { Challenge } from './model';

/** Authored question ideas for the existing fictional replies; these do not call an AI service. */
const interviewIdeas: Record<string, Record<string, string>> = {
  'explore-last-time': {
    event: 'What happened on your last shuttle trip?',
    impact: 'What was the impact on your lab?',
  },
  'explore-workaround': {
    notebook: 'How do you handle lost items now?',
    search: 'What is difficult about searching the handwritten pages?',
  },
  'explore-library-handoff': {
    'catalog-claim': 'What happened during your last library visit?',
    'wasted-walk': 'What was the impact of the wasted walk?',
    'handoff-question': 'What still needs checking before promising live availability?',
  },
  'explore-club-room': {
    'room-change': 'What happened at the last club meeting?',
    'missed-start': 'What was the impact of missing the start?',
    'reminder-question': 'What is still unknown about reminders reaching members?',
  },
};

export function interviewQuestionIdeas(challenge: Challenge): string[] {
  if (challenge.kind !== 'interview') return [];
  const ideas = interviewIdeas[challenge.id];
  return challenge.items.flatMap((item) => (ideas?.[item.id] ? [ideas[item.id]] : []));
}

/** The next-clue CTA uses the same authored question that replay can recognize. */
export function interviewQuestionForClue(challenge: Challenge, clueId: string): string | undefined {
  if (challenge.kind !== 'interview' || !challenge.items.some((item) => item.id === clueId))
    return undefined;
  return interviewIdeas[challenge.id]?.[clueId];
}

/** New-version intent only. The caller retains legacy matching and prior-clue eligibility checks. */
export function interviewQuestionIntent(
  challenge: Challenge,
  normalizedQuestion: string,
): string | undefined {
  if (challenge.kind !== 'interview') return undefined;
  const question = normalizedQuestion.trim().toLowerCase();
  const guidedClue = challenge.items.find(
    (item) => interviewQuestionForClue(challenge, item.id)?.toLowerCase() === question,
  );
  if (guidedClue) return guidedClue.id;
  // A factual-event question can mention stale availability or reminders without asking about a future promise.
  if (/\bwhat\s+(?:actually\s+)?happened\b/.test(question)) return undefined;
  if (challenge.id === 'explore-library-handoff') {
    const owner =
      /\bwho\s+(?:(?:can|could|will|would|should)\s+(?:keep|maintain|update|refresh)|keeps|maintains|updates|refreshes|owns|is\s+(?:responsible|in charge))\b/.test(
        question,
      ) && /\b(?:copy|copies|holds?|catalog|availability|handoff)\b/.test(question);
    const uncertainty =
      /\b(?:unknown|uncertain|unsure|still|confirm|check|checking|verify|whether)\b/.test(
        question,
      ) &&
      /\b(?:holds?|handoff|availability|catalog|staff|returned copy|returned copies)\b/.test(
        question,
      ) &&
      /\b(?:update|updated|updates|updating|keep|refresh|current|quickly|how fast|live)\b/.test(
        question,
      );
    if ((owner || uncertainty) && challenge.items.some((item) => item.id === 'handoff-question'))
      return 'handoff-question';
  }
  if (challenge.id === 'explore-club-room') {
    const reminderPreference =
      /\b(?:reminders?|alerts?|notifications?)\b/.test(question) &&
      /\b(?:will|would|can|could|do|does|how many|whether|still|unknown|uncertain|check|checking|confirm)\b/.test(
        question,
      ) &&
      /\b(?:silence|silenced|silencing|mute|muted|muting|preferences?|opt out|receive|receives|reach|reaches|reaching|want)\b/.test(
        question,
      );
    if (reminderPreference && challenge.items.some((item) => item.id === 'reminder-question'))
      return 'reminder-question';
  }
  return undefined;
}
