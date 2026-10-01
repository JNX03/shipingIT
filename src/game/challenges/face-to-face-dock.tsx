import { ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, radius, space, typography } from '@/theme';
import type { Challenge } from './model';
import type { nextInterviewStep } from './logic';

export interface FaceToFaceDockProps {
  challenge: Challenge;
  step: ReturnType<typeof nextInterviewStep>;
  question: string;
  mode: 'choose' | 'ai' | 'practice';
  busy: boolean;
  pinFeedback: { valid: boolean; message: string } | null;
  onInput: (node: TextInput | null) => void;
  onQuestion: (value: string) => void;
  onMode: (mode: 'ai' | 'practice') => void;
  onAsk: () => void;
  onGuided: () => void;
  onHint?: () => void;
  onPin: (target: string) => void;
  onNext: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

/** Presentation only: the existing Interview controller owns consent, AI and clue proof. */
export function FaceToFaceDock({
  challenge,
  step,
  mode,
  pinFeedback,
  busy,
  question,
  onInput,
  onQuestion,
  onMode,
  onAsk,
  onGuided,
  onHint,
  onPin,
  onNext,
  onFocus,
  onBlur,
}: FaceToFaceDockProps) {
  const needsReply = !pinFeedback?.valid && step?.phase !== 'pin';
  return (
    <View style={{ gap: space.xs }}>
      <ScrollView
        style={{ maxHeight: 144 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: space.xs }}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'choose' ? (
          <>
            <T variant="caption">
              AI sends your question and six recent exchanges. No project notes.
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                title="Allow AI"
                compact
                uppercase={false}
                style={{ flex: 1 }}
                onPress={() => onMode('ai')}
              />
              <Button
                title="Guided practice"
                compact
                uppercase={false}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => onMode('practice')}
              />
            </View>
          </>
        ) : pinFeedback?.valid ? (
          <>
            <T variant="small" accessibilityLiveRegion="polite" style={{ color: colors.success }}>
              Clue pinned.
            </T>
            {step ? (
              <Button title="Next clue" compact uppercase={false} onPress={onNext} />
            ) : (
              <T variant="small">All clues are ready. Check your work below.</T>
            )}
          </>
        ) : step?.phase === 'pin' ? (
          <>
            <T variant="small">Pin: {step.item.title}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
              {challenge.targets.map((target) => (
                <Button
                  key={target.id}
                  title={target.title}
                  compact
                  uppercase={false}
                  variant="secondary"
                  style={{ flex: 1, minWidth: 120 }}
                  disabled={busy}
                  onPress={() => onPin(target.id)}
                />
              ))}
            </View>
            {pinFeedback ? (
              <T
                variant="caption"
                accessibilityLiveRegion="polite"
                style={{ color: colors.danger }}
              >
                {pinFeedback.message}
              </T>
            ) : null}
          </>
        ) : step?.question ? (
          <>
            <Button
              title={step.question}
              compact
              uppercase={false}
              variant="secondary"
              testID={`interview-guided-${step.item.id}`}
              disabled={busy}
              onPress={onGuided}
            />
            {mode === 'ai' && onHint ? (
              <Button title="Use a practice hint" compact uppercase={false} variant="quiet" disabled={busy} onPress={onHint} />
            ) : null}
          </>
        ) : (
          <T variant="small">All clues are pinned. Check your work below.</T>
        )}
      </ScrollView>
      {needsReply ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <TextInput
            ref={onInput}
            value={question}
            onChangeText={onQuestion}
            onFocus={onFocus}
            onBlur={onBlur}
            accessibilityLabel="Reply to the person"
            placeholder="Ask in your own words…"
            placeholderTextColor={colors.textSecondary}
            maxLength={400}
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={onAsk}
            style={{
              ...typography.body,
              flex: 1,
              minHeight: 48,
              paddingHorizontal: space.sm,
              borderWidth: 2,
              borderRadius: radius.control,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          />
          <Button
            title="Send"
            compact
            uppercase={false}
            haptic={false}
            loading={busy}
            disabled={busy || mode === 'choose' || !question.trim()}
            onPress={onAsk}
          />
        </View>
      ) : null}
    </View>
  );
}
