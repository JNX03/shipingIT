import type { GameMotion } from './avatar-motion';

const messages = [
  'A small clue can become a great idea.',
  'One clear problem is a strong start.',
  'A small first version is still a real version.',
  'Let’s make something people can try.',
  'Good builders listen, try, and improve.',
  'You’re building one useful step at a time.',
  'Every connection has a job. You’ve got this.',
  'Launch crew ready! Ship a little, learn a lot. I’m cheering for you.',
] as const;
const motions: GameMotion[] = ['greet', 'wave', 'clap'];
export const PATH_FRIEND_MOTION_MS = 2600;

/** A small local character response. It never sends a message or writes progress. */
export function pathFriendResponse(unitId: number, interaction: number) {
  const unit = Math.max(0, Math.min(messages.length - 1, unitId - 1));
  const turn = Math.max(0, Math.floor(interaction)) % motions.length;
  return {
    motion: motions[turn]!,
    message:
      turn === 0
        ? `Hi! ${messages[unit]}`
        : turn === 1
          ? 'You’ve got this. One step at a time!'
          : messages[unit]!,
  };
}
