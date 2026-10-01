import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { SceneObjectivePanel } from '../components/scene-objective-panel';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { useGameAudio } from '@/hooks/use-game-audio';
import { colors, fonts, radius, space } from '@/theme';
import { GameActor } from '../components/actor';
import { PlayerAvatar } from '../components/player-avatar';
import { useSavedProfileAvatar } from '../profile-avatar-store';
import { distance, planWorldPath, worldFacing, type WorldPoint } from '../world/geometry';
import { useWorldMovement } from '../world/use-world-movement';
import type { Challenge, ChallengeDraft } from './model';
import {
  roomForChallenge,
  storyRoomArt,
  type StoryRoomLayout,
  type StoryRoomProp,
} from './room-layout';

export interface StoryRoomProps {
  challenge: Challenge;
  draft: ChallengeDraft;
  /** The existing Interview controller opens a composer over this same scene. */
  onTalk: () => void;
  onClose?: () => void;
  dialogueOpen?: boolean;
  dialogueDock?: ReactNode;
  latestLine?: string;
  speaking?: boolean;
  onReadLine?: () => void;
  onStopTalking?: () => void;
}

const TALK_DISTANCE = 118;
function cameraOffset(value: number, viewport: number, extent: number) {
  'worklet';
  return -Math.max(0, Math.min(extent - viewport, value - viewport * 0.54));
}

/** Unsupported challenges deliberately render nothing. The shell owns all access/reward rules. */
export function StoryRoom(props: StoryRoomProps) {
  const room = roomForChallenge(props.challenge.id);
  return room ? <WalkableStoryRoom key={props.challenge.id} {...props} room={room} /> : null;
}

function WalkableStoryRoom({
  challenge,
  draft,
  onTalk,
  onClose,
  dialogueOpen = false,
  dialogueDock,
  latestLine,
  speaking = false,
  onReadLine,
  onStopTalking,
  room,
}: StoryRoomProps & { room: StoryRoomLayout }) {
  const reduced = useMotionReduced();
  const avatar = useSavedProfileAvatar().selection;
  const {
    play: playSound,
    setWorld: setAudioWorld,
    setWalking: setAudioWalking,
    stop: stopAudio,
  } = useGameAudio();
  const [screenReader, setScreenReader] = useState(false);
  const [active, setActive] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  const [viewport, setViewport] = useState({ width: 360, height: 300 });
  const [ready, setReady] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [selectedProp, setSelectedProp] = useState<StoryRoomProp | null>(null);
  const [destination, setDestination] = useState<WorldPoint | null>(null);
  const [walkingTo, setWalkingTo] = useState('');
  const [notice, setNotice] = useState('Tap open floor to walk, or approach a person.');
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageRevision, setImageRevision] = useState(0);
  const mounted = useRef(true);
  const requestVersion = useRef({ value: 0 });
  const movement = useWorldMovement(room.spawn, reduced || screenReader);
  const { x, y, stop, setFacing } = movement;
  const scale = Math.max(viewport.width / room.width, viewport.height / room.height);
  const mapWidth = room.width * scale,
    mapHeight = room.height * scale;
  // Keep the same readable articulated rig size as the existing campus at 360pt.
  const actorSize = Math.max(60, Math.min(86, viewport.width * 0.19));
  const found = new Set(draft.dialogue.flatMap((line) => (line.clue ? [line.clue] : [])));
  const heardCount = challenge.items.filter((item) => found.has(item.id)).length;
  const pinnedCount = challenge.items.filter(
    (item) => found.has(item.id) && draft.assignments[item.id] === item.target,
  ).length;
  const selectedItem = challenge.items.find((item) => item.id === selectedProp?.itemId);
  const fullLine = latestLine || draft.dialogue.at(-1)?.reply || challenge.opening;
  const firstSentence = fullLine.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  const currentLine =
    firstSentence && firstSentence.length <= 180
      ? firstSentence
      : fullLine.length <= 180
        ? fullLine
        : `${fullLine.slice(0, 176).replace(/\s+\S*$/, '')}…`;

  useEffect(() => {
    setAudioWorld(active ? `story-${room.id}` : null);
    return () => stopAudio();
  }, [active, room.id, setAudioWorld, stopAudio]);
  useEffect(() => {
    setAudioWalking(active && movement.moving);
    return () => setAudioWalking(false);
  }, [active, movement.moving, setAudioWalking]);

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (live) setScreenReader(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const requests = requestVersion.current;
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state !== 'active') {
        requests.value++;
        stop();
        stopAudio();
        setDestination(null);
        setWalkingTo('');
        setReady(false);
      }
    });
    return () => {
      mounted.current = false;
      requests.value++;
      subscription.remove();
      stop();
      stopAudio();
    };
  }, [stop, stopAudio]);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cameraOffset(x.get() * scale, viewport.width, mapWidth) },
      { translateY: cameraOffset(y.get() * scale, viewport.height, mapHeight) },
    ],
  }));
  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() * scale - actorSize / 2 },
      { translateY: y.get() * scale - actorSize * 0.92 },
    ],
    zIndex: y.get() >= room.person.position.y ? 6 : 3,
  }));

  const pointNow = () => ({ x: x.get(), y: y.get() });
  const stopWalking = () => {
    requestVersion.current.value++;
    stop();
    setDestination(null);
    setWalkingTo('');
  };
  const walkTo = (point: WorldPoint, label: string, onArrival?: () => void) => {
    if (!active || dialogueOpen) return;
    const token = ++requestVersion.current.value;
    const route = planWorldPath(room, pointNow(), point);
    if (route.length < 1) {
      setNotice('Choose another open spot on the floor.');
      return;
    }
    const end = route[route.length - 1];
    void playSound('snap');
    setReady(false);
    setSelectedProp(null);
    setDestination(end);
    setWalkingTo(label);
    setNotice('');
    movement.walk(route, () => {
      if (!mounted.current || token !== requestVersion.current.value) return;
      setDestination(null);
      setWalkingTo('');
      const nearPerson = distance(pointNow(), room.person.position) <= TALK_DISTANCE;
      setReady(nearPerson);
      if (nearPerson) setFacing(worldFacing(pointNow(), room.person.position));
      if (distance(end, point) <= 28) {
        onArrival?.();
        if (!onArrival)
          setNotice(
            nearPerson
              ? `${room.characterName} is nearby. You can talk now.`
              : 'Tap a person or a room object to approach.',
          );
      } else {
        setNotice('That spot is blocked. You reached the nearest open floor.');
      }
    });
  };
  const approachPerson = () => {
    setShowStory(false);
    walkTo(room.person.approach, room.characterName, () => {
      // Arrival alone is not permission to talk: the avatar must be in real proximity.
      if (distance(pointNow(), room.person.position) > TALK_DISTANCE) return;
      setReady(true);
      void playSound('snap');
      setNotice(`${room.characterName} is ready. Ask about what happened last time.`);
    });
  };
  const inspectProp = (prop: StoryRoomProp) => {
    setShowStory(false);
    walkTo(prop.approach, prop.label, () => {
      setSelectedProp(prop);
      setNotice('');
      void playSound(found.has(prop.itemId) ? 'clue' : 'snap');
    });
  };
  const talk = () => {
    if (
      !active ||
      movement.moving ||
      !ready ||
      distance(pointNow(), room.person.position) > TALK_DISTANCE
    ) {
      approachPerson();
      return;
    }
    stopWalking();
    stopAudio();
    onTalk();
  };
  const toggleStory = () => {
    stopWalking();
    setReady(distance(pointNow(), room.person.position) <= TALK_DISTANCE);
    setShowStory((value) => !value);
  };

  return (
    <View style={styles.room}>
      <View style={styles.roomBar}>
        <View style={styles.roomHeading}>
          <T variant="caption" style={styles.roomTitle}>
            {room.title.toUpperCase()}
          </T>
        </View>
        {dialogueOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop talking and walk"
            onPress={onStopTalking}
            style={styles.textControl}
          >
            <GameIcon name="back" size={24} variant="ink" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showStory ? 'Return to the walkable scene' : 'Open your interview clues and notes'
            }
            accessibilityState={{ expanded: showStory }}
            onPress={toggleStory}
            style={({ pressed }) => [styles.textControl, pressed && styles.pressed]}
          >
            <T variant="caption" style={styles.link}>
              {showStory ? 'Scene' : 'Clues & notes'}
            </T>
          </Pressable>
        )}
      </View>
      {showStory && !dialogueOpen ? (
        <ScrollView style={styles.story} contentContainerStyle={styles.storyContent}>
          <T variant="subheading">{challenge.title}</T>
          <T>{challenge.opening}</T>
          <T variant="small">{challenge.instructions}</T>
          <View style={styles.storyDivider} />
          <T variant="caption">
            {heardCount}/{challenge.items.length} HEARD · {pinnedCount}/{challenge.items.length}{' '}
            PINNED
          </T>
          {challenge.items.map((item, index) => (
            <View key={item.id} style={styles.storyMoment}>
              <T variant="subheading">
                {index + 1}. {item.title}
              </T>
              <T
                variant="caption"
                style={{ color: found.has(item.id) ? colors.success : colors.textSecondary }}
              >
                {found.has(item.id)
                  ? draft.assignments[item.id] === item.target
                    ? 'Heard and pinned'
                    : 'Heard — ready to pin in Evidence'
                  : `Ask ${room.characterName} to uncover this part`}
              </T>
              <T variant="small">
                {found.has(item.id) ? item.detail : 'Ask about this clue to hear what happened.'}
              </T>
            </View>
          ))}
          <T variant="caption">
            Authored practice scenario. Room notes reflect your interview; open questions remain
            questions.
          </T>
        </ScrollView>
      ) : null}
      <View
        style={styles.viewport}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;
          if (width > 0 && height > 0) setViewport({ width, height });
        }}
      >
        <Animated.View style={[{ width: mapWidth, height: mapHeight }, cameraStyle]}>
          <Image
            key={`${room.id}:${imageRevision}`}
            source={storyRoomArt[room.id]}
            contentFit="fill"
            transition={0}
            accessible={false}
            style={StyleSheet.absoluteFill}
            onLoad={() => setImageState('ready')}
            onError={() => setImageState('error')}
          />
          <Pressable
            accessible={false}
            importantForAccessibility="no"
            disabled={!active || dialogueOpen || showStory}
            onPress={({ nativeEvent }) =>
              walkTo(
                { x: nativeEvent.locationX / scale, y: nativeEvent.locationY / scale },
                'the floor',
              )
            }
            style={StyleSheet.absoluteFill}
          />
          {room.props.map((prop) => (
            <Pressable
              key={prop.id}
              accessibilityRole="button"
              accessibilityLabel={`Approach ${prop.label.toLowerCase()} and inspect your story notes`}
              disabled={!active || dialogueOpen || showStory}
              onPress={() => inspectProp(prop)}
              style={({ pressed }) => [
                styles.prop,
                { left: prop.position.x * scale - 52, top: prop.position.y * scale - 24 },
                pressed && styles.pressed,
              ]}
            >
              <T
                variant="caption"
                style={[styles.propLabel, found.has(prop.itemId) && styles.foundLabel]}
              >
                {prop.label}
                {found.has(prop.itemId) ? ' ✓' : ''}
              </T>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              ready ? `Talk to ${room.characterName}` : `Approach ${room.characterName}`
            }
            disabled={!active}
            onPress={ready ? talk : approachPerson}
            style={({ pressed }) => [
              {
                position: 'absolute',
                left: room.person.position.x * scale - actorSize / 2,
                top: room.person.position.y * scale - actorSize * 0.92,
                width: actorSize,
                height: actorSize + space.xl,
                zIndex: 4,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.actorLabel}>
              <T variant="caption" style={styles.link}>
                {room.characterName}
                {ready ? ' · Talk' : ''}
              </T>
            </View>
            <GameActor
              character={challenge.npc}
              size={actorSize}
              motion={speaking ? 'talk' : 'idle'}
              facing={worldFacing(room.person.position, room.person.approach)}
              active={active}
            />
          </Pressable>
          {(ready || dialogueOpen) && !movement.moving ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.personBubble,
                {
                  left: room.person.position.x * scale - 110,
                  top: Math.max(
                    room.person.position.y * scale - actorSize * 0.92 - 130,
                    -cameraOffset(y.get() * scale, viewport.height, mapHeight) + space.sm,
                  ),
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <T variant="caption" style={styles.link}>
                  {room.characterName}
                </T>
                {onReadLine ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      speaking ? 'Stop reading aloud' : 'Read character reply aloud'
                    }
                    onPress={onReadLine}
                    hitSlop={8}
                    style={{
                      minWidth: 32,
                      minHeight: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GameIcon name="sound" size={22} variant="color" />
                  </Pressable>
                ) : null}
              </View>
              <T variant="small" numberOfLines={3}>
                {currentLine}
              </T>
            </View>
          ) : null}
          {destination ? (
            <View
              pointerEvents="none"
              style={[
                styles.destination,
                { left: destination.x * scale - 9, top: destination.y * scale - 5 },
              ]}
            />
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[styles.player, { width: actorSize, height: actorSize }, playerStyle]}
          >
            <PlayerAvatar
              avatar={avatar}
              size={actorSize}
              motion={movement.moving ? 'walk' : 'idle'}
              facing={movement.facing}
              active={active}
            />
          </Animated.View>
        </Animated.View>
        {imageState !== 'ready' ? (
          <View
            pointerEvents={imageState === 'error' ? 'auto' : 'none'}
            style={[
              styles.imageNotice,
              imageState === 'error' && { backgroundColor: colors.surface },
            ]}
          >
            <T variant="small">
              {imageState === 'error'
                ? 'The map could not open. Your practice draft is safe.'
                : 'Opening map…'}
            </T>
            {imageState === 'error' ? (
              <Button
                title="Retry map"
                compact
                uppercase={false}
                onPress={() => {
                  setImageState('loading');
                  setImageRevision((value) => value + 1);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      {dialogueOpen ? (
        <View style={styles.dockOverlay}>{dialogueDock}</View>
      ) : (
        <SceneObjectivePanel
          title={`Meet ${room.characterName}`}
          progress={`${heardCount}/${challenge.items.length} clues heard`}
        >
          <View accessibilityLiveRegion="polite" style={styles.status}>
            {selectedProp && selectedItem ? (
              <>
                <T variant="caption" style={styles.roomTitle}>
                  {selectedProp.label.toUpperCase()}
                </T>
                <T variant="small">
                  {found.has(selectedItem.id)
                    ? selectedItem.detail
                    : `Ask ${room.characterName} about this clue. Inspecting the object does not reveal an answer.`}
                </T>
                {found.has(selectedItem.id) ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      stopWalking();
                      setShowStory(true);
                    }}
                    style={({ pressed }) => [styles.readNote, pressed && styles.pressed]}
                  >
                    <T variant="caption" style={styles.link}>
                      Read full note
                    </T>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <T variant="small">
                {movement.moving
                  ? `Walking to ${walkingTo}… Tap another spot to change course.`
                  : notice ||
                    (ready
                      ? `${room.characterName} is nearby. You can talk now.`
                      : 'Tap open floor to walk, or approach a person.')}
              </T>
            )}
          </View>
          <View style={styles.actions}>
            <Button
              title={ready ? `Talk to ${room.characterName}` : `Approach ${room.characterName}`}
              uppercase={false}
              compact
              haptic={false}
              disabled={!active || movement.moving}
              onPress={ready ? talk : approachPerson}
              style={styles.mainAction}
            />
            {onClose ? (
              <Button
                title="Close room"
                uppercase={false}
                compact
                variant="secondary"
                haptic={false}
                onPress={() => {
                  stopWalking();
                  onClose();
                }}
              />
            ) : null}
          </View>
        </SceneObjectivePanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, minHeight: 220, position: 'relative', backgroundColor: colors.sky },
  roomBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
  roomHeading: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
  roomTitle: { color: colors.primaryDeep },
  textControl: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  link: { color: colors.primaryPressed },
  pressed: { opacity: 0.65 },
  viewport: { flex: 1, minHeight: 180, overflow: 'hidden' },
  dockOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 8,
    padding: space.sm,
    maxHeight: '48%',
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderColor: colors.border,
    borderTopLeftRadius: radius.control,
    borderTopRightRadius: radius.control,
  },
  imageNotice: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.page,
    gap: space.sm,
  },
  prop: {
    position: 'absolute',
    width: 104,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  propLabel: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    color: colors.primaryDeep,
    textAlign: 'center',
    overflow: 'hidden',
  },
  foundLabel: { backgroundColor: colors.successSurface, color: colors.success },
  actorLabel: {
    position: 'absolute',
    top: -space.xl,
    alignSelf: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    minWidth: 52,
  },
  personBubble: {
    position: 'absolute',
    width: 220,
    maxHeight: 118,
    padding: space.sm,
    gap: space.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    zIndex: 7,
  },
  player: { position: 'absolute', left: 0, top: 0 },
  destination: {
    position: 'absolute',
    width: 18,
    height: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primaryPressed,
    backgroundColor: colors.surface,
    zIndex: 3,
  },
  status: { minHeight: 44, gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  mainAction: { flex: 1, minWidth: 180 },
  hint: { fontFamily: fonts.semibold, textAlign: 'center' },
  readNote: { minHeight: 44, justifyContent: 'center' },
  story: {
    position: 'absolute',
    top: 44,
    bottom: 180,
    left: space.sm,
    right: space.sm,
    zIndex: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.control,
  },
  storyContent: { padding: space.lg, gap: space.md },
  storyDivider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
  storyMoment: { gap: space.xs, paddingVertical: space.sm },
});
