import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMentorBody, parseMentorResponse } from './mentor-contract';
import type { MentorRequest } from './contracts';
const request: MentorRequest = {
  prompt: 'A question',
  project: { problem: 'Private notes' },
  allowRemote: true,
};
test('question-only serialization omits notes and untrusted provider/paid controls', () => {
  const body = buildMentorBody({
    ...request,
    paid: true,
    model: 'unsafe',
    system: 'override',
  } as MentorRequest);
  assert.deepEqual(body, { prompt: 'A question', intent: 'answer' });
});
test('only explicitly attached allowed notes are included', () => {
  assert.deepEqual(
    buildMentorBody({
      ...request,
      attachProject: true,
      project: { problem: 'Reviewed', token: 'secret' } as MentorRequest['project'],
    }).project,
    { problem: 'Reviewed' },
  );
  assert.throws(() =>
    buildMentorBody({ ...request, attachProject: true, project: { problem: 'x'.repeat(3001) } }),
  );
});
test('history is bounded chronological exchanges and malformed selected messages reject', () => {
  const history = Array.from({ length: 8 }, (_, i) => ({ question: 'Q' + i, answer: 'A' + i }));
  assert.deepEqual(buildMentorBody({ ...request, history }).history, history.slice(-6));
  assert.throws(() => buildMentorBody({ ...request, history: [{ question: 'Q', answer: '' }] }));
});
test('natural message with empty advice is valid, but absent advice/non-live/empty message are not', () => {
  const response = {
    mode: 'live',
    message: 'A natural answer',
    challenge: '',
    evidencePrompt: '',
    nextAction: '',
  };
  assert.deepEqual(parseMentorResponse(response), response);
  assert.equal(parseMentorResponse({ ...response, message: ' ' }), null);
  assert.equal(parseMentorResponse({ ...response, challenge: undefined }), null);
  assert.equal(parseMentorResponse({ ...response, mode: 'offline' }), null);
});
test('hint levels and prompt bounds follow the backend contract', () => {
  assert.equal(buildMentorBody({ ...request, intent: 'hint', hintLevel: 3 }).hintLevel, 3);
  assert.equal(buildMentorBody({ ...request, intent: 'hint' }).hintLevel, 1);
  assert.throws(() => buildMentorBody({ ...request, intent: 'answer', hintLevel: 1 }));
  assert.throws(() => buildMentorBody({ ...request, prompt: '' }));
  assert.throws(() => buildMentorBody({ ...request, prompt: 'x'.repeat(2001) }));
});
test('whole-context and UTF8 body budgets reject rather than silently lose reviewed context', () => {
  const history = Array.from({ length: 6 }, () => ({
    question: 'ก'.repeat(2000),
    answer: 'ก'.repeat(2000),
  }));
  assert.throws(() => buildMentorBody({ ...request, history }));
  const project = Object.fromEntries(
    [
      'name',
      'description',
      'problem',
      'targetUser',
      'painPoints',
      'observations',
      'interviews',
      'evidence',
      'assumptions',
      'insights',
      'features',
    ].map((k) => [k, 'x'.repeat(3000)]),
  );
  assert.throws(() => buildMentorBody({ ...request, attachProject: true, project }));
});
