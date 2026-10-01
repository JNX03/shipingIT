import assert from 'node:assert/strict';
import test from 'node:test';
import { challengeById, challengeCatalog } from './catalog';
import {
  applyChallengeAction,
  checkChallenge,
  initialChallengeDraft,
  interviewPlacementFeedback,
  nextInterviewStep,
  piecePlacementFeedback,
  replayChallenge,
} from './logic';
import { interviewQuestionForClue } from './registry';
import { createChallengeStore, CHALLENGE_STORAGE_KEY } from './create-store';
import type { ChallengeAction } from './model';

test('shuttle wrong event destination recovers one clue at a time and persists one reward', async () => {
  const challenge = challengeById('explore-last-time')!;
  const saved = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => saved.get(key) ?? null,
    setItem: async (key: string, text: string) => {
      saved.set(key, text);
    },
  };
  const store = createChallengeStore(storage, () => new Date('2026-09-30T15:00:00Z'));
  await store.getState().hydrate();
  const actions: ChallengeAction[] = [
    { type: 'ask', question: interviewQuestionForClue(challenge, 'event')!, replyVersion: 2 },
    { type: 'place', item: 'event', target: 'impact' },
  ];
  actions.forEach((action) => store.getState().act(challenge.id, action));
  let draft = store.getState().drafts[challenge.id];
  assert.equal(nextInterviewStep(challenge, draft)?.phase, 'pin');
  assert.equal(nextInterviewStep(challenge, draft)?.item.id, 'event');
  assert.match(checkChallenge(challenge, draft).message, /What happened/);
  assert.doesNotMatch(checkChallenge(challenge, draft).message, /different destination/);
  assert.equal(store.getState().finish(challenge.id).earned, 0);
  const check = interviewPlacementFeedback(challenge, draft, 'event', 'impact');
  assert.equal(check.valid, false);
  assert.match(check.message, /What happened/);
  for (const item of challenge.items) {
    draft = store.getState().drafts[challenge.id];
    const step = nextInterviewStep(challenge, draft)!;
    assert.equal(step.item.id, item.id);
    if (step.phase === 'ask')
      store
        .getState()
        .act(challenge.id, { type: 'ask', question: step.question!, replyVersion: 2 });
    store.getState().act(challenge.id, { type: 'place', item: item.id, target: item.target! });
  }
  assert.equal(checkChallenge(challenge, store.getState().drafts[challenge.id]).valid, true);
  assert.equal(store.getState().finish(challenge.id).earned, 25);
  assert.equal(store.getState().finish(challenge.id).earned, 0);
  await store.getState().flush();
  assert.equal(JSON.parse(saved.get(CHALLENGE_STORAGE_KEY)!).version, 1);
  const reopened = createChallengeStore(storage, () => new Date('2026-09-30T16:00:00Z'));
  await reopened.getState().hydrate();
  assert.equal(reopened.getState().finish(challenge.id).earned, 0);
  assert.ok(reopened.getState().completed[challenge.id]);
});

test('every interview can recover via one guaranteed authored ask and pin per current clue', () => {
  for (const challenge of challengeCatalog.filter((item) => item.kind === 'interview')) {
    let draft = replayChallenge(
      challenge,
      Array.from({ length: 30 }, () => ({
        type: 'ask' as const,
        question: 'Could you explain quantum waffles?',
      })),
    );
    for (const item of challenge.items) {
      const step = nextInterviewStep(challenge, draft)!;
      assert.equal(step.phase, 'ask');
      assert.equal(step.item.id, item.id);
      draft = applyChallengeAction(challenge, draft, {
        type: 'ask',
        question: step.question!,
        replyVersion: 2,
      });
      assert.equal(nextInterviewStep(challenge, draft)?.phase, 'pin');
      draft = applyChallengeAction(challenge, draft, {
        type: 'place',
        item: item.id,
        target: item.target!,
      });
    }
    assert.equal(nextInterviewStep(challenge, draft), undefined);
    assert.equal(checkChallenge(challenge, draft).valid, true);
  }
});

test('sort, wire, repair and layout checks explain the current piece destination', () => {
  for (const challenge of challengeCatalog.filter((item) =>
    ['sort', 'wire', 'repair', 'layout'].includes(item.kind),
  )) {
    for (const item of challenge.items) {
      assert.equal(piecePlacementFeedback(challenge, item.id, item.target!).valid, true);
      const wrong = challenge.targets.find((target) => target.id !== item.target)!;
      const result = piecePlacementFeedback(challenge, item.id, wrong.id);
      assert.equal(result.valid, false);
      assert.ok(
        result.message.includes(
          challenge.targets.find((target) => target.id === item.target)!.title,
        ),
      );
      assert.doesNotMatch(result.message, /different destination/);
    }
  }
  assert.equal(
    checkChallenge(challengeCatalog[0], initialChallengeDraft(challengeCatalog[0])).valid,
    false,
  );
});
