import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as access from './lesson-access';
import { initialSparkWallet, type SparkWallet } from './spark-wallet';
import { lessons } from '../data/curriculum';

function fixture(options: { cached?: SparkWallet; wallet?: SparkWallet; saveError?: string; walletError?: string } = {}) {
  let refreshed = 0;
  const state = {
    completedLessonIds: [], lessonCompletions: {}, hydrated: true, lessonAccessReady: true,
    lessonSkipWallet: options.cached ?? initialSparkWallet(), storageError: options.saveError ?? null,
    refreshLessonAccess: async () => { refreshed++; },
  };
  const modules: Record<string, unknown> = {
    react: { useEffect: (effect: () => void) => effect(), useMemo: (compute: () => unknown) => compute() },
    '../domain/lesson-access': access,
    '../store': { useAppStore: (select: (input: typeof state) => unknown) => select(state) },
    '../store/spark-wallet-store': {
      useSavedSparkWallet: () => ({ wallet: options.wallet ?? initialSparkWallet(), hydrated: true, error: options.walletError ?? null }),
      sparkWalletStore: { refresh: async () => {} },
    },
  };
  const source = ts.transpileModule(readFileSync(resolve('src/hooks/use-lesson-access.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { useLessonAccess?: () => { ready: boolean; error: string | null; refresh: () => Promise<void> } } = {};
  runInNewContext(source, { exports, require: (id: string) => {
    assert.ok(id in modules, `Unexpected platform import: ${id}`);
    return modules[id];
  } });
  return { result: exports.useLessonAccess!(), refreshed: () => refreshed };
}

test('mounting a lesson with unchanged skip receipts never refreshes/unmounts its activity', () => {
  const mounted = fixture();
  assert.equal(mounted.result.ready, true);
  assert.equal(mounted.refreshed(), 0);
});

test('normal save failures stay in the current lesson instead of replacing its retry state', () => {
  const failedSave = fixture({ saveError: 'Your latest changes could not save.' });
  assert.equal(failedSave.result.ready, true);
  assert.equal(failedSave.result.error, null);
  assert.equal(failedSave.refreshed(), 0);
});

test('a newly purchased skip waits for the durable access cache before opening a new lesson', () => {
  const wallet: SparkWallet = { ...initialSparkWallet(), purchases: [{
    id: 'skip-purchase', itemId: `skip:${lessons[0]!.id}`, targetId: lessons[0]!.id,
    kind: 'skip', price: 60, spent: 60, payment: 'earned', at: '2026-09-30T14:00:00Z',
  }] };
  const changed = fixture({ wallet });
  assert.equal(changed.result.ready, false);
  assert.equal(changed.refreshed(), 1);
});

test('wallet read errors block access and retry invokes the durable wallet refresh path', async () => {
  const failedWallet = fixture({ walletError: 'Saved wallet unavailable.' });
  assert.equal(failedWallet.result.ready, false);
  assert.equal(failedWallet.result.error, 'Saved wallet unavailable.');
  await failedWallet.result.refresh();
  assert.equal(failedWallet.refreshed(), 1);
});
