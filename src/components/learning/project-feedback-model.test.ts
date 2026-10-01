import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProjectDraftBuffer,
  createProjectFeedback,
  prepareProjectFeedback,
} from './project-feedback-model';
import type { ProjectExercise } from '../../domain/types';
import type { MentorResponse, AIProvider } from '../../services/contracts';
const exercise: ProjectExercise = {
  id: 'typed',
  type: 'project',
  prompt: 'Describe one observed problem.',
  context: 'A public classroom task.',
  explanation: 'EXPECTED_SECRET',
  hint: 'HINT_SECRET',
  fields: [
    { key: 'problem', label: 'Your observation', placeholder: 'PLACEHOLDER_SECRET', minLength: 20 },
  ],
};
const input = {
  lessonId: 'discover-2',
  lessonTitle: 'Find a problem',
  exercise,
  answer: { problem: 'Students wait in a long lunch queue.', interviews: 'NOTEBOOK_EXTRA_SECRET' },
};
const live: MentorResponse = {
  mode: 'live',
  message: 'Add one observable detail.',
  challenge: '',
  evidencePrompt: '',
  nextAction: 'Record how long the wait lasted.',
};
const flush = () => new Promise<void>((r) => setImmediate(r));
test('hundreds of keystrokes do not write persistence; explicit commit reads latest draft', () => {
  const d = createProjectDraftBuffer();
  let writes = 0;
  let saved = {};
  for (let i = 0; i < 200; i++) d.record('typed', { problem: 'text' + i });
  assert.equal(writes, 0);
  d.commit('typed', {}, (v) => {
    writes++;
    saved = v;
  });
  assert.equal(writes, 1);
  assert.deepEqual(saved, { problem: 'text199' });
});
test('failed save retains typed text and old exercise draft cannot overwrite the next exercise', () => {
  const d = createProjectDraftBuffer();
  d.record('a', { problem: 'Draft stays' });
  assert.throws(() =>
    d.commit('a', {}, () => {
      throw Error('disk');
    }),
  );
  assert.equal(d.read('a', {}).problem, 'Draft stays');
  assert.deepEqual(d.read('b', { targetUser: 'New field' }), { targetUser: 'New field' });
});
test('feedback includes only visible fields/public question; no expected answers or notebook extras', () => {
  const s = prepareProjectFeedback(input);
  const wire = JSON.stringify(s.request);
  assert.deepEqual(s.request.project, { problem: input.answer.problem });
  assert.equal(s.request.attachProject, true);
  assert.deepEqual(s.request.history, []);
  assert.equal(s.request.allowRemote, false);
  for (const secret of [
    'EXPECTED_SECRET',
    'HINT_SECRET',
    'NOTEBOOK_EXTRA_SECRET',
    'PLACEHOLDER_SECRET',
  ])
    assert.ok(!wire.includes(secret));
  assert.ok(Object.isFrozen(s.request.project));
  assert.match(s.request.prompt, /not a grade/);
});
test('review is immutable, explicit approval only, decline sends nothing', async (t) => {
  let calls = 0;
  const c = createProjectFeedback({
    async review(r) {
      calls++;
      assert.equal(r.allowRemote, true);
      assert.equal(r.project.problem, 'Students wait in a long lunch queue.');
      return live;
    },
  });
  t.after(() => c.dispose());
  const mutable = { ...input, answer: { ...input.answer } };
  c.requestReview(mutable);
  mutable.answer.problem = 'later';
  assert.equal(calls, 0);
  c.decline();
  assert.equal(await c.approve(), 'ignored');
  assert.equal(calls, 0);
  c.requestReview(input);
  assert.equal(await c.approve(), 'answered');
  assert.equal(calls, 1);
  assert.equal(c.getSnapshot().result!.message, live.message);
});
test('editing/blur cancels a pending advisory reply and ignores stale completion', async (t) => {
  let resolve!: (r: MentorResponse) => void;
  let signal: AbortSignal | undefined;
  const provider: AIProvider = {
    review(_r, s) {
      signal = s;
      return new Promise((r) => {
        resolve = r;
      });
    },
  };
  const c = createProjectFeedback(provider);
  t.after(() => c.dispose());
  c.requestReview(input);
  const p = c.approve();
  await flush();
  c.invalidate();
  assert.equal(await p, 'cancelled');
  assert.equal(signal!.aborted, true);
  resolve(live);
  await flush();
  assert.equal(c.getSnapshot().result, null);
  assert.equal(c.getSnapshot().snapshot, null);
});
test('duplicate approvals and unverified offline replies cannot act as connected feedback', async (t) => {
  let resolve!: (r: MentorResponse) => void;
  let calls = 0;
  const c = createProjectFeedback({
    review() {
      calls++;
      return new Promise((r) => {
        resolve = r;
      });
    },
  });
  t.after(() => c.dispose());
  c.requestReview(input);
  const p = c.approve();
  assert.equal(await c.approve(), 'ignored');
  await flush();
  resolve({ ...live, mode: 'offline' });
  assert.equal(await p, 'failed');
  assert.equal(calls, 1);
  assert.equal(c.getSnapshot().result, null);
});
test('feedback timeout settles without grading or changing the input', async (t) => {
  const c = createProjectFeedback(
    {
      review() {
        return new Promise(() => {});
      },
    },
    10,
  );
  t.after(() => c.dispose());
  c.requestReview(input);
  assert.equal(await c.approve(), 'failed');
  assert.equal(c.getSnapshot().snapshot!.request.project.problem, input.answer.problem);
  assert.equal(c.getSnapshot().busy, false);
  assert.ok(!('grade' in c.getSnapshot()));
});
