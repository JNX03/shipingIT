import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';

/** Other screens keep centered titles; the profile can lead with the player's name. */
export function ProfileToolbar({
  title,
  back = false,
  action,
  alignment = 'center',
}: {
  title: string;
  back?: boolean;
  action?: { label: string; onPress: () => void; icon?: 'settings' };
  alignment?: 'center' | 'start';
}) {
  return (
    <View style={styles.toolbar}>
      {back || alignment === 'center' ? (
        <View style={styles.toolbarSide}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
              style={styles.toolbarAction}
            >
              <T variant="button" style={styles.actionCopy}>
                Back
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <T
        variant={alignment === 'start' ? 'title' : 'heading'}
        accessibilityRole="header"
        numberOfLines={2}
        style={[styles.toolbarTitle, alignment === 'start' && styles.leadingTitle]}
      >
        {title}
      </T>
      <View style={[styles.toolbarSide, action?.icon && styles.iconSlot]}>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={[styles.toolbarAction, action.icon && styles.iconAction]}
          >
            {action.icon === 'settings' ? (
              <SettingsIcon />
            ) : (
              <T variant="button" style={styles.actionCopy}>
                {action.label}
              </T>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SettingsIcon() {
  return (
    <Svg
      width={28} height={28} viewBox="0 0 24 27" fill="none"
      stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    >
      <Path d="M9.4 3h5.2l.6 2.4 2 .9 2.2-.7 2.6 4.5-1.7 1.7v2.3l1.7 1.7-2.6 4.5-2.2-.7-2 .9-.6 2.4H9.4l-.6-2.4-2-.9-2.2.7L2 15.8l1.7-1.7v-2.3L2 10.1l2.6-4.5 2.2.7 2-.9L9.4 3Z" />
      <Circle cx={12} cy={12.9} r={3.2} />
    </Svg>
  );
}

export function ProfileGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? (
        <T variant="subheading" accessibilityRole="header">
          {title}
        </T>
      ) : null}
      <View style={styles.group}>
        {Children.toArray(children).map((child, index) => (
          <View key={index} style={index ? styles.divider : undefined}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProfileNavigationRow({
  title,
  detail,
  onPress,
  destructive = false,
  disabled = false,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfaceMuted },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.rowCopy}>
        <T variant="subheading" style={destructive ? { color: colors.danger } : undefined}>
          {title}
        </T>
        {detail ? <T variant="small">{detail}</T> : null}
      </View>
      <T
        variant="heading"
        accessible={false}
        importantForAccessibility="no"
        style={{ color: colors.muted }}
      >
        ›
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  toolbarSide: { width: 80, justifyContent: 'center' },
  toolbarAction: { minHeight: 48, justifyContent: 'center', paddingVertical: space.sm },
  actionCopy: { color: colors.primaryPressed, textAlign: 'center' },
  toolbarTitle: { flex: 1, textAlign: 'center', minWidth: 0 },
  leadingTitle: { textAlign: 'left', paddingRight: space.md },
  iconSlot: { width: 48 },
  iconAction: { minWidth: 48, alignItems: 'center' },
  section: { gap: space.md },
  group: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.large,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  row: {
    minHeight: 68,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowCopy: { flex: 1, minWidth: 0, gap: space.xs },
});
