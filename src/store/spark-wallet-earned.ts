import { parsePersistedState } from '../domain/progression';
import { parseAdventure } from '../game/state';
import { parseProfileQuests, totalProfileXP } from '../game/profile-quests';
import { challengeCatalog, isChallengeUnlocked } from '../game/challenges/catalog';
import { checkChallenge, parseChallengeAction, replayChallenge } from '../game/challenges/logic';
import type { ChallengeAction } from '../game/challenges/model';
import type { SparkWalletStorage } from './spark-wallet-core';
import { parseSparkWallet, SPARK_WALLET_STORAGE_KEY } from '../domain/spark-wallet';

// Durable source keys are read only. Wallet spending never flushes a stale gameplay tab to disk.
export const sparkEarningKeys = {
  learning: 'shipaton-nextgen:learning-state:v1',
  adventure: 'shipingit:adventure:v1',
  quests: 'shipingit:profile-quests:v1',
  practice: 'shipingit:practice:v1',
} as const;
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid earned progress');
  return value as Record<string, unknown>;
};
function persistedPracticeSparks(raw: string | null, now: number): number {
  if (raw === null) return 0;
  const saved = record(JSON.parse(raw));
  if (saved.version !== 1) throw new Error('Unsupported practice progress');
  const proofs = record(saved.proofs);
  const completed: Record<string, string> = {};
  let earned = 0;
  // Match the source's existing immutable proof validation and prerequisite order.
  for (const challenge of challengeCatalog) {
    if (!isChallengeUnlocked(challenge.id, completed)) break;
    const input = proofs[challenge.id];
    if (!input || typeof input !== 'object' || Array.isArray(input)) continue;
    const proof = record(input);
    if (
      typeof proof.at !== 'string' ||
      !Number.isFinite(Date.parse(proof.at)) ||
      Date.parse(proof.at) > now ||
      !Array.isArray(proof.actions)
    )
      continue;
    const actions = proof.actions
      .slice(0, 1000)
      .map(parseChallengeAction)
      .filter((entry): entry is ChallengeAction => Boolean(entry));
    if (!checkChallenge(challenge, replayChallenge(challenge, actions)).valid) continue;
    completed[challenge.id] = proof.at;
    earned += challenge.reward;
  }
  return earned;
}
export function parseDurableSparkEarnings(
  input: Record<keyof typeof sparkEarningKeys, string | null> & { wallet?: string | null },
  now = Date.now(),
): number {
  if (!Number.isFinite(now)) throw new Error('Invalid progress clock');
  const date = new Date(now);
  const wallet = parseSparkWallet(input.wallet ?? null);
  const learning = parsePersistedState(input.learning, date, wallet);
  const adventure = parseAdventure(input.adventure, date);
  if (learning.recovered || adventure.incompatible)
    throw new Error('Earned progress needs recovery');
  // Adventure normalization is source-owned. A malformed JSON save must not become spendable XP.
  if (input.adventure !== null && record(JSON.parse(input.adventure)).version !== 1)
    throw new Error('Unsupported adventure progress');
  const quests = parseProfileQuests(input.quests);
  const earned = totalProfileXP(
    learning.state,
    adventure.state,
    quests,
    persistedPracticeSparks(input.practice, now),
  );
  if (!Number.isSafeInteger(earned) || earned < 0) throw new Error('Invalid earned Sparks');
  return earned;
}
export async function readDurableSparkEarnings(
  storage: Pick<SparkWalletStorage, 'getItem'>,
  now = Date.now(),
) {
  const [learning, adventure, quests, practice, wallet] = await Promise.all(
    [...Object.values(sparkEarningKeys), SPARK_WALLET_STORAGE_KEY].map((key) => storage.getItem(key)),
  );
  return parseDurableSparkEarnings({ learning, adventure, quests, practice, wallet }, now);
}
