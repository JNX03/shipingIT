/** Server-only OpenRouter boundary. No paid model or fallback path is permitted. */
const CATALOG_URL = 'https://openrouter.ai/api/v1/models';
const COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isZeroPrice = (value) => typeof value === 'string' && /^0+(?:\.0+)?$/.test(value);
const isFreeModelId = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+:free$/.test(value);
const PRICE_FIELDS = new Set([
  'prompt',
  'completion',
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
]);

export function isOpenRouterConfigured(env) {
  return Boolean(
    typeof env.OPENROUTER_API_KEY === 'string' &&
    env.OPENROUTER_API_KEY.trim() &&
    isFreeModelId(env.OPENROUTER_MODEL),
  );
}

export function verifiedFreeModel(catalog, modelId) {
  if (!isFreeModelId(modelId) || !object(catalog) || !Array.isArray(catalog.data)) return false;
  const matches = catalog.data.filter((model) => object(model) && model.id === modelId);
  if (matches.length !== 1) return false;
  const model = matches[0];
  if (
    !Array.isArray(model.supported_parameters) ||
    !['response_format', 'structured_outputs', 'max_tokens'].every((parameter) =>
      model.supported_parameters.includes(parameter),
    )
  )
    return false;
  const pricing = model.pricing;
  if (!object(pricing) || !isZeroPrice(pricing.prompt) || !isZeroPrice(pricing.completion))
    return false;
  for (const [name, value] of Object.entries(pricing)) {
    if (name === 'discount') {
      // A discount cannot qualify a positive base price as free.
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
        return false;
    } else if (name === 'overrides') {
      // Conditional pricing is ambiguous for a strict no-spend service.
      if (!Array.isArray(value) || value.length !== 0) return false;
    } else if (!PRICE_FIELDS.has(name) || !isZeroPrice(value)) return false;
  }
  return true;
}

/** Normalize only an untruncated, non-refused text completion for the existing app parser. */
export function normalizeOpenRouterOutput(value) {
  if (!object(value) || value.error || !Array.isArray(value.choices) || value.choices.length !== 1)
    return null;
  const choice = value.choices[0];
  if (!object(choice) || choice.error || choice.finish_reason !== 'stop' || !object(choice.message))
    return null;
  const message = choice.message;
  if (
    message.role !== 'assistant' ||
    typeof message.content !== 'string' ||
    !message.content.trim() ||
    message.refusal != null ||
    (message.tool_calls != null &&
      (!Array.isArray(message.tool_calls) || message.tool_calls.length !== 0)) ||
    message.function_call != null
  )
    return null;
  // A reported charge must not be accepted as a successful free-model response.
  if (
    value.usage?.cost !== undefined &&
    (typeof value.usage.cost !== 'number' || value.usage.cost !== 0)
  )
    return null;
  return {
    status: 'completed',
    output: [
      {
        type: 'message',
        status: 'completed',
        content: [{ type: 'output_text', text: message.content }],
      },
    ],
  };
}

export async function requestOpenRouter({
  env,
  fetchImpl = fetch,
  instructions,
  input,
  history = [],
  schema,
  name,
  signal,
}) {
  if (!isOpenRouterConfigured(env)) throw new Error('Free model configuration is unavailable.');
  if (
    !Array.isArray(history) ||
    history.length > 6 ||
    history.some(
      (turn) =>
        !object(turn) ||
        Object.keys(turn).some((key) => !['question', 'answer'].includes(key)) ||
        ![turn.question, turn.answer].every(
          (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000,
        ),
    )
  )
    throw new Error('Conversation history is invalid.');
  const priorMessages = history.flatMap((turn) => [
    { role: 'user', content: turn.question.trim() },
    { role: 'assistant', content: turn.answer.trim() },
  ]);
  const providerSignal = AbortSignal.any([AbortSignal.timeout(22000), ...(signal ? [signal] : [])]);
  providerSignal.throwIfAborted();
  // Recheck on every attempt. A stale cache must never authorize a later priced request.
  const catalogResponse = await fetchImpl(CATALOG_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.any([providerSignal, AbortSignal.timeout(8000)]),
  });
  if (!catalogResponse.ok || !verifiedFreeModel(await catalogResponse.json(), env.OPENROUTER_MODEL))
    throw new Error('A free structured-output model could not be verified.');
  const response = await fetchImpl(COMPLETIONS_URL, {
    method: 'POST',
    redirect: 'error',
    signal: providerSignal,
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      stream: false,
      max_tokens: 1400,
      messages: [
        { role: 'system', content: instructions },
        ...priorMessages,
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
      provider: {
        require_parameters: true,
        allow_fallbacks: false,
        data_collection: 'deny',
        // Only these five price caps are documented by OpenRouter's API schema.
        max_price: { prompt: '0', completion: '0', request: '0', image: '0', audio: '0' },
      },
    }),
  });
  if (!response.ok) throw new Error('The free model is unavailable.');
  return normalizeOpenRouterOutput(await response.json());
}
