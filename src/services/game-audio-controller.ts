export const gameCueIds = ['footstep', 'clue', 'snap', 'correct', 'wrong', 'completion'] as const;
export type GameCue = (typeof gameCueIds)[number];
/** Authored event voices reuse APK resources; no new bundled asset/native ID is required. */
export const soundProfiles = {
  'soft-tap': { cue: 'snap', rate: 1.4, volume: 0.28 },
  'pin-drop': { cue: 'snap', rate: 0.82, volume: 0.48 },
  'heart-loss': { cue: 'wrong', rate: 0.78, volume: 0.52 },
  'correct-step': { cue: 'correct', rate: 1.18, volume: 0.56 },
  'unit-complete': { cue: 'completion', rate: 0.9, volume: 0.6 },
  'character-greet': { cue: 'clue', rate: 1.45, volume: 0.44 },
  'pro-charge': { cue: 'completion', rate: 1.5, volume: 0.52 },
} as const satisfies Record<string, { cue: GameCue; rate: number; volume: number }>;
export type FeedbackSound = keyof typeof soundProfiles;
export type SoundName = GameCue | FeedbackSound;
export type AudioOwner = symbol | string;
export type GameAudioTimer = number | ReturnType<typeof setTimeout>;

export interface GameAudioPort {
  ready(): Promise<boolean>;
  rewind(): Promise<void>;
  play(): void | Promise<void>;
  pause(): void;
  volume(value: number): void;
  /** Pitch-changing speed for the short authored event profiles. Reset to 1 for raw cues. */
  rate?(value: number): void;
  cancelReady?(): void;
  durationMs?(): number;
}

const policy: Record<GameCue, { priority: number; gap: number; duration: number; volume: number }> = {
  footstep: { priority: 0, gap: 220, duration: 90, volume: 0.42 },
  snap: { priority: 1, gap: 90, duration: 80, volume: 0.48 },
  correct: { priority: 2, gap: 140, duration: 340, volume: 0.55 },
  wrong: { priority: 2, gap: 140, duration: 300, volume: 0.48 },
  clue: { priority: 1, gap: 250, duration: 260, volume: 0.55 },
  completion: { priority: 3, gap: 780, duration: 760, volume: 0.55 },
};

export interface GameAudioOptions {
  allowed(): boolean;
  prepare(): Promise<void>;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => GameAudioTimer;
  cancel?: (timer: GameAudioTimer) => void;
}

/** One global cue and one quiet ambience. Async work can never revive a muted scope. */
export function createGameAudioController(
  cues: Record<GameCue, GameAudioPort>,
  ambience: GameAudioPort,
  options: GameAudioOptions,
) {
  const now = options.now ?? (() => globalThis.performance?.now() ?? Date.now());
  const schedule = options.schedule ?? ((callback: () => void, delay: number) => setTimeout(callback, delay));
  const cancel = options.cancel ?? ((timer: GameAudioTimer) => clearTimeout(timer));
  const owners = new Map<AudioOwner, boolean>();
  const worlds = new Map<AudioOwner, string>();
  const walkers = new Set<AudioOwner>();
  const last = new Map<SoundName, number>();
  let disposed = false;
  let voiceActive = false;
  let cueGeneration = 0;
  let ambientGeneration = 0;
  let cue: { id: GameCue; sound: SoundName; solo: boolean; owner: AudioOwner; pending: boolean; until: number } | null = null;
  let ambientWorld: string | null = null;
  let ambientPending = false;
  let cueTimer: GameAudioTimer | undefined;
  let walkingTimer: GameAudioTimer | undefined;

  const allowed = (owner?: AudioOwner) =>
    !disposed && options.allowed() && (owner === undefined || owners.get(owner) !== false);
  const mixesWithVoice = (id: GameCue) => id === 'snap' || policy[id].priority >= 2;
  const quietly = (operation: () => void) => { try { operation(); } catch { /* Optional audio. */ } };

  function pauseCues() {
    cueGeneration += 1;
    if (cueTimer !== undefined) cancel(cueTimer);
    cueTimer = undefined;
    cue = null;
    for (const port of Object.values(cues)) {
      quietly(() => port.cancelReady?.());
      quietly(() => port.pause());
    }
    ambienceVolume();
  }

  function pauseAmbience() {
    ambientGeneration += 1;
    ambientWorld = null;
    ambientPending = false;
    quietly(() => ambience.cancelReady?.());
    quietly(() => ambience.pause());
  }

  function ambienceVolume() {
    quietly(() => ambience.volume(cue && (cue.pending || now() < cue.until) ? 0.07 : 0.22));
  }

  function stopWalking() {
    walkers.clear();
    if (walkingTimer !== undefined) cancel(walkingTimer);
    walkingTimer = undefined;
  }

  function stop() {
    pauseCues();
    pauseAmbience();
    stopWalking();
  }

  async function play(sound: SoundName, owner: AudioOwner): Promise<boolean> {
    const profile = Object.hasOwn(soundProfiles, sound) ? soundProfiles[sound as FeedbackSound] : undefined;
    const id = profile?.cue ?? sound as GameCue;
    if (!policy[id]) return false;
    // Authored event sounds never overlap spoken narration or queue stale late feedback.
    if (!allowed(owner) || (voiceActive && (profile || !mixesWithVoice(id)))) return false;
    const time = now();
    if (time - (last.get(sound) ?? -Infinity) < policy[id].gap) return false;
    if (cue && (cue.pending || time < cue.until) && policy[cue.id].priority > policy[id].priority) {
      return false;
    }
    pauseCues();
    const attempt = cueGeneration;
    cue = { id, sound, solo: !!profile, owner, pending: true, until: Infinity };
    last.set(sound, time);
    ambienceVolume();
    const port = cues[id];
    try {
      await options.prepare();
      if (attempt !== cueGeneration || !allowed(owner)) return false;
      if (!(await port.ready())) return false;
      if (attempt !== cueGeneration || !allowed(owner)) return false;
      await port.rewind();
      if (attempt !== cueGeneration || !allowed(owner)) return false;
      const rate = profile?.rate ?? 1;
      port.rate?.(rate);
      quietly(() => port.volume(profile?.volume ?? policy[id].volume));
      await port.play();
      if (attempt !== cueGeneration || !allowed(owner)) {
        // A superseding request may already be using this same player.
        if (attempt === cueGeneration || cue?.id !== id) quietly(() => port.pause());
        return false;
      }
      const duration = port.durationMs?.();
      const hold = (duration && Number.isFinite(duration) && duration > 0 ? duration : policy[id].duration) / rate + 60;
      cue = { id, sound, solo: !!profile, owner, pending: false, until: now() + hold };
      cueTimer = schedule(() => {
        if (attempt !== cueGeneration || disposed) return;
        cueTimer = undefined;
        ambienceVolume();
      }, hold);
      return true;
    } catch {
      if (attempt === cueGeneration) quietly(() => port.pause());
      return false;
    } finally {
      if (attempt === cueGeneration && cue?.pending) {
        cue = null;
        ambienceVolume();
      }
    }
  }

  function desiredWorld(): string | null {
    let current: string | null = null;
    for (const [owner, world] of worlds) if (allowed(owner)) current = world;
    return current;
  }

  async function refreshAmbience(): Promise<boolean> {
    const world = desiredWorld();
    if (!world || !allowed() || voiceActive) {
      pauseAmbience();
      return false;
    }
    if (ambientWorld === world) return true;
    pauseAmbience();
    const attempt = ambientGeneration;
    ambientWorld = world;
    ambientPending = true;
    const valid = () => attempt === ambientGeneration && allowed() && !voiceActive && desiredWorld() === world;
    try {
      await options.prepare();
      if (!valid()) return false;
      if (!(await ambience.ready())) return false;
      if (!valid()) return false;
      await ambience.rewind();
      if (!valid()) return false;
      ambienceVolume();
      await ambience.play();
      if (!valid()) {
        if (attempt === ambientGeneration || ambientWorld === null) quietly(() => ambience.pause());
        return false;
      }
      ambientPending = false;
      return true;
    } catch {
      if (attempt === ambientGeneration) quietly(() => ambience.pause());
      return false;
    } finally {
      if (attempt === ambientGeneration && ambientPending) {
        ambientWorld = null;
        ambientPending = false;
      }
    }
  }

  function setWorld(owner: AudioOwner, world: string | null) {
    if (world) worlds.set(owner, world);
    else worlds.delete(owner);
    void refreshAmbience();
  }

  function walkingTick() {
    walkingTimer = undefined;
    if (!allowed()) { stopWalking(); return; }
    const owner = [...walkers].find((candidate) => allowed(candidate));
    if (!owner) { stopWalking(); return; }
    void play('footstep', owner);
    walkingTimer = schedule(walkingTick, 290);
  }

  function setWalking(owner: AudioOwner, walking: boolean) {
    if (!walking) {
      walkers.delete(owner);
      if (cue?.id === 'footstep' && cue.owner === owner) pauseCues();
    }
    else if (allowed(owner)) walkers.add(owner);
    if (!walkers.size) {
      if (walkingTimer !== undefined) cancel(walkingTimer);
      walkingTimer = undefined;
    } else if (walkingTimer === undefined) walkingTick();
  }

  function stopOwner(owner: AudioOwner) {
    worlds.delete(owner);
    setWalking(owner, false);
    if (cue?.owner === owner) pauseCues();
    void refreshAmbience();
  }

  function setOwnerActive(owner: AudioOwner, active: boolean) {
    owners.set(owner, active);
    if (!active) stopOwner(owner);
  }

  function releaseOwner(owner: AudioOwner) {
    setOwnerActive(owner, false);
    owners.delete(owner);
  }

  function sync() {
    if (!allowed()) stop();
    else void refreshAmbience();
  }

  function setVoiceActive(active: boolean) {
    voiceActive = active;
    if (active) {
      pauseAmbience();
      if (cue && (cue.solo || !mixesWithVoice(cue.id))) pauseCues();
    } else void refreshAmbience();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    owners.clear();
    worlds.clear();
    last.clear();
  }

  return {
    play, stop, stopOwner, setOwnerActive, releaseOwner, setWorld, setWalking,
    refreshAmbience, sync, setVoiceActive, dispose,
    snapshot: () => ({
      cue: cue && (cue.pending || now() < cue.until) ? cue.id : null,
      sound: cue && (cue.pending || now() < cue.until) ? cue.sound : null,
      cuePending: cue?.pending ?? false,
      ambience: ambientWorld,
      ambiencePending: ambientPending,
      walkingOwners: walkers.size,
      voiceActive,
      disposed,
    }),
  };
}

export type GameAudioController = ReturnType<typeof createGameAudioController>;
