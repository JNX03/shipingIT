import { Asset } from 'expo-asset';
import { createWebGameAudioBank, webAudioContextClass } from './game-audio-web-context';
import {
  createGameAudioReadiness,
  gameAudioModules,
  type GameAudioBank,
  type GameAudioPort,
  type GameCue,
} from './game-audio-bank.types';

export type { GameAudioBank, GameAudioPort, GameCue } from './game-audio-bank.types';

/** Browser ports retain the real play promise so autoplay failures remain catchable. */
export function createGameAudioBank(): GameAudioBank {
  if (webAudioContextClass()) {
    const modules = gameAudioModules();
    const uri = (source: number | string) => {
      const asset = Asset.fromModule(source);
      return asset.localUri ?? asset.uri;
    };
    return createWebGameAudioBank({
      cues: Object.fromEntries(Object.entries(modules.cues).map(([cue, source]) => [cue, uri(source)])) as Record<GameCue, string>,
      ambience: uri(modules.ambience),
    });
  }
  if (typeof globalThis.Audio !== 'function') throw new Error('Browser audio is unavailable');
  const modules = gameAudioModules();
  const releases: (() => void)[] = [];
  let disposed = false;
  const safely = (operation: () => void) => {
    try { operation(); } catch { /* Release the remaining media after any failure. */ }
  };

  function createPort(source: number | string, loop: boolean): GameAudioPort {
    const asset = Asset.fromModule(source);
    const media = new Audio(asset.localUri ?? asset.uri);
    let closed = false;
    let playVersion = 0;
    let paused = true;
    const readiness = createGameAudioReadiness({
      isReady: () => !closed && media.readyState >= 2,
      subscribe: (loaded, failed) => {
        media.addEventListener('loadeddata', loaded);
        media.addEventListener('canplay', loaded);
        media.addEventListener('error', failed);
        media.addEventListener('abort', failed);
        return () => {
          media.removeEventListener('loadeddata', loaded);
          media.removeEventListener('canplay', loaded);
          media.removeEventListener('error', failed);
          media.removeEventListener('abort', failed);
        };
      },
    });
    releases.push(() => {
      if (closed) return;
      closed = true;
      paused = true;
      playVersion += 1;
      readiness.dispose();
      safely(() => media.pause());
      safely(() => media.removeAttribute('src'));
      safely(() => media.load());
      safely(() => media.remove());
    });
    media.preload = 'auto';
    media.autoplay = false;
    media.loop = loop;
    media.volume = loop ? 0.22 : 0.55;
    media.load();
    const assertOpen = () => {
      if (closed) throw new Error('Game audio media is disposed');
    };
    return {
      ready: readiness.ready,
      cancelReady: readiness.cancelReady,
      rewind: async () => {
        assertOpen();
        media.currentTime = 0;
      },
      play: async () => {
        assertOpen();
        const attempt = ++playVersion;
        paused = false;
        await media.play();
        if (closed || attempt !== playVersion) {
          // An old promise must never pause a newer play on this shared element.
          if (!closed && paused) safely(() => media.pause());
          throw new Error('Game audio playback was canceled');
        }
      },
      pause: () => {
        paused = true;
        playVersion += 1;
        if (!closed) media.pause();
      },
      volume: (value) => {
        if (!closed) media.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      },
      rate: (value) => {
        if (closed) return;
        media.preservesPitch = false;
        media.playbackRate = Number.isFinite(value) ? Math.max(0.5, Math.min(2, value)) : 1;
      },
      durationMs: () => closed ? 0 : media.duration * 1000,
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
    return { cues, ambience, prepare: async () => {}, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
