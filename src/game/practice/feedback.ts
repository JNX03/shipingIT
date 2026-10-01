import { challengeCost, checkChallenge } from '../challenges/logic';
import type { Challenge, ChallengeDraft } from '../challenges/model';

export interface PracticeFeedbackRow {
  title: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export function practiceFeedback(challenge: Challenge, draft: ChallengeDraft) {
  const checked = checkChallenge(challenge, draft);
  const rows: PracticeFeedbackRow[] = [];
  const targetName = (id: string | undefined) =>
    challenge.targets.find((target) => target.id === id)?.title ?? 'Not connected';
  if (challenge.kind === 'pack') {
    const cost = challengeCost(challenge, draft);
    rows.push({
      title: 'Build budget',
      expected: `At most ${challenge.budget} points`,
      actual: `${cost} points used`,
      passed: cost <= (challenge.budget ?? 0),
    });
    for (const item of challenge.items) {
      if (item.required)
        rows.push({
          title: item.title,
          expected: 'Included in the first version',
          actual: draft.packed.includes(item.id) ? 'Packed' : 'Left on the shelf',
          passed: draft.packed.includes(item.id),
        });
      if (draft.packed.includes(item.id) && item.requires?.length) {
        const missing = item.requires.filter((id) => !draft.packed.includes(id));
        const names = (ids: string[]) =>
          ids.map((id) => challenge.items.find((part) => part.id === id)?.title ?? id).join(', ');
        rows.push({
          title: `${item.title} dependencies`,
          expected: names(item.requires),
          actual: missing.length ? `Missing: ${names(missing)}` : 'All dependencies packed',
          passed: !missing.length,
        });
      }
    }
  } else {
    for (const item of challenge.items) {
      if (challenge.kind === 'interview' && !draft.dialogue.some((line) => line.clue === item.id)) {
        rows.push({
          title: 'Evidence to uncover',
          expected: `Ask a specific follow-up about ${item.title.toLowerCase()}`,
          actual: 'No supporting reply found yet',
          passed: false,
        });
      } else {
        rows.push({
          title: item.title,
          expected: targetName(item.target),
          actual: targetName(draft.assignments[item.id]),
          passed: draft.assignments[item.id] === item.target,
        });
      }
    }
  }
  if (challenge.needsSize)
    rows.push({
      title: 'Touch target',
      expected: 'At least 48px',
      actual: `${draft.targetSize}px`,
      passed: draft.targetSize >= 48,
    });
  if (challenge.needsContrast)
    rows.push({
      title: 'Reading contrast',
      expected: 'Strong contrast',
      actual: draft.highContrast ? 'Strong contrast' : 'Pale text',
      passed: draft.highContrast,
    });
  if (challenge.kind === 'repair')
    rows.push({
      title: 'Investigate the original',
      expected: 'Observe a failed tester run before repairs',
      actual: draft.failedRuns
        ? 'Original failure observed'
        : 'Original journey has not failed yet',
      passed: draft.failedRuns > 0,
    });
  if (['layout', 'wire', 'repair'].includes(challenge.kind))
    rows.push({
      title: 'Test this version',
      expected: 'A passing run of the current draft',
      actual: draft.tests
        ? draft.tests.passed
          ? 'Current run passed'
          : 'Current run found failures'
        : 'Current draft has not been run',
      passed: Boolean(draft.tests?.passed),
    });
  return {
    valid: checked.valid,
    earned: 0 as const,
    message: checked.valid
      ? 'Your practice version works. You can try another attempt or choose another skill.'
      : checked.message,
    rows,
  };
}
