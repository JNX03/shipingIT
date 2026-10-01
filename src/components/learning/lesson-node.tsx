import { Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { GameIcon, type GameIconName } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { useAppStore } from '@/store/app-store';
import { type Lesson, type LessonState } from '@/domain/types';
import { colors, fonts } from '@/theme';
import { feedback } from '@/utils/feedback';

const nodeIcons: Record<string, GameIconName> = {
  lesson: 'star',
  quiz: 'star',
  project: 'project',
  mentor: 'mentor',
  experiment: 'discover',
  reward: 'reward',
  checkpoint: 'checkpoint',
  boss: 'boss',
};
export function LevelButton({
  icon,
  state,
  label,
  onPress,
  showStart = false,
}: {
  icon: GameIconName;
  state: LessonState;
  label: string;
  onPress: () => void;
  showStart?: boolean;
}) {
  const reduced = useReducedMotion();
  const appReduced = useAppStore((s) => s.settings.reducedMotion);
  const locked = state === 'locked',
    mastered = state === 'mastered';
  const face = locked ? colors.border : mastered ? colors.accent : colors.primary;
  const base = locked ? '#C8C8C8' : mastered ? '#E49A13' : colors.primaryPressed;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 96, height: 88 }}>
      {showStart ? (
        <View
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: -35,
            zIndex: 3,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 2,
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <T
              variant="caption"
              style={{ fontFamily: fonts.heavy, color: colors.primaryPressed, letterSpacing: 0.8 }}
            >
              START
            </T>
          </View>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: colors.surface,
              borderBottomWidth: 2,
              borderRightWidth: 2,
              borderColor: colors.border,
              transform: [{ rotate: '45deg' }],
              marginTop: -7,
            }}
          />
        </View>
      ) : null}
      <View
        style={{
          width: state === 'current' ? 94 : 80,
          height: state === 'current' ? 84 : 70,
          borderWidth: state === 'current' ? 5 : 0,
          borderColor: colors.border,
          borderRadius: 50,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            feedback('light');
            onPress();
          }}
          style={({ pressed }) => ({
            width: 74,
            height: 64,
            borderRadius: 40,
            backgroundColor: face,
            borderBottomWidth: pressed ? 3 : 7,
            borderColor: base,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: pressed && !reduced && !appReduced ? 4 : 0 }],
          })}
        >
          <View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              top: 8,
              width: 36,
              height: 4,
              borderRadius: 10,
              backgroundColor: locked ? '#EFEFEF' : 'rgba(255,255,255,0.16)',
            }}
          />
          {mastered ? (
          <GameIcon name="check" variant="ink" size={35} />
          ) : (
            <GameIcon name={icon} size={35} variant={locked ? 'muted' : 'white'} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
export function LessonNode({
  lesson,
  state,
  onPress,
  selected = false,
}: {
  lesson: Lesson;
  state: LessonState;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <LevelButton
      icon={nodeIcons[lesson.nodeType] ?? 'star'}
      state={state}
      label={`${lesson.title}, ${state}${state === 'current' ? `, ${lesson.xp} Sparks` : ''}`}
      onPress={onPress}
      showStart={state === 'current' && !selected}
    />
  );
}
