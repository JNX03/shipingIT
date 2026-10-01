[CmdletBinding()]
param(
  [string]$AndroidSdk = '',
  [string]$JavaHome = '',
  [ValidateSet('Release', 'TestStoreQa')][string]$Variant = 'Release',
  [ValidatePattern('^(|[0-9a-fA-F]{7,40})$')][string]$SourceCommit = '',
  [ValidateSet('arm64-v8a', 'x86_64', 'arm64-v8a,x86_64')]
  [string]$Architectures = 'arm64-v8a,x86_64',
  [ValidateRange(1, 4)][int]$MaxWorkers = 1,
  [ValidateRange(1024, 4096)][int]$HeapMb = 1536,
  [ValidateRange(512, 2048)][int]$MetaspaceMb = 1024,
  [switch]$Prebuild
)

$ErrorActionPreference = 'Stop'
$buildRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$nativeRoot = Join-Path $buildRoot 'android'
$artifactRoot = Join-Path $buildRoot 'artifacts\build'
$isTestStoreQa = $Variant -eq 'TestStoreQa'
$Variant = if ($isTestStoreQa) { 'TestStoreQa' } else { 'Release' }
$nativeVariant = if ($isTestStoreQa) { 'qaTestStore' } else { 'release' }
$assembleTask = if ($isTestStoreQa) { ':app:assembleQaTestStore' } else { ':app:assembleRelease' }
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
if (Test-Path -LiteralPath (Join-Path $buildRoot 'src\app\editor-preview.tsx')) {
  throw 'Temporary editor-preview QA route is present. Its owner must remove it before the source freeze and APK build.'
}

function Find-JavaHome {
  param([string]$Requested)
  $candidates = @($Requested, 'C:\Program Files\Eclipse Adoptium\jdk-17.0.14.7-hotspot', 'C:\Program Files\Android\Android Studio\jbr', $env:JAVA_HOME)
  foreach ($candidate in $candidates) {
    if (-not $candidate -or -not (Test-Path -LiteralPath (Join-Path $candidate 'bin\java.exe'))) { continue }
    $release = Join-Path $candidate 'release'
    if ((Test-Path -LiteralPath $release) -and (Get-Content -LiteralPath $release -Raw) -match 'JAVA_VERSION="(\d+)') {
      if ([int]$Matches[1] -ge 17) { return [IO.Path]::GetFullPath($candidate) }
    }
  }
  throw 'JDK 17 or newer is required. Pass -JavaHome with a local JDK path.'
}

function Restore-BuildEnvironment {
  param([System.Collections.IDictionary]$Values)
  foreach ($name in $Values.Keys) {
    if ($null -eq $Values[$name]) {
      # PowerShell can coerce a null method argument to an empty string. Remove
      # originally absent variables so later dotenv loads are not shadowed.
      Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
    } else {
      [Environment]::SetEnvironmentVariable($name, $Values[$name], 'Process')
    }
  }
}

function Assert-NoOriginalProcessBillingKeys {
  param([byte[]]$BundleBytes, [bool]$TestStoreQa, [System.Collections.IDictionary]$OriginalEnvironment)
  $names = @('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY', 'EXPO_PUBLIC_REVENUECAT_IOS_KEY', 'EXPO_PUBLIC_REVENUECAT_WEB_KEY')
  if (-not $TestStoreQa) { $names += 'EXPO_PUBLIC_REVENUECAT_TEST_KEY' }
  $utf8 = [Text.Encoding]::UTF8.GetString($BundleBytes)
  $utf16 = [Text.Encoding]::Unicode.GetString($BundleBytes)
  foreach ($name in $names) {
    $candidate = $OriginalEnvironment[$name]
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $candidate = $candidate.Trim()
    if ($utf8.Contains($candidate, [StringComparison]::Ordinal) -or $utf16.Contains($candidate, [StringComparison]::Ordinal)) {
      throw 'The embedded bundle contains a forbidden billing key from the original process environment.'
    }
  }
}

function Get-RuntimeSourceDigest {
  $files = @(Get-ChildItem -LiteralPath (Join-Path $buildRoot 'src'), (Join-Path $buildRoot 'assets') -File -Recurse)
  if (Test-Path -LiteralPath (Join-Path $buildRoot 'plugins')) { $files += @(Get-ChildItem -LiteralPath (Join-Path $buildRoot 'plugins') -File -Recurse) }
  foreach ($relative in @('app.json', 'app.config.js', 'app.config.ts', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', 'metro.config.js', 'metro.config.cjs', 'babel.config.js', 'babel.config.cjs', 'tsconfig.json', 'scripts\patch-dependencies.cjs', 'scripts\build-android.ps1', 'scripts\gradle-low-memory.init.gradle', 'scripts\android-build-profile.cjs', 'scripts\android-build-profile.test.cjs', 'scripts\metro-public-env-cache.cjs', 'scripts\metro-public-env-cache.test.cjs')) {
    $candidate = Join-Path $buildRoot $relative
    if (Test-Path -LiteralPath $candidate) { $files += Get-Item -LiteralPath $candidate }
  }
  # Expo inlines EXPO_PUBLIC values into the bundle. Hash local files and process
  # overrides without printing their values or saving them in artifact metadata.
  $files += @(Get-ChildItem -LiteralPath $buildRoot -File -Force -Filter '.env*')
  $lines = @($files | Sort-Object FullName | ForEach-Object {
    $relative = [IO.Path]::GetRelativePath($buildRoot, $_.FullName).Replace('\', '/')
    "$relative $((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
  })
  $lines += @(Get-ChildItem Env: | Where-Object { $_.Name -like 'EXPO_PUBLIC_*' -or $_.Name -in @('EXPO_NO_DOTENV', 'EXPO_NO_CLIENT_ENV_VARS') } | Sort-Object Name | ForEach-Object {
    $valueBytes = [Text.Encoding]::UTF8.GetBytes($_.Value)
    "env:$($_.Name) $([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($valueBytes)))"
  })
  $bytes = [Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
  return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

if (-not $AndroidSdk) {
  foreach ($candidate in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, 'C:\Android\android-sdk', (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))) {
    if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate 'platform-tools'))) { $AndroidSdk = $candidate; break }
  }
}
if (-not $AndroidSdk -or -not (Test-Path -LiteralPath $AndroidSdk)) { throw 'Android SDK missing. Pass -AndroidSdk.' }
$JavaHome = Find-JavaHome $JavaHome

$profileHelper = Join-Path $PSScriptRoot 'android-build-profile.cjs'
$billingOverridesJson = & node $profileHelper overrides $Variant
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the requested billing build profile.' }
$billingOverrides = ($billingOverridesJson -join "`n") | ConvertFrom-Json -AsHashtable
$savedEnvironment = @{}
foreach ($name in (@('JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'CI', 'NODE_ENV', 'CMAKE_BUILD_PARALLEL_LEVEL') + @($billingOverrides.Keys))) {
  $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

Push-Location $buildRoot
try {
  $env:JAVA_HOME = $JavaHome
  $env:ANDROID_HOME = [IO.Path]::GetFullPath($AndroidSdk)
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  $env:CI = '1'
  $env:NODE_ENV = 'production'
  $env:CMAKE_BUILD_PARALLEL_LEVEL = '1'
  foreach ($name in $billingOverrides.Keys) { [Environment]::SetEnvironmentVariable($name, $billingOverrides[$name], 'Process') }
  Write-Output "Building $Variant with an explicit process-only billing profile; shared .env files are unchanged."

  $runtimeSourceDigest = Get-RuntimeSourceDigest
  $publicEnvironmentJson = & node $profileHelper inspect $Variant
  if ($LASTEXITCODE -ne 0) { throw 'Incompatible billing configuration for the requested Android variant.' }
  $publicEnvironment = ($publicEnvironmentJson -join "`n") | ConvertFrom-Json
  Write-Output ('Public build configuration presence (no values): ' + ($publicEnvironment | ConvertTo-Json -Compress))

  if ($Prebuild -or -not (Test-Path -LiteralPath (Join-Path $nativeRoot 'gradlew.bat'))) {
    # Run prebuild only with source changes frozen. Restore exact package bytes:
    # Expo's generated run-script changes must not alter the reviewed source tree.
    $packagePath = Join-Path $buildRoot 'package.json'
    $beforePackageBytes = [IO.File]::ReadAllBytes($packagePath)
    try {
      & npx.cmd expo prebuild --platform android --no-install --no-clean --skip-dependency-update 'react-native,react'
      $prebuildExit = $LASTEXITCODE
    } finally { [IO.File]::WriteAllBytes($packagePath, $beforePackageBytes) }
    if ($prebuildExit -ne 0) { throw "Expo prebuild failed with exit code $prebuildExit." }
  }
  if ((Get-RuntimeSourceDigest) -ne $runtimeSourceDigest) { throw 'Runtime source or build configuration changed during prebuild; freeze and rerun before building.' }
  if ($isTestStoreQa -and ([IO.File]::ReadAllText((Join-Path $nativeRoot 'app\build.gradle'))) -notmatch '\bqaTestStore\s*\{') {
    throw 'Generated Test Store QA variant is missing. Run this build with -Prebuild.'
  }

  $appConfig = Get-Content -LiteralPath (Join-Path $buildRoot 'app.json') -Raw | ConvertFrom-Json
  $version = $appConfig.expo.version
  $timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
  $artifactProfile = if ($isTestStoreQa) { 'test-store-qa-debuggable' } else { 'release-billing-disabled-preview' }
  $name = "shipingit-$version-$artifactProfile-$timestamp"
  $logPath = Join-Path $artifactRoot "$name.log"
  $gitCommit = (& git rev-parse HEAD).Trim()
  $gitChanges = @(& git status --porcelain)
  $runtimeCommit = $null
  if ($SourceCommit) {
    $runtimeCommit = (& git rev-parse --verify "$SourceCommit^{commit}").Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Requested source commit does not exist.' }
    $runtimePaths = @('src', 'assets', 'plugins', 'app.json', 'app.config.js', 'app.config.ts', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', 'metro.config.js', 'metro.config.cjs', 'babel.config.js', 'babel.config.cjs', 'tsconfig.json', 'scripts/patch-dependencies.cjs', 'scripts/build-android.ps1', 'scripts/gradle-low-memory.init.gradle', 'scripts/android-build-profile.cjs', 'scripts/android-build-profile.test.cjs', 'scripts/metro-public-env-cache.cjs', 'scripts/metro-public-env-cache.test.cjs')
    $runtimeDiff = @(& git diff --name-only $runtimeCommit -- @runtimePaths)
    $untrackedRuntime = @(& git ls-files --others --exclude-standard -- @runtimePaths)
    if ($runtimeDiff.Count -gt 0 -or $untrackedRuntime.Count -gt 0) { throw "Runtime files differ from $runtimeCommit; review and freeze a new commit." }
  }

  Push-Location $nativeRoot
  try {
    $gradleArguments = @(
      $assembleTask, '--no-daemon', '--console=plain', "--max-workers=$MaxWorkers",
      "-Dorg.gradle.jvmargs=-Xmx${HeapMb}m -XX:MaxMetaspaceSize=${MetaspaceMb}m",
      '-Dorg.gradle.parallel=false', '-Pkotlin.compiler.execution.strategy=in-process',
      "-PreactNativeArchitectures=$Architectures", "-PshipingitRuntimeSourceSha256=$runtimeSourceDigest", '-I', (Join-Path $PSScriptRoot 'gradle-low-memory.init.gradle')
    )
    & .\gradlew.bat @gradleArguments 2>&1 | Tee-Object -FilePath $logPath
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed. See $logPath" }
  } finally { Pop-Location }

  $outputDirectory = Join-Path $nativeRoot "app\build\outputs\apk\$nativeVariant"
  $outputMetadata = Get-Content -LiteralPath (Join-Path $outputDirectory 'output-metadata.json') -Raw | ConvertFrom-Json
  if (@($outputMetadata.elements).Count -ne 1 -or $outputMetadata.variantName -ne $nativeVariant) { throw 'Expected one universal APK for the requested variant.' }
  $apkSource = [IO.Path]::GetFullPath((Join-Path $outputDirectory $outputMetadata.elements[0].outputFile))
  if (-not $apkSource.StartsWith([IO.Path]::GetFullPath($outputDirectory) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'APK output escaped its variant directory.' }
  if (-not (Test-Path -LiteralPath $apkSource)) { throw 'Gradle exited without the requested APK.' }
  if ((Get-RuntimeSourceDigest) -ne $runtimeSourceDigest) { throw 'Runtime source changed during the build; freeze and rebuild before publishing this APK.' }
  $apkPath = Join-Path $artifactRoot "$name.apk"
  Copy-Item -LiteralPath $apkSource -Destination $apkPath
  $hash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText("$apkPath.sha256", "$hash  $name.apk`n", [Text.UTF8Encoding]::new($false))

  $buildTools = Get-ChildItem -LiteralPath (Join-Path $AndroidSdk 'build-tools') -Directory |
    Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
  $signer = Join-Path $buildTools.FullName 'apksigner.bat'
  $aapt = Join-Path $buildTools.FullName 'aapt.exe'
  $signingOutput = & $signer verify --verbose --print-certs $apkPath 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  $signingOutput | Set-Content -LiteralPath (Join-Path $artifactRoot "$name-signature.txt") -Encoding utf8
  $badgingOutput = & $aapt dump badging $apkPath 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'APK manifest inspection failed.' }
  $badgingOutput | Set-Content -LiteralPath (Join-Path $artifactRoot "$name-manifest.txt") -Encoding utf8
  $packageLine = $badgingOutput | Where-Object { $_ -match '^package: ' } | Select-Object -First 1
  $packageMatch = [regex]::Match($packageLine, "^package: name='(?<id>[^']+)' versionCode='(?<code>[^']+)' versionName='(?<version>[^']*)'")
  if (-not $packageMatch.Success -or $packageMatch.Groups['id'].Value -ne $appConfig.expo.android.package) { throw 'Unexpected APK application id.' }
  if ($packageMatch.Groups['version'].Value -ne $version) { throw 'APK version differs from the app config; regenerate native config.' }
  $labelMatch = [regex]::Match(($badgingOutput -join "`n"), "(?m)^application-label:'(?<label>[^']*)'")
  if (-not $labelMatch.Success -or $labelMatch.Groups['label'].Value -ne $appConfig.expo.name) { throw 'APK display name differs from the app config; regenerate native config.' }
  $manifestDebuggable = ($badgingOutput -join "`n") -match 'application-debuggable'
  if ($manifestDebuggable -ne $isTestStoreQa) { throw 'APK debuggable flag does not match its verified billing build profile.' }
  foreach ($blockedPermission in $appConfig.expo.android.blockedPermissions) {
    if (($badgingOutput -join "`n") -match ("uses-permission[^\r\n]*'" + [regex]::Escape($blockedPermission) + "'")) {
      throw "Blocked permission present in final APK: $blockedPermission"
    }
  }
  $manifestTree = & $aapt dump xmltree $apkPath AndroidManifest.xml 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Compiled manifest inspection failed.' }
  $manifestTree | Set-Content -LiteralPath (Join-Path $artifactRoot "$name-manifest-tree.txt") -Encoding utf8
  if ($appConfig.expo.android.allowBackup -eq $false -and ($manifestTree -join "`n") -notmatch 'android:allowBackup[^\r\n]*\)0x0') {
    throw 'Compiled manifest does not confirm allowBackup=false.'
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead($apkPath)
  try {
    $bundle = $archive.GetEntry('assets/index.android.bundle')
    if (-not $bundle -or $bundle.Length -le 0) { throw 'APK has no embedded production JavaScript bundle.' }
    $nativeLibraries = @($archive.Entries | Where-Object { $_.FullName -match '^lib/.+/(libhermesvm|libreactnative)\.so$' } | ForEach-Object FullName)
    foreach ($architecture in $Architectures.Split(',')) {
      foreach ($library in @('libhermesvm.so', 'libreactnative.so')) {
        if (-not $archive.GetEntry("lib/$architecture/$library")) { throw "APK is missing $library for requested ABI $architecture." }
      }
    }
    $bundleBytes = $bundle.Length
    $bundleStream = $bundle.Open()
    try { $bundleHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bundleStream)).ToLowerInvariant() }
    finally { $bundleStream.Dispose() }
  } finally { $archive.Dispose() }

  $generatedBundle = Join-Path $nativeRoot "app\build\generated\assets\react\$nativeVariant\index.android.bundle"
  if ((Get-FileHash -LiteralPath $generatedBundle -Algorithm SHA256).Hash.ToLowerInvariant() -ne $bundleHash) { throw 'Generated bundle differs from the actual APK bundle.' }
  $bundleBillingJson = & node $profileHelper verify-bundle $Variant $generatedBundle
  if ($LASTEXITCODE -ne 0) { throw 'Embedded APK bundle does not match the required billing profile.' }
  $bundleBilling = ($bundleBillingJson -join "`n") | ConvertFrom-Json
  Assert-NoOriginalProcessBillingKeys -BundleBytes ([IO.File]::ReadAllBytes($generatedBundle)) -TestStoreQa $isTestStoreQa -OriginalEnvironment $savedEnvironment
  $bundleBilling | Add-Member -NotePropertyName originalProcessBillingKeysAbsent -NotePropertyValue $true

  $metadata = [ordered]@{
    artifact = $apkPath; sha256 = $hash; bytes = (Get-Item -LiteralPath $apkPath).Length
    builtAtUtc = (Get-Date).ToUniversalTime().ToString('o'); variant = $nativeVariant; androidDebuggable = $manifestDebuggable; billingBuildMode = $publicEnvironment.revenueCatBuildMode; signing = 'Expo template debug key: preview only, not store ready'
    applicationId = $packageMatch.Groups['id'].Value; applicationName = $labelMatch.Groups['label'].Value; version = $packageMatch.Groups['version'].Value; versionCode = [int]$packageMatch.Groups['code'].Value; architectures = $Architectures.Split(',')
    blockedPermissionsVerified = $appConfig.expo.android.blockedPermissions; androidAllowBackup = $appConfig.expo.android.allowBackup
    embeddedJavaScriptBytes = $bundleBytes; embeddedJavaScriptSha256 = $bundleHash; bundleBillingVerification = $bundleBilling; nativeLibraries = $nativeLibraries
    gitCommit = $gitCommit; runtimeSourceCommit = $runtimeCommit; sourceBasis = 'Frozen working tree plus local environment'; workingTreeAtBuild = $gitChanges; runtimeSourceSha256 = $runtimeSourceDigest; environmentIncludedInDigest = $true; publicEnvironment = $publicEnvironment; javaHome = $JavaHome; androidSdk = $AndroidSdk
    gradleWorkers = $MaxWorkers; metroWorkers = 1; gradleHeapMb = $HeapMb; gradleMetaspaceMb = $MetaspaceMb; kotlinCompiler = 'in-process'; cloudBuildUsed = $false
    runtimeTest = 'Not established by this script; install and inspect separately on a test device.'
  }
  $metadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $artifactRoot "$name.json") -Encoding utf8
  $metadata | ConvertTo-Json -Depth 8
} finally {
  Pop-Location
  Restore-BuildEnvironment $savedEnvironment
}
