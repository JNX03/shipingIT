import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as runtime from './auth-runtime';
import * as storageRuntime from './auth-storage';
import { resolveAuthCallback } from './auth-callback-navigation';
import type { AuthProvider } from './contracts';

// Execute the actual service with isolated native/SDK modules. No device, provider, or network calls.
const compiledService = ts.transpileModule(
  readFileSync(new URL('./auth.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
const session = () => ({
  access_token: 'fixture-access-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'fixture-user', email: 'fixture@example.test', is_anonymous: false },
});
const nativeCallback = 'shipaton-nextgen://auth/callback?code=fixture-code';

function loadService({
  platform = 'android',
  browserValues = new Map<string, string>(),
  exchange,
  initialSession = null,
  browserReturnUrl = nativeCallback,
}: {
  platform?: string;
  browserValues?: Map<string, string>;
  exchange?: () => Promise<unknown>;
  initialSession?: unknown;
  browserReturnUrl?: string;
} = {}) {
  const nativeValues = new Map<string, string>();
  let sdkStorage!: Storage;
  let currentSession = initialSession;
  let exchangeCalls = 0;
  let popupCalls = 0;
  let signoutCalls = 0;
  let callback: (event: string, value: unknown) => void = () => {};
  const redirects: string[] = [];
  const oauthOptions: unknown[] = [];
  const auth = {
    onAuthStateChange: (listener: typeof callback) => {
      callback = listener;
      return { data: { subscription: { unsubscribe() {} } } };
    },
    getSession: async () => ({ data: { session: currentSession }, error: null }),
    signInWithOAuth: async (options: unknown) => {
      oauthOptions.push(options);
      await sdkStorage.setItem('fixture-code-verifier', 'fixture-verifier');
      return { data: { url: 'https://provider.example/authorize' }, error: null };
    },
    exchangeCodeForSession: async () => {
      exchangeCalls++;
      if (exchange) return exchange();
      currentSession = session();
      callback('SIGNED_IN', currentSession);
      return { data: { session: currentSession }, error: null };
    },
    signOut: async () => {
      signoutCalls++;
      currentSession = null;
      callback('SIGNED_OUT', null);
      return { error: null };
    },
    startAutoRefresh() {},
    stopAutoRefresh() {},
  };
  const modules: Record<string, unknown> = {
    'react-native-url-polyfill/auto': {},
    'react-native': {
      Platform: { OS: platform },
      AppState: { addEventListener: () => ({ remove() {} }) },
    },
    'expo-secure-store': {
      getItemAsync: async (key: string) => nativeValues.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        nativeValues.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        nativeValues.delete(key);
      },
    },
    'expo-web-browser': {
      openAuthSessionAsync: async () => {
        popupCalls++;
        return { type: 'success', url: browserReturnUrl };
      },
    },
    './config': {
      serviceConfig: {
        supabaseUrl: 'https://fixture.supabase.co',
        supabaseKey: 'fixture-publishable',
        authRedirectUrl: 'shipaton-nextgen://auth/callback',
      },
    },
    './auth-runtime': runtime,
    './auth-storage': storageRuntime,
    '@supabase/supabase-js': {
      createClient: (_url: string, _key: string, options: { auth: { storage: Storage } }) => {
        sdkStorage = options.auth.storage;
        return { auth };
      },
    },
  };
  const moduleExports: { authProvider?: AuthProvider } = {};
  new Function('require', 'exports', 'window', 'sessionStorage', compiledService)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected test import: ${name}`);
      return modules[name];
    },
    moduleExports,
    {
      location: {
        origin: 'https://shipingit.example',
        assign: (url: string) => redirects.push(url),
      },
    },
    {
      getItem: (key: string) => browserValues.get(key) ?? null,
      setItem: (key: string, value: string) => browserValues.set(key, value),
      removeItem: (key: string) => browserValues.delete(key),
    },
  );
  return {
    service: moduleExports.authProvider!,
    browserValues,
    redirects,
    oauthOptions,
    get storage() {
      return sdkStorage;
    },
    get exchangeCalls() {
      return exchangeCalls;
    },
    get popupCalls() {
      return popupCalls;
    },
    get signoutCalls() {
      return signoutCalls;
    },
    emit: (event: string, value: unknown) => callback(event, value),
  };
}

test('web OAuth uses same-tab navigation and keeps only the verifier across page reload', async () => {
  const first = loadService({ platform: 'web' });
  const redirectResult = await first.service.signInWithProvider('google');
  assert.equal(redirectResult.success, false);
  assert.deepEqual(first.redirects, ['https://provider.example/authorize']);
  assert.equal(first.popupCalls, 0);
  assert.deepEqual(first.oauthOptions, [
    {
      provider: 'google',
      options: {
        redirectTo: 'https://shipingit.example/auth/callback',
        skipBrowserRedirect: true,
        scopes: 'openid email profile',
      },
    },
  ]);
  await first.storage.setItem('fixture-session', 'fixture-sensitive-session');
  assert.equal(first.browserValues.has('fixture-session'), false);
  const reloaded = loadService({ platform: 'web', browserValues: first.browserValues });
  await reloaded.service.getStatus();
  assert.equal(await reloaded.storage.getItem('fixture-code-verifier'), 'fixture-verifier');
  assert.equal(await reloaded.storage.getItem('fixture-session'), null);
  assert.equal(
    (
      await reloaded.service.completeOAuth(
        'https://shipingit.example/auth/callback?code=fixture-code',
      )
    ).success,
    true,
  );
  assert.equal(reloaded.exchangeCalls, 1);
});

test('native browser result and callback route share one verified exchange', async () => {
  const fixture = loadService();
  assert.equal((await fixture.service.signInWithProvider('google')).success, true);
  const repeated = await Promise.all([
    fixture.service.completeOAuth(nativeCallback),
    fixture.service.completeOAuth(nativeCallback),
  ]);
  assert.ok(repeated.every((value) => value.success));
  assert.equal(fixture.popupCalls, 1);
  assert.equal(fixture.exchangeCalls, 1);
});

test('wrong, missing, or provider-error callbacks never redeem a code', async () => {
  const fixture = loadService();
  for (const url of [
    'https://attacker.example/auth/callback?code=fixture-code',
    'shipaton-nextgen://auth/other?code=fixture-code',
    'shipaton-nextgen://auth/callback',
    'shipaton-nextgen://auth/callback?code=fixture-code&error=access_denied',
  ])
    assert.equal((await fixture.service.completeOAuth(url)).success, false);
  assert.equal(fixture.exchangeCalls, 0);
});

test('completeOAuth rejects raw query and fragment denials before redeeming a present code', async () => {
  for (const [platform, expectedUrl] of [
    ['web', 'https://shipingit.example/auth/callback'],
    ['android', 'shipaton-nextgen://auth/callback'],
  ]) {
    for (const denial of ['&error=access_denied', '#error=access_denied']) {
      const fixture = loadService({ platform });
      const result = await fixture.service.completeOAuth(
        `${expectedUrl}?code=fixture-code${denial}`,
      );
      assert.equal(result.success, false);
      assert.equal(result.status.identity, null);
      assert.match(result.message, /Sign-in was not completed/);
      assert.equal(fixture.exchangeCalls, 0);
    }
  }
});

test('native provider sign-in rejects denied raw browser returns while valid PKCE still succeeds', async () => {
  for (const platform of ['android', 'ios']) {
    for (const denial of ['&error=access_denied', '#error=access_denied']) {
      const fixture = loadService({ platform, browserReturnUrl: `${nativeCallback}${denial}` });
      const result = await fixture.service.signInWithProvider('google');
      assert.equal(fixture.oauthOptions.length, 1);
      assert.equal(fixture.popupCalls, 1);
      assert.equal(result.success, false);
      assert.equal(result.status.identity, null);
      assert.match(result.message, /Sign-in was not completed/);
      assert.equal(fixture.exchangeCalls, 0);
    }
    const valid = loadService({ platform, browserReturnUrl: nativeCallback });
    const result = await valid.service.signInWithProvider('google');
    assert.equal(result.success, true);
    assert.equal(result.status.identity?.id, 'fixture-user');
    assert.equal(valid.popupCalls, 1);
    assert.equal(valid.exchangeCalls, 1);
  }
});

test('matching query and fragment denials survive resolution and never redeem a code on web or native', async () => {
  for (const [platform, expectedUrl] of [
    ['web', 'https://shipingit.example/auth/callback'],
    ['android', 'shipaton-nextgen://auth/callback'],
  ]) {
    for (const denial of [
      '?code=fixture-code&error=access_denied&error_description=fixture-denial-detail',
      '?code=fixture-code#error=access_denied&error_description=fixture-denial-detail',
      '#code=fixture-code&error=access_denied',
      '?code=other-fixture&code=fixture-code&error=access_denied',
      '?code=fixture-code&error=&error=access_denied',
    ]) {
      const fixture = loadService({ platform });
      const receivedUrl = `${expectedUrl}${denial}`;
      const resolved = resolveAuthCallback({
        expectedUrl,
        receivedUrl,
        code: 'fixture-code',
      });
      assert.ok(resolved, `${platform}: a matching denied callback must reach error handling`);
      const resultUrl = new URL(resolved.url);
      assert.equal(resolved.url, receivedUrl, `${platform}: denial URL must remain unchanged`);
      assert.equal(
        resultUrl.searchParams.has('error') ||
          new URLSearchParams(resultUrl.hash.slice(1)).has('error'),
        true,
      );
      assert.deepEqual(
        resultUrl.searchParams.getAll('code'),
        new URL(receivedUrl).searchParams.getAll('code'),
      );
      assert.equal(resultUrl.hash, new URL(receivedUrl).hash);
      const result = await fixture.service.completeOAuth(resolved.url);
      assert.equal(result.success, false, `${platform}: denial must not authenticate`);
      assert.equal(result.status.identity, null);
      assert.equal(result.status.mode, 'local');
      assert.doesNotMatch(result.message, /fixture-denial-detail/);
      assert.equal(fixture.exchangeCalls, 0, `${platform}: denial must precede code redemption`);
    }
  }
});

test('valid route callbacks still redeem while errors from unrelated or mismatched URLs are ignored', async () => {
  for (const [platform, expectedUrl] of [
    ['web', 'https://shipingit.example/auth/callback'],
    ['android', 'shipaton-nextgen://auth/callback'],
  ]) {
    for (const receivedUrl of [
      `${expectedUrl}?code=fixture-code&type=recovery`,
      'https://unrelated.example/auth/callback?code=unrelated-fixture&error=access_denied',
      `${expectedUrl}/other?code=unrelated-fixture#error=access_denied`,
      `${expectedUrl}?code=stale-fixture&error=access_denied`,
      `${expectedUrl}#code=stale-fixture&error=access_denied`,
    ]) {
      const fixture = loadService({ platform });
      const resolved = resolveAuthCallback({ expectedUrl, receivedUrl, code: 'fixture-code' });
      assert.ok(resolved);
      assert.equal(new URL(resolved.url).searchParams.get('code'), 'fixture-code');
      assert.equal(new URL(resolved.url).searchParams.has('error'), false);
      assert.equal(new URL(resolved.url).hash, '');
      assert.equal(resolved.recovery, receivedUrl.includes('type=recovery'));
      assert.equal((await fixture.service.completeOAuth(resolved.url)).success, true);
      assert.equal(fixture.exchangeCalls, 1);
      if (
        receivedUrl.startsWith('https://unrelated.example/') ||
        receivedUrl.startsWith(`${expectedUrl}/other`)
      )
        assert.equal(resolveAuthCallback({ expectedUrl, receivedUrl }), null);
    }
  }
});

test('a matching error-only callback is rejected before looking for a route code', async () => {
  for (const [platform, expectedUrl] of [
    ['web', 'https://shipingit.example/auth/callback'],
    ['android', 'shipaton-nextgen://auth/callback'],
  ]) {
    for (const denial of ['?error=access_denied', '#error=access_denied']) {
      const fixture = loadService({ platform });
      const resolved = resolveAuthCallback({ expectedUrl, receivedUrl: `${expectedUrl}${denial}` });
      assert.ok(resolved);
      const result = await fixture.service.completeOAuth(resolved.url);
      assert.equal(result.success, false);
      assert.match(result.message, /Sign-in was not completed/);
      assert.equal(fixture.exchangeCalls, 0);
    }
  }
});

test('expired or anonymous SDK sessions cannot unlock the app or supply a bearer token', async () => {
  for (const initialSession of [
    null,
    { ...session(), expires_at: 1 },
    { ...session(), user: { ...session().user, is_anonymous: true } },
  ]) {
    const fixture = loadService({ initialSession });
    assert.equal((await fixture.service.getStatus()).mode, 'local');
    assert.equal(await fixture.service.getAccessToken(), null);
  }
});

test('signout invalidates cached callback success and blocks callbacks while a redemption settles', async () => {
  let release!: (value: unknown) => void;
  const exchange = new Promise((resolve) => {
    release = resolve;
  });
  const fixture = loadService({ exchange: () => exchange });
  const callbackResult = fixture.service.completeOAuth(nativeCallback);
  while (!fixture.exchangeCalls) await new Promise<void>((resolve) => setImmediate(resolve));
  const signingOut = fixture.service.signOut();
  assert.equal((await fixture.service.completeOAuth(nativeCallback)).success, false);
  assert.equal((await fixture.service.getStatus()).mode, 'local');
  assert.equal(await fixture.service.getAccessToken(), null);
  release({ data: { session: session() }, error: null });
  assert.equal((await callbackResult).success, false);
  assert.equal((await signingOut).success, true);
  assert.equal(fixture.signoutCalls, 1);
});

test('signout during initial client loading prevents a callback from registering a late exchange', async () => {
  const fixture = loadService();
  const callbackResult = fixture.service.completeOAuth(nativeCallback);
  const signoutResult = fixture.service.signOut();
  assert.equal((await signoutResult).success, true);
  assert.equal((await callbackResult).success, false);
  assert.equal(fixture.exchangeCalls, 0);
  assert.equal((await fixture.service.getStatus()).mode, 'local');
});

test('concurrent signouts cannot release the guard before the single SDK signout finishes', async () => {
  const fixture = loadService({ initialSession: session() });
  const first = fixture.service.signOut();
  const second = fixture.service.signOut();
  assert.equal((await second).success, false);
  assert.equal((await first).success, true);
  assert.equal(fixture.signoutCalls, 1);
  assert.equal((await fixture.service.getStatus()).mode, 'local');
});

test('Google requests only identity scopes and exposes no extra-scope or offline-consent override', async () => {
  const fixture = loadService({ platform: 'web' });
  // A runtime caller cannot pass extra OAuth options through the public provider-only method.
  const call = fixture.service.signInWithProvider as unknown as (
    ...args: unknown[]
  ) => Promise<unknown>;
  await call('google', {
    scopes: 'https://www.googleapis.com/auth/gmail.readonly',
    queryParams: { access_type: 'offline', prompt: 'consent' },
  });
  assert.deepEqual(fixture.oauthOptions, [
    {
      provider: 'google',
      options: {
        redirectTo: 'https://shipingit.example/auth/callback',
        skipBrowserRedirect: true,
        scopes: 'openid email profile',
      },
    },
  ]);
});
