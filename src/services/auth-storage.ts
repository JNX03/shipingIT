export interface ChunkedAuthStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const MAX_CHUNKS = 32;
const safeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

/** Preserve the existing native storage format while keeping each session operation atomic. */
export function createChunkedAuthStorage(store: ChunkedAuthStore) {
  const queues = new Map<string, Promise<void>>();

  function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const result = (queues.get(key) ?? Promise.resolve()).then(operation);
    // A failed operation is reported to its caller but must not poison the next operation.
    const settled = result.then(
      () => {},
      () => {},
    );
    queues.set(key, settled);
    void settled.then(() => {
      if (queues.get(key) === settled) queues.delete(key);
    });
    return result;
  }

  return {
    getItem(key: string): Promise<string | null> {
      return serialize(key, async () => {
        const k = safeKey(key);
        const count = Number(await store.getItemAsync(`${k}.chunks`));
        if (!Number.isInteger(count) || count < 1 || count > MAX_CHUNKS) return null;
        const chunks: string[] = [];
        for (let i = 0; i < count; i++) {
          const chunk = await store.getItemAsync(`${k}.${i}`);
          if (chunk === null) return null;
          chunks.push(chunk);
        }
        return chunks.join('');
      });
    },
    setItem(key: string, value: string): Promise<void> {
      return serialize(key, async () => {
        const k = safeKey(key);
        // 450 Unicode code points fit within 1,800 UTF-8 bytes, including non-Latin metadata.
        const chunks = value.match(/.{1,450}/gsu) ?? [''];
        if (chunks.length > MAX_CHUNKS) throw new Error('Session is too large to store safely.');
        const oldCount = Number(await store.getItemAsync(`${k}.chunks`)) || 0;
        // Commit the index last. A process interruption cannot expose a mixed session.
        await store.deleteItemAsync(`${k}.chunks`);
        for (let i = 0; i < chunks.length; i++) await store.setItemAsync(`${k}.${i}`, chunks[i]);
        for (let i = chunks.length; i < Math.min(oldCount, MAX_CHUNKS); i++)
          await store.deleteItemAsync(`${k}.${i}`);
        await store.setItemAsync(`${k}.chunks`, String(chunks.length));
      });
    },
    removeItem(key: string): Promise<void> {
      return serialize(key, async () => {
        const k = safeKey(key);
        const count = Math.min(Number(await store.getItemAsync(`${k}.chunks`)) || 0, MAX_CHUNKS);
        await store.deleteItemAsync(`${k}.chunks`);
        // Await every deletion before releasing the queue, including on failure.
        for (let i = 0; i < count; i++) await store.deleteItemAsync(`${k}.${i}`);
      });
    },
  };
}
