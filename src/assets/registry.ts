import type { ImageSourcePropType } from 'react-native';

// Asset paths stay centralized. Generation provenance is in docs/ASSETS.md.
export const characterAssets = {
  welcome: require('../../assets/characters/mentor/ami-welcome-v2.webp'),
  neutral: require('../../assets/characters/mentor/waving.webp'),
  waving: require('../../assets/characters/mentor/waving.webp'),
  thinking: require('../../assets/characters/mentor/thinking.webp'),
  questioning: require('../../assets/characters/mentor/thinking.webp'),
  encouraging: require('../../assets/characters/mentor/encouraging.webp'),
  celebrating: require('../../assets/characters/mentor/celebrating.webp'),
  pointing: require('../../assets/characters/mentor/original-pointing.webp'),
  original: require('../../assets/characters/mentor/original-neutral.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type CharacterEmotion = keyof typeof characterAssets;

export const illustrationAssets = {
  discover: require('../../assets/illustrations/discover.webp'),
  define: require('../../assets/illustrations/define.webp'),
  scope: require('../../assets/illustrations/scope.webp'),
  prototype: require('../../assets/illustrations/prototype.webp'),
  validate: require('../../assets/illustrations/validate.webp'),
  business: require('../../assets/illustrations/business.webp'),
  build: require('../../assets/illustrations/build.webp'),
  ship: require('../../assets/illustrations/ship.webp'),
  emptyProject: require('../../assets/illustrations/empty-project.webp'),
  premium: require('../../assets/illustrations/builder-toolkit.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type MissionIllustration = keyof typeof illustrationAssets;

export const characterActionAssets = {
  idle: characterAssets.neutral,
  pointing: characterAssets.pointing,
  reading: illustrationAssets.define,
  interviewing: illustrationAssets.define,
  sketching: illustrationAssets.prototype,
  prototyping: illustrationAssets.prototype,
  coding: illustrationAssets.build,
  testing: illustrationAssets.validate,
  pitching: illustrationAssets.ship,
  shipping: illustrationAssets.ship,
} satisfies Record<string, ImageSourcePropType>;

export type CharacterAction = keyof typeof characterActionAssets;

export const rewardAssets = {
  problemHunter: require('../../assets/rewards/problem-hunter.webp'),
} satisfies Record<string, ImageSourcePropType>;

export const soundAssets = {
  correct: require('../../assets/audio/correct.wav'),
  wrong: require('../../assets/audio/wrong.wav'),
  completion: require('../../assets/audio/completion.wav'),
} satisfies Record<string, number>;

export const brandAssets = {
  logo: require('../../assets/brand/dekport-logo.png'),
  icon: require('../../assets/brand/app-icon.png'),
  adaptiveIcon: require('../../assets/brand/adaptive-icon.png'),
  favicon: require('../../assets/brand/favicon.png'),
} satisfies Record<string, ImageSourcePropType>;
