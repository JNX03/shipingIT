import { View } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { getDailyProgress, getLevelProgress } from '@/domain/progression';
import { GameIcon } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { colors, radius, space } from '@/theme';
import { useLocalDay } from '@/components/profile/use-local-day';

export function QuestSummary() {
  const state = useAppStore();
  const now = useLocalDay();
  const daily = getDailyProgress(state, now);
  const level = getLevelProgress(state.xp);
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius.card,
        padding: space.page,
        gap: space.lg,
      }}
    >
      <T variant="subheading">Daily quest</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <GameIcon name="momentum" size={44} />
        <View style={{ flex: 1, gap: space.sm }}>
          <T variant="small" style={{ color: colors.text }}>
            Complete {daily.goal} lesson{daily.goal > 1 ? 's' : ''}
          </T>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <ProgressBar value={daily.percent / 100} color={colors.accent} height={16} />
            <T variant="caption">
              {Math.min(daily.completed, daily.goal)}/{daily.goal}
            </T>
          </View>
        </View>
      </View>
      <View style={{ height: 2, backgroundColor: colors.border }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <GameIcon name="spark" size={40} />
        <View style={{ flex: 1, gap: space.sm }}>
          <T variant="small" style={{ color: colors.text }}>
            Level {level.level}
          </T>
          <ProgressBar value={level.percent / 100} color={colors.primary} height={12} />
          <T variant="caption">
            {level.current}/{level.target} Sparks to the next level
          </T>
        </View>
      </View>
      <Button
        title="View progress"
        variant="quiet"
        compact
        onPress={() => router.push('/(tabs)/profile')}
      />
    </View>
  );
}
