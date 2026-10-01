import { View } from 'react-native';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { colors, radius, space } from '@/theme';

export function LessonPopover({
  title,
  detail,
  locked,
  onStart,
  label,
}: {
  title: string;
  detail: string;
  locked: boolean;
  onStart: () => void;
  label: string;
}) {
  const background = locked ? colors.surfaceMuted : colors.primaryPressed;
  return (
    <View
      style={{
        backgroundColor: background,
        borderWidth: locked ? 2 : 0,
        borderColor: colors.border,
        borderRadius: radius.control,
        padding: space.lg,
        gap: space.md,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -9,
          left: '46%',
          width: 18,
          height: 18,
          backgroundColor: background,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View style={{ gap: space.xs }}>
        <T variant="subheading" style={{ color: locked ? colors.text : colors.surface }}>
          {title}
        </T>
        <T variant="small" style={{ color: locked ? colors.textSecondary : colors.surface }}>
          {detail}
        </T>
      </View>
      <Button title={label} disabled={locked} variant="secondary" onPress={onStart} />
    </View>
  );
}
