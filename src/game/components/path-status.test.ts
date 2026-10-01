import assert from 'node:assert/strict';
import test from 'node:test';
import { pathStatusCopy } from './path-status';

test('level status reports progress from earned Sparks and four distinct destinations', () => {
  const copy = pathStatusCopy({
    sparks: 150,
    streak: 2,
    stages: 3,
    activityDates: [],
    now: new Date(2026, 8, 30, 23, 50),
  });
  assert.equal(copy.level.title, 'Builder level 2');
  assert.match(copy.level.detail, /50 of 100/);
  assert.match(copy.level.detail, /50 more/);
  assert.match(copy.level.detail, /learning rank/);
  assert.match(copy.level.detail, /Every 100 earned Sparks/);
  assert.match(copy.level.timing, /Personal rank/);
  assert.match(copy.level.timing, /Shop spending and Pro purchases do not change/);
  assert.equal(new Set(Object.values(copy).map((entry) => entry.href)).size, 4);
  assert.match(copy.sparks.title, /150/);
  assert.match(copy.stages.title, /3 of 6/);
});

test('streak status changes at local midnight and never claims an unsaved activity today', () => {
  const base = { sparks: 150, streak: 2, stages: 3, activityDates: ['2026-09-30'] };
  const today = pathStatusCopy({ ...base, now: new Date(2026, 8, 30, 23, 59) });
  const tomorrow = pathStatusCopy({ ...base, now: new Date(2026, 9, 1, 0, 0) });
  assert.match(today.streak.detail, /completed a learning activity today/);
  assert.match(tomorrow.streak.detail, /Complete a lesson/);
  assert.match(tomorrow.streak.timing, /device’s local time/);
});

test('fresh and completed adventure statuses reflect real chapter state', () => {
  const base = { sparks: 0, streak: 0, activityDates: [], now: new Date(2026, 8, 30) };
  assert.match(pathStatusCopy({ ...base, stages: 0 }).stages.detail, /Start with Explore/);
  assert.match(pathStatusCopy({ ...base, stages: 6 }).stages.detail, /built and tested/);
  assert.match(pathStatusCopy({ ...base, stages: 0 }).streak.detail, /first learning activity/);
});
