import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import {
  createGameAudioReadiness,
  gameAudioModules,
  type GameAudioBank,
  type GameAudioPort,
  type GameCue,
} from './game-audio-bank.types';

export type { GameAudioBank, GameAudioPort, GameCue } from './game-audio-bank.types';

const OPTIONS = { updateInterval: 1000, keepAudioSessionActive: false };

/** Call from the root audio effect; importing this module never constructs players. */
export function createGameAudioBank(): GameAudioBank {
  const modules = gameAudioModules();
  const releases: (() => void)[] = [];
  let disposed = false;
  let prepared: Promise<void> | undefined;
  const safely = (operation: () => void) => {
    try { operation(); } catch { /* Release the remaining players even after failure. */ }
  };

  function createPort(source: number | string, loop: boolean): GameAudioPort {
    const player = createAudioPlayer(source, OPTIONS);
    let closed = false;
    const readiness = createGameAudioReadiness({
      isReady: () => !closed && player.isLoaded,
      subscribe: (loaded, failed) => {
        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (status.error) failed();
          else if (status.isLoaded) loaded();
        });
        return () => subscription.remove();
      },
    });
    releases.push(() => {
      if (closed) return;
      closed = true;
      readiness.dispose();
      safely(() => player.pause());
      safely(() => player.remove());
    });
    // Register disposal before configuration, which can itself throw.
    player.loop = loop;
    player.volume = loop ? 0.22 : 0.55;
    const assertOpen = () => {
      if (closed) throw new Error('Game audio player is disposed');
    };
    return {
      ready: readiness.ready,
      cancelReady: readiness.cancelReady,
      rewind: () => {
        assertOpen();
        return player.seekTo(0);
      },
      play: () => {
        assertOpen();
        player.play();
      },
      pause: () => { if (!closed) player.pause(); },
      volume: (value) => {
        if (!closed) player.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      },
      rate: (value) => {
        if (closed) return;
        player.shouldCorrectPitch = false;
        player.setPlaybackRate(Number.isFinite(value) ? Math.max(0.5, Math.min(2, value)) : 1);
      },
      durationMs: () => closed ? 0 : player.duration * 1000,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const release of releases) safely(release);
    releases.length = 0;
  }

  try {
    const cues = Object.fromEntries(
      Object.entries(modules.cues).map(([cue, source]) => [cue, createPort(source, false)]),
    ) as Record<GameCue, GameAudioPort>;
    const ambience = createPort(modules.ambience, true);
    return {
      cues,
      ambience,
      prepare: () => {
        if (disposed) return Promise.reject(new Error('Game audio bank is disposed'));
        prepared ??= setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'mixWithOthers',
        }).catch((error) => {
          prepared = undefined;
          throw error;
        });
        return prepared;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
