import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPracticeSession } from './session';

export const optionalPractice = createPracticeSession(AsyncStorage);

export function useOptionalPractice() {
  const snapshot = useSyncExternalStore(
    optionalPractice.subscribe,
    optionalPractice.getSnapshot,
    optionalPractice.getSnapshot,
  );
  useEffect(() => {
    void optionalPractice.hydrate();
  }, []);
  return snapshot;
}
