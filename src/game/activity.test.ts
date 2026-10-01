import assert from 'node:assert/strict';
import test from 'node:test';
import { getStreak } from '../domain/progression';
import { combinedActivityDates, practiceActivityDates } from './activity';

test('game and legacy lesson days form one streak without double counting', () => {
  const lessons = ['2026-09-27', '2026-09-28'];
  const game = ['2026-09-28', '2026-09-29'];
  const combined = combinedActivityDates(lessons, game);
  assert.deepEqual(combined, ['2026-09-27', '2026-09-28', '2026-09-29']);
  assert.equal(getStreak(combined, new Date(2026, 8, 29)), 3);
  assert.deepEqual(lessons, ['2026-09-27', '2026-09-28']);
  assert.deepEqual(game, ['2026-09-28', '2026-09-29']);
  assert.equal(getStreak(combinedActivityDates([], ['2026-09-29']), new Date(2026, 8, 29)), 1);
});

test('a first practice completion extends the streak once, while invalid and future proofs do not', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const practice = practiceActivityDates({
    first: '2026-09-29T05:00:00Z',
    second: '2026-09-29T06:00:00Z',
    damaged: 'not-a-date',
    future: '2026-10-01T05:00:00Z',
  }, now);
  const dates = combinedActivityDates(['2026-09-28'], [], practice);
  assert.deepEqual(dates, ['2026-09-28', '2026-09-29']);
  assert.equal(getStreak(dates, now), 2);
});
