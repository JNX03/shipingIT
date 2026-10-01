const test = require('node:test');
const assert = require('node:assert/strict');
const withTestStoreQa = require('./with-test-store-qa.cjs');
const { transformAppBuildGradle } = withTestStoreQa;

const beginMarker = '// @generated begin shipingit-test-store-qa';
const endMarker = '// @generated end shipingit-test-store-qa';
const source = [
  'apply plugin: "com.android.application"',
  'apply plugin: "com.facebook.react"',
  'react {',
  '    bundleCommand = "export:embed"',
  '    // debuggableVariants = ["debug", "debugOptimized"]',
  '}',
  'android {',
  '    namespace "com.dekport.shipaton.nextgen"',
  '    defaultConfig { applicationId "com.dekport.shipaton.nextgen" }',
  '    signingConfigs { debug { storeFile file("debug.keystore") } }',
  '    buildTypes {',
  '        debug { signingConfig signingConfigs.debug }',
  '        release {',
  '            debuggable false',
  '            minifyEnabled true',
  '            shrinkResources true',
  '            signingConfig signingConfigs.debug',
  '        }',
  '    }',
  '}',
  '',
].join('\n');

test('plugin registers an appBuildGradle mod without generating native files', () => {
  const config = withTestStoreQa({ name: 'ShipingIT', slug: 'shipingit' });
  assert.equal(typeof config.mods.android.appBuildGradle, 'function');
  assert.equal(config.mods.android.mainApplication, undefined);
  assert.equal(config.mods.android.manifest, undefined);
});

for (const newline of ['\n', '\r\n']) {
  test(`preserves original source and is idempotent with ${JSON.stringify(newline)} line endings`, () => {
    const original = source.replaceAll('\n', newline);
    const first = transformAppBuildGradle(original, 'groovy');
    assert.equal(first.slice(0, original.length), original);
    assert.equal(transformAppBuildGradle(first, 'groovy'), first);
    assert.equal(first.split(beginMarker).length - 1, 1);
    assert.equal(first.split(endMarker).length - 1, 1);
    if (newline === '\r\n') assert.doesNotMatch(first, /(?<!\r)\n/);
  });
}

test('handles a source file without a trailing newline without changing existing bytes', () => {
  const original = source.trimEnd();
  const result = transformAppBuildGradle(original, 'groovy');
  assert.ok(result.startsWith(original + '\n\n' + beginMarker));
  assert.equal(transformAppBuildGradle(result, 'groovy'), result);
});

test('refreshes only the owned block and preserves source before and after it', () => {
  const suffix =
    '\n// Owner customization after the generated block\nandroid { lint { abortOnError true } }\n';
  const original = `${source}\n${beginMarker}\n// previous plugin version\n${endMarker}${suffix}`;
  const result = transformAppBuildGradle(original, 'groovy');
  assert.ok(result.startsWith(source + '\n' + beginMarker));
  assert.ok(result.endsWith(endMarker + suffix));
  assert.doesNotMatch(result, /previous plugin version/);
  assert.equal(transformAppBuildGradle(result, 'groovy'), result);
});

test('creates a genuinely debuggable bundled QA variant without altering release or application identity', () => {
  const result = transformAppBuildGradle(source, 'groovy');
  assert.equal(result.slice(0, source.length), source);
  const generated = result.slice(result.indexOf(beginMarker));
  assert.match(generated, /qaTestStore\s*\{/);
  assert.match(generated, /initWith\(android\.buildTypes\.getByName\("release"\)\)/);
  assert.match(generated, /^\s+debuggable true$/m);
  assert.match(generated, /^\s+matchingFallbacks = \["release"\]$/m);
  assert.match(generated, /signingConfig android\.signingConfigs\.getByName\("debug"\)/);
  assert.match(generated, /^\s+minifyEnabled false$/m);
  assert.match(generated, /^\s+shrinkResources false$/m);
  assert.match(generated, /manifestPlaceholders\["usesCleartextTraffic"\] = "false"/);
  assert.doesNotMatch(generated, /applicationId|applicationIdSuffix|forceAllowTestStore/);
  assert.doesNotMatch(generated, /^\s*(?:release|debug|react)\s*\{/m);
  assert.doesNotMatch(generated, /^\s*debuggableVariants\s*(?:=|\.)/m);
});

test('rejects malformed, duplicated, reversed, or non-standalone ownership markers', () => {
  const cases = [
    `${beginMarker}\n// missing end`,
    `${endMarker}\n// missing begin`,
    `${endMarker}\n${beginMarker}`,
    `${beginMarker}\n${beginMarker}\n${endMarker}`,
    `${beginMarker}\n${endMarker}\n${endMarker}`,
    `${beginMarker}\n${endMarker}\n${beginMarker}\n${endMarker}`,
    `android { ${beginMarker}\n${endMarker}`,
    `  ${beginMarker}\n${endMarker}`,
    `${beginMarker} unexpected\n${endMarker}`,
    `${beginMarker}\n${endMarker}-extra`,
  ];
  for (const fragment of cases) {
    assert.throws(
      () => transformAppBuildGradle(source + fragment, 'groovy'),
      /Malformed or duplicate/,
    );
  }
});

test('rejects unmanaged variant declarations and Metro-only configuration conflicts', () => {
  for (const extra of [
    '\nandroid { buildTypes { testStoreQa { debuggable false } } }',
    '\nandroid { buildTypes { qaTestStore { debuggable false } } }',
    '\nreact { debuggableVariants = ["qaTestStore"] }',
  ]) {
    assert.throws(
      () => transformAppBuildGradle(source + extra, 'groovy'),
      /unmanaged Test Store QA/,
    );
    const withOwnedBlock = transformAppBuildGradle(source, 'groovy') + extra;
    assert.throws(
      () => transformAppBuildGradle(withOwnedBlock, 'groovy'),
      /unmanaged Test Store QA/,
    );
  }
});

test('generated build type avoids Android Gradle reserved test prefix', () => {
  const generated = transformAppBuildGradle(source, 'groovy').split(beginMarker)[1];
  const name = generated.match(/^ {8}(\w+)\s*\{/m)?.[1];
  assert.ok(name, 'A named QA build type must be generated.');
  assert.equal(name.startsWith('test'), false, 'AGP rejects build type names starting with test.');
});

test('QA native CMake configuration matches release RN libraries while the app remains debuggable', () => {
  const generated = transformAppBuildGradle(source, 'groovy').split(beginMarker)[1];
  assert.match(generated, /cmake\s*\{\s*arguments "-DCMAKE_BUILD_TYPE=RelWithDebInfo"\s*\}/);
  assert.match(generated, /matchingFallbacks = \["release"\]/);
  assert.match(generated, /^\s+debuggable true$/m);
  assert.doesNotMatch(generated, /cppFlags|REACT_NATIVE_PRODUCTION|forceAllowTestStore/);
});

test('rejects unsupported languages and malformed inputs without guessing a native format', () => {
  for (const language of ['kotlin', 'kts', 'java', '', undefined, null]) {
    assert.throws(() => transformAppBuildGradle(source, language), /requires a Groovy/);
  }
  for (const contents of [null, undefined, {}, []]) {
    assert.throws(() => transformAppBuildGradle(contents, 'groovy'), /requires Gradle source text/);
  }
  assert.throws(
    () => transformAppBuildGradle('plugins {}\n', 'groovy'),
    /No Android configuration/,
  );
});
