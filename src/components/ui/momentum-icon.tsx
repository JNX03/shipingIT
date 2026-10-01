import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GameIcon } from './game-icon';
import { colors } from '@/theme';

export type MomentumVariant = 'inactive' | 'active' | 'strong' | 'milestone';

/** Four silhouettes remain recognizable at status-strip and celebration sizes. */
export function MomentumIcon({ days, size = 32 }: { days: number; size?: number }) {
  const variant: MomentumVariant =
    days >= 30 ? 'milestone' : days >= 7 ? 'strong' : days > 0 ? 'active' : 'inactive';
  const decorated = variant === 'strong' || variant === 'milestone';
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`momentum-${variant}`}
    >
      <GameIcon
        name="momentum"
        size={decorated ? size * 0.72 : size}
        variant={variant === 'inactive' ? 'muted' : 'color'}
      />
      {decorated ? (
        <Svg width={size} height={size} viewBox="0 0 64 64" style={{ position: 'absolute' }}>
          <Path d="m49 4 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill={colors.accent} />
          <Path
            d="m11 42 1.5 4.5L17 48l-4.5 1.5L11 54l-1.5-4.5L5 48l4.5-1.5Z"
            fill={colors.streak}
          />
          {variant === 'milestone' ? (
            <>
              <Path
                d="M18 6C5 13 1 29 8 41M46 58c13-7 17-23 10-35"
                stroke={colors.warning}
                strokeWidth={4}
                strokeLinecap="round"
                fill="none"
              />
              <Path d="m24 54 8 3 8-3v7H24Z" fill={colors.accent} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
