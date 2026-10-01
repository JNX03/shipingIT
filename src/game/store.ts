import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAdventureStore } from './create-adventure-store';

export const useAdventure = createAdventureStore(AsyncStorage);
export { adventureXP } from './state';
export type { AdventureStore } from './create-adventure-store';
