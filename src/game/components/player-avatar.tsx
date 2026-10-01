import { CharacterRig, type CharacterRigProps, type CharacterWearableProps } from './actor';
import { useSavedSparkWallet } from '@/store/spark-wallet-store';
import { isWardrobeItemId } from '../wardrobe-catalog';
import { WearableLayer } from '../wearable-layer';
import { defaultProfileAvatar } from '../profile-avatar';

/** The same saved appearance renders in Profile, the editor, and the walkable campus. */
export function PlayerAvatar({
  avatar = defaultProfileAvatar,
  ...props
}: Omit<CharacterRigProps, 'avatar'> & { avatar?: CharacterRigProps['avatar'] }) {
  const view = useSavedSparkWallet();
  return (
    <CharacterRig
      avatar={avatar}
      outfitItemId={view.wallet.equippedOutfitId}
      headwearItemId={view.wallet.equippedHeadwearId}
      renderWearable={renderSavedWearable}
      {...props}
    />
  );
}

function renderSavedWearable({ itemId, anchor, facing }: CharacterWearableProps) {
  return isWardrobeItemId(itemId) ? (
    <WearableLayer itemId={itemId} anchor={anchor} facing={facing} />
  ) : null;
}
