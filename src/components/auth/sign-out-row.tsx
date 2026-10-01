import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { authProvider } from '@/services/auth';
import { subscriptionService } from '@/services/purchases';
import { refreshAuthGate, useAuthGate } from '@/hooks/use-auth-gate';
import { createDirectSignOut } from '@/screens/auth/direct-sign-out';
import { colors, space } from '@/theme';

// Shared by Me and Settings, including a second tap before either screen updates.
const signOutAction = createDirectSignOut({
  signOut: () => authProvider.signOut(),
  refreshAuthGate,
  identify: (id) => subscriptionService.identify(id),
});

export function SignOutRow({ disabled = false }: { disabled?: boolean }) {
  const { canPlay } = useAuthGate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  if (!canPlay) return null;
  const logOut = async () => {
    if (disabled || locked.current || !canPlay) return;
    locked.current = true;
    setPending(true);
    setError('');
    try {
      const result = await signOutAction.run(canPlay);
      if (result && !result.success) {
        if (mounted.current) setError(result.message);
        // The existing provider closes private history as soon as logout begins.
        // Keep failures visible even after Me/Settings have been removed by that guard.
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(result.message);
        else Alert.alert('Could not log out', result.message);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setPending(false);
    }
  };
  return (
    <View style={styles.row} testID="direct-log-out">
      <Button
        title="Log out"
        variant="secondary"
        compact
        uppercase={false}
        loading={pending}
        disabled={disabled}
        onPress={() => void logOut()}
        testID="direct-log-out-action"
      />
      <T variant="small">Your saved project and learning progress stay on this device.</T>
      {error ? (
        <T variant="small" accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { padding: space.lg, gap: space.sm } });
