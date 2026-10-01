import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('root bridge unlocks within a permitted gesture, respects mute/foreground and removes every listener', () => {
  const listeners = new Map<string, () => void>();
  const pageListeners = new Map<string, () => void>();
  const activation = { hasBeenActive: false, isActive: false };
  const state = { settings: { sound: true } };
  const calls = { activated: 0, synced: 0, voicesStopped: 0, detached: 0, disposed: 0, appRemoved: 0, storeRemoved: 0 };
  let cleanup = () => {};
  let appStateChanged = (_next: string) => {};
  let storeChanged = () => {};
  let attachedGate = () => false;
  const doc = {
    visibilityState: 'visible',
    addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    removeEventListener: (name: string, listener: () => void) => {
      assert.equal(listeners.get(name), listener);
      listeners.delete(name);
    },
  };
  const controller = { sync: () => { calls.synced += 1; } };
  const modules = {
    react: { useEffect: (effect: () => () => void) => { cleanup = effect(); } },
    'react-native': {
      Platform: { OS: 'web' },
      AppState: {
        currentState: 'active',
        addEventListener: (_name: string, changed: (next: string) => void) => {
          appStateChanged = changed;
          return { remove: () => { calls.appRemoved += 1; } };
        },
      },
    },
    '@/store/app-store': { useAppStore: {
      getState: () => state,
      subscribe: (changed: (next: unknown, previous: unknown) => void) => {
        storeChanged = () => changed(state, { settings: { sound: !state.settings.sound } });
        return () => { calls.storeRemoved += 1; };
      },
    } },
    '@/services/game-audio-bank': { createGameAudioBank: () => ({
      cues: {}, ambience: {}, prepare: async () => {},
      activate: () => { calls.activated += 1; }, dispose: () => { calls.disposed += 1; },
    }) },
    '@/services/game-audio-controller': { createGameAudioController: () => controller },
    '@/services/game-audio': { attachGameAudio: (_next: unknown, gate: () => boolean) => {
      attachedGate = gate;
      return () => { calls.detached += 1; };
    } },
    '@/game/speech': { stopCharacterVoice: () => { calls.voicesStopped += 1; } },
  };
  const source = ts.transpileModule(readFileSync(resolve('src/components/game-audio-bridge.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as { GameAudioBridge(): null };
  runInNewContext(source, {
    exports, require: (name: keyof typeof modules) => modules[name],
    document: doc, navigator: { userActivation: activation },
    window: {
      addEventListener: (name: string, listener: () => void) => pageListeners.set(name, listener),
      removeEventListener: (name: string, listener: () => void) => {
        assert.equal(pageListeners.get(name), listener);
        pageListeners.delete(name);
      },
    },
  });
  exports.GameAudioBridge();
  assert.equal(attachedGate(), false);
  assert.equal(calls.activated, 0);
  activation.hasBeenActive = true;
  for (const name of ['pointerdown', 'keydown', 'touchend', 'click']) listeners.get(name)!();
  assert.equal(calls.activated, 4, 'every activation must happen immediately in the handler');
  assert.equal(attachedGate(), true);
  state.settings.sound = false;
  storeChanged();
  listeners.get('click')!();
  assert.equal(attachedGate(), false);
  assert.equal(calls.activated, 4);
  state.settings.sound = true;
  appStateChanged('background');
  listeners.get('click')!();
  assert.equal(calls.activated, 4);
  appStateChanged('active');
  doc.visibilityState = 'hidden';
  listeners.get('click')!();
  assert.equal(calls.activated, 4);
  doc.visibilityState = 'visible';
  listeners.get('click')!();
  assert.equal(calls.activated, 5);
  cleanup();
  assert.equal(attachedGate(), false);
  assert.equal(listeners.size, 0);
  assert.equal(pageListeners.size, 0);
  assert.equal(calls.appRemoved, 1);
  assert.equal(calls.storeRemoved, 1);
  assert.equal(calls.detached, 1);
  assert.equal(calls.disposed, 1);
});
