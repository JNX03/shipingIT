# Configure your own backend

The application source contains no configured credentials. A fresh clone needs a Supabase project for sign-in; AI and billing are optional. The downloadable preview uses separately configured services and is described in [preview scope](PREVIEW-SCOPE.md).

## Required authentication

1. Create or select your own Supabase project. Put its URL and **publishable** client key in the corresponding `EXPO_PUBLIC_SUPABASE_*` fields of the ignored root `.env.local`.
2. Configure email authentication and confirmation delivery. Supabase's development mail service has limits; use a configured SMTP provider for broader signup. Never disable confirmation merely to make a test pass.
3. Allow the native callback `shipaton-nextgen://auth/callback` and the exact web origin's `/auth/callback` and recovery callbacks in Supabase Auth settings.
4. Keep Google/Apple app flags false until the matching provider, client IDs and callbacks are configured in that project.
5. Start the app and sign in with a confirmed account. Missing configuration or an expired session keeps learning/project routes locked. Authored practice needs no AI credential after sign-in.

Do not put a Supabase secret or service-role key in a client variable. Learning progress and project drafts remain local; Supabase sign-in does not create a cloud backup.

## Optional local Node service

The shared handler is in `src/server/handler.mjs`; the Node entry is `src/server/index.mjs`. Create an ignored `.env.server.local` with the server-only fields from `.env.example`:

- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for token validation against your project.
- `OPENROUTER_API_KEY` for your server-only inference credential.
- `OPENROUTER_MODEL` for a reviewed free model that supports the adapter's response contract.
- `ALLOWED_ORIGINS` for the exact comma-separated browser origins you use.
- Optional `HOST`, `PORT` and `MENTOR_DAILY_LIMIT`; defaults are loopback port 8787 and 20 daily attempts.

```powershell
node --env-file=.env.server.local src/server/index.mjs
```

Set app endpoint fields to the service's `/api/mentor`, `/api/interview` and `/api/opportunities` routes. Local development permits only the recognized loopback/emulator addresses; deployed endpoints need HTTPS. The Node quota is in memory and is not shared across workers or retained through a restart.

## Optional Supabase Edge Function

The Edge entry at `supabase/functions/nextgen-api/index.ts` imports the shared server adapter. Deploy it to your own project with the included configuration, and apply the migration in `supabase/migrations/20260929000100_mentor_daily_quota.sql` using your normal reviewed migration workflow.

Keep `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in the function's server secret store. Supply `NEXTGEN_SUPABASE_PUBLISHABLE_KEY` and exact `ALLOWED_ORIGINS` there as well. The runtime supplies the project URL. The private PostgreSQL quota enforces **20 combined attempted mentor/interview requests per authenticated user per UTC day**; failed upstream requests consume a slot, and database failure prevents inference. It does not store prompt, project or answer text.

`verify_jwt=false` in the gateway configuration permits public health/feed and modern Supabase JWT handling. The model routes still authenticate the user inside the handler before quota or inference. Test public health, unauthenticated rejection, authenticated replies and quota limits after deployment.

The hosted base is `https://YOUR_PROJECT_REF.supabase.co/functions/v1/nextgen-api`. Append `/api/mentor`, `/api/interview` or `/api/opportunities` for the app fields. Do not embed the model credential in any app endpoint or `EXPO_PUBLIC_*` field.

## Free-model behavior

The OpenRouter adapter checks the current model catalog and pricing before generation, accepts only reviewed free-model response contracts and rejects changed pricing or invalid output. It does not silently fall back to paid models. Free-model availability can change. Missing configuration or a rejected request must remain an unavailable state or disclosed authored fallback, not a claim of live AI.

## Optional RevenueCat

Configure your own app, products, current offering and active entitlement. `.env.example` uses `shipingit_pro`; match that value to your dashboard. Platform SDK keys are public client configuration. RevenueCat secret API keys stay on the server and are not needed in this mobile client.

Keep purchases off for an ordinary clone. Test Store uses only the verified debuggable `TestStoreQa` profile; the default Release profile keeps billing unconfigured. A purchase-start event never grants Pro: the app checks the current authenticated identity and active entitlement. See [integration contracts](INTEGRATIONS.md) and [build profiles](SHIPINGIT-BUILD-PROFILES.md).

## Checks and references

```powershell
npm run lint
npm run typecheck
npm test
```

Official setup references: [Supabase Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Edge Function deployment](https://supabase.com/docs/guides/functions/deploy), [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [RevenueCat Expo integration](https://www.revenuecat.com/docs/getting-started/installation/expo) and [Expo environment variables](https://docs.expo.dev/guides/environment-variables/).
