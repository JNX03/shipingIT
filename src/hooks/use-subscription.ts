import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { authProvider } from '@/services/auth';
import { subscriptionService } from '@/services/purchases';
import { builderAccess } from '@/services/access-policy';
import type { AuthStatus, SubscriptionStatus } from '@/services/contracts';
/** Revalidate on focus. Paid access never enters the persisted learning store. */
export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    const [nextStatus, nextAuth] = await Promise.all([
      subscriptionService.getStatus(),
      authProvider.getStatus(),
    ]);
    if (request === generation.current) {
      setStatus(nextStatus);
      setAuth(nextAuth);
      setLoading(false);
    }
    return { status: nextStatus, auth: nextAuth, access: builderAccess(nextStatus, nextAuth) };
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) return refresh();
      });
      return () => {
        active = false;
        generation.current++;
      };
    }, [refresh]),
  );
  const access = builderAccess(loading ? null : status, auth);
  return { status, auth, loading, access, refresh };
}
