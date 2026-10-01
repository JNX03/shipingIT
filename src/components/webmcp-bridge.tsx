import { router } from 'expo-router';
import { useWebMCP } from '@/hooks/use-webmcp';
import { useAppStore } from '@/store/app-store';
import { getNextLesson } from '@/domain/progression';
import { useAdventure } from '@/game/store';
import { webMCPDestinationPaths } from '@/services/webmcp-tools';
export function WebMCPBridge() {
  const enabled = useAppStore((s) => s.onboardingComplete);
  useWebMCP({
    enabled,
    getSnapshot: () => {
      const s = useAppStore.getState();
      const game = useAdventure.getState();
      return {
        project: s.project,
        progress: {
          xp: s.xp,
          completedLessonIds: s.completedLessonIds,
          achievements: s.achievements,
          currentMission: getNextLesson(s.completedLessonIds)?.missionId ?? 8,
        },
        adventure: {
          version: game.version,
          draft: game.draft,
          completed: game.completed,
          earned: game.earned,
          activityDates: game.activityDates,
          started: game.started,
          hydrated: game.hydrated,
          saveNeedsAttention: Boolean(game.error),
        },
      };
    },
    onNavigate: (destination, field) => {
      if (field) {
        router.push({ pathname: '/project/edit/[field]', params: { field } });
        return;
      }
      router.navigate(webMCPDestinationPaths[destination]);
    },
  });
  return null;
}
