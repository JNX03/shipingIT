import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Host, Picker, Switch } from '@expo/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PageHeader, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';
import {
  auditStudyHints,
  chooseStudyExercise,
  chooseStudyHintStyle,
  createStudyBuddyDraft,
  normalizeStudyDraft,
  studyExercises,
  studyGoals,
  studyHintStyles,
  STUDY_INPUT_LIMIT,
  type StudyBuddyDraft,
  type StudyExerciseId,
  type StudyGoal,
  type StudyHintStyle,
} from './model';
import {
  authoredStudyService,
  createStudySessionController,
  type StudyAction,
  type StudyGuideService,
  type StudyHintFeedback,
  type StudySessionController,
} from './service';

export interface StudyBuddyTemplateProps {
  initialDraft?: StudyBuddyDraft;
  onDraftChange?: (draft: StudyBuddyDraft) => void;
  onExit?: () => void;
  /** Only true after host verification; endpoint presence alone is insufficient. */
  remoteReady?: boolean;
  remoteService?: StudyGuideService;
  mode?: 'build' | 'try';
  onModeChange?: (mode: 'build' | 'try') => void;
  showChrome?: boolean;
}

/** Standalone template screen. The host owns persistence and project selection. */
export function StudyBuddyTemplate({
  initialDraft,
  onDraftChange,
  onExit,
  remoteReady,
  remoteService,
  mode: controlledMode,
  onModeChange,
  showChrome = true,
}: StudyBuddyTemplateProps) {
  const [draft, setDraft] = useState(() => normalizeStudyDraft(initialDraft));
  const [localMode, setLocalMode] = useState<'build' | 'try'>('build');
  const mode = controlledMode ?? localMode;
  const setMode = onModeChange ?? setLocalMode;
  const update = (next: StudyBuddyDraft) => {
    const normalized = normalizeStudyDraft(next);
    setDraft(normalized);
    onDraftChange?.(normalized);
  };
  return (
    <Screen
      contentWidth={540}
      header={showChrome ?
        <PageHeader
          title={draft.appName.trim() || 'StudyBuddy AI'}
          subtitle="Your study app"
          action={
            onExit ? <Button title="Back" compact variant="quiet" onPress={onExit} /> : undefined
          }
        />
       : undefined}
    >
      {showChrome ? <View style={styles.tabs}>
        {(['build', 'try'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === item }}
            onPress={() => setMode(item)}
            testID={`study-tab-${item}`}
            style={[styles.tab, mode === item && styles.activeTab]}
          >
            <T
              variant="small"
              style={{ color: mode === item ? colors.primaryDeep : colors.textSecondary }}
            >
              {item === 'build' ? 'Build your app' : 'Try your app'}
            </T>
          </Pressable>
        ))}
      </View> : null}
      {mode === 'build' ? (
        <StudyBuddyBuilder draft={draft} onChange={update} onTry={showChrome ? () => setMode('try') : undefined} />
      ) : (
        <>
          <StudyBuddyPrototype
            draft={draft}
            remoteReady={remoteReady}
            remoteService={remoteService}
          />
          {showChrome ? <Button title="Edit your app" variant="secondary" onPress={() => setMode('build')} /> : null}
        </>
      )}
    </Screen>
  );
}

function StudyPicker<TValue extends string>({
  label,
  value,
  options,
  onChange,
  testID,
}: {
  label: string;
  value: TValue;
  options: readonly { id: TValue; label: string }[];
  onChange: (value: TValue) => void;
  testID: string;
}) {
  return (
    <View style={styles.pickerRow}>
      <T variant="small" style={styles.pickerLabel}>
        {label}
      </T>
      <Host matchContents seedColor={colors.primaryPressed}>
        <Picker selectedValue={value} onValueChange={onChange} testID={testID}>
          {options.map((option) => (
            <Picker.Item key={option.id} value={option.id} label={option.label} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}

export function StudyBuddyBuilder({
  draft,
  onChange,
  onTry,
}: {
  draft: StudyBuddyDraft;
  onChange: (draft: StudyBuddyDraft) => void;
  onTry?: () => void;
}) {
  const [editingPractice, setEditingPractice] = useState(false);
  const audit = auditStudyHints(draft);
  const patch = (value: Partial<StudyBuddyDraft>) => onChange({ ...draft, ...value });
  return (
    <View style={styles.stack} testID="study-builder">
      <View style={styles.intro}>
        <T variant="heading">Help a learner take the next step.</T>
        <T>Choose a goal, shape the hints, then test the chat you built.</T>
        <T variant="small">Authored practice is active. A live AI service is not connected.</T>
      </View>
      <Field
        label="App name"
        value={draft.appName}
        onChangeText={(appName) => patch({ appName })}
        multiline={false}
        maxLength={40}
        inputProps={{ testID: 'study-app-name' }}
      />
      <StudyPicker<StudyGoal>
        label="Learner goal"
        value={draft.goal}
        options={studyGoals}
        onChange={(goal) => patch({ goal })}
        testID="study-goal"
      />
      <StudyPicker<StudyHintStyle>
        label="Hint style"
        value={draft.hintStyle}
        options={studyHintStyles}
        onChange={(style) => onChange(chooseStudyHintStyle(draft, style))}
        testID="study-hint-style"
      />
      <StudyPicker<StudyExerciseId>
        label="Practice"
        value={draft.exerciseId}
        options={studyExercises.map((exercise) => ({ id: exercise.id, label: exercise.title }))}
        onChange={(id) => onChange(chooseStudyExercise(draft, id))}
        testID="study-exercise"
      />
      <Field
        label="Learner context (optional)"
        value={draft.learnerContext}
        onChangeText={(learnerContext) => patch({ learnerContext })}
        maxLength={600}
        placeholder="For example: I know basic algebra but get stuck choosing the first step."
        help="Only what you enter here appears in your local practice. Notebook notes are never read."
        inputProps={{ testID: 'study-context' }}
      />
      <Host
        matchContents={{ vertical: true }}
        style={{ width: '100%' }}
        seedColor={colors.primaryPressed}
      >
        <Switch
          label="Show expected vs actual feedback"
          value={draft.showKnowledgeCheck}
          onValueChange={(showKnowledgeCheck) => patch({ showKnowledgeCheck })}
          testID="study-knowledge-toggle"
        />
      </Host>
      <View style={styles.card}>
        <T variant="subheading">Your practice question</T>
        <T selectable>{draft.question}</T>
        <T variant="small">
          Three progressive hints ·{' '}
          {studyHintStyles.find((style) => style.id === draft.hintStyle)!.label}
        </T>
        <Button
          title={editingPractice ? 'Close practice editor' : 'Edit question and hints'}
          variant="secondary"
          onPress={() => setEditingPractice(!editingPractice)}
          testID="study-edit-practice"
        />
      </View>
      {editingPractice ? (
        <View style={styles.stack}>
          <Field
            label="Practice question"
            value={draft.question}
            maxLength={1200}
            onChangeText={(question) => patch({ question, exerciseId: 'custom' })}
            inputProps={{ testID: 'study-question-editor' }}
          />
          <Field
            label="Expected answer (optional)"
            value={draft.expectedAnswer}
            multiline={false}
            maxLength={120}
            onChangeText={(expectedAnswer) => patch({ expectedAnswer, exerciseId: 'custom' })}
            help="Used for a direct answer leak check and a text match. It cannot grade understanding."
            inputProps={{ testID: 'study-answer-editor' }}
          />
          {draft.hints.map((hint, index) => (
            <Field
              key={index}
              label={`Hint ${index + 1}`}
              value={hint}
              maxLength={400}
              onChangeText={(value) => {
                const hints = [...draft.hints] as StudyBuddyDraft['hints'];
                hints[index] = value;
                patch({ hints });
              }}
              inputProps={{ testID: `study-hint-editor-${index + 1}` }}
            />
          ))}
        </View>
      ) : null}
      <View style={[styles.card, !audit.valid && styles.warning]} testID="study-hint-audit">
        <T variant="subheading">Test: help without giving the answer</T>
        <T variant="small">Expected: {audit.expected}</T>
        <T variant="small" accessibilityLiveRegion="polite">
          Actual: {audit.actual}
        </T>
      </View>
      {onTry ? (
        <Button
          title="Try the chat I built"
          disabled={!audit.valid}
          onPress={onTry}
          testID="study-try-app"
        />
      ) : null}
    </View>
  );
}

function useStudySession(draft: StudyBuddyDraft, service: StudyGuideService) {
  const serviceRef = useRef(service);
  const [controller] = useState<StudySessionController>(() =>
    createStudySessionController(draft, service),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const signature = JSON.stringify(draft);
  const signatureRef = useRef(signature);
  useEffect(() => {
    if (signatureRef.current !== signature || serviceRef.current !== service) {
      signatureRef.current = signature;
      serviceRef.current = service;
      controller.reset(draft, service);
    }
  }, [controller, draft, signature, service]);
  useEffect(() => () => controller.reset(), [controller]);
  return { controller, snapshot };
}

const feedbackOptions: readonly { value: StudyHintFeedback; label: string }[] = [
  { value: 'helped', label: 'Helped me' },
  { value: 'gave-answer', label: 'Gave too much' },
  { value: 'unclear', label: 'Still unclear' },
];

/** Inline preview for My App. Wrap in the host's keyboard-safe scrollable screen. */
export function StudyBuddyPrototype({
  draft: sourceDraft,
  remoteReady = false,
  remoteService,
}: {
  draft?: StudyBuddyDraft;
  remoteReady?: boolean;
  remoteService?: StudyGuideService;
}) {
  const draft = normalizeStudyDraft(sourceDraft ?? createStudyBuddyDraft());
  const [consent, setConsent] = useState(false);
  const live = consent && remoteReady && Boolean(remoteService);
  const { controller, snapshot } = useStudySession(
    draft,
    live ? remoteService! : authoredStudyService,
  );
  const [input, setInput] = useState('');
  const [revealComparison, setRevealComparison] = useState(false);
  const [notice, setNotice] = useState('');
  const busy = snapshot.status === 'pending';
  const send = async (action: StudyAction) => {
    const submitted = input;
    const success = await controller.send(action, submitted);
    if (success && action !== 'hint') setInput((current) => (current === submitted ? '' : current));
    if (success && action === 'reply') setRevealComparison(false);
    if (success)
      setNotice(action === 'hint' ? 'A new hint is ready.' : 'Your message has a response.');
  };
  const restart = () => {
    controller.reset(draft);
    setInput('');
    setRevealComparison(false);
    setNotice('Practice restarted.');
  };
  const latestHint = [...snapshot.messages]
    .reverse()
    .find((message) => message.hintIndex !== undefined);
  return (
    <View style={styles.stack} testID="study-prototype">
      <View style={styles.intro}>
        <T variant="heading">{draft.appName.trim() || 'StudyBuddy AI'}</T>
        <T variant="small">
          {live ? 'Live AI enabled for this practice' : 'Authored practice · live AI is off'}
        </T>
        <T variant="small">
          {live
            ? 'The practice question, goal, hint style, typed message, and up to six completed chat turns are sent when you tap Ask, Reply, or Hint.'
            : 'This chat stays in this practice session.'}{' '}
          Your notebook and local study context are never sent.
        </T>
      </View>
      {remoteReady && remoteService ? (
        <View style={styles.card}>
          <T variant="small">
            Optional live AI uses the visible practice and chat. Switching modes starts a fresh
            chat.
          </T>
          <Host
            matchContents={{ vertical: true }}
            style={{ width: '100%' }}
            seedColor={colors.primaryPressed}
          >
            <Switch
              label="Use live AI in this practice"
              value={live}
              onValueChange={(value) => {
                setConsent(value);
                setNotice('');
                setRevealComparison(false);
              }}
              testID="study-ai-consent"
            />
          </Host>
        </View>
      ) : null}
      {draft.learnerContext.trim() ? (
        <View style={styles.card}>
          <T variant="caption">YOUR LOCAL STUDY CONTEXT</T>
          <T selectable>{draft.learnerContext}</T>
        </View>
      ) : null}
      <View style={styles.chat}>
        {snapshot.messages.map((message) => (
          <View
            key={message.id}
            testID={`study-message-${message.id}`}
            style={[styles.message, message.role === 'learner' && styles.learnerMessage]}
          >
            <T variant="caption" style={{ color: colors.primaryDeep }}>
              {message.role === 'learner'
                ? 'YOU'
                : message.hintIndex !== undefined
                  ? `${message.source === 'ai' ? 'AI' : 'AUTHORED'} HINT ${message.hintIndex + 1}`
                  : message.source === 'ai'
                    ? 'AI GUIDE'
                    : 'AUTHORED GUIDE'}
            </T>
            <T selectable>{message.text}</T>
            {message.feedback ? (
              <T variant="small">
                Your feedback:{' '}
                {feedbackOptions.find((item) => item.value === message.feedback)!.label}
              </T>
            ) : null}
          </View>
        ))}
      </View>
      {busy ? (
        <T variant="small" accessibilityLiveRegion="polite">
          {live ? 'Waiting for the AI response…' : 'Preparing an authored response…'}
        </T>
      ) : null}
      {snapshot.error ? (
        <View style={[styles.card, styles.warning]}>
          <T variant="small" accessibilityRole="alert">
            {snapshot.error}
          </T>
        </View>
      ) : null}
      <Field
        label="Your question or reply"
        value={input}
        onChangeText={setInput}
        maxLength={STUDY_INPUT_LIMIT}
        placeholder="Ask a question, or write the step you tried."
        help="Ask gives study guidance. Reply checks your attempt against the authored answer format."
        inputProps={{ testID: 'study-chat-input' }}
      />
      <View style={styles.actions}>
        <Button
          title="Ask"
          onPress={() => void send('ask')}
          disabled={busy || !input.trim()}
          style={styles.flexAction}
          testID="study-ask"
        />
        <Button
          title="Reply"
          onPress={() => void send('reply')}
          disabled={busy || !input.trim()}
          style={styles.flexAction}
          variant="secondary"
          testID="study-reply"
        />
      </View>
      <Button
        title={
          snapshot.hintCount >= 3 ? 'All three hints shown' : `Get hint ${snapshot.hintCount + 1}`
        }
        variant="secondary"
        disabled={busy || snapshot.hintCount >= 3}
        onPress={() => void send('hint')}
        testID="study-get-hint"
      />
      {latestHint ? (
        <View style={styles.card} testID="study-hint-feedback">
          <T variant="subheading">Did this hint help?</T>
          <T variant="small">Expected: a useful nudge while you do the thinking.</T>
          <View style={styles.feedbackOptions}>
            {feedbackOptions.map((option) => (
              <Button
                key={option.value}
                title={option.label}
                compact
                variant="secondary"
                selected={latestHint.feedback === option.value}
                onPress={() => controller.recordHintFeedback(latestHint.id, option.value)}
                testID={`study-feedback-${option.value}`}
              />
            ))}
          </View>
          <T variant="small">
            Actual:{' '}
            {latestHint.feedback
              ? `You reported: ${feedbackOptions.find((item) => item.value === latestHint.feedback)!.label}. This is your feedback, not an AI assessment.`
              : 'Try the hint, then record what happened.'}
          </T>
        </View>
      ) : null}
      {draft.showKnowledgeCheck && snapshot.check ? (
        <View style={styles.card} testID="study-answer-feedback">
          <T variant="subheading">Expected vs actual</T>
          <T variant="small">{snapshot.check.message}</T>
          {revealComparison ? (
            <>
              <T selectable>Expected: {snapshot.check.expected}</T>
              <T selectable>Actual reply: {snapshot.check.actual}</T>
            </>
          ) : (
            <Button
              title="Compare with the expected answer"
              variant="quiet"
              compact
              onPress={() => setRevealComparison(true)}
              testID="study-reveal-comparison"
            />
          )}
        </View>
      ) : null}
      <T variant="small" accessibilityLiveRegion="polite">
        {notice}
      </T>
      <Button title="Restart practice" variant="quiet" onPress={restart} testID="study-restart" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: {
    flex: 1,
    minHeight: 48,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: { backgroundColor: colors.primarySurface, borderColor: colors.primaryPressed },
  intro: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.primarySurface,
  },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  warning: { backgroundColor: colors.peach, borderColor: colors.warning },
  pickerRow: {
    gap: space.sm,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pickerLabel: { flexGrow: 1, color: colors.text },
  chat: { gap: space.md },
  message: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learnerMessage: { backgroundColor: colors.primarySurface, borderColor: colors.primarySurface },
  actions: { flexDirection: 'row', gap: space.md },
  flexAction: { flex: 1 },
  feedbackOptions: { gap: space.sm },
});
