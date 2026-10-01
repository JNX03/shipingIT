import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { rewardAssets } from '@/assets/registry';
import type { Achievement } from '@/domain/types';
import { colors, radius, space } from '@/theme';
import { Icon, type IconName } from './icon';
import { T } from './text';

const ICON_ALIASES: Record<string, IconName> = {
  user: 'interview',
  test: 'validate',
  insight: 'idea',
  pitch: 'ship',
  streak: 'momentum',
  perfect: 'spark',
};

export interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  newlyUnlocked?: boolean;
  size?: number;
  showLabel?: boolean;
}

export function AchievementBadge({
  achievement,
  unlocked,
  newlyUnlocked = false,
  size = 96,
  showLabel = false,
}: AchievementBadgeProps) {
  const isNew = unlocked && newlyUnlocked;
  const stateLabel = isNew
    ? 'New achievement unlocked'
    : unlocked
      ? 'Achievement unlocked'
      : 'Achievement locked';
  const label = `${achievement.title}. ${stateLabel}. ${unlocked ? achievement.description : achievement.requirement}`;
  const color = unlocked ? achievement.color : colors.muted;
  const icon = ICON_ALIASES[achievement.icon] ?? achievement.icon;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityLiveRegion={isNew ? 'polite' : undefined}
      style={styles.container}
      testID={`achievement-badge-${achievement.id}-${unlocked ? 'unlocked' : 'locked'}`}
    >
      <View
        style={{ width: size, height: size }}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {achievement.id === 'problem-hunter' && unlocked ? (
          <Image
            source={rewardAssets.problemHunter}
            style={{ width: size, height: size }}
            contentFit="contain"
            accessibilityLabel=""
          />
        ) : (
          <>
            <Svg width={size} height={size} viewBox="0 0 100 100">
              <Path
                d="m28 66-8 27 18-7 12 8 3-25m19-3 8 27-18-7-12 8-3-25"
                fill={unlocked ? color : colors.border}
                stroke={unlocked ? color : colors.muted}
                strokeWidth={3}
                strokeLinejoin="round"
              />
              <Path
                d="M50 5 83 17v28c0 18-15 30-33 37C32 75 17 63 17 45V17Z"
                fill={unlocked ? colors.surface : colors.surfaceMuted}
                stroke={color}
                strokeWidth={5}
                strokeLinejoin="round"
              />
              <Path
                d="m28 26 22-8 22 8"
                fill="none"
                stroke={unlocked ? color : colors.border}
                strokeWidth={3}
                strokeLinecap="round"
              />
            </Svg>
            <View style={[styles.glyph, { width: size, height: size * 0.78 }]}>
              <Icon name={icon} color={color} size={size * 0.34} />
            </View>
          </>
        )}
        <View
          style={[
            styles.status,
            {
              backgroundColor: unlocked ? colors.successSurface : colors.surfaceMuted,
            },
          ]}
        >
          <Icon
            name={unlocked ? 'check' : 'lock'}
            size={16}
            color={unlocked ? colors.success : colors.textSecondary}
          />
        </View>
      </View>
      {isNew ? (
        <T variant="caption" style={styles.newLabel}>
          NEW
        </T>
      ) : null}
      {showLabel ? (
        <T variant="caption" style={styles.title}>
          {achievement.title}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space.xs },
  glyph: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
  },
  status: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLabel: { color: colors.success, letterSpacing: 1 },
  title: { color: colors.text, textAlign: 'center' },
});
