import { getLongestStreak, getStreak, isValidDateKey, toDateKey } from '../domain/progression';

export function getProfileStreakSummary(activityDates: string[], now = new Date()) {
  const today = toDateKey(now);
  const dates = [...new Set(activityDates.filter((key) => isValidDateKey(key) && key <= today))].sort();
  return {
    dates,
    current: getStreak(dates, now),
    longest: getLongestStreak(dates),
    completedToday: dates.includes(today),
  };
}

export function shiftCalendarMonth(month: Date, amount: number) {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1);
}

export interface ProfileCalendarDay {
  key: string;
  date: number;
  today: boolean;
  done: boolean;
  future: boolean;
  spoken: string;
}

/** Local calendar dates are never parsed as UTC; empty slots complete each week. */
export function buildProfileCalendar(month: Date, activityDates: string[], now = new Date()) {
  const currentMonth = shiftCalendarMonth(now, 0);
  const firstSupportedMonth = new Date(2000, 0, 1);
  const requested = shiftCalendarMonth(month, 0);
  const displayedMonth = new Date(
    Math.min(currentMonth.getTime(), Math.max(firstSupportedMonth.getTime(), requested.getTime())),
  );
  const today = toDateKey(now);
  const recorded = new Set(activityDates.filter(isValidDateKey));
  const length = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
  const cells: (ProfileCalendarDay | null)[] = Array.from(
    { length: displayedMonth.getDay() },
    () => null,
  );
  for (let date = 1; date <= length; date++) {
    const day = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), date);
    const key = toDateKey(day);
    cells.push({
      key,
      date,
      today: key === today,
      done: key <= today && recorded.has(key),
      future: key > today,
      spoken: day.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return {
    month: displayedMonth,
    title: displayedMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    cells,
    completedDays: cells.filter((day) => day?.done).length,
    canGoBack: displayedMonth.getTime() > firstSupportedMonth.getTime(),
    canGoForward: displayedMonth.getTime() < currentMonth.getTime(),
  };
}
