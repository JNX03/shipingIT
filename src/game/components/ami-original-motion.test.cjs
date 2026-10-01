/* Draft tests run directly without adding any .ts files to the frozen app:
 * node --test art/source/ami-original-v4/ami-original-motion.test.ts.txt
 */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = require.resolve('./ami-original-motion.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const virtualPath = sourcePath;
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true },
  fileName: virtualPath,
  reportDiagnostics: true,
});
assert.equal(
  (compiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error)
    .length,
  0,
);
const moduleRecord = { exports: {} };
vm.runInNewContext(
  compiled.outputText,
  { module: moduleRecord, exports: moduleRecord.exports },
  { filename: virtualPath },
);
const { sampleAmiOriginalPose: sample } = moduleRecord.exports;
const motions = ['idle', 'talk', 'walk', 'still', 'thinking', 'celebrate', 'disappointed', 'greet', 'wave', 'inspect', 'explain', 'point', 'listen', 'react', 'clap'];
const angleKeys = [
  'bodyAngle',
  'headAngle',
  'leftArm',
  'rightArm',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftFoot',
  'rightFoot',
  'hairAngle',
  'browLeft',
  'browRight',
];
const rotate = (x, y, degrees) => {
  const angle = (degrees * Math.PI) / 180;
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
};

test('still and idle0 preserve every original joint and the canonical face exactly', () => {
  for (const pose of [
    sample(0, 'idle'),
    sample(0, 'still'),
    sample(9013, 'still'),
    sample(9013, 'idle', true),
  ]) {
    for (const key of angleKeys)
      assert.equal(Math.abs(pose[key]), 0, `${key} changed original neutral geometry`);
    for (const key of ['bodyY', 'headY', 'pupilsX', 'pupilsY', 'mouthOpen', 'sad'])
      assert.equal(Math.abs(pose[key]), 0);
    assert.equal(pose.eyesOpen, 1);
    assert.equal(pose.mouthScale, 1);
  }
});

test('all motions stay finite and bounded through repeated loops and extreme clocks', () => {
  const times = [NaN, Infinity, -Infinity, -100, Number.MAX_VALUE];
  for (let time = 0; time <= 24000; time += 37) times.push(time);
  for (const motion of motions) {
    for (const time of times) {
      const pose = sample(time, motion);
      for (const [key, value] of Object.entries(pose)) {
        assert.ok(Number.isFinite(value), `${motion}.${key} at ${time} is not finite`);
        assert.ok(Math.abs(value) <= 180, `${motion}.${key} exceeded local joint range`);
      }
      assert.ok(pose.eyesOpen >= 0 && pose.eyesOpen <= 1);
      assert.ok(pose.mouthOpen >= 0 && pose.mouthOpen <= 1);
      assert.ok(pose.mouthScale >= 0.8 && pose.mouthScale <= 1);
      assert.ok(Math.abs(pose.bodyY) <= 12 && Math.abs(pose.headY) <= 8);
      assert.ok(Math.abs(pose.pupilsX) < 7 && Math.abs(pose.pupilsY) < 8);
    }
  }
});

test('nonfinite and negative clocks sanitize to each motion initial pose', () => {
  for (const motion of motions) {
    const initial = sample(0, motion);
    for (const time of [NaN, Infinity, -Infinity, -1, -9000])
      assert.deepEqual(sample(time, motion), initial);
  }
});

test('reduced / inactive poses freeze all joints and expressions while retaining state meaning', () => {
  for (const motion of motions) {
    const frozen = sample(0, motion, true);
    for (const time of [100, 720, 4000, 75000, NaN, Infinity])
      assert.deepEqual(sample(time, motion, true), frozen);
  }
  assert.deepEqual(sample(0, 'still'), sample(9013, 'still'));
  assert.ok(sample(0, 'talk', true).mouthOpen > 0);
  assert.ok(sample(0, 'celebrate', true).leftArm > 100);
  assert.equal(sample(0, 'disappointed', true).sad, 1);
  assert.ok(sample(0, 'thinking', true).pupilsY < 0);
});

test('walking uses small opposing hips with independently phased knees, arms and wrists', () => {
  const first = sample(180, 'walk');
  const second = sample(540, 'walk');
  assert.equal(first.leftHip, -first.rightHip);
  assert.equal(second.leftHip, -second.rightHip);
  assert.ok(first.leftHip >= 4 && first.leftHip <= 6);
  assert.ok(second.leftHip <= -4 && second.leftHip >= -6);
  assert.ok(first.leftArm < -10 && first.rightArm > 10);
  assert.ok(second.leftArm > 10 && second.rightArm < -10);
  assert.ok(first.rightKnee > 5 && first.rightKnee <= 12 && first.leftKnee === 0);
  assert.ok(second.leftKnee > 5 && second.leftKnee <= 12 && second.rightKnee === 0);
  const kneePeak = sample(108, 'walk');
  assert.ok(kneePeak.rightKnee > first.rightKnee);
  assert.ok(kneePeak.leftHip < first.leftHip);
  assert.notEqual(first.rightFoot, first.rightHip);
  assert.notEqual(first.leftWrist, first.leftElbow);
  assert.notEqual(first.hairAngle, first.headAngle);
});

test('canonical shoe centers never cross and keep stance clearance through the full frontal gait', () => {
  // Original vectors supplied by the canonical-partition agent. No widened or
  // synthetic hip positions: neutral centers stay exactly L(209,704), R(312,704).
  const center = (hipX, thigh, shin, shoe, hip, knee, foot) =>
    hipX +
    rotate(...thigh, hip)[0] +
    rotate(...shin, hip + knee)[0] +
    rotate(...shoe, hip + knee + foot)[0];
  let minimumSeparation = Infinity;
  for (let time = 0; time <= 720; time += 0.5) {
    const pose = sample(time, 'walk');
    const left = center(
      224,
      [-2, 42],
      [-5, 84],
      [-8, 30],
      pose.leftHip,
      pose.leftKnee,
      pose.leftFoot,
    );
    const right = center(
      286,
      [5, 40],
      [5, 85],
      [16, 29],
      pose.rightHip,
      pose.rightKnee,
      pose.rightFoot,
    );
    assert.ok(right > left, `shoe centers crossed at ${time} ms`);
    minimumSeparation = Math.min(minimumSeparation, right - left);
  }
  assert.ok(
    minimumSeparation >= 85,
    `canonical shoe centers approached within ${minimumSeparation.toFixed(2)} source px`,
  );
  const neutral = sample(0, 'still');
  assert.equal(
    center(224, [-2, 42], [-5, 84], [-8, 30], neutral.leftHip, neutral.leftKnee, neutral.leftFoot),
    209,
  );
  assert.equal(
    center(286, [5, 40], [5, 85], [16, 29], neutral.rightHip, neutral.rightKnee, neutral.rightFoot),
    312,
  );
});

test('thinking reaches the original lower chin with canonical arm vectors and keeps contact through the small gesture', () => {
  for (const time of [0, 900, 1800, 2700, 3600, 4700]) {
    const pose = sample(time, 'thinking');
    const upper = rotate(18, 69, pose.rightArm);
    const forearm = rotate(14, 28, pose.rightArm + pose.rightElbow);
    const hand = rotate(13, 16, pose.rightArm + pose.rightElbow + pose.rightWrist);
    const handCenter = [
      312 + upper[0] + forearm[0] + hand[0],
      394 + upper[1] + forearm[1] + hand[1],
    ];
    const chinFromNeck = rotate(-2, -11, pose.headAngle);
    const chin = [262 + chinFromNeck[0], 346 + chinFromNeck[1] + pose.headY];
    assert.ok(
      Math.hypot(handCenter[0] - chin[0], handCenter[1] - chin[1]) <= 14,
      `thinking hand missed lower chin at ${time} ms`,
    );
  }
});

test('speech articulates three smooth syllables and independent hand, elbow and head gestures', () => {
  for (const time of [100, 330, 650]) assert.ok(sample(time, 'talk').mouthOpen > 0.9);
  for (const time of [0, 220, 480, 820, 980]) assert.equal(sample(time, 'talk').mouthOpen, 0);
  const opening = sample(65, 'talk');
  assert.ok(opening.mouthOpen > 0 && opening.mouthOpen < 0.92);
  const first = sample(100, 'talk');
  const sameSyllable = sample(1080, 'talk');
  assert.equal(first.mouthOpen, sameSyllable.mouthOpen);
  for (const key of ['rightArm', 'rightElbow', 'rightWrist', 'headAngle', 'mouthScale'])
    assert.notEqual(first[key], sameSyllable[key]);
});

test('smooth blink closes briefly and fully recovers in every moving expression', () => {
  for (const motion of motions.filter((motion) => motion !== 'still')) {
    assert.equal(sample(3940, motion).eyesOpen, 1);
    assert.ok(sample(3970, motion).eyesOpen > 0 && sample(3970, motion).eyesOpen < 1);
    assert.equal(sample(4012, motion).eyesOpen, 0);
    assert.ok(sample(4072, motion).eyesOpen > 0 && sample(4072, motion).eyesOpen < 1);
    assert.equal(sample(4120, motion).eyesOpen, 1);
    assert.equal(sample(4300 + 4012, motion).eyesOpen, 0);
    assert.equal(sample(4300 + 4120, motion).eyesOpen, 1);
  }
});

test('celebration claps first, raises articulated arms, then settles to original joint geometry', () => {
  const rest = sample(0, 'celebrate');
  const clapping = sample(600, 'celebrate');
  const raised = sample(2850, 'celebrate');
  const settled = sample(3600, 'celebrate');
  assert.ok(clapping.leftElbow < -100 && clapping.rightElbow > 100);
  assert.ok(raised.leftArm > 120 && raised.rightArm < -120);
  assert.ok(raised.bodyY <= -7);
  for (const key of [
    'bodyY',
    'bodyAngle',
    'headY',
    'headAngle',
    'leftArm',
    'rightArm',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
    'leftKnee',
    'rightKnee',
  ]) {
    assert.equal(Math.abs(settled[key]), 0);
    assert.equal(Math.abs(sample(4000, 'celebrate')[key] - rest[key]), 0);
  }
});

test('disappointment is a restrained slouch with lower pupils and a frown cue', () => {
  for (const time of [0, 1000, 4000, 8000]) {
    const pose = sample(time, 'disappointed');
    assert.equal(pose.sad, 1);
    assert.equal(pose.mouthOpen, 0);
    assert.ok(pose.headAngle > 3 && pose.headAngle < 6);
    assert.ok(pose.bodyY > 4 && pose.bodyY < 11);
    assert.ok(pose.browLeft < 0 && pose.browRight > 0);
    assert.ok(pose.pupilsY > 4);
  }
});

test('draft has no TypeScript semantic errors without writing an integration file', () => {
  const options = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    types: [],
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile;
  const originalFileExists = host.fileExists;
  const originalReadFile = host.readFile;
  const isVirtual = (file) => path.resolve(file).toLowerCase() === virtualPath.toLowerCase();
  host.fileExists = (file) => isVirtual(file) || originalFileExists(file);
  host.readFile = (file) => (isVirtual(file) ? source : originalReadFile(file));
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    isVirtual(file)
      ? ts.createSourceFile(file, source, languageVersion, true)
      : originalGetSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([virtualPath], options, host);
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(
    errors.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    }),
  );
});

test('Expo Android Babel compiles the sampler and all three helpers into UI worklets', () => {
  const babel = require('@babel/core');
  // Strip TypeScript in memory first: the Worklets serializer selects its parser
  // from the real filename, whose mandated .txt suffix is not a TypeScript suffix.
  const result = babel.transformSync(compiled.outputText, {
    // Worklets also reads the real source path for serialization / diagnostics.
    filename: sourcePath,
    presets: ['babel-preset-expo'],
    caller: { name: 'metro', platform: 'android', supportsStaticESM: true },
    babelrc: false,
    configFile: false,
  });
  assert.equal((result.code.match(/__workletHash/g) || []).length, 5);
});
