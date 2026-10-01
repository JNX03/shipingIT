# Integration contracts

For configuration, start with [backend setup](BACKEND-SETUP.md) and the placeholder `.env.example`. For actual preview checks, see [preview scope](PREVIEW-SCOPE.md).

| Boundary | Implementation | Required behavior |
| --- | --- | --- |
| Authentication | `src/services/auth.ts` and protected routes | Only a valid confirmed Supabase session unlocks gameplay. Sign-out preserves local work. |
| Ami advice | `src/services/ai.ts`, `mentor-offline.ts` | Live and authored advice have distinct labels. Missing configuration never becomes a fabricated live response. |
| Character interviews | Shared server handlers and scenario contracts | Fictional scenario responses stay within a validated contract; fallback remains explicit. |
| Purchases | `src/services/purchases.ts`, `access-policy.ts` | Current RevenueCat customer information and authenticated identity determine Pro access. |
| Opportunities | `src/services/opportunities.ts` | Validate service/cache data; a dated snapshot is not current registration proof. |
| Hosted backend | `supabase/functions/nextgen-api/index.ts` | Authenticate model calls; apply a PostgreSQL-backed shared attempt quota. |
| Optional browser tools | `src/hooks/use-webmcp.ts` | Feature-detect and respect sign-in; expose a limited state projection, not private transcripts or reward actions. |

UI response contracts live in `src/services/contracts.ts`. Loading, empty, unavailable and failure states must remain visible instead of inventing results.

## Client configuration

All `EXPO_PUBLIC_*` values are readable in the compiled app. Only public publishable/platform SDK keys belong there. The model provider credential belongs in the service environment.

Required fields are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The existing native redirect is `shipaton-nextgen://auth/callback`; provider-enable flags default false. Online feature endpoints and RevenueCat configuration are optional for authored practice after sign-in.

Reload/restart the development app after changing configuration; a distributed APK needs a newly embedded bundle/build. This project adds the effective public environment to Metro's cache fingerprint to prevent cross-profile bundle reuse. No secret value belongs in cache metadata or logs.

## RevenueCat access

The client fetches current offerings/packages and localized prices, purchases the selected fetched package, checks the configured active entitlement and supports restore. It handles cancellation, pending/error states and duplicate requests. A cached preference or an initiated transaction does not grant Pro.

Core lessons, games and basic summary copying stay free after sign-in. Pro adds helpers, eight bonus labs, unlimited shop Sparks and full Project Pack export/copying. Pro spending does not increase earned learning rank. Full export/copy requires a fresh active entitlement check. Cloud backup, unlimited projects and higher AI quota are not paid features.

Test Store belongs only in the debuggable `TestStoreQa` profile, with the explicit sandbox label and dedicated Test Store public SDK key. Release rejects Test Store selection/keys before SDK initialization. Expo Go's simulated purchase path is blocked. Web needs a separately configured RevenueCat Billing app; its restore flow refreshes the authenticated customer's status rather than using the native restore API.

Production billing requires actual platform products, signing, store/account setup, disclosures and separate native acceptance. Preview sandbox checks establish no real charge or production billing readiness.

## AI, quota and data

Model requests authenticate against Supabase, obtain explicit consent for transmitted context and validate the response. AI never controls grades, stage completion or Sparks. The hosted service enforces 20 combined attempted model calls per user per UTC day; the local Node service has an in-memory cap. Pro does not raise that quota.

StudyBuddy uses authored local practice with live AI off. CampusCompass uses authored routes without live GPS. Interview characters are fictional; their answers are learning scenarios, not real customer-research evidence.

Learning state, project notebooks and three prototype drafts persist separately on the device. They do not sync merely because the learner signs in. Reset waits for persistence queues and requires confirmation. Export important work before reset or uninstall.

References: [RevenueCat offerings](https://www.revenuecat.com/docs/getting-started/displaying-products), [restore](https://www.revenuecat.com/docs/getting-started/restoring-purchases), [React Native web integration](https://www.revenuecat.com/docs/getting-started/installation/reactnative) and [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).
