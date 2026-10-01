import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { colors, motion, radius } from '@/theme';
import { useAppStore } from '@/store/app-store';
export function ProgressBar({
  value,
  color = colors.primary,
  height = 14,
  label = 'Progress',
}: {
  value: number;
  color?: string;
  height?: number;
  label?: string;
}) {
  const appReduced = useAppStore((s) => s.settings.reducedMotion);
  const systemReduced = useReducedMotion();
  const reduced = appReduced || systemReduced;
  const bounded = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(bounded * 100) }}
      style={{
        height,
        backgroundColor: colors.path,
        borderRadius: radius.pill,
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${bounded * 100}%`,
          backgroundColor: color,
          borderRadius: radius.pill,
          transitionProperty: 'width',
          transitionDuration: reduced ? 0 : motion.base,
        }}
      />
      <View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 5,
          right: 5,
          top: 3,
          height: 3,
          borderRadius: radius.pill,
          backgroundColor: 'rgba(255,255,255,0.22)',
        }}
      />
    </View>
  );
}
