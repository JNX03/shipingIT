import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { missions, getLesson } from '@/data/curriculum';
import { useAppStore } from '@/store/app-store';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useSubscription } from '@/hooks/use-subscription';
import { useLessonAccess } from '@/hooks/use-lesson-access';
import { getTaskGuide, learningGuideIndex } from '@/data/learning-guides';
import { offlineMentor } from '@/services/mentor-offline';
import type { MentorRequest, MentorResponse } from '@/services/contracts';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { mentorProvider } from '@/services/ai';
import { serviceConfig } from '@/services/config';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button, IconButton } from '@/components/ui/button';
import { GameActor } from '@/game/components/actor';
import { colors, fonts, layout, radius, space, typography } from '@/theme';
import {
  createConversation,
  deriveAmiPresentation,
  AMI_REPLY_TALK_MS,
  focusChoices,
  focusDraft,
  type Conversation,
  type ConversationTurn,
  type Guidance,
  type MentorFocus,
  learningPrompts,
  conciseLearningHint,
  type AmiPresentation,
} from './conversation';

const guidanceChoices: { field: Guidance; label: string }[] = [
  { field: 'nextAction', label: 'Next step' },
  { field: 'challenge', label: 'Think' },
  { field: 'evidencePrompt', label: 'Evidence' },
];

function Ami({ presentation, size = 64 }: { presentation: AmiPresentation; size?: number }) {
  return (
    <View accessible accessibilityLabel="Ami, your project guide">
      <GameActor
        character="ami"
        motion={presentation.motion}
        active={presentation.active}
        size={size}
      />
    </View>
  );
}

function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      aria-pressed={selected}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected
          ? colors.primarySurface
          : pressed
            ? colors.surfaceMuted
            : colors.surface,
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <T variant="small" style={{ color: selected ? colors.primaryDeep : colors.text }}>
        {label}
      </T>
    </Pressable>
  );
}

function Turn({
  turn,
  conversation,
  advancedAllowed,
  onHint,
  disabled,
  presentation,
}: {
  turn: ConversationTurn;
  conversation: Conversation;
  advancedAllowed: boolean;
  onHint: (turn: ConversationTurn, advanced?: boolean) => void;
  disabled: boolean;
  presentation: AmiPresentation;
}) {
  const label = focusChoices.find((choice) => choice.focus === turn.request.focus)?.label;
  return (
    <View style={{ gap: space.lg, paddingBottom: space.xl }}>
      <View style={{ alignSelf: 'flex-end', maxWidth: '88%', gap: space.xs }}>
        <T variant="caption" style={{ textAlign: 'right' }}>
          {turn.followup ? `${label} · Going deeper` : label}
        </T>
        <View
          style={{
            padding: space.lg,
            backgroundColor: colors.primarySurface,
            borderRadius: radius.large,
            borderBottomRightRadius: space.xs,
          }}
        >
          <T selectable>{turn.request.prompt}</T>
        </View>
      </View>
      {turn.answers.map((answer) => (
        <View
          key={answer.id}
          style={{ alignSelf: 'flex-start', width: '100%', flexDirection: 'row', gap: space.sm }}
        >
          {turn.id === presentation.turnId && answer.id === turn.answers.at(-1)?.id ? (
            <Ami presentation={presentation} />
          ) : null}
          <View style={{ flex: 1, minWidth: 0, maxWidth: '94%', gap: space.sm }}>
            <T variant="caption">{answer.response.mode === 'live' ? 'Ami' : 'Ami’s tips'}</T>
            <View
              style={{
                gap: space.md,
                padding: space.lg,
                borderRadius: radius.large,
                borderBottomLeftRadius: space.xs,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              {answer.notice ? (
                <T variant="small" selectable>
                  {answer.notice}
                </T>
              ) : null}
              <T selectable>{answer.response.message}</T>
              {answer.response[answer.guidance]?.trim() ? (
                <T selectable>{answer.response[answer.guidance]}</T>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {guidanceChoices
                .filter((choice) => answer.response[choice.field].trim())
                .map((choice) => (
                  <Chip
                    key={choice.field}
                    label={
                      answer.response.mode === 'offline' && choice.field === 'challenge'
                        ? 'Why'
                        : choice.label
                    }
                    selected={answer.guidance === choice.field}
                    onPress={() => conversation.selectGuidance(turn.id, answer.id, choice.field)}
                  />
                ))}
            </View>
          </View>
        </View>
      ))}
      {turn.status === 'pending' && turn.id === presentation.turnId ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ami presentation={presentation} />
          <T variant="small" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
            {turn.request.allowRemote ? 'Requesting an answer…' : 'Loading Ami’s tips…'}
          </T>
        </View>
      ) : null}
      {turn.notice ? (
        <T variant="small" selectable accessibilityLiveRegion="polite">
          {turn.notice}
        </T>
      ) : null}
      {['failed', 'cancelled'].includes(turn.status) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {!['limit', 'context'].includes(turn.errorCode ?? '') ? (
            <Button
              title="Try again"
              compact
              variant="secondary"
              uppercase={false}
              disabled={disabled}
              onPress={() => void conversation.retry(turn.id)}
            />
          ) : null}
          <Button
            title="Give me a hint"
            compact
            variant="quiet"
            uppercase={false}
            disabled={disabled}
            onPress={() => onHint(turn)}
          />
        </View>
      ) : null}
      {advancedAllowed && turn.request.intent === 'hint' ? (
        <Button
          title="Deeper local guide"
          variant="quiet"
          uppercase={false}
          compact
          disabled={disabled}
          onPress={() => onHint(turn, true)}
        />
      ) : null}
    </View>
  );
}

function ConsentPreview({ conversation }: { conversation: Conversation }) {
  const state = useSyncExternalStore(
    conversation.subscribe,
    conversation.getSnapshot,
    conversation.getSnapshot,
  );
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const consent = state.consent;
  if (!consent) return null;
  const notes = Object.entries(consent.request.project).filter(
    ([, value]) => typeof value === 'string' && value.trim(),
  );
  return (
    <View style={{ gap: space.md, paddingBottom: space.lg }}>
      <T variant="subheading" accessibilityRole="header">
        {consent.firstUse ? 'Chat with Ami?' : 'Review attached notes'}
      </T>
      <T>
        Ami uses an AI service to reply. Sending in this chat shares your question and up to six
        completed question-and-answer exchanges. Avoid names and personal details.
      </T>
      <T selectable style={{ color: colors.primaryDeep }}>
        {consent.request.prompt}
      </T>
      {consent.request.history?.length ? (
        <View style={{ gap: space.sm }}>
          <Button
            title={
              showHistory
                ? 'Hide recent chat'
                : 'Review recent chat (' + consent.request.history.length + ')'
            }
            variant="quiet"
            uppercase={false}
            onPress={() => setShowHistory(!showHistory)}
          />
          {showHistory
            ? consent.request.history.map((pair, index) => (
                <View key={index} style={{ gap: space.xs }}>
                  <T variant="caption">Your question</T>
                  <T selectable>{pair.question}</T>
                  <T variant="caption">Ami’s reply</T>
                  <T selectable>{pair.answer}</T>
                </View>
              ))
            : null}
        </View>
      ) : null}
      <T variant="small">
        Focus: {focusChoices.find((choice) => choice.focus === consent.request.focus)?.label}
      </T>
      {consent.request.attachProject ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showNotes }}
          onPress={() => setShowNotes(!showNotes)}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <T variant="small" style={{ color: colors.primaryPressed }}>
            {showNotes ? 'Hide included notes' : `Review included notes (${notes.length})`}
          </T>
        </Pressable>
      ) : (
        <T variant="small">No project notes are attached.</T>
      )}
      {showNotes && consent.request.attachProject ? (
        <View style={{ gap: space.md }}>
          {notes.length ? (
            notes.map(([key, value]) => (
              <View key={key} style={{ gap: space.xs }}>
                <T variant="caption">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}
                </T>
                <T selectable>{value}</T>
              </View>
            ))
          ) : (
            <T variant="small">There are no project notes to include.</T>
          )}
        </View>
      ) : null}
      <T variant="caption">
        {consent.firstUse
          ? 'This permission lasts only for this chat session. Project notes need a separate attachment review.'
          : 'Only the notes shown here will be attached to this message.'}
      </T>
    </View>
  );
}

export function MentorScreen() {
  const auth = useAuthGate();
  if (!auth.canPlay) return null;
  return (
    <MentorConversation key={`${auth.status?.mode}:${auth.status?.identity?.id ?? 'local'}`} />
  );
}

function MentorConversation() {
  const project = useAppStore((state) => state.project);
  const completed = useAppStore((state) => state.completedLessonIds);
  const lessonAccess = useLessonAccess();
  const params = useLocalSearchParams<{
    lessonId?: string;
    exerciseId?: string;
    taskId?: string;
    kind?: string;
  }>();
  const nextLessonId =
    missions.flatMap((unit) => unit.lessonIds).find((id) => !(lessonAccess.ready ? lessonAccess.passedLessonIds : completed).includes(id)) ??
    'discover-1';
  const currentLesson = getLesson(params.lessonId ?? nextLessonId) ?? getLesson(nextLessonId);
  const currentGuide =
    params.kind === 'challenge' && params.taskId
      ? getTaskGuide({ kind: 'challenge', challengeId: params.taskId })
      : params.kind === 'adventure' && params.taskId
        ? getTaskGuide({ kind: 'adventure', stageId: params.taskId })
        : currentLesson
          ? getTaskGuide({ kind: 'lesson', lessonId: currentLesson.id })
          : undefined;
  const visibleQuestion =
    (params.kind
      ? currentGuide?.goal
      : (learningGuideIndex.lessons[currentLesson?.id ?? '']?.exerciseCopy[
          (
            currentLesson?.exercises.find((exercise) => exercise.id === params.exerciseId) ??
            currentLesson?.exercises[0]
          )?.id ?? ''
        ]?.prompt ??
        currentLesson?.exercises.find((exercise) => exercise.id === params.exerciseId)?.prompt ??
        currentLesson?.exercises[0]?.prompt)) ??
    currentGuide?.goal ??
    'What small step could test your idea?';
  const entryPrompts = learningPrompts(
    currentGuide?.title ?? currentLesson?.title ?? 'Your current task',
    visibleQuestion,
  );
  const subscription = useSubscription();
  const [conversation] = useState(() =>
    createConversation(mentorProvider, { remoteConfigured: Boolean(serviceConfig.mentorUrl) }),
  );
  const [attachNotes, setAttachNotes] = useState(false);
  const state = useSyncExternalStore(
    conversation.subscribe,
    conversation.getSnapshot,
    conversation.getSnapshot,
  );
  const [prompt, setPrompt] = useState('');
  const [focus, setFocus] = useState<MentorFocus>('problem');
  const screenFocused = useIsFocused();
  const reduced = useMotionReduced();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [replyMotion, setReplyMotion] = useState<{ id: number; receivedAt: number } | null>(null);
  const [presentationTime, setPresentationTime] = useState(0);
  const [webAnnouncement, setWebAnnouncement] = useState<{ id: number; text: string } | null>(null);
  const focused = useRef(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = useRef<FlatList<ConversationTurn>>(null);
  const scrollNext = useRef(false);
  const lastAnnounced = useRef<number | undefined>(undefined);
  const currentChange = `${state.turns.at(-1)?.id ?? 0}:${state.turns.at(-1)?.answers.length ?? 0}:${state.consent ? 'review' : 'chat'}`;
  const latestAnswer = state.turns.at(-1)?.answers.at(-1);
  const presentation = deriveAmiPresentation(
    state,
    { focused: screenFocused, foreground, reduced },
    replyMotion,
    presentationTime,
  );
  const announcement = latestAnswer
    ? `${latestAnswer.response.mode === 'offline' ? 'Ami’s tips' : 'Ami'}: ${latestAnswer.response.message}`
    : '';
  useEffect(() => () => conversation.cancel(), [conversation]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setForeground(next === 'active');
      setPresentationTime(Date.now());
    });
    return () => subscription.remove();
  }, []);
  const latestAnswerId = latestAnswer?.id;
  useEffect(() => {
    if (latestAnswerId === undefined || !focused.current) {
      setReplyMotion(null);
      return;
    }
    const receivedAt = Date.now();
    setReplyMotion({ id: latestAnswerId, receivedAt });
    setPresentationTime(receivedAt);
    replyTimer.current = setTimeout(() => {
      replyTimer.current = null;
      setPresentationTime(receivedAt + AMI_REPLY_TALK_MS);
      setReplyMotion(null);
    }, AMI_REPLY_TALK_MS);
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      replyTimer.current = null;
    };
  }, [latestAnswerId]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        if (replyTimer.current) clearTimeout(replyTimer.current);
        replyTimer.current = null;
        setReplyMotion(null);
        conversation.cancel();
      };
    }, [conversation]),
  );
  useLayoutEffect(() => {
    scrollNext.current = true;
    list.current?.scrollToEnd({ animated: false });
  }, [currentChange]);
  useEffect(() => {
    if (
      !focused.current ||
      !screenFocused ||
      !foreground ||
      !latestAnswer ||
      latestAnswer.id === lastAnnounced.current
    )
      return;
    if (process.env.EXPO_OS === 'web') {
      // Update the live region after the rendered reply, without delaying the reply itself.
      const frame = requestAnimationFrame(() => {
        if (!focused.current) return;
        lastAnnounced.current = latestAnswer.id;
        setWebAnnouncement({ id: latestAnswer.id, text: announcement });
      });
      return () => cancelAnimationFrame(frame);
    }
    lastAnnounced.current = latestAnswer.id;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [latestAnswer, announcement, foreground, screenFocused]);
  const send = async () => {
    if (!focused.current) return;
    const question = prompt;
    const outcome = await conversation.sendChat(question, project, focus, attachNotes);
    if (outcome !== 'ignored') setAttachNotes(false);
    if (outcome === 'answered' && focused.current)
      setPrompt((draft) => (draft === question ? '' : draft));
  };
  const confirm = async () => {
    const question = state.consent?.request.prompt;
    const outcome = await conversation.confirmConsent();
    if (outcome === 'answered' && focused.current)
      setPrompt((draft) => (draft.trim() === question ? '' : draft));
  };
  const hint = (turn?: ConversationTurn, advanced = false) => {
    const selected = turn?.request.focus ?? focus;
    const question = turn?.request.prompt ?? prompt;
    const request: MentorRequest = {
      prompt: question,
      project: {},
      focus: selected,
      intent: 'hint',
      allowRemote: false,
    };
    const ids = {
      problem: 'discover-1',
      evidence: 'define-1',
      scope: 'scope-1',
      validation: 'validate-1',
      pitch: 'ship-1',
    };
    const guide = turn
      ? getTaskGuide({ kind: 'lesson', lessonId: ids[selected] })
      : (currentGuide ?? getTaskGuide({ kind: 'lesson', lessonId: ids[selected] }));
    const response: MentorResponse = guide
      ? {
          mode: 'offline',
          message:
            advanced && subscription.access.allowed
              ? (guide.why + '\n\n' + guide.steps.join('\n')).slice(0, 2000)
              : conciseLearningHint(guide.hint),
          challenge: guide.why,
          evidencePrompt: '',
          nextAction: '',
        }
      : offlineMentor(request);
    void conversation.giveHint(question, selected, response);
  };
  return (
    <Screen
      scroll={false}
      header={
        <PageHeader
          title="Ask Ami"
          action={
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                name="plus"
                label="New chat"
                onPress={() => {
                  conversation.newChat();
                  setPrompt('');
                  setAttachNotes(false);
                  setFocus('problem');
                }}
              />
              <IconButton
                name="book"
                label="Open my notebook"
                onPress={() => router.push('/notebook')}
              />
            </View>
          }
        />
      }
      footerContentStyle={{ maxWidth: layout.maxWidth, gap: space.sm }}
      footerStyle={{ paddingTop: space.sm, borderTopWidth: 1 }}
      footer={
        state.consent ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button
              title="Cancel"
              variant="secondary"
              uppercase={false}
              onPress={() => conversation.dismissConsent()}
              style={{ flexGrow: 1 }}
            />
            <Button
              title={state.consent.firstUse ? 'Agree and send' : 'Send message'}
              uppercase={false}
              onPress={() => {
                if (focused.current) void confirm();
              }}
              style={{ flexGrow: 1 }}
            />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Attach my project notes"
                accessibilityState={{ checked: attachNotes, disabled: state.busy }}
                aria-checked={attachNotes}
                disabled={state.busy}
                onPress={() => setAttachNotes(!attachNotes)}
                style={{ minHeight: 48, justifyContent: 'center', flex: 1 }}
              >
                <T variant="small">{attachNotes ? '✓ ' : ''}Attach my project notes</T>
              </Pressable>
              <Button
                title="Give me a hint"
                variant="quiet"
                compact
                uppercase={false}
                disabled={state.busy}
                onPress={() => hint()}
              />
            </View>
            {!currentGuide ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: space.sm, paddingBottom: space.xs }}
              >
                {focusChoices.map((choice) => (
                  <Chip
                    key={choice.focus}
                    label={choice.label}
                    selected={focus === choice.focus}
                    disabled={state.busy}
                    onPress={() => {
                      setFocus(choice.focus);
                      setPrompt((draft) => focusDraft(draft, choice.focus));
                    }}
                  />
                ))}
              </ScrollView>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
              <TextInput
                accessibilityLabel="Your question to Ami"
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Ask about your project…"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={2000}
                editable={!state.busy}
                autoCapitalize="sentences"
                textAlignVertical="top"
                style={[
                  typography.body,
                  {
                    flex: 1,
                    minWidth: 0,
                    minHeight: 52,
                    maxHeight: 144,
                    paddingHorizontal: space.md,
                    paddingVertical: space.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.large,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              />
              <Button
                title="Send"
                uppercase={false}
                disabled={state.busy || !prompt.trim()}
                onPress={() => void send()}
                compact
                style={{ flexShrink: 1, maxWidth: '40%' }}
              />
            </View>
            {state.busy ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                accessibilityLiveRegion="polite"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel this answer"
                  onPress={() => conversation.cancel()}
                  style={{ minHeight: 48, paddingHorizontal: space.sm, justifyContent: 'center' }}
                >
                  <T variant="small" style={{ color: colors.primaryPressed }}>
                    Cancel
                  </T>
                </Pressable>
              </View>
            ) : null}
            {process.env.EXPO_OS === 'web' ? (
              <View
                accessibilityLiveRegion="polite"
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
              >
                <T key={webAnnouncement?.id}>{webAnnouncement?.text ?? ''}</T>
              </View>
            ) : null}
          </>
        )
      }
    >
      {state.consent ? (
        <ScrollView
          key="consent"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingHorizontal: space.page,
            paddingBottom: space.lg,
            width: '100%',
            maxWidth: layout.maxWidth,
            alignSelf: 'center',
          }}
        >
          <ConsentPreview conversation={conversation} />
        </ScrollView>
      ) : (
        <FlatList
          ref={list}
          data={state.turns}
          keyExtractor={(turn) => String(turn.id)}
          renderItem={({ item }) => (
            <Turn
              turn={item}
              conversation={conversation}
              advancedAllowed={subscription.access.allowed}
              onHint={hint}
              disabled={state.busy || Boolean(state.consent)}
              presentation={presentation}
            />
          )}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingHorizontal: space.page,
            paddingBottom: space.lg,
            width: '100%',
            maxWidth: layout.maxWidth,
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          windowSize={5}
          onContentSizeChange={() => {
            if (scrollNext.current) {
              scrollNext.current = false;
              list.current?.scrollToEnd({ animated: false });
            }
          }}
          ListHeaderComponent={
            <View style={{ gap: space.md, paddingBottom: space.xl }}>
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                {presentation.turnId === null ? (
                  <Ami presentation={presentation} size={88} />
                ) : null}
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: space.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.large,
                  }}
                >
                  <T>
                    I’m Ami. Let’s work on{' '}
                    {currentGuide?.title ?? currentLesson?.title ?? 'your current task'}.
                  </T>
                </View>
              </View>
              <T variant="small" style={{ fontFamily: fonts.regular }}>
                {serviceConfig.mentorUrl
                  ? 'Ask your question, or choose a local hint. Project notes are excluded unless you attach them.'
                  : 'Chat is not connected yet. You can still use the local hints.'}
              </T>
              <View style={{ gap: space.sm }}>
                <T variant="caption">CURRENT LEARNING TASK</T>
                <T variant="small">{currentGuide?.goal ?? visibleQuestion}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  <Chip
                    label="Why this step?"
                    onPress={() => {
                      const request: MentorRequest = {
                        prompt: entryPrompts[0],
                        project: {},
                        focus,
                        intent: 'hint',
                      };
                      const base = offlineMentor(request);
                      void conversation.giveHint(entryPrompts[0], focus, {
                        ...base,
                        message: currentGuide?.why ?? base.message,
                        challenge: '',
                        evidencePrompt: '',
                        nextAction: '',
                      });
                    }}
                  />
                  <Chip label="Give me a hint" onPress={() => hint()} />
                  <Chip label="Explain a mistake" onPress={() => setPrompt(entryPrompts[2])} />
                </View>
                <Button
                  title="Read the question"
                  variant="quiet"
                  compact
                  uppercase={false}
                  onPress={() =>
                    void conversation.giveHint('Read the question', focus, {
                      mode: 'offline',
                      message: visibleQuestion,
                      challenge: '',
                      evidencePrompt: '',
                      nextAction: '',
                    })
                  }
                />
              </View>
              {state.trimmed ? (
                <T variant="caption">
                  Showing your latest 20 questions. This chat isn’t saved between app sessions.
                </T>
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}
