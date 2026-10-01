import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyBuddyDraft, STUDY_MESSAGE_LIMIT } from './model';
import {
  authoredStudyService,
  createStudyRequest,
  createStudySessionController,
  type StudyGuideService,
  type StudyResponse,
} from './service';
import {
  buildStudyMentorRequest,
  createStudyMentorAdapter,
  type StudyMentorRequest,
} from './mentor-adapter';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('local Ask, Reply and three Hint actions produce a real authored conversation and learner feedback', async () => {
  const controller = createStudySessionController(createStudyBuddyDraft());
  assert.equal(await controller.send('ask', 'How do I start?'), true);
  assert.match(
    controller.getSnapshot().messages.at(-1)!.text,
    /cannot generate a subject-specific answer/,
  );
  assert.equal(await controller.send('reply', '3x = 15'), true);
  assert.equal(controller.getSnapshot().check!.kind, 'different');
  for (let index = 0; index < 3; index++) {
    assert.equal(await controller.send('hint'), true);
    assert.equal(controller.getSnapshot().hintCount, index + 1);
    assert.equal(controller.getSnapshot().messages.at(-1)!.hintIndex, index);
  }
  const before = controller.getSnapshot();
  assert.equal(await controller.send('hint'), false);
  assert.equal(controller.getSnapshot(), before);
  const hint = before.messages.at(-1)!;
  controller.recordHintFeedback(hint.id, 'helped');
  assert.equal(controller.getSnapshot().messages.at(-1)!.feedback, 'helped');
  controller.recordHintFeedback(0, 'gave-answer');
  assert.equal(controller.getSnapshot().messages[0].feedback, undefined);
  assert.ok(controller.getSnapshot().messages.every((message) => message.source !== 'ai'));
  controller.dispose();
});

test('pending requests reject rapid double-send and reset cancels late responses', async () => {
  const pending = deferred<StudyResponse>();
  let calls = 0;
  let signal: AbortSignal | undefined;
  const service: StudyGuideService = {
    respond: (_request, currentSignal) => {
      calls++;
      signal = currentSignal;
      return pending.promise;
    },
  };
  const controller = createStudySessionController(createStudyBuddyDraft(), service);
  const first = controller.send('ask', 'First question');
  assert.equal(controller.getSnapshot().status, 'pending');
  assert.equal(await controller.send('ask', 'Duplicate'), false);
  assert.equal(calls, 1);
  controller.reset();
  assert.equal(signal!.aborted, true);
  assert.equal(await first, false);
  pending.resolve({ source: 'ai', text: 'Stale response' });
  await Promise.resolve();
  assert.equal(controller.getSnapshot().messages.length, 1);
  assert.equal(controller.getSnapshot().status, 'idle');
  controller.dispose();
});

test('failure preserves successful chat, removes failed turn and allows exact retry', async () => {
  let fail = true;
  const service: StudyGuideService = {
    async respond(request) {
      if (fail) throw new Error('Unavailable');
      return authoredStudyService.respond(request);
    },
  };
  const controller = createStudySessionController(createStudyBuddyDraft(), service);
  assert.equal(await controller.send('ask', 'My draft question'), false);
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().messages.length, 1);
  fail = false;
  assert.equal(await controller.send('ask', 'My draft question'), true);
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(
    controller.getSnapshot().messages.filter((message) => message.text === 'My draft question')
      .length,
    1,
  );
  controller.dispose();
});

test('timeout and disposal cancel work without accepting late or disposed updates', async () => {
  let signal: AbortSignal | undefined;
  const controller = createStudySessionController(
    createStudyBuddyDraft(),
    {
      respond: (_request, currentSignal) => {
        signal = currentSignal;
        return new Promise(() => {});
      },
    },
    { timeoutMs: 5 },
  );
  assert.equal(await controller.send('ask', 'Question'), false);
  assert.equal(signal!.aborted, true);
  assert.equal(controller.getSnapshot().status, 'error');
  const pending = controller.send('ask', 'Retry');
  controller.dispose();
  assert.equal(await pending, false);
  const snapshot = controller.getSnapshot();
  assert.equal(await controller.send('hint'), false);
  assert.equal(controller.getSnapshot(), snapshot);
});

test('a leaking authored edit or service hint is never appended as a guide message', async () => {
  const draft = createStudyBuddyDraft();
  draft.hints[0] = 'The answer is 5.';
  let calls = 0;
  const leaking: StudyGuideService = {
    async respond() {
      calls++;
      return { source: 'ai', text: 'x = 5', hintIndex: 0 };
    },
  };
  const edited = createStudySessionController(draft, leaking);
  assert.equal(await edited.send('hint'), false);
  assert.equal(calls, 0);
  edited.dispose();
  const live = createStudySessionController(createStudyBuddyDraft(), leaking);
  assert.equal(await live.send('hint'), false);
  assert.equal(live.getSnapshot().hintCount, 0);
  assert.equal(live.getSnapshot().messages.length, 1);
  live.dispose();
});

test('empty input and bounded session prevent unbounded chat growth', async () => {
  const controller = createStudySessionController(createStudyBuddyDraft());
  assert.equal(await controller.send('reply', ' '), false);
  for (let index = 0; index < 30; index++) await controller.send('ask', `Question ${index}`);
  assert.ok(controller.getSnapshot().messages.length <= STUDY_MESSAGE_LIMIT);
  assert.match(controller.getSnapshot().error!, /message limit/);
  controller.reset();
  assert.equal(controller.getSnapshot().messages.length, 1);
  assert.equal(await controller.send('reply', '5'), true);
  assert.equal(controller.getSnapshot().check!.kind, 'match');
  controller.dispose();
});

test('mentor adapter sends only explicit practice/chat, never local context, hints, expected answer or notebook', async () => {
  const draft = {
    ...createStudyBuddyDraft(),
    learnerContext: 'PRIVATE_CONTEXT',
    expectedAnswer: 'PRIVATE_ANSWER',
    hints: ['PRIVATE_HINT_1', 'PRIVATE_HINT_2', 'PRIVATE_HINT_3'] as [string, string, string],
  };
  const request = createStudyRequest(draft, 'hint', '', 1);
  request.history = Array.from({ length: 8 }, (_, index) => ({
    question: `Q${index}`,
    answer: `A${index}`,
  }));
  const payload = buildStudyMentorRequest(request);
  assert.equal(payload.intent, 'hint');
  assert.equal(payload.hintLevel, 2);
  assert.equal(payload.history.length, 6);
  assert.deepEqual(payload.history[0], { question: 'Q2', answer: 'A2' });
  assert.equal(payload.attachProject, false);
  assert.deepEqual(payload.project, {});
  assert.ok(!JSON.stringify(payload).includes('PRIVATE'));
  let received: StudyMentorRequest | undefined;
  const adapter = createStudyMentorAdapter(async (value) => {
    received = value;
    return { mode: 'live', message: 'What would undo the addition?' };
  });
  assert.equal(received, undefined, 'adapter creation must not call the service');
  const response = await adapter.respond(request);
  assert.deepEqual(received, payload);
  assert.equal(response.source, 'ai');
  assert.equal(response.hintIndex, 1);
});

test('unavailable mentor is explicitly authored and combined oversized prompts are rejected before remote call', async () => {
  const request = createStudyRequest(createStudyBuddyDraft(), 'ask', 'How do I start?', 0);
  const adapter = createStudyMentorAdapter(async () => ({
    mode: 'offline',
    message: 'A backend fallback must not look live.',
  }));
  const response = await adapter.respond(request);
  assert.equal(response.source, 'authored');
  assert.match(response.text, /Live AI is unavailable.*authored practice/);
  const long = { ...request, question: 'q'.repeat(1200), text: 't'.repeat(1200) };
  assert.throws(() => buildStudyMentorRequest(long), /exceed/);
});

test('completed history is limited to six turns and excludes the pending current message', async () => {
  const captured: string[] = [];
  const controller = createStudySessionController(createStudyBuddyDraft(), {
    async respond(request) {
      captured.push(JSON.stringify(request.history));
      return authoredStudyService.respond(request);
    },
  });
  for (let index = 0; index < 8; index++) await controller.send('ask', `Typed question ${index}`);
  const last = JSON.parse(captured.at(-1)!);
  assert.equal(last.length, 6);
  assert.equal(last[0].question, 'Typed question 1');
  assert.equal(last.at(-1).question, 'Typed question 6');
  assert.ok(!captured.at(-1)!.includes('Typed question 7'));
  controller.dispose();
});
