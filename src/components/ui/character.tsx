import { Image } from 'expo-image';
import { View, StyleProp, ViewStyle } from 'react-native';
import { type CharacterEmotion, illustrationAssets, MissionIllustration } from '@/assets/registry';
import { GameActor, type GameMotion } from '@/game/components/actor';
import { colors, radius, space } from '@/theme';
import { T } from './text';
const characterMotions: Record<CharacterEmotion, GameMotion> = {
  welcome: 'celebrate',
  neutral: 'idle',
  waving: 'talk',
  thinking: 'thinking',
  questioning: 'thinking',
  encouraging: 'talk',
  celebrating: 'celebrate',
  pointing: 'talk',
  original: 'idle',
};
export function Character({
  emotion = 'neutral',
  size = 160,
  style,
  active = true,
}: {
  emotion?: CharacterEmotion;
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`Ami, your innovation mentor${emotion === 'thinking' ? ', thinking' : ''}`}
      style={[{ width: size, height: size }, style]}
    >
      <GameActor character="ami" motion={characterMotions[emotion]} size={size} active={active} />
    </View>
  );
}
export function MissionArt({
  mission,
  size = 180,
}: {
  mission: MissionIllustration;
  size?: number;
}) {
  return (
    <Image
      source={illustrationAssets[mission]}
      contentFit="contain"
      style={{ width: size, height: size }}
      accessibilityLabel={`${mission} mission illustration`}
    />
  );
}
export function SpeechBubble({ children }: { children: string }) {
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius.card,
        padding: space.lg,
        backgroundColor: colors.surface,
        flex: 1,
      }}
    >
      <T>{children}</T>
    </View>
  );
}
export function MentorTip({
  children,
  emotion = 'thinking',
}: {
  children: string;
  emotion?: CharacterEmotion;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <Character emotion={emotion} size={88} />
      <SpeechBubble>{children}</SpeechBubble>
    </View>
  );
}
