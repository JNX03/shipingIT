import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { T } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GameActor } from '@/game/components/actor';
import { activityArt } from '@/game/activity-art';
import { colors, radius, space } from '@/theme';

export function AccountToolbar({
  title,
  onBack,
  disabled,
  step,
  methodChoice = false,
}: {
  title: string;
  onBack: () => void;
  disabled: boolean;
  step?: 1 | 2;
  methodChoice?: boolean;
}) {
  return (
    <View style={styles.toolbar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onBack}
        style={styles.back}
        testID="account-back"
      >
        <Icon name="back" color={disabled ? colors.muted : colors.textSecondary} size={30} />
      </Pressable>
      {step || methodChoice ? (
        <>
          <ProgressBar
            value={step ? step / 2 : 0}
            height={14}
            label={step ? `${title}, step ${step} of 2` : 'Choose an account method'}
          />
          {step ? (
            <T variant="small" style={styles.count}>
              {step}/2
            </T>
          ) : null}
        </>
      ) : (
        <>
          <T variant="subheading" accessibilityRole="header" style={styles.toolbarTitle}>
            {title}
          </T>
          <View style={styles.back} />
        </>
      )}
    </View>
  );
}

/** Ami guides the account step; the method choice uses a clear title above the hero. */
export function AccountPrompt({
  message,
  compact = false,
  thinking = false,
  phone = false,
  condensed = false,
}: {
  message: string;
  compact?: boolean;
  thinking?: boolean;
  phone?: boolean;
  condensed?: boolean;
}) {
  return (
    <View
      style={[
        styles.prompt,
        compact && styles.promptCompact,
        phone && styles.methodPrompt,
        phone && condensed && { gap: space.sm },
      ]}
    >
      <View style={phone ? styles.methodHeading : styles.speech}>
        <T
          variant={phone ? 'title' : 'heading'}
          accessibilityRole="header"
          style={phone ? undefined : styles.center}
        >
          {message}
        </T>
        {!phone ? <View pointerEvents="none" accessible={false} style={styles.caret} /> : null}
      </View>
      <View
        style={[
          styles.actorScene,
          phone && styles.phoneScene,
          phone && compact && styles.phoneSceneCompact,
          phone && condensed && styles.phoneSceneCondensed,
        ]}
      >
        {phone ? (
          <Image
            source={activityArt.authPhone}
            contentFit="contain"
            style={[styles.phone, compact && styles.phoneCompact]}
            accessible={false}
            alt=""
          />
        ) : null}
        <GameActor
          character="ami"
          motion={thinking ? 'thinking' : phone ? 'celebrate' : 'talk'}
          size={phone ? (condensed ? 112 : compact ? 144 : 204) : compact ? 150 : 168}
          style={phone ? styles.phoneActor : undefined}
        />
      </View>
    </View>
  );
}

export function AccountNotice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return (
    <T
      selectable
      variant="small"
      accessibilityLiveRegion="polite"
      style={{ color: success ? colors.success : colors.danger }}
    >
      {message}
    </T>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  back: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  toolbarTitle: { flex: 1, textAlign: 'center' },
  count: { minWidth: 34, textAlign: 'center', color: colors.textSecondary },
  prompt: { alignItems: 'center', gap: space.lg, paddingTop: space.sm },
  promptCompact: { gap: space.md, paddingTop: 0 },
  methodPrompt: { width: '100%', gap: space.lg },
  methodHeading: { width: '100%' },
  speech: {
    width: '100%',
    maxWidth: 360,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  caret: {
    position: 'absolute',
    bottom: -9,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: colors.surface,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  center: { textAlign: 'center' },
  actorScene: { width: 236, maxWidth: '100%', alignItems: 'center', position: 'relative' },
  phoneScene: { width: 272, minHeight: 224, justifyContent: 'center' },
  phoneSceneCompact: { minHeight: 152 },
  phoneSceneCondensed: { minHeight: 120 },
  phoneActor: { marginLeft: space.xxl },
  phone: { position: 'absolute', left: space.sm, bottom: 0, width: 132, height: 132 },
  phoneCompact: { width: 108, height: 108 },
});
