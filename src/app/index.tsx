import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/app-store';
export default function Index() {
  const complete = useAppStore((s) => s.onboardingComplete);
  return <Redirect href={complete ? '/(tabs)' : '/welcome'} />;
}
