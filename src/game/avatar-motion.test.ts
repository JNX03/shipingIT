import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleAvatarPose, type GameMotion } from './avatar-motion';

test('walking counter swings the hips and shoulders and flexes alternating knees', () => {
  const first = sampleAvatarPose(170, 'walk');
  const second = sampleAvatarPose(510, 'walk');
  assert.ok(first.leftHip > 4 && first.rightHip < -4);
  assert.ok(second.leftHip < -4 && second.rightHip > 4);
  assert.ok(first.leftArm < 0 && first.rightArm > 0);
  assert.ok(second.leftArm > 25 && second.rightArm < -25);
  assert.ok(first.rightKnee > 7 && first.leftKnee === 0);
  assert.ok(second.leftKnee > 7 && second.rightKnee === 0);
});

test('speech opens and closes its mouth while the head and hand gesture independently', () => {
  const open = sampleAvatarPose(100, 'talk');
  const closed = sampleAvatarPose(220, 'talk');
  assert.equal(open.mouthOpen, 0.9);
  assert.equal(closed.mouthOpen, 0);
  assert.notEqual(open.rightArm, closed.rightArm);
  assert.notEqual(open.headAngle, closed.headAngle);
});

test('blink is brief and emotion changes survive reduced motion without movement', () => {
  assert.equal(sampleAvatarPose(3800, 'idle').eyesOpen, 1);
  assert.equal(sampleAvatarPose(3980, 'idle').eyesOpen, 0);
  assert.equal(sampleAvatarPose(4100, 'idle').eyesOpen, 1);
  for (const motion of ['idle', 'talk', 'walk', 'still', 'thinking', 'celebrate', 'disappointed'] satisfies GameMotion[]) {
    assert.deepEqual(sampleAvatarPose(0, motion, true), sampleAvatarPose(7200, motion, true));
  }
  assert.equal(sampleAvatarPose(500, 'celebrate', true).mouthOpen, 0.65);
  assert.equal(sampleAvatarPose(500, 'disappointed', true).sad, 1);
});
