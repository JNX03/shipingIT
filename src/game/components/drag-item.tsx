import { useCallback, useId, useMemo, type ReactNode } from 'react';
import { Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { feedback } from '@/utils/feedback';
import { DragTutorial, dragTutorial } from './drag-tutorial';

export interface DropEvent {
  id: string;
  absoluteX: number;
  absoluteY: number;
  translationX?: number;
  translationY?: number;
}

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pointInRect(point: Pick<DropEvent, 'absoluteX' | 'absoluteY'>, rect: WindowRect) {
  return (
    point.absoluteX >= rect.x &&
    point.absoluteX <= rect.x + rect.width &&
    point.absoluteY >= rect.y &&
    point.absoluteY <= rect.y + rect.height
  );
}

export interface DraggableItemProps {
  id: string;
  children: ReactNode;
  onDrop: (event: DropEvent) => void;
  onTap?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  selected?: boolean;
  haptic?: boolean;
}

/** Hold to lift, then drag. A normal tap remains a fully supported alternative. */
export function DraggableItem({
  id,
  children,
  onDrop,
  onTap,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint = 'Hold briefly and drag. Or tap to select, then tap a destination.',
  selected = false,
  haptic = true,
}: DraggableItemProps) {
  const reduced = useMotionReduced();
  const tutorialId = useId();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lifted = useSharedValue(false);
  const finishDrop = useCallback(
    (absoluteX: number, absoluteY: number, translationX: number, translationY: number) => {
      feedback('light', { sound: 'snap', haptic });
      void dragTutorial.complete(tutorialId);
      onDrop({ id, absoluteX, absoluteY, translationX, translationY });
    },
    [haptic, id, onDrop, tutorialId],
  );
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .activateAfterLongPress(Platform.OS === 'web' ? 0 : 140)
        .onStart(() => {
          lifted.set(true);
        })
        .onUpdate((event) => {
          x.set(event.translationX);
          y.set(event.translationY);
        })
        .onEnd((event) => {
          scheduleOnRN(
            finishDrop,
            event.absoluteX,
            event.absoluteY,
            event.translationX,
            event.translationY,
          );
        })
        .onFinalize(() => {
          lifted.set(false);
          const spring = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System };
          x.set(reduced ? 0 : withSpring(0, spring));
          y.set(reduced ? 0 : withSpring(0, spring));
        }),
    [disabled, finishDrop, lifted, reduced, x, y],
  );
  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: lifted.get() ? 100 : selected ? 2 : 1,
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: lifted.get() && !reduced ? 1.035 : 1 },
    ],
    opacity: disabled ? 0.55 : 1,
  }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, animatedStyle]} collapsable={false}>
        <DragTutorial id={tutorialId} enabled={!disabled} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ selected, disabled }}
          disabled={disabled}
          onPress={() => {
            void dragTutorial.complete(tutorialId);
            if (haptic) feedback('selection');
            onTap?.();
          }}
          style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
        >
          {children}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
