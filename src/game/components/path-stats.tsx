import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/ui/game-icon';
import { feedback } from '@/utils/feedback';
import { colors, pathTheme, radius, space } from '@/theme';
import { gamePropArt } from '../art';
import { navigationArt } from '../navigation-art';
import { pathStatusCopy, type PathStatusId } from './path-status';

const compact = (count: number) =>
  count >= 10000 ? `${(count / 1000).toFixed(1)}k` : String(count);

export function PathStats({
  level,
  streak,
  sparks,
  stages,
  activityDates,
  now,
}: {
  level: number;
  streak: number;
  sparks: number;
  stages: number;
  activityDates: readonly string[];
  now: Date;
}) {
  const { fontScale, width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const large = fontScale > 1.4;
  const group = useRef<View>(null);
  const [selected, setSelected] = useState<PathStatusId | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number }>({
    x: space.page,
    y: insets.top + 48,
    width: width - space.page * 2,
  });
  const openStatus = (id: PathStatusId) => {
    feedback('light');
    if (id === 'streak') {
      setSelected(null);
      router.push('/streak');
      return;
    }
    if (id === 'level') {
      setSelected(null);
      router.push('/rank');
      return;
    }
    if (selected === id) return setSelected(null);
    group.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, y: y + measuredHeight + 4, width: measuredWidth });
      setSelected(id);
    });
  };
  const copy = pathStatusCopy({ sparks, streak, stages, activityDates, now });
  const stats = [
    {
      id: 'level',
      art: navigationArt.medal,
      value: compact(level),
      label: `Builder level ${level}. Open personal rank`,
      color: colors.text,
    },
    {
      id: 'streak',
      art: navigationArt.flame,
      value: `${streak}d`,
      label: `${streak} day streak. Open activity calendar`,
      color: colors.streak,
    },
    {
      id: 'sparks',
      art: gamePropArt.spark,
      value: compact(sparks),
      label: `${sparks} Sparks. Show reward status`,
      color: pathTheme.chapter,
    },
  ] as const;
  const status = selected ? copy[selected] : null;
  const selectedIndex = stats.findIndex((stat) => stat.id === selected);
  return (
    <View style={styles.outer}>
      <View ref={group} collapsable={false} style={styles.content}>
        <View style={styles.stats}>
          {stats.map((stat) => (
            <Pressable
              key={stat.id}
              accessibilityRole="button"
              accessibilityLabel={stat.label}
              accessibilityState={{ expanded: selected === stat.id }}
              testID={`path-status-${stat.id}`}
              onPress={() => openStatus(stat.id)}
              style={({ pressed }) => [
                styles.stat,
                { width: large ? '50%' : '25%', opacity: pressed ? 0.6 : 1 },
                selected === stat.id && styles.statSelected,
              ]}
            >
              <Image
                source={stat.art}
                contentFit="contain"
                style={{ width: 28, height: 28 }}
                alt=""
              />
              <T variant="button" style={{ color: stat.color, flexShrink: 1 }}>
                {stat.value}
              </T>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ShipingIT Pro. View membership tools."
            testID="home-pro"
            onPress={() => {
              feedback('light');
              router.push('/paywall');
            }}
            style={[styles.stat, { width: large ? '50%' : '25%', gap: 4 }]}
          >
            <GameIcon name="boss" size={28} />
            <T variant="button" style={{ color: colors.premium }}>
              Pro
            </T>
          </Pressable>
        </View>
        <Modal
          transparent
          visible={!!status}
          animationType="none"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setSelected(null)}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Dismiss status"
              onPress={() => setSelected(null)}
            />
            {status ? (
              <View
                accessibilityViewIsModal
                style={[
                  styles.popover,
                  {
                    top: anchor.y,
                    left: Math.max(space.sm, anchor.x),
                    width: Math.min(anchor.width, width - space.sm * 2),
                    maxHeight: Math.max(120, height - anchor.y - insets.bottom - space.md),
                  },
                ]}
                testID={`path-status-detail-${selected}`}
              >
                <View
                  accessible={false}
                  style={[
                    styles.caret,
                    {
                      left: large
                        ? `${((selectedIndex % 2) + 0.5) * 50}%`
                        : `${(selectedIndex + 0.5) * 25}%`,
                    },
                  ]}
                />
                <View style={styles.popoverHeader}>
                  <T variant="subheading" accessibilityRole="header" style={{ flex: 1 }}>
                    {status.title}
                  </T>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close status"
                    onPress={() => setSelected(null)}
                    style={styles.close}
                  >
                    <T variant="small" style={{ color: colors.primaryPressed, fontWeight: '800' }}>
                      Close
                    </T>
                  </Pressable>
                </View>
                <ScrollView
                  style={{ maxHeight: 180, flexShrink: 1 }}
                  contentContainerStyle={{ gap: space.sm }}
                >
                  <T variant="small" accessibilityLiveRegion="polite">
                    {status.detail}
                  </T>
                  <T variant="caption" style={{ color: colors.textSecondary }}>
                    {status.timing}
                  </T>
                </ScrollView>
                <Button
                  title={status.action}
                  compact
                  variant="secondary"
                  uppercase={false}
                  onPress={() => {
                    setSelected(null);
                    router.push(status.href);
                  }}
                />
              </View>
            ) : null}
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingHorizontal: space.page,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    zIndex: 40,
  },
  content: { width: '100%', maxWidth: pathTheme.contentWidth },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  stat: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.control,
  },
  statSelected: { backgroundColor: colors.surfaceMuted },
  popover: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.control,
    padding: space.md,
    gap: space.sm,
    elevation: 6,
  },
  caret: {
    position: 'absolute',
    top: -9,
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: colors.surface,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  popoverHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  close: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
});
