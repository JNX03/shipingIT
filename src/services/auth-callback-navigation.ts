/** Resolve only the current callback route, never an unrelated cached launch link. */
export function resolveAuthCallback(input: {
  expectedUrl: string;
  receivedUrl: string | null;
  code?: string | string[];
  type?: string | string[];
}): { url: string; recovery: boolean } | null {
  try {
    const expected = new URL(input.expectedUrl);
    let received: URL | null = null;
    if (input.receivedUrl) {
      const candidate = new URL(input.receivedUrl);
      if (
        candidate.protocol === expected.protocol &&
        candidate.host === expected.host &&
        candidate.pathname === expected.pathname
      )
        received = candidate;
    }
    const routeCode = typeof input.code === 'string' && input.code.trim() ? input.code : null;
    if (received) {
      const fragment = new URLSearchParams(received.hash.slice(1));
      const receivedCodes = [...received.searchParams.getAll('code'), ...fragment.getAll('code')];
      const current = !routeCode || receivedCodes.includes(routeCode);
      if (current && (received.searchParams.has('error') || fragment.has('error'))) {
        // A current denial must survive route-code reconstruction unchanged.
        return { url: received.href, recovery: false };
      }
    }
    if (routeCode) {
      const recovery =
        input.type === 'recovery' ||
        (input.type === undefined &&
          received?.searchParams.get('code') === routeCode &&
          received.searchParams.get('type') === 'recovery');
      expected.searchParams.set('code', routeCode);
      if (recovery) expected.searchParams.set('type', 'recovery');
      return { url: expected.href, recovery };
    }
    if (received?.searchParams.get('code')?.trim())
      return { url: received.href, recovery: received.searchParams.get('type') === 'recovery' };
    return null;
  } catch {
    return null;
  }
}
