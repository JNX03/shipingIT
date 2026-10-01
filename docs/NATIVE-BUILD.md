# Native builds and the Android preview

The published preview and a new build from the public source are different artifacts. The existing preview combines reviewed JavaScript/assets with a compatible native payload retained from private development; see [preview scope](PREVIEW-SCOPE.md). A new full build needs its own verification.

## Existing Windows workflow

The repository includes `scripts/build-android.ps1`. It creates an Android preview using generated native files and an embedded bundle. It does not install an APK, operate an emulator or submit to a store.

Prerequisites:

- Node.js 22.14+, npm and installed project dependencies.
- JDK 17 or newer; pass `-JavaHome` if the script cannot detect it.
- Android SDK with platform 36, Build Tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1; pass `-AndroidSdk` for its location.
- A frozen runtime source checkpoint and configured ignored local environment.

From the repository root, after lint/typecheck pass and source changes are committed:

```powershell
$taskCommit = git rev-parse HEAD
./scripts/build-android.ps1 -Prebuild -Variant Release -SourceCommit $taskCommit
```

The default Release profile leaves billing unconfigured and rejects Test Store keys. An intentionally configured sandbox build uses:

```powershell
./scripts/build-android.ps1 -Prebuild -Variant TestStoreQa -SourceCommit $taskCommit
```

Run native builds sequentially. The script bounds Gradle/Kotlin/CMake/Metro concurrency and restores its process environment. Default architectures are `arm64-v8a,x86_64`; `-Architectures arm64-v8a` can target a physical phone build. Profile behavior is documented in [build profiles](SHIPINGIT-BUILD-PROFILES.md).

`-Prebuild` generates `android/` through Expo without cleaning it or manually changing package versions. Generated `android/` and `ios/` are ignored. Native configuration belongs in `app.json` and config plugins. The script rejects runtime source mismatches against `-SourceCommit` and checks that the source fingerprint is unchanged through the build.

## Artifact checks

Timestamped outputs stay in ignored `artifacts/build/`: an APK, SHA-256, build metadata and local verification logs. The script checks signature, application ID, native debuggability, embedded bundle and required native libraries. Metadata/logs can contain private local paths or configuration context; curate them before sharing.

Successful assembly is not runtime acceptance. Coordinate installation on a designated test device, check cold launch without Metro, sign-in, persistence and the actual changed flows. Billing needs provider-side sandbox evidence as well as app behavior. Do not replace an owner's installed build without agreement.

The application ID remains `com.dekport.shipaton.nextgen`, with callback scheme `shipaton-nextgen`. Android backups are disabled. Audio requests neither recording permission nor background recording.

## Signing and cloud builds

The local workflow uses the generated debug signing key, including preview Release mode. These APKs are suitable for development review, not Google Play distribution. Keep signing keys, passwords, service accounts and local environment files private.

This snapshot has no EAS project linking or `eas.json`. For a future cloud build, configure the owner's EAS project, signing and profiles following [EAS Build setup](https://docs.expo.dev/build/setup/); invoke EAS CLI as `npx eas-cli@latest`. The existing downloadable APK was not produced by EAS. iOS and store distribution require separate artifacts and acceptance.

Official framework references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/) and [config plugins](https://docs.expo.dev/config-plugins/introduction/).
