import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Celebration } from '@/components/learning/celebration';
import { feedback } from '@/utils/feedback';
import { colors } from '@/theme';
import { gamePropArt } from '../art';
import { EditorBlockContent } from '../components/editor-block';
import type { GameDraft, GameStageProps, NpcId } from '../types';
import {
  applyWalkthroughFix,
  blockDefinitions,
  buildPrototypeArtifact,
  checkConnections,
  checkPersonaWalkthrough,
  checkPrototypeReadyToShip,
  checkScreenDesign,
  walkthroughs,
} from '../logic/build';
import {
  launchActionResult,
  launchPrototypeSignature,
  launchTaskGuides,
  tryLaunchTaskAction,
  type LaunchTaskAttempt,
  type PrototypeAction,
} from './launch-task';

type Phase = 'idle' | 'issue' | 'passed';
type Scene = 'walkthrough' | 'repair' | 'play' | 'shipped' | 'blueprint';
type ResultCopy = { expected: string; actual: string };
const playActions = [
  { id: 'choose', title: 'Choose a stall', instruction: 'Tap the stall you would choose.' },
  {
    id: 'refresh',
    title: 'Refresh the board',
    instruction: 'Tap Refresh. Watch the waits and time change.',
  },
  {
    id: 'staff-update',
    title: 'Publish an update',
    instruction: 'Tap Publish update. Check the new waits.',
  },
] as const;

/** Uses the saved layout and the existing queue blocks, without an extra test-console shell. */
function LaunchPrototype({
  draft,
  showStaff,
  onAction,
  onTarget,
}: {
  draft: GameDraft;
  showStaff: boolean;
  onAction: (action: PrototypeAction, stall?: string) => boolean;
  onTarget?: (target: 'queue' | 'updated' | 'staff') => void;
}) {
  const [revision, setRevision] = useState(0);
  const changeData = (action: 'refresh' | 'staff-update') => {
    if (action === 'staff-update' && onTarget) return onTarget('staff');
    if (onAction(action)) setRevision((value) => value + 1);
  };
  const height =
    Math.max(
      0,
      ...draft.design.blocks.map((block) => block.y + blockDefinitions[block.kind].height),
    ) + 12;
  return (
    <View style={styles.prototype}>
      <View style={[styles.phone, { height }]} testID="prototype-canvas">
        {[...draft.design.blocks]
          .sort((a, b) => a.y - b.y)
          .map((block) => (
            <View
              key={block.id}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: blockDefinitions[block.kind].width,
                height: blockDefinitions[block.kind].height,
              }}
            >
              <EditorBlockContent
                draft={draft}
                kind={block.kind}
                revision={revision}
                onChoose={(stall) => (onTarget ? onTarget('queue') : onAction('choose', stall))}
                onRefresh={() => changeData('refresh')}
                onUpdated={onTarget ? () => onTarget('updated') : undefined}
                onStaff={() => changeData('staff-update')}
              />
            </View>
          ))}
      </View>
      {showStaff ? (
        <Button
          title="Publish update"
          uppercase={false}
          variant="secondary"
          onPress={() => changeData('staff-update')}
          testID="launch-publish-update"
        />
      ) : null}
    </View>
  );
}

export function LaunchStage({ draft, onChange, onComplete }: GameStageProps) {
  const signature = launchPrototypeSignature(draft);
  const ready = checkPrototypeReadyToShip(draft);
  const [scene, setScene] = useState<Scene>(
    draft.launch.shipped ? 'shipped' : ready.valid ? 'play' : 'walkthrough',
  );
  const [personaId, setPersonaId] = useState<NpcId>(
    () =>
      walkthroughs.find(
        (item) =>
          !draft.launch.testRun.includes(item.id) || !checkPersonaWalkthrough(item.id, draft).valid,
      )?.id ?? 'mali',
  );
  const [phaseState, setPhaseState] = useState<{ signature: string; phase: Phase }>({
    signature,
    phase: 'idle',
  });
  const phase = phaseState.signature === signature ? phaseState.phase : 'idle';
  const [attempt, setAttempt] = useState<LaunchTaskAttempt | null>(null);
  const [identified, setIdentified] = useState(false);
  const [result, setResult] = useState<ResultCopy | null>(null);
  const [playStep, setPlayStep] = useState(0);
  const [played, setPlayed] = useState<{ signature: string; actions: string[] }>({
    signature,
    actions: [],
  });
  const [copyMessage, setCopyMessage] = useState('');
  const [justShipped, setJustShipped] = useState(false);
  const persona = walkthroughs.find((item) => item.id === personaId)!;
  const task = launchTaskGuides[personaId];
  const screenCheck = checkScreenDesign(draft);
  const baseCheck = screenCheck.valid ? checkConnections(draft) : screenCheck;
  const actions = played.signature === signature ? played.actions : [];
  const playAction = playActions[playStep]!;
  const finalActionTried = actions.includes(playAction.id);
  const triedPrototype = playActions.every((action) => actions.includes(action.id));

  const startPlay = () => {
    setPlayStep(0);
    setResult(null);
    setScene('play');
  };
  const nextTask = () => {
    const next = walkthroughs.find(
      (item) =>
        !draft.launch.testRun.includes(item.id) || !checkPersonaWalkthrough(item.id, draft).valid,
    );
    if (!next) return startPlay();
    setPersonaId(next.id);
    setAttempt(null);
    setIdentified(false);
    setResult(null);
    setPhaseState({ signature, phase: 'idle' });
    setScene('walkthrough');
  };
  const act = (action: PrototypeAction, stall?: string): boolean => {
    if (!baseCheck.valid) return false;
    const actionResult = launchActionResult(action, draft, stall);
    if (scene === 'play') {
      setResult(actionResult);
      if (actionResult.worked && action === playAction.id) {
        setPlayed((previous) => ({
          signature,
          actions: [
            ...new Set([...(previous.signature === signature ? previous.actions : []), action]),
          ],
        }));
        feedback('success');
      }
      return actionResult.worked;
    }
    if (scene !== 'walkthrough' || phase !== 'idle') return actionResult.worked;
    const checked = tryLaunchTaskAction(attempt, draft, personaId, action, stall);
    setAttempt(checked.attempt);
    setPhaseState({ signature, phase: checked.phase });
    setResult(checked.phase === 'idle' ? checked.actionResult : checked.taskResult);
    if (checked.phase !== 'idle') {
      onChange({
        launch: {
          ...draft.launch,
          testRun:
            checked.phase === 'passed'
              ? [...new Set([...draft.launch.testRun, personaId])]
              : draft.launch.testRun.filter((id) => id !== personaId),
          shipped: checked.phase === 'passed' ? draft.launch.shipped : false,
        },
      });
      feedback(checked.phase === 'passed' ? 'success' : 'light');
    }
    return actionResult.worked;
  };
  const repair = () => {
    if (!identified || phase !== 'issue') return;
    onChange(applyWalkthroughFix(persona.issueId, draft));
    setPhaseState({ signature, phase: 'idle' });
    setAttempt(null);
    setIdentified(false);
    setPlayed({ signature: '', actions: [] });
    setResult({
      expected: 'Retry the changed task.',
      actual: 'Repair saved. Earlier checks reset.',
    });
    setScene('walkthrough');
    feedback('medium');
  };
  const ship = () => {
    if (!ready.valid || !triedPrototype) return;
    onChange({ launch: { ...draft.launch, shipped: true } });
    setJustShipped(true);
    setScene('shipped');
    feedback('success');
  };
  const copyArtifact = async () => {
    try {
      setCopyMessage(
        (await Clipboard.setStringAsync(buildPrototypeArtifact(draft)))
          ? 'Blueprint copied.'
          : 'Copy unavailable. Your project is saved.',
      );
    } catch {
      setCopyMessage('Copy unavailable. Your project is saved.');
    }
  };

  let primary = { title: 'Try the task above', disabled: true, onPress: nextTask };
  if (scene === 'walkthrough' && phase === 'issue')
    primary = {
      title: 'Find the broken step',
      disabled: false,
      onPress: () => {
        setIdentified(false);
        setScene('repair');
      },
    };
  if (scene === 'walkthrough' && phase === 'passed')
    primary = { title: 'Next task', disabled: false, onPress: nextTask };
  if (scene === 'repair')
    primary = { title: 'Apply repair', disabled: !identified, onPress: repair };
  if (scene === 'play')
    primary =
      playStep < 2
        ? {
            title: 'Next action',
            disabled: !finalActionTried || !ready.valid,
            onPress: () => {
              setPlayStep((step) => step + 1);
              setResult(null);
            },
          }
        : draft.launch.shipped
          ? {
              title: 'Back to my saved app',
              disabled: !finalActionTried,
              onPress: () => setScene('shipped'),
            }
          : {
              title: 'Ship my prototype',
              disabled: !ready.valid || !triedPrototype,
              onPress: ship,
            };
  if (scene === 'shipped')
    primary = { title: 'Finish my shipping journey', disabled: !ready.valid, onPress: onComplete };
  if (scene === 'blueprint')
    primary = { title: 'Copy blueprint', disabled: false, onPress: () => void copyArtifact() };

  return (
    <View style={styles.stage} testID={`launch-scene-${scene}`}>
      <View style={styles.heading}>
        <T variant="subheading">Test your queue app</T>
        <T variant="small">Find broken steps before sharing your app.</T>
      </View>
      <ScrollView
        key={`${scene}-${personaId}-${signature}`}
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {scene === 'walkthrough' || scene === 'repair' || scene === 'play' ? (
          <>
            <View style={styles.task}>
              <T variant="heading">
                {scene === 'play'
                  ? playAction.title
                  : scene === 'repair'
                    ? 'Fix this step'
                    : task.title}
              </T>
              <T variant="small">
                {scene === 'play'
                  ? playAction.instruction
                  : scene === 'repair'
                    ? `Tap the ${task.affectedPart}.`
                    : task.instruction}
              </T>
            </View>
            {!baseCheck.valid ? (
              <T selectable style={styles.error}>
                {baseCheck.message}
              </T>
            ) : null}
            <LaunchPrototype
              key={`${scene}-${personaId}-${signature}`}
              draft={draft}
              showStaff={
                (personaId === 'noa' && scene !== 'play') ||
                (scene === 'play' && playAction.id === 'staff-update')
              }
              onAction={act}
              onTarget={
                scene === 'repair'
                  ? (target) => {
                      const found = target === persona.target;
                      setIdentified(found);
                      setResult({
                        expected: `Select the ${task.affectedPart}.`,
                        actual: found
                          ? 'Selected. Apply the repair below.'
                          : 'Try the affected part.',
                      });
                      feedback(found ? 'selection' : 'light');
                    }
                  : undefined
              }
            />
          </>
        ) : scene === 'shipped' ? (
          <View style={styles.shipped}>
            <Celebration active={justShipped} replayKey="game-shipped" />
            <Image
              source={gamePropArt.reward}
              style={styles.reward}
              contentFit="contain"
              accessibilityLabel="Your shipping toolbox"
            />
            <T variant="heading">Your prototype is saved!</T>
            <T variant="small">Shipped inside this app with simulated data.</T>
            <Button
              title="Play again"
              variant="secondary"
              uppercase={false}
              onPress={() => {
                setPlayed({ signature, actions: [] });
                startPlay();
              }}
            />
            <Button
              title="Blueprint"
              variant="secondary"
              uppercase={false}
              onPress={() => setScene('blueprint')}
            />
          </View>
        ) : (
          <>
            <T variant="heading">Your blueprint</T>
            <T selectable variant="small">
              {buildPrototypeArtifact(draft)}
            </T>
            {copyMessage ? <T accessibilityLiveRegion="polite">{copyMessage}</T> : null}
            <Button
              title="Back to my app"
              variant="secondary"
              uppercase={false}
              onPress={() => setScene('shipped')}
            />
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {result && (scene === 'walkthrough' || scene === 'repair' || scene === 'play') ? (
          <View accessibilityLiveRegion="polite" testID="launch-task-result" style={styles.result}>
            <T variant="small">Expected: {result.expected}</T>
            <T variant="small" style={{ color: phase === 'issue' ? colors.danger : colors.text }}>
              Actual: {result.actual}
            </T>
          </View>
        ) : null}
        <Button
          title={primary.title}
          disabled={primary.disabled}
          haptic={false}
          onPress={primary.onPress}
          testID="launch-primary-action"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, backgroundColor: '#F1F8F4' },
  heading: { paddingHorizontal: 16, paddingVertical: 8, gap: 2 },
  body: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  task: { paddingHorizontal: 4, gap: 4 },
  prototype: { alignItems: 'center', gap: 8 },
  phone: { width: 280, backgroundColor: '#FFFFFF', borderRadius: 16 },
  footer: {
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D7E4DF',
  },
  result: { gap: 3 },
  error: { color: colors.danger },
  shipped: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  reward: { width: 120, height: 110 },
});
