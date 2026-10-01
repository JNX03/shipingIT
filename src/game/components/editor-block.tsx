import type { ReactNode } from 'react';
import { Pressable, View, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { T } from '@/components/ui/text';
import { gameSceneArt } from '../art';
import { blockDefinitions, type BlockKind } from '../logic/build';
import type { GameDraft } from '../types';

export const prototypeAccents = { blue: '#245DEA', purple: '#7550B5', teal: '#087F76' } as const;

export interface EditorBlockContentProps {
  draft: GameDraft;
  kind: BlockKind;
  revision?: number;
  onChoose?: (name: string) => void;
  onRefresh?: () => void;
  onUpdated?: () => void;
  onStaff?: () => void;
}

function BlockTarget({
  children,
  label,
  onPress,
  style,
  testID,
}: {
  children: ReactNode;
  label: string;
  onPress?: () => void;
  style: ViewStyle;
  testID: string;
}) {
  if (!onPress) {
    return (
      <View style={style} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [style, { opacity: pressed ? 0.76 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

/** Content uses the same logical 1x dimensions in the editor and playable app. */
export function EditorBlockContent({
  draft,
  kind,
  revision = 0,
  onChoose,
  onRefresh,
  onUpdated,
  onStaff,
}: EditorBlockContentProps) {
  const { design } = draft;
  const accent = prototypeAccents[design.accent];
  const spec = blockDefinitions[kind];
  const text: TextStyle = {
    fontSize: 16,
    lineHeight: 21,
    textAlign: design.alignment,
    color: '#20324E',
    includeFontPadding: false,
  };
  const target: ViewStyle = {
    width: '100%',
    height: '100%',
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: design.radius,
  };
  const queues =
    revision % 2 === 0
      ? [
          { name: 'Rice stall', wait: 8 },
          { name: 'Noodle stall', wait: 3 },
        ]
      : [
          { name: 'Rice stall', wait: 4 },
          { name: 'Noodle stall', wait: 7 },
        ];
  return (
    <View
      testID={`editor-content-${kind}`}
      style={{ width: spec.width, height: spec.height, overflow: 'hidden' }}
    >
      {kind === 'title' ? (
        <View style={{ height: '100%', justifyContent: 'center' }}>
          <T
            variant="heading"
            numberOfLines={2}
            maxFontSizeMultiplier={1.1}
            accessibilityLabel={draft.projectName || 'Lunch board'}
            style={{ ...text, fontSize: 20, lineHeight: 25 }}
          >
            {draft.projectName || 'Lunch board'}
          </T>
        </View>
      ) : null}
      {kind === 'queue' ? (
        <View style={{ height: '100%', gap: design.spacing }}>
          {queues.map((queue) => (
            <BlockTarget
              key={queue.name}
              label={`${queue.name}, ${queue.wait} minute simulated wait. Choose this queue.`}
              onPress={onChoose ? () => onChoose(queue.name) : undefined}
              testID={`editor-queue-${queue.name === 'Rice stall' ? 'rice' : 'noodle'}`}
              style={{
                height: (spec.height - design.spacing) / 2,
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 10,
                borderWidth: 2,
                borderColor: accent,
                borderRadius: design.radius,
                backgroundColor: '#FFFFFF',
              }}
            >
              <T numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ ...text, flex: 1 }}>
                {queue.name}
              </T>
              <T
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={{ ...text, color: accent, fontVariant: ['tabular-nums'] }}
              >
                {queue.wait} min
              </T>
            </BlockTarget>
          ))}
        </View>
      ) : null}
      {kind === 'updated' ? (
        <BlockTarget
          label={`Update time: ${revision ? 'just now' : '6 minutes ago'}, simulated data`}
          onPress={onUpdated}
          style={target}
          testID="editor-updated"
        >
          <T numberOfLines={2} maxFontSizeMultiplier={1.2} style={text}>
            {revision ? 'Updated just now' : 'Updated 6 minutes ago'}
          </T>
        </BlockTarget>
      ) : null}
      {kind === 'button' ? (
        <BlockTarget
          label="Refresh simulated queue board"
          onPress={onRefresh}
          style={{ ...target, paddingHorizontal: 10, backgroundColor: accent }}
          testID="editor-refresh"
        >
          <T numberOfLines={2} maxFontSizeMultiplier={1.2} style={{ ...text, color: '#FFFFFF' }}>
            Refresh board
          </T>
        </BlockTarget>
      ) : null}
      {kind === 'image' ? (
        <Image
          source={gameSceneArt.campus}
          contentFit="contain"
          accessible
          accessibilityLabel="Campus canteen scene"
          style={{ width: '100%', height: '100%', borderRadius: design.radius }}
        />
      ) : null}
      {kind === 'navigation' ? (
        <BlockTarget
          label="Staff desk. Publish a simulated queue update."
          onPress={onStaff}
          style={target}
          testID="editor-staff"
        >
          <T numberOfLines={2} maxFontSizeMultiplier={1.2} style={{ ...text, color: accent }}>
            Staff desk
          </T>
        </BlockTarget>
      ) : null}
    </View>
  );
}
