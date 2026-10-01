/** Spending is a projection of earned progress. This module never writes XP or completion IDs. */
export type ShopItemKind = 'outfit' | 'headwear' | 'practice' | 'skip' | 'hearts';
export const HEART_PACK_PRICE = 20;
export const HEART_PACK_ITEM: SparkShopItem = { id: 'heart-pack', targetId: 'heart-pack', kind: 'hearts', price: HEART_PACK_PRICE, name: '5 hearts', description: 'Keep them for a lesson refill.' };
export interface HeartRedemption { id: string; attemptId: string; hearts: number; at: string }
export interface SparkShopItem {
  id: string;
  kind: ShopItemKind;
  targetId: string;
  price: number;
  name: string;
  description: string;
}
export interface SparkPurchase {
  id: string;
  itemId: string;
  kind: ShopItemKind;
  targetId: string;
  price: number;
  spent: number;
  payment: 'earned' | 'pro';
  at: string;
}
export interface SparkWallet {
  version: 1;
  purchases: SparkPurchase[];
  equippedOutfitId: string | null;
  equippedHeadwearId: string | null;
  heartRedemptions?: HeartRedemption[];
}
/** Ephemeral, obtained from the account/subscription provider at action time. Never persisted. */
export interface SparkAccess {
  accountId: string | null;
  configured: boolean;
  state: 'ready' | 'unavailable' | 'unconfigured';
  entitled: boolean;
  expiresAt: string | null;
}
export interface SparkSpendCommand {
  transactionId: string;
  itemId: string;
  confirmed: boolean;
  /** The user agrees to this exact debit. Expiring Pro must not silently charge earned Sparks. */
  confirmedDebit: number;
}
export type SparkResultCode =
  | 'purchased'
  | 'replayed'
  | 'owned'
  | 'insufficient'
  | 'confirmation'
  | 'quote-changed'
  | 'invalid'
  | 'storage'
  | 'account-changed'
  | 'busy'
  | 'equipped';
export interface SparkResult {
  success: boolean;
  code: SparkResultCode;
  message: string;
  spent: number;
  purchase?: SparkPurchase;
  heartsAdded?: number;
}
export const SPARK_WALLET_STORAGE_KEY = 'shipingit:spark-wallet:v1';
const MAX_PURCHASES = 1000;
const MAX_PRICE = 1_000_000;
const id = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
const amount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const kinds: ShopItemKind[] = ['outfit', 'headwear', 'practice', 'skip', 'hearts'];
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function initialSparkWallet(): SparkWallet {
  return { version: 1, purchases: [], equippedOutfitId: null, equippedHeadwearId: null };
}
export function sparkWalletSnapshot(wallet: SparkWallet): SparkWallet {
  return {
    version: 1,
    purchases: wallet.purchases.map((entry) => ({ ...entry })),
    equippedOutfitId: wallet.equippedOutfitId,
    equippedHeadwearId: wallet.equippedHeadwearId,
    heartRedemptions: (wallet.heartRedemptions ?? []).map((entry) => ({ ...entry })),
  };
}
export function hasUnlimitedShopSparks(access: SparkAccess | null, now = Date.now()): boolean {
  return Boolean(
    access?.accountId?.trim() &&
    access.configured &&
    access.state === 'ready' &&
    access.entitled &&
    Number.isFinite(now) &&
    (access.expiresAt === null ||
      (Number.isFinite(Date.parse(access.expiresAt)) && Date.parse(access.expiresAt) > now)),
  );
}
export function walletSpent(wallet: SparkWallet): number {
  return wallet.purchases.reduce((sum, purchase) => sum + purchase.spent, 0);
}
export function walletBalance(wallet: SparkWallet, earnedSparks: number): number {
  if (!amount(earnedSparks)) return 0;
  return Math.max(0, earnedSparks - walletSpent(wallet));
}
export function unlockedWalletTargets(wallet: SparkWallet, kind: ShopItemKind): string[] {
  return wallet.purchases.filter((entry) => entry.kind === kind).map((entry) => entry.targetId);
}
export const skippedLessonIds = (wallet: SparkWallet): string[] =>
  unlockedWalletTargets(wallet, 'skip');
export function walletOwns(
  wallet: SparkWallet,
  item: Pick<SparkShopItem, 'kind' | 'targetId'>,
): boolean {
  if (item.kind === 'hearts') return false;
  return wallet.purchases.some(
    (entry) => entry.kind === item.kind && entry.targetId === item.targetId,
  );
}

/** v1 migrates old learners with no wallet to zero spending and zero unlocks; XP is never copied. */
export function parseSparkWallet(raw: string | null): SparkWallet {
  if (raw === null) return initialSparkWallet();
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.purchases) ||
    value.purchases.length > MAX_PURCHASES
  )
    throw new Error('Unsupported Sparks wallet');
  const wallet = initialSparkWallet();
  const transactionIds = new Set<string>();
  const targets = new Set<string>();
  for (const input of value.purchases) {
    if (
      !record(input) ||
      !id(input.id) ||
      !id(input.itemId) ||
      !id(input.targetId) ||
      !kinds.includes(input.kind as ShopItemKind) ||
      !amount(input.price) ||
      input.price < 1 ||
      input.price > MAX_PRICE ||
      !amount(input.spent) ||
      (input.payment !== 'earned' && input.payment !== 'pro') ||
      input.spent !== (input.payment === 'pro' ? 0 : input.price) ||
      typeof input.at !== 'string' ||
      !Number.isFinite(Date.parse(input.at))
    )
      throw new Error('Invalid Sparks purchase');
    if (input.kind === 'hearts' && (input.itemId !== HEART_PACK_ITEM.id || input.targetId !== input.id || input.price !== HEART_PACK_PRICE))
      throw new Error('Invalid heart pack');
    const target = `${input.kind}:${input.targetId}`;
    if (transactionIds.has(input.id) || targets.has(target))
      throw new Error('Duplicate Sparks purchase');
    transactionIds.add(input.id);
    targets.add(target);
    wallet.purchases.push({
      id: input.id,
      itemId: input.itemId,
      kind: input.kind as ShopItemKind,
      targetId: input.targetId,
      price: input.price,
      spent: input.spent,
      payment: input.payment,
      at: input.at,
    });
  }
  if (!Number.isSafeInteger(walletSpent(wallet))) throw new Error('Invalid Sparks total');
  const redemptions = value.heartRedemptions ?? [];
  if (!Array.isArray(redemptions) || redemptions.length > MAX_PURCHASES * 5) throw new Error('Invalid heart redemptions');
  const redeemedIds = new Set<string>();
  wallet.heartRedemptions = redemptions.map((input) => {
    if (!record(input) || !id(input.id) || !id(input.attemptId) || !amount(input.hearts) || input.hearts < 1 || input.hearts > 5 || typeof input.at !== 'string' || !Number.isFinite(Date.parse(input.at)) || redeemedIds.has(input.id)) throw new Error('Invalid heart redemption');
    redeemedIds.add(input.id);
    return { id: input.id, attemptId: input.attemptId, hearts: input.hearts, at: input.at };
  });
  if (heartCredits(wallet) < 0) throw new Error('Overdrawn heart credits');
  for (const [field, kind] of [
    ['equippedOutfitId', 'outfit'],
    ['equippedHeadwearId', 'headwear'],
  ] as const) {
    const selected = value[field];
    if (selected !== null && (!id(selected) || !walletOwns(wallet, { kind, targetId: selected })))
      throw new Error('Unowned wardrobe selection');
    wallet[field] = selected;
  }
  return wallet;
}

export function reduceSparkSpend(
  wallet: SparkWallet,
  catalog: readonly SparkShopItem[],
  earnedSparks: number,
  access: SparkAccess | null,
  command: SparkSpendCommand,
  now = Date.now(),
): { wallet: SparkWallet; result: SparkResult } {
  const deny = (code: SparkResultCode, message: string) => ({
    wallet,
    result: { success: false, code, message, spent: 0 },
  });
  if (
    !id(command.transactionId) ||
    !id(command.itemId) ||
    !amount(command.confirmedDebit) ||
    !Number.isFinite(now)
  )
    return deny('invalid', 'This unlock request is invalid. Choose the item again.');
  const replay = wallet.purchases.find((entry) => entry.id === command.transactionId);
  if (replay) {
    if (replay.itemId !== command.itemId)
      return deny('invalid', 'This request was already used for another item.');
    return {
      wallet,
      result: {
        success: true,
        code: 'replayed',
        message: 'Already unlocked. No Sparks spent again.',
        spent: 0,
        purchase: replay,
      },
    };
  }
  const item = catalog.find((candidate) => candidate.id === command.itemId);
  if (
    !item ||
    !id(item.targetId) ||
    !kinds.includes(item.kind) ||
    !amount(item.price) ||
    item.price < 1 ||
    item.price > MAX_PRICE ||
    wallet.purchases.length >= MAX_PURCHASES
    || (item.kind === 'hearts' && (item.id !== HEART_PACK_ITEM.id || item.price !== HEART_PACK_PRICE))
  )
    return deny('invalid', 'This item is unavailable. Choose another item.');
  if (walletOwns(wallet, item))
    return {
      wallet,
      result: { success: true, code: 'owned', message: 'You already own this item.', spent: 0 },
    };
  if (command.confirmed !== true)
    return deny(
      'confirmation',
      item.kind === 'skip'
        ? 'Confirm the lesson skip and its Spark cost. Skips earn no rewards.'
        : 'Confirm this unlock and its Spark cost.',
    );
  const unlimited = hasUnlimitedShopSparks(access, now);
  const debit = unlimited ? 0 : item.price;
  if (debit !== command.confirmedDebit)
    return deny(
      'quote-changed',
      'Your shop access changed. Review the Spark cost and confirm again.',
    );
  if (
    !amount(earnedSparks) ||
    (!unlimited && walletSpent(wallet) > earnedSparks) ||
    walletBalance(wallet, earnedSparks) < debit
  )
    return deny('insufficient', 'Earn more Sparks by completing lessons, then try again.');
  const purchase: SparkPurchase = {
    id: command.transactionId,
    itemId: item.id,
    kind: item.kind,
    targetId: item.kind === 'hearts' ? command.transactionId : item.targetId,
    price: item.price,
    spent: debit,
    payment: unlimited ? 'pro' : 'earned',
    at: new Date(now).toISOString(),
  };
  return {
    wallet: { ...sparkWalletSnapshot(wallet), purchases: [...wallet.purchases, purchase] },
    result: {
      success: true,
      code: 'purchased',
      spent: debit,
      purchase,
      message:
        item.kind === 'hearts' ? '5 hearts saved. Use them in a lesson whenever you need a refill.' : item.kind === 'skip'
          ? 'Lesson skipped. You can return to learn it anytime. No rewards earned.'
          : `${item.name} unlocked${unlimited ? ' with Pro' : ''}.`,
    },
  };
}

export function heartCredits(wallet: SparkWallet): number {
  return wallet.purchases.filter((purchase) => purchase.kind === 'hearts').length * 5 - (wallet.heartRedemptions ?? []).reduce((sum, redemption) => sum + redemption.hearts, 0);
}
export function reduceRedeemHearts(wallet: SparkWallet, command: { id: string; attemptId: string; hearts: number }, now = Date.now()): { wallet: SparkWallet; result: SparkResult } {
  const deny = (message: string) => ({ wallet, result: { success: false, code: 'invalid' as const, message, spent: 0 } });
  if (!id(command.id) || !id(command.attemptId) || !amount(command.hearts) || command.hearts < 1 || command.hearts > 5 || !Number.isFinite(now)) return deny('Choose a refill between 1 and 5 hearts.');
  const replay = wallet.heartRedemptions?.find((entry) => entry.id === command.id);
  if (replay) return replay.attemptId === command.attemptId && replay.hearts === command.hearts
    ? { wallet, result: { success: true, code: 'replayed', message: 'This refill was already used.', spent: 0, heartsAdded: 0 } }
    : deny('This refill request was already used for another attempt.');
  if (heartCredits(wallet) < command.hearts) return deny('Buy a heart pack before refilling.');
  const redemption = { ...command, at: new Date(now).toISOString() };
  return { wallet: { ...sparkWalletSnapshot(wallet), heartRedemptions: [...(wallet.heartRedemptions ?? []), redemption] }, result: { success: true, code: 'purchased', message: `${command.hearts} hearts refilled.`, spent: 0, heartsAdded: command.hearts } };
}

export function reduceEquipWearable(
  wallet: SparkWallet,
  kind: 'outfit' | 'headwear',
  targetId: string | null,
): { wallet: SparkWallet; result: SparkResult } {
  if (
    (kind !== 'outfit' && kind !== 'headwear') ||
    (targetId !== null && (!id(targetId) || !walletOwns(wallet, { kind, targetId })))
  )
    return {
      wallet,
      result: {
        success: false,
        code: 'invalid',
        message: 'Unlock this item before wearing it.',
        spent: 0,
      },
    };
  const next = sparkWalletSnapshot(wallet);
  if (kind === 'outfit') next.equippedOutfitId = targetId;
  else next.equippedHeadwearId = targetId;
  return {
    wallet: next,
    result: {
      success: true,
      code: 'equipped',
      message: targetId ? 'Outfit saved.' : 'Default style restored.',
      spent: 0,
    },
  };
}
