import { useCallback, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { LessonEntry, LessonExitSheet, LessonHeader } from '@/components/learning/lesson-frame';
import { useLessonEntry } from '@/hooks/use-lesson-entry';
import { useAdventure } from '../store';
import { stageIds } from '../types';
import { gameStageById } from '../catalog';
import { GameLoading } from '../components/loading';
import { ExploreStage } from '../stages/explore';
import { InsightStage } from '../stages/insight';
import { ScopeStage } from '../stages/scope';
import { DesignStage } from '../stages/design';
import { ConnectStage } from '../stages/connect';
import { LaunchStage } from '../stages/launch';
import { colors } from '@/theme';
import { gameStageArt } from '../art';
import { characterRigArt } from '../motion-art';
import { StoryIntro } from '@/components/learning/story-intro';
import { getStoryForContent } from '@/data/storybook';

const screens = {
  explore: ExploreStage,
  insight: InsightStage,
  scope: ScopeStage,
  design: DesignStage,
  connect: ConnectStage,
  launch: LaunchStage,
};

export function AdventureStageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useAdventure();
  const insets = useSafeAreaInsets();
  const finishing = useRef(false);
  const pendingResult = useRef<{ success: boolean; xp: number; message: string } | null>(null);
  const stage = gameStageById(id);
  const unlocked = !!stage && stageIds.indexOf(stage.id) <= game.completed.length;
  const entry = useLessonEntry(
    `adventure:${id}`,
    game.hydrated && unlocked,
    stage ? [...Object.values(characterRigArt), gameStageArt[stage.id]] : [],
  );
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [startedStage, setStartedStage] = useState('');
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!game.hydrated || !unlocked || !entry.ready) return false;
        if (!finishing.current) setLeaving(true);
        return true;
      });
      return () => subscription.remove();
    }, [game.hydrated, unlocked, entry.ready, setLeaving]),
  );

  if (!game.hydrated) return <GameLoading />;
  if (!stage || !unlocked)
    return (
      <Screen footer={<Button title="Back to path" onPress={() => router.replace('/(tabs)')} />}>
        <T variant="title">One step at a time</T>
        <T>Finish the previous stage to open this part of your app.</T>
      </Screen>
    );
  if (!entry.ready)
    return (
      <LessonEntry
        entry={entry}
        message={`Opening ${stage.title.toLowerCase()}…`}
        tip={stage.subtitle}
      />
    );
  const Stage = screens[stage.id];
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setSaving(true);
    setError('');
    try {
      const result = pendingResult.current ?? game.finishStage(stage.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      pendingResult.current = result;
      if (useAdventure.getState().error) await game.retry();
      else await game.flush();
      if (useAdventure.getState().error) {
        setError('Your stage is complete in this session. Retry saving to continue.');
        return;
      }
      router.replace({ pathname: '/adventure/result', params: { id: stage.id, xp: result.xp } });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Your save did not finish. Retry saving to continue.',
      );
    } finally {
      finishing.current = false;
      setSaving(false);
    }
  };
  const leave = async () => {
    if (useAdventure.getState().error) await game.retry();
    else await game.flush();
    if (useAdventure.getState().error)
      throw new Error('Your changes are still in this session. Try saving again before leaving.');
    router.replace('/(tabs)');
  };
  const retry = async () => {
    if (pendingResult.current) return finish();
    setSaving(true);
    try {
      await game.retry();
      if (!useAdventure.getState().error) setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Your save did not finish. Please retry.',
      );
    } finally {
      setSaving(false);
    }
  };
  const story = getStoryForContent({ kind: 'adventure', stageId: stage.id });
  if (story && startedStage !== id)
    return (
      <Screen
        header={
          <LessonHeader
            progress={(stageIds.indexOf(stage.id) + 1) / 6}
            color={stage.color}
            label={stage.title}
            count={`${stageIds.indexOf(stage.id) + 1}/6`}
            onClose={() => setLeaving(true)}
          />
        }
        footer={<Button title={`Start ${stage.verb}`} onPress={() => setStartedStage(id)} />}
      >
        <StoryIntro story={story} reference={{ kind: 'adventure', stageId: stage.id }} />
        <LessonExitSheet
          visible={leaving}
          onKeep={() => setLeaving(false)}
          onLeave={leave}
          message="Your app pieces stay with you. We’ll save your work before you leave."
          error={game.error ?? undefined}
        />
      </Screen>
    );
  return (
    <Screen
      scroll={false}
      style={{ flex: 1, minHeight: 0, paddingTop: 0, paddingBottom: insets.bottom }}
      header={
        <LessonHeader
          progress={(stageIds.indexOf(stage.id) + 1) / 6}
          color={stage.color}
          label={`Stage ${stageIds.indexOf(stage.id) + 1} of 6: ${stage.title}`}
          count={`${stageIds.indexOf(stage.id) + 1}/6`}
          onClose={() => {
            if (!finishing.current) setLeaving(true);
          }}
        />
      }
    >
      <View
        style={{ flex: 1, minHeight: 0 }}
        pointerEvents={saving ? 'none' : 'auto'}
        accessibilityElementsHidden={leaving}
        importantForAccessibility={leaving ? 'no-hide-descendants' : 'auto'}
      >
        <Stage
          draft={game.draft}
          onChange={(patch) => {
            pendingResult.current = null;
            setError('');
            game.patchDraft(patch);
          }}
          onComplete={() => void finish()}
        />
      </View>
      {saving || error || game.error ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: game.error || error ? colors.dangerSurface : colors.surface,
            padding: 12,
            gap: 8,
          }}
        >
          <T
            selectable
            variant="small"
            style={{ color: game.error || error ? colors.danger : colors.textSecondary }}
          >
            {saving ? 'Saving your work…' : error || game.error}
          </T>
          {game.error && !saving ? (
            <Button title="Retry save" variant="secondary" onPress={() => void retry()} />
          ) : null}
        </View>
      ) : null}
      <LessonExitSheet
        visible={leaving}
        onKeep={() => setLeaving(false)}
        onLeave={leave}
        message="Your app pieces stay with you. We’ll save your work before you leave."
        error={game.error ?? undefined}
      />
    </Screen>
  );
}
