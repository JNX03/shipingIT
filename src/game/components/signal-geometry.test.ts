import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  createSignalPath,
  isSignalRunCurrent,
  sampleSignalPath,
  type SignalPath,
  type SignalPoint,
  type SignalRun,
} from './signal-geometry';

const centers: readonly SignalPoint[] = [
  { x: 20, y: 30 },
  { x: 140, y: 30 },
  { x: 140, y: 210 },
  { x: 20, y: 210 },
];
const path = createSignalPath(centers)!;
const invalidSample = { x: 0, y: 0, valid: false, delivered: false };

test('ordered measured centers become a detached scalar path with a stable geometry key', () => {
  const mutable = centers.map((point) => ({ ...point }));
  const snapshot = createSignalPath(mutable)!;
  assert.deepEqual(snapshot, {
    x0: 20,
    y0: 30,
    x1: 140,
    y1: 30,
    x2: 140,
    y2: 210,
    x3: 20,
    y3: 210,
    key: '[20,30,140,30,140,210,20,210]',
  });
  assert.equal(createSignalPath(centers)?.key, snapshot.key);
  mutable[0].x = 55;
  assert.equal(snapshot.x0, 20);
  assert.notEqual(createSignalPath(mutable)?.key, snapshot.key);
});

test('path creation rejects missing, empty, incomplete, surplus and sparse point lists', () => {
  const invalid: unknown[] = [
    undefined,
    null,
    {},
    [],
    centers.slice(0, 3),
    [...centers, centers[0]],
    new Array(4),
  ];
  for (const points of invalid)
    assert.equal(createSignalPath(points as readonly SignalPoint[]), null);
});

test('every point must contain two finite numeric coordinates', () => {
  const malformed: unknown[] = [
    null,
    undefined,
    4,
    'point',
    {},
    { x: 1 },
    { y: 2 },
    { x: '1', y: 2 },
    { x: null, y: 2 },
    { x: NaN, y: 2 },
    { x: Infinity, y: 2 },
    { x: -Infinity, y: 2 },
    { x: 1, y: NaN },
    { x: 1, y: Infinity },
    { x: 1, y: -Infinity },
  ];
  for (let index = 0; index < 4; index++) {
    for (const point of malformed) {
      const broken: unknown[] = [...centers];
      broken[index] = point;
      assert.equal(createSignalPath(broken as readonly SignalPoint[]), null);
    }
  }
});

test('segment boundaries visit trigger, action, data and result in order', () => {
  assert.deepEqual(sampleSignalPath(path, 0), { x: 20, y: 30, valid: true, delivered: false });
  assert.deepEqual(sampleSignalPath(path, 1 / 3), { x: 140, y: 30, valid: true, delivered: false });
  assert.deepEqual(sampleSignalPath(path, 2 / 3), {
    x: 140,
    y: 210,
    valid: true,
    delivered: false,
  });
  assert.deepEqual(sampleSignalPath(path, 1), { x: 20, y: 210, valid: true, delivered: true });
});

test('each segment interpolates its own endpoints without a dynamic point index', () => {
  assert.deepEqual(sampleSignalPath(path, 1 / 6), { x: 80, y: 30, valid: true, delivered: false });
  assert.deepEqual(sampleSignalPath(path, 1 / 2), {
    x: 140,
    y: 120,
    valid: true,
    delivered: false,
  });
  assert.deepEqual(sampleSignalPath(path, 5 / 6), { x: 80, y: 210, valid: true, delivered: false });
});

test('finite progress outside the interval clamps without indexing or extrapolating', () => {
  for (const progress of [-Number.MAX_VALUE, -1, -Number.EPSILON])
    assert.deepEqual(sampleSignalPath(path, progress), sampleSignalPath(path, 0));
  for (const progress of [1 + Number.EPSILON, 2, Number.MAX_VALUE])
    assert.deepEqual(sampleSignalPath(path, progress), {
      x: 20,
      y: 210,
      valid: true,
      delivered: false,
    });
  assert.equal(sampleSignalPath(path, 1 - Number.EPSILON).delivered, false);
});

test('delivery requires an exact valid final progress, not a clamped endpoint', () => {
  assert.equal(sampleSignalPath(path, 1).delivered, true);
  for (const progress of [0, 1 - Number.EPSILON, 1 + Number.EPSILON, 2, NaN, Infinity, -Infinity])
    assert.equal(sampleSignalPath(path, progress).delivered, false);
  assert.deepEqual(sampleSignalPath(path, 2), { x: 20, y: 210, valid: true, delivered: false });
});

test('non-finite or absent progress is invalid and never delivered', () => {
  for (const progress of [NaN, Infinity, -Infinity, undefined, null, '1'])
    assert.deepEqual(sampleSignalPath(path, progress as number), invalidSample);
});

test('missing or malformed scalar snapshots are safe even at completion', () => {
  const invalid: unknown[] = [
    undefined,
    null,
    {},
    [],
    2,
    '',
    { ...path, key: '' },
    { ...path, key: 12 },
  ];
  for (const field of ['x0', 'y0', 'x1', 'y1', 'x2', 'y2', 'x3', 'y3']) {
    for (const coordinate of [undefined, null, '0', NaN, Infinity, -Infinity])
      invalid.push({ ...path, [field]: coordinate });
  }
  for (const snapshot of invalid) {
    assert.deepEqual(sampleSignalPath(snapshot as SignalPath, 0), invalidSample);
    assert.deepEqual(sampleSignalPath(snapshot as SignalPath, 1), invalidSample);
    assert.deepEqual(sampleSignalPath(snapshot as SignalPath, 2), invalidSample);
  }
});

test('degenerate and very large finite paths remain finite; position alone cannot imply delivery', () => {
  const coincident = createSignalPath(Array.from({ length: 4 }, () => ({ x: 0, y: 0 })))!;
  assert.deepEqual(sampleSignalPath(coincident, 0.5), {
    x: 0,
    y: 0,
    valid: true,
    delivered: false,
  });
  assert.equal(sampleSignalPath(coincident, 1).delivered, true);
  const extreme = createSignalPath([
    { x: -Number.MAX_VALUE, y: Number.MAX_VALUE },
    { x: Number.MAX_VALUE, y: -Number.MAX_VALUE },
    centers[2],
    centers[3],
  ])!;
  assert.deepEqual(sampleSignalPath(extreme, 1 / 6), { x: 0, y: 0, valid: true, delivered: false });
});

const linksKey = 'tap>load|load>queues|queues>render';
const run: SignalRun = { epoch: 3, pathKey: path.key, linksKey };

test('only the active run with matching geometry and wiring can complete', () => {
  assert.equal(isSignalRunCurrent(run, 3, path.key, linksKey), true);
  assert.equal(isSignalRunCurrent(null, 3, path.key, linksKey), false);
  assert.equal(isSignalRunCurrent(undefined, 3, path.key, linksKey), false);
});

test('a resize or replacement path rejects a queued finish from the previous board', () => {
  const resized = createSignalPath(centers.map((point) => ({ x: point.x * 2, y: point.y })))!;
  assert.equal(isSignalRunCurrent(run, 3, resized.key, linksKey), false);
  const shifted = createSignalPath(centers.map((point) => ({ x: point.x, y: point.y + 5 })))!;
  assert.equal(isSignalRunCurrent(run, 3, shifted.key, linksKey), false);
});

test('link edits reject a queued finish and restoring links cannot revive a cancelled epoch', () => {
  assert.equal(isSignalRunCurrent(run, 3, path.key, 'tap>load'), false);
  assert.equal(isSignalRunCurrent(run, 4, path.key, linksKey), false);
  assert.equal(isSignalRunCurrent({ ...run, epoch: 4 }, 4, path.key, linksKey), true);
});

test('unmount cancellation rejects a late finish even with identical keys', () => {
  const afterUnmountEpoch = run.epoch + 1;
  assert.equal(isSignalRunCurrent(run, afterUnmountEpoch, path.key, linksKey), false);
  assert.equal(isSignalRunCurrent(null, afterUnmountEpoch, path.key, linksKey), false);
});

test('malformed lifecycle tokens cannot authorize completion', () => {
  for (const epoch of [NaN, Infinity, -Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(isSignalRunCurrent({ ...run, epoch }, epoch, path.key, linksKey), false);
  assert.equal(isSignalRunCurrent({} as SignalRun, 3, path.key, linksKey), false);
  assert.equal(isSignalRunCurrent({ ...run, pathKey: '' }, 3, '', linksKey), false);
  assert.equal(isSignalRunCurrent({ ...run, linksKey: '' }, 3, path.key, ''), false);
});

test('Expo Babel serializes a self-contained sampler that safely executes boundary inputs', () => {
  const filename = resolve('src/game/components/signal-geometry.ts');
  const requireFromProject = createRequire(resolve('package.json'));
  const { transformSync } = requireFromProject('@babel/core') as {
    transformSync: (source: string, options: object) => { code?: string | null } | null;
  };
  const source = readFileSync(filename, 'utf8');
  type CompiledSampler = typeof sampleSignalPath & {
    __closure: Record<string, unknown>;
    __initData: { code: string };
  };
  for (const supportsReactCompiler of [false, true]) {
    const transformed = transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      presets: [['babel-preset-expo', {}]],
      caller: {
        name: 'metro',
        platform: 'android',
        supportsStaticESM: false,
        supportsReactCompiler,
        isDev: false,
      },
    });
    assert.ok(transformed?.code);
    const exports: { sampleSignalPath?: CompiledSampler } = {};
    runInNewContext(transformed.code, { exports, require: requireFromProject, global: { Error } });
    const compiled = exports.sampleSignalPath;
    assert.ok(compiled?.__initData?.code);
    assert.deepEqual(Object.keys(compiled.__closure), []);
    const serialized = runInNewContext(`(${compiled.__initData.code})`) as typeof sampleSignalPath;
    const snapshots = [path, null, undefined, {} as SignalPath, { ...path, x3: NaN }];
    const values = [0, 1 / 6, 1 / 3, 0.5, 2 / 3, 5 / 6, 1, -1, 2, NaN, Infinity, -Infinity];
    for (const snapshot of snapshots) {
      for (const progress of values) {
        assert.deepEqual(
          { ...serialized(snapshot, progress) },
          sampleSignalPath(snapshot, progress),
        );
      }
    }
  }
});
