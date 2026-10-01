import type { Challenge, ChallengeAction, ChallengeCheck, ChallengeDraft } from './model';
import { interviewQuestionForClue, interviewQuestionIntent } from './registry';

export const INTERVIEW_RECENT_TURNS = 30;

/** Keep the conversation bounded while retaining the first authored reply for every discovered clue. */
export function rollingInterviewDialogue(dialogue: ChallengeDraft['dialogue']) {
  const firstClues = new Set<string>();
  const recentStart = Math.max(0, dialogue.length - INTERVIEW_RECENT_TURNS);
  return dialogue.filter((line, index) => {
    const firstClue = Boolean(line.clue && !firstClues.has(line.clue));
    if (line.clue) firstClues.add(line.clue);
    return firstClue || index >= recentStart;
  });
}

export function initialChallengeDraft(challenge: Challenge): ChallengeDraft {
  return {
    assignments: { ...challenge.initial },
    packed: [],
    dialogue: [],
    targetSize: challenge.needsSize ? 28 : 48,
    highContrast: !challenge.needsContrast,
    tests: null,
    failedRuns: 0,
  };
}
export function challengeFingerprint(draft: ChallengeDraft) {
  return JSON.stringify({
    assignments: Object.entries(draft.assignments).sort(([a], [b]) => a.localeCompare(b)),
    packed: [...draft.packed].sort(),
    targetSize: draft.targetSize,
    highContrast: draft.highContrast,
  });
}
export function challengeCost(challenge: Challenge, draft: ChallengeDraft) {
  return draft.packed.reduce(
    (total, id) => total + (challenge.items.find((item) => item.id === id)?.cost ?? 0),
    0,
  );
}

/** Resume at the first unpinned clue, including a revealed clue saved in the wrong slot. */
export function nextInterviewStep(challenge: Challenge, draft: ChallengeDraft) {
  if (challenge.kind !== 'interview') return undefined;
  for (const item of challenge.items) {
    const line = draft.dialogue.find((turn) => turn.clue === item.id);
    if (line && draft.assignments[item.id] === item.target) continue;
    const target = challenge.targets.find((destination) => destination.id === item.target);
    return {
      item,
      target,
      line,
      phase: line ? ('pin' as const) : ('ask' as const),
      question: interviewQuestionForClue(challenge, item.id),
      index: challenge.items.indexOf(item),
    };
  }
  return undefined;
}

export function interviewPlacementFeedback(
  challenge: Challenge,
  draft: ChallengeDraft,
  itemId: string,
  targetId: string,
): ChallengeCheck {
  const item = challenge.items.find((clue) => clue.id === itemId);
  if (challenge.kind !== 'interview' || !item)
    return { valid: false, message: 'Choose an interview clue.' };
  if (!draft.dialogue.some((turn) => turn.clue === item.id))
    return { valid: false, message: 'Ask about this experience before pinning the clue.' };
  const expected = challenge.targets.find((target) => target.id === item.target);
  const actual = challenge.targets.find((target) => target.id === targetId);
  if (targetId !== item.target || !expected)
    return {
      valid: false,
      message: `You chose “${actual?.title ?? 'an unknown destination'}”. This clue belongs under “${expected?.title ?? 'its evidence heading'}”. Pin it there to continue.`,
    };
  return { valid: true, message: `Pinned under “${expected.title}”. ${item.detail}` };
}

export function piecePlacementFeedback(
  challenge: Challenge,
  itemId: string,
  targetId: string,
): ChallengeCheck {
  const item = challenge.items.find((piece) => piece.id === itemId);
  const expected = challenge.targets.find((target) => target.id === item?.target);
  if (!item || !expected)
    return { valid: false, message: 'Select a piece with an evidence or action destination.' };
  return targetId === expected.id
    ? { valid: true, message: `“${item.title}” fits “${expected.title}”. ${item.detail}` }
    : {
        valid: false,
        message: `This ${['wire', 'repair'].includes(challenge.kind) ? 'action' : 'note'} belongs under “${expected.title}”. ${item.detail}`,
      };
}

export function challengeProblems(challenge: Challenge, draft: ChallengeDraft): string[] {
  if (challenge.kind === 'interview') {
    const step = nextInterviewStep(challenge, draft);
    if (!step) return [];
    return [
      step.phase === 'ask'
        ? `Ask about ${step.item.title.toLowerCase()}${step.question ? `: “${step.question}”` : '.'}`
        : `Pin “${step.item.title}” under “${step.target?.title ?? 'its evidence heading'}”.`,
    ];
  }
  const errors: string[] = [];
  if (challenge.kind === 'pack') {
    const used = challengeCost(challenge, draft);
    if (used > (challenge.budget ?? 0))
      errors.push(`${used}/${challenge.budget} points. Return an extra feature.`);
    for (const id of draft.packed) {
      const item = challenge.items.find((item) => item.id === id);
      if (!item) {
        errors.push('Unknown feature.');
        continue;
      }
      for (const dependency of item.requires ?? [])
        if (!draft.packed.includes(dependency))
          errors.push(
            `${item.title} needs ${challenge.items.find((part) => part.id === dependency)?.title}.`,
          );
    }
    for (const item of challenge.items)
      if (item.required && !draft.packed.includes(item.id))
        errors.push(`The first version needs ${item.title.toLowerCase()}.`);
  } else {
    for (const item of challenge.items) {
      if (draft.assignments[item.id] !== item.target)
        errors.push(
          `${item.title}: ${draft.assignments[item.id] ? 'try a different destination.' : 'place this piece.'}`,
        );
    }
  }
  if (challenge.needsSize && draft.targetSize < 48)
    errors.push('The main target is too small. Make it at least 48px.');
  if (challenge.needsContrast && !draft.highContrast)
    errors.push('The text needs stronger contrast.');
  return errors;
}
export function checkChallenge(challenge: Challenge, draft: ChallengeDraft): ChallengeCheck {
  if (challenge.kind === 'repair' && draft.failedRuns === 0)
    return { valid: false, message: 'Run the original tester journey before repairing it.' };
  const problems = challengeProblems(challenge, draft);
  if (problems.length) return { valid: false, message: problems[0] };
  if (
    ['wire', 'repair', 'layout'].includes(challenge.kind) &&
    (!draft.tests?.passed || draft.tests.fingerprint !== challengeFingerprint(draft))
  )
    return { valid: false, message: 'Run this version to check your changes.' };
  return {
    valid: true,
    message:
      challenge.kind === 'interview'
        ? 'Interview notes are pinned. Ready to keep your progress.'
        : 'This version works. Ready to keep it.',
  };
}
function reply(challenge: Challenge, draft: ChallengeDraft, question: string, replyVersion?: 2) {
  const normalized = question.toLowerCase();
  if (
    normalized.length < 8 ||
    /ignore (?:the |all )?instructions|reveal (?:all|the answer)|system prompt/.test(normalized)
  )
    return { question, reply: 'Ask me about a specific experience, or what happened next.' };
  const matches = challenge.items.filter((item) =>
    item.keywords?.some((word) => normalized.includes(word)),
  );
  // Unmarked saved questions retain their original matching behavior during replay.
  const intent = replyVersion === 2 ? interviewQuestionIntent(challenge, normalized) : undefined;
  const clue =
    (intent ? challenge.items.find((item) => item.id === intent) : undefined) ??
    matches.find((item) => !draft.dialogue.some((line) => line.clue === item.id)) ??
    matches[0];
  if (!clue)
    return {
      question,
      reply: `That is not something I can tell from this experience. ${draft.dialogue.some((line) => line.clue) ? 'Ask about the effect or the difficult part.' : 'Try asking what happened last time, or how I handle it now.'}`,
    };
  const previous = challenge.items[challenge.items.indexOf(clue) - 1];
  if (previous && !draft.dialogue.some((line) => line.clue === previous.id))
    return {
      question,
      reply: 'Let us start with what actually happened or what I do today. Then ask what followed.',
    };
  return { question, reply: clue.detail, clue: clue.id };
}
export function applyChallengeAction(
  challenge: Challenge,
  draft: ChallengeDraft,
  action: ChallengeAction,
): ChallengeDraft {
  if (challenge.kind === 'repair' && draft.failedRuns === 0 && action.type !== 'run') return draft;
  if (action.type === 'ask') {
    if (challenge.kind !== 'interview' || !action.question.trim()) return draft;
    return {
      ...draft,
      dialogue: rollingInterviewDialogue([
        ...draft.dialogue,
        reply(challenge, draft, action.question.trim().slice(0, 400), action.replyVersion),
      ]),
    };
  }
  if (action.type === 'run') {
    if (!['wire', 'repair', 'layout'].includes(challenge.kind)) return draft;
    const errors = challengeProblems(challenge, draft);
    const messages = (challenge.testCases ?? []).map((test) =>
      draft.assignments[test.action] === test.expected ? `${test.title}: passed.` : test.failure,
    );
    if (challenge.needsSize)
      messages.push(
        draft.targetSize >= 48
          ? 'Touch target: passed.'
          : 'Touch target: too small for the one-hand test.',
      );
    if (challenge.needsContrast)
      messages.push(
        draft.highContrast
          ? 'Bright-light reading: passed.'
          : 'Bright-light reading: the pale text is hard to read.',
      );
    return {
      ...draft,
      failedRuns: draft.failedRuns + (errors.length ? 1 : 0),
      tests: {
        fingerprint: challengeFingerprint(draft),
        passed: !errors.length,
        messages: messages.length
          ? messages
          : errors.length
            ? errors
            : ['The screen hierarchy works.'],
      },
    };
  }
  let next = { ...draft, tests: null };
  if (action.type === 'size')
    return challenge.needsSize
      ? { ...next, targetSize: Math.max(28, Math.min(64, Math.round(action.value))) }
      : draft;
  if (action.type === 'contrast')
    return challenge.needsContrast ? { ...next, highContrast: action.value } : draft;
  const item = challenge.items.find((entry) => entry.id === action.item);
  if (!item) return draft;
  if (action.type === 'pack' || action.type === 'unpack') {
    if (challenge.kind !== 'pack') return draft;
    return {
      ...next,
      packed:
        action.type === 'pack'
          ? [...new Set([...draft.packed, item.id])]
          : draft.packed.filter((id) => id !== item.id),
    };
  }
  if (action.type === 'unplace') {
    const assignments = { ...draft.assignments };
    delete assignments[item.id];
    return { ...next, assignments };
  }
  if (action.type === 'place') {
    if (!challenge.targets.some((target) => target.id === action.target)) return draft;
    if (challenge.kind === 'interview' && !draft.dialogue.some((line) => line.clue === item.id))
      return draft;
    const assignments = { ...draft.assignments };
    if (challenge.kind === 'layout') {
      const displaced = Object.entries(assignments).find(
        ([id, target]) => id !== item.id && target === action.target,
      )?.[0];
      if (displaced) {
        if (assignments[item.id]) assignments[displaced] = assignments[item.id];
        else delete assignments[displaced];
      }
    }
    assignments[item.id] = action.target;
    next = { ...next, assignments };
  }
  return next;
}
/** Parse only bounded user actions; saved success flags never become authority. */
export function parseChallengeAction(value: unknown): ChallengeAction | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as Record<string, unknown>;
  if (action.type === 'run') return { type: 'run' };
  if (action.type === 'ask' && typeof action.question === 'string')
    return {
      type: 'ask',
      question: action.question.slice(0, 400),
      ...(action.replyVersion === 2 ? { replyVersion: 2 as const } : {}),
    };
  if (action.type === 'size' && typeof action.value === 'number' && Number.isFinite(action.value))
    return { type: 'size', value: action.value };
  if (action.type === 'contrast' && typeof action.value === 'boolean')
    return { type: 'contrast', value: action.value };
  if (
    ['place', 'unplace', 'pack', 'unpack'].includes(String(action.type)) &&
    typeof action.item === 'string' &&
    action.item.length < 80
  ) {
    if (action.type === 'place')
      return typeof action.target === 'string' && action.target.length < 80
        ? { type: 'place', item: action.item, target: action.target }
        : null;
    return { type: action.type as 'unplace' | 'pack' | 'unpack', item: action.item };
  }
  return null;
}
export function replayChallenge(challenge: Challenge, actions: ChallengeAction[]) {
  return actions.reduce(
    (draft, action) => applyChallengeAction(challenge, draft, action),
    initialChallengeDraft(challenge),
  );
}

/** Preserve replay authority in the existing v1 action format, with no unbounded interview history. */
export function compactInterviewActions(challenge: Challenge, actions: ChallengeAction[]) {
  if (challenge.kind !== 'interview') return actions;
  const keep = new Set<number>();
  const discovered = new Set<string>();
  const recentAsks: number[] = [];
  const lastPlacement = new Map<string, number>();
  let draft = initialChallengeDraft(challenge);
  actions.forEach((action, index) => {
    const next = applyChallengeAction(challenge, draft, action);
    if (next === draft) return;
    if (action.type === 'ask') {
      const clue = next.dialogue.at(-1)?.clue;
      if (clue && !discovered.has(clue)) {
        discovered.add(clue);
        keep.add(index);
      }
      recentAsks.push(index);
      if (recentAsks.length > INTERVIEW_RECENT_TURNS) recentAsks.shift();
    } else if (action.type === 'place' || action.type === 'unplace') {
      lastPlacement.set(action.item, index);
    }
    draft = next;
  });
  recentAsks.forEach((index) => keep.add(index));
  lastPlacement.forEach((index) => keep.add(index));
  return actions.filter((_action, index) => keep.has(index));
}
