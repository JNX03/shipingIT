import { Pressable, StyleSheet, View } from 'react-native';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';
import { proUpgradeBenefits, type ProUpgradeKind } from './pro-upgrade';

/** Confirmed-access content and exits are available from the first animation frame. */
export function ProUpgradeDetails({ kind, sandbox }: { kind: ProUpgradeKind; sandbox: boolean }) {
  return (
    <View style={styles.content} testID="pro-upgrade-confirmed">
      <T variant="title" accessibilityRole="header" style={styles.center}>
        {kind === 'restore' ? 'Your Pro tools are restored' : 'Your toolkit is now Pro'}
      </T>
      {sandbox ? (
        <T variant="caption" style={[styles.center, { color: colors.warning }]}>
          TEST STORE / SANDBOX · TEST ACCESS ONLY
        </T>
      ) : null}
      <View style={styles.benefits}>
        {proUpgradeBenefits.map((benefit) => (
          <View key={benefit} style={styles.benefit}>
            <View accessible={false} style={styles.dot} />
            <T style={{ flex: 1 }}>{benefit}</T>
          </View>
        ))}
      </View>
      <T variant="small" style={[styles.center, { color: colors.textSecondary }]}>
        Core lessons stay free. Buying Pro never raises your learning rank.
      </T>
    </View>
  );
}

/** Sticky-footer actions remain usable during every transformation phase, including reduced motion. */
export function ProUpgradeActions({
  playing,
  onContinue,
  onSkip,
}: {
  playing: boolean;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to learning"
        onPress={onContinue}
        testID="pro-upgrade-continue"
        style={({ pressed }) => [styles.continue, pressed && styles.pressed]}
      >
        <T variant="button">Continue</T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Skip upgrade animation' : 'Back to membership details'}
        onPress={onSkip}
        testID="pro-upgrade-skip"
        style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
      >
        <T variant="small" style={{ color: colors.primaryPressed }}>
          {playing ? 'Skip animation' : 'Membership details'}
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  center: { textAlign: 'center' },
  benefits: {
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySurface,
  },
  benefit: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.primaryPressed },
  continue: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.primaryPressed,
    borderBottomWidth: 4,
    borderColor: colors.primaryDeep,
  },
  skip: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  pressed: { opacity: 0.75 },
});
