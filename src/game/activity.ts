import { isValidDateKey, toDateKey } from '../domain/progression';

/** Each first completed practice is a real activity day, never a replay reward. */
export function practiceActivityDates(completed: Record<string, string>, now = new Date()): string[] {
  const today = toDateKey(now);
  return Object.values(completed).flatMap((at) => {
    const when = new Date(at);
    const date = Number.isFinite(when.getTime()) ? toDateKey(when) : '';
    return isValidDateKey(date) && date <= today ? [date] : [];
  });
}

/** A lesson, stage and practice completed on the same day extend the streak once. */
export function combinedActivityDates(lessonDates: string[], gameDates: string[], practiceDates: string[] = []): string[] {
  return [...new Set([...lessonDates, ...gameDates, ...practiceDates])].sort();
}
