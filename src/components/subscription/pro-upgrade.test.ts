import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthStatus, PurchaseResult, SubscriptionStatus } from '@/services/contracts';
import {
  confirmedProUpgrade,
  proUpgradeStillActive,
  verifiedProTransaction,
  type ProUpgradeConfirmation,
} from './pro-upgrade';

// Contract fixtures only. These tests are not evidence of a store transaction or native animation.
const now = Date.parse('2026-09-30T11:30:00Z');
const auth: AuthStatus = {
  configured: true,
  mode: 'cloud',
  identity: { id: 'learner-a', email: null, displayName: null },
};
const inactive: SubscriptionStatus = {
  configured: true,
  state: 'ready',
  entitlementId: 'builder',
  entitled: false,
  expiresAt: null,
  managementUrl: null,
  isSandbox: false,
};
const active: SubscriptionStatus = {
  ...inactive,
  entitled: true,
  expiresAt: '2027-09-30T00:00:00Z',
};
const result: PurchaseResult = {
  success: true,
  cancelled: false,
  status: active,
  message: 'Contract fixture.',
};
const confirmation: ProUpgradeConfirmation = {
  kind: 'purchase',
  expectedEntitlementId: 'builder',
  initialAuth: auth,
  initialStatus: inactive,
  result,
  verifiedAuth: auth,
  verifiedStatus: active,
};
const confirm = (change: Partial<ProUpgradeConfirmation> = {}) =>
  confirmedProUpgrade({ ...confirmation, ...change }, 1, now);

test('only a successful authenticated transaction followed by active entitlement verification creates a receipt', () => {
  assert.deepEqual(confirm(), {
    key: 1,
    kind: 'purchase',
    identityId: 'learner-a',
    entitlementId: 'builder',
    isSandbox: false,
  });
  assert.equal(confirm({ verifiedStatus: inactive }), null);
  assert.equal(confirm({ verifiedStatus: null }), null);
  assert.equal(confirm({ result: { ...result, success: false } }), null);
  assert.equal(confirm({ result: { ...result, status: inactive } }), null);
});
test('cancelled and false-positive successes never celebrate even if a later status is active', () => {
  assert.equal(confirm({ result: { ...result, cancelled: true } }), null);
  assert.equal(confirm({ result: { ...result, success: false, cancelled: true } }), null);
  assert.equal(
    confirm({ result: { ...result, status: { ...active, state: 'unavailable' } } }),
    null,
  );
});
test('initially active, unknown, loading or offline states produce steady status, never an upgrade replay', () => {
  assert.equal(confirm({ initialStatus: active }), null);
  assert.equal(confirm({ initialStatus: null }), null);
  assert.equal(confirm({ initialStatus: { ...inactive, state: 'unavailable' } }), null);
  assert.equal(confirm({ initialStatus: { ...inactive, configured: false } }), null);
  const first = confirm();
  assert.ok(first);
  assert.equal(confirm({ initialStatus: active, kind: 'restore' }), null);
});
test('signed-out/local accounts and account switches cannot confirm another owner’s Pro animation', () => {
  assert.equal(confirm({ initialAuth: { ...auth, identity: null } }), null);
  assert.equal(confirm({ verifiedAuth: { ...auth, identity: null } }), null);
  assert.equal(confirm({ initialAuth: { ...auth, mode: 'local', configured: false } }), null);
  assert.equal(
    confirm({ verifiedAuth: { ...auth, identity: { ...auth.identity!, id: 'learner-b' } } }),
    null,
  );
});
test('both transaction and fresh status must name the configured entitlement and remain unexpired', () => {
  assert.equal(verifiedProTransaction(confirmation, now), true);
  assert.equal(verifiedProTransaction({ ...confirmation, initialStatus: active }, now), true);
  assert.equal(
    verifiedProTransaction(
      { ...confirmation, verifiedAuth: { ...auth, identity: { ...auth.identity!, id: 'other' } } },
      now,
    ),
    false,
  );
  assert.equal(confirm({ expectedEntitlementId: 'different' }), null);
  assert.equal(
    confirm({ result: { ...result, status: { ...active, entitlementId: 'other' } } }),
    null,
  );
  assert.equal(confirm({ verifiedStatus: { ...active, entitlementId: 'other' } }), null);
  for (const expiresAt of ['invalid-date', '2025-01-01T00:00:00Z', new Date(now).toISOString()]) {
    assert.equal(confirm({ verifiedStatus: { ...active, expiresAt } }), null);
    assert.equal(confirm({ result: { ...result, status: { ...active, expiresAt } } }), null);
  }
});
test('a verified restore can reveal newly active tools and preserves sandbox truth', () => {
  const receipt = confirm({
    kind: 'restore',
    result: { ...result, status: { ...active, isSandbox: true } },
  });
  assert.ok(receipt);
  assert.equal(receipt.kind, 'restore');
  assert.equal(receipt.isSandbox, true);
  assert.equal(confirm({ verifiedStatus: { ...active, isSandbox: true } })?.isSandbox, true);
});
test('a receipt stops applying after expiry, account change, logout or entitlement loss', () => {
  const receipt = confirm()!;
  assert.equal(proUpgradeStillActive(receipt, active, auth, now), true);
  assert.equal(proUpgradeStillActive(receipt, inactive, auth, now), false);
  assert.equal(proUpgradeStillActive(receipt, active, { ...auth, identity: null }, now), false);
  assert.equal(proUpgradeStillActive(receipt, active, { ...auth, configured: false }, now), false);
  assert.equal(
    proUpgradeStillActive(
      receipt,
      active,
      { ...auth, identity: { ...auth.identity!, id: 'learner-b' } },
      now,
    ),
    false,
  );
  assert.equal(
    proUpgradeStillActive(
      receipt,
      { ...active, expiresAt: new Date(now).toISOString() },
      auth,
      now,
    ),
    false,
  );
});
test('UI receipts never mutate the provider result, account or entitlement inputs', () => {
  const original = structuredClone(confirmation);
  Object.freeze(confirmation);
  Object.freeze(result);
  Object.freeze(active);
  Object.freeze(auth);
  const receipt = confirm();
  assert.ok(receipt);
  assert.deepEqual(confirmation, original);
  receipt.key = 99;
  assert.deepEqual(confirmation, original);
});
