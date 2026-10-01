import AsyncStorage from '@react-native-async-storage/async-storage';
import { createChallengeStore } from './challenges/create-store';
export const useChallenges = createChallengeStore(AsyncStorage);
export { challengeXP, isChallengeUnlocked } from './challenges/create-store';
export type { ChallengeState } from './challenges/create-store';
