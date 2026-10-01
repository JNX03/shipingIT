import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { distance, worldFacing, type WorldPoint } from './geometry';

const WALK_SPEED = 310;
/** The RN runtime plans a route only on a tap; every interpolated step runs on UI. */
export function useWorldMovement(spawn: WorldPoint, reduced: boolean) {
  const x = useSharedValue(spawn.x),
    y = useSharedValue(spawn.y);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<ReturnType<typeof worldFacing>>('front');
  const mounted = useRef(true),
    version = useRef(0);
  const arrival = useRef<(() => void) | undefined>(undefined);
  const route = useRef<readonly WorldPoint[]>([]);
  const animate = useRef<(index: number, token: number) => void>(() => {});
  const stop = useCallback(() => {
    version.current++;
    cancelAnimation(x);
    cancelAnimation(y);
    arrival.current = undefined;
    if (mounted.current) setMoving(false);
  }, [x, y]);
  const finishSegment = useCallback((index: number, token: number) => {
    if (!mounted.current || token !== version.current) return;
    animate.current(index + 1, token);
  }, []);
  useEffect(() => {
    animate.current = (index, token) => {
      const points = route.current;
      if (token !== version.current || !mounted.current) return;
      if (index >= points.length) {
        setMoving(false);
        const done = arrival.current;
        arrival.current = undefined;
        done?.();
        return;
      }
      const from = { x: x.get(), y: y.get() },
        to = points[index];
      setFacing(worldFacing(from, to));
      const duration = Math.max(50, (distance(from, to) / WALK_SPEED) * 1000);
      x.set(
        withTiming(to.x, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
      );
      y.set(
        withTiming(
          to.y,
          { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never },
          (finished) => {
            if (finished) scheduleOnRN(finishSegment, index, token);
          },
        ),
      );
    };
  }, [x, y, finishSegment]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);
  const walk = useCallback(
    (points: readonly WorldPoint[], onArrival?: () => void) => {
      stop();
      if (!points.length) return;
      const end = points[points.length - 1];
      arrival.current = onArrival;
      route.current = points;
      const token = version.current;
      if (reduced || points.length < 2 || distance({ x: x.get(), y: y.get() }, end) < 1) {
        setFacing(worldFacing({ x: x.get(), y: y.get() }, end));
        x.set(end.x);
        y.set(end.y);
        arrival.current = undefined;
        onArrival?.();
        return;
      }
      setMoving(true);
      animate.current(1, token);
    },
    [stop, reduced, x, y],
  );
  const place = useCallback(
    (point: WorldPoint) => {
      stop();
      x.set(point.x);
      y.set(point.y);
    },
    [stop, x, y],
  );
  useEffect(() => {
    if (!reduced || !moving || !route.current.length) return;
    const end = route.current[route.current.length - 1];
    const done = arrival.current;
    stop();
    x.set(end.x);
    y.set(end.y);
    done?.();
  }, [reduced, moving, stop, x, y]);
  return { x, y, moving, facing, setFacing, walk, stop, place };
}
