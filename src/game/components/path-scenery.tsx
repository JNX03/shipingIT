import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { GameIcon } from '@/components/ui/game-icon';

/** Original chunky campus props, drawn here rather than borrowed from an icon pack. */
export function PathScenery({
  kind,
  size = 62,
}: {
  kind: 'garden' | 'sign' | 'stars';
  size?: number;
}) {
  if (kind === 'stars')
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <GameIcon name="star" size={size * 0.6} style={{ transform: [{ rotate: '-12deg' }] }} />
        <GameIcon
          name="star"
          size={size * 0.28}
          style={{ position: 'absolute', right: 0, top: 0 }}
        />
      </View>
    );
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <Ellipse cx={36} cy={65} rx={28} ry={5} fill="#588D43" opacity={0.18} />
        {kind === 'garden' ? (
          <>
            <Rect x={31} y={32} width={10} height={30} rx={4} fill="#BA733A" />
            <Circle cx={36} cy={28} r={23} fill="#389C53" />
            <Circle cx={23} cy={31} r={14} fill="#55B85C" />
            <Circle cx={43} cy={20} r={15} fill="#72CC62" />
            <Path d="M5 63Q4 48 19 48q11 0 14 15ZM41 63q0-13 13-13t13 13Z" fill="#4EB66C" />
            <Circle cx={18} cy={53} r={5} fill="#FFD854" />
            <Circle cx={57} cy={55} r={4} fill="#FF91B4" />
          </>
        ) : (
          <>
            <Rect x={31} y={10} width={11} height={55} rx={4} fill="#B2763A" />
            <Path d="M8 12h39l17 14-17 14H8q-4 0-4-4V16q0-4 4-4Z" fill="#B2763A" />
            <Path d="M8 8h39l17 14-17 14H8q-4 0-4-4V12q0-4 4-4Z" fill="#FFD76B" />
            <Circle cx={13} cy={21} r={2} fill="#B2763A" />
            <Path
              d="M23 21h25m-8-7 8 7-8 7"
              fill="none"
              stroke="#744422"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path d="M15 62q0-9 8-9t9 9m9 0q0-11 10-11t10 11" fill="#68BC66" />
          </>
        )}
      </Svg>
    </View>
  );
}
