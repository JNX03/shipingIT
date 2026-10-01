import * as Speech from 'expo-speech';
import { createCharacterVoiceController } from '@/services/character-voice-controller';
import { isGameAudioAllowed, suspendGameAmbienceForVoice } from '@/services/game-audio';
import {
  createInstalledVoiceCache,
  selectInstalledVoice,
  type VoiceCharacter,
} from '@/services/character-voice-policy';

const catalog = createInstalledVoiceCache(() => Speech.getAvailableVoicesAsync());
let speechEpoch = 0;
let context: { character: VoiceCharacter; locale: string } = { character: 'ami', locale: 'en-US' };

const voice = createCharacterVoiceController(
  {
    stop: () => {
      speechEpoch++;
      return Speech.stop();
    },
    speak: (text, callbacks) => {
      const epoch = speechEpoch;
      const selectedContext = context;
      void catalog.get().then((voices) => {
        if (epoch !== speechEpoch || !isGameAudioAllowed()) {
          callbacks.stopped();
          return;
        }
        const selected = selectInstalledVoice(
          voices,
          selectedContext.character,
          selectedContext.locale,
        );
        try {
          Speech.speak(text, {
            language: selected.language,
            voice: selected.voice,
            rate: selected.rate,
            pitch: selected.pitch,
            onDone: callbacks.done,
            onStopped: callbacks.stopped,
            onError: callbacks.error,
          });
        } catch {
          callbacks.error();
        }
      });
    },
  },
  { allowed: isGameAudioAllowed, suspendAmbience: suspendGameAmbienceForVoice },
);

/** Explicit read-aloud only; never records the player or requests microphone permission. */
export function readCharacterLine(
  text: string,
  onEnd?: () => void,
  options?: { character?: VoiceCharacter; locale?: string },
) {
  context = { character: options?.character ?? 'ami', locale: options?.locale ?? 'en-US' };
  return voice.read(text, onEnd);
}
export function stopCharacterVoice() {
  voice.stop();
}
