import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleAvatarPose } from './avatar-motion';
import { PATH_FRIEND_MOTION_MS, pathFriendResponse } from './path-friend';

test('tapping a path character offers distinct short greet, wave, and clap responses', () => {
  for (let unit = 1; unit <= 8; unit++) {
    const turns = [0, 1, 2].map((turn) => pathFriendResponse(unit, turn));
    assert.deepEqual(
      turns.map((turn) => turn.motion),
      ['greet', 'wave', 'clap'],
    );
    assert.ok(turns.every((turn) => turn.message.length > 0 && turn.message.length <= 90));
    assert.deepEqual(pathFriendResponse(unit, 3), turns[0]);
    const poses = turns.map((turn) => sampleAvatarPose(850, turn.motion));
    assert.equal(new Set(poses.map((pose) => JSON.stringify(pose))).size, 3);
  }
  assert.ok(PATH_FRIEND_MOTION_MS <= 3000);
});

test('a reduced-motion character still has a readable touch response and a finite resting pose', () => {
  const response = pathFriendResponse(1, 0);
  assert.match(response.message, /Hi!/);
  const pose = sampleAvatarPose(850, response.motion, true);
  assert.ok(Object.values(pose).every(Number.isFinite));
  assert.equal(pose.eyesOpen, 1);
});
