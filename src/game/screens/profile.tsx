import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { SignOutRow } from '@/components/auth/sign-out-row';
import { useAppStore } from '@/store/app-store';
import { getLevel, getStreak } from '@/domain/progression';
import { useLocalDay } from '@/components/profile/use-local-day';
import { colors, radius, space } from '@/theme';
import { useAdventure } from '../store';
import { useChallenges, challengeXP } from '../challenge-store';
import { totalProfileXP, useProfileQuests } from '../profile-quests-runtime';
import { ProfileAvatar } from '../components/profile-avatar';
import { useSavedProfileAvatar } from '../profile-avatar-store';
import { ProfileGroup, ProfileNavigationRow, ProfileToolbar } from '../components/profile-chrome';
import { gameStages } from '../catalog';
import { combinedActivityDates, practiceActivityDates } from '../activity';

export function AdventureProfile() {
  const game = useAdventure();
  const learning = useAppStore();
  const challenges = useChallenges();
  const quests = useProfileQuests();
  const avatar = useSavedProfileAvatar();
  const now = useLocalDay();
  const xp = totalProfileXP(learning, game, quests, challengeXP(challenges));
  const streak = getStreak(
    combinedActivityDates(
      learning.activityDates,
      game.activityDates,
      practiceActivityDates(challenges.completed, now),
    ),
    now,
  );
  const name = learning.profile.name.trim() || 'Explorer';
  const savingIssue =
    game.error ||
    learning.storageError ||
    challenges.saveError ||
    quests.error ||
    quests.sourceError ||
    avatar.error;
  return (
    <Screen
      contentWidth={520}
      header={
        <ProfileToolbar
          title={name}
          alignment="start"
          action={{ label: 'Settings', icon: 'settings', onPress: () => router.push('/settings') }}
        />
      }
    >
      <View style={styles.identity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Customize your avatar"
          onPress={() => router.push('/avatar')}
          style={styles.avatarButton}
        >
          <ProfileAvatar avatar={avatar.selection} size={248} />
        </Pressable>
        <View style={styles.nameBlock}>
          <T variant="subheading">Level {getLevel(xp)} builder</T>
        </View>
        <View style={styles.customize}>
          <Button
            title="Customize"
            variant="secondary"
            onPress={() => router.push('/avatar')}
          />
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat} accessible accessibilityLabel={`${xp} earned learning Sparks`}>
          <T variant="heading" style={styles.statNumber}>{xp.toLocaleString('en')}</T>
          <T variant="small" style={styles.centerCopy}>Earned Sparks</T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${streak} day streak. Open activity calendar.`}
          onPress={() => router.push('/streak')}
          style={[styles.stat, styles.statDivider]}
        >
          <T variant="heading" style={styles.statNumber}>{streak}</T>
          <T variant="small" style={styles.centerCopy}>
            Day streak
          </T>
        </Pressable>
        <View
          style={[styles.stat, styles.statDivider]}
          accessible
          accessibilityLabel={`${game.completed.length} of ${gameStages.length} stages complete`}
        >
          <T variant="heading" style={styles.statNumber}>{game.completed.length}/{gameStages.length}</T>
          <T variant="small">Stages</T>
        </View>
      </View>
      <T variant="small" style={styles.levelCopy}>
        Personal learning level: 100 earned Sparks per level. Spending Sparks or buying Pro doesn’t raise it.
      </T>
      <ProfileGroup title="Your learning">
        <ProfileNavigationRow
          title="Learning path"
          detail={`${learning.completedLessonIds.length} lessons completed`}
          onPress={() => router.push('/(tabs)')}
        />
        <ProfileNavigationRow
          title="Daily quests"
          detail="Learn and claim your rewards"
          onPress={() => router.push('/quests')}
        />
        <ProfileNavigationRow
          title="Practice"
          detail="Try a skill at your own pace"
          onPress={() => router.push('/(tabs)/compete')}
        />
      </ProfileGroup>
      <ProfileGroup title="Your work">
        <ProfileNavigationRow
          title="My app"
          detail={
            game.draft.launch.shipped
              ? 'Open the prototype you shipped'
              : 'Your latest playable build'
          }
          onPress={() => router.push('/(tabs)/project')}
        />
        <ProfileNavigationRow
          title="My notes"
          detail="Ideas, evidence and next steps"
          onPress={() => router.push('/notebook')}
        />
        <ProfileNavigationRow
          title="Builder milestones"
          detail={`${game.earned.length}/${gameStages.length} earned · View your path`}
          onPress={() => router.push('/(tabs)')}
        />
      </ProfileGroup>
      <ProfileGroup title="Make it yours">
        <ProfileNavigationRow
          title="Sparks shop"
          detail="Unlock outfits for your character"
          onPress={() => router.push('/shop')}
        />
        <ProfileNavigationRow
          title="ShipingIT Pro"
          detail="Lesson helpers, bonus labs and unlimited Sparks"
          onPress={() => router.push('/paywall')}
        />
      </ProfileGroup>
      <ProfileGroup title="Account">
        <ProfileNavigationRow
          title="Account details"
          onPress={() => router.push('/account')}
        />
        <SignOutRow />
      </ProfileGroup>
      <T variant="small" accessibilityLiveRegion="polite" style={styles.centerCopy}>
        {savingIssue
          ? 'Saving needs attention. Your open work is still here.'
          : 'Progress and your avatar are saved on this device.'}
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { gap: space.sm, alignItems: 'center' },
  avatarButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xs },
  nameBlock: { alignItems: 'center' },
  customize: { width: 168 },
  centerCopy: { textAlign: 'center' },
  statNumber: { fontVariant: ['tabular-nums'] },
  levelCopy: { textAlign: 'center', marginTop: -space.md },
  stats: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.large,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    gap: space.xs,
    minHeight: 72,
  },
  statDivider: { borderLeftWidth: 1, borderColor: colors.border },
});
