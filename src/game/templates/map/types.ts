export const mapPieceIds = ['places', 'routes', 'map', 'directions', 'landmarks'] as const;
export type MapPieceId = (typeof mapPieceIds)[number];
export const mapPlaceIds = [
  'gate',
  'quad',
  'library',
  'garden',
  'ramp',
  'stairs',
  'lab',
  'cafe',
  'studio',
] as const;
export type MapPlaceId = (typeof mapPlaceIds)[number];
export const mapActionIds = ['plan-route', 'draw-route', 'read-directions'] as const;
export type MapActionId = (typeof mapActionIds)[number];
export type MapRoutePreference = 'fastest' | 'step-free' | 'landmark';
export type MapAccent = 'forest' | 'indigo' | 'amber';

export interface CampusTrip {
  origin: MapPlaceId;
  destination: MapPlaceId;
  preference: MapRoutePreference;
  landmark: MapPlaceId;
}

/** Separate from the saved Lunch Lens GameDraft. Owned and persisted by the host. */
export interface CampusCompassDraft {
  version: 1;
  templateId: 'map';
  pieces: MapPieceId[];
  style: {
    accent: MapAccent;
    labels: 'all' | 'key';
    directions: 'landmarks' | 'compact';
  };
  defaultTrip: CampusTrip;
  connections: MapActionId[];
}

export interface CampusPlace {
  id: MapPlaceId;
  name: string;
  shortName: string;
  description: string;
  x: number;
  y: number;
  destination: boolean;
}

export interface CampusPath {
  id: string;
  from: MapPlaceId;
  to: MapPlaceId;
  meters: number;
  terrain: 'flat' | 'ramp' | 'stairs';
  stairFlights: number;
  cue: string;
}

export interface CampusRoute {
  id: string;
  preference: MapRoutePreference;
  title: string;
  nodes: MapPlaceId[];
  pathIds: string[];
  meters: number;
  minutes: number;
  stairFlights: number;
  rampCount: number;
}

export interface CampusDirection {
  id: string;
  text: string;
  from: MapPlaceId;
  to: MapPlaceId;
  terrain: CampusPath['terrain'];
}

export interface CampusPlan {
  trip: CampusTrip;
  options: CampusRoute[];
  route: CampusRoute | null;
  mapRoute: CampusRoute | null;
  directions: CampusDirection[];
  message: string;
}

export interface CampusInteraction {
  kind:
    | 'places-changed'
    | 'route-selected'
    | 'landmark-inspected'
    | 'landmark-selected'
    | 'directions-opened';
  trip: CampusTrip;
  routeId?: string;
}

export interface CampusTestCheck {
  id: string;
  label: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface CampusTestResult {
  id: 'can-find-lab-without-stairs';
  title: string;
  passed: boolean;
  signature: string;
  checks: CampusTestCheck[];
  plan: CampusPlan;
}
