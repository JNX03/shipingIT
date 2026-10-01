import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons, missions } from '../data/curriculum';
import { bonusLessons } from '../data/learning-guides';
import type { AuthStatus, SubscriptionStatus } from '../services/contracts';
import {
  createInitialState,
  getLessonState,
  getMissionProgress,
  getNextLesson,
  normalizePersistedState,
  reduceCompleteLesson,
  toDateKey,
} from './progression';
import type { CompleteLessonOptions } from './progression';

const now = new Date('2026-09-30T15:00:00Z');
const auth: AuthStatus = {
  configured: true,
  mode: 'cloud',
  identity: { id: 'bonus-test-learner', email: null, displayName: null },
};
const activeStatus: SubscriptionStatus = {
  configured: true,
  entitled: true,
  state: 'ready',
  entitlementId: 'shipingit_pro',
  expiresAt: '2026-09-30T16:00:00Z',
  managementUrl: null,
  isSandbox: true,
};
function verified(status: SubscriptionStatus = activeStatus): CompleteLessonOptions {
  return { proVerification: { allowed: true, auth, status } };
}

test('all eight verified Pro labs award once without completing a core mission', () => {
  assert.equal(bonusLessons.length, 8);
  let state = createInitialState();
  for (const lab of bonusLessons) {
    const completion = reduceCompleteLesson(state, lab.id, verified(), now);
    assert.equal(completion.result.success, true, lab.id);
    assert.equal(completion.result.xpEarned, lab.xp, lab.id);
    assert.equal(completion.result.missionCompleted, null, lab.id);
    assert.equal(completion.state.lessonCompletions[lab.id]?.completedAt, toDateKey(now));
    const replay = reduceCompleteLesson(completion.state, lab.id, verified(), now);
    assert.equal(replay.result.success, true, lab.id);
    assert.equal(replay.result.alreadyCompleted, true, lab.id);
    assert.equal(replay.result.xpEarned, 0, lab.id);
    assert.equal(replay.state.xp, completion.state.xp, lab.id);
    assert.deepEqual(replay.result.newAchievements, [], lab.id);
    assert.equal(replay.result.missionCompleted, null, lab.id);
    assert.equal(replay.state.completedLessonIds.filter((id) => id === lab.id).length, 1);
    state = replay.state;
  }
  assert.equal(state.xp, bonusLessons.reduce((sum, lab) => sum + lab.xp, 0));
  assert.equal(getNextLesson(state.completedLessonIds)?.id, lessons[0]!.id);
  for (const mission of missions) {
    assert.equal(getMissionProgress(mission.id, state.completedLessonIds).completed, 0);
    assert.equal(getMissionProgress(mission.id, state.completedLessonIds).complete, false);
  }
});

test('a client allowed flag cannot bypass free, expired, unavailable or unrelated access', () => {
  const initial = createInitialState();
  const lab = bonusLessons[0]!;
  const denied: [string, CompleteLessonOptions][] = [
    ['missing verification', {}],
    ['null verification', { proVerification: null }],
    ['explicitly denied', { proVerification: { allowed: false, auth, status: activeStatus } }],
    ['free', verified({ ...activeStatus, entitled: false })],
    ['expired', verified({ ...activeStatus, expiresAt: '2026-09-30T14:59:59Z' })],
    ['at expiration', verified({ ...activeStatus, expiresAt: now.toISOString() })],
    ['invalid expiration', verified({ ...activeStatus, expiresAt: 'not-a-date' })],
    ['unconfigured', verified({ ...activeStatus, configured: false })],
    ['unavailable', verified({ ...activeStatus, state: 'unavailable' })],
    ['unrelated entitlement', verified({ ...activeStatus, entitlementId: 'another_pro' })],
    ['signed out', { proVerification: { allowed: true, auth: { ...auth, identity: null }, status: activeStatus } }],
  ];
  for (const [name, options] of denied) {
    const result = reduceCompleteLesson(initial, lab.id, options, now);
    assert.equal(result.result.success, false, name);
    assert.equal(result.result.xpEarned, 0, name);
    assert.equal(result.result.missionCompleted, null, name);
    assert.strictEqual(result.state, initial, `${name} does not mutate the save`);
  }
});

test('expired Pro cannot replay a saved bonus lab or change its receipt', () => {
  const lab = bonusLessons[0]!;
  const first = reduceCompleteLesson(createInitialState(), lab.id, verified(), now);
  const expired = reduceCompleteLesson(
    first.state,
    lab.id,
    { ...verified({ ...activeStatus, entitled: false }), perfect: true },
    new Date('2026-10-01T15:00:00Z'),
  );
  assert.equal(expired.result.success, false);
  assert.strictEqual(expired.state, first.state);
  assert.equal(expired.state.lessonCompletions[lab.id]?.perfect, false);
});

test('a verified lifetime entitlement permits a bonus lab', () => {
  const result = reduceCompleteLesson(
    createInitialState(),
    bonusLessons[0]!.id,
    verified({ ...activeStatus, expiresAt: null }),
    now,
  );
  assert.equal(result.result.success, true);
});

test('hydration keeps requested bonus receipts only with valid nonfuture dates', () => {
  const [valid, missing, invalid, future, notRequested] = bonusLessons;
  const state = normalizePersistedState({
    ...createInitialState(),
    completedLessonIds: [valid!.id, valid!.id, missing!.id, invalid!.id, future!.id, 'unknown-pro-lab'],
    xp: 99_999,
    lessonCompletions: {
      [valid!.id]: { completedAt: toDateKey(now), perfect: true },
      [invalid!.id]: { completedAt: '2026-02-30', perfect: true },
      [future!.id]: { completedAt: '2026-10-01', perfect: true },
      [notRequested!.id]: { completedAt: toDateKey(now), perfect: true },
      'unknown-pro-lab': { completedAt: toDateKey(now), perfect: true },
    },
    activityLog: { [toDateKey(now)]: [valid!.id, missing!.id, future!.id, 'unknown-pro-lab'] },
  }, now);
  assert.deepEqual(state.completedLessonIds, [valid!.id]);
  assert.deepEqual(Object.keys(state.lessonCompletions), [valid!.id]);
  assert.equal(state.xp, valid!.xp);
  assert.deepEqual(state.activityLog[toDateKey(now)], [valid!.id]);
  assert.equal(getLessonState(valid!.id, state.completedLessonIds, state.lessonCompletions), 'mastered');
  assert.equal(getLessonState(missing!.id, state.completedLessonIds), 'current');
  assert.equal(getLessonState('unknown-pro-lab', state.completedLessonIds), 'locked');
});

test('saved bonus work survives loss of Pro without unlocking skipped core prerequisites', () => {
  const lab = bonusLessons[0]!;
  const completed = reduceCompleteLesson(createInitialState(), lab.id, verified(), now).state;
  const restored = normalizePersistedState({
    ...completed,
    completedLessonIds: [...completed.completedLessonIds, lessons[1]!.id],
    lessonCompletions: {
      ...completed.lessonCompletions,
      [lessons[1]!.id]: { completedAt: toDateKey(now), perfect: true },
    },
  }, now);
  assert.deepEqual(restored.completedLessonIds, [lab.id]);
  assert.equal(restored.xp, lab.xp);
  assert.equal(getLessonState(lessons[0]!.id, restored.completedLessonIds), 'current');
  assert.equal(getLessonState(lessons[1]!.id, restored.completedLessonIds), 'locked');
  const attempt = reduceCompleteLesson(restored, lessons[1]!.id, verified(), now);
  assert.equal(attempt.result.success, false);
  assert.match(attempt.result.reason ?? '', /earlier lessons/);
  assert.strictEqual(attempt.state, restored);
});
