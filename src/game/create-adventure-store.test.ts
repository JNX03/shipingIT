import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVENTURE_STORAGE_KEY,
  adventureSnapshot,
  createAdventureStore,
  type AdventureStorage,
} from './create-adventure-store';
import {
  adventureXP,
  initialAdventure,
  normalizeAdventure,
  normalizeGameDraft,
  parseAdventure,
  patchAdventure,
  stageXP,
  type AdventureState,
} from './state';
import { stageIds, type GameDraft, type InterviewMessage, type StageId } from './types';
import {
  coreFeatureIds,
  hasRecordedEvidence,
  researchEvidence,
  requiredEvidenceIds,
} from './logic/research';
import {
  applyWalkthroughFix,
  arrangeScreen,
  checkBuildStage,
  requiredFlowEdges,
  staffFlowEdges,
} from './logic/build';

const today = () => new Date(2026, 8, 29, 12);
function validDraft(): GameDraft {
  const draft = initialAdventure().draft;
  draft.projectName = 'Unit-test simulated queue prototype';
  draft.explore.visited = ['mali', 'noa', 'ken'];
  for (const evidence of researchEvidence.filter((item) => item.kind === 'observation')) {
    const history = draft.explore.conversations[evidence.npcId] ?? [];
    history.push(
      {
        id: `q-${evidence.id}`,
        role: 'learner',
        source: 'player',
        text: 'Fixture question about this simulated campus.',
      },
      {
        id: `a-${evidence.id}`,
        role: 'character',
        source: 'scripted',
        text: evidence.quote,
        evidenceId: evidence.id,
      },
    );
    draft.explore.conversations[evidence.npcId] = history;
    draft.explore.evidenceIds.push(evidence.id);
    draft.insight.slots[evidence.slot!] = evidence.id;
  }
  draft.insight.slots['set-aside'] = 'noa-claim';
  draft.insight.statement = 'An authored fixture, not real research.';
  draft.scope.featureIds = [...coreFeatureIds];
  draft.design = {
    radius: 16,
    spacing: 12,
    alignment: 'left',
    accent: 'blue',
    blocks: [
      { id: 'title', kind: 'title', x: 16, y: 16 },
      { id: 'time', kind: 'updated', x: 16, y: 84 },
      { id: 'queue', kind: 'queue', x: 16, y: 152 },
      { id: 'button', kind: 'button', x: 16, y: 276 },
    ],
  };
  draft.design = arrangeScreen(draft.design, true);
  draft.connect.links = [...requiredFlowEdges, ...staffFlowEdges].map((edge) => {
    const [from, to] = edge.split('>');
    return { from, to };
  });
  draft.launch = {
    fixedIssueIds: ['crowded-choices', 'freshness-first', 'staff-update'],
    testRun: ['mali', 'noa', 'ken'],
    shipped: true,
  };
  return draft;
}
function completedState(): AdventureState {
  return {
    version: 1,
    draft: normalizeGameDraft(validDraft()),
    completed: [...stageIds],
    earned: [...stageIds],
    activityDates: ['2026-09-29'],
    started: true,
  };
}
function memoryDisk(saved: string | null = null) {
  const values = new Map<string, string>();
  const legacy = '{"legacyCourseNotes":"untouched"}';
  values.set('shipaton-nextgen:learning-state:v1', legacy);
  if (saved !== null) values.set(ADVENTURE_STORAGE_KEY, saved);
  const writes: string[] = [];
  let reads = 0;
  const storage: AdventureStorage = {
    getItem: async (key) => {
      assert.equal(key, ADVENTURE_STORAGE_KEY);
      reads++;
      return values.get(key) ?? null;
    },
    setItem: async (key, value) => {
      assert.equal(key, ADVENTURE_STORAGE_KEY);
      writes.push(value);
      values.set(key, value);
    },
  };
  return {
    storage,
    writes,
    values,
    readCount: () => reads,
    legacy,
    saved: () => values.get(ADVENTURE_STORAGE_KEY) ?? null,
  };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test('first-run hydration is shared; premature actions cannot overwrite unread data', async () => {
  const disk = memoryDisk();
  const store = createAdventureStore(disk.storage, today);
  store.getState().begin();
  store.getState().patchDraft({ projectName: 'Too early' });
  store.getState().reset();
  assert.equal(store.getState().finishStage('explore').success, false);
  assert.equal(store.getState().draft.projectName, 'Lunch Lens');
  assert.equal(disk.writes.length, 0);
  const first = store.getState().hydrate();
  assert.equal(first, store.getState().hydrate());
  await first;
  assert.equal(disk.readCount(), 1);
  assert.equal(store.getState().hydrated, true);
  assert.equal(store.getState().error, null);
  store.getState().begin();
  await store.getState().flush();
  assert.equal(store.getState().started, true);
  assert.equal(disk.values.get('shipaton-nextgen:learning-state:v1'), disk.legacy);
});

test('all six validated stages, draft artifacts and awards survive a fresh store instance', async () => {
  const disk = memoryDisk();
  const store = createAdventureStore(disk.storage, today);
  await store.getState().hydrate();
  store.getState().patchDraft(validDraft());
  // Upstream revision invalidates submitted test flags; simulate the actual final walkthrough record afterward.
  for (const stage of stageIds.slice(0, 5))
    assert.equal(store.getState().finishStage(stage).success, true, stage);
  store.getState().patchDraft({ launch: validDraft().launch });
  assert.equal(store.getState().finishStage('launch').success, true);
  await store.getState().flush();
  const reloaded = createAdventureStore(disk.storage, today);
  await reloaded.getState().hydrate();
  assert.deepEqual(reloaded.getState().completed, [...stageIds]);
  assert.equal(adventureXP(reloaded.getState()), 400);
  assert.equal(reloaded.getState().draft.projectName, validDraft().projectName);
  assert.equal(reloaded.getState().draft.launch.shipped, true);
  assert.deepEqual(reloaded.getState().activityDates, ['2026-09-29']);
  assert.equal(reloaded.getState().error, null);
  const snapshot = JSON.parse(disk.saved()!);
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    ['version', 'draft', 'completed', 'earned', 'activityDates', 'started'].sort(),
  );
  assert.equal(disk.values.get('shipaton-nextgen:learning-state:v1'), disk.legacy);
});

test('ordered completion checks the actual artifacts and duplicate completion cannot farm XP', async () => {
  const disk = memoryDisk();
  const store = createAdventureStore(disk.storage, today);
  await store.getState().hydrate();
  assert.equal(store.getState().finishStage('explore').success, false);
  store.getState().patchDraft(validDraft());
  assert.equal(store.getState().finishStage('scope').success, false);
  assert.equal(store.getState().finishStage('not-a-stage' as StageId).success, false);
  const first = store.getState().finishStage('explore');
  assert.equal(first.xp, stageXP.explore);
  const replay = store.getState().finishStage('explore');
  assert.equal(replay.xp, 0);
  assert.equal(replay.success, true);
  assert.deepEqual(store.getState().completed, ['explore']);
  assert.equal(adventureXP(store.getState()), 60);
});

test('replay on a later injected calendar day adds one activity date without extra XP', async () => {
  const disk = memoryDisk();
  let now = new Date(2026, 8, 28, 23, 59);
  const store = createAdventureStore(disk.storage, () => now);
  await store.getState().hydrate();
  store.getState().patchDraft(validDraft());
  store.getState().finishStage('explore');
  now = new Date(2026, 8, 29, 0, 1);
  store.getState().finishStage('explore');
  store.getState().finishStage('explore');
  assert.deepEqual(store.getState().activityDates, ['2026-09-28', '2026-09-29']);
  assert.equal(adventureXP(store.getState()), 60);
});

test('malformed saves preserve valid fields, reject fake completion and discard invalid/future dates', async () => {
  const state = completedState();
  const normalized = normalizeAdventure(
    {
      ...state,
      xp: 999999,
      draft: {
        ...state.draft,
        projectName: 'Keep this name',
        design: { blocks: [{ id: 'bad', kind: 'unknown', x: Infinity }] },
      },
      activityDates: [
        '2026-09-29',
        '2026-09-29',
        '2026-02-29',
        '2026-09-31',
        '2099-01-01',
        'not-a-date',
      ],
      earned: ['explore', 'insight', 'scope', 'launch'],
    },
    today(),
  );
  assert.equal(normalized.draft.projectName, 'Keep this name');
  assert.deepEqual(normalized.completed, ['explore', 'insight', 'scope']);
  assert.deepEqual(normalized.earned, ['explore', 'insight', 'scope']);
  assert.deepEqual(normalized.activityDates, ['2026-09-29']);
  assert.equal(normalized.draft.launch.shipped, false);
  assert.equal(adventureXP(normalized), 150);
  assert.equal(parseAdventure('{broken json', today()).recovered, true);
  assert.equal(parseAdventure(null, today()).recovered, false);
  assert.deepEqual(
    normalizeAdventure({ completed: ['launch'], earned: ['launch'] }, today()).earned,
    [],
  );
});

test('malformed JSON remains usable and can be repaired through retry without touching old learning data', async () => {
  const disk = memoryDisk('not json');
  const store = createAdventureStore(disk.storage, today);
  await store.getState().hydrate();
  assert.equal(store.getState().recoveredState, true);
  assert.ok(store.getState().error);
  store.getState().patchDraft({ projectName: 'Recovered game' });
  await store.getState().retry();
  assert.equal(store.getState().error, null);
  assert.equal(JSON.parse(disk.saved()!).draft.projectName, 'Recovered game');
  assert.equal(disk.values.get('shipaton-nextgen:learning-state:v1'), disk.legacy);
});

test('failed reads and future-version saves are never overwritten by session changes or retry', async () => {
  let writes = 0;
  const failed = createAdventureStore(
    {
      getItem: async () => {
        throw new Error('unavailable');
      },
      setItem: async () => {
        writes++;
      },
    },
    today,
  );
  await failed.getState().hydrate();
  failed.getState().patchDraft({ projectName: 'Unsaved session' });
  await failed.getState().retry();
  await failed.getState().flush();
  assert.equal(writes, 0);
  assert.match(failed.getState().error!, /original save/);
  const disk = memoryDisk('{"version":2,"futureData":"preserve"}');
  const future = createAdventureStore(disk.storage, today);
  await future.getState().hydrate();
  future.getState().begin();
  future.getState().patchDraft({ projectName: 'Do not overwrite' });
  await future.getState().retry();
  assert.equal(disk.writes.length, 0);
  assert.equal(disk.saved(), '{"version":2,"futureData":"preserve"}');
});

test('explicit reset after hydration can replace unread or newer-format game saves', async () => {
  const disk = memoryDisk('{"version":2,"futureData":"owner explicitly resets"}');
  const future = createAdventureStore(disk.storage, today);
  future.getState().reset();
  assert.equal(disk.writes.length, 0);
  await future.getState().hydrate();
  await future.getState().retry();
  assert.equal(disk.writes.length, 0);
  future.getState().reset();
  await future.getState().flush();
  assert.deepEqual(JSON.parse(disk.saved()!), initialAdventure());
  assert.equal(future.getState().error, null);
  let saved: string | null = null;
  const unread = createAdventureStore(
    {
      getItem: async () => {
        throw new Error('unread');
      },
      setItem: async (key, value) => {
        assert.equal(key, ADVENTURE_STORAGE_KEY);
        saved = value;
      },
    },
    today,
  );
  await unread.getState().hydrate();
  await unread.getState().retry();
  assert.equal(saved, null);
  unread.getState().reset();
  await unread.getState().flush();
  assert.deepEqual(JSON.parse(saved!), initialAdventure());
  assert.equal(unread.getState().error, null);
  assert.equal(disk.values.get('shipaton-nextgen:learning-state:v1'), disk.legacy);
});

test('failed writes retain current work, surface an error and retry the latest snapshot', async () => {
  const disk = memoryDisk();
  let fail = true;
  const store = createAdventureStore(
    {
      ...disk.storage,
      setItem: async (key, value) => {
        if (fail) throw new Error('full');
        await disk.storage.setItem(key, value);
      },
    },
    today,
  );
  await store.getState().hydrate();
  store.getState().patchDraft({ projectName: 'Keep me' });
  await store.getState().flush();
  assert.equal(store.getState().draft.projectName, 'Keep me');
  assert.match(store.getState().error!, /could not save/);
  fail = false;
  await store.getState().retry();
  assert.equal(store.getState().error, null);
  assert.equal(JSON.parse(disk.saved()!).draft.projectName, 'Keep me');
});

test('writes stay serialized and flush includes edits queued during an earlier save', async () => {
  const gates = [deferred(), deferred(), deferred()];
  const snapshots: string[] = [];
  let active = 0,
    maxActive = 0;
  const store = createAdventureStore(
    {
      getItem: async () => null,
      setItem: async (key, value) => {
        assert.equal(key, ADVENTURE_STORAGE_KEY);
        const index = snapshots.length;
        snapshots.push(value);
        active++;
        maxActive = Math.max(maxActive, active);
        await gates[index].promise;
        active--;
      },
    },
    today,
  );
  await store.getState().hydrate();
  store.getState().patchDraft({ projectName: 'First' });
  store.getState().patchDraft({ projectName: 'Second' });
  let flushed = false;
  const flushing = store
    .getState()
    .flush()
    .then(() => {
      flushed = true;
    });
  await settle();
  assert.equal(snapshots.length, 1);
  gates[0].resolve();
  await settle();
  store.getState().patchDraft({ projectName: 'Newest' });
  gates[1].resolve();
  await settle();
  assert.equal(flushed, false);
  assert.equal(snapshots.length, 3);
  gates[2].resolve();
  await flushing;
  assert.equal(maxActive, 1);
  assert.deepEqual(
    snapshots.map((raw) => JSON.parse(raw).draft.projectName),
    ['First', 'Second', 'Newest'],
  );
});

test('extra dialogue and optional evidence preserve completed work while required clue loss invalidates it', () => {
  const state = completedState();
  const more = structuredClone(state.draft.explore);
  const extra: InterviewMessage[] = Array.from({ length: 100 }, (_, index) => ({
    id: `extra-${index}`,
    role: index % 2 ? 'character' : 'learner',
    source: index % 2 ? 'scripted' : 'player',
    text: 'Additional roleplay, not a changed queue fact.',
  }));
  more.conversations.mali = [...more.conversations.mali!, ...extra];
  more.evidenceIds.push('noa-claim');
  more.conversations.noa!.push({
    id: 'optional',
    role: 'character',
    source: 'scripted',
    text: 'A tempting unsupported claim.',
    evidenceId: 'noa-claim',
  });
  const updated = patchAdventure(state, { explore: more });
  assert.deepEqual(updated.completed, [...stageIds]);
  assert.equal(updated.draft.launch.shipped, true);
  assert.ok(updated.draft.explore.conversations.mali!.length <= 80);
  assert.ok(requiredEvidenceIds.every((id) => hasRecordedEvidence(updated.draft, id)));
  const withoutOptional = patchAdventure(updated, {
    explore: {
      ...updated.draft.explore,
      evidenceIds: updated.draft.explore.evidenceIds.filter((id) => id !== 'noa-claim'),
    },
  });
  assert.deepEqual(withoutOptional.completed, [...stageIds]);
  const lost = patchAdventure(updated, {
    explore: {
      ...updated.draft.explore,
      evidenceIds: updated.draft.explore.evidenceIds.filter((id) => id !== 'mali-person'),
    },
  });
  assert.deepEqual(lost.completed, []);
  assert.deepEqual(lost.earned, [...stageIds]);
  assert.equal(lost.draft.launch.shipped, false);
  assert.deepEqual(lost.draft.launch.testRun, []);
});

test('removing supporting dialogue cannot leave a required clue and its downstream results trusted', () => {
  const state = completedState();
  const explore = structuredClone(state.draft.explore);
  explore.conversations.noa = [];
  const updated = patchAdventure(state, { explore });
  assert.deepEqual(updated.completed, []);
  assert.equal(updated.draft.launch.shipped, false);
});

test('artifact revisions invalidate dependent results, preserve earned XP and cannot smuggle old test flags', () => {
  const state = completedState();
  const changed = patchAdventure(state, {
    insight: { ...state.draft.insight, statement: 'A revised simulated insight.' },
    launch: { ...state.draft.launch },
  });
  assert.deepEqual(changed.completed, ['explore']);
  assert.equal(adventureXP(changed), 400);
  assert.deepEqual(changed.draft.launch.testRun, []);
  assert.equal(changed.draft.launch.shipped, false);
  const reordered = patchAdventure(state, {
    scope: { featureIds: [...state.draft.scope.featureIds].reverse() },
    connect: { links: [...state.draft.connect.links].reverse() },
  });
  assert.deepEqual(reordered.completed, [...stageIds]);
  const renamed = patchAdventure(state, { projectName: 'New working name' });
  assert.deepEqual(renamed.completed, [...stageIds]);
});

test('launch-origin repairs retain only prerequisites still passing the real validators', () => {
  const before = completedState();
  before.completed = stageIds.slice(0, 5);
  before.earned = stageIds.slice(0, 5);
  before.draft.design.spacing = 8;
  before.draft.launch = { fixedIssueIds: [], testRun: [], shipped: false };
  const fixed = patchAdventure(before, applyWalkthroughFix('crowded-choices', before.draft));
  assert.deepEqual(fixed.completed, stageIds.slice(0, 5));
  assert.equal(checkBuildStage('design', fixed.draft).valid, true);
  assert.deepEqual(fixed.draft.launch.testRun, []);
  assert.equal(fixed.draft.launch.shipped, false);
  const broken = patchAdventure(before, {
    design: { ...before.draft.design, blocks: [] },
    launch: { ...before.draft.launch },
  });
  assert.deepEqual(broken.completed, ['explore', 'insight', 'scope']);
  const notRepair = patchAdventure(before, {
    insight: { ...before.draft.insight, statement: 'Changed research' },
    launch: { ...before.draft.launch },
  });
  assert.deepEqual(notRepair.completed, ['explore']);
});

test('reset clears only the game state and persists independently of legacy learning storage', async () => {
  const disk = memoryDisk(JSON.stringify(completedState()));
  const store = createAdventureStore(disk.storage, today);
  await store.getState().hydrate();
  store.getState().reset();
  await store.getState().flush();
  assert.deepEqual(adventureSnapshot(store.getState()), initialAdventure());
  const reloaded = createAdventureStore(disk.storage, today);
  await reloaded.getState().hydrate();
  assert.equal(adventureXP(reloaded.getState()), 0);
  assert.equal(disk.values.get('shipaton-nextgen:learning-state:v1'), disk.legacy);
});

test('a stale adventure store refreshes saved stage progress and earned XP', async () => {
  const disk = memoryDisk();
  const stale = createAdventureStore(disk.storage, today);
  await stale.getState().hydrate();
  disk.values.set('shipingit:adventure:v1', JSON.stringify(completedState()));

  await stale.getState().refreshFromStorage();

  assert.deepEqual(stale.getState().completed, stageIds);
  assert.equal(adventureXP(stale.getState()), adventureXP(completedState()));
});
