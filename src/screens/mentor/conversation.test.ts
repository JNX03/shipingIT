import test from 'node:test';
import assert from 'node:assert/strict';
import type { AIProvider, MentorRequest, MentorResponse } from '../../services/contracts';
import {
  createConversation,
  deriveAmiPresentation,
  AMI_REPLY_TALK_MS,
  focusDraft,
  completedHistory,
} from './conversation';
const live: MentorResponse = {
  mode: 'live',
  message: 'A natural answer.',
  challenge: '',
  evidencePrompt: '',
  nextAction: '',
};
const local: MentorResponse = { ...live, mode: 'offline', message: 'An authored hint.' };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture() {
  const calls: {
    request: MentorRequest;
    signal?: AbortSignal;
    resolve: (r: MentorResponse) => void;
    reject: (e: unknown) => void;
  }[] = [];
  const provider: AIProvider = {
    review(request, signal) {
      return new Promise((resolve, reject) => calls.push({ request, signal, resolve, reject }));
    },
  };
  return { calls, conversation: createConversation(provider, { remoteConfigured: true }) };
}
test('first-use review makes no request, dismissal grants nothing, and confirmation is explicit', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  assert.equal(
    await f.conversation.sendChat('My question', { interviews: 'Private notes' }, 'evidence'),
    'consent',
  );
  assert.equal(f.calls.length, 0);
  assert.equal(f.conversation.getSnapshot().turns.length, 0);
  assert.deepEqual(f.conversation.getSnapshot().consent!.request.project, {});
  assert.equal(f.conversation.getSnapshot().consent!.request.attachProject, false);
  f.conversation.dismissConsent();
  assert.equal(await f.conversation.confirmConsent(), 'ignored');
  assert.equal(f.conversation.getSnapshot().remoteConsentGranted, false);
  await f.conversation.sendChat('My question', {}, 'evidence');
  const pending = f.conversation.confirmConsent();
  assert.equal(await f.conversation.confirmConsent(), 'ignored');
  await flush();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].request.allowRemote, true);
  f.calls[0].resolve(live);
  assert.equal(await pending, 'answered');
});
test('later chat is question-only and uses completed live context; local hints are never hidden history', async (t) => {
  const calls: MentorRequest[] = [];
  const c = createConversation(
    {
      async review(r) {
        calls.push(r);
        return { ...live, message: 'Reply ' + r.prompt };
      },
    },
    { remoteConfigured: true },
  );
  t.after(() => c.dispose());
  await c.sendChat('Q1', { problem: 'Never send automatically' }, 'problem');
  await c.confirmConsent();
  await c.giveHint('Local hint', 'scope', local);
  for (let i = 2; i <= 8; i++)
    assert.equal(await c.sendChat('Q' + i, { problem: 'Secret' }, 'problem'), 'answered');
  const last = calls.at(-1)!;
  assert.equal(last.history!.length, 6);
  assert.equal(last.history![0].question, 'Q2');
  assert.equal(last.history![5].question, 'Q7');
  assert.ok(last.history!.every((p) => p.answer.startsWith('Reply ')));
  assert.deepEqual(last.project, {});
  assert.equal(last.attachProject, false);
  assert.equal(completedHistory(c.getSnapshot().turns).length, 6);
});
test('notes attachment always requires an exact immutable review and next message returns to no notes', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  await f.conversation.sendChat('First', {}, 'problem');
  let p = f.conversation.confirmConsent();
  await flush();
  f.calls[0].resolve(live);
  await p;
  const project = { problem: 'Reviewed', interviews: 'x'.repeat(3001) };
  assert.equal(await f.conversation.sendChat('Attached', project, 'evidence', true), 'consent');
  project.problem = 'Later edit';
  const snapshot = f.conversation.getSnapshot().consent!.request;
  assert.equal(snapshot.project.problem, 'Reviewed');
  assert.equal(snapshot.project.interviews!.length, 3000);
  assert.ok(Object.isFrozen(snapshot.project));
  assert.ok(Object.isFrozen(snapshot.history));
  p = f.conversation.confirmConsent();
  await flush();
  assert.equal(f.calls[1].request, snapshot);
  f.calls[1].resolve(live);
  await p;
  p = f.conversation.sendChat('Next', project, 'pitch');
  await flush();
  assert.equal(f.calls[2].request.attachProject, false);
  assert.deepEqual(f.calls[2].request.project, {});
  f.calls[2].resolve(live);
  await p;
});
test('remote offline fallback is not presented as an arbitrary answer; explicit hint remains local', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  await f.conversation.sendChat('Arbitrary question', {}, 'problem');
  const p = f.conversation.confirmConsent();
  await flush();
  f.calls[0].resolve(local);
  assert.equal(await p, 'failed');
  assert.equal(f.conversation.getSnapshot().turns[0].answers.length, 0);
  assert.equal(await f.conversation.giveHint('A hint please', 'problem', local), 'answered');
  assert.equal(f.calls.length, 1);
  assert.equal(f.conversation.getSnapshot().turns[1].answers[0].response.mode, 'offline');
});
test('rapid sends, cancel and late fallback cannot overlap or overwrite a new request', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  await f.conversation.sendChat('First', {}, 'problem');
  const p = f.conversation.confirmConsent();
  assert.equal(await f.conversation.sendChat('Duplicate', {}, 'problem'), 'ignored');
  await flush();
  f.conversation.cancel();
  assert.equal(await p, 'cancelled');
  assert.equal(f.calls[0].signal!.aborted, true);
  const next = f.conversation.sendChat('Next', {}, 'scope');
  await flush();
  f.calls[0].resolve(local);
  await flush();
  assert.equal(f.conversation.getSnapshot().busy, true);
  assert.equal(f.conversation.getSnapshot().turns[0].answers.length, 0);
  f.calls[1].resolve(live);
  assert.equal(await next, 'answered');
});
test('retry preserves the reviewed request rather than silently attaching edited notes', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  await f.conversation.sendChat('Question', { problem: 'Original' }, 'evidence', true);
  let p = f.conversation.confirmConsent();
  await flush();
  f.calls[0].reject(new Error('Fixture failure'));
  assert.equal(await p, 'failed');
  const id = f.conversation.getSnapshot().turns[0].id;
  assert.equal(await f.conversation.retry(id), 'consent');
  assert.equal(f.conversation.getSnapshot().consent!.request.project.problem, 'Original');
  p = f.conversation.confirmConsent();
  await flush();
  f.calls[1].resolve(live);
  await p;
  assert.equal(f.conversation.getSnapshot().turns.length, 1);
});
test('deadline settles an unresponsive provider and keeps the question available', async (t) => {
  let signal: AbortSignal | undefined;
  const c = createConversation(
    {
      review(_r, s) {
        signal = s;
        return new Promise(() => {});
      },
    },
    { remoteConfigured: true, timeoutMs: 10 },
  );
  t.after(() => c.dispose());
  await c.sendChat('Slow', {}, 'problem');
  assert.equal(await c.confirmConsent(), 'failed');
  assert.equal(c.getSnapshot().busy, false);
  assert.equal(c.getSnapshot().turns[0].request.prompt, 'Slow');
  assert.equal(signal!.aborted, true);
});
test('unconfigured chat is honest and local hint does not call a provider', async (t) => {
  let calls = 0;
  const c = createConversation({
    async review() {
      calls++;
      return live;
    },
  });
  t.after(() => c.dispose());
  assert.equal(await c.sendChat('My question', {}, 'problem'), 'failed');
  assert.equal(calls, 0);
  assert.match(c.getSnapshot().turns[0].notice!, /not connected/);
  assert.equal(await c.giveHint('Hint', 'scope'), 'answered');
  assert.equal(calls, 0);
});
test('disposal clears chat permission/history and suppresses late replies', async () => {
  const f = fixture();
  await f.conversation.sendChat('First', {}, 'problem');
  const p = f.conversation.confirmConsent();
  await flush();
  f.conversation.dispose();
  assert.equal(await p, 'cancelled');
  f.calls[0].resolve(live);
  await flush();
  assert.equal(f.conversation.getSnapshot().turns.length, 0);
  assert.equal(f.conversation.getSnapshot().remoteConsentGranted, false);
});
test('topic starter changes preserve a personal draft', () => {
  assert.match(focusDraft('', 'evidence'), /evidence/);
  assert.match(focusDraft(focusDraft('', 'problem'), 'scope'), /first version/);
  assert.equal(focusDraft('My own question', 'scope'), 'My own question');
});
test('new chat drops prior permission and context without carrying them into a new request', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  await f.conversation.sendChat('First', {}, 'problem');
  const first = f.conversation.confirmConsent();
  await flush();
  f.calls[0].resolve(live);
  await first;
  f.conversation.newChat();
  assert.equal(f.conversation.getSnapshot().remoteConsentGranted, false);
  assert.equal(f.conversation.getSnapshot().turns.length, 0);
  assert.equal(await f.conversation.sendChat('New', {}, 'problem'), 'consent');
  assert.deepEqual(f.conversation.getSnapshot().consent!.request.history, []);
  assert.equal(f.calls.length, 1);
});
test('motion requires focus/foreground and respects reduced motion, genuine pending and exact talk deadline', async (t) => {
  const f = fixture();
  t.after(() => f.conversation.dispose());
  await f.conversation.sendChat('Q', {}, 'problem');
  const p = f.conversation.confirmConsent();
  await flush();
  const lifecycle = { focused: true, foreground: true, reduced: false };
  assert.equal(
    deriveAmiPresentation(f.conversation.getSnapshot(), lifecycle, null, 0).motion,
    'thinking',
  );
  for (const focused of [true, false])
    for (const foreground of [true, false])
      for (const reduced of [true, false])
        assert.equal(
          deriveAmiPresentation(
            f.conversation.getSnapshot(),
            { focused, foreground, reduced },
            null,
            0,
          ).active,
          focused && foreground && !reduced,
        );
  f.calls[0].resolve(live);
  await p;
  const id = f.conversation.getSnapshot().turns[0].answers[0].id;
  assert.equal(
    deriveAmiPresentation(
      f.conversation.getSnapshot(),
      lifecycle,
      { id, receivedAt: 10 },
      10 + AMI_REPLY_TALK_MS - 1,
    ).motion,
    'talk',
  );
  assert.equal(
    deriveAmiPresentation(
      f.conversation.getSnapshot(),
      lifecycle,
      { id, receivedAt: 10 },
      10 + AMI_REPLY_TALK_MS,
    ).motion,
    'idle',
  );
});
