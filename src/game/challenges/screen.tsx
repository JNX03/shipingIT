import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/ui/game-icon';
import { LessonEntry, LessonExitSheet } from '@/components/learning/lesson-frame';
import { useLessonEntry } from '@/hooks/use-lesson-entry';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
import { useChallenges, isChallengeUnlocked } from '../challenge-store';
import { GameActor } from '../components/actor';
import { challengeById, challengeCatalog } from './catalog';
import { checkChallenge, initialChallengeDraft } from './logic';
import { ChallengePlay } from './play';
import { gameCharacterArt, gameStageArt } from '../art';
import { characterRigArt } from '../motion-art';
import { GameLoading } from '../components/loading';
import { challengeShellAction } from './shell-action';
import { feedback } from '@/utils/feedback';
import { Image } from 'expo-image';
import { activityArt } from '../activity-art';
import { roomForChallenge, storyRoomArt } from './room-layout';
import { StoryIntro } from '@/components/learning/story-intro';
import { getStoryForContent } from '@/data/storybook';
import { useAppStore } from '@/store/app-store';
import { useAdventure } from '../store';
import { nextMixedActivity } from '../next-activity';
import { useLessonAccess } from '@/hooks/use-lesson-access';

export function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PracticeScreenForChallenge key={id ?? ''} id={id ?? ''} />;
}

function PracticeScreenForChallenge({ id }: { id: string }) {
  const game = useChallenges(),
    challenge = challengeById(id);
  const lessons = useAppStore();
  const adventure = useAdventure();
  const lessonAccess = useLessonAccess();
  const room = roomForChallenge(id);
  const storyArt = id.includes('library')
    ? activityArt.library
    : id.includes('club')
      ? activityArt.club
      : null;
  const [error, setError] = useState(''),
    [earned, setEarned] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [help, setHelp] = useState(false),
    [started, setStarted] = useState(false),
    [leaving, setLeaving] = useState(false);
  const inFlight = useRef(false),
    pendingEarned = useRef<number | null>(null);
  const entry = useLessonEntry(
    `practice:${id}`,
    game.hydrated && !!challenge && isChallengeUnlocked(id, game.completed),
    challenge
      ? [
          ...Object.values(characterRigArt),
          gameStageArt[challenge.stage],
          gameCharacterArt[challenge.npc],
          ...(storyArt ? [storyArt] : []),
          ...(room ? [storyRoomArt[room.id]] : []),
        ]
      : [],
  );
  useEffect(() => {
    void useChallenges.getState().hydrate();
  }, []);
  const leave = async () => {
    await game.flush();
    if (useChallenges.getState().saveError) {
      setError('Retry saving before leaving.');
      return;
    }
    router.replace('/(tabs)');
  };
  const home = <Pressable accessibilityRole="button" accessibilityLabel="Return to path" onPress={() => void leave()} style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}><GameIcon name="learn" size={30} /></Pressable>;
  const leaveFromSheet = async () => {
    await game.flush();
    const failure = useChallenges.getState().saveError;
    if (failure) throw new Error(failure);
    router.replace('/(tabs)');
  };
  const finish = async () => {
    if (inFlight.current || !challenge) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = game.finish(challenge.id);
      if (!result.valid) {
        setError(result.message);
        return;
      }
      pendingEarned.current ??= result.earned;
      await game.flush();
      if (useChallenges.getState().saveError) {
        setError('Complete in this session. Retry saving to keep your reward.');
        return;
      }
      setEarned(pendingEarned.current);
      setError('');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const retry = async () => {
    await game.retry();
    if (!useChallenges.getState().saveError) {
      setError('');
      if (pendingEarned.current !== null) void finish();
    }
  };
  if (!game.hydrated) return <GameLoading message="Opening practice…" scene="travel" />;
  if (!challenge || !isChallengeUnlocked(challenge.id, game.completed))
    return (
      <Screen header={home}>
        <T variant="title">One challenge at a time</T>
        <T>Complete the previous practice to unlock this one.</T>
        {game.saveError ? (
          <>
            <T>{game.saveError}</T>
            <Button title="Retry loading" onPress={() => void retry()} />
          </>
        ) : null}
      </Screen>
    );
  const index = challengeCatalog.findIndex((item) => item.id === challenge.id);
  const nextActivity = nextMixedActivity({
    adventure,
    completedLessonIds: lessons.completedLessonIds,
    passedLessonIds: lessonAccess.passedLessonIds,
    skippedLessonIds: lessonAccess.skippedLessonIds,
    lessonCompletions: lessons.lessonCompletions,
    practices: game.completed,
    practicesReady: game.hydrated,
  });
  if (earned !== null && !lessonAccess.ready && lessonAccess.error)
    return (
      <Screen footer={<Button title="Retry loading" onPress={() => void lessonAccess.refresh()} />}>
        <T>{lessonAccess.error}</T>
      </Screen>
    );
  if (earned !== null && (!lessons.hydrated || !adventure.hydrated || !lessonAccess.ready))
    return <GameLoading message="Opening your next activity…" />;
  if (earned !== null)
    return (
      <Screen
        header={home}
        footer={
          <>
            <Button
              title={nextActivity.label}
              onPress={() => router.replace(nextActivity.href)}
            />
          </>
        }
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.lg }}>
          <GameActor character="ami" motion="celebrate" size={148} />
          <T variant="title">{earned ? 'Challenge complete!' : 'Practice complete!'}</T>
          <T variant="heading" accessibilityLabel={`${earned} Sparks earned`}>
            +{earned} Sparks
          </T>
          <T style={{ textAlign: 'center' }}>{challenge.title}</T>
          {nextActivity.node ? (
            <T variant="small" style={{ textAlign: 'center' }}>
              Up next: {nextActivity.node.title}
            </T>
          ) : null}
          <T variant="small">
            {Object.keys(game.completed).length}/{challengeCatalog.length} practices complete
          </T>
        </View>
      </Screen>
    );
  if (!entry.ready)
    return (
      <LessonEntry
        entry={entry}
        message="Opening practice…"
        tip={challenge.instructions}
        scene="thinking"
      />
    );
  const draft = game.drafts[challenge.id] ?? initialChallengeDraft(challenge);
  const story = getStoryForContent({ kind: 'challenge', challengeId: challenge.id });
  if (story && !started)
    return (
      <Screen
        header={
          home
        }
        footer={<Button title="Let’s begin" onPress={() => setStarted(true)} />}
      >
        <StoryIntro story={story} reference={{ kind: 'challenge', challengeId: challenge.id }} />
      </Screen>
    );
  const action = challengeShellAction(challenge, draft);
  const interview = challenge.kind === 'interview';
  const interviewReady = !interview || checkChallenge(challenge, draft).valid;
  const run = () => {
    pendingEarned.current = null;
    setError('');
    game.act(challenge.id, { type: 'run' });
    feedback(useChallenges.getState().drafts[challenge.id]?.tests?.passed ? 'success' : 'error');
  };
  return (
    <>
      <Screen
        scroll={false}
        style={{ paddingTop: 0 }}
        header={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Save and return to path" onPress={() => setLeaving(true)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><GameIcon name="learn" size={30} /></Pressable>
            <View style={{ flex: 1 }} />
            <Button
              title="Goal"
              compact
              variant="quiet"
              uppercase={false}
              onPress={() => setHelp(!help)}
            />
          </View>
        }
        footer={
          game.saveError || error || interviewReady ? <>
            {game.saveError || error ? (
              <T accessibilityLiveRegion="polite" variant="small" style={{ color: colors.danger }}>
                {game.saveError || error}
              </T>
            ) : null}
            {game.saveError ? (
              <Button title="Retry save" loading={busy} onPress={() => void retry()} />
            ) : interviewReady ? (
              <Button
                title={interview ? 'Finish' : action.title}
                loading={busy}
                haptic={action.type === 'run' ? false : 'light'}
                onPress={() => (action.type === 'run' ? run() : void finish())}
              />
            ) : null}
          </> : undefined
        }
        footerStyle={{ paddingTop: space.sm, paddingBottom: space.sm }}
        footerContentStyle={{ gap: space.xs }}
      >
        {help ? (
          <View style={{ flex: 1, padding: space.page, gap: space.lg, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <GameActor character={challenge.npc} size={112} />
              {storyArt ? (
                <Image
                  source={storyArt}
                  contentFit="contain"
                  alt=""
                  style={{ width: 136, height: 136 }}
                />
              ) : null}
            </View>
            <T variant="heading">{challenge.title}</T>
            <T>{challenge.instructions}</T>
            <T variant="small">
              These are authored practice scenarios. Hold and drag, or select a piece and tap its
              destination.
            </T>
            <Button title="Let’s build" onPress={() => setHelp(false)} />
          </View>
        ) : (
          <View style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
            {!interview ? <T variant="caption" style={{ paddingHorizontal: space.md, paddingVertical: space.xs }}>
              {index + 1}/{challengeCatalog.length} ·{' '}
              {challenge.kind === 'interview'
                ? 'ASK, THEN BUILD THE EVIDENCE BOARD'
                : challenge.kind === 'pack'
                  ? `PACK A COMPLETE ${challenge.budget}-POINT VERSION`
                  : challenge.kind === 'repair'
                    ? 'RUN, REPAIR, THEN RERUN'
                    : 'DRAG PIECES OR TAP TO CONNECT'}
            </T> : null}
            <ChallengePlay
              key={challenge.id}
              challenge={challenge}
              draft={draft}
              showTesterControls={false}
              onAction={(action) => {
                pendingEarned.current = null;
                setError('');
                game.act(challenge.id, action);
              }}
            />
          </View>
        )}
      </Screen>
      <LessonExitSheet
        visible={leaving}
        onKeep={() => setLeaving(false)}
        onLeave={leaveFromSheet}
        message="Your questions and build pieces stay on this device. Come back when you’re ready."
        error={game.saveError ?? undefined}
      />
    </>
  );
}
