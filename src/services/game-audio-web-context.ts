import { createGameAudioReadiness, type GameAudioBank, type GameAudioPort, type GameCue } from './game-audio-bank.types';

type AudioSources = { cues: Record<GameCue, string>; ambience: string };

export function webAudioContextClass(): typeof AudioContext | undefined {
  return globalThis.AudioContext ??
    (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/** One gesture-unlocked context for every predecoded, original short cue. */
export function createWebGameAudioBank(sources: AudioSources): GameAudioBank {
  const Context = webAudioContextClass();
  if (!Context) throw new Error('Browser audio context is unavailable');
  const context = new Context({ latencyHint: 'interactive' });
  const releases: (() => void)[] = [];
  let disposed = false;
  let unlocking: Promise<void> | undefined;
  const running = () => context.state === 'running';
  const safely = (operation: () => void) => { try { operation(); } catch { /* Optional audio. */ } };

  function activate() {
    if (disposed || context.state === 'closed' || context.state === 'running') return;
    // Invoke resume NOW, not after fetch/decode/ready: mobile browsers require a gesture.
    try {
      const attempt = context.resume();
      unlocking = attempt;
      void attempt.catch(() => { if (unlocking === attempt) unlocking = undefined; });
    } catch { unlocking = undefined; }
  }

  function createPort(uri: string, loop: boolean): GameAudioPort {
    const gain = context.createGain();
    const request = new AbortController();
    const listeners = new Set<{ loaded(): void; failed(): void }>();
    let buffer: AudioBuffer | undefined;
    let source: AudioBufferSourceNode | undefined;
    let failed = false;
    let closed = false;
    let rate = 1;
    const readiness = createGameAudioReadiness({
      isReady: () => !closed && !!buffer,
      subscribe: (loaded, onFailed) => {
        const listener = { loaded, failed: onFailed };
        listeners.add(listener);
        if (failed || closed) onFailed();
        return () => { listeners.delete(listener); };
      },
    });
    const pause = () => {
      const previous = source;
      source = undefined;
      if (!previous) return;
      previous.onended = null;
      safely(() => previous.stop());
      safely(() => previous.disconnect());
    };
    releases.push(() => {
      if (closed) return;
      closed = true;
      request.abort();
      readiness.dispose();
      listeners.clear();
      pause();
      buffer = undefined;
      safely(() => gain.disconnect());
    });
    gain.gain.value = loop ? 0.22 : 0.55;
    gain.connect(context.destination);
    // Assets are bundled by Expo. Decode once; no new media/download on each press.
    void fetch(uri, { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Audio asset unavailable (${response.status})`);
        return response.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes))
      .then((decoded) => {
        if (closed) return;
        buffer = decoded;
        for (const listener of [...listeners]) listener.loaded();
      })
      .catch(() => {
        failed = true;
        for (const listener of [...listeners]) listener.failed();
      });
    return {
      ready: readiness.ready,
      cancelReady: readiness.cancelReady,
      rewind: async () => { pause(); },
      play: () => {
        if (closed || !buffer || context.state !== 'running') throw new Error('Browser audio is not ready');
        pause();
        const next = context.createBufferSource();
        source = next;
        next.buffer = buffer;
        next.loop = loop;
        next.playbackRate.value = rate;
        next.connect(gain);
        next.onended = () => {
          if (source === next) source = undefined;
          safely(() => next.disconnect());
        };
        next.start();
      },
      pause,
      volume: (value) => {
        if (!closed) gain.gain.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      },
      rate: (value) => { if (!closed) rate = Number.isFinite(value) ? Math.max(0.5, Math.min(2, value)) : 1; },
      durationMs: () => closed ? 0 : (buffer?.duration ?? 0) * 1000,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const release of releases) safely(release);
    releases.length = 0;
    safely(() => { void context.close().catch(() => undefined); });
  }

  try {
    const cues = Object.fromEntries(Object.entries(sources.cues).map(([cue, uri]) => [cue, createPort(uri, false)])) as Record<GameCue, GameAudioPort>;
    const ambience = createPort(sources.ambience, true);
    return {
      cues, ambience, activate, dispose,
      prepare: async () => {
        if (disposed) throw new Error('Game audio bank is disposed');
        if (running()) return;
        if (!unlocking) throw new Error('Browser audio needs a user gesture');
        await unlocking;
        if (disposed || !running()) throw new Error('Browser audio could not resume');
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
