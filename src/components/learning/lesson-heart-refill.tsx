import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BottomSheet, RNHostView } from '@expo/ui';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { LessonHearts } from './lesson-hearts';
import { heartCredits, hasUnlimitedShopSparks, HEART_PACK_ITEM, type SparkSpendCommand } from '@/domain/spark-wallet';
import { getSparkShopAccess, sparkWalletStore, useSparkWallet } from '@/store/spark-wallet-store';
import { colors } from '@/theme';

const requestId = () => `heart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function LessonHeartRefill({ hearts, attemptId, onRefill, onClose }: { hearts: number; attemptId: string; onRefill: (amount: number) => void; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const wallet = useSparkWallet();
  const [quote, setQuote] = useState<SparkSpendCommand | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const pending = useRef(false);
  const [redemptionId] = useState(requestId);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const missing = Math.max(0, 5 - hearts);
  const credits = heartCredits(wallet.wallet);
  const buy = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (!quote) {
        const access = await getSparkShopAccess();
        if (mounted.current) setQuote({ transactionId: requestId(), itemId: HEART_PACK_ITEM.id, confirmed: true, confirmedDebit: hasUnlimitedShopSparks(access) ? 0 : HEART_PACK_ITEM.price });
      } else {
        const result = await sparkWalletStore.spend(quote);
        if (!mounted.current) return;
        setMessage(result.message);
        if (result.success || result.code === 'quote-changed' || result.code === 'account-changed') setQuote(null);
        await wallet.refresh();
      }
    } catch { if (mounted.current) setMessage('Could not check the pack price. No Sparks were spent. Try again.'); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const refill = async () => {
    if (pending.current || missing < 1 || credits < missing) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await sparkWalletStore.redeemHearts({ id: redemptionId, attemptId, hearts: missing });
      if (!mounted.current) return;
      setMessage(result.message);
      if (result.success && result.heartsAdded) { onRefill(result.heartsAdded); onClose(); }
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  return (
    <BottomSheet isPresented onDismiss={() => { if (!busy) onClose(); }} shouldDismissOnBackPress={!busy} shouldDismissOnClickOutside={!busy} containerColor={colors.surface}>
      <RNHostView matchContents>
        <View style={{ width: Math.min(Math.max(0, width - 32), 520), padding: 24, gap: 16 }}>
          <LessonHearts count={hearts} />
          <T variant="title">Refill your hearts</T>
          <T>{credits} saved hearts · {missing} needed for this lesson</T>
          {message || wallet.error || wallet.accessError ? <T variant="small" accessibilityLiveRegion="polite">{message || wallet.error || wallet.accessError}</T> : null}
          {credits >= missing && missing > 0 ? <Button title={`Use ${missing} saved ${missing === 1 ? 'heart' : 'hearts'}`} disabled={busy || wallet.loading} loading={busy} onPress={() => void refill()} /> : null}
          {quote ? <T variant="small">{quote.confirmedDebit === 0 ? 'Verified Pro covers this pack.' : `Spend ${quote.confirmedDebit} Sparks for 5 hearts?`} Your learning rank stays the same.</T> : null}
          <Button title={quote ? `Confirm · ${quote.confirmedDebit === 0 ? 'Pro pack' : `${quote.confirmedDebit} Sparks`}` : 'Buy 5 hearts · 20 Sparks'} variant="secondary" disabled={busy || wallet.accessLoading || Boolean(wallet.error)} loading={busy} onPress={() => void buy()} />
          <T variant="small">New hearts stay saved until you use them. Mistakes still count in this attempt.</T>
          <Button title="Keep learning" variant="quiet" disabled={busy} onPress={onClose} />
        </View>
      </RNHostView>
    </BottomSheet>
  );
}
