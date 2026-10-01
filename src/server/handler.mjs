/** Optional Node service. Never import this file from the Expo client. */
import {
  validateInterviewInput,
  interviewModelContract,
  parseInterviewOutput,
} from './interview-contract.mjs';
import { validateMentorInput, parseModelOutput, mentorModelContract } from './mentor-contract.mjs';
import { isOpenRouterConfigured, requestOpenRouter } from './openrouter.mjs';
export { validateMentorInput, parseModelOutput } from './mentor-contract.mjs';
const DEKPORT_URL =
  'https://api.dekport.com/api/v1/events?event_type=competition&view=card&registration_open=true&sort_by=registration_end&sort_order=asc&limit=100';
const object = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
function boundedInteger(value, defaultValue, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : defaultValue;
}

/** Fetch Request/Response handler, usable behind Node or adapted to a serverless runtime. */
export function createHandler({
  env = process.env,
  fetchImpl = fetch,
  now = Date.now,
  consumeMentorQuota,
} = {}) {
  const allowedOrigins = new Set(
    (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const limits = new Map();
  let feedCache = null;
  function takeQuota(key, count, duration) {
    const time = now();
    let row = limits.get(key);
    if (limits.size >= 10000)
      for (const [id, value] of limits) if (value.resetAt < time) limits.delete(id);
    if (!row && limits.size >= 10000) return false;
    if (!row || time >= row.resetAt) {
      row = { count: 0, resetAt: time + duration };
      limits.set(key, row);
    }
    row.count++;
    return row.count <= count;
  }
  return async function handle(request, clientAddress = 'unknown') {
    const origin = request.headers.get('origin');
    const cors =
      origin && allowedOrigins.has(origin)
        ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
        : {};
    const headers = {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    };
    const json = (body, status = 200, extra = {}) =>
      new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
    if (origin && !allowedOrigins.has(origin))
      return json({ error: 'Origin is not allowed.' }, 403);
    const path = new URL(request.url).pathname;
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, X-Client-Info',
          'Access-Control-Max-Age': '600',
        },
      });
    if (path === '/health' && request.method === 'GET')
      return json({
        ok: true,
        mentorConfigured: Boolean(
          isOpenRouterConfigured(env) && env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY,
        ),
      });
    if (path === '/api/opportunities' && request.method === 'GET') {
      if (!takeQuota(`feed:${clientAddress}`, 60, 60000))
        return json({ error: 'Please retry in a minute.' }, 429, { 'Retry-After': '60' });
      if (feedCache && now() - feedCache.savedAt < 300000)
        return json(feedCache.data, 200, { 'Cache-Control': 'public, max-age=60' });
      try {
        const upstream = await fetchImpl(DEKPORT_URL, {
          signal: AbortSignal.timeout(10000),
          headers: { Accept: 'application/json' },
        });
        if (!upstream.ok) return json({ error: 'The opportunity feed is unavailable.' }, 503);
        const data = await upstream.json();
        if (!object(data) || !Array.isArray(data.events))
          return json({ error: 'The opportunity feed is unavailable.' }, 502);
        // The fixed card endpoint is already a public projection. Never forward cookies, auth, or arbitrary URLs.
        feedCache = {
          savedAt: now(),
          data: {
            events: data.events.slice(0, 150),
            fetchedAt: new Date(now()).toISOString(),
            sourceUrl: DEKPORT_URL,
          },
        };
        return json(feedCache.data, 200, { 'Cache-Control': 'public, max-age=60' });
      } catch {
        return json({ error: 'The opportunity feed is unavailable.' }, 503);
      }
    }
    const isInterview = path === '/api/interview';
    if (path !== '/api/mentor' && !isInterview) return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST')
      return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
    if (!isOpenRouterConfigured(env) || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
      return json(
        { error: 'The online mentor is not configured. Offline coaching is available in the app.' },
        503,
      );
    if (!/^https:\/\//.test(env.SUPABASE_URL))
      return json({ error: 'Authentication configuration is invalid.' }, 503);
    const authorization = request.headers.get('authorization') || '';
    if (!/^Bearer [A-Za-z0-9._-]{20,5000}$/.test(authorization))
      return json({ error: 'Sign in to request online coaching.' }, 401);
    if (!takeQuota(`auth:${clientAddress}`, 30, 60000))
      return json({ error: 'Please retry in a minute.' }, 429, { 'Retry-After': '60' });
    let userId;
    try {
      const identity = await fetchImpl(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: env.SUPABASE_PUBLISHABLE_KEY },
        signal: AbortSignal.timeout(8000),
      });
      if (!identity.ok)
        return json({ error: 'Your session could not be verified. Sign in again.' }, 401);
      const user = await identity.json();
      if (!object(user) || typeof user.id !== 'string' || !user.id)
        return json({ error: 'Your session could not be verified.' }, 401);
      userId = user.id;
    } catch {
      return json({ error: 'Sign-in verification is unavailable.' }, 503);
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return json({ error: 'Send JSON.' }, 415);
    if (Number(request.headers.get('content-length') || 0) > 65536)
      return json({ error: 'Request is too large.' }, 413);
    let input;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).length > 65536)
        return json({ error: 'Request is too large.' }, 413);
      input = isInterview
        ? validateInterviewInput(JSON.parse(text))
        : validateMentorInput(JSON.parse(text));
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (!input) return json({ error: 'Add a question and valid project context.' }, 400);
    const dailyLimit = boundedInteger(env.MENTOR_DAILY_LIMIT, 20, 20);
    let quotaAllowed;
    try {
      quotaAllowed = consumeMentorQuota
        ? (await consumeMentorQuota({ userId, authorization })) === true
        : takeQuota(`mentor:${userId}`, dailyLimit, 24 * 60 * 60 * 1000);
    } catch {
      // A failed durable counter must never silently fall back to a fresh in-memory budget.
      return json({ error: 'Online coaching limits could not be checked. Please try again.' }, 503);
    }
    if (!quotaAllowed)
      return json(
        {
          error:
            'Your daily online coaching limit is reached. Offline coaching is still available.',
        },
        429,
      );
    try {
      const interview = isInterview ? interviewModelContract(input) : null;
      const mentor = isInterview ? null : mentorModelContract(input);
      const output = await requestOpenRouter({
        env,
        fetchImpl,
        instructions: interview?.instructions ?? mentor.instructions,
        input: mentor?.input ?? input,
        history: mentor?.history ?? [],
        schema: interview?.schema ?? mentor.schema,
        name: isInterview ? 'shipingit_interview' : 'innovation_coaching',
        signal: request.signal,
      });
      const result = isInterview
        ? parseInterviewOutput(output, input.npcId, input.scenarioId)
        : parseModelOutput(output);
      return result
        ? json(result)
        : json({ error: 'The mentor could not complete this review.' }, 502);
    } catch {
      return json({ error: 'The online mentor is unavailable.' }, 503);
    }
  };
}
