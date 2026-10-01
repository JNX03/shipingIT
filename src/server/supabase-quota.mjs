/** Durable quota requests use the already-verified user's JWT, never a client-selected user ID. */
export function createSupabaseQuota({ env, fetchImpl = fetch }) {
  return async function consumeMentorQuota({ authorization }) {
    if (!/^https:\/\//.test(env.SUPABASE_URL || '') || !env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Durable quota is not configured.');
    }
    const response = await fetchImpl(
      `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/consume_mentor_quota`,
      {
        method: 'POST',
        headers: {
          Authorization: authorization,
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: '{}',
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error('Durable quota is unavailable.');
    const allowed = await response.json();
    if (typeof allowed !== 'boolean') throw new Error('Durable quota response is invalid.');
    return allowed;
  };
}
