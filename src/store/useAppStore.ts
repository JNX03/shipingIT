import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAppStore } from './createAppStore';

export { createAppStore, persistedSnapshot, STORAGE_KEY } from './createAppStore';
export type { AppStore, LocalStorageAdapter } from './createAppStore';
export const useAppStore = createAppStore(AsyncStorage);
