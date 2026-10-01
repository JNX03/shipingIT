import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { feedback } from '@/utils/feedback';
import { colors } from '@/theme';
import { gameStageArt } from '../art';
import type { GameStageProps } from '../types';
import { DraggableItem, type DropEvent } from '../components/drag-item';
import { EditorBlockContent } from '../components/editor-block';
import {
  createSignalPath,
  isSignalRunCurrent,
  sampleSignalPath,
  type SignalPath,
  type SignalRun,
} from '../components/signal-geometry';
import {
  checkConnections,
  flowEdgeKey,
  flowNodes,
  requiredFlowEdges,
  staffFlowEdges,
  visitorFlow,
} from '../logic/build';

const visitorNodes = flowNodes.filter((node) => visitorFlow.some((id) => id === node.id));
const allowed = new Set<string>([...requiredFlowEdges, ...staffFlowEdges]);
const nodeTitle = (id: string) => flowNodes.find((node) => node.id === id)?.title ?? id;
const nodePurpose: Record<string, string> = {
  tap: 'Trigger: the visitor asks for fresh waits. Connect Tap refresh to Read the board.',
  load: 'Action: read the latest local report. Connect Read the board to Queue data.',
  queues: 'Data: stall names, wait minutes, and update time. Connect Queue data to Show choices.',
  render: 'Result: replace the old queue cards and freshness label with the values just read.',
};

function refreshFailure(draft: GameStageProps['draft']) {
  const check = checkConnections(draft);
  const edges = new Set(draft.connect.links.map((link) => flowEdgeKey(link.from, link.to)));
  const invalid = draft.connect.links.some((link) => !allowed.has(flowEdgeKey(link.from, link.to)));
  if (invalid || edges.size !== draft.connect.links.length)
    return `${check.message} Open Wires to remove the broken or duplicate connection, then rerun.`;
  if (!edges.has('tap>load'))
    return 'Actual: waits stayed old. Tap refresh does not start a read. Join Tap refresh → Read the board.';
  if (!edges.has('load>queues'))
    return 'Actual: waits stayed old. The read cannot reach queue values. Join Read the board → Queue data.';
  return 'Actual: waits stayed old. The data cannot reach the screen. Join Queue data → Show choices.';
}

export function ConnectStage({ draft, onChange, onComplete }: GameStageProps) {
  const board = useRef<View>(null);
  const workshop = useRef<ScrollView>(null);
  const previewY = useRef(0);
  const [size, setSize] = useState({ width: 312, height: 260, measured: false });
  const { fontScale } = useWindowDimensions();
  const reduced = useMotionReduced();
  const [source, setSource] = useState<string | null>(null);
  const [editingWires, setEditingWires] = useState(false);
  const [message, setMessage] = useState(
    'Goal: make Refresh replace old waits with the latest local queue report. Start at Tap refresh.',
  );
  const progress = useSharedValue(0);
  const visible = useSharedValue(false);
  const pulsePath = useSharedValue<SignalPath | null>(null);
  const uiEpoch = useSharedValue(0);
  const signature = JSON.stringify(draft.connect.links);
  const lifecycle = useRef({
    mounted: false,
    epoch: 0,
    run: null as SignalRun | null,
    current: { pathKey: '', linksKey: '', runKey: '', valid: false },
  });
  const nodeWidth = Math.max(48, (size.width - 40) / 2);
  // The workshop scrolls so the board and playable result remain reachable at large text sizes.
  const validFontScale =
    Number.isFinite(fontScale) && fontScale > 0 && Number.isFinite(124 * fontScale + 104);
  const safeFontScale = validFontScale ? fontScale : 1;
  const nodeHeight = Math.max(94, 62 * safeFontScale + 28);
  // Neither status copy nor action wrapping may resize the board during a run.
  const statusHeight = Math.max(48, Math.ceil(44 * safeFontScale));
  const actionHeight = Math.max(76, Math.ceil(44 * safeFontScale + 32));
  const footerHeight = statusHeight + actionHeight + 32;
  const boardHeight = Math.max(size.height, nodeHeight * 2 + 48);
  const positions: Record<string, { x: number; y: number }> = {
    tap: { x: 8, y: 10 },
    load: { x: size.width - nodeWidth - 8, y: 10 },
    queues: { x: size.width - nodeWidth - 8, y: boardHeight - nodeHeight - 10 },
    render: { x: 8, y: boardHeight - nodeHeight - 10 },
  };
  const path =
    size.measured && validFontScale
      ? createSignalPath(
          visitorFlow.map((id) => ({
            x: positions[id].x + nodeWidth / 2,
            y: positions[id].y + nodeHeight / 2,
          })),
        )
      : null;
  const pathKey = path?.key ?? '';
  const runKey = `${signature}|${pathKey}|${reduced ? 'still' : 'motion'}`;
  const [signalStatus, setSignalStatus] = useState({ key: runKey, running: false, passed: false });
  // Revisions discard their local result before commit, including restored old inputs.
  if (signalStatus.key !== runKey) setSignalStatus({ key: runKey, running: false, passed: false });
  const hasRun = !!path && signalStatus.key === runKey && signalStatus.passed;
  const running = !!path && signalStatus.key === runKey && signalStatus.running;
  const check = checkConnections(draft);
  const pulseStyle = useAnimatedStyle(() => {
    // UI-owned scalar snapshot: no React-render array or unchecked dynamic index.
    const point = sampleSignalPath(pulsePath.get(), progress.get());
    return {
      opacity: visible.get() && point.valid ? 1 : 0,
      transform: [{ translateX: point.x - 9 }, { translateY: point.y - 9 }],
    };
  });
  const resetSignal = useCallback(
    (nextEpoch: number) => {
      scheduleOnUI((epoch: number) => {
        'worklet';
        uiEpoch.set(epoch);
        cancelAnimation(progress);
        visible.set(false);
        pulsePath.set(null);
        progress.set(0);
      }, nextEpoch);
    },
    [uiEpoch, progress, visible, pulsePath],
  );
  useLayoutEffect(() => {
    const session = lifecycle.current;
    session.epoch++;
    session.current = { pathKey, linksKey: signature, runKey, valid: !!pathKey && check.valid };
    session.run = null;
    resetSignal(session.epoch);
  }, [signature, pathKey, runKey, check.valid, resetSignal]);
  useEffect(() => {
    const session = lifecycle.current;
    session.mounted = true;
    return () => {
      session.mounted = false;
      session.epoch++;
      session.run = null;
      resetSignal(session.epoch);
    };
  }, [resetSignal]);
  const invalidateRun = () => {
    const session = lifecycle.current;
    session.epoch++;
    session.run = null;
    session.current.valid = false;
    setSignalStatus({ key: runKey, running: false, passed: false });
    resetSignal(session.epoch);
  };
  const finish = (
    epoch: number,
    deliveredPathKey: string,
    linksKey: string,
    delivered: boolean,
  ) => {
    const session = lifecycle.current;
    const completedRun = { epoch, pathKey: deliveredPathKey, linksKey };
    if (
      !session.mounted ||
      !session.current.valid ||
      session.run?.epoch !== epoch ||
      !isSignalRunCurrent(
        completedRun,
        session.epoch,
        session.current.pathKey,
        session.current.linksKey,
      )
    )
      return;
    session.run = null;
    if (!delivered) {
      setSignalStatus({ key: session.current.runKey, running: false, passed: false });
      resetSignal(session.epoch);
      setMessage('The signal did not reach the result. Run this version again.');
      feedback('error');
      return;
    }
    setSignalStatus({ key: session.current.runKey, running: false, passed: true });
    setMessage(
      'Actual matches expected: Rice 8 → 4 min, Noodle 3 → 7 min. Queue data → Show choices delivered the new cards and update time.',
    );
    feedback('success');
  };
  const connect = (from: string, to: string) => {
    if (running) return;
    if (draft.connect.links.some((link) => link.from === from && link.to === to)) {
      setMessage('Already joined. Open Wires to remove a connection.');
      setSource(null);
      return;
    }
    invalidateRun();
    const next = { links: [...draft.connect.links, { from, to }] };
    onChange({ connect: next, launch: { ...draft.launch, testRun: [], shipped: false } });
    setSource(null);
    const validEdge = allowed.has(flowEdgeKey(from, to));
    setMessage(
      validEdge
        ? checkConnections({ ...draft, connect: next }).valid
          ? 'All three steps are connected. Run signal or try Refresh board to see the waits change.'
          : nodePurpose[to]
        : `${nodeTitle(from)} cannot send directly to ${nodeTitle(to)}. Open Wires to remove it. Follow trigger → action → data → result.`,
    );
    if (!validEdge) feedback('error');
  };
  const drop = (event: DropEvent) => {
    board.current?.measureInWindow((x, y) => {
      const localX = event.absoluteX - x;
      const localY = event.absoluteY - y;
      const destination = visitorNodes.find((node) => {
        const position = positions[node.id];
        return (
          localX >= position.x &&
          localX <= position.x + nodeWidth &&
          localY >= position.y &&
          localY <= position.y + nodeHeight
        );
      });
      if (destination && destination.id !== event.id) connect(event.id, destination.id);
      else setMessage('Drop on another block, or tap two blocks to join them.');
    });
  };
  const connected = requiredFlowEdges.filter((edge) =>
    draft.connect.links.some((link) => flowEdgeKey(link.from, link.to) === edge),
  ).length;
  const invalidCount = draft.connect.links.filter(
    (link) => !allowed.has(flowEdgeKey(link.from, link.to)),
  ).length;
  const run = () => {
    if (lifecycle.current.run) return;
    if (editingWires) {
      setMessage(
        'Use Back to board before running this version. The signal needs the measured wiring board.',
      );
      workshop.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    workshop.current?.scrollTo({ y: previewY.current, animated: false });
    if (!check.valid) {
      setMessage(refreshFailure(draft));
      feedback('error');
      return;
    }
    if (!path) {
      setMessage('The wiring board is not ready. Try running the signal again.');
      feedback('error');
      return;
    }
    const session = lifecycle.current;
    const epoch = ++session.epoch;
    session.current = { pathKey: path.key, linksKey: signature, runKey, valid: true };
    session.run = { epoch, pathKey: path.key, linksKey: signature };
    setSource(null);
    setSignalStatus({ key: runKey, running: true, passed: false });
    setMessage(
      'Refresh requested. Reading the local report before changing the visible queue cards.',
    );
    // Start/cancel/path publication happen in one UI task, preserving numeric progress.
    scheduleOnUI(
      (snapshot: SignalPath, startedEpoch: number, linksKey: string, motionReduced: boolean) => {
        'worklet';
        uiEpoch.set(startedEpoch);
        cancelAnimation(progress);
        pulsePath.set(snapshot);
        progress.set(0);
        visible.set(true);
        if (motionReduced) {
          progress.set(1);
          scheduleOnRN(
            finish,
            startedEpoch,
            snapshot.key,
            linksKey,
            sampleSignalPath(snapshot, 1).delivered,
          );
          return;
        }
        progress.set(
          withTiming(
            1,
            { duration: 900, easing: Easing.linear, reduceMotion: ReduceMotion.System },
            (finished) => {
              if (!finished || uiEpoch.get() !== startedEpoch) return;
              const activePath = pulsePath.get();
              // Reanimated 4.5.1 supplies only finished; read the actual final UI value.
              const current = progress.get();
              const point = sampleSignalPath(activePath, current);
              const delivered =
                current === 1 && activePath?.key === snapshot.key && point.delivered;
              scheduleOnRN(finish, startedEpoch, snapshot.key, linksKey, delivered);
            },
          ),
        );
      },
      path,
      epoch,
      signature,
      reduced,
    );
  };
  const removeWire = (index: number) => {
    invalidateRun();
    onChange({
      connect: { links: draft.connect.links.filter((_, i) => i !== index) },
      launch: { ...draft.launch, testRun: [], shipped: false },
    });
    setMessage('Wire removed. Return to the board to reconnect it.');
  };
  return (
    <View style={styles.stage}>
      <ScrollView
        ref={workshop}
        style={styles.workshop}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.intro}>
          <Image
            source={gameStageArt.connect}
            style={styles.art}
            contentFit="contain"
            accessibilityLabel="A playful wiring workshop"
          />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="subheading">{editingWires ? 'Repair your wires' : 'Wire the refresh'}</T>
            <T variant="small">
              {editingWires
                ? 'Remove a wire to try a new path.'
                : 'Make Refresh read current waits and show them. Tap two blocks in order, or drag one onto the next.'}
            </T>
          </View>
        </View>
        <T variant="small" style={styles.previewCopy}>
          A button needs a complete path: its tap starts a read, the read supplies queue data, and
          that data replaces the old cards.
        </T>
        <View style={styles.tools}>
          <T variant="small" style={{ flex: 1, color: invalidCount ? colors.danger : '#644395' }}>
            {invalidCount
              ? `${invalidCount} broken · ${connected}/3 joined`
              : `${connected}/3 wires joined`}
          </T>
          {!editingWires ? (
            <Button
              title={`Wires (${draft.connect.links.length})`}
              uppercase={false}
              variant="secondary"
              compact
              disabled={running || !draft.connect.links.length}
              onPress={() => {
                invalidateRun();
                setSource(null);
                setEditingWires(true);
              }}
            />
          ) : null}
        </View>
        {editingWires ? (
          <ScrollView
            style={styles.wireList}
            contentContainerStyle={styles.wireContent}
            nestedScrollEnabled
          >
            {draft.connect.links.map((link, index) => {
              const valid = allowed.has(flowEdgeKey(link.from, link.to));
              return (
                <View
                  key={`${flowEdgeKey(link.from, link.to)}-${index}`}
                  style={[styles.wire, !valid && styles.brokenWire]}
                >
                  <T variant="small" style={{ color: valid ? '#644395' : colors.danger }}>
                    {valid ? 'Connected' : 'Broken connection'}
                  </T>
                  <Button
                    title={`Remove: ${nodeTitle(link.from)} → ${nodeTitle(link.to)}`}
                    uppercase={false}
                    variant="secondary"
                    onPress={() => removeWire(index)}
                  />
                </View>
              );
            })}
            {!draft.connect.links.length ? (
              <T>No wires yet. Return to the board to join two blocks.</T>
            ) : null}
          </ScrollView>
        ) : (
          <View
            style={[styles.boardViewport, { height: Math.max(260, nodeHeight * 2 + 48) }]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (
                !Number.isFinite(width) ||
                !Number.isFinite(height) ||
                width < 136 ||
                height <= 0
              ) {
                invalidateRun();
                setSize((previous) => ({ ...previous, measured: false }));
                return;
              }
              if (!size.measured || width !== size.width || height !== size.height) {
                const wasRunning = !!lifecycle.current.run;
                invalidateRun();
                if (wasRunning) setMessage('The board moved. Run the signal on this layout again.');
                setSize({ width, height, measured: true });
              }
            }}
          >
            <ScrollView
              style={styles.boardScroll}
              scrollEnabled={boardHeight > size.height && !running}
              contentContainerStyle={{ height: boardHeight }}
              showsVerticalScrollIndicator={boardHeight > size.height}
            >
              <View ref={board} collapsable={false} style={{ height: boardHeight, width: '100%' }}>
                <Svg
                  width={size.width}
                  height={boardHeight}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                >
                  {draft.connect.links.map((link, index) => {
                    const from = positions[link.from],
                      to = positions[link.to];
                    if (!from || !to) return null;
                    const valid = allowed.has(flowEdgeKey(link.from, link.to));
                    return (
                      <Path
                        key={`${flowEdgeKey(link.from, link.to)}-${index}`}
                        d={`M ${from.x + nodeWidth / 2} ${from.y + nodeHeight / 2} L ${to.x + nodeWidth / 2} ${to.y + nodeHeight / 2}`}
                        stroke={valid ? '#7D66C8' : colors.danger}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={valid ? undefined : '8 6'}
                      />
                    );
                  })}
                </Svg>
                {visitorNodes.map((node) => (
                  <DraggableItem
                    key={node.id}
                    id={node.id}
                    onDrop={drop}
                    onTap={() => {
                      if (source === node.id) {
                        setSource(null);
                        return;
                      }
                      if (source) connect(source, node.id);
                      else {
                        setSource(node.id);
                        setMessage(nodePurpose[node.id]);
                      }
                    }}
                    accessibilityLabel={`${node.role}: ${node.title}. ${node.detail}`}
                    selected={source === node.id}
                    disabled={running}
                    style={[
                      styles.node,
                      {
                        left: positions[node.id].x,
                        top: positions[node.id].y,
                        width: nodeWidth,
                        minHeight: nodeHeight,
                        borderColor:
                          source === node.id ? '#5D39A2' : hasRun ? '#78A859' : '#CDBFE7',
                        backgroundColor:
                          source === node.id ? '#EDE3FF' : hasRun ? '#F0FFE5' : '#FFFFFF',
                      },
                    ]}
                  >
                    <View style={[styles.nodeContent, { minHeight: nodeHeight - 6 }]}>
                      <T variant="caption" style={{ color: '#644395' }}>
                        {node.role}
                      </T>
                      <T variant="button" style={{ color: colors.text }}>
                        {node.title}
                      </T>
                    </View>
                  </DraggableItem>
                ))}
                <Animated.View pointerEvents="none" style={[styles.signal, pulseStyle]} />
              </View>
            </ScrollView>
          </View>
        )}
        <View
          style={styles.preview}
          testID="connect-playable-board"
          onLayout={(event) => {
            previewY.current = event.nativeEvent.layout.y;
          }}
        >
          <T variant="subheading">Try the refresh</T>
          <T variant="small" selectable style={styles.previewCopy}>
            Expected: Rice 4 min, Noodle 7 min, updated just now.
          </T>
          <T variant="caption" style={styles.previewCopy}>
            Local practice data. The read changes the screen’s copy, not the staff’s stored report.
          </T>
          <T
            variant="small"
            selectable
            accessibilityLiveRegion="polite"
            testID="connect-actual-result"
            style={{ color: hasRun ? colors.success : colors.textSecondary }}
          >
            {running
              ? 'Actual: reading… the old cards stay until the result arrives.'
              : hasRun
                ? 'Actual: refreshed cards and update time. Expected result reached.'
                : 'Actual before refresh: Rice 8 min, Noodle 3 min, updated 6 minutes ago.'}
          </T>
          <View style={styles.previewScreen}>
            <EditorBlockContent
              draft={draft}
              kind="queue"
              revision={hasRun ? 1 : 0}
              onChoose={(name) => {
                setMessage(
                  hasRun
                    ? `${name} selected from the refreshed report. The connected flow gave you current local choices.`
                    : `${name} selected from the old report. Try Refresh board; the cards need all three wires to change.`,
                );
              }}
            />
            <EditorBlockContent
              draft={draft}
              kind="updated"
              revision={hasRun ? 1 : 0}
              onUpdated={() =>
                setMessage(
                  hasRun
                    ? 'The update label came from the same refreshed report as the waits. That helps a visitor judge freshness.'
                    : 'This label is 6 minutes old. Read the board → Queue data supplies the latest update time; Queue data → Show choices displays it.',
                )
              }
            />
            <EditorBlockContent draft={draft} kind="button" onRefresh={run} />
          </View>
          <T variant="small" style={styles.previewCopy}>
            Why three wires? A tap starts a read; the read supplies data; the data changes what the
            visitor sees.
          </T>
          <Button
            title="Back to the wires"
            variant="quiet"
            compact
            uppercase={false}
            disabled={running}
            onPress={() => workshop.current?.scrollTo({ y: 0, animated: false })}
          />
          {hasRun ? (
            <Button
              title="Replay from old waits"
              variant="secondary"
              compact
              uppercase={false}
              testID="connect-replay-refresh"
              onPress={run}
            />
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, { height: footerHeight }]}>
        <View accessibilityLiveRegion="polite" style={{ height: statusHeight }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            nestedScrollEnabled
          >
            <T
              variant="small"
              style={{
                color: hasRun ? colors.success : invalidCount ? colors.danger : colors.text,
              }}
            >
              {running
                ? 'Reading the local report… old cards remain until Show choices receives the data.'
                : message}
            </T>
          </ScrollView>
        </View>
        <Button
          testID="connect-run-or-continue"
          title={
            editingWires
              ? 'Back to board'
              : running
                ? 'Delivering…'
                : hasRun && check.valid
                  ? 'Continue'
                  : 'Run signal'
          }
          style={{ height: actionHeight, justifyContent: 'center' }}
          disabled={running}
          haptic={false}
          onPress={
            editingWires
              ? () => setEditingWires(false)
              : hasRun && check.valid
                ? () => {
                    const current = lifecycle.current.current;
                    if (current.valid && signalStatus.key === current.runKey && signalStatus.passed)
                      onComplete();
                  }
                : run
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, backgroundColor: '#F7F4FC' },
  workshop: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 6 },
  intro: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  art: { width: 54, height: 62 },
  tools: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center' },
  boardViewport: { flexShrink: 0 },
  boardScroll: { flex: 1 },
  node: { position: 'absolute', borderWidth: 2, borderBottomWidth: 6, borderRadius: 18 },
  nodeContent: { gap: 4, padding: 10, justifyContent: 'center' },
  preview: {
    gap: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CDBFE7',
    borderRadius: 18,
    alignItems: 'center',
  },
  previewCopy: { textAlign: 'center', color: colors.textSecondary },
  previewScreen: { gap: 4, width: 248, maxWidth: '100%' },
  signal: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFBB35',
    borderWidth: 3,
    borderColor: '#8D5700',
    zIndex: 110,
  },
  wireList: { height: 260, flexShrink: 0 },
  wireContent: { gap: 10, paddingBottom: 12 },
  wire: { gap: 4, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 16 },
  brokenWire: { backgroundColor: colors.dangerSurface },
  footer: {
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DED6EC',
  },
});
