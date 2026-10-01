import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useAppStore } from '@/store/app-store';

let lastKnownSystemReduced: boolean | null = null;

/** App preference and live OS preference both suppress optional movement. */
export function useMotionReduced() {
  const appReduced = useAppStore((state) => state.settings.reducedMotion);
  const initialSystemReduced = useReducedMotion();
  const [systemReduced, setSystemReduced] = useState<boolean | null>(
    lastKnownSystemReduced ?? (initialSystemReduced ? true : null),
  );
  useEffect(() => {
    let mounted = true;
    const update = (value: boolean) => {
      lastKnownSystemReduced = value;
      if (mounted) setSystemReduced(value);
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(update)
      .catch(() => {
        update(true);
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return appReduced || systemReduced !== false;
}
