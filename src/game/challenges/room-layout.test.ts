import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { challengeCatalog, challengeById } from './catalog';
import { adventureWorlds } from '../world/scenes';
import { clearSegment, distance, isWalkable, planWorldPath } from '../world/geometry';
import type { StoryRoomLayout, StoryRoomId } from './room-layout';

const filename = resolve('src/game/challenges/room-layout.ts');
const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded: Record<string, unknown> = {};
const assets = new Map<string, number>();
runInNewContext(source, {
  exports: loaded,
  require(name: string) {
    if (name === '../world/scenes') return { adventureWorlds };
    assert.match(name, /\.webp$/, `Unexpected platform dependency ${name}`);
    const asset = resolve(dirname(filename), name);
    assert.ok(existsSync(asset), `Missing original scene art ${name}`);
    if (!assets.has(asset)) assets.set(asset, assets.size + 1);
    return assets.get(asset);
  },
});
const rooms = loaded.storyRooms as Record<StoryRoomId, StoryRoomLayout>;
const roomForChallenge = loaded.roomForChallenge as (id: string) => StoryRoomLayout | undefined;
const art = loaded.storyRoomArt as Record<StoryRoomId, number>;

test('every authored interview starts in a scene with its correct character and clue props', () => {
  const interviews = challengeCatalog.filter((challenge) => challenge.kind === 'interview');
  assert.equal(interviews.length, 4);
  for (const challenge of interviews) {
    const room = roomForChallenge(challenge.id);
    assert.ok(room, `${challenge.id} has a walkable scene`);
    assert.equal(room.character, challenge.npc, challenge.id);
    assert.ok(art[room.id] > 0, `${room.id} has original art`);
    assert.ok(room.props.length > 0, `${room.id} has interactive objects`);
    for (const prop of room.props)
      assert.ok(challenge.items.some((item) => item.id === prop.itemId), `${prop.id} maps to a real clue`);
  }
  assert.equal(roomForChallenge('explore-last-time'), rooms.shuttle);
  assert.equal(roomForChallenge('explore-workaround'), rooms['lost-found']);
});

test('all four scene spawns, talking approaches and object approaches are mutually reachable', () => {
  for (const room of Object.values(rooms)) {
    assert.ok(isWalkable(room, room.spawn), `${room.id} spawn`);
    assert.equal(isWalkable(room, room.person.position), false, `${room.id} blocks NPC feet`);
    assert.ok(distance(room.person.position, room.person.approach) <= 118, `${room.id} talking range`);
    const destinations = [room.spawn, room.person.approach, ...room.props.map((prop) => prop.approach)];
    for (const from of destinations) {
      assert.ok(isWalkable(room, from), `${room.id} approach ${JSON.stringify(from)}`);
      for (const to of destinations) {
        const path = planWorldPath(room, from, to);
        assert.ok(path.length > 0, `${room.id} has a route`);
        assert.equal(distance(path.at(-1)!, to), 0, `${room.id} reaches its actual target`);
        for (const point of path)
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y) && isWalkable(room, point));
        for (let i = 1; i < path.length; i++)
          assert.ok(clearSegment(room, path[i - 1], path[i]), `${room.id} avoids furniture`);
      }
    }
  }
});

test('the first two scenes reuse the original campus art and measured collision envelopes', () => {
  assert.equal(art.shuttle, art['lost-found']);
  for (const id of ['shuttle', 'lost-found'] as const) {
    assert.equal(rooms[id].width, adventureWorlds.campus.width);
    assert.equal(rooms[id].height, adventureWorlds.campus.height);
    assert.equal(rooms[id].bounds, adventureWorlds.campus.bounds);
    assert.equal(
      JSON.stringify(rooms[id].obstacles.slice(0, -1)),
      JSON.stringify(adventureWorlds.campus.obstacles),
    );
  }
  assert.equal(rooms.shuttle.character, 'mali');
  assert.equal(rooms['lost-found'].character, 'noa');
  assert.deepEqual(Array.from(rooms.shuttle.props, (prop) => prop.itemId), ['event', 'impact']);
  assert.deepEqual(Array.from(rooms['lost-found'].props, (prop) => prop.itemId), ['notebook', 'search']);
});

test('library and club keep their original art space, obstacle envelopes and talking points', () => {
  for (const id of ['library', 'club'] as const) {
    assert.equal(rooms[id].width, 1024);
    assert.equal(rooms[id].height, 1024);
    assert.equal(rooms[id].spawn.x, 512);
    assert.equal(rooms[id].spawn.y, 950);
    assert.equal(rooms[id].person.position.x, 530);
    assert.equal(rooms[id].person.position.y, 370);
    assert.equal(rooms[id].person.approach.x, 530);
    assert.equal(rooms[id].person.approach.y, 470);
  }
  assert.equal(rooms.library.obstacles.length, 10);
  assert.equal(rooms.club.obstacles.length, 8);
  assert.equal(rooms.library.bounds.top, 112);
  assert.equal(rooms.club.bounds.top, 158);
  assert.equal(roomForChallenge('explore-library-handoff'), rooms.library);
  assert.equal(roomForChallenge('explore-club-room'), rooms.club);
});

test('noninterview and unsupported IDs keep the existing activity shell', () => {
  for (const challenge of challengeCatalog.filter((item) => item.kind !== 'interview'))
    assert.equal(roomForChallenge(challenge.id), undefined, challenge.id);
  assert.equal(roomForChallenge('unknown-interview'), undefined);
  assert.equal(challengeById('explore-last-time')?.kind, 'interview');
});
