import { campusPaths, campusPlaces, mapPieceDefinitions } from './campus-data';
import {
  mapActionIds,
  mapPieceIds,
  mapPlaceIds,
  type CampusCompassDraft,
  type CampusDirection,
  type CampusPath,
  type CampusPlan,
  type CampusRoute,
  type CampusTestResult,
  type CampusTrip,
  type MapPieceId,
  type MapPlaceId,
  type MapRoutePreference,
} from './types';

export function createCampusCompassDraft(): CampusCompassDraft {
  return {
    version: 1,
    templateId: 'map',
    pieces: ['places', 'map'],
    style: { accent: 'forest', labels: 'all', directions: 'landmarks' },
    defaultTrip: { origin: 'gate', destination: 'lab', preference: 'fastest', landmark: 'library' },
    connections: [],
  };
}

export function campusCompassExampleDraft(): CampusCompassDraft {
  return {
    ...createCampusCompassDraft(),
    pieces: [...mapPieceIds],
    connections: [...mapActionIds],
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function place(value: unknown, fallback: MapPlaceId): MapPlaceId {
  return mapPlaceIds.includes(value as MapPlaceId) ? (value as MapPlaceId) : fallback;
}

/** Validate persisted JSON at the boundary; unknown values never reach the graph/UI. */
export function normalizeCampusCompassDraft(value: unknown): CampusCompassDraft {
  const fallback = createCampusCompassDraft();
  const raw = record(value);
  const style = record(raw.style);
  const trip = record(raw.defaultTrip);
  return {
    ...fallback,
    pieces: Array.isArray(raw.pieces)
      ? [
          ...new Set(
            raw.pieces.filter((id): id is MapPieceId => mapPieceIds.includes(id as MapPieceId)),
          ),
        ]
      : fallback.pieces,
    connections: Array.isArray(raw.connections)
      ? mapActionIds.filter(
          (id) => raw.connections instanceof Array && raw.connections.includes(id),
        )
      : fallback.connections,
    style: {
      accent: style.accent === 'indigo' || style.accent === 'amber' ? style.accent : 'forest',
      labels: style.labels === 'key' ? 'key' : 'all',
      directions: style.directions === 'compact' ? 'compact' : 'landmarks',
    },
    defaultTrip: {
      origin: place(trip.origin, fallback.defaultTrip.origin),
      destination: place(trip.destination, fallback.defaultTrip.destination),
      landmark: place(trip.landmark, fallback.defaultTrip.landmark),
      preference:
        trip.preference === 'step-free' || trip.preference === 'landmark'
          ? trip.preference
          : 'fastest',
    },
  };
}

export function campusDraftSignature(draft: CampusCompassDraft): string {
  return JSON.stringify(draft);
}

export function getCampusPlace(id: MapPlaceId) {
  return campusPlaces.find((entry) => entry.id === id)!;
}

type PathWalk = { nodes: MapPlaceId[]; paths: CampusPath[] };

function shortestWalk(
  origin: MapPlaceId,
  destination: MapPlaceId,
  avoidStairs: boolean,
): PathWalk | null {
  if (origin === destination) return { nodes: [origin], paths: [] };
  const distance = new Map<MapPlaceId, number>([[origin, 0]]);
  const previous = new Map<MapPlaceId, { node: MapPlaceId; path: CampusPath }>();
  const visited = new Set<MapPlaceId>();
  while (true) {
    const next = [...distance.entries()]
      .filter(([id]) => !visited.has(id))
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
    if (!next) return null;
    const [node, meters] = next;
    if (node === destination) break;
    visited.add(node);
    for (const path of campusPaths) {
      if (avoidStairs && path.terrain === 'stairs') continue;
      const neighbor = path.from === node ? path.to : path.to === node ? path.from : null;
      if (!neighbor || visited.has(neighbor)) continue;
      const candidate = meters + path.meters;
      if (candidate < (distance.get(neighbor) ?? Infinity)) {
        distance.set(neighbor, candidate);
        previous.set(neighbor, { node, path });
      }
    }
  }
  const nodes: MapPlaceId[] = [destination];
  const paths: CampusPath[] = [];
  let cursor = destination;
  while (cursor !== origin) {
    const step = previous.get(cursor);
    if (!step) return null;
    paths.unshift(step.path);
    nodes.unshift(step.node);
    cursor = step.node;
  }
  return { nodes, paths };
}

function routeFromWalk(walk: PathWalk, preference: MapRoutePreference, title: string): CampusRoute {
  const meters = walk.paths.reduce((total, path) => total + path.meters, 0);
  const stairFlights = walk.paths.reduce((total, path) => total + path.stairFlights, 0);
  return {
    id: `${preference}:${walk.nodes.join('>')}`,
    preference,
    title,
    nodes: walk.nodes,
    pathIds: walk.paths.map((path) => path.id),
    meters,
    minutes: meters === 0 ? 0 : Math.max(1, Math.ceil(meters / 75 + stairFlights * 0.25)),
    stairFlights,
    rampCount: walk.paths.filter((path) => path.terrain === 'ramp').length,
  };
}

export function findCampusRoutes(trip: CampusTrip): CampusRoute[] {
  if (
    !campusPlaces.some((entry) => entry.id === trip.origin) ||
    !campusPlaces.some((entry) => entry.id === trip.destination)
  )
    return [];
  const fastest = shortestWalk(trip.origin, trip.destination, false);
  const stepFree = shortestWalk(trip.origin, trip.destination, true);
  const toLandmark = shortestWalk(trip.origin, trip.landmark, true);
  const fromLandmark = shortestWalk(trip.landmark, trip.destination, true);
  const routes: CampusRoute[] = [];
  if (fastest) routes.push(routeFromWalk(fastest, 'fastest', 'Shortest walk'));
  if (stepFree) routes.push(routeFromWalk(stepFree, 'step-free', 'No stairs'));
  if (trip.origin !== trip.destination && toLandmark && fromLandmark) {
    const walk = {
      nodes: [...toLandmark.nodes, ...fromLandmark.nodes.slice(1)],
      paths: [...toLandmark.paths, ...fromLandmark.paths],
    };
    routes.push(routeFromWalk(walk, 'landmark', `Via ${getCampusPlace(trip.landmark).shortName}`));
  }
  return routes;
}

export function campusRouteDirections(
  route: CampusRoute,
  detail: CampusCompassDraft['style']['directions'],
): CampusDirection[] {
  return route.pathIds.map((id, index) => {
    const path = campusPaths.find((entry) => entry.id === id)!;
    const from = route.nodes[index];
    const to = route.nodes[index + 1];
    const terrain =
      path.terrain === 'stairs'
        ? ' · 2 flights of stairs'
        : path.terrain === 'ramp'
          ? ' · ramp'
          : '';
    const heading = `${getCampusPlace(from).shortName} → ${getCampusPlace(to).shortName} · ${path.meters} m${terrain}`;
    const cue =
      path.from === from
        ? path.cue
        : `Follow the ${path.terrain === 'stairs' ? 'stairway' : path.terrain === 'ramp' ? 'wide ramp' : 'campus path'} toward ${getCampusPlace(to).name}.`;
    return {
      id: `${index}:${id}`,
      from,
      to,
      terrain: path.terrain,
      text: detail === 'compact' ? heading : `${heading}. ${cue}`,
    };
  });
}

export function planCampusTrip(
  draft: CampusCompassDraft,
  trip: CampusTrip = draft.defaultTrip,
): CampusPlan {
  const empty: CampusPlan = {
    trip,
    options: [],
    route: null,
    mapRoute: null,
    directions: [],
    message: '',
  };
  if (!draft.pieces.includes('places') || !draft.pieces.includes('routes'))
    return { ...empty, message: 'Add From + to and Route choices to plan a walk.' };
  if (!draft.connections.includes('plan-route'))
    return { ...empty, message: 'Connect From + to → Route choices. The trip has no route yet.' };
  const options = findCampusRoutes(trip);
  const route = options.find((entry) => entry.preference === trip.preference) ?? options[0] ?? null;
  if (!route) return { ...empty, message: 'No route found for these places.' };
  return {
    trip,
    options,
    route,
    mapRoute:
      draft.pieces.includes('map') && draft.connections.includes('draw-route') ? route : null,
    directions:
      draft.pieces.includes('directions') && draft.connections.includes('read-directions')
        ? campusRouteDirections(route, draft.style.directions)
        : [],
    message:
      route.meters === 0
        ? `You are already at ${getCampusPlace(trip.destination).name}.`
        : `${route.title} · ${route.minutes} min · ${route.meters} m · ${route.stairFlights === 0 ? 'no stairs' : `${route.stairFlights} flights of stairs`}`,
  };
}

export function checkCampusCompassBuild(draft: CampusCompassDraft): {
  valid: boolean;
  message: string;
  issues: string[];
} {
  const issues: string[] = [];
  for (const id of mapPieceIds)
    if (mapPieceDefinitions[id].required && !draft.pieces.includes(id))
      issues.push(`Add ${mapPieceDefinitions[id].title}.`);
  for (const id of mapActionIds)
    if (!draft.connections.includes(id))
      issues.push(
        id === 'plan-route'
          ? 'Connect From + to → Route choices.'
          : id === 'draw-route'
            ? 'Connect Route choices → Campus map.'
            : 'Connect Route choices → Directions.',
      );
  if (draft.defaultTrip.origin === draft.defaultTrip.destination)
    issues.push('Choose different starting and ending places for the opening trip.');
  return {
    valid: issues.length === 0,
    message: issues[0] ?? 'Your map app can plan, draw and explain a walk.',
    issues,
  };
}

/** Uses the same planner as the playable app; no independent canned passing output. */
export function runCampusCompassTest(draft: CampusCompassDraft): CampusTestResult {
  const trip: CampusTrip = {
    origin: 'gate',
    destination: 'lab',
    preference: 'step-free',
    landmark: 'library',
  };
  const plan = planCampusTrip(draft, trip);
  const route = plan.route;
  const last = plan.directions[plan.directions.length - 1];
  const checks = [
    {
      id: 'places',
      label: 'Find the lab',
      expected: 'South Gate → Science Lab',
      actual: route
        ? `${getCampusPlace(route.nodes[0]).name} → ${getCampusPlace(route.nodes[route.nodes.length - 1]).name}`
        : plan.message,
      passed: route?.nodes[0] === 'gate' && route.nodes[route.nodes.length - 1] === 'lab',
    },
    {
      id: 'stairs',
      label: 'Avoid stairs',
      expected: '0 flights of stairs',
      actual: route ? `${route.stairFlights} flights of stairs` : 'No usable route',
      passed: route !== null && route.preference === 'step-free' && route.stairFlights === 0,
    },
    {
      id: 'map',
      label: 'See the route',
      expected: 'Selected walk drawn on the campus map',
      actual: plan.mapRoute ? `${plan.mapRoute.meters} m path drawn` : 'Map has no connected route',
      passed: plan.mapRoute !== null && plan.mapRoute.id === route?.id,
    },
    {
      id: 'directions',
      label: 'Follow directions',
      expected: 'Directions match the map and end at the lab',
      actual: last
        ? `${plan.directions.length} segments · ends at ${getCampusPlace(last.to).name}`
        : 'No connected directions',
      passed: Boolean(
        route &&
        plan.directions.length === route.pathIds.length &&
        last?.to === 'lab' &&
        plan.directions.every(
          (step, i) =>
            step.from === route.nodes[i] &&
            step.to === route.nodes[i + 1] &&
            step.terrain !== 'stairs',
        ),
      ),
    },
  ];
  return {
    id: 'can-find-lab-without-stairs',
    title: 'Can I find the lab without stairs?',
    passed: checks.every((check) => check.passed),
    signature: campusDraftSignature(draft),
    checks,
    plan,
  };
}

export function moveMapPiece(
  draft: CampusCompassDraft,
  id: MapPieceId,
  offset: -1 | 1,
): CampusCompassDraft {
  const index = draft.pieces.indexOf(id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= draft.pieces.length) return draft;
  const pieces = [...draft.pieces];
  [pieces[index], pieces[target]] = [pieces[target], pieces[index]];
  return { ...draft, pieces };
}
