import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { T } from '@/components/ui/text';
import { colors } from '@/theme';
import { pathUnitTheme } from '../path-units';
import { PathScenery } from './path-scenery';

/** Original campus islands and walking trails quietly connect the activity dots. */
export function HomeMapBackdrop({
  tint,
  index,
  unitId,
}: {
  tint: string;
  index: number;
  unitId: number;
}) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 420 140" preserveAspectRatio="none">
        {unitId <= 2 ? (
          <Path
            d={index % 2 ? 'M175 -10Q120 48 195 140' : 'M235 -10Q290 58 220 150'}
            fill="none"
            stroke={tint}
            strokeWidth={9}
            strokeDasharray="9 14"
            opacity={0.13}
            strokeLinecap="round"
          />
        ) : unitId <= 4 ? (
          <>
            {[20, 48, 372, 400].flatMap((x) =>
              [24, 62, 102].map((y) => (
                <Circle key={`${x}:${y}`} cx={x} cy={y} r={3} fill={tint} opacity={0.16} />
              )),
            )}
            <Path d="M82 9H338M82 131H338" stroke={tint} strokeWidth={3} opacity={0.07} />
          </>
        ) : unitId === 5 ? (
          <>
            <Circle
              cx={34}
              cy={34}
              r={17}
              fill="none"
              stroke={tint}
              strokeWidth={3}
              opacity={0.13}
            />
            <Circle cx={382} cy={105} r={12} fill={tint} opacity={0.08} />
            <Path
              d="M75 12v118m268-118v118"
              stroke={tint}
              strokeWidth={2}
              strokeDasharray="4 13"
              opacity={0.1}
            />
          </>
        ) : unitId === 6 ? (
          <>
            <Path
              d="M12 24h62m-62 25h62m-62 25h62m-62 25h62m272-75h62m-62 25h62m-62 25h62m-62 25h62"
              stroke={tint}
              strokeWidth={3}
              opacity={0.12}
            />
            <Circle
              cx={356}
              cy={62}
              r={17}
              fill="none"
              stroke={tint}
              strokeWidth={4}
              opacity={0.11}
            />
          </>
        ) : unitId === 7 ? (
          <>
            <Path
              d="M25 -4v38h50v66h45v44M395 -4v50h-40v64h-50v34"
              stroke={tint}
              strokeWidth={4}
              fill="none"
              opacity={0.2}
            />
            {[
              { x: 25, y: 34 },
              { x: 75, y: 100 },
              { x: 355, y: 46 },
              { x: 305, y: 110 },
            ].map(({ x, y }) => (
              <Rect
                key={`${x}:${y}`}
                x={x - 6}
                y={y - 6}
                width={12}
                height={12}
                rx={3}
                fill={tint}
                opacity={0.25}
              />
            ))}
          </>
        ) : (
          <>
            <Path
              d="m36 22 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm325 66 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"
              fill="#FFE19C"
              opacity={0.85}
            />
            <Circle cx={90} cy={105} r={2.5} fill="#C6D5FF" />
            <Circle cx={324} cy={20} r={2} fill="#FFFFFF" />
            <Ellipse
              cx={382}
              cy={25}
              rx={20}
              ry={7}
              fill="none"
              stroke="#91B8F3"
              strokeWidth={2}
              opacity={0.3}
            />
          </>
        )}
        {unitId <= 2 && index % 3 === 0 ? (
          <>
            <Ellipse cx={355} cy={85} rx={58} ry={24} fill={tint} opacity={0.07} />
            <Circle cx={36} cy={32} r={6} fill={tint} opacity={0.1} />
            <Circle cx={59} cy={48} r={4} fill={tint} opacity={0.1} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

/** Each learning phase has a useful physical landmark, rather than the same garden repeated. */
export function HomeUnitLandmark({
  unitId,
  index,
  size = 64,
}: {
  unitId: number;
  index: number;
  size?: number;
}) {
  if (unitId === 1) return <PathScenery kind={index === 1 ? 'garden' : 'sign'} size={size} />;
  const theme = pathUnitTheme(unitId);
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {unitId !== 8 ? (
        <Ellipse cx={40} cy={73} rx={32} ry={5} fill={theme.edge} opacity={0.16} />
      ) : null}
      {unitId === 2 ? (
        <>
          <Rect x={8} y={10} width={64} height={55} rx={9} fill="#AB5961" />
          <Rect x={12} y={7} width={56} height={52} rx={7} fill="#E87B8F" />
          {[19, 38, 55].map((x, y) => (
            <G key={x}>
              <Rect x={x - 5} y={19 + y * 4} width={17} height={25} rx={3} fill="#FFFAEE" />
              <Circle cx={x + 3} cy={21 + y * 4} r={3} fill={theme.edge} />
            </G>
          ))}
          <Circle cx={55} cy={53} r={12} fill="#FCE8BD" stroke={theme.edge} strokeWidth={4} />
          <Path d="m64 62 9 9" stroke={theme.edge} strokeWidth={7} strokeLinecap="round" />
        </>
      ) : unitId === 3 ? (
        <>
          <Rect x={6} y={35} width={68} height={35} rx={8} fill="#527D2B" />
          <Rect x={9} y={31} width={62} height={33} rx={7} fill="#9BD45F" />
          <Rect x={15} y={19} width={20} height={27} rx={5} fill="#FFCE59" />
          <Rect x={43} y={12} width={22} height={34} rx={5} fill="#66B9EF" />
          <Rect x={28} y={42} width={24} height={21} rx={5} fill="#FFF7D6" />
          <Path d="M15 53h11m30 0h10" stroke="#527D2B" strokeWidth={4} strokeLinecap="round" />
        </>
      ) : unitId === 4 ? (
        <>
          <Rect x={7} y={42} width={66} height={10} rx={4} fill="#C38C57" />
          <Path d="M14 50v20m51-20v20" stroke="#895D3B" strokeWidth={7} strokeLinecap="round" />
          <Rect x={27} y={7} width={28} height={38} rx={6} fill="#1E6A47" />
          <Rect x={31} y={12} width={20} height={26} rx={3} fill="#EDFFF1" />
          <Rect x={34} y={16} width={14} height={7} rx={2} fill="#78C9A1" />
          <Rect x={34} y={28} width={11} height={5} rx={2} fill="#FFC35B" />
          <Path d="m11 27 7 12m-5-17 7 12" stroke="#E8AE4B" strokeWidth={5} strokeLinecap="round" />
        </>
      ) : unitId === 5 ? (
        <>
          <Path
            d="M29 10h22v27l18 26q5 10-6 10H17q-11 0-6-10l18-26Z"
            fill="#FFCF62"
            stroke="#A9741E"
            strokeWidth={4}
          />
          <Path d="M23 49h34l11 18H12Z" fill="#EEAB40" />
          <Rect x={24} y={7} width={32} height={9} rx={4} fill="#A9741E" />
          <Circle cx={36} cy={56} r={5} fill="#FFF6CB" />
          <Circle cx={49} cy={64} r={3} fill="#FFF6CB" />
          <Circle cx={58} cy={28} r={5} fill="#FFCF62" />
          <Circle cx={66} cy={17} r={3} fill="#FFE6A1" />
        </>
      ) : unitId === 6 ? (
        <>
          <Path
            d="M26 32V20h28v12"
            stroke="#8D701D"
            strokeWidth={8}
            fill="none"
            strokeLinejoin="round"
          />
          <Rect x={7} y={29} width={66} height={40} rx={9} fill="#9E7B22" />
          <Rect x={7} y={25} width={66} height={38} rx={9} fill="#D5AC3F" />
          <Path d="M8 40q32 13 64 0" stroke="#9E7B22" strokeWidth={4} fill="none" />
          <Rect x={33} y={37} width={14} height={13} rx={3} fill="#FFF4C9" />
          <Circle cx={65} cy={18} r={10} fill="#FFE17C" stroke="#C39927" strokeWidth={3} />
        </>
      ) : unitId === 7 ? (
        <>
          <Path
            d="M20 19h39v40H21V20m0 39v14m38-14h15"
            stroke="#2370B6"
            strokeWidth={5}
            fill="none"
          />
          {[
            { x: 9, y: 8 },
            { x: 48, y: 8 },
            { x: 9, y: 48 },
          ].map(({ x, y }) => (
            <G key={x + ':' + y}>
              <Rect x={x} y={y + 3} width={25} height={25} rx={6} fill="#1C508C" />
              <Rect x={x} y={y} width={25} height={25} rx={6} fill="#58ABE4" />
              <Circle cx={x + 12.5} cy={y + 12.5} r={4} fill="#F3FAFF" />
            </G>
          ))}
        </>
      ) : index === 1 ? (
        <>
          <Circle cx={40} cy={40} r={23} fill="#A785F0" />
          <Path
            d="M21 27q16 11 38 8m-38 16q17-4 36 3"
            stroke="#795ECA"
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
          <Ellipse
            cx={40}
            cy={42}
            rx={35}
            ry={10}
            transform="rotate(-22 40 42)"
            fill="none"
            stroke="#FDD79C"
            strokeWidth={5}
          />
          <Circle cx={67} cy={12} r={3} fill="#DDE8FF" />
        </>
      ) : (
        <G transform="rotate(24 40 40)">
          <Path d="M29 56 19 69V47l12-9m18 18 12 13V47l-12-9" fill="#73B3F2" />
          <Path d="M28 57V31Q28 13 40 5q12 8 12 26v26Z" fill="#F5F8FF" />
          <Path d="M28 31Q28 13 40 5q12 8 12 26Z" fill="#C29BF3" />
          <Circle cx={40} cy={33} r={8} fill="#5D97D4" stroke="#D5E7FF" strokeWidth={3} />
          <Path d="M32 58q0 14 8 19 8-5 8-19Z" fill="#FFC85C" />
          <Path d="M36 59q0 8 4 12 4-4 4-12Z" fill="#FFEAC4" />
        </G>
      )}
    </Svg>
  );
}

export function HomeComingSoonCloud() {
  return (
    <View style={{ width: '100%', height: 240, overflow: 'hidden' }} testID="home-coming-soon">
      <Svg width="100%" height={240} viewBox="0 0 420 240" preserveAspectRatio="none">
        <Path
          d="M-20 98Q4 54 39 78Q52 24 102 52Q129 7 169 39Q209 -3 250 44Q298 12 321 65Q370 25 394 82Q428 55 444 105V260H-20Z"
          fill="#FFFFFF"
        />
        <Path
          d="M-10 172Q27 128 70 154Q109 105 153 148Q194 118 224 146Q264 102 306 148Q351 117 434 164V260H-10Z"
          fill="#F9FBFF"
        />
      </Svg>
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: 57, alignItems: 'center' }}>
        <T
          variant="heading"
          accessibilityRole="header"
          style={{ textAlign: 'center', color: colors.text }}
        >
          New unit coming soon
        </T>
      </View>
    </View>
  );
}
