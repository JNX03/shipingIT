export const stageIds = ['explore', 'insight', 'scope', 'design', 'connect', 'launch'] as const;
export type StageId = (typeof stageIds)[number];
export type NpcId = 'mali' | 'noa' | 'ken';
export interface InterviewMessage {
  id: string;
  role: 'learner' | 'character';
  text: string;
  source: 'player' | 'scripted' | 'ai';
  evidenceId?: string;
}
export interface ScreenBlock {
  id: string;
  kind: 'title' | 'queue' | 'updated' | 'button' | 'image' | 'navigation';
  x: number;
  y: number;
}
export interface FlowLink { from: string; to: string }
export interface GameDraft {
  projectName: string;
  explore: {
    visited: NpcId[];
    conversations: Partial<Record<NpcId, InterviewMessage[]>>;
    evidenceIds: string[];
  };
  insight: { slots: Record<string, string>; statement: string };
  scope: { featureIds: string[] };
  design: { blocks: ScreenBlock[]; radius: number; spacing: number; alignment: 'left' | 'center'; accent: 'blue' | 'purple' | 'teal' };
  connect: { links: FlowLink[] };
  launch: { fixedIssueIds: string[]; testRun: string[]; shipped: boolean };
}
export interface StageCheck { valid: boolean; message: string }
export interface GameStageProps {
  draft: GameDraft;
  onChange: (patch: Partial<GameDraft>) => void;
  onComplete: () => void;
}
