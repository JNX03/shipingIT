import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { authProvider } from '@/services/auth';
import { subscriptionService } from '@/services/purchases';
import { serviceConfig } from '@/services/config';
import {
  verifiedLearningAccess,
  verifyLearningAccess,
  type ProLearningVerification,
} from './pro-learning-access';

export function useProLearningAccess(required = false, scope = '') {
  const [verification, setVerification] = useState<ProLearningVerification | null>(null);
  const [checking, setChecking] = useState(required);
  const [message, setMessage] = useState('');
  const current = useRef<ProLearningVerification | null>(null);
  const epoch = useRef(0);
  const focused = useRef(false);
  const foreground = useRef(true);
  const mounted = useRef(true);
  const observedIdentity = useRef<string | null | undefined>(undefined);

  const invalidate = useCallback((reason = '') => {
    epoch.current++;
    current.current = null;
    if (mounted.current) {
      setVerification(null);
      setChecking(false);
      setMessage(reason);
    }
  }, []);
  const isVerified = useCallback(
    () =>
      focused.current &&
      foreground.current &&
      current.current?.allowed === true &&
      verifiedLearningAccess(
        current.current.status,
        current.current.auth,
        serviceConfig.builderEntitlement,
      ),
    [],
  );
  const verify = useCallback(async () => {
    const request = ++epoch.current;
    const identityId = current.current?.auth.identity?.id;
    if (mounted.current) setChecking(true);
    try {
      const next = await verifyLearningAccess({
        getAuth: () => authProvider.getStatus(),
        getStatus: () => subscriptionService.getStatus(),
        entitlementId: serviceConfig.builderEntitlement,
        identityId,
      });
      if (!mounted.current || !focused.current || !foreground.current || request !== epoch.current)
        return false;
      current.current = next;
      setVerification(next);
      setMessage(next.message);
      return next.allowed;
    } catch {
      if (request === epoch.current)
        invalidate(
          `Could not verify Pro access for ${scope ? 'this lesson' : 'the lesson guide'}. Reconnect and check your membership.`,
        );
      return false;
    } finally {
      if (mounted.current && request === epoch.current) setChecking(false);
    }
  }, [invalidate, scope]);

  useEffect(() => {
    const generation = epoch;
    mounted.current = true;
    return () => {
      mounted.current = false;
      current.current = null;
      generation.current++;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      foreground.current =
        AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
      if (required)
        void Promise.resolve().then(() => {
          if (focused.current) return verify();
        });
      return () => {
        focused.current = false;
        invalidate();
      };
    }, [invalidate, required, verify]),
  );
  useEffect(
    () =>
      authProvider.subscribe((auth) => {
        const identityId = auth.identity?.id ?? null;
        const changed =
          observedIdentity.current !== undefined && observedIdentity.current !== identityId;
        observedIdentity.current = identityId;
        if (
          changed ||
          (current.current &&
            (!auth.configured ||
              auth.mode !== 'cloud' ||
              identityId !== current.current.auth.identity?.id))
        )
          invalidate('Your account changed. Check Pro access again to continue.');
      }),
    [invalidate],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      foreground.current = state === 'active';
      if (state !== 'active') invalidate();
      else if (required && focused.current) void verify();
    });
    return () => subscription.remove();
  }, [invalidate, required, verify]);
  useEffect(() => {
    if (!verification?.allowed || !verification.status.expiresAt) return;
    const expiry = Date.parse(verification.status.expiresAt);
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) invalidate('Your Pro access expired. Check your membership to continue.');
      else timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [verification, invalidate]);

  const getVerification = useCallback(() => (isVerified() ? current.current : null), [isVerified]);
  return {
    allowed:
      verification?.allowed === true &&
      verifiedLearningAccess(
        verification.status,
        verification.auth,
        serviceConfig.builderEntitlement,
      ),
    checking,
    message,
    verify,
    isVerified,
    getVerification,
  };
}

export type ProLearningAccess = ReturnType<typeof useProLearningAccess>;
