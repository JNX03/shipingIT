export type PathAnchor = { x: number; y: number; width: number; height: number };

/** Window coordinates stay outside the scrolling path's local Yoga bounds. */
export function pathPopoverLayout({
  anchor,
  width,
  height,
  safeTop,
  safeBottom,
  cardHeight,
}: {
  anchor: PathAnchor;
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  cardHeight: number;
}) {
  const margin = 16;
  const gap = 12;
  const cardWidth = Math.max(0, Math.min(440, width - margin * 2));
  const nodeCenter = anchor.x + anchor.width / 2;
  const left = Math.max(margin, Math.min(width - margin - cardWidth, nodeCenter - cardWidth / 2));
  const upperBound = safeTop + margin;
  const lowerBound = height - safeBottom - margin;
  const spaceBelow = Math.max(0, lowerBound - anchor.y - anchor.height - gap);
  const spaceAbove = Math.max(0, anchor.y - gap - upperBound);
  const below = spaceBelow >= cardHeight || spaceBelow >= spaceAbove;
  const maxHeight = Math.max(0, below ? spaceBelow : spaceAbove);
  const actualHeight = Math.min(cardHeight, maxHeight);
  const top = below
    ? Math.min(lowerBound - actualHeight, anchor.y + anchor.height + gap)
    : Math.max(upperBound, anchor.y - gap - actualHeight);
  return {
    left,
    top: Math.max(upperBound, top),
    width: cardWidth,
    maxHeight,
    arrowLeft: Math.max(20, Math.min(cardWidth - 36, nodeCenter - left - 8)),
    arrowEdge: below ? ('top' as const) : ('bottom' as const),
  };
}
