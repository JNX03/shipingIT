import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { OpportunityProvider, OpportunityResult } from './contracts';
import { DEKPORT_API_URL, serviceConfig } from './config';
import { fetchJson, isRecord } from './http';
import { filterOpportunities, mapOpportunity } from './opportunity-mapping';
import { shouldRefreshOpportunities } from './opportunity-cache';
import snapshot from './opportunities-snapshot.json';

const CACHE_KEY = 'shipaton:opportunities:v1';
interface FeedCache {
  fetchedAt: string;
  events: unknown[];
}
let memoryFeed: FeedCache | null = null;
function parseFeed(value: unknown): unknown[] | null {
  return isRecord(value) && Array.isArray(value.events) ? value.events.slice(0, 150) : null;
}
function parseCache(value: unknown): FeedCache | null {
  if (
    !isRecord(value) ||
    typeof value.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.fetchedAt))
  )
    return null;
  const events = parseFeed(value);
  return events ? { fetchedAt: value.fetchedAt, events } : null;
}
async function cachedFeed(): Promise<FeedCache | null> {
  if (memoryFeed) return memoryFeed;
  try {
    const value = await AsyncStorage.getItem(CACHE_KEY);
    return value ? parseCache(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export const opportunityProvider: OpportunityProvider = {
  async list(query = {}, signal) {
    const cached = await cachedFeed();
    let feed: FeedCache | null = cached;
    let source: OpportunityResult['source'] = cached ? 'cache' : 'offline';
    let message: string | undefined;
    const url = serviceConfig.opportunityProxyUrl ?? DEKPORT_API_URL;
    // Verified 2026-09-29: the production feed rejects unknown Origin headers. Do not knowingly spam it on localhost.
    const canFetch = Platform.OS !== 'web' || Boolean(serviceConfig.opportunityProxyUrl);
    if (canFetch && shouldRefreshOpportunities(cached?.fetchedAt ?? null, query.forceRefresh)) {
      try {
        const raw = await fetchJson(
          url,
          { signal, ...(query.forceRefresh ? { cache: 'no-store' as const } : {}) },
          10000,
        );
        const events = parseFeed(raw);
        if (!events) throw new Error('Invalid feed');
        feed = { fetchedAt: new Date().toISOString(), events };
        memoryFeed = feed;
        source = 'live';
        try {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feed));
        } catch {
          /* Live results still render if disk storage is full. */
        }
      } catch {
        message = 'Could not refresh opportunities. Check the event page before applying.';
      }
    } else if (!canFetch) {
      message =
        'Saved DekPort listings. Open the event page for current deadlines and requirements.';
    }
    if (!feed) {
      feed = parseCache(snapshot);
      source = feed ? 'snapshot' : 'offline';
      message = feed
        ? 'Saved DekPort listings. Open the event page for current deadlines and requirements.'
        : 'Opportunities are unavailable. Your project is saved; try again when connected.';
    }
    const items = (feed?.events ?? [])
      .map((value) => mapOpportunity(value))
      .filter((item): item is NonNullable<typeof item> => item !== null);
    return {
      items: filterOpportunities(items, query),
      source,
      fetchedAt: feed?.fetchedAt ?? null,
      sourceUrl: DEKPORT_API_URL,
      message,
    };
  },
};

export {
  categoryFor,
  deadlineStatus,
  filterOpportunities,
  mapOpportunity,
} from './opportunity-mapping';
export type {
  Opportunity,
  OpportunityProvider,
  OpportunityQuery,
  OpportunityResult,
  OpportunityCategory,
} from './contracts';
