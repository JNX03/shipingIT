# Android preview billing profiles

These are **local development-preview profiles**, not production store profiles.

| Property | Release (default) | TestStoreQa |
| --- | --- | --- |
| Internal Android variant | `release` | `qaTestStore` |
| Native manifest debuggable | False | True |
| App build marker | `release` | `test-store-qa` |
| Test Store selection | False | True |
| Purchase-enable flag | False | True |
| Selected RevenueCat keys | All blank; billing unconfigured | Dedicated Test Store key only; platform keys blank |
| Bundle | Embedded | Embedded |
| Signing | Local debug preview certificate | Local debug preview certificate |

The app rejects Test Store selection and misplaced Test Store keys in Release mode before importing/configuring the SDK. Turning off a purchase button alone is insufficient: status, offerings, identify and restore can also initialize the SDK.

`plugins/with-test-store-qa.cjs` generates the native QA build type while retaining the application ID. Native `debuggable=true` is deliberate for Test Store compatibility; JavaScript `__DEV__` does not establish that manifest property. The embedded bundle is separate from native debuggability.

`scripts/build-android.ps1` selects each profile through process-only environment overrides and restores the original environment afterward. Metro's public-environment fingerprint and the build source fingerprint prevent a previous profile's bundle from being silently reused. The verifier checks the selected bundle and native manifest without printing keys.

See [native build instructions](NATIVE-BUILD.md) for commands and prerequisites. Run builds sequentially from a frozen source. Both profiles require runtime checks before being accepted, and neither establishes Google Play billing or production signing. The published hybrid preview has its own [scope and verification](PREVIEW-SCOPE.md).

Primary reference: [RevenueCat Test Store and release-build protection](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store#test-store-api-keys-in-release-builds).
