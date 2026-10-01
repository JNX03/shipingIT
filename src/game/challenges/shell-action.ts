import { checkChallenge } from './logic';
import type { Challenge, ChallengeDraft } from './model';

/** The fixed dock runs the current build first, then saves the same tested build. */
export function challengeShellAction(challenge: Challenge, draft: ChallengeDraft) {
  if (!['wire', 'repair', 'layout'].includes(challenge.kind))
    return { type: 'finish' as const, title: 'Check my build' };
  if (checkChallenge(challenge, draft).valid)
    return { type: 'finish' as const, title: 'Finish practice' };
  return {
    type: 'run' as const,
    title: challenge.kind === 'repair' && draft.failedRuns === 0
      ? 'Run original journey'
      : draft.failedRuns > 0 ? 'Rerun this version' : 'Run this version',
  };
}
