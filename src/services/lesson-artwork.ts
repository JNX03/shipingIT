import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

export type ArtworkModule = Parameters<typeof Asset.fromModule>[0];
type Identity = {
  uri: string;
  hash?: string | null;
  type?: string;
  width?: number | null;
  height?: number | null;
};
type Downloaded = { downloaded: boolean; uri?: string; hash?: string | null };
const DESCRIPTOR_KEYS = new Set(['uri', 'width', 'height', 'hash', 'type', 'name', 'toString']);
const validText = (value: unknown) =>
  value == null || (typeof value === 'string' && value.length > 0);
const validDimension = (value: unknown) =>
  value == null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);

/** Memoize completed web artwork only; pending work and native loading retain their normal retry paths. */
export function createLessonArtworkLoader<T extends Downloaded>(options: {
  platform: string;
  load: (modules: readonly ArtworkModule[]) => Promise<T[]>;
  resolve: (module: ArtworkModule) => Identity;
}) {
  const completed = new Map<string, T>();
  const sources = new WeakMap<object, number>();
  let nextSource = 0;
  const sourceNumber = (source: object) => {
    if (!sources.has(source)) sources.set(source, ++nextSource);
    return sources.get(source)!;
  };
  const identity = (module: ArtworkModule) => {
    try {
      const object = typeof module === 'object' && module !== null;
      if (
        object &&
        Reflect.ownKeys(module).some((key) => typeof key !== 'string' || !DESCRIPTOR_KEYS.has(key))
      )
        return undefined;
      const resolved = options.resolve(module);
      if (typeof resolved.uri !== 'string' || !resolved.uri) return undefined;
      if (
        !validText(resolved.hash) ||
        !validText(resolved.type) ||
        !validDimension(resolved.width) ||
        !validDimension(resolved.height)
      )
        return undefined;
      // Numeric/string sources without a revision cannot prove that a reused URI is unchanged.
      if (!object && !resolved.hash) return undefined;
      const descriptor = object ? (module as ArtworkModule & Record<string, unknown>) : undefined;
      if (
        descriptor &&
        (typeof descriptor.uri !== 'string' ||
          !descriptor.uri ||
          typeof descriptor.width !== 'number' ||
          !validDimension(descriptor.width) ||
          typeof descriptor.height !== 'number' ||
          !validDimension(descriptor.height) ||
          !validText(descriptor.hash) ||
          !validText(descriptor.type) ||
          !validText(descriptor.name) ||
          (Object.prototype.hasOwnProperty.call(descriptor, 'toString') &&
            typeof descriptor.toString !== 'function'))
      )
        return undefined;
      const key = JSON.stringify([
        resolved.uri,
        resolved.hash ?? null,
        resolved.type ?? null,
        resolved.width ?? null,
        resolved.height ?? null,
        descriptor
          ? [
              descriptor.uri,
              descriptor.width,
              descriptor.height,
              descriptor.hash ?? null,
              descriptor.type ?? null,
              descriptor.name ?? null,
              // Metro creates a new object when its asset source is replaced during HMR.
              resolved.hash || descriptor.hash ? null : sourceNumber(descriptor),
            ]
          : module,
      ]);
      return { key, uri: resolved.uri, hash: resolved.hash ?? null };
    } catch {
      return undefined;
    }
  };
  const sourceKey = (modules: readonly ArtworkModule[]) =>
    JSON.stringify(
      modules.map((module) => {
        if (options.platform === 'web') {
          const known = identity(module);
          if (known) return known.key;
          if (typeof module === 'object' && module !== null) {
            try {
              return [sourceNumber(module), JSON.stringify(module)];
            } catch {
              return sourceNumber(module);
            }
          }
        }
        return module;
      }),
    );
  const load = async (modules: readonly ArtworkModule[]): Promise<T[]> => {
    if (options.platform !== 'web') return options.load(modules);
    return Promise.all(
      modules.map(async (module) => {
        const before = identity(module);
        const cached = before ? completed.get(before.key) : undefined;
        if (cached?.downloaded === true) {
          // Refresh insertion order so the bounded cache retains the current lesson's artwork.
          completed.delete(before!.key);
          completed.set(before!.key, cached);
          return cached;
        }
        if (before) completed.delete(before.key);
        const loaded = await options.load([module]);
        if (loaded.length !== 1 || loaded[0]?.downloaded !== true)
          throw new Error('Lesson artwork is not fully loaded.');
        const asset = loaded[0];
        const after = identity(module);
        if (
          before &&
          after?.key === before.key &&
          asset.uri === before.uri &&
          (asset.hash ?? null) === before.hash
        ) {
          completed.set(before.key, asset);
          if (completed.size > 128) completed.delete(completed.keys().next().value!);
        }
        return asset;
      }),
    );
  };
  return Object.assign(load, { sourceKey });
}

export const loadLessonArtwork = createLessonArtworkLoader({
  platform: Platform.OS,
  load: (modules) => Asset.loadAsync(modules as number[]),
  resolve: (module) => Asset.fromModule(module),
});
export const lessonArtworkSourceKey = loadLessonArtwork.sourceKey;
