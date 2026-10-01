import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOpportunities, mapOpportunity } from './opportunity-mapping';
import { shouldRefreshOpportunities } from './opportunity-cache';
import snapshot from './opportunities-snapshot.json';
const time = Date.parse('2026-09-29T00:00:00Z');
function event(id: string, title: string, tags: string[] = []) {
  return mapOpportunity(
    {
      id,
      title,
      tags,
      slug: id,
      event_type: 'competition',
      status: 'published',
      category: 'innovation',
      registration_end: '2030-01-01T00:00:00Z',
    },
    time,
  )!;
}
test('generic prose and show inside showcase do not personalize real snapshot rows', () => {
  const items = snapshot.events
    .map((row) => mapOpportunity(row, time))
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const results = filterOpportunities(items, {
    project: {
      name: 'My project',
      problem: 'People need a better way for students and people to show their work',
      targetUser: 'students',
    },
  });
  assert.ok(results.length > 0);
  assert.ok(results.every((row) => row.matchReason.startsWith('Listed by DekPort')));
});
test('Latin topic matching uses whole tokens rather than interior substrings', () => {
  const rows = filterOpportunities(
    [event('startup', 'A STARTUP showcase'), event('art', 'Art research challenge')],
    { project: { problem: 'Art support' } },
  );
  assert.equal(rows[0].id, 'art');
  assert.match(rows[0].matchReason, /art/);
  assert.ok(rows.find((row) => row.id === 'startup')!.matchReason.startsWith('Listed by DekPort'));
});
test('topic matching normalizes case, punctuation, and fullwidth Latin without scoring twice', () => {
  const rows = filterOpportunities(
    [event('a', 'Other innovation event'), event('b', 'Education and AI research')],
    { project: { name: 'ＥＤＵＣＡＴＩＯＮ', problem: 'Education, education! AI?' } },
  );
  assert.equal(rows[0].id, 'b');
  assert.match(rows[0].matchReason, /education, ai\./);
  assert.doesNotMatch(rows[0].matchReason, /education, education/);
});
test('meaningful shared Thai phrases match inside unspaced sentences; generic audience does not', () => {
  const items = [
    event('business', 'นักเรียนแข่งขันธุรกิจ'),
    event('environment', 'ชวนนักเรียนทำวิจัยสิ่งแวดล้อมและลดขยะ'),
  ];
  const rows = filterOpportunities(items, {
    project: { problem: 'ชุมชนต้องการลดขยะเพื่อสิ่งแวดล้อม', targetUser: 'นักเรียน' },
  });
  assert.equal(rows[0].id, 'environment');
  assert.match(rows[0].matchReason, /สิ่งแวดล้อม/);
  assert.ok(rows.find((row) => row.id === 'business')!.matchReason.startsWith('Listed by DekPort'));
});
test('re-filtering without project context clears previous matching claims', () => {
  const matched = filterOpportunities([event('a', 'Education challenge')], {
    project: { problem: 'Education' },
  });
  assert.match(matched[0].matchReason, /^Shares terms/);
  assert.match(filterOpportunities(matched)[0].matchReason, /^Listed by DekPort/);
});
test('explicit refresh bypasses recent cache and malformed or future clocks do not stick', () => {
  const recent = new Date(time - 60_000).toISOString();
  assert.equal(shouldRefreshOpportunities(recent, false, time), false);
  assert.equal(shouldRefreshOpportunities(recent, true, time), true);
  assert.equal(
    shouldRefreshOpportunities(new Date(time - 300_000).toISOString(), false, time),
    true,
  );
  assert.equal(
    shouldRefreshOpportunities(new Date(time + 600_000).toISOString(), false, time),
    true,
  );
  assert.equal(shouldRefreshOpportunities('not-a-date', false, time), true);
  assert.equal(shouldRefreshOpportunities(null, false, time), true);
});
