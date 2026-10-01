import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Animated, { cubicBezier } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { GameIcon } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { colors, motion, pathTheme, radius, space } from '@/theme';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import type { PathAnchor } from './path-popover-layout';

type Props = {
  title: string;
  nextLabel?: string;
  art: ImageSourcePropType;
  done: boolean;
  unlocked: boolean;
  active: boolean;
  selected: boolean;
  offset: number;
  onPress: (anchor: PathAnchor) => void;
  chapterProgress?: number;
  tint?: string;
  edge?: string;
  children?: ReactNode;
  symbol?: 'lesson' | 'game' | 'story';
};

/** A lesson button and its chapter ring are separate physical surfaces. */
export function PathNode({
  title,
  nextLabel,
  art,
  done,
  unlocked,
  active,
  selected,
  offset,
  onPress,
  chapterProgress = 0,
  tint = pathTheme.chapter,
  edge = pathTheme.chapterEdge,
  children,
  symbol,
}: Props) {
  const reduced = useMotionReduced();
  const [pressed, setPressed] = useState(false);
  const node = useRef<View>(null);
  const size = pathTheme.node.ring;
  const ringRadius = (size - pathTheme.node.ringWidth) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = Math.min(1, Math.max(0, chapterProgress));
  const face = done ? pathTheme.completed : unlocked ? tint : pathTheme.locked;
  const rim = done ? pathTheme.completedEdge : unlocked ? edge : pathTheme.lockedEdge;
  return (
    <View style={styles.row}>
      {children}
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: offset }],
        }}
      >
        {active ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={ringRadius}
                fill="none"
                stroke={colors.border}
                strokeWidth={pathTheme.node.ringWidth}
              />
              {progress > 0 ? (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  fill="none"
                  stroke={tint}
                  strokeWidth={pathTheme.node.ringWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${circumference * progress} ${circumference}`}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              ) : null}
            </Svg>
          </View>
        ) : null}
        <Pressable
          ref={node}
          testID={`path-node-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${done ? 'Completed. Play again.' : unlocked ? 'Ready to play.' : 'Locked. Tap for details.'}${active ? ` Chapter ${Math.round(progress * 100)} percent complete.` : ''}`}
          accessibilityState={{ expanded: selected }}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() =>
            node.current?.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) onPress({ x, y, width, height });
            })
          }
          hitSlop={space.xs}
          pressRetentionOffset={space.lg}
          style={{ width: 72, height: 78 }}
        >
          <View style={[styles.node, { backgroundColor: rim }]} />
          <Animated.View
            style={[
              styles.node,
              {
                height: 72,
                backgroundColor: face,
                transform: [{ translateY: pressed ? 5 : 0 }],
                transitionProperty: 'transform',
                transitionDuration: reduced ? 0 : motion.fast,
                transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
              },
            ]}
          >
            {done && symbol ? (
              <GameIcon name="check" size={36} variant="ink" />
            ) : symbol === 'lesson' ? (
              <GameIcon name="star" size={36} variant={unlocked ? 'white' : 'muted'} />
            ) : symbol ? (
              <Svg width={36} height={36} viewBox="0 0 36 36" opacity={unlocked ? 1 : 0.4}>
                {symbol === 'game' ? (
                  <>
                    <Path
                      d="M10 9h16c5 0 8 14 6 17-2 3-6 0-9-3H13c-3 3-7 6-9 3-2-3 1-17 6-17Z"
                      fill="none"
                      stroke={unlocked ? colors.surface : colors.textSecondary}
                      strokeWidth={3}
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M11 14v8M7 18h8"
                      stroke={unlocked ? colors.surface : colors.textSecondary}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <Circle
                      cx={25}
                      cy={16}
                      r={2}
                      fill={unlocked ? colors.surface : colors.textSecondary}
                    />
                    <Circle
                      cx={28}
                      cy={21}
                      r={2}
                      fill={unlocked ? colors.surface : colors.textSecondary}
                    />
                  </>
                ) : (
                  <>
                    <Path
                      d="M5 5h26v19H17L9 31v-7H5Z"
                      fill="none"
                      stroke={unlocked ? colors.surface : colors.textSecondary}
                      strokeWidth={3}
                      strokeLinejoin="round"
                    />
                    {[11, 18, 25].map((x) => (
                      <Circle
                        key={x}
                        cx={x}
                        cy={15}
                        r={2}
                        fill={unlocked ? colors.surface : colors.textSecondary}
                      />
                    ))}
                  </>
                )}
              </Svg>
            ) : (
              <Image
                source={art}
                contentFit="contain"
                style={{ width: 43, height: 43, opacity: unlocked ? 1 : 0.3 }}
                alt=""
              />
            )}
          </Animated.View>
        </Pressable>
      </View>
      {active && !selected ? (
        <View pointerEvents="none" style={[styles.hint, { transform: [{ translateX: offset }] }]}>
          <T
            variant="caption"
            numberOfLines={2}
            style={{ color: tint, textAlign: 'center', maxWidth: 144 }}
          >
            {nextLabel ?? 'LET’S GO!'}
          </T>
          <View style={styles.hintCaret} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: pathTheme.node.row,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    position: 'absolute',
    width: 72,
    height: 78,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    top: -space.lg,
    zIndex: 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  // The rotated square shares the outline with the white speech bubble.
  hintCaret: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -7,
    width: 12,
    height: 12,
    backgroundColor: colors.surface,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
