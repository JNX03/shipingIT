import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import type {
  AuthStatus,
  PurchaseResult,
  SubscriptionService,
  SubscriptionStatus,
} from './contracts';
import type { serviceConfig } from './config';

export type PurchasesSDK = Pick<
  typeof import('react-native-purchases').default,
  | 'isConfigured'
  | 'configure'
  | 'isAnonymous'
  | 'logIn'
  | 'logOut'
  | 'getCustomerInfo'
  | 'invalidateCustomerInfoCache'
  | 'getOfferings'
  | 'purchasePackage'
  | 'restorePurchases'
>;

export interface SubscriptionDependencies {
  config: Pick<
    typeof serviceConfig,
    | 'builderEntitlement'
    | 'builderPurchasesEnabled'
    | 'revenueCatUseTestStore'
    | 'revenueCatBuildMode'
    | 'revenueCatTestKey'
    | 'revenueCatIOSKey'
    | 'revenueCatAndroidKey'
    | 'revenueCatWebKey'
  >;
  platform: string;
  isStoreClient: boolean;
  loadSDK: () => Promise<PurchasesSDK>;
  getAuthStatus: () => Promise<Pick<AuthStatus, 'identity'>>;
}

/** Isolates SDK and account I/O so the production state machine can be tested without native modules. */
export function createSubscriptionService({
  config,
  platform,
  isStoreClient,
  loadSDK,
  getAuthStatus,
}: SubscriptionDependencies): SubscriptionService {
  const entitlementId = config.builderEntitlement;
  let initialization: Promise<PurchasesSDK | null> | null = null;
  const loadedPackages = new Map<string, PurchasesPackage>();
  let lastIssue = 'ShipingIT Pro is unavailable right now. Core learning is free after sign-in.';
  let purchaseInFlight = false;
  let activeIdentity: string | null = null;
  let identityRevision = 0;
  let identityQueue: Promise<void> = Promise.resolve();
  type SDKSession = { sdk: PurchasesSDK; identity: string | null; revision: number };
  function invalidateSDK() {
    initialization = null;
    loadedPackages.clear();
    activeIdentity = null;
    identityRevision++;
  }

  function apiKey(): string | null {
    // Test Store is a build contract, not a purchase-button flag. The native SDK
    // rejects these keys in release apps, even when only loading customer info.
    // QA may embed production JS, so __DEV__ must not decide this policy.
    if (config.revenueCatBuildMode === 'test-store-qa') {
      const key = config.revenueCatTestKey?.trim();
      return config.revenueCatUseTestStore && key && /^test_[A-Za-z0-9_-]+$/.test(key)
        ? key
        : null;
    }
    if (config.revenueCatUseTestStore) return null;
    const key = (
      platform === 'ios'
        ? config.revenueCatIOSKey
        : platform === 'android'
          ? config.revenueCatAndroidKey
          : platform === 'web'
            ? config.revenueCatWebKey
            : null
    )?.trim();
    // A misplaced Test Store key must not reach configure through a platform slot.
    return key && !key.startsWith('test_') ? key : null;
  }
  function unavailable(message = lastIssue): SubscriptionStatus {
    return {
      configured: Boolean(apiKey()),
      entitled: false,
      state: apiKey() ? 'unavailable' : 'unconfigured',
      entitlementId,
      expiresAt: null,
      managementUrl: null,
      isSandbox: false,
      message,
    };
  }
  function fromCustomerInfo(info: CustomerInfo): SubscriptionStatus {
    const entitlement = info.entitlements.active[entitlementId];
    const expiresAt = entitlement?.expirationDate ?? null;
    // Match the existing export access guard: SDK flags alone cannot make an
    // expired or malformed period usable. Null remains valid for lifetime access.
    const validExpiry =
      expiresAt === null ||
      (Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > Date.now());
    const entitled = Boolean(entitlement?.isActive) && validExpiry;
    return {
      configured: true,
      entitled,
      state: 'ready',
      entitlementId,
      expiresAt,
      managementUrl: info.managementURL ?? null,
      isSandbox: Boolean(entitlement?.isSandbox),
      message: entitled
        ? 'ShipingIT Pro is active.'
        : 'Core learning is free after sign-in. ShipingIT Pro adds full Project Pack export.',
    };
  }
  async function prepareSDK(): Promise<SDKSession | null> {
    const key = apiKey();
    if (!key) return null;
    // The Expo Go SDK can simulate purchases. This app must never mistake that for a real entitlement.
    if (platform !== 'web' && isStoreClient) {
      lastIssue = 'Purchases are unavailable in Expo Go. Open the installed ShipingIT app.';
      return null;
    }
    const auth = await getAuthStatus();
    const desiredIdentity = auth.identity?.id ?? null;
    if (platform === 'web' && !desiredIdentity) {
      lastIssue = 'Sign in to choose ShipingIT Pro and recover your membership.';
      loadedPackages.clear();
      return null;
    }
    if (!initialization)
      initialization = (async () => {
        const Purchases = await loadSDK();
        if (!(await Purchases.isConfigured()))
          Purchases.configure({
            apiKey: key,
            ...(desiredIdentity ? { appUserID: desiredIdentity } : {}),
          });
        else if (desiredIdentity) await Purchases.logIn(desiredIdentity);
        else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
        activeIdentity = desiredIdentity;
        return Purchases;
      })()
        .catch(() => {
          lastIssue = 'Could not connect to the store. Try again later. Core learning stays free.';
          invalidateSDK();
          return null;
        })
        .then((value) => {
          if (!value) initialization = null;
          return value;
        });
    const Purchases = await initialization;
    if (Purchases && desiredIdentity !== activeIdentity) {
      loadedPackages.clear();
      identityRevision++;
      if (desiredIdentity) await Purchases.logIn(desiredIdentity);
      else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
      activeIdentity = desiredIdentity;
    }
    return Purchases
      ? { sdk: Purchases, identity: desiredIdentity, revision: identityRevision }
      : null;
  }
  function sdk() {
    // RevenueCat owns one mutable SDK identity. Serialize transitions and read the
    // latest auth identity inside the queue, so an old login cannot win a race.
    const pending = identityQueue.then(prepareSDK).catch((error: unknown) => {
      // A rejected native login/logout can still have changed the SDK account.
      // Reconcile it on the next request instead of trusting the previous ID.
      invalidateSDK();
      throw error;
    });
    identityQueue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }
  function failure(message: string, cancelled = false): PurchaseResult {
    return { success: false, cancelled, status: unavailable(message), message };
  }
  async function identityUnchanged(expected: SDKSession): Promise<boolean> {
    return (
      ((await getAuthStatus()).identity?.id ?? null) === expected.identity &&
      activeIdentity === expected.identity &&
      identityRevision === expected.revision
    );
  }

  async function refreshTestStoreCache(session: SDKSession): Promise<boolean> {
    if (
      platform === 'web' ||
      config.revenueCatBuildMode !== 'test-store-qa' ||
      !config.revenueCatUseTestStore
    )
      return true;
    // Test Store restore uses the SDK's cached-or-fetched CustomerInfo path.
    // Clear only that cache so an explicit QA access check awaits current info.
    await session.sdk.invalidateCustomerInfoCache();
    return identityUnchanged(session);
  }

  return {
    async getStatus() {
      try {
        const session = await sdk();
        if (!session) return unavailable();
        const Purchases = session.sdk;
        if (!(await refreshTestStoreCache(session)))
          return unavailable('Your account changed. Refresh ShipingIT Pro access.');
        const customer = await Purchases.getCustomerInfo();
        return (await identityUnchanged(session))
          ? fromCustomerInfo(customer)
          : unavailable('Your account changed. Refresh ShipingIT Pro access.');
      } catch {
        return unavailable('Could not check ShipingIT Pro. Reconnect before using Pro export.');
      }
    },
    async getOfferings() {
      try {
        const session = await sdk();
        if (!session)
          return {
            configured: Boolean(apiKey()),
            offeringId: null,
            packages: [],
            message: lastIssue,
          };
        const Purchases = session.sdk;
        const offerings = await Purchases.getOfferings();
        loadedPackages.clear();
        if (!(await identityUnchanged(session)))
          return {
            configured: true,
            offeringId: null,
            packages: [],
            message: 'Your account changed. Reload plans to continue.',
          };
        const packages = (offerings.current?.availablePackages ?? []).map((item) => {
          loadedPackages.set(item.identifier, item);
          return {
            id: item.identifier,
            productId: item.product.identifier,
            title: item.product.title,
            description: item.product.description,
            priceString: item.product.priceString,
            period: item.product.subscriptionPeriod ?? null,
            packageType: item.packageType,
          };
        });
        return {
          configured: true,
          offeringId: offerings.current?.identifier ?? null,
          packages,
          message: packages.length
            ? undefined
            : 'No ShipingIT Pro plans are available right now. Core learning stays free.',
        };
      } catch {
        loadedPackages.clear();
        return {
          configured: Boolean(apiKey()),
          offeringId: null,
          packages: [],
          message: 'Plans could not load. Check your connection and try again.',
        };
      }
    },
    async purchase(packageId) {
      if (!config.builderPurchasesEnabled)
        return failure(
          'ShipingIT Pro purchases are unavailable right now. Core learning stays free.',
        );
      if (purchaseInFlight) return failure('A purchase is already in progress.');
      purchaseInFlight = true;
      try {
        if (!(await getAuthStatus()).identity)
          return failure(
            'Sign in before purchasing ShipingIT Pro so your membership can be recovered.',
          );
        const session = await sdk();
        if (!session) return failure(lastIssue);
        const Purchases = session.sdk;
        const selectedPackage = loadedPackages.get(packageId);
        if (!selectedPackage)
          return failure('This plan is no longer available. Reload the plans and choose again.');
        if (!session.identity || !(await identityUnchanged(session)))
          return failure('Your account changed. Sign in again before purchasing ShipingIT Pro.');
        const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
        if (!(await identityUnchanged(session)))
          return failure(
            'Your account changed during the purchase. Sign back into the purchasing account and restore access.',
          );
        const status = fromCustomerInfo(customerInfo);
        return {
          success: status.entitled,
          cancelled: false,
          status,
          message: status.entitled
            ? status.isSandbox
              ? 'Test purchase confirmed. ShipingIT Pro is active in sandbox.'
              : 'ShipingIT Pro is active. The store confirmed your purchase.'
            : 'The store has not confirmed ShipingIT Pro access yet. Restore purchases or check again shortly.',
        };
      } catch (error) {
        const cancelled =
          typeof error === 'object' &&
          error !== null &&
          'userCancelled' in error &&
          error.userCancelled === true;
        return failure(
          cancelled
            ? 'Purchase cancelled. Core learning stays free.'
            : 'We could not confirm ShipingIT Pro. Check your store receipt; if charged, restore purchases before buying again.',
          cancelled,
        );
      } finally {
        purchaseInFlight = false;
      }
    },
    async restore() {
      try {
        if (!(await getAuthStatus()).identity)
          return failure(
            'Sign in with the account used for your purchase before restoring ShipingIT Pro.',
          );
        const session = await sdk();
        if (!session) return failure(lastIssue);
        // Restoring may transfer store purchases to the current RevenueCat identity.
        // Never initiate it for an anonymous or changed app account.
        if (!session.identity || !(await identityUnchanged(session)))
          return failure('Your account changed. Sign in again before restoring ShipingIT Pro.');
        const Purchases = session.sdk;
        if (!(await refreshTestStoreCache(session)))
          return failure(
            'Your account changed. Restore again from the account used for your purchase.',
          );
        // RevenueCat restorePurchases is unsupported on web. The signed-in identity retrieves web entitlements instead.
        const info =
          platform === 'web'
            ? await Purchases.getCustomerInfo()
            : await Purchases.restorePurchases();
        if (!(await identityUnchanged(session)))
          return failure(
            'Your account changed. Restore again from the account used for your purchase.',
          );
        const status = fromCustomerInfo(info);
        return {
          success: status.entitled,
          cancelled: false,
          status,
          message: status.entitled
            ? 'ShipingIT Pro access is available for this account.'
            : platform === 'web'
              ? 'No active ShipingIT Pro purchase was found. Sign in with the account used for your web purchase.'
              : 'No active ShipingIT Pro purchase was found for this store account.',
        };
      } catch {
        return failure(
          'Purchases could not be restored. Check your connection and try again. Your local project is safe.',
        );
      }
    },
    async identify(_userId) {
      try {
        loadedPackages.clear();
        // Resolve identity from the auth session, never from arbitrary caller-supplied IDs.
        await sdk();
      } catch {
        initialization = null;
        loadedPackages.clear();
      }
    },
  };
}
