/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Renders the actual presentational module with installed React Native Web; no billing/account fixture is mounted.
const root = path.resolve(__dirname, '../../..');
const source = path.join(__dirname, 'pro-upgrade-details.tsx');
const built = esbuild.buildSync({
  entryPoints: [source],
  bundle: true,
  platform: 'node',
  write: false,
  format: 'cjs',
  jsx: 'automatic',
  packages: 'external',
  alias: { 'react-native': 'react-native-web', '@': path.join(root, 'src') },
  tsconfig: path.join(root, 'tsconfig.json'),
});
const compiled = new Module(source, module);
compiled.filename = source;
compiled.paths = Module._nodeModulePaths(__dirname);
compiled._compile(built.outputFiles[0].text, source);
const { ProUpgradeDetails, ProUpgradeActions } = compiled.exports;
const render = (props) => renderToStaticMarkup(React.createElement(ProUpgradeDetails, props));
const actions = (playing) =>
  renderToStaticMarkup(
    React.createElement(ProUpgradeActions, { playing, onContinue() {}, onSkip() {} }),
  );

test('confirmed copy presents real Pro tools and keeps paid spending separate from learning rank', () => {
  const html = render({ kind: 'purchase', sandbox: false });
  assert.match(html, /Your toolkit is now Pro/);
  assert.match(html, /Step-by-step lesson helpers/);
  assert.match(html, /Eight extra building labs/);
  assert.match(html, /Unlimited Sparks in the shop/);
  assert.match(html, /Core lessons stay free/);
  assert.match(html, /Buying Pro never raises your learning rank/);
  assert.doesNotMatch(html, /unlimited learning rewards|free trial|TEST ACCESS ONLY/);
});
test('restored sandbox access has an honest label and restore-specific wording', () => {
  const html = render({ kind: 'restore', sandbox: true });
  assert.match(html, /Your Pro tools are restored/);
  assert.match(html, /TEST STORE \/ SANDBOX/);
  assert.match(html, /TEST ACCESS ONLY/);
});
test('Continue and Skip render enabled before animation ends; steady/reduced state keeps an exit', () => {
  const moving = actions(true);
  assert.match(moving, /aria-label="Continue to learning"/);
  assert.match(moving, /aria-label="Skip upgrade animation"/);
  assert.doesNotMatch(moving, /aria-disabled="true"|disabled=""/);
  const steady = actions(false);
  assert.match(steady, /aria-label="Continue to learning"/);
  assert.match(steady, /aria-label="Back to membership details"/);
  assert.doesNotMatch(steady, /aria-disabled="true"|disabled=""/);
});
