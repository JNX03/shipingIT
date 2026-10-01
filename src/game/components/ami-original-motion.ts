import type { GameMotion } from '../avatar-motion';
export type { GameMotion } from '../avatar-motion';

/**
 * Local joint angles in degrees; translations use the canonical 512×768 source pixels.
 * Every neutral angle is zero: the original diagonally outward limbs remain intrinsic
 * to the raster parts, rather than being normalized to a new vertical skeleton.
 */
export interface AmiOriginalPose {
  bodyY: number;
  bodyAngle: number;
  headY: number;
  headAngle: number;
  leftArm: number;
  rightArm: number;
  leftElbow: number;
  rightElbow: number;
  leftWrist: number;
  rightWrist: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftFoot: number;
  rightFoot: number;
  hairAngle: number;
  eyesOpen: number;
  pupilsX: number;
  pupilsY: number;
  mouthOpen: number;
  mouthScale: number;
  browLeft: number;
  browRight: number;
  sad: 0 | 1;
}

function phase(milliseconds: number, period: number) {
  'worklet';
  return ((milliseconds % period) / period) * Math.PI * 2;
}

function smooth(value: number) {
  'worklet';
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function pulse(time: number, start: number, crest: number, release: number, end: number) {
  'worklet';
  if (time <= start || time >= end) return 0;
  if (time < crest) return smooth((time - start) / (crest - start));
  if (time <= release) return 1;
  return 1 - smooth((time - release) / (end - release));
}

/** Solve the literal original upper-arm and elbow-to-palm vectors, with an outward elbow. */
export function originalClapArm(left: boolean, targetX: number, targetY: number) {
  'worklet';
  const dx = targetX - (left ? 212 : 312), dy = targetY - 394;
  const ux = left ? -33 : 18, uy = left ? 67 : 69;
  const lx = left ? -22 : 27, ly = left ? 48 : 44;
  const upper = Math.hypot(ux, uy), lower = Math.hypot(lx, ly);
  const bend = (left ? -1 : 1) * Math.acos(Math.max(-1, Math.min(1,
    (dx * dx + dy * dy - upper * upper - lower * lower) / (2 * upper * lower))));
  const angle = Math.atan2(dy, dx) - Math.atan2(lower * Math.sin(bend), upper + lower * Math.cos(bend));
  return {
    shoulder: (angle - Math.atan2(uy, ux)) * 180 / Math.PI,
    elbow: (bend - (Math.atan2(ly, lx) - Math.atan2(uy, ux))) * 180 / Math.PI,
  };
}

/**
 * Pure seekable worklet. Pass reduced || !active from the renderer to stop all
 * temporal variation while keeping the selected motion's readable semantic pose.
 * Render the portrait with one uniform size/768 scale, never separate X/Y scales.
 */
export function sampleAmiOriginalPose(
  milliseconds: number,
  motion: GameMotion,
  reduced = false,
): AmiOriginalPose {
  'worklet';
  const moving = !reduced && motion !== 'still';
  const time = moving && Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : 0;
  const pose: AmiOriginalPose = {
    bodyY: 0,
    bodyAngle: 0,
    headY: 0,
    headAngle: 0,
    leftArm: 0,
    rightArm: 0,
    leftElbow: 0,
    rightElbow: 0,
    leftWrist: 0,
    rightWrist: 0,
    leftHip: 0,
    rightHip: 0,
    leftKnee: 0,
    rightKnee: 0,
    leftFoot: 0,
    rightFoot: 0,
    hairAngle: 0,
    eyesOpen: 1,
    pupilsX: 0,
    pupilsY: 0,
    mouthOpen: 0,
    mouthScale: 1,
    browLeft: 0,
    browRight: 0,
    sad: 0,
  };

  if (motion === 'talk' || motion === 'explain') {
    pose.leftArm = 8;
    pose.rightArm = -26;
    pose.leftElbow = -9;
    pose.rightElbow = -44;
    pose.rightWrist = 6;
    pose.mouthOpen = 0.34;
    pose.mouthScale = 0.9;
    pose.browLeft = -3;
    pose.browRight = 3;
  } else if (motion === 'walk') {
    // The static walking cue keeps the canonical leg/shoe stance intact.
    pose.leftArm = 3;
    pose.rightArm = -3;
  } else if (motion === 'thinking' || motion === 'inspect') {
    pose.headAngle = -5;
    pose.headY = -2;
    // Canonical chain: shoulder(312,394), elbow(330,463), wrist(344,491),
    // hand center(357,507). These local angles place the hand near(262,335).
    pose.rightArm = 114;
    pose.rightElbow = 121;
    pose.rightWrist = 0;
    pose.leftArm = 2;
    pose.leftElbow = -3;
    pose.pupilsX = 4.2;
    pose.pupilsY = -5.4;
    pose.browLeft = -7;
    pose.browRight = 2;
  } else if (motion === 'celebrate') {
    pose.leftArm = 125;
    pose.rightArm = -125;
    pose.leftElbow = -16;
    pose.rightElbow = 16;
    pose.leftWrist = -10;
    pose.rightWrist = 10;
    pose.pupilsY = -2;
    pose.mouthOpen = 0.9;
    pose.browLeft = -5;
    pose.browRight = 5;
  } else if (motion === 'disappointed') {
    pose.bodyY = 7.2;
    pose.bodyAngle = 2;
    pose.headY = 7;
    pose.headAngle = 4.5;
    pose.leftArm = -2;
    pose.rightArm = 2;
    pose.leftWrist = 3;
    pose.rightWrist = -3;
    pose.pupilsY = 5.5;
    pose.browLeft = -10;
    pose.browRight = 10;
    pose.sad = 1;
  }

  if (!moving) return pose;

  const breath = Math.sin(phase(time, 3000));
  pose.bodyY -= breath * 2;
  pose.headY -= breath * 0.55;
  pose.headAngle += Math.sin(phase(time, 4600)) * 0.7;
  pose.hairAngle = Math.sin(phase(time, 3100)) * 1.1;
  pose.pupilsX += Math.sin(phase(time, 8200)) * 2.2;
  // Smooth 180 ms blink: 60 ms close, 24 ms closed, 96 ms reopen.
  pose.eyesOpen = 1 - pulse(time % 4300, 3940, 4000, 4024, 4120);

  if (motion === 'walk') {
    const gaitPhase = phase(time, 720);
    const stride = Math.sin(gaitPhase);
    const kneePhase = Math.sin(gaitPhase + Math.PI / 5);
    const leftLift = Math.max(0, -kneePhase);
    const rightLift = Math.max(0, kneePhase);
    pose.bodyY = (-5.5 * (1 - Math.cos(gaitPhase * 2))) / 2;
    pose.bodyAngle = stride * 1.2;
    pose.headAngle = Math.sin(gaitPhase - 0.3) * 1.1;
    pose.headY = -Math.sin(gaitPhase * 2 - 0.3) * 0.8;
    pose.leftHip = stride * 5;
    pose.rightHip = -stride * 5;
    pose.leftKnee = leftLift * leftLift * 10;
    pose.rightKnee = rightLift * rightLift * 10;
    pose.leftFoot = -pose.leftHip - pose.leftKnee * 0.55 + leftLift * 1.8;
    pose.rightFoot = -pose.rightHip - pose.rightKnee * 0.55 + rightLift * 1.8;
    pose.leftArm = -stride * 16;
    pose.rightArm = stride * 16;
    pose.leftElbow = -Math.max(0, stride) * 9;
    pose.rightElbow = Math.max(0, -stride) * 9;
    pose.leftWrist = Math.sin(gaitPhase - 0.6) * 5;
    pose.rightWrist = -Math.sin(gaitPhase - 0.6) * 5;
    pose.hairAngle = Math.sin(gaitPhase - 0.65) * 2.8;
    pose.pupilsX = 2;
  } else if (motion === 'talk' || motion === 'explain') {
    const sentence = time % 980;
    const syllable = Math.max(
      pulse(sentence, 40, 90, 140, 180),
      pulse(sentence, 260, 315, 360, 415),
      pulse(sentence, 560, 620, 680, 755),
    );
    pose.bodyAngle = Math.sin(phase(time, 2000)) * 0.4;
    pose.headAngle = Math.sin(phase(time, 1540)) * 2;
    pose.headY = -Math.abs(Math.sin(phase(time, 1540))) * 1.8;
    pose.leftArm += Math.sin(phase(time, 2300)) * 4;
    pose.rightArm += Math.sin(phase(time, 1450)) * 8;
    pose.leftElbow += Math.sin(phase(time, 1540)) * 6;
    pose.rightElbow += Math.sin(phase(time, 920)) * 11;
    pose.leftWrist += Math.sin(phase(time, 1800)) * 6;
    pose.rightWrist += Math.sin(phase(time, 740)) * 10;
    pose.mouthOpen = syllable * 0.92;
    pose.mouthScale = 0.84 + Math.abs(Math.sin(phase(time, 310))) * 0.16;
    pose.browLeft -= syllable * 2;
    pose.browRight += Math.sin(phase(time, 1900)) * 2;
    const alternate = Math.sin(phase(time, 3600));
    pose.leftElbow -= Math.max(0, alternate) * 20;
    pose.rightElbow -= Math.max(0, -alternate) * 12;
  } else if (motion === 'thinking') {
    const ponder = Math.sin(phase(time, 3600));
    pose.headAngle += ponder * 0.8;
    pose.rightArm += ponder * 0.7;
    pose.rightElbow += Math.sin(phase(time, 4700)) * 0.9;
    pose.rightWrist += Math.sin(phase(time, 2200)) * 1.2;
    pose.pupilsY -= Math.max(0, ponder) * 1.2;
    pose.browLeft -= Math.max(0, ponder) * 1.5;
  } else if (motion === 'celebrate') {
    const cycle = time % 2600;
    const lift = pulse(cycle, 180, 580, 1020, 1580);
    const anticipation = pulse(cycle, 0, 90, 160, 320);
    const wave = Math.sin(phase(time, 520));
    pose.bodyY = anticipation * 4 - lift * 12;
    pose.bodyAngle = Math.sin(phase(time, 2600)) * lift * 1.2;
    pose.headY = -lift * 2.4;
    pose.headAngle = Math.sin(phase(time, 1300)) * lift * 1.5;
    pose.leftArm = lift * (125 + wave * 3);
    pose.rightArm = lift * (-125 + wave * 3);
    pose.leftElbow = lift * (-16 + Math.sin(phase(time, 650)) * 3);
    pose.rightElbow = lift * (16 + Math.sin(phase(time, 650)) * 3);
    pose.leftWrist = lift * (-10 + wave * 5);
    pose.rightWrist = lift * (10 - wave * 5);
    pose.leftKnee = anticipation * 3;
    pose.rightKnee = anticipation * 3;
    pose.hairAngle = -Math.sin(phase(time, 1300) - 0.4) * lift * 3.5;
    pose.mouthOpen = 0.58 + lift * 0.34;
    pose.mouthScale = 0.94 + lift * 0.06;
  } else if (motion === 'disappointed') {
    pose.bodyY += Math.sin(phase(time, 5200)) * 0.6;
    pose.headAngle += Math.sin(phase(time, 6200)) * 0.35;
    pose.leftWrist += breath;
    pose.rightWrist -= breath;
    pose.hairAngle *= 0.35;
    pose.pupilsX *= 0.35;
  } else {
    // Every sine starts at zero, preserving the exact original source pose at idle0.
    pose.bodyAngle = Math.sin(phase(time, 4800)) * 0.2;
    pose.leftArm = breath * 0.8;
    pose.rightArm = -breath * 0.8;
    pose.leftElbow = Math.sin(phase(time, 4400)) * 0.6;
    pose.rightElbow = -Math.sin(phase(time, 4400)) * 0.6;
    pose.leftWrist = Math.sin(phase(time, 4100)) * 1.1;
    pose.rightWrist = -Math.sin(phase(time, 4100)) * 1.1;
  }

  if (motion === 'greet' || motion === 'wave') {
    const lift = pulse(time, 0, 450, 1800, 2500);
    pose.rightArm = -lift * 120;
    pose.rightElbow = lift * 25;
    pose.rightWrist = lift * Math.sin(phase(time - 450, 420)) * 22;
    pose.leftArm = motion === 'greet' ? lift * 16 : 0;
    pose.headAngle = -lift * 3; pose.pupilsX = lift * 3;
    pose.mouthOpen = motion === 'greet' ? lift * 0.35 : 0;
    pose.browLeft = -lift * 3; pose.browRight = lift * 3;
  } else if (motion === 'point') {
    const lift = pulse(time, 0, 420, 1900, 2650);
    pose.rightArm = -lift * 70; pose.rightElbow = -lift * 18;
    pose.rightWrist = -lift * 8; pose.pupilsX = lift * 5;
    pose.headAngle = -lift * 4; pose.mouthOpen = lift * 0.3;
  } else if (motion === 'inspect') {
    pose.leftElbow = -18; pose.headAngle = -7 + Math.sin(phase(time, 4000));
    pose.pupilsX = Math.sin(phase(time, 3100)) * 4;
    pose.rightWrist = Math.sin(phase(time, 3600)) * 1.2;
    pose.browLeft = -8; pose.browRight = 4;
  } else if (motion === 'listen') {
    const nod = pulse(time, 500, 730, 850, 1150) + pulse(time, 2200, 2450, 2520, 2800);
    pose.headAngle = nod * 4; pose.headY = nod * 1.6;
    pose.pupilsX = -3; pose.mouthOpen = 0;
    pose.leftArm = 0; pose.rightArm = 0;
  } else if (motion === 'react') {
    const surprise = pulse(time, 0, 220, 700, 1450);
    pose.headAngle = -surprise * 6; pose.headY = -surprise * 3;
    pose.rightArm = surprise * 16; pose.rightElbow = surprise * 100;
    pose.browLeft = -surprise * 10; pose.browRight = surprise * 10;
    pose.mouthOpen = surprise * 0.82; pose.pupilsY = -surprise * 2;
  } else if (motion === 'clap' || motion === 'celebrate') {
    const lift = pulse(time, 0, 480, 1850, 2400);
    const contact = (1 + Math.cos(phase(time - 600, 320))) / 2;
    const spread = (1 - contact) * 16;
    const left = originalClapArm(true, 243 - spread, 429);
    const right = originalClapArm(false, 281 + spread, 429);
    pose.leftArm = left.shoulder * lift; pose.leftElbow = left.elbow * lift;
    pose.rightArm = right.shoulder * lift; pose.rightElbow = right.elbow * lift;
    pose.leftWrist = 0; pose.rightWrist = 0;
    pose.bodyY = -lift * 2; pose.bodyAngle = 0;
    pose.headY = -lift; pose.headAngle = Math.sin(phase(time, 1300)) * lift * 1.5;
    pose.leftKnee = 0; pose.rightKnee = 0;
    pose.hairAngle *= lift;
    pose.mouthOpen = lift * (motion === 'celebrate' ? 0.72 : 0.2);
    pose.browLeft = -lift * 5; pose.browRight = lift * 5;
    if (motion === 'celebrate') {
      const cheer = pulse(time, 2450, 2750, 3000, 3450);
      pose.leftArm += cheer * 125; pose.rightArm -= cheer * 125;
      pose.leftElbow -= cheer * 16; pose.rightElbow += cheer * 16;
      pose.leftWrist -= cheer * 10; pose.rightWrist += cheer * 10;
      pose.bodyY -= cheer * 8; pose.mouthOpen += cheer * 0.85;
    }
  }

  return pose;
}
