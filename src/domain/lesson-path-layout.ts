/** Stories follow this node area in normal flow; their height never sizes the popover. */
export function lessonPathNodeAreaHeight(row: number | null, popoverHeight = 210): number {
  return row === null ? 570 : Math.max(570, 122 + row * 100 + popoverHeight + 20);
}

export function lessonPopoverScrollTarget({
  sectionTop,
  bannerHeight,
  row,
  popoverHeight,
  viewportHeight,
  stickyBanner = true,
}: {
  sectionTop: number;
  bannerHeight: number;
  row: number;
  popoverHeight: number;
  viewportHeight: number;
  stickyBanner?: boolean;
}): number {
  const top = sectionTop + bannerHeight + 122 + row * 100;
  // Embedded lessons let the banner scroll away so a short viewport can show the activity.
  const reservedHeader = stickyBanner ? bannerHeight : 0;
  const visibleTop = Math.max(
    reservedHeader + 8,
    Math.min(reservedHeader + 96, viewportHeight - popoverHeight - 16),
  );
  return Math.max(0, top - visibleTop);
}

export function lessonStoryScrollTarget(
  sectionTop: number,
  nodeAreaHeight: number,
  bannerHeight: number,
): number {
  // Inline stories follow a scrolling banner and node area; align their heading to the viewport.
  return Math.max(0, sectionTop + bannerHeight + nodeAreaHeight - 8);
}
