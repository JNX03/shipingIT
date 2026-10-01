import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { lessons } from '../data/curriculum';
import { bonusLessons } from '../data/learning-guides';
import { challengeCatalog } from '../game/challenges/catalog';
import { adventureWorlds } from '../game/world/scenes';

type Metadata = { name: string; type: string; hash: string; uri: string; width: number; height: number };
const registry = new Map<number, Metadata>();
const files = new Map<string, number>();
const modules = new Map<string, Record<string, unknown>>();
function asset(path: string) {
  if (files.has(path)) return files.get(path)!;
  assert.ok(existsSync(path), `Missing artwork ${path}`);
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', path);
  const kind = bytes.toString('ascii', 12, 16);
  const width = kind === 'VP8X' ? bytes.readUIntLE(24, 3) + 1 : kind === 'VP8L' ? (bytes.readUInt32LE(21) & 0x3fff) + 1 : bytes.readUInt16LE(26) & 0x3fff;
  const height = kind === 'VP8X' ? bytes.readUIntLE(27, 3) + 1 : kind === 'VP8L' ? ((bytes.readUInt32LE(21) >>> 14) & 0x3fff) + 1 : bytes.readUInt16LE(28) & 0x3fff;
  assert.ok(width > 0 && height > 0, `Invalid image dimensions ${path}`);
  const id = files.size + 1;
  files.set(path, id);
  registry.set(id, { name: path.replace(/[^a-z0-9]/gi, '').toLowerCase(), type: 'webp', hash: createHash('md5').update(bytes).digest('hex'), uri: `/assets/${id}.webp`, width, height });
  return id;
}
function dataModule(path: string): Record<string, unknown> {
  path = resolve(path);
  if (modules.has(path)) return modules.get(path)!;
  const exports: Record<string, unknown> = {};
  modules.set(path, exports);
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    require(name: string) {
      if (name.endsWith('.webp')) return asset(resolve(dirname(path), name));
      if (name === '../world/scenes') return { adventureWorlds };
      assert.ok(name.startsWith('.'), `Unexpected artwork dependency ${name}`);
      return dataModule(resolve(dirname(path), `${name}.ts`));
    },
  });
  return exports;
}
const characterAssets = dataModule('src/game/motion-art.ts').characterLoadingAssets as number[];
const art = dataModule('src/game/art.ts');
const stageArt = art.gameStageArt as Record<string, number>;
const npcArt = art.gameCharacterArt as Record<string, number>;
const activities = dataModule('src/game/activity-art.ts').activityArt as Record<string, number>;
const rooms = dataModule('src/game/challenges/room-layout.ts');

/** Run the installed SDK57 Asset implementation, with only native/image I/O isolated. */
function sdk(platform: 'android' | 'web') {
  let downloads = 0;
  const exports: Record<string, unknown> = {};
  const dependencies: Record<string, unknown> = {
    '@react-native/assets-registry/registry': { getAssetByID: (id: number) => registry.get(id) },
    'expo-modules-core': { Platform: { OS: platform } },
    './AssetSources': {},
    './AssetUris': { getFilename: (uri: string) => uri.split('/').at(-1), getFileExtension: () => '.webp' },
    './ExpoAsset': { downloadAsync: async (uri: string) => { downloads++; assert.ok([...registry.values()].some((item) => item.uri === uri)); return uri; } },
    './ImageAssets': { isImageType: () => true, getImageInfoAsync: async (uri: string) => { const record = [...registry.values()].find((item) => item.uri === uri); assert.ok(record); return record; } },
    './LocalAssets': { getLocalAssetUri: () => null },
    './PlatformUtils': { IS_ENV_WITH_LOCAL_ASSETS: false },
    './resolveAssetSource': { __esModule: true, default: (id: number) => ({ uri: registry.get(id)?.name }) },
  };
  runInNewContext(ts.transpileModule(readFileSync(resolve('node_modules/expo-asset/src/Asset.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require(name: string) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return { Asset: exports.Asset as { loadAsync(ids: unknown[]): Promise<{ downloaded: boolean }[]>; fromModule(id: number): unknown }, downloads: () => downloads };
}

test('all actual lessons/questions, stages and practices reference decodable existing artwork', async () => {
  const batches: { key: string; assets: number[] }[] = [];
  for (const lesson of [...lessons, ...bonusLessons])
    for (const exercise of lesson.exercises) batches.push({ key: `${lesson.id}/${exercise.id}`, assets: [...characterAssets] });
  for (const stage of Object.keys(stageArt)) batches.push({ key: `stage:${stage}`, assets: [...characterAssets, stageArt[stage]] });
  for (const challenge of challengeCatalog) {
    const room = (rooms.roomForChallenge as (id: string) => { id: string } | undefined)(challenge.id);
    batches.push({ key: `practice:${challenge.id}`, assets: [...characterAssets, stageArt[challenge.stage], npcArt[challenge.npc], ...(challenge.id.includes('library') ? [activities.library] : challenge.id.includes('club') ? [activities.club] : []), ...(room ? [(rooms.storyRoomArt as Record<string, number>)[room.id]] : [])] });
  }
  assert.equal(lessons.length, 32);
  assert.equal(new Set(lessons.map((lesson) => lesson.missionId)).size, 8);
  assert.equal(bonusLessons.length, 8);
  assert.equal(challengeCatalog.length, 24);
  const native = sdk('android');
  for (const batch of batches) {
    assert.ok(batch.assets.every((id) => Number.isInteger(id) && id > 0 && registry.has(id)), batch.key);
    const result = await native.Asset.loadAsync(batch.assets);
    assert.equal(result.length, batch.assets.length, batch.key);
    assert.ok(result.every((item) => item.downloaded), batch.key);
  }
  assert.equal(native.downloads(), 0, 'SDK confirms local image resources without a network download');
  assert.throws(() => native.Asset.fromModule(0), /missing from the asset registry/);
});

test('actual SDK57 web descriptors must finish image I/O before downloaded becomes true', async () => {
  const web = sdk('web');
  const descriptors = [...registry.values()].map(({ uri, width, height }) => ({ uri, width, height }));
  const result = await web.Asset.loadAsync(descriptors);
  assert.equal(result.length, registry.size);
  assert.ok(result.every((item) => item.downloaded));
  assert.equal(web.downloads(), registry.size);
});
