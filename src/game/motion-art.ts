import { originalAmiLoadingAssets } from './components/ami-original-art';

/** Original generated raster rig. Source, crops and hashes: art/source/game/rig/. */
export const characterRigArt = {
  head: require('../../assets/game/rig/head.webp') as number,
  shirt: require('../../assets/game/rig/shirt.webp') as number,
  arm: require('../../assets/game/rig/arm.webp') as number,
  leg: require('../../assets/game/rig/leg.webp') as number,
  hairCrop: require('../../assets/game/rig/hair-crop.webp') as number,
  hairBob: require('../../assets/game/rig/hair-bob.webp') as number,
  hairCurls: require('../../assets/game/rig/hair-curls.webp') as number,
  hairLong: require('../../assets/game/rig/hair-long.webp') as number,
  hairAmi: require('../../assets/game/rig/hair-ami.webp') as number,
  eyeWhites: require('../../assets/game/rig/eye-whites.webp') as number,
  pupils: require('../../assets/game/rig/pupils.webp') as number,
  blink: require('../../assets/game/rig/blink.webp') as number,
  smile: require('../../assets/game/rig/smile.webp') as number,
  mouthOpen: require('../../assets/game/rig/mouth-open.webp') as number,
  shoe: require('../../assets/game/rig/shoe.webp') as number,
  tie: require('../../assets/game/rig/tie.webp') as number,
  skirt: require('../../assets/game/rig/skirt.webp') as number,
};
export const characterLoadingAssets: readonly number[] = [
  ...Object.values(characterRigArt),
  ...originalAmiLoadingAssets,
];
