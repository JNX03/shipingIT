import type { GameMotion } from './avatar-motion';

export function actorMayRun(state: { active: boolean; reduced: boolean; motion: GameMotion; foreground: boolean; focused: boolean; visible: boolean }) {
  return state.active && !state.reduced && state.motion !== 'still' && state.foreground && state.focused && state.visible;
}

export function actorMotionPriority(motion: GameMotion) {
  if (motion === 'walk') return 6;
  if (motion === 'celebrate' || motion === 'clap') return 5;
  if (['talk', 'explain', 'point', 'greet', 'wave', 'react'].includes(motion)) return 4;
  if (motion === 'thinking' || motion === 'inspect') return 3;
  return motion === 'listen' ? 2 : motion === 'idle' ? 1 : 0;
}

/** Stop the previous clock before starting another; repeated requests never steal ownership. */
export function createActorActivity() {
  const requests = new Map<string, { priority: number; order: number }>();
  const listeners = new Map<string, (running: boolean) => void>();
  let owner: string | undefined;
  let order = 0;
  const publish = () => {
    const next = [...requests].sort((a, b) => b[1].priority - a[1].priority || b[1].order - a[1].order)[0]?.[0];
    if (next === owner) return;
    const previous = owner;
    owner = undefined;
    if (previous) listeners.get(previous)?.(false);
    owner = next;
    if (next) listeners.get(next)?.(true);
  };
  return {
    get owner() { return owner; },
    subscribe(id: string, listener: (running: boolean) => void) {
      listeners.set(id, listener);
      listener(owner === id);
      return () => { listeners.delete(id); };
    },
    request(id: string, eligible: boolean, priority: number) {
      if (!eligible) requests.delete(id);
      else if (requests.get(id)?.priority !== priority) requests.set(id, { priority, order: ++order });
      publish();
    },
    release(id: string) { requests.delete(id); publish(); },
  };
}

export const actorActivity = createActorActivity();
