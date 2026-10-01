const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Buffer } = require('node:buffer');
const {
  billingEnvironmentOverrides,
  inspectBuildEnvironment,
  verifyBundleBilling,
} = require('./android-build-profile.cjs');

const CLI = require.resolve('./android-build-profile.cjs');
const P = 'EXPO_PUBLIC_REVENUECAT_';
const TEST_KEY = `${P}TEST_KEY`;
const PLATFORM_KEYS = ['ANDROID', 'IOS', 'WEB'].map((platform) => `${P}${platform}_KEY`);
const ALL_KEYS = [TEST_KEY, ...PLATFORM_KEYS];
const TEST_VALUE = 'test_fixtureQa-123';
const DOTENV_KEYS = {
  [TEST_KEY]: TEST_VALUE,
  [PLATFORM_KEYS[0]]: 'goog_fixtureAndroid123',
  [PLATFORM_KEYS[1]]: 'appl_fixtureIos456',
  [PLATFORM_KEYS[2]]: 'rcb_fixtureWeb789',
};
const releaseEnv = () => billingEnvironmentOverrides('Release');
const qaEnv = () => ({ [TEST_KEY]: TEST_VALUE, ...billingEnvironmentOverrides('TestStoreQa') });
const bundleWith = (value, encoding = 'utf8') =>
  Buffer.concat([Buffer.from([0, 255, 1, 0]), Buffer.from(value, encoding), Buffer.from([0, 12])]);

function assertSafeSummary(summary, allowedStrings = []) {
  for (const item of Object.values(summary)) {
    assert.ok(typeof item === 'boolean' || allowedStrings.includes(item));
  }
  for (const secret of Object.values(DOTENV_KEYS)) {
    assert.equal(JSON.stringify(summary).includes(secret), false);
  }
}

test('only exact Release and TestStoreQa variants are accepted without echoing input', () => {
  for (const variant of [undefined, '', 'release', 'test-store-qa', 'Debug', TEST_VALUE]) {
    for (const run of [
      () => billingEnvironmentOverrides(variant),
      () => inspectBuildEnvironment(variant, releaseEnv()),
      () => verifyBundleBilling(variant, bundleWith('code'), releaseEnv()),
    ]) {
      assert.throws(run, (error) => {
        assert.equal(error.message.includes(TEST_VALUE), false);
        return /Unsupported billing build variant/.test(error.message);
      });
    }
  }
});

test('release overrides use literal spaces to prevent Windows dotenv key restoration', () => {
  const overrides = releaseEnv();
  assert.equal(overrides[`${P}BUILD_MODE`], 'release');
  assert.equal(overrides[`${P}USE_TEST_STORE`], 'false');
  assert.equal(overrides.EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES, 'false');
  for (const key of ALL_KEYS) assert.equal(overrides[key], ' ');
  assert.equal(Object.keys(overrides).length, 7);
});

test('QA overrides leave the Test Store key for dotenv and clear every platform key', () => {
  const overrides = billingEnvironmentOverrides('TestStoreQa');
  assert.equal(Object.hasOwn(overrides, TEST_KEY), false);
  assert.equal(overrides[`${P}BUILD_MODE`], 'test-store-qa');
  assert.equal(overrides[`${P}USE_TEST_STORE`], 'true');
  assert.equal(overrides.EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES, 'true');
  for (const key of PLATFORM_KEYS) assert.equal(overrides[key], ' ');
  assert.equal(Object.keys(overrides).length, 6);
});

test('release rejects incompatible mode, missing or enabled flags, and any billing key', () => {
  for (const [key, invalid] of [
    [`${P}BUILD_MODE`, 'test-store-qa'],
    [`${P}BUILD_MODE`, undefined],
    [`${P}USE_TEST_STORE`, 'true'],
    [`${P}USE_TEST_STORE`, undefined],
    ['EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES', 'true'],
    ['EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES', undefined],
    ...ALL_KEYS.map((key) => [key, DOTENV_KEYS[key]]),
  ]) {
    assert.throws(() => inspectBuildEnvironment('Release', { ...releaseEnv(), [key]: invalid }));
  }
});

test('QA requires an exact mode, enabled flags, and a well-formed Test Store key', () => {
  for (const valid of [TEST_VALUE, 'test_A_1-z', ' test_spacesTrimmed ']) {
    const summary = inspectBuildEnvironment('TestStoreQa', { ...qaEnv(), [TEST_KEY]: valid });
    assert.equal(summary.revenueCatTestKeyPresent, true);
    assert.equal(summary.builderPurchasesEnabled, true);
    assert.equal(summary.revenueCatTestStore, true);
    assertSafeSummary(summary, ['test-store-qa']);
  }
  for (const invalid of [
    '',
    undefined,
    ' ',
    'test_',
    'goog_fixture',
    'TEST_no',
    'test_bad/key',
    'test_bad key',
    'test_😃',
  ]) {
    assert.throws(() =>
      inspectBuildEnvironment('TestStoreQa', { ...qaEnv(), [TEST_KEY]: invalid }),
    );
  }
  for (const key of [
    `${P}BUILD_MODE`,
    `${P}USE_TEST_STORE`,
    'EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES',
  ]) {
    for (const invalid of [undefined, 'false', 'release', 'TRUE']) {
      assert.throws(() => inspectBuildEnvironment('TestStoreQa', { ...qaEnv(), [key]: invalid }));
    }
  }
  for (const key of PLATFORM_KEYS) {
    assert.throws(() =>
      inspectBuildEnvironment('TestStoreQa', { ...qaEnv(), [key]: DOTENV_KEYS[key] }),
    );
  }
});

test('inspection rejects disabled public environment inlining for both variants', () => {
  for (const [variant, env] of [
    ['Release', releaseEnv()],
    ['TestStoreQa', qaEnv()],
  ]) {
    for (const disabled of ['1', 'true']) {
      assert.throws(() =>
        inspectBuildEnvironment(variant, { ...env, EXPO_NO_CLIENT_ENV_VARS: disabled }),
      );
    }
  }
});

test('inspection preserves service presence fields and emits no configuration values', () => {
  const summary = inspectBuildEnvironment('Release', {
    ...releaseEnv(),
    EXPO_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'fixturePublicKey',
    EXPO_PUBLIC_INTERVIEW_API_URL: 'https://example.test/interview',
    EXPO_PUBLIC_MENTOR_API_URL: 'http://example.test/mentor',
    EXPO_PUBLIC_OPPORTUNITY_API_URL: 'not a url',
    EXPO_PUBLIC_AUTH_REDIRECT_URL: 'shipaton-nextgen://auth/callback',
    EXPO_PUBLIC_REVENUECAT_ENTITLEMENT: 'builder',
  });
  assert.deepEqual(summary, {
    supabaseUrlHttps: true,
    supabasePublicKeyPresent: true,
    interviewUrlHttps: true,
    mentorUrlHttps: false,
    opportunitiesUrlHttps: false,
    authRedirectPresent: true,
    revenueCatTestStore: false,
    revenueCatTestKeyPresent: false,
    revenueCatEntitlementPresent: true,
    publicInliningDisabled: false,
    revenueCatBuildMode: 'release',
    builderPurchasesEnabled: false,
    revenueCatPlatformKeysBlank: true,
  });
  assertSafeSummary(summary, ['release']);
});

test('pure helpers never mutate input environments or bundle bytes', () => {
  const env = Object.freeze(qaEnv());
  const dotenv = Object.freeze({ ...DOTENV_KEYS });
  const bytes = bundleWith(TEST_VALUE);
  const before = Buffer.from(bytes);
  const processBefore = { ...process.env };
  inspectBuildEnvironment('TestStoreQa', env);
  verifyBundleBilling('TestStoreQa', bytes, env, dotenv);
  const one = releaseEnv();
  one[TEST_KEY] = 'changed';
  assert.equal(releaseEnv()[TEST_KEY], ' ');
  assert.deepEqual(bytes, before);
  assert.deepEqual({ ...process.env }, processBefore);
});

test('release bundles exclude every known dotenv billing key in UTF-8 or UTF-16', () => {
  const result = verifyBundleBilling(
    'Release',
    bundleWith('ordinary code'),
    releaseEnv(),
    DOTENV_KEYS,
  );
  assert.deepEqual(result, {
    billingProfileValid: true,
    bundleBillingVerified: true,
    testStoreKeyEmbedded: false,
    forbiddenBillingKeysAbsent: true,
  });
  assertSafeSummary(result);
  for (const key of Object.values(DOTENV_KEYS)) {
    for (const encoding of ['utf8', 'utf16le']) {
      assert.throws(
        () => verifyBundleBilling('Release', bundleWith(key, encoding), releaseEnv(), DOTENV_KEYS),
        (error) => {
          assert.equal(error.message.includes(key), false);
          return /forbidden billing key/.test(error.message);
        },
      );
    }
  }
});

test('QA bundle must contain the actual effective Test Store key and no platform dotenv key', () => {
  for (const encoding of ['utf8', 'utf16le']) {
    const result = verifyBundleBilling(
      'TestStoreQa',
      bundleWith(TEST_VALUE, encoding),
      qaEnv(),
      DOTENV_KEYS,
    );
    assert.equal(result.testStoreKeyEmbedded, true);
    assertSafeSummary(result);
  }
  assert.throws(
    () => verifyBundleBilling('TestStoreQa', bundleWith('test_wrongFixture'), qaEnv(), DOTENV_KEYS),
    /missing its configured/,
  );
  for (const key of PLATFORM_KEYS) {
    assert.throws(
      () =>
        verifyBundleBilling(
          'TestStoreQa',
          bundleWith(`${TEST_VALUE} ${DOTENV_KEYS[key]}`),
          qaEnv(),
          DOTENV_KEYS,
        ),
      /forbidden billing key/,
    );
  }
});

test('bundle verification validates profiles and rejects empty or non-buffer input', () => {
  assert.throws(() => verifyBundleBilling('Release', bundleWith('code'), qaEnv()), /build mode/);
  for (const invalid of [Buffer.alloc(0), 'code', null, new Uint8Array([1])]) {
    assert.throws(() => verifyBundleBilling('Release', invalid, releaseEnv()), /non-empty/);
  }
});

function cliFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipingit-billing-profile-'));
  t.after(() => {
    const target = fs.realpathSync(dir);
    const tempRoot = fs.realpathSync(os.tmpdir());
    assert.equal(path.dirname(target), tempRoot, 'Fixture cleanup must remain in the temp root.');
    assert.ok(
      path.basename(target).startsWith('shipingit-billing-profile-'),
      'Fixture cleanup requires its task-specific directory prefix.',
    );
    fs.rmSync(target, { recursive: true, force: true });
  });
  const dotenvFile = path.join(dir, '.env.local');
  const dotenv = `${Object.entries(DOTENV_KEYS)
    .map(([key, entry]) => `${key}=${entry}`)
    .join('\n')}\n`;
  fs.writeFileSync(dotenvFile, dotenv);
  const env = { ...process.env, NODE_ENV: 'production' };
  for (const key of Object.keys(env)) {
    if (
      key.startsWith('EXPO_PUBLIC_') ||
      key.startsWith('__EXPO_ENV') ||
      ['EXPO_NO_DOTENV', 'EXPO_NO_CLIENT_ENV_VARS', 'DEBUG'].includes(key)
    )
      delete env[key];
  }
  return {
    dir,
    dotenvFile,
    dotenv,
    run: (args, overrides = {}) =>
      spawnSync(process.execPath, [CLI, ...args], {
        cwd: dir,
        env: { ...env, ...overrides },
        encoding: 'utf8',
      }),
  };
}

function assertNoCredentialOutput(result) {
  for (const key of Object.values(DOTENV_KEYS)) {
    assert.equal(`${result.stdout}${result.stderr}`.includes(key), false);
  }
}

test('CLI emits safe overrides and inspects process overrides without rewriting dotenv', (t) => {
  const fixture = cliFixture(t);
  for (const variant of ['Release', 'TestStoreQa']) {
    const overrides = fixture.run(['overrides', variant]);
    assert.equal(overrides.status, 0);
    assert.deepEqual(JSON.parse(overrides.stdout), billingEnvironmentOverrides(variant));
    assertNoCredentialOutput(overrides);
    const inspected = fixture.run(['inspect', variant], billingEnvironmentOverrides(variant));
    assert.equal(inspected.status, 0, inspected.stderr);
    assertSafeSummary(JSON.parse(inspected.stdout), [
      variant === 'Release' ? 'release' : 'test-store-qa',
    ]);
    assertNoCredentialOutput(inspected);
  }
  assert.equal(fs.readFileSync(fixture.dotenvFile, 'utf8'), fixture.dotenv);
});

test('CLI verifies the exact supplied bundle and original dotenv keys despite cleared overrides', (t) => {
  const fixture = cliFixture(t);
  const file = path.join(fixture.dir, 'exact bundle.hbc');
  fs.writeFileSync(file, bundleWith(TEST_VALUE));
  const qa = fixture.run(
    ['verify-bundle', 'TestStoreQa', file],
    billingEnvironmentOverrides('TestStoreQa'),
  );
  assert.equal(qa.status, 0, qa.stderr);
  assert.equal(JSON.parse(qa.stdout).testStoreKeyEmbedded, true);
  assertNoCredentialOutput(qa);
  const release = fixture.run(['verify-bundle', 'Release', file], releaseEnv());
  assert.equal(release.status, 1);
  assert.match(release.stderr, /forbidden billing key/);
  assertNoCredentialOutput(release);
  fs.writeFileSync(file, bundleWith(DOTENV_KEYS[PLATFORM_KEYS[0]]));
  const leaked = fixture.run(
    ['verify-bundle', 'TestStoreQa', file],
    billingEnvironmentOverrides('TestStoreQa'),
  );
  assert.equal(leaked.status, 1);
  assert.match(leaked.stderr, /forbidden billing key/);
  assertNoCredentialOutput(leaked);
  fs.writeFileSync(file, bundleWith('ordinary code'));
  const clean = fixture.run(['verify-bundle', 'Release', file], releaseEnv());
  assert.equal(clean.status, 0, clean.stderr);
  assertSafeSummary(JSON.parse(clean.stdout));
  assert.equal(fs.readFileSync(fixture.dotenvFile, 'utf8'), fixture.dotenv);
});

test('CLI masks invalid profile values, user arguments, and filesystem errors', (t) => {
  const fixture = cliFixture(t);
  for (const [args, env] of [
    [['inspect', TEST_VALUE], {}],
    [[TEST_VALUE, 'Release'], {}],
    [['inspect', 'Release'], { ...releaseEnv(), [TEST_KEY]: TEST_VALUE }],
    [['inspect', 'Release'], { ...releaseEnv(), [`${P}BUILD_MODE`]: TEST_VALUE }],
    [['verify-bundle', 'Release', path.join(fixture.dir, TEST_VALUE)], releaseEnv()],
  ]) {
    const result = fixture.run(args, env);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assertNoCredentialOutput(result);
  }
});
