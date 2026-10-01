import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthStatus, SubscriptionStatus } from '../../services/contracts';
import { isProLessonId, verifiedLearningAccess, verifyLearningAccess } from './pro-learning-access';

const now = Date.parse('2026-09-30T14:00:00Z');
const auth: AuthStatus = {
  configured: true,
  mode: 'cloud',
  identity: { id: 'fixture-a', email: null, displayName: null },
};
const active: SubscriptionStatus = {
  configured: true,
  entitled: true,
  state: 'ready',
  entitlementId: 'builder',
  expiresAt: new Date(now + 60_000).toISOString(),
  managementUrl: null,
  isSandbox: false,
};

test('only the eight agreed bonus IDs require Pro; core IDs stay outside the bonus gate', () => {
  for (let unit = 1; unit <= 8; unit++) assert.equal(isProLessonId(`pro-unit-${unit}`), true);
  for (const id of [
    'discover-1',
    'launch-4',
    'pro-unit-0',
    'pro-unit-9',
    'pro-unit-01',
    'pro-unit-1/',
  ])
    assert.equal(isProLessonId(id), false);
});
test('access fails closed for expiry, malformed dates, unavailable status, sign-out and wrong entitlement', () => {
  assert.equal(verifiedLearningAccess(active, auth, 'builder', 'fixture-a', now), true);
  assert.equal(
    verifiedLearningAccess({ ...active, expiresAt: null }, auth, 'builder', undefined, now),
    true,
  );
  for (const status of [
    { ...active, expiresAt: new Date(now).toISOString() },
    { ...active, expiresAt: 'invalid' },
    { ...active, state: 'unavailable' as const },
    { ...active, configured: false },
    { ...active, entitled: false },
    { ...active, entitlementId: 'other' },
  ])
    assert.equal(verifiedLearningAccess(status, auth, 'builder', undefined, now), false);
  for (const account of [
    null,
    { ...auth, identity: null },
    { ...auth, mode: 'local' as const },
    { ...auth, configured: false },
  ])
    assert.equal(verifiedLearningAccess(active, account, 'builder', undefined, now), false);
  assert.equal(verifiedLearningAccess(active, auth, 'builder', 'another-account', now), false);
});
test('account change or sign-out during a store request cannot grant bonus entry or an award', async () => {
  for (const finalAuth of [
    { ...auth, identity: null },
    { ...auth, identity: { ...auth.identity!, id: 'fixture-b' } },
  ]) {
    let calls = 0;
    const result = await verifyLearningAccess({
      getAuth: async () => (calls++ === 0 ? auth : finalAuth),
      getStatus: async () => active,
      entitlementId: 'builder',
      now: () => now,
    });
    assert.equal(result.allowed, false);
    assert.equal(calls, 2);
  }
});
test('expiry is checked when the awaited status arrives, not when the action began', async () => {
  let time = now;
  const result = await verifyLearningAccess({
    getAuth: async () => auth,
    getStatus: async () => {
      time += 60_000;
      return active;
    },
    entitlementId: 'builder',
    now: () => time,
  });
  assert.equal(result.allowed, false);
});
test('a stale account verification is rejected even if the next account has Pro', async () => {
  const result = await verifyLearningAccess({
    getAuth: async () => auth,
    getStatus: async () => active,
    entitlementId: 'builder',
    identityId: 'fixture-before-account-switch',
    now: () => now,
  });
  assert.equal(result.allowed, false);
});
