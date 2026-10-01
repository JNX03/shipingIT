import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useActorMotion } from './use-actor-motion';
import { AmiOriginal } from './ami-original';
import { characterRigArt as art } from '../motion-art';
import { sampleAvatarPose, type AvatarFacing, type GameMotion } from '../avatar-motion';
import {
  avatarForCharacter, avatarSkinTones, avatarHairColors, avatarEyeColors, avatarOutfitColors,
  type ProfileAvatarSelection,
} from '../profile-avatar';

export type { GameMotion, AvatarFacing } from '../avatar-motion';
export type GameCharacter = 'ami' | 'mali' | 'noa' | 'ken';
type Pose = ReturnType<typeof sampleAvatarPose>;
type PoseValue = SharedValue<Pose>;
const BASE = 240;
const hairArt = { ami: art.hairAmi, crop: art.hairCrop, bob: art.hairBob, curls: art.hairCurls, long: art.hairLong };
const palette = <T extends { id: string; color: string }>(options: readonly T[], id: string) =>
  options.find((option) => option.id === id)?.color ?? options[0].color;

export interface CharacterRigProps {
  avatar: ProfileAvatarSelection;
  motion?: GameMotion;
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  facing?: AvatarFacing;
  outfitItemId?: string | null;
  headwearItemId?: string | null;
  /** Wallet/catalog owner validates IDs and supplies WearableLayer through this adapter. */
  renderWearable?: (props: CharacterWearableProps) => ReactNode;
}
export type CharacterWearableAnchor = 'torso' | 'head' | 'left-upper-arm' | 'right-upper-arm'
  | 'left-forearm' | 'right-forearm' | 'left-thigh' | 'right-thigh' | 'left-shin' | 'right-shin';
export interface CharacterWearableProps { itemId: string; anchor: CharacterWearableAnchor; facing: AvatarFacing }
type Wear = (anchor: CharacterWearableAnchor) => ReactNode;

/** Generated raster parts move around real joints. Only transforms/opacity run per frame. */
export function CharacterRig({
  avatar, motion = 'idle', size = 116, style, active = true, facing = 'front',
  outfitItemId, headwearItemId, renderWearable,
}: CharacterRigProps) {
  const { elapsed, running } = useActorMotion(motion, active);
  const pose = useDerivedValue(() => sampleAvatarPose(elapsed.get(), running.get() ? motion : 'still'));
  const torso = useAnimatedStyle(() => ({
    transform: [{ translateY: pose.get().torsoY }, { rotate: `${pose.get().torsoAngle}deg` }],
  }));
  const head = useAnimatedStyle(() => ({
    transform: [{ translateY: pose.get().headY }, { rotate: `${pose.get().headAngle}deg` }],
  }));
  const eyes = useAnimatedStyle(() => ({ opacity: pose.get().eyesOpen }));
  const blink = useAnimatedStyle(() => ({ opacity: 1 - pose.get().eyesOpen }));
  const pupils = useAnimatedStyle(() => ({
    transform: [{ translateX: pose.get().pupilsX }, { translateY: pose.get().pupilsY }],
  }));
  const closedMouth = useAnimatedStyle(() => ({
    opacity: 1 - pose.get().mouthOpen,
    transform: [{ rotate: pose.get().sad ? '180deg' : '0deg' }],
  }));
  const openMouth = useAnimatedStyle(() => ({
    opacity: pose.get().mouthOpen,
    transform: [{ scaleY: pose.get().mouthScale }],
  }));
  const skin = palette(avatarSkinTones, avatar.skinTone);
  const hair = palette(avatarHairColors, avatar.hairColor);
  const eye = palette(avatarEyeColors, avatar.eyeColor);
  const shirt = palette(avatarOutfitColors, avatar.outfitColor);
  const isBack = facing === 'back';
  const hasOutfit = !!outfitItemId && !!renderWearable;
  const wear: Wear = (anchor) => {
    const itemId = anchor === 'head' ? headwearItemId : outfitItemId;
    return itemId ? renderWearable?.({ itemId, anchor, facing }) : null;
  };
  const hairGeometry = avatar.hairStyle === 'long'
    ? { left: 59, top: 13, width: 122, height: 133 }
    : { left: 59, top: 13, width: 122, height: 116 };
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, style]}>
      <View style={{ width: BASE, height: BASE, transformOrigin: 'left top', transform: [{ scale: size / BASE }] }}>
        <View style={{ width: BASE, height: BASE, transform: [{ scaleX: facing === 'left' ? -1 : 1 }] }}>
          <Animated.View testID="actor-body" style={[styles.torsoGroup, torso]}>
          <Animated.View testID="actor-back-hair" style={[styles.headGroup, head]}>
            <Part source={hairArt[avatar.hairStyle]} {...hairGeometry} tint={hair} />
          </Animated.View>
          <Leg side="left" pose={pose} skin={skin} wear={wear} />
          <Leg side="right" pose={pose} skin={skin} wear={wear} />
          <View testID="actor-torso" style={StyleSheet.absoluteFill}>
            <Arm side="left" pose={pose} skin={skin} wear={wear} />
            <Arm side="right" pose={pose} skin={skin} wear={wear} />
            <Part source={art.head} left={111} top={103} width={18} height={27} tint={skin} />
            {!hasOutfit ? <Part source={art.shirt} left={83} top={112} width={74} height={49} tint={shirt} /> : null}
            {!hasOutfit ? avatar.character === 'ami' || avatar.character === 'mali' ? (
              <Part source={art.skirt} left={87} top={150} width={66} height={36} tint="#34446B" />
            ) : (
              <Part source={art.shirt} left={95} top={150} width={50} height={25} tint={avatar.character === 'noa' ? '#DCAA50' : '#34446B'} />
            ) : null}
            {!isBack && !hasOutfit ? <Part source={art.tie} left={105} top={116} width={30} height={29} /> : null}
            {wear('torso')}
          </View>
          <Animated.View testID="actor-head" style={[styles.headGroup, head]}>
            <Part source={art.head} left={69} top={39} width={102} height={79} tint={skin} />
            {!isBack ? (
              <>
                <Animated.View testID="actor-eyes" style={[StyleSheet.absoluteFill, eyes]}>
                  <Part source={art.eyeWhites} left={84} top={71} width={72} height={40} />
                  <Animated.View style={[StyleSheet.absoluteFill, pupils]}>
                    <Part source={art.pupils} left={94} top={74} width={52} height={33} tint={eye} />
                  </Animated.View>
                </Animated.View>
                <Animated.View testID="actor-blink" style={[StyleSheet.absoluteFill, blink]}>
                  <Part source={art.blink} left={84} top={88} width={72} height={13} tint="#33303A" />
                </Animated.View>
                <Animated.View testID="actor-mouth-closed" style={[styles.mouth, closedMouth]}>
                  <Part source={art.smile} left={3} top={4} width={16} height={6} tint="#443638" />
                </Animated.View>
                <Animated.View testID="actor-mouth-open" style={[styles.mouth, openMouth]}>
                  <Part source={art.mouthOpen} left={1} top={0} width={20} height={15} />
                </Animated.View>
              </>
            ) : null}
            <Part source={hairArt[avatar.hairStyle]} {...hairGeometry} tint={avatar.hairStyle === 'ami' && avatar.hairColor === 'charcoal' ? undefined : hair} />
            {isBack ? <Part source={art.head} left={77} top={28} width={86} height={86} tint={hair} /> : null}
            {wear('head')}
          </Animated.View>
          <Arm side="left" pose={pose} skin={skin} wear={wear} foreground />
          <Arm side="right" pose={pose} skin={skin} wear={wear} foreground />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function Arm({ side, pose, skin, wear, foreground = false }: { side: 'left' | 'right'; pose: PoseValue; skin: string; wear: Wear; foreground?: boolean }) {
  const left = side === 'left';
  const shoulder = useAnimatedStyle(() => ({
    transform: [{ rotate: `${left ? pose.get().leftArm : pose.get().rightArm}deg` }],
  }));
  const elbow = useAnimatedStyle(() => ({
    transform: [{ rotate: `${left ? pose.get().leftElbow : pose.get().rightElbow}deg` }],
  }));
  const wrist = useAnimatedStyle(() => ({ transform: [{ rotate: `${left ? pose.get().leftWrist : pose.get().rightWrist}deg` }] }));
  return (
    <Animated.View testID={`actor-${side}-shoulder-${foreground ? 'front' : 'back'}`} style={[styles.arm, { left: left ? 90 : 134 }, shoulder]}>
      {!foreground ? <Part source={art.leg} left={0} top={0} width={16} height={31} tint={skin} /> : null}
      {!foreground ? wear(`${side}-upper-arm`) : null}
      {foreground ? <Animated.View testID={`actor-${side}-elbow`} style={[styles.forearm, elbow]}>
        <View style={{ position: 'absolute', width: 16, height: 19, overflow: 'hidden' }}>
          <Part source={art.arm} left={0} top={0} width={16} height={31} tint={skin} />
        </View>
        <Animated.View testID={`actor-${side}-wrist`} style={[styles.hand, wrist]}>
          <Part source={art.arm} left={0} top={-19} width={16} height={31} tint={skin} />
        </Animated.View>
        {wear(`${side}-forearm`)}
      </Animated.View> : null}
    </Animated.View>
  );
}
function Leg({ side, pose, skin, wear }: { side: 'left' | 'right'; pose: PoseValue; skin: string; wear: Wear }) {
  const left = side === 'left';
  const hip = useAnimatedStyle(() => ({
    transform: [{ rotate: `${left ? pose.get().leftHip : pose.get().rightHip}deg` }],
  }));
  const knee = useAnimatedStyle(() => ({
    transform: [{ rotate: `${left ? pose.get().leftKnee : pose.get().rightKnee}deg` }],
  }));
  const ankle = useAnimatedStyle(() => ({ transform: [{ rotate: `${left ? pose.get().leftFoot : pose.get().rightFoot}deg` }] }));
  return (
    <Animated.View testID={`actor-${side}-hip`} style={[styles.leg, { left: left ? 97 : 126 }, hip]}>
      <Part source={art.leg} left={0} top={0} width={17} height={29} tint={skin} />
      {wear(`${side}-thigh`)}
      <Animated.View testID={`actor-${side}-knee`} style={[styles.shin, knee]}>
        <Part source={art.leg} left={0} top={0} width={16} height={27} tint={skin} />
        {wear(`${side}-shin`)}
        <Animated.View testID={`actor-${side}-ankle`} style={[styles.ankle, ankle]}>
          <Part source={art.shoe} left={0} top={0} width={24} height={30} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
function Part({ source, left, top, width, height, tint }: { source: number; left: number; top: number; width: number; height: number; tint?: string }) {
  return <Image source={source} tintColor={tint} contentFit="fill" transition={0} style={{ position: 'absolute', left, top, width, height }} />;
}

/** Mentor/NPC contract preserved for every existing lesson and dialogue consumer. */
export function GameActor({ character = 'ami', ...props }: Omit<CharacterRigProps, 'avatar'> & { character?: GameCharacter }) {
  const { outfitItemId: _outfit, headwearItemId: _headwear, renderWearable: _wear, ...fixedProps } = props;
  if (character === 'ami') return <AmiOriginal {...fixedProps} />;
  return <CharacterRig avatar={avatarForCharacter(character)} {...fixedProps} />;
}

const styles = StyleSheet.create({
  headGroup: { position: 'absolute', width: BASE, height: BASE, transformOrigin: '120px 114px' },
  torsoGroup: { position: 'absolute', width: BASE, height: BASE, transformOrigin: '120px 152px' },
  arm: { position: 'absolute', top: 123, width: 16, height: 56, transformOrigin: '8px 7px' },
  forearm: { position: 'absolute', top: 25, width: 16, height: 31, transformOrigin: '8px 7px' },
  hand: { position: 'absolute', top: 19, width: 16, height: 12, overflow: 'hidden', transformOrigin: '8px 0px' },
  leg: { position: 'absolute', top: 156, width: 17, height: 66, transformOrigin: '8px 4px' },
  shin: { position: 'absolute', top: 22, width: 16, height: 44, transformOrigin: '8px 4px' },
  ankle: { position: 'absolute', left: -4, top: 15, width: 24, height: 30, transformOrigin: '12px 5px' },
  mouth: { position: 'absolute', left: 109, top: 101, width: 22, height: 16 },
});
