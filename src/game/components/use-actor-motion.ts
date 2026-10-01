import { NavigationContext } from 'expo-router/react-navigation';
import { useContext, useEffect, useId } from 'react';
import { AppState, Platform } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { actorActivity, actorMayRun, actorMotionPriority } from '../actor-activity';
import type { GameMotion } from '../avatar-motion';

// Persist window blur across actors mounting or changing motion while the notification shade is open.
let androidWindowFocused = true;

/** One shared actor clock across mentor, NPC and player renderers. */
export function useActorMotion(motion: GameMotion, active: boolean) {
  const id = useId();
  const navigation = useContext(NavigationContext);
  const reduced = useMotionReduced();
  const elapsed = useSharedValue(0);
  const running = useSharedValue(false);
  const frame = useFrameCallback((info) => {
    if (running.get()) elapsed.set((value) => value + Math.min(info.timeSincePreviousFrame ?? 0, 64));
  }, false);
  useEffect(() => {
    const unsubscribe = actorActivity.subscribe(id, (ownsClock) => {
      frame.setActive(false);
      elapsed.set(0);
      running.set(ownsClock);
      if (ownsClock) frame.setActive(true);
    });
    const sync = () => actorActivity.request(id, actorMayRun({
      active, reduced, motion,
      foreground: AppState.currentState === 'active',
      focused: androidWindowFocused && (navigation?.isFocused() ?? true),
      visible: typeof document === 'undefined' || document.visibilityState !== 'hidden',
    }), actorMotionPriority(motion));
    sync();
    const app = AppState.addEventListener('change', sync);
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', () => { androidWindowFocused = false; sync(); }) : undefined;
    const focus = Platform.OS === 'android' ? AppState.addEventListener('focus', () => { androidWindowFocused = true; sync(); }) : undefined;
    const routeFocus = navigation?.addListener('focus', sync);
    const routeBlur = navigation?.addListener('blur', sync);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', sync);
    return () => {
      actorActivity.release(id);
      unsubscribe();
      frame.setActive(false);
      running.set(false);
      elapsed.set(0);
      app.remove(); blur?.remove(); focus?.remove(); routeFocus?.(); routeBlur?.();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', sync);
    };
  }, [active, elapsed, frame, id, motion, navigation, reduced, running]);
  return { elapsed, running };
}
