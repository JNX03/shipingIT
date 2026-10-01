'use strict';

const { createHash } = require('node:crypto');

/** Hash exact, effective public values without exposing them in cache metadata. */
function hashPublicEnvironment(env) {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    throw new TypeError('An environment map is required for the Metro cache hash.');
  }
  const entries = Object.keys(env)
    .filter((key) => key.startsWith('EXPO_PUBLIC_') && env[key] !== undefined)
    .sort()
    .map((key) => {
      if (typeof env[key] !== 'string') {
        throw new TypeError('Public environment values must be strings.');
      }
      return [key, env[key]];
    });
  // JSON array framing prevents ambiguous concatenation of names and values.
  // Keep spaces: Expo inlines the exact value, including key-clearing overrides.
  return createHash('sha256').update(JSON.stringify(entries), 'utf8').digest('hex');
}

function publicEnvironmentCacheVersion(baseVersion, env) {
  if (typeof baseVersion !== 'string') {
    throw new TypeError('The default Metro cache version must be a string.');
  }
  return `${baseVersion}|expo-public-sha256:${hashPublicEnvironment(env)}`;
}

module.exports = { hashPublicEnvironment, publicEnvironmentCacheVersion };
