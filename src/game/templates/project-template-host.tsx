import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
import { projectLibrary, useProjectLibrary } from '../project-library';
import { CampusCompassTemplate, createDefaultCampusConfig } from './map';
import { StudyBuddyTemplate, createStudyBuddyDraft } from './study';

/** Each template receives only its own config. It cannot reset the existing adventure or Notebook. */
export function ProjectTemplateHost({ mode = 'build', onModeChange }: { mode?: 'build' | 'try'; onModeChange?: (mode: 'build' | 'try') => void }) {
  const library = useProjectLibrary();
  const insets = useSafeAreaInsets();
  const lock = useRef(false);
  const active = useRef(false);
  const epoch = useRef(0);
  const [leaving, setLeaving] = useState(false);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setLeaving(false);
      return () => {
        active.current = false;
        epoch.current++;
      };
    }, [setLeaving]),
  );
  const leave = async () => {
    if (lock.current) return;
    lock.current = true;
    const token = epoch.current;
    setLeaving(true);
    try {
      if ((await projectLibrary.flush()) && active.current && epoch.current === token)
        router.push('/projects');
    } finally {
      lock.current = false;
      if (active.current && epoch.current === token) setLeaving(false);
    }
  };
  const selected = library.data.selected;
  return (
    <View style={{ flex: 1, paddingTop: onModeChange ? 0 : selected === 'map' ? insets.top : 0 }}>
      {leaving ? (
        <T variant="small" style={{ padding: space.md, color: colors.textSecondary }}>
          Saving your app choices…
        </T>
      ) : null}
      <View style={{ flex: 1 }} pointerEvents={leaving ? 'none' : 'auto'}>
        {selected === 'map' ? (
          <CampusCompassTemplate
            key="map"
            initialConfig={library.data.drafts.map ?? createDefaultCampusConfig()}
            onConfigChange={projectLibrary.saveMap}
            onExit={() => void leave()}
            mode={onModeChange ? mode === 'try' ? 'play' : 'build' : undefined}
            onModeChange={onModeChange ? (next) => onModeChange(next === 'play' ? 'try' : 'build') : undefined}
            showChrome={!onModeChange}
          />
        ) : selected === 'study' ? (
          <StudyBuddyTemplate
            key="study"
            initialDraft={library.data.drafts.study ?? createStudyBuddyDraft()}
            onDraftChange={projectLibrary.saveStudy}
            onExit={() => void leave()}
            mode={onModeChange ? mode : undefined}
            onModeChange={onModeChange}
            showChrome={!onModeChange}
          />
        ) : null}
      </View>
    </View>
  );
}
