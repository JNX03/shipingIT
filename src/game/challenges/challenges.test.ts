import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeCatalog, isChallengeUnlocked } from './catalog';
import { applyChallengeAction, checkChallenge, initialChallengeDraft } from './logic';
import { CHALLENGE_STORAGE_KEY, challengeXP, createChallengeStore } from './create-store';
import type { Challenge, ChallengeAction, ChallengeDraft } from './model';

function solve(challenge: Challenge): ChallengeAction[] {
  const actions: ChallengeAction[] = [];
  if (challenge.kind === 'repair') actions.push({ type: 'run' });
  if (challenge.kind === 'interview') {
    if (challenge.id === 'explore-library-handoff' || challenge.id === 'explore-club-room') {
      for (const question of [
        'What happened last time?',
        'What happened after that?',
        'What still needs checking?',
      ])
        actions.push({ type: 'ask', question });
    } else {
      actions.push({
        type: 'ask',
        question: challenge.id.includes('last')
          ? 'What happened last time?'
          : 'How do you handle this now?',
      });
      actions.push({
        type: 'ask',
        question: challenge.id.includes('last')
          ? 'What happened after that?'
          : 'What is hard about that process?',
      });
    }
  }
  if (challenge.kind === 'pack') {
    for (const item of challenge.items.filter((entry) => entry.required))
      actions.push({ type: 'pack', item: item.id });
  } else {
    for (const item of challenge.items)
      actions.push({ type: 'place', item: item.id, target: item.target! });
  }
  if (challenge.needsSize) actions.push({ type: 'size', value: 48 });
  if (challenge.needsContrast) actions.push({ type: 'contrast', value: true });
  if (['layout', 'wire', 'repair'].includes(challenge.kind)) actions.push({ type: 'run' });
  return actions;
}

function perform(challenge: Challenge, actions = solve(challenge)): ChallengeDraft {
  return actions.reduce(
    (draft, action) => applyChallengeAction(challenge, draft, action),
    initialChallengeDraft(challenge),
  );
}

test('all 24 authored challenges are playable and gated in sequence', () => {
  assert.equal(challengeCatalog.length, 24);
  assert.deepEqual(
    challengeCatalog.slice(0, 12).map((entry) => entry.id),
    [
      'explore-last-time',
      'explore-workaround',
      'insight-observation',
      'insight-cause',
      'scope-lunch',
      'scope-library',
      'design-thumb',
      'design-readable',
      'connect-report',
      'connect-recovery',
      'launch-stale',
      'launch-access',
    ],
  );
  const counts = new Map<string, number>();
  const completed: Record<string, string> = {};
  for (const [index, challenge] of challengeCatalog.entries()) {
    counts.set(challenge.stage, (counts.get(challenge.stage) ?? 0) + 1);
    assert.equal(challenge.reward, 25);
    assert.equal(isChallengeUnlocked(challenge.id, completed), true);
    if (index + 1 < challengeCatalog.length)
      assert.equal(isChallengeUnlocked(challengeCatalog[index + 1].id, completed), false);
    assert.equal(checkChallenge(challenge, initialChallengeDraft(challenge)).valid, false);
    assert.equal(checkChallenge(challenge, perform(challenge)).valid, true, challenge.id);
    completed[challenge.id] = '2026-09-29T00:00:00.000Z';
  }
  assert.deepEqual([...counts.values()], [4, 4, 4, 4, 4, 4]);
  assert.equal(challengeXP({ completed }), 600);
});

test('testers reject stale builds and require an actual repair rerun', () => {
  const repair = challengeCatalog.find((item) => item.id === 'launch-stale')!;
  const initial = initialChallengeDraft(repair);
  assert.equal(
    applyChallengeAction(repair, initial, { type: 'place', item: 'submit', target: 'save' }),
    initial,
  );
  const broken = applyChallengeAction(repair, initial, { type: 'run' });
  assert.equal(broken.failedRuns, 1);
  assert.equal(broken.tests?.passed, false);
  const fixed = solve(repair)
    .slice(1, -1)
    .reduce((draft, action) => applyChallengeAction(repair, draft, action), broken);
  assert.equal(checkChallenge(repair, fixed).valid, false);
  assert.equal(
    checkChallenge(repair, applyChallengeAction(repair, fixed, { type: 'run' })).valid,
    true,
  );
});

test('progress persists separately, recovers, and awards only once', async () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const first = createChallengeStore(storage, () => new Date('2026-09-29T12:00:00.000Z'));
  await first.getState().hydrate();
  assert.equal(first.getState().finish(challengeCatalog[1].id).valid, false);
  for (const action of solve(challengeCatalog[0]))
    first.getState().act(challengeCatalog[0].id, action);
  assert.deepEqual(first.getState().finish(challengeCatalog[0].id), {
    valid: true,
    message: 'Interview notes are pinned. Ready to keep your progress.',
    earned: 25,
  });
  assert.equal(first.getState().finish(challengeCatalog[0].id).earned, 0);
  await first.getState().flush();
  assert.equal(data.has(CHALLENGE_STORAGE_KEY), true);
  assert.equal(data.has('shipingit:adventure:v1'), false);
  const reopened = createChallengeStore(storage, () => new Date('2026-09-30T00:00:00.000Z'));
  await reopened.getState().hydrate();
  assert.equal(challengeXP(reopened.getState()), 25);
  assert.equal(isChallengeUnlocked(challengeCatalog[1].id, reopened.getState().completed), true);
});

test('stale practice state refreshes verified completions and next-challenge unlocks', async () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
  const stale = createChallengeStore(storage, () => new Date('2026-09-29T12:00:00.000Z'));
  const current = createChallengeStore(storage, () => new Date('2026-09-29T12:00:00.000Z'));
  await Promise.all([stale.getState().hydrate(), current.getState().hydrate()]);
  for (const action of solve(challengeCatalog[0])) current.getState().act(challengeCatalog[0].id, action);
  current.getState().finish(challengeCatalog[0].id);
  await current.getState().flush();

  await stale.getState().refreshFromStorage();

  assert.equal(challengeXP(stale.getState()), 25);
  assert.equal(isChallengeUnlocked(challengeCatalog[1].id, stale.getState().completed), true);
});

test('corrupted completion proof cannot grant Sparks', async () => {
  const storage = {
    getItem: async () =>
      JSON.stringify({
        version: 1,
        histories: {},
        proofs: { [challengeCatalog[0].id]: { at: '2026-09-29T12:00:00.000Z', actions: [] } },
      }),
    setItem: async () => {},
  };
  const store = createChallengeStore(storage, () => new Date('2026-09-30T00:00:00.000Z'));
  await store.getState().hydrate();
  assert.equal(challengeXP(store.getState()), 0);
  assert.equal(isChallengeUnlocked(challengeCatalog[1].id, store.getState().completed), false);
});

test('failed device writes remain retryable without losing the earned completion', async () => {
  let fail = true;
  const saved = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => saved.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      if (fail) throw new Error('temporary storage failure');
      saved.set(key, value);
    },
  };
  const store = createChallengeStore(storage, () => new Date('2026-09-29T12:00:00.000Z'));
  await store.getState().hydrate();
  for (const action of solve(challengeCatalog[0]))
    store.getState().act(challengeCatalog[0].id, action);
  assert.equal(store.getState().finish(challengeCatalog[0].id).earned, 25);
  await store.getState().flush();
  assert.ok(store.getState().saveError);
  assert.equal(challengeXP(store.getState()), 25);
  fail = false;
  await store.getState().retry();
  assert.equal(store.getState().saveError, null);
  const reopened = createChallengeStore(storage, () => new Date('2026-09-30T00:00:00.000Z'));
  await reopened.getState().hydrate();
  assert.equal(challengeXP(reopened.getState()), 25);
});

test('reset clears practice Sparks and drafts durably', async () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => saved.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const store = createChallengeStore(storage, () => new Date('2026-09-29T12:00:00.000Z'));
  await store.getState().hydrate();
  for (const action of solve(challengeCatalog[0]))
    store.getState().act(challengeCatalog[0].id, action);
  store.getState().finish(challengeCatalog[0].id);
  await store.getState().reset();
  assert.equal(challengeXP(store.getState()), 0);
  assert.deepEqual(store.getState().drafts, {});
  const reopened = createChallengeStore(storage, () => new Date('2026-09-30T00:00:00.000Z'));
  await reopened.getState().hydrate();
  assert.equal(challengeXP(reopened.getState()), 0);
  assert.equal(isChallengeUnlocked(challengeCatalog[1].id, reopened.getState().completed), false);
});

test('reset refuses an unsupported save version without overwriting it', async () => {
  const original = JSON.stringify({ version: 2, important: 'future progress' });
  let written = false;
  const store = createChallengeStore({
    getItem: async () => original,
    setItem: async () => {
      written = true;
    },
  });
  await assert.rejects(store.getState().reset());
  assert.equal(written, false);
  assert.ok(store.getState().saveError);
});

test('failed reset reports the write failure and retry persists the empty state', async () => {
  let fail = false;
  const saved = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => saved.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      if (fail) throw new Error('device unavailable');
      saved.set(key, value);
    },
  };
  const store = createChallengeStore(storage, () => new Date('2026-09-29T12:00:00.000Z'));
  await store.getState().hydrate();
  for (const action of solve(challengeCatalog[0]))
    store.getState().act(challengeCatalog[0].id, action);
  store.getState().finish(challengeCatalog[0].id);
  await store.getState().flush();
  fail = true;
  await assert.rejects(store.getState().reset());
  assert.equal(challengeXP(store.getState()), 0);
  assert.ok(store.getState().saveError);
  fail = false;
  await store.getState().retry();
  const reopened = createChallengeStore(storage, () => new Date('2026-09-30T00:00:00.000Z'));
  await reopened.getState().hydrate();
  assert.equal(challengeXP(reopened.getState()), 0);
});
