import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { AnswerOption } from '@/components/ui/answer-option';
import { GameIcon } from '@/components/ui/game-icon';
import { useAppStore } from '@/store/app-store';
import { useAppLayout } from '@/hooks/use-app-layout';
import { colors } from '@/theme';

export default function DailyGoal() {
  const { desktop } = useAppLayout();
  const currentGoal = useAppStore((state) => state.profile.dailyGoal);
  const [goal, setGoal] = useState(currentGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingLock = useRef(false);
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );
  const save = async () => {
    if (savingLock.current) return;
    savingLock.current = true;
    setSaving(true);
    setError('');
    try {
      useAppStore.getState().updateProfile({ dailyGoal: goal });
      await useAppStore.getState().flushPersistence();
      if (!focused.current) return;
      const failure = useAppStore.getState().storageError;
      if (failure) {
        setError(failure);
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/settings');
    } catch {
      if (focused.current) setError('Your goal could not be saved. Please try again.');
    } finally {
      savingLock.current = false;
      if (focused.current) setSaving(false);
    }
  };
  return (
    <Screen
      header={<PageHeader title="Daily goal" back />}
      footer={
        <>
          {error ? (
            <T accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
              {error}
            </T>
          ) : null}
          <Button
            title="Save goal"
            loading={saving}
            style={desktop ? { width: 180, alignSelf: 'flex-end' } : undefined}
            onPress={() => void save()}
          />
        </>
      }
      style={{ paddingTop: 32 }}
    >
      <View style={{ alignItems: 'center', gap: 20, paddingBottom: 12 }}>
        <GameIcon name="momentum" size={76} />
        <T variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          How many lessons a day?
        </T>
      </View>
      <View style={{ gap: 12 }}>
        {([1, 2, 3] as const).map((value) => (
          <AnswerOption
            key={value}
            label={`${value} lesson${value === 1 ? '' : 's'} a day`}
            description={`About ${value * 5} minutes`}
            selected={goal === value}
            disabled={saving}
            onPress={() => {
              setGoal(value);
              setError('');
            }}
          />
        ))}
      </View>
      <T variant="small" style={{ textAlign: 'center' }}>
        You can change your goal anytime.
      </T>
    </Screen>
  );
}
