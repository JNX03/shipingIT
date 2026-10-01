import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { lessons } from '../../data/curriculum';
import { evaluateExercise } from '../../domain/progression';
import type { ExerciseAnswer, Lesson } from '../../domain/types';
import * as model from './unit-final-game-model';

const finals = lessons.filter((lesson) => model.isUnitFinalLesson(lesson));
test('exactly the fourth core lesson in each unit has a distinct game; source IDs and answers survive', () => {
  assert.equal(finals.length, 8);
  assert.equal(
    new Set(finals.map((lesson) => model.unitFinalGameForLesson(lesson)!.layout)).size,
    8,
  );
  assert.equal(model.isUnitFinalLesson('pro-unit-1'), false);
  assert.equal(model.isUnitFinalLesson({ id: 'discover-4', missionId: 2 }), false);
  const before = JSON.stringify(finals);
  for (const lesson of finals)
    for (const exercise of lesson.exercises) {
      let answer: ExerciseAnswer =
        exercise.type === 'categorize' || exercise.type === 'project' ? {} : [];
      if (exercise.type === 'choice' || exercise.type === 'multi')
        for (const id of exercise.correctAnswerIds)
          answer = model.applyUnitFinalMove(exercise, answer, { type: 'choose', id });
      if (exercise.type === 'sort')
        for (const [index, id] of exercise.correctOrder.entries())
          answer = model.applyUnitFinalMove(exercise, answer, { type: 'sequence', id, index });
      if (exercise.type === 'categorize')
        for (const item of exercise.items)
          answer = model.applyUnitFinalMove(exercise, answer, {
            type: 'categorize',
            itemId: item.id,
            categoryId: exercise.correctCategories[item.id],
          });
      if (exercise.type === 'project')
        for (const field of exercise.fields)
          answer = model.applyUnitFinalMove(exercise, answer, {
            type: 'write',
            field: field.key,
            text: 'Practice plan, not a real test result. '.repeat(4),
          });
      assert.equal(evaluateExercise(exercise, answer).correct, true, exercise.id);
      assert.ok(model.unitFinalDraftLabels(exercise, answer).length);
      assert.equal(
        model.applyUnitFinalMove(exercise, answer, { type: 'choose', id: 'foreign-id' }),
        answer,
      );
    }
  assert.equal(
    JSON.stringify(finals),
    before,
    'The renderer never mutates catalog content or answer keys',
  );
});

test('wrong choices remain an ungraded draft until the parent checks them', () => {
  const exercise = finals[0].exercises[0];
  assert.equal(exercise.type, 'choice');
  if (exercise.type !== 'choice') return;
  const wrong = exercise.options.find((option) => !exercise.correctAnswerIds.includes(option.id))!;
  const answer = model.applyUnitFinalMove(exercise, [], { type: 'choose', id: wrong.id });
  assert.deepEqual(answer, [wrong.id]);
  assert.equal(evaluateExercise(exercise, answer).correct, false);
  const sorted = finals.find((lesson) => lesson.id === 'scope-4')!.exercises[0];
  const first = model.applyUnitFinalMove(sorted, [], { type: 'sequence', id: '0', index: 0 });
  assert.deepEqual(first, ['0'], 'Placing a step never silently supplies the correct answer');
  assert.deepEqual(
    model.applyUnitFinalMove(sorted, first, { type: 'sequence', id: '3', index: 0 }),
    ['3'],
  );
  assert.deepEqual(model.applyUnitFinalMove(sorted, [], { type: 'sequence', id: '1', index: 2 }), []);
});

type Node = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
const jsx = (type: unknown, props: Node['props']): Node => ({ type, props });
const modules: Record<string, unknown> = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': {
    Pressable: 'Pressable',
    View: 'View',
    StyleSheet: { create: (styles: unknown) => styles },
  },
  '@/components/ui/field': { Field: 'Field' },
  '@/components/ui/game-icon': { GameIcon: 'GameIcon' },
  '@/components/ui/text': { T: 'T' },
  '@/game/components/actor': { GameActor: 'GameActor' },
  '@/theme': { colors: {}, radius: {}, space: {} },
  './unit-final-game-model': model,
};
const exports: Record<string, unknown> = {};
runInNewContext(
  ts.transpileModule(readFileSync(resolve('src/components/learning/unit-final-game.tsx'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  {
    exports,
    require: (name: string) => {
      assert.ok(name in modules, name);
      return modules[name];
    },
  },
);
function nodes(value: unknown): Node[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  const node = value as Node;
  if (typeof node.type === 'function') return nodes(node.type(node.props));
  return [node, ...nodes(node.props.children)];
}
const render = exports.UnitFinalGame as (props: {
  lesson: Lesson;
  exercise: Lesson['exercises'][number];
  answer: ExerciseAnswer;
  onChange: (answer: ExerciseAnswer) => void;
  disabled: boolean;
  stepIndex: number;
  checked: boolean;
  onMistake: () => void;
}) => Node;

test('all eight real renderers emit source answers while the shared footer owns checks and hearts', () => {
  for (const lesson of finals)
    for (const exercise of lesson.exercises) {
      const changes: ExerciseAnswer[] = [];
      let mistakes = 0;
      const props = {
        lesson,
        exercise,
        answer: (exercise.type === 'project' || exercise.type === 'categorize'
          ? {}
          : []) as ExerciseAnswer,
        disabled: false,
        stepIndex: 0,
        checked: false,
        onChange: (answer: ExerciseAnswer) => changes.push(answer),
        onMistake: () => mistakes++,
      };
      const tree = nodes(render(props));
      assert.ok(
        tree.some(
          (node) =>
            node.props.testID === 'unit-final-' + model.unitFinalGameForLesson(lesson)!.layout,
        ),
      );
      assert.equal(
        tree.some((node) => node.type === 'Button'),
        false,
        'No competing Check, Next or grading buttons',
      );
      const control = tree.find((node) => node.type === 'Pressable' || node.type === 'Field')!;
      assert.ok(control, exercise.id);
      if (control.type === 'Field')
        (control.props.onChangeText as (text: string) => void)(
          'My real draft stays exactly as typed.',
        );
      else (control.props.onPress as () => void)();
      assert.equal(changes.length, 1);
      assert.equal(mistakes, 0);
      const locked = nodes(render({ ...props, checked: true }));
      const lockedControl = locked.find((node) => node.type === control.type)!;
      if (lockedControl.type === 'Field')
        (lockedControl.props.onChangeText as (text: string) => void)('Must not write');
      else (lockedControl.props.onPress as () => void)();
      assert.equal(changes.length, 1, 'Checked feedback phase protects the answer');
    }
});

test('controlled case index renders the requested statement without advancing it', () => {
  const lesson = finals.find((lesson) => lesson.id === 'validate-4')!;
  const exercise = lesson.exercises[1];
  assert.equal(exercise.type, 'categorize');
  if (exercise.type !== 'categorize') return;
  let changed: ExerciseAnswer = {};
  const tree = nodes(
    render({
      lesson,
      exercise,
      answer: {},
      onChange: (answer) => {
        changed = answer;
      },
      disabled: false,
      stepIndex: 1,
      checked: false,
      onMistake() {
        throw new Error('Parent alone owns hearts');
      },
    }),
  );
  const control = tree.find((node) => node.props.testID === 'final-category-0')!;
  (control.props.onPress as () => void)();
  assert.deepEqual(JSON.parse(JSON.stringify(changed)), { [exercise.items[1].id]: '0' });
});
