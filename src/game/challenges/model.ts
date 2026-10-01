import type { StageId, NpcId } from '../types';
export type ChallengeKind = 'interview' | 'sort' | 'pack' | 'layout' | 'wire' | 'repair';
export interface ChallengeItem {
  id: string;
  title: string;
  detail: string;
  target?: string;
  cost?: number;
  requires?: string[];
  required?: boolean;
  keywords?: string[];
}
export interface ChallengeTarget {
  id: string;
  title: string;
}
export interface Challenge {
  id: string;
  title: string;
  stage: StageId;
  kind: ChallengeKind;
  instructions: string;
  reward: number;
  prerequisite: string | null;
  npc: NpcId;
  opening: string;
  items: ChallengeItem[];
  targets: ChallengeTarget[];
  budget?: number;
  initial?: Record<string, string>;
  needsSize?: boolean;
  needsContrast?: boolean;
  testCases?: { id: string; title: string; action: string; expected: string; failure: string }[];
}
export interface ChallengeDraft {
  assignments: Record<string, string>;
  packed: string[];
  dialogue: { question: string; reply: string; clue?: string }[];
  targetSize: number;
  highContrast: boolean;
  tests: { fingerprint: string; passed: boolean; messages: string[] } | null;
  failedRuns: number;
}
export type ChallengeAction =
  | { type: 'ask'; question: string; replyVersion?: 2 }
  | { type: 'place'; item: string; target: string }
  | { type: 'unplace'; item: string }
  | { type: 'pack'; item: string }
  | { type: 'unpack'; item: string }
  | { type: 'size'; value: number }
  | { type: 'contrast'; value: boolean }
  | { type: 'run' };
export interface ChallengeCheck {
  valid: boolean;
  message: string;
}
