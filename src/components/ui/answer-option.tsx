import { Pressable, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { T } from './text';
import { Icon } from './icon';
import { GameIcon } from './game-icon';
import { useAppLayout } from '@/hooks/use-app-layout';
import { feedback } from '@/utils/feedback';
import { useReducedMotion } from 'react-native-reanimated';
import { useAppStore } from '@/store/app-store';
export function AnswerOption({
  label,
  selected,
  onPress,
  disabled = false,
  index,
  icon,
  status,
  description,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  index?: number;
  icon?: string;
  status?: 'correct' | 'wrong';
  description?: string;
}) {
  const appReduced = useAppStore((s) => s.settings.reducedMotion);
  const systemReduced = useReducedMotion();
  const { desktop } = useAppLayout();
  const border =
    status === 'correct'
      ? colors.success
      : status === 'wrong'
        ? colors.danger
        : selected
          ? colors.primary
          : colors.border;
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
      accessibilityRole="button"
      accessibilityLabel={`${label}${status === 'correct' ? ', correct answer' : status === 'wrong' ? ', incorrect answer' : ''}`}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      onPress={() => {
        feedback('selection');
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 64,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 4,
        borderColor: border,
        borderRadius: radius.control,
        backgroundColor: surface,
        padding: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        transform: [{ translateY: pressed && !appReduced && !systemReduced ? 2 : 0 }],
      })}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            backgroundColor: colors.transparent,
          }}
        >
          <GameIcon name={icon} size={34} />
        </View>
      ) : index !== undefined && desktop ? (
        <View
          style={{
            height: 28,
            width: 28,
            borderWidth: 2,
            borderColor: selected ? colors.primary : colors.border,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T
            variant="caption"
            style={{ color: selected ? colors.primaryPressed : colors.textSecondary }}
          >
            {index + 1}
          </T>
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T
          style={{
            color:
              status === 'correct'
                ? colors.success
                : status === 'wrong'
                  ? colors.danger
                  : selected
                    ? colors.primaryPressed
                    : colors.text,
          }}
        >
          {label}
        </T>
        {description ? <T variant="small">{description}</T> : null}
      </View>
      {status ? (
        <Icon
          name={status === 'correct' ? 'check' : 'close'}
          size={22}
          color={status === 'correct' ? colors.success : colors.danger}
        />
      ) : selected ? (
        <Icon name="check" size={21} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}
