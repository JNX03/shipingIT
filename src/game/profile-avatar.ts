import { create } from 'zustand';

export const profileCharacters = [
  { id: 'ami', name: 'Ami', art: 'amiIdle' },
  { id: 'mali', name: 'Mali', art: 'mali' },
  { id: 'noa', name: 'Noa', art: 'noa' },
  { id: 'ken', name: 'Ken', art: 'ken' },
] as const;

export const profileBackdrops = [
  { id: 'sky', name: 'Sky', color: '#DDEEFF' },
  { id: 'mint', name: 'Mint', color: '#D5F4E5' },
  { id: 'peach', name: 'Peach', color: '#FFE1CE' },
  { id: 'lilac', name: 'Lilac', color: '#EADFFF' },
  { id: 'sunshine', name: 'Sunshine', color: '#FFF0B8' },
  { id: 'rose', name: 'Rose', color: '#FFDDE8' },
] as const;

export const avatarSkinTones = [
  { id: 'porcelain', name: 'Porcelain', color: '#FFE2CB' },
  { id: 'peach', name: 'Peach', color: '#F8C6A5' },
  { id: 'warm', name: 'Warm', color: '#E7AD7C' },
  { id: 'tan', name: 'Tan', color: '#C88D61' },
  { id: 'brown', name: 'Brown', color: '#A66B46' },
  { id: 'deep', name: 'Deep', color: '#75482F' },
] as const;
export const avatarHairStyles = [
  { id: 'ami', name: 'Cat ears' },
  { id: 'crop', name: 'Side sweep' },
  { id: 'bob', name: 'Bob' },
  { id: 'curls', name: 'Curls' },
  { id: 'long', name: 'Long' },
] as const;
export const avatarHairColors = [
  { id: 'charcoal', name: 'Charcoal', color: '#282932' },
  { id: 'brown', name: 'Brown', color: '#584032' },
  { id: 'chestnut', name: 'Chestnut', color: '#A75532' },
  { id: 'gold', name: 'Golden', color: '#D6A943' },
  { id: 'blue', name: 'Blue', color: '#4264B3' },
  { id: 'plum', name: 'Plum', color: '#755078' },
] as const;
export const avatarEyeColors = [
  { id: 'charcoal', name: 'Charcoal', color: '#282932' },
  { id: 'brown', name: 'Brown', color: '#745337' },
  { id: 'blue', name: 'Blue', color: '#3174B8' },
  { id: 'green', name: 'Green', color: '#377B62' },
  { id: 'violet', name: 'Violet', color: '#7955AD' },
] as const;
export const avatarOutfitColors = [
  { id: 'school', name: 'White', color: '#FAFBFF' },
  { id: 'teal', name: 'Teal', color: '#4AABA3' },
  { id: 'coral', name: 'Coral', color: '#E88771' },
  { id: 'lavender', name: 'Lavender', color: '#B5A0DA' },
  { id: 'sunshine', name: 'Sunshine', color: '#F0C866' },
  { id: 'navy', name: 'Navy', color: '#455778' },
] as const;
export type AvatarAppearance = {
  skinTone: (typeof avatarSkinTones)[number]['id'];
  hairStyle: (typeof avatarHairStyles)[number]['id'];
  hairColor: (typeof avatarHairColors)[number]['id'];
  eyeColor: (typeof avatarEyeColors)[number]['id'];
  outfitColor: (typeof avatarOutfitColors)[number]['id'];
};
export type ProfileAvatarSelection = AvatarAppearance & {
  character: (typeof profileCharacters)[number]['id'];
  backdrop: (typeof profileBackdrops)[number]['id'];
};

const characterAppearance: Record<ProfileAvatarSelection['character'], AvatarAppearance> = {
  ami: { skinTone: 'peach', hairStyle: 'ami', hairColor: 'charcoal', eyeColor: 'charcoal', outfitColor: 'school' },
  mali: { skinTone: 'warm', hairStyle: 'bob', hairColor: 'brown', eyeColor: 'brown', outfitColor: 'school' },
  noa: { skinTone: 'tan', hairStyle: 'crop', hairColor: 'brown', eyeColor: 'charcoal', outfitColor: 'teal' },
  ken: { skinTone: 'warm', hairStyle: 'crop', hairColor: 'charcoal', eyeColor: 'charcoal', outfitColor: 'coral' },
};
export function avatarForCharacter(character: ProfileAvatarSelection['character'], backdrop: ProfileAvatarSelection['backdrop'] = 'sky'): ProfileAvatarSelection {
  return { character, backdrop, ...characterAppearance[character] };
}
export const defaultProfileAvatar = avatarForCharacter('ami');
// Keep the installed app's key so an upgrade can read its v1 character choice.
export const PROFILE_AVATAR_STORAGE_KEY = 'shipingit:profile-avatar:v1';

function validLegacySelection(value: unknown): value is Pick<ProfileAvatarSelection, 'character' | 'backdrop'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    profileCharacters.some(({ id }) => id === candidate.character) &&
    profileBackdrops.some(({ id }) => id === candidate.backdrop)
  );
}
function validSelection(value: unknown): value is ProfileAvatarSelection {
  if (!validLegacySelection(value)) return false;
  const candidate = value as Record<string, unknown>;
  return avatarSkinTones.some(({ id }) => id === candidate.skinTone)
    && avatarHairStyles.some(({ id }) => id === candidate.hairStyle)
    && avatarHairColors.some(({ id }) => id === candidate.hairColor)
    && avatarEyeColors.some(({ id }) => id === candidate.eyeColor)
    && avatarOutfitColors.some(({ id }) => id === candidate.outfitColor);
}
function copySelection(selection: ProfileAvatarSelection): ProfileAvatarSelection {
  return {
    character: selection.character, backdrop: selection.backdrop,
    skinTone: selection.skinTone, hairStyle: selection.hairStyle, hairColor: selection.hairColor,
    eyeColor: selection.eyeColor, outfitColor: selection.outfitColor,
  };
}

export function parseProfileAvatar(raw: string | null): ProfileAvatarSelection {
  if (raw === null) return { ...defaultProfileAvatar };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || (value.version !== 1 && value.version !== 2)) {
    throw new Error('Unsupported avatar data');
  }
  if (!('selection' in value)) {
    throw new Error('Invalid avatar choices');
  }
  if (value.version === 1) {
    if (!validLegacySelection(value.selection)) throw new Error('Invalid avatar choices');
    return avatarForCharacter(value.selection.character, value.selection.backdrop);
  }
  if (!validSelection(value.selection)) throw new Error('Invalid avatar choices');
  return copySelection(value.selection);
}

export interface ProfileAvatarStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface ProfileAvatarStore {
  selection: ProfileAvatarSelection;
  hydrated: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  save: (selection: ProfileAvatarSelection) => Promise<boolean>;
}

/** Cosmetics never write to the adventure or learning stores. */
export function createProfileAvatarStore(storage: ProfileAvatarStorage) {
  let hydration: Promise<void> | null = null;
  return create<ProfileAvatarStore>()((set, get) => ({
    selection: { ...defaultProfileAvatar },
    hydrated: false,
    loading: false,
    saving: false,
    error: null,
    hydrate: () => {
      if (get().hydrated) return Promise.resolve();
      if (hydration) return hydration;
      set({ loading: true, error: null });
      hydration = Promise.resolve().then(async () => {
        try {
          const selection = parseProfileAvatar(await storage.getItem(PROFILE_AVATAR_STORAGE_KEY));
          set({ selection, hydrated: true, error: null });
        } catch {
          set({
            error:
              'Your saved avatar could not be loaded. Retry to keep your existing choice safe.',
          });
        } finally {
          set({ loading: false });
          hydration = null;
        }
      });
      return hydration;
    },
    save: async (selection) => {
      if (!get().hydrated || get().saving) return false;
      if (!validSelection(selection)) {
        set({ error: 'Choose one of the available avatar options.' });
        return false;
      }
      const next = copySelection(selection);
      set({ saving: true, error: null });
      try {
        await storage.setItem(
          PROFILE_AVATAR_STORAGE_KEY,
          JSON.stringify({ version: 2, selection: next }),
        );
        // Commit only after storage confirms the write. The editor retains its draft on failure.
        set({ selection: next, error: null });
        return true;
      } catch {
        set({ error: 'Avatar was not saved. Your choices are still here. Try Save avatar again.' });
        return false;
      } finally {
        set({ saving: false });
      }
    },
  }));
}
