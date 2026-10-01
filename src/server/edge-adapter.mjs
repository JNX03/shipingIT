import { createHandler } from './handler.mjs';
import { createSupabaseQuota } from './supabase-quota.mjs';

/** Keep the HTTP contract independent of Supabase's /functions/v1 route prefix. */
export function createSupabaseEdgeHandler({ env, fetchImpl = fetch, now = Date.now }) {
  const serviceEnv = {
    ...env,
    SUPABASE_PUBLISHABLE_KEY:
      env.NEXTGEN_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      '',
  };
  const handle = createHandler({
    env: serviceEnv,
    fetchImpl,
    now,
    consumeMentorQuota: createSupabaseQuota({ env: serviceEnv, fetchImpl }),
  });
  return async function edgeRequest(request) {
    const url = new URL(request.url);
    // The same entry point handles hosted routes and `supabase functions serve` routes.
    const prefix = '/functions/v1/nextgen-api';
    if (url.pathname === prefix) url.pathname = '/';
    else if (url.pathname.startsWith(`${prefix}/`))
      url.pathname = url.pathname.slice(prefix.length);
    else if (url.pathname === '/nextgen-api') url.pathname = '/';
    else if (url.pathname.startsWith('/nextgen-api/'))
      url.pathname = url.pathname.slice('/nextgen-api'.length);
    const forwarded = new Request(url, request);
    // Supabase's gateway sets this header. Per-user model quotas remain database-authoritative.
    const clientAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'gateway';
    return handle(forwarded, clientAddress);
  };
}
