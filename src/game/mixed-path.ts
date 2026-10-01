import { getLesson, missions } from '../data/curriculum';
import type { StoryContentRef } from '../data/storybook';
import { gameStageById } from './catalog';
import { challengeById } from './challenges/catalog';
import type { StageId } from './types';

export interface MixedPathNode {
  key: string;
  ref: StoryContentRef;
  title: string;
  caption: string;
  artStage: StageId;
}
export interface MixedPathUnit {
  id: number;
  title: string;
  subtitle: string;
  nodes: MixedPathNode[];
}

export function mixedReferenceKey(ref: StoryContentRef): string {
  switch (ref.kind) {
    case 'adventure':
      return `adventure:${ref.stageId}`;
    case 'challenge':
      return `challenge:${ref.challengeId}`;
    case 'lesson':
      return `lesson:${ref.lessonId}`;
  }
}

const missionArt: StageId[] = [
  'explore',
  'insight',
  'scope',
  'design',
  'launch',
  'scope',
  'connect',
  'launch',
];
function node(ref: StoryContentRef): MixedPathNode {
  const key = mixedReferenceKey(ref);
  if (ref.kind === 'adventure') {
    const stage = gameStageById(ref.stageId)!;
    return { key, ref, title: stage.title, caption: 'Game', artStage: stage.id };
  }
  if (ref.kind === 'challenge') {
    const practice = challengeById(ref.challengeId)!;
    return { key, ref, title: practice.title, caption: 'Practice', artStage: practice.stage };
  }
  const lesson = getLesson(ref.lessonId)!;
  return {
    key,
    ref,
    title: lesson.title,
    caption: `Lesson · ${lesson.minutes} min`,
    artStage: missionArt[lesson.missionId - 1]!,
  };
}
const lesson = (lessonId: Extract<StoryContentRef, { kind: 'lesson' }>['lessonId']) =>
  node({ kind: 'lesson', lessonId });
const game = (stageId: StageId) => node({ kind: 'adventure', stageId });
const practice = (challengeId: Extract<StoryContentRef, { kind: 'challenge' }>['challengeId']) =>
  node({ kind: 'challenge', challengeId });

/** Spaced review across the eight missions. Original ledgers still own gates and rewards. */
export const mixedPathUnits: MixedPathUnit[] = [
  {
    ...missions[0]!,
    nodes: [
      lesson('discover-1'),
      game('explore'),
      practice('explore-last-time'),
      lesson('discover-2'),
      practice('explore-workaround'),
      lesson('discover-3'),
      practice('insight-observation'),
      lesson('discover-4'),
    ],
  },
  {
    ...missions[1]!,
    nodes: [
      lesson('define-1'),
      game('insight'),
      practice('insight-cause'),
      lesson('define-2'),
      practice('scope-lunch'),
      lesson('define-3'),
      practice('scope-library'),
      lesson('define-4'),
    ],
  },
  {
    ...missions[2]!,
    nodes: [
      lesson('scope-1'),
      game('scope'),
      practice('design-thumb'),
      lesson('scope-2'),
      practice('design-readable'),
      lesson('scope-3'),
      practice('connect-report'),
      lesson('scope-4'),
    ],
  },
  {
    ...missions[3]!,
    nodes: [
      lesson('prototype-1'),
      game('design'),
      practice('connect-recovery'),
      lesson('prototype-2'),
      practice('launch-stale'),
      lesson('prototype-3'),
      practice('launch-access'),
      lesson('prototype-4'),
    ],
  },
  {
    ...missions[4]!,
    nodes: [
      lesson('validate-1'),
      practice('explore-library-handoff'),
      lesson('validate-2'),
      practice('explore-club-room'),
      lesson('validate-3'),
      practice('insight-library-evidence'),
      lesson('validate-4'),
    ],
  },
  {
    ...missions[5]!,
    nodes: [
      lesson('business-1'),
      practice('insight-club-evidence'),
      lesson('business-2'),
      practice('scope-library-hold'),
      lesson('business-3'),
      practice('scope-club-update'),
      lesson('business-4'),
    ],
  },
  {
    ...missions[6]!,
    nodes: [
      lesson('build-1'),
      game('connect'),
      practice('design-library-pickup'),
      lesson('build-2'),
      practice('design-club-cancelled'),
      lesson('build-3'),
      practice('connect-library-hold'),
      lesson('build-4'),
    ],
  },
  {
    ...missions[7]!,
    nodes: [
      lesson('ship-1'),
      game('launch'),
      practice('connect-club-reminder'),
      lesson('ship-2'),
      practice('launch-library-stale'),
      lesson('ship-3'),
      practice('launch-club-reminder'),
      lesson('ship-4'),
    ],
  },
];

export const mixedPathNodes = mixedPathUnits.flatMap((unit) => unit.nodes);
/** Use a short callout; longer instructions remain in the ordinary activity opening. */
export function mixedPracticeDetail(id: string): string {
  const entry = challengeById(id);
  return entry
    ? `${entry.kind === 'interview' ? 'Meet a character and collect clues.' : 'Try a hands-on project puzzle.'} +${entry.reward} Sparks once.`
    : '';
}
