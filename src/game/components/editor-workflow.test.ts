import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyGameDraft } from '../state';
import { arrangeScreen, requiredBlockKinds } from '../logic/build';
import {
  adjacentEditorStep,
  checkEditorStep,
  nextEssentialBlock,
  recordEditorPreviewAction,
} from './editor-workflow';

function completeDraft() {
  const draft = emptyGameDraft();
  draft.design.blocks = requiredBlockKinds.map((kind) => ({
    id: `screen-${kind}`,
    kind,
    x: 16,
    y: 0,
  }));
  draft.design = arrangeScreen(draft.design);
  return draft;
}

test('placement reveals essentials in order and cannot advance with only one piece', () => {
  const draft = emptyGameDraft();
  assert.equal(nextEssentialBlock(draft.design), 'title');
  draft.design.blocks.push({ id: 'screen-title', kind: 'title', x: 16, y: 16 });
  assert.equal(nextEssentialBlock(draft.design), 'queue');
  assert.equal(checkEditorStep('place', draft).valid, false);
  const complete = completeDraft();
  assert.equal(nextEssentialBlock(complete.design), undefined);
  assert.equal(checkEditorStep('place', complete).valid, true);
});

test('having every piece permits arrangement but an overlap blocks styling and try', () => {
  const draft = completeDraft();
  draft.design.blocks[1].y = draft.design.blocks[0].y;
  assert.equal(checkEditorStep('place', draft).valid, true);
  assert.equal(checkEditorStep('layout', draft).valid, false);
  assert.equal(checkEditorStep('style', draft).valid, false);
  assert.equal(checkEditorStep('try', draft).valid, false);
});

test('try requires both real actions on the current draft and edits invalidate the test', () => {
  const draft = completeDraft();
  const refreshed = recordEditorPreviewAction(null, draft.design, 'refresh');
  assert.equal(checkEditorStep('try', draft, refreshed).valid, false);
  const played = recordEditorPreviewAction(refreshed, draft.design, 'choose');
  assert.equal(checkEditorStep('try', draft, played).valid, true);
  assert.equal(recordEditorPreviewAction(played, draft.design, 'choose').actions.length, 2);
  draft.design.radius = 20;
  assert.equal(checkEditorStep('try', draft, played).valid, false);
  const newTest = recordEditorPreviewAction(played, draft.design, 'refresh');
  assert.deepEqual(newTest.actions, ['refresh']);
  draft.design.blocks[1].y = draft.design.blocks[0].y;
  const bothInvalid = recordEditorPreviewAction(newTest, draft.design, 'choose');
  assert.equal(checkEditorStep('try', draft, bothInvalid).valid, false);
});

test('Back and Next traverse the learning steps in order and stay within their bounds', () => {
  assert.equal(adjacentEditorStep('place', -1), 'place');
  assert.equal(adjacentEditorStep('place', 1), 'layout');
  assert.equal(adjacentEditorStep('style', -1), 'layout');
  assert.equal(adjacentEditorStep('try', 1), 'try');
  let step = adjacentEditorStep('place', 1);
  const journey = ['place', step];
  step = adjacentEditorStep(step, 1);
  journey.push(step);
  step = adjacentEditorStep(step, 1);
  journey.push(step);
  step = adjacentEditorStep(step, -1);
  journey.push(step);
  assert.deepEqual(journey, ['place', 'layout', 'style', 'try', 'style']);
});
