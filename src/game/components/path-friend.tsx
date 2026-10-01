import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';
import { GameActor, type GameCharacter, type GameMotion } from './actor';
import { PATH_FRIEND_MOTION_MS, pathFriendResponse } from '../path-friend';

interface PathFriendProps {
  character: GameCharacter;
  unitId: number;
  size: number;
  active: boolean;
  side?: 'left' | 'right';
  idle?: boolean;
}

export function PathFriend(props: PathFriendProps) {
  // Leaving the viewport clears the transient conversation and its timer.
  return <InteractivePathFriend key={props.active ? 'visible' : 'away'} {...props} />;
}

function InteractivePathFriend({
  character,
  unitId,
  size,
  active,
  side = 'right',
  idle = false,
}: PathFriendProps) {
  const interactions = useRef(0);
  const [response, setResponse] = useState<{
    message: string;
    motion: GameMotion;
    key: number;
  } | null>(null);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (!active || !response) return;
    const timer = setTimeout(() => setMoving(false), PATH_FRIEND_MOTION_MS);
    return () => clearTimeout(timer);
  }, [active, response]);
  const name =
    character === 'ami'
      ? 'Ami'
      : character === 'mali'
        ? 'Mali'
        : character === 'noa'
          ? 'Noa'
          : 'Ken';
  return (
    <View style={[styles.friend, { width: size, [side]: 0 }]}>
      {response ? (
        <View
          style={[styles.bubble, side === 'right' ? { right: 0 } : { left: 0 }]}
          accessibilityLiveRegion="polite"
        >
          <T variant="small" style={{ color: colors.text }}>
            {response.message}
          </T>
          <View style={[styles.tail, side === 'right' ? { right: 24 } : { left: 24 }]} />
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Say hello to ${name}${response ? `. ${response.message}` : ''}`}
        accessibilityHint="Tap for a short character response."
        testID={`path-friend-${unitId}-${character}-${idle ? 'guide' : 'npc'}`}
        disabled={!active}
        onPress={() => {
          feedback('light', { sound: 'character-greet' });
          const next = pathFriendResponse(unitId, interactions.current++);
          setResponse({ ...next, key: interactions.current });
          setMoving(true);
        }}
        hitSlop={4}
        style={{ minWidth: 48, minHeight: 48, alignItems: 'center' }}
      >
        <GameActor
          key={response?.key ?? 'idle'}
          character={character}
          size={size}
          motion={moving && response ? response.motion : idle ? 'idle' : 'still'}
          active={active && (moving || idle)}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  friend: { position: 'absolute', top: 8, zIndex: 3 },
  bubble: {
    position: 'absolute',
    bottom: '100%',
    width: 188,
    maxWidth: 188,
    backgroundColor: colors.surface,
    borderColor: colors.text,
    borderWidth: 2,
    borderRadius: radius.control,
    padding: space.sm,
    marginBottom: 5,
    zIndex: 6,
  },
  tail: {
    position: 'absolute',
    bottom: -8,
    width: 12,
    height: 12,
    backgroundColor: colors.surface,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text,
    transform: [{ rotate: '45deg' }],
  },
});
