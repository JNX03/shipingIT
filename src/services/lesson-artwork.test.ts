import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type ArtworkModule = number | string | Record<string, unknown>;
type Resolved = {
  uri: string;
  hash?: string | null;
  type?: string;
  width?: number | null;
  height?: number | null;
};
type Artwork = Resolved & { downloaded: boolean; serial: number };
type Loader = ((modules: readonly ArtworkModule[]) => Promise<Artwork[]>) & {
  sourceKey(modules: readonly ArtworkModule[]): string;
};
type Factory = (options: {
  platform: string;
  resolve: (module: ArtworkModule) => Resolved;
  load: (modules: readonly ArtworkModule[]) => Promise<Artwork[]>;
}) => Loader;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((pass, fail) => {
    resolve = pass;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let index = 0; index < 8; index++) await Promise.resolve();
}

const defaultResolve = (module: ArtworkModule): Resolved => {
  if (typeof module === 'object')
    return {
      uri: String(module.uri),
      hash: typeof module.hash === 'string' ? module.hash : 'resolved-bundle-hash',
      type: 'webp',
      width: typeof module.width === 'number' ? module.width : undefined,
      height: typeof module.height === 'number' ? module.height : undefined,
    };
  return {
    uri: typeof module === 'string' ? module : `https://assets.example/${module}.webp`,
    hash: 'resolved-bundle-hash',
    type: 'webp',
  };
};

/** Inject only platform/SDK boundaries. The factory and default wrapper are compiled from real source. */
function fixture(
  options: {
    platform?: string;
    resolve?: (module: ArtworkModule) => Resolved;
    load?: (modules: readonly ArtworkModule[], call: number) => Promise<Artwork[]>;
  } = {},
) {
  const calls: (readonly ArtworkModule[])[] = [];
  const resolutions: ArtworkModule[] = [];
  const resolveModule = (module: ArtworkModule) => {
    resolutions.push(module);
    return (options.resolve ?? defaultResolve)(module);
  };
  const load = async (modules: readonly ArtworkModule[]) => {
    calls.push(modules);
    return options.load
      ? options.load(modules, calls.length)
      : modules.map((module) => ({
          ...defaultResolve(module),
          downloaded: true,
          serial: calls.length,
        }));
  };
  const dependencies: Record<string, unknown> = {
    'expo-asset': { Asset: { fromModule: resolveModule, loadAsync: load } },
    'react-native': { Platform: { OS: options.platform ?? 'web' } },
    'expo-modules-core': { Platform: { OS: options.platform ?? 'web' } },
  };
  const filename = resolve('src/services/lesson-artwork.ts');
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(
    source,
    {
      exports,
      require: (dependency: string) => {
        assert.ok(dependency in dependencies, `Unexpected artwork dependency: ${dependency}`);
        return dependencies[dependency];
      },
    },
    { filename },
  );
  const create = exports.createLessonArtworkLoader as Factory;
  const loader = create({ platform: options.platform ?? 'web', resolve: resolveModule, load });
  return {
    loader,
    calls,
    resolutions,
    defaultLoader: exports.loadLessonArtwork as Loader,
    defaultSourceKey: exports.lessonArtworkSourceKey as (
      modules: readonly ArtworkModule[],
    ) => string,
  };
}

test('confirmed web artwork is reused while array order and repeated modules remain intact', async () => {
  const a = { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100 };
  const b = { uri: '/b.webp', hash: 'b-v1', width: 70, height: 90 };
  const f = fixture();
  const first = await f.loader([a, b]);
  const next = await f.loader([b, a, a]);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(next.map((asset) => asset.uri).join(','), '/b.webp,/a.webp,/a.webp');
  assert.equal(next[0], first[1]);
  assert.equal(next[1], first[0]);
  assert.equal(next[2], first[0]);
});

test('the default web wrapper uses the SDK boundary and reuses only its completed result', async () => {
  const f = fixture();
  const module = { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100 };
  const first = await f.defaultLoader([module]);
  const key = f.defaultSourceKey([module]);
  const next = await f.defaultLoader([module]);
  assert.equal(f.calls.length, 1);
  assert.equal(next[0], first[0]);
  assert.equal(f.defaultSourceKey([module]), key);
});

test('resolved URI/hash and descriptor hash/dimensions each invalidate confirmed artwork', async () => {
  const module: Record<string, unknown> = {
    uri: '/a.webp',
    hash: 'descriptor-v1',
    width: 80,
    height: 100,
  };
  let metadata: Resolved = { uri: '/a.webp', hash: 'bundle-v1', width: 80, height: 100 };
  const f = fixture({
    resolve: () => metadata,
    load: async (_modules, serial) => [{ ...metadata, downloaded: true, serial }],
  });
  await f.loader([module]);
  for (const change of [
    () => {
      metadata = { ...metadata, uri: '/changed.webp' };
    },
    () => {
      metadata = { ...metadata, hash: 'bundle-v2' };
    },
    () => {
      module.hash = 'descriptor-v2';
    },
    () => {
      module.width = 81;
    },
    () => {
      module.height = 101;
    },
  ]) {
    change();
    const before = f.calls.length;
    await f.loader([module]);
    assert.equal(f.calls.length, before + 1);
    await f.loader([module]);
    assert.equal(
      f.calls.length,
      before + 1,
      'The changed identity may reuse its own confirmed load',
    );
  }
});

test('a hashless descriptor reuses its own success but a new same-URI source object reloads', async () => {
  const f = fixture({
    resolve: (module) => ({ uri: String((module as Record<string, unknown>).uri), hash: null }),
    load: async (modules, serial) => [
      {
        uri: String((modules[0] as Record<string, unknown>).uri),
        hash: null,
        downloaded: true,
        serial,
      },
    ],
  });
  const original = { uri: '/same.webp', width: 80, height: 100 };
  await f.loader([original]);
  await f.loader([original]);
  assert.equal(f.calls.length, 1);
  await f.loader([{ ...original }]);
  assert.equal(
    f.calls.length,
    2,
    'A new HMR descriptor cannot inherit an unversioned old confirmation',
  );
});

for (const module of ['/no-hash.webp', 42]) {
  test(`unversioned scalar ${typeof module} modules delegate each call instead of using the app cache`, async () => {
    const f = fixture({
      resolve: () => ({ uri: '/no-hash.webp', hash: null }),
      load: async (_modules, serial) => [
        { uri: '/no-hash.webp', hash: null, downloaded: true, serial },
      ],
    });
    await f.loader([module]);
    await f.loader([module]);
    assert.equal(f.calls.length, 2);
  });
}

for (const field of ['uri', 'hash', 'width', 'height'] as const) {
  test(`a source ${field} change during a pending load cannot cache the earlier identity`, async () => {
    const module: Record<string, unknown> = {
      uri: '/a.webp',
      hash: 'descriptor-v1',
      width: 80,
      height: 100,
    };
    const initial = { ...module };
    const gate = deferred<Artwork[]>();
    const f = fixture({
      resolve: (source) => ({
        uri: String((source as Record<string, unknown>).uri),
        hash: 'bundle-v1',
        width: 80,
        height: 100,
      }),
      load: async (_modules, serial) =>
        serial === 1
          ? gate.promise
          : [{ uri: '/a.webp', hash: 'bundle-v1', downloaded: true, serial }],
    });
    const first = f.loader([module]);
    module[field] = field === 'uri' ? '/changed.webp' : field === 'hash' ? 'descriptor-v2' : 101;
    gate.resolve([{ uri: '/a.webp', hash: 'bundle-v1', downloaded: true, serial: 1 }]);
    await first;
    Object.assign(module, initial);
    await f.loader([module]);
    assert.equal(
      f.calls.length,
      2,
      'The first identity changed before confirmation and must load again',
    );
  });
}

test('a confirmed partial success is reused when its sibling failed and retries fresh', async () => {
  const a = { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100 };
  const b = { uri: '/b.webp', hash: 'b-v1', width: 80, height: 100 };
  const failed = deferred<Artwork[]>();
  let bCalls = 0;
  const f = fixture({
    load: async (modules, serial) => {
      const module = modules[0] as Record<string, unknown>;
      if (module.uri === '/b.webp' && ++bCalls === 1) return failed.promise;
      return [{ ...defaultResolve(module), downloaded: true, serial }];
    },
  });
  const first = f.loader([a, b]);
  const rejected = assert.rejects(first, /network failure/);
  await flush();
  failed.reject(new Error('network failure'));
  await rejected;
  const retried = await f.loader([a, b]);
  assert.equal(retried.length, 2);
  assert.equal(f.calls.filter((modules) => modules[0] === a).length, 1);
  assert.equal(f.calls.filter((modules) => modules[0] === b).length, 2);
});

test('retry starts independently of a stalled load and its confirmation survives a late failure', async () => {
  const module = { uri: '/slow.webp', hash: 'slow-v1', width: 80, height: 100 };
  const stalled = deferred<Artwork[]>();
  const f = fixture({
    load: async (_modules, serial) =>
      serial === 1 ? stalled.promise : [{ ...defaultResolve(module), downloaded: true, serial }],
  });
  const first = f.loader([module]);
  const rejected = assert.rejects(first, /late failure/);
  const retry = await f.loader([module]);
  assert.equal(f.calls.length, 2);
  assert.equal(retry[0].serial, 2);
  stalled.reject(new Error('late failure'));
  await rejected;
  const warm = await f.loader([module]);
  assert.equal(f.calls.length, 2);
  assert.equal(warm[0], retry[0]);
});

for (const malformed of ['empty', 'extra', 'not-array', 'downloaded-false'] as const) {
  test(`web ${malformed} load results never become reusable confirmations`, async () => {
    const module = { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100 };
    const good = { ...defaultResolve(module), downloaded: true, serial: 2 };
    const f = fixture({
      load: async (_modules, serial) => {
        if (serial > 1) return [good];
        if (malformed === 'empty') return [];
        if (malformed === 'extra') return [good, good];
        if (malformed === 'not-array') return undefined as unknown as Artwork[];
        return [{ ...good, downloaded: false }];
      },
    });
    await assert.rejects(f.loader([module]));
    await f.loader([module]);
    await f.loader([module]);
    assert.equal(f.calls.length, 2);
  });
}

for (const mismatch of ['uri', 'hash'] as const) {
  test(`a returned ${mismatch} mismatch remains uncached without discarding its real loaded result`, async () => {
    const module = { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100 };
    const f = fixture({
      load: async (_modules, serial) => [
        { ...defaultResolve(module), [mismatch]: 'different', downloaded: true, serial },
      ],
    });
    assert.equal((await f.loader([module]))[0].downloaded, true);
    assert.equal((await f.loader([module]))[0].downloaded, true);
    assert.equal(f.calls.length, 2);
  });
}

test('unknown descriptor fields and malformed descriptor values bypass cache', async () => {
  const modules: ArtworkModule[] = [
    { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100, headers: { extra: 'unknown' } },
    { uri: '/b.webp', hash: 'b-v1', width: Number.NaN, height: 100 },
    { uri: '/c.webp', hash: 'c-v1', width: 80, height: -1 },
    { uri: 123, hash: 'd-v1', width: 80, height: 100 },
    { uri: '/e.webp', hash: '', width: 80, height: 100 },
    { uri: '/f.webp', hash: {}, width: 80, height: 100 },
    { uri: '/g.webp', hash: 'g-v1', width: 80, height: 100, type: {} },
    { uri: '/h.webp', hash: 'h-v1', width: 80, height: 100, name: {} },
    { uri: '/i.webp', hash: 'i-v1', width: 80, height: 100, toString: 42 },
  ];
  const f = fixture();
  for (const module of modules) {
    const before = f.calls.length;
    await f.loader([module]);
    await f.loader([module]);
    assert.equal(f.calls.length, before + 2);
  }
});

test('invalid resolved hash, type or dimensions delegate normally and remain uncached', async () => {
  const module = { uri: '/a.webp', hash: 'a-v1', width: 80, height: 100 };
  const malformedMetadata = [
    { uri: '/a.webp', hash: '' },
    { uri: '/a.webp', hash: 'a-v1', type: {} },
    { uri: '/a.webp', hash: 'a-v1', width: -1 },
    { uri: '/a.webp', hash: 'a-v1', height: Number.POSITIVE_INFINITY },
  ] as unknown as Resolved[];
  for (const metadata of malformedMetadata) {
    const f = fixture({
      resolve: () => metadata,
      load: async (_modules, serial) => [{ ...metadata, downloaded: true, serial }],
    });
    assert.equal((await f.loader([module]))[0].downloaded, true);
    await f.loader([module]);
    assert.equal(f.calls.length, 2);
  }
});

test('confirmed web cache evicts old entries after 128 identities while keeping recent results reusable', async () => {
  const f = fixture();
  const modules = Array.from({ length: 129 }, (_, index) => ({
    uri: `/${index}.webp`,
    hash: `v1-${index}`,
    width: 80,
    height: 100,
  }));
  for (const module of modules) await f.loader([module]);
  assert.equal(f.calls.length, 129);
  await f.loader([modules.at(-1)!]);
  assert.equal(f.calls.length, 129);
  await f.loader([modules[0]]);
  assert.equal(f.calls.length, 130);
});

test('source keys retain original descriptor identity and react to changed content metadata without I/O', () => {
  const f = fixture({ resolve: () => ({ uri: '/same.webp', hash: null }) });
  const source = { uri: '/same.webp', width: 80, height: 100 };
  const key = f.loader.sourceKey([source]);
  assert.equal(f.loader.sourceKey([source]), key);
  assert.notEqual(f.loader.sourceKey([{ ...source }]), key);
  source.width = 81;
  assert.notEqual(f.loader.sourceKey([source]), key);
  assert.equal(f.calls.length, 0);
});

for (const platform of ['android', 'ios']) {
  test(`${platform} preserves the exact native SDK batch and result without resolving or caching`, async () => {
    const modules = [101, 202];
    const result = [{ uri: '/native', downloaded: false, serial: 1 }];
    const f = fixture({ platform, load: async () => result });
    assert.equal(await f.loader(modules), result);
    assert.equal(await f.loader(modules), result);
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[0], modules);
    assert.equal(f.calls[1], modules);
    assert.equal(f.resolutions.length, 0);
    assert.equal(await f.defaultLoader(modules), result);
    assert.equal(f.calls[2], modules);
    assert.equal(f.resolutions.length, 0);
  });
}
