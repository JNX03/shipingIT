import { checkScreenDesign, requiredBlockKinds, type BlockKind } from '../logic/build';
import type { GameDraft, StageCheck } from '../types';

export const editorSteps = ['place', 'layout', 'style', 'try'] as const;
export type EditorStep = (typeof editorSteps)[number];
export type EditorPreviewAction = 'choose' | 'refresh';
export type EditorPreviewTest = { signature: string; actions: EditorPreviewAction[] };

export function nextEssentialBlock(design: GameDraft['design']): BlockKind | undefined {
  return requiredBlockKinds.find((kind) => !design.blocks.some((block) => block.kind === kind));
}

/** Tests belong to the exact layout the learner tried, including its style values. */
export function editorDesignSignature(design: GameDraft['design']): string {
  return JSON.stringify(design);
}

export function recordEditorPreviewAction(
  test: EditorPreviewTest | null,
  design: GameDraft['design'],
  action: EditorPreviewAction,
): EditorPreviewTest {
  const signature = editorDesignSignature(design);
  const actions = test?.signature === signature ? test.actions : [];
  return { signature, actions: [...new Set([...actions, action])] };
}

export function checkEditorStep(
  step: EditorStep,
  draft: GameDraft,
  test: EditorPreviewTest | null = null,
): StageCheck {
  if (step === 'place') {
    const missing = nextEssentialBlock(draft.design);
    return missing
      ? { valid: false, message: 'Add all four essential pieces before arranging your screen.' }
      : { valid: true, message: 'All four pieces are here. Now give each one its own space.' };
  }
  const layout = checkScreenDesign(draft);
  if (!layout.valid || step !== 'try') return layout;
  const actions = test?.signature === editorDesignSignature(draft.design) ? test.actions : [];
  if (!actions.includes('choose'))
    return { valid: false, message: 'Choose a stall in your screen to try the queue cards.' };
  if (!actions.includes('refresh'))
    return { valid: false, message: 'Tap Refresh board and watch the wait times change.' };
  return { valid: true, message: 'Both actions worked. Your screen is ready to connect.' };
}

/** Back/Next only changes the working step; it never transforms the saved draft. */
export function adjacentEditorStep(step: EditorStep, direction: -1 | 1): EditorStep {
  const index = editorSteps.indexOf(step);
  return editorSteps[Math.max(0, Math.min(editorSteps.length - 1, index + direction))];
}
