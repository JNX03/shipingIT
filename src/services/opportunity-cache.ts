const FRESH_MS = 5 * 60 * 1000;
export function shouldRefreshOpportunities(
  fetchedAt: string | null,
  forceRefresh = false,
  now = Date.now(),
): boolean {
  if (forceRefresh || !fetchedAt) return true;
  const timestamp = Date.parse(fetchedAt);
  return !Number.isFinite(timestamp) || timestamp > now + FRESH_MS || now - timestamp >= FRESH_MS;
}
