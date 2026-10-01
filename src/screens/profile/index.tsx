import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button, IconButton } from '@/components/ui/button';
import { GameIcon } from '@/components/ui/game-icon';
import { MomentumIcon } from '@/components/ui/momentum-icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProfileBadge, ProfileLinkRow } from '@/components/profile/profile-primitives';
import { useLocalDay } from '@/components/profile/use-local-day';
import { useAppStore } from '@/store/app-store';
import { getLevel, getStreak, getDailyProgress } from '@/domain/progression';
import { achievementDefinitions } from '@/data/achievements';
import { colors, radius, space } from '@/theme';

export function ProfileScreen() {
  const state = useAppStore();
  const { width, fontScale } = useWindowDimensions();
  const stackedStatistics = width <= 360 && fontScale >= 1.2;
  const now = useLocalDay();
  const daily = getDailyProgress(state, now);
  const earned = achievementDefinitions.filter((item) => state.achievements.includes(item.id));
  const shelf = earned.length ? earned.slice(-3) : achievementDefinitions.slice(0, 3);
  const statistics = [
    {
      icon: 'momentum',
      value: getStreak(state.activityDates, now),
      label: 'Day streak',
      route: '/streak',
    },
    { icon: 'spark', value: state.xp, label: 'Total Sparks', route: '/achievements' },
    { icon: 'learn', value: state.completedLessonIds.length, label: 'Lessons', route: '/(tabs)' },
    { icon: 'compete', value: earned.length, label: 'Badges', route: '/achievements' },
  ] as const;

  return (
    <Screen
      contentWidth={560}
      header={
        <PageHeader
          title="Profile"
          action={
            <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
          }
        />
      }
    >
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <GameIcon name="profile" size={68} />
        </View>
        <View style={styles.nameBlock}>
          <T variant="title">{state.profile.name}</T>
          <T variant="small">Level {getLevel(state.xp)}</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/settings')}
            style={styles.editName}
          >
            <T variant="caption" style={styles.link}>
              EDIT PROFILE
            </T>
          </Pressable>
        </View>
      </View>
      <View style={styles.statistics}>
        {statistics.map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={`${item.value} ${item.label}`}
            onPress={() => router.push(item.route)}
            style={({ pressed }) => [
              styles.stat,
              stackedStatistics && styles.statFull,
              !stackedStatistics && index % 2 === 0 && styles.statLeft,
              (stackedStatistics ? index < statistics.length - 1 : index < 2) && styles.statTop,
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}
          >
            {item.icon === 'momentum' ? (
              <MomentumIcon days={item.value} size={32} />
            ) : (
              <GameIcon name={item.icon} size={32} />
            )}
            <View style={styles.statCopy}>
              <T variant="heading">{item.value}</T>
              <T variant="small">{item.label}</T>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.daily}>
        <View style={styles.sectionHeader}>
          <T variant="subheading">Daily goal</T>
          <T variant="caption">
            {Math.min(daily.completed, daily.goal)} / {daily.goal}
          </T>
        </View>
        <ProgressBar
          value={daily.percent / 100}
          color={daily.complete ? colors.secondary : colors.primary}
        />
        <T variant="small">
          {daily.complete
            ? 'Goal complete for today.'
            : `${daily.goal - daily.completed} lesson${daily.goal - daily.completed === 1 ? '' : 's'} to go today.`}
        </T>
      </View>
      <View style={styles.achievements}>
        <View style={styles.sectionHeader}>
          <T variant="subheading">Achievements</T>
          <Button
            title="View all"
            compact
            variant="quiet"
            onPress={() => router.push('/achievements')}
          />
        </View>
        <View style={styles.shelf}>
          {shelf.map((achievement) => (
            <Pressable
              key={achievement.id}
              accessibilityRole="button"
              accessibilityLabel={`${achievement.title}, ${state.achievements.includes(achievement.id) ? 'earned' : 'locked'}. View achievements.`}
              onPress={() => router.push('/achievements')}
              style={styles.shelfItem}
            >
              <ProfileBadge
                achievement={achievement}
                unlocked={state.achievements.includes(achievement.id)}
                size={72}
              />
              <T variant="caption" style={styles.badgeTitle}>
                {achievement.title}
              </T>
            </Pressable>
          ))}
        </View>
        <T variant="small">
          {earned.length
            ? `${earned.length} of ${achievementDefinitions.length} earned`
            : 'Complete lessons to earn your first badge.'}
        </T>
      </View>
      <View style={styles.links}>
        <ProfileLinkRow
          label="Builder"
          icon="build"
          detail="Membership"
          onPress={() => router.push('/paywall')}
        />
        <ProfileLinkRow label="Account" icon="profile" onPress={() => router.push('/account')} />
      </View>
      {state.storageError ? (
        <T variant="caption" style={styles.saved}>
          Saving needs attention. Check your device storage.
        </T>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flex: 1, gap: space.xs },
  editName: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  link: { color: colors.primaryPressed, letterSpacing: 0.8 },
  statistics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  stat: {
    width: '50%',
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  statLeft: { borderRightWidth: 1, borderColor: colors.border },
  statFull: { width: '100%' },
  statTop: { borderBottomWidth: 1, borderColor: colors.border },
  statCopy: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  daily: {
    gap: space.md,
    paddingBottom: space.xl,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  achievements: { gap: space.md },
  shelf: { flexDirection: 'row', gap: space.md },
  shelfItem: { flex: 1, alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  badgeTitle: { textAlign: 'center', color: colors.text },
  links: { borderTopWidth: 1, borderColor: colors.border },
  saved: { color: colors.textSecondary, textAlign: 'center' },
});
