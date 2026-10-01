import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { ProfileAvatar } from '@/game/components/profile-avatar';
import { ProfileToolbar } from '@/game/components/profile-chrome';
import { GameLoading } from '@/game/components/loading';
import {
  avatarHairStyles,
  avatarHairColors,
  avatarSkinTones,
  avatarEyeColors,
  avatarOutfitColors,
  profileBackdrops,
  type ProfileAvatarSelection,
} from '@/game/profile-avatar';
import { useSavedProfileAvatar } from '@/game/profile-avatar-store';
import { colors, radius, space } from '@/theme';

const tabs = ['Skin', 'Hair', 'Eyes', 'Outfit', 'Backdrop'] as const;
type Tab = (typeof tabs)[number];

export default function Avatar() {
  const saved = useSavedProfileAvatar();
  if (!saved.hydrated) {
    return (
      <Screen header={<ProfileToolbar title="Your avatar" back />}>
        {saved.error ? (
          <View style={styles.loading}>
            <T selectable accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
              {saved.error}
            </T>
            <Button
              title="Retry loading"
              loading={saved.loading}
              onPress={() => void saved.hydrate()}
            />
          </View>
        ) : (
          <GameLoading compact message="Opening your wardrobe…" />
        )}
      </Screen>
    );
  }
  return <AvatarEditor initial={saved.selection} />;
}

function AvatarEditor({ initial }: { initial: ProfileAvatarSelection }) {
  const saved = useSavedProfileAvatar();
  const [draft, setDraft] = useState(initial);
  const [tab, setTab] = useState<Tab>('Skin');
  const [previewMotion, setPreviewMotion] = useState<'idle' | 'walk' | 'talk'>('idle');
  const [message, setMessage] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const active = useRef(true);
  const saveInFlight = useRef(false);
  const backdrop = profileBackdrops.find(({ id }) => id === draft.backdrop) ?? profileBackdrops[0];
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const choose = <K extends keyof ProfileAvatarSelection>(
    field: K,
    value: ProfileAvatarSelection[K],
  ) => {
    if (saveInFlight.current || saved.saving) return;
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage('');
    setSaveFailed(false);
  };
  const save = async () => {
    if (saveInFlight.current || saved.saving) return;
    saveInFlight.current = true;
    setMessage('');
    setSaveFailed(false);
    try {
      if ((await saved.save(draft)) && active.current) {
        if (router.canGoBack()) router.back();
        else setMessage('Avatar saved.');
      }
    } catch {
      if (active.current) {
        setSaveFailed(true);
        setMessage('Avatar was not saved. Your choices are still here. Try again.');
      }
    } finally {
      saveInFlight.current = false;
    }
  };
  return (
    <Screen
      contentWidth={500}
      header={<ProfileToolbar title="Your avatar" back />}
      style={{ gap: space.xl, paddingTop: 0 }}
      footerContentStyle={{ maxWidth: 460 }}
      footer={
        <>
          {saved.error || message ? (
            <T
              selectable
              variant="small"
              accessibilityLiveRegion="polite"
              style={{
                color: saved.error || saveFailed ? colors.danger : colors.textSecondary,
                textAlign: 'center',
              }}
            >
              {saved.error || message}
            </T>
          ) : null}
          <Button
            title="Save avatar"
            testID="avatar-save"
            loading={saved.saving}
            onPress={() => void save()}
          />
        </>
      }
    >
      <View style={styles.preview}>
        <View style={styles.previewStage}>
          <View
            accessible={false}
            style={[styles.previewBackdrop, { backgroundColor: backdrop.color }]}
          />
          <ProfileAvatar
            avatar={draft}
            size={240}
            motion={previewMotion}
            style={styles.previewAvatar}
          />
        </View>
        <View style={styles.previewActions}>
          {(['idle', 'walk', 'talk'] as const).map((motion) => (
            <Pressable
              key={motion}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${motion}`}
              accessibilityState={{ selected: previewMotion === motion, disabled: saved.saving }}
              aria-pressed={Platform.OS === 'web' ? previewMotion === motion : undefined}
              testID={`avatar-preview-${motion}`}
              disabled={saved.saving}
              onPress={() => {
                if (!saveInFlight.current) setPreviewMotion(motion);
              }}
              style={({ pressed }) => [
                styles.previewAction,
                previewMotion === motion && styles.activePreview,
                pressed && styles.pressed,
                saved.saving && styles.disabled,
              ]}
            >
              <T
                variant="caption"
                style={previewMotion === motion ? styles.selectedText : undefined}
              >
                {motion === 'idle' ? 'Relax' : motion === 'walk' ? 'Walk' : 'Talk'}
              </T>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={value}
            accessibilityState={{ selected: tab === value, disabled: saved.saving }}
            aria-selected={tab === value}
            disabled={saved.saving}
            testID={`avatar-tab-${value.toLowerCase()}`}
            onPress={() => {
              if (!saveInFlight.current) setTab(value);
            }}
            style={({ pressed }) => [
              styles.tab,
              tab === value && styles.activeTab,
              pressed && styles.pressed,
              saved.saving && styles.disabled,
            ]}
          >
            <View accessible={false} importantForAccessibility="no-hide-descendants">
              <CategoryIcon category={value} selected={tab === value} />
            </View>
            <T
              variant="caption"
              style={{
                maxWidth: '100%',
                textAlign: 'center',
                color: tab === value ? colors.primaryPressed : colors.textSecondary,
              }}
            >
              {value}
            </T>
          </Pressable>
        ))}
      </View>
      <T variant="subheading" accessibilityRole="header">
        {tab === 'Hair'
          ? 'Hairstyle'
          : tab === 'Backdrop'
            ? 'Backdrop'
            : tab === 'Skin'
              ? 'Skin tone'
              : `${tab === 'Eyes' ? 'Eye' : 'Outfit'} color`}
      </T>
      {/* Native Picker is text-only; these visual radio choices show the actual shape or color. */}
      {tab === 'Hair' ? (
        <>
          <View
            style={styles.choices}
            accessibilityRole="radiogroup"
            accessibilityLabel="Hairstyle"
          >
            {avatarHairStyles.map((hair) => (
              <Pressable
                key={hair.id}
                disabled={saved.saving}
                testID={`avatar-hair-style-${hair.id}`}
                accessibilityRole="radio"
                accessibilityLabel={hair.name}
                accessibilityState={{
                  checked: draft.hairStyle === hair.id,
                  disabled: saved.saving,
                }}
                aria-checked={draft.hairStyle === hair.id}
                onPress={() => choose('hairStyle', hair.id)}
                style={({ pressed }) => [
                  styles.hairChoice,
                  draft.hairStyle === hair.id && styles.selected,
                  pressed && styles.pressed,
                  saved.saving && styles.disabled,
                ]}
              >
                <View
                  style={styles.hairPreview}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  <ProfileAvatar
                    avatar={{ ...draft, hairStyle: hair.id }}
                    motion="still"
                    size={124}
                    style={styles.hairAvatar}
                  />
                </View>
                <T
                  variant="caption"
                  style={[
                    { maxWidth: '100%', textAlign: 'center' },
                    draft.hairStyle === hair.id && styles.selectedText,
                  ]}
                >
                  {hair.name}
                </T>
                {draft.hairStyle === hair.id ? <SelectionMark /> : null}
              </Pressable>
            ))}
          </View>
          <T variant="subheading" accessibilityRole="header">
            Hair color
          </T>
          <ColorChoices
            options={avatarHairColors}
            selected={draft.hairColor}
            disabled={saved.saving}
            field="hair-color"
            onSelect={(id) => choose('hairColor', id)}
          />
        </>
      ) : tab === 'Skin' ? (
        <ColorChoices
          options={avatarSkinTones}
          selected={draft.skinTone}
          disabled={saved.saving}
          field="skin-tone"
          onSelect={(id) => choose('skinTone', id)}
        />
      ) : tab === 'Eyes' ? (
        <ColorChoices
          options={avatarEyeColors}
          selected={draft.eyeColor}
          disabled={saved.saving}
          field="eye-color"
          onSelect={(id) => choose('eyeColor', id)}
        />
      ) : tab === 'Outfit' ? (
        <ColorChoices
          options={avatarOutfitColors}
          selected={draft.outfitColor}
          disabled={saved.saving}
          field="outfit-color"
          onSelect={(id) => choose('outfitColor', id)}
        />
      ) : (
        <ColorChoices
          options={profileBackdrops}
          selected={draft.backdrop}
          disabled={saved.saving}
          field="backdrop"
          onSelect={(id) => choose('backdrop', id)}
        />
      )}
    </Screen>
  );
}

function ColorChoices<T extends string>({
  options,
  selected,
  disabled,
  field,
  onSelect,
}: {
  options: readonly { id: T; name: string; color: string }[];
  selected: T;
  disabled: boolean;
  field: string;
  onSelect: (id: T) => void;
}) {
  return (
    <View
      style={styles.choices}
      accessibilityRole="radiogroup"
      accessibilityLabel={field.replaceAll('-', ' ')}
    >
      {options.map((option) => (
        <Pressable
          key={option.id}
          testID={`avatar-${field}-${option.id}`}
          accessibilityRole="radio"
          accessibilityLabel={option.name}
          accessibilityState={{ checked: selected === option.id, disabled }}
          aria-checked={selected === option.id}
          disabled={disabled}
          onPress={() => onSelect(option.id)}
          style={({ pressed }) => [
            styles.colorChoice,
            selected === option.id && styles.selected,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <View style={[styles.swatch, { backgroundColor: option.color }]} />
          <T
            variant="caption"
            style={[
              { maxWidth: '100%', textAlign: 'center' },
              selected === option.id && styles.selectedText,
            ]}
          >
            {option.name}
          </T>
          {selected === option.id ? <SelectionMark /> : null}
        </Pressable>
      ))}
    </View>
  );
}
function SelectionMark() {
  return (
    <View
      style={styles.selectionMark}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name="check" size={14} color={colors.surface} />
    </View>
  );
}
function CategoryIcon({ category, selected }: { category: Tab; selected: boolean }) {
  const color = selected ? colors.primaryPressed : colors.muted;
  return (
    <Svg width={28} height={28} viewBox="0 0 32 32">
      <G fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {category === 'Skin' ? (
          <>
            <Rect x={7} y={4} width={18} height={24} rx={7} />
            <Path d="M7 13H5q-3 0-3 4t5 4M25 13h2q3 0 3 4t-5 4" />
          </>
        ) : category === 'Hair' ? (
          <Path d="M6 21V12q0-10 10-10t10 10v9M7 12q6 1 9-6 4 7 9 6M9 15v7q0 7 7 7t7-7v-7" />
        ) : category === 'Eyes' ? (
          <>
            <Path d="M2 16q6-10 14 0-8 10-14 0ZM16 16q8-10 14 0-6 10-14 0Z" />
            <Circle cx={9} cy={16} r={2} fill={color} />
            <Circle cx={23} cy={16} r={2} fill={color} />
          </>
        ) : category === 'Outfit' ? (
          <Path d="m10 4-8 5 4 8 4-2v13h12V15l4 2 4-8-8-5q-1 5-6 5t-6-5Z" />
        ) : (
          <>
            <Rect x={3} y={4} width={26} height={24} rx={4} />
            <Circle cx={11} cy={11} r={2} />
            <Path d="m5 24 7-8 5 5 5-7 5 10" />
          </>
        )}
      </G>
    </Svg>
  );
}
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.lg },
  preview: { alignItems: 'center', gap: space.md },
  previewStage: { minHeight: 260, width: '100%', alignItems: 'center', justifyContent: 'center' },
  previewBackdrop: { position: 'absolute', width: 204, height: 204, borderRadius: radius.pill },
  previewAvatar: { backgroundColor: colors.transparent, overflow: 'visible' },
  previewActions: { flexDirection: 'row', gap: space.sm },
  previewAction: {
    minHeight: 48,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
  },
  activePreview: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  tabs: { flexDirection: 'row', borderBottomWidth: 2, borderColor: colors.border },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    borderBottomWidth: 3,
    borderColor: colors.transparent,
  },
  activeTab: { borderColor: colors.primary },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' },
  hairChoice: {
    flexBasis: '29%',
    flexGrow: 1,
    minWidth: 84,
    alignItems: 'center',
    padding: space.sm,
    paddingBottom: space.md,
    gap: space.xs,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  hairPreview: { width: 76, height: 72, overflow: 'hidden', alignItems: 'center' },
  hairAvatar: { backgroundColor: colors.transparent, borderRadius: 0 },
  colorChoice: {
    flexBasis: '29%',
    flexGrow: 1,
    minWidth: 76,
    alignItems: 'center',
    padding: space.md,
    gap: space.sm,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  selectedText: { color: colors.primaryDeep },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionMark: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryPressed,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
