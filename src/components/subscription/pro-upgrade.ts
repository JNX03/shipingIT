import { builderAccess } from '@/services/access-policy';
import type { AuthStatus, PurchaseResult, SubscriptionStatus } from '@/services/contracts';

export type ProUpgradeKind = 'purchase' | 'restore';
export interface ProUpgradeReceipt {
  key: number;
  kind: ProUpgradeKind;
  identityId: string;
  entitlementId: string;
  isSandbox: boolean;
}
export interface ProUpgradeConfirmation {
  kind: ProUpgradeKind;
  expectedEntitlementId: string;
  initialStatus: SubscriptionStatus | null;
  initialAuth: AuthStatus | null;
  result: PurchaseResult;
  verifiedStatus: SubscriptionStatus | null;
  verifiedAuth: AuthStatus | null;
}

/** UI-only receipt: never persists, grants access, changes energy, or awards progress/currency. */
export function verifiedProTransaction(input: ProUpgradeConfirmation, now = Date.now()): boolean {
  const { initialAuth, verifiedAuth, verifiedStatus, result, expectedEntitlementId } = input;
  const identityId = initialAuth?.identity?.id;
  if (
    !identityId ||
    !initialAuth?.configured ||
    initialAuth.mode !== 'cloud' ||
    !verifiedAuth?.configured ||
    verifiedAuth.mode !== 'cloud' ||
    verifiedAuth.identity?.id !== identityId ||
    !expectedEntitlementId ||
    result.status.entitlementId !== expectedEntitlementId ||
    verifiedStatus?.entitlementId !== expectedEntitlementId ||
    !result.success ||
    result.cancelled
  )
    return false;
  return (
    builderAccess(result.status, verifiedAuth, now).allowed &&
    builderAccess(verifiedStatus, verifiedAuth, now).allowed
  );
}

export function confirmedProUpgrade(
  input: ProUpgradeConfirmation,
  key: number,
  now = Date.now(),
): ProUpgradeReceipt | null {
  const { initialAuth, initialStatus, verifiedStatus, result, expectedEntitlementId } = input;
  if (!verifiedProTransaction(input, now) || initialStatus?.entitlementId !== expectedEntitlementId)
    return null;

  // Unknown/loading/offline and initially active users never receive a new-upgrade event.
  if (builderAccess(initialStatus, initialAuth, now).reason !== 'upgrade') return null;

  return {
    key,
    kind: input.kind,
    identityId: initialAuth!.identity!.id,
    entitlementId: expectedEntitlementId,
    isSandbox: result.status.isSandbox || verifiedStatus!.isSandbox,
  };
}

export function proUpgradeStillActive(
  receipt: ProUpgradeReceipt,
  status: SubscriptionStatus | null,
  auth: AuthStatus | null,
  now = Date.now(),
): boolean {
  return (
    auth?.identity?.id === receipt.identityId &&
    auth.configured &&
    auth.mode === 'cloud' &&
    status?.entitlementId === receipt.entitlementId &&
    builderAccess(status, auth, now).allowed
  );
}

export const proUpgradeBenefits = [
  'Step-by-step lesson helpers',
  'Eight extra building labs',
  'Unlimited Sparks in the shop',
] as const;
