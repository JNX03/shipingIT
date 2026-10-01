import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '@/store/app-store';
import {
  makeProjectPack,
  projectFields,
  projectFieldLabels,
  getProjectProgress,
} from '@/domain/project';
import { exportProject } from '@/utils/export-project';
import { useSubscription } from '@/hooks/use-subscription';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/ui/game-icon';
import { useAppLayout } from '@/hooks/use-app-layout';
import { colors, space } from '@/theme';

export default function Pack() {
  const { desktop } = useAppLayout();
  const project = useAppStore((s) => s.project);
  const name = useAppStore((s) => s.profile.name);
  const membership = useSubscription();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const lock = useRef(false);
  const pack = makeProjectPack(project, name);
  const progress = getProjectProgress(project);
  const summary = [
    project.name || 'My innovation project',
    '',
    `Problem: ${project.problem || 'Not recorded yet.'}`,
    `For: ${project.targetUser || 'Not recorded yet.'}`,
    `First version: ${project.mvp || 'Not recorded yet.'}`,
    `Next step: ${project.nextSteps || 'Not recorded yet.'}`,
    '',
    'A learner-authored working idea. Research and results are not independently verified.',
  ].join('\n');
  const perform = async (action: 'export' | 'full-copy' | 'summary') => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (action !== 'summary') {
        const fresh = await membership.refresh();
        if (!fresh.access.allowed) {
          setMessage(fresh.access.message);
          return;
        }
      }
      if (action === 'export') {
        await exportProject(pack);
        setMessage('Your project is ready to share.');
      } else {
        const copied = await Clipboard.setStringAsync(action === 'summary' ? summary : pack);
        if (!copied) throw new Error('Clipboard write was declined');
        setMessage(
          action === 'summary'
            ? 'Your project summary is copied.'
            : 'All your project notes are copied.',
        );
      }
    } catch {
      setMessage('Could not open sharing or the clipboard. Your notes are still here.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen
      header={<PageHeader title="Share project" back />}
      footerContentStyle={{ maxWidth: 600 }}
      footer={
        <>
          {message ? (
            <T accessibilityLiveRegion="polite" selectable style={{ color: colors.primaryPressed }}>
              {message.replaceAll('Project Pack', 'project')}
            </T>
          ) : null}
          <Button
            title={membership.access.allowed ? 'Share project' : 'Copy summary'}
            loading={busy}
            disabled={busy}
            style={desktop ? { width: 220, alignSelf: 'flex-end' } : undefined}
            onPress={() => {
              void perform(membership.access.allowed ? 'export' : 'summary');
            }}
          />
        </>
      }
    >
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        <GameIcon name="project" size={52} />
        <View style={{ flex: 1, gap: space.xs }}>
          <T variant="heading">{project.name || 'Untitled project'}</T>
          <T variant="small">
            {progress.completedFields} notes written{name ? ` · ${name}` : ''}
          </T>
        </View>
      </View>
      <View
        style={{
          gap: space.md,
          paddingVertical: space.lg,
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderColor: colors.border,
        }}
      >
        <T variant="small">Copy a summary free. Share all notes with Pro.</T>
        {membership.access.allowed ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <Button
              title="Copy all notes"
              variant="secondary"
              compact
              disabled={busy}
              onPress={() => void perform('full-copy')}
            />
            <Button
              title="Copy summary"
              variant="quiet"
              compact
              disabled={busy}
              onPress={() => void perform('summary')}
            />
          </View>
        ) : (
          <Button
            title={
              membership.access.reason === 'signin' ? 'Sign in to Pro' : 'Explore ShipingIT Pro'
            }
            variant="secondary"
            disabled={busy}
            onPress={() =>
              router.push(membership.access.reason === 'signin' ? '/account' : '/paywall')
            }
          />
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <T variant="heading" style={{ flex: 1 }}>
          My notes
        </T>
        <Button
          title={showEmpty ? 'Hide empty' : 'Show empty'}
          variant="quiet"
          compact
          selected={showEmpty}
          onPress={() => setShowEmpty(!showEmpty)}
        />
      </View>
      {!showEmpty && !projectFields.some((key) => key !== 'name' && project[key].trim()) ? (
        <T variant="small">Add notes in My notes or during a lesson.</T>
      ) : null}
      {projectFields
        .filter((key) => key !== 'name' && (showEmpty || project[key].trim()))
        .map((key) => (
          <View
            key={key}
            style={{
              gap: space.sm,
              paddingBottom: space.lg,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <T variant="subheading">{projectFieldLabels[key]}</T>
            <T selectable style={{ color: project[key] ? colors.text : colors.muted }}>
              {project[key] || 'Not recorded yet.'}
            </T>
          </View>
        ))}
      <T variant="caption">Keep plans and tested results separate.</T>
    </Screen>
  );
}
