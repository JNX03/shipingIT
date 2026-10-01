import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { adventureSnapshot, createAdventureStore } from './create-adventure-store';
import { adventureXP, checkAdventureStage, parseAdventure, type AdventureState } from './state';

// Exact authorized adventure row captured read-only from the native QA device.
// It contains authored campus roleplay only; no other storage keys are included.
const capturedRaw = readFileSync(
  join(__dirname, 'fixtures/adventure-native-20260930.json'),
  'utf8',
);
const captured = JSON.parse(capturedRaw) as AdventureState;
const capturedDay = () => new Date(2026, 8, 30, 12);

test('the native 150-Spark capture is already invalidated and normalization does not delete its Insight', () => {
  const parsed = parseAdventure(capturedRaw, capturedDay());
  assert.equal(parsed.incompatible, false);
  assert.equal(parsed.recovered, false);
  assert.deepEqual(parsed.state, captured);
  assert.deepEqual(captured.draft.insight, { slots: {}, statement: '' });
  assert.deepEqual(parsed.state.completed, ['explore']);
  assert.deepEqual(parsed.state.earned, ['explore', 'insight', 'scope']);
  assert.equal(adventureXP(parsed.state), 150);
  assert.equal(checkAdventureStage('explore', parsed.state.draft).valid, true);
  assert.equal(checkAdventureStage('insight', parsed.state.draft).valid, false);
  assert.equal(checkAdventureStage('scope', parsed.state.draft).valid, true);
  assert.equal(checkAdventureStage('design', parsed.state.draft).valid, false);
  assert.equal(parsed.state.draft.design.spacing, 20);
  assert.deepEqual(parsed.state.draft.design.blocks, captured.draft.design.blocks);
});

test('cold hydration preserves the captured bytes and cannot unlock or re-award a missing puzzle', async () => {
  let stored = capturedRaw;
  let writes = 0;
  const store = createAdventureStore(
    {
      getItem: async () => stored,
      setItem: async (_key, value) => {
        stored = value;
        writes++;
      },
    },
    capturedDay,
  );
  await store.getState().hydrate();
  assert.equal(writes, 0);
  assert.equal(stored, capturedRaw);
  assert.deepEqual(adventureSnapshot(store.getState()), captured);
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().finishStage('insight').success, false);
  assert.equal(store.getState().finishStage('scope').success, false);
  assert.equal(store.getState().finishStage('design').success, false);
  assert.equal(adventureXP(store.getState()), 150);
  await store.getState().flush();
  assert.equal(writes, 0);
});

test('real puzzle recovery reuses earned awards and survives another cold store without a migration bypass', async () => {
  let stored = capturedRaw;
  const storage = {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => {
      stored = value;
    },
  };
  const store = createAdventureStore(storage, capturedDay);
  await store.getState().hydrate();
  // An actual stage edit must supply all five validated placements. Merely
  // having old earned IDs or a completed marker cannot reconstruct these.
  store.getState().patchDraft({
    insight: {
      ...store.getState().draft.insight,
      slots: {
        person: 'mali-person',
        problem: 'mali-problem',
        cause: 'noa-cause',
        need: 'ken-need',
        'set-aside': 'noa-claim',
      },
    },
  });
  assert.deepEqual(store.getState().completed, ['explore']);
  const insight = store.getState().finishStage('insight');
  assert.equal(insight.success, true);
  assert.equal(insight.xp, 0);
  const scope = store.getState().finishStage('scope');
  assert.equal(scope.success, true);
  assert.equal(scope.xp, 0);
  await store.getState().flush();
  const reopened = createAdventureStore(storage, capturedDay);
  await reopened.getState().hydrate();
  assert.deepEqual(reopened.getState().completed, ['explore', 'insight', 'scope']);
  assert.equal(adventureXP(reopened.getState()), 150);
  assert.equal(reopened.getState().draft.design.spacing, 20);
  assert.deepEqual(reopened.getState().draft.design.blocks, captured.draft.design.blocks);
  assert.equal(reopened.getState().error, null);
});
