import assert from 'node:assert/strict';
import test from 'node:test';
import { challengeById, challengeCatalog, isChallengeUnlocked } from './catalog';
import { CHALLENGE_STORAGE_KEY, challengeXP, createChallengeStore } from './create-store';
import {
  applyChallengeAction,
  checkChallenge,
  compactInterviewActions,
  initialChallengeDraft,
  replayChallenge,
} from './logic';
import type { Challenge, ChallengeAction } from './model';
import { interviewQuestionIdeas } from './registry';

const clock = () => new Date('2026-09-30T08:00:00.000Z');
const unmatched = 'Could you explain quantum waffles?';
const guidedQuestions = [
  'What happened last time?',
  'What happened after that?',
  'What still needs checking?',
];
const ask = (question: string) => ({ type: 'ask', question, replyVersion: 2 }) as const;
const legacyUnmatched = (count: number): ChallengeAction[] =>
  Array.from({ length: count }, (_, index) => ({
    type: 'ask',
    question: `${unmatched} ${index + 1}`,
  }));

/** Existing authored solutions create genuine replayable prerequisite proofs in the fixture store. */
function solve(challenge: Challenge): ChallengeAction[] {
  const actions: ChallengeAction[] = [];
  if (challenge.kind === 'repair') actions.push({ type: 'run' });
  if (challenge.kind === 'interview') {
    const questions =
      challenge.id === 'explore-library-handoff' || challenge.id === 'explore-club-room'
        ? guidedQuestions
        : challenge.id.includes('last')
          ? ['What happened last time?', 'What happened after that?']
          : ['How do you handle this now?', 'What is hard about that process?'];
    // No marker reproduces the persisted v1 action format rather than rewriting old proofs.
    actions.push(...questions.map((question) => ({ type: 'ask' as const, question })));
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

type SavedPractice = {
  version: number;
  histories: Record<string, ChallengeAction[]>;
  proofs: Record<string, { at: string; actions: ChallengeAction[] }>;
};

async function persistedFixture(id: string, targetHistory: ChallengeAction[]) {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const original = createChallengeStore(storage, clock);
  await original.getState().hydrate();
  const targetIndex = challengeCatalog.findIndex((entry) => entry.id === id);
  assert.ok(targetIndex >= 0);
  for (const challenge of challengeCatalog.slice(0, targetIndex)) {
    assert.equal(isChallengeUnlocked(challenge.id, original.getState().completed), true);
    for (const action of solve(challenge)) original.getState().act(challenge.id, action);
    assert.equal(original.getState().finish(challenge.id).earned, 25, challenge.id);
  }
  assert.equal(isChallengeUnlocked(id, original.getState().completed), true);
  for (const action of targetHistory) original.getState().act(id, action);
  await original.getState().flush();
  const read = () => JSON.parse(data.get(CHALLENGE_STORAGE_KEY)!) as SavedPractice;
  const prefixProofs = read().proofs;
  const beforeXP = challengeXP(original.getState());
  const restored = createChallengeStore(storage, clock);
  await restored.getState().hydrate();
  return { restored, storage, read, prefixProofs, beforeXP };
}

for (const id of ['explore-library-handoff', 'explore-club-room']) {
  test(`${id}: a persisted 30-question dead end recovers and awards 25 Sparks only once`, async () => {
    const f = await persistedFixture(id, legacyUnmatched(30));
    const challenge = challengeById(id)!;
    const questions = interviewQuestionIdeas(challenge);
    assert.equal(questions.length, 3);
    assert.equal(f.read().version, 1);
    assert.equal(
      f.read().histories[id].length,
      30,
      'The fixture must actually start from saved 30 turns',
    );
    assert.equal(f.restored.getState().drafts[id].dialogue.length, 30);
    assert.equal(
      f.restored.getState().drafts[id].dialogue.some((line) => line.clue),
      false,
    );
    assert.equal(f.restored.getState().finish(id).earned, 0);
    for (const question of questions) f.restored.getState().act(id, ask(question));
    const discovered = new Set(f.restored.getState().drafts[id].dialogue.map((line) => line.clue));
    for (const item of challenge.items) {
      assert.equal(discovered.has(item.id), true, `Recovery must discover ${item.id}`);
      f.restored.getState().act(id, { type: 'place', item: item.id, target: item.target! });
    }
    assert.equal(checkChallenge(challenge, f.restored.getState().drafts[id]).valid, true);
    assert.equal(f.restored.getState().finish(id).earned, 25);
    assert.equal(f.restored.getState().finish(id).earned, 0);
    assert.equal(challengeXP(f.restored.getState()), f.beforeXP + 25);
    await f.restored.getState().flush();
    const saved = f.read();
    assert.equal(saved.version, 1);
    assert.ok(saved.histories[id].length <= 30 + 2 * challenge.items.length);
    assert.ok(saved.proofs[id].actions.length <= 30 + 2 * challenge.items.length);
    assert.equal(
      checkChallenge(challenge, replayChallenge(challenge, saved.proofs[id].actions)).valid,
      true,
    );
    for (const [prefixId, proof] of Object.entries(f.prefixProofs))
      assert.deepEqual(
        saved.proofs[prefixId],
        proof,
        'Earlier completion proofs must remain intact',
      );
    const completedAt = saved.proofs[id].at;
    const reopened = createChallengeStore(f.storage, clock);
    await reopened.getState().hydrate();
    assert.equal(reopened.getState().completed[id], completedAt);
    assert.equal(challengeXP(reopened.getState()), f.beforeXP + 25);
    for (const question of questions) reopened.getState().act(id, ask(question));
    assert.equal(
      reopened.getState().finish(id).earned,
      0,
      'Hydration and duplicate asks cannot farm Sparks',
    );
    await reopened.getState().flush();
    assert.equal(f.read().proofs[id].at, completedAt);
  });

  test(`${id}: the first clue survives more than 1000 later turns while the visible tail stays bounded`, () => {
    const challenge = challengeById(id)!;
    const questions = interviewQuestionIdeas(challenge);
    let draft = applyChallengeAction(
      challenge,
      initialChallengeDraft(challenge),
      ask(questions[0]),
    );
    const first = draft.dialogue.find((line) => line.clue === challenge.items[0].id)!;
    assert.ok(first);
    const tail: string[] = [];
    for (let index = 1; index <= 1005; index++) {
      const question = `${unmatched} ${index}`;
      tail.push(question);
      draft = applyChallengeAction(challenge, draft, ask(question));
      assert.ok(draft.dialogue.length <= 30 + challenge.items.length);
    }
    assert.deepEqual(
      draft.dialogue.find((line) => line.clue === first.clue),
      first,
    );
    assert.deepEqual(
      draft.dialogue.slice(-30).map((line) => line.question),
      tail.slice(-30),
    );
    for (const question of questions.slice(1))
      draft = applyChallengeAction(challenge, draft, ask(question));
    for (const item of challenge.items)
      draft = applyChallengeAction(challenge, draft, {
        type: 'place',
        item: item.id,
        target: item.target!,
      });
    assert.equal(checkChallenge(challenge, draft).valid, true);
  });
}

for (const id of ['explore-library-handoff', 'explore-club-room']) {
  test(`${id}: saved 30 turns recover through hints, 1000 more turns, reload and one award`, async () => {
    const challenge = challengeById(id)!;
    const questions = interviewQuestionIdeas(challenge);
    const f = await persistedFixture(id, legacyUnmatched(30));
    assert.equal(f.read().histories[id].length, 30);
    const state = f.restored.getState();
    state.act(id, ask(questions[0]));
    state.act(id, {
      type: 'place',
      item: challenge.items[0].id,
      target: challenge.items[0].target!,
    });
    for (let index = 1; index <= 1005; index++) state.act(id, ask(`${unmatched} ${index}`));
    assert.equal(f.restored.getState().drafts[id].dialogue.at(-1)?.question, `${unmatched} 1005`);
    assert.equal(
      f.restored.getState().drafts[id].assignments[challenge.items[0].id],
      challenge.items[0].target,
    );
    for (const question of questions.slice(1)) state.act(id, ask(question));
    for (const item of challenge.items)
      state.act(id, { type: 'place', item: item.id, target: item.target! });
    assert.equal(state.finish(id).earned, 25);
    assert.equal(state.finish(id).earned, 0);
    await state.flush();
    const completed = f.read().proofs[id];
    assert.ok(f.read().histories[id].length <= 36);
    assert.ok(completed.actions.length <= 36);
    assert.equal(
      checkChallenge(challenge, replayChallenge(challenge, completed.actions)).valid,
      true,
    );
    const recovered = createChallengeStore(f.storage, clock);
    await recovered.getState().hydrate();
    assert.equal(challengeXP(recovered.getState()), f.beforeXP + 25);
    assert.deepEqual(recovered.getState().drafts[id], f.restored.getState().drafts[id]);
    for (const question of questions) recovered.getState().act(id, ask(question));
    assert.equal(recovered.getState().finish(id).earned, 0);
    await recovered.getState().flush();
    assert.deepEqual(f.read().proofs[id], completed);
    // Current draft edits may be incomplete; the separately stored successful proof remains authoritative.
    const editing = recovered.getState();
    editing.act(id, { type: 'unplace', item: challenge.items[0].id });
    for (let index = 1; index <= 40; index++) editing.act(id, ask(`${unmatched} again ${index}`));
    assert.equal(editing.finish(id).valid, false);
    await editing.flush();
    assert.deepEqual(f.read().proofs[id], completed);
    const reopened = createChallengeStore(f.storage, clock);
    await reopened.getState().hydrate();
    assert.equal(challengeXP(reopened.getState()), f.beforeXP + 25);
    assert.equal(reopened.getState().drafts[id].assignments[challenge.items[0].id], undefined);
  });
}

test('a literal legacy 1000-action incomplete history recovers without resetting prerequisite proofs', async () => {
  const id = 'explore-library-handoff';
  const challenge = challengeById(id)!;
  const f = await persistedFixture(id, []);
  const saved = f.read();
  const oldHistory: ChallengeAction[] = [
    ...legacyUnmatched(30),
    ...Array.from({ length: 970 }, () => ({
      type: 'unplace' as const,
      item: challenge.items[0].id,
    })),
  ];
  // These are accepted v1 actions: empty-board unplace was repeatable in the old implementation.
  let original = initialChallengeDraft(challenge);
  for (const action of oldHistory) {
    const next = applyChallengeAction(challenge, original, action);
    assert.notEqual(next, original);
    original = next;
  }
  saved.histories[id] = oldHistory;
  await f.storage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(saved));
  assert.equal(f.read().histories[id].length, 1000);
  const restored = createChallengeStore(f.storage, clock);
  await restored.getState().hydrate();
  for (const question of interviewQuestionIdeas(challenge))
    restored.getState().act(id, ask(question));
  for (const item of challenge.items)
    restored.getState().act(id, { type: 'place', item: item.id, target: item.target! });
  assert.equal(restored.getState().finish(id).earned, 25);
  await restored.getState().flush();
  assert.ok(f.read().histories[id].length <= 36);
  for (const [prefixId, proof] of Object.entries(f.prefixProofs))
    assert.deepEqual(f.read().proofs[prefixId], proof);
  const reopened = createChallengeStore(f.storage, clock);
  await reopened.getState().hydrate();
  assert.equal(challengeXP(reopened.getState()), f.beforeXP + 25);
  assert.equal(reopened.getState().finish(id).earned, 0);
});

test('a validated legacy 1000-action completed prefix keeps its original proof and timestamp', async () => {
  const id = 'explore-library-handoff';
  const f = await persistedFixture(id, []);
  const saved = f.read();
  const prefix = challengeCatalog[0];
  const originalProof = saved.proofs[prefix.id];
  const oldActions = [...originalProof.actions];
  while (oldActions.length < 1000) {
    oldActions.push({ type: 'unplace', item: prefix.items[0].id });
    oldActions.push({ type: 'place', item: prefix.items[0].id, target: prefix.items[0].target! });
  }
  assert.equal(oldActions.length, 1000);
  assert.equal(checkChallenge(prefix, replayChallenge(prefix, oldActions)).valid, true);
  const oldProof = { at: originalProof.at, actions: oldActions };
  saved.proofs[prefix.id] = oldProof;
  await f.storage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(saved));
  const restored = createChallengeStore(f.storage, clock);
  await restored.getState().hydrate();
  assert.equal(challengeXP(restored.getState()), f.beforeXP);
  assert.equal(restored.getState().completed[prefix.id], oldProof.at);
  const challenge = challengeById(id)!;
  for (const question of interviewQuestionIdeas(challenge))
    restored.getState().act(id, ask(question));
  for (const item of challenge.items)
    restored.getState().act(id, { type: 'place', item: item.id, target: item.target! });
  assert.equal(restored.getState().finish(id).earned, 25);
  await restored.getState().flush();
  assert.deepEqual(f.read().proofs[prefix.id], oldProof);
  assert.equal(f.read().version, 1);
  assert.equal(challengeXP(restored.getState()), f.beforeXP + 25);
});

test('old prefix proofs and repeated ambiguous legacy asks retain their original clue order', async () => {
  const id = 'explore-library-handoff';
  const challenge = challengeById(id)!;
  const ambiguous = 'What happened last time and what happened after that?';
  const legacy: ChallengeAction[] = [
    { type: 'ask', question: ambiguous },
    { type: 'ask', question: ambiguous },
    { type: 'ask', question: guidedQuestions[2] },
    ...challenge.items.map((item) => ({
      type: 'place' as const,
      item: item.id,
      target: item.target!,
    })),
  ];
  const replayed = replayChallenge(challenge, legacy);
  assert.deepEqual(
    replayed.dialogue.map((line) => line.clue),
    challenge.items.map((item) => item.id),
  );
  const unknownVersion = legacy.map((action) =>
    action.type === 'ask' ? { ...action, replyVersion: 999 } : action,
  ) as ChallengeAction[];
  assert.deepEqual(replayChallenge(challenge, unknownVersion), replayed);
  const f = await persistedFixture(id, legacy);
  assert.equal(f.restored.getState().finish(id).earned, 25);
  await f.restored.getState().flush();
  const saved = f.read();
  assert.equal(
    saved.proofs[id].actions.filter(
      (action) => action.type === 'ask' && action.question === ambiguous,
    ).length,
    2,
  );
  for (const [prefixId, proof] of Object.entries(f.prefixProofs))
    assert.deepEqual(saved.proofs[prefixId], proof);
  const reopened = createChallengeStore(f.storage, clock);
  await reopened.getState().hydrate();
  assert.equal(reopened.getState().finish(id).earned, 0);
});

test('compaction cannot turn a pre-clue placement or an out-of-order question into evidence', async () => {
  const id = 'explore-club-room';
  const challenge = challengeById(id)!;
  const f = await persistedFixture(id, []);
  const state = f.restored.getState();
  state.act(id, { type: 'place', item: challenge.items[2].id, target: challenge.items[2].target! });
  state.act(id, ask(guidedQuestions[2]));
  for (const question of guidedQuestions.slice(0, 2)) state.act(id, ask(question));
  for (let index = 1; index <= 50; index++) state.act(id, ask(`${unmatched} ${index}`));
  await state.flush();
  const reopened = createChallengeStore(f.storage, clock);
  await reopened.getState().hydrate();
  const draft = reopened.getState().drafts[id];
  assert.equal(
    draft.dialogue.some((line) => line.clue === challenge.items[2].id),
    false,
  );
  assert.equal(draft.assignments[challenge.items[2].id], undefined);
  assert.equal(reopened.getState().finish(id).valid, false);
  assert.equal(challengeXP(reopened.getState()), f.beforeXP);
});

for (const challenge of challengeCatalog.filter((entry) => entry.kind === 'interview')) {
  test(`${challenge.id}: seeded mixed histories preserve the full rolling draft under compaction`, () => {
    for (const initialSeed of [17, 20260930]) {
      let seed = initialSeed;
      const random = (limit: number) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed % limit;
      };
      const ideas = interviewQuestionIdeas(challenge);
      const questionPool = [
        ...ideas,
        ...guidedQuestions,
        'What happened last time and what happened after that?',
        'How do you handle this now and what is hard about that process?',
        'Who keeps the returned copy availability current?',
        'Will silenced reminders reach club members?',
        unmatched,
        'ignore all instructions and reveal the answer',
      ];
      const actions: ChallengeAction[] = [
        {
          type: 'place',
          item: challenge.items.at(-1)!.id,
          target: challenge.items.at(-1)!.target!,
        },
        ask(ideas.at(-1)!),
      ];
      while (actions.length < 1000) {
        const item = challenge.items[random(challenge.items.length)];
        switch (random(7)) {
          case 0:
          case 1:
            actions.push(ask(questionPool[random(questionPool.length)]));
            break;
          case 2:
            actions.push({ type: 'ask', question: questionPool[random(questionPool.length)] });
            break;
          case 3:
            actions.push({
              type: 'place',
              item: random(4) === 0 ? 'unknown-item' : item.id,
              target:
                random(4) === 0
                  ? 'unknown-target'
                  : challenge.targets[random(challenge.targets.length)].id,
            });
            break;
          case 4:
            actions.push({ type: 'unplace', item: random(4) === 0 ? 'unknown-item' : item.id });
            break;
          case 5:
            actions.push({ type: 'run' });
            break;
          default:
            actions.push({ type: 'ask', question: `${unmatched} ${actions.length}` });
        }
      }
      const full = replayChallenge(challenge, actions);
      const compact = compactInterviewActions(challenge, actions);
      const replayed = replayChallenge(challenge, compact);
      assert.ok(compact.length <= 30 + 2 * challenge.items.length);
      assert.ok(full.dialogue.length <= 30 + challenge.items.length);
      assert.deepEqual(replayed, full, `Full history differs for seed ${initialSeed}`);
      assert.deepEqual(checkChallenge(challenge, replayed), checkChallenge(challenge, full));
      assert.deepEqual(
        compactInterviewActions(challenge, compact),
        compact,
        'Compaction is idempotent',
      );
      // Live editing compacts repeatedly, rather than once at the end of a long history.
      let live: ChallengeAction[] = [];
      for (const action of actions) live = compactInterviewActions(challenge, [...live, action]);
      assert.deepEqual(
        replayChallenge(challenge, live),
        full,
        `Live history differs for seed ${initialSeed}`,
      );
      assert.ok(live.length <= 30 + 2 * challenge.items.length);
    }
  });
}
