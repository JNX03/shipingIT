import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { AuthProvider, AuthResult, AuthStatus } from './contracts';
import { serviceConfig } from './config';
import { createChunkedAuthStorage } from './auth-storage';
import {
  createAuthStatusChannel,
  createOAuthExchangeCoordinator,
  projectAuthStatus,
} from './auth-runtime';

const configured = Boolean(serviceConfig.supabaseUrl && serviceConfig.supabaseKey);
const localStatus: AuthStatus = {
  mode: 'local',
  configured,
  identity: null,
  message: 'Sign in to play. Your saved project and progress remain on this device.',
};
let clientPromise: Promise<SupabaseClient | null> | null = null;
const sessionMemory = new Map<string, string>();
const authEvents = createAuthStatusChannel();
const nativeStorage = createChunkedAuthStorage(SecureStore);
const oauthExchanges = createOAuthExchangeCoordinator({
  invalidatedResult: () => failed('This sign-in attempt was replaced. Start sign-in again.'),
});
let lastIdentityId: string | null = null;
let signingOut = false;
let authLifecycle = 0;

/** Native session values are chunked because some Keychain implementations limit item size. */
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // The temporary PKCE verifier must survive a same-tab OAuth redirect. Bearer tokens never go here.
      if (key.endsWith('-code-verifier') && typeof sessionStorage !== 'undefined')
        return sessionStorage.getItem(key);
      return sessionMemory.get(key) ?? null;
    }
    return nativeStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (key.endsWith('-code-verifier') && typeof sessionStorage !== 'undefined')
        sessionStorage.setItem(key, value);
      else sessionMemory.set(key, value);
      return;
    }
    return nativeStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      sessionMemory.delete(key);
      if (key.endsWith('-code-verifier') && typeof sessionStorage !== 'undefined')
        sessionStorage.removeItem(key);
      return;
    }
    return nativeStorage.removeItem(key);
  },
};

function statusFor(session: Session | null): AuthStatus {
  return projectAuthStatus(session, localStatus);
}

async function client(): Promise<SupabaseClient | null> {
  if (!configured) return null;
  if (!clientPromise)
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        const authClient = createClient(serviceConfig.supabaseUrl!, serviceConfig.supabaseKey!, {
          auth: {
            storage: secureStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            flowType: 'pkce',
          },
        });
        authClient.auth.onAuthStateChange((event, session) => {
          const status = statusFor(session);
          const identityId = status.identity?.id ?? null;
          if (event === 'SIGNED_OUT') oauthExchanges.clear();
          else if (lastIdentityId && lastIdentityId !== identityId) oauthExchanges.clearCompleted();
          lastIdentityId = identityId;
          authEvents.publish(signingOut ? { ...localStatus } : status);
        });
        if (Platform.OS !== 'web')
          AppState.addEventListener('change', (state) => {
            if (state === 'active') authClient.auth.startAutoRefresh();
            else authClient.auth.stopAutoRefresh();
          });
        return authClient;
      })
      .catch(() => {
        clientPromise = null;
        return null;
      });
  return clientPromise;
}

function unavailable(): AuthResult {
  return {
    success: false,
    status: { ...localStatus },
    message: 'Sign-in is not configured for this build. Your saved project and progress are safe.',
  };
}
function failed(message: string): AuthResult {
  return { success: false, status: { ...localStatus }, message };
}
function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254;
}
function redirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined')
    return `${window.location.origin}/auth/callback`;
  return serviceConfig.authRedirectUrl;
}

export const authProvider: AuthProvider = {
  async getStatus() {
    if (signingOut) return { ...localStatus };
    const revision = authEvents.revision;
    try {
      const sdk = await client();
      if (!sdk) return { ...localStatus };
      const { data, error } = await sdk.auth.getSession();
      if (signingOut) return { ...localStatus };
      return authEvents.resolveSnapshot(
        revision,
        error
          ? {
              ...localStatus,
              message: 'Sign-in could not be refreshed. Your local project is safe.',
            }
          : statusFor(data.session),
      );
    } catch {
      return { ...localStatus };
    }
  },
  async signIn(email, password) {
    if (signingOut) return failed('Sign-out is still finishing. Please try again.');
    if (!validEmail(email) || !password) return failed('Enter your email and password.');
    const lifecycle = ++authLifecycle;
    oauthExchanges.clear();
    try {
      const sdk = await client();
      if (!sdk) return unavailable();
      if (signingOut || lifecycle !== authLifecycle)
        return failed('This sign-in attempt was replaced. Try again.');
      const { data, error } = await sdk.auth.signInWithPassword({ email: email.trim(), password });
      if (error)
        return failed(
          'Sign-in did not work. Check your details and whether your email is confirmed, then try again.',
        );
      const status = statusFor(data.session);
      if (!status.identity)
        return failed('Sign-in did not return a valid account session. Try again.');
      return {
        success: true,
        status,
        message: 'You are signed in. Your local project is unchanged.',
      };
    } catch {
      return failed('Sign-in is unavailable right now. Your local project is safe.');
    }
  },
  async signUp(email, password) {
    if (signingOut) return failed('Sign-out is still finishing. Please try again.');
    if (!validEmail(email)) return failed('Enter a valid email address.');
    if (password.length < 12) return failed('Use a password with at least 12 characters.');
    const lifecycle = ++authLifecycle;
    oauthExchanges.clear();
    try {
      const sdk = await client();
      if (!sdk) return unavailable();
      if (signingOut || lifecycle !== authLifecycle)
        return failed('This sign-in attempt was replaced. Try again.');
      const { data, error } = await sdk.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectUrl() },
      });
      if (error)
        return failed('Account creation is unavailable. Check your details and try again.');
      const status = statusFor(data.session);
      if (data.session && !status.identity)
        return failed('Account creation did not return a valid session. Try signing in.');
      return {
        success: true,
        status,
        pendingVerification: !data.session,
        message: data.session
          ? 'Your account is ready.'
          : 'Check your email to confirm your account, then sign in. Your saved progress is safe.',
      };
    } catch {
      return failed('Account creation is unavailable right now.');
    }
  },
  async signInWithProvider(provider) {
    if (signingOut) return failed('Sign-out is still finishing. Please try again.');
    const lifecycle = ++authLifecycle;
    oauthExchanges.clear();
    try {
      const sdk = await client();
      if (!sdk) return unavailable();
      if (signingOut || lifecycle !== authLifecycle)
        return failed('This sign-in attempt was replaced. Try again.');
      const callback = redirectUrl();
      const { data, error } = await sdk.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback,
          skipBrowserRedirect: true,
          ...(provider === 'google' ? { scopes: 'openid email profile' } : {}),
        },
      });
      if (signingOut || lifecycle !== authLifecycle)
        return failed('This sign-in attempt was replaced. Try again.');
      if (error || !data.url)
        return failed(
          `${provider === 'apple' ? 'Apple' : 'Google'} sign-in is unavailable. Your saved progress is safe.`,
        );
      if (Platform.OS === 'web') {
        // A same-tab redirect avoids popup blockers after asynchronous PKCE preparation.
        // The callback page redeems the code using the verifier kept in sessionStorage.
        if (typeof window === 'undefined') return failed('Open this sign-in page in a browser.');
        window.location.assign(data.url);
        return failed(`Opening ${provider === 'apple' ? 'Apple' : 'Google'} sign-in…`);
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, callback);
      if (signingOut || lifecycle !== authLifecycle)
        return failed('This sign-in attempt was replaced. Try again.');
      if (result.type === 'success') return authProvider.completeOAuth(result.url);
      return failed('Sign-in was cancelled. Your local project is unchanged.');
    } catch {
      return failed('Could not open sign-in. Check your connection and try again.');
    }
  },
  async completeOAuth(url) {
    if (signingOut) return failed('Sign-out is still finishing. Start sign-in again.');
    const lifecycle = authLifecycle;
    try {
      const sdk = await client();
      if (!sdk) return unavailable();
      if (signingOut || lifecycle !== authLifecycle)
        return failed('This sign-in attempt was replaced. Start sign-in again.');
      const callback = new URL(url);
      const expected = new URL(redirectUrl());
      if (
        callback.protocol !== expected.protocol ||
        callback.host !== expected.host ||
        callback.pathname !== expected.pathname
      )
        return failed('This sign-in link does not match this app.');
      if (
        callback.searchParams.has('error') ||
        new URLSearchParams(callback.hash.slice(1)).has('error')
      )
        return failed('Sign-in was not completed. Start sign-in again.');
      const code = callback.searchParams.get('code');
      if (!code || code.length > 2048 || /\s/.test(code))
        return failed('The sign-in link is incomplete or expired. Start sign-in again.');
      return await oauthExchanges.run(code, async () => {
        const { data, error } = await sdk.auth.exchangeCodeForSession(code);
        const status = statusFor(data.session);
        if (error || !status.identity)
          return failed('The sign-in link could not be verified. Start sign-in again.');
        return { success: true, status, message: 'You are signed in.' };
      });
    } catch {
      return failed('The sign-in link could not be verified.');
    }
  },
  async resetPassword(email) {
    if (!validEmail(email)) return failed('Enter your account email address.');
    try {
      const sdk = await client();
      if (!sdk) return unavailable();
      const { error } = await sdk.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${redirectUrl()}?type=recovery`,
      });
      if (error) return failed('Could not request a password reset. Try again later.');
      return {
        success: true,
        status: await authProvider.getStatus(),
        message: 'If this address has an account, you will receive a reset link.',
      };
    } catch {
      return failed('Password reset is unavailable right now.');
    }
  },
  async updatePassword(password) {
    if (password.length < 12) return failed('Use a password with at least 12 characters.');
    try {
      const sdk = await client();
      if (!sdk) return unavailable();
      const { error } = await sdk.auth.updateUser({ password });
      if (error)
        return failed('Could not update your password. Request a new reset link and try again.');
      return {
        success: true,
        status: await authProvider.getStatus(),
        message: 'Your password has been updated.',
      };
    } catch {
      return failed('Password update is unavailable right now.');
    }
  },
  async signOut() {
    if (signingOut) return failed('Sign-out is already finishing. Please wait.');
    signingOut = true;
    authLifecycle++;
    oauthExchanges.clear();
    authEvents.publish({ ...localStatus });
    try {
      // Finish any code redemption before deleting the session so a late callback cannot restore it.
      await oauthExchanges.waitForIdle();
      const sdk = await client();
      if (sdk) {
        const { error } = await sdk.auth.signOut({ scope: 'local' });
        if (error) return failed('Sign-out could not finish. Try again.');
      }
      sessionMemory.clear();
      lastIdentityId = null;
      return {
        success: true,
        status: { ...localStatus },
        message: 'Signed out on this device. Your local learning progress is preserved.',
      };
    } catch {
      return failed('Sign-out could not finish. Try again.');
    } finally {
      signingOut = false;
    }
  },
  async getAccessToken() {
    if (signingOut) return null;
    try {
      const sdk = await client();
      if (!sdk) return null;
      const { data, error } = await sdk.auth.getSession();
      return signingOut || error || !statusFor(data.session).identity
        ? null
        : (data.session?.access_token ?? null);
    } catch {
      return null;
    }
  },
  subscribe(listener) {
    return authEvents.subscribe(listener, () => authProvider.getStatus());
  },
};

export type { AuthProvider, AuthStatus, AuthResult } from './contracts';
