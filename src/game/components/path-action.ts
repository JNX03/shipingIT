import { stageXP } from '../state';
import type { StageId } from '../types';

/** Historical rewards survive draft edits; a rebuilt stage never promises another award. */
export function adventurePathAction(
  stage: StageId,
  {
    completed,
    earned,
    started,
  }: {
    completed: readonly StageId[];
    earned: readonly StageId[];
    started: boolean;
  },
) {
  if (completed.includes(stage)) return 'Play again';
  if (earned.includes(stage)) return 'Rebuild stage';
  return `${started ? 'Continue' : 'Start'} +${stageXP[stage]} Sparks`;
}
