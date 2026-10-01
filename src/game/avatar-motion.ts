export type GameMotion = 'idle' | 'talk' | 'walk' | 'still' | 'thinking' | 'celebrate' | 'disappointed'
  | 'greet' | 'wave' | 'inspect' | 'explain' | 'point' | 'listen' | 'react' | 'clap';
export type AvatarFacing = 'front' | 'back' | 'left' | 'right';

/** Shared by the UI worklet and deterministic pose tests. Units are degrees and base-canvas pixels. */
export function sampleAvatarPose(milliseconds: number, motion: GameMotion, reduced = false) {
  'worklet';
  const still = reduced || motion === 'still';
  const time = still || !Number.isFinite(milliseconds) ? 0 : Math.max(0, milliseconds);
  const walk = motion === 'walk' && !still;
  const talk = (motion === 'talk' || motion === 'explain') && !still;
  const cheer = motion === 'celebrate';
  const think = motion === 'thinking' || motion === 'inspect';
  const sad = motion === 'disappointed';
  const stride = Math.sin((time / 680) * Math.PI * 2);
  const breath = Math.sin((time / 2800) * Math.PI * 2);
  const gesture = Math.sin((time / 1100) * Math.PI * 2);
  const blinkAt = time % 4300;
  const blinking = !still && blinkAt > 3900 && blinkAt < 4060;
  const syllable = time % 920;
  const speakingOpen = talk && ((syllable > 50 && syllable < 170) || (syllable > 245 && syllable < 410) || (syllable > 530 && syllable < 690));
  const pose = {
    torsoY: still ? 0 : walk ? -Math.abs(stride) * 2 : cheer ? -Math.abs(gesture) * 3 : -breath * 0.7,
    torsoAngle: sad ? 3 : walk ? stride * 2 : 0,
    headY: 0,
    headAngle: sad ? 7 : think ? -6 : talk ? gesture * 3 : still ? 0 : breath * 1.1,
    leftArm: cheer ? 142 + (still ? 0 : gesture * 9) : walk ? 12 - stride * 24 : talk ? 16 : sad ? 8 : 16 + (still ? 0 : breath * 2),
    rightArm: cheer ? -142 - (still ? 0 : gesture * 9) : think ? 28 : walk ? -12 + stride * 16 : talk ? -35 + gesture * 12 : sad ? -8 : -16 - (still ? 0 : breath * 2),
    leftElbow: cheer ? -24 : walk ? -12 - Math.max(0, stride) * 20 : talk ? -15 : -5,
    rightElbow: cheer ? 24 : think ? 130 : walk ? 12 + Math.max(0, -stride) * 12 : talk ? -25 + gesture * 8 : 5,
    leftWrist: 0,
    rightWrist: 0,
    leftHip: walk ? stride * 5 : 0,
    rightHip: walk ? -stride * 5 : 0,
    leftKnee: walk ? Math.max(0, -stride) ** 2 * 8 : 0,
    rightKnee: walk ? Math.max(0, stride) ** 2 * 8 : 0,
    leftFoot: 0,
    rightFoot: 0,
    eyesOpen: blinking ? 0 : 1,
    pupilsX: think ? 2 : walk ? 1.5 : still ? 0 : Math.sin(time / 2100) * 1.3,
    pupilsY: think ? -3 : sad ? 3 : 0,
    mouthOpen: speakingOpen ? 0.9 : 0,
    mouthScale: talk ? 0.8 + Math.abs(gesture) * 0.2 : 1,
    sad: sad ? 1 : 0,
  };
  pose.leftFoot = -pose.leftHip - pose.leftKnee * 0.6;
  pose.rightFoot = -pose.rightHip - pose.rightKnee * 0.6;
  const envelope = (start: number, rise: number, fall: number, end: number) => {
    'worklet';
    const x = time <= start || time >= end ? 0 : time < rise ? (time - start) / (rise - start) : time > fall ? (end - time) / (end - fall) : 1;
    return x * x * (3 - 2 * x);
  };
  if (motion === 'greet' || motion === 'wave') {
    const lift = still ? 1 : envelope(0, 450, 1800, 2500);
    pose.rightArm = -lift * 145; pose.rightElbow = lift * 35;
    pose.rightWrist = lift * Math.sin(time / 95) * 22;
    pose.leftArm = motion === 'greet' ? lift * 25 : 16;
    pose.headAngle = lift * -3; pose.pupilsX = lift * 1.5;
    pose.mouthOpen = motion === 'greet' ? lift * 0.35 : 0;
  } else if (motion === 'point') {
    const lift = still ? 1 : envelope(0, 420, 1900, 2650);
    pose.rightArm = -lift * 76; pose.rightElbow = -lift * 12;
    pose.rightWrist = -lift * 6; pose.pupilsX = lift * 3;
    pose.headAngle = -lift * 4; pose.mouthOpen = lift * (speakingOpen ? 0.7 : 0.25);
  } else if (motion === 'inspect') {
    pose.leftElbow = -25; pose.headAngle = -7 + (still ? 0 : Math.sin(time / 800));
    pose.pupilsX = still ? 1 : Math.sin(time / 650) * 2;
    pose.rightWrist = still ? 0 : Math.sin(time / 1300) * 3;
  } else if (motion === 'listen') {
    const nod = still ? 0 : envelope(500, 730, 850, 1150) + envelope(2200, 2450, 2520, 2800);
    pose.headAngle = nod * 4; pose.headY = nod * 1.2; pose.pupilsX = -1.5;
    pose.mouthOpen = 0; pose.leftArm = 10; pose.rightArm = -10;
  } else if (motion === 'react') {
    const surprise = still ? 1 : envelope(0, 220, 700, 1450);
    pose.headAngle = -surprise * 6; pose.headY = -surprise * 2;
    pose.rightArm = surprise * 18; pose.rightElbow = surprise * 105;
    pose.mouthOpen = surprise * 0.8; pose.pupilsY = -surprise;
  } else if (motion === 'clap' || cheer) {
    const lift = still ? 1 : envelope(0, 480, 1850, 2400);
    const contact = still ? 1 : (1 + Math.cos((time - 600) / 320 * Math.PI * 2)) / 2;
    const spread = 7 * (1 - contact);
    // Actual shoulder-to-elbow (25px) and elbow-to-cropped-palm (18px) links.
    const dx = 16 - spread, dy = 27;
    const bend = Math.acos(Math.max(-1, Math.min(1, (dx * dx + dy * dy - 625 - 324) / 900)));
    const shoulder = Math.atan2(dy, dx) + Math.atan2(18 * Math.sin(bend), 25 + 18 * Math.cos(bend)) - Math.PI / 2;
    pose.leftArm = shoulder * 180 / Math.PI * lift;
    pose.rightArm = -pose.leftArm;
    pose.leftElbow = -bend * 180 / Math.PI * lift; pose.rightElbow = -pose.leftElbow;
    pose.leftWrist = -lift * 5; pose.rightWrist = lift * 5;
    pose.torsoY = -lift * 1.5; pose.headAngle = lift * Math.sin(time / 380) * 1.5;
    pose.mouthOpen = cheer ? lift * 0.65 : lift * 0.2;
  } else if (talk) {
    const alternate = Math.sin(time / 850);
    pose.leftElbow = -18 - Math.max(0, alternate) * 25;
    pose.rightElbow = -28 - Math.max(0, -alternate) * 20;
    pose.leftWrist = alternate * 8; pose.rightWrist = -alternate * 10;
  }
  return pose;
}
