import { builderAccess } from '../../services/access-policy';
import type { AuthStatus, SubscriptionStatus } from '../../services/contracts';

export const proLessonIds = Array.from({ length: 8 }, (_, index) => `pro-unit-${index + 1}`);
export const isProLessonId = (id: string) => /^pro-unit-[1-8]$/.test(id);

export interface ProLearningVerification {
  auth: AuthStatus;
  status: SubscriptionStatus;
  allowed: boolean;
  message: string;
}

export function verifiedLearningAccess(
  status: SubscriptionStatus | null,
  auth: AuthStatus | null,
  entitlementId: string,
  identityId?: string,
  now = Date.now(),
): boolean {
  return Boolean(
    entitlementId &&
    auth?.configured &&
    auth.mode === 'cloud' &&
    auth.identity?.id &&
    (!identityId || identityId === auth.identity.id) &&
    status?.entitlementId === entitlementId &&
    builderAccess(status, auth, now).allowed,
  );
}

/** Read current account before and after the store check; never persists an access grant. */
export async function verifyLearningAccess(input: {
  getAuth: () => Promise<AuthStatus>;
  getStatus: () => Promise<SubscriptionStatus>;
  entitlementId: string;
  identityId?: string;
  now?: () => number;
}): Promise<ProLearningVerification> {
  const initialAuth = await input.getAuth();
  const status = await input.getStatus();
  const auth = await input.getAuth();
  const sameAccount = Boolean(
    initialAuth.configured &&
    initialAuth.mode === 'cloud' &&
    initialAuth.identity?.id &&
    initialAuth.identity.id === auth.identity?.id,
  );
  const allowed =
    sameAccount &&
    verifiedLearningAccess(
      status,
      auth,
      input.entitlementId,
      input.identityId,
      input.now?.() ?? Date.now(),
    );
  return {
    auth,
    status,
    allowed,
    message: allowed
      ? ''
      : !auth.identity
        ? 'Sign in to use your Pro labs and advanced lesson guide.'
        : !sameAccount
          ? 'Your account changed. Check Pro access again to continue.'
          : 'Active Pro access is required. Check your membership or keep learning on the free path.',
  };
}
