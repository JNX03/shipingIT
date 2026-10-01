import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createProfileAvatarStore } from './profile-avatar';

export const useProfileAvatar = createProfileAvatarStore(AsyncStorage);

/** Use on Profile or the editor; hydration is shared and deduplicated. */
export function useSavedProfileAvatar() {
  const state = useProfileAvatar();
  const hydrate = state.hydrate;
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return state;
}
