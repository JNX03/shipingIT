import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Host, Slider } from '@expo/ui';
import { Image } from 'expo-image';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme';
import { feedback } from '@/utils/feedback';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { gamePropArt } from '../art';
import type { GameDraft, GameStageProps } from '../types';
import { DraggableItem, pointInRect, type DropEvent } from '../components/drag-item';
import { EditorBlockContent, prototypeAccents } from '../components/editor-block';
import {
  adjacentEditorStep,
  checkEditorStep,
  editorDesignSignature,
  editorSteps,
  nextEssentialBlock,
  recordEditorPreviewAction,
  type EditorPreviewTest,
  type EditorStep,
} from '../components/editor-workflow';
import {
  editorSpacingLimit,
  findEditorSlot,
  placeEditorBlock,
  spaceEditorBlocks,
} from '../components/editor-layout';
import {
  arrangeScreen,
  blockDefinitions,
  checkConnections,
  flowEdgeKey,
  PHONE_HEIGHT,
  PHONE_WIDTH,
  PHONE_INSET,
  requiredBlockKinds,
  staffFlowEdges,
  type BlockKind,
} from '../logic/build';

export { prototypeAccents } from '../components/editor-block';

const PHONE_FRAME_INSET = 6;
const PHONE_FRAME_HEIGHT = PHONE_HEIGHT + PHONE_FRAME_INSET * 2;

type PreviewProps = {
  draft: GameDraft;
  requireConnections?: boolean;
  includeStaff?: boolean;
  onTargetPress?: (target: 'queue' | 'updated' | 'staff') => void;
  onInteraction?: (action: 'choose' | 'refresh' | 'staff-update') => void;
};

/** Every consumer renders the saved x/y coordinates at a readable, unscaled size. */
export function PrototypePreview({
  draft,
  requireConnections = false,
  includeStaff = false,
  onTargetPress,
  onInteraction,
}: PreviewProps) {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('Choose a stall, then refresh the board.');
  const refresh = () => {
    if (requireConnections && !checkConnections(draft).valid) {
      setNotice('Refresh has no working path to queue data. Repair the connections first.');
      return;
    }
    setRevision((value) => value + 1);
    setNotice('Refreshed. The simulated waits and update time changed.');
    onInteraction?.('refresh');
    feedback('light');
  };
  const publishStaffUpdate = () => {
    if (onTargetPress) return onTargetPress('staff');
    const edges = new Set(draft.connect.links.map((link) => flowEdgeKey(link.from, link.to)));
    if (requireConnections && !staffFlowEdges.every((edge) => edges.has(edge))) {
      setNotice('Staff report stopped before queue data. No update was published.');
      return;
    }
    setRevision((value) => value + 1);
    setNotice('Noa’s simulated report reached the board. The waits and update time changed.');
    onInteraction?.('staff-update');
    feedback('light');
  };
  return (
    <View style={styles.prototype}>
      <T variant="caption" style={styles.centerCopy}>
        PLAYABLE PROTOTYPE · SIMULATED DATA
      </T>
      <T variant="small" accessibilityLiveRegion="polite" style={styles.centerCopy}>
        {notice}
      </T>
      <PhoneRail>
        <View style={styles.phone}>
          <View style={styles.canvas} testID="prototype-canvas">
            {[...draft.design.blocks]
              .sort((a, b) => a.y - b.y)
              .map((block) => (
                <View
                  key={block.id}
                  testID={`prototype-block-${block.kind}`}
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
                    onRefresh={refresh}
                    onUpdated={onTargetPress ? () => onTargetPress('updated') : undefined}
                    onStaff={publishStaffUpdate}
                    onChoose={(name) => {
                      if (onTargetPress) return onTargetPress('queue');
                      setNotice(
                        `You chose ${name}. This is a practice choice, not a real queue booking.`,
                      );
                      onInteraction?.('choose');
                      feedback('selection');
                    }}
                  />
                </View>
              ))}
          </View>
        </View>
      </PhoneRail>
      {includeStaff ? (
        <View style={{ gap: 8 }}>
          <T variant="caption">STAFF TEST CONSOLE · SEPARATE FROM YOUR VISITOR SCREEN</T>
          <Button
            title="Noa: publish a queue update"
            variant="secondary"
            uppercase={false}
            onPress={publishStaffUpdate}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Keep the complete phone in the outer vertical scroll view's measured content.
 * Native horizontal ScrollView defaults to flexShrink: 1; an implicit height can
 * clip its tall child while hiding that overflow from the vertical parent.
 */
function PhoneRail({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      contentContainerStyle={styles.phoneRail}
      style={styles.phoneRailViewport}
      testID="editor-phone-rail"
      showsHorizontalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function Tool({
  title,
  onPress,
  selected = false,
  disabled = false,
  grow = false,
  label,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  grow?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        grow && { flex: 1 },
        selected && styles.toolSelected,
        disabled && { opacity: 0.4 },
        pressed && { backgroundColor: '#E5ECFF' },
      ]}
    >
      <T
        variant="small"
        maxFontSizeMultiplier={1.5}
        style={[styles.toolText, selected && { color: '#245DEA' }]}
      >
        {title}
      </T>
    </Pressable>
  );
}

type StyleTool = 'Corners' | 'Space';
const stepLabels: Record<EditorStep, string> = {
  place: 'Add pieces',
  layout: 'Arrange',
  style: 'Style',
  try: 'Try it',
};
const shortLabels: Record<BlockKind, string> = {
  title: 'Title',
  queue: 'Queues',
  updated: 'Updated',
  button: 'Refresh',
  image: 'Picture',
  navigation: 'Staff',
};

export function DesignStage({ draft, onChange, onComplete }: GameStageProps) {
  const canvas = useRef<View>(null);
  const viewport = useRef<View>(null);
  const scroller = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(200);
  const reduced = useMotionReduced();
  const [mode, setMode] = useState<EditorStep>(() =>
    nextEssentialBlock(draft.design) ? 'place' : 'layout',
  );
  const [selectedKind, setSelectedKind] = useState<BlockKind | null>(
    () => nextEssentialBlock(draft.design) ?? 'title',
  );
  const [extras, setExtras] = useState(false);
  const [moreTools, setMoreTools] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [styleTool, setStyleTool] = useState<StyleTool>('Corners');
  const [message, setMessage] = useState('Hold the tile and drop it onto the phone, or tap Place.');
  const [previewTest, setPreviewTest] = useState<EditorPreviewTest | null>(null);
  const design = draft.design;
  const signature = editorDesignSignature(design);
  const stepCheck = checkEditorStep(mode, draft, previewTest);
  const nextEssential = nextEssentialBlock(design);
  const interactiveLayout = mode === 'place' || mode === 'layout';
  const selected = design.blocks.find((block) => block.kind === selectedKind);
  const accent = prototypeAccents[design.accent];
  const essentialCount = requiredBlockKinds.filter((kind) =>
    design.blocks.some((block) => block.kind === kind),
  ).length;
  const update = (next: GameDraft['design']) => {
    setPreviewTest(null);
    onChange({ design: next, launch: { ...draft.launch, testRun: [], shipped: false } });
  };
  const sliderMin = styleTool === 'Corners' ? 0 : 4;
  const sliderMax = styleTool === 'Corners' ? 28 : editorSpacingLimit(design);
  const sliderValue = styleTool === 'Corners' ? design.radius : Math.min(design.spacing, sliderMax);
  const changeStyleValue = (value: number) =>
    update(
      styleTool === 'Corners' ? { ...design, radius: value } : spaceEditorBlocks(design, value),
    );
  const reveal = (y: number) =>
    scroller.current?.scrollTo({ y: Math.max(0, y - 24), animated: !reduced });
  const place = (kind: BlockKind, x: number, y: number, shouldReveal = false) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setMessage('Tap a spot on the phone, or use Place below.');
      return;
    }
    const next = placeEditorBlock(design, kind, x, y);
    const placed = next.blocks.find((block) => block.kind === kind)!;
    update(next);
    const nextMissing = mode === 'place' ? nextEssentialBlock(next) : undefined;
    setSelectedKind(nextMissing ?? kind);
    setMessage(
      nextMissing
        ? `${shortLabels[kind]} added. Next, add ${shortLabels[nextMissing].toLowerCase()}.`
        : `${shortLabels[kind]} placed. Your pieces are kept as you move between steps.`,
    );
    if (shouldReveal) reveal(placed.y);
  };
  const drop = (event: DropEvent) => {
    const kind = event.id.startsWith('palette:')
      ? (event.id.slice(8) as BlockKind)
      : design.blocks.find((block) => block.id === event.id)?.kind;
    if (!kind || !blockDefinitions[kind]) return;
    // A scrolled canvas extends behind controls. Only its visible intersection accepts drops.
    viewport.current?.measureInWindow((vx, vy, width, height) => {
      if (!pointInRect(event, { x: vx, y: vy, width, height })) {
        setMessage('Drop on the visible phone. Scroll it first to reach a lower spot.');
        return;
      }
      canvas.current?.measureInWindow((x, y, width, height) => {
        if (!pointInRect(event, { x, y, width, height })) {
          setMessage('Drop inside the white phone screen.');
          return;
        }
        const previous = design.blocks.find((block) => block.id === event.id);
        if (
          previous &&
          typeof event.translationX === 'number' &&
          typeof event.translationY === 'number'
        ) {
          const spec = blockDefinitions[kind];
          place(
            kind,
            previous.x + spec.width / 2 + event.translationX,
            previous.y + spec.height / 2 + event.translationY,
          );
        } else {
          place(kind, event.absoluteX - x, event.absoluteY - y);
        }
      });
    });
  };
  const addSelected = () => {
    if (!selectedKind) return;
    const slot = findEditorSlot(design, selectedKind);
    if (!slot) {
      setMessage('No open space here. Remove an extra block, or line up the layout.');
      return;
    }
    place(selectedKind, slot.x, slot.y, true);
    feedback('light');
  };
  const nudge = useCallback((dx: number, dy: number) => {
    if (!selected) return;
    const spec = blockDefinitions[selected.kind];
    const next = placeEditorBlock(design, selected.kind, selected.x + spec.width / 2 + dx, selected.y + spec.height / 2 + dy);
    setPreviewTest(null);
    onChange({ design: next, launch: { ...draft.launch, testRun: [], shipped: false } });
    setMessage(`${shortLabels[selected.kind]} moved. Keep its whole block inside the phone.`);
    scroller.current?.scrollTo({
      y: Math.max(0, selected.y + dy - Math.max(0, viewportHeight - spec.height) / 2 - 24),
      animated: !reduced,
    });
  }, [selected, design, draft.launch, onChange, viewportHeight, reduced]);
  const changeMode = (next: EditorStep) => {
    setMode(next);
    setExtras(false);
    setMoreTools(false);
    if (next === 'place') setSelectedKind(nextEssentialBlock(design) ?? selectedKind);
    if (next === 'style') reveal(design.blocks.find((block) => block.kind === 'queue')?.y ?? 0);
    if (next === 'layout') setMessage('Drag a block to move it. Tap one to use the layout tools.');
  };
  const lineUp = () => {
    const updated = design.blocks.find((block) => block.kind === 'updated');
    const queue = design.blocks.find((block) => block.kind === 'queue');
    update(
      arrangeScreen(
        { ...design, spacing: Math.min(design.spacing, editorSpacingLimit(design)) },
        !!updated && !!queue && updated.y < queue.y,
      ),
    );
    reveal(0);
    setMessage('Blocks lined up. Keep dragging to make it yours.');
  };
  const instruction =
    mode === 'place'
      ? nextEssential
        ? `Add the ${shortLabels[nextEssential].toLowerCase()}`
        : 'Your four pieces are here'
      : mode === 'layout'
        ? 'Give every piece its own space'
        : mode === 'style'
          ? 'Adjust rounding and spacing'
          : 'Choose a stall, then refresh';
  return (
    <View style={styles.stage}>
      <T
        variant="subheading"
        accessibilityRole="header"
        maxFontSizeMultiplier={1.5}
        style={styles.instruction}
      >
        {instruction}
      </T>
      <View
        style={styles.stepRow}
        accessibilityLabel={`Step ${editorSteps.indexOf(mode) + 1} of 4: ${stepLabels[mode]}`}
      >
        {editorSteps.map((item, index) => (
          <View key={item} style={[styles.step, mode === item && styles.stepActive]}>
            <T
              variant="caption"
              maxFontSizeMultiplier={1.3}
              style={[styles.stepCopy, mode === item && styles.stepCopyActive]}
            >
              {index + 1} {stepLabels[item]}
            </T>
          </View>
        ))}
      </View>
      {mode === 'try' ? (
        <ScrollView
          style={styles.workspace}
          contentContainerStyle={styles.tryContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PrototypePreview
            key={signature}
            draft={draft}
            onInteraction={(action) => {
              if (action === 'choose' || action === 'refresh') {
                setPreviewTest((current) => recordEditorPreviewAction(current, design, action));
              }
            }}
          />
        </ScrollView>
      ) : (
        <>
          {(mode === 'place' && nextEssential) || (mode === 'layout' && extras) ? (
            <View style={styles.tray} testID="editor-block-tray">
              {(mode === 'place' ? [nextEssential!] : (['image', 'navigation'] as BlockKind[])).map(
                (kind) => (
                  <DraggableItem
                    key={kind}
                    id={`palette:${kind}`}
                    onDrop={drop}
                    onTap={() => {
                      setSelectedKind(kind);
                      setMessage(
                        `Tap a blank spot to place ${shortLabels[kind].toLowerCase()}, or use Place below.`,
                      );
                    }}
                    selected={selectedKind === kind}
                    accessibilityLabel={`Select ${blockDefinitions[kind].label}`}
                    style={[
                      styles.tile,
                      { borderColor: selectedKind === kind ? accent : '#C7D3E8' },
                    ]}
                  >
                    <View pointerEvents="none" style={styles.tileFace}>
                      <T variant="small" maxFontSizeMultiplier={1.3} style={styles.toolText}>
                        {shortLabels[kind]}
                      </T>
                      <View
                        style={[
                          styles.tileMark,
                          {
                            backgroundColor: design.blocks.some((block) => block.kind === kind)
                              ? accent
                              : '#DCE4F2',
                          },
                        ]}
                      />
                    </View>
                  </DraggableItem>
                ),
              )}
            </View>
          ) : null}
          <View
            ref={viewport}
            collapsable={false}
            style={styles.workspace}
            onLayout={(event) => {
              setViewportHeight(event.nativeEvent.layout.height);
            }}
            testID="editor-canvas-viewport"
          >
            <ScrollView
              ref={scroller}
              nestedScrollEnabled
              style={{ flex: 1 }}
              contentContainerStyle={styles.canvasScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <PhoneRail>
                <View style={styles.phone}>
                  <View
                    ref={canvas}
                    collapsable={false}
                    style={styles.canvas}
                    testID="editor-canvas"
                  >
                    {interactiveLayout ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Phone canvas. Tap to place the selected block."
                        style={StyleSheet.absoluteFill}
                        onPress={(event) => {
                          if (!selectedKind) return;
                          const { pageX, pageY } = event.nativeEvent;
                          canvas.current?.measureInWindow((x, y) =>
                            place(selectedKind, pageX - x, pageY - y),
                          );
                        }}
                      />
                    ) : null}
                    {design.blocks.length === 0 ? (
                      <View pointerEvents="none" style={styles.emptyCanvas}>
                        <Image
                          source={gamePropArt.evidence}
                          contentFit="contain"
                          style={{ width: 64, height: 64 }}
                        />
                        <T variant="small" style={styles.centerCopy}>
                          Drop your first block here
                        </T>
                      </View>
                    ) : null}
                    {design.blocks.map((block) => {
                      const frame = {
                        position: 'absolute' as const,
                        left: block.x,
                        top: block.y,
                        width: blockDefinitions[block.kind].width,
                        height: blockDefinitions[block.kind].height,
                      };
                      const content = (
                        <View
                          pointerEvents="none"
                          style={{ width: frame.width, height: frame.height }}
                        >
                          <EditorBlockContent draft={draft} kind={block.kind} />
                          {interactiveLayout && selectedKind === block.kind ? (
                            <View
                              style={[
                                StyleSheet.absoluteFill,
                                {
                                  borderWidth: 2,
                                  borderStyle: 'dashed',
                                  borderColor: accent,
                                  borderRadius: design.radius,
                                },
                              ]}
                            />
                          ) : null}
                        </View>
                      );
                      return interactiveLayout ? (
                        <DraggableItem
                          key={`${block.id}:${block.x}:${block.y}`}
                          id={block.id}
                          onDrop={drop}
                          onTap={() => {
                            setSelectedKind(block.kind);
                            setMessage(
                              `${blockDefinitions[block.kind].label} selected. ${mode === 'layout' ? 'Drag it or use the tools below.' : 'Drag it to move, or select the next tile.'}`,
                            );
                          }}
                          selected={selectedKind === block.kind}
                          accessibilityLabel={`${blockDefinitions[block.kind].label} on phone. Tap to select or hold to move.`}
                          style={frame}
                        >
                          {content}
                        </DraggableItem>
                      ) : (
                        <View key={block.id} style={frame}>
                          {content}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </PhoneRail>
            </ScrollView>
          </View>
          {interactiveLayout ? (
            <View style={styles.inspector}>
              <T
                variant="caption"
                maxFontSizeMultiplier={1.4}
                numberOfLines={1}
                style={styles.centerCopy}
              >
                {selected
                  ? `${blockDefinitions[selected.kind].label} · x ${selected.x}, y ${selected.y}`
                  : selectedKind
                    ? `${blockDefinitions[selectedKind].label} · tap the phone or Place`
                    : `${essentialCount}/4 essentials · scroll phone to reach more space`}
              </T>
              <ScrollView
                horizontal
                contentContainerStyle={styles.toolRail}
                showsHorizontalScrollIndicator={false}
                accessibilityLabel={
                  mode === 'place'
                    ? 'Add the selected piece'
                    : 'Move the selected block. Scroll sideways for more tools.'
                }
              >
                {mode === 'place' || extras ? (
                  <Tool
                    title="Place"
                    disabled={!selectedKind}
                    onPress={addSelected}
                    label="Place selected block in an open space"
                  />
                ) : null}
                {mode === 'layout' ? <>
                  <Tool title="Up" disabled={!selected} onPress={() => nudge(0, -8)} label="Move selected block up" />
                  <Tool title="Down" disabled={!selected} onPress={() => nudge(0, 8)} label="Move selected block down" />
                  <Tool title="Left" disabled={!selected} onPress={() => nudge(-8, 0)} label="Move selected block left" />
                  <Tool title="Right" disabled={!selected} onPress={() => nudge(8, 0)} label="Move selected block right" />
                </> : null}
                {mode === 'layout' ? (
                  <Tool title="Line up" disabled={!design.blocks.length} onPress={lineUp} />
                ) : null}
                {mode === 'layout' ? (
                  <Tool
                    title={moreTools ? 'Less tools' : 'More tools'}
                    selected={moreTools}
                    onPress={() => {
                      setMoreTools(!moreTools);
                      setExtras(false);
                    }}
                  />
                ) : null}
                {mode === 'layout' && moreTools ? (
                  <Tool
                    title="Remove"
                    disabled={!selected}
                    onPress={() => {
                      update({
                        ...design,
                        blocks: design.blocks.filter((block) => block.kind !== selectedKind),
                      });
                      if (selectedKind && requiredBlockKinds.includes(selectedKind)) {
                        setMode('place');
                        setExtras(false);
                      }
                      setMessage('Block removed. Your other placements are kept.');
                    }}
                  />
                ) : null}
                {mode === 'layout' && moreTools ? (
                  <Tool
                    title={extras ? 'Hide extras' : 'Extra blocks'}
                    selected={extras}
                    onPress={() => setExtras(!extras)}
                  />
                ) : null}
              </ScrollView>
              {mode === 'layout' ? (
                <View style={styles.modeRow}>
                  {(['left', 'center'] as const).map((alignment) => (
                    <Tool
                      key={alignment}
                      title={`Align ${alignment}`}
                      selected={design.alignment === alignment}
                      grow
                      onPress={() =>
                        update({
                          ...design,
                          alignment,
                          blocks: design.blocks.map((block) => ({
                            ...block,
                            x:
                              alignment === 'center'
                                ? (PHONE_WIDTH - blockDefinitions[block.kind].width) / 2
                                : PHONE_INSET,
                          })),
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.stylePanel}>
              <View style={styles.modeRow}>
                {(['Corners', 'Space'] as const).map((item) => (
                  <Tool
                    key={item}
                    title={item}
                    selected={styleTool === item}
                    grow
                    onPress={() => {
                      setStyleTool(item);
                      reveal(design.blocks.find((block) => block.kind === 'queue')?.y ?? 0);
                    }}
                  />
                ))}
              </View>
              <>
                <T variant="small" maxFontSizeMultiplier={1.5} style={styles.centerCopy}>
                  {styleTool === 'Corners'
                    ? `Corner rounding · ${Math.round(design.radius)}`
                    : `Space between blocks · ${Math.round(design.spacing)}`}
                </T>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}
                  accessibilityLabel={
                    styleTool === 'Corners' ? 'Corner rounding' : 'Space between blocks'
                  }
                >
                  <Tool
                    title="Less"
                    label={`Decrease ${styleTool === 'Corners' ? 'corner rounding' : 'spacing'}`}
                    disabled={sliderValue <= sliderMin}
                    onPress={() => changeStyleValue(Math.max(sliderMin, sliderValue - 4))}
                  />
                  <Host style={{ height: 48, flex: 1 }}>
                    <Slider
                      value={
                        styleTool === 'Corners'
                          ? design.radius
                          : Math.min(design.spacing, editorSpacingLimit(design))
                      }
                      min={styleTool === 'Corners' ? 0 : 4}
                      max={styleTool === 'Corners' ? 28 : editorSpacingLimit(design)}
                      step={4}
                      testID={styleTool === 'Corners' ? 'design-radius' : 'design-spacing'}
                      onValueChange={changeStyleValue}
                    />
                  </Host>
                  <Tool
                    title="More"
                    label={`Increase ${styleTool === 'Corners' ? 'corner rounding' : 'spacing'}`}
                    disabled={sliderValue >= sliderMax}
                    onPress={() => changeStyleValue(Math.min(sliderMax, sliderValue + 4))}
                  />
                </View>
              </>
              <Tool
                title={showColor ? 'Hide color choices' : 'Choose a color (optional)'}
                selected={showColor}
                onPress={() => setShowColor(!showColor)}
              />
              {showColor ? (
                <View style={styles.choiceRow}>
                  {(['blue', 'purple', 'teal'] as const).map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${value} color`}
                      accessibilityState={{ selected: design.accent === value }}
                      onPress={() => update({ ...design, accent: value })}
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: prototypeAccents[value],
                          borderColor: design.accent === value ? '#142438' : 'transparent',
                        },
                      ]}
                    >
                      <T
                        variant="small"
                        maxFontSizeMultiplier={1.4}
                        style={{ color: '#FFFFFF', fontWeight: '800' }}
                      >
                        {value}
                        {design.accent === value ? ' · on' : ''}
                      </T>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </>
      )}
      <View style={styles.footer}>
        <T
          variant="small"
          accessibilityLiveRegion="polite"
          numberOfLines={2}
          maxFontSizeMultiplier={1.4}
          style={[styles.centerCopy, styles.statusCopy]}
        >
          {mode === 'place' || mode === 'layout'
            ? mode === 'layout' && !stepCheck.valid
              ? stepCheck.message
              : message
            : mode === 'try' || !stepCheck.valid
              ? stepCheck.message
              : 'Your changes appear on the screen above.'}
        </T>
        <View style={styles.footerActions}>
          {mode !== 'place' ? (
            <Button
              title="Back"
              variant="secondary"
              compact
              uppercase={false}
              onPress={() => changeMode(adjacentEditorStep(mode, -1))}
            />
          ) : null}
          <Button
            title={
              mode === 'place'
                ? 'Arrange my screen'
                : mode === 'layout'
                  ? 'Style my screen'
                  : mode === 'style'
                    ? 'Try my screen'
                    : 'Connect this screen'
            }
            style={{ flex: 1 }}
            uppercase={false}
            disabled={!stepCheck.valid}
            testID={`design-next-${mode}`}
            onPress={() => {
              if (mode === 'try') {
                if (stepCheck.valid) onComplete();
              } else if (stepCheck.valid) changeMode(adjacentEditorStep(mode, 1));
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F4F7FD',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  instruction: {
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  centerCopy: { textAlign: 'center', color: colors.textSecondary },
  statusCopy: { fontSize: 14, lineHeight: 20, minHeight: 40 },
  stepRow: { flexDirection: 'row', paddingHorizontal: 8, gap: 4, paddingBottom: 6 },
  step: { flex: 1, paddingVertical: 8, borderBottomWidth: 3, borderBottomColor: '#DCE3EF' },
  stepActive: { borderBottomColor: '#245DEA' },
  stepCopy: { color: colors.textSecondary, textAlign: 'center' },
  stepCopyActive: { color: '#245DEA' },
  modeRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 8 },
  tool: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolSelected: { borderColor: '#A9BCEC', backgroundColor: '#EAF0FF' },
  toolText: { fontWeight: '800', textAlign: 'center', color: colors.text },
  tray: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
    overflow: 'visible',
  },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 14,
    overflow: 'visible',
  },
  tileFace: {
    minHeight: 48,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  tileMark: { width: 24, height: 4, borderRadius: 2 },
  workspace: { flex: 1, minHeight: 80, overflow: 'hidden', backgroundColor: '#E8EDF6' },
  canvasScroll: { paddingVertical: 10 },
  phoneRailViewport: {
    height: PHONE_FRAME_HEIGHT,
    minHeight: PHONE_FRAME_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
  },
  phoneRail: {
    flexGrow: 1,
    minHeight: PHONE_FRAME_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  phone: {
    padding: PHONE_FRAME_INSET,
    borderRadius: 22,
    backgroundColor: '#283750',
    width: PHONE_WIDTH + PHONE_FRAME_INSET * 2,
    height: PHONE_FRAME_HEIGHT,
    flexShrink: 0,
  },
  canvas: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyCanvas: { position: 'absolute', top: 20, left: 20, right: 20, alignItems: 'center', gap: 4 },
  inspector: { paddingTop: 4, backgroundColor: '#FFFFFF' },
  toolRail: { gap: 4, paddingHorizontal: 8, paddingBottom: 4 },
  stylePanel: { paddingTop: 6, paddingBottom: 4, gap: 4, backgroundColor: '#FFFFFF' },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 72,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  swatch: {
    flex: 1,
    minHeight: 48,
    borderWidth: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DCE3EF',
  },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tryContent: { paddingVertical: 12 },
  prototype: { gap: 10, paddingVertical: 8, width: '100%', flexShrink: 0 },
});
