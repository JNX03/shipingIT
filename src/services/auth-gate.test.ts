import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authAllowsPlay, createAuthGate, privateRootRoutes, publicRootRoutes } from './auth-gate';
import { resolveAuthCallback } from './auth-callback-navigation';
import type { AuthStatus } from './contracts';

const signedIn: AuthStatus = {
  configured: true,
  mode: 'cloud',
  identity: { id: 'player-a', email: null, displayName: null },
};
const signedOut: AuthStatus = { configured: true, mode: 'local', identity: null };
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture(read: () => Promise<AuthStatus>, timeoutMs = 10000) {
  const callbacks: ((status: AuthStatus) => void)[] = [];
  let connections = 0;
  let disconnections = 0;
  const gate = createAuthGate(
    {
      getStatus: read,
      subscribe(callback) {
        connections++;
        callbacks.push(callback);
        return () => {
          disconnections++;
        };
      },
    },
    timeoutMs,
  );
  return { gate, callbacks, connections: () => connections, disconnections: () => disconnections };
}

test('navigation stays closed until auth hydrates and only a configured cloud identity unlocks play', async () => {
  for (const status of [
    null,
    signedOut,
    { ...signedIn, configured: false },
    { ...signedIn, mode: 'local' as const },
    { ...signedIn, identity: { ...signedIn.identity!, id: '   ' } },
  ])
    assert.equal(authAllowsPlay(status), false);
  const pending = deferred<AuthStatus>();
  const { gate } = fixture(() => pending.promise);
  const stop = gate.subscribe(() => {});
  assert.equal(gate.getSnapshot().hydrated, false);
  assert.equal(gate.getSnapshot().canPlay, false);
  pending.resolve(signedIn);
  await settle();
  assert.equal(gate.getSnapshot().hydrated, true);
  assert.equal(gate.getSnapshot().canPlay, true);
  stop();
});

test('a sign-out event revokes play and cannot be undone by an older pending session read', async () => {
  const pending = deferred<AuthStatus>();
  const h = fixture(() => pending.promise);
  const stop = h.gate.subscribe(() => {});
  h.callbacks[0](signedIn);
  assert.equal(h.gate.getSnapshot().canPlay, true);
  h.callbacks[0](signedOut);
  assert.equal(h.gate.getSnapshot().canPlay, false);
  pending.resolve(signedIn);
  await settle();
  assert.equal(h.gate.getSnapshot().status, signedOut);
  assert.equal(h.gate.getSnapshot().canPlay, false);
  stop();
});

test('failed auth hydration exposes a retryable closed gate; a newer event wins over retry failure', async () => {
  const retry = deferred<AuthStatus>();
  let reads = 0;
  const h = fixture(() => (++reads === 1 ? Promise.reject(new Error('offline')) : retry.promise));
  const stop = h.gate.subscribe(() => {});
  await settle();
  assert.equal(h.gate.getSnapshot().phase, 'error');
  assert.equal(h.gate.getSnapshot().hydrated, true);
  assert.equal(h.gate.getSnapshot().canPlay, false);
  const refreshing = h.gate.refresh();
  // Keep public callback/recovery mounted during a refresh after first hydration.
  assert.equal(h.gate.getSnapshot().hydrated, true);
  h.callbacks[0](signedIn);
  retry.reject(new Error('older request failed'));
  await refreshing;
  assert.equal(h.gate.getSnapshot().phase, 'ready');
  assert.equal(h.gate.getSnapshot().canPlay, true);
  stop();
});

test('overlapping refreshes cannot restore an older account', async () => {
  const older = deferred<AuthStatus>();
  const newer = deferred<AuthStatus>();
  let reads = 0;
  const h = fixture(() => (++reads === 1 ? older.promise : newer.promise));
  const stop = h.gate.subscribe(() => {});
  const refresh = h.gate.refresh();
  newer.resolve(signedOut);
  await refresh;
  older.resolve(signedIn);
  await settle();
  assert.equal(h.gate.getSnapshot().status, signedOut);
  assert.equal(h.gate.getSnapshot().canPlay, false);
  stop();
});

test('a stuck initial read times out closed and a later valid auth event recovers', async () => {
  const pending = deferred<AuthStatus>();
  const h = fixture(() => pending.promise, 5);
  const stop = h.gate.subscribe(() => {});
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(h.gate.getSnapshot().phase, 'error');
  assert.equal(h.gate.getSnapshot().canPlay, false);
  h.callbacks[0](signedIn);
  assert.equal(h.gate.getSnapshot().canPlay, true);
  pending.resolve(signedOut);
  await settle();
  assert.equal(h.gate.getSnapshot().status, signedIn);
  stop();
});

test('screens share one subscription and disconnected callbacks cannot restore access after remount', async () => {
  const pending = deferred<AuthStatus>();
  const h = fixture(() => pending.promise);
  const first = h.gate.subscribe(() => {});
  const second = h.gate.subscribe(() => {});
  assert.equal(h.connections(), 1);
  first();
  assert.equal(h.disconnections(), 0);
  second();
  assert.equal(h.disconnections(), 1);
  const third = h.gate.subscribe(() => {});
  h.callbacks[0](signedIn);
  assert.equal(h.gate.getSnapshot().canPlay, false);
  h.callbacks[1](signedOut);
  pending.resolve(signedIn);
  await settle();
  assert.equal(h.gate.getSnapshot().status, signedOut);
  third();
});

test('every real root route is explicitly public or protected, including nested direct links', () => {
  const directory = fileURLToPath(new URL('../app/', import.meta.url));
  function roots(folder: string, prefix = ''): string[] {
    const result: string[] = [];
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const path = join(folder, entry.name);
        if (readdirSync(path).includes('_layout.tsx')) result.push(`${prefix}${entry.name}`);
        else result.push(...roots(path, `${prefix}${entry.name}/`));
      } else if (entry.name.endsWith('.tsx') && !/^[+_]/.test(entry.name)) {
        result.push(`${prefix}${entry.name.slice(0, -4)}`);
      }
    }
    return result;
  }
  const classified = [...privateRootRoutes, ...publicRootRoutes];
  assert.equal(new Set(classified).size, classified.length);
  assert.deepEqual(classified.sort(), roots(directory).sort());
  assert.deepEqual(publicRootRoutes, ['account', 'auth/callback', 'privacy', 'welcome']);
  assert.equal(privateRootRoutes[0], 'index');
});

test('callback resolution waits for a real code and ignores unrelated cached launch URLs', () => {
  const expectedUrl = 'shipaton-nextgen://auth/callback';
  assert.equal(resolveAuthCallback({ expectedUrl, receivedUrl: null }), null);
  assert.equal(
    resolveAuthCallback({
      expectedUrl,
      receivedUrl: 'shipaton-nextgen://adventure/explore?code=stale',
    }),
    null,
  );
  assert.equal(
    resolveAuthCallback({
      expectedUrl,
      receivedUrl: 'https://unrelated.example/auth/callback?code=stale',
    }),
    null,
  );
  const received = resolveAuthCallback({
    expectedUrl,
    receivedUrl: `${expectedUrl}?code=current&type=recovery`,
  });
  assert.equal(received?.recovery, true);
  assert.equal(new URL(received!.url).searchParams.get('code'), 'current');
  const routed = resolveAuthCallback({
    expectedUrl,
    receivedUrl: 'shipaton-nextgen://adventure/explore',
    code: 'new',
    type: 'recovery',
  });
  assert.equal(new URL(routed!.url).searchParams.get('code'), 'new');
  assert.equal(routed?.recovery, true);
  const delayedType = resolveAuthCallback({
    expectedUrl,
    receivedUrl: `${expectedUrl}?code=current&type=recovery`,
    code: 'current',
  });
  assert.equal(delayedType?.recovery, true);
  const newCode = resolveAuthCallback({
    expectedUrl,
    receivedUrl: `${expectedUrl}?code=old&type=recovery`,
    code: 'new',
  });
  assert.equal(newCode?.recovery, false);
});
