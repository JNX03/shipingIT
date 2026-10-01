import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { View } from 'react-native';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { mentorProvider } from '@/services/ai';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { GameActor } from '@/game/components/actor';
import { colors, radius, space } from '@/theme';
import { createProjectFeedback, type ProjectFeedbackInput } from './project-feedback-model';

export interface ProjectAnswerFeedbackHandle {
  requestReview(input: ProjectFeedbackInput): boolean;
  invalidate(): void;
  cancel(): void;
}
const short = (text: string, limit = 300) =>
  text.length > limit ? text.slice(0, limit).replace(/\s+\S*$/, '') + '…' : text;
export const ProjectAnswerFeedback = forwardRef<
  ProjectAnswerFeedbackHandle,
  { localHint: string; disabled?: boolean }
>(function ProjectAnswerFeedback({ localHint, disabled = false }, ref) {
  const [review] = useState(() => createProjectFeedback(mentorProvider));
  const state = useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
  const focused = useRef(false);
  const visible = useIsFocused();
  const [showAnswers, setShowAnswers] = useState(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        review.cancel();
      };
    }, [review]),
  );
  useEffect(() => () => review.cancel(), [review]);
  useImperativeHandle(
    ref,
    () => ({
      requestReview(input) {
        if (!focused.current) return false;
        setShowAnswers(false);
        return review.requestReview(input);
      },
      invalidate: review.invalidate,
      cancel: review.cancel,
    }),
    [review],
  );
  const message = state.result
    ? short(state.result.message)
    : (state.error ?? 'Check your draft when you’re ready.');
  const tryThis = state.result || state.error ? short(state.result?.nextAction.trim() || localHint, 160) : '';
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <GameActor
          character="ami"
          size={72}
          motion={state.busy ? 'thinking' : 'idle'}
          active={visible}
        />
        <View
          style={{
            flex: 1,
            minWidth: 0,
            padding: space.md,
            borderRadius: radius.card,
            backgroundColor: colors.primarySurface,
          }}
        >
          <T selectable accessibilityLiveRegion="polite">
            {state.busy ? 'Requesting one tip…' : message}
          </T>
        </View>
      </View>
      {tryThis ? (
        <T variant="small" selectable>
          Try this: {tryThis}
        </T>
      ) : null}
      {state.result ? (
        <T variant="caption">Advice only. Your lesson check and progress use the local rules.</T>
      ) : null}
      {state.consent && state.snapshot ? (
        <View style={{ gap: space.sm }}>
          <T variant="small">
            Send this question and only the answers shown below to Ami’s AI service for optional
            advice? No other notebook notes are included. Leave out names and personal details.
          </T>
          <T variant="small" selectable>
            {state.snapshot.question}
          </T>
          <Button
            title={showAnswers ? 'Hide answers' : 'Review my answers'}
            variant="quiet"
            compact
            uppercase={false}
            onPress={() => setShowAnswers(!showAnswers)}
          />
          {showAnswers
            ? state.snapshot.fields.map((field, index) => (
                <View key={index}>
                  <T variant="caption">
                    {field.label}
                    {field.excerpt ? ' (excerpt)' : ''}
                  </T>
                  <T selectable>{field.value}</T>
                </View>
              ))
            : null}
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button
              title="Not now"
              variant="secondary"
              uppercase={false}
              compact
              onPress={() => review.decline()}
            />
            <Button
              title="Ask Ami"
              uppercase={false}
              compact
              disabled={disabled}
              onPress={() => {
                if (focused.current) void review.approve();
              }}
            />
          </View>
        </View>
      ) : null}
      {state.busy ? (
        <Button
          title="Cancel feedback"
          variant="quiet"
          compact
          uppercase={false}
          onPress={() => review.cancel()}
        />
      ) : null}
    </View>
  );
});
