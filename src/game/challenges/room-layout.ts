import type { NpcId } from '../types';
import type { WalkableWorld, WorldPoint } from '../world/geometry';
import { adventureWorlds } from '../world/scenes';

export type StoryRoomId = 'shuttle' | 'lost-found' | 'library' | 'club';
export interface StoryRoomProp {
  id: string;
  label: string;
  itemId: string;
  position: WorldPoint;
  approach: WorldPoint;
}
export interface StoryRoomLayout extends WalkableWorld {
  id: StoryRoomId;
  title: string;
  character: NpcId;
  characterName: string;
  spawn: WorldPoint;
  person: { position: WorldPoint; approach: WorldPoint };
  props: readonly StoryRoomProp[];
}

/** Room provenance is in art/source/story-rooms; the first two reuse the original campus map. */
export const storyRoomArt = {
  shuttle: require('../../../assets/game/campus-map.webp') as number,
  'lost-found': require('../../../assets/game/campus-map.webp') as number,
  library: require('../../../assets/worlds/story-library/room-v1.webp') as number,
  club: require('../../../assets/worlds/story-club/room-v1.webp') as number,
};
export const storyRoomLoadingAssets: readonly number[] = Object.values(storyRoomArt);

// Library and club use square 1024 × 1024 masters; the reused campus is 1024 × 1536.
// Collision follows measured furniture envelopes, including plants and NPC feet.
const dimensions = { width: 1024, height: 1024 };
export const storyRooms: Record<StoryRoomId, StoryRoomLayout> = {
  shuttle: {
    ...adventureWorlds.campus,
    id: 'shuttle',
    title: 'Shuttle gate',
    character: 'mali',
    characterName: 'Mali',
    spawn: { x: 512, y: 1290 },
    person: { position: { x: 512, y: 1160 }, approach: { x: 512, y: 1260 } },
    obstacles: [
      ...adventureWorlds.campus.obstacles,
      { kind: 'circle', x: 512, y: 1160, radius: 28 },
    ],
    props: [
      {
        id: 'departure-poster',
        label: 'Shuttle poster',
        itemId: 'event',
        position: { x: 385, y: 1300 },
        approach: { x: 475, y: 1260 },
      },
      {
        id: 'next-stop',
        label: 'Walk to next stop',
        itemId: 'impact',
        position: { x: 512, y: 1440 },
        approach: { x: 512, y: 1380 },
      },
    ],
  },
  'lost-found': {
    ...adventureWorlds.campus,
    id: 'lost-found',
    title: 'Lost-and-found desk',
    character: 'noa',
    characterName: 'Noa',
    spawn: { x: 512, y: 950 },
    person: { position: { x: 530, y: 700 }, approach: { x: 530, y: 800 } },
    obstacles: [
      ...adventureWorlds.campus.obstacles,
      { kind: 'circle', x: 530, y: 700, radius: 28 },
    ],
    props: [
      {
        id: 'desk-notebook',
        label: 'Paper notebook',
        itemId: 'notebook',
        position: { x: 175, y: 625 },
        approach: { x: 435, y: 620 },
      },
      {
        id: 'lost-items',
        label: 'Lost items',
        itemId: 'search',
        position: { x: 95, y: 900 },
        approach: { x: 315, y: 940 },
      },
    ],
  },
  library: {
    ...dimensions,
    id: 'library',
    title: 'Library',
    character: 'mali',
    characterName: 'Mali',
    spawn: { x: 512, y: 950 },
    person: { position: { x: 530, y: 370 }, approach: { x: 530, y: 470 } },
    bounds: { left: 32, top: 112, right: 992, bottom: 1024 },
    obstacles: [
      { kind: 'rect', x: 350, y: 28, width: 452, height: 192 },
      { kind: 'rect', x: 32, y: 218, width: 246, height: 430 },
      { kind: 'rect', x: 777, y: 264, width: 216, height: 254 },
      { kind: 'rect', x: 714, y: 635, width: 288, height: 209 },
      { kind: 'rect', x: 30, y: 689, width: 218, height: 190 },
      { kind: 'rect', x: 0, y: 920, width: 329, height: 104 },
      { kind: 'rect', x: 696, y: 920, width: 328, height: 104 },
      { kind: 'circle', x: 287, y: 130, radius: 58 },
      { kind: 'circle', x: 866, y: 127, radius: 55 },
      { kind: 'circle', x: 530, y: 370, radius: 28 },
    ],
    props: [
      {
        id: 'catalog',
        label: 'Catalog desk',
        itemId: 'catalog-claim',
        position: { x: 550, y: 190 },
        approach: { x: 440, y: 286 },
      },
      {
        id: 'exit',
        label: 'Library exit',
        itemId: 'wasted-walk',
        position: { x: 512, y: 1000 },
        approach: { x: 512, y: 878 },
      },
      {
        id: 'returns',
        label: 'Return cart',
        itemId: 'handoff-question',
        position: { x: 886, y: 398 },
        approach: { x: 709, y: 448 },
      },
    ],
  },
  club: {
    ...dimensions,
    id: 'club',
    title: 'Astronomy club',
    character: 'ken',
    characterName: 'Ken',
    spawn: { x: 512, y: 950 },
    person: { position: { x: 530, y: 370 }, approach: { x: 530, y: 470 } },
    bounds: { left: 28, top: 158, right: 996, bottom: 1024 },
    obstacles: [
      { kind: 'rect', x: 26, y: 123, width: 216, height: 261 },
      { kind: 'rect', x: 824, y: 170, width: 177, height: 295 },
      { kind: 'rect', x: 27, y: 442, width: 219, height: 312 },
      { kind: 'rect', x: 882, y: 501, width: 114, height: 408 },
      { kind: 'rect', x: 22, y: 754, width: 158, height: 181 },
      { kind: 'rect', x: 0, y: 951, width: 327, height: 73 },
      { kind: 'rect', x: 699, y: 951, width: 325, height: 73 },
      { kind: 'circle', x: 530, y: 370, radius: 28 },
    ],
    props: [
      {
        id: 'poster',
        label: 'Room poster',
        itemId: 'room-change',
        position: { x: 895, y: 308 },
        approach: { x: 736, y: 395 },
      },
      {
        id: 'meeting',
        label: 'Meeting chairs',
        itemId: 'missed-start',
        position: { x: 938, y: 665 },
        approach: { x: 771, y: 665 },
      },
      {
        id: 'noticeboard',
        label: 'Club board',
        itemId: 'reminder-question',
        position: { x: 523, y: 113 },
        approach: { x: 635, y: 244 },
      },
    ],
  },
};

/** Only these authored interviews receive a walkable room; all gates stay in the shell. */
export function roomForChallenge(challengeId: string): StoryRoomLayout | undefined {
  if (challengeId === 'explore-last-time') return storyRooms.shuttle;
  if (challengeId === 'explore-workaround') return storyRooms['lost-found'];
  if (challengeId === 'explore-library-handoff') return storyRooms.library;
  if (challengeId === 'explore-club-room') return storyRooms.club;
  return undefined;
}
