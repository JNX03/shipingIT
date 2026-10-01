import { authProvider } from '@/services/auth';
import { serviceConfig } from '@/services/config';
import { fetchJson } from '@/services/http';
import { evidenceById, scriptedInterview } from './logic/research';
import { challengeById } from './challenges/catalog';
import type { InterviewMessage, NpcId } from './types';

export interface InterviewRequest {
  npcId: NpcId;
  question: string;
  history: InterviewMessage[];
  projectName: string;
  signal?: AbortSignal;
  scenarioId?:
    'explore-last-time' | 'explore-workaround' | 'explore-library-handoff' | 'explore-club-room';
  remoteConsent?: boolean;
}
export interface InterviewReply {
  text: string;
  source: 'ai' | 'scripted';
  evidenceId?: string;
  unavailable?: boolean;
}
const endpoint =
  serviceConfig.interviewUrl ||
  serviceConfig.mentorUrl?.replace(/\/api\/mentor\/?$/, '/api/interview') ||
  '';

/** A real model response is labeled AI only after the authenticated server contract validates. */
export async function interviewCharacter(request: InterviewRequest): Promise<InterviewReply> {
  const scenario = request.scenarioId ? challengeById(request.scenarioId) : undefined;
  const fallback = (): InterviewReply =>
    request.scenarioId
      ? {
          text: 'AI interview is unavailable. Use the guided practice question to uncover the next authored clue.',
          source: 'scripted',
          unavailable: true,
        }
      : scriptedInterview(request);
  if (
    request.scenarioId &&
    (request.remoteConsent !== true ||
      scenario?.kind !== 'interview' ||
      scenario.npc !== request.npcId)
  )
    return fallback();
  if (!endpoint || request.question.length > 2000 || request.signal?.aborted) return fallback();
  try {
    const token = await authProvider.getAccessToken();
    if (!token) return fallback();
    const response = await fetchJson(
      endpoint,
      {
        method: 'POST',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          npcId: request.npcId,
          ...(request.scenarioId ? { scenarioId: request.scenarioId } : {}),
          question: request.question.trim(),
          projectName: request.projectName.slice(0, 80),
          history: request.history
            .slice(-12)
            .map(({ role, text, evidenceId }) => ({
              role,
              text: text.slice(0, 2000),
              ...(evidenceId ? { evidenceId } : {}),
            })),
        }),
      },
      25000,
    );
    if (!response || typeof response !== 'object') return fallback();
    const value = response as Record<string, unknown>;
    if (
      value.source !== 'ai' ||
      typeof value.text !== 'string' ||
      !value.text.trim() ||
      value.text.length > 2000
    )
      return fallback();
    if (scenario) {
      if (
        value.evidenceId != null &&
        (typeof value.evidenceId !== 'string' ||
          !scenario.items.some((item) => item.id === value.evidenceId))
      )
        return fallback();
      return {
        text: value.text,
        source: 'ai',
        ...(typeof value.evidenceId === 'string' ? { evidenceId: value.evidenceId } : {}),
      };
    }
    const evidence =
      typeof value.evidenceId === 'string' ? evidenceById(value.evidenceId) : undefined;
    return {
      text: value.text,
      source: 'ai',
      ...(evidence?.npcId === request.npcId ? { evidenceId: evidence.id } : {}),
    };
  } catch {
    return fallback();
  }
}
