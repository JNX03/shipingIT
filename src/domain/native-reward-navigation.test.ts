import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createInitialState } from './progression';
import * as progression from './progression';
import * as project from './project';

type Node = { type: unknown; props: Record<string, unknown> };
const jsx = (type: unknown, props: Node['props']): Node => ({ type, props });
const ui = { jsx, jsxs: jsx };
const theme = {
  colors: {},
  fonts: { bold: 'bold' },
  motion: { celebration: 650 },
  radius: {},
  space: {},
};

function load(filename: string, dependencies: Record<string, unknown>) {
  const source = ts.transpileModule(readFileSync(resolve(filename), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected platform dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

test('native reward views immediately show the actual 20, 70 and replay 0 amounts', () => {
  for (const platform of ['android', 'ios']) {
    const exports = load('src/components/learning/result-rewards.tsx', {
      react: {
        useRef: (value: unknown) => ({ current: value }),
        useEffect: (effect: () => unknown) => effect(),
      },
      'react/jsx-runtime': ui,
      'react-native': {
        Platform: { OS: platform },
        Text: 'Text',
        View: 'View',
        Pressable: 'Pressable',
        StyleSheet: { create: (styles: unknown) => styles },
        useWindowDimensions: () => ({ fontScale: 1 }),
      },
      'react-native-reanimated': {
        __esModule: true,
        default: { View: 'AnimatedView' },
        css: { keyframes: (frames: unknown) => frames },
        cubicBezier() {},
        cancelAnimation() {},
        useSharedValue: (initial: number) => {
          let value = initial;
          return {
            get: () => value,
            set: (next: number) => {
              value = next;
            },
          };
        },
        useAnimatedStyle: (style: () => unknown) => style(),
        Easing: { bezier() {} },
        ReduceMotion: { System: 'System' },
        withTiming: (value: number) => value,
      },
      'expo-router': { router: {} },
      '@/components/profile/profile-primitives': { ProfileBadge: 'ProfileBadge' },
      '@/components/ui/game-icon': { GameIcon: 'GameIcon' },
      '@/components/ui/text': { T: 'T' },
      '@/theme': theme,
    });
    const render = exports.EarnedSparks as (props: { value: number; reduced: boolean }) => Node;
    for (const reduced of [false, true]) {
      for (const value of [20, 70, 0]) {
        const view = render({ value, reduced });
        const amount = view.props.children as Node;
        assert.equal(view.props.accessibilityLabel, `${value} Sparks earned`);
        assert.equal(amount.type, 'Text');
        assert.equal(amount.props.testID, 'earned-sparks-value');
        assert.equal((amount.props.children as unknown[]).join(''), `+${value}`);
      }
    }
  }
});

test('notebook exposes the existing Back action and direct-entry Path fallback', () => {
  const routes: string[] = [];
  let canGoBack = true;
  const navigation = {
    router: {
      canGoBack: () => canGoBack,
      back: () => routes.push('back'),
      replace: (route: string) => routes.push(route),
      push() {},
    },
  };
  const platform = {
    View: 'View',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    Platform: { OS: 'android' },
  };
  const react = { useState: (value: unknown) => [value, () => {}] };
  const screen = load('src/components/ui/screen.tsx', {
    react,
    'react/jsx-runtime': ui,
    'react-native': platform,
    'expo-router': navigation,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'react-native-keyboard-controller': { KeyboardAvoidingView: 'KeyboardAvoidingView' },
    '@/theme': theme,
    './button': { IconButton: 'IconButton' },
    './text': { T: 'T' },
  });
  const state = createInitialState();
  const before = JSON.stringify(state);
  const notebook = load('src/screens/project/index.tsx', {
    react,
    'react/jsx-runtime': ui,
    'react-native': platform,
    'expo-router': navigation,
    '@/components/ui/screen': { Screen: 'Screen', PageHeader: screen.PageHeader },
    '@/components/ui/text': { T: 'T' },
    '@/components/ui/icon': { Icon: 'Icon' },
    '@/components/ui/game-icon': { GameIcon: 'GameIcon' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/progress-bar': { ProgressBar: 'ProgressBar' },
    '@/components/ui/character': { Character: 'Character', MissionArt: 'MissionArt' },
    '@/store/app-store': {
      useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
    },
    '@/domain/project': project,
    '@/domain/progression': progression,
    '@/theme': theme,
  });
  const view = (notebook.ProjectScreen as () => Node)();
  const header = view.props.header as Node;
  const toolbar = (header.type as (props: Node['props']) => Node)(header.props);
  const row = toolbar.props.children as Node[];
  const back = (row[0].props.children as Node[])[0];
  assert.equal(back.type, 'IconButton');
  assert.equal(back.props.label, 'Go back');
  (back.props.onPress as () => void)();
  canGoBack = false;
  (back.props.onPress as () => void)();
  assert.deepEqual(routes, ['back', '/(tabs)']);
  assert.equal(JSON.stringify(state), before);
});
