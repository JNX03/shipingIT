import type { ImageSourcePropType } from 'react-native';
import type { WorldSceneId } from './scenes';

/** Original generated environments; prompts and provenance in assets/worlds/README.md. */
export const worldArt = {
  campus: require('../../../assets/game/campus-map.webp'),
  canteen: require('../../../assets/worlds/canteen-v2.webp'),
  sports: require('../../../assets/worlds/sports-v2.webp'),
} satisfies Record<WorldSceneId, ImageSourcePropType>;
