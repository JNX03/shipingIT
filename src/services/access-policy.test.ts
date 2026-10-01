import test from 'node:test';
import assert from 'node:assert/strict';
import { builderAccess, canStartPurchase, subscriptionPeriodLabel } from './access-policy';
import type { AuthStatus, SubscriptionStatus } from './contracts';
const auth: AuthStatus = {
  configured: true,
  mode: 'cloud',
  identity: { id: 'learner', email: null, displayName: null },
};
const status: SubscriptionStatus = {
  configured: true,
  entitled: true,
  state: 'ready',
  entitlementId: 'builder',
  expiresAt: '2030-01-01T00:00:00Z',
  managementUrl: null,
  isSandbox: false,
};
test('only verified active authenticated entitlement enables full export', () => {
  assert.equal(builderAccess(status, auth, Date.parse('2026-01-01')).allowed, true);
  for (const change of [
    { entitled: false },
    { state: 'unavailable' as const },
    { configured: false },
    { expiresAt: 'invalid' },
    { expiresAt: '2020-01-01' },
  ])
    assert.equal(builderAccess({ ...status, ...change }, auth).allowed, false);
  assert.equal(builderAccess(status, { ...auth, identity: null }).allowed, false);
  assert.equal(builderAccess(null, auth).allowed, false);
});
test('non-expiring and sandbox entitlements are distinguished correctly', () => {
  assert.equal(builderAccess({ ...status, expiresAt: null }, auth).allowed, true);
  assert.match(builderAccess({ ...status, isSandbox: true }, auth).message, /test access/);
});
test('release flag, auth, real package, and idle state are all required to buy', () => {
  const valid = { releaseEnabled: true, authenticated: true, hasPackage: true, busy: false };
  assert.equal(canStartPurchase(valid), true);
  for (const change of [
    { releaseEnabled: false },
    { authenticated: false },
    { hasPackage: false },
    { busy: true },
  ])
    assert.equal(canStartPurchase({ ...valid, ...change }), false);
});
test('billing periods are human readable and unexpected values are not shown as raw ISO', () => {
  assert.equal(subscriptionPeriodLabel('P1M'), 'month');
  assert.equal(subscriptionPeriodLabel('P3M'), '3 months');
  assert.equal(subscriptionPeriodLabel('P1Y'), 'year');
  assert.equal(subscriptionPeriodLabel('unexpected'), '');
  assert.equal(subscriptionPeriodLabel(null), '');
});
