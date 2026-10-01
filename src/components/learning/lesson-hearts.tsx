import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { T } from '@/components/ui/text';
import { colors } from '@/theme';

/** Original ShipingIT heart glyph, drawn locally like the rest of the game artwork. */
export function LessonHearts({ count, practice = false }: { count: number; practice?: boolean }) {
  return (
    <View accessible accessibilityLabel={practice ? 'Practice attempt, no rewards' : `${count} of 5 hearts remaining`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Svg width={27} height={27} viewBox="0 0 32 32" accessible={false}>
        <Path d="M16 28C13 25 3 19 3 11C3 4 12 1 16 7C20 1 29 4 29 11C29 19 19 25 16 28Z" fill={count > 0 || practice ? '#FF68A9' : colors.border} />
        <Path d="M7 10C7 7 11 6 13 9" stroke="#FFD5E8" strokeWidth={3} strokeLinecap="round" fill="none" />
      </Svg>
      <T variant="caption" style={{ color: '#D9387A' }}>{practice ? 'Practice' : count}</T>
    </View>
  );
}
