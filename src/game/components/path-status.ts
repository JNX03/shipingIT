import { getLevelProgress, toDateKey } from '../../domain/progression';

export type PathStatusId = 'level' | 'streak' | 'sparks' | 'stages';

export function pathStatusCopy({
  sparks,
  streak,
  stages,
  activityDates,
  now,
}: {
  sparks: number;
  streak: number;
  stages: number;
  activityDates: readonly string[];
  now: Date;
}) {
  const level = getLevelProgress(sparks);
  const completedToday = activityDates.includes(toDateKey(now));
  return {
    level: {
      title: `Builder level ${level.level}`,
      detail: `Your learning rank. Every 100 earned Sparks adds a level. ${level.current} of ${level.target} toward your next level; ${level.target - level.current} more to go.`,
      timing:
        'Personal rank, not a global leaderboard. Shop spending and Pro purchases do not change it.',
      action: 'View personal rank',
      href: '/rank' as const,
    },
    streak: {
      title: `${streak}-day streak`,
      detail: completedToday
        ? 'You completed a learning activity today. Come back tomorrow to keep your streak growing.'
        : streak > 0
          ? 'Complete a lesson, adventure stage, or new practice today to keep your streak growing.'
          : 'Complete your first learning activity today to start a streak.',
      timing: 'A new activity day begins at midnight in your device’s local time.',
      action: 'View activity calendar',
      href: '/streak' as const,
    },
    sparks: {
      title: `${sparks} Sparks earned`,
      detail:
        'These Sparks come from your completed lessons, adventure stages, new practices, and claimed quest rewards. Replaying a completed activity gives practice without another reward.',
      timing:
        'Your earned Sparks stay with your saved progress. Daily quests refresh at local midnight.',
      action: 'View daily quests',
      href: '/quests' as const,
    },
    stages: {
      title: `${stages} of 6 adventure stages complete`,
      detail:
        stages === 6
          ? 'You built and tested your Lunch Lens prototype. Open your app to try the screen you made.'
          : stages === 0
            ? 'Start with Explore, then turn what you learn into a working prototype. Each stage unlocks after the previous one is complete.'
            : 'Continue along the path to build and test your Lunch Lens prototype. Your saved app pieces are kept between stages.',
      timing: 'Adventure progress is saved and does not reset each day.',
      action: 'Open my prototype',
      href: '/(tabs)/project' as const,
    },
  } satisfies Record<
    PathStatusId,
    { title: string; detail: string; timing: string; action: string; href: string }
  >;
}
