import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useLocalDay } from '@/components/profile/use-local-day';
import { ProfileToolbar } from '@/game/components/profile-chrome';
import { gamePropArt } from '@/game/art';
import { GameActor } from '@/game/components/actor';
import {
  retryProfileQuests,
  selectDailyQuests,
  useProfileQuests,
} from '@/game/profile-quests-runtime';
import { colors, fonts, radius, space } from '@/theme';
import type { DailyQuestId } from '@/game/profile-quests';

export default function Quests() {
  const quests = useProfileQuests();
  const now = useLocalDay();
  const [notice, setNotice] = useState('');
  const [claiming, setClaiming] = useState<DailyQuestId | null>(null);
  const entries = selectDailyQuests(quests, now);
  const completed = entries.filter((quest) => quest.claimed).length;
  const claim = async (id: DailyQuestId, day: string) => {
    if (claiming) return;
    setClaiming(id);
    const result = await quests.claim(id, day);
    setNotice(
      result.success
        ? result.alreadyClaimed
          ? 'Already claimed for today.'
          : `Claimed ${result.xpEarned} Sparks. Keep building!`
        : result.message,
    );
    setClaiming(null);
  };
  return (
    <Screen
      contentWidth={520}
      header={
        <ProfileToolbar
          title="Daily quests"
          back
          action={{ label: 'Profile', onPress: () => router.push('/(tabs)/profile') }}
        />
      }
      style={styles.page}
    >
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <T variant="title" style={styles.heroTitle}>
            Small steps add up.
          </T>
          <T variant="small" style={styles.heroDetail}>
            Finish fresh work today, then claim the Sparks you earned.
          </T>
          <T variant="small" style={styles.heroDetail}>
            {completed} of {entries.length} rewards claimed today
          </T>
        </View>
        <GameActor character="ami" motion="celebrate" size={100} style={styles.heroArt} />
      </View>
      <View style={styles.heading}>
        <T variant="heading" accessibilityRole="header">
          Today’s quests
        </T>
        <T variant="small">Reset at your local midnight</T>
      </View>
      {!quests.hydrated || !quests.ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primaryPressed} />
          <T variant="small">Checking today’s progress...</T>
        </View>
      ) : null}
      {quests.error || quests.sourceError ? (
        <View style={styles.error}>
          <T variant="small" accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>
            {quests.error || quests.sourceError}
          </T>
          <Button
            title="Retry saving"
            variant="secondary"
            compact
            onPress={() => void retryProfileQuests().then((result) => setNotice(result.message))}
          />
        </View>
      ) : null}
      {quests.hydrated && quests.ready ? (
        <View style={styles.list}>
          {entries.map((quest) => (
            <View key={quest.id} style={styles.quest}>
              <View style={styles.questTop}>
                <View style={styles.questCopy}>
                  <T variant="subheading">{quest.title}</T>
                  <T variant="small">{quest.detail}</T>
                </View>
                <Image
                  source={gamePropArt.reward}
                  contentFit="contain"
                  accessible={false}
                  style={styles.rewardArt}
                />
              </View>
              <View
                style={styles.progressWrap}
                accessibilityRole="progressbar"
                accessibilityLabel={`${quest.title}: ${quest.progress} of ${quest.target} ${quest.metric === 'sparks' ? 'base Sparks' : 'new steps'}`}
                accessibilityValue={{ min: 0, max: quest.target, now: quest.progress }}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round((100 * quest.progress) / quest.target)}%` },
                  ]}
                />
                <T variant="small" style={styles.progressText}>
                  {quest.progress} / {quest.target}
                </T>
              </View>
              <View style={styles.rewardRow}>
                <T variant="small">Reward: {quest.rewardXP} Sparks</T>
                {quest.claimed ? (
                  <T variant="small" style={styles.claimed}>
                    Claimed
                  </T>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Claim ${quest.rewardXP} Sparks for ${quest.title}`}
                    accessibilityState={{
                      disabled:
                        !quest.claimable ||
                        Boolean(claiming) ||
                        Boolean(quests.error || quests.sourceError || quests.saving),
                    }}
                    disabled={
                      !quest.claimable ||
                      Boolean(claiming) ||
                      Boolean(quests.error || quests.sourceError || quests.saving)
                    }
                    onPress={() => void claim(quest.id, quest.day)}
                    style={({ pressed }) => [
                      styles.claim,
                      !quest.claimable && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <T variant="button" style={styles.claimText}>
                      {claiming === quest.id
                        ? 'Saving...'
                        : quest.claimable
                          ? 'Claim'
                          : 'In progress'}
                    </T>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {notice ? (
        <T variant="small" accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </T>
      ) : null}
      <T variant="small">
        Only the first completion of each stage, lesson, or practice counts. Quest rewards are added
        to your total Sparks after they save on this device.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space.xl },
  hero: {
    backgroundColor: colors.premium,
    borderRadius: radius.large,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 176,
    gap: space.sm,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: space.sm },
  heroTitle: { color: colors.surface },
  heroDetail: { color: colors.surface },
  heroArt: { width: 100, height: 128 },
  heading: { gap: space.xs },
  list: { gap: space.md },
  quest: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.large,
    padding: space.lg,
    gap: space.md,
  },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  questCopy: { flex: 1, minWidth: 0, gap: space.xs },
  rewardArt: { width: 56, height: 56 },
  progressWrap: {
    width: '100%',
    height: 27,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.pill,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  progressText: { textAlign: 'center', color: colors.dark, fontFamily: fonts.bold },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  claim: {
    minWidth: 94,
    minHeight: 48,
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  claimText: { color: colors.surface },
  claimed: { color: colors.success, fontFamily: fonts.bold },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  notice: { color: colors.textSecondary },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  error: {
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: radius.control,
    padding: space.md,
    gap: space.sm,
  },
});
