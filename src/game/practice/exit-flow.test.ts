import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as catalog from './catalog';
import * as feedback from './feedback';
import * as logic from '../challenges/logic';
import { createPracticeSession } from './session';
import { interviewQuestionForClue } from '../challenges/registry';

type Node = { type: unknown; props: Record<string, unknown> & { children?: Node | Node[] } };
const jsx = (type: unknown, props: Node['props']): Node => ({ type, props });
const tick = () => new Promise<void>((done) => setImmediate(done));
function find(
  node: Node | Node[] | undefined,
  predicate: (value: Node) => boolean,
): Node | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const value of node) {
      const match = find(value, predicate);
      if (match) return match;
    }
    return undefined;
  }
  return predicate(node) ? node : find(node.props.children, predicate);
}

async function fixture(id = 'explore-workaround', hydrated = true, prepared?: 'heard' | 'pinned' | 'wrong-pin') {
  const session = createPracticeSession({ getItem: async () => null, setItem: async () => {} });
  if (hydrated) await session.hydrate();
  const challenge = catalog.practiceById(id);
  if (prepared && challenge) {
    for (const item of challenge.items) {
      session.act(id, { type: 'ask', question: interviewQuestionForClue(challenge, item.id)!, replyVersion: 2 });
      if (prepared !== 'heard') session.act(id, { type: 'place', item: item.id, target: prepared === 'pinned' ? item.target! : challenge.targets.find((target) => target.id !== item.target)!.id });
    }
  }
  let snapshot = session.getSnapshot();
  let resolveFlush: (() => void) | undefined;
  let fail = false;
  const values: unknown[] = [];
  let cursor = 0;
  const routes: string[] = [];
  const modules: Record<string, unknown> = {
    react: {
      useRef: (value: unknown) => ({ current: value }),
      useState(initial: unknown) {
        const slot = cursor++;
        if (!(slot in values)) values[slot] = initial;
        return [
          values[slot],
          (value: unknown) => {
            values[slot] = value;
          },
        ];
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator' },
    'expo-router': {
      router: { replace: (route: string) => routes.push(route) },
      useLocalSearchParams: () => ({ id }),
    },
    'expo-router/stack': { Stack: { Screen: 'StackScreen' } },
    '@/components/ui/button': { Button: 'Button', IconButton: 'IconButton' },
    '@/components/ui/screen': { Screen: 'Screen' },
    '@/components/ui/text': { T: 'T' },
    '@/theme': { colors: {}, radius: {}, space: {} },
    '@/game/challenges/play': { ChallengePlay: 'ChallengePlay' },
    '@/game/challenges/logic': logic,
    '@/game/practice/catalog': catalog,
    '@/game/practice/feedback': feedback,
    '@/game/practice/runtime': {
      useOptionalPractice: () => snapshot,
      optionalPractice: {
        flush: () =>
          new Promise<void>((done) => {
            resolveFlush = () => {
              if (fail)
                snapshot = { ...snapshot, saveError: 'Fixture disk full', protected: false };
              done();
            };
          }),
        getSnapshot: () => snapshot,
      },
    },
    './access': { PracticeAccess: 'PracticeAccess' },
    './save-status': { PracticeSaveStatus: 'PracticeSaveStatus' },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(resolve('src/screens/practice/exercise.tsx'), 'utf8') +
        '\nexport { PracticeExercise as AuditExercise };',
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      require(name: string) {
        assert.ok(name in modules, `Unexpected platform dependency ${name}`);
        return modules[name];
      },
    },
  );
  const component = exports.AuditExercise as () => Node;
  const render = () => {
    cursor = 0;
    return component();
  };
  const close = () => {
    const screen = find(render(), (node) => node.type === 'Screen')!;
    const control = find(screen.props.header as Node, (node) => node.type === 'IconButton')!;
    assert.equal(control.props.name, 'close');
    return control;
  };
  return {
    render,
    close,
    routes,
    finish: () => resolveFlush!(),
    fail: () => {
      fail = true;
    },
  };
}

test('the fixed close control waits for the practice flush before returning to the hub', async () => {
  const f = await fixture();
  (f.close().props.onPress as () => void)();
  assert.equal(f.routes.length, 0);
  assert.equal(f.close().props.label, 'Saving before closing practice');
  f.finish();
  await tick();
  assert.deepEqual(f.routes, ['/(tabs)/compete']);
});

test('a failed practice save leaves the draft and retry status on screen', async () => {
  const f = await fixture();
  f.fail();
  (f.close().props.onPress as () => void)();
  f.finish();
  await tick();
  assert.equal(f.routes.length, 0);
  assert.equal(f.close().props.label, 'Close practice');
  const screen = find(f.render(), (node) => node.type === 'Screen')!;
  assert.ok(find(screen.props.footer as Node, (node) => node.type === 'PracticeSaveStatus'));
  assert.ok(
    find(f.render(), (node) => node.type === 'ChallengePlay'),
    'The existing draft remains mounted',
  );
});

test('loading and unavailable exercises retain a fixed close control', async () => {
  for (const f of [await fixture('explore-workaround', false), await fixture('not-a-practice')]) {
    assert.equal(f.close().props.label, 'Close practice');
    (f.close().props.onPress as () => void)();
    f.finish();
    await tick();
    assert.deepEqual(f.routes, ['/(tabs)/compete']);
  }
});

test('interviews hide the check dock until every heard clue is pinned correctly', async () => {
  for (const prepared of [undefined, 'heard', 'wrong-pin'] as const) {
    const f = await fixture('explore-workaround', true, prepared);
    assert.equal(find(f.render(), (node) => node.type === 'Screen')!.props.footer, undefined);
  }
  const f = await fixture('explore-workaround', true, 'pinned');
  const footer = find(f.render(), (node) => node.type === 'Screen')!.props.footer as Node;
  assert.ok(find(footer, (node) => node.type === 'Button' && node.props.title === 'Finish'));
});
