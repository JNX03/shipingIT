import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  MembershipPlanOption,
  PlanComparison,
  PremiumHero,
} from '@/components/subscription/membership-panels';
import { ProUpgradeCelebration } from '@/components/subscription/pro-upgrade-celebration';
import { ProUpgradeActions } from '@/components/subscription/pro-upgrade-details';
import {
  confirmedProUpgrade,
  proUpgradeStillActive,
  verifiedProTransaction,
  type ProUpgradeConfirmation,
  type ProUpgradeReceipt,
} from '@/components/subscription/pro-upgrade';
import { lessons } from '@/data/curriculum';
import { bonusLessons } from '@/data/learning-guides';
import { challengeCatalog } from '@/game/challenges/catalog';
import { stageIds } from '@/game/types';
import { subscriptionService } from '@/services/purchases';
import { authProvider } from '@/services/auth';
import { serviceConfig } from '@/services/config';
import { canStartPurchase, subscriptionPeriodLabel } from '@/services/access-policy';
import { useSubscription } from '@/hooks/use-subscription';
import type { SubscriptionOfferings } from '@/services/contracts';
import { colors, radius, space } from '@/theme';

export default function Paywall() {
  const membership = useSubscription();
  const refreshMembership = membership.refresh;
  const observedIdentityId = membership.auth?.identity?.id;
  const [offerings, setOfferings] = useState<SubscriptionOfferings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState('');
  const [upgrade, setUpgrade] = useState<ProUpgradeReceipt | null>(null);
  const [skipUpgrade, setSkipUpgrade] = useState(false);
  const transaction = useRef(false);
  const generation = useRef(0);
  const viewGeneration = useRef(0);
  const eventSequence = useRef(0);
  const mounted = useRef(true);
  const focused = useRef(false);
  const invalidateView = useCallback(() => {
    viewGeneration.current++;
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      invalidateView();
    };
  }, [invalidateView]);
  useEffect(
    () =>
      authProvider.subscribe((status) => {
        if (status.identity?.id !== observedIdentityId) {
          invalidateView();
          setUpgrade(null);
          setMessage('');
          void refreshMembership();
        }
      }),
    [invalidateView, observedIdentityId, refreshMembership],
  );
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = await subscriptionService.getOfferings();
      if (request === generation.current) {
        setOfferings(result);
        setSelected(result.packages[0]?.id ?? '');
      }
    } catch {
      if (request === generation.current)
        setOfferings({
          configured: false,
          offeringId: null,
          packages: [],
          message: 'Store plans could not load. Refresh or continue learning for free.',
        });
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      focused.current = true;
      viewGeneration.current++;
      void Promise.resolve().then(() => {
        if (active) {
          setUpgrade(null);
          setSkipUpgrade(false);
          setMessage('');
          return load();
        }
      });
      return () => {
        active = false;
        focused.current = false;
        viewGeneration.current++;
        generation.current++;
      };
    }, [load]),
  );

  // Web remains a free-learning surface; the existing flag controls native purchase availability.
  const purchaseEnabled = serviceConfig.builderPurchasesEnabled && process.env.EXPO_OS !== 'web';
  const testStore =
    serviceConfig.revenueCatBuildMode === 'test-store-qa' && serviceConfig.revenueCatUseTestStore;
  const waiting = loading || membership.loading || busy;
  const selectedPlan = offerings?.packages.find((plan) => plan.id === selected);
  const selectedPeriod = subscriptionPeriodLabel(selectedPlan?.period ?? null);
  const needsSignIn = Boolean(membership.status?.configured && !membership.auth?.identity);
  const purchasable = canStartPurchase({
    releaseEnabled: purchaseEnabled,
    authenticated: Boolean(membership.auth?.identity),
    hasPackage: Boolean(selectedPlan),
    busy: waiting,
  });
  const transact = async (restore = false) => {
    if (transaction.current || (!restore && !purchasable)) return;
    if (!membership.auth?.identity) {
      setMessage('Sign in with your purchasing account before choosing or restoring Pro.');
      return;
    }
    const view = viewGeneration.current;
    const initialStatus = membership.status;
    const initialAuth = membership.auth;
    transaction.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = restore
        ? await subscriptionService.restore()
        : await subscriptionService.purchase(selected);
      if (!mounted.current || !focused.current || view !== viewGeneration.current) return;
      const verified = await membership.refresh();
      if (!mounted.current || !focused.current || view !== viewGeneration.current) return;
      const confirmation: ProUpgradeConfirmation = {
        kind: restore ? 'restore' : 'purchase',
        expectedEntitlementId: serviceConfig.builderEntitlement,
        initialStatus,
        initialAuth,
        result,
        verifiedStatus: verified.status,
        verifiedAuth: verified.auth,
      };
      const receipt = confirmedProUpgrade(confirmation, ++eventSequence.current);
      setMessage(
        result.success && !result.cancelled && !verifiedProTransaction(confirmation)
          ? 'The store request finished, but Pro access is not verified yet. Refresh or restore before trying another purchase.'
          : result.message,
      );
      if (receipt) {
        setSkipUpgrade(false);
        setUpgrade({ ...receipt, isSandbox: receipt.isSandbox || testStore });
      }
    } catch {
      if (mounted.current && focused.current && view === viewGeneration.current)
        setMessage(
          'The store could not confirm that request. Your project is safe. Try Restore if a payment completed.',
        );
    } finally {
      transaction.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const continueFree = () => {
    viewGeneration.current++;
    router.replace('/(tabs)');
  };
  const close = () => {
    viewGeneration.current++;
    if (router.canGoBack()) router.back();
    else continueFree();
  };
  const explorePro = async () => {
    if (busy) return;
    const view = viewGeneration.current;
    const verified = await membership.refresh();
    if (!mounted.current || !focused.current || view !== viewGeneration.current) return;
    if (!verified.access.allowed) {
      setMessage('Check your active Pro membership before entering a bonus lab.');
      return;
    }
    if (bonusLessons.length) router.push('/pro-labs');
    else continueFree();
  };
  const primary = () => {
    if (membership.access.allowed) void explorePro();
    else if (!purchaseEnabled) continueFree();
    else if (needsSignIn) router.push('/account');
    else if (!offerings?.packages.length) continueFree();
    else void transact();
  };
  const title = membership.access.allowed
    ? bonusLessons.length
      ? 'Explore Pro labs'
      : 'Back to learning'
    : !purchaseEnabled
      ? 'Continue for free'
      : needsSignIn
        ? 'Sign in to choose Pro'
        : !offerings?.packages.length
          ? 'Continue for free'
          : testStore
            ? 'Continue in Test Store'
            : 'Continue with Pro';
  const supportingMessage =
    message || (purchaseEnabled ? offerings?.message || membership.status?.message : '');
  const showFreeChoice =
    purchaseEnabled &&
    !membership.access.allowed &&
    (loading || needsSignIn || Boolean(offerings?.packages.length));
  const showUpgrade = upgrade && proUpgradeStillActive(upgrade, membership.status, membership.auth);
  const completeUpgradeMotion = useCallback(() => setSkipUpgrade(true), []);

  return (
    <Screen
      contentWidth={500}
      header={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            width: '100%',
            maxWidth: 500,
            alignSelf: 'center',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close membership options"
            onPress={close}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon name="close" color={colors.textSecondary} />
          </Pressable>
          <T
            variant="heading"
            accessibilityRole="header"
            style={{ flex: 1, textAlign: 'center', color: colors.premium }}
          >
            ShipingIT Pro
          </T>
          <View style={{ width: 48 }} />
        </View>
      }
      footerContentStyle={{ maxWidth: 500, gap: space.sm }}
      footerStyle={{ paddingTop: space.lg }}
      footer={
        showUpgrade && upgrade ? (
          <ProUpgradeActions
            playing={!skipUpgrade}
            onContinue={continueFree}
            onSkip={() => {
              if (!skipUpgrade) setSkipUpgrade(true);
              else setUpgrade(null);
            }}
          />
        ) : (
          <>
            {purchaseEnabled && !membership.access.allowed && selectedPlan ? (
              <T variant="small" selectable style={{ textAlign: 'center' }}>
                {selectedPlan.priceString}
                {selectedPeriod ? ` / ${selectedPeriod}` : ''}
                {testStore ? ' · Test Store' : ''}
              </T>
            ) : null}
            <Button
              title={title}
              loading={busy || (purchaseEnabled && (loading || membership.loading))}
              onPress={primary}
            />
            {showFreeChoice ? (
              <Button
                title="Continue for free"
                variant="quiet"
                compact
                uppercase={false}
                onPress={continueFree}
              />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.xl,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                accessibilityState={{ disabled: waiting || !membership.status?.configured }}
                disabled={waiting || !membership.status?.configured}
                onPress={() => {
                  if (needsSignIn) router.push('/account');
                  else void transact(true);
                }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: space.sm,
                  justifyContent: 'center',
                  opacity: waiting || !membership.status?.configured ? 0.5 : pressed ? 0.6 : 1,
                })}
              >
                <T variant="small">Restore</T>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Privacy and data"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => router.push('/privacy')}
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: space.sm,
                  justifyContent: 'center',
                  opacity: busy ? 0.5 : pressed ? 0.6 : 1,
                })}
              >
                <T variant="small">Privacy</T>
              </Pressable>
            </View>
          </>
        )
      }
    >
      {showUpgrade && upgrade ? (
        <ProUpgradeCelebration
          key={upgrade.key}
          receipt={upgrade}
          skipAnimation={skipUpgrade}
          onComplete={completeUpgradeMotion}
        />
      ) : (
        <>
          <PremiumHero proActive={membership.access.allowed} />
          {testStore || membership.status?.isSandbox ? (
            <View
              style={{
                padding: space.md,
                borderRadius: radius.control,
                borderCurve: 'continuous',
                backgroundColor: colors.peach,
                gap: space.xs,
              }}
            >
              <T variant="caption" style={{ textAlign: 'center', color: colors.warning }}>
                {testStore ? 'TEST STORE · QA ONLY' : 'SANDBOX STORE · TEST ACCESS ONLY'}
              </T>
              <T variant="small" style={{ textAlign: 'center' }}>
                This is a test membership environment.
              </T>
            </View>
          ) : null}
          <PlanComparison
            learningLabel={`${stageIds.length} game stages · ${challengeCatalog.length} practices · ${lessons.length} lessons`}
            proLabCount={bonusLessons.length}
            advancedHelper
            unlimitedSparkShop
          />
          {membership.access.allowed ? (
            <View
              style={{
                gap: space.sm,
                padding: space.lg,
                borderRadius: radius.control,
                borderCurve: 'continuous',
                backgroundColor: colors.premiumSurface,
              }}
            >
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <Icon name="check" color={colors.premium} size={24} />
                <T variant="subheading" style={{ flex: 1 }}>
                  Your Pro tools are ready
                </T>
              </View>
              <T variant="small">
                Explore advanced lesson guides, spend with an ∞ wallet in the Spark shop, and take
                your full notebook with you.
              </T>
              {bonusLessons.length ? (
                <T variant="small">{bonusLessons.length} bonus labs are ready to explore.</T>
              ) : null}
              <Button
                title="Open Spark shop"
                variant="secondary"
                compact
                uppercase={false}
                disabled={waiting}
                onPress={() => router.push('/shop')}
              />
            </View>
          ) : !purchaseEnabled ? (
            <View
              style={{
                gap: space.sm,
                padding: space.lg,
                borderRadius: radius.control,
                borderCurve: 'continuous',
                backgroundColor: colors.primarySurface,
              }}
            >
              <T variant="subheading">Your next chapter is free</T>
              <T variant="small">
                Pro purchases are not available here yet. You can play the core games, finish all
                {` ${lessons.length} `}core lessons, use basic hints, and copy your project summary.
              </T>
            </View>
          ) : (
            <View style={{ gap: space.md }}>
              <T variant="heading" accessibilityRole="header">
                Choose a store plan
              </T>
              {loading ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.lg,
                  }}
                >
                  <ActivityIndicator color={colors.premium} />
                  <T variant="small" accessibilityLiveRegion="polite">
                    Loading the store’s current plans…
                  </T>
                </View>
              ) : offerings?.packages.length ? (
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Pro plans"
                  style={{ gap: space.md }}
                >
                  {offerings.packages.map((plan) => (
                    <MembershipPlanOption
                      key={plan.id}
                      plan={plan}
                      selected={selected === plan.id}
                      disabled={waiting}
                      onSelect={() => setSelected(plan.id)}
                    />
                  ))}
                </View>
              ) : (
                <T variant="small">
                  No Pro plans are available from the store right now. Your learning journey stays
                  free.
                </T>
              )}
              {!loading && selectedPlan ? (
                <T variant="caption">
                  {selectedPeriod ? 'Subscriptions renew automatically unless cancelled. ' : ''}
                  Review the store’s full price, billing period, and cancellation terms before
                  confirming.
                </T>
              ) : null}
            </View>
          )}
          {supportingMessage ? (
            <T accessibilityLiveRegion="polite" selectable style={{ color: colors.primaryPressed }}>
              {supportingMessage}
            </T>
          ) : null}
          {purchaseEnabled && !waiting ? (
            <Button
              title="Refresh store plans"
              variant="quiet"
              uppercase={false}
              onPress={() => {
                void Promise.all([load(), membership.refresh()]);
              }}
            />
          ) : null}
          {membership.status?.managementUrl ? (
            <Button
              title="Manage membership"
              variant="secondary"
              uppercase={false}
              disabled={waiting}
              onPress={() => {
                void Linking.openURL(membership.status!.managementUrl!).catch(() =>
                  setMessage(
                    'Could not open membership management. Open your store account to manage the subscription.',
                  ),
                );
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
