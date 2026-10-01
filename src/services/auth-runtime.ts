import type { AuthResult, AuthStatus } from './contracts';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** A local or anonymous session never satisfies the signed-in app gate. */
export function projectAuthStatus(
  session: unknown,
  signedOut: AuthStatus,
  now = Date.now(),
): AuthStatus {
  if (
    !object(session) ||
    !object(session.user) ||
    typeof session.access_token !== 'string' ||
    !session.access_token.trim() ||
    typeof session.expires_at !== 'number' ||
    !Number.isFinite(session.expires_at) ||
    session.expires_at * 1000 <= now ||
    typeof session.user.id !== 'string' ||
    !session.user.id.trim() ||
    (session.user.is_anonymous !== undefined && session.user.is_anonymous !== false)
  )
    return { ...signedOut };
  const metadata = session.user.user_metadata;
  const name = object(metadata) ? metadata.full_name : undefined;
  return {
    mode: 'cloud',
    configured: true,
    identity: {
      id: session.user.id,
      email: typeof session.user.email === 'string' ? session.user.email : null,
      displayName: typeof name === 'string' ? name : null,
    },
    message: 'Signed in. Your project is saved on this device; cloud sync is not yet configured.',
  };
}

/** Auth events are authoritative over older asynchronous initial snapshots. */
export function createAuthStatusChannel() {
  let revision = 0;
  let latest: AuthStatus | undefined;
  const registrations = new Set<{ active: boolean; listener: (status: AuthStatus) => void }>();
  return {
    get revision() {
      return revision;
    },
    publish(status: AuthStatus) {
      revision++;
      latest = status;
      for (const registration of registrations) {
        if (!registration.active) continue;
        // A consumer cannot prevent the SDK from completing its auth transition.
        try {
          registration.listener(status);
        } catch {
          /* Isolate an unmounted consumer. */
        }
      }
    },
    resolveSnapshot(startRevision: number, snapshot: AuthStatus) {
      return startRevision !== revision && latest ? latest : snapshot;
    },
    subscribe(listener: (status: AuthStatus) => void, read: () => Promise<AuthStatus>) {
      const registration = { active: true, listener };
      registrations.add(registration);
      const startRevision = revision;
      void read()
        .then((status) => {
          if (registration.active && startRevision === revision) listener(status);
        })
        .catch(() => {
          /* getStatus supplies a signed-out status on read errors. */
        });
      return () => {
        registration.active = false;
        registrations.delete(registration);
      };
    },
  };
}

/** Both native browser return and the callback route can receive one single-use PKCE code. */
export function createOAuthExchangeCoordinator({
  invalidatedResult,
  now = Date.now,
  ttlMs = 30_000,
  maxEntries = 8,
}: {
  invalidatedResult: () => AuthResult;
  now?: () => number;
  ttlMs?: number;
  maxEntries?: number;
}) {
  type Entry = { promise: Promise<AuthResult>; expiresAt: number; pending: boolean };
  const entries = new Map<string, Entry>();
  const pending = new Set<Promise<AuthResult>>();
  let epoch = 0;
  return {
    run(code: string, exchange: () => Promise<AuthResult>): Promise<AuthResult> {
      for (const [key, entry] of entries)
        if (!entry.pending && entry.expiresAt <= now()) entries.delete(key);
      const previous = entries.get(code);
      if (previous) return previous.promise;
      // Do not evict in-flight work: that would allow the same code to be redeemed twice.
      for (const [key, entry] of entries) {
        if (entries.size < maxEntries) break;
        if (!entry.pending) entries.delete(key);
      }
      if (entries.size >= maxEntries) return Promise.resolve(invalidatedResult());
      const startedEpoch = epoch;
      const entry = { pending: true, expiresAt: 0 } as Entry;
      entry.promise = Promise.resolve()
        .then(exchange)
        .then((result) => {
          if (startedEpoch !== epoch) return invalidatedResult();
          if (result.success && result.status.mode === 'cloud' && result.status.identity) {
            entry.pending = false;
            entry.expiresAt = now() + ttlMs;
          } else if (entries.get(code) === entry) entries.delete(code);
          return result;
        })
        .finally(() => {
          pending.delete(entry.promise);
          if (entry.pending && entries.get(code) === entry) entries.delete(code);
        });
      entries.set(code, entry);
      pending.add(entry.promise);
      return entry.promise;
    },
    clear() {
      epoch++;
      entries.clear();
    },
    clearCompleted() {
      for (const [key, entry] of entries) if (!entry.pending) entries.delete(key);
    },
    async waitForIdle() {
      await Promise.allSettled([...pending]);
    },
  };
}
