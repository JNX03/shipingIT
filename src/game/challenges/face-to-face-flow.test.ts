import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { challengeById } from './catalog';
import * as logic from './logic';
import * as geometry from '../world/geometry';
import { adventureWorlds } from '../world/scenes';
import type { StoryRoomLayout } from './room-layout';
import type { FaceToFaceDockProps } from './face-to-face-dock';

type Node = {
  type: unknown;
  props: Record<string, unknown> & { children?: Node | Node[] | string };
};
const jsx = (type: unknown, props: Node['props']): Node => ({ type, props });
function find(
  node: Node | Node[] | string | undefined,
  check: (value: Node) => boolean,
): Node | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const value of node) {
      const match = find(value, check);
      if (match) return match;
    }
    return undefined;
  }
  return check(node) ? node : find(node.props.children, check);
}
function load(filename: string, modules: Record<string, unknown>, append = '') {
  const exports: Record<string, unknown> = {};
  runInNewContext(
    ts.transpileModule(readFileSync(resolve(filename), 'utf8') + append, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require(name: string) {
        if (name.endsWith('.webp')) return 1;
        assert.ok(name in modules, `Unexpected platform dependency ${name}`);
        return modules[name];
      },
    },
  );
  return exports;
}
const roomLayout = load('src/game/challenges/room-layout.ts', {
  '../world/scenes': { adventureWorlds },
});
const theme = {
  colors: {},
  radius: {},
  space: { sm: 8, page: 16 },
  fonts: {},
  typography: { body: {} },
};
const ui = {
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  '@/components/ui/button': { Button: 'Button' },
  '@/components/ui/text': { T: 'T' },
  '@/components/ui/game-icon': { GameIcon: 'GameIcon' },
  '@/theme': theme,
};

function sceneFixture(id: string) {
  const challenge = challengeById(id)!;
  const room = (roomLayout.roomForChallenge as (value: string) => StoryRoomLayout)(id);
  const values: unknown[] = [];
  let cursor = 0,
    open = false;
  const point = { ...room.spawn };
  const value = (key: 'x' | 'y') => ({ get: () => point[key] });
  const modules = {
    ...ui,
    react: {
      useState(initial: unknown) {
        const slot = cursor++;
        if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial;
        return [
          values[slot],
          (next: unknown) => {
            values[slot] = typeof next === 'function' ? next(values[slot]) : next;
          },
        ];
      },
      useRef(initial: unknown) {
        const slot = cursor++;
        if (!(slot in values)) values[slot] = { current: initial };
        return values[slot];
      },
      useEffect() {},
    },
    'react-native': {
      View: 'View',
      Pressable: 'Pressable',
      ScrollView: 'ScrollView',
      AppState: { currentState: 'active' },
      AccessibilityInfo: {},
      StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles },
    },
    'expo-image': { Image: 'Image' },
    'react-native-reanimated': {
      default: { View: 'AnimatedView' },
      useAnimatedStyle: (callback: () => unknown) => callback(),
    },
    '@/hooks/use-reduced-motion': { useMotionReduced: () => true },
    '@/hooks/use-game-audio': {
      useGameAudio: () => ({ play: async () => {}, setWorld() {}, setWalking() {}, stop() {} }),
    },
    '../components/scene-objective-panel': { SceneObjectivePanel: 'SceneObjectivePanel' },
    '../components/actor': { GameActor: 'GameActor' },
    '../components/player-avatar': { PlayerAvatar: 'PlayerAvatar' },
    '../profile-avatar-store': { useSavedProfileAvatar: () => ({ selection: {} }) },
    '../world/geometry': geometry,
    '../world/use-world-movement': {
      useWorldMovement: () => ({
        x: value('x'),
        y: value('y'),
        stop() {},
        setFacing() {},
        moving: false,
        facing: 'front',
        walk(path: geometry.WorldPoint[], arrived: () => void) {
          Object.assign(point, path.at(-1));
          arrived();
        },
      }),
    },
    './room-layout': roomLayout,
  };
  const component = load(
    'src/game/challenges/story-room.tsx',
    modules,
    '\nexport { WalkableStoryRoom as AuditRoom };',
  ).AuditRoom as (props: Record<string, unknown>) => Node;
  return {
    render() {
      cursor = 0;
      return component({
        room,
        challenge,
        draft: logic.initialChallengeDraft(challenge),
        onTalk: () => {
          open = true;
        },
        dialogueOpen: open,
        latestLine: 'I missed the lab. This second sentence belongs in the optional note.',
        dialogueDock: jsx('TextInput', { testID: 'scene-composer' }),
        onStopTalking: () => {
          open = false;
        },
      });
    },
  };
}

for (const id of [
  'explore-last-time',
  'explore-workaround',
  'explore-library-handoff',
  'explore-club-room',
]) {
  test(`${id}: talking keeps the map and both actors with the reply dock`, () => {
    const f = sceneFixture(id);
    let tree = f.render();
    const image = find(tree, (node) => node.type === 'Image')!;
    (image.props.onLoad as () => void)();
    const approach = find(
      tree,
      (node) => node.type === 'Button' && String(node.props.title).startsWith('Approach'),
    )!;
    (approach.props.onPress as () => void)();
    tree = f.render();
    const talk = find(
      tree,
      (node) => node.type === 'Button' && String(node.props.title).startsWith('Talk'),
    )!;
    (talk.props.onPress as () => void)();
    tree = f.render();
    assert.equal(find(tree, (node) => node.type === 'Image')!.props.source, image.props.source);
    assert.ok(find(tree, (node) => node.type === 'GameActor'));
    assert.ok(find(tree, (node) => node.type === 'PlayerAvatar'));
    assert.ok(find(tree, (node) => node.props.testID === 'scene-composer'));
    assert.ok(
      find(tree, (node) => node.type === 'T' && node.props.children === 'I missed the lab.'),
    );
    assert.equal(
      find(tree, (node) => node.type === 'SceneObjectivePanel'),
      undefined,
    );
  });
}

test('a map loading failure has a retry without changing the interview draft', () => {
  const f = sceneFixture('explore-workaround');
  const image = find(f.render(), (node) => node.type === 'Image')!;
  (image.props.onError as () => void)();
  const retry = find(f.render(), (node) => node.props.title === 'Retry map')!;
  assert.ok(retry);
  (retry.props.onPress as () => void)();
  assert.equal(
    find(f.render(), (node) => node.props.title === 'Retry map'),
    undefined,
  );
  assert.ok(find(f.render(), (node) => node.type === 'Image'));
});

test('the scene dock uses existing ask and pin callbacks without a transcript', () => {
  const component = load('src/game/challenges/face-to-face-dock.tsx', {
    ...ui,
    'react-native': { View: 'View', ScrollView: 'ScrollView', TextInput: 'TextInput' },
  }).FaceToFaceDock as (props: FaceToFaceDockProps) => Node;
  const challenge = challengeById('explore-last-time')!;
  const draft = logic.initialChallengeDraft(challenge);
  const actions: string[] = [];
  const props: FaceToFaceDockProps = {
    challenge,
    step: logic.nextInterviewStep(challenge, draft),
    mode: 'practice',
    busy: false,
    question: 'What happened?',
    pinFeedback: null,
    onInput() {},
    onQuestion() {},
    onMode() {},
    onAsk: () => actions.push('ask'),
    onGuided: () => actions.push('guided'),
    onPin: (id) => actions.push(id),
    onNext() {},
    onFocus() {},
    onBlur() {},
  };
  let tree = component(props);
  assert.ok(find(tree, (node) => node.type === 'TextInput'));
  (find(tree, (node) => node.props.title === 'Send')!.props.onPress as () => void)();
  (
    find(tree, (node) => node.props.testID === 'interview-guided-event')!.props
      .onPress as () => void
  )();
  const revealed = logic.replayChallenge(challenge, [
    { type: 'ask', question: props.step!.question!, replyVersion: 2 },
  ]);
  tree = component({ ...props, step: logic.nextInterviewStep(challenge, revealed) });
  assert.equal(
    find(tree, (node) => node.type === 'TextInput'),
    undefined,
  );
  (find(tree, (node) => node.props.title === 'What happened')!.props.onPress as () => void)();
  assert.deepEqual(actions, ['ask', 'guided', 'event']);
});
