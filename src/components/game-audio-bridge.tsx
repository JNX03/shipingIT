import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { createGameAudioBank } from '@/services/game-audio-bank';
import { createGameAudioController } from '@/services/game-audio-controller';
import { attachGameAudio } from '@/services/game-audio';
import { stopCharacterVoice } from '@/game/speech';

/** One app-owned bank. Audio has no rendering surface and requests no microphone. */
export function GameAudioBridge() {
  useEffect(() => {
    let mounted = true;
    let foreground = AppState.currentState !== 'inactive' && AppState.currentState !== 'background';
    const doc = Platform.OS === 'web' && typeof document !== 'undefined' ? document : null;
    const browserActivated = () => {
      if (!doc) return true;
      const activation = navigator.userActivation;
      return !activation || activation.hasBeenActive || activation.isActive;
    };
    const allowed = () => mounted && foreground && useAppStore.getState().settings.sound &&
      (!doc || doc.visibilityState !== 'hidden') && browserActivated();
    let bank: ReturnType<typeof createGameAudioBank>;
    try { bank = createGameAudioBank(); } catch { return; }
    const controller = createGameAudioController(bank.cues, bank.ambience, { allowed, prepare: bank.prepare });
    const detach = attachGameAudio(controller, allowed);
    const sync = () => {
      controller.sync();
      if (!allowed()) stopCharacterVoice();
    };
    const activate = () => {
      // Keep resume in the gesture's call stack; hasBeenActive alone is not an unlock.
      if (allowed()) bank.activate?.();
      sync();
    };
    const appState = AppState.addEventListener('change', (state) => {
      // Set the gate before releasing voice leases so ambience cannot briefly resume.
      foreground = state === 'active';
      sync();
    });
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.settings.sound !== previous.settings.sound) sync();
    });
    const pageHide = () => { foreground = false; sync(); };
    const pageShow = () => { foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive'; sync(); };
    doc?.addEventListener('visibilitychange', sync);
    doc?.addEventListener('pointerdown', activate, true);
    doc?.addEventListener('keydown', activate, true);
    doc?.addEventListener('touchend', activate, true);
    doc?.addEventListener('click', activate, true);
    if (doc) {
      window.addEventListener('pagehide', pageHide);
      window.addEventListener('pageshow', pageShow);
    }
    sync();
    return () => {
      mounted = false;
      appState.remove();
      unsubscribe();
      doc?.removeEventListener('visibilitychange', sync);
      doc?.removeEventListener('pointerdown', activate, true);
      doc?.removeEventListener('keydown', activate, true);
      doc?.removeEventListener('touchend', activate, true);
      doc?.removeEventListener('click', activate, true);
      if (doc) {
        window.removeEventListener('pagehide', pageHide);
        window.removeEventListener('pageshow', pageShow);
      }
      controller.sync();
      stopCharacterVoice();
      detach();
      bank.dispose();
    };
  }, []);
  return null;
}
