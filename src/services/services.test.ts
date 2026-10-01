import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineMentor } from './mentor-offline';
import { parseMentorResponse } from './mentor-contract';
import { deadlineStatus, filterOpportunities, mapOpportunity } from './opportunity-mapping';
import snapshot from './opportunities-snapshot.json';

const event = {
  id: 'event-1',
  title: 'Student innovation challenge',
  slug: 'student-challenge',
  event_type: 'competition',
  status: 'published',
  registration_end: '2026-10-01T10:00:00Z',
  category: 'innovation',
  fee: 0,
};
test('client refuses incomplete, oversized, or mislabeled replies and projects only safe fields', () => {
  const valid = {
    mode: 'live',
    message: 'Try observing a task.',
    challenge: 'Who struggles?',
    evidencePrompt: 'Record one observation.',
    nextAction: 'Interview one person.',
  };
  assert.equal(parseMentorResponse(null), null);
  assert.equal(parseMentorResponse({ ...valid, mode: 'offline' }), null);
  assert.equal(parseMentorResponse({ ...valid, nextAction: undefined }), null);
  assert.equal(
    parseMentorResponse({ ...valid, challenge: '', evidencePrompt: '', nextAction: '' })?.message,
    valid.message,
  );
  assert.equal(parseMentorResponse({ ...valid, message: 'x'.repeat(2001) }), null);
  assert.deepEqual(parseMentorResponse({ ...valid, access_token: 'must-not-propagate' }), valid);
});
test('offline coaching is explicitly labelled and challenges solution-first reasoning', () => {
  const result = offlineMentor({ prompt: 'I want to build an AI app', project: {} });
  assert.equal(result.mode, 'offline');
  assert.match(result.message, /solution/i);
  assert.match(result.challenge, /who/i);
  assert.ok(result.reason?.includes('Offline'));
});
test('offline mentor varies by scope, evidence, validation, and pitch context', () => {
  const variants = ['scope', 'evidence', 'validation', 'pitch'].map((focus) =>
    offlineMentor({
      prompt: 'Review this',
      project: {},
      focus: focus as 'scope' | 'evidence' | 'validation' | 'pitch',
    }),
  );
  assert.equal(new Set(variants.map((result) => result.challenge)).size, 4);
  assert.ok(variants.every((result) => result.nextAction.length > 30 && result.mode === 'offline'));
});
test('selected coaching focus takes precedence over incidental prompt words', () => {
  const selected = offlineMentor({
    prompt: 'Help me build this',
    focus: 'evidence',
    project: { problem: 'Students miss deadlines.' },
  });
  assert.match(selected.evidencePrompt, /last time this happened/);
});
test('event parser rejects malformed or non-public data and preserves unknown deadline', () => {
  assert.equal(mapOpportunity(null), null);
  assert.equal(mapOpportunity({ ...event, status: 'draft' }), null);
  assert.equal(mapOpportunity({ ...event, slug: null }), null);
  assert.equal(mapOpportunity({ ...event, registration_end: 'not-a-date' })?.status, 'unknown');
  assert.equal(
    mapOpportunity({ ...event, image_url: 'https://untrusted.example/image.png' })?.imageUrl,
    null,
  );
});
test('deadlines age correctly instead of remaining open forever in saved data', () => {
  assert.equal(deadlineStatus(event.registration_end, Date.parse('2026-09-30T10:00:00Z')), 'open');
  assert.equal(
    deadlineStatus(event.registration_end, Date.parse('2026-10-02T10:00:00Z')),
    'closed',
  );
  const expired = mapOpportunity(event, Date.parse('2026-10-02T10:00:00Z'))!;
  assert.deepEqual(filterOpportunities([expired]), []);
  assert.equal(filterOpportunities([expired], { includeClosed: true }).length, 1);
});
test('search matches the actual event, returns an honest heuristic, and uses encoded public slugs', () => {
  const item = mapOpportunity(
    { ...event, slug: 'student challenge', education_level: ['ม.ปลาย'], tags: ['education'] },
    Date.parse('2026-09-01T00:00:00Z'),
  )!;
  assert.equal(item.url, 'https://dekport.com/competition/student%20challenge');
  assert.equal(filterOpportunities([item], { query: 'unmatched' }).length, 0);
  assert.match(
    filterOpportunities([item], { project: { problem: 'Students need education support' } })[0]
      .matchReason,
    /Check eligibility/,
  );
});
test('bundled fallback contains real dated public listings and useful innovation categories', () => {
  assert.ok(Number.isFinite(Date.parse(snapshot.fetchedAt)));
  assert.match(snapshot.sourceUrl, /^https:\/\/api.dekport.com/);
  assert.ok(snapshot.events.length > 0);
  const items = snapshot.events
    .map((value) => mapOpportunity(value, Date.parse(snapshot.fetchedAt)))
    .filter(Boolean);
  assert.ok(items.length > 5);
  assert.ok(items.every((item) => item?.url.startsWith('https://dekport.com/competition/')));
});
