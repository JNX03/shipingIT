import { Redirect } from 'expo-router';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { GameLoading } from '@/game/components/loading';
import { ProjectLibraryScreen } from '@/game/screens/project-library';

/** Root also registers this under its private Stack; direct links use the same shared auth gate. */
export default function ProjectsRoute() {
  const auth = useAuthGate();
  if (!auth.hydrated) return <GameLoading message="Checking your sign-in…" />;
  if (!auth.canPlay) return <Redirect href="/account" />;
  return <ProjectLibraryScreen />;
}
