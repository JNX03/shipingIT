import { achievementDefinitions, achievementLessonRequirements } from '../data/achievements';
import { getLesson, getMission, lessons, missions } from '../data/curriculum';
import { bonusLessons } from '../data/learning-guides';
import { builderAccess } from '../services/access-policy';
import type { AuthStatus, SubscriptionStatus } from '../services/contracts';
import { createEmptyProject, projectFields } from './project';
import { projectLessonAccess } from './lesson-access';
import { initialSparkWallet, type SparkWallet } from './spark-wallet';
import type {
  AnswerResult,
  CompletionResult,
  Exercise,
  ExerciseAnswer,
  LessonCompletion,
  LessonState,
  PersistedAppState,
  Profile,
  Project,
} from './types';

const MS_PER_DAY = 86_400_000;
const MAX_TEXT_LENGTH = 12_000;

/** Use the learner's local calendar day, not elapsed 24-hour windows or UTC dates. */
export function toDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Observe one same-origin progress key without clearing storage or forwarding credential keys. */
export function subscribeToBrowserProgress(
  key: string,
  onChange: (serialized: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const storage = window.localStorage;
    const listener = (event: StorageEvent) => {
      if (event.storageArea !== storage || event.key !== key) return;
      const current = storage.getItem(key);
      if (current !== null) onChange(current);
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  } catch {
    // Private modes without Storage retain the existing store-local behavior.
    return () => {};
  }
}
export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  if (year < 2000 || year > 9999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
function dayOrdinal(key: string): number {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}
export function getStreak(activityDates: string[], now = new Date()): number {
  const today = dayOrdinal(toDateKey(now));
  const days = new Set(
    activityDates
      .filter(isValidDateKey)
      .map(dayOrdinal)
      .filter((day) => day <= today),
  );
  let cursor = days.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}
export function getLongestStreak(activityDates: string[]): number {
  const days = [...new Set(activityDates.filter(isValidDateKey).map(dayOrdinal))].sort(
    (a, b) => a - b,
  );
  let current = 0,
    longest = 0,
    previous = -Infinity;
  for (const day of days) {
    current = day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}
export function getLevel(xp: number): number {
  return Math.floor(Math.max(0, Number.isFinite(xp) ? xp : 0) / 100) + 1;
}
export function getLevelProgress(xp: number) {
  const safeXP = Math.max(0, Number.isFinite(xp) ? xp : 0);
  return { level: getLevel(safeXP), current: safeXP % 100, target: 100, percent: safeXP % 100 };
}
export function getLessonState(
  id: string,
  completedLessonIds: string[],
  completions: Record<string, LessonCompletion> = {},
  passedLessonIds: readonly string[] = completedLessonIds,
): LessonState {
  const index = lessons.findIndex((item) => item.id === id);
  if (index < 0) {
    if (!bonusLessons.some((lesson) => lesson.id === id)) return 'locked';
    return completedLessonIds.includes(id)
      ? completions[id]?.perfect
        ? 'mastered'
        : 'completed'
      : 'current';
  }
  if (completedLessonIds.includes(id)) return completions[id]?.perfect ? 'mastered' : 'completed';
  return lessons.slice(0, index).every((item) => passedLessonIds.includes(item.id))
    ? 'current'
    : 'locked';
}
export function getMissionProgress(
  missionId: number,
  completedLessonIds: string[],
  passedLessonIds: readonly string[] = completedLessonIds,
) {
  const mission = getMission(missionId);
  const completed = mission?.lessonIds.filter((id) => completedLessonIds.includes(id)).length ?? 0;
  const total = mission?.lessonIds.length ?? 0;
  const unlocked =
    Boolean(mission) &&
    missions
      .filter((item) => item.id < missionId)
      .every((item) => item.lessonIds.every((id) => passedLessonIds.includes(id)));
  return {
    completed,
    total,
    percent: total ? Math.round((100 * completed) / total) : 0,
    unlocked,
    complete: total > 0 && completed === total,
  };
}
export function getNextLesson(
  completedLessonIds: string[],
  passedLessonIds: readonly string[] = completedLessonIds,
) {
  return lessons.find((item) => !passedLessonIds.includes(item.id));
}
export function getDailyProgress(
  state: Pick<PersistedAppState, 'lessonCompletions' | 'profile'> &
    Partial<Pick<PersistedAppState, 'activityLog'>>,
  now = new Date(),
) {
  const date = toDateKey(now);
  const completed = new Set([
    ...(state.activityLog?.[date] ?? []),
    ...Object.entries(state.lessonCompletions)
      .filter(([, item]) => item.completedAt === date)
      .map(([id]) => id),
  ]).size;
  const goal = state.profile.dailyGoal;
  return {
    completed,
    goal,
    percent: Math.min(100, Math.round((100 * completed) / goal)),
    complete: completed >= goal,
  };
}
export function createInitialState(): PersistedAppState {
  return {
    schemaVersion: 1,
    onboardingComplete: false,
    profile: {
      name: '',
      startingPoint: 'find-problem',
      goal: 'first-project',
      dailyGoal: 1,
      world: 'school',
    },
    settings: { sound: true, haptics: true, reducedMotion: false },
    project: createEmptyProject(),
    completedLessonIds: [],
    xp: 0,
    activityDates: [],
    achievements: [],
    lessonCompletions: {},
    activityLog: {},
  };
}
function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function validText(value: unknown, limit = MAX_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}
export function sanitizeProfile(value: unknown): Profile {
  const source = record(value) ?? {};
  return {
    name: validText(source.name, 80),
    startingPoint: enumValue(
      source.startingPoint,
      ['find-problem', 'have-idea', 'have-project', 'competitions'],
      'find-problem',
    ),
    goal: enumValue(
      source.goal,
      [
        'first-project',
        'startup',
        'portfolio',
        'competitions',
        'entrepreneurship',
        'product-design',
      ],
      'first-project',
    ),
    world: enumValue(
      source.world,
      [
        'school',
        'community',
        'environment',
        'education',
        'accessibility',
        'productivity',
        'healthcare',
        'small-business',
      ],
      'school',
    ),
    dailyGoal: source.dailyGoal === 2 || source.dailyGoal === 3 ? source.dailyGoal : 1,
  };
}
export function sanitizeProject(value: unknown, base: Project = createEmptyProject()): Project {
  const source = record(value);
  if (!source) return { ...base };
  const result = { ...base };
  for (const key of projectFields)
    if (typeof source[key] === 'string') result[key] = validText(source[key]);
  return result;
}
export function deriveAchievements(
  state: Pick<PersistedAppState, 'completedLessonIds' | 'activityDates' | 'lessonCompletions'>,
): string[] {
  return achievementDefinitions
    .filter((item) => {
      if (item.id === 'three-day-streak') return getLongestStreak(state.activityDates) >= 3;
      if (item.id === 'first-perfect')
        return Object.values(state.lessonCompletions).some((completion) => completion.perfect);
      return state.completedLessonIds.includes(achievementLessonRequirements[item.id] ?? '');
    })
    .map((item) => item.id);
}
/** Recover valid fields independently. XP, unlocks, and awards are always recomputed. */
export function normalizePersistedState(
  value: unknown,
  now = new Date(),
  skipWallet: Pick<SparkWallet, 'purchases'> = initialSparkWallet(),
): PersistedAppState {
  const initial = createInitialState();
  const source = record(value);
  if (!source) return initial;
  const settings = record(source.settings) ?? {};
  const requestedIds = new Set(
    Array.isArray(source.completedLessonIds)
      ? source.completedLessonIds.filter((id): id is string => typeof id === 'string')
      : [],
  );
  const passed = projectLessonAccess([...requestedIds], skipWallet, now.getTime());
  const completedLessonIds = passed.passedLessonIds.filter((id) => requestedIds.has(id));
  const sourceCompletions = record(source.lessonCompletions) ?? {};
  for (const lesson of bonusLessons) {
    const receipt = record(sourceCompletions[lesson.id]);
    if (
      requestedIds.has(lesson.id) &&
      receipt &&
      isValidDateKey(receipt.completedAt) &&
      receipt.completedAt <= toDateKey(now)
    )
      completedLessonIds.push(lesson.id);
  }
  const lessonCompletions: Record<string, LessonCompletion> = {};
  const today = toDateKey(now);
  for (const id of completedLessonIds) {
    const item = record(sourceCompletions[id]);
    if (item && isValidDateKey(item.completedAt) && item.completedAt <= today) {
      lessonCompletions[id] = { completedAt: item.completedAt, perfect: item.perfect === true };
    }
  }
  const dates = Array.isArray(source.activityDates)
    ? source.activityDates.filter(isValidDateKey).filter((date) => date <= today)
    : [];
  const activityLog: Record<string, string[]> = {};
  for (const [date, ids] of Object.entries(record(source.activityLog) ?? {})) {
    if (isValidDateKey(date) && date <= today && Array.isArray(ids)) {
      const validIds = [
        ...new Set(
          ids.filter(
            (id): id is string => typeof id === 'string' && completedLessonIds.includes(id),
          ),
        ),
      ];
      if (validIds.length) activityLog[date] = validIds;
    }
  }
  for (const [id, completion] of Object.entries(lessonCompletions)) {
    activityLog[completion.completedAt] = [
      ...new Set([...(activityLog[completion.completedAt] ?? []), id]),
    ];
  }
  const state: PersistedAppState = {
    ...initial,
    onboardingComplete: source.onboardingComplete === true,
    profile: sanitizeProfile(source.profile),
    project: sanitizeProject(source.project),
    settings: {
      sound: typeof settings.sound === 'boolean' ? settings.sound : true,
      haptics: typeof settings.haptics === 'boolean' ? settings.haptics : true,
      reducedMotion: settings.reducedMotion === true,
    },
    completedLessonIds,
    lessonCompletions,
    activityLog,
    xp: completedLessonIds.reduce((total, id) => total + (getLesson(id)?.xp ?? 0), 0),
    activityDates: [...new Set([...dates, ...Object.keys(activityLog)])].sort(),
  };
  state.achievements = deriveAchievements(state);
  return state;
}
export function parsePersistedState(
  raw: string | null,
  now = new Date(),
  skipWallet: Pick<SparkWallet, 'purchases'> = initialSparkWallet(),
): { state: PersistedAppState; recovered: boolean } {
  if (!raw) return { state: createInitialState(), recovered: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    const source = record(parsed);
    const state = normalizePersistedState(parsed, now, skipWallet);
    const project = record(source?.project);
    const profile = record(source?.profile);
    const settings = record(source?.settings);
    const recovered =
      !source ||
      source.schemaVersion !== 1 ||
      !project ||
      !profile ||
      !settings ||
      typeof source.onboardingComplete !== 'boolean' ||
      source.xp !== state.xp ||
      !Array.isArray(source.completedLessonIds) ||
      source.completedLessonIds.length !== state.completedLessonIds.length ||
      projectFields.some(
        (key) => typeof project[key] !== 'string' || project[key] !== state.project[key],
      ) ||
      Object.keys(state.profile).some(
        (key) => profile[key] !== state.profile[key as keyof Profile],
      ) ||
      Object.keys(state.settings).some(
        (key) => settings[key] !== state.settings[key as keyof typeof state.settings],
      );
    return { state, recovered };
  } catch {
    return { state: createInitialState(), recovered: true };
  }
}
export function evaluateExercise(exercise: Exercise, answer: ExerciseAnswer): AnswerResult {
  const errors: string[] = [];
  let correct = false;
  if (exercise.type === 'choice' || exercise.type === 'multi') {
    const selected = Array.isArray(answer) ? answer : [];
    const unique = new Set(selected);
    correct =
      unique.size === selected.length &&
      selected.length === exercise.correctAnswerIds.length &&
      exercise.correctAnswerIds.every((id) => unique.has(id));
  } else if (exercise.type === 'sort') {
    const selected = Array.isArray(answer) ? answer : [];
    correct =
      selected.length === exercise.correctOrder.length &&
      exercise.correctOrder.every((id, index) => selected[index] === id);
  } else if (exercise.type === 'categorize') {
    const selected = Array.isArray(answer) ? {} : answer;
    correct = exercise.items.every(
      (item) => selected[item.id as keyof typeof selected] === exercise.correctCategories[item.id],
    );
  } else {
    const values = Array.isArray(answer) ? {} : (answer as Partial<Project>);
    for (const item of exercise.fields) {
      const value = values[item.key];
      if (typeof value !== 'string' || value.trim().length < item.minLength)
        errors.push(`${item.label}: add at least ${item.minLength} characters.`);
      else if (value.length > MAX_TEXT_LENGTH)
        errors.push(
          `${item.label}: keep this note under ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
        );
    }
    correct = errors.length === 0;
  }
  return { correct, explanation: exercise.explanation, errors };
}
export interface CompleteLessonOptions {
  perfect?: boolean;
  projectUpdates?: Partial<Project>;
  proVerification?: { allowed: boolean; auth: AuthStatus; status: SubscriptionStatus } | null;
  /** Local durable wallet context, never a persisted completion or paid entitlement. */
  skipWallet?: Pick<SparkWallet, 'purchases'>;
}
export function reduceCompleteLesson(
  state: PersistedAppState,
  lessonId: string,
  options: CompleteLessonOptions = {},
  now = new Date(),
): { state: PersistedAppState; result: CompletionResult } {
  const lesson = getLesson(lessonId);
  const failure = (reason: string) => ({
    state,
    result: {
      success: false,
      alreadyCompleted: false,
      xpEarned: 0,
      newAchievements: [],
      missionCompleted: null,
      reason,
    },
  });
  if (!lesson) return failure('This lesson could not be found.');
  const bonus = bonusLessons.some((item) => item.id === lessonId);
  if (
    bonus &&
    (!options.proVerification?.allowed ||
      options.proVerification.status.entitlementId !== 'shipingit_pro' ||
      !builderAccess(options.proVerification.status, options.proVerification.auth, now.getTime())
        .allowed)
  )
    return failure('Verify active Pro access before completing this bonus lab.');
  const access = projectLessonAccess(
    state.completedLessonIds,
    options.skipWallet ?? initialSparkWallet(),
    now.getTime(),
  );
  if (getLessonState(lessonId, state.completedLessonIds, {}, access.passedLessonIds) === 'locked')
    return failure('Complete the earlier lessons first.');
  const project = sanitizeProject(options.projectUpdates, state.project);
  for (const exercise of lesson.exercises) {
    if (exercise.type === 'project') {
      const check = evaluateExercise(exercise, project);
      if (!check.correct)
        return failure(check.errors[0] ?? 'Complete the project task before finishing.');
    }
  }
  const alreadyCompleted = state.completedLessonIds.includes(lessonId);
  const date = toDateKey(now);
  const completedLessonIds = alreadyCompleted
    ? state.completedLessonIds
    : [...state.completedLessonIds, lessonId];
  const next: PersistedAppState = {
    ...state,
    project,
    completedLessonIds,
    xp: completedLessonIds.reduce((total, id) => total + (getLesson(id)?.xp ?? 0), 0),
    activityDates: [...new Set([...state.activityDates, date])].sort(),
    activityLog: {
      ...state.activityLog,
      [date]: [...new Set([...(state.activityLog[date] ?? []), lessonId])],
    },
    lessonCompletions: {
      ...state.lessonCompletions,
      [lessonId]: {
        completedAt: state.lessonCompletions[lessonId]?.completedAt ?? date,
        perfect: state.lessonCompletions[lessonId]?.perfect === true || options.perfect === true,
      },
    },
  };
  next.achievements = deriveAchievements(next);
  const newAchievements = next.achievements.filter((id) => !state.achievements.includes(id));
  const mission = getMission(lesson.missionId)!;
  const missionCompleted =
    !bonus && !alreadyCompleted && mission.lessonIds.every((id) => completedLessonIds.includes(id))
      ? mission.id
      : null;
  return {
    state: next,
    result: {
      success: true,
      alreadyCompleted,
      xpEarned: alreadyCompleted ? 0 : lesson.xp,
      newAchievements,
      missionCompleted,
    },
  };
}
