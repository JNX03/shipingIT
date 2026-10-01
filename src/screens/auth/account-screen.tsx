import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { T } from '@/components/ui/text';
import {
  AccountNotice,
  AccountPrompt,
  AccountToolbar,
} from '@/components/auth/account-presentation';
import { GameActor } from '@/game/components/actor';
import { colors, space } from '@/theme';
import { authProvider, type AuthResult } from '@/services/auth';
import { subscriptionService } from '@/services/purchases';
import { serviceConfig } from '@/services/config';
import { refreshAuthGate, useAuthGate } from '@/hooks/use-auth-gate';
import { useAppLayout } from '@/hooks/use-app-layout';
import {
  accountFlowReducer,
  accountIntentMode,
  accountPrimaryIntent,
  initialAccountFlow,
  validAccountEmail,
  type AccountFlowAction,
  type AccountMode,
  type AccountOperation,
} from './account-flow';

export default function AccountScreen() {
  const { intent } = useLocalSearchParams<{ intent?: string | string[] }>();
  const mode = accountIntentMode(intent);
  return <AccountFlowScreen key={mode} initialMode={mode} />;
}

function AccountFlowScreen({ initialMode }: { initialMode: AccountMode }) {
  const { status, canPlay, phase, error } = useAuthGate();
  const { height, width } = useAppLayout();
  const landscapeMethods = height < 420 && width >= 520;
  const shortMethods = height < 500;
  const [flow, dispatch] = useReducer(accountFlowReducer, initialMode, initialAccountFlow);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const changeFlow = useCallback((action: AccountFlowAction) => {
    if (lock.current) return;
    dispatch(action);
    setResult(null);
    if (action.type !== 'email' && action.type !== 'password') setShowPassword(false);
  }, []);
  const back = useCallback(() => {
    if (lock.current) return;
    if (!canPlay && flow.step !== 'methods') {
      dispatch({ type: 'back' });
      setResult(null);
      setShowPassword(false);
    } else if (router.canGoBack()) router.back();
    else router.replace(canPlay ? '/' : '/welcome');
  }, [canPlay, flow.step]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (lock.current) return true;
        if (!canPlay && flow.step !== 'methods') {
          back();
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }, [canPlay, flow.step, back]),
  );

  const run = async (operationName: AccountOperation, operation: () => Promise<AuthResult>) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setResult(null);
    try {
      const response = await operation();
      if (response.success) {
        await refreshAuthGate();
        // Store connectivity must not hold sign-in or password recovery open.
        void subscriptionService.identify(response.status.identity?.id ?? null);
      }
      if (mounted.current) {
        setResult(response);
        dispatch({
          type: 'result',
          operation: operationName,
          success: response.success,
          pendingVerification: response.pendingVerification,
        });
        if (response.success) setShowPassword(false);
      }
    } catch {
      if (mounted.current)
        setResult({
          success: false,
          status: status ?? { configured: false, mode: 'local', identity: null },
          message: 'Account access is unavailable right now. Please try again.',
        });
    } finally {
      lock.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const intent = accountPrimaryIntent(flow, pending);
  const submit = () => {
    if (lock.current) return;
    const next = accountPrimaryIntent(flow);
    if (next === 'advance') changeFlow({ type: 'next' });
    else if (next === 'signup')
      void run('signup', () => authProvider.signUp(flow.email, flow.password));
    else if (next === 'signin')
      void run('signin', () => authProvider.signIn(flow.email, flow.password));
    else if (next === 'reset') void run('reset', () => authProvider.resetPassword(flow.email));
  };
  const ready = phase === 'ready' && !!status;
  const form =
    !canPlay && ready && status?.configured && ['email', 'password', 'reset'].includes(flow.step);
  const messageScreen = !canPlay && ready && ['verification', 'reset-result'].includes(flow.step);
  const modeTitle = flow.mode === 'signup' ? 'Create account' : 'Sign in';
  const step = flow.step === 'email' ? 1 : flow.step === 'password' ? 2 : undefined;
  const footer = canPlay ? (
    <Button
      title="Continue to play"
      disabled={pending}
      onPress={() => {
        if (canPlay && !lock.current) router.replace('/');
      }}
      testID="account-continue-to-play"
    />
  ) : form ? (
    <Button
      title={
        flow.step === 'email'
          ? 'Continue'
          : flow.step === 'reset'
            ? 'Send reset link'
            : flow.mode === 'signup'
              ? 'Create account'
              : 'Sign in'
      }
      disabled={intent === 'none'}
      loading={pending}
      onPress={submit}
      testID="account-continue"
    />
  ) : messageScreen ? (
    <Button
      title="Continue to sign in"
      disabled={pending}
      onPress={() => changeFlow({ type: 'signin-after-message' })}
      testID="account-sign-in-after-message"
    />
  ) : ready && flow.step === 'methods' ? (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: space.md,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending }}
        disabled={pending}
        onPress={() =>
          changeFlow({ type: 'mode', mode: flow.mode === 'signin' ? 'signup' : 'signin' })
        }
        style={{ minHeight: 48, justifyContent: 'center' }}
        testID="account-change-mode"
      >
        <T variant="caption" style={{ color: colors.primaryPressed }}>
          {flow.mode === 'signin' ? 'Create an account' : 'I already have an account'}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending }}
        disabled={pending}
        onPress={() => {
          if (!lock.current) router.push('/privacy');
        }}
        style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
      >
        <T variant="caption" style={{ color: colors.primaryPressed }}>
          Privacy
        </T>
      </Pressable>
    </View>
  ) : undefined;

  return (
    <Screen
      key={canPlay ? 'signed-in' : flow.step}
      contentWidth={480}
      style={{
        gap: space.lg,
        paddingTop: flow.step === 'methods' && shortMethods ? space.xs : space.sm,
        paddingBottom: flow.step === 'methods' && shortMethods ? space.sm : space.lg,
      }}
      header={
        <AccountToolbar
          title={
            canPlay
              ? 'Account'
              : flow.step === 'reset' || flow.step === 'reset-result'
                ? 'Reset password'
                : flow.step === 'verification'
                  ? 'Confirm email'
                  : modeTitle
          }
          step={form && step ? step : undefined}
          methodChoice={!canPlay && ready && status?.configured && flow.step === 'methods'}
          onBack={back}
          disabled={pending}
        />
      }
      footer={footer}
      footerContentStyle={{ maxWidth: 480 }}
      footerStyle={{ paddingTop: space.sm }}
    >
      {phase === 'loading' ? (
        <>
          <AccountPrompt message="Getting your account ready…" compact={height < 580} thinking />
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <ActivityIndicator color={colors.primary} />
            <T variant="small">Checking your sign-in.</T>
          </View>
        </>
      ) : error || !status ? (
        <>
          <AccountPrompt message="Let’s try connecting again." compact={height < 580} thinking />
          <AccountNotice message={error ?? 'Could not check your sign-in. Please try again.'} />
          <Button
            title="Retry account connection"
            onPress={() => {
              void refreshAuthGate();
            }}
          />
        </>
      ) : canPlay ? (
        <>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <GameActor character="ami" motion="idle" size={height < 580 ? 116 : 148} />
            <T variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
              You’re signed in
            </T>
            <T selectable variant="small" style={{ textAlign: 'center' }}>
              Signed in as {status.identity?.email ?? 'your connected account'}.
            </T>
          </View>
          {result ? <AccountNotice message={result.message} success={result.success} /> : null}
          <Button
            title="Sign out on this device"
            variant="secondary"
            loading={pending}
            onPress={() => {
              void run('signout', () => authProvider.signOut());
            }}
            testID="account-sign-out"
          />
          <T variant="caption">Signing out keeps your saved project on this device.</T>
        </>
      ) : !status.configured ? (
        <>
          <AccountPrompt message="Account access is unavailable." compact={height < 580} thinking />
          <T variant="small">Account access is unavailable right now. Try connecting again.</T>
          <Button
            title="Retry account connection"
            onPress={() => {
              void refreshAuthGate();
            }}
          />
        </>
      ) : flow.step === 'methods' ? (
        <>
          <View
            style={{
              flexDirection: landscapeMethods ? 'row' : 'column',
              alignItems: landscapeMethods ? 'center' : undefined,
              gap: shortMethods ? space.sm : space.lg,
            }}
          >
            <View style={landscapeMethods ? { flex: 1 } : undefined}>
              <AccountPrompt
                message={
                  flow.mode === 'signup'
                    ? 'Choose a way to\ncreate your account.'
                    : 'Choose a way to\nsign in.'
                }
                compact={height < 580}
                phone
                condensed={landscapeMethods || shortMethods}
              />
            </View>
            <View style={{ gap: space.md, flex: landscapeMethods ? 1 : undefined }}>
              <Button
                title="Continue with Google"
                variant="secondary"
                style={{ minHeight: 56 }}
                disabled={pending || !serviceConfig.googleSignInEnabled}
                loading={pending}
                onPress={() => {
                  if (serviceConfig.googleSignInEnabled)
                    void run('google', () => authProvider.signInWithProvider('google'));
                }}
                testID="account-google-method"
              />
              {!serviceConfig.googleSignInEnabled ? (
                <T variant="caption" style={{ textAlign: 'center' }}>
                  Google sign-in is unavailable. Use email.
                </T>
              ) : null}
              {serviceConfig.appleSignInEnabled ? (
                <Button
                  title="Continue with Apple"
                  variant="secondary"
                  disabled={pending}
                  onPress={() => {
                    void run('apple', () => authProvider.signInWithProvider('apple'));
                  }}
                />
              ) : null}
              <Button
                title="Continue with email"
                variant="secondary"
                style={{ minHeight: 56 }}
                disabled={pending}
                onPress={() => changeFlow({ type: 'email-method' })}
                testID="account-email-method"
              />
            </View>
          </View>
          {result ? <AccountNotice message={result.message} success={result.success} /> : null}
        </>
      ) : messageScreen ? (
        <>
          <AccountPrompt
            message={
              flow.step === 'verification'
                ? 'One more step: confirm your email.'
                : 'Check your email for a reset link.'
            }
            compact={height < 580}
            thinking
          />
          <T selectable style={{ textAlign: 'center' }}>
            {flow.email.trim()}
          </T>
          {result ? <AccountNotice message={result.message} success={result.success} /> : null}
          <T variant="small">
            {flow.step === 'verification'
              ? 'Open your confirmation link, then come back to sign in.'
              : 'Open the reset link to choose a new password.'}
          </T>
        </>
      ) : (
        <>
          <View style={{ gap: space.sm }}>
            <T variant="title" accessibilityRole="header">
              {flow.step === 'password'
                ? flow.mode === 'signup'
                  ? 'Create a password'
                  : 'Enter your password'
                : flow.step === 'reset'
                  ? 'Where should we send the link?'
                  : 'What’s your email?'}
            </T>
            <T variant="small">
              {flow.step === 'password'
                ? flow.email.trim()
                : flow.mode === 'signup'
                  ? 'Choose an address you can open to confirm your account.'
                  : flow.step === 'reset'
                    ? 'Use the email address for your account.'
                    : 'Use the email address for your account.'}
            </T>
          </View>
          {flow.step === 'password' ? (
            <Field
              label="Password"
              value={flow.password}
              onChangeText={(value) => changeFlow({ type: 'password', value })}
              placeholder={flow.mode === 'signup' ? 'At least 12 characters' : 'Your password'}
              multiline={false}
              secure={!showPassword}
              maxLength={128}
              help={flow.mode === 'signup' ? 'Use at least 12 characters.' : undefined}
              inputProps={{
                autoCapitalize: 'none',
                autoCorrect: false,
                autoComplete: flow.mode === 'signup' ? 'new-password' : 'current-password',
                textContentType: flow.mode === 'signup' ? 'newPassword' : 'password',
                editable: !pending,
                autoFocus: true,
                enterKeyHint: 'done',
                onSubmitEditing: submit,
              }}
            />
          ) : (
            <Field
              label="Email"
              value={flow.email}
              onChangeText={(value) => changeFlow({ type: 'email', value })}
              placeholder="you@example.com"
              multiline={false}
              maxLength={254}
              help={
                flow.email.trim() && !validAccountEmail(flow.email)
                  ? 'Enter a complete email address, like name@example.com.'
                  : undefined
              }
              inputProps={{
                autoCapitalize: 'none',
                autoCorrect: false,
                keyboardType: 'email-address',
                autoComplete: 'email',
                textContentType: 'emailAddress',
                editable: !pending,
                autoFocus: true,
                enterKeyHint: flow.step === 'reset' ? 'send' : 'next',
                onSubmitEditing: submit,
              }}
            />
          )}
          {flow.step === 'password' ? (
            <View style={{ gap: space.sm }}>
              <Button
                title={showPassword ? 'Hide password' : 'Show password'}
                variant="quiet"
                compact
                disabled={pending}
                onPress={() => {
                  if (!lock.current) setShowPassword(!showPassword);
                }}
              />
              {flow.mode === 'signin' ? (
                <Button
                  title="Forgot password?"
                  variant="quiet"
                  compact
                  disabled={pending}
                  onPress={() => changeFlow({ type: 'reset' })}
                  testID="account-forgot-password"
                />
              ) : null}
            </View>
          ) : null}
          {result ? <AccountNotice message={result.message} success={result.success} /> : null}
        </>
      )}
    </Screen>
  );
}
