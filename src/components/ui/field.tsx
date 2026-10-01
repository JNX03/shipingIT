import { useId } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '@/theme';
import { T } from './text';
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = true,
  help,
  maxLength = 5000,
  secure = false,
  inputProps,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  help?: string;
  maxLength?: number;
  secure?: boolean;
  inputProps?: TextInputProps;
}) {
  const fieldLabelId = `field-label-${useId().replace(/:/g, '')}`;
  return (
    <View style={{ gap: space.sm }}>
      <T
        nativeID={fieldLabelId}
        variant="small"
        style={{ fontFamily: fonts.bold, color: colors.text }}
      >
        {label}
      </T>
      <TextInput
        autoCapitalize={secure ? 'none' : 'sentences'}
        {...inputProps}
        accessibilityLabel={label}
        accessibilityLabelledBy={fieldLabelId}
        accessible
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        secureTextEntry={secure}
        textAlignVertical={multiline ? 'top' : 'center'}
        maxLength={maxLength}
        style={[
          typography.body,
          {
            minHeight: multiline ? 116 : 54,
            padding: space.lg,
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: radius.control,
            backgroundColor: colors.background,
          },
        ]}
      />
      {help ? <T variant="caption">{help}</T> : null}
    </View>
  );
}
