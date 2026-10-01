import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { createProjectLibrary } from './create-project-library';

export const projectLibrary = createProjectLibrary(AsyncStorage);
export function useProjectLibrary() {
  const state = useSyncExternalStore(
    projectLibrary.subscribe,
    projectLibrary.getSnapshot,
    projectLibrary.getSnapshot,
  );
  useEffect(() => {
    void projectLibrary.hydrate();
  }, []);
  return state;
}
