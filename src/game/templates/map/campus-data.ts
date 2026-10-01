import type { CampusPath, CampusPlace, MapPieceId } from './types';

export const campusName = 'Willow Demo Campus';
export const campusDataNotice = 'Fictional campus · authored practice routes';
export const campusMapSize = { width: 340, height: 380 } as const;

/** Original diagram coordinates and authored distances, never live navigation data. */
export const campusPlaces: readonly CampusPlace[] = [
  {
    id: 'gate',
    name: 'South Gate',
    shortName: 'Gate',
    x: 44,
    y: 250,
    destination: true,
    description: 'The start of the campus walk. Look for the blue welcome sign.',
  },
  {
    id: 'quad',
    name: 'Fountain Quad',
    shortName: 'Fountain',
    x: 146,
    y: 250,
    destination: false,
    description: 'The round fountain marks the split between the stairs and ramp paths.',
  },
  {
    id: 'library',
    name: 'Willow Library',
    shortName: 'Library',
    x: 144,
    y: 52,
    destination: true,
    description: 'A quiet landmark with a large clock over the entrance.',
  },
  {
    id: 'garden',
    name: 'Fern Garden',
    shortName: 'Garden',
    x: 44,
    y: 114,
    destination: true,
    description: 'A shaded path. The green arch leads toward the ramp junction.',
  },
  {
    id: 'ramp',
    name: 'Ramp Junction',
    shortName: 'Ramp',
    x: 144,
    y: 138,
    destination: false,
    description:
      'Follow the wide sloped path to the lab’s west entrance. No stairs on this segment.',
  },
  {
    id: 'stairs',
    name: 'East Steps',
    shortName: 'Steps',
    x: 254,
    y: 238,
    destination: false,
    description: 'The shortcut to the lab has two flights of stairs.',
  },
  {
    id: 'lab',
    name: 'Science Lab',
    shortName: 'Lab',
    x: 268,
    y: 112,
    destination: true,
    description: 'The lab has a west ramp entrance and an east stair entrance.',
  },
  {
    id: 'cafe',
    name: 'Orchard Café',
    shortName: 'Café',
    x: 274,
    y: 322,
    destination: true,
    description: 'The orange canopy is visible from the fountain path.',
  },
  {
    id: 'studio',
    name: 'Art Studio',
    shortName: 'Studio',
    x: 54,
    y: 332,
    destination: true,
    description: 'The painted wall marks the studio just south of the gate.',
  },
];

export const campusPaths: readonly CampusPath[] = [
  {
    id: 'gate-quad',
    from: 'gate',
    to: 'quad',
    meters: 95,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the broad path beside the welcome sign.',
  },
  {
    id: 'quad-stairs',
    from: 'quad',
    to: 'stairs',
    meters: 70,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Take the east path past the fountain.',
  },
  {
    id: 'stairs-lab',
    from: 'stairs',
    to: 'lab',
    meters: 55,
    terrain: 'stairs',
    stairFlights: 2,
    cue: 'Use the two flights of steps at the lab’s east entrance.',
  },
  {
    id: 'quad-ramp',
    from: 'quad',
    to: 'ramp',
    meters: 115,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the blue ramp signs north of the fountain.',
  },
  {
    id: 'ramp-lab',
    from: 'ramp',
    to: 'lab',
    meters: 135,
    terrain: 'ramp',
    stairFlights: 0,
    cue: 'Follow the wide ramp to the lab’s west entrance.',
  },
  {
    id: 'gate-garden',
    from: 'gate',
    to: 'garden',
    meters: 125,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Walk beside the fern beds under the green arch.',
  },
  {
    id: 'garden-ramp',
    from: 'garden',
    to: 'ramp',
    meters: 95,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the garden path to the ramp signs.',
  },
  {
    id: 'ramp-library',
    from: 'ramp',
    to: 'library',
    meters: 90,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the clock signs along the library path.',
  },
  {
    id: 'quad-cafe',
    from: 'quad',
    to: 'cafe',
    meters: 130,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the orange canopy signs past the lawn.',
  },
  {
    id: 'gate-studio',
    from: 'gate',
    to: 'studio',
    meters: 80,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the painted-wall path south of the gate.',
  },
  {
    id: 'studio-cafe',
    from: 'studio',
    to: 'cafe',
    meters: 220,
    terrain: 'flat',
    stairFlights: 0,
    cue: 'Follow the south promenade beside the orchard.',
  },
];

export const mapPieceDefinitions: Record<
  MapPieceId,
  { title: string; detail: string; required: boolean }
> = {
  places: { title: 'From + to', detail: 'Choose where the walk starts and ends.', required: true },
  routes: {
    title: 'Route choices',
    detail: 'Compare the shortcut, ramp and landmark routes.',
    required: true,
  },
  map: {
    title: 'Campus map',
    detail: 'Draw the selected route between real points in the diagram.',
    required: true,
  },
  directions: {
    title: 'Directions',
    detail: 'Turn the selected path into a readable walk.',
    required: true,
  },
  landmarks: {
    title: 'Landmark cards',
    detail: 'Inspect a place and route via its landmark.',
    required: false,
  },
};

export const mapAccents = {
  forest: { primary: '#176653', soft: '#E3F2E9', map: '#F3F8EF' },
  indigo: { primary: '#4545A7', soft: '#ECECFC', map: '#F5F4FD' },
  amber: { primary: '#855306', soft: '#FFF0CD', map: '#FFF9EC' },
} as const;
