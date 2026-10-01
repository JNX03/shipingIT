import type { ReactNode } from 'react';
import { Redirect, router } from 'expo-router';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { IconButton } from '@/components/ui/button';

/** Also guards direct links until the root registers these routes in Stack.Protected. */
export function PracticeAccess({ children }: { children: ReactNode }) {
  const auth = useAuthGate();
  if (!auth.hydrated)
    return (
      <Screen
        header={
          <IconButton
            name="close"
            label="Close practice"
            onPress={() => router.replace('/(tabs)/compete')}
          />
        }
      >
        <T>Opening practice…</T>
      </Screen>
    );
  if (!auth.canPlay) return <Redirect href="/account" />;
  return children;
}
