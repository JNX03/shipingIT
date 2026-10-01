import assert from 'node:assert/strict';
import test from 'node:test';
import { challengeCatalog } from './catalog';
import { applyChallengeAction, initialChallengeDraft } from './logic';
import { challengeShellAction } from './shell-action';

test('layout dock runs the build, permits finish only after a pass, and reruns changed pieces', () => {
  const challenge = challengeCatalog.find((item) => item.kind === 'layout')!;
  let draft = initialChallengeDraft(challenge);
  assert.equal(challengeShellAction(challenge, draft).type, 'run');
  for (const item of challenge.items)
    draft = applyChallengeAction(challenge, draft, { type: 'place', item: item.id, target: item.target! });
  if (challenge.needsSize) draft = applyChallengeAction(challenge, draft, { type: 'size', value: 48 });
  if (challenge.needsContrast) draft = applyChallengeAction(challenge, draft, { type: 'contrast', value: true });
  assert.equal(challengeShellAction(challenge, draft).type, 'run');
  draft = applyChallengeAction(challenge, draft, { type: 'run' });
  assert.equal(challengeShellAction(challenge, draft).type, 'finish');
  assert.equal(challengeShellAction(challenge, draft).title, 'Finish practice');
  draft = applyChallengeAction(challenge, draft, { type: 'unplace', item: challenge.items[0].id });
  assert.equal(challengeShellAction(challenge, draft).type, 'run');
});

test('repair dock exposes original failure before permitting edits and reruns', () => {
  const challenge = challengeCatalog.find((item) => item.kind === 'repair')!;
  let draft = initialChallengeDraft(challenge);
  assert.equal(challengeShellAction(challenge, draft).title, 'Run original journey');
  draft = applyChallengeAction(challenge, draft, { type: 'run' });
  assert.equal(challengeShellAction(challenge, draft).title, 'Rerun this version');
});

test('interview and pack practices keep their direct check action', () => {
  for (const kind of ['interview', 'pack'] as const) {
    const challenge = challengeCatalog.find((item) => item.kind === kind)!;
    assert.deepEqual(challengeShellAction(challenge, initialChallengeDraft(challenge)), { type: 'finish', title: 'Check my build' });
  }
});
