import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfileCalendar, getProfileStreakSummary, shiftCalendarMonth } from './profile-calendar';

test('streak summary counts real combined days once and ignores invalid or future activity', () => {
  const dates = ['2026-09-27', '2026-09-28', '2026-09-28', '2026-09-30', '2026-02-30', 'bad'];
  const summary = getProfileStreakSummary(dates, new Date(2026, 8, 29, 23, 59));
  assert.deepEqual(summary, {
    dates: ['2026-09-27', '2026-09-28'],
    current: 2,
    longest: 2,
    completedToday: false,
  });
  assert.equal(dates.length, 6);
  assert.deepEqual(getProfileStreakSummary([], new Date(2026, 8, 29)), {
    dates: [], current: 0, longest: 0, completedToday: false,
  });
});

test('month layout pads weeks and distinguishes today, completed days, and future dates', () => {
  const calendar = buildProfileCalendar(
    new Date(2026, 8, 1),
    ['2026-09-28', '2026-09-29', '2026-09-30'],
    new Date(2026, 8, 29, 0, 1),
  );
  assert.equal(calendar.title, 'September 2026');
  assert.equal(calendar.cells.length, 35);
  assert.deepEqual(calendar.cells.slice(0, 2), [null, null]);
  assert.equal(calendar.cells[2]?.date, 1);
  assert.equal(calendar.completedDays, 2);
  assert.equal(calendar.cells.find((day) => day?.date === 29)?.today, true);
  assert.equal(calendar.cells.find((day) => day?.date === 29)?.done, true);
  assert.equal(calendar.cells.find((day) => day?.date === 30)?.future, true);
  assert.equal(calendar.cells.find((day) => day?.date === 30)?.done, false);
  assert.equal(calendar.canGoForward, false);
});

test('navigation crosses years, includes leap day, and stops at the current month', () => {
  const previous = shiftCalendarMonth(new Date(2026, 0, 31), -1);
  assert.equal(previous.getFullYear(), 2025);
  assert.equal(previous.getMonth(), 11);
  assert.equal(previous.getDate(), 1);
  const leap = buildProfileCalendar(new Date(2024, 1, 1), ['2024-02-29'], new Date(2026, 8, 29));
  assert.equal(leap.cells.filter(Boolean).length, 29);
  assert.equal(leap.completedDays, 1);
  assert.equal(leap.canGoForward, true);
  const future = buildProfileCalendar(new Date(2027, 2, 1), [], new Date(2026, 8, 29));
  assert.equal(future.title, 'September 2026');
  assert.equal(future.canGoForward, false);
  assert.equal(buildProfileCalendar(new Date(1999, 5, 1), [], new Date(2026, 8, 29)).canGoBack, false);
});
