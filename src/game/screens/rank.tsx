import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { colors, radius, space } from '@/theme';
import { useAppStore } from '@/store/app-store';
import { useAdventure } from '../store';
import { challengeXP, useChallenges } from '../challenge-store';
import { profileQuestStore, totalProfileXP } from '../profile-quests-runtime';
import { builderRank } from '../rank';
import { GameLoading } from '../components/loading';

const explanations = [
  {
    icon: 'star',
    title: '100 earned Sparks = one level',
    detail:
      'You start at level 1. New lessons, games, practices, and claimed quest rewards add earned Sparks. Replays help you practice without another reward.',
  },
  {
    icon: 'compete',
    title: 'Your own learning progress',
    detail:
      'This is a personal rank for your saved learning record. It isn’t a global leaderboard or a comparison with other players.',
  },
  {
    icon: 'reward',
    title: 'Spend without going backwards',
    detail:
      'Clothes and skips use your wallet balance. Spending never removes the Sparks you already earned or lowers your rank.',
  },
  {
    icon: 'boss',
    title: 'Pro gives tools, not a purchased rank',
    detail:
      'Buying Pro adds no Sparks or levels. Completing activities earns progress, including the extra labs available with Pro.',
  },
] as const;

export function BuilderRankScreen() {
  const app = useAppStore();
  const adventure = useAdventure();
  const challenges = useChallenges();
  const quests = profileQuestStore();
  if (!app.hydrated || !adventure.hydrated || !challenges.hydrated || !quests.ready)
    return <GameLoading message="Opening your builder rank…" />;
  const rank = builderRank(totalProfileXP(app, adventure, quests, challengeXP(challenges)));
  return (
    <Screen
      contentWidth={560}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <GameIcon name="compete" size={36} />
          <T variant="heading" accessibilityRole="header">
            Builder rank
          </T>
        </View>
      }
      footer={<Button title="Return to path" onPress={() => router.replace('/(tabs)')} />}
    >
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.md }}>
        <View style={{ width: 156, height: 144, alignItems: 'center', justifyContent: 'center' }}>
          <GameIcon name="compete" size={112} />
          <GameIcon name="star" size={28} style={{ position: 'absolute', left: 0, top: 18 }} />
          <GameIcon name="star" size={23} style={{ position: 'absolute', right: 0, top: 55 }} />
        </View>
        <T variant="hero" accessibilityRole="header" style={{ color: colors.primaryPressed }}>
          Level {rank.level}
        </T>
        <T>{rank.earned} Sparks earned</T>
      </View>
      <View style={{ gap: space.sm }}>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: rank.towardNext,
            text: `${rank.towardNext} of 100 Sparks toward level ${rank.nextLevel}`,
          }}
          style={{
            height: 20,
            backgroundColor: colors.border,
            borderRadius: radius.pill,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${rank.percent}%`,
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: radius.pill,
            }}
          />
        </View>
        <T variant="small" style={{ textAlign: 'center' }}>
          {rank.remaining} more earned Sparks to level {rank.nextLevel}
        </T>
      </View>
      {explanations.map((item) => (
        <View
          key={item.title}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space.md,
            paddingVertical: space.sm,
          }}
        >
          <GameIcon name={item.icon} size={40} />
          <View style={{ flex: 1, gap: space.xs }}>
            <T variant="subheading">{item.title}</T>
            <T variant="small">{item.detail}</T>
          </View>
        </View>
      ))}
    </Screen>
  );
}
