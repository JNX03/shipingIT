export const TEST_MODEL = 'test/structured-model:free';
export const CATALOG_URL = 'https://openrouter.ai/api/v1/models';
export const COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const freeCatalog = () => ({
  data: [
    {
      id: TEST_MODEL,
      pricing: { prompt: '0', completion: '0' },
      supported_parameters: ['response_format', 'structured_outputs', 'max_tokens'],
    },
  ],
});
export const completion = (value) => ({
  choices: [
    { finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(value) } },
  ],
  usage: { cost: 0 },
});
