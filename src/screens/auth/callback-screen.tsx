import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Screen, PageHeader } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { T } from '@/components/ui/text';
import { Character } from '@/components/ui/character';
import { colors, space } from '@/theme';
import { authProvider } from '@/services/auth';
import type { AuthResult } from '@/services/auth';
import { serviceConfig } from '@/services/config';
import { subscriptionService } from '@/services/purchases';
import { refreshAuthGate, useAuthGate } from '@/hooks/use-auth-gate';
import { authAllowsPlay } from '@/services/auth-gate';
import { resolveAuthCallback } from '@/services/auth-callback-navigation';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; type?: string }>();
  const deepLink = Linking.useLinkingURL();
  const auth = useAuthGate();
  const [working, setWorking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Verifying your sign-in link…');
  const [password, setPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const verification = useRef<{ url: string; result: Promise<AuthResult | null> } | null>(null);
  const saving = useRef(false);
  const browser = Platform.OS === 'web' && typeof window !== 'undefined';
  const callback = resolveAuthCallback({
    expectedUrl: browser
      ? `${window.location.origin}/auth/callback`
      : serviceConfig.authRedirectUrl,
    receivedUrl: browser ? window.location.href : deepLink,
    code: params.code,
    type: params.type,
  });
  const callbackUrl = callback?.url ?? null;
  const recovery = callback?.recovery ?? params.type === 'recovery';
  useEffect(() => {
    let cancelled = false;
    if (!callbackUrl) {
      // An incomplete first render must not consume the only verification attempt.
      if (!verification.current) {
        setWorking(false);
        setMessage(
          'Open the full link from your email, or return to your account to sign in again.',
        );
      }
      return;
    }
    if (verification.current?.url !== callbackUrl) {
      setWorking(true);
      setSuccess(false);
      setPasswordSaved(false);
      setMessage('Verifying your sign-in link…');
      verification.current = {
        url: callbackUrl,
        result: (async () => {
          // Current web sign-in uses a same-tab redirect. Only relay an older
          // popup flow when this tab actually has an opener.
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
            const complete = WebBrowser.maybeCompleteAuthSession();
            if (complete.type === 'success') return null;
          }
          const result = await authProvider.completeOAuth(callbackUrl);
          if (result.success) {
            await refreshAuthGate();
            void subscriptionService.identify(result.status.identity?.id ?? null);
          }
          return result;
        })(),
      };
    }
    void verification.current.result
      .then((result) => {
        if (!cancelled) {
          if (!result) {
            setWorking(false);
            setMessage('Sign-in was returned to your original tab. Continue there.');
            return;
          }
          const signedIn = result.success && authAllowsPlay(result.status);
          setSuccess(signedIn);
          setMessage(
            signedIn && recovery
              ? 'Your reset link is verified. Choose a new password.'
              : result.message,
          );
          setWorking(false);
          // Remove the single-use authorization code from browser history after processing.
          if (Platform.OS === 'web' && typeof window !== 'undefined')
            window.history.replaceState(
              null,
              '',
              recovery ? '/auth/callback?type=recovery' : '/auth/callback',
            );
          else Linking.clearInitialURL();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorking(false);
          setMessage('This link could not be verified. Start sign-in again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [callbackUrl, recovery]);
  const savePassword = async () => {
    if (saving.current) return;
    saving.current = true;
    setWorking(true);
    try {
      const result = await authProvider.updatePassword(password);
      if (result.success) await refreshAuthGate();
      setMessage(result.message);
      setPasswordSaved(result.success);
      if (result.success) setPassword('');
    } catch {
      setMessage('Could not update your password. Please try again.');
    } finally {
      setWorking(false);
      saving.current = false;
    }
  };
  const canContinue = success && auth.canPlay && (!recovery || passwordSaved);
  return (
    <Screen
      footer={
        <Button
          title={canContinue ? 'Continue to play' : 'Back to account'}
          variant={canContinue ? 'primary' : 'secondary'}
          onPress={() => router.replace(canContinue ? '/' : '/account')}
          disabled={working}
        />
      }
    >
      <PageHeader
        title={recovery ? 'A fresh start' : 'Your account'}
        subtitle="Your local project stays safe."
      />
      <View
        style={{
          alignItems: 'center',
          gap: space.xl,
          paddingVertical: space.xl,
        }}
      >
        <Character emotion={success ? 'celebrating' : 'encouraging'} size={190} />
        {working && <ActivityIndicator color={colors.primary} />}
        <T selectable accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {message}
        </T>
      </View>
      {recovery && success && !passwordSaved && (
        <View style={{ gap: space.lg }}>
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 12 characters"
            multiline={false}
            secure
            maxLength={128}
            inputProps={{
              autoComplete: 'new-password',
              textContentType: 'newPassword',
              autoCapitalize: 'none',
              editable: !working,
            }}
          />
          <Button
            title="Save new password"
            onPress={() => {
              void savePassword();
            }}
            loading={working}
            disabled={password.length < 12}
          />
        </View>
      )}
      <T variant="small" style={{ textAlign: 'center' }}>
        Sign-in is required to play. Your project and progress are still stored on this device.
      </T>
    </Screen>
  );
}
