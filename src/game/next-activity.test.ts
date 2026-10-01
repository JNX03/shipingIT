import assert from 'node:assert/strict';
import test from 'node:test';
import { bonusLessons } from '../data/learning-guides';
import { mixedPathNodes } from './mixed-path';
import type { MixedPathProgress } from './mixed-path-state';
import { nextMixedActivity } from './next-activity';
import { initialAdventure } from './state';

function emptyProgress(): MixedPathProgress {
  return {
    adventure: initialAdventure(),
    completedLessonIds: [],
    practices: {},
    practicesReady: true,
  };
}

test('every result destination follows all 62 canonical mixed activities and their actual route', () => {
  const progress = emptyProgress();
  for (const node of mixedPathNodes) {
    const next = nextMixedActivity(progress);
    assert.equal(next.node?.key, node.key);
    if (node.ref.kind === 'lesson') {
      assert.equal(next.label, 'Next lesson');
      assert.deepEqual(next.href, { pathname: '/lesson/[id]', params: { id: node.ref.lessonId } });
      progress.completedLessonIds.push(node.ref.lessonId);
    } else if (node.ref.kind === 'adventure') {
      assert.equal(next.label, 'Next game');
      assert.deepEqual(next.href, { pathname: '/adventure/[id]', params: { id: node.ref.stageId } });
      progress.adventure.completed.push(node.ref.stageId);
      progress.adventure.earned.push(node.ref.stageId);
    } else {
      assert.equal(next.label, 'Next practice');
      assert.deepEqual(next.href, { pathname: '/practice/[id]', params: { id: node.ref.challengeId } });
      progress.practices[node.ref.challengeId] = '2026-09-30';
    }
  }
  assert.deepEqual(nextMixedActivity(progress), { label: 'Return to path', href: '/(tabs)' });
});

test('a finished practice leads back into its interleaved lesson rather than the practice-only track', () => {
  const progress = emptyProgress();
  progress.completedLessonIds = ['discover-1'];
  progress.adventure.completed = ['explore'];
  progress.adventure.earned = ['explore'];
  progress.practices = { 'explore-last-time': '2026-09-30' };
  assert.deepEqual(nextMixedActivity(progress).href, {
    pathname: '/lesson/[id]', params: { id: 'discover-2' },
  });
});

test('every Pro bonus completion returns to Pro labs without changing core progress or rewards', () => {
  const progress = emptyProgress();
  const before = JSON.stringify(progress);
  assert.equal(bonusLessons.length, 8);
  for (const bonus of bonusLessons)
    assert.deepEqual(nextMixedActivity(progress, bonus.id), { label: 'More Pro labs', href: '/pro-labs' });
  assert.equal(JSON.stringify(progress), before);
  assert.equal(nextMixedActivity(progress, 'unknown-bonus').node?.key, 'lesson:discover-1');
});
