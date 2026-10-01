export type SignalPoint = Readonly<{ x: number; y: number }>;

/** A detached scalar snapshot, safe to capture in a worklet without array indexing. */
export type SignalPath = Readonly<{
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  key: string;
}>;

export type SignalSample = { x: number; y: number; valid: boolean; delivered: boolean };
export type SignalRun = Readonly<{ epoch: number; pathKey: string; linksKey: string }>;

function isFinitePoint(point: unknown): point is SignalPoint {
  if (!point || typeof point !== 'object') return false;
  const candidate = point as Partial<SignalPoint>;
  return Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
}

/** The caller supplies the measured centers in tap, load, queues, render order. */
export function createSignalPath(
  points: readonly SignalPoint[] | null | undefined,
): SignalPath | null {
  if (!Array.isArray(points) || points.length !== 4) return null;
  const [p0, p1, p2, p3] = points;
  if (!isFinitePoint(p0) || !isFinitePoint(p1) || !isFinitePoint(p2) || !isFinitePoint(p3))
    return null;
  return {
    x0: p0.x,
    y0: p0.y,
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    x3: p3.x,
    y3: p3.y,
    key: JSON.stringify([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]),
  };
}

/** Invalid data hides the signal and must never authorize a delivered result. */
export function sampleSignalPath(
  path: SignalPath | null | undefined,
  progress: number,
): SignalSample {
  'worklet';
  if (
    !path ||
    typeof path !== 'object' ||
    typeof path.key !== 'string' ||
    !path.key.length ||
    !Number.isFinite(path.x0) ||
    !Number.isFinite(path.y0) ||
    !Number.isFinite(path.x1) ||
    !Number.isFinite(path.y1) ||
    !Number.isFinite(path.x2) ||
    !Number.isFinite(path.y2) ||
    !Number.isFinite(path.x3) ||
    !Number.isFinite(path.y3) ||
    !Number.isFinite(progress)
  )
    return { x: 0, y: 0, valid: false, delivered: false };

  const bounded = Math.max(0, Math.min(1, progress));
  const distance = bounded * 3;
  let x: number;
  let y: number;
  // Weighted endpoints also avoid overflowing (to - from) for large finite coordinates.
  if (distance <= 1) {
    x = path.x0 * (1 - distance) + path.x1 * distance;
    y = path.y0 * (1 - distance) + path.y1 * distance;
  } else if (distance <= 2) {
    const fraction = distance - 1;
    x = path.x1 * (1 - fraction) + path.x2 * fraction;
    y = path.y1 * (1 - fraction) + path.y2 * fraction;
  } else {
    const fraction = distance - 2;
    x = path.x2 * (1 - fraction) + path.x3 * fraction;
    y = path.y2 * (1 - fraction) + path.y3 * fraction;
  }
  if (!Number.isFinite(x) || !Number.isFinite(y))
    return { x: 0, y: 0, valid: false, delivered: false };
  return { x, y, valid: true, delivered: progress === 1 };
}

/** Increment epoch on cancellation/unmount, even when geometry and links later match again. */
export function isSignalRunCurrent(
  run: SignalRun | null | undefined,
  currentEpoch: number,
  pathKey: string,
  linksKey: string,
): boolean {
  return !!(
    run &&
    typeof run === 'object' &&
    Number.isSafeInteger(currentEpoch) &&
    currentEpoch >= 0 &&
    Number.isSafeInteger(run.epoch) &&
    run.epoch === currentEpoch &&
    typeof pathKey === 'string' &&
    pathKey.length > 0 &&
    typeof linksKey === 'string' &&
    linksKey.length > 0 &&
    run.pathKey === pathKey &&
    run.linksKey === linksKey
  );
}
