/** All scene coordinates use the background's 1024 × 1536 art space. */
export interface WorldPoint {
  x: number;
  y: number;
}
export type WorldObstacle =
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'polygon'; points: readonly WorldPoint[] };
export interface WalkableWorld {
  width: number;
  height: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  obstacles: readonly WorldObstacle[];
}
export const PLAYER_FOOT_RADIUS = 18;
export const PATH_CELL = 28;
export const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function pointSegmentDistance(point: WorldPoint, a: WorldPoint, b: WorldPoint) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
function inPolygon(point: WorldPoint, points: readonly WorldPoint[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function isWalkable(world: WalkableWorld, point: WorldPoint, radius = PLAYER_FOOT_RADIUS) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const { bounds } = world;
  if (
    point.x < bounds.left + radius ||
    point.x > bounds.right - radius ||
    point.y < bounds.top + radius ||
    point.y > bounds.bottom - radius
  )
    return false;
  return !world.obstacles.some((obstacle) => {
    if (obstacle.kind === 'rect') {
      // Rounded corner clearance preserves the avatar's circular foot footprint.
      const x = Math.max(obstacle.x, Math.min(point.x, obstacle.x + obstacle.width));
      const y = Math.max(obstacle.y, Math.min(point.y, obstacle.y + obstacle.height));
      return Math.hypot(point.x - x, point.y - y) <= radius;
    }
    if (obstacle.kind === 'circle')
      return Math.hypot(point.x - obstacle.x, point.y - obstacle.y) <= obstacle.radius + radius;
    if (inPolygon(point, obstacle.points)) return true;
    return obstacle.points.some(
      (a, index) =>
        pointSegmentDistance(point, a, obstacle.points[(index + 1) % obstacle.points.length]) <=
        radius,
    );
  });
}
export function clearSegment(world: WalkableWorld, from: WorldPoint, to: WorldPoint) {
  // Half a foot radius is smaller than any authored collision feature. This also
  // checks diagonal edges, so grid shortcuts cannot clip furniture corners.
  const steps = Math.max(1, Math.ceil(distance(from, to) / (PLAYER_FOOT_RADIUS / 2)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(world, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }))
      return false;
  }
  return true;
}

interface Cell {
  point: WorldPoint;
  col: number;
  row: number;
  key: string;
}
const key = (col: number, row: number) => `${col}:${row}`;
function navigationCells(world: WalkableWorld) {
  const cells = new Map<string, Cell>();
  for (let row = 0; row * PATH_CELL < world.height; row++) {
    for (let col = 0; col * PATH_CELL < world.width; col++) {
      const point = { x: col * PATH_CELL + PATH_CELL / 2, y: row * PATH_CELL + PATH_CELL / 2 };
      if (isWalkable(world, point))
        cells.set(key(col, row), { point, col, row, key: key(col, row) });
    }
  }
  return cells;
}
const cellCache = new WeakMap<WalkableWorld, Map<string, Cell>>();
function cellsFor(world: WalkableWorld) {
  let cells = cellCache.get(world);
  if (!cells) {
    cells = navigationCells(world);
    cellCache.set(world, cells);
  }
  return cells;
}
function simplify(world: WalkableWorld, route: WorldPoint[]) {
  const result = [route[0]];
  let index = 0;
  while (index < route.length - 1) {
    let next = route.length - 1;
    while (next > index + 1 && !clearSegment(world, route[index], route[next])) next--;
    result.push(route[next]);
    index = next;
  }
  return result;
}

/** A blocked/outside tap walks to the closest reachable ground, never through it. */
export function planWorldPath(
  world: WalkableWorld,
  from: WorldPoint,
  requested: WorldPoint,
): WorldPoint[] {
  if (!isWalkable(world, from) || !Number.isFinite(requested.x) || !Number.isFinite(requested.y))
    return [];
  if (clearSegment(world, from, requested))
    return distance(from, requested) < 1 ? [from] : [from, requested];
  const cells = cellsFor(world);
  const start = [...cells.values()]
    .sort((a, b) => distance(a.point, from) - distance(b.point, from))
    .find((cell) => clearSegment(world, from, cell.point));
  if (!start) return [from];
  const target = [...cells.values()].sort(
    (a, b) => distance(a.point, requested) - distance(b.point, requested),
  )[0];
  if (!target) return [from];
  const open: Cell[] = [start];
  const queued = new Set([start.key]),
    closed = new Set<string>();
  const cost = new Map([[start.key, 0]]),
    previous = new Map<string, string>();
  let closest = start;
  while (open.length) {
    open.sort(
      (a, b) =>
        cost.get(a.key)! +
        distance(a.point, target.point) -
        (cost.get(b.key)! + distance(b.point, target.point)),
    );
    const current = open.shift()!;
    queued.delete(current.key);
    if (closed.has(current.key)) continue;
    closed.add(current.key);
    if (distance(current.point, requested) < distance(closest.point, requested)) closest = current;
    if (current.key === target.key) {
      closest = current;
      break;
    }
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const neighbor = cells.get(key(current.col + dx, current.row + dy));
        if (
          !neighbor ||
          closed.has(neighbor.key) ||
          !clearSegment(world, current.point, neighbor.point)
        )
          continue;
        const candidate = cost.get(current.key)! + distance(current.point, neighbor.point);
        if (candidate >= (cost.get(neighbor.key) ?? Infinity)) continue;
        cost.set(neighbor.key, candidate);
        previous.set(neighbor.key, current.key);
        if (!queued.has(neighbor.key)) {
          open.push(neighbor);
          queued.add(neighbor.key);
        }
      }
  }
  const route = [closest.point];
  let cursor = closest.key;
  while (previous.has(cursor)) {
    cursor = previous.get(cursor)!;
    route.unshift(cells.get(cursor)!.point);
  }
  route.unshift(from);
  if (isWalkable(world, requested) && clearSegment(world, closest.point, requested))
    route.push(requested);
  return simplify(world, route);
}

export function pathLength(path: readonly WorldPoint[]) {
  return path.reduce(
    (total, point, index) => total + (index ? distance(path[index - 1], point) : 0),
    0,
  );
}
export function worldFacing(from: WorldPoint, to: WorldPoint): 'left' | 'right' | 'front' | 'back' {
  const x = to.x - from.x,
    y = to.y - from.y;
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'back' : 'front';
}
