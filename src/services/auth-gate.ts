import type { AuthProvider, AuthStatus } from './contracts';

export const publicRootRoutes = ['account', 'auth/callback', 'privacy', 'welcome'] as const;
export const privateRootRoutes = [
  'index',
  '(tabs)',
  'onboarding',
  'lesson/[id]',
  'adventure/[id]',
  'adventure/result',
  'practice/[id]',
  'practice/index',
  'practice/sandbox/[id]',
  'practice/mini/[id]',
  'shop',
  'projects',
  'pro-labs',
  'guide/[id]',
  'paywall',
  'achievements',
  'avatar',
  'complete',
  'course',
  'story-preview',
  'daily-goal',
  'missions',
  'notebook',
  'project/edit/[field]',
  'project/pack',
  'quests',
  'settings',
  'streak',
  'rank',
] as const;

export function authAllowsPlay(status: AuthStatus | null): boolean {
  return Boolean(status?.configured && status.mode === 'cloud' && status.identity?.id.trim());
}

export interface AuthGateSnapshot {
  phase: 'loading' | 'ready' | 'error';
  hydrated: boolean;
  status: AuthStatus | null;
  canPlay: boolean;
  error: string | null;
}

const loading: AuthGateSnapshot = {
  phase: 'loading',
  hydrated: false,
  status: null,
  canPlay: false,
  error: null,
};

/** Shares one hydrated auth view. Only provider state can unlock navigation. */
export function createAuthGate(
  provider: Pick<AuthProvider, 'getStatus' | 'subscribe'>,
  timeoutMs = 10000,
) {
  let snapshot = loading;
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | null = null;
  let connection = 0;
  let eventRevision = 0;
  let readRevision = 0;

  function publish(next: AuthGateSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function accept(status: AuthStatus) {
    publish({
      phase: 'ready',
      hydrated: true,
      status,
      canPlay: authAllowsPlay(status),
      error: null,
    });
  }
  async function refresh() {
    const currentConnection = connection;
    const currentRead = ++readRevision;
    const currentEvents = eventRevision;
    publish({ ...loading, hydrated: snapshot.hydrated });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const isCurrent = () =>
      listeners.size > 0 &&
      connection === currentConnection &&
      readRevision === currentRead &&
      eventRevision === currentEvents;
    try {
      const status = await Promise.race([
        provider.getStatus(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Auth hydration timed out.')), timeoutMs);
        }),
      ]);
      // A sign-out or newer sign-in event wins over an older pending read.
      if (isCurrent()) accept(status);
    } catch {
      if (isCurrent())
        publish({
          phase: 'error',
          hydrated: true,
          status: null,
          canPlay: false,
          error: 'Could not check your sign-in. Check your connection and try again.',
        });
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      const currentConnection = ++connection;
      void refresh();
      unsubscribe = provider.subscribe((status) => {
        if (connection !== currentConnection) return;
        eventRevision++;
        accept(status);
      });
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        connection++;
        readRevision++;
        unsubscribe?.();
        unsubscribe = null;
        snapshot = loading;
      }
    };
  }
  return { getSnapshot: () => snapshot, subscribe, refresh };
}
