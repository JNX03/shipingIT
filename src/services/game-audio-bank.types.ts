import type { GameAudioPort, GameCue } from './game-audio-controller';

export type { GameAudioPort, GameCue } from './game-audio-controller';

export interface GameAudioBank {
  cues: Record<GameCue, GameAudioPort>;
  ambience: GameAudioPort;
  /** Called synchronously from a browser gesture, before any awaited work. */
  activate?(): void;
  prepare(): Promise<void>;
  dispose(): void;
}

export function gameAudioModules() {
  return {
    cues: {
      footstep: require('../../assets/audio/game/footstep.wav'),
      clue: require('../../assets/audio/game/clue.wav'),
      snap: require('../../assets/audio/game/snap.wav'),
      correct: require('../../assets/audio/game/correct.wav'),
      wrong: require('../../assets/audio/game/wrong.wav'),
      completion: require('../../assets/audio/game/completion.wav'),
    } as Record<GameCue, number | string>,
    ambience: require('../../assets/audio/game/world-ambience.wav') as number | string,
  };
}

interface ReadinessSource {
  isReady(): boolean;
  subscribe(loaded: () => void, failed: () => void): () => void;
}

type ScheduleReadiness = (callback: () => void, milliseconds: number) => () => void;

/** A canceled/disposed load resolves false and leaves no listeners or timers behind. */
export function createGameAudioReadiness(
  source: ReadinessSource,
  schedule: ScheduleReadiness = (callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds);
    return () => clearTimeout(timer);
  },
) {
  const pending = new Set<(ready: boolean) => void>();
  let disposed = false;
  const safely = (cleanup: (() => void) | undefined) => {
    try { cleanup?.(); } catch { /* Optional feedback can always remain silent. */ }
  };

  function ready(): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    try {
      if (source.isReady()) return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let unsubscribe: (() => void) | undefined;
      let cancelTimeout: (() => void) | undefined;
      const finish = (loaded: boolean) => {
        if (settled) return;
        settled = true;
        pending.delete(finish);
        safely(cancelTimeout);
        safely(unsubscribe);
        resolve(loaded && !disposed);
      };
      pending.add(finish);
      try {
        unsubscribe = source.subscribe(() => finish(true), () => finish(false));
        // A subscriber may immediately deliver an already completed load.
        if (settled) { safely(unsubscribe); return; }
        cancelTimeout = schedule(() => finish(false), 1000);
        if (settled) { safely(cancelTimeout); return; }
        // Covers loading between the initial read and installing subscriptions.
        if (disposed) finish(false);
        else if (source.isReady()) finish(true);
      } catch {
        finish(false);
      }
    });
  }

  function cancelReady() {
    for (const finish of [...pending]) finish(false);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelReady();
  }

  return { ready, cancelReady, dispose };
}
