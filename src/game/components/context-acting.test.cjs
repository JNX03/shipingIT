/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports });
  return module.exports;
}
const { createActorActivity, actorMayRun, actorMotionPriority } = load('../actor-activity.ts');
const { sampleAmiOriginalPose: ami } = load('./ami-original-motion.ts');
const { sampleAvatarPose: player } = load('../avatar-motion.ts');
const rotate = (x, y, deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };

test('a higher-priority actor stops the old clock before starting; repeated requests do not jitter', () => {
  const activity = createActorActivity(), events = [], live = new Set();
  for (const id of ['mentor', 'player', 'npc']) activity.subscribe(id, running => {
    events.push(`${id}:${running}`); if (running) live.add(id); else live.delete(id);
    assert.ok(live.size <= 1);
  });
  activity.request('mentor', true, actorMotionPriority('idle'));
  activity.request('npc', true, actorMotionPriority('idle'));
  activity.request('player', true, actorMotionPriority('walk'));
  const before = events.length;
  activity.request('npc', true, actorMotionPriority('idle'));
  activity.request('player', true, actorMotionPriority('walk'));
  assert.equal(events.length, before); assert.equal(activity.owner, 'player');
  activity.release('player'); assert.equal(activity.owner, 'npc');
  activity.request('npc', false, 1); assert.equal(activity.owner, 'mentor');
  assert.ok(events.indexOf('npc:false', 3) < events.indexOf('player:true'));
});

test('inactive, reduced motion, route/Android blur, background and hidden pages cannot own a clock', () => {
  const state = { active: true, reduced: false, motion: 'talk', foreground: true, focused: true, visible: true };
  assert.equal(actorMayRun(state), true);
  for (const key of ['active', 'foreground', 'focused', 'visible']) assert.equal(actorMayRun({ ...state, [key]: false }), false);
  assert.equal(actorMayRun({ ...state, reduced: true }), false);
  assert.equal(actorMayRun({ ...state, motion: 'still' }), false);
});

test('each context has a distinct combination of limbs, gaze, head and mouth in both rigs', () => {
  for (const sample of [ami, player]) {
    const signatures = ['greet', 'wave', 'inspect', 'explain', 'point', 'listen', 'react', 'clap'].map(motion => {
      const p = sample(600, motion);
      return ['leftArm', 'rightArm', 'rightElbow', 'rightWrist', 'headAngle', 'pupilsX', 'mouthOpen'].map(key => p[key].toFixed(2)).join(',');
    });
    assert.equal(new Set(signatures).size, signatures.length);
    assert.equal(sample(730, 'listen').mouthOpen, 0);
    assert.ok(sample(730, 'listen').headAngle > 3);
    assert.equal(Math.abs(sample(3000, 'wave').rightArm), 0);
    assert.equal(sample(2000, 'react').mouthOpen, 0);
  }
});

test('original clapping palms meet below the face without crossing and separate between claps', () => {
  const hand = (p, left) => {
    const arm = left ? p.leftArm : p.rightArm, elbow = left ? p.leftElbow : p.rightElbow;
    const upper = rotate(left ? -33 : 18, left ? 67 : 69, arm);
    const lower = rotate(left ? -22 : 27, left ? 48 : 44, arm + elbow);
    return [(left ? 212 : 312) + upper[0] + lower[0], 394 + upper[1] + lower[1]];
  };
  for (let t = 480; t <= 1850; t += 10) {
    const p = ami(t, 'clap'), l = hand(p, true), r = hand(p, false);
    assert.ok(l[0] < r[0]); assert.ok(l[1] > 405 && r[1] > 405);
    assert.ok(r[0] - l[0] >= 37.9 && r[0] - l[0] <= 70.1);
  }
  const closed = ami(600, 'clap'), open = ami(760, 'clap');
  assert.ok(hand(open, false)[0] - hand(open, true)[0] > hand(closed, false)[0] - hand(closed, true)[0] + 30);
});

test('generic shoes retain frontal clearance with ankle counter-rotation over an entire gait', () => {
  const shoeX = (p, left) => {
    const hip = left ? p.leftHip : p.rightHip, knee = left ? p.leftKnee : p.rightKnee, foot = left ? p.leftFoot : p.rightFoot;
    return (left ? 105 : 134) + rotate(0, 22, hip)[0] + rotate(0, 16, hip + knee)[0] + rotate(0, 10, hip + knee + foot)[0];
  };
  for (let t = 0; t < 680; t++) {
    const p = player(t, 'walk'); assert.ok(shoeX(p, false) - shoeX(p, true) >= 24, `shoe clipping at ${t}`);
  }
});

test('generic clap uses the cropped palm geometry and approaches without crossing', () => {
  const palmX = (p, left) => (left ? 98 : 142)
    + rotate(0, 25, left ? p.leftArm : p.rightArm)[0]
    + rotate(0, 18, (left ? p.leftArm + p.leftElbow : p.rightArm + p.rightElbow))[0];
  for (let t = 480; t <= 1850; t += 10) {
    const p = player(t, 'clap'), gap = palmX(p, false) - palmX(p, true);
    assert.ok(gap >= 11.9 && gap <= 26.1);
  }
  const closed = player(600, 'clap');
  assert.ok(Math.abs(palmX(closed, false) - palmX(closed, true) - 12) < 0.01);
});

test('all generic new motions sanitize extreme clocks and remain bounded; reduced poses are static', () => {
  for (const motion of ['idle', 'talk', 'walk', 'still', 'thinking', 'celebrate', 'disappointed', 'greet', 'wave', 'inspect', 'explain', 'point', 'listen', 'react', 'clap']) {
    for (const time of [NaN, Infinity, -100]) assert.deepEqual(player(time, motion), player(0, motion));
    for (let t = 0; t <= 9000; t += 13) for (const value of Object.values(player(t, motion))) assert.ok(Number.isFinite(value) && Math.abs(value) <= 180);
    assert.deepEqual(player(500, motion, true), player(9000, motion, true));
  }
});
