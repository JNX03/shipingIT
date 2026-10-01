import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { colors, radius, space } from '@/theme';
import { useAdventure } from '../store';
import { GameLoading } from '../components/loading';
import { ProjectLibraryNotice } from '../components/project-library-notice';
import { projectLibrary, useProjectLibrary } from '../project-library';
import { projectDefinitions, type ProjectId } from '../project-library-model';

export function ProjectLibraryScreen() {
  const library = useProjectLibrary();
  const game = useAdventure();
  const lock = useRef(false);
  const active = useRef(false);
  const epoch = useRef(0);
  const [opening, setOpening] = useState<ProjectId | null>(null);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setOpening(null);
      return () => {
        active.current = false;
        epoch.current++;
      };
    }, [setOpening]),
  );
  const open = async (id: ProjectId) => {
    if (lock.current) return;
    lock.current = true;
    const token = epoch.current;
    setOpening(id);
    try {
      if (library.readBlocked && id === 'lunch') {
        if (active.current && epoch.current === token) router.replace('/(tabs)/project');
        return;
      }
      if (!projectLibrary.select(id)) return;
      if ((await projectLibrary.flush()) && active.current && epoch.current === token)
        router.replace('/(tabs)/project');
    } finally {
      lock.current = false;
      if (active.current && epoch.current === token) setOpening(null);
    }
  };
  if (!library.hydrated) return <GameLoading message="Loading your app choices…" />;
  const saved = (id: ProjectId) =>
    id === 'lunch' ? game.started || game.earned.length > 0 : Boolean(library.data.drafts[id]);
  return (
    <Screen contentWidth={520} header={<PageHeader title="Choose your app" back />}>
      <ProjectLibraryNotice />
      {projectDefinitions.map((project) => {
        const current = project.id === library.data.selected;
        return (
          <View
            key={project.id}
            style={[styles.card, current && styles.current]}
            testID={`project-card-${project.id}`}
          >
            <View style={styles.heading}>
              <GameIcon
                name={project.icon}
                size={36}
              />
              <View style={{ flex: 1, gap: space.xs }}>
                <T variant="heading" accessibilityRole="header">
                  {project.title}
                </T>
                <T
                  variant="caption"
                  style={{ color: current ? colors.primaryDeep : colors.textSecondary }}
                >
                  {current ? 'Selected' : saved(project.id) ? 'Saved on this device' : 'New project'}
                </T>
              </View>
            </View>
            <T variant="small">{project.description}</T>
            <Button
              title={saved(project.id) ? `Open ${project.title}` : `Build ${project.title}`}
              variant={current ? 'primary' : 'secondary'}
              onPress={() => void open(project.id)}
              loading={opening === project.id}
              disabled={
                (library.readBlocked && project.id !== 'lunch') ||
                (opening !== null && opening !== project.id)
              }
            />
          </View>
        );
      })}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    gap: space.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  current: { borderColor: colors.primaryPressed, backgroundColor: colors.primarySurface },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
