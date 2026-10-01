import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthResult, AuthStatus } from '../../services/contracts';
import { authAllowsPlay, createAuthGate, privateRootRoutes } from '../../services/auth-gate';
import { createDirectSignOut } from './direct-sign-out';

const signedIn: AuthStatus = {
  configured: true,
  mode: 'cloud',
  identity: { id: 'learner-a', email: null, displayName: null },
};
const signedOut: AuthStatus = { configured: true, mode: 'local', identity: null };
const success: AuthResult = {
  success: true,
  status: signedOut,
  message: 'Signed out on this device.',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test('a signed-out direct action performs no provider, auth-refresh, or purchase calls', async () => {
  const calls: string[] = [];
  const action = createDirectSignOut({
    signOut: async () => {
      calls.push('signout');
      return success;
    },
    refreshAuthGate: async () => {
      calls.push('refresh');
    },
    identify: async () => {
      calls.push('identify');
    },
  });
  assert.equal(await action.run(false), null);
  assert.deepEqual(calls, []);
});

test('two immediate Me/Settings taps share one operation through auth refresh', async () => {
  const operation = deferred<AuthResult>();
  const refresh = deferred<void>();
  const calls: (string | null)[] = [];
  const action = createDirectSignOut({
    signOut: () => {
      calls.push('signout');
      return operation.promise;
    },
    refreshAuthGate: () => {
      calls.push('refresh');
      return refresh.promise;
    },
    identify: async (id) => {
      calls.push(id);
    },
  });
  const first = action.run(true);
  assert.equal(action.run(true), first);
  operation.resolve(success);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(action.run(true), first);
  assert.deepEqual(calls, ['signout', 'refresh']);
  refresh.resolve();
  assert.equal(await first, success);
  assert.deepEqual(calls, ['signout', 'refresh', null]);
});

test('a provider failure is shown unchanged and releases the UI lock for a deliberate retry', async () => {
  let attempts = 0;
  let refreshes = 0;
  let identities = 0;
  const failure: AuthResult = {
    success: false,
    status: signedOut,
    message: 'Sign-out could not finish. Try again.',
  };
  const action = createDirectSignOut({
    signOut: async () => (++attempts === 1 ? failure : success),
    refreshAuthGate: async () => {
      refreshes++;
    },
    identify: async () => {
      identities++;
    },
  });
  assert.equal(await action.run(true), failure);
  assert.equal(refreshes, 0);
  assert.equal(identities, 0);
  assert.equal(await action.run(true), success);
  assert.equal(attempts, 2);
  assert.equal(refreshes, 1);
  assert.equal(identities, 1);
});

test('rejected account operations return the existing Account error and never claim sign-out success', async () => {
  const action = createDirectSignOut({
    signOut: async () => {
      throw new Error('network unavailable');
    },
    refreshAuthGate: async () => {
      assert.fail('No success refresh');
    },
    identify: async () => {
      assert.fail('No successful purchase identity change');
    },
  });
  const result = await action.run(true);
  assert.equal(result?.success, false);
  assert.equal(result?.message, 'Account access is unavailable right now. Please try again.');
});

test('store identity connectivity never holds a successfully logged-out learner in private history', async () => {
  const identity = deferred<void>();
  let status = signedIn;
  let authListener!: (next: AuthStatus) => void;
  const gate = createAuthGate({
    getStatus: async () => status,
    subscribe: (listener) => {
      authListener = listener;
      return () => {};
    },
  });
  const stop = gate.subscribe(() => {});
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(gate.getSnapshot().canPlay, true);
  const action = createDirectSignOut({
    signOut: async () => {
      status = signedOut;
      authListener(signedOut);
      assert.equal(gate.getSnapshot().canPlay, false);
      return success;
    },
    refreshAuthGate: gate.refresh,
    identify: (id) => {
      assert.equal(id, null);
      return identity.promise;
    },
  });
  assert.equal(await action.run(authAllowsPlay(status)), success);
  assert.equal(gate.getSnapshot().canPlay, false);
  assert.ok(privateRootRoutes.includes('(tabs)'));
  assert.ok(privateRootRoutes.includes('settings'));
  assert.ok(privateRootRoutes.includes('paywall'));
  identity.reject(new Error('Store offline'));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(gate.getSnapshot().canPlay, false);
  stop();
});
