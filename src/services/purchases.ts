import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { serviceConfig } from './config';
import { authProvider } from './auth';
import { createSubscriptionService } from './purchases-core';

export const subscriptionService = createSubscriptionService({
  config: serviceConfig,
  platform: Platform.OS,
  isStoreClient: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  getAuthStatus: () => authProvider.getStatus(),
  loadSDK: async () => {
    const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
    Purchases.setLogLevel(
      typeof __DEV__ !== 'undefined' && __DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR,
    );
    return Purchases;
  },
});

export type {
  SubscriptionPackage,
  SubscriptionStatus,
  SubscriptionOfferings,
  PurchaseResult,
} from './contracts';
