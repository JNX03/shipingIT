import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GameActor } from '@/game/components/actor';
import { Icon } from '@/components/ui/icon';
import { T } from '@/components/ui/text';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { colors, radius, space } from '@/theme';
import { ProUpgradeDetails } from './pro-upgrade-details';
import type { ProUpgradeReceipt } from './pro-upgrade';

const DURATION = 2200;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();
const sparkPositions = [
  [-72, -48],
  [64, -54],
  [-82, 30],
  [70, 38],
] as const;

/** Only mounts for a verified transaction receipt. A UI timeline changes no learning/billing state. */
export function ProUpgradeCelebration({
  receipt,
  skipAnimation,
  onComplete,
}: {
  receipt: ProUpgradeReceipt;
  skipAnimation: boolean;
  onComplete: () => void;
}) {
  const reduced = useMotionReduced();
  const [playing, setPlaying] = useState(!reduced);
  const alive = useRef(true);
  const androidFocused = useRef(true);
  const progress = useSharedValue(reduced ? 1 : 0);
  const finish = useCallback(() => {
    if (alive.current) {
      setPlaying(false);
      onComplete();
    }
  }, [onComplete]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelAnimation(progress);
    };
  }, [progress]);
  useEffect(() => {
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    const doc = Platform.OS === 'web' && typeof document !== 'undefined' ? document : null;
    const sync = () => {
      cancelAnimation(progress);
      if (reduced || skipAnimation || !playing) {
        progress.set(1);
        if (playing || (reduced && !skipAnimation)) finish();
        return;
      }
      if (!foreground || !androidFocused.current || doc?.visibilityState === 'hidden') return;
      const remaining = Math.max(0, 1 - progress.get());
      progress.set(
        withTiming(
          1,
          {
            duration: DURATION * remaining,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.System,
          },
          (done) => {
            if (done) scheduleOnRN(finish);
          },
        ),
      );
    };
    const state = AppState.addEventListener('change', (value) => {
      foreground = value === 'active';
      sync();
    });
    const blur =
      Platform.OS === 'android'
        ? AppState.addEventListener('blur', () => {
            androidFocused.current = false;
            sync();
          })
        : null;
    const focus =
      Platform.OS === 'android'
        ? AppState.addEventListener('focus', () => {
            androidFocused.current = true;
            sync();
          })
        : null;
    doc?.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      cancelAnimation(progress);
      state.remove();
      blur?.remove();
      focus?.remove();
      doc?.removeEventListener('visibilitychange', sync);
    };
  }, [finish, playing, progress, reduced, skipAnimation]);
  const charge = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.max(0, (progress.get() - 0.3) / 0.25)),
    transform: [{ rotate: `${interpolate(progress.get(), [0, 0.5, 1], [-8, 0, 0])}deg` }],
  }));
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(progress.get(), [0, 0.3, 1], [0.08, 1, 1]) }],
  }));
  const star = useAnimatedStyle(() => {
    const phase = EASE_OUT(Math.max(0, Math.min(1, (progress.get() - 0.3) / 0.3)));
    return {
      opacity: phase,
      transform: [{ rotate: `${-20 * (1 - phase)}deg` }, { scale: 0.94 + phase * 0.06 }],
    };
  });
  const badge = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, (progress.get() - 0.56) / 0.14)),
    transform: [{ translateY: 6 * (1 - Math.max(0, Math.min(1, (progress.get() - 0.56) / 0.14))) }],
  }));
  return (
    <View style={{ gap: space.lg }} testID="pro-upgrade-celebration">
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.stage}>
        <View style={styles.emblem}>
          <Animated.View style={[styles.charge, charge]}>
            <Animated.View style={[styles.fill, fill]} />
            <Icon name="momentum" size={66} color={colors.primaryDeep} filled />
          </Animated.View>
          <Animated.View style={[styles.star, star]}>
            <Icon name="spark" size={82} color={colors.accent} filled />
          </Animated.View>
          {sparkPositions.map(([x, y], index) => (
            <UpgradeSpark key={index} x={x} y={y} progress={progress} />
          ))}
          <Animated.View style={[styles.badge, badge]}>
            <T variant="button">PRO ∞</T>
          </Animated.View>
        </View>
        <GameActor
          character="ami"
          motion={playing && !skipAnimation ? 'celebrate' : 'still'}
          active={playing && !skipAnimation}
          size={190}
          style={styles.ami}
        />
      </View>
      <ProUpgradeDetails kind={receipt.kind} sandbox={receipt.isSandbox} />
    </View>
  );
}

function UpgradeSpark({
  x,
  y,
  progress,
}: {
  x: number;
  y: number;
  progress: ReturnType<typeof useSharedValue<number>>;
}) {
  const style = useAnimatedStyle(() => {
    const phase = Math.max(0, Math.min(1, (progress.get() - 0.36) / 0.24));
    return {
      opacity: phase < 1 ? Math.sin(phase * Math.PI) : 0,
      transform: [
        { translateX: x * phase },
        { translateY: y * phase },
        { rotate: `${phase * 40}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.spark, style]}>
      <Icon name="spark" size={18} color={colors.primary} filled />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 212,
    borderRadius: radius.large,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySurface,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emblem: { width: 146, height: 150, alignItems: 'center', justifyContent: 'center' },
  charge: {
    position: 'absolute',
    width: 90,
    height: 100,
    borderRadius: radius.large,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  fill: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.primary,
    opacity: 0.18,
    transformOrigin: 'bottom',
  },
  star: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.pill,
  },
  ami: { marginLeft: -space.md },
  spark: { position: 'absolute', left: 64, top: 60 },
});
