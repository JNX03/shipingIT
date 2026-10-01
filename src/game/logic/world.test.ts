import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearSegment,
  distance,
  isWalkable,
  pathLength,
  planWorldPath,
  worldFacing,
  type WalkableWorld,
  type WorldPoint,
} from '../world/geometry';
import { adventureWorlds, navigationWorld, portalToNpc, sceneForNpc } from '../world/scenes';
import { emptyGameDraft } from '../state';
import { interviewTasks, nextInterviewTask } from '../world/tasks';
import { checkResearchStage, hasRecordedEvidence, scriptedInterview } from './research';

const fixture: WalkableWorld = {
  width: 500,
  height: 700,
  bounds: { left: 0, top: 0, right: 500, bottom: 700 },
  obstacles: [{ kind: 'rect', x: 190, y: 180, width: 120, height: 310 }],
};
function assertSafe(world: WalkableWorld, path: WorldPoint[]) {
  assert.ok(path.length > 0);
  for (const point of path)
    assert.ok(isWalkable(world, point), `Blocked waypoint ${JSON.stringify(point)}`);
  for (let i = 1; i < path.length; i++)
    assert.ok(clearSegment(world, path[i - 1], path[i]), `Collision on leg ${i}`);
}

test('ground taps detour around furniture with foot clearance and preserve the destination', () => {
  const from = { x: 95, y: 340 },
    to = { x: 405, y: 340 };
  assert.equal(clearSegment(fixture, from, to), false);
  const path = planWorldPath(fixture, from, to);
  assertSafe(fixture, path);
  assert.deepEqual(path[0], from);
  assert.deepEqual(path.at(-1), to);
  assert.ok(pathLength(path) > distance(from, to));
  assert.ok(path.length <= 5, 'Open floor legs should be simplified');
});

test('taps on furniture and outside walls stop at reachable safe ground', () => {
  for (const target of [
    { x: 250, y: 340 },
    { x: -50, y: 180 },
    { x: 900, y: 340 },
    { x: 250, y: 900 },
  ]) {
    const path = planWorldPath(fixture, { x: 95, y: 340 }, target);
    assertSafe(fixture, path);
    assert.notDeepEqual(path.at(-1), target);
  }
  assert.deepEqual(planWorldPath(fixture, { x: 250, y: 340 }, { x: 100, y: 100 }), []);
  assert.deepEqual(planWorldPath(fixture, { x: 95, y: 340 }, { x: NaN, y: 30 }), []);
});

test('disconnected rooms choose the nearest reachable side rather than clipping a wall', () => {
  const split = {
    ...fixture,
    obstacles: [{ kind: 'rect' as const, x: 220, y: 0, width: 60, height: 700 }],
  };
  const path = planWorldPath(split, { x: 80, y: 350 }, { x: 420, y: 350 });
  assertSafe(split, path);
  assert.ok(path.at(-1)!.x < 220);
});

test('all authored scene spawns, NPC approaches and portals are reachable without collisions', () => {
  for (const world of Object.values(adventureWorlds)) {
    assert.ok(isWalkable(world, world.spawn), `${world.id} spawn`);
    for (const npc of world.npcs) {
      assert.ok(isWalkable(world, npc.position), `${world.id} ${npc.id} position`);
      const path = planWorldPath(world, world.spawn, npc.approach);
      assertSafe(world, path);
      assert.deepEqual(path.at(-1), npc.approach);
      assert.ok(
        distance(npc.position, npc.approach) < 150,
        'Dialogue only opens within talking distance',
      );
    }
    for (const portal of world.portals) {
      const path = planWorldPath(world, world.spawn, portal.position);
      assertSafe(world, path);
      assert.deepEqual(path.at(-1), portal.position);
      assert.ok(isWalkable(adventureWorlds[portal.target], portal.spawn), `${portal.id} arrival`);
    }
  }
  assert.equal(sceneForNpc('mali').id, 'campus');
  assert.equal(sceneForNpc('noa').id, 'canteen');
  assert.equal(sceneForNpc('ken').id, 'sports');
  assert.equal(portalToNpc(adventureWorlds.canteen, 'ken')?.target, 'campus');
});

test('rapid retargeting can plan from every point on an interrupted safe route', () => {
  const world = adventureWorlds.campus;
  const first = planWorldPath(world, world.spawn, world.portals[0].position);
  for (let i = 1; i < first.length; i++) {
    const from = first[i - 1],
      to = first[i];
    const interrupted = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const retargeted = planWorldPath(world, interrupted, world.npcs[0].approach);
    assertSafe(world, retargeted);
    assert.deepEqual(retargeted.at(-1), world.npcs[0].approach);
  }
});

test('world collision includes NPC feet while keeping every authored talking spot reachable', () => {
  for (const world of Object.values(adventureWorlds)) {
    const collision = navigationWorld(world);
    for (const npc of world.npcs) {
      assert.equal(isWalkable(collision, npc.position), false);
      const path = planWorldPath(collision, world.spawn, npc.approach);
      assertSafe(collision, path);
      assert.deepEqual(path.at(-1), npc.approach);
      assertSafe(collision, planWorldPath(collision, npc.approach, npc.position));
    }
  }
});

test('walking directions follow the dominant axis for the articulated avatar', () => {
  const origin = { x: 0, y: 0 };
  assert.equal(worldFacing(origin, { x: 20, y: 5 }), 'right');
  assert.equal(worldFacing(origin, { x: -20, y: 5 }), 'left');
  assert.equal(worldFacing(origin, { x: 5, y: -20 }), 'back');
  assert.equal(worldFacing(origin, { x: 5, y: 20 }), 'front');
});

test('guided tasks cannot advance from invented collected IDs without a recorded reply', () => {
  const draft = emptyGameDraft();
  assert.equal(nextInterviewTask(draft)?.evidenceId, 'mali-problem');
  draft.explore.evidenceIds.push('mali-problem');
  assert.equal(nextInterviewTask(draft)?.evidenceId, 'mali-problem');
  draft.explore.conversations.mali = [
    { id: 'q', role: 'learner', source: 'player', text: 'Tell me about lunch.' },
    {
      id: 'a',
      role: 'character',
      source: 'scripted',
      text: 'I left without lunch.',
      evidenceId: 'mali-problem',
    },
  ];
  assert.equal(nextInterviewTask(draft)?.evidenceId, 'mali-person');
  assert.equal(nextInterviewTask(draft, 'noa')?.evidenceId, 'noa-cause');
  assert.equal(interviewTasks.filter((task) => task.kind === 'clue').length, 4);
  assert.equal(interviewTasks.filter((task) => task.kind === 'assumption').length, 1);
});

test('the guided walk interviews earn every clue and the later assumption through actual replies', () => {
  const draft = emptyGameDraft();
  for (const task of interviewTasks) {
    assert.equal(nextInterviewTask(draft)?.evidenceId, task.evidenceId);
    const history = draft.explore.conversations[task.npcId] ?? [];
    const reply = scriptedInterview({ npcId: task.npcId, question: task.question, history });
    assert.equal(reply.evidenceId, task.evidenceId);
    draft.explore.conversations[task.npcId] = [
      ...history,
      { id: `${task.evidenceId}-q`, role: 'learner', source: 'player', text: task.question },
      {
        id: `${task.evidenceId}-a`,
        role: 'character',
        source: reply.source,
        text: reply.text,
        evidenceId: reply.evidenceId,
      },
    ];
    if (!draft.explore.visited.includes(task.npcId)) draft.explore.visited.push(task.npcId);
    draft.explore.evidenceIds.push(task.evidenceId);
    assert.equal(hasRecordedEvidence(draft, task.evidenceId), true);
  }
  assert.equal(nextInterviewTask(draft), undefined);
  assert.equal(checkResearchStage('explore', draft).valid, true);
  assert.equal(hasRecordedEvidence(draft, 'noa-claim'), true);
});
