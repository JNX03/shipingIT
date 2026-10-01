import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { css, cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { useAppStore } from '@/store/app-store';
import { colors, motion } from '@/theme';

const PARTICLES = [
  {
    x: -146,
    y: -104,
    drift: -174,
    turn: -160,
    color: colors.primary,
    shape: 'pill',
  },
  {
    x: -106,
    y: -154,
    drift: -132,
    turn: 115,
    color: colors.accent,
    shape: 'square',
  },
  {
    x: -62,
    y: -180,
    drift: -80,
    turn: -120,
    color: colors.secondary,
    shape: 'dot',
  },
  {
    x: -20,
    y: -156,
    drift: -26,
    turn: 170,
    color: colors.primary,
    shape: 'pill',
  },
  {
    x: 28,
    y: -182,
    drift: 38,
    turn: 100,
    color: colors.accent,
    shape: 'square',
  },
  {
    x: 70,
    y: -160,
    drift: 96,
    turn: -160,
    color: colors.secondary,
    shape: 'pill',
  },
  {
    x: 116,
    y: -134,
    drift: 146,
    turn: 145,
    color: colors.primary,
    shape: 'dot',
  },
  {
    x: 150,
    y: -90,
    drift: 177,
    turn: 190,
    color: colors.accent,
    shape: 'square',
  },
  {
    x: -120,
    y: -38,
    drift: -151,
    turn: 125,
    color: colors.secondary,
    shape: 'square',
  },
  {
    x: -74,
    y: -68,
    drift: -100,
    turn: -135,
    color: colors.primary,
    shape: 'dot',
  },
  { x: 78, y: -66, drift: 102, turn: 165, color: colors.accent, shape: 'pill' },
  {
    x: 126,
    y: -32,
    drift: 152,
    turn: -145,
    color: colors.secondary,
    shape: 'dot',
  },
] as const;

const PARTICLE_KEYFRAMES = PARTICLES.map((particle) =>
  css.keyframes({
    '0%': { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] },
    '12%': { opacity: 1 },
    '58%': {
      opacity: 1,
      transform: [
        { translateX: particle.x },
        { translateY: particle.y },
        { rotate: `${particle.turn * 0.6}deg` },
      ],
    },
    '100%': {
      opacity: 0,
      transform: [
        { translateX: particle.drift },
        { translateY: particle.y + 92 },
        { rotate: `${particle.turn}deg` },
      ],
    },
  }),
);

export interface CelebrationProps {
  active?: boolean;
  /** Change this key only for a new completion; rerenders do not replay it. */
  replayKey?: string | number;
}

/** A rare completion delight. No touch capture, layout animation, sound, or haptic side effects. */
export function Celebration({ active = true, replayKey = 'complete' }: CelebrationProps) {
  const appReduced = useAppStore((state) => state.settings.reducedMotion);
  const initialSystemReduced = useReducedMotion();
  // Unknown system preference is conservative: show no burst until it is resolved.
  const [systemReduced, setSystemReduced] = useState<boolean | null>(
    initialSystemReduced ? true : null,
  );

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setSystemReduced(value);
      })
      .catch(() => {
        if (mounted) setSystemReduced(true);
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduced,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!active || appReduced || systemReduced !== false) return null;

  return (
    <View
      key={replayKey}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
      testID="lesson-celebration"
    >
      {PARTICLES.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              width: particle.shape === 'pill' ? 7 : 9,
              height: particle.shape === 'pill' ? 15 : 9,
              borderRadius: particle.shape === 'dot' ? 9 : 3,
              backgroundColor: particle.color,
              opacity: 0,
              animationName: PARTICLE_KEYFRAMES[index],
              animationDuration: motion.celebration,
              animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
              animationIterationCount: 1,
              animationFillMode: 'forwards',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 5,
    pointerEvents: 'none',
  },
  particle: { position: 'absolute', left: '50%', top: '52%' },
});
