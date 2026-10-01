import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import {
  playGameSound,
  releaseGameAudioOwner,
  setGameAudioOwnerActive,
  setGameAudioWalking,
  setGameAudioWorld,
  stopGameAudioOwner,
  type SoundName,
} from '@/services/game-audio';

/** A screen's sound scope stops on navigation blur; cleanup cannot stop another screen. */
export function useGameAudio() {
  const [owner] = useState(() => Symbol('game-audio-screen'));
  const soundEnabled = useAppStore((state) => state.settings.sound);
  useFocusEffect(useCallback(() => {
    setGameAudioOwnerActive(owner, true);
    return () => setGameAudioOwnerActive(owner, false);
  }, [owner]));
  useEffect(() => () => releaseGameAudioOwner(owner), [owner]);
  const actions = useMemo(() => ({
    play: (cue: SoundName) => playGameSound(cue, owner),
    setWorld: (world: string | null) => setGameAudioWorld(owner, world),
    setWalking: (walking: boolean) => setGameAudioWalking(owner, walking),
    stop: () => stopGameAudioOwner(owner),
  }), [owner]);
  return { ...actions, soundEnabled };
}
