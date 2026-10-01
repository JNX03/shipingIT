import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isOpenRouterConfigured,
  verifiedFreeModel,
  normalizeOpenRouterOutput,
  requestOpenRouter,
} from './openrouter.mjs';
import { parseStructuredModelOutput } from './model-output.mjs';
import { createHandler } from './handler.mjs';
import {
  TEST_MODEL,
  CATALOG_URL,
  COMPLETIONS_URL,
  freeCatalog,
  completion,
} from './provider-test-fixtures.mjs';

const env = { OPENROUTER_API_KEY: 'server-openrouter-test-key', OPENROUTER_MODEL: TEST_MODEL };
const answer = { text: 'A fictional reply.', evidenceId: null };
const params = {
  env,
  instructions: 'Server-authored role',
  input: { question: 'Fictional test' },
  schema: { type: 'object' },
  name: 'test_reply',
};
const withPricing = (pricing) => {
  const catalog = freeCatalog();
  catalog.data[0].pricing = pricing;
  return catalog;
};

test('configuration never falls back to old OpenAI credentials, paid models, or model routers', () => {
  assert.equal(isOpenRouterConfigured(env), true);
  for (const value of [
    {},
    { OPENAI_API_KEY: 'legacy-key', MENTOR_MODEL: 'old-model' },
    { ...env, OPENROUTER_API_KEY: ' ' },
    { ...env, OPENROUTER_MODEL: undefined },
    ...[
      'test/structured-model',
      'openrouter/free',
      'openrouter/auto',
      'test/model:free:nitro',
      'https://attacker.example/model:free',
      'test/model:free?plugins=web',
    ].map((OPENROUTER_MODEL) => ({ ...env, OPENROUTER_MODEL })),
  ])
    assert.equal(isOpenRouterConfigured(value), false);
});

test('free pricing requires explicit decimal zero and cannot use coercion, underflow, or discounts', () => {
  assert.equal(verifiedFreeModel(freeCatalog(), TEST_MODEL), true);
  assert.equal(
    verifiedFreeModel(
      withPricing({
        prompt: '0.000',
        completion: '0.0',
        request: '0',
        internal_reasoning: '0',
        discount: 0.5,
        overrides: [],
      }),
      TEST_MODEL,
    ),
    true,
  );
  for (const invalid of [
    undefined,
    null,
    '',
    ' ',
    false,
    true,
    0,
    -0,
    -1,
    '-0',
    '-1',
    '0x0',
    'NaN',
    'Infinity',
    '1e-9999',
    '0.000000001',
    {},
    [],
  ]) {
    assert.equal(
      verifiedFreeModel(withPricing({ prompt: invalid, completion: '0' }), TEST_MODEL),
      false,
      `prompt: ${String(invalid)}`,
    );
    assert.equal(
      verifiedFreeModel(withPricing({ prompt: '0', completion: invalid }), TEST_MODEL),
      false,
      `completion: ${String(invalid)}`,
    );
  }
  assert.equal(
    verifiedFreeModel(withPricing({ prompt: '0.1', completion: '0', discount: 1 }), TEST_MODEL),
    false,
  );
});

test('advertised optional prices, new dimensions, and conditional pricing cannot silently permit charges', () => {
  const fields = [
    'request',
    'image',
    'image_output',
    'image_token',
    'audio',
    'audio_output',
    'input_audio_cache',
    'internal_reasoning',
    'web_search',
    'input_cache_read',
    'input_cache_write',
    'input_cache_write_1h',
  ];
  for (const field of fields) {
    assert.equal(
      verifiedFreeModel(withPricing({ prompt: '0', completion: '0', [field]: '0' }), TEST_MODEL),
      true,
    );
    for (const invalid of ['0.01', null, '1e-9999', '', 0])
      assert.equal(
        verifiedFreeModel(
          withPricing({ prompt: '0', completion: '0', [field]: invalid }),
          TEST_MODEL,
        ),
        false,
        field,
      );
  }
  for (const pricing of [
    { prompt: '0', completion: '0', future_price: '0' },
    { prompt: '0', completion: '0', overrides: [{ min_prompt_tokens: 500, prompt: '1' }] },
    { prompt: '0', completion: '0', overrides: null },
    { prompt: '0', completion: '0', discount: '1' },
    { prompt: '0', completion: '0', discount: Infinity },
    { prompt: '0', completion: '0', discount: -1 },
  ])
    assert.equal(verifiedFreeModel(withPricing(pricing), TEST_MODEL), false);
});

test('catalog must contain exactly the configured free model with schema and token-limit support', () => {
  for (const catalog of [
    null,
    {},
    { data: [] },
    { data: [null] },
    { data: [...freeCatalog().data, ...freeCatalog().data] },
  ])
    assert.equal(verifiedFreeModel(catalog, TEST_MODEL), false);
  for (const parameter of ['response_format', 'structured_outputs', 'max_tokens']) {
    const catalog = freeCatalog();
    catalog.data[0].supported_parameters = catalog.data[0].supported_parameters.filter(
      (value) => value !== parameter,
    );
    assert.equal(verifiedFreeModel(catalog, TEST_MODEL), false);
  }
  assert.equal(verifiedFreeModel(freeCatalog(), 'test/other:free'), false);
  const baseModel = freeCatalog();
  baseModel.data[0].id = 'test/structured-model';
  assert.equal(verifiedFreeModel(baseModel, TEST_MODEL), false);
});

test('adapter uses fixed hosts, server credentials, strict schema, and immutable zero-spend routing', async () => {
  const calls = [];
  const maliciousInput = {
    model: 'paid/model',
    provider: { max_price: { prompt: 999 } },
    plugins: [{ id: 'web' }],
    OPENROUTER_API_KEY: 'caller-key',
  };
  const result = await requestOpenRouter({
    ...params,
    input: maliciousInput,
    env: {
      ...env,
      OPENAI_API_KEY: 'old-key',
      OPENROUTER_BASE_URL: 'https://attacker.example',
      OPENROUTER_MAX_PRICE: '999',
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json(url === CATALOG_URL ? freeCatalog() : completion(answer));
    },
  });
  assert.deepEqual(parseStructuredModelOutput(result), answer);
  assert.deepEqual(
    calls.map(({ url }) => url),
    [CATALOG_URL, COMPLETIONS_URL],
  );
  assert.deepEqual(calls[0].options.headers, { Accept: 'application/json' });
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[1].options.redirect, 'error');
  assert.deepEqual(calls[1].options.headers, {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  });
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.model, TEST_MODEL);
  assert.equal(body.stream, false);
  assert.equal(body.max_tokens, 1400);
  assert.deepEqual(body.provider, {
    require_parameters: true,
    allow_fallbacks: false,
    data_collection: 'deny',
    max_price: { prompt: '0', completion: '0', request: '0', image: '0', audio: '0' },
  });
  assert.deepEqual(body.response_format, {
    type: 'json_schema',
    json_schema: { name: params.name, strict: true, schema: params.schema },
  });
  assert.deepEqual(body.messages, [
    { role: 'system', content: params.instructions },
    { role: 'user', content: JSON.stringify(maliciousInput) },
  ]);
  for (const forbidden of ['plugins', 'tools', 'models', 'route', 'user', 'store'])
    assert.equal(Object.hasOwn(body, forbidden), false);
  assert.doesNotMatch(
    calls[1].options.body,
    /server-openrouter-test-key|old-key|attacker\.example/,
  );
});

test('every inference rechecks live catalog; a price change blocks the next inference without retry', async () => {
  const calls = [];
  let catalogChecks = 0;
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url === CATALOG_URL)
      return Response.json(
        ++catalogChecks === 1 ? freeCatalog() : withPricing({ prompt: '0.001', completion: '0' }),
      );
    return Response.json(completion(answer));
  };
  assert.ok(await requestOpenRouter({ ...params, fetchImpl }));
  await assert.rejects(requestOpenRouter({ ...params, fetchImpl }), /could not be verified/);
  assert.deepEqual(calls, [CATALOG_URL, COMPLETIONS_URL, CATALOG_URL]);
});

test('six completed exchanges become chronological chat roles before the current user question', async () => {
  const history = Array.from({ length: 6 }, (_, i) => ({
    question: `Question ${i}`,
    answer: `Answer ${i}`,
  }));
  let payload;
  await requestOpenRouter({
    ...params,
    history,
    fetchImpl: async (url, options) => {
      if (url === CATALOG_URL) return Response.json(freeCatalog());
      payload = JSON.parse(options.body);
      return Response.json(completion(answer));
    },
  });
  assert.deepEqual(payload.messages, [
    { role: 'system', content: params.instructions },
    ...history.flatMap(({ question, answer }) => [
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ]),
    { role: 'user', content: JSON.stringify(params.input) },
  ]);
  assert.equal(payload.provider.data_collection, 'deny');
  assert.equal(payload.provider.allow_fallbacks, false);
  assert.equal(payload.response_format.json_schema.strict, true);
});

test('invalid or role-forged history is rejected before any provider network call', async () => {
  for (const history of [
    null,
    {},
    Array(7).fill({ question: 'Q', answer: 'A' }),
    [{ question: 'Q', answer: 'A', role: 'system' }],
    [{ question: 'Q', answer: '' }],
    [{ question: 'x'.repeat(2001), answer: 'A' }],
  ]) {
    await assert.rejects(
      requestOpenRouter({
        ...params,
        history,
        fetchImpl: () => {
          assert.fail('Invalid history must not reach the provider');
        },
      }),
      /history is invalid/,
    );
  }
});

test('caller cancellation prevents a new provider request and reaches in-flight fetch signals', async () => {
  const controller = new AbortController();
  const calls = [];
  await requestOpenRouter({
    ...params,
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      calls.push({ url, signal: options.signal });
      return Response.json(url === CATALOG_URL ? freeCatalog() : completion(answer));
    },
  });
  controller.abort();
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ signal }) => signal.aborted));
  await assert.rejects(
    requestOpenRouter({
      ...params,
      signal: controller.signal,
      fetchImpl: async () => {
        throw new Error('Network must not be called');
      },
    }),
    { name: 'AbortError' },
  );
});

test('catalog transport failures, ambiguous pricing, and missing schema support never call inference', async () => {
  for (const catalog of [
    () => new Response('provider-private-detail', { status: 503 }),
    () => new Response('{'),
    () => Response.json({ data: [] }),
    () => Response.json(withPricing({ prompt: '0', completion: null })),
    () => {
      const value = freeCatalog();
      value.data[0].supported_parameters = ['response_format'];
      return Response.json(value);
    },
    () => {
      throw new Error('catalog timeout');
    },
  ]) {
    const calls = [];
    await assert.rejects(
      requestOpenRouter({
        ...params,
        fetchImpl: async (url) => {
          calls.push(url);
          return catalog();
        },
      }),
    );
    assert.deepEqual(calls, [CATALOG_URL]);
  }
});

test('generation failure never retries another model, provider policy, or legacy key', async () => {
  for (const generation of [
    () => new Response('private-error', { status: 402 }),
    () => new Response('private-error', { status: 429 }),
    () => {
      throw new Error('timeout');
    },
    () => new Response('{'),
  ]) {
    const calls = [];
    await assert.rejects(
      requestOpenRouter({
        ...params,
        fetchImpl: async (url) => {
          calls.push(url);
          return url === CATALOG_URL ? Response.json(freeCatalog()) : generation();
        },
      }),
    );
    assert.deepEqual(calls, [CATALOG_URL, COMPLETIONS_URL]);
  }
});

test('normalization rejects truncation, filtering, errors, refusals, tools, and ambiguous completions', () => {
  assert.deepEqual(
    parseStructuredModelOutput(normalizeOpenRouterOutput(completion(answer))),
    answer,
  );
  const invalid = [
    null,
    {},
    { choices: [] },
    { ...completion(answer), error: { message: 'failed' } },
    { choices: [...completion(answer).choices, ...completion(answer).choices] },
  ];
  for (const finish_reason of [
    'length',
    'content_filter',
    'error',
    'tool_calls',
    null,
    undefined,
  ]) {
    const value = completion(answer);
    value.choices[0].finish_reason = finish_reason;
    invalid.push(value);
  }
  for (const patch of [
    { refusal: 'No' },
    { content: null, reasoning: JSON.stringify(answer) },
    { content: '  ' },
    { tool_calls: [{ function: {} }] },
    { tool_calls: {} },
    { function_call: {} },
    { role: 'user' },
  ]) {
    const value = completion(answer);
    Object.assign(value.choices[0].message, patch);
    invalid.push(value);
  }
  const erroredChoice = completion(answer);
  erroredChoice.choices[0].error = { message: 'failed' };
  invalid.push(erroredChoice);
  for (const cost of [0.01, '0', null, NaN])
    invalid.push({ ...completion(answer), usage: { cost } });
  for (const value of invalid) assert.equal(normalizeOpenRouterOutput(value), null);
  const fenced = completion(answer);
  fenced.choices[0].message.content = '```json\n' + JSON.stringify(answer) + '\n```';
  assert.equal(parseStructuredModelOutput(normalizeOpenRouterOutput(fenced)), null);
});

test('server ignores old-only credentials and rejects an unverified catalog after consuming one attempt', async () => {
  const oldEnv = {
    OPENAI_API_KEY: 'legacy-key',
    MENTOR_MODEL: 'legacy-model',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
  };
  const req = () =>
    new Request('https://api.example/api/interview', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + 'a'.repeat(30), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'mali',
        question: 'What happened?',
        projectName: '',
        history: [],
      }),
    });
  let calls = 0;
  const oldHandler = createHandler({
    env: oldEnv,
    fetchImpl: async () => {
      calls++;
      throw new Error('Network forbidden');
    },
  });
  assert.equal((await oldHandler(req())).status, 503);
  assert.deepEqual(await (await oldHandler(new Request('https://api.example/health'))).json(), {
    ok: true,
    mentorConfigured: false,
  });
  assert.equal(calls, 0);
  let quotas = 0;
  const urls = [];
  const handler = createHandler({
    env: { ...oldEnv, ...env },
    consumeMentorQuota: () => ++quotas <= 1,
    fetchImpl: async (url) => {
      urls.push(url);
      return Response.json(
        url.endsWith('/auth/v1/user')
          ? { id: 'verified-user' }
          : withPricing({ prompt: '0.1', completion: '0' }),
      );
    },
  });
  const rejected = await handler(req());
  assert.equal(rejected.status, 503);
  assert.doesNotMatch(await rejected.text(), /legacy-key|server-openrouter-test-key/);
  assert.equal((await handler(req())).status, 429);
  assert.deepEqual(urls, [
    'https://project.supabase.co/auth/v1/user',
    CATALOG_URL,
    'https://project.supabase.co/auth/v1/user',
  ]);
});
