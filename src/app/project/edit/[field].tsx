import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { useAppStore } from '@/store/app-store';
import { projectFields, projectFieldLabels, projectStages } from '@/domain/project';
import { getMissionProgress } from '@/domain/progression';
import { ProjectField } from '@/domain/types';
import { View } from 'react-native';
import { GameIcon } from '@/components/ui/game-icon';
import { useAppLayout } from '@/hooks/use-app-layout';
import { colors, space } from '@/theme';

const prompts: Partial<Record<ProjectField, string>> = {
  name: 'Give your project a working name.',
  problem: 'Who faces this problem, when does it happen, and what makes it difficult?',
  observations: 'Describe what you actually saw. Keep interpretations separate.',
  painPoints: 'What was slow, confusing, costly, or frustrating?',
  targetUser: 'Describe one specific group of people you want to help.',
  interviews: 'Record what people said or did. Leave out private identifying details.',
  evidence: 'Add observations, quotes, or links that support or challenge your idea.',
  assumptions: 'What needs to be true for your idea to work?',
  validationResults: 'Record actual results separately from predictions.',
  validationDecision:
    'Will you continue, change direction, or stop? Explain what evidence led you there.',
  shippedUrl: 'Paste the link where someone can try your project.',
};
export function generateStaticParams() {
  return projectFields.map((field) => ({ field }));
}
export default function EditProject() {
  const { desktop } = useAppLayout();
  const { field } = useLocalSearchParams<{ field: string }>();
  const state = useAppStore();
  const key = field as ProjectField;
  const valid = projectFields.includes(key);
  const stage = projectStages.find((s) => s.fields.includes(key));
  const unlocked =
    key === 'name' ||
    !stage ||
    getMissionProgress(stage.missionId, state.completedLessonIds).unlocked;
  const [value, setValue] = useState(valid ? state.project[key] : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    state.updateProject({ [key]: value });
    await state.flushPersistence();
    setSaving(false);
    const failure = useAppStore.getState().storageError;
    if (failure) {
      setError(failure);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/notebook');
  };
  if (!valid || !unlocked)
    return (
      <Screen header={<PageHeader title="Project note" back />}>
        <View style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxl }}>
          <GameIcon name="lock" size={72} />
          <T variant="heading">{valid ? 'This note is locked' : 'Note not found'}</T>
          <T>
            {valid
              ? `Continue your path to Mission ${stage?.missionId}.`
              : 'Choose a note from My notes.'}
          </T>
          <Button title="My notes" onPress={() => router.replace('/notebook')} />
        </View>
      </Screen>
    );
  return (
    <Screen
      header={<PageHeader title="Edit note" back />}
      footerContentStyle={{ maxWidth: 600 }}
      footer={
        <Button
          title="Save"
          loading={saving}
          style={desktop ? { width: 180, alignSelf: 'flex-end' } : undefined}
          onPress={() => void save()}
        />
      }
    >
      {stage && key !== 'name' ? (
        <T variant="caption">{`MISSION ${stage.missionId} · ${stage.title.toUpperCase()}`}</T>
      ) : null}
      <Field
        label={projectFieldLabels[key]}
        value={value}
        onChangeText={setValue}
        multiline={key !== 'name'}
        maxLength={key === 'name' ? 80 : 12000}
        placeholder={key === 'name' ? 'Project name' : 'Write your note…'}
        help={
          prompts[key] || 'Be specific. Label plans, assumptions, and practice scenarios clearly.'
        }
        inputProps={{ editable: !saving }}
      />
      {error ? (
        <T accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {error}
        </T>
      ) : null}
    </Screen>
  );
}
