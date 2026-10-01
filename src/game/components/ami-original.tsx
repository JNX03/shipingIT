import { Image } from 'expo-image';
import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, G, Image as SvgImage, Mask } from 'react-native-svg';
import { useActorMotion } from './use-actor-motion';
import {
  canonicalOriginalArt as art,
  auxiliaryOriginalArt as auxiliary,
  completionOriginalArt as completion,
  type CanonicalOriginalPart,
  type AuxiliaryOriginalPart,
  type CompletionOriginalPart,
} from './ami-original-art';
import { originalAmiGeometry as geometry } from './ami-original-geometry';
import {
  sampleAmiOriginalPose,
  type AmiOriginalPose,
  type GameMotion,
} from './ami-original-motion';

type Facing = 'front' | 'back' | 'left' | 'right';
type Box = readonly [number, number, number, number];
type Point = readonly [number, number];
type Pose = SharedValue<AmiOriginalPose>;
type Angle =
  | 'leftArm'
  | 'rightArm'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'leftHip'
  | 'rightHip'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftFoot'
  | 'rightFoot';
const AnimatedSvgImage = Animated.createAnimatedComponent(SvgImage);

export interface AmiOriginalProps {
  motion?: GameMotion;
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  facing?: Facing;
}

/** Literal original Ami cutouts; original portrait proportions, colors and neutral pixels remain intact. */
export function AmiOriginal({
  motion = 'idle',
  size = 116,
  style,
  active = true,
  facing = 'front',
}: AmiOriginalProps) {
  const { elapsed, running } = useActorMotion(motion, active);
  const pose = useDerivedValue(() =>
    sampleAmiOriginalPose(elapsed.get(), running.get() ? motion : 'still'),
  );
  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: pose.get().bodyY }, { rotate: `${pose.get().bodyAngle}deg` }],
  }));
  const head = useAnimatedStyle(() => ({
    transform: [{ translateY: pose.get().headY }, { rotate: `${pose.get().headAngle}deg` }],
  }));
  const hair = useAnimatedStyle(() => ({ transform: [{ rotate: `${pose.get().hairAngle}deg` }] }));
  const hairFill = useAnimatedStyle(() => ({ opacity: fillWeight(pose.get()) }));
  const shirtFill = useAnimatedStyle(() => ({
    opacity: pose.get().leftArm !== 0 || pose.get().rightArm !== 0 ? 1 : 0,
  }));
  const accessory = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-pose.get().hairAngle * 0.25}deg` }],
  }));
  const back = facing === 'back';
  return (
    <View
      testID="ami-original"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      <View
        style={[
          styles.canvas,
          {
            left: (size - (geometry.width * size) / geometry.height) / 2,
            transformOrigin: [0, 0, 0],
            transform: [{ scale: size / geometry.height }],
          },
        ]}
      >
        <View style={[styles.canvas, { transform: [{ scaleX: facing === 'left' ? -1 : 1 }] }]}>
          <Animated.View
            testID="ami-original-body"
            style={[styles.canvas, pivot(geometry.joints.torso), body]}
          >
            <Animated.View style={[styles.canvas, pivot(geometry.joints.head), head]}>
              <Animated.View
                testID="ami-original-rear-hair"
                style={[styles.canvas, pivot(geometry.joints.head), hair]}
              >
                <Animated.View style={[styles.canvas, hairFill]}>
                  <CompletionPart name="rear-hair-underlay" />
                </Animated.View>
                <CanonicalPart name="hair-back-left" />
                <CanonicalPart name="hair-back-right" />
              </Animated.View>
            </Animated.View>
            <Leg side="left" pose={pose} />
            <Leg side="right" pose={pose} />
            <Arm side="left" pose={pose} />
            <Arm side="right" pose={pose} />
            <Animated.View style={[styles.canvas, shirtFill]}>
              <CompletionPart name="torso-underlay" />
            </Animated.View>
            <CanonicalPart name="neck" />
            <CanonicalPart name="torso" />
            <CanonicalPart name="skirt" />
            <Animated.View
              testID="ami-original-head"
              style={[styles.canvas, pivot(geometry.joints.head), head]}
            >
              {back ? <CompletionPart name="back-head-fill" /> : <Face pose={pose} />}
              <CanonicalPart name="hair-front" />
              <Animated.View
                testID="ami-original-accessory"
                style={[styles.canvas, pivot([378, 198]), accessory]}
              >
                <CanonicalPart name="accessory" />
              </Animated.View>
            </Animated.View>
            <Arm side="left" pose={pose} foreground />
            <Arm side="right" pose={pose} foreground />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function Face({ pose }: { pose: Pose }) {
  const skinFill = useAnimatedStyle(() => ({ opacity: faceFillWeight(pose.get()) }));
  const blink = useAnimatedStyle(() => ({ opacity: 1 - pose.get().eyesOpen }));
  const browLeft = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.get().browLeft}deg` }],
  }));
  const browRight = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.get().browRight}deg` }],
  }));
  const smile = useAnimatedStyle(() => ({
    opacity: (1 - pose.get().mouthOpen) * (1 - pose.get().sad),
  }));
  const mouth = useAnimatedStyle(() => ({
    opacity: pose.get().mouthOpen,
    transform: [{ scaleY: pose.get().mouthScale }],
  }));
  const frown = useAnimatedStyle(() => ({ opacity: pose.get().sad }));
  return (
    <>
      <Animated.View style={[styles.canvas, skinFill]}>
        <CompletionPart name="face-underlay" />
      </Animated.View>
      <CanonicalPart name="face" />
      <Eye side="left" pose={pose} />
      <Eye side="right" pose={pose} />
      <Animated.View testID="ami-original-blink" style={[styles.canvas, blink]}>
        <AuxiliaryPart name="blink-left" box={geometry.expressions['blink-left']} />
        <AuxiliaryPart name="blink-right" box={geometry.expressions['blink-right']} />
      </Animated.View>
      <Animated.View
        testID="ami-original-left-brow"
        style={[styles.canvas, pivot([199, 220]), browLeft]}
      >
        <CanonicalPart name="brow-left" />
      </Animated.View>
      <Animated.View
        testID="ami-original-right-brow"
        style={[styles.canvas, pivot([306, 214]), browRight]}
      >
        <CanonicalPart name="brow-right" />
      </Animated.View>
      <Animated.View testID="ami-original-smile" style={[styles.canvas, smile]}>
        <CanonicalPart name="smile" />
      </Animated.View>
      <Animated.View testID="ami-original-mouth" style={[styles.canvas, pivot([262, 310]), mouth]}>
        <AuxiliaryPart name="mouth-open" box={geometry.expressions['mouth-open']} />
      </Animated.View>
      <Animated.View testID="ami-original-frown" style={[styles.canvas, frown]}>
        <AuxiliaryPart name="frown" box={geometry.expressions.frown} />
      </Animated.View>
    </>
  );
}

function Eye({ side, pose }: { side: 'left' | 'right'; pose: Pose }) {
  const left = side === 'left';
  const apertureName = left ? 'eye-aperture-left' : 'eye-aperture-right';
  const whiteName = left ? 'eye-white-left' : 'eye-white-right';
  const pupilName = left ? 'pupil-left' : 'pupil-right';
  const fillName = left ? 'white-underlay-left' : 'white-underlay-right';
  const box = geometry.completionBoxes[apertureName];
  const white = geometry.canonicalBoxes[whiteName];
  const pupil = geometry.canonicalBoxes[pupilName];
  const fill = geometry.completionBoxes[fillName];
  const width = box[2] - box[0];
  const height = box[3] - box[1];
  const id = `ami-eye-${side}-${useId().replace(/:/g, '')}`;
  const eyes = useAnimatedStyle(() => ({
    opacity: pose.get().eyesOpen,
    transform: [{ scaleY: Math.max(0.12, pose.get().eyesOpen) }],
  }));
  const whiteFill = useAnimatedProps(() => ({
    opacity: pose.get().pupilsX !== 0 || pose.get().pupilsY !== 0 ? 1 : 0,
  }));
  const pupils = useAnimatedProps(() => ({
    x: pupil[0] - box[0] + pose.get().pupilsX,
    y: pupil[1] - box[1] + pose.get().pupilsY,
  }));
  return (
    <Animated.View
      testID={`ami-original-${side}-eye`}
      style={[
        {
          position: 'absolute',
          left: box[0],
          top: box[1],
          width,
          height,
          transformOrigin: [width / 2, height / 2, 0],
        },
        eyes,
      ]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <Mask
            id={id}
            x={0}
            y={0}
            width={width}
            height={height}
            maskUnits="userSpaceOnUse"
            style={{ maskType: 'alpha' }}
          >
            <SvgImage
              href={completion[apertureName]}
              x={0}
              y={0}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
          </Mask>
        </Defs>
        <G mask={`url(#${id})`}>
          <AnimatedSvgImage
            href={completion[fillName]}
            x={fill[0] - box[0]}
            y={fill[1] - box[1]}
            width={fill[2] - fill[0]}
            height={fill[3] - fill[1]}
            preserveAspectRatio="none"
            animatedProps={whiteFill}
          />
          <SvgImage
            href={art[whiteName]}
            x={white[0] - box[0]}
            y={white[1] - box[1]}
            width={white[2] - white[0]}
            height={white[3] - white[1]}
            preserveAspectRatio="none"
          />
          <AnimatedSvgImage
            testID={`ami-original-${side}-pupil`}
            href={art[pupilName]}
            width={pupil[2] - pupil[0]}
            height={pupil[3] - pupil[1]}
            preserveAspectRatio="none"
            animatedProps={pupils}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

function Arm({
  side,
  pose,
  foreground = false,
}: {
  side: 'left' | 'right';
  pose: Pose;
  foreground?: boolean;
}) {
  const left = side === 'left';
  const shoulder = geometry.joints[left ? 'shoulder-left' : 'shoulder-right'];
  const elbow = geometry.joints[left ? 'elbow-left' : 'elbow-right'];
  const wrist = geometry.joints[left ? 'wrist-left' : 'wrist-right'];
  const shoulderAngle = left ? 'leftArm' : 'rightArm';
  const elbowAngle = left ? 'leftElbow' : 'rightElbow';
  const wristAngle = left ? 'leftWrist' : 'rightWrist';
  const arm = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.get()[shoulderAngle]}deg` }],
  }));
  const forearm = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.get()[elbowAngle]}deg` }],
  }));
  const hand = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.get()[wristAngle]}deg` }],
  }));
  return (
    <Animated.View
      testID={`ami-original-${side}-shoulder-${foreground ? 'front' : 'back'}`}
      style={[styles.canvas, pivot(shoulder), arm]}
    >
      {!foreground ? (
        <>
          <Cap pose={pose} angle={shoulderAngle} point={shoulder} width={24} height={24} white />
          <CanonicalPart name={left ? 'upper-arm-left' : 'upper-arm-right'} />
        </>
      ) : (
        <Animated.View
          testID={`ami-original-${side}-elbow`}
          style={[styles.canvas, pivot(elbow), forearm]}
        >
          <Cap pose={pose} angle={elbowAngle} point={elbow} width={27} height={27} />
          <CanonicalPart name={left ? 'forearm-left' : 'forearm-right'} />
          <Animated.View
            testID={`ami-original-${side}-wrist`}
            style={[styles.canvas, pivot(wrist), hand]}
          >
            <Cap pose={pose} angle={wristAngle} point={wrist} width={24} height={24} />
            <CanonicalPart name={left ? 'hand-left' : 'hand-right'} />
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function Leg({ side, pose }: { side: 'left' | 'right'; pose: Pose }) {
  const left = side === 'left';
  const hip = geometry.joints[left ? 'hip-left' : 'hip-right'];
  const knee = geometry.joints[left ? 'knee-left' : 'knee-right'];
  const ankle = geometry.joints[left ? 'ankle-left' : 'ankle-right'];
  const hipAngle = left ? 'leftHip' : 'rightHip';
  const kneeAngle = left ? 'leftKnee' : 'rightKnee';
  const ankleAngle = left ? 'leftFoot' : 'rightFoot';
  const thigh = useAnimatedStyle(() => ({ transform: [{ rotate: `${pose.get()[hipAngle]}deg` }] }));
  const shin = useAnimatedStyle(() => ({ transform: [{ rotate: `${pose.get()[kneeAngle]}deg` }] }));
  const shoe = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.get()[ankleAngle]}deg` }],
  }));
  return (
    <Animated.View testID={`ami-original-${side}-hip`} style={[styles.canvas, pivot(hip), thigh]}>
      <Cap pose={pose} angle={hipAngle} point={hip} width={37} height={32} leg />
      <CanonicalPart name={left ? 'thigh-left' : 'thigh-right'} />
      <Animated.View
        testID={`ami-original-${side}-knee`}
        style={[styles.canvas, pivot(knee), shin]}
      >
        <Cap pose={pose} angle={kneeAngle} point={knee} width={38} height={32} leg />
        <CanonicalPart name={left ? 'shin-left' : 'shin-right'} />
        <Animated.View
          testID={`ami-original-${side}-ankle`}
          style={[styles.canvas, pivot(ankle), shoe]}
        >
          <Cap pose={pose} angle={ankleAngle} point={ankle} width={34} height={28} white />
          <CanonicalPart name={left ? 'shoe-left' : 'shoe-right'} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function Cap({
  pose,
  angle,
  point,
  width,
  height,
  leg = false,
  white = false,
}: {
  pose: Pose;
  angle: Angle;
  point: Point;
  width: number;
  height: number;
  leg?: boolean;
  white?: boolean;
}) {
  const visible = useAnimatedStyle(() => ({ opacity: pose.get()[angle] === 0 ? 0 : 1 }));
  const box: Box = [
    point[0] - width / 2,
    point[1] - height / 2,
    point[0] + width / 2,
    point[1] + height / 2,
  ];
  return (
    <Animated.View style={[styles.canvas, visible]}>
      <AuxiliaryPart
        name={white ? 'white-left' : leg ? 'skin-cap-leg' : 'skin-cap-arm'}
        box={box}
      />
    </Animated.View>
  );
}

function fillWeight(pose: AmiOriginalPose) {
  'worklet';
  return Math.min(
    1,
    (Math.abs(pose.headAngle) +
      Math.abs(pose.hairAngle) +
      Math.abs(pose.leftArm) +
      Math.abs(pose.rightArm) +
      Math.abs(pose.leftElbow) +
      Math.abs(pose.rightElbow)) /
      8,
  );
}
function faceFillWeight(pose: AmiOriginalPose) {
  'worklet';
  return pose.eyesOpen < 1 ||
    pose.mouthOpen > 0 ||
    pose.sad > 0 ||
    pose.browLeft !== 0 ||
    pose.browRight !== 0
    ? 1
    : 0;
}
function pivot(point: Point): ViewStyle {
  return { transformOrigin: [point[0], point[1], 0] };
}
function CanonicalPart({ name }: { name: CanonicalOriginalPart }) {
  return <Texture source={art[name]} box={geometry.canonicalBoxes[name]} />;
}
function CompletionPart({ name }: { name: CompletionOriginalPart }) {
  return <Texture source={completion[name]} box={geometry.completionBoxes[name]} />;
}
function AuxiliaryPart({ name, box }: { name: AuxiliaryOriginalPart; box: Box }) {
  return <Texture source={auxiliary[name]} box={box} />;
}
function Texture({ source, box }: { source: number; box: Box }) {
  return (
    <Image
      source={source}
      transition={0}
      contentFit="fill"
      loading="eager"
      style={{
        position: 'absolute',
        left: box[0],
        top: box[1],
        width: box[2] - box[0],
        height: box[3] - box[1],
      }}
    />
  );
}
// Every coordinate is intrinsic portrait artwork geometry, not layout spacing or a new design token.
const styles = StyleSheet.create({
  canvas: { position: 'absolute', left: 0, top: 0, width: geometry.width, height: geometry.height },
});
