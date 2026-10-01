import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validateMentorInput, parseModelOutput } from './handler.mjs';
import { createSupabaseQuota } from './supabase-quota.mjs';
import { createSupabaseEdgeHandler } from './edge-adapter.mjs';
import {
  TEST_MODEL,
  CATALOG_URL,
  COMPLETIONS_URL,
  freeCatalog,
  completion,
} from './provider-test-fixtures.mjs';

const env = {
  OPENROUTER_API_KEY: 'test-only-key',
  OPENROUTER_MODEL: TEST_MODEL,
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-only-publishable',
  ALLOWED_ORIGINS: 'http://localhost:8081',
  MENTOR_DAILY_LIMIT: '1',
};
const request = (
  body = {
    prompt: 'Challenge my assumption',
    attachProject: true,
    project: { problem: 'Students miss deadlines.' },
  },
  extra = {},
) =>
  new Request('http://localhost:8787/api/mentor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + 'a'.repeat(30),
      ...extra,
    },
    body: JSON.stringify(body),
  });
const answer = {
  message: 'Look for a pattern.',
  challenge: 'What happened last time?',
  evidencePrompt: 'Record an anonymous quote.',
  nextAction: 'Interview one relevant person.',
};
test('rejects unsupported context fields and oversized values', () => {
  assert.equal(validateMentorInput({ prompt: 'Hi', project: { apiKey: 'secret' } }), null);
  assert.equal(validateMentorInput({ prompt: 'Hi', project: { problem: 'x'.repeat(3001) } }), null);
  assert.equal(validateMentorInput({ prompt: 'Hi', project: {}, focus: 'change-rules' }), null);
  assert.equal(validateMentorInput({ prompt: '', project: {} }), null);
});
test('unconfigured server fails closed without network calls', async () => {
  const handle = createHandler({
    env: {},
    fetchImpl: () => {
      throw new Error('Must not call');
    },
  });
  assert.equal((await handle(request())).status, 503);
});
test('rejects unapproved browser origins and missing sessions', async () => {
  const handle = createHandler({ env });
  assert.equal(
    (await handle(request(undefined, { Origin: 'https://untrusted.example' }))).status,
    403,
  );
  assert.equal((await handle(request(undefined, { Authorization: '' }))).status, 401);
});
test('auth failure never calls the model', async () => {
  let calls = 0;
  const handle = createHandler({
    env,
    fetchImpl: async () => {
      calls++;
      return new Response('{}', { status: 401 });
    },
  });
  assert.equal((await handle(request())).status, 401);
  assert.equal(calls, 1);
});
test('rejects malformed JSON, oversized body, and unexpected input without calling the model', async () => {
  let modelCalls = 0;
  const handle = createHandler({
    env,
    fetchImpl: async (url) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
      modelCalls++;
      return Response.json({});
    },
  });
  assert.equal(
    (await handle(request({ prompt: 'Review', project: { name: 'x'.repeat(4000) } }))).status,
    400,
  );
  assert.equal((await handle(request(undefined, { 'Content-Length': '70000' }))).status, 413);
  const badJson = new Request('http://localhost:8787/api/mentor', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + 'a'.repeat(30), 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal((await handle(badJson)).status, 400);
  assert.equal(modelCalls, 0);
});
test('authenticated response is structured, uses server key, and limits usage', async () => {
  let modelCalls = 0;
  const handle = createHandler({
    env,
    fetchImpl: async (url, options) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
      if (url === CATALOG_URL) return Response.json(freeCatalog());
      modelCalls++;
      assert.equal(url, COMPLETIONS_URL);
      assert.equal(options.headers.Authorization, 'Bearer test-only-key');
      const payload = JSON.parse(options.body);
      assert.equal(payload.provider.data_collection, 'deny');
      assert.equal(payload.model, env.OPENROUTER_MODEL);
      assert.equal(payload.response_format.json_schema.strict, true);
      return Response.json(completion(answer));
    },
  });
  const first = await handle(request());
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { mode: 'live', ...answer });
  assert.equal((await handle(request())).status, 429);
  assert.equal(modelCalls, 1);
});
test('provider refusal or malformed response never looks like live coaching', () => {
  assert.equal(
    parseModelOutput({
      status: 'completed',
      output: [{ content: [{ type: 'refusal', refusal: 'No' }] }],
    }),
    null,
  );
  assert.equal(
    parseModelOutput({
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: '{}' }] }],
    }),
    null,
  );
});

test('question-only chat sends history once and permits a natural answer without generic advice', async () => {
  let used = 0;
  const history = [{ question: 'What is a variable?', answer: 'A name for a value.' }];
  const natural = {
    message: 'Use const when you will not reassign the value.',
    challenge: '',
    evidencePrompt: '',
    nextAction: '',
  };
  const handle = createHandler({
    env,
    consumeMentorQuota: async ({ userId }) => {
      assert.equal(userId, 'verified-user');
      used++;
      return true;
    },
    fetchImpl: async (url, options) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
      if (url === CATALOG_URL) return Response.json(freeCatalog());
      const payload = JSON.parse(options.body);
      assert.deepEqual(payload.messages.slice(1, 3), [
        { role: 'user', content: history[0].question },
        { role: 'assistant', content: history[0].answer },
      ]);
      assert.deepEqual(JSON.parse(payload.messages.at(-1).content), {
        prompt: 'When should I use const?',
        intent: 'answer',
      });
      assert.equal(payload.response_format.json_schema.schema.properties.challenge.minLength, 0);
      return Response.json(completion(natural));
    },
  });
  const response = await handle(request({ prompt: 'When should I use const?', history }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mode: 'live', ...natural });
  assert.equal(used, 1);
});

test('unattached notebook data and paid or system controls stop before quota and inference', async () => {
  let used = 0;
  const handle = createHandler({
    env,
    consumeMentorQuota: async () => {
      used++;
      return true;
    },
    fetchImpl: async (url) => {
      assert.ok(url.endsWith('/auth/v1/user'));
      return Response.json({ id: 'verified-user' });
    },
  });
  for (const body of [
    { prompt: 'Help', project: { problem: 'Private note without consent' } },
    { prompt: 'Help', pro: true },
    { prompt: 'Help', history: [{ question: 'Q', answer: 'A', role: 'system' }] },
  ])
    assert.equal((await handle(request(body))).status, 400);
  assert.equal(used, 0);
});

test('standalone chat cannot raise the twenty-attempt cap through environment configuration', async () => {
  let modelCalls = 0;
  const handle = createHandler({
    env: { ...env, MENTOR_DAILY_LIMIT: '200' },
    fetchImpl: async (url) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
      if (url === CATALOG_URL) return Response.json(freeCatalog());
      modelCalls++;
      return Response.json(completion(answer));
    },
  });
  for (let i = 0; i < 20; i++)
    assert.equal((await handle(request({ prompt: 'Explain this.' }))).status, 200);
  assert.equal((await handle(request({ prompt: 'Explain this.' }))).status, 429);
  assert.equal(modelCalls, 20);
});
test('opportunity proxy uses a fixed public URL and caches successful feed', async () => {
  let calls = 0;
  const handle = createHandler({
    env: {},
    fetchImpl: async (url) => {
      calls++;
      assert.match(url, /^https:\/\/api.dekport.com\/api\/v1\/events\?/);
      return Response.json({ events: [{ id: 'public' }] });
    },
  });
  const requestFeed = () =>
    new Request('http://localhost:8787/api/opportunities?url=https://attacker.example');
  assert.equal((await handle(requestFeed())).status, 200);
  assert.equal((await handle(requestFeed())).status, 200);
  assert.equal(calls, 1);
});

test('durable quotas remain authoritative across handler instances', async () => {
  let used = 0;
  let modelCalls = 0;
  const consumeMentorQuota = async ({ userId, authorization }) => {
    assert.equal(userId, 'verified-user');
    assert.equal(authorization, 'Bearer ' + 'a'.repeat(30));
    return ++used <= 1;
  };
  const fetchImpl = async (url) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
    if (url === CATALOG_URL) return Response.json(freeCatalog());
    modelCalls++;
    return Response.json(completion(answer));
  };
  const firstWorker = createHandler({ env, fetchImpl, consumeMentorQuota });
  const restartedWorker = createHandler({ env, fetchImpl, consumeMentorQuota });
  assert.equal((await firstWorker(request())).status, 200);
  assert.equal((await restartedWorker(request())).status, 429);
  assert.equal(modelCalls, 1);
});

test('a failed durable quota never falls back to a fresh local allowance', async () => {
  let modelCalls = 0;
  const handle = createHandler({
    env,
    consumeMentorQuota: async () => {
      throw new Error('database offline');
    },
    fetchImpl: async (url) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
      modelCalls++;
      return Response.json({});
    },
  });
  assert.equal((await handle(request())).status, 503);
  assert.equal(modelCalls, 0);
});

test('Supabase quota RPC forwards the verified token without accepting a caller-selected identity or limit', async () => {
  const consume = createSupabaseQuota({
    env,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://project.supabase.co/rest/v1/rpc/consume_mentor_quota');
      assert.equal(options.headers.Authorization, 'Bearer verified-test-session');
      assert.equal(options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
      assert.deepEqual(JSON.parse(options.body), {});
      return Response.json(true);
    },
  });
  assert.equal(
    await consume({ authorization: 'Bearer verified-test-session', userId: 'ignored' }),
    true,
  );
  const malformed = createSupabaseQuota({
    env,
    fetchImpl: async () => Response.json({ allowed: true }),
  });
  await assert.rejects(malformed({ authorization: 'Bearer verified-test-session' }));
});

test('Edge adapter preserves mentor request contract and consumes its database quota', async () => {
  const calls = [];
  const handler = createSupabaseEdgeHandler({
    env: { ...env, NEXTGEN_SUPABASE_PUBLISHABLE_KEY: 'dedicated-public-key' },
    fetchImpl: async (url, options) => {
      calls.push(url);
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user' });
      if (url.endsWith('/rpc/consume_mentor_quota')) {
        assert.equal(options.headers.apikey, 'dedicated-public-key');
        return Response.json(true);
      }
      if (url === CATALOG_URL) return Response.json(freeCatalog());
      return Response.json(completion(answer));
    },
  });
  const response = await handler(
    new Request('https://project.supabase.co/functions/v1/nextgen-api/api/mentor', request()),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mode: 'live', ...answer });
  assert.equal(calls.length, 4);
  assert.ok(calls[1].endsWith('/rpc/consume_mentor_quota'));
  assert.equal(
    (await handler(new Request('https://project.supabase.co/functions/v1/other/health'))).status,
    404,
  );
});

test('Edge public health/feed and approved preflight work while unconfigured mentor fails closed', async () => {
  const handler = createSupabaseEdgeHandler({
    env: { ALLOWED_ORIGINS: 'https://nextgen.example' },
    fetchImpl: async () => Response.json({ events: [] }),
  });
  const health = await handler(
    new Request('https://project.supabase.co/functions/v1/nextgen-api/health'),
  );
  assert.deepEqual(await health.json(), { ok: true, mentorConfigured: false });
  const feed = await handler(
    new Request('https://project.supabase.co/functions/v1/nextgen-api/api/opportunities'),
  );
  assert.equal(feed.status, 200);
  assert.deepEqual((await feed.json()).events, []);
  const mentor = await handler(
    new Request('https://project.supabase.co/functions/v1/nextgen-api/api/mentor', request()),
  );
  assert.equal(mentor.status, 503);
  const preflight = await handler(
    new Request('https://project.supabase.co/functions/v1/nextgen-api/api/mentor', {
      method: 'OPTIONS',
      headers: { Origin: 'https://nextgen.example' },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /apikey/);
});
