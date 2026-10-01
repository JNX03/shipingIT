import type { AuthStatus, SubscriptionStatus } from './contracts';
export interface BuilderAccess {
  allowed: boolean;
  reason: 'active' | 'checking' | 'signin' | 'upgrade' | 'unavailable';
  message: string;
}
export function builderAccess(
  status: SubscriptionStatus | null,
  auth: AuthStatus | null,
  now = Date.now(),
): BuilderAccess {
  if (!status || !auth)
    return { allowed: false, reason: 'checking', message: 'Checking ShipingIT Pro access…' };
  if (!status.configured)
    return {
      allowed: false,
      reason: 'unavailable',
      message:
        'ShipingIT Pro export is unavailable right now. Core learning is free after sign-in.',
    };
  if (!auth.identity)
    return {
      allowed: false,
      reason: 'signin',
      message: 'Sign in with the account that has ShipingIT Pro to export the full Project Pack.',
    };
  if (status.state !== 'ready')
    return {
      allowed: false,
      reason: 'unavailable',
      message: 'Reconnect to check ShipingIT Pro access. Your project is safe on this device.',
    };
  const validExpiry =
    status.expiresAt === null ||
    (Number.isFinite(Date.parse(status.expiresAt)) && Date.parse(status.expiresAt) > now);
  if (!status.entitled || !validExpiry)
    return {
      allowed: false,
      reason: 'upgrade',
      message: 'ShipingIT Pro adds full Project Pack export and copying. Core learning stays free.',
    };
  return {
    allowed: true,
    reason: 'active',
    message: status.isSandbox
      ? 'ShipingIT Pro test access is active.'
      : 'ShipingIT Pro export tools are ready.',
  };
}
export function canStartPurchase(input: {
  releaseEnabled: boolean;
  authenticated: boolean;
  hasPackage: boolean;
  busy: boolean;
}): boolean {
  return input.releaseEnabled && input.authenticated && input.hasPackage && !input.busy;
}
export function subscriptionPeriodLabel(period: string | null): string {
  if (!period) return '';
  const match = /^P(\d+)([DWMY])$/.exec(period);
  if (!match) return '';
  const n = Number(match[1]);
  if (n < 1) return '';
  const unit = ({ D: 'day', W: 'week', M: 'month', Y: 'year' } as Record<string, string>)[match[2]];
  return n === 1 ? unit : `${n} ${unit}s`;
}
