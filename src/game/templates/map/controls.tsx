import { Host, Picker } from '@expo/ui';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { T } from '@/components/ui/text';
import { colors, radius } from '@/theme';
import { campusPlaces } from './campus-data';
import type { MapPlaceId } from './types';

export function CampusChoice({
  title,
  detail,
  onPress,
  selected = false,
  disabled = false,
  testID,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 12,
        borderRadius: radius.control,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderColor: selected ? colors.primaryPressed : colors.border,
        backgroundColor: pressed || selected ? colors.sky : colors.surface,
        opacity: disabled ? 0.45 : 1,
        gap: 3,
      })}
    >
      <T
        variant="small"
        style={{ color: selected ? colors.primaryDeep : colors.text, fontWeight: '700' }}
      >
        {title}
      </T>
      {detail ? <T variant="caption">{detail}</T> : null}
    </Pressable>
  );
}

export function CampusSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T variant="subheading">{title}</T>
      {children}
    </View>
  );
}

export function CampusPlacePicker({
  title,
  value,
  onChange,
  testID,
  includeWaypoints = false,
}: {
  title: string;
  value: MapPlaceId;
  onChange: (value: MapPlaceId) => void;
  testID: string;
  includeWaypoints?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 130,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.control,
        borderCurve: 'continuous',
        padding: 12,
        gap: 6,
      }}
    >
      <T variant="caption">{title}</T>
      <Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: 44 }}>
        <Picker<MapPlaceId> selectedValue={value} onValueChange={onChange} testID={testID}>
          {campusPlaces
            .filter((place) => includeWaypoints || place.destination || place.id === value)
            .map((place) => (
              <Picker.Item key={place.id} label={place.name} value={place.id} />
            ))}
        </Picker>
      </Host>
    </View>
  );
}
