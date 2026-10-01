const { getDefaultConfig } = require('expo/metro-config');
const { loadProjectEnv } = require('@expo/env');
const { publicEnvironmentCacheVersion } = require('./scripts/metro-public-env-cache.cjs');

// Also support direct config imports. This is idempotent and preserves process
// overrides, including the spaces that clear billing keys for Release builds.
loadProjectEnv(__dirname, { silent: true });
const config = getDefaultConfig(__dirname);

// Include effective public values so cached production transforms cannot cross
// Release/Test Store QA profiles, even when CI suppresses Metro's cache reset.
config.cacheVersion = publicEnvironmentCacheVersion(config.cacheVersion, process.env);

module.exports = config;
