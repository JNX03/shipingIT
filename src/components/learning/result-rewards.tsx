import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  css,
  cubicBezier,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import type { Achievement, Mission } from '@/domain/types';
import { ProfileBadge } from '@/components/profile/profile-primitives';
import { GameIcon } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { colors, fonts, motion, radius, space } from '@/theme';

const isWeb = Platform.OS === 'web';
const REWARD_POP = css.keyframes({
  '0%': { opacity: 0, transform: [{ scale: 0.94 }] },
  '65%': { opacity: 1, transform: [{ scale: 1.02 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }] },
});
const UNLOCK_REVEAL = css.keyframes({
  '0%': { opacity: 0, transform: [{ translateY: 8 }] },
  '100%': { opacity: 1, transform: [{ translateY: 0 }] },
});
const LOCK_AWAY = css.keyframes({
  '0%, 35%': { opacity: 1, transform: [{ scale: 1 }] },
  '100%': { opacity: 0, transform: [{ scale: 0.94 }] },
});
const MISSION_APPEAR = css.keyframes({
  '0%, 35%': { opacity: 0, transform: [{ scale: 0.94 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }] },
});

function WebSparksReel({
  value,
  count,
  fontScale,
  width,
}: {
  value: number;
  count: SharedValue<number>;
  fontScale: number;
  width: number;
}) {
  const rowHeight = Math.ceil(32 * fontScale);
  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.round(count.get()) * rowHeight }],
  }));
  return (
    <View
      aria-hidden
      style={{ width, height: rowHeight, overflow: 'hidden', pointerEvents: 'none' }}
      testID="earned-sparks-value"
    >
      <Animated.View style={[{ flexShrink: 0 }, reelStyle]}>
        {Array.from({ length: value + 1 }, (_, amount) => (
          <Text
            key={amount}
            allowFontScaling={false}
            style={[
              styles.number,
              {
                width,
                flexShrink: 0,
                height: rowHeight,
                lineHeight: rowHeight,
                fontSize: 25 * fontScale,
              },
            ]}
          >
            +{amount}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/** Native shows the final award immediately; the web reel keeps its existing count animation. */
export function EarnedSparks({ value, reduced }: { value: number; reduced: boolean }) {
  const { fontScale } = useWindowDimensions();
  const width = Math.max(68, Math.ceil((String(value).length + 1) * 25 * 0.72 * fontScale + 8));
  const count = useSharedValue(!isWeb || reduced || value === 0 ? value : 0);
  const started = useRef(false);
  useEffect(() => {
    cancelAnimation(count);
    // A late preference change settles the existing result; it never rewinds an earned total.
    if (!isWeb || started.current || reduced || value === 0) {
      started.current = true;
      count.set(value);
      return;
    }
    started.current = true;
    count.set(0);
    count.set(
      withTiming(value, {
        duration: motion.celebration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        reduceMotion: ReduceMotion.System,
      }),
    );
    return () => cancelAnimation(count);
  }, [count, reduced, value]);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${value} Sparks earned`}>
      {isWeb ? (
        <WebSparksReel value={value} count={count} fontScale={fontScale} width={width} />
      ) : (
        <Text
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.number,
            {
              width,
              minHeight: Math.ceil(32 * fontScale),
            },
          ]}
          testID="earned-sparks-value"
        >
          +{value}
        </Text>
      )}
    </View>
  );
}

export function NewAchievements({
  achievements,
  reduced,
}: {
  achievements: Achievement[];
  reduced: boolean;
}) {
  if (!achievements.length) return null;
  return (
    <View style={styles.section}>
      <T variant="subheading">
        {achievements.length === 1 ? 'Achievement unlocked' : 'Achievements unlocked'}
      </T>
      {achievements.map((achievement) => (
        <Pressable
          key={achievement.id}
          accessibilityRole="button"
          accessibilityLabel={`${achievement.title}, newly earned. ${achievement.description} View achievements.`}
          onPress={() => router.push('/achievements')}
          style={({ pressed }) => [styles.rewardRow, pressed && styles.pressed]}
        >
          <Animated.View
            style={
              reduced
                ? undefined
                : {
                    animationName: REWARD_POP,
                    animationDuration: 320,
                    animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
                    animationFillMode: 'both',
                  }
            }
          >
            <ProfileBadge achievement={achievement} unlocked size={56} />
          </Animated.View>
          <View style={styles.copy}>
            <T variant="subheading">{achievement.title}</T>
            <T variant="small">{achievement.description}</T>
          </View>
          <GameIcon name="check" size={22} />
        </Pressable>
      ))}
    </View>
  );
}

export function NextMissionUnlock({ mission, reduced }: { mission: Mission; reduced: boolean }) {
  const animated = {
    animationDuration: 420,
    animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
    animationFillMode: 'both' as const,
  };
  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Mission ${mission.id}, ${mission.title}, unlocked. ${mission.subtitle}`}
      style={[styles.unlock, !reduced && { ...animated, animationName: UNLOCK_REVEAL }]}
    >
      <View
        style={styles.unlockIcon}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {!reduced ? (
          <Animated.View style={[styles.iconLayer, animated, { animationName: LOCK_AWAY }]}>
            <GameIcon name="lock" size={38} variant="muted" />
          </Animated.View>
        ) : null}
        <Animated.View
          style={[styles.iconLayer, !reduced && { ...animated, animationName: MISSION_APPEAR }]}
        >
          <GameIcon name={mission.icon} size={38} />
        </Animated.View>
      </View>
      <View style={styles.copy}>
        <T variant="caption" style={styles.unlockLabel}>
          NEXT MISSION UNLOCKED
        </T>
        <T variant="subheading">
          {mission.id}. {mission.title}
        </T>
        <T variant="small">{mission.subtitle}</T>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  number: {
    pointerEvents: 'none',
    padding: 0,
    margin: 0,
    fontFamily: fonts.bold,
    fontSize: 25,
    lineHeight: 32,
    textAlign: 'center',
    color: '#995B00',
    backgroundColor: 'transparent',
  },
  section: { width: '100%', maxWidth: 410, gap: space.md },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  copy: { flex: 1, gap: space.xs },
  unlock: {
    width: '100%',
    maxWidth: 410,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderWidth: 2,
    borderRadius: radius.control,
    borderColor: colors.border,
  },
  unlockIcon: { width: 48, height: 48 },
  iconLayer: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  unlockLabel: { color: colors.primaryDeep },
});
