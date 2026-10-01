import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Button, IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';
import { ChallengePlay } from '@/game/challenges/play';
import { initialChallengeDraft } from '@/game/challenges/logic';
import { practiceById, skillForPractice } from '@/game/practice/catalog';
import { practiceFeedback } from '@/game/practice/feedback';
import { optionalPractice, useOptionalPractice } from '@/game/practice/runtime';
import { PracticeAccess } from './access';
import { PracticeSaveStatus } from './save-status';

function PracticeExercise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = typeof id === 'string' ? practiceById(id) : undefined;
  const state = useOptionalPractice();
  const [view, setView] = useState<'play' | 'goal' | 'feedback'>('play');
  const [leaving, setLeaving] = useState(false);
  const leavePending = useRef(false);
  const leave = async () => {
    if (leavePending.current) return;
    leavePending.current = true;
    setLeaving(true);
    await optionalPractice.flush();
    const saved = optionalPractice.getSnapshot();
    if (saved.saveError && !saved.protected) {
      setLeaving(false);
      leavePending.current = false;
      return;
    }
    router.replace('/(tabs)/compete');
  };
  if (!challenge)
    return (
      <Screen
        header={
          <IconButton
            name="close"
            label="Close practice"
            onPress={() => {
              void leave();
            }}
          />
        }
        footer={
          <Button
            title="Choose a practice exercise"
            onPress={() => router.replace('/(tabs)/compete')}
          />
        }
      >
        <T variant="heading">Exercise unavailable</T>
        <T>Choose one of the six practice skills to keep going.</T>
      </Screen>
    );
  const session = state.sessions[challenge.id];
  const draft = session?.draft ?? initialChallengeDraft(challenge);
  const checked = practiceFeedback(challenge, draft);
  const ready = state.hydrated && !state.protected && !leaving;
  const feedbackVisible = view === 'feedback' && Boolean(session?.checked);
  const hideInterviewFooter = challenge.kind === 'interview' && view === 'play' && !checked.valid && !state.saveError;
  const check = () => {
    if (optionalPractice.check(challenge.id)) setView('feedback');
  };
  return (
    <Screen
      scroll={false}
      style={{ paddingTop: 0 }}
      header={
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconButton
              name="close"
              label={leaving ? 'Saving before closing practice' : 'Close practice'}
              onPress={() => {
                void leave();
              }}
            />
            <T variant="caption" style={{ flex: 1, textAlign: 'right' }}>
              PRACTICE · ATTEMPT {session?.attempt ?? 1}
            </T>
          </View>
          {challenge.kind !== 'interview' ? <T variant="subheading" numberOfLines={2}>
            {challenge.title}
          </T> : null}
        </View>
      }
      footer={
        !hideInterviewFooter ? <>
          <PracticeSaveStatus state={state} />
          {!state.saveError && challenge.kind !== 'interview' ? (
            <T variant="caption" accessibilityLiveRegion="polite">
              {state.saving
                ? 'Saving practice draft…'
                : state.hydrated
                  ? 'Device-only practice · No Sparks or Path changes'
                  : 'Loading practice draft…'}
            </T>
          ) : null}
          {feedbackVisible ? (
            <View style={{ gap: space.sm }}>
              {checked.valid ? (
                <Button
                  title="Try another attempt"
                  uppercase={false}
                  disabled={!ready || state.saving || Boolean(state.saveError)}
                  onPress={() => {
                    if (optionalPractice.anotherAttempt(challenge.id)) setView('play');
                  }}
                />
              ) : null}
              <Button
                title={checked.valid ? 'Keep exploring this draft' : 'Return to my draft'}
                variant="secondary"
                uppercase={false}
                disabled={!ready}
                onPress={() => setView('play')}
              />
            </View>
          ) : view === 'goal' ? (
            <Button
              title="Return to my draft"
              uppercase={false}
              disabled={!ready}
              onPress={() => setView('play')}
            />
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                title="Goal"
                compact
                uppercase={false}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setView('goal')}
              />
              <Button
                title={
                  challenge.kind === 'interview' ? 'Finish' : challenge.kind === 'repair' && draft.failedRuns === 0
                    ? 'Run original'
                    : 'Check my work'
                }
                uppercase={false}
                style={{ flex: 2 }}
                disabled={!ready}
                onPress={check}
              />
            </View>
          )}
        </> : undefined
      }
    >
      <Stack.Screen options={{ title: `Practice: ${challenge.title}` }} />
      {leaving ? <View accessibilityLiveRegion="polite" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: space.sm }}><ActivityIndicator color={colors.primary} /><T>Saving…</T></View> : null}
      {!state.hydrated ? (
        <View style={{ padding: space.page }}>
          <T>Loading your saved draft…</T>
        </View>
      ) : view === 'goal' ? (
        <ScrollView contentContainerStyle={{ padding: space.page, gap: space.lg }}>
          <T variant="heading">Your goal</T>
          <T>{challenge.instructions}</T>
          <T>{skillForPractice(challenge).goal}</T>
          <T variant="subheading">How to practice</T>
          <T>
            Tap a piece and then its destination, or hold and drag it. Make a version, check what
            happened, and change your draft using the feedback.
          </T>
          {challenge.kind === 'interview' ? (
            <T>
              Ask about a specific experience. The replies are authored for this fictional scenario;
              they are not live AI or real user interviews.
            </T>
          ) : null}
          {challenge.kind === 'pack' ? (
            <T>
              Tap a shelf feature to pack it. Tap a packed feature to return it. Check the build
              points and dependencies.
            </T>
          ) : null}
          {challenge.kind === 'repair' ? (
            <T>
              Run the original journey first. Editing becomes available after you see its failure.
            </T>
          ) : null}
          <T variant="small">Practice does not change your Path.</T>
        </ScrollView>
      ) : feedbackVisible ? (
        <ScrollView contentContainerStyle={{ padding: space.page, gap: space.lg }}>
          <View accessibilityLiveRegion="polite" style={{ gap: space.sm }}>
            <T variant="heading">
              {checked.valid ? 'Practice check passed' : 'Something to improve'}
            </T>
            <T selectable>{checked.message}</T>
          </View>
          {checked.rows.map((row, index) => (
            <View
              key={`${index}-${row.title}`}
              style={{
                padding: space.md,
                gap: space.xs,
                borderRadius: radius.sm,
                borderCurve: 'continuous',
                backgroundColor: row.passed ? colors.successSurface : colors.dangerSurface,
              }}
            >
              <T variant="subheading">
                {row.passed ? 'Passed' : 'Try again'} · {row.title}
              </T>
              <T selectable variant="small">
                Expected: {row.expected}
              </T>
              <T selectable variant="small">
                Your version: {row.actual}
              </T>
            </View>
          ))}
          <T variant="small">
            This check is for your practice draft. No Sparks were awarded. Your Notebook and main
            Path are unchanged.
          </T>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, minHeight: 0 }} pointerEvents={ready ? 'auto' : 'none'}>
          <ChallengePlay
            key={`${challenge.id}-${session?.attempt ?? 1}`}
            challenge={challenge}
            draft={draft}
            showTesterControls={false}
            onAction={(action) => {
              optionalPractice.act(challenge.id, action);
            }}
          />
        </View>
      )}
    </Screen>
  );
}

export function PracticeExerciseScreen() {
  return (
    <PracticeAccess>
      <PracticeExercise />
    </PracticeAccess>
  );
}
