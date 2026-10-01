import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GameActor } from '@/game/components/actor';
import { gameStageArt, gamePropArt } from '@/game/art';
import { useAppStore } from '@/store/app-store';
import { useAppLayout } from '@/hooks/use-app-layout';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import type { LearningGoal, StartingPoint, WorldId } from '@/domain/types';
import { feedback } from '@/utils/feedback';
import { colors, fonts, radius, space } from '@/theme';

type ChoiceData<Id extends string> = { id: Id; label: string; art: ImageSource | number };
const starts: ChoiceData<StartingPoint>[] = [
  { id: 'find-problem', label: 'I don’t have an idea yet', art: gameStageArt.explore },
  { id: 'have-idea', label: 'I have an idea', art: gameStageArt.insight },
  { id: 'have-project', label: 'I’m building a project', art: gameStageArt.design },
  { id: 'competitions', label: 'I’m preparing for a challenge', art: gameStageArt.launch },
];
const goals: ChoiceData<LearningGoal>[] = [
  { id: 'first-project', label: 'Build my first app', art: gameStageArt.design },
  { id: 'startup', label: 'Start a business', art: gameStageArt.scope },
  { id: 'portfolio', label: 'Build my portfolio', art: gamePropArt.reward },
  { id: 'competitions', label: 'Join challenges', art: gameStageArt.launch },
  { id: 'entrepreneurship', label: 'Learn entrepreneurship', art: gameStageArt.insight },
  { id: 'product-design', label: 'Learn product design', art: gameStageArt.connect },
];
const worlds: ChoiceData<WorldId>[] = [
  { id: 'school', label: 'School life', art: gameStageArt.explore },
  { id: 'community', label: 'Community', art: gameStageArt.insight },
  { id: 'environment', label: 'Environment', art: gameStageArt.scope },
  { id: 'education', label: 'Education', art: gameStageArt.explore },
  { id: 'accessibility', label: 'Accessibility', art: gameStageArt.design },
  { id: 'productivity', label: 'Productivity', art: gameStageArt.connect },
  { id: 'healthcare', label: 'Healthcare access', art: gamePropArt.evidence },
  { id: 'small-business', label: 'Small businesses', art: gameStageArt.launch },
];
const questions = [
  {
    question: 'Hi, I’m Ami! Where are you starting?',
    help: 'Pick what fits you. You’ll practice on your own with Ami.',
  },
  {
    question: 'What would you like to work toward?',
    help: 'Choose one goal to get started.',
  },
  {
    question: 'Which problems interest you most?',
    help: 'Choose one area. Your first story starts on campus.',
  },
  {
    question: 'What daily pace feels right?',
    help: 'Start small. You can change your daily goal later.',
  },
];

function IllustratedChoice({
  label,
  description,
  art,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  description?: string;
  art: ImageSource | number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const reduced = useMotionReduced();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={() => {
        feedback('selection');
        onPress();
      }}
      style={({ pressed }) => [
        styles.choice,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySurface : colors.surface,
          borderBottomWidth: pressed ? 2 : 4,
          transform: [{ translateY: pressed && !reduced ? 2 : 0 }],
        },
      ]}
    >
      <Image source={art} contentFit="contain" style={styles.choiceArt} accessible={false} alt="" />
      <View style={styles.choiceCopy}>
        <T style={{ fontFamily: fonts.bold, color: selected ? colors.primaryDeep : colors.text }}>
          {label}
        </T>
        {description ? <T variant="small">{description}</T> : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? colors.primaryDeep : colors.border }]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const { desktop, width } = useAppLayout();
  const saved = useAppStore((state) => state.profile);
  const [step, setStep] = useState(0);
  const [start, setStart] = useState<StartingPoint>(saved.startingPoint);
  const [goal, setGoal] = useState<LearningGoal>(saved.goal);
  const [world, setWorld] = useState<WorldId>(saved.world);
  const [dailyGoal, setDailyGoal] = useState<1 | 2 | 3>(saved.dailyGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingLock = useRef(false);
  const focused = useRef(true);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );
  const next = async () => {
    if (savingLock.current) return;
    if (step < 3) {
      setError('');
      setStep(step + 1);
      return;
    }
    savingLock.current = true;
    setSaving(true);
    setError('');
    try {
      const store = useAppStore.getState();
      store.completeOnboarding({
        name: store.profile.name || 'Explorer',
        startingPoint: start,
        goal,
        world,
        dailyGoal,
      });
      await useAppStore.getState().flushPersistence();
      if (!mounted.current) return;
      const failure = useAppStore.getState().storageError;
      if (failure) {
        setError('Your choices could not be saved yet. Please try again.');
        return;
      }
      if (!focused.current) return;
      router.replace('/(tabs)');
    } catch {
      if (mounted.current) setError('Your choices could not be saved yet. Please try again.');
    } finally {
      savingLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <Screen
      key={step}
      contentWidth={560}
      header={
        <View style={styles.progress}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step ? 'Previous question' : 'Back'}
            accessibilityState={{ disabled: saving, busy: saving }}
            disabled={saving}
            onPress={() => {
              if (savingLock.current) return;
              setError('');
              if (step) setStep(step - 1);
              else if (router.canGoBack()) router.back();
              else router.replace('/welcome');
            }}
            style={({ pressed }) => [styles.back, { opacity: saving ? 0.4 : pressed ? 0.6 : 1 }]}
          >
            <Icon name="back" color={colors.textSecondary} />
          </Pressable>
          <ProgressBar
            value={(step + 1) / questions.length}
            label={`Getting started, question ${step + 1} of ${questions.length}`}
          />
          <T variant="caption" style={styles.stepCount}>
            {step + 1} / {questions.length}
          </T>
        </View>
      }
      footerContentStyle={[styles.footerContent, desktop ? { alignItems: 'flex-end' } : undefined]}
      footer={
        <>
          {error ? (
            <T selectable accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
              {error}
            </T>
          ) : null}
          <Button
            title={step === 3 ? (error ? 'Try again' : 'Start exploring') : 'Continue'}
            loading={saving}
            style={desktop ? { width: 220 } : undefined}
            onPress={() => void next()}
          />
        </>
      }
    >
      <View style={styles.intro}>
        <View style={styles.question}>
          <GameActor motion="talk" size={width < 360 ? 76 : 94} />
          <View style={styles.bubble}>
            <T variant="subheading" accessibilityRole="header">
              {questions[step].question}
            </T>
          </View>
        </View>
        <T variant="small" style={styles.help}>
          {questions[step].help}
        </T>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={questions[step].question}
        style={styles.choices}
      >
        {step === 0
          ? starts.map((choice) => (
              <IllustratedChoice
                key={choice.id}
                {...choice}
                selected={start === choice.id}
                disabled={saving}
                onPress={() => setStart(choice.id)}
              />
            ))
          : step === 1
            ? goals.map((choice) => (
                <IllustratedChoice
                  key={choice.id}
                  {...choice}
                  selected={goal === choice.id}
                  disabled={saving}
                  onPress={() => setGoal(choice.id)}
                />
              ))
            : step === 2
              ? worlds.map((choice) => (
                  <IllustratedChoice
                    key={choice.id}
                    {...choice}
                    selected={world === choice.id}
                    disabled={saving}
                    onPress={() => setWorld(choice.id)}
                  />
                ))
              : ([1, 2, 3] as const).map((amount) => (
                  <IllustratedChoice
                    key={amount}
                    label={`${amount} lesson${amount === 1 ? '' : 's'} a day`}
                    description={`About ${amount * 5} minutes`}
                    art={
                      amount === 1
                        ? gameStageArt.explore
                        : amount === 2
                          ? gameStageArt.design
                          : gameStageArt.launch
                    }
                    selected={dailyGoal === amount}
                    disabled={saving}
                    onPress={() => setDailyGoal(amount)}
                  />
                ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    maxWidth: 560 - space.page * 2,
    alignSelf: 'center',
  },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontVariant: ['tabular-nums'] },
  footerContent: { maxWidth: 560 - space.page * 2 },
  intro: { gap: space.md },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md },
  bubble: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: space.lg,
    backgroundColor: colors.surface,
  },
  help: { textAlign: 'center' },
  choices: { gap: space.md },
  choice: {
    minHeight: 76,
    borderWidth: 2,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  choiceArt: { width: 46, height: 50 },
  choiceCopy: { flex: 1, gap: space.xs },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryDeep },
});
