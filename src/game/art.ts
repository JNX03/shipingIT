import type { ImageSourcePropType } from 'react-native';

/** Original generated ShipingIT artwork. Prompts/source records: docs/SHIPINGIT-ART.md. */
export const gameSceneArt = {
  campus: require('../../assets/game/campus-map.webp'),
} satisfies Record<string, ImageSourcePropType>;

export const gameCharacterArt = {
  amiIdle: require('../../assets/game/ami-idle.webp'),
  amiTalk: require('../../assets/game/ami-talk.webp'),
  amiWalk: require('../../assets/game/ami-walk.webp'),
  mali: require('../../assets/game/npc-mali.webp'),
  noa: require('../../assets/game/npc-noa.webp'),
  ken: require('../../assets/game/npc-ken.webp'),
} satisfies Record<string, ImageSourcePropType>;

export const gameStageArt = {
  explore: require('../../assets/game/stage-explore.webp'),
  insight: require('../../assets/game/stage-insight.webp'),
  scope: require('../../assets/game/stage-scope.webp'),
  design: require('../../assets/game/stage-design.webp'),
  connect: require('../../assets/game/stage-connect.webp'),
  launch: require('../../assets/game/stage-launch.webp'),
} satisfies Record<string, ImageSourcePropType>;

export const gamePropArt = {
  evidence: gameStageArt.explore,
  featureCrate: gameStageArt.scope,
  spark: require('../../assets/game/reward-spark.webp'),
  reward: require('../../assets/game/reward-toolbox.webp'),
} satisfies Record<string, ImageSourcePropType>;

/** Normalized ground positions are foot anchors, not the top-left corner of a sprite. */
export const campusArtLayout = {
  aspectRatio: 2 / 3,
  spawn: { x: 0.5, y: 0.88 },
  mali: { x: 0.27, y: 0.66 },
  noa: { x: 0.72, y: 0.32 },
  ken: { x: 0.78, y: 0.73 },
} as const;

export const gameArt = {
  campusMap: gameSceneArt.campus,
  player: gameCharacterArt.amiIdle,
  npcMali: gameCharacterArt.mali,
  npcNoa: gameCharacterArt.noa,
  npcKen: gameCharacterArt.ken,
  evidenceCard: gamePropArt.evidence,
  featureCrate: gamePropArt.featureCrate,
};
