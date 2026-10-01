import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProfileAvatarStore,
  avatarForCharacter,
  defaultProfileAvatar,
  parseProfileAvatar,
  PROFILE_AVATAR_STORAGE_KEY,
  type ProfileAvatarSelection,
  type ProfileAvatarStorage,
} from './profile-avatar';

const next: ProfileAvatarSelection = {
  ...avatarForCharacter('noa', 'mint'), skinTone: 'deep', hairStyle: 'curls',
  hairColor: 'gold', eyeColor: 'green', outfitColor: 'lavender',
};
const saved = (selection: ProfileAvatarSelection) => JSON.stringify({ version: 2, selection });

function memoryStorage(raw: string | null = null) {
  const values = new Map<string, string>(raw ? [[PROFILE_AVATAR_STORAGE_KEY, raw]] : []);
  const writes: string[] = [];
  const storage: ProfileAvatarStorage = {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      writes.push(key);
      values.set(key, value);
    },
  };
  return { values, writes, storage };
}

test('new profiles load a cosmetic default without writing learning or avatar data', async () => {
  const memory = memoryStorage();
  const store = createProfileAvatarStore(memory.storage);
  await store.getState().hydrate();
  assert.deepEqual(store.getState().selection, defaultProfileAvatar);
  assert.equal(store.getState().hydrated, true);
  assert.deepEqual(memory.writes, []);
});

test('a saved character and backdrop survive a new store, using only the cosmetic key', async () => {
  const memory = memoryStorage();
  memory.values.set('shipingit:adventure:v1', 'original-adventure');
  memory.values.set('shipingit:learning:v1', 'original-learning');
  const store = createProfileAvatarStore(memory.storage);
  await store.getState().hydrate();
  assert.equal(await store.getState().save(next), true);
  const reopened = createProfileAvatarStore(memory.storage);
  await reopened.getState().hydrate();
  assert.deepEqual(reopened.getState().selection, next);
  assert.deepEqual(memory.writes, [PROFILE_AVATAR_STORAGE_KEY]);
  assert.equal(memory.values.get('shipingit:adventure:v1'), 'original-adventure');
  assert.equal(memory.values.get('shipingit:learning:v1'), 'original-learning');
});

test('failed writes retain the old saved avatar and allow the same draft to be retried', async () => {
  const memory = memoryStorage(saved(defaultProfileAvatar));
  let fail = true;
  const store = createProfileAvatarStore({
    ...memory.storage,
    async setItem(key, value) {
      if (fail) throw new Error('storage full');
      await memory.storage.setItem(key, value);
    },
  });
  await store.getState().hydrate();
  assert.equal(await store.getState().save(next), false);
  assert.deepEqual(store.getState().selection, defaultProfileAvatar);
  assert.ok(store.getState().error);
  assert.equal(store.getState().saving, false);
  fail = false;
  assert.equal(await store.getState().save(next), true);
  assert.deepEqual(store.getState().selection, next);
  assert.equal(store.getState().error, null);
});

test('failed reads block writes until a successful retry recovers the existing avatar', async () => {
  const memory = memoryStorage(saved(next));
  let fail = true;
  const store = createProfileAvatarStore({
    ...memory.storage,
    async getItem(key) {
      if (fail) throw new Error('storage busy');
      return memory.storage.getItem(key);
    },
  });
  await store.getState().hydrate();
  assert.equal(store.getState().hydrated, false);
  assert.equal(await store.getState().save(defaultProfileAvatar), false);
  assert.deepEqual(memory.writes, []);
  fail = false;
  await store.getState().hydrate();
  assert.deepEqual(store.getState().selection, next);
  assert.equal(store.getState().error, null);
});

test('a synchronous storage failure also releases hydration for retry', async () => {
  let fail = true;
  const memory = memoryStorage(saved(next));
  const store = createProfileAvatarStore({
    ...memory.storage,
    getItem(key) {
      if (fail) throw new Error('native bridge unavailable');
      return memory.storage.getItem(key);
    },
  });
  await store.getState().hydrate();
  assert.equal(store.getState().hydrated, false);
  fail = false;
  await store.getState().hydrate();
  assert.deepEqual(store.getState().selection, next);
});

test('future and malformed saved data remain untouched instead of becoming a default write', async () => {
  for (const raw of [
    'broken JSON',
    JSON.stringify({ version: 3, selection: next }),
    saved({ character: 'unknown', backdrop: 'mint' } as unknown as ProfileAvatarSelection),
  ]) {
    const memory = memoryStorage(raw);
    const store = createProfileAvatarStore(memory.storage);
    await store.getState().hydrate();
    assert.equal(store.getState().hydrated, false);
    assert.equal(await store.getState().save(next), false);
    assert.equal(memory.values.get(PROFILE_AVATAR_STORAGE_KEY), raw);
  }
});

test('concurrent hydration shares one read and saves cannot overwrite it', async () => {
  let reads = 0;
  let finishRead!: (value: string) => void;
  const reading = new Promise<string>((resolve) => {
    finishRead = resolve;
  });
  const memory = memoryStorage();
  const store = createProfileAvatarStore({
    ...memory.storage,
    async getItem() {
      reads += 1;
      return reading;
    },
  });
  const first = store.getState().hydrate();
  const second = store.getState().hydrate();
  assert.equal(await store.getState().save(defaultProfileAvatar), false);
  finishRead(saved(next));
  await Promise.all([first, second]);
  assert.equal(reads, 1);
  assert.deepEqual(store.getState().selection, next);
  assert.deepEqual(memory.writes, []);
});

test('double taps cannot write competing avatar saves', async () => {
  let finishWrite!: () => void;
  let writes = 0;
  const writing = new Promise<void>((resolve) => {
    finishWrite = resolve;
  });
  const store = createProfileAvatarStore({
    async getItem() {
      return null;
    },
    async setItem() {
      writes += 1;
      await writing;
    },
  });
  await store.getState().hydrate();
  const first = store.getState().save(next);
  assert.equal(store.getState().saving, true);
  assert.equal(await store.getState().save(defaultProfileAvatar), false);
  finishWrite();
  assert.equal(await first, true);
  assert.equal(writes, 1);
  assert.deepEqual(store.getState().selection, next);
});

test('avatar parsing strips unrelated fields and rejects unsupported selectable values', () => {
  assert.deepEqual(
    parseProfileAvatar(JSON.stringify({ version: 2, selection: { ...next, xp: 999 } })),
    next,
  );
  assert.throws(() =>
    parseProfileAvatar(JSON.stringify({ version: 2, selection: { ...next, backdrop: '#ff0000' } })),
  );
});

test('v1 choices migrate to editable fields without writing during hydration', async () => {
  const raw = JSON.stringify({ version: 1, selection: { character: 'mali', backdrop: 'rose' } });
  const memory = memoryStorage(raw);
  const store = createProfileAvatarStore(memory.storage);
  await store.getState().hydrate();
  assert.deepEqual(store.getState().selection, avatarForCharacter('mali', 'rose'));
  assert.deepEqual(memory.writes, []);
  assert.equal(memory.values.get(PROFILE_AVATAR_STORAGE_KEY), raw);
  assert.equal(await store.getState().save({ ...store.getState().selection, hairStyle: 'long', eyeColor: 'blue' }), true);
  const persisted = JSON.parse(memory.values.get(PROFILE_AVATAR_STORAGE_KEY)!);
  assert.equal(persisted.version, 2);
  assert.equal(persisted.selection.hairStyle, 'long');
  assert.equal(persisted.selection.eyeColor, 'blue');
});

test('every individual field survives save and reopen and each invalid field is rejected', async () => {
  const memory = memoryStorage();
  const store = createProfileAvatarStore(memory.storage);
  await store.getState().hydrate();
  assert.equal(await store.getState().save(next), true);
  assert.deepEqual(parseProfileAvatar(memory.values.get(PROFILE_AVATAR_STORAGE_KEY)!), next);
  for (const field of ['skinTone', 'hairStyle', 'hairColor', 'eyeColor', 'outfitColor'] as const) {
    assert.equal(await store.getState().save({ ...next, [field]: 'unavailable' }), false);
    assert.deepEqual(store.getState().selection, next);
    assert.throws(() => parseProfileAvatar(saved({ ...next, [field]: 'unavailable' } as ProfileAvatarSelection)));
    const incomplete = { ...next } as Partial<ProfileAvatarSelection>;
    delete incomplete[field];
    assert.throws(() => parseProfileAvatar(JSON.stringify({ version: 2, selection: incomplete })));
  }
});

test('the asynchronous save copies all fields before awaiting storage', async () => {
  let finish!: () => void;
  let persisted = '';
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const store = createProfileAvatarStore({
    async getItem() { return null; },
    async setItem(_key, value) { persisted = value; await pending; },
  });
  await store.getState().hydrate();
  const draft = { ...next };
  const saving = store.getState().save(draft);
  draft.hairStyle = 'crop';
  draft.eyeColor = 'violet';
  finish();
  assert.equal(await saving, true);
  assert.deepEqual(parseProfileAvatar(persisted), next);
  assert.deepEqual(store.getState().selection, next);
});
