import { useCallback } from 'react';
import { useGameAudio } from './use-game-audio';

/** Existing lesson facade, backed by the same app-wide cue bank as the game. */
export function useLessonAudio() {
  const { play, stop, soundEnabled } = useGameAudio();
  const playCorrect = useCallback(() => play('correct'), [play]);
  const playWrong = useCallback(() => play('wrong'), [play]);
  const playCompletion = useCallback(() => play('completion'), [play]);
  return { playCorrect, playWrong, playCompletion, stop, soundEnabled };
}
