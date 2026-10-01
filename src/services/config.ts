/** Public configuration only. Values prefixed EXPO_PUBLIC are bundled into the app. */
function endpoint(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
    if (
      url.protocol !== 'https:' &&
      !(typeof __DEV__ !== 'undefined' && __DEV__ && local && url.protocol === 'http:')
    )
      return null;
    return url.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export const serviceConfig = {
  mentorUrl: endpoint(process.env.EXPO_PUBLIC_MENTOR_API_URL),
  interviewUrl: endpoint(process.env.EXPO_PUBLIC_INTERVIEW_API_URL),
  opportunityProxyUrl: endpoint(process.env.EXPO_PUBLIC_OPPORTUNITY_API_URL),
  supabaseUrl: endpoint(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null,
  authRedirectUrl:
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || 'shipaton-nextgen://auth/callback',
  googleSignInEnabled: process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED === 'true',
  appleSignInEnabled: process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED === 'true',
  revenueCatIOSKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() || null,
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || null,
  revenueCatWebKey: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY?.trim() || null,
  revenueCatTestKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY?.trim() || null,
  revenueCatUseTestStore: process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE === 'true',
  // The build script sets QA only for an artifact verified as natively debuggable.
  // JavaScript __DEV__ does not describe Android's debuggable flag.
  revenueCatBuildMode:
    process.env.EXPO_PUBLIC_REVENUECAT_BUILD_MODE === 'test-store-qa' ? 'test-store-qa' : 'release',
  builderEntitlement: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT?.trim() || 'builder',
  builderPurchasesEnabled: process.env.EXPO_PUBLIC_ENABLE_BUILDER_PURCHASES === 'true',
} as const;

export const DEKPORT_API_URL =
  'https://api.dekport.com/api/v1/events?event_type=competition&view=card&registration_open=true&sort_by=registration_end&sort_order=asc&limit=100';
