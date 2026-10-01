import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { challengeById } from './catalog';
import * as logic from './logic';
import * as registry from './registry';
import type { Challenge, ChallengeAction, ChallengeDraft } from './model';

type Node = {
  type: unknown;
  props: Record<string, unknown> & { children?: Node | Node[] | string };
};
function find(
  node: Node | Node[] | string | undefined,
  predicate: (node: Node) => boolean,
): Node | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  return predicate(node) ? node : find(node.props.children, predicate);
}

/** Exercise the actual composer/hint callbacks without a native device or voice provider. */
function controls(challenge: Challenge, draft: ChallengeDraft) {
  const values: unknown[] = [];
  const dispatched: ChallengeAction[] = [];
  let cursor = 0;
  const jsx = (type: unknown, props: Node['props']): Node => ({ type, props });
  const modules: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        if (!(index in values)) values[index] = initial;
        return [
          values[index],
          (value: unknown) => {
            values[index] = value;
          },
        ];
      },
      useRef: (initial: unknown) => ({ current: initial }),
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      AppState: {},
      Pressable: 'Pressable',
      ScrollView: 'ScrollView',
      TextInput: 'TextInput',
      View: 'View',
      StyleSheet: { create: (styles: unknown) => styles },
      useWindowDimensions: () => ({ height: 800 }),
    },
    '@/components/ui/text': { T: 'T' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/learning/lesson-frame': { LessonFeedback: 'LessonFeedback' },
    '@/theme': { colors: {}, radius: {}, space: {}, typography: { body: {} } },
    '@/utils/feedback': { feedback() {} },
    '@/hooks/use-reduced-motion': { useMotionReduced: () => true },
    '../components/actor': { GameActor: 'GameActor' },
    '../speech': { readCharacterLine() {}, stopCharacterVoice() {} },
    '../components/drag-item': { DraggableItem: 'DraggableItem', pointInRect: () => false },
    './logic': logic,
    './registry': registry,
    './story-room': { StoryRoom: 'StoryRoom' },
    './face-to-face-dock': { FaceToFaceDock: 'FaceToFaceDock' },
    './room-layout': { roomForChallenge: () => undefined },
    '../interview': {
      interviewCharacter: async () => ({
        source: 'scripted',
        unavailable: true,
        text: 'Unavailable',
      }),
    },
  };
  const source = ts.transpileModule(
    readFileSync(resolve('src/game/challenges/play.tsx'), 'utf8') +
      '\nexport { Interview as InterviewForTest };',
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in modules, `Unexpected platform dependency: ${name}`);
      return modules[name];
    },
  });
  const renderInterview = exports.InterviewForTest as (props: {
    challenge: Challenge;
    draft: ChallengeDraft;
    onAction: (action: ChallengeAction) => void;
  }) => Node;
  return {
    dispatched,
    render() {
      cursor = 0;
      return renderInterview({
        challenge,
        draft,
        onAction: (action) => {
          dispatched.push(action);
          draft = logic.applyChallengeAction(challenge, draft, action);
        },
      });
    },
  };
}

for (const challenge of [
  'explore-last-time',
  'explore-workaround',
  'explore-library-handoff',
  'explore-club-room',
].map((id) => challengeById(id)!)) {
  test(
    challenge.id + ': guided ask, one pin, feedback, next clue remain usable after old turns',
    () => {
      const ui = controls(
        challenge,
        logic.replayChallenge(
          challenge,
          Array.from({ length: 30 }, () => ({
            type: 'ask' as const,
            question: 'Could you explain quantum waffles?',
          })),
        ),
      );
      for (const item of challenge.items) {
        let tree = ui.render();
        assert.ok(
          find(tree, (node) => node.type === 'TextInput'),
          'Open composer remains available',
        );
        const guided = find(tree, (node) => node.props.testID === 'interview-guided-' + item.id)!;
        assert.ok(guided, 'Current clue has a guaranteed question');
        (guided.props.onPress as () => void)();
        assert.equal(
          (ui.dispatched.at(-1) as Extract<ChallengeAction, { type: 'ask' }>).question,
          registry.interviewQuestionForClue(challenge, item.id),
        );
        tree = ui.render();
        assert.equal(
          find(
            tree,
            (node) =>
              typeof node.props.testID === 'string' &&
              node.props.testID.startsWith('interview-guided-'),
          ),
          undefined,
          'Ask next only after pinning this clue',
        );
        const wrong = challenge.targets.find((target) => target.id !== item.target)!;
        const wrongPin = find(tree, (node) => node.props.title === 'Pin under ' + wrong.title)!;
        (wrongPin.props.onPress as () => void)();
        tree = ui.render();
        assert.equal(
          find(tree, (node) => node.props.title === 'Next clue'),
          undefined,
        );
        const right = challenge.targets.find((target) => target.id === item.target)!;
        const pin = find(tree, (node) => node.props.title === 'Pin under ' + right.title)!;
        (pin.props.onPress as () => void)();
        tree = ui.render();
        const feedback = find(
          tree,
          (node) => node.type === 'LessonFeedback' && node.props.correct === true,
        );
        assert.ok(feedback, 'Immediate success feedback before next question');
        const next = find(tree, (node) => node.props.title === 'Next clue');
        if (item !== challenge.items.at(-1)) {
          assert.ok(next);
          (next.props.onPress as () => void)();
        } else assert.equal(next, undefined);
      }
      assert.equal(
        logic.checkChallenge(challenge, logic.replayChallenge(challenge, ui.dispatched)).valid,
        true,
      );
    },
  );
}
