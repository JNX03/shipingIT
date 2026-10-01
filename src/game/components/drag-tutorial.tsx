import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { cubicBezier } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { T } from '@/components/ui/text';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { colors } from '@/theme';
import { createDragTutorialController } from '../drag-tutorial';

export const dragTutorial = createDragTutorialController(AsyncStorage);

/** Original hand artwork explains the first real draggable; it never appears on tap-only questions. */
export function DragTutorial({ id, enabled }: { id: string; enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const reduced = useMotionReduced();
  useFocusEffect(useCallback(() => {
    let active = true;
    const unsubscribe = dragTutorial.subscribe(() => { if (active) setVisible(dragTutorial.visible(id)); });
    if (enabled) void dragTutorial.claim(id).then((show) => { if (active) setVisible(show); });
    return () => { active = false; unsubscribe(); dragTutorial.release(id); setVisible(false); };
  }, [enabled, id]));
  if (!visible || !enabled) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', top: -62, right: 0, width: 224, minHeight: 56, backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 2, borderRadius: 16, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 200 }}>
      <Animated.View style={reduced ? undefined : { animationName: { from: { transform: [{ translateX: -5 }] }, to: { transform: [{ translateX: 7 }] } }, animationDuration: 850, animationIterationCount: 2, animationDirection: 'alternate', animationTimingFunction: cubicBezier(0.77, 0, 0.175, 1) }}>
        <Svg width={40} height={42} viewBox="0 0 44 48" accessible={false}>
          <Path d="M16 25V7C16 2 23 2 23 7V22L25 18C27 15 31 17 30 21L32 20C36 19 38 22 36 26L38 26C42 27 41 31 39 34L33 44H18L8 31C5 27 10 23 13 26L16 29Z" fill="#FFD7B9" stroke="#9C603F" strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M18 44H33V47H18Z" fill="#4CB8F5" />
        </Svg>
      </Animated.View>
      <T variant="small" style={{ flex: 1 }}>Hold and drag. Or tap a piece, then its destination.</T>
    </View>
  );
}
