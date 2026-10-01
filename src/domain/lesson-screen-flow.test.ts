import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test, { afterEach } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { getLesson, lessons, worlds } from '../data/curriculum';
import * as learningGuides from '../data/learning-guides';
import * as proLearning from '../components/subscription/pro-learning-access';
import type { ProLearningAccess } from '../components/subscription/use-pro-learning-access';
import * as progression from './progression';
import * as stepController from './lesson-step-controller';
import * as projectFeedbackModel from '../components/learning/project-feedback-model';
import { isUnitFinalLesson } from '../components/learning/unit-final-game-model';
import * as receipts from './completion-receipt';
import { getCompletionInfo } from './completion';
import { createAppStore } from '../store/createAppStore';
import type { ExerciseAnswer } from './types';

interface Node {
  type: unknown;
  props: {
    [key: string]: unknown;
    children?: Node | Node[];
    footer?: Node;
    header?: Node;
    onPress?: () => void;
    onChange?: (answer: ExerciseAnswer) => void;
    onLeave?: () => Promise<void>;
    title?: string;
    message?: string;
    disabled?: boolean;
    loading?: boolean;
  };
}

function find(node: Node | Node[] | undefined, type: string): Node | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, type);
      if (found) return found;
    }
    return undefined;
  }
  return node.type === type ? node : find(node.props.children, type);
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const colors = new Proxy({}, { get: (_target, name) => String(name) });
const theme = { colors, radius: { control: 16 }, space: { sm: 8 } };
const jsx = (type: unknown, props: Node['props']): Node => {
  // These two render-only adapters have no hooks. Execute them as React would,
  // keeping the actual QuestionInput choice while isolating the network widget.
  if (typeof type === 'function' && ['QuestionInput', 'ProjectAnswerFeedbackStub'].includes(type.name))
    return (type as (props: Node['props']) => Node)(props);
  return { type, props };
};

function loadComponent(filename: string, modules: Record<string, unknown>, append = '') {
  const source = ts.transpileModule(readFileSync(resolve(filename), 'utf8') + append, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(source, {
    exports,
    require: (dependency: string) => {
      assert.ok(dependency in modules, `Unexpected platform dependency: ${dependency}`);
      return modules[dependency];
    },
  });
  return exports;
}

/** Run actual activity callbacks with isolated hooks/platform modules and the real persistence store. */
async function activityFixture(options: { lessonId?: string; proAllowed?: boolean; exercises?: typeof lessons[number]['exercises'] } = {}) {
  const lessonId = options.lessonId ?? 'discover-1';
  const authoredLesson = getLesson(lessonId)!;
  const lesson = options.exercises ? { ...authoredLesson, exercises: options.exercises } : authoredLesson;
  let allowed = options.proAllowed ?? true;
  let verificationCalls = 0;
  const verification = {
    allowed: true,
    message: '',
    auth: {
      configured: true,
      mode: 'cloud' as const,
      identity: { id: 'lesson-flow-fixture', email: null, displayName: null },
    },
    status: {
      configured: true,
      entitled: true,
      state: 'ready' as const,
      entitlementId: 'shipingit_pro',
      expiresAt: '2030-01-01T00:00:00Z',
      managementUrl: null,
      isSandbox: true,
    },
  };
  const proAccess: ProLearningAccess = {
    get allowed() { return allowed; },
    checking: false,
    message: 'Active Pro access is required.',
    verify: async () => {
      verificationCalls++;
      return allowed;
    },
    isVerified: () => allowed,
    getVerification: () => allowed ? verification : null,
  };
  let saved: string | null = null;
  let failing = false;
  const writes: (() => void)[] = [];
  const reviewRequests: unknown[] = [];
  const store = createAppStore({
    getItem: async () => saved,
    setItem: (_key, value) =>
      new Promise<void>((resolve, reject) => {
        writes.push(() => {
          if (failing) reject(new Error('fixture disk full'));
          else {
            saved = value;
            resolve();
          }
        });
      }),
  });
  await store.getState().hydrate();
  const hooks: unknown[] = [];
  const navigations: { pathname: string; params?: { id: string; receipt: string } }[] = [];
  let cursor = 0;
  let mounted = true;
  let staleUpdates = 0;
  let effectCleanup: (() => void) | undefined;
  let focusCallback: (() => () => void) | undefined;
  let focusCleanup: (() => void) | undefined;
  const react = {
    useState(value: unknown) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof value === 'function' ? value() : value;
      return [
        hooks[index],
        (next: unknown) => {
          if (!mounted) staleUpdates++;
          hooks[index] = typeof next === 'function' ? next(hooks[index]) : next;
        },
      ];
    },
    useRef(value: unknown) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: value };
      return hooks[index];
    },
    useEffect(callback: () => () => void) {
      effectCleanup ??= callback();
    },
    useCallback: (callback: unknown) => callback,
  };
  const useStore = (selector: (state: ReturnType<typeof store.getState>) => unknown) =>
    selector(store.getState());
  useStore.getState = store.getState;
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': {
      Pressable: 'Pressable',
      View: 'View',
      BackHandler: { addEventListener: () => ({ remove() {} }) },
    },
    'expo-router': {
      router: {
        replace: (route: string | (typeof navigations)[number]) =>
          navigations.push(typeof route === 'string' ? { pathname: route } : route),
        push: (pathname: string) => navigations.push({ pathname }),
      },
      useFocusEffect(callback: () => () => void) {
        if (!focusCallback) focusCleanup = callback();
        focusCallback = callback;
      },
      useLocalSearchParams: () => ({ id: lessonId }),
    },
    '@/data/curriculum': { getLesson, worlds },
    '@/data/learning-guides': learningGuides,
    '@/components/subscription/pro-learning-access': proLearning,
    '@/components/subscription/use-pro-learning-access': { useProLearningAccess: () => proAccess },
    '@/components/subscription/pro-lesson-helper': { ProLessonHelper: 'ProLessonHelper' },
    '@/domain/progression': progression,
    '@/domain/lesson-step-controller': stepController,
    '@/components/learning/lesson-hearts': { LessonHearts: 'LessonHearts' },
    '@/components/learning/lesson-heart-refill': { LessonHeartRefill: 'LessonHeartRefill' },
    '@/domain/completion-receipt': receipts,
    '@/store/app-store': { useAppStore: useStore },
    '@/components/ui/screen': { Screen: 'Screen' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/text': { T: 'T' },
    '@/components/learning/exercise-input': { ExerciseInput: 'ExerciseInput' },
    '@/components/learning/unit-final-game': { UnitFinalGame: 'UnitFinalGame', isUnitFinalLesson },
    '@/components/learning/project-feedback-model': projectFeedbackModel,
    '@/components/learning/project-answer-feedback': {
      ProjectAnswerFeedback: function ProjectAnswerFeedbackStub(props: Node['props']) {
        const ref = props.ref as { current: unknown };
        ref.current = {
          requestReview(input: unknown) { reviewRequests.push(input); return true; },
          invalidate() {},
          cancel() {},
        };
        return { type: 'ProjectAnswerFeedback', props };
      },
    },
    '@/components/learning/lesson-frame': {
      LessonHeader: 'LessonHeader',
      LessonExitSheet: 'LessonExitSheet',
      LessonFeedback: 'LessonFeedback',
      LessonEntry: 'LessonEntry',
    },
    '@/theme': theme,
    '@/utils/feedback': { feedback() {} },
    '@/hooks/use-lesson-audio': {
      useLessonAudio: () => ({ playCorrect: async () => {}, playWrong: async () => {} }),
    },
    '@/hooks/use-lesson-entry': { useLessonEntry: () => ({ ready: true }) },
    '@/hooks/use-lesson-access': {
      useLessonAccess: () => ({
        ready: true,
        error: null,
        passedLessonIds: store.getState().completedLessonIds,
        skippedLessonIds: [],
        nextLesson: progression.getNextLesson(store.getState().completedLessonIds),
        unlockedLessonIds: [],
        lessonState: (id: string) => progression.getLessonState(id, store.getState().completedLessonIds),
      }),
    },
    '@/components/learning/story-intro': { StoryIntro: 'StoryIntro', StoryWordHelp: 'StoryWordHelp' },
    '@/components/learning/glossary-text': { GlossaryText: 'GlossaryText' },
    '@/game/motion-art': { characterRigArt: {} },
    '@/data/storybook': { getStoryForContent: () => undefined },
  };
  const loaded = loadComponent(
    'src/screens/lesson/index.tsx',
    modules,
    '\nexport { LessonActivity as AuditLessonActivity };',
  );
  const component = loaded.AuditLessonActivity as (props: {
    id: string;
    lesson: typeof lesson;
    proAccess?: ProLearningAccess;
  }) => Node;
  const render = () => {
    cursor = 0;
    return component({ id: lessonId, lesson, proAccess: proLearning.isProLessonId(lessonId) ? proAccess : undefined });
  };
  const renderEntry = () => {
    cursor = 0;
    return (loaded.LessonScreen as () => Node)();
  };
  const button = (tree: Node) => find(find(tree, 'Screen')!.props.footer, 'Button')!;
  const exit = (tree: Node) => find(tree, 'LessonExitSheet')!;
  const settle = async () => {
    await tick();
    while (writes.length) {
      writes.shift()!();
      await tick();
    }
  };
  const finishQuestions = async (options: { wrongFirst?: boolean } = {}) => {
    let tree = render();
    for (const [index, exercise] of lesson.exercises.entries()) {
      for (let step = 0; step < stepController.lessonStepCount(exercise); step++) {
      let answer =
        exercise.type === 'choice' || exercise.type === 'multi'
          ? exercise.correctAnswerIds
          : exercise.type === 'sort'
            ? exercise.correctOrder.slice(0, step + 1)
            : exercise.type === 'categorize'
              ? exercise.correctCategories
              : Object.fromEntries(
                  exercise.fields.map((field) => [
                    field.key,
                    'Labelled practice fixture. This note does not represent real user research.',
                  ]),
                );
      if (options.wrongFirst && index === 0 && step === 0 && exercise.type === 'categorize') {
        const item = exercise.items[0];
        const wrong = exercise.categories.find((category) => category.id !== exercise.correctCategories[item.id])!;
        answer = { [item.id]: wrong.id };
      } else if (options.wrongFirst && index === 0 && step === 0 && (exercise.type === 'choice' || exercise.type === 'multi')) {
        const wrong = exercise.options.find((option) => !exercise.correctAnswerIds.includes(option.id))!;
        answer = [wrong.id];
      } else if (options.wrongFirst && index === 0 && step === 0 && exercise.type === 'sort') {
        answer = [exercise.items.find((item) => item.id !== exercise.correctOrder[0])!.id];
      }
      find(tree, 'ExerciseInput')!.props.onChange!(answer);
      tree = render();
      button(tree).props.onPress!();
      await tick();
      tree = render();
      if (step + 1 < stepController.lessonStepCount(exercise)) {
        button(tree).props.onPress!();
        await tick();
        tree = render();
      }
      }
      if (index < lesson.exercises.length - 1) {
        button(tree).props.onPress!();
        await tick();
        tree = render();
      }
    }
    return tree;
  };
  return {
    store,
    navigations,
    render,
    renderEntry,
    button,
    exit,
    settle,
    finishQuestions,
    fail: (value: boolean) => {
      failing = value;
    },
    blur: () => focusCleanup!(),
    refocus: () => {
      focusCleanup = focusCallback!();
    },
    unmount: () => {
      focusCleanup!();
      effectCleanup!();
      mounted = false;
    },
    staleUpdates: () => staleUpdates,
    saved: () => saved,
    reviewRequests,
    setAccess: (value: boolean) => { allowed = value; },
    verificationCalls: () => verificationCalls,
  };
}

afterEach(() => receipts.revokeCompletionReceipt());

test('typing a project draft does not write globally or request AI; leaving explicitly saves it', async () => {
  const exercise = lessons[0]!.exercises.find((item) => item.type === 'project')!;
  assert.equal(exercise.type, 'project');
  if (exercise.type !== 'project') return;
  const f = await activityFixture({ exercises: [exercise] });
  const typed = Object.fromEntries(exercise.fields.map((field) => [
    field.key, 'Fictional practice draft: no interview or observation has been performed.',
  ]));
  find(f.render(), 'ExerciseInput')!.props.onChange!(typed);
  for (const field of exercise.fields) assert.equal(f.store.getState().project[field.key], '');
  assert.equal(f.saved(), null);
  assert.equal(f.reviewRequests.length, 0);
  const leaving = f.exit(f.render()).props.onLeave!();
  await f.settle();
  await leaving;
  for (const field of exercise.fields)
    assert.equal(JSON.parse(f.saved()!).project[field.key], typed[field.key]);
  assert.equal(f.store.getState().xp, 0);
  assert.deepEqual(f.store.getState().completedLessonIds, []);
  assert.equal(f.reviewRequests.length, 0);
});

test('one sticky Check/Continue action advances one category statement and loses one heart only on Check', async () => {
  const exercise = lessons.flatMap((lesson) => lesson.exercises).find((item) => item.type === 'categorize')!;
  if (exercise.type !== 'categorize') throw new Error('Missing authored categorization');
  const f = await activityFixture({ exercises: [exercise] });
  let tree = f.render();
  assert.equal(f.button(tree).props.title, 'Check');
  assert.equal(f.button(tree).props.disabled, true);
  assert.equal(find(find(tree, 'Screen')!.props.header, 'LessonHearts')!.props.count, 5);
  const item = exercise.items[0];
  const wrong = exercise.categories.find((category) => category.id !== exercise.correctCategories[item.id])!;
  find(tree, 'ExerciseInput')!.props.onChange!({ [item.id]: wrong.id });
  tree = f.render();
  assert.equal(find(find(tree, 'Screen')!.props.header, 'LessonHearts')!.props.count, 5);
  f.button(tree).props.onPress!();
  f.button(tree).props.onPress!();
  await tick();
  tree = f.render();
  assert.equal(f.button(tree).props.title, 'Continue');
  assert.equal(find(find(tree, 'Screen')!.props.header, 'LessonHearts')!.props.count, 4);
  assert.equal(find(tree, 'ExerciseInput')!.props.stepIndex, 0);
  f.button(tree).props.onPress!();
  await tick();
  tree = f.render();
  assert.equal(find(tree, 'ExerciseInput')!.props.stepIndex, 1);
  assert.equal(f.button(tree).props.title, 'Check');
  assert.equal(f.button(tree).props.disabled, true);
  assert.equal(f.store.getState().xp, 0);
});

test('a taught correction cannot turn a mistaken lesson attempt into perfect mastery', async () => {
  const f = await activityFixture();
  const final = await f.finishQuestions({ wrongFirst: true });
  f.button(final).props.onPress!();
  await f.settle();
  assert.equal(f.store.getState().xp, 20);
  assert.equal(f.store.getState().lessonCompletions['discover-1'].perfect, false);
  assert.equal(f.navigations.length, 1);
});

test('the in-lesson refill caps hearts at five without clearing the answer, mistake or notebook', async () => {
  const f = await activityFixture();
  const exercise = getLesson('discover-1')!.exercises[0];
  if (exercise.type !== 'choice' && exercise.type !== 'multi') throw new Error('Expected an authored selection question');
  let tree = f.render();
  const wrong = exercise.options.find((option) => !exercise.correctAnswerIds.includes(option.id))!;
  find(tree, 'ExerciseInput')!.props.onChange!([wrong.id]);
  tree = f.render();
  f.button(tree).props.onPress!();
  await tick();
  tree = f.render();
  assert.equal(find(find(tree, 'Screen')!.props.header, 'LessonHearts')!.props.count, 4);
  find(find(tree, 'Screen')!.props.header, 'Pressable')!.props.onPress!();
  tree = f.render();
  const sheet = find(tree, 'LessonHeartRefill')!;
  (sheet.props.onRefill as (amount: number) => void)(5);
  tree = f.render();
  assert.equal(find(find(tree, 'Screen')!.props.header, 'LessonHearts')!.props.count, 5);
  assert.equal(f.button(tree).props.title, 'Continue');
  assert.equal(find(find(tree, 'Screen')!.props.footer, 'LessonFeedback')!.props.correct, false);
  assert.equal(f.store.getState().xp, 0);
  assert.deepEqual(f.store.getState().completedLessonIds, []);
});

test('zero hearts prevents rewards and practice completion preserves notes without granting XP', async () => {
  const authored = lessons.flatMap((lesson) => lesson.exercises).find((exercise) => exercise.type === 'choice')!;
  if (authored.type !== 'choice') throw new Error('Missing choice');
  const exercises = Array.from({ length: 5 }, (_, index) => ({ ...authored, id: `heart-check-${index}` }));
  const f = await activityFixture({ exercises });
  f.store.getState().updateProject({ name: 'Keep my notebook' });
  await f.settle();
  let tree = f.render();
  for (let index = 0; index < 5; index++) {
    const wrong = authored.options.find((option) => !authored.correctAnswerIds.includes(option.id))!;
    find(tree, 'ExerciseInput')!.props.onChange!([wrong.id]);
    tree = f.render();
    f.button(tree).props.onPress!();
    await tick();
    tree = f.render();
    assert.equal(find(find(tree, 'Screen')!.props.header, 'LessonHearts')!.props.count, 4 - index);
    if (index < 4) {
      f.button(tree).props.onPress!();
      await tick();
      tree = f.render();
    }
  }
  assert.equal(f.button(tree).props.title, 'Practise without rewards');
  assert.equal(f.store.getState().xp, 0);
  f.button(tree).props.onPress!();
  tree = f.render();
  assert.equal(f.button(tree).props.title, 'Continue');
  f.button(tree).props.onPress!();
  await tick();
  tree = f.render();
  assert.equal(f.button(tree).props.title, 'Back to path');
  assert.equal(f.store.getState().xp, 0);
  assert.deepEqual(f.store.getState().completedLessonIds, []);
  assert.equal(f.store.getState().project.name, 'Keep my notebook');
  assert.equal(f.navigations.length, 0);
});

test('final completion awaits the write and retry preserves the original award and receipt', async () => {
  const f = await activityFixture();
  const tree = await f.finishQuestions();
  f.fail(true);
  f.button(tree).props.onPress!();
  f.button(tree).props.onPress!();
  await tick();
  assert.equal(f.navigations.length, 0);
  assert.equal(f.button(f.render()).props.loading, true);
  assert.equal(
    find(find(f.render(), 'Screen')?.props.header, 'LessonHeader')?.props.disabled,
    true,
  );
  await f.settle();
  assert.equal(f.navigations.length, 0);
  assert.equal(f.button(f.render()).props.title, 'Retry save');
  assert.equal(f.store.getState().xp, 20);
  f.fail(false);
  f.button(f.render()).props.onPress!();
  await f.settle();
  assert.equal(f.navigations.length, 1);
  assert.equal(f.navigations[0].pathname, '/complete');
  assert.equal(getCompletionInfo(f.navigations[0].params!, f.store.getState())?.earned, 20);
  assert.equal(JSON.parse(f.saved()!).xp, 20);
});

for (const lifecycle of ['blur', 'blur-refocus', 'unmount'] as const) {
  test(`a final save settling after ${lifecycle} cannot navigate or issue a new receipt`, async () => {
    const f = await activityFixture();
    f.button(await f.finishQuestions()).props.onPress!();
    await tick();
    if (lifecycle === 'unmount') f.unmount();
    else {
      f.blur();
      if (lifecycle === 'blur-refocus') f.refocus();
    }
    await f.settle();
    assert.equal(f.navigations.length, 0);
    assert.equal(JSON.parse(f.saved()!).completedLessonIds.includes('discover-1'), true);
    assert.equal(f.staleUpdates(), 0);
    if (lifecycle !== 'unmount') assert.equal(f.button(f.render()).props.loading, false);
  });

  test(`an exit save settling after ${lifecycle} cannot navigate`, async () => {
    const f = await activityFixture();
    const tree = await f.finishQuestions();
    const leaving = f.exit(tree).props.onLeave!();
    if (lifecycle === 'unmount') f.unmount();
    else {
      f.blur();
      if (lifecycle === 'blur-refocus') f.refocus();
    }
    await f.settle();
    await leaving;
    assert.equal(f.navigations.length, 0);
    assert.equal(JSON.parse(f.saved()!).completedLessonIds.length, 0);
    assert.equal(f.staleUpdates(), 0);
  });
}

test('exit save failure preserves questions and neutral copy never claims pending notes are saved', async () => {
  const f = await activityFixture();
  const tree = await f.finishQuestions();
  assert.match(f.exit(tree).props.message!, /save your project notes before leaving/);
  assert.equal(f.saved(), null);
  f.fail(true);
  const leaving = f.exit(tree).props.onLeave!();
  const rejected = assert.rejects(leaving, /could not save/);
  f.button(tree).props.onPress!();
  assert.equal(f.store.getState().completedLessonIds.length, 0);
  await f.settle();
  await rejected;
  assert.equal(f.navigations.length, 0);
  assert.equal(f.button(f.render()).props.loading, false);
  f.fail(false);
  const retry = f.exit(f.render()).props.onLeave!();
  await f.settle();
  await retry;
  assert.equal(f.navigations[0].pathname, '/course');
});

test('a Pro lab without access presents membership controls instead of exercises', async () => {
  const f = await activityFixture({ lessonId: 'pro-unit-1', proAllowed: false });
  const tree = f.renderEntry();
  assert.equal(find(tree, 'ExerciseInput'), undefined);
  assert.equal(find(tree, 'LessonActivity'), undefined);
  assert.equal(f.button(tree).props.title, 'Check Pro access');
  f.button(tree).props.onPress!();
  await tick();
  assert.equal(f.verificationCalls(), 1);
  assert.equal(f.store.getState().xp, 0);
  assert.deepEqual(f.store.getState().completedLessonIds, []);
});

test('a bonus answer is not checked after its verified access is invalidated', async () => {
  const f = await activityFixture({ lessonId: 'pro-unit-1' });
  const lab = learningGuides.getBonusLesson('pro-unit-1')!;
  const exercise = lab.exercises[0]!;
  assert.equal(exercise.type, 'choice');
  const tree = f.render();
  find(tree, 'ExerciseInput')!.props.onChange!(
    exercise.type === 'choice' ? exercise.correctAnswerIds : [],
  );
  f.setAccess(false);
  f.button(f.render()).props.onPress!();
  await tick();
  assert.equal(f.verificationCalls(), 1);
  assert.equal(find(find(f.render(), 'Screen')!.props.footer, 'LessonFeedback'), undefined);
  assert.equal(f.store.getState().xp, 0);
  assert.equal(f.saved(), null);
});

for (const lifecycle of ['blur', 'blur-refocus', 'unmount'] as const) {
  test(`a free answer check resolving after ${lifecycle} cannot update the old activity`, async () => {
    const f = await activityFixture();
    const tree = f.render();
    const exercise = lessons[0]!.exercises[0]!;
    assert.equal(exercise.type, 'choice');
    find(tree, 'ExerciseInput')!.props.onChange!(
      exercise.type === 'choice' ? exercise.correctAnswerIds : [],
    );
    f.button(f.render()).props.onPress!();
    if (lifecycle === 'unmount') f.unmount();
    else {
      f.blur();
      if (lifecycle === 'blur-refocus') f.refocus();
    }
    await tick();
    assert.equal(f.staleUpdates(), 0);
    assert.equal(f.store.getState().xp, 0);
    assert.equal(f.saved(), null);
    if (lifecycle !== 'unmount')
      assert.equal(find(find(f.render(), 'Screen')!.props.footer, 'LessonFeedback'), undefined);
  });

  test(`final completion verification resolving after ${lifecycle} cannot start an award`, async () => {
    const f = await activityFixture();
    f.button(await f.finishQuestions()).props.onPress!();
    if (lifecycle === 'unmount') f.unmount();
    else {
      f.blur();
      if (lifecycle === 'blur-refocus') f.refocus();
    }
    await tick();
    await f.settle();
    assert.equal(f.staleUpdates(), 0);
    assert.equal(f.store.getState().xp, 0);
    assert.deepEqual(f.store.getState().completedLessonIds, []);
    assert.equal(JSON.parse(f.saved()!).completedLessonIds.length, 0);
    assert.equal(f.navigations.length, 0);
  });
}

test('final bonus reward requires another current access check', async () => {
  const f = await activityFixture({ lessonId: 'pro-unit-1' });
  const tree = await f.finishQuestions();
  const checksBeforeFinish = f.verificationCalls();
  f.setAccess(false);
  f.button(tree).props.onPress!();
  await tick();
  await f.settle();
  assert.equal(f.verificationCalls(), checksBeforeFinish + 1);
  assert.equal(f.store.getState().xp, 0);
  assert.deepEqual(f.store.getState().completedLessonIds, []);
  assert.deepEqual(f.navigations, []);
});

test('a saved Pro lab rechecks access before receipt navigation and retries without another award', async () => {
  const f = await activityFixture({ lessonId: 'pro-unit-1' });
  const lab = learningGuides.getBonusLesson('pro-unit-1')!;
  f.button(await f.finishQuestions()).props.onPress!();
  await tick();
  assert.equal(f.store.getState().xp, lab.xp);
  assert.equal(f.saved(), null, 'the pending disk write is not represented as saved');
  f.setAccess(false);
  await f.settle();
  assert.equal(JSON.parse(f.saved()!).xp, lab.xp);
  assert.equal(f.navigations.length, 0, 'invalidated access cannot issue the result navigation');
  f.setAccess(true);
  f.button(f.render()).props.onPress!();
  await tick();
  await f.settle();
  assert.equal(f.navigations.length, 1);
  assert.equal(f.navigations[0].pathname, '/complete');
  assert.equal(getCompletionInfo(f.navigations[0].params!, f.store.getState())?.earned, lab.xp);
  assert.equal(f.store.getState().xp, lab.xp);
  assert.deepEqual(f.store.getState().completedLessonIds, [lab.id]);
});

test('answer radios and checkboxes expose checked state while sort actions remain buttons', () => {
  const component = loadComponent('src/components/learning/lesson-answer-visual.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      Pressable: 'Pressable',
      View: 'View',
      StyleSheet: { create: (styles: unknown) => styles },
    },
    '@/components/ui/icon': { Icon: 'Icon' },
    '@/components/ui/text': { T: 'T' },
    '@/hooks/use-app-layout': { useAppLayout: () => ({ desktop: false }) },
    '@/hooks/use-reduced-motion': { useMotionReduced: () => true },
    '@/theme': theme,
    '@/utils/feedback': { feedback() {} },
  }).LessonAnswerVisual as (props: Record<string, unknown>) => Node;
  for (const role of ['radio', 'checkbox', 'button']) {
    for (const selected of [false, true]) {
      const control = component({ label: 'Fixture answer', selected, role, onPress() {} });
      const state = control.props.accessibilityState as { checked?: boolean; selected?: boolean };
      assert.equal(control.props.accessibilityRole, role);
      assert.equal(control.props['aria-checked'], role === 'button' ? undefined : selected);
      assert.equal(state.checked, role === 'button' ? undefined : selected);
      assert.equal(control.props['aria-selected'], undefined);
      assert.equal(state.selected, undefined);
    }
  }
});
