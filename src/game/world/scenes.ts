import type { NpcId } from '../types';
import type { WalkableWorld, WorldPoint } from './geometry';

export type WorldSceneId = 'campus' | 'canteen' | 'sports';
export interface WorldNpc {
  id: NpcId;
  position: WorldPoint;
  approach: WorldPoint;
}
export interface WorldPortal {
  id: string;
  label: string;
  position: WorldPoint;
  target: WorldSceneId;
  spawn: WorldPoint;
}
export interface AdventureWorld extends WalkableWorld {
  id: WorldSceneId;
  title: string;
  spawn: WorldPoint;
  npcs: readonly WorldNpc[];
  portals: readonly WorldPortal[];
}
const dimensions = { width: 1024, height: 1536 };

export const adventureWorlds: Record<WorldSceneId, AdventureWorld> = {
  campus: {
    ...dimensions,
    id: 'campus',
    title: 'Courtyard',
    spawn: { x: 512, y: 1290 },
    bounds: { left: 22, top: 100, right: 1002, bottom: 1510 },
    obstacles: [
      { kind: 'rect', x: 0, y: 0, width: 630, height: 115 },
      { kind: 'rect', x: 0, y: 100, width: 282, height: 245 },
      { kind: 'rect', x: 610, y: 110, width: 414, height: 250 },
      { kind: 'rect', x: 812, y: 375, width: 105, height: 113 },
      {
        kind: 'polygon',
        points: [
          { x: 0, y: 400 },
          { x: 288, y: 400 },
          { x: 309, y: 530 },
          { x: 0, y: 548 },
        ],
      },
      { kind: 'rect', x: 76, y: 577, width: 195, height: 134 },
      { kind: 'rect', x: 105, y: 744, width: 190, height: 124 },
      { kind: 'rect', x: 312, y: 535, width: 70, height: 251 },
      { kind: 'rect', x: 20, y: 862, width: 174, height: 116 },
      { kind: 'rect', x: 0, y: 985, width: 241, height: 97 },
      { kind: 'rect', x: 635, y: 534, width: 389, height: 544 },
      {
        kind: 'polygon',
        points: [
          { x: 0, y: 1100 },
          { x: 244, y: 1090 },
          { x: 317, y: 1235 },
          { x: 315, y: 1370 },
          { x: 0, y: 1370 },
        ],
      },
      { kind: 'rect', x: 705, y: 1090, width: 319, height: 291 },
      { kind: 'rect', x: 321, y: 1298, width: 83, height: 187 },
      { kind: 'rect', x: 593, y: 1298, width: 105, height: 187 },
      { kind: 'rect', x: 0, y: 1385, width: 320, height: 100 },
      { kind: 'rect', x: 699, y: 1385, width: 325, height: 100 },
    ],
    npcs: [{ id: 'mali', position: { x: 280, y: 1012 }, approach: { x: 374, y: 1035 } }],
    portals: [
      {
        id: 'campus-canteen',
        label: 'Canteen',
        position: { x: 744, y: 428 },
        target: 'canteen',
        spawn: { x: 510, y: 1385 },
      },
      {
        id: 'campus-sports',
        label: 'Sports path',
        position: { x: 558, y: 891 },
        target: 'sports',
        spawn: { x: 514, y: 1388 },
      },
    ],
  },
  canteen: {
    ...dimensions,
    id: 'canteen',
    title: 'Canteen',
    spawn: { x: 510, y: 1385 },
    bounds: { left: 28, top: 355, right: 996, bottom: 1510 },
    obstacles: [
      // Footprints measured from the accepted flat canteen-v2 master.
      { kind: 'rect', x: 0, y: 0, width: 748, height: 330 },
      { kind: 'rect', x: 0, y: 330, width: 303, height: 238 },
      { kind: 'rect', x: 0, y: 513, width: 120, height: 157 },
      { kind: 'rect', x: 900, y: 185, width: 124, height: 205 },
      {
        kind: 'polygon',
        points: [
          { x: 16, y: 695 },
          { x: 320, y: 690 },
          { x: 332, y: 790 },
          { x: 329, y: 1000 },
          { x: 5, y: 1005 },
          { x: 8, y: 780 },
        ],
      },
      {
        kind: 'polygon',
        points: [
          { x: 713, y: 846 },
          { x: 1024, y: 846 },
          { x: 1024, y: 1160 },
          { x: 703, y: 1160 },
          { x: 704, y: 957 },
        ],
      },
      { kind: 'rect', x: 0, y: 1200, width: 151, height: 113 },
      { kind: 'rect', x: 872, y: 1200, width: 152, height: 113 },
      { kind: 'rect', x: 0, y: 1305, width: 328, height: 231 },
      { kind: 'rect', x: 700, y: 1305, width: 324, height: 231 },
    ],
    npcs: [{ id: 'noa', position: { x: 558, y: 465 }, approach: { x: 558, y: 578 } }],
    portals: [
      {
        id: 'canteen-campus',
        label: 'Courtyard',
        position: { x: 510, y: 1450 },
        target: 'campus',
        spawn: { x: 788, y: 453 },
      },
    ],
  },
  sports: {
    ...dimensions,
    id: 'sports',
    title: 'Sports path',
    spawn: { x: 514, y: 1388 },
    bounds: { left: 28, top: 285, right: 996, bottom: 1510 },
    obstacles: [
      // Orthographic v2 moves the benches and squares off the planting beds.
      { kind: 'rect', x: 0, y: 0, width: 650, height: 270 },
      { kind: 'rect', x: 0, y: 275, width: 110, height: 262 },
      { kind: 'rect', x: 111, y: 505, width: 165, height: 97 },
      { kind: 'rect', x: 0, y: 546, width: 112, height: 133 },
      { kind: 'rect', x: 0, y: 674, width: 118, height: 168 },
      { kind: 'rect', x: 42, y: 800, width: 105, height: 213 },
      { kind: 'rect', x: 0, y: 958, width: 34, height: 100 },
      { kind: 'rect', x: 0, y: 1058, width: 144, height: 100 },
      { kind: 'rect', x: 678, y: 674, width: 346, height: 442 },
      { kind: 'rect', x: 825, y: 1090, width: 199, height: 98 },
      { kind: 'rect', x: 0, y: 1128, width: 304, height: 408 },
      { kind: 'rect', x: 263, y: 1268, width: 80, height: 268 },
      { kind: 'rect', x: 732, y: 1178, width: 292, height: 358 },
      { kind: 'rect', x: 684, y: 1268, width: 83, height: 268 },
    ],
    npcs: [{ id: 'ken', position: { x: 569, y: 755 }, approach: { x: 481, y: 819 } }],
    portals: [
      {
        id: 'sports-campus',
        label: 'Courtyard',
        position: { x: 514, y: 1450 },
        target: 'campus',
        spawn: { x: 543, y: 976 },
      },
    ],
  },
};

export function sceneForNpc(id: NpcId): AdventureWorld {
  return Object.values(adventureWorlds).find((world) => world.npcs.some((npc) => npc.id === id))!;
}
export function portalToNpc(world: AdventureWorld, id: NpcId): WorldPortal | undefined {
  const destination = sceneForNpc(id).id;
  return (
    world.portals.find((portal) => portal.target === destination) ??
    world.portals.find((portal) => portal.target === 'campus')
  );
}

const collisionWorlds = new WeakMap<AdventureWorld, WalkableWorld>();
/** People occupy ground too; an open-floor tap cannot walk through an NPC. */
export function navigationWorld(world: AdventureWorld): WalkableWorld {
  let collision = collisionWorlds.get(world);
  if (!collision) {
    collision = {
      ...world,
      obstacles: [
        ...world.obstacles,
        ...world.npcs.map((actor) => ({ kind: 'circle' as const, ...actor.position, radius: 26 })),
      ],
    };
    collisionWorlds.set(world, collision);
  }
  return collision;
}
