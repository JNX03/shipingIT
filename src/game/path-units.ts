/** Unit colors keep the long learning path legible without adding extra screen chrome. */
const unitThemes = [
  { tint: '#BC413D', edge: '#8B2B28', ground: '#FFE2DC', character: 'mali', scene: 'garden-clues' },
  {
    tint: '#B9324D',
    edge: '#8E233A',
    ground: '#FBD5DF',
    character: 'noa',
    scene: 'evidence-board',
  },
  {
    tint: '#4B7E17',
    edge: '#365D10',
    ground: '#DDF2B8',
    character: 'noa',
    scene: 'feature-workshop',
  },
  {
    tint: '#167A45',
    edge: '#105A32',
    ground: '#CDEDD7',
    character: 'mali',
    scene: 'prototype-bench',
  },
  { tint: '#97630A', edge: '#704805', ground: '#FFE9B0', character: 'noa', scene: 'test-lab' },
  {
    tint: '#856616',
    edge: '#634B0D',
    ground: '#F4E4A7',
    character: 'mali',
    scene: 'business-desk',
  },
  { tint: '#1F66AC', edge: '#144D84', ground: '#D0E8FF', character: 'noa', scene: 'circuit-board' },
  { tint: '#304C97', edge: '#182D69', ground: '#102B59', character: 'noa', scene: 'launch-space' },
] as const;

export function pathUnitTheme(unitId: number) {
  return unitThemes[Math.max(0, Math.min(unitThemes.length - 1, unitId - 1))]!;
}

export function pathActorVisible(
  rowTop: number | undefined,
  rowHeight: number,
  viewportTop: number,
  viewportHeight: number,
): boolean {
  if (rowTop === undefined || !Number.isFinite(rowTop) || viewportHeight <= 0) return false;
  // Require part of the actual actor, rather than merely its long unit, to be visible.
  return (
    rowTop + Math.min(rowHeight, 110) > viewportTop + 8 &&
    rowTop + 16 < viewportTop + viewportHeight - 8
  );
}

/** The sticky strip describes the section touching the scroll viewport's top edge. */
export function visiblePathUnit(
  positions: Readonly<Record<number, number>>,
  scrollY: number,
  fallback = 1,
): number {
  const ordered = Object.entries(positions)
    .map(([id, top]) => ({ id: Number(id), top }))
    .filter(({ id, top }) => Number.isFinite(id) && Number.isFinite(top))
    .sort((a, b) => a.top - b.top);
  if (!ordered.length) return fallback;
  let visible = ordered[0]!.id;
  for (const position of ordered) {
    if (position.top > Math.max(0, scrollY) + 12) break;
    visible = position.id;
  }
  return visible;
}
