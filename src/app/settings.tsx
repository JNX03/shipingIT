import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Host, Switch } from '@expo/ui';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Field } from '@/components/ui/field';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { SignOutRow } from '@/components/auth/sign-out-row';
import {
  ProfileGroup,
  ProfileNavigationRow,
  ProfileToolbar,
} from '@/game/components/profile-chrome';
import { useAppStore } from '@/store/app-store';
import { useAdventure } from '@/game/store';
import { resetLocalProgress } from '@/store/reset-progress';
import { useChallenges } from '@/game/challenge-store';
import { resetProfileQuests } from '@/game/profile-quests-runtime';
import { colors, fonts, radius, space, typography } from '@/theme';

const preferences = [
  { key: 'sound', label: 'Sound effects' },
  { key: 'haptics', label: 'Haptic feedback' },
  { key: 'reducedMotion', label: 'Reduce motion' },
] as const;

export default function Settings() {
  const state = useAppStore();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [reset, setReset] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const resetInFlight = useRef(false);
  const saveInFlight = useRef(false);
  const normalizedName = name.trim() || 'Explorer';
  const save = async () => {
    if (resetInFlight.current || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    try {
      state.updateProfile({ name: normalizedName });
      await state.flushPersistence();
      setName(normalizedName);
      const failure = useAppStore.getState().storageError;
      setSaveFailed(Boolean(failure));
      setMessage(failure ?? 'Name saved.');
      if (!failure) setEditingName(false);
    } catch {
      setSaveFailed(true);
      setMessage('Name could not be saved. Try again.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  const retrySave = async () => {
    if (resetInFlight.current || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setMessage('');
    try {
      await state.retryPersistence();
      const failure = useAppStore.getState().storageError;
      setSaveFailed(Boolean(failure));
      if (!failure) setMessage('Changes saved.');
    } catch {
      setSaveFailed(true);
      setMessage('Changes could not be saved. Try again.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  const resetDevice = async () => {
    if (resetInFlight.current || saveInFlight.current || confirm !== 'RESET') return;
    resetInFlight.current = true;
    setResetting(true);
    setResetError('');
    try {
      // Clear and persist each independent reward ledger before returning to
      // onboarding. Any failed write keeps the user here with a retry path.
      await useChallenges.getState().reset();
      const result = await resetLocalProgress(confirm, useAppStore, useAdventure);
      if (!result.success) {
        setResetError(result.message);
        return;
      }
      const quests = await resetProfileQuests();
      if (!quests.success) {
        setResetError(quests.message);
        return;
      }
      router.replace('/welcome');
    } catch {
      setResetError('The reset could not be fully saved. Stay here and retry Reset progress.');
    } finally {
      resetInFlight.current = false;
      setResetting(false);
    }
  };

  return (
    <Screen
      contentWidth={500}
      header={<ProfileToolbar title="Settings" back />}
      style={{ gap: space.xxl }}
    >
      {/* Web-only alignment for the existing Expo native Switch API. */}
      {Platform.OS === 'web' ? (
        <style>{`
      [data-testid^="setting-row-"] label { display:flex; width:100%; justify-content:space-between; min-height:${space.giant}px; }
      [data-testid^="setting-row-"] label > :nth-child(2) { flex:1; min-width:0; font-family:${fonts.semibold},sans-serif; font-size:${typography.body.fontSize}px; }
    `}</style>
      ) : null}
      <ProfileGroup title="Profile">
        <ProfileNavigationRow
          title="Display name"
          detail={state.profile.name || 'Explorer'}
          disabled={resetting || saving}
          onPress={() => {
            setName(state.profile.name);
            setEditingName(!editingName);
            setMessage('');
          }}
        />
        {editingName ? (
          <View style={styles.nameEditor}>
            <Field
              label="Your name"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setMessage('');
                setSaveFailed(false);
              }}
              multiline={false}
              maxLength={40}
              inputProps={{
                editable: !saving && !resetting,
                returnKeyType: 'done',
                onSubmitEditing: () => void save(),
              }}
            />
            <Button
              title="Save name"
              variant="secondary"
              disabled={
                resetting ||
                (normalizedName === state.profile.name && !state.storageError && !saveFailed)
              }
              loading={saving}
              onPress={() => void save()}
            />
            <Button
              title="Cancel"
              variant="quiet"
              disabled={saving || resetting}
              onPress={() => {
                setName(state.profile.name);
                setEditingName(false);
                setMessage('');
              }}
            />
          </View>
        ) : null}
        <ProfileNavigationRow
          title="Your avatar"
          detail="Character and backdrop"
          disabled={resetting || saving}
          onPress={() => router.push('/avatar')}
        />
      </ProfileGroup>
      {message && !state.storageError ? (
        <T
          variant="small"
          accessibilityLiveRegion="polite"
          style={{ color: state.storageError || saveFailed ? colors.danger : colors.textSecondary }}
        >
          {message}
        </T>
      ) : null}
      <ProfileGroup title="Learning">
        <ProfileNavigationRow
          title="Learning path"
          detail="Lessons, games, practice, and stories"
          disabled={resetting}
          onPress={() => router.push('/(tabs)')}
        />
        <ProfileNavigationRow
          title="Daily lesson goal"
          detail={`${state.profile.dailyGoal} lesson${state.profile.dailyGoal === 1 ? '' : 's'} a day`}
          disabled={resetting}
          onPress={() => router.push('/daily-goal')}
        />
      </ProfileGroup>
      <ProfileGroup title="Lesson experience">
        {preferences.map((preference) => (
          <View key={preference.key} style={styles.switchRow}>
            <Host
              matchContents={{ vertical: true }}
              seedColor={colors.primary}
              colorScheme="light"
              style={{ width: '100%' }}
              testID={`setting-row-${preference.key}`}
            >
              <Switch
                label={preference.label}
                value={state.settings[preference.key]}
                disabled={resetting || saving}
                onValueChange={(value) => {
                  if (!resetInFlight.current && !saveInFlight.current) {
                    state.updateSettings({ [preference.key]: value });
                  }
                }}
                testID={`setting-switch-${preference.key}`}
              />
            </Host>
          </View>
        ))}
      </ProfileGroup>
      {state.storageError ? (
        <View style={styles.saveError}>
          <T
            selectable
            variant="small"
            accessibilityLiveRegion="assertive"
            style={{ color: colors.danger }}
          >
            {state.storageError}
          </T>
          <Button
            title="Retry saving"
            variant="secondary"
            loading={saving}
            disabled={resetting}
            onPress={() => void retrySave()}
          />
        </View>
      ) : null}
      <ProfileGroup title="Account">
        <ProfileNavigationRow
          title="Sign-in & account"
          detail="Sign-in and account details"
          disabled={resetting}
          onPress={() => router.push('/account')}
        />
        <ProfileNavigationRow
          title="ShipingIT Pro"
          detail="Full notebook Markdown export and complete Project Pack copy"
          disabled={resetting}
          onPress={() => router.push('/paywall')}
        />
        <SignOutRow disabled={resetting || saving} />
      </ProfileGroup>
      <ProfileGroup title="Privacy">
        <ProfileNavigationRow
          title="Privacy and data"
          disabled={resetting}
          onPress={() => router.push('/privacy')}
        />
      </ProfileGroup>
      <ProfileGroup title="Your data">
        <ProfileNavigationRow
          title="Export game blueprint"
          detail="Open My app to export your build"
          disabled={resetting}
          onPress={() => router.push('/(tabs)/project')}
        />
        <ProfileNavigationRow
          title="Export project notebook"
          detail="Your notes and project plan"
          disabled={resetting}
          onPress={() => router.push('/project/pack')}
        />
        <ProfileNavigationRow
          title="Reset progress"
          destructive
          disabled={resetting || saving}
          onPress={() => {
            setReset(true);
            setResetError('');
          }}
        />
      </ProfileGroup>
      {reset ? (
        <View style={styles.reset} accessibilityLiveRegion="polite">
          <T variant="subheading">Reset this device?</T>
          <T variant="small">
            This removes your local game, lessons, Sparks, achievements, and project notes. Export
            your game blueprint and project notebook first. Your account and subscription stay
            unchanged.
          </T>
          <Field
            label="Type RESET to confirm"
            value={confirm}
            onChangeText={setConfirm}
            multiline={false}
            maxLength={5}
            inputProps={{ editable: !resetting, autoCapitalize: 'characters', autoCorrect: false }}
          />
          <Button
            title="Reset progress"
            variant="danger"
            disabled={confirm !== 'RESET' || saving}
            loading={resetting}
            onPress={() => void resetDevice()}
          />
          {resetError ? (
            <T variant="small" accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>
              {resetError}
            </T>
          ) : null}
          <Button
            title="Cancel"
            variant="secondary"
            disabled={resetting}
            onPress={() => {
              setReset(false);
              setConfirm('');
              setResetError('');
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nameEditor: { padding: space.lg, gap: space.md },
  saveError: { gap: space.md },
  switchRow: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  reset: {
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    gap: space.md,
  },
});
