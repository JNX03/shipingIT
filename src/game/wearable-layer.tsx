import { memo } from 'react';
import { SvgXml } from 'react-native-svg';
import type { AvatarFacing } from './avatar-motion';
import {
  findWardrobeItem,
  wardrobeLayersForAnchor,
  type WardrobeAnchor,
  type WardrobeItemId,
} from './wardrobe-catalog';

export interface WearableLayerProps {
  itemId?: WardrobeItemId | null;
  anchor: WardrobeAnchor;
  facing?: AvatarFacing;
}

/**
 * Mount INSIDE the matching existing animated player-rig group, after its skin
 * art. Never mount this component over the whole avatar: sleeves and trousers
 * must inherit their own shoulder/elbow/hip/knee movement. Facing-left mirroring
 * stays on the existing rig canvas. AmiOriginal and NPCs do not use these pieces.
 */
export const WearableLayer = memo(function WearableLayer({
  itemId,
  anchor,
  facing = 'front',
}: WearableLayerProps) {
  return (
    <>
      {wardrobeLayersForAnchor(itemId, anchor).map((layer) => (
        <SvgXml
          key={`${itemId}-${layer.anchor}`}
          xml={facing === 'back' ? layer.backSvg : layer.frontSvg}
          width={layer.bounds.width}
          height={layer.bounds.height}
          pointerEvents="none"
          style={{ position: 'absolute', left: layer.bounds.left, top: layer.bounds.top }}
        />
      ))}
    </>
  );
});

/** Native, offline shop thumbnail; a garment preview never replaces the rig. */
export const WearablePreview = memo(function WearablePreview({
  itemId,
  size = 96,
}: {
  itemId: WardrobeItemId;
  size?: number;
}) {
  const item = findWardrobeItem(itemId);
  if (!item) return null;
  return <SvgXml xml={item.previewSvg} width={size} height={size} pointerEvents="none" />;
});
