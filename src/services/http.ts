import { fetch } from 'expo/fetch';

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export async function fetchJson(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok)
      throw new ServiceError(
        `The service could not respond (${response.status}).`,
        response.status,
      );
    return await response.json();
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export { isRecord, textValue } from './validation';
