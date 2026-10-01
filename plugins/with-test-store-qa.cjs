const { withAppBuildGradle } = require('expo/config-plugins');

const markerName = 'shipingit-test-store-qa';
const beginMarker = `// @generated begin ${markerName}`;
const endMarker = `// @generated end ${markerName}`;

function qaBuildType(newline) {
  return [
    beginMarker,
    '// Android-debuggable QA with release libraries and an embedded JavaScript bundle.',
    '// Keep qaTestStore out of React debuggableVariants, which would skip bundling.',
    'android {',
    '    buildTypes {',
    '        qaTestStore {',
    '            initWith(android.buildTypes.getByName("release"))',
    '            debuggable true',
    '            matchingFallbacks = ["release"]',
    '            externalNativeBuild {',
    '                cmake { arguments "-DCMAKE_BUILD_TYPE=RelWithDebInfo" }',
    '            }',
    '            signingConfig android.signingConfigs.getByName("debug")',
    '            minifyEnabled false',
    '            shrinkResources false',
    '            manifestPlaceholders["usesCleartextTraffic"] = "false"',
    '        }',
    '    }',
    '}',
    endMarker,
  ].join(newline);
}

/** Pure CNG transform: only our complete, uniquely marked block may be replaced. */
function transformAppBuildGradle(contents, language) {
  if (language !== 'groovy') {
    throw new Error('ShipingIT Test Store QA requires a Groovy app/build.gradle.');
  }
  if (typeof contents !== 'string') {
    throw new TypeError('ShipingIT Test Store QA requires Gradle source text.');
  }
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  const markers = [...contents.matchAll(/^.*@generated.*shipingit-test-store-qa.*$/gm)];
  let before = contents;
  let after = '';
  if (markers.length > 0) {
    if (
      markers.length !== 2 ||
      markers[0][0].replace(/\r$/, '') !== beginMarker ||
      markers[1][0].replace(/\r$/, '') !== endMarker
    ) {
      throw new Error(
        'Malformed or duplicate ShipingIT Test Store QA markers; refusing to rewrite Gradle.',
      );
    }
    before = contents.slice(0, markers[0].index);
    const lastMarker = markers[1];
    after = contents.slice(lastMarker.index + lastMarker[0].replace(/\r$/, '').length);
  }
  const outsideBlock = before + after;
  if (/\b(?:qaTestStore|testStoreQa)\b/.test(outsideBlock)) {
    throw new Error(
      'An unmanaged Test Store QA reference already exists; refusing to create a competing variant.',
    );
  }
  if (!/\bandroid\s*\{/.test(outsideBlock)) {
    throw new Error('No Android configuration block found; refusing to append a QA variant.');
  }
  const generated = qaBuildType(newline);
  if (markers.length > 0) return before + generated + after;
  const separator = contents.endsWith('\n') ? newline : newline + newline;
  return contents + separator + generated + newline;
}

function withTestStoreQa(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = transformAppBuildGradle(
      mod.modResults.contents,
      mod.modResults.language,
    );
    return mod;
  });
}

module.exports = withTestStoreQa;
module.exports.transformAppBuildGradle = transformAppBuildGradle;
