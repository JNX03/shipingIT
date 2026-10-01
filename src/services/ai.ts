import type { AIProvider } from './contracts';
import { serviceConfig } from './config';
import { fetchJson, ServiceError } from './http';
import { buildMentorBody, MentorUnavailableError, parseMentorResponse } from './mentor-contract';
import { offlineMentor } from './mentor-offline';
import { authProvider } from './auth';

export const mentorProvider: AIProvider = {
  async review(request, signal) {
    if (request.allowRemote !== true) {
      if (request.intent === 'hint') return offlineMentor(request);
      throw new MentorUnavailableError('consent', 'Review the chat sharing notice before sending.');
    }
    if (!serviceConfig.mentorUrl)
      throw new MentorUnavailableError(
        'unconfigured',
        'Ami’s chat is not connected yet. You can still ask for a local hint.',
      );
    const body = buildMentorBody(request);
    try {
      const token = await authProvider.getAccessToken();
      if (!token)
        throw new MentorUnavailableError(
          'auth',
          'Sign in again to chat with Ami. Your question is still here.',
        );
      const result = await fetchJson(
        serviceConfig.mentorUrl,
        {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
        25000,
      );
      const response = parseMentorResponse(result);
      if (!response)
        throw new MentorUnavailableError(
          'unavailable',
          'Ami couldn’t load that reply. Try again or ask for a local hint.',
        );
      return response;
    } catch (error) {
      if (error instanceof MentorUnavailableError) throw error;
      if (signal?.aborted) throw new MentorUnavailableError('cancelled', 'Reply cancelled.');
      if (error instanceof ServiceError && [401, 403].includes(error.status))
        throw new MentorUnavailableError(
          'auth',
          'Sign in again to chat with Ami. Your question is still here.',
        );
      if (error instanceof ServiceError && error.status === 429)
        throw new MentorUnavailableError(
          'limit',
          'Ami has reached today’s reply limit. Try tomorrow, or ask for a local hint.',
        );
      throw new MentorUnavailableError(
        'unavailable',
        'Ami couldn’t connect right now. Try again or ask for a local hint.',
      );
    }
  },
};

export { offlineMentor } from './mentor-offline';
export { parseMentorResponse } from './mentor-contract';
export type { AIProvider, MentorRequest, MentorResponse } from './contracts';
