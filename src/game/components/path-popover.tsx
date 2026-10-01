import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, pathTheme, radius, space } from '@/theme';
import { pathPopoverLayout, type PathAnchor } from './path-popover-layout';

/** The complete callout has a native window ancestor, including its accessible action. */
export function PathPopover({
  title,
  detail,
  action,
  unlocked,
  anchor,
  onPress,
  onDismiss,
  tint = pathTheme.chapter,
}: {
  title: string;
  detail: string;
  action: string;
  unlocked: boolean;
  anchor: PathAnchor;
  onPress: () => void;
  onDismiss: () => void;
  tint?: string;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [contentHeight, setContentHeight] = useState(0);
  const surface = unlocked ? tint : colors.surfaceMuted;
  const ink = unlocked ? colors.surface : colors.text;
  const placement = pathPopoverLayout({
    anchor,
    width,
    height,
    safeTop: insets.top,
    safeBottom: insets.bottom,
    cardHeight: contentHeight,
  });
  const measured = contentHeight > 0;
  const maxHeight = measured ? placement.maxHeight : height - insets.top - insets.bottom - 32;
  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.window}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss activity details"
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          importantForAccessibility={measured ? 'yes' : 'no-hide-descendants'}
          pointerEvents={measured ? 'auto' : 'none'}
          testID="path-popover"
          style={[
            styles.card,
            {
              left: placement.left,
              top: placement.top,
              width: placement.width,
              backgroundColor: surface,
              opacity: measured ? 1 : 0,
            },
          ]}
        >
          <View
            pointerEvents="none"
            accessible={false}
            style={[
              styles.caret,
              { left: placement.arrowLeft, backgroundColor: surface },
              placement.arrowEdge === 'top' ? styles.caretTop : styles.caretBottom,
            ]}
          />
          <ScrollView
            testID="path-popover-content"
            style={{ maxHeight }}
            contentContainerStyle={styles.copy}
            onContentSizeChange={(_width, contentSize) => setContentHeight(contentSize)}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <T variant="subheading" accessibilityRole="header" style={{ color: ink, flex: 1 }}>
                {title}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close activity details"
                onPress={onDismiss}
                style={styles.close}
                testID="path-popover-close"
              >
                <T variant="small" style={{ color: ink, fontWeight: '800' }}>
                  Close
                </T>
              </Pressable>
            </View>
            <T variant="small" style={{ color: unlocked ? colors.surface : colors.textSecondary }}>
              {detail}
            </T>
            {unlocked ? (
              <Button
                title={action}
                variant="secondary"
                onPress={onPress}
                style={{ marginTop: space.xs }}
                testID="path-popover-action"
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  window: { flex: 1 },
  card: { position: 'absolute', borderRadius: radius.large, borderCurve: 'continuous' },
  copy: { padding: space.lg, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  caret: { position: 'absolute', width: 16, height: 16, transform: [{ rotate: '45deg' }] },
  caretTop: { top: -8 },
  caretBottom: { bottom: -8 },
});
