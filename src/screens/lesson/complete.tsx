import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { getCompletionInfo } from '@/domain/completion';
import { revokeCompletionReceipt } from '@/domain/completion-receipt';
import { getStreak } from '@/domain/progression';
import { achievementDefinitions } from '@/data/achievements';
import { useAppStore } from '@/store/app-store';
import { useAdventure } from '@/game/store';
import { useChallenges } from '@/game/challenge-store';
import { combinedActivityDates, practiceActivityDates } from '@/game/activity';
import { GameActor } from '@/game/components/actor';
import { GameLoading } from '@/game/components/loading';
import { colors, motion } from '@/theme';
import { Celebration } from '@/components/learning/celebration';
import { EarnedSparks } from '@/components/learning/result-rewards';
import { LessonResultMetrics } from '@/components/learning/lesson-frame';
import { useLessonAudio } from '@/hooks/use-lesson-audio';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { feedback } from '@/utils/feedback';
import { nextMixedActivity } from '@/game/next-activity';
import { useLessonAccess } from '@/hooks/use-lesson-access';

export function CompletionScreen() {
  const { playCompletion } = useLessonAudio();
  const { height } = useWindowDimensions();
  const reduced = useMotionReduced();
  const { id, receipt } = useLocalSearchParams<{
    id: string;
    receipt?: string;
  }>();
  const state = useAppStore();
  const lessonAccess = useLessonAccess();
  const game = useAdventure();
  const practiceCompleted = useChallenges((store) => store.completed);
  const practiceHydrated = useChallenges((store) => store.hydrated);
  const [showSavedWork, setShowSavedWork] = useState(false);
  // Refocusing a retained result must read the revoked receipt again.
  const [, refreshReceipt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      refreshReceipt((version) => version + 1);
      return () => revokeCompletionReceipt(receipt);
    }, [receipt]),
  );
  const completion = getCompletionInfo({ id, receipt }, state);
  const earned = completion?.earned ?? 0;
  const missionData = earned > 0 ? completion?.mission : undefined;
  const nextMission = earned > 0 ? completion?.nextMission : undefined;
  const fields = completion?.projectFields ?? [];
  const newAchievements = achievementDefinitions.filter((item) =>
    completion?.newAchievements.includes(item.id),
  );
  const hasNewReward = earned > 0 || newAchievements.length > 0;
  const streak = getStreak(
    combinedActivityDates(
      state.activityDates,
      game.activityDates,
      practiceActivityDates(practiceCompleted),
    ),
  );
  const resultKey = `${id}:${earned}:${missionData?.id ?? 0}:${newAchievements.map((item) => item.id).join(',')}`;
  const announced = useRef<string | null>(null);
  const hydrated = state.hydrated && game.hydrated && practiceHydrated && lessonAccess.ready;
  useEffect(() => {
    if (!hydrated || !hasNewReward || announced.current === resultKey) return;
    announced.current = resultKey;
    void playCompletion();
    feedback(nextMission ? 'medium' : 'success');
  }, [hydrated, hasNewReward, nextMission, playCompletion, resultKey]);

  if (!hydrated && lessonAccess.error)
    return (
      <Screen footer={<Button title="Retry loading" onPress={() => void lessonAccess.refresh()} />}>
        <T>{lessonAccess.error}</T>
      </Screen>
    );
  if (!hydrated)
    return (
      <GameLoading
        message="Opening your results…"
        scene="studio"
        tip="A small step today makes the next one easier."
      />
    );
  if (!completion)
    return (
      <Screen footer={<Button title="Return to path" onPress={() => router.replace('/(tabs)')} />}>
        <T variant="title">Ready for your next lesson?</T>
        <T>Complete a lesson to see your results here.</T>
      </Screen>
    );

  const nextActivity = nextMixedActivity(
    {
      adventure: game,
      completedLessonIds: state.completedLessonIds,
      passedLessonIds: lessonAccess.passedLessonIds,
      skippedLessonIds: lessonAccess.skippedLessonIds,
      lessonCompletions: state.lessonCompletions,
      practices: practiceCompleted,
      practicesReady: practiceHydrated,
    },
    completion.lesson.id,
  );

  return (
    <Screen
      contentWidth={560}
      style={{ flexGrow: 1, justifyContent: 'center', paddingTop: 12, paddingBottom: 16, gap: 16 }}
      footer={
        <>
          <Button title={nextActivity.label} onPress={() => router.replace(nextActivity.href)} />
          {nextActivity.href !== '/(tabs)' ? (
            <Button title="Return to path" variant="quiet" onPress={() => router.replace('/(tabs)')} />
          ) : null}
        </>
      }
      footerStyle={{ borderTopWidth: 0 }}
      footerContentStyle={{ maxWidth: 520 }}
    >
      <Animated.View
        key={resultKey}
        entering={
          reduced ? undefined : FadeIn.duration(motion.base).reduceMotion(ReduceMotion.System)
        }
        style={{ gap: 16, alignItems: 'center' }}
      >
        <View
          style={{
            width: '100%',
            minHeight: height < 700 ? 140 : 184,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Celebration active={hasNewReward} replayKey={resultKey} />
          <GameActor motion={hasNewReward ? 'celebrate' : 'idle'} size={height < 700 ? 136 : 176} />
        </View>
        <View style={{ gap: 6, alignItems: 'center' }}>
          <T
            variant="title"
            accessibilityRole="header"
            style={{ textAlign: 'center', color: colors.primaryPressed }}
          >
            {missionData
              ? 'Mission complete!'
              : earned > 0
                ? 'Lesson complete!'
                : 'Practice complete!'}
          </T>
          <T style={{ textAlign: 'center', color: colors.textSecondary }}>
            {missionData ? missionData.title : completion.lesson.title}
          </T>
        </View>
        <LessonResultMetrics
          metrics={[
            {
              label: 'SPARKS',
              value: <EarnedSparks value={earned} reduced={reduced} />,
              accessibilityLabel: `${earned} Sparks earned`,
              color: '#AF7400',
            },
            {
              label: 'LESSONS',
              value: `${state.completedLessonIds.length}`,
              accessibilityLabel: `${state.completedLessonIds.length} lessons completed`,
              color: colors.primaryPressed,
            },
            {
              label: 'STREAK',
              value: `${streak}`,
              accessibilityLabel: `${streak} day streak`,
              color: '#008A79',
            },
          ]}
        />
        {nextActivity.node ? (
          <T variant="small" style={{ textAlign: 'center' }}>
            Up next: {nextActivity.node.title}
          </T>
        ) : null}
        {nextMission ? (
          <T variant="small" style={{ textAlign: 'center', color: colors.primaryPressed }}>
            Unlocked: Mission {nextMission.id} · {nextMission.title}
          </T>
        ) : null}
        {newAchievements.length ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/achievements')}
            style={{ minHeight: 48, justifyContent: 'center', width: '100%' }}
          >
            <T variant="small" style={{ textAlign: 'center', color: colors.primaryPressed }}>
              {newAchievements.length === 1 ? 'Achievement unlocked' : 'Achievements unlocked'}:{' '}
              {newAchievements.map((item) => item.title).join(', ')}
            </T>
          </Pressable>
        ) : null}
        {fields.length ? (
          <View style={{ width: '100%', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showSavedWork }}
              aria-expanded={showSavedWork}
              onPress={() => setShowSavedWork(!showSavedWork)}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <T variant="small" style={{ textAlign: 'center', color: colors.primaryPressed }}>
                {showSavedWork ? 'Hide saved work' : `See saved work (${fields.length})`}
              </T>
            </Pressable>
            {showSavedWork && missionData ? <T variant="small">{missionData.outcome}</T> : null}
            {showSavedWork
              ? fields.map((field) => (
                  <View
                    key={field.key}
                    style={{
                      padding: 12,
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: 16,
                      gap: 3,
                    }}
                  >
                    <T variant="caption" style={{ color: colors.text }}>
                      {field.label}
                    </T>
                    <T variant="small" selectable>
                      {state.project[field.key]}
                    </T>
                  </View>
                ))
              : null}
            {showSavedWork ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/notebook')}
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <T variant="button" style={{ color: colors.primaryPressed, textAlign: 'center' }}>
                  Open project
                </T>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}
