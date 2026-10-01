import { useSyncExternalStore } from 'react';
import { authProvider } from '@/services/auth';
import { createAuthGate } from '@/services/auth-gate';

const authGate = createAuthGate(authProvider);

export const refreshAuthGate = authGate.refresh;

export function useAuthGate() {
  return useSyncExternalStore(authGate.subscribe, authGate.getSnapshot, authGate.getSnapshot);
}
