import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { ProfileToolbar } from '@/game/components/profile-chrome';
import { WearablePreview } from '@/game/wearable-layer';
import { wardrobeCatalog, type WardrobeItemId } from '@/game/wardrobe-catalog';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { projectLessonAccess } from '@/domain/lesson-access';
import { useAppStore } from '@/store';
import {
  hasUnlimitedShopSparks,
  heartCredits,
  HEART_PACK_ITEM,
  walletBalance,
  walletOwns,
  walletSpent,
  type SparkShopItem,
  type SparkSpendCommand,
} from '@/domain/spark-wallet';
import {
  getSparkShopAccess,
  sparkShopCatalog,
  sparkWalletStore,
  useSparkWallet,
} from '@/store/spark-wallet-store';
import { colors, radius, space } from '@/theme';
import { SparkMarketArt } from './market-art';
import { LessonHearts } from '@/components/learning/lesson-hearts';

interface Confirmation {
  item: SparkShopItem;
  command: SparkSpendCommand;
}
let requestSequence = 0;
const nextRequestId = () =>
  `shop-${Date.now().toString(36)}-${(++requestSequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function ShopScreen() {
  const wallet = useSparkWallet();
  const auth = useAuthGate();
  const completedLessonIds = useAppStore((state) => state.completedLessonIds);
  const progressReady = useAppStore((state) => state.hydrated && !state.storageError);
  const progressError = useAppStore((state) => state.storageError);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [message, setMessage] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'outfit' | 'headwear' | 'hearts'>('outfit');
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const busy = preparing || wallet.saving;
  const ready =
    wallet.hydrated &&
    !wallet.error &&
    wallet.earnedSparks !== null &&
    !wallet.accessLoading &&
    progressReady &&
    auth.canPlay;
  const balance = walletBalance(wallet.wallet, wallet.earnedSparks ?? 0);
  const error = wallet.error || wallet.accessError || progressError;
  const accessProjection = projectLessonAccess(completedLessonIds, wallet.wallet);
  const nextLesson = accessProjection.nextLesson;
  const skipItem = nextLesson
    ? sparkShopCatalog.find((item) => item.id === `skip:${nextLesson.id}`)
    : undefined;

  function skipStillEligible(item: SparkShopItem): boolean {
    if (item.kind !== 'skip') return true;
    const progress = useAppStore.getState();
    if (!progress.hydrated || progress.storageError) return false;
    return (
      projectLessonAccess(progress.completedLessonIds, sparkWalletStore.getSnapshot().wallet)
        .nextLesson?.id === item.targetId
    );
  }

  async function prepare(item: SparkShopItem) {
    if (pending.current || !ready) return;
    if (!skipStillEligible(item)) {
      setMessage('Your next lesson changed. Review the current lesson before skipping.');
      return;
    }
    pending.current = true;
    setPreparing(true);
    setMessage('');
    try {
      const access = await getSparkShopAccess();
      if (!active.current) return;
      if (!skipStillEligible(item)) {
        setMessage('Your next lesson changed. Review the current lesson before skipping.');
        return;
      }
      const debit = hasUnlimitedShopSparks(access) ? 0 : item.price;
      setConfirmation({
        item,
        command: {
          transactionId: nextRequestId(),
          itemId: item.id,
          confirmed: true,
          confirmedDebit: debit,
        },
      });
    } catch {
      if (active.current) setMessage('Your shop access could not be checked. Please try again.');
    } finally {
      pending.current = false;
      if (active.current) setPreparing(false);
    }
  }
  async function confirm() {
    if (!confirmation || pending.current) return;
    if (!skipStillEligible(confirmation.item)) {
      setConfirmation(null);
      setMessage('Your next lesson changed. No Sparks spent. Review the current lesson again.');
      return;
    }
    pending.current = true;
    try {
      const result = await sparkWalletStore.spend(confirmation.command);
      if (!active.current) return;
      setMessage(result.message);
      if (result.success) setConfirmation(null);
      else if (result.code === 'quote-changed' || result.code === 'account-changed')
        setConfirmation(null);
      await wallet.refresh();
    } finally {
      pending.current = false;
    }
  }
  async function equip(kind: 'outfit' | 'headwear', targetId: string | null) {
    if (pending.current || busy || !ready) return;
    pending.current = true;
    try {
      const result = await sparkWalletStore.equip(kind, targetId);
      if (active.current) setMessage(result.message);
    } finally {
      pending.current = false;
    }
  }
  return (
    <Screen
      header={<ProfileToolbar title="Spark shop" back />}
      contentWidth={560}
      footer={
        confirmation ? (
          <View style={{ gap: space.md }} testID="spark-confirmation">
            <T variant="subheading">
              {confirmation.item.kind === 'skip'
                ? `${confirmation.item.name}?`
                : `Unlock ${confirmation.item.name}?`}
            </T>
            <T variant="small" selectable>
              {confirmation.command.confirmedDebit === 0
                ? `Your Pro membership covers this ${confirmation.item.kind === 'skip' ? 'skip' : 'unlock'}. Your earned Sparks stay saved.`
                : `Spend ${confirmation.command.confirmedDebit} Sparks. Your level and total earned Sparks stay saved.`}
            </T>
            {confirmation.item.kind === 'skip' ? (
              <T variant="small">
                Open the next lesson. This lesson stays available to learn later; skipping earns no
                Sparks, mastery, streak or completion rewards.
              </T>
            ) : null}
            <Button
              title={
                wallet.saving
                  ? confirmation.item.kind === 'skip'
                    ? 'Saving skip…'
                    : 'Saving unlock…'
                  : confirmation.command.confirmedDebit === 0
                    ? confirmation.item.kind === 'skip'
                      ? 'Confirm Pro skip'
                      : 'Confirm Pro unlock'
                    : `Confirm · ${confirmation.command.confirmedDebit} Sparks`
              }
              loading={wallet.saving}
              disabled={busy || wallet.accessLoading}
              testID="spark-confirm-spend"
              onPress={() => void confirm()}
            />
            <Button
              title="Cancel"
              variant="quiet"
              disabled={busy}
              onPress={() => {
                setConfirmation(null);
                setMessage('');
              }}
            />
          </View>
        ) : undefined
      }
    >
      <SparkMarketArt />
      <View style={styles.wallet}>
        <View style={styles.balanceRow}>
          <GameIcon name="spark" size={24} />
          <T variant="heading" selectable testID="spark-wallet-balance" style={styles.balance}>
            {wallet.accessLoading || wallet.loading || wallet.earnedSparks === null
              ? '…'
              : wallet.unlimited
                ? '∞'
                : balance.toLocaleString()}
          </T>
          <T variant="small" style={{ flex: 1 }}>Sparks</T>
          <Pressable accessibilityRole="button" accessibilityLabel="About Sparks" accessibilityState={{ expanded: showInfo }} onPress={() => setShowInfo(!showInfo)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><T variant="small" style={{ color: colors.primaryPressed }}>Info</T></Pressable>
        </View>
        {showInfo ? <T variant="small" selectable>
          {wallet.earnedSparks === null
            ? 'Checking your saved progress…'
            : `${wallet.earnedSparks.toLocaleString()} earned · ${walletSpent(wallet.wallet).toLocaleString()} spent`}
        </T> : null}
      </View>
      {error ? (
        <View style={styles.notice}>
          <T selectable accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
            {error}
          </T>
          <Button
            title="Retry loading wallet"
            variant="secondary"
            loading={wallet.loading || wallet.accessLoading}
            disabled={busy}
            onPress={() => void wallet.refresh()}
          />
        </View>
      ) : null}
      {message ? (
        <T selectable testID="spark-shop-message" accessibilityLiveRegion="polite">
          {message}
        </T>
      ) : null}
      {!auth.canPlay && auth.hydrated ? (
        <Button title="Sign in to open your shop" onPress={() => router.push('/account')} />
      ) : null}
      <View style={styles.slotTabs}>
        <Button
          title="Outfits"
          compact
          variant={activeSlot === 'outfit' ? 'primary' : 'secondary'}
          selected={activeSlot === 'outfit'}
          disabled={busy}
          style={{ flex: 1 }}
          onPress={() => setActiveSlot('outfit')}
        />
        <Button
          title="Headwear"
          compact
          variant={activeSlot === 'headwear' ? 'primary' : 'secondary'}
          selected={activeSlot === 'headwear'}
          disabled={busy}
          style={{ flex: 1 }}
          onPress={() => setActiveSlot('headwear')}
        />
        <Button title="Hearts" compact variant={activeSlot === 'hearts' ? 'primary' : 'secondary'} selected={activeSlot === 'hearts'} disabled={busy} style={{ flex: 1 }} onPress={() => setActiveSlot('hearts')} />
      </View>
      {activeSlot === 'hearts' ? <View style={[styles.item, { backgroundColor: '#FFEAF3', alignItems: 'center' }]}>
        <LessonHearts count={5} />
        <T variant="title">5 hearts</T>
        <T variant="small">{heartCredits(wallet.wallet)} saved hearts</T>
        <Button title={wallet.unlimited ? 'Buy with Pro · ∞' : 'Buy · 20 Sparks'} disabled={!ready || busy || Boolean(confirmation) || (!wallet.unlimited && balance < HEART_PACK_ITEM.price)} onPress={() => void prepare(HEART_PACK_ITEM)} />
      </View> : null}
      <View style={styles.catalog}>
        {wardrobeCatalog
          .filter((item) => item.slot === activeSlot)
          .map((item) => {
            const shopItem = sparkShopCatalog.find((candidate) => candidate.id === item.id)!;
            const owned = walletOwns(wallet.wallet, shopItem);
            const wearing =
              item.slot === 'outfit'
                ? wallet.wallet.equippedOutfitId === item.id
                : wallet.wallet.equippedHeadwearId === item.id;
            return (
              <View
                key={item.id}
                style={[styles.item, wearing && styles.wearing]}
                testID={`spark-item-${item.id}`}
              >
                <View style={styles.preview}>
                  <WearablePreview itemId={item.id as WardrobeItemId} size={136} />
                </View>
                <T variant="subheading">{item.id === 'discovery-lab-coat' ? 'Lab coat' : item.name}</T>
                <T variant="caption" style={{ color: owned ? colors.success : colors.xp }}>
                  {wearing
                    ? 'Wearing'
                    : owned
                      ? 'Owned'
                      : wallet.unlimited
                        ? 'Pro · ∞'
                        : `${item.price} Sparks`}
                </T>
                <Button
                  compact
                  title={wearing ? 'Wearing' : owned ? 'Wear' : 'Buy'}
                  variant={owned ? 'secondary' : 'primary'}
                  disabled={
                    !ready ||
                    busy ||
                    wearing ||
                    Boolean(confirmation) ||
                    (!owned && !wallet.unlimited && balance < item.price)
                  }
                  testID={`spark-unlock-${item.id}`}
                  onPress={() => (owned ? void equip(item.slot, item.id) : void prepare(shopItem))}
                />
              </View>
            );
          })}
      </View>
      {activeSlot !== 'hearts' ? <Button
        title={activeSlot === 'outfit' ? 'Wear default outfit' : 'Remove headwear'}
        variant="quiet"
        disabled={!ready || busy || Boolean(confirmation)}
        onPress={() => void equip(activeSlot === 'outfit' ? 'outfit' : 'headwear', null)}
      /> : null}
      {showInfo ? <View style={styles.skip} testID="spark-lesson-skip">
        <T variant="subheading">Move to the next lesson</T>
        {nextLesson && skipItem ? (
          <>
            <T>{nextLesson.title}</T>
            <T variant="small">
              Skip this lesson for {skipItem.price} Sparks, or use your unlimited Pro shop Sparks.
              You can come back to learn it. Skipping earns no rewards.
            </T>
            <Button
              title={wallet.unlimited ? 'Skip with Pro · ∞' : `Skip lesson · ${skipItem.price} Sparks`}
              variant="secondary"
              disabled={
                !ready ||
                busy ||
                Boolean(confirmation) ||
                (!wallet.unlimited && balance < skipItem.price)
              }
              testID="spark-prepare-lesson-skip"
              onPress={() => void prepare(skipItem)}
            />
            {!wallet.unlimited && balance < skipItem.price && ready ? (
              <T variant="small">Earn {skipItem.price - balance} more Sparks to skip this lesson.</T>
            ) : null}
          </>
        ) : (
          <T variant="small">
            {progressReady
              ? 'You have reached the end of the core lessons.'
              : 'Loading your saved lessons…'}
          </T>
        )}
        {accessProjection.skippedLessonIds.length ? (
          <T variant="small">
            {accessProjection.skippedLessonIds.length} skipped{' '}
            {accessProjection.skippedLessonIds.length === 1 ? 'lesson is' : 'lessons are'} still available
            on your path. Complete them later to earn their rewards.
          </T>
        ) : null}
        <Button
          title="Back to my path"
          variant="quiet"
          disabled={busy || Boolean(confirmation)}
          onPress={() => router.replace('/(tabs)')}
        />
      </View> : null}
      {showInfo ? <View style={styles.practice}>
        <T variant="subheading">Keep practising for free</T>
        <T variant="small">
          Try the building puzzles again without spending Sparks. Practice attempts do not change
          your earned progress.
        </T>
        <Button
          title="Open practice"
          variant="secondary"
          disabled={busy || Boolean(confirmation)}
          onPress={() => router.push('/(tabs)/compete')}
        />
      </View> : null}
      {showInfo && !wallet.unlimited ? (
        <View style={styles.pro}>
          <T variant="subheading">More freedom with Pro</T>
          <T variant="small">
            Unlock shop styles without spending earned Sparks while your verified Pro membership is
            active. Unlocked styles remain yours afterward.
          </T>
          <Button
            title="See ShipingIT Pro"
            variant="secondary"
            disabled={busy || Boolean(confirmation)}
            onPress={() => router.push('/paywall')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: {
    backgroundColor: colors.peach,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.card,
    gap: space.sm,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  balance: { color: colors.xp, fontVariant: ['tabular-nums'] },
  notice: { gap: space.md },
  skip: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.card,
  },
  slotTabs: { flexDirection: 'row', gap: space.sm },
  catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  item: {
    flexGrow: 1,
    flexBasis: '47%',
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.border,
    gap: space.sm,
  },
  wearing: { borderColor: colors.success, backgroundColor: colors.successSurface },
  preview: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.card,
  },
  practice: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.card,
  },
  pro: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.premiumSurface,
    borderRadius: radius.card,
  },
});
