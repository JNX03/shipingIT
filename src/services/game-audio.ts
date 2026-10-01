import type { AudioOwner, GameAudioController, SoundName } from './game-audio-controller';

export type { GameCue, FeedbackSound, SoundName } from './game-audio-controller';
const feedbackOwner = Symbol('game-feedback');
const scopes = new Map<AudioOwner, { active: boolean; world: string | null }>();
const voices = new Set<symbol>();
let controller: GameAudioController | null = null;
let environmentAllowed: () => boolean = () => false;

/** Mounted once by GameAudioBridge; requests made before mount never queue cues. */
export function attachGameAudio(next: GameAudioController, allowed: () => boolean) {
  controller?.dispose();
  controller = next;
  environmentAllowed = allowed;
  next.setVoiceActive(voices.size > 0);
  for (const [owner, scope] of scopes) {
    next.setOwnerActive(owner, scope.active);
    if (scope.active) next.setWorld(owner, scope.world);
  }
  return () => {
    if (controller !== next) return;
    controller = null;
    environmentAllowed = () => false;
    next.dispose();
  };
}

export function isGameAudioAllowed() {
  return controller !== null && environmentAllowed();
}

export function playGameSound(cue: SoundName, owner: AudioOwner = feedbackOwner) {
  if (!controller || !isGameAudioAllowed()) return Promise.resolve(false);
  if (owner !== feedbackOwner && scopes.get(owner)?.active !== true) return Promise.resolve(false);
  // Existing Button/lesson callers receive the new authored sound without UI edits.
  const sound = cue === 'snap' ? 'soft-tap' : cue === 'correct' ? 'correct-step' :
    cue === 'wrong' ? 'heart-loss' : cue === 'completion' ? 'unit-complete' : cue;
  return controller.play(sound, owner);
}

export function setGameAudioOwnerActive(owner: AudioOwner, active: boolean) {
  const scope = scopes.get(owner) ?? { active: false, world: null };
  scope.active = active;
  scopes.set(owner, scope);
  controller?.setOwnerActive(owner, active);
  if (active) controller?.setWorld(owner, scope.world);
}

export function setGameAudioWorld(owner: AudioOwner, world: string | null) {
  const scope = scopes.get(owner) ?? { active: false, world: null };
  scope.world = world;
  scopes.set(owner, scope);
  controller?.setWorld(owner, scope.active ? world : null);
}

export function setGameAudioWalking(owner: AudioOwner, walking: boolean) {
  controller?.setWalking(owner, walking && scopes.get(owner)?.active === true);
}

export function stopGameAudioOwner(owner: AudioOwner) {
  const scope = scopes.get(owner);
  if (scope) scope.world = null;
  controller?.stopOwner(owner);
}

export function releaseGameAudioOwner(owner: AudioOwner) {
  scopes.delete(owner);
  controller?.releaseOwner(owner);
}

/** Idempotent speech lease. Older speech callbacks cannot resume a newer voice. */
export function suspendGameAmbienceForVoice() {
  const token = Symbol('character-voice');
  voices.add(token);
  controller?.setVoiceActive(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    voices.delete(token);
    controller?.setVoiceActive(voices.size > 0);
  };
}

/** Read-only diagnostics for QA; no player or platform internals exposed. */
export function getGameAudioSnapshot() {
  return controller?.snapshot() ?? null;
}
