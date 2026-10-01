import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameDraft } from '../types';
import {
  applyWalkthroughFix,
  buildPrototypeArtifact,
  checkBuildStage,
  checkConnections,
  checkPersonaWalkthrough,
  checkPrototypeReadyToShip,
  checkScreenDesign,
} from './build';

function prototype(): GameDraft {
  return {
    projectName: 'Lunch Lens',
    explore: { visited: [], conversations: {}, evidenceIds: [] },
    insight: {
      slots: {},
      statement: 'Students need current queue information before choosing a stall.',
    },
    scope: { featureIds: ['queue-board', 'freshness', 'report-update'] },
    design: {
      blocks: [
        { id: 't', kind: 'title', x: 16, y: 16 },
        { id: 'q', kind: 'queue', x: 16, y: 80 },
        { id: 'u', kind: 'updated', x: 16, y: 232 },
        { id: 'b', kind: 'button', x: 16, y: 296 },
      ],
      radius: 16,
      spacing: 8,
      alignment: 'left',
      accent: 'blue',
    },
    connect: {
      links: [
        { from: 'tap', to: 'load' },
        { from: 'load', to: 'queues' },
        { from: 'queues', to: 'render' },
      ],
    },
    launch: { fixedIssueIds: [], testRun: [], shipped: false },
  };
}

test('a usable screen needs every essential block inside the phone without collisions', () => {
  const draft = prototype();
  assert.equal(checkScreenDesign(draft).valid, true);
  const missing = structuredClone(draft);
  missing.design.blocks = missing.design.blocks.filter((block) => block.kind !== 'button');
  assert.match(checkScreenDesign(missing).message, /refresh button/i);
  const overlap = structuredClone(draft);
  overlap.design.blocks[3].y = 160;
  assert.match(checkScreenDesign(overlap).message, /overlap/i);
  for (const x of [-4, 400, Number.NaN, Number.POSITIVE_INFINITY]) {
    const outside = structuredClone(draft);
    outside.design.blocks[0].x = x;
    assert.equal(checkScreenDesign(outside).valid, false);
  }
  const duplicate = structuredClone(draft);
  duplicate.design.blocks.push({ id: 'other-title', kind: 'title', x: 16, y: 360 });
  assert.equal(checkScreenDesign(duplicate).valid, false);
});

test('a signal needs the complete directed trigger-action-data-result path', () => {
  const draft = prototype();
  assert.equal(checkConnections(draft).valid, true);
  draft.connect.links = draft.connect.links.filter((link) => link.from !== 'load');
  assert.match(checkConnections(draft).message, /stops at Read the board/);
  draft.connect.links.push({ from: 'queues', to: 'load' });
  assert.match(checkConnections(draft).message, /cannot send directly/);
  const duplicate = prototype();
  duplicate.connect.links.push({ from: 'tap', to: 'load' });
  assert.match(checkConnections(duplicate).message, /duplicate/);
});

test('connections alone cannot complete a stage with an empty screen', () => {
  const draft = prototype();
  draft.design.blocks = [];
  assert.equal(checkBuildStage('connect', draft).valid, false);
});

test('walkthrough failures depend on real layout and wiring, not repair flags', () => {
  const draft = prototype();
  draft.launch.fixedIssueIds = ['crowded-choices', 'freshness-first', 'staff-update'];
  draft.launch.testRun = ['mali', 'ken', 'noa'];
  draft.launch.shipped = true;
  assert.equal(checkPersonaWalkthrough('mali', draft).valid, false);
  assert.equal(checkPersonaWalkthrough('ken', draft).valid, false);
  assert.equal(checkPersonaWalkthrough('noa', draft).valid, false);
  assert.equal(checkBuildStage('launch', draft).valid, false);
  assert.match(buildPrototypeArtifact(draft), /Shipped in app: no/);
});

test('repairs change spacing, order and the actual staff data path', () => {
  let draft = prototype();
  draft = { ...draft, ...applyWalkthroughFix('crowded-choices', draft) };
  assert.equal(draft.design.spacing, 12);
  assert.equal(checkPersonaWalkthrough('mali', draft).valid, true);
  assert.equal(checkPersonaWalkthrough('ken', draft).valid, false);
  draft = { ...draft, ...applyWalkthroughFix('freshness-first', draft) };
  assert.ok(
    draft.design.blocks.find((block) => block.kind === 'updated')!.y <
      draft.design.blocks.find((block) => block.kind === 'queue')!.y,
  );
  assert.equal(checkPersonaWalkthrough('ken', draft).valid, true);
  assert.equal(checkPersonaWalkthrough('noa', draft).valid, false);
  draft = { ...draft, ...applyWalkthroughFix('staff-update', draft) };
  assert.ok(draft.connect.links.some((link) => link.from === 'report' && link.to === 'save'));
  assert.ok(draft.connect.links.some((link) => link.from === 'save' && link.to === 'queues'));
  assert.equal(checkPersonaWalkthrough('noa', draft).valid, true);
  assert.equal(
    checkPrototypeReadyToShip(draft).valid,
    false,
    'passing geometry is not a recorded walkthrough',
  );
  draft.launch.testRun = ['mali', 'ken', 'noa'];
  assert.equal(checkPrototypeReadyToShip(draft).valid, true);
  assert.equal(checkBuildStage('launch', draft).valid, false, 'the player must explicitly ship');
  draft.launch.shipped = true;
  assert.equal(checkBuildStage('launch', draft).valid, true);
  assert.match(buildPrototypeArtifact(draft), /report -> save/);
  assert.match(buildPrototypeArtifact(draft), /Shipped in app: yes/);
  assert.match(buildPrototypeArtifact(draft), /simulated, not real-world validation/);
  draft.design.spacing = 4;
  assert.equal(
    checkBuildStage('launch', draft).valid,
    false,
    'later regressions invalidate the claimed pass',
  );
});

test('a repair cannot pretend to repair an incomplete screen or create duplicate wires', () => {
  const empty = prototype();
  empty.design.blocks = [];
  assert.doesNotThrow(() => applyWalkthroughFix('freshness-first', empty));
  let draft = prototype();
  draft = { ...draft, ...applyWalkthroughFix('staff-update', draft) };
  draft = { ...draft, ...applyWalkthroughFix('staff-update', draft) };
  assert.equal(draft.connect.links.length, 5);
  assert.equal(checkConnections(draft).valid, true);
});

test('the blueprint preserves a completed insight puzzle without an optional rewrite', () => {
  const draft = prototype();
  draft.insight = {
    statement: '   ',
    slots: { person: 'mali-person', problem: 'mali-problem', cause: 'noa-cause', need: 'ken-need' },
  };
  const artifact = buildPrototypeArtifact(draft);
  assert.match(artifact, /cannot judge the queue before walking to the stall/);
  assert.match(artifact, /queue information becomes stale and has no update time/);
  assert.match(artifact, /a recent queue report with a visible update time/);
  assert.doesNotMatch(artifact, /Insight not yet written|___/);
  draft.insight.statement = 'My own carefully rewritten insight.';
  assert.match(buildPrototypeArtifact(draft), /My own carefully rewritten insight\./);
});
