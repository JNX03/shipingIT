import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { getDailyProgress, getStreak } from '@/domain/progression';
import { GameIcon } from '@/components/ui/game-icon';
import { MomentumIcon } from '@/components/ui/momentum-icon';
import { T } from '@/components/ui/text';
import { colors } from '@/theme';
import { useLocalDay } from '@/components/profile/use-local-day';

export function StatusStrip() {
  const state = useAppStore();
  const now = useLocalDay();
  const daily = getDailyProgress(state, now);
  const streak = getStreak(state.activityDates, now);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a mission"
        onPress={() => router.push('/missions')}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <GameIcon name="learn" size={33} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${streak} day streak`}
        onPress={() => router.push('/streak')}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <MomentumIcon days={streak} size={29} />
        <T variant="subheading" style={{ color: colors.warning }}>
          {streak}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${state.xp} Sparks`}
        onPress={() => router.push('/(tabs)/profile')}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <GameIcon name="spark" size={29} />
        <T variant="subheading" style={{ color: colors.primaryPressed }}>
          {state.xp}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Daily goal, ${daily.completed} of ${daily.goal}`}
        onPress={() => router.push('/(tabs)/profile')}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <GameIcon name="reward" size={31} />
        <T variant="small" style={{ color: colors.text }}>
          {Math.min(daily.completed, daily.goal)}/{daily.goal}
        </T>
      </Pressable>
    </View>
  );
}
