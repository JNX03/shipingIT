import type { Project } from '../domain/types';

export interface MentorExchange {
  question: string;
  answer: string;
}
export interface MentorRequest {
  prompt: string;
  project: Partial<Project>;
  focus?: 'problem' | 'evidence' | 'scope' | 'validation' | 'pitch';
  history?: readonly MentorExchange[];
  intent?: 'answer' | 'hint';
  hintLevel?: 1 | 2 | 3;
  /** Notes are excluded unless this request's reviewed attachment was selected. */
  attachProject?: boolean;
  /** True only after consent for this question, recent chat, and any reviewed attachment. */
  allowRemote?: boolean;
}
export interface MentorResponse {
  mode: 'live' | 'offline';
  message: string;
  challenge: string;
  evidencePrompt: string;
  nextAction: string;
  reason?: string;
}
export interface AIProvider {
  review(request: MentorRequest, signal?: AbortSignal): Promise<MentorResponse>;
}

export type OpportunityCategory =
  | 'innovation'
  | 'startup'
  | 'hackathon'
  | 'ai'
  | 'research'
  | 'coding'
  | 'science'
  | 'design'
  | 'entrepreneurship';
export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  organizer: string;
  location: string;
  online: boolean;
  deadline: string | null;
  status: 'open' | 'closed' | 'unknown';
  eligibility: string[];
  fee: number | null;
  currency: string;
  tags: string[];
  url: string;
  imageUrl: string | null;
  /** A transparent heuristic, never a claim of admission eligibility. */
  matchReason: string;
}
export interface OpportunityQuery {
  query?: string;
  category?: OpportunityCategory | 'all';
  includeClosed?: boolean;
  project?: Partial<Project>;
  /** User-requested refresh bypasses local freshness, while preserving fallback results. */
  forceRefresh?: boolean;
}
export interface OpportunityResult {
  items: Opportunity[];
  source: 'live' | 'cache' | 'snapshot' | 'offline';
  fetchedAt: string | null;
  sourceUrl: string;
  message?: string;
}
export interface OpportunityProvider {
  list(query?: OpportunityQuery, signal?: AbortSignal): Promise<OpportunityResult>;
}

export interface SubscriptionPackage {
  id: string;
  productId: string;
  title: string;
  description: string;
  priceString: string;
  period: string | null;
  packageType: string;
}
export interface SubscriptionStatus {
  configured: boolean;
  entitled: boolean;
  state: 'ready' | 'unconfigured' | 'unavailable';
  entitlementId: string;
  expiresAt: string | null;
  managementUrl: string | null;
  isSandbox: boolean;
  message?: string;
}
export interface SubscriptionOfferings {
  configured: boolean;
  offeringId: string | null;
  packages: SubscriptionPackage[];
  message?: string;
}
export interface PurchaseResult {
  success: boolean;
  cancelled: boolean;
  status: SubscriptionStatus;
  message: string;
}
export interface SubscriptionService {
  getStatus(): Promise<SubscriptionStatus>;
  getOfferings(): Promise<SubscriptionOfferings>;
  purchase(packageId: string): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  identify(userId: string | null): Promise<void>;
}

export interface AuthIdentity {
  id: string;
  email: string | null;
  displayName: string | null;
}
export interface AuthStatus {
  mode: 'local' | 'cloud';
  configured: boolean;
  identity: AuthIdentity | null;
  message?: string;
}
export interface AuthResult {
  success: boolean;
  status: AuthStatus;
  message: string;
  pendingVerification?: boolean;
}
export interface AuthProvider {
  getStatus(): Promise<AuthStatus>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signInWithProvider(provider: 'google' | 'apple'): Promise<AuthResult>;
  completeOAuth(url: string): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  getAccessToken(): Promise<string | null>;
  subscribe(listener: (status: AuthStatus) => void): () => void;
}
