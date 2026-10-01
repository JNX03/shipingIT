export const DRAG_TUTORIAL_STORAGE_KEY = 'shipingit:drag-tutorial:v1';
export function createDragTutorialController(storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }) {
  let loaded: Promise<void> | null = null;
  let seen = false;
  let owner: string | null = null;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());
  const load = () => loaded ??= storage.getItem(DRAG_TUTORIAL_STORAGE_KEY)
    .then((saved) => { seen = saved !== null; })
    .catch(() => { seen = true; });
  return {
    async claim(id: string) {
      await load();
      if (seen || (owner !== null && owner !== id)) return false;
      owner = id;
      publish();
      return true;
    },
    release(id: string) { if (owner === id) { owner = null; publish(); } },
    visible(id: string) { return !seen && owner === id; },
    async complete(id: string) {
      if (owner !== id || seen) return;
      seen = true;
      owner = null;
      publish();
      try { await storage.setItem(DRAG_TUTORIAL_STORAGE_KEY, 'seen'); } catch { /* Preserve this session's dismissal without touching gameplay saves. */ }
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
