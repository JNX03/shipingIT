import { useEffect, useRef } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Celebration } from '@/components/learning/celebration';
import { EarnedSparks } from '@/components/learning/result-rewards';
import { LessonResultMetrics } from '@/components/learning/lesson-frame';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { feedback } from '@/utils/feedback';
import { useLessonAudio } from '@/hooks/use-lesson-audio';
import { useAppStore } from '@/store/app-store';
import { getStreak } from '@/domain/progression';
import { colors } from '@/theme';
import { useAdventure } from '../store';
import { useChallenges } from '../challenge-store';
import { gameStageById } from '../catalog';
import { stageXP } from '../state';
import { combinedActivityDates, practiceActivityDates } from '../activity';
import { GameActor } from '../components/actor';
import { GameLoading } from '../components/loading';
import { nextMixedActivity } from '../next-activity';
import { useLessonAccess } from '@/hooks/use-lesson-access';

export function AdventureResult() {
  const { id, xp } = useLocalSearchParams<{ id: string; xp: string }>();
  const game = useAdventure();
  const practices = useChallenges();
  const lessons = useAppStore();
  const lessonAccess = useLessonAccess();
  const reduced = useMotionReduced();
  const { height } = useWindowDimensions();
  const stage = gameStageById(id);
  const announced = useRef(false);
  const { playCompletion } = useLessonAudio();
  const valid = stage && game.completed.includes(stage.id);
  const earned = valid ? Math.max(0, Math.min(stageXP[stage.id], Number(xp) || 0)) : 0;
  const streak = getStreak(combinedActivityDates(lessons.activityDates, game.activityDates, practiceActivityDates(practices.completed)));
  const nextActivity = nextMixedActivity({
    adventure: game,
    completedLessonIds: lessons.completedLessonIds,
    passedLessonIds: lessonAccess.passedLessonIds,
    skippedLessonIds: lessonAccess.skippedLessonIds,
    lessonCompletions: lessons.lessonCompletions,
    practices: practices.completed,
    practicesReady: practices.hydrated,
  });
  useEffect(() => {
    if (!valid || announced.current || !earned) return;
    announced.current = true;
    feedback('success');
    void playCompletion();
  }, [valid, earned, playCompletion]);
  if (!lessonAccess.ready && lessonAccess.error)
    return (
      <Screen footer={<Button title="Retry loading" onPress={() => void lessonAccess.refresh()} />}>
        <T>{lessonAccess.error}</T>
      </Screen>
    );
  if (!game.hydrated || !lessons.hydrated || !practices.hydrated || !lessonAccess.ready) return <GameLoading />;
  return (
    <Screen
      contentWidth={520}
      style={{ flexGrow: 1, justifyContent: 'center', paddingTop: 16, paddingBottom: 16, gap: 24 }}
      footer={
        <>
          <Button
            title={valid ? nextActivity.label : 'Return to path'}
            onPress={() => router.replace(valid ? nextActivity.href : '/(tabs)')}
          />
          {valid && nextActivity.node ? (
            <Button title="Return to path" variant="quiet" onPress={() => router.replace('/(tabs)')} />
          ) : null}
        </>
      }
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: height < 700 ? 190 : 238,
        }}
      >
        <Celebration active={earned > 0} />
        <GameActor motion={earned ? 'celebrate' : 'idle'} size={height < 700 ? 184 : 224} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <T
          variant="hero"
          accessibilityRole="header"
          style={{ color: colors.primaryPressed, textAlign: 'center' }}
        >
          {valid ? (earned ? stage.reward : 'Practice complete!') : 'Ready for your next move?'}
        </T>
        <T style={{ textAlign: 'center', color: colors.textSecondary }}>
          {valid
            ? earned
              ? stage.title
              : 'Another good run. Your earned Sparks stay yours.'
            : 'Complete a stage to see your results.'}
        </T>
      </View>
      {valid ? (
        <>
          <LessonResultMetrics
            metrics={[
              {
                label: 'SPARKS',
                value: <EarnedSparks value={earned} reduced={reduced} />,
                accessibilityLabel: `${earned} Sparks earned`,
                color: '#AF7400',
              },
              {
                label: 'STAGES',
                value: `${game.completed.length}/6`,
                accessibilityLabel: `${game.completed.length} of 6 stages completed`,
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
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(tabs)/project')}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <T variant="button" style={{ color: colors.primaryPressed, textAlign: 'center' }}>
                PLAY MY FINISHED APP
              </T>
            </Pressable>
          )}
        </>
      ) : null}
    </Screen>
  );
}
