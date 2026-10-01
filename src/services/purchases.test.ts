import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  createSubscriptionService,
  type PurchasesSDK,
  type SubscriptionDependencies,
} from './purchases-core';

// These are SDK contract fixtures, never evidence of a store or sandbox transaction.
const entitlement: PurchasesEntitlementInfo = {
  identifier: 'builder',
  isActive: true,
  willRenew: true,
  periodType: 'NORMAL',
  latestPurchaseDate: '2026-09-29T00:00:00Z',
  latestPurchaseDateMillis: 1790640000000,
  originalPurchaseDate: '2026-09-29T00:00:00Z',
  originalPurchaseDateMillis: 1790640000000,
  expirationDate: '2027-09-29T00:00:00Z',
  expirationDateMillis: 1822176000000,
  store: 'TEST_STORE',
  productIdentifier: 'fixture.builder.monthly',
  productPlanIdentifier: null,
  isSandbox: true,
  unsubscribeDetectedAt: null,
  unsubscribeDetectedAtMillis: null,
  billingIssueDetectedAt: null,
  billingIssueDetectedAtMillis: null,
  ownershipType: 'PURCHASED',
  verification: 'NOT_REQUESTED' as PurchasesEntitlementInfo['verification'],
};
function customer(id = 'learner-a', active = true): CustomerInfo {
  const entitlements: Record<string, PurchasesEntitlementInfo> = active
    ? { builder: entitlement }
    : {};
  return {
    entitlements: {
      active: entitlements,
      all: entitlements,
      verification: entitlement.verification,
    },
    activeSubscriptions: active ? ['fixture.builder.monthly'] : [],
    allPurchasedProductIdentifiers: [],
    latestExpirationDate: active ? entitlement.expirationDate : null,
    firstSeen: '2026-09-29T00:00:00Z',
    originalAppUserId: id,
    requestDate: '2026-09-29T00:00:00Z',
    allExpirationDates: {},
    allPurchaseDates: {},
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: {},
  };
}
const storePackage: PurchasesPackage = {
  identifier: '$rc_monthly',
  packageType: 'MONTHLY' as PurchasesPackage['packageType'],
  offeringIdentifier: 'fixture-current',
  presentedOfferingContext: {
    offeringIdentifier: 'fixture-current',
    placementIdentifier: null,
    targetingContext: null,
  },
  webCheckoutUrl: null,
  product: {
    identifier: 'fixture.builder.monthly',
    title: 'Builder fixture',
    description: 'Test contract only',
    price: 89,
    priceString: '฿89.00',
    currencyCode: 'THB',
    subscriptionPeriod: 'P1M',
    pricePerWeek: null,
    pricePerMonth: 89,
    pricePerYear: null,
    pricePerWeekString: null,
    pricePerMonthString: '฿89.00',
    pricePerYearString: null,
    introPrice: null,
    discounts: null,
    productCategory: null,
    productType: 'AUTO_RENEWABLE_SUBSCRIPTION' as PurchasesPackage['product']['productType'],
    defaultOption: null,
    subscriptionOptions: null,
    presentedOfferingIdentifier: 'fixture-current',
    presentedOfferingContext: null,
  },
};
function offerings(packages = [storePackage]): PurchasesOfferings {
  const current = {
    identifier: 'fixture-current',
    serverDescription: 'Fixture only',
    metadata: {},
    availablePackages: packages,
    lifetime: null,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: packages[0] ?? null,
    weekly: null,
    webCheckoutUrl: null,
  };
  return { current, all: { [current.identifier]: current } };
}
function transaction(
  customerInfo: CustomerInfo,
): Awaited<ReturnType<PurchasesSDK['purchasePackage']>> {
  return {
    customerInfo,
    productIdentifier: storePackage.product.identifier,
    transaction: {
      transactionIdentifier: 'fixture-only',
      productIdentifier: storePackage.product.identifier,
      purchaseDate: '2026-09-29T00:00:00Z',
      purchaseToken: null,
      originalJson: null,
      signature: null,
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function harness(overrides: Partial<SubscriptionDependencies> = {}) {
  let identity: string | null = 'learner-a';
  let sdkIdentity: string | null = null;
  let configured = false;
  const calls = {
    load: 0,
    configure: [] as { apiKey: string; appUserID?: string | null }[],
    login: [] as string[],
    logout: 0,
    status: 0,
    offerings: 0,
    purchase: 0,
    restore: 0,
  };
  const sdk: PurchasesSDK = {
    isConfigured: async () => configured,
    configure: (options) => {
      configured = true;
      calls.configure.push(options);
      sdkIdentity = options.appUserID ?? null;
    },
    isAnonymous: async () => sdkIdentity === null,
    logIn: async (id) => {
      calls.login.push(id);
      sdkIdentity = id;
      return { customerInfo: customer(id), created: false };
    },
    logOut: async () => {
      calls.logout++;
      sdkIdentity = null;
      return customer('anonymous', false);
    },
    getCustomerInfo: async () => {
      calls.status++;
      return customer(sdkIdentity ?? 'anonymous', sdkIdentity !== null);
    },
    invalidateCustomerInfoCache: async () => undefined,
    getOfferings: async () => {
      calls.offerings++;
      return offerings();
    },
    purchasePackage: async () => {
      calls.purchase++;
      return transaction(customer(sdkIdentity ?? 'anonymous'));
    },
    restorePurchases: async () => {
      calls.restore++;
      return customer(sdkIdentity ?? 'anonymous', sdkIdentity !== null);
    },
  };
  const deps: SubscriptionDependencies = {
    config: {
      builderEntitlement: 'builder',
      builderPurchasesEnabled: true,
      revenueCatUseTestStore: false,
      revenueCatBuildMode: 'release',
      revenueCatTestKey: null,
      revenueCatIOSKey: 'appl_fixture',
      revenueCatAndroidKey: 'goog_fixture',
      revenueCatWebKey: 'rcb_fixture',
    },
    platform: 'android',
    isStoreClient: false,
    loadSDK: async () => {
      calls.load++;
      return sdk;
    },
    getAuthStatus: async () => ({
      identity: identity ? { id: identity, email: null, displayName: null } : null,
    }),
    ...overrides,
  };
  return {
    service: createSubscriptionService(deps),
    sdk,
    calls,
    deps,
    setIdentity: (id: string | null) => {
      identity = id;
    },
    sdkIdentity: () => sdkIdentity,
  };
}

function testStoreHarness(platform = 'android') {
  const h = harness({ platform });
  h.deps.config = {
    ...h.deps.config,
    revenueCatBuildMode: 'test-store-qa',
    revenueCatUseTestStore: true,
    revenueCatTestKey: 'test_fixture',
  };
  return { ...h, service: createSubscriptionService(h.deps) };
}

test('missing keys and Expo Go refuse SDK access and never grant entitlement', async () => {
  const missing = harness();
  missing.deps.config = { ...missing.deps.config, revenueCatAndroidKey: null };
  const service = createSubscriptionService(missing.deps);
  assert.equal((await service.getStatus()).state, 'unconfigured');
  assert.deepEqual((await service.getOfferings()).packages, []);
  assert.equal((await service.restore()).success, false);
  assert.equal(missing.calls.load, 0);
  const expoGo = harness({ isStoreClient: true });
  assert.equal((await expoGo.service.getStatus()).entitled, false);
  assert.match((await expoGo.service.getOfferings()).message!, /Expo Go/);
  assert.equal(expoGo.calls.load, 0);
});

test('web requires identity and explicit Test Store configuration selects only its key', async () => {
  const web = harness({ platform: 'web' });
  web.setIdentity(null);
  assert.match((await web.service.getStatus()).message!, /Sign in/);
  assert.equal(web.calls.load, 0);
  const testStore = harness();
  const service = createSubscriptionService({
    ...testStore.deps,
    config: {
      ...testStore.deps.config,
      revenueCatUseTestStore: true,
      revenueCatBuildMode: 'test-store-qa',
      revenueCatTestKey: 'test_fixture',
    },
  });
  assert.equal((await service.getStatus()).isSandbox, true);
  assert.equal(testStore.calls.configure[0].apiKey, 'test_fixture');
});

async function assertBillingUnconfigured(
  h: ReturnType<typeof harness>,
  service = createSubscriptionService(h.deps),
) {
  const status = await service.getStatus();
  assert.equal(status.configured, false);
  assert.equal(status.state, 'unconfigured');
  assert.equal(status.entitled, false);
  const plans = await service.getOfferings();
  assert.equal(plans.configured, false);
  assert.deepEqual(plans.packages, []);
  await service.identify('learner-a');
  assert.equal((await service.purchase('$rc_monthly')).success, false);
  assert.equal((await service.restore()).success, false);
  assert.deepEqual(h.calls, {
    load: 0,
    configure: [],
    login: [],
    logout: 0,
    status: 0,
    offerings: 0,
    purchase: 0,
    restore: 0,
  });
}

test('release, absent, and unknown build markers block Test Store through every entry point', async () => {
  for (const platform of ['android', 'ios', 'web'])
    for (const marker of ['release', undefined, 'debug', 'test-store-qa '])
      for (const builderPurchasesEnabled of [true, false]) {
        const h = harness({ platform });
        h.deps.config = {
          ...h.deps.config,
          // Simulate absent/invalid runtime inputs beyond the normalized config type.
          revenueCatBuildMode: marker as SubscriptionDependencies['config']['revenueCatBuildMode'],
          revenueCatUseTestStore: true,
          revenueCatTestKey: 'test_fixture',
          builderPurchasesEnabled,
        };
        await assertBillingUnconfigured(h);
      }
});

test('a Test Store key in a platform slot cannot initialize any SDK entry point', async () => {
  for (const platform of ['android', 'ios', 'web'])
    for (const revenueCatBuildMode of ['release', 'test-store-qa'] as const)
      for (const builderPurchasesEnabled of [true, false]) {
        const h = harness({ platform });
        h.deps.config = {
          ...h.deps.config,
          revenueCatBuildMode,
          revenueCatUseTestStore: false,
          revenueCatTestKey: 'test_dedicated_but_not_selected',
          revenueCatAndroidKey: '  test_misassigned  ',
          revenueCatIOSKey: 'test_misassigned',
          revenueCatWebKey: 'test_misassigned',
          builderPurchasesEnabled,
        };
        await assertBillingUnconfigured(h);
      }
});

test('QA rejects missing or non-Test-Store keys without falling back to platform billing', async () => {
  for (const revenueCatTestKey of [null, '', '   ', 'test_', 'test_ bad', 'goog_live_fixture'])
    for (const builderPurchasesEnabled of [true, false]) {
      const h = harness();
      h.deps.config = {
        ...h.deps.config,
        revenueCatBuildMode: 'test-store-qa',
        revenueCatUseTestStore: true,
        revenueCatTestKey,
        builderPurchasesEnabled,
      };
      await assertBillingUnconfigured(h);
    }
});

test('QA works with production JavaScript but still refuses Expo Go', async () => {
  const originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  try {
    const h = harness();
    h.deps.config = {
      ...h.deps.config,
      revenueCatBuildMode: 'test-store-qa',
      revenueCatUseTestStore: true,
      revenueCatTestKey: 'test_fixture',
    };
    const service = createSubscriptionService(h.deps);
    await service.identify('learner-a');
    assert.equal((await service.getOfferings()).packages.length, 1);
    assert.equal((await service.getStatus()).state, 'ready');
    assert.equal((await service.purchase('$rc_monthly')).success, true);
    assert.equal((await service.restore()).success, true);
    assert.equal(h.calls.configure.length, 1);
    assert.equal(h.calls.configure[0].apiKey, 'test_fixture');

    const expoGo = harness({ isStoreClient: true });
    expoGo.deps.config = { ...h.deps.config };
    const preview = createSubscriptionService(expoGo.deps);
    assert.equal((await preview.getStatus()).entitled, false);
    await preview.getOfferings();
    await preview.identify('learner-a');
    assert.equal((await preview.purchase('$rc_monthly')).success, false);
    assert.equal((await preview.restore()).success, false);
    assert.equal(expoGo.calls.load, 0);
    assert.deepEqual(expoGo.calls.configure, []);
  } finally {
    if (originalDev) Object.defineProperty(globalThis, '__DEV__', originalDev);
    else Reflect.deleteProperty(globalThis, '__DEV__');
  }
});

test('a release can restore legitimate platform access with new purchases disabled', async () => {
  const h = harness();
  h.deps.config = { ...h.deps.config, builderPurchasesEnabled: false };
  const service = createSubscriptionService(h.deps);
  assert.equal((await service.getStatus()).state, 'ready');
  assert.equal((await service.getOfferings()).packages.length, 1);
  assert.equal((await service.restore()).success, true);
  assert.equal((await service.purchase('$rc_monthly')).success, false);
  assert.equal(h.calls.configure[0].apiKey, 'goog_fixture');
  assert.equal(h.calls.purchase, 0);
});

test('concurrent initial reads share initialization and remain pending while SDK loads', async () => {
  const h = harness();
  const loading = deferred<PurchasesSDK>();
  let loads = 0,
    resolved = false;
  const service = createSubscriptionService({
    ...h.deps,
    loadSDK: () => {
      loads++;
      return loading.promise;
    },
  });
  const status = service.getStatus().then((value) => {
    resolved = true;
    return value;
  });
  const plans = service.getOfferings();
  await settle();
  assert.equal(loads, 1);
  assert.equal(resolved, false);
  loading.resolve(h.sdk);
  assert.equal((await status).state, 'ready');
  assert.equal((await plans).packages.length, 1);
  assert.equal(h.calls.configure.length, 1);
});

test('SDK initialization failure is safe and a later request retries', async () => {
  const h = harness();
  let attempts = 0;
  const service = createSubscriptionService({
    ...h.deps,
    loadSDK: async () => {
      if (++attempts === 1) throw new Error('load failed');
      return h.sdk;
    },
  });
  assert.equal((await service.getStatus()).state, 'unavailable');
  assert.equal((await service.getStatus()).state, 'ready');
  assert.equal(attempts, 2);
});

test('offerings expose provider package identifiers, prices and periods without invented prices', async () => {
  const h = harness();
  const result = await h.service.getOfferings();
  assert.equal(result.offeringId, 'fixture-current');
  assert.deepEqual(result.packages[0], {
    id: '$rc_monthly',
    productId: 'fixture.builder.monthly',
    title: 'Builder fixture',
    description: 'Test contract only',
    priceString: '฿89.00',
    period: 'P1M',
    packageType: 'MONTHLY',
  });
  h.sdk.getOfferings = async () => ({ all: {}, current: null });
  const empty = await h.service.getOfferings();
  assert.deepEqual(empty.packages, []);
  assert.match(empty.message!, /no ShipingIT Pro plans/i);
});

test('offerings failure clears previously loaded packages and cannot buy a stale selection', async () => {
  const h = harness();
  await h.service.getOfferings();
  h.sdk.getOfferings = async () => {
    throw new Error('offline');
  };
  assert.deepEqual((await h.service.getOfferings()).packages, []);
  const result = await h.service.purchase('$rc_monthly');
  assert.equal(result.success, false);
  assert.match(result.message, /no longer available/);
  assert.equal(h.calls.purchase, 0);
});

test('customer info errors revoke usable status instead of retaining an old entitlement', async () => {
  const h = harness();
  assert.equal((await h.service.getStatus()).entitled, true);
  h.sdk.getCustomerInfo = async () => {
    throw new Error('offline');
  };
  const failed = await h.service.getStatus();
  assert.equal(failed.entitled, false);
  assert.equal(failed.state, 'unavailable');
});

test('purchase requires the release flag, a signed-in account and a currently loaded package', async () => {
  const h = harness();
  const disabled = createSubscriptionService({
    ...h.deps,
    config: { ...h.deps.config, builderPurchasesEnabled: false },
  });
  assert.match((await disabled.purchase('$rc_monthly')).message, /unavailable/);
  h.setIdentity(null);
  assert.match((await h.service.purchase('$rc_monthly')).message, /Sign in/);
  h.setIdentity('learner-a');
  assert.match((await h.service.purchase('$rc_monthly')).message, /no longer available/);
  assert.equal(h.calls.purchase, 0);
});

test('cancelled and failed purchases return no access, release the lock and permit retry', async () => {
  const h = harness();
  await h.service.getOfferings();
  h.sdk.purchasePackage = async () => {
    throw { userCancelled: true };
  };
  const cancelled = await h.service.purchase('$rc_monthly');
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.success, false);
  assert.equal(cancelled.status.entitled, false);
  h.sdk.purchasePackage = async () => {
    throw new Error('store offline');
  };
  const failed = await h.service.purchase('$rc_monthly');
  assert.equal(failed.cancelled, false);
  assert.equal(failed.success, false);
  h.sdk.purchasePackage = async () => transaction(customer());
  const retry = await h.service.purchase('$rc_monthly');
  assert.equal(retry.success, true);
  assert.equal(retry.status.isSandbox, true);
  assert.match(retry.message, /Test purchase/);
});

test('store completion without the requested entitlement stays pending and grants no access', async () => {
  const h = harness();
  await h.service.getOfferings();
  h.sdk.purchasePackage = async () => transaction(customer('learner-a', false));
  const result = await h.service.purchase('$rc_monthly');
  assert.equal(result.success, false);
  assert.equal(result.status.entitled, false);
  assert.match(result.message, /not confirmed/);
});

test('a pending purchase prevents duplicate store transactions', async () => {
  const h = harness();
  await h.service.getOfferings();
  const pending = deferred<Awaited<ReturnType<PurchasesSDK['purchasePackage']>>>();
  let purchases = 0;
  h.sdk.purchasePackage = () => {
    purchases++;
    return pending.promise;
  };
  const first = h.service.purchase('$rc_monthly');
  await settle();
  const second = await h.service.purchase('$rc_monthly');
  assert.equal(second.success, false);
  assert.match(second.message, /already in progress/);
  assert.equal(purchases, 1);
  pending.resolve(transaction(customer()));
  assert.equal((await first).success, true);
});

test('restore requires a signed-in account before loading the SDK on native and web', async () => {
  for (const platform of ['android', 'ios', 'web']) {
    const h = harness({ platform });
    h.setIdentity(null);
    const result = await h.service.restore();
    assert.equal(result.success, false);
    assert.equal(result.status.entitled, false);
    assert.match(result.message, /Sign in/);
    assert.equal(h.calls.load, 0);
    assert.equal(h.calls.restore, 0);
    assert.equal(h.calls.status, 0);
  }
});

test('sign-out during restore preparation cannot start a store restore', async () => {
  // Auth is checked before SDK preparation, during preparation, and immediately
  // before the provider call. Exercise sign-out at both asynchronous boundaries.
  for (const signedOutAtRead of [2, 3]) {
    let authReads = 0;
    const h = harness({
      getAuthStatus: async () => ({
        identity:
          ++authReads < signedOutAtRead
            ? { id: 'learner-a', email: null, displayName: null }
            : null,
      }),
    });
    const result = await h.service.restore();
    assert.equal(result.success, false);
    assert.equal(result.status.entitled, false);
    assert.match(result.message, /account changed/);
    assert.equal(h.calls.restore, 0);
  }
});

test('native restore distinguishes success, no entitlement and store error', async () => {
  const h = harness();
  assert.equal((await h.service.restore()).success, true);
  assert.equal(h.calls.restore, 1);
  h.sdk.restorePurchases = async () => customer('learner-a', false);
  assert.match((await h.service.restore()).message, /No active ShipingIT Pro/);
  h.sdk.restorePurchases = async () => {
    throw new Error('restore unavailable');
  };
  const failed = await h.service.restore();
  assert.equal(failed.success, false);
  assert.equal(failed.status.entitled, false);
  assert.match(failed.message, /could not be restored/);
});

test('SDK active flags with expired or invalid periods never report usable purchase or restore access', async () => {
  for (const expirationDate of ['2000-01-01T00:00:00Z', 'not-a-date', '']) {
    const h = harness();
    const info = customer();
    info.entitlements.active.builder = { ...entitlement, expirationDate };
    h.sdk.getCustomerInfo = async () => info;
    h.sdk.restorePurchases = async () => info;
    h.sdk.purchasePackage = async () => transaction(info);
    const status = await h.service.getStatus();
    assert.equal(status.entitled, false);
    assert.equal(status.expiresAt, expirationDate);
    assert.equal(status.isSandbox, true);
    assert.notEqual(status.message, 'ShipingIT Pro is active.');
    await h.service.getOfferings();
    const purchased = await h.service.purchase('$rc_monthly');
    assert.equal(purchased.success, false);
    assert.equal(purchased.status.entitled, false);
    const restored = await h.service.restore();
    assert.equal(restored.success, false);
    assert.equal(restored.status.entitled, false);
    assert.match(restored.message, /No active ShipingIT Pro/);
  }
});

test('valid future and non-expiring SDK entitlements remain usable', async () => {
  for (const expirationDate of ['2099-01-01T00:00:00Z', null]) {
    const h = harness();
    const info = customer();
    info.entitlements.active.builder = { ...entitlement, expirationDate };
    h.sdk.getCustomerInfo = async () => info;
    h.sdk.restorePurchases = async () => info;
    assert.equal((await h.service.getStatus()).entitled, true);
    const restored = await h.service.restore();
    assert.equal(restored.success, true);
    assert.equal(restored.status.expiresAt, expirationDate);
  }
});

test('web restores by reading signed-in customer info instead of the unsupported native method', async () => {
  const h = harness({ platform: 'web' });
  assert.equal((await h.service.restore()).success, true);
  assert.equal(h.calls.status, 1);
  assert.equal(h.calls.restore, 0);
  h.sdk.getCustomerInfo = async () => customer('learner-a', false);
  assert.match((await h.service.restore()).message, /account used for your web purchase/);
});

test('Test Store restore and verification fetch current access instead of a cached inactive period', async () => {
  const h = testStoreHarness();
  const order: string[] = [];
  let cached: CustomerInfo | null = customer('learner-a', false);
  h.sdk.invalidateCustomerInfoCache = async () => {
    order.push('invalidate');
    cached = null;
  };
  h.sdk.getCustomerInfo = async () => {
    order.push('info');
    return (cached ??= customer());
  };
  // Models the tagged Android Test Store restore path: ordinary CustomerInfo retrieval.
  h.sdk.restorePurchases = async () => {
    h.calls.restore++;
    order.push('restore');
    return h.sdk.getCustomerInfo();
  };
  const restored = await h.service.restore();
  assert.equal(restored.success, true);
  assert.equal(restored.status.isSandbox, true);
  assert.deepEqual(order, ['invalidate', 'restore', 'info']);
  cached = customer('learner-a', false);
  assert.equal((await h.service.getStatus()).entitled, true);
  assert.deepEqual(order, ['invalidate', 'restore', 'info', 'invalidate', 'info']);
  assert.equal(h.calls.restore, 1);
  assert.equal(h.calls.purchase, 0);
  assert.equal(h.calls.configure.length, 1);
  assert.deepEqual(h.calls.login, []);
});

test('Test Store status and restore reject cached active access when current provider access is inactive', async () => {
  for (const platform of ['android', 'ios']) {
    const h = testStoreHarness(platform);
    let cached: CustomerInfo | null = customer();
    h.sdk.invalidateCustomerInfoCache = async () => {
      cached = null;
    };
    h.sdk.getCustomerInfo = async () => (cached ??= customer('learner-a', false));
    h.sdk.restorePurchases = () => h.sdk.getCustomerInfo();
    const status = await h.service.getStatus();
    assert.equal(status.state, 'ready');
    assert.equal(status.entitled, false);
    cached = customer();
    const restored = await h.service.restore();
    assert.equal(restored.success, false);
    assert.equal(restored.status.entitled, false);
    assert.match(restored.message, /No active ShipingIT Pro/);
  }
});

test('Test Store cache invalidation or fresh-read failures never reuse previous active access', async () => {
  for (const failurePoint of ['invalidate', 'info'] as const) {
    const h = testStoreHarness();
    assert.equal((await h.service.getStatus()).entitled, true);
    if (failurePoint === 'invalidate')
      h.sdk.invalidateCustomerInfoCache = async () => {
        throw new Error('invalidation failed');
      };
    else
      h.sdk.getCustomerInfo = async () => {
        throw new Error('current info unavailable');
      };
    h.sdk.restorePurchases = () => h.sdk.getCustomerInfo();
    const restored = await h.service.restore();
    assert.equal(restored.success, false);
    assert.equal(restored.status.state, 'unavailable');
    assert.equal(restored.status.entitled, false);
    const status = await h.service.getStatus();
    assert.equal(status.state, 'unavailable');
    assert.equal(status.entitled, false);
  }
});

test('identity changes during Test Store cache invalidation stop restore and verification reads', async () => {
  for (const operation of ['restore', 'getStatus'] as const) {
    const h = testStoreHarness();
    const pending = deferred<void>();
    h.sdk.invalidateCustomerInfoCache = () => pending.promise;
    const reading = h.service[operation]();
    await settle();
    h.setIdentity(null);
    pending.resolve();
    const result = await reading;
    const status = 'status' in result ? result.status : result;
    assert.equal(status.entitled, false);
    assert.equal(status.state, 'unavailable');
    assert.match(status.message!, /account changed/);
    assert.equal(h.calls.restore, 0);
    assert.equal(h.calls.status, 0);
  }
});

test('leaving and returning to an identity during Test Store invalidation rejects its earlier session', async () => {
  const h = testStoreHarness();
  const pending = deferred<void>();
  h.sdk.invalidateCustomerInfoCache = () => pending.promise;
  const restoring = h.service.restore();
  await settle();
  h.setIdentity('learner-b');
  await h.service.identify('learner-b');
  h.setIdentity('learner-a');
  await h.service.identify('learner-a');
  pending.resolve();
  const result = await restoring;
  assert.equal(result.success, false);
  assert.match(result.message, /account changed/);
  assert.equal(h.calls.restore, 0);
});

test('normal platform and web access checks preserve SDK caching and never call Test Store invalidation', async () => {
  for (const platform of ['android', 'ios', 'web']) {
    const h = harness({ platform });
    h.sdk.invalidateCustomerInfoCache = async () => {
      assert.fail('Test Store cache invalidation must not run for this platform configuration');
    };
    assert.equal((await h.service.getStatus()).entitled, true);
    assert.equal((await h.service.restore()).success, true);
  }
});

test('web Test Store QA status and restore skip native CustomerInfo invalidation', async () => {
  const h = testStoreHarness('web');
  h.sdk.invalidateCustomerInfoCache = async () => {
    assert.fail('Web must not invoke native cache invalidation');
  };
  assert.equal((await h.service.getStatus()).entitled, true);
  assert.equal((await h.service.restore()).success, true);
  assert.equal(h.calls.restore, 0);
  assert.equal(h.calls.status, 2);
});

test('sign-out during a status request discards the previous account entitlement', async () => {
  const h = harness();
  const pending = deferred<CustomerInfo>();
  h.sdk.getCustomerInfo = () => pending.promise;
  const reading = h.service.getStatus();
  await settle();
  h.setIdentity(null);
  pending.resolve(customer());
  const result = await reading;
  assert.equal(result.entitled, false);
  assert.equal(result.state, 'unavailable');
  assert.match(result.message!, /account changed/);
});

test('account switching during offerings loading discards its packages', async () => {
  const h = harness();
  const pending = deferred<PurchasesOfferings>();
  h.sdk.getOfferings = () => pending.promise;
  const reading = h.service.getOfferings();
  await settle();
  h.setIdentity('learner-b');
  pending.resolve(offerings());
  assert.deepEqual((await reading).packages, []);
  assert.equal((await h.service.purchase('$rc_monthly')).success, false);
  assert.equal(h.calls.purchase, 0);
});

test('account switching during purchase or restore never grants the old account result', async () => {
  const purchase = harness();
  await purchase.service.getOfferings();
  const pendingBuy = deferred<Awaited<ReturnType<PurchasesSDK['purchasePackage']>>>();
  purchase.sdk.purchasePackage = () => pendingBuy.promise;
  const buying = purchase.service.purchase('$rc_monthly');
  await settle();
  purchase.setIdentity('learner-b');
  pendingBuy.resolve(transaction(customer()));
  const bought = await buying;
  assert.equal(bought.success, false);
  assert.match(bought.message, /account changed/);
  const restore = harness();
  const pendingRestore = deferred<CustomerInfo>();
  restore.sdk.restorePurchases = () => pendingRestore.promise;
  const restoring = restore.service.restore();
  await settle();
  restore.setIdentity(null);
  pendingRestore.resolve(customer());
  const restored = await restoring;
  assert.equal(restored.success, false);
  assert.match(restored.message, /account changed/);
});

test('identify uses authenticated identity rather than the caller and clears plans on sign-out', async () => {
  const h = harness();
  await h.service.getOfferings();
  h.setIdentity('learner-b');
  await h.service.identify('untrusted-caller-id');
  assert.deepEqual(h.calls.login, ['learner-b']);
  assert.equal(h.sdkIdentity(), 'learner-b');
  assert.equal((await h.service.purchase('$rc_monthly')).success, false);
  h.setIdentity(null);
  await h.service.identify(null);
  assert.equal(h.calls.logout, 1);
  assert.equal((await h.service.getStatus()).entitled, false);
});

test('an auth-read failure during purchase becomes a failure result instead of escaping the service', async () => {
  const h = harness({
    getAuthStatus: async () => {
      throw new Error('auth unavailable');
    },
  });
  const result = await h.service.purchase('$rc_monthly');
  assert.equal(result.success, false);
  assert.equal(result.status.entitled, false);
});

test('overlapping SDK logins cannot apply an older account after the newer account', async () => {
  const h = harness();
  await h.service.getStatus();
  const olderLogin = deferred<void>();
  const originalLogin = h.sdk.logIn;
  h.sdk.logIn = async (id) => {
    if (id === 'learner-b') await olderLogin.promise;
    return originalLogin(id);
  };
  h.setIdentity('learner-b');
  const older = h.service.identify('learner-b');
  await settle();
  h.setIdentity('learner-c');
  const newer = h.service.identify('learner-c');
  await settle();
  olderLogin.resolve();
  await Promise.all([older, newer]);
  assert.equal(h.sdkIdentity(), 'learner-c');
  assert.equal((await h.service.getStatus()).state, 'ready');
});

test('sign-out between purchase preflight and SDK preparation cannot start an anonymous purchase', async () => {
  const h = harness();
  let signedInOnce = false;
  const service = createSubscriptionService({
    ...h.deps,
    getAuthStatus: async () => {
      if (signedInOnce) {
        signedInOnce = false;
        return { identity: { id: 'learner-a', email: null, displayName: null } };
      }
      return { identity: null };
    },
  });
  await service.getOfferings();
  signedInOnce = true;
  const result = await service.purchase('$rc_monthly');
  assert.equal(result.success, false);
  assert.equal(h.calls.purchase, 0);
});

test('leaving and returning to an account invalidates results from its earlier SDK session', async () => {
  const h = harness();
  const pending = deferred<CustomerInfo>();
  h.sdk.getCustomerInfo = () => pending.promise;
  const oldStatus = h.service.getStatus();
  await settle();
  h.setIdentity(null);
  await h.service.identify(null);
  h.setIdentity('learner-a');
  await h.service.identify('learner-a');
  pending.resolve(customer());
  const result = await oldStatus;
  assert.equal(result.entitled, false);
  assert.match(result.message!, /account changed/);
});

test('failed identity transitions do not poison the queue or grant stale access', async () => {
  const h = harness();
  await h.service.getStatus();
  const originalLogin = h.sdk.logIn;
  h.sdk.logIn = async (id) => {
    if (id === 'learner-b') throw new Error('identity request failed');
    return originalLogin(id);
  };
  h.setIdentity('learner-b');
  assert.equal((await h.service.getStatus()).entitled, false);
  h.setIdentity('learner-c');
  assert.equal((await h.service.getStatus()).state, 'ready');
  assert.equal(h.sdkIdentity(), 'learner-c');
});

test('a login that changes native identity before rejecting forces reconciliation on retry', async () => {
  const h = harness();
  await h.service.getStatus();
  const originalLogin = h.sdk.logIn;
  h.sdk.logIn = async (id) => {
    const result = await originalLogin(id);
    if (id === 'learner-b') throw new Error('native identity changed before transport failed');
    return result;
  };
  h.setIdentity('learner-b');
  assert.equal((await h.service.getStatus()).entitled, false);
  assert.equal(h.sdkIdentity(), 'learner-b');
  h.setIdentity('learner-a');
  assert.equal((await h.service.getStatus()).state, 'ready');
  assert.equal(h.sdkIdentity(), 'learner-a');
});

test('a logout that changes native identity before rejecting is reconciled before granting access', async () => {
  const h = harness();
  await h.service.getStatus();
  const originalLogout = h.sdk.logOut;
  h.sdk.logOut = async () => {
    await originalLogout();
    throw new Error('native logout succeeded before transport failed');
  };
  h.setIdentity(null);
  assert.equal((await h.service.getStatus()).state, 'unavailable');
  assert.equal(h.sdkIdentity(), null);
  h.setIdentity('learner-a');
  assert.equal((await h.service.getStatus()).entitled, true);
  assert.equal(h.sdkIdentity(), 'learner-a');
});
