import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { GameActor } from '@/game/components/actor';
import { colors, fonts, space } from '@/theme';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useAppStore } from '@/store/app-store';

export function WelcomeScreen() {
  const { height, fontScale } = useWindowDimensions();
  const { canPlay } = useAuthGate();
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  // Give very short screens and large accessibility text one continuous scroll area.
  const scrollActions = height < 500 || fontScale > 1.5;
  const actorSize = height < 580 ? 168 : height < 700 ? 208 : 240;
  const actions = (
    <View style={styles.actions}>
      <Button
        title={canPlay ? "Let's play" : 'Get started'}
        testID="welcome-get-started"
        onPress={() =>
          canPlay
            ? router.push(onboardingComplete ? '/(tabs)' : '/onboarding')
            : router.push({ pathname: '/account', params: { intent: 'signup' } })
        }
      />
      <Button
        title={canPlay ? 'Your account' : 'I already have an account'}
        variant="secondary"
        testID="welcome-sign-in"
        onPress={() =>
          canPlay
            ? router.push('/account')
            : router.push({ pathname: '/account', params: { intent: 'signin' } })
        }
      />
      <Button
        title="Privacy"
        variant="quiet"
        compact
        uppercase={false}
        style={styles.privacy}
        onPress={() => router.push('/privacy')}
      />
    </View>
  );
  return (
    <Screen
      contentWidth={480}
      style={[styles.content, scrollActions && styles.scrollContent]}
      header={
        <View style={styles.brand}>
          <T variant="title" style={styles.wordmark}>
            ShipingIT
          </T>
        </View>
      }
      footerContentStyle={styles.footerContent}
      footerStyle={styles.footer}
      footer={scrollActions ? undefined : actions}
    >
      <View style={styles.intro}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Ami welcomes you to ShipingIT."
          style={styles.hero}
        >
          <GameActor character="ami" motion="celebrate" size={actorSize} />
        </View>
        <View style={styles.pitch}>
          <T variant="title" accessibilityRole="header" style={styles.center}>
            Make an app. Start with people.
          </T>
        </View>
      </View>
      {scrollActions ? actions : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingVertical: space.md },
  wordmark: { fontFamily: fonts.heavy, color: colors.primaryDeep, fontSize: 30, lineHeight: 38 },
  content: { paddingTop: space.sm, paddingBottom: space.xl, justifyContent: 'center' },
  scrollContent: { justifyContent: 'space-between', gap: space.xxl },
  intro: { alignItems: 'center', justifyContent: 'center', gap: space.xl },
  hero: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  pitch: { width: '100%', maxWidth: 360, alignItems: 'center' },
  center: { textAlign: 'center' },
  footer: { borderTopWidth: 0, paddingTop: space.sm },
  footerContent: { maxWidth: 440 },
  actions: { width: '100%', gap: space.md },
  privacy: { alignSelf: 'center' },
});
