import { useCallback, useLayoutEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet, RNHostView } from '@expo/ui';
import { useFocusEffect, useIsFocused } from 'expo-router';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { T } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { GameActor } from '@/game/components/actor';
import { GameLoading } from '@/game/components/loading';
import type { LessonEntryState } from '@/hooks/use-lesson-entry';
import { createInitialLessonExitState, createLessonExitFlow } from '@/domain/lesson-exit';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

/** Shared automatic entry scene for adventure, practice, and the lesson library. */
export function LessonEntry({
  entry,
  message,
  tip,
  scene = 'travel',
}: {
  entry: LessonEntryState;
  message: string;
  tip: string;
  scene?: 'studio' | 'travel' | 'thinking';
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <GameLoading message={message} scene={entry.error ? 'thinking' : scene} tip={tip} />
      {entry.error ? (
        <View style={{ padding: 20, gap: 12 }}>
          <T variant="small" accessibilityLiveRegion="polite" style={styles.error}>
            {entry.error}
          </T>
          <Button title="Retry opening lesson" onPress={entry.retry} />
        </View>
      ) : null}
    </View>
  );
}

export function LessonHeader({
  progress,
  label,
  onClose,
  count,
  color = colors.primary,
  disabled = false,
}: {
  progress: number;
  label: string;
  onClose: () => void;
  count?: string;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Leave lesson"
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={space.xs}
        onPress={onClose}
        style={({ pressed }) => [
          styles.close,
          disabled && { opacity: 0.45 },
          pressed && styles.closePressed,
        ]}
      >
        <View
          accessible={false}
          style={[styles.closeStroke, { transform: [{ rotate: '45deg' }] }]}
        />
        <View
          accessible={false}
          style={[styles.closeStroke, { transform: [{ rotate: '-45deg' }] }]}
        />
      </Pressable>
      <ProgressBar height={16} label={label} value={progress} color={color} />
      {count ? (
        <T variant="small" style={styles.count}>
          {count}
        </T>
      ) : null}
    </View>
  );
}

/** The activity stays mounted underneath. Leaving succeeds only after the caller's save. */
export function LessonExitSheet({
  visible,
  onKeep,
  onLeave,
  message,
  error,
  leaveLabel = 'Save and leave',
  keepLabel = 'Keep playing',
}: {
  visible: boolean;
  onKeep: () => void;
  onLeave: () => Promise<void>;
  message: string;
  error?: string;
  leaveLabel?: string;
  keepLabel?: string;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [exit, setExit] = useState(createInitialLessonExitState);
  const [flow] = useState(() =>
    createLessonExitFlow({
      onChange: setExit,
      onKeep,
      onLeave: async () => { await onLeave(); feedback('light'); },
    }),
  );
  useLayoutEffect(() => {
    flow.updateCallbacks({ onKeep, onLeave: async () => { await onLeave(); feedback('light'); } });
  }, [flow, onKeep, onLeave]);
  useFocusEffect(
    useCallback(() => {
      flow.activate();
      return () => flow.dispose();
    }, [flow]),
  );
  const { saving, failure, presentationKey } = exit;
  const presented = focused && (visible || exit.retryVisible);
  const visibleError = failure || error;
  return (
    <><BottomSheet
      key={presentationKey}
      isPresented={presented}
      onDismiss={() => flow.nativeDismiss(presentationKey)}
      containerColor={colors.surface}
      scrimColor="rgba(20,35,55,0.45)"
      contentPadding={{ top: 0, left: 16, right: 16, bottom: 0 }}
      shouldDismissOnBackPress={!saving}
      shouldDismissOnClickOutside={!saving}
      testID="lesson-exit-sheet"
    >
      <RNHostView matchContents>
        <View
          style={{
            width: Math.max(0, Math.min(width - space.xxl, 560)),
            height: Math.min(600, 520 * fontScale, height - insets.top - space.giant),
            paddingBottom: Math.max(space.md, insets.bottom),
          }}
          accessibilityViewIsModal
          onAccessibilityEscape={flow.keep}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.exitCopy}
            style={{ flex: 1 }}
          >
            <GameActor character="ami" motion={saving ? 'thinking' : 'disappointed'} size={saving ? 88 : 176} active={presented} />
            <T variant="title" accessibilityRole="header" style={styles.center}>
              {saving ? 'Saving…' : 'Keep your momentum?'}
            </T>
            {!saving ? <T style={[styles.center, styles.exitMessage]}>{message}</T> : null}
            {visibleError ? (
              <T selectable accessibilityLiveRegion="polite" variant="small" style={styles.error}>
                {visibleError}
              </T>
            ) : null}
          </ScrollView>
          <View style={styles.exitActions}>
            <Button title={keepLabel} disabled={saving} onPress={flow.keep} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                saving ? 'Saving…' : visibleError ? 'Retry save and leave' : leaveLabel
              }
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={() => void flow.leave()}
              style={({ pressed }) => [styles.leaveAction, pressed && styles.leaveActionPressed]}
            >
              {saving ? <ActivityIndicator color={colors.danger} /> : null}
              <T variant="button" style={{ color: colors.danger }}>
                {saving ? 'Saving…' : visibleError ? 'Retry save and leave' : leaveLabel}
              </T>
            </Pressable>
          </View>
        </View>
      </RNHostView>
    </BottomSheet>
    {saving && focused ? <View accessibilityViewIsModal accessibilityLiveRegion="polite" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(20,35,55,0.35)', justifyContent: 'center', alignItems: 'center' }}><View style={{ padding: 24, gap: 12, borderRadius: radius.control, backgroundColor: colors.surface, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /><T>Saving…</T></View></View> : null}
    </>
  );
}

export function LessonFeedback({
  correct,
  title,
  explanation,
  error,
  children,
}: {
  correct: boolean;
  title: string;
  explanation: string;
  error?: string;
  children: ReactNode;
}) {
  const reduced = useMotionReduced();
  const { height } = useWindowDimensions();
  const tone = correct ? colors.success : colors.danger;
  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      style={styles.feedback}
    >
      <ScrollView
        style={{ maxHeight: Math.max(100, height * 0.28) }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedbackCopy}
      >
        <View style={styles.feedbackHeading} accessibilityLiveRegion="polite">
          <View accessible={false} style={[styles.feedbackIcon, { backgroundColor: tone }]}>
            <Icon name={correct ? 'check' : 'close'} size={24} color={colors.surface} />
          </View>
          <T variant="title" accessibilityRole="header" style={{ color: tone, flex: 1 }}>
            {title}
          </T>
        </View>
        <T style={{ color: tone }}>{explanation}</T>
        {error ? (
          <T selectable accessibilityLiveRegion="polite" variant="small" style={styles.error}>
            {error}
          </T>
        ) : null}
      </ScrollView>
      {children}
    </Animated.View>
  );
}

export type ResultMetric = {
  label: string;
  value: ReactNode;
  accessibilityLabel: string;
  color: string;
};

export function LessonResultMetrics({
  metrics,
}: {
  metrics: [ResultMetric, ResultMetric, ResultMetric];
}) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 300;
  return (
    <View style={[styles.metrics, stacked && { flexDirection: 'column' }]}>
      {metrics.map((metric) => (
        <View
          key={metric.label}
          accessible
          accessibilityLabel={metric.accessibilityLabel}
          style={[styles.metric, { borderColor: metric.color }, stacked && styles.metricStacked]}
        >
          <View style={[styles.metricLabel, { backgroundColor: metric.color }]}>
            <T variant="caption" style={styles.metricLabelText}>
              {metric.label}
            </T>
          </View>
          <View style={styles.metricValue}>
            {typeof metric.value === 'string' || typeof metric.value === 'number' ? (
              <T variant="title" style={{ color: metric.color, textAlign: 'center' }}>
                {metric.value}
              </T>
            ) : (
              metric.value
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: space.giant,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
  },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    borderRadius: radius.control,
    borderCurve: 'continuous',
  },
  closePressed: { backgroundColor: colors.surfaceMuted },
  closeStroke: {
    position: 'absolute',
    width: 27,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted,
  },
  count: { fontVariant: ['tabular-nums'], flexShrink: 0 },
  center: { textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  exitCopy: {
    paddingTop: space.lg,
    paddingBottom: space.xl,
    paddingHorizontal: space.sm,
    gap: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  exitMessage: { maxWidth: 420 },
  exitActions: { gap: space.sm, paddingTop: space.sm },
  leaveAction: {
    minHeight: 52,
    padding: space.md,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
  },
  leaveActionPressed: { backgroundColor: colors.dangerSurface },
  feedback: { gap: space.lg },
  feedbackCopy: { gap: space.sm, paddingBottom: space.xs },
  feedbackHeading: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  feedbackIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: { flexDirection: 'row', gap: space.sm, width: '100%' },
  metric: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.large,
    borderCurve: 'continuous',
    overflow: 'hidden',
    minWidth: 0,
  },
  metricStacked: { flex: 0, width: '100%' },
  metricLabel: { paddingHorizontal: space.xs, paddingVertical: space.sm, alignItems: 'center' },
  metricLabelText: { color: colors.surface, textAlign: 'center' },
  metricValue: {
    minHeight: 80,
    paddingVertical: space.lg,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
