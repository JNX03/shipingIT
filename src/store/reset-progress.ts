import type { AppStore } from './createAppStore';
import type { AdventureStore } from '../game/create-adventure-store';

type LearningStore = { getState: () => AppStore };
type GameStore = { getState: () => AdventureStore };

/** The destructive action is gated here as well as in Settings. */
export async function resetLocalProgress(
  confirmation: string,
  learning: LearningStore,
  adventure: GameStore,
): Promise<{ success: boolean; message: string }> {
  if (confirmation !== 'RESET') {
    return { success: false, message: 'Type RESET to confirm.' };
  }
  if (!learning.getState().hydrated || !adventure.getState().hydrated) {
    return { success: false, message: 'Your saved progress is still loading. Please try again.' };
  }
  try {
    learning.getState().resetProgress();
    adventure.getState().reset();
    // These stores expose write failures as state. A resolved flush alone is not success.
    const writes = await Promise.allSettled([
      learning.getState().flushPersistence(),
      adventure.getState().flush(),
    ]);
    if (
      writes.some((write) => write.status === 'rejected') ||
      learning.getState().storageError ||
      adventure.getState().error
    ) {
      return {
        success: false,
        message:
          'The reset could not be fully saved. Stay here and retry Reset progress before closing the app.',
      };
    }
    return { success: true, message: 'Your local progress has been reset.' };
  } catch {
    return {
      success: false,
      message: 'The reset could not be completed. Stay here and retry Reset progress.',
    };
  }
}
