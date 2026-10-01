import { View } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { T } from '@/components/ui/text';
import { colors } from '@/theme';
export function SparkMarketArt() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0DA', borderRadius: 24, padding: 12, gap: 12 }}>
    <Svg width={112} height={70} viewBox="0 0 240 125">
      <Rect x={35} y={42} width={170} height={73} rx={8} fill="#B97845" />
      <Rect x={44} y={51} width={152} height={45} rx={4} fill="#FFE4BB" />
      <Rect x={25} y={20} width={190} height={15} rx={6} fill="#E76C98" />
      {[0,1,2,3,4].map((index) => <Path key={index} d={`M${25 + index * 38} 30h38v16q-19 15-38 0Z`} fill={index % 2 ? '#FFF7EB' : '#F487B0'} />)}
      <Path d="M65 70L76 57H94L105 70L96 80V95H75V80Z" fill="#7191E9" />
      <Path d="M118 88C108 81 108 69 117 69C122 69 125 74 125 74C128 66 139 69 139 77C139 84 125 95 125 95Z" fill="#FF70A9" />
      <Circle cx={166} cy={78} r={16} fill="#FFD75C" /><Path d="M166 63L170 74L181 78L170 82L166 93L162 82L151 78L162 74Z" fill="#FFF5B8" />
      <Rect x={24} y={104} width={192} height={14} rx={7} fill="#9B603A" />
    </Svg>
    <View style={{ flex: 1 }}><T variant="heading" style={{ color: colors.text }}>Sparks Market</T><T variant="small">A little reward for your next build.</T></View>
  </View>;
}
