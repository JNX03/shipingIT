'use strict';

const { Buffer } = require('node:buffer');

const RC_PREFIX = 'EXPO_PUBLIC_REVENUECAT_';
const TEST_KEY = `${RC_PREFIX}TEST_KEY`;
const PLATFORM_KEYS = ['ANDROID_KEY', 'IOS_KEY', 'WEB_KEY'].map((key) => `${RC_PREFIX}${key}`);
const ALL_KEYS = [TEST_KEY, ...PLATFORM_KEYS];
const BUILD_MODE = `${RC_PREFIX}BUILD_MODE`;
const TEST_STORE = `${RC_PREFIX}USE_TEST_STORE`;
const PURCHASES = 'EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES';

class BillingProfileError extends Error {}

function buildMode(variant) {
  if (variant === 'Release') return 'release';
  if (variant === 'TestStoreQa') return 'test-store-qa';
  throw new BillingProfileError('Unsupported billing build variant. Use Release or TestStoreQa.');
}

function value(env, key) {
  return typeof env[key] === 'string' ? env[key].trim() : '';
}

/** Process-only overrides: never rewrite .env files to select a build profile. */
function billingEnvironmentOverrides(variant) {
  const mode = buildMode(variant);
  const qa = variant === 'TestStoreQa';
  const overrides = {
    [BUILD_MODE]: mode,
    [TEST_STORE]: String(qa),
    [PURCHASES]: String(qa),
  };
  // Empty environment values can be removed on Windows, allowing dotenv to
  // restore a key. A literal space remains defined and config.ts trims it away.
  for (const key of qa ? PLATFORM_KEYS : ALL_KEYS) overrides[key] = ' ';
  return overrides;
}

function inspectBuildEnvironment(variant, env) {
  const mode = buildMode(variant);
  if (!env || typeof env !== 'object') {
    throw new BillingProfileError('Build environment must be provided.');
  }
  const qa = variant === 'TestStoreQa';
  if (env[BUILD_MODE] !== mode) {
    throw new BillingProfileError('RevenueCat build mode does not match the requested variant.');
  }
  if (env[TEST_STORE] !== String(qa)) {
    throw new BillingProfileError(
      'RevenueCat Test Store flag does not match the requested variant.',
    );
  }
  if (env[PURCHASES] !== String(qa)) {
    throw new BillingProfileError('Builder purchase flag does not match the requested variant.');
  }
  if (PLATFORM_KEYS.some((key) => value(env, key))) {
    throw new BillingProfileError(
      'Platform billing keys must be blank for these preview profiles.',
    );
  }
  if (qa && !/^test_[A-Za-z0-9_-]+$/.test(value(env, TEST_KEY))) {
    throw new BillingProfileError('Test Store QA requires a valid RevenueCat Test Store key.');
  }
  if (!qa && value(env, TEST_KEY)) {
    throw new BillingProfileError('Release preview must not contain a RevenueCat Test Store key.');
  }
  // Fail closed for any explicit override, matching the build script's existing
  // check. The reviewed build leaves this switch unset rather than guessing.
  const publicInliningDisabled = Boolean(env.EXPO_NO_CLIENT_ENV_VARS);
  if (publicInliningDisabled) {
    throw new BillingProfileError('Public environment inlining must be enabled for this build.');
  }
  const present = (key) => Boolean(value(env, key));
  const https = (key) => {
    try {
      return new URL(value(env, key)).protocol === 'https:';
    } catch {
      return false;
    }
  };
  // This object is deliberately limited to booleans and a fixed build-mode enum.
  return {
    supabaseUrlHttps: https('EXPO_PUBLIC_SUPABASE_URL'),
    supabasePublicKeyPresent:
      present('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || present('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    interviewUrlHttps: https('EXPO_PUBLIC_INTERVIEW_API_URL'),
    mentorUrlHttps: https('EXPO_PUBLIC_MENTOR_API_URL'),
    opportunitiesUrlHttps: https('EXPO_PUBLIC_OPPORTUNITY_API_URL'),
    authRedirectPresent: present('EXPO_PUBLIC_AUTH_REDIRECT_URL'),
    revenueCatTestStore: qa,
    revenueCatTestKeyPresent: present(TEST_KEY),
    revenueCatEntitlementPresent: present(`${RC_PREFIX}ENTITLEMENT`),
    publicInliningDisabled,
    revenueCatBuildMode: mode,
    builderPurchasesEnabled: qa,
    revenueCatPlatformKeysBlank: true,
  };
}

/** Inspect exact bundle bytes; the caller must establish that they match its APK. */
function verifyBundleBilling(variant, bundle, effectiveEnv, dotenvEnv = {}) {
  inspectBuildEnvironment(variant, effectiveEnv);
  if (!Buffer.isBuffer(bundle) || bundle.length === 0) {
    throw new BillingProfileError('A non-empty generated JavaScript bundle is required.');
  }
  if (!dotenvEnv || typeof dotenvEnv !== 'object') {
    throw new BillingProfileError('Original dotenv configuration must be provided.');
  }
  const qa = variant === 'TestStoreQa';
  const contains = (key) =>
    bundle.includes(Buffer.from(key, 'utf8')) || bundle.includes(Buffer.from(key, 'utf16le'));
  const forbidden = (qa ? PLATFORM_KEYS : ALL_KEYS)
    .map((key) => value(dotenvEnv, key))
    .filter(Boolean);
  if (forbidden.some(contains)) {
    throw new BillingProfileError('The generated bundle contains a forbidden billing key.');
  }
  const testStoreKeyEmbedded = qa && contains(value(effectiveEnv, TEST_KEY));
  if (qa && !testStoreKeyEmbedded) {
    throw new BillingProfileError(
      'The generated QA bundle is missing its configured Test Store key.',
    );
  }
  return {
    billingProfileValid: true,
    bundleBillingVerified: true,
    testStoreKeyEmbedded,
    forbiddenBillingKeysAbsent: true,
  };
}

module.exports = { billingEnvironmentOverrides, inspectBuildEnvironment, verifyBundleBilling };

if (require.main === module) {
  try {
    const [command, variant, bundlePath, ...extra] = process.argv.slice(2);
    buildMode(variant);
    const validCommand = ['overrides', 'inspect', 'verify-bundle'].includes(command);
    if (!validCommand || extra.length || (command === 'verify-bundle' ? !bundlePath : bundlePath)) {
      throw new BillingProfileError(
        'Usage: android-build-profile.cjs overrides|inspect VARIANT, or verify-bundle VARIANT PATH.',
      );
    }
    let result;
    if (command === 'overrides') {
      result = billingEnvironmentOverrides(variant);
    } else {
      const expoEnv = require('@expo/env');
      expoEnv.loadProjectEnv(process.cwd(), { silent: true });
      if (command === 'inspect') {
        result = inspectBuildEnvironment(variant, process.env);
      } else {
        // Parse the original dotenv values independently of process-only key
        // clearing, including variables referenced by another dotenv value.
        const dotenvEnv = expoEnv.parseProjectEnv(process.cwd(), {
          silent: true,
          systemEnv: {},
        }).env;
        const bundle = require('node:fs').readFileSync(bundlePath);
        result = verifyBundleBilling(variant, bundle, process.env, dotenvEnv);
      }
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    // Never forward filesystem, dotenv, or dependency errors: they may contain
    // environment values, supplied paths, or source lines with credentials.
    process.stderr.write(
      `${error instanceof BillingProfileError ? error.message : 'Billing build profile check failed. Configuration values were not logged.'}\n`,
    );
    process.exitCode = 1;
  }
}
