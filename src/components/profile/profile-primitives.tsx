import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { Achievement } from '@/domain/types';
import { GameIcon } from '@/components/ui/game-icon';
import { Icon } from '@/components/ui/icon';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';

const BADGE = 'M36 4 64 14v22q0 22-28 35Q8 58 8 36V14Z';

export function ProfileBadge({
  achievement,
  unlocked,
  size = 72,
}: {
  achievement: Achievement;
  unlocked: boolean;
  size?: number;
}) {
  const warm = ['scope', 'pitch', 'streak'].includes(achievement.icon);
  const fill = unlocked ? achievement.color : colors.disabled;
  return (
    <View
      style={{ width: size, height: size * 1.06 }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size * 1.06} viewBox="0 0 72 76">
        <G transform="translate(0 3)">
          <Path d={BADGE} fill={fill} />
          <Path d={BADGE} fill={colors.text} opacity={0.16} />
        </G>
        <Path d={BADGE} fill={fill} />
      </Svg>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size * 0.8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GameIcon
          name={unlocked ? achievement.icon : 'lock'}
          size={size * 0.44}
          variant={unlocked && warm ? 'ink' : 'white'}
        />
      </View>
    </View>
  );
}

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <T variant="caption" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </T>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

export function ProfileLinkRow({
  label,
  icon,
  detail,
  onPress,
  destructive = false,
}: {
  label: string;
  icon?: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {icon ? <GameIcon name={icon} size={28} /> : null}
      <T style={[styles.rowTitle, destructive && { color: colors.danger }]}>{label}</T>
      {detail ? (
        <T variant="small" style={styles.detail}>
          {detail}
        </T>
      ) : null}
      <Icon name="next" color={colors.muted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  sectionTitle: { color: colors.textSecondary, letterSpacing: 1 },
  rows: { borderTopWidth: 1, borderColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: { flex: 1, color: colors.text },
  detail: { flexShrink: 1, textAlign: 'right' },
});
