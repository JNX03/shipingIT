const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Only completed, non-refused Responses output may become a live app response. */
export function parseStructuredModelOutput(value) {
  if (!object(value) || value.status !== 'completed' || value.error || !Array.isArray(value.output))
    return null;
  const content = [];
  for (const item of value.output) {
    if (!object(item)) return null;
    if (item.status !== undefined && item.status !== 'completed') return null;
    if (Array.isArray(item.content)) content.push(...item.content);
  }
  if (content.some((item) => object(item) && item.type === 'refusal')) return null;
  const text = content
    .filter((item) => object(item) && item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
  try {
    const output = JSON.parse(text);
    return object(output) ? output : null;
  } catch {
    return null;
  }
}
