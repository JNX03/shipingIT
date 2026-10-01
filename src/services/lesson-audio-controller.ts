export type LessonSound = 'correct' | 'wrong' | 'completion';

export interface LessonAudioPort {
  ready(): Promise<boolean>;
  rewind(): Promise<void>;
  play(): void;
  pause(): void;
}

/** Serializes optional feedback; muting/unmounting cancels pending playback. */
export function createLessonAudioController(
  players: Record<LessonSound, LessonAudioPort>,
  canPlay: () => boolean,
  prepare: () => Promise<void>,
  initiallyActive = true,
) {
  let generation = 0;
  let active = initiallyActive;

  function stop() {
    generation += 1;
    for (const player of Object.values(players)) {
      try {
        player.pause();
      } catch {
        /* An already released audio session is harmless. */
      }
    }
  }

  async function play(sound: LessonSound): Promise<boolean> {
    stop();
    const attempt = generation;
    if (!active || !canPlay()) return false;
    const player = players[sound];
    try {
      await prepare();
      if (attempt !== generation || !active || !canPlay()) return false;
      if (!(await player.ready())) return false;
      if (attempt !== generation || !active || !canPlay()) return false;
      await player.rewind();
      if (attempt !== generation || !active || !canPlay()) return false;
      player.play();
      return true;
    } catch {
      // Audio is decorative feedback. The lesson can always continue silently.
      return false;
    }
  }

  function setActive(value: boolean) {
    active = value;
    if (!value) stop();
  }

  return { play, stop, setActive };
}
