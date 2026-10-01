import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';

/** Scene and task stay together. Long objectives/answers scroll inside the bottom dock. */
export function SceneObjectivePanel({
  title,
  progress,
  children,
}: {
  title: string;
  progress: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      style={styles.dock}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <View style={styles.heading}>
        <T variant="subheading" accessibilityRole="header" style={styles.title}>
          {title}
        </T>
        <T variant="caption" style={{ color: colors.primaryDeep }}>
          {progress}
        </T>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: '52%',
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderColor: colors.sky,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
  },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  title: { flex: 1, minWidth: 140, color: colors.primaryDeep },
});
