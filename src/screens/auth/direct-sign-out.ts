import type { AuthResult } from '../../services/contracts';

interface SignOutDependencies {
  signOut(): Promise<AuthResult>;
  refreshAuthGate(): Promise<void>;
  identify(userId: string | null): Promise<void>;
}

/** The Account operation, shared by direct UI actions without touching local learning data. */
export function createDirectSignOut(dependencies: SignOutDependencies) {
  let pending: Promise<AuthResult | null> | null = null;
  return {
    run(signedIn: boolean): Promise<AuthResult | null> {
      if (pending) return pending;
      if (!signedIn) return Promise.resolve(null);
      pending = (async () => {
        try {
          const result = await dependencies.signOut();
          if (result.success) {
            await dependencies.refreshAuthGate();
            // Account uses the same non-blocking identity update. Store connectivity
            // must not keep a successfully signed-out user inside private screens.
            void dependencies.identify(result.status.identity?.id ?? null).catch(() => {});
          }
          return result;
        } catch {
          return {
            success: false,
            status: { configured: false, mode: 'local', identity: null },
            message: 'Account access is unavailable right now. Please try again.',
          } satisfies AuthResult;
        }
      })().finally(() => {
        pending = null;
      });
      return pending;
    },
  };
}
