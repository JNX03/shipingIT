/** Draft asset registry. Paths are relative to this v4 folder; integration must preserve static requires. */
export const canonicalOriginalArt = {
  'hair-back-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/hair-back-left.webp') as number,
  'hair-back-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/hair-back-right.webp') as number,
  'hair-front':
    require('../../../assets/game/ami-original-v4/canonical-parts/hair-front.webp') as number,
  accessory:
    require('../../../assets/game/ami-original-v4/canonical-parts/accessory.webp') as number,
  face: require('../../../assets/game/ami-original-v4/canonical-parts/face.webp') as number,
  'eye-white-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/eye-white-left.webp') as number,
  'eye-white-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/eye-white-right.webp') as number,
  'pupil-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/pupil-left.webp') as number,
  'pupil-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/pupil-right.webp') as number,
  'brow-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/brow-left.webp') as number,
  'brow-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/brow-right.webp') as number,
  smile: require('../../../assets/game/ami-original-v4/canonical-parts/smile.webp') as number,
  neck: require('../../../assets/game/ami-original-v4/canonical-parts/neck.webp') as number,
  torso: require('../../../assets/game/ami-original-v4/canonical-parts/torso.webp') as number,
  skirt: require('../../../assets/game/ami-original-v4/canonical-parts/skirt.webp') as number,
  'upper-arm-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/upper-arm-left.webp') as number,
  'upper-arm-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/upper-arm-right.webp') as number,
  'forearm-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/forearm-left.webp') as number,
  'forearm-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/forearm-right.webp') as number,
  'hand-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/hand-left.webp') as number,
  'hand-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/hand-right.webp') as number,
  'thigh-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/thigh-left.webp') as number,
  'thigh-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/thigh-right.webp') as number,
  'shin-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/shin-left.webp') as number,
  'shin-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/shin-right.webp') as number,
  'shoe-left':
    require('../../../assets/game/ami-original-v4/canonical-parts/shoe-left.webp') as number,
  'shoe-right':
    require('../../../assets/game/ami-original-v4/canonical-parts/shoe-right.webp') as number,
};

export const auxiliaryOriginalArt = {
  'face-plate':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/face-plate.webp') as number,
  'rear-hair-fill':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/rear-hair-fill.webp') as number,
  'white-left':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/white-left.webp') as number,
  'white-right':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/white-right.webp') as number,
  'mouth-open':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/mouth-open.webp') as number,
  'blink-left':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/blink-left.webp') as number,
  'blink-right':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/blink-right.webp') as number,
  frown: require('../../../assets/game/ami-original-v4/auxiliary-parts/frown.webp') as number,
  'skin-cap-arm':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/skin-cap-arm.webp') as number,
  'skin-cap-leg':
    require('../../../assets/game/ami-original-v4/auxiliary-parts/skin-cap-leg.webp') as number,
};

export const completionOriginalArt = {
  'face-underlay':
    require('../../../assets/game/ami-original-v4/completion-parts/face-underlay.webp') as number,
  'eye-aperture-left':
    require('../../../assets/game/ami-original-v4/completion-parts/eye-aperture-left.webp') as number,
  'white-underlay-left':
    require('../../../assets/game/ami-original-v4/completion-parts/white-underlay-left.webp') as number,
  'eye-aperture-right':
    require('../../../assets/game/ami-original-v4/completion-parts/eye-aperture-right.webp') as number,
  'white-underlay-right':
    require('../../../assets/game/ami-original-v4/completion-parts/white-underlay-right.webp') as number,
  'rear-hair-underlay':
    require('../../../assets/game/ami-original-v4/completion-parts/rear-hair-underlay.webp') as number,
  'torso-underlay':
    require('../../../assets/game/ami-original-v4/completion-parts/torso-underlay.webp') as number,
  'back-head-fill':
    require('../../../assets/game/ami-original-v4/completion-parts/back-head-fill.webp') as number,
};

export const originalAmiLoadingAssets: readonly number[] = [
  ...Object.values(canonicalOriginalArt),
  ...Object.values(auxiliaryOriginalArt),
  ...Object.values(completionOriginalArt),
];
export type CanonicalOriginalPart = keyof typeof canonicalOriginalArt;
export type AuxiliaryOriginalPart = keyof typeof auxiliaryOriginalArt;
export type CompletionOriginalPart = keyof typeof completionOriginalArt;
