import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { SceneObjectivePanel } from '../components/scene-objective-panel';
import { T } from '@/components/ui/text';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { useGameAudio } from '@/hooks/use-game-audio';
import { colors, fonts, radius, space, typography } from '@/theme';
import { feedback } from '@/utils/feedback';
import { GameActor } from '../components/actor';
import { PlayerAvatar } from '../components/player-avatar';
import { useSavedProfileAvatar } from '../profile-avatar-store';
import { interviewCharacter } from '../interview';
import { readCharacterLine, stopCharacterVoice } from '../speech';
import type { GameDraft, GameStageProps, InterviewMessage, NpcId } from '../types';
import {
  checkResearchStage,
  evidenceById,
  hasRecordedEvidence,
  npcById,
  requiredEvidenceIds,
  scriptedInterview,
} from '../logic/research';
import { worldArt } from '../world/art';
import { distance, planWorldPath, worldFacing, type WorldPoint } from '../world/geometry';
import {
  adventureWorlds,
  navigationWorld,
  portalToNpc,
  type WorldPortal,
  type WorldSceneId,
} from '../world/scenes';
import { nextInterviewTask } from '../world/tasks';
import { useWorldMovement } from '../world/use-world-movement';

function cameraOffset(value: number, viewport: number, extent: number) {
  'worklet';
  return -Math.max(0, Math.min(extent - viewport, value - viewport * 0.56));
}

export function ExploreStage({ draft, onChange, onComplete }: GameStageProps) {
  const reduced = useMotionReduced();
  const avatar = useSavedProfileAvatar().selection;
  const {
    play: playSound,
    setWorld: setAudioWorld,
    setWalking: setAudioWalking,
    stop: stopAudio,
  } = useGameAudio();
  const [sceneId, setSceneId] = useState<WorldSceneId>('campus');
  const [npc, setNpc] = useState<NpcId | null>(null);
  const [viewport, setViewport] = useState({ width: 360, height: 540 });
  const [destination, setDestination] = useState<WorldPoint | null>(null);
  const [walkingTo, setWalkingTo] = useState('');
  const [question, setQuestion] = useState('');
  const [customQuestion, setCustomQuestion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [replyIndex, setReplyIndex] = useState<number | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(165);
  const latest = useRef(draft);
  const mounted = useRef(true);
  const pending = useRef<AbortController | null>(null);
  const requestVersion = useRef(0),
    voiceVersion = useRef(0);
  const sceneRef = useRef(sceneId);
  const movement = useWorldMovement(adventureWorlds.campus.spawn, reduced);
  const { x: playerX, y: playerY } = movement;
  const world = adventureWorlds[sceneId];
  const scale = Math.max(viewport.width / world.width, viewport.height / world.height);
  const mapWidth = world.width * scale,
    mapHeight = world.height * scale;
  const actorSize = Math.max(60, Math.min(90, viewport.width * 0.19));
  const npcPlacement = world.npcs.find((actor) => actor.id === npc);
  const bubbleWidth = Math.min(430, viewport.width - 24);
  const updateExplore = useCallback(
    (next: GameDraft['explore']) => {
      latest.current = { ...latest.current, explore: next };
      onChange({ explore: next });
    },
    [onChange],
  );
  useEffect(() => {
    latest.current = draft;
  }, [draft]);
  useEffect(() => {
    sceneRef.current = sceneId;
  }, [sceneId]);
  useEffect(() => {
    setAudioWorld(sceneId);
    // stop does not recreate a released owner during unmount cleanup.
    return () => stopAudio();
  }, [sceneId, setAudioWorld, stopAudio]);
  useEffect(() => {
    setAudioWalking(movement.moving);
    return () => setAudioWalking(false);
  }, [sceneId, movement.moving, setAudioWalking]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      stopCharacterVoice();
    };
  }, []);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cameraOffset(playerX.get() * scale, viewport.width, mapWidth) },
      { translateY: cameraOffset(playerY.get() * scale, viewport.height, mapHeight) },
    ],
  }));
  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: playerX.get() * scale - actorSize / 2 },
      { translateY: playerY.get() * scale - actorSize * 0.92 },
    ],
  }));
  const bubbleStyle = useAnimatedStyle(() => {
    if (!npcPlacement) return {};
    const actorX =
      npcPlacement.position.x * scale +
      cameraOffset(playerX.get() * scale, viewport.width, mapWidth);
    const actorY =
      npcPlacement.position.y * scale +
      cameraOffset(playerY.get() * scale, viewport.height, mapHeight);
    return {
      transform: [
        {
          translateX: Math.max(
            12,
            Math.min(viewport.width - bubbleWidth - 12, actorX - bubbleWidth / 2),
          ),
        },
        {
          translateY: Math.max(
            8,
            Math.min(
              viewport.height - bubbleHeight - 8,
              actorY - actorSize * 0.96 - bubbleHeight - 8,
            ),
          ),
        },
      ],
    };
  });
  const tailStyle = useAnimatedStyle(() => {
    if (!npcPlacement) return {};
    const actorX =
      npcPlacement.position.x * scale +
      cameraOffset(playerX.get() * scale, viewport.width, mapWidth);
    const left = Math.max(
      12,
      Math.min(viewport.width - bubbleWidth - 12, actorX - bubbleWidth / 2),
    );
    return {
      transform: [
        { translateX: Math.max(18, Math.min(bubbleWidth - 30, actorX - left - 8)) },
        { rotate: '45deg' },
      ],
    };
  });

  const closeDialogue = () => {
    requestVersion.current++;
    voiceVersion.current++;
    pending.current?.abort();
    pending.current = null;
    stopCharacterVoice();
    setSpeaking(null);
    setBusy(false);
    setNpc(null);
    setQuestion('');
    setCustomQuestion(false);
    setNotice('');
    setReplyIndex(null);
  };
  const arrive = (id: NpcId) => {
    if (!mounted.current) return;
    const current = latest.current.explore;
    const history = current.conversations[id] ?? [];
    updateExplore({
      ...current,
      visited: current.visited.includes(id) ? current.visited : [...current.visited, id],
      conversations: {
        ...current.conversations,
        [id]: history.length
          ? history
          : [
              {
                id: `${id}-greeting`,
                role: 'character',
                source: 'scripted',
                text: npcById(id).greeting,
              },
            ],
      },
    });
    setDestination(null);
    setWalkingTo('');
    setNpc(id);
    setReplyIndex(null);
    const placement = adventureWorlds[sceneRef.current].npcs.find((actor) => actor.id === id);
    if (placement)
      movement.setFacing(worldFacing({ x: playerX.get(), y: playerY.get() }, placement.position));
    feedback('light');
  };
  const walkTo = (point: WorldPoint, label: string, onArrival?: () => void) => {
    const currentWorld = adventureWorlds[sceneRef.current];
    const route = planWorldPath(
      navigationWorld(currentWorld),
      { x: playerX.get(), y: playerY.get() },
      point,
    );
    if (!route.length) {
      setNotice('Try another open spot on the path.');
      return;
    }
    const end = route[route.length - 1];
    setDestination(end);
    setWalkingTo(label);
    setNotice('');
    movement.walk(route, () => {
      setDestination(null);
      setWalkingTo('');
      if (distance(end, point) < 28) onArrival?.();
    });
  };
  const visit = (id: NpcId) => {
    closeDialogue();
    const placement = adventureWorlds[sceneRef.current].npcs.find((actor) => actor.id === id);
    if (placement) walkTo(placement.approach, npcById(id).name, () => arrive(id));
  };
  const enterPortal = (portal: WorldPortal, afterEntry?: () => void) => {
    closeDialogue();
    walkTo(portal.position, portal.label, () => {
      sceneRef.current = portal.target;
      setSceneId(portal.target);
      movement.place(portal.spawn);
      setDestination(null);
      setWalkingTo('');
      feedback('light');
      afterEntry?.();
    });
  };
  const followTask = (id: NpcId) => {
    const currentWorld = adventureWorlds[sceneRef.current];
    if (currentWorld.npcs.some((actor) => actor.id === id)) {
      visit(id);
      return;
    }
    const portal = portalToNpc(currentWorld, id);
    if (portal) enterPortal(portal, () => followTask(id));
  };
  const tapGround = (point: WorldPoint) => {
    closeDialogue();
    walkTo(point, 'the path');
  };
  const listen = (message: InterviewMessage) => {
    const token = ++voiceVersion.current;
    if (speaking === message.id) {
      stopCharacterVoice();
      setSpeaking(null);
      return;
    }
    setSpeaking(message.id);
    void readCharacterLine(message.text, () => {
      if (mounted.current && voiceVersion.current === token) setSpeaking(null);
    }, { character: npc ?? 'ami' });
  };
  const send = async (suggestion?: string) => {
    const text = (suggestion ?? question).trim();
    if (!npc || !text || busy || pending.current) return;
    stopCharacterVoice();
    voiceVersion.current++;
    setSpeaking(null);
    const id = npc,
      token = ++requestVersion.current;
    const controller = new AbortController();
    pending.current = controller;
    const history = latest.current.explore.conversations[id] ?? [];
    const learner: InterviewMessage = {
      id: `${id}-${Date.now()}-q`,
      role: 'learner',
      source: 'player',
      text,
    };
    const withQuestion = [...history, learner];
    updateExplore({
      ...latest.current.explore,
      conversations: { ...latest.current.explore.conversations, [id]: withQuestion },
    });
    setQuestion('');
    setCustomQuestion(false);
    setBusy(true);
    setNotice('');
    setReplyIndex(null);
    try {
      let response: Awaited<ReturnType<typeof interviewCharacter>>;
      try {
        response = await interviewCharacter({
          npcId: id,
          question: text,
          history,
          projectName: latest.current.projectName,
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) return;
        response = scriptedInterview({ npcId: id, question: text, history });
      }
      if (!mounted.current || controller.signal.aborted || requestVersion.current !== token) return;
      const evidenceId =
        response.evidenceId && npcById(id).evidenceIds.includes(response.evidenceId)
          ? response.evidenceId
          : undefined;
      const message: InterviewMessage = {
        id: `${id}-${Date.now()}-a`,
        role: 'character',
        source: response.source,
        text: response.text,
        ...(evidenceId ? { evidenceId } : {}),
      };
      const current = latest.current.explore;
      updateExplore({
        ...current,
        conversations: {
          ...current.conversations,
          [id]: [...(current.conversations[id] ?? withQuestion), message],
        },
      });
    } finally {
      if (mounted.current && requestVersion.current === token) {
        setBusy(false);
        pending.current = null;
      }
    }
  };
  const collect = (id: string) => {
    const evidence = evidenceById(id);
    if (!evidence || !npc || evidence.npcId !== npc) return;
    const current = latest.current.explore;
    if (current.evidenceIds.includes(id)) return;
    const next = { ...current, evidenceIds: [...current.evidenceIds, id] };
    if (!hasRecordedEvidence({ ...latest.current, explore: next }, id)) return;
    updateExplore(next);
    setNotice(
      evidence.kind === 'claim'
        ? 'Assumption saved to check later.'
        : `Clue kept: ${evidence.title}`,
    );
    feedback('success', { sound: false });
    if (evidence.kind === 'observation') void playSound('clue');
  };

  const check = checkResearchStage('explore', draft);
  const collectedCount = requiredEvidenceIds.filter((id) => hasRecordedEvidence(draft, id)).length;
  const nextTask = nextInterviewTask(draft);
  const characterTask = npc ? nextInterviewTask(draft, npc) : undefined;
  const history = npc ? (draft.explore.conversations[npc] ?? []) : [];
  const replies = history.filter((message) => message.role === 'character');
  const shownIndex = Math.min(replyIndex ?? replies.length - 1, replies.length - 1);
  const reply = replies[shownIndex];
  const evidence = reply?.evidenceId ? evidenceById(reply.evidenceId) : undefined;
  const collectable = evidence && !draft.explore.evidenceIds.includes(evidence.id);
  const character = npc ? npcById(npc) : undefined;

  return (
    <View style={styles.stage}>
      <View style={styles.worldBar}>
        <T variant="caption">{world.title.toUpperCase()}</T>
        <T variant="caption">{collectedCount}/4 useful clues</T>
      </View>
      <View
        style={styles.viewport}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;
          if (width > 0 && height > 0) setViewport({ width, height });
        }}
      >
        <Animated.View style={[{ width: mapWidth, height: mapHeight }, cameraStyle]}>
          <Image
            source={worldArt[sceneId]}
            contentFit="fill"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Walk around the ${world.title.toLowerCase()}. Tap open ground to move. Use the named people and passages to explore.`}
            onPress={({ nativeEvent }) =>
              tapGround({ x: nativeEvent.locationX / scale, y: nativeEvent.locationY / scale })
            }
            style={StyleSheet.absoluteFill}
          />
          {world.portals.map((portal) => (
            <Pressable
              key={portal.id}
              accessibilityRole="button"
              accessibilityLabel={`Walk to the ${portal.label.toLowerCase()} passage`}
              onPress={() => enterPortal(portal)}
              style={[
                styles.portal,
                { left: portal.position.x * scale - 64, top: portal.position.y * scale - 24 },
              ]}
            >
              <T variant="caption" style={styles.portalLabel}>
                {portal.label}
              </T>
            </Pressable>
          ))}
          {world.npcs.map((actor) => (
            <Pressable
              key={actor.id}
              accessibilityRole="button"
              accessibilityLabel={`Walk to ${npcById(actor.id).name}, ${npcById(actor.id).role}, and talk`}
              onPress={() => visit(actor.id)}
              style={{
                position: 'absolute',
                left: actor.position.x * scale - actorSize / 2,
                top: actor.position.y * scale - actorSize * 0.92,
                width: actorSize,
                height: actorSize + 24,
                zIndex: 4,
              }}
            >
              <GameActor
                character={actor.id}
                size={actorSize}
                motion={
                  npc === actor.id && speaking
                    ? 'talk'
                    : npc === actor.id && busy
                      ? 'thinking'
                      : 'idle'
                }
                facing={npc === actor.id ? worldFacing(actor.position, actor.approach) : 'front'}
              />
              {npc !== actor.id ? (
                <View style={styles.actorName}>
                  <T variant="caption">{npcById(actor.id).name}</T>
                </View>
              ) : null}
            </Pressable>
          ))}
          {destination ? (
            <View
              pointerEvents="none"
              style={[
                styles.destination,
                { left: destination.x * scale - 8, top: destination.y * scale - 4 },
              ]}
            />
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 5,
                width: actorSize,
                height: actorSize,
              },
              playerStyle,
            ]}
          >
            <PlayerAvatar
              avatar={avatar}
              size={actorSize}
              motion={movement.moving ? 'walk' : 'idle'}
              facing={movement.facing}
            />
          </Animated.View>
        </Animated.View>
        {character && npcPlacement && reply ? (
          <Animated.View
            style={[styles.dialogue, { width: bubbleWidth }, bubbleStyle]}
            onLayout={({ nativeEvent }) => setBubbleHeight(nativeEvent.layout.height)}
          >
            <View style={styles.dialogueLabel}>
              <T variant="small" style={{ fontFamily: fonts.bold, color: colors.primaryDeep }}>
                {character.name}
              </T>
              <T variant="caption">
                {reply.id.endsWith('-greeting')
                  ? 'Authored practice'
                  : reply.source === 'ai'
                    ? 'AI practice'
                    : 'Offline practice'}
              </T>
            </View>
            <ScrollView
              style={{ maxHeight: 138 }}
              contentContainerStyle={{
                paddingHorizontal: space.lg,
                paddingTop: space.sm,
                paddingBottom: space.sm,
              }}
              showsVerticalScrollIndicator
            >
              <T selectable accessibilityLiveRegion="polite">
                {busy ? `${character.name} is thinking…` : reply.text}
              </T>
            </ScrollView>
            <View style={styles.dialogueActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  speaking === reply.id
                    ? 'Stop reading this reply'
                    : `Listen to ${character.name}'s reply`
                }
                disabled={busy}
                onPress={() => listen(reply)}
                style={styles.textControl}
              >
                <T variant="caption" style={styles.link}>
                  {speaking === reply.id ? 'Stop reading' : 'Listen'}
                </T>
              </Pressable>
              {replies.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    shownIndex > 0 ? 'Read the previous reply' : 'Return to the latest reply'
                  }
                  disabled={busy}
                  onPress={() => {
                    stopCharacterVoice();
                    setSpeaking(null);
                    setReplyIndex(shownIndex > 0 ? shownIndex - 1 : null);
                  }}
                  style={styles.textControl}
                >
                  <T variant="caption" style={styles.link}>
                    {shownIndex > 0 ? 'Previous reply' : 'Latest reply'}
                  </T>
                </Pressable>
              ) : null}
            </View>
            <Animated.View pointerEvents="none" style={[styles.bubbleTail, tailStyle]} />
          </Animated.View>
        ) : null}
      </View>
      {character ? (
        <SceneObjectivePanel
          title={`Talk with ${character.name}`}
          progress={`${collectedCount}/${requiredEvidenceIds.length} clues kept`}
        >
          {notice ? (
            <T variant="small" accessibilityLiveRegion="polite" style={{ color: colors.success }}>
              {notice}
            </T>
          ) : null}
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.primaryPressed} />
              <T variant="small">Waiting for {character.name}’s reply</T>
            </View>
          ) : collectable && evidence && !customQuestion ? (
            <View style={{ gap: space.sm }}>
              <T variant="caption">
                {evidence.kind === 'claim'
                  ? 'AN ASSUMPTION TO CHECK'
                  : 'A CLUE FROM THIS CONVERSATION'}
              </T>
              <T variant="small" style={{ color: colors.text }}>
                {evidence.meaning}
              </T>
              <Button
                title={evidence.kind === 'claim' ? 'Keep for checking' : 'Keep this clue'}
                haptic={false}
                onPress={() => collect(evidence.id)}
              />
            </View>
          ) : customQuestion ? (
            <View style={{ gap: space.sm }}>
              <TextInput
                accessibilityLabel={`Your question for ${character.name}`}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask about a real moment in the story…"
                placeholderTextColor={colors.textSecondary}
                maxLength={400}
                autoFocus
                multiline
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={() => void send()}
              />
              <Button
                title="Ask your question"
                disabled={!question.trim()}
                onPress={() => void send()}
              />
            </View>
          ) : characterTask ? (
            <View style={{ gap: space.sm }}>
              <T variant="caption">{characterTask.title.toUpperCase()}</T>
              <T variant="small" style={{ color: colors.text }}>
                {characterTask.question}
              </T>
              <Button
                title={`Ask ${character.name}`}
                onPress={() => void send(characterTask.question)}
              />
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <T variant="small">You have kept {character.name}’s perspective.</T>
              <Button
                title={check.valid ? 'Build the insight' : 'Continue exploring'}
                onPress={() => {
                  closeDialogue();
                  if (checkResearchStage('explore', latest.current).valid) onComplete();
                  else {
                    const task = nextInterviewTask(latest.current);
                    if (task) followTask(task.npcId);
                  }
                }}
              />
            </View>
          )}
          <View style={styles.secondaryActions}>
            {!busy ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCustomQuestion(!customQuestion)}
                style={styles.textControl}
              >
                <T variant="caption" style={styles.link}>
                  {customQuestion ? 'Use a question idea' : 'Ask your own question'}
                </T>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={closeDialogue}
              style={styles.textControl}
            >
              <T variant="caption" style={styles.link}>
                Return to walking
              </T>
            </Pressable>
          </View>
        </SceneObjectivePanel>
      ) : (
        <SceneObjectivePanel
          title="Find the story"
          progress={`${collectedCount}/${requiredEvidenceIds.length} clues kept`}
        >
          <T variant="small" accessibilityLiveRegion="polite" style={{ color: colors.text }}>
            {movement.moving
              ? `Walking to ${walkingTo}… Tap another spot to change course.`
              : notice ||
                (check.valid
                  ? 'Four useful clues ready. Connect them into an insight.'
                  : (nextTask?.title ?? check.message))}
          </T>
          <Button
            title={
              check.valid
                ? 'Build the insight'
                : movement.moving
                  ? 'Keep exploring'
                  : nextTask
                    ? `Meet ${npcById(nextTask.npcId).name}`
                    : 'Continue exploring'
            }
            haptic={false}
            disabled={movement.moving}
            onPress={() => {
              if (checkResearchStage('explore', latest.current).valid) onComplete();
              else {
                const task = nextInterviewTask(latest.current);
                if (task) followTask(task.npcId);
              }
            }}
          />
          <T variant="caption" style={{ textAlign: 'center', fontFamily: fonts.semibold }}>
            Simulated people and practice clues. Tap the ground to walk.
          </T>
        </SceneObjectivePanel>
      )}
    </View>
  );
}
export default ExploreStage;

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#E9F4FC', minHeight: 0 },
  worldBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
  },
  viewport: { flex: 1, minHeight: 140, overflow: 'hidden' },
  portal: {
    position: 'absolute',
    width: 128,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  portalLabel: {
    color: colors.primaryDeep,
    backgroundColor: '#FFFFFFEE',
    borderColor: '#BED9EB',
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    overflow: 'hidden',
    textAlign: 'center',
  },
  actorName: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: '#FFFFFFF2',
    borderRadius: radius.sm,
  },
  destination: {
    position: 'absolute',
    width: 16,
    height: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primaryPressed,
    backgroundColor: '#FFFFFFAA',
    zIndex: 3,
  },
  dialogue: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.surface,
    borderColor: '#D6E2E9',
    borderWidth: 2,
    borderRadius: radius.large,
    zIndex: 10,
  },
  dialogueLabel: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  dialogueActions: {
    paddingHorizontal: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bubbleTail: {
    position: 'absolute',
    left: 0,
    bottom: -9,
    width: 16,
    height: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#D6E2E9',
    backgroundColor: colors.surface,
  },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  textControl: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  link: { color: colors.primaryPressed },
  busy: {
    minHeight: 72,
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...typography.body,
    minHeight: 56,
    maxHeight: 104,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceMuted,
  },
});
