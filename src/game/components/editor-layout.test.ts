import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameDraft } from '../types';
import {
  arrangeScreen,
  blockDefinitions,
  checkScreenDesign,
  PHONE_HEIGHT,
  requiredBlockKinds,
} from '../logic/build';
import {
  editorSpacingLimit,
  findEditorSlot,
  placeEditorBlock,
  spaceEditorBlocks,
} from './editor-layout';

function draft(): GameDraft {
  return {
    projectName: 'Lunch board',
    explore: { visited: [], conversations: {}, evidenceIds: [] },
    insight: { slots: {}, statement: '' },
    scope: { featureIds: [] },
    design: { blocks: [], radius: 16, spacing: 8, alignment: 'left', accent: 'blue' },
    connect: { links: [] },
    launch: { fixedIssueIds: [], testRun: [], shipped: false },
  };
}

test('tap placement builds all required blocks with real open slots', () => {
  const state = draft();
  for (const kind of requiredBlockKinds) {
    const slot = findEditorSlot(state.design, kind);
    assert.ok(slot);
    state.design = placeEditorBlock(state.design, kind, slot.x, slot.y);
  }
  assert.equal(checkScreenDesign(state).valid, true);
});

test('moving a block preserves its identity, replaces its kind, snaps and clamps to the phone', () => {
  let design = placeEditorBlock(draft().design, 'queue', 0, 900);
  const identity = design.blocks[0].id;
  assert.deepEqual([design.blocks[0].x, design.blocks[0].y], [0, 396]);
  design = placeEditorBlock(design, 'queue', 170, 115);
  assert.equal(design.blocks.length, 1);
  assert.equal(design.blocks[0].id, identity);
  assert.deepEqual([design.blocks[0].x, design.blocks[0].y], [32, 44]);
});

test('an incomplete pointer event cannot corrupt saved coordinates', () => {
  const design = placeEditorBlock(draft().design, 'title', 128, 44);
  assert.equal(placeEditorBlock(design, 'title', Number.NaN, 40), design);
  assert.equal(placeEditorBlock(design, 'title', 100, Number.POSITIVE_INFINITY), design);
});

test('spacing preserves freshness-first order and custom x positions', () => {
  const state = draft();
  state.design.blocks = [
    { id: 'title', kind: 'title', x: 28, y: 20 },
    { id: 'time', kind: 'updated', x: 32, y: 80 },
    { id: 'queues', kind: 'queue', x: 16, y: 152 },
    { id: 'refresh', kind: 'button', x: 40, y: 304 },
  ];
  state.design = spaceEditorBlocks(state.design, 16);
  assert.deepEqual(
    state.design.blocks.map((block) => block.kind),
    ['title', 'updated', 'queue', 'button'],
  );
  assert.deepEqual(
    state.design.blocks.map((block) => block.x),
    [28, 32, 16, 40],
  );
  assert.deepEqual(
    state.design.blocks.map((block) => block.y),
    [20, 92, 164, 324],
  );
  assert.equal(checkScreenDesign(state).valid, true);
});

test('six blocks have a safe spacing bound and the fallback never invents space', () => {
  const state = draft();
  state.design.blocks = Object.keys(blockDefinitions).map((kind) => ({
    id: kind,
    kind: kind as keyof typeof blockDefinitions,
    x: 16,
    y: 0,
  }));
  const limit = editorSpacingLimit(state.design);
  assert.equal(limit, 16);
  state.design = arrangeScreen({ ...state.design, spacing: limit });
  assert.equal(checkScreenDesign(state).valid, true);
  assert.ok(
    state.design.blocks.every(
      (block) => block.y + blockDefinitions[block.kind].height <= PHONE_HEIGHT,
    ),
  );
  const missingTitle = {
    ...state.design,
    spacing: 24,
    blocks: state.design.blocks.filter((block) => block.kind !== 'title'),
  };
  assert.equal(findEditorSlot(missingTitle, 'title'), null);
});
