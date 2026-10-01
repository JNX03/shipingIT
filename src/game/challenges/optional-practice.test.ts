import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { practiceCatalog, practiceSkills } from '../practice/catalog';
import { practiceFeedback } from '../practice/feedback';
import {
  createPracticeSession,
  OPTIONAL_PRACTICE_STORAGE_KEY,
  PRACTICE_ACTION_LIMIT,
} from '../practice/session';
import { challengeCatalog } from './catalog';
import { initialChallengeDraft } from './logic';
import { interviewQuestionIdeas } from './registry';
import type { Challenge, ChallengeAction } from './model';

function solution(challenge: Challenge): ChallengeAction[] {
  const actions: ChallengeAction[] = [];
  if (challenge.kind === 'repair') actions.push({ type: 'run' });
  if (challenge.kind === 'interview')
    for (const question of interviewQuestionIdeas(challenge))
      actions.push({ type: 'ask', question, replyVersion: 2 });
  if (challenge.kind === 'pack')
    for (const item of challenge.items.filter((item) => item.required))
      actions.push({ type: 'pack', item: item.id });
  else
    for (const item of challenge.items)
      actions.push({ type: 'place', item: item.id, target: item.target! });
  if (challenge.needsSize) actions.push({ type: 'size', value: 48 });
  if (challenge.needsContrast) actions.push({ type: 'contrast', value: true });
  return actions;
}

function storage() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  let failRead = false,
    failWrite = false;
  return {
    values,
    writes,
    failRead: (value: boolean) => {
      failRead = value;
    },
    failWrite: (value: boolean) => {
      failWrite = value;
    },
    getItem: async (key: string) => {
      if (failRead) throw new Error('offline');
      return values.get(key) ?? null;
    },
    setItem: async (key: string, value: string) => {
      writes.push(key);
      if (failWrite) throw new Error('full');
      values.set(key, value);
    },
  };
}

test('all six families are freely playable copies, with no catalog reward changes', async () => {
  const before = JSON.stringify(challengeCatalog);
  const disk = storage();
  disk.values.set('shipingit:practice:v1', 'real-earned-practice');
  disk.values.set('shipingit:adventure:v3', 'real-notebook');
  const practice = createPracticeSession(disk);
  await practice.hydrate();
  assert.equal(practiceSkills.length, 6);
  assert.equal(practiceCatalog.length, 24);
  assert.deepEqual(
    new Set(practiceCatalog.map((entry) => entry.kind)),
    new Set(practiceSkills.map((entry) => entry.kind)),
  );
  for (const challenge of practiceCatalog) {
    assert.equal(challenge.reward, 0);
    assert.equal(challenge.prerequisite, null);
    assert.equal(practice.anotherAttempt(challenge.id), false);
    assert.equal(practice.check(challenge.id)?.valid, false, challenge.id);
    for (const action of solution(challenge)) practice.act(challenge.id, action);
    const result = practice.check(challenge.id)!;
    assert.equal(result.valid, true, challenge.id);
    assert.equal(result.earned, 0);
    assert.ok(result.rows.length);
    assert.ok(
      result.rows.every((row) => row.passed),
      `${challenge.id}: ${JSON.stringify(result.rows)}`,
    );
  }
  await practice.flush();
  assert.deepEqual(new Set(disk.writes), new Set([OPTIONAL_PRACTICE_STORAGE_KEY]));
  assert.equal(disk.values.get('shipingit:practice:v1'), 'real-earned-practice');
  assert.equal(disk.values.get('shipingit:adventure:v3'), 'real-notebook');
  assert.equal(JSON.stringify(challengeCatalog), before);
});

test('repeat attempts preserve the previous draft and never award rewards', async () => {
  const disk = storage(),
    practice = createPracticeSession(disk);
  await practice.hydrate();
  const challenge = practiceCatalog.find((entry) => entry.kind === 'sort')!;
  for (let attempt = 1; attempt <= 5; attempt++) {
    for (const action of solution(challenge)) practice.act(challenge.id, action);
    assert.equal(practice.check(challenge.id)?.earned, 0);
    assert.equal(practice.anotherAttempt(challenge.id), true);
    assert.equal(practice.getSnapshot().sessions[challenge.id].attempt, attempt + 1);
  }
  await practice.flush();
  const saved = JSON.parse(disk.values.get(OPTIONAL_PRACTICE_STORAGE_KEY)!);
  assert.equal(saved.sessions[challenge.id].previous.length, 2);
  assert.ok(
    saved.sessions[challenge.id].previous.every(
      (entry: { actions: unknown[] }) => entry.actions.length > 0,
    ),
  );
  const restored = createPracticeSession(disk);
  await restored.hydrate();
  assert.equal(restored.getSnapshot().sessions[challenge.id].attempt, 6);
  assert.deepEqual(
    restored.getSnapshot().sessions[challenge.id].draft,
    initialChallengeDraft(challenge),
  );
  assert.equal(restored.check(challenge.id)?.valid, false);
});

test('a persisted check is replayed and becomes invalid after a new edit', async () => {
  const disk = storage(),
    practice = createPracticeSession(disk);
  await practice.hydrate();
  const challenge = practiceCatalog.find((entry) => entry.kind === 'wire')!;
  for (const action of solution(challenge)) practice.act(challenge.id, action);
  assert.equal(practice.check(challenge.id)?.valid, true);
  await practice.flush();
  const restored = createPracticeSession(disk);
  await restored.hydrate();
  const session = restored.getSnapshot().sessions[challenge.id];
  assert.equal(session.checked, true);
  assert.equal(practiceFeedback(challenge, session.draft).valid, true);
  restored.act(challenge.id, { type: 'unplace', item: challenge.items[0].id });
  const edited = restored.getSnapshot().sessions[challenge.id];
  assert.equal(edited.checked, false);
  assert.equal(edited.draft.tests, null);
  assert.equal(practiceFeedback(challenge, edited.draft).valid, false);
});

test('failed reads and malformed saves stay untouched until a successful retry', async () => {
  for (const raw of [
    'broken',
    '{"version":2,"sessions":{}}',
    '{"version":1,"sessions":{"insight-observation":{"actions":[{"type":"cheat"}],"attempt":1,"previous":[]}}}',
    '{"version":1,"sessions":{"future-exercise":{"actions":[],"checked":false,"attempt":1,"previous":[]}}}',
  ]) {
    const disk = storage();
    disk.values.set(OPTIONAL_PRACTICE_STORAGE_KEY, raw);
    const practice = createPracticeSession(disk);
    await practice.hydrate();
    assert.equal(practice.getSnapshot().protected, true);
    assert.equal(practice.check('insight-observation'), null);
    assert.equal(
      practice.act('insight-observation', { type: 'place', item: 'wait', target: 'observed' }),
      false,
    );
    assert.equal(disk.writes.length, 0);
    assert.equal(disk.values.get(OPTIONAL_PRACTICE_STORAGE_KEY), raw);
    disk.values.set(OPTIONAL_PRACTICE_STORAGE_KEY, '{"version":1,"sessions":{}}');
    await practice.retry();
    assert.equal(practice.getSnapshot().protected, false);
  }
  const disk = storage();
  disk.failRead(true);
  const practice = createPracticeSession(disk);
  await practice.hydrate();
  assert.equal(practice.getSnapshot().protected, true);
  disk.failRead(false);
  await practice.retry();
  assert.equal(practice.getSnapshot().protected, false);
});

test('write failures keep the in-memory draft and retry saves the same work', async () => {
  const disk = storage(),
    practice = createPracticeSession(disk);
  await practice.hydrate();
  disk.failWrite(true);
  practice.act('insight-observation', { type: 'place', item: 'wait', target: 'observed' });
  await practice.flush();
  assert.ok(practice.getSnapshot().saveError);
  assert.equal(
    practice.getSnapshot().sessions['insight-observation'].draft.assignments.wait,
    'observed',
  );
  disk.failWrite(false);
  await practice.retry();
  assert.equal(practice.getSnapshot().saveError, null);
  const restored = createPracticeSession(disk);
  await restored.hydrate();
  assert.equal(
    restored.getSnapshot().sessions['insight-observation'].draft.assignments.wait,
    'observed',
  );
});

test('expected versus actual feedback identifies the incorrect piece and preserves repair gates', async () => {
  const disk = storage(),
    practice = createPracticeSession(disk);
  await practice.hydrate();
  practice.act('insight-observation', { type: 'place', item: 'wait', target: 'assumed' });
  const row = practice
    .check('insight-observation')!
    .rows.find((row) => row.title === 'Three students waited')!;
  assert.equal(row.expected, 'Observed');
  assert.equal(row.actual, 'Assumed');
  assert.equal(row.passed, false);
  assert.equal(
    practice.act('launch-stale', { type: 'place', item: 'submit', target: 'save' }),
    false,
  );
  assert.equal(practice.check('launch-stale')?.valid, false);
  assert.equal(practice.getSnapshot().sessions['launch-stale'].draft.failedRuns, 1);
  assert.equal(
    practice.act('launch-stale', { type: 'place', item: 'submit', target: 'save' }),
    true,
  );
});

test('untrusted checked flags cannot make incomplete actions pass', async () => {
  const disk = storage();
  disk.values.set(
    OPTIONAL_PRACTICE_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions: { 'connect-report': { attempt: 1, actions: [], checked: true, previous: [] } },
      completed: { 'connect-report': 'fake' },
      earned: 100000,
    }),
  );
  const practice = createPracticeSession(disk);
  await practice.hydrate();
  const challenge = practiceCatalog.find((entry) => entry.id === 'connect-report')!;
  assert.equal(
    practiceFeedback(challenge, practice.getSnapshot().sessions[challenge.id].draft).valid,
    false,
  );
  assert.equal(practice.anotherAttempt(challenge.id), false);
  assert.equal('completed' in practice.getSnapshot(), false);
});

test('long interviews stay replayable and bounded; oversized saves are protected', async () => {
  const disk = storage(),
    practice = createPracticeSession(disk);
  await practice.hydrate();
  const challenge = practiceCatalog.find((entry) => entry.kind === 'interview')!;
  for (const action of solution(challenge)) practice.act(challenge.id, action);
  for (let index = 0; index < 900; index++)
    practice.act(challenge.id, {
      type: 'ask',
      question: 'What happened last time?',
      replyVersion: 2,
    });
  assert.equal(practice.check(challenge.id)?.valid, true);
  await practice.flush();
  const saved = JSON.parse(disk.values.get(OPTIONAL_PRACTICE_STORAGE_KEY)!);
  assert.ok(saved.sessions[challenge.id].actions.length < 50);
  const restored = createPracticeSession(disk);
  await restored.hydrate();
  assert.equal(
    practiceFeedback(challenge, restored.getSnapshot().sessions[challenge.id].draft).valid,
    true,
  );
  disk.values.set(
    OPTIONAL_PRACTICE_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions: {
        [challenge.id]: {
          actions: Array(PRACTICE_ACTION_LIMIT + 1).fill({ type: 'run' }),
          checked: true,
          attempt: 1,
          previous: [],
        },
      },
    }),
  );
  const oversized = createPracticeSession(disk);
  await oversized.hydrate();
  assert.equal(oversized.getSnapshot().protected, true);
});

test('practice adapters have no dependency on earned stores, reward APIs, or Notebook writes', () => {
  for (const name of ['session.ts', 'runtime.ts', 'catalog.ts', 'feedback.ts']) {
    const source = readFileSync(new URL(`../practice/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /from ['"][^'"]*(?:challenge-store|create-store|app-store|profile-quests|\/store|mixed-path|state)['"]/,
    );
    assert.doesNotMatch(source, /\.finish\(|\.reset\(|addXP\(|recordCompletion\(/);
  }
});

test('serialized writes and flush retain the latest draft when storage is slow', async () => {
  const disk = storage();
  let release: (() => void) | undefined;
  let first = true;
  const practice = createPracticeSession({
    getItem: disk.getItem,
    setItem: async (key, value) => {
      if (first) {
        first = false;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      await disk.setItem(key, value);
    },
  });
  await practice.hydrate();
  practice.act('insight-observation', { type: 'place', item: 'wait', target: 'assumed' });
  await Promise.resolve();
  practice.act('insight-observation', { type: 'place', item: 'wait', target: 'observed' });
  let flushed = false;
  const flush = practice.flush().then(() => {
    flushed = true;
  });
  await Promise.resolve();
  assert.equal(flushed, false);
  assert.equal(practice.getSnapshot().saving, true);
  release!();
  await flush;
  assert.equal(practice.getSnapshot().saving, false);
  const restored = createPracticeSession(disk);
  await restored.hydrate();
  assert.equal(
    restored.getSnapshot().sessions['insight-observation'].draft.assignments.wait,
    'observed',
  );
});

test('an edit limit preserves the complete saved action prefix without changing other sessions', async () => {
  const disk = storage();
  const actions = Array.from({ length: PRACTICE_ACTION_LIMIT }, (_, index) => ({
    type: 'place',
    item: 'wait',
    target: index % 2 ? 'assumed' : 'observed',
  }));
  disk.values.set(
    OPTIONAL_PRACTICE_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions: { 'insight-observation': { actions, attempt: 1, checked: false, previous: [] } },
    }),
  );
  const practice = createPracticeSession(disk);
  await practice.hydrate();
  const before = practice.getSnapshot().sessions['insight-observation'].draft;
  assert.equal(
    practice.act('insight-observation', { type: 'place', item: 'wait', target: 'observed' }),
    false,
  );
  assert.equal(practice.getSnapshot().sessions['insight-observation'].draft, before);
  assert.equal(disk.writes.length, 0);
  assert.equal(
    practice.act('connect-report', { type: 'place', item: 'add', target: 'form' }),
    true,
  );
  await practice.flush();
  assert.equal(
    JSON.parse(disk.values.get(OPTIONAL_PRACTICE_STORAGE_KEY)!).sessions['insight-observation']
      .actions.length,
    PRACTICE_ACTION_LIMIT,
  );
});
