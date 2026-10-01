import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { T } from '@/components/ui/text';
import { colors, layout } from '@/theme';
import { CampusCompassBuilder } from './builder';
import { CampusChoice } from './controls';
import { createCampusCompassDraft, normalizeCampusCompassDraft } from './logic';
import { CampusCompassPrototype } from './prototype';
import type { CampusCompassDraft } from './types';

export type CampusCompassConfig = CampusCompassDraft;
export const createDefaultCampusConfig = createCampusCompassDraft;

export interface CampusCompassTemplateProps {
  initialConfig?: CampusCompassConfig;
  onConfigChange?: (config: CampusCompassConfig) => void;
  onExit?: () => void;
  mode?: 'build' | 'play';
  onModeChange?: (mode: 'build' | 'play') => void;
  showChrome?: boolean;
}

export interface CampusCompassTemplateScreenProps {
  draft: CampusCompassDraft;
  onChange: (draft: CampusCompassDraft) => void;
  onExit?: () => void;
  initialMode?: 'build' | 'play';
  mode?: 'build' | 'play';
  onModeChange?: (mode: 'build' | 'play') => void;
  showChrome?: boolean;
}

/** Embedded by the host's Expo Router route; this component does not own navigation. */
export function CampusCompassTemplateScreen({
  draft,
  onChange,
  onExit,
  initialMode = 'build',
  mode: controlledMode,
  onModeChange,
  showChrome = true,
}: CampusCompassTemplateScreenProps) {
  const [localMode, setLocalMode] = useState(initialMode);
  const mode = controlledMode ?? localMode;
  const setMode = onModeChange ?? setLocalMode;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
        gap: 18,
        width: '100%',
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="campus-compass-template"
    >
      {showChrome && onExit ? (
        <CampusChoice title="Back to my apps" onPress={onExit} testID="campus-exit" />
      ) : null}
      {showChrome ? <><T variant="heading">CampusCompass</T>
      <T variant="caption" selectable>
        Original fictional campus · works with local practice data
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <CampusChoice
            title="Build"
            selected={mode === 'build'}
            onPress={() => setMode('build')}
            testID="campus-mode-build"
          />
        </View>
        <View style={{ flex: 1 }}>
          <CampusChoice
            title="Try my app"
            selected={mode === 'play'}
            onPress={() => setMode('play')}
            testID="campus-mode-play"
          />
        </View>
      </View></> : null}
      {mode === 'build' ? (
        <CampusCompassBuilder draft={draft} onChange={onChange} onTry={showChrome ? () => setMode('play') : undefined} />
      ) : (
        <CampusCompassPrototype
          draft={draft}
          onTripChange={(defaultTrip) => onChange({ ...draft, defaultTrip })}
        />
      )}
    </ScrollView>
  );
}

/** Root-library adapter. Remount with a project key when opening a different saved project. */
export function CampusCompassTemplate({
  initialConfig,
  onConfigChange,
  onExit,
  mode,
  onModeChange,
  showChrome,
}: CampusCompassTemplateProps) {
  const [draft, setDraft] = useState<CampusCompassDraft>(() =>
    normalizeCampusCompassDraft(initialConfig),
  );
  const update = (next: CampusCompassDraft) => {
    const valid = normalizeCampusCompassDraft(next);
    setDraft(valid);
    onConfigChange?.(valid);
  };
  return <CampusCompassTemplateScreen draft={draft} onChange={update} onExit={onExit} mode={mode} onModeChange={onModeChange} showChrome={showChrome} />;
}
