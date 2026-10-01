import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthStatusChannel,
  createOAuthExchangeCoordinator,
  projectAuthStatus,
} from './auth-runtime';
import type { AuthResult, AuthStatus } from './contracts';

const signedOut: AuthStatus = { mode: 'local', configured: true, identity: null };
const signedIn: AuthStatus = {
  mode: 'cloud',
  configured: true,
  identity: { id: 'user-a', email: 'fixture@example.test', displayName: null },
};
const failure: AuthResult = { success: false, status: signedOut, message: 'Invalidated' };
const success: AuthResult = { success: true, status: signedIn, message: 'Signed in' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test('only a nonanonymous unexpired account session becomes cloud identity', () => {
  const session = {
    access_token: 'fixture-token',
    expires_at: 200,
    user: {
      id: 'user-a',
      is_anonymous: false,
      email: 'fixture@example.test',
      user_metadata: { full_name: 'Fixture' },
    },
  };
  assert.deepEqual(projectAuthStatus(session, signedOut, 100_000).identity, {
    ...signedIn.identity,
    displayName: 'Fixture',
  });
  const invalid = [
    null,
    {},
    { ...session, access_token: '' },
    { ...session, expires_at: undefined },
    { ...session, expires_at: NaN },
    { ...session, expires_at: 100 },
    { ...session, user: null },
    { ...session, user: { id: ' ' } },
    { ...session, user: { ...session.user, is_anonymous: true } },
    { ...session, user: { ...session.user, is_anonymous: 'false' } },
  ];
  for (const value of invalid)
    assert.deepEqual(projectAuthStatus(value, signedOut, 100_000), signedOut);
});

test('newer sign-in, sign-out, and refresh events suppress delayed initial snapshots', async () => {
  for (const eventStatus of [
    signedIn,
    signedOut,
    { ...signedIn, identity: { ...signedIn.identity!, displayName: 'Refreshed' } },
  ]) {
    const channel = createAuthStatusChannel();
    const snapshot = deferred<AuthStatus>();
    const values: AuthStatus[] = [];
    channel.subscribe(
      (status) => values.push(status),
      () => snapshot.promise,
    );
    channel.publish(eventStatus);
    snapshot.resolve(eventStatus === signedOut ? signedIn : signedOut);
    await flush();
    assert.deepEqual(values, [eventStatus]);
  }
});

test('unsubscribe and reusing the same callback cannot revive a stale registration', async () => {
  const channel = createAuthStatusChannel();
  const oldRead = deferred<AuthStatus>();
  const newRead = deferred<AuthStatus>();
  const values: AuthStatus[] = [];
  const listener = (status: AuthStatus) => values.push(status);
  const unsubscribe = channel.subscribe(listener, () => oldRead.promise);
  unsubscribe();
  channel.subscribe(listener, () => newRead.promise);
  oldRead.resolve(signedIn);
  await flush();
  assert.deepEqual(values, []);
  newRead.resolve(signedOut);
  await flush();
  assert.deepEqual(values, [signedOut]);
});

test('fresh snapshots resolve normally and an event revision remains authoritative', async () => {
  const channel = createAuthStatusChannel();
  const values: AuthStatus[] = [];
  channel.subscribe(
    (status) => values.push(status),
    async () => signedOut,
  );
  await flush();
  const revision = channel.revision;
  channel.publish(signedIn);
  assert.deepEqual(values, [signedOut, signedIn]);
  assert.equal(channel.resolveSnapshot(revision, signedOut), signedIn);
  assert.equal(channel.resolveSnapshot(channel.revision, signedOut), signedOut);
});

test('concurrent and immediate repeated PKCE callbacks redeem one code exactly once', async () => {
  const coordinator = createOAuthExchangeCoordinator({ invalidatedResult: () => failure });
  const exchange = deferred<AuthResult>();
  let calls = 0;
  const run = () => {
    calls++;
    return exchange.promise;
  };
  const first = coordinator.run('one-code', run);
  const second = coordinator.run('one-code', run);
  exchange.resolve(success);
  assert.deepEqual(await Promise.all([first, second]), [success, success]);
  assert.equal(await coordinator.run('one-code', run), success);
  assert.equal(calls, 1);
});

test('PKCE successes expire and failures or rejected requests are never cached', async () => {
  let time = 100;
  let calls = 0;
  const coordinator = createOAuthExchangeCoordinator({
    invalidatedResult: () => failure,
    now: () => time,
    ttlMs: 30,
  });
  const exchange = async () => {
    calls++;
    return success;
  };
  await coordinator.run('code', exchange);
  time = 129;
  await coordinator.run('code', exchange);
  assert.equal(calls, 1);
  time = 130;
  await coordinator.run('code', exchange);
  assert.equal(calls, 2);
  await coordinator.run('failed-code', async () => failure);
  assert.equal(await coordinator.run('failed-code', exchange), success);
  await assert.rejects(
    coordinator.run('throwing-code', async () => {
      throw new Error('network fixture');
    }),
  );
  assert.equal(await coordinator.run('throwing-code', exchange), success);
});

test('signout invalidation cannot return or cache an old successful callback', async () => {
  const coordinator = createOAuthExchangeCoordinator({ invalidatedResult: () => failure });
  const exchange = deferred<AuthResult>();
  const pending = coordinator.run('code', () => exchange.promise);
  coordinator.clear();
  let drained = false;
  const drain = coordinator.waitForIdle().then(() => {
    drained = true;
  });
  await flush();
  assert.equal(drained, false);
  exchange.resolve(success);
  assert.equal(await pending, failure);
  await drain;
  assert.equal(drained, true);
  let calls = 0;
  await coordinator.run('code', async () => {
    calls++;
    return failure;
  });
  assert.equal(calls, 1);
});

test('identity change clears completed callbacks without disrupting the active exchange', async () => {
  const coordinator = createOAuthExchangeCoordinator({
    invalidatedResult: () => failure,
    maxEntries: 2,
  });
  await coordinator.run('old-code', async () => success);
  const exchange = deferred<AuthResult>();
  const active = coordinator.run('new-code', () => exchange.promise);
  coordinator.clearCompleted();
  assert.equal(
    coordinator.run('new-code', () => {
      throw new Error('Must dedupe');
    }),
    active,
  );
  exchange.resolve(success);
  assert.equal(await active, success);
  let calls = 0;
  await coordinator.run('old-code', async () => {
    calls++;
    return failure;
  });
  assert.equal(calls, 1);
});

test('cache stays bounded without evicting in-flight exchanges', async () => {
  const coordinator = createOAuthExchangeCoordinator({
    invalidatedResult: () => failure,
    maxEntries: 1,
  });
  const exchange = deferred<AuthResult>();
  const active = coordinator.run('first', () => exchange.promise);
  assert.equal(
    await coordinator.run('second', async () => {
      throw new Error('Limit must prevent exchange');
    }),
    failure,
  );
  assert.equal(
    coordinator.run('first', async () => failure),
    active,
  );
  exchange.resolve(success);
  await active;
  assert.equal(await coordinator.run('second', async () => success), success);
});
