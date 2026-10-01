import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createLessonPreparationController } from './lesson-preparation';

type Entry = { ready: boolean; error: string | null; retry(): void };
type Module = number | string | { uri: string; width: number; height: number; hash?: string };
type Props = {
  key: string;
  dataReady: boolean;
  assets: readonly Module[];
  retryData?: () => Promise<void>;
};
type Effect = { run: () => (() => void) | undefined; deps?: readonly unknown[] };

async function flush() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function clock() {
  let time = 0;
  let next = 0;
  const pending = new Map<number, { at: number; callback: () => void }>();
  return {
    schedule(callback: () => void, delay: number) {
      const id = next++;
      pending.set(id, { at: time + delay, callback });
      return () => {
        pending.delete(id);
      };
    },
    async advance(milliseconds: number) {
      const target = time + milliseconds;
      for (;;) {
        const entry = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry || entry[1].at > target) break;
        time = entry[1].at;
        pending.delete(entry[0]);
        entry[1].callback();
        await flush();
      }
      time = target;
      await flush();
    },
    pendingCount: () => pending.size,
  };
}

/** Model render-phase state restarts and effect cleanup; inject only React and asset I/O. */
function hookFixture(
  options: {
    load?: (modules: readonly Module[]) => Promise<readonly { downloaded: boolean }[]>;
    sourceKey?: (modules: readonly Module[]) => string;
  } = {},
) {
  const timer = clock();
  const state = new Map<number, unknown>();
  const refs = new Map<number, { current: unknown }>();
  const committed = new Map<number, Effect & { cleanup?: () => void }>();
  const loads: Module[][] = [];
  const loadingArt: Module[] = ['/_expo/static/media/ami-loading.webp', 102];
  let cursor = 0;
  let rendering = false;
  let restart = false;
  let effects = new Map<number, Effect>();
  let latest: Props = { key: 'library:sample', dataReady: true, assets: [] };

  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!state.has(index)) state.set(index, typeof initial === 'function' ? initial() : initial);
      return [
        state.get(index),
        (value: unknown) => {
          const previous = state.get(index);
          const updated = typeof value === 'function' ? value(previous) : value;
          if (!Object.is(previous, updated)) {
            state.set(index, updated);
            if (rendering) restart = true;
          }
        },
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!refs.has(index)) refs.set(index, { current: initial });
      return refs.get(index);
    },
    useEffect(run: Effect['run'], deps?: readonly unknown[]) {
      effects.set(cursor++, { run, deps });
    },
  };
  const dependencies: Record<string, unknown> = {
    react,
    '@/services/lesson-artwork': {
      lessonArtworkSourceKey:
        options.sourceKey ?? ((modules: readonly Module[]) => JSON.stringify(modules)),
      loadLessonArtwork: async (modules: readonly Module[]) => {
        loads.push([...modules]);
        return options.load ? options.load(modules) : modules.map(() => ({ downloaded: true }));
      },
    },
    '@/game/components/ami-original-art': { originalAmiLoadingAssets: loadingArt },
    '@/domain/lesson-preparation': {
      createLessonPreparationController: (
        preparation: Parameters<typeof createLessonPreparationController>[0],
      ) => createLessonPreparationController({ ...preparation, schedule: timer.schedule }),
    },
  };
  const filename = resolve('src/hooks/use-lesson-entry.ts');
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      require: (dependency: string) => {
        assert.ok(dependency in dependencies, `Unexpected hook dependency: ${dependency}`);
        return dependencies[dependency];
      },
    },
    { filename },
  );
  const hook = (
    module.exports as {
      useLessonEntry(
        key: string,
        dataReady: boolean,
        assets: readonly Module[],
        retryData?: () => Promise<void>,
      ): Entry;
    }
  ).useLessonEntry;

  function render(props: Partial<Props> = {}) {
    latest = { ...latest, ...props };
    for (let count = 0; count < 25; count += 1) {
      cursor = 0;
      restart = false;
      effects = new Map();
      rendering = true;
      const entry = hook(latest.key, latest.dataReady, latest.assets, latest.retryData);
      rendering = false;
      if (!restart) return entry;
    }
    throw new Error('Hook exceeded the render-phase update limit');
  }

  function commit() {
    for (const [index, effect] of effects) {
      const previous = committed.get(index);
      const previousDeps = previous?.deps;
      if (
        previousDeps &&
        effect.deps &&
        effect.deps.length === previousDeps.length &&
        effect.deps.every((value, dependency) => Object.is(value, previousDeps[dependency]))
      )
        continue;
      previous?.cleanup?.();
      committed.set(index, { ...effect, cleanup: effect.run() });
    }
  }

  function dispose() {
    for (const effect of committed.values()) effect.cleanup?.();
    committed.clear();
  }

  return { render, commit, dispose, clock: timer, loads, loadingArt };
}

test('the first render after a false-to-true data period never reuses earlier ready state', async () => {
  const f = hookFixture();
  assert.equal(f.render().ready, false);
  f.commit();
  await flush();
  await f.clock.advance(600);
  assert.equal(f.render().ready, true);
  assert.equal(f.render({ dataReady: false }).ready, false);
  f.commit();
  // Inspect the hook output before the fresh effect can reset its prepared state.
  assert.equal(f.render({ dataReady: true }).ready, false);
  assert.equal(f.loads.length, 1);
  f.commit();
  await flush();
  await f.clock.advance(599);
  assert.equal(f.render().ready, false);
  await f.clock.advance(1);
  assert.equal(f.render().ready, true);
  assert.equal(f.loads.length, 2);
  f.dispose();
});

test('a false data gate exposes its error and retry after twelve seconds without loading artwork', async () => {
  const f = hookFixture();
  assert.equal(f.render({ dataReady: false }).error, null);
  f.commit();
  await f.clock.advance(11_999);
  assert.equal(f.render().error, null);
  await f.clock.advance(1);
  const entry = f.render();
  assert.equal(entry.ready, false);
  assert.match(entry.error ?? '', /lesson data.*Try again/i);
  assert.equal(typeof entry.retry, 'function');
  assert.equal(f.loads.length, 0);
  assert.equal(f.clock.pendingCount(), 0);
  f.dispose();
});

test('retry calls the real data recovery callback and its resolution never opens a false data gate', async () => {
  let recovered = 0;
  const retryData = async () => {
    recovered += 1;
  };
  const f = hookFixture();
  f.render({ dataReady: false, retryData });
  f.commit();
  assert.equal(recovered, 0);
  await f.clock.advance(12_000);
  f.render().retry();
  assert.equal(f.render().ready, false);
  f.commit();
  await flush();
  assert.equal(recovered, 1);
  assert.equal(f.render().error, null);
  await f.clock.advance(600);
  assert.equal(f.render().ready, false);
  assert.equal(f.loads.length, 0);
  await f.clock.advance(11_400);
  assert.match(f.render().error ?? '', /lesson data.*Try again/i);
  f.dispose();
});

test('web asset URLs survive the stable JSON key and equivalent inline arrays do not restart loading', async () => {
  const urls = [
    '/_expo/static/media/scene.webp?variant=1:2',
    'https://example.invalid/assets/room.webp',
  ];
  const f = hookFixture();
  f.render({ assets: urls });
  f.commit();
  await flush();
  assert.deepEqual(f.loads[0], [...f.loadingArt, ...urls]);
  await f.clock.advance(600);
  assert.equal(f.render({ assets: [...urls] }).ready, true);
  f.commit();
  assert.equal(f.loads.length, 1);
  f.dispose();
});

test('changing an inline data recovery callback does not restart the asset load or minimum', async () => {
  const f = hookFixture();
  f.render({ retryData: async () => {} });
  f.commit();
  await flush();
  await f.clock.advance(400);
  f.render({ retryData: async () => {} });
  f.commit();
  assert.equal(f.loads.length, 1);
  await f.clock.advance(200);
  assert.equal(f.render().ready, true);
  f.dispose();
});

test('original web descriptors survive loading and value-equal HMR replacement starts fresh preparation', async () => {
  const identities = new WeakMap<object, number>();
  let nextIdentity = 0;
  const original = { uri: '/same.webp', width: 80, height: 100 };
  const f = hookFixture({
    sourceKey: (modules) =>
      JSON.stringify(
        modules.map((module) => {
          if (typeof module !== 'object') return module;
          if (!identities.has(module)) identities.set(module, ++nextIdentity);
          return [identities.get(module), module];
        }),
      ),
  });
  f.render({ assets: [original] });
  f.commit();
  await flush();
  await f.clock.advance(600);
  assert.equal(f.render().ready, true);
  assert.equal(
    f.loads[0].at(-1),
    original,
    'The loader must receive the original object, not a JSON clone',
  );
  f.render({ assets: [original] });
  f.commit();
  assert.equal(f.loads.length, 1);
  const replacement = { ...original };
  assert.equal(f.render({ assets: [replacement] }).ready, false);
  f.commit();
  await flush();
  assert.equal(f.loads.length, 2);
  assert.equal(f.loads[1].at(-1), replacement);
  await f.clock.advance(599);
  assert.equal(f.render().ready, false);
  await f.clock.advance(1);
  assert.equal(f.render().ready, true);
  f.dispose();
});

for (const incomplete of ['count', 'downloaded-flag'] as const) {
  test(`an incomplete asset ${incomplete} never marks the hook ready`, async () => {
    const f = hookFixture({
      load: async (modules) =>
        incomplete === 'count'
          ? modules.slice(1).map(() => ({ downloaded: true }))
          : modules.map((_, index) => ({ downloaded: index !== 0 })),
    });
    f.render({ assets: [203] });
    f.commit();
    await flush();
    const entry = f.render();
    assert.equal(entry.ready, false);
    assert.match(entry.error ?? '', /artwork.*could not load/i);
    assert.equal(f.clock.pendingCount(), 0);
    f.dispose();
  });
}

test('an explicit artwork retry may finish beyond twelve seconds but never opens before loading', async () => {
  let finishLoad: (() => void) | undefined;
  const f = hookFixture({ load: async (modules) => {
    await new Promise<void>((done) => { finishLoad = done; });
    return modules.map(() => ({ downloaded: true }));
  } });
  f.render();
  f.commit();
  await flush();
  await f.clock.advance(12_000);
  assert.match(f.render().error ?? '', /artwork.*Try again/i);
  f.render().retry();
  f.render();
  f.commit();
  await flush();
  await f.clock.advance(20_000);
  assert.equal(f.render().ready, false);
  assert.equal(f.render().error, null);
  finishLoad!();
  await flush();
  assert.equal(f.render().ready, true);
  f.dispose();
});
