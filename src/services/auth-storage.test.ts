import assert from 'node:assert/strict';
import test from 'node:test';
import { createChunkedAuthStorage, type ChunkedAuthStore } from './auth-storage';

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  const values = new Map<string, string>();
  const store: ChunkedAuthStore = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      values.set(key, value);
    },
    deleteItemAsync: async (key) => {
      values.delete(key);
    },
  };
  return { values, store, storage: createChunkedAuthStorage(store) };
}

test('legacy names remain readable and Unicode chunks do not split code points', async () => {
  const { values, storage } = fixture();
  const key = 'sb:project/auth-token';
  const storedKey = 'sb_project_auth-token';
  values.set(`${storedKey}.chunks`, '2');
  values.set(`${storedKey}.0`, 'legacy ');
  values.set(`${storedKey}.1`, 'session');
  assert.equal(await storage.getItem(key), 'legacy session');
  const firstChunk = '🙂'.repeat(450);
  const value = firstChunk + 'ภาษาไทย\nnext';
  await storage.setItem(key, value);
  assert.equal(values.get(`${storedKey}.0`), firstChunk);
  assert.equal(Buffer.byteLength(values.get(`${storedKey}.0`)!, 'utf8'), 1800);
  assert.equal(values.get(`${storedKey}.1`), 'ภาษาไทย\nnext');
  assert.equal(await storage.getItem(key), value);
  await storage.setItem(key, '');
  assert.equal(await storage.getItem(key), '');
  assert.equal(values.get(`${storedKey}.chunks`), '1');
  assert.equal(values.has(`${storedKey}.1`), false);
});

test('missing chunks and malformed or out-of-bounds indexes fail closed', async () => {
  const { values, storage } = fixture();
  for (const count of ['', '0', '-1', '1.5', '33', 'Infinity', 'NaN']) {
    values.set('session.chunks', count);
    values.set('session.0', 'partial');
    assert.equal(await storage.getItem('session'), null, count);
  }
  values.set('session.chunks', '2');
  assert.equal(await storage.getItem('session'), null);
  values.delete('session.chunks');
  assert.equal(await storage.getItem('session'), null);
});

test('the 32-chunk limit preserves the previously committed session on rejection', async () => {
  const { values, storage } = fixture();
  const maximum = '🙂'.repeat(450 * 32);
  await storage.setItem('session', maximum);
  assert.equal(values.get('session.chunks'), '32');
  assert.equal(await storage.getItem('session'), maximum);
  await assert.rejects(storage.setItem('session', maximum + 'x'), /too large/);
  assert.equal(await storage.getItem('session'), maximum);
  await storage.setItem('session', 'short');
  assert.equal(values.has('session.31'), false);
  assert.equal(values.size, 2);
});

test('a concurrent read waits through index invalidation and receives the entire new session', async () => {
  const { values, store, storage } = fixture();
  await storage.setItem('session', 'old');
  const entered = deferred();
  const release = deferred();
  const write = store.setItemAsync;
  store.setItemAsync = async (key, value) => {
    if (key === 'session.0') {
      entered.resolve();
      await release.promise;
    }
    await write(key, value);
  };
  const updated = 'new'.repeat(400);
  const writing = storage.setItem('session', updated);
  await entered.promise;
  assert.equal(values.has('session.chunks'), false);
  let readCompleted = false;
  const reading = storage.getItem('session').then((value) => {
    readCompleted = true;
    return value;
  });
  await Promise.resolve();
  assert.equal(readCompleted, false);
  release.resolve();
  await writing;
  assert.equal(await reading, updated);
});

test('overlapping writes finish in call order without mixing chunks', async () => {
  const { store, storage } = fixture();
  const entered = deferred();
  const release = deferred();
  const write = store.setItemAsync;
  let holdFirst = true;
  store.setItemAsync = async (key, value) => {
    if (key === 'session.0' && holdFirst) {
      holdFirst = false;
      entered.resolve();
      await release.promise;
    }
    await write(key, value);
  };
  const first = storage.setItem('session', 'a'.repeat(1000));
  await entered.promise;
  const second = storage.setItem('session', 'b'.repeat(600));
  const reading = storage.getItem('session');
  release.resolve();
  await Promise.all([first, second]);
  assert.equal(await reading, 'b'.repeat(600));
});

test('a failed partial write hides incomplete data and does not poison queued operations', async () => {
  const { store, storage } = fixture();
  await storage.setItem('session', 'old'.repeat(400));
  const write = store.setItemAsync;
  let failOnce = true;
  store.setItemAsync = async (key, value) => {
    if (key === 'session.1' && failOnce) {
      failOnce = false;
      throw new Error('storage write failed');
    }
    await write(key, value);
  };
  const failed = assert.rejects(storage.setItem('session', 'new'.repeat(300)), /write failed/);
  const partial = storage.getItem('session');
  const recovery = storage.setItem('session', 'recovered'.repeat(200));
  const complete = storage.getItem('session');
  await failed;
  assert.equal(await partial, null);
  await recovery;
  assert.equal(await complete, 'recovered'.repeat(200));
});

test('remove waits for a running write and a later read observes the removal', async () => {
  const { values, store, storage } = fixture();
  const entered = deferred();
  const release = deferred();
  const write = store.setItemAsync;
  store.setItemAsync = async (key, value) => {
    if (key === 'session.0') {
      entered.resolve();
      await release.promise;
    }
    await write(key, value);
  };
  const writing = storage.setItem('session', 'a'.repeat(1000));
  await entered.promise;
  const removing = storage.removeItem('session');
  const reading = storage.getItem('session');
  release.resolve();
  await Promise.all([writing, removing]);
  assert.equal(await reading, null);
  assert.equal(values.size, 0);
});

test('a delayed removal cannot delete chunks belonging to a subsequent write', async () => {
  const { store, storage } = fixture();
  await storage.setItem('session', 'old'.repeat(400));
  const entered = deferred();
  const release = deferred();
  const remove = store.deleteItemAsync;
  store.deleteItemAsync = async (key) => {
    if (key === 'session.0') {
      entered.resolve();
      await release.promise;
    }
    await remove(key);
  };
  const removing = storage.removeItem('session');
  await entered.promise;
  const writing = storage.setItem('session', 'new'.repeat(300));
  const reading = storage.getItem('session');
  release.resolve();
  await Promise.all([removing, writing]);
  assert.equal(await reading, 'new'.repeat(300));
});

test('read and remove failures release their queues for later writes', async () => {
  const { store, storage } = fixture();
  await storage.setItem('session', 'old');
  const read = store.getItemAsync;
  let readFailure = true;
  store.getItemAsync = async (key) => {
    if (readFailure) {
      readFailure = false;
      throw new Error('storage read failed');
    }
    return read(key);
  };
  const failedRead = assert.rejects(storage.getItem('session'), /read failed/);
  await storage.setItem('session', 'after read failure');
  await failedRead;
  const remove = store.deleteItemAsync;
  let removeFailure = true;
  store.deleteItemAsync = async (key) => {
    if (key === 'session.0' && removeFailure) {
      removeFailure = false;
      throw new Error('storage remove failed');
    }
    await remove(key);
  };
  const failedRemove = assert.rejects(storage.removeItem('session'), /remove failed/);
  await storage.setItem('session', 'after remove failure');
  await failedRemove;
  assert.equal(await storage.getItem('session'), 'after remove failure');
});

test('an unrelated storage key remains usable while a session write is pending', async () => {
  const { store, storage } = fixture();
  const entered = deferred();
  const release = deferred();
  const write = store.setItemAsync;
  store.setItemAsync = async (key, value) => {
    if (key === 'session.0') {
      entered.resolve();
      await release.promise;
    }
    await write(key, value);
  };
  const pending = storage.setItem('session', 'session value');
  await entered.promise;
  try {
    await storage.setItem('session-code-verifier', 'verifier value');
    assert.equal(await storage.getItem('session-code-verifier'), 'verifier value');
  } finally {
    release.resolve();
  }
  await pending;
});
