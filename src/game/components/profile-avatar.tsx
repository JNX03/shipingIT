import { type StyleProp, View, type ViewStyle } from 'react-native';
import { avatarHairStyles, defaultProfileAvatar, profileBackdrops, type ProfileAvatarSelection } from '../profile-avatar';
import { PlayerAvatar } from './player-avatar';
import type { GameMotion } from '../avatar-motion';

export function ProfileAvatar({
  avatar = defaultProfileAvatar, size = 160, accessibilityLabel, style, motion = 'idle',
}: {
  avatar?: ProfileAvatarSelection;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  motion?: GameMotion;
}) {
  const backdrop = profileBackdrops.find(({ id }) => id === avatar.backdrop) ?? profileBackdrops[0];
  const hairstyle = avatarHairStyles.find(({ id }) => id === avatar.hairStyle) ?? avatarHairStyles[0];
  return (
    <View
      accessible accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `Your avatar with ${hairstyle.name.toLowerCase()} hair on a ${backdrop.name.toLowerCase()} backdrop`}
      testID="profile-avatar-preview"
      style={[{
        width: size, height: size, overflow: 'hidden', borderRadius: size * 0.24,
        borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: backdrop.color,
      }, style]}
    >
      <PlayerAvatar avatar={avatar} size={size} motion={motion} />
    </View>
  );
}
