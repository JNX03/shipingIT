import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View, Pressable } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getLesson, worlds } from '@/data/curriculum';
import { getBonusLesson } from '@/data/learning-guides';
import { canAwardLessonAttempt, checkLessonStep, continueLessonStep, createLessonAttempt, lessonStepCount, lessonStepReady, practiceLessonAttempt, recordLessonCheck } from '@/domain/lesson-step-controller';
import { LessonHearts } from '@/components/learning/lesson-hearts';
import { LessonHeartRefill } from '@/components/learning/lesson-heart-refill';
import { useLessonAccess } from '@/hooks/use-lesson-access';
import {
  ExerciseAnswer,
  Project,
  AnswerResult,
  Exercise,
  CompletionResult,
  Lesson,
} from '@/domain/types';
import { useAppStore } from '@/store/app-store';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { ExerciseInput } from '@/components/learning/exercise-input';
import { UnitFinalGame, isUnitFinalLesson, type UnitFinalGameProps } from '@/components/learning/unit-final-game';
import { ProjectAnswerFeedback, type ProjectAnswerFeedbackHandle } from '@/components/learning/project-answer-feedback';
import { createProjectDraftBuffer } from '@/components/learning/project-feedback-model';
import {
  LessonHeader,
  LessonExitSheet,
  LessonFeedback,
  LessonEntry,
} from '@/components/learning/lesson-frame';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';
import { useLessonAudio } from '@/hooks/use-lesson-audio';
import { useLessonEntry } from '@/hooks/use-lesson-entry';
import { StoryIntro } from '@/components/learning/story-intro';
import { GlossaryText } from '@/components/learning/glossary-text';
import { characterRigArt } from '@/game/motion-art';
import { getStoryForContent } from '@/data/storybook';
import { issueCompletionReceipt, revokeCompletionReceipt } from '@/domain/completion-receipt';
import { isProLessonId } from '@/components/subscription/pro-learning-access';
import {
  useProLearningAccess,
  type ProLearningAccess,
} from '@/components/subscription/use-pro-learning-access';
import { ProLessonHelper } from '@/components/subscription/pro-lesson-helper';

function QuestionInput(props: UnitFinalGameProps) {
  return isUnitFinalLesson(props.lesson)
    ? <UnitFinalGame {...props} />
    : <ExerciseInput {...props} />;
}

function initialAnswer(exercise: Exercise, project: Project): ExerciseAnswer {
  return exercise.type === 'project'
    ? Object.fromEntries(exercise.fields.map((field) => [field.key, project[field.key]]))
    : exercise.type === 'categorize'
      ? {}
      : [];
}
export function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [startedLesson, setStartedLesson] = useState('');
  const hydrated = useAppStore((s) => s.hydrated);
  const lessonAccess = useLessonAccess();
  const isPro = isProLessonId(id);
  const proAccess = useProLearningAccess(isPro, id);
  const lesson = isPro ? (proAccess.allowed ? getBonusLesson(id) : undefined) : getLesson(id);
  const entry = useLessonEntry(
    `library:${id}`,
    hydrated && (isPro || lessonAccess.ready),
    lesson && isUnitFinalLesson(lesson) ? Object.values(characterRigArt) : [],
  );
  if (!isPro && lessonAccess.error)
    return (
      <Screen footer={<Button title="Retry loading lessons" onPress={() => void lessonAccess.refresh()} />}>
        <T variant="title">Your progress is protected</T>
        <T>{lessonAccess.error}</T>
        <Button title="Back to path" variant="quiet" onPress={() => router.replace('/course')} />
      </Screen>
    );
  if (hydrated && ((!isPro && !lesson) || (!isPro && lessonAccess.ready && lessonAccess.lessonState(id) === 'locked')))
    return (
      <Screen footer={<Button title="Back to learn" onPress={() => router.replace('/course')} />}>
        <T variant="title">Lesson locked</T>
        <T>Finish the previous lesson to unlock this one.</T>
      </Screen>
    );
  if (isPro && proAccess.allowed && !lesson)
    return (
      <Screen footer={<Button title="Back to path" onPress={() => router.replace('/course')} />}>
        <T variant="title">This lab is getting ready</T>
        <T>Return to the path and choose an available Pro lab.</T>
      </Screen>
    );
  if (isPro && !proAccess.allowed)
    return (
      <Screen
        footer={
          <View style={{ gap: space.sm }}>
            <Button
              title={proAccess.checking ? 'Checking Pro…' : 'Check Pro access'}
              loading={proAccess.checking}
              disabled={proAccess.checking}
              onPress={() => void proAccess.verify()}
            />
            <Button
              title="View Pro membership"
              variant="secondary"
              onPress={() => router.push('/paywall')}
            />
            <Button
              title="Back to free path"
              variant="quiet"
              onPress={() => router.replace('/course')}
            />
          </View>
        }
      >
        <T variant="title">Pro bonus lab</T>
        <T accessibilityLiveRegion="polite">
          {proAccess.checking
            ? 'Verifying your current membership…'
            : proAccess.message || 'Active Pro access is required to explore this lab.'}
        </T>
        <T variant="small">The core lessons, games, and basic hints remain free.</T>
      </Screen>
    );
  if (!entry.ready)
    return (
      <LessonEntry
        entry={entry}
        message="Getting your lesson ready…"
        tip="Try one idea at a time. A hint is always nearby."
        scene="travel"
      />
    );
  // Initialize answers only after hydration. A new lesson starts a fresh activity.
  const story = getStoryForContent({ kind: 'lesson', lessonId: id });
  if (story && startedLesson !== id)
    return (
      <Screen
        header={
          <Button
            title="Back to path"
            variant="quiet"
            compact
            onPress={() => router.replace({ pathname: '/(tabs)', params: { view: 'lessons' } })}
          />
        }
        footer={<Button title="Start lesson" onPress={() => setStartedLesson(id)} />}
      >
        <StoryIntro story={story} reference={{ kind: 'lesson', lessonId: id }} />
      </Screen>
    );
  return (
    <LessonActivity key={id} id={id} lesson={lesson} proAccess={isPro ? proAccess : undefined} />
  );
}

function LessonActivity({
  id,
  lesson,
  proAccess,
}: {
  id: string;
  lesson?: Lesson;
  proAccess?: ProLearningAccess;
}) {
  const { playCorrect, playWrong } = useLessonAudio();
  const world = useAppStore((s) => s.profile.world);
  const storageError = useAppStore((s) => s.storageError);
  const project = useAppStore((s) => s.project);
  const lessonAccess = useLessonAccess();
  const complete = useAppStore((s) => s.completeLesson);
  const updateProject = useAppStore((s) => s.updateProject);
  const [index, setIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [attempt, setAttempt] = useState(createLessonAttempt);
  const [heartRefillOpen, setHeartRefillOpen] = useState(false);
  const [heartAttemptId, setHeartAttemptId] = useState(() => `lesson-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [answer, setAnswer] = useState<ExerciseAnswer>(() =>
    lesson ? initialAnswer(lesson.exercises[0], project) : [],
  );
  const projectDraft = useRef(createProjectDraftBuffer());
  const projectFeedback = useRef<ProjectAnswerFeedbackHandle>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [perfect, setPerfect] = useState(true);
  const [hint, setHint] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [guarding, setGuarding] = useState(false);
  const actionPending = useRef(false);
  const finishing = useRef(false);
  const pendingCompletion = useRef<CompletionResult | null>(null);
  const mounted = useRef(false);
  const focused = useRef(false);
  const focusEpoch = useRef(0);
  useEffect(() => {
    const epoch = focusEpoch;
    mounted.current = true;
    revokeCompletionReceipt();
    return () => {
      mounted.current = false;
      focused.current = false;
      epoch.current++;
    };
  }, []);
  const locked = !lesson || (!isProLessonId(id) && (!lessonAccess.ready || lessonAccess.lessonState(id) === 'locked'));
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      focusEpoch.current++;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (locked) return false;
        if (!finishing.current) setExiting(true);
        return true;
      });
      return () => {
        focused.current = false;
        focusEpoch.current++;
        subscription.remove();
      };
    }, [locked, setExiting]),
  );
  if (locked || !lesson)
    return (
      <Screen footer={<Button title="Back to learn" onPress={() => router.replace('/course')} />}>
        <T variant="title">Lesson locked</T>
        <T>Finish the previous lesson to unlock this one.</T>
      </Screen>
    );
  const exercise = lesson.exercises[index];
  const lessonStory = getStoryForContent({ kind: 'lesson', lessonId: id });
  const isProject = exercise.type === 'project';
  const busy = saving || guarding || Boolean(proAccess?.checking);
  const verifyAction = async () => {
    if (!proAccess) return true;
    const actionEpoch = focusEpoch.current;
    return (
      (await proAccess.verify()) &&
      mounted.current &&
      focused.current &&
      focusEpoch.current === actionEpoch &&
      proAccess.isVerified()
    );
  };
  const check = async () => {
    if (finishing.current || actionPending.current || result || (!attempt.practice && attempt.hearts === 0) || !lessonStepReady(exercise, answer, stepIndex)) return;
    const actionEpoch = focusEpoch.current;
    actionPending.current = true;
    if (proAccess) setGuarding(true);
    try {
      if (
        !(await verifyAction()) ||
        !mounted.current ||
        !focused.current ||
        focusEpoch.current !== actionEpoch
      ) return;
      const checked = checkLessonStep(exercise, answer, stepIndex);
      if (exercise.type === 'project')
        projectFeedback.current?.requestReview({
          lessonId: id, lessonTitle: lesson.title, exercise,
          answer: projectDraft.current.read(exercise.id, answer as Partial<Project>),
        });
      setResult(checked);
      setAttempt((current) => recordLessonCheck(current, checked.correct));
      if (!checked.correct) setPerfect(false);
      feedback(checked.correct ? 'success' : 'error');
      void (checked.correct ? playCorrect() : playWrong());
      if (isProject && checked.correct) updateProject(answer as Partial<Project>);
    } finally {
      actionPending.current = false;
      if (mounted.current) setGuarding(false);
    }
  };
  const saveBeforeLeaving = async () => {
    const store = useAppStore.getState();
    if (isProject && mounted.current && focused.current)
      projectDraft.current.commit(exercise.id, answer as Partial<Project>, store.updateProject);
    if (store.storageError) await store.retryPersistence();
    else await store.flushPersistence();
    const failure = useAppStore.getState().storageError;
    if (failure) throw new Error(failure);
  };
  const next = async () => {
    if (finishing.current || actionPending.current || !result || (!attempt.practice && attempt.hearts === 0)) return;
    const actionEpoch = focusEpoch.current;
    actionPending.current = true;
    if (proAccess) setGuarding(true);
    const allowed = await verifyAction();
    actionPending.current = false;
    if (mounted.current) setGuarding(false);
    if (
      !allowed ||
      !mounted.current ||
      !focused.current ||
      focusEpoch.current !== actionEpoch
    ) return;
    const continued = continueLessonStep(exercise, answer, stepIndex);
    if (!continued.finished) {
      setAnswer(continued.answer);
      setStepIndex(continued.position);
      setResult(null);
      setHint(false);
      return;
    }
    if (index + 1 < lesson.exercises.length) {
      setIndex(index + 1);
      setStepIndex(0);
      setAnswer(initialAnswer(lesson.exercises[index + 1], useAppStore.getState().project));
      setResult(null);
      setHint(false);
      setShowExample(false);
      setError('');
      return;
    }
    if (!canAwardLessonAttempt(attempt)) {
      if (attempt.practice) {
        finishing.current = true;
        setSaving(true);
        setError('');
        try {
          await saveBeforeLeaving();
          if (mounted.current && focused.current && focusEpoch.current === actionEpoch)
            setPracticeFinished(true);
        } catch (failure) {
          if (mounted.current)
            setError(failure instanceof Error ? failure.message : 'Could not save your notes. Please retry.');
        } finally {
          finishing.current = false;
          if (mounted.current) setSaving(false);
        }
      }
      return;
    }
    finishing.current = true;
    const saveEpoch = focusEpoch.current;
    setSaving(true);
    setSaveFailed(false);
    setError('');
    try {
      // A failed disk save must retry the same award, not complete the lesson again.
      const completionOptions = { perfect: perfect && attempt.mistakes === 0, proVerification: proAccess?.getVerification() };
      const earned = pendingCompletion.current ?? complete(id, completionOptions);
      if (!earned.success) {
        setError(earned.reason ?? 'Please finish the project task before continuing.');
        return;
      }
      pendingCompletion.current = earned;
      await saveBeforeLeaving();
      if (proAccess && !(await verifyAction())) return;
      // A successful save may outlive this screen or a blur/refocus cycle.
      if (!mounted.current || !focused.current || focusEpoch.current !== saveEpoch) return;
      const receipt = issueCompletionReceipt(id, earned);
      router.replace({
        pathname: '/complete',
        params: {
          id,
          receipt: receipt ?? '',
        },
      });
    } catch (failure) {
      if (mounted.current) {
        setSaveFailed(pendingCompletion.current !== null);
        setError(failure instanceof Error ? failure.message : 'Could not save. Please try again.');
      }
    } finally {
      finishing.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const exhausted = !attempt.practice && attempt.hearts === 0;
  const restart = () => {
    if (busy || finishing.current || actionPending.current) return;
    setIndex(0);
    setStepIndex(0);
    setAnswer(initialAnswer(lesson.exercises[0], useAppStore.getState().project));
    setAttempt(createLessonAttempt());
    setHeartAttemptId(`lesson-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);
    setResult(null);
    setPerfect(true);
    setHint(false);
    setShowExample(false);
    setError('');
    setSaveFailed(false);
    pendingCompletion.current = null;
    revokeCompletionReceipt();
  };
  if (practiceFinished)
    return (
      <Screen footer={<Button title="Back to path" onPress={() => router.replace('/(tabs)')} />}>
        <T variant="title">Practice finished</T>
        <T>Your notebook is kept. This practice attempt earned no Sparks or mastery.</T>
        <Button title="Try the lesson with 5 hearts" onPress={() => { setPracticeFinished(false); restart(); }} />
      </Screen>
    );
  const footer = exhausted ? (
    <LessonFeedback correct={false} title="Out of hearts" explanation={result?.explanation || 'Your notebook is kept. Practise now or start a fresh lesson attempt.'}>
      <T variant="small">No lesson rewards were awarded. Your saved project notes stay safe.</T>
      <Button title="Practise without rewards" onPress={() => setAttempt((current) => practiceLessonAttempt(current))} disabled={busy} />
      <Button title="Restart with 5 hearts" variant="secondary" onPress={restart} disabled={busy} />
    </LessonFeedback>
  ) : result ? (
    <LessonFeedback
      correct={result.correct}
      title={
        isProject && result.correct ? 'Project updated!' : result.correct ? 'Correct!' : 'Not quite'
      }
      explanation={result.explanation}
      error={error || undefined}
    >
      <Button
        title={saving ? 'Saving…' : saveFailed ? 'Retry save' : 'Continue'}
        variant={result.correct ? 'success' : 'danger'}
        disabled={busy}
        loading={busy}
        haptic={index + 1 === lesson.exercises.length ? false : 'light'}
        onPress={() => void next()}
      />
    </LessonFeedback>
  ) : (
    <Button
      title={saving ? 'Saving…' : isProject ? 'Save project' : 'Check'}
      disabled={busy || !lessonStepReady(exercise, answer, stepIndex)}
      loading={busy}
      haptic={false}
      onPress={() => void check()}
    />
  );
  return (
    <>
      <Screen
        key={exercise.id}
        contentWidth={560}
        footer={footer}
        footerContentStyle={{ maxWidth: 520 }}
        footerStyle={{
          backgroundColor: result || exhausted
            ? result?.correct
              ? colors.successSurface
              : colors.dangerSurface
            : colors.surface,
          borderTopWidth: 0,
          paddingTop: result ? 16 : 12,
        }}
        style={{ paddingTop: 12, paddingBottom: 16, gap: 16 }}
        header={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><LessonHeader
            label={`${lesson.title}, question ${index + 1} of ${lesson.exercises.length}`}
            progress={(index + (stepIndex + (result ? 1 : 0)) / lessonStepCount(exercise)) / lesson.exercises.length}
            disabled={busy}
            onClose={() => {
              if (!finishing.current && !actionPending.current) setExiting(true);
            }}
          /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refill lesson hearts" disabled={busy || attempt.practice} onPress={() => setHeartRefillOpen(true)} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}><LessonHearts count={attempt.hearts} practice={attempt.practice} /></Pressable>
          </View>
        }
      >
        <GlossaryText text={exercise.prompt} ids={lessonStory?.glossary ?? []} variant="title" />
        {exercise.context ? <GlossaryText text={exercise.context} ids={lessonStory?.glossary ?? []} variant="small" /> : null}
        <QuestionInput
          key={exercise.id}
          lesson={lesson}
          exercise={exercise}
          answer={answer}
          stepIndex={stepIndex}
          checked={!!result}
          disabled={!!result || busy || exhausted}
          onChange={(value) => {
            if (proAccess && !proAccess.isVerified()) return;
            if (isProject) {
              projectDraft.current.record(exercise.id, value as Partial<Project>);
              projectFeedback.current?.invalidate();
            }
            setAnswer(value);
          }}
        />
        {attempt.practice ? <T variant="small">Practice attempt · no rewards</T> : null}
        {isProject ? <ProjectAnswerFeedback key={`typed-advice-${exercise.id}`} ref={projectFeedback} localHint={exercise.hint} disabled={busy} /> : null}
        {!result ? (
          <View style={{ gap: space.sm }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hint ? 'Hide hint' : 'Get a hint'}
                accessibilityState={{ expanded: hint }}
                aria-expanded={hint}
                onPress={() => {
                  setHint(!hint);
                  setShowExample(false);
                }}
                style={{ paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' }}
              >
                <T variant="small" style={{ color: colors.primaryPressed }}>
                  {hint ? 'Hide hint' : 'Get a hint'}
                </T>
              </Pressable>
              {isProject ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showExample }}
                  aria-expanded={showExample}
                  onPress={() => {
                    setShowExample(!showExample);
                    setHint(false);
                  }}
                  style={{ paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' }}
                >
                  <T variant="small" style={{ color: colors.primaryPressed }}>
                    {showExample ? 'Hide example' : 'Practice example'}
                  </T>
                </Pressable>
              ) : null}
            </View>
            {isProject ? (
              <>
                {showExample ? (
                  <View
                    style={{
                      padding: 16,
                      gap: 8,
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radius.control,
                    }}
                  >
                    <T>{worlds.find((w) => w.id === world)?.scenario}</T>
                    <T variant="small">Use this for inspiration. Label practice notes clearly.</T>
                  </View>
                ) : null}
              </>
            ) : null}
            {hint ? (
              <T variant="small" accessibilityLiveRegion="polite">
                {exercise.hint}
              </T>
            ) : null}
            <ProLessonHelper key={`pro-help-${exercise.id}`} exercise={exercise} disabled={busy} />
          </View>
        ) : null}
      </Screen>
      {heartRefillOpen ? <LessonHeartRefill hearts={attempt.hearts} attemptId={heartAttemptId} onClose={() => setHeartRefillOpen(false)} onRefill={(amount) => setAttempt((current) => ({ ...current, hearts: Math.min(5, current.hearts + amount) }))} /> : null}
      <LessonExitSheet
        visible={exiting}
        onKeep={() => setExiting(false)}
        onLeave={async () => {
          if (finishing.current) return;
          finishing.current = true;
          const saveEpoch = focusEpoch.current;
          setSaving(true);
          try {
            await saveBeforeLeaving();
            if (mounted.current && focused.current && focusEpoch.current === saveEpoch)
              router.replace('/course');
          } finally {
            finishing.current = false;
            if (mounted.current) setSaving(false);
          }
        }}
        message={
          storageError
            ? 'Your latest notes are still in this session. Retry saving before leaving.'
            : 'We’ll save your project notes before leaving. This lesson’s questions will start again.'
        }
        error={storageError || undefined}
        leaveLabel="Leave lesson"
        keepLabel="Keep learning"
      />
    </>
  );
}
