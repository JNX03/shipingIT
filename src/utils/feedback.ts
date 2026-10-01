import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { playGameSound, type SoundName } from '@/services/game-audio';
export function feedback(
  kind: 'light' | 'selection' | 'success' | 'error' | 'medium',
  options?: { sound?: SoundName | false; haptic?: boolean },
) {
  const sound = options?.sound ?? (kind === 'success' ? 'correct-step' : kind === 'error' ? 'heart-loss' : kind === 'selection' ? 'pin-drop' : 'soft-tap');
  if (sound) void playGameSound(sound);
  if (options?.haptic === false) return;
  if (Platform.OS === 'web' || !useAppStore.getState().settings.haptics) return;
  const task =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind === 'success' || kind === 'error'
        ? Haptics.notificationAsync(
            kind === 'success'
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          )
        : Haptics.impactAsync(
            kind === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light,
          );
  void task.catch(() => undefined);
}
