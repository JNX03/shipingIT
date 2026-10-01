const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  hashPublicEnvironment,
  publicEnvironmentCacheVersion,
} = require('./metro-public-env-cache.cjs');
const { billingEnvironmentOverrides } = require('./android-build-profile.cjs');

test('Release and Test Store QA overrides yield separate Metro cache versions', () => {
  const dotenv = {
    EXPO_PUBLIC_REVENUECAT_TEST_KEY: 'test_fixtureQa-123',
    EXPO_PUBLIC_MENTOR_API_URL: 'https://example.test/mentor',
  };
  const release = { ...dotenv, ...billingEnvironmentOverrides('Release') };
  const qa = { ...dotenv, ...billingEnvironmentOverrides('TestStoreQa') };
  assert.notEqual(
    publicEnvironmentCacheVersion('1.0', release),
    publicEnvironmentCacheVersion('1.0', qa),
  );
  assert.equal(release.EXPO_PUBLIC_REVENUECAT_TEST_KEY, ' ');
  assert.equal(qa.EXPO_PUBLIC_REVENUECAT_TEST_KEY, dotenv.EXPO_PUBLIC_REVENUECAT_TEST_KEY);
});

test('public entries are ordered deterministically independent of insertion order', () => {
  const first = { EXPO_PUBLIC_Z: 'last', EXPO_PUBLIC_A: 'first', EXPO_PUBLIC_M: 'middle' };
  const reverse = Object.fromEntries(Object.entries(first).reverse());
  assert.equal(hashPublicEnvironment(first), hashPublicEnvironment(reverse));
  assert.match(hashPublicEnvironment(first), /^[a-f0-9]{64}$/);
});

test('changes to names, exact values, blank values, and presence invalidate the cache', () => {
  const variants = [
    {},
    { EXPO_PUBLIC_A: '' },
    { EXPO_PUBLIC_A: ' ' },
    { EXPO_PUBLIC_A: 'a' },
    { EXPO_PUBLIC_A: 'a ' },
    { EXPO_PUBLIC_A: 'b' },
    { EXPO_PUBLIC_B: 'a' },
    { EXPO_PUBLIC_A: 'a', EXPO_PUBLIC_B: 'b' },
  ];
  assert.equal(new Set(variants.map(hashPublicEnvironment)).size, variants.length);
  assert.equal(hashPublicEnvironment({ EXPO_PUBLIC_A: undefined }), hashPublicEnvironment({}));
});

test('framed entries avoid delimiter collisions in arbitrary environment values', () => {
  assert.notEqual(
    hashPublicEnvironment({ EXPO_PUBLIC_A: 'one\nEXPO_PUBLIC_B=two' }),
    hashPublicEnvironment({ EXPO_PUBLIC_A: 'one', EXPO_PUBLIC_B: 'two' }),
  );
});

test('private variables are excluded without accessing their values', () => {
  const env = { EXPO_PUBLIC_A: 'public' };
  Object.defineProperty(env, 'SERVER_SECRET', {
    enumerable: true,
    get() {
      throw new Error('Private values must not be accessed.');
    },
  });
  const expected = hashPublicEnvironment({ EXPO_PUBLIC_A: 'public' });
  assert.equal(hashPublicEnvironment(env), expected);
  assert.equal(
    hashPublicEnvironment({
      EXPO_PUBLIC_A: 'public',
      NODE_ENV: 'production',
      EXPO_PRIVATE_A: 'secret',
    }),
    expected,
  );
});

test('helpers preserve input and process environments and never expose public values', () => {
  const env = Object.freeze({
    EXPO_PUBLIC_REVENUECAT_TEST_KEY: 'test_valueMustStayHidden123',
    EXPO_PUBLIC_API_URL: 'https://must-stay-hidden.example.test/path',
  });
  const original = { ...env };
  const processBefore = { ...process.env };
  const hash = hashPublicEnvironment(env);
  const version = publicEnvironmentCacheVersion('expo-default-version', env);
  for (const entry of [...Object.keys(env), ...Object.values(env)]) {
    assert.equal(hash.includes(entry), false);
    assert.equal(version.includes(entry), false);
  }
  assert.deepEqual(env, original);
  assert.deepEqual({ ...process.env }, processBefore);
});

test('default base cache version is preserved exactly', () => {
  for (const base of ['1.0', 'expo-default/custom-version', '']) {
    assert.equal(
      publicEnvironmentCacheVersion(base, {}),
      `${base}|expo-public-sha256:${hashPublicEnvironment({})}`,
    );
  }
  assert.notEqual(
    publicEnvironmentCacheVersion('one', {}),
    publicEnvironmentCacheVersion('two', {}),
  );
});

test('invalid inputs fail without including supplied values in error messages', () => {
  const secret = 'test_neverPrintThisValue';
  for (const run of [
    () => hashPublicEnvironment(secret),
    () => hashPublicEnvironment(null),
    () => hashPublicEnvironment({ EXPO_PUBLIC_KEY: { secret } }),
    () => publicEnvironmentCacheVersion({ secret }, {}),
  ]) {
    assert.throws(run, (error) => {
      assert.equal(error.message.includes(secret), false);
      return error instanceof TypeError;
    });
  }
});

test('Metro config loads effective env before hashing and preserves the Expo default config', () => {
  const filename = require.resolve('../metro.config.js');
  const root = path.dirname(filename);
  const env = { EXPO_PUBLIC_FLAG: 'processOverride', EXPO_PUBLIC_REVENUECAT_TEST_KEY: ' ' };
  const dotenv = {
    EXPO_PUBLIC_FLAG: 'dotenvValue',
    EXPO_PUBLIC_REVENUECAT_TEST_KEY: 'test_dotenvFixture',
    EXPO_PUBLIC_API_URL: 'https://fixture.example.test/api',
  };
  let envLoaded = false;
  const defaults = {
    cacheVersion: 'expo-original-base',
    resolver: { sourceExts: ['js', 'ts', 'tsx'] },
    transformer: { babelTransformerPath: 'expo-transformer' },
    cacheStores: ['expo-default-store'],
  };
  const original = structuredClone(defaults);
  const moduleStub = { exports: {} };
  const failOnLog = () => assert.fail('Metro configuration must not log environment values.');
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    __dirname: root,
    process: { env },
    module: moduleStub,
    console: { log: failOnLog, warn: failOnLog, error: failOnLog },
    require(id) {
      if (id === 'expo/metro-config') {
        return {
          getDefaultConfig(projectRoot) {
            assert.equal(projectRoot, root);
            assert.equal(envLoaded, true);
            return defaults;
          },
        };
      }
      if (id === '@expo/env') {
        return {
          loadProjectEnv(projectRoot, options) {
            assert.equal(projectRoot, root);
            assert.equal(options.silent, true);
            assert.equal(Object.keys(options).join(','), 'silent');
            for (const [key, entry] of Object.entries(dotenv)) {
              if (env[key] === undefined) env[key] = entry;
            }
            envLoaded = true;
          },
        };
      }
      assert.equal(id, './scripts/metro-public-env-cache.cjs');
      return {
        publicEnvironmentCacheVersion(baseVersion, effectiveEnv) {
          assert.equal(envLoaded, true);
          assert.equal(effectiveEnv.EXPO_PUBLIC_FLAG, 'processOverride');
          assert.equal(effectiveEnv.EXPO_PUBLIC_REVENUECAT_TEST_KEY, ' ');
          assert.equal(effectiveEnv.EXPO_PUBLIC_API_URL, dotenv.EXPO_PUBLIC_API_URL);
          return publicEnvironmentCacheVersion(baseVersion, effectiveEnv);
        },
      };
    },
  });
  assert.equal(moduleStub.exports, defaults);
  assert.deepEqual(moduleStub.exports, {
    ...original,
    cacheVersion: publicEnvironmentCacheVersion(original.cacheVersion, env),
  });
});
