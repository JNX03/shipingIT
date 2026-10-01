import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectWebMCP,
  createWebMCPTools,
  webMCPDestinationPaths,
  type WebMCPAdventureSnapshot,
  type WebMCPOptions,
  type WebMCPSnapshot,
  type WebMCPTool,
} from './webmcp-tools';
import { createEmptyProject } from '../domain/project';
import { initialAdventure } from '../game/state';
const snapshot = {
  project: createEmptyProject(),
  progress: { xp: 30, completedLessonIds: ['discover-1'], achievements: [] },
};
const options: WebMCPOptions = {
  getSnapshot: () => snapshot,
  onNavigate: () => {},
  listOpportunities: async () => ({
    items: [],
    source: 'snapshot',
    fetchedAt: '2026-09-29T00:00:00Z',
    sourceUrl: 'https://api.dekport.com',
  }),
};
test('unsupported browser is a harmless no-op', async () => {
  const connection = connectWebMCP(undefined, options);
  assert.equal(await connection.ready, 'unsupported');
  connection.disconnect();
});
test('registration exposes exactly the four declared actions and unregisters on abort', async () => {
  const registered: WebMCPTool[] = [];
  const signals: AbortSignal[] = [];
  const connection = connectWebMCP(
    {
      registerTool: (tool, { signal }) => {
        registered.push(tool);
        signals.push(signal);
      },
    },
    options,
  );
  assert.equal(await connection.ready, 'ready');
  assert.deepEqual(
    registered.map((tool) => tool.name),
    [
      'read_shipaton_project',
      'read_shipaton_progress',
      'find_shipaton_opportunities',
      'start_shipaton_task',
    ],
  );
  connection.disconnect();
  assert.ok(signals.every((signal) => signal.aborted));
});
test('a partial registration failure cleans up successful registrations', async () => {
  const signals: AbortSignal[] = [];
  const connection = connectWebMCP(
    {
      registerTool: (tool, { signal }) => {
        signals.push(signal);
        if (tool.name === 'read_shipaton_progress') throw new Error('Unsupported');
      },
    },
    options,
  );
  assert.equal(await connection.ready, 'error');
  assert.ok(signals.every((signal) => signal.aborted));
});
test('read tools return copies, reject extra input, and include no auth state', async () => {
  const tools = createWebMCPTools(options);
  const read = tools[1];
  const result = (await read.execute({})) as typeof snapshot.progress;
  result.completedLessonIds.push('forged');
  assert.equal(snapshot.progress.completedLessonIds.length, 1);
  assert.ok('error' in ((await read.execute({ access_token: 'injected' })) as object));
  assert.deepEqual(Object.keys((await tools[0].execute({})) as object), ['source', 'project']);
});
test('navigation validates fields and waits for the callback without claiming a save', async () => {
  let navigations = 0;
  const tool = createWebMCPTools({
    ...options,
    onNavigate: async () => {
      navigations++;
    },
  })[3];
  for (const input of [
    { destination: 'purchase' },
    { destination: 'project', field: '__proto__' },
    { destination: 'mentor', field: 'problem' },
    { destination: 'project', field: 'problem', value: 'overwrite' },
  ])
    assert.ok('error' in ((await tool.execute(input)) as object));
  assert.equal(navigations, 0);
  assert.deepEqual(await tool.execute({ destination: 'project', field: 'problem' }), {
    status: 'navigation_requested',
    destination: 'project',
    field: 'problem',
    requiresUserAction: true,
    saved: false,
  });
  assert.equal(navigations, 1);
});

function adventureFixture(): WebMCPAdventureSnapshot {
  const adventure: WebMCPAdventureSnapshot = {
    ...initialAdventure(),
    started: true,
    hydrated: true,
    saveNeedsAttention: false,
    completed: ['explore'],
    earned: ['explore', 'insight'],
    activityDates: ['2026-09-29'],
  };
  adventure.draft.projectName = 'My practice app';
  adventure.draft.explore = {
    visited: ['mali'],
    evidenceIds: ['practice-evidence'],
    conversations: {
      mali: [{ id: 'private-turn', role: 'character', source: 'ai', text: 'PRIVATE_TRANSCRIPT' }],
    },
  };
  adventure.draft.insight = {
    slots: { person: 'practice-evidence' },
    statement: 'A practice insight.',
  };
  adventure.draft.scope.featureIds = ['queue'];
  adventure.draft.design.blocks = [{ id: 'heading', kind: 'title', x: 12, y: 20 }];
  adventure.draft.connect.links = [{ from: 'trigger', to: 'action' }];
  adventure.draft.launch = { fixedIssueIds: ['contrast'], testRun: ['mali'], shipped: false };
  return adventure;
}

function adventureOptions(adventure = adventureFixture()): WebMCPOptions {
  return { ...options, getSnapshot: () => ({ ...snapshot, adventure }) };
}

test('optional adventure leaves legacy results and the four tool names unchanged', async () => {
  const legacyTools = createWebMCPTools(options);
  assert.deepEqual(await legacyTools[0].execute({}), {
    source: 'local-device',
    project: snapshot.project,
  });
  assert.deepEqual(await legacyTools[1].execute({}), snapshot.progress);
  const registered: WebMCPTool[] = [];
  const connection = connectWebMCP(
    {
      registerTool: (tool) => {
        registered.push(tool);
      },
    },
    adventureOptions(),
  );
  assert.equal(await connection.ready, 'ready');
  assert.deepEqual(
    registered.map((tool) => tool.name),
    legacyTools.map((tool) => tool.name),
  );
  assert.equal(registered.length, 4);
  assert.equal(registered[0].annotations.readOnlyHint, true);
  assert.equal(registered[0].annotations.untrustedContentHint, true);
  assert.equal(registered[1].annotations.readOnlyHint, true);
  connection.disconnect();
});

test('adventure project allowlists every nested object and returns detached copies', async () => {
  const adventure = adventureFixture();
  Object.assign(adventure, {
    access_token: 'PRIVATE_AUTH',
    reset: () => assert.fail('reset called'),
  });
  Object.assign(adventure.draft, { session: { access_token: 'PRIVATE_AUTH' } });
  Object.assign(adventure.draft.design, { config: 'PRIVATE_CONFIG' });
  Object.assign(adventure.draft.design.blocks[0], { token: 'PRIVATE_BLOCK_TOKEN' });
  Object.assign(adventure.draft.connect.links[0], { token: 'PRIVATE_LINK_TOKEN' });
  adventure.draft.insight.slots.access_token = 'PRIVATE_SLOT_TOKEN';
  const before = JSON.stringify(adventure);
  const expectedDraft = {
    projectName: 'My practice app',
    explore: { visitedNpcIds: ['mali'], evidenceIds: ['practice-evidence'] },
    insight: { slots: { person: 'practice-evidence' }, statement: 'A practice insight.' },
    scope: { featureIds: ['queue'] },
    design: {
      blocks: [{ id: 'heading', kind: 'title', x: 12, y: 20 }],
      radius: 16,
      spacing: 8,
      alignment: 'left',
      accent: 'blue',
    },
    connect: { links: [{ from: 'trigger', to: 'action' }] },
    launch: { fixedIssueIds: ['contrast'], testedNpcIds: ['mali'], shippedInApp: false },
  };
  const result = (await createWebMCPTools(adventureOptions(adventure))[0].execute({})) as {
    source: string;
    project: typeof snapshot.project;
    adventure: {
      hydrated: boolean;
      source: string;
      stateScope: string;
      saveNeedsAttention: boolean;
      draft: typeof expectedDraft;
    };
  };
  assert.deepEqual(result, {
    source: 'local-device',
    project: snapshot.project,
    adventure: {
      hydrated: true,
      source: 'ai-practice-world',
      stateScope: 'current-session',
      saveNeedsAttention: false,
      draft: expectedDraft,
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|conversations|access_token|reset/);
  const draft = result.adventure.draft;
  draft.projectName = 'Forged app';
  draft.explore.visitedNpcIds.push('forged');
  draft.explore.evidenceIds.push('forged');
  draft.insight.slots.person = 'forged';
  draft.insight.statement = 'forged';
  draft.scope.featureIds.push('forged');
  draft.design.blocks[0].x = 999;
  draft.design.blocks.push({ id: 'forged', kind: 'title', x: 0, y: 0 });
  draft.design.radius = 0;
  draft.connect.links[0].to = 'forged';
  draft.connect.links.push({ from: 'forged', to: 'forged' });
  draft.launch.fixedIssueIds.push('forged');
  draft.launch.testedNpcIds.push('forged');
  draft.launch.shippedInApp = true;
  assert.equal(JSON.stringify(adventure), before);
});

test('game awards and totalXP remain separate from legacy XP and return copied progress', async () => {
  const adventure = adventureFixture();
  // A revised draft can lose completion while preserving awards already earned.
  adventure.earned.push('insight');
  const tool = createWebMCPTools(adventureOptions(adventure))[1];
  const result = (await tool.execute({})) as {
    xp: number;
    totalXP: number;
    adventure: {
      hydrated: boolean;
      stateScope: string;
      saveNeedsAttention: boolean;
      started: boolean;
      gameXP: number;
      completedStageIds: string[];
      earnedStageIds: string[];
      activityDates: string[];
      shippedInApp: boolean;
    };
  };
  assert.equal(result.xp, 30);
  assert.equal(result.totalXP, 130);
  assert.deepEqual(result.adventure, {
    hydrated: true,
    stateScope: 'current-session',
    saveNeedsAttention: false,
    started: true,
    gameXP: 100,
    completedStageIds: ['explore'],
    earnedStageIds: ['explore', 'insight', 'insight'],
    activityDates: ['2026-09-29'],
    shippedInApp: false,
  });
  const before = JSON.stringify(adventure);
  result.adventure.completedStageIds.push('launch');
  result.adventure.earnedStageIds.push('launch');
  result.adventure.activityDates.push('2099-01-01');
  assert.equal(JSON.stringify(adventure), before);
});

test('unhydrated adventure reports loading without exposing default work or claiming totals', async () => {
  const adventure = adventureFixture();
  adventure.hydrated = false;
  const tools = createWebMCPTools(adventureOptions(adventure));
  assert.deepEqual(await tools[0].execute({}), {
    source: 'local-device',
    project: snapshot.project,
    adventure: { hydrated: false },
  });
  assert.deepEqual(await tools[1].execute({}), {
    ...snapshot.progress,
    adventure: { hydrated: false },
  });
});

test('reads fetch fresh snapshots once, reject input first, and never invoke mutations or services', async () => {
  let current: WebMCPSnapshot = { ...snapshot, adventure: adventureFixture() };
  let reads = 0;
  const tools = createWebMCPTools({
    ...options,
    getSnapshot: () => {
      reads++;
      return current;
    },
    onNavigate: () => assert.fail('read navigated'),
    listOpportunities: async () => assert.fail('read called an external service'),
  });
  for (const tool of tools.slice(0, 2)) {
    for (const input of [
      null,
      [],
      'read',
      { stage: 'launch' },
      { complete: true },
      { reset: 'RESET' },
    ]) {
      assert.deepEqual(await tool.execute(input), { error: 'Provide an empty object.' });
    }
  }
  assert.equal(reads, 0);
  await tools[0].execute({});
  assert.equal(reads, 1);
  const next = adventureFixture();
  next.draft.projectName = 'New current draft';
  next.earned.push('scope');
  next.saveNeedsAttention = true;
  Object.assign(next, {
    patchDraft: () => assert.fail('read mutated draft'),
    finishStage: () => assert.fail('read completed a stage'),
    flush: () => assert.fail('read flushed storage'),
    retry: () => assert.fail('read retried storage'),
    hydrate: () => assert.fail('read hydrated storage'),
  });
  current = { ...snapshot, adventure: next };
  const project = (await tools[0].execute({})) as {
    adventure: { draft: { projectName: string }; saveNeedsAttention: boolean };
  };
  const progress = (await tools[1].execute({})) as {
    xp: number;
    totalXP: number;
    adventure: { gameXP: number; saveNeedsAttention: boolean };
  };
  assert.equal(reads, 3);
  assert.equal(project.adventure.draft.projectName, 'New current draft');
  assert.equal(project.adventure.saveNeedsAttention, true);
  assert.equal(progress.xp, 30);
  assert.equal(progress.adventure.gameXP, 150);
  assert.equal(progress.totalXP, 180);
  assert.equal(progress.adventure.saveNeedsAttention, true);
  assert.equal('saved' in progress, false);
});

test('legacy learning destinations open course/notebook and no adventure mutation is exposed', async () => {
  assert.equal(webMCPDestinationPaths.learn, '/course');
  assert.equal(webMCPDestinationPaths.project, '/notebook');
  const calls: string[] = [];
  const tool = createWebMCPTools({
    ...adventureOptions(),
    onNavigate: (destination) => {
      calls.push(webMCPDestinationPaths[destination]);
    },
  })[3];
  for (const destination of ['learn', 'project']) {
    assert.deepEqual(await tool.execute({ destination }), {
      status: 'navigation_requested',
      destination,
      field: null,
      requiresUserAction: true,
      saved: false,
    });
  }
  for (const input of [
    { destination: 'adventure' },
    { destination: 'project', field: 'launch' },
    { destination: 'project', complete: 'launch' },
  ]) {
    assert.ok('error' in ((await tool.execute(input)) as object));
  }
  assert.deepEqual(calls, ['/course', '/notebook']);
});
