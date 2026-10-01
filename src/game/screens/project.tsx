import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { exportProject } from '@/utils/export-project';
import { colors, radius, space } from '@/theme';
import { useAdventure } from '../store';
import { gameStages } from '../catalog';
import { gameStageArt } from '../art';
import { GameActor } from '../components/actor';
import { evidenceById, insightSentence, npcById, researchFeatures } from '../logic/research';
import { buildPrototypeArtifact, checkScreenDesign } from '../logic/build';
import { PrototypePreview } from '../stages/design';
import { projectLibrary, useProjectLibrary } from '../project-library';
import { projectDefinitions } from '../project-library-model';
import { ProjectLibraryNotice } from '../components/project-library-notice';
import { ProjectTemplateHost } from '../templates/project-template-host';
import { GameLoading } from '../components/loading';

type AppMode = 'build' | 'try' | 'notes';
export function AdventureProject() {
  const library = useProjectLibrary();
  const game = useAdventure();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AppMode>('build');
  if (!library.hydrated) return <GameLoading message="Loading your apps…" />;
  const selected = library.readBlocked ? 'lunch' : library.data.selected;
  const definition = projectDefinitions.find((item) => item.id === selected)!;
  const next = gameStages[Math.min(game.completed.length, 5)];
  const title = selected === 'lunch' ? game.draft.projectName : selected === 'study' ? library.data.drafts.study?.appName || definition.title : definition.title;
  const goal = mode === 'notes' ? 'Keep the observations that support your idea.' : selected === 'lunch' ? mode === 'build' ? next.subtitle : 'Refresh the queues, then try a staff update.' : selected === 'map' ? 'Help someone reach the lab without stairs.' : 'Help a learner find the next step with a hint.';
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        <PageHeader title={title} action={<Button title="Switch app" compact variant="quiet" onPress={async () => { await projectLibrary.flush(); router.push('/projects'); }} />} />
        <View style={styles.tabs}>
          {(['build', 'try', 'notes'] as const).map((item) => (
            <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)} style={[styles.tab, mode === item && styles.tabActive]}>
              <T variant="caption" style={{ color: mode === item ? colors.primaryPressed : colors.textSecondary }}>{item === 'build' ? 'Build' : item === 'try' ? 'Try' : 'Notes'}</T>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><GameActor character="ami" size={44} active={false} /><T variant="small" style={{ flex: 1 }}>{goal}</T></View>
      </View>
      <ProjectLibraryNotice />
      {selected === 'lunch' ? <LunchLensProject mode={mode} /> : mode === 'notes' ? (
        <View style={{ flex: 1, padding: 24, gap: 12 }}><T variant="heading">Your learning notebook</T><T variant="small">Your saved observations stay with you across your apps.</T></View>
      ) : <ProjectTemplateHost key={selected} mode={mode} onModeChange={setMode} />}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Button title={mode === 'notes' ? 'Open notebook' : mode === 'try' ? 'Edit app' : selected === 'lunch' ? `Continue: ${next.verb}` : 'Try app'} onPress={() => {
          if (mode === 'notes') router.push('/notebook');
          else if (mode === 'try') setMode('build');
          else if (selected === 'lunch') { if (!game.started) game.begin(); router.push({ pathname: '/adventure/[id]', params: { id: next.id } }); }
          else setMode('try');
        }} />
      </View>
    </View>
  );
}

function LunchLensProject({ mode }: { mode: AppMode }) {
  const game = useAdventure();
  const { draft } = game;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(draft.projectName);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const ready = checkScreenDesign(draft).valid;
  const next = gameStages[Math.min(game.completed.length, 5)];
  const insight = draft.insight.statement.trim() || (Object.keys(draft.insight.slots).length ? insightSentence(draft.insight.slots) : '');
  const share = async () => {
    setBusy(true);
    try {
      await game.flush();
      const current = useAdventure.getState();
      await exportProject(buildPrototypeArtifact(current.draft), 'shipingit-blueprint.md');
      setNotice(current.error ? 'Share opened. This device still needs to save your latest changes.' : 'Share opened with your current project.');
    } catch { setNotice('Could not share your project. Try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Screen contentWidth={500} style={{ gap: space.lg }}>
      {mode === 'build' ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><T variant="small" style={{ flex: 1 }}>{game.completed.length} of 6 stages built</T><Button title="Rename" compact variant="quiet" onPress={() => { setName(draft.projectName); setEditing(!editing); }} /></View>
        {editing ? <View style={{ gap: space.md }}><Field label="App name" value={name} onChangeText={setName} multiline={false} maxLength={40} /><Button title="Save name" disabled={!name.trim()} onPress={async () => { game.patchDraft({ projectName: name.trim() }); await game.flush(); if (!useAdventure.getState().error) setEditing(false); }} /></View> : null}
        <View style={styles.empty}><Image source={gameStageArt[next.id]} style={{ width: 150, height: 150 }} contentFit="contain" /><T variant="heading">{next.title}</T><T variant="small">{next.subtitle}</T></View>
      </> : mode === 'try' ? ready ? (
        <PrototypePreview draft={draft} requireConnections includeStaff={game.completed.includes('connect')} />
      ) : <View style={styles.empty}><Image source={gameStageArt.design} style={{ width: 140, height: 140 }} contentFit="contain" /><T variant="heading">Build your screen first</T><T variant="small">Use Build to add the queue and refresh pieces.</T></View> : (
        <View style={{ gap: space.lg }}>
          {draft.explore.evidenceIds.length ? draft.explore.evidenceIds.map((id) => {
            const evidence = evidenceById(id);
            if (!evidence) return null;
            return <View key={id} style={styles.note}><T variant="caption" style={{ color: colors.primaryPressed }}>{npcById(evidence.npcId).name} · {evidence.kind === 'claim' ? 'Needs checking' : 'Story note'}</T><T variant="subheading">{evidence.title}</T><T>“{evidence.quote}”</T></View>;
          }) : <T variant="small">Talk to Mali, Noa and Ken to collect your first story note.</T>}
          {insight ? <View style={styles.note}><T variant="caption">What you learned</T><T>{insight}</T></View> : null}
          {draft.scope.featureIds.length ? <View style={styles.note}><T variant="caption">Your features</T>{draft.scope.featureIds.map((id) => <T key={id}>{researchFeatures.find((feature) => feature.id === id)?.title ?? id}</T>)}</View> : null}
          <Button title="Share project" variant="quiet" loading={busy} onPress={() => void share()} />
          {notice ? <T variant="small" accessibilityLiveRegion="polite">{notice}</T> : null}
        </View>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 2, borderColor: colors.border },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: colors.transparent },
  tabActive: { borderColor: colors.primary },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.md },
  note: { borderBottomWidth: 1, borderColor: colors.border, paddingBottom: space.lg, gap: space.sm, borderRadius: radius.sm },
});
