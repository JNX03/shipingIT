import { lazy, Suspense, useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/app-store';
import { colors, layout } from '@/theme';
import { StorageNotice } from '@/components/storage-notice';
import { useAppLayout } from '@/hooks/use-app-layout';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { useAdventure } from '@/game/store';
import { initializeProfileQuests, profileQuestStore } from '@/game/profile-quests-runtime';
import { AdventureSaveNotice } from '@/game/components/save-notice';
import { T } from '@/components/ui/text';
import { optionalStartupWork } from '@/domain/startup-work';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { privateRootRoutes, publicRootRoutes } from '@/services/auth-gate';
void SplashScreen.preventAutoHideAsync();
export { ErrorBoundary } from 'expo-router';
// Stable types live at module scope. Optional code does not remount on typing.
const GameAudioBridge = lazy(() =>
  import('@/components/game-audio-bridge').then((module) => ({ default: module.GameAudioBridge })),
);
const WebMCPBridge =
  process.env.EXPO_OS === 'web'
    ? lazy(() =>
        import('@/components/webmcp-bridge').then((module) => ({ default: module.WebMCPBridge })),
      )
    : null;
function StartupStatus({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: colors.surface,
      }}
      accessibilityLiveRegion="polite"
    >
      <T variant="small">{message}</T>
    </View>
  );
}
export default function RootLayout() {
  const auth = useAuthGate();
  const { desktop } = useAppLayout();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const hydrated = useAppStore((s) => s.hydrated);
  const reduced = useMotionReduced();
  const sound = useAppStore((s) => s.settings.sound);
  const adventureReady = useAdventure((s) => s.hydrated);
  const rewardsReady = profileQuestStore((s) => s.ready);
  useEffect(() => {
    // Quest initialization hydrates every reward source and establishes a
    // baseline before newly earned completions can be credited for today.
    void initializeProfileQuests();
  }, []);
  useEffect(() => {
    if ((fontsLoaded || fontError) && hydrated) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, hydrated]);
  if ((!fontsLoaded && !fontError) || !hydrated) return null;
  if (!adventureReady || !rewardsReady) return <StartupStatus message="Loading your saved work…" />;
  if (!auth.hydrated) return <StartupStatus message="Checking your sign-in…" />;
  const optional = optionalStartupWork({
    platform: process.env.EXPO_OS ?? '',
    authReady: auth.hydrated,
    canPlay: auth.canPlay,
    sound,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Head>
        <title>ShipingIT</title>
        <meta
          name="description"
          content="Explore a campus, find an insight, and build a playable app with Ami in ShipingIT."
        />
      </Head>
      <SafeAreaProvider>
        <KeyboardProvider>
          <StatusBar style="dark" />
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                flex: 1,
                width: '100%',
                maxWidth: desktop ? layout.desktopWidth : layout.maxWidth,
                backgroundColor: colors.surface,
              }}
            >
              <Suspense fallback={null}>
                {optional.audio ? <GameAudioBridge /> : null}
                {optional.webTools && WebMCPBridge ? <WebMCPBridge /> : null}
              </Suspense>
              <StorageNotice />
              <AdventureSaveNotice />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: reduced ? 'none' : 'fade',
                  animationDuration: reduced ? 0 : 150,
                  contentStyle: { backgroundColor: colors.surface },
                }}
              >
                <Stack.Protected guard={auth.canPlay}>
                  {privateRootRoutes.map((name) => (
                    <Stack.Screen
                      key={name}
                      name={name}
                      options={
                        name === 'guide/[id]' || name === 'paywall'
                          ? { presentation: 'modal' }
                          : name === 'lesson/[id]' ||
                              name === 'adventure/[id]' ||
                              name === 'practice/[id]'
                            ? { gestureEnabled: false }
                            : undefined
                      }
                    />
                  ))}
                </Stack.Protected>
                {/* SDK 57 redirects excluded routes to the first available screen.
                    Account stays first here; callback/recovery is never protected. */}
                {publicRootRoutes.map((name) => (
                  <Stack.Screen key={name} name={name} />
                ))}
              </Stack>
            </View>
          </View>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
