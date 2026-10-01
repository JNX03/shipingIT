import { Pressable, StyleSheet, View } from 'react-native';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { colors, radius, space } from '@/theme';
import type { MixedPathUnit } from '../mixed-path';
import { pathUnitTheme } from '../path-units';
import { feedback } from '@/utils/feedback';

/** A short unit marker in the scroll flow, so story reading keeps the full viewport. */
export function MixedUnitBanner({
  unit,
  completed,
  action,
  onNotebook,
}: {
  unit: MixedPathUnit;
  completed: number;
  action?: { label: string; onPress(): void };
  onNotebook?: () => void;
}) {
  const theme = pathUnitTheme(unit.id);
  return (
    <View style={[styles.banner, { backgroundColor: theme.tint, borderColor: theme.edge }]}>
      <View style={styles.copy}>
        <T variant="caption" style={{ color: colors.surface }}>
          UNIT {unit.id} · {completed}/{unit.nodes.length}
        </T>
        <T variant="subheading" accessibilityRole="header" style={{ color: colors.surface }}>
          {unit.title}
        </T>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action.label} your current activity`}
          onPress={() => {
            feedback('light');
            action.onPress();
          }}
          style={styles.action}
          testID="mixed-path-continue"
        >
          <T variant="button" style={{ color: theme.edge }}>
            {action.label}
          </T>
        </Pressable>
      ) : null}
      {onNotebook ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your project notebook"
          onPress={() => {
            feedback('light');
            onNotebook();
          }}
          style={styles.notebook}
        >
          <GameIcon name="learn" size={24} variant="white" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.primaryPressed,
    borderBottomWidth: 5,
    borderColor: colors.primaryDeep,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    marginTop: space.sm,
  },
  copy: { flex: 1, minWidth: 80, gap: space.xs },
  action: {
    minHeight: 44,
    maxWidth: '100%',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
  },
  notebook: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
