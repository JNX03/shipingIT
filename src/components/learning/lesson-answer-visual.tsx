import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { T } from '@/components/ui/text';
import { useAppLayout } from '@/hooks/use-app-layout';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

/** A raised lesson answer. Content and answer IDs remain the caller's responsibility. */
export function LessonAnswerVisual({
  label,
  selected,
  disabled = false,
  status,
  onPress,
  index,
  multiple = false,
  role,
  tile = false,
  style,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  status?: 'correct' | 'wrong';
  onPress: () => void;
  index?: number;
  multiple?: boolean;
  role?: 'button' | 'radio' | 'checkbox';
  tile?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useMotionReduced();
  const { desktop } = useAppLayout();
  const answerRole = role ?? (multiple ? 'checkbox' : 'radio');
  const checked = answerRole === 'radio' || answerRole === 'checkbox' ? selected : undefined;
  const tone =
    status === 'correct'
      ? colors.success
      : status === 'wrong'
        ? colors.danger
        : colors.primaryPressed;
  const border = status || selected ? tone : colors.border;
  const surface =
    status === 'correct'
      ? colors.successSurface
      : status === 'wrong'
        ? colors.dangerSurface
        : selected
          ? colors.primarySurface
          : colors.surface;
  return (
    <Pressable
      accessibilityRole={answerRole}
      accessibilityLabel={`${label}${status === 'correct' ? ', correct answer' : status === 'wrong' ? ', incorrect answer' : ''}`}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      disabled={disabled}
      onPress={() => {
        feedback('selection');
        onPress();
      }}
      style={({ pressed }) => [
        styles.answer,
        tile && styles.tile,
        {
          borderColor: border,
          backgroundColor: surface,
          borderBottomWidth: pressed ? 2 : 5,
          // Keep the physical press optional while retaining color and border feedback.
          transform: [{ translateY: pressed && !reduced ? 3 : 0 }],
        },
        style,
      ]}
    >
      {index !== undefined && desktop && !tile ? (
        <View accessible={false} style={[styles.keyboardHint, { borderColor: border }]}>
          <T variant="caption" style={{ color: selected || status ? tone : colors.textSecondary }}>
            {index + 1}
          </T>
        </View>
      ) : null}
      <T
        variant={tile ? 'subheading' : 'body'}
        style={[
          styles.label,
          tile && styles.tileLabel,
          { color: selected || status ? tone : colors.text },
        ]}
      >
        {label}
      </T>
      <View
        accessible={false}
        style={[
          styles.marker,
          { borderRadius: multiple ? radius.sm : radius.pill, borderColor: border },
          (selected || status) && { backgroundColor: tone },
          tile && styles.tileMarker,
        ]}
      >
        {selected || status ? (
          <Icon name={status === 'wrong' ? 'close' : 'check'} size={18} color={colors.surface} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  answer: {
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 2,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  label: { flex: 1, fontSize: 16, lineHeight: 22 },
  tile: { minHeight: 136, justifyContent: 'center', paddingTop: space.huge },
  tileLabel: { textAlign: 'center' },
  marker: { width: 26, height: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tileMarker: { position: 'absolute', top: space.md, right: space.md },
  keyboardHint: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
