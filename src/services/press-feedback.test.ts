import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file: string, dependencies: Record<string, unknown>) {
  const source = ts.transpileModule(readFileSync(resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, (...args: any[]) => any> = {};
  runInNewContext(source, { exports, require: (name: string) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

test('default selection/light clicks remain audible when haptics are disabled; explicit sound opt-out is silent', () => {
  const sounds: string[] = [];
  const { feedback } = load('src/utils/feedback.ts', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-haptics': {},
    '@/store/app-store': { useAppStore: { getState: () => ({ settings: { haptics: false } }) } },
    '@/services/game-audio': { playGameSound: (cue: string) => { sounds.push(cue); return Promise.resolve(true); } },
  });
  feedback('light');
  feedback('selection', { haptic: false });
  feedback('success');
  feedback('error');
  feedback('light', { sound: false });
  assert.deepEqual(sounds, ['soft-tap', 'pin-drop', 'correct-step', 'heart-loss']);
});

test('shared buttons issue one click independent of haptics; disabled/loading buttons never commit', () => {
  const feedbacks: { kind: string; options: { sound?: string | false; haptic?: boolean } }[] = [];
  let committed = 0;
  const jsx = (type: unknown, props: any) => ({ type, props });
  const { Button, IconButton } = load('src/components/ui/button.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState: () => [false, () => {}], useEffect: () => {} },
    'react-native': { Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator' },
    'react-native-reanimated': {
      default: { View: 'Animated.View' }, useSharedValue: () => ({ get: () => 0, set: () => {} }),
      useAnimatedStyle: () => ({}),
    },
    '@/theme': { colors: {}, layout: {}, motion: {}, radius: {}, space: {} },
    './text': { T: 'T' }, './icon': { Icon: 'Icon' },
    '@/hooks/use-reduced-motion': { useMotionReduced: () => true },
    '@/utils/feedback': { feedback: (kind: string, options: { sound?: string | false; haptic?: boolean }) => feedbacks.push({ kind, options }) },
  });
  const button = Button({ title: 'Try', haptic: false, onPress: () => { committed += 1; } });
  button.props.onPress();
  assert.equal(committed, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(feedbacks)), [{ kind: 'light', options: { haptic: false, sound: 'snap' } }]);
  assert.equal(button.props.android_disableSound, true, 'system sound must not bypass the app mute');
  for (const prop of ['disabled', 'loading']) {
    Button({ title: 'Try', [prop]: true, onPress: () => { committed += 1; } }).props.onPress();
  }
  assert.equal(committed, 1);
  assert.equal(feedbacks.length, 1);
  IconButton({ name: 'x', label: 'Back', onPress: () => { committed += 1; } }).props.onPress();
  assert.equal(feedbacks.length, 2);
  assert.equal(committed, 2);
});
