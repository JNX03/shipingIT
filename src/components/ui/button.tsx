import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, layout, motion, radius, space } from '@/theme';
import { T } from './text';
import { Icon, IconName } from './icon';
import { feedback } from '@/utils/feedback';
import type { GameCue } from '@/services/game-audio';
import { useMotionReduced } from '@/hooks/use-reduced-motion';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  compact?: boolean;
  mutedWhenDisabled?: boolean;
  selected?: boolean;
  haptic?: 'light' | 'selection' | 'medium' | false;
  sound?: GameCue | false;
  uppercase?: boolean;
};
const variants = {
  primary: {
    surface: colors.primaryPressed,
    edge: colors.primaryDeep,
    text: colors.surface,
  },
  secondary: {
    surface: colors.surface,
    edge: colors.border,
    text: colors.primaryPressed,
  },
  quiet: {
    surface: colors.surface,
    edge: colors.surface,
    text: colors.primaryPressed,
  },
  danger: { surface: colors.danger, edge: '#A42E41', text: colors.surface },
  success: { surface: colors.success, edge: '#26590F', text: colors.surface },
};
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  testID,
  compact = false,
  mutedWhenDisabled = true,
  selected,
  haptic = 'light',
  sound = 'snap',
  uppercase = true,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const reduced = useMotionReduced();
  const depression = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ translateY: depression.get() }] }));
  useEffect(() => {
    if (reduced || disabled || loading) depression.set(0);
  }, [reduced, disabled, loading, depression]);
  const muted = disabled && mutedWhenDisabled;
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading, selected }}
      aria-selected={selected}
      disabled={disabled || loading}
      android_disableSound
      testID={testID}
      onPressIn={() => {
        setPressed(true);
        depression.set(
          reduced
            ? 0
            : withTiming(3, {
                duration: motion.fast,
                easing: Easing.bezier(0.23, 1, 0.32, 1),
                reduceMotion: ReduceMotion.System,
              }),
        );
      }}
      onPressOut={() => {
        setPressed(false);
        depression.set(
          reduced
            ? 0
            : withSpring(0, { duration: 400, dampingRatio: 1, reduceMotion: ReduceMotion.System }),
        );
      }}
      onPress={() => {
        if (disabled || loading) return;
        feedback(haptic || 'light', { haptic: haptic !== false, sound });
        onPress();
      }}
      style={style}
    >
      <Animated.View
        style={[
          {
            minHeight: compact ? 44 : layout.buttonHeight,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderRadius: radius.control,
            borderCurve: 'continuous',
            backgroundColor: muted ? colors.surfaceMuted : v.surface,
            borderColor: muted ? colors.border : v.edge,
            borderWidth: variant === 'secondary' ? 2 : 0,
            borderBottomWidth: variant === 'quiet' ? 0 : pressed ? 2 : 4,
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.text} />
        ) : icon ? (
          <Icon name={icon} color={muted ? colors.muted : v.text} size={22} />
        ) : null}
        <T
          variant="button"
          style={{
            color: muted ? colors.muted : v.text,
            flexShrink: 1,
            textAlign: 'center',
            letterSpacing: uppercase ? 0.8 : 0,
          }}
        >
          {uppercase ? title.toUpperCase() : title}
        </T>
      </Animated.View>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  color = colors.textSecondary,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      android_disableSound
      onPress={() => {
        feedback('light');
        onPress();
      }}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={name} color={color} />
    </Pressable>
  );
}
