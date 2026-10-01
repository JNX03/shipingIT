import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { LessonFeedback } from '@/components/learning/lesson-frame';
import { colors, radius, space, typography } from '@/theme';
import { feedback } from '@/utils/feedback';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { GameActor } from '../components/actor';
import { readCharacterLine, stopCharacterVoice } from '../speech';
import { DraggableItem, pointInRect, type DropEvent } from '../components/drag-item';
import {
  challengeCost,
  challengeProblems,
  interviewPlacementFeedback,
  nextInterviewStep,
  piecePlacementFeedback,
  INTERVIEW_RECENT_TURNS,
} from './logic';

import type { Challenge, ChallengeAction, ChallengeDraft, ChallengeItem } from './model';
import { StoryRoom } from './story-room';
import { roomForChallenge } from './room-layout';
import { interviewCharacter, type InterviewRequest } from '../interview';
import type { InterviewMessage } from '../types';
import { interviewQuestionForClue } from './registry';
import { FaceToFaceDock } from './face-to-face-dock';

export interface ChallengePlayProps {
  challenge: Challenge;
  draft: ChallengeDraft;
  onAction: (action: ChallengeAction) => void;
  /** The practice shell can own Run in its fixed action dock. */
  showTesterControls?: boolean;
}
function Deck({
  items,
  index,
  onIndex,
  onTap,
  onDrop,
  selected,
  disabled,
  canAdvance = true,
}: {
  items: ChallengeItem[];
  index: number;
  onIndex: (index: number) => void;
  onTap: (item: ChallengeItem) => void;
  onDrop: (event: DropEvent) => void;
  selected?: string | null;
  disabled?: boolean;
  canAdvance?: boolean;
}) {
  const item = items[index % items.length];
  if (!item) return null;
  return (
    <View style={styles.deck}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous piece"
        onPress={() => onIndex((index - 1 + items.length) % items.length)}
        style={styles.arrow}
      >
        <T variant="small" style={{ color: colors.primaryPressed }}>
          Prev
        </T>
      </Pressable>
      <DraggableItem
        key={item.id}
        id={item.id}
        disabled={disabled}
        onDrop={onDrop}
        onTap={() => onTap(item)}
        haptic={false}
        selected={selected === item.id}
        accessibilityLabel={`${item.title}. ${item.detail}${item.cost ? `. ${item.cost} build points` : ''}. Tap to select or hold and drag.`}
        style={[
          styles.piece,
          { borderColor: selected === item.id ? colors.primaryPressed : colors.accent },
        ]}
      >
        <View style={{ padding: space.sm, gap: 4 }}>
          <T variant="caption">
            PIECE {index + 1}/{items.length}
            {item.cost ? ` · ${item.cost} POINTS` : ''}
          </T>
          <T variant="subheading">{item.title}</T>
          <T variant="small" numberOfLines={3}>
            {item.detail}
          </T>
        </View>
      </DraggableItem>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next piece"
        disabled={disabled || !canAdvance}
        onPress={() => onIndex((index + 1) % items.length)}
        style={styles.arrow}
      >
        <T variant="small" style={{ color: colors.primaryPressed }}>
          Next
        </T>
      </Pressable>
    </View>
  );
}
function Interview({ challenge, draft, onAction, presentation = 'phone' }: ChallengePlayProps & { presentation?: 'phone' | 'scene' }) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [composing, setComposing] = useState(false);
  const [chatMode, setChatMode] = useState<'choose' | 'ai' | 'practice'>('choose');
  const [busy, setBusy] = useState(false);
  const [remoteReply, setRemoteReply] = useState<{ text: string; ai: boolean } | null>(null);
  const remoteHistory = useRef<InterviewMessage[]>([]);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [pinFeedback, setPinFeedback] = useState<{ valid: boolean; message: string } | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const voiceVersion = useRef({ value: 0 });
  const reduced = useMotionReduced();
  const step = nextInterviewStep(challenge, draft);
  const latest = draft.dialogue.at(-1);
  const earlier = draft.dialogue.slice(0, -1);
  const name = challenge.npc[0].toUpperCase() + challenge.npc.slice(1);
  const pinned = challenge.items.filter(
    (item) =>
      draft.assignments[item.id] === item.target &&
      draft.dialogue.some((line) => line.clue === item.id),
  ).length;
  const scene =
    challenge.id === 'explore-last-time'
      ? 'Shuttle stop'
      : challenge.id === 'explore-workaround'
        ? 'Lost-and-found desk'
        : (roomForChallenge(challenge.id)?.title ?? 'Interview');
  useEffect(() => {
    mounted.current = true;
    const voice = voiceVersion.current;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        voice.value++;
        stopCharacterVoice();
        setSpeaking(false);
      }
    });
    return () => {
      mounted.current = false;
      pending.current?.abort();
      voice.value++;
      stopCharacterVoice();
      subscription.remove();
    };
  }, []);
  const stopReading = () => {
    voiceVersion.current.value++;
    stopCharacterVoice();
    setSpeaking(false);
  };
  const read = () => {
    if (speaking) {
      stopReading();
      return;
    }
    const version = ++voiceVersion.current.value;
    setSpeaking(true);
    void readCharacterLine(remoteReply?.text ?? latest?.reply ?? challenge.opening, () => {
      if (voiceVersion.current.value === version) setSpeaking(false);
    }, { character: challenge.npc });
  };
  const send = async (text = question, guided = false) => {
    if (!text.trim() || busy || pending.current) return;
    stopReading();
    if (!guided && chatMode === 'choose') {
      setQuestion(text);
      return;
    }
    if (!guided && chatMode === 'ai') {
      setBusy(true);
      const controller = new AbortController();
      pending.current = controller;
      try {
        const response = await interviewCharacter({
          npcId: challenge.npc,
          scenarioId: challenge.id as InterviewRequest['scenarioId'],
          question: text,
          projectName: '',
          history: remoteHistory.current,
          remoteConsent: true,
          signal: controller.signal,
        });
        if (!mounted.current || controller.signal.aborted) return;
        setRemoteReply({ text: response.text, ai: response.source === 'ai' });
        if (response.source === 'ai') {
          remoteHistory.current = [
            ...remoteHistory.current,
            { id: 'question-' + Date.now(), role: 'learner', text, source: 'player' },
            {
              id: 'reply-' + Date.now(),
              role: 'character',
              text: response.text,
              source: 'ai',
              ...(response.evidenceId ? { evidenceId: response.evidenceId } : {}),
            },
          ].slice(-12) as InterviewMessage[];
          // The saved learning proof is always an authored question/action, never model text or a completion flag.
          const proofQuestion = response.evidenceId
            ? interviewQuestionForClue(challenge, response.evidenceId)
            : undefined;
          if (proofQuestion) onAction({ type: 'ask', question: proofQuestion, replyVersion: 2 });
        }
      } finally {
        if (mounted.current) setBusy(false);
        pending.current = null;
      }
    } else {
      setRemoteReply(null);
      onAction({ type: 'ask', question: text, replyVersion: 2 });
    }
    setQuestion('');
    setPinFeedback(null);
    setComposing(false);
    input.current?.blur();
    feedback('light');
  };
  const pin = (target: string) => {
    if (!step || step.phase !== 'pin') return;
    stopReading();
    const result = interviewPlacementFeedback(challenge, draft, step.item.id, target);
    onAction({ type: 'place', item: step.item.id, target });
    setPinFeedback(result);
    feedback(result.valid ? 'success' : 'error');
  };
  if (presentation === 'scene')
    return (
      <StoryRoom
        challenge={challenge}
        draft={draft}
        onTalk={() => setDialogueOpen(true)}
        dialogueOpen={dialogueOpen}
        onStopTalking={() => {
          stopReading();
          input.current?.blur();
          setDialogueOpen(false);
        }}
        latestLine={busy ? 'Let me think…' : remoteReply?.text ?? latest?.reply ?? challenge.opening}
        speaking={speaking}
        onReadLine={read}
        dialogueDock={
          <FaceToFaceDock
            challenge={challenge}
            step={step}
            question={question}
            mode={chatMode}
            busy={busy}
            pinFeedback={pinFeedback}
            onInput={(node) => { input.current = node; }}
            onQuestion={setQuestion}
            onMode={setChatMode}
            onAsk={() => void send()}
            onGuided={() => {
              if (step?.question)
                void send(step.question, chatMode !== 'ai' || remoteReply?.ai === false);
            }}
            onHint={() => { if (step?.question) void send(step.question, true); }}
            onPin={pin}
            onNext={() => {
              setPinFeedback(null);
              setHistory(false);
            }}
            onFocus={() => {
              stopReading();
              setComposing(true);
            }}
            onBlur={() => setComposing(false)}
          />
        }
      />
    );
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {!composing ? (
        <View
          style={[
            styles.interviewHeader,
            { backgroundColor: colors.primarySurface, paddingTop: space.sm },
          ]}
        >
          <GameActor character={challenge.npc} motion={speaking ? 'talk' : 'idle'} size={84} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="subheading">Talk with {name}</T>
            <T variant="small">{scene} · Practice scene</T>
            <T variant="caption">
              {pinned}/{challenge.items.length} notes pinned
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={speaking ? 'Stop reading aloud' : 'Read latest reply aloud'}
            onPress={read}
            style={styles.readControl}
          >
            <T variant="small" style={{ color: colors.primaryPressed }}>
              {speaking ? 'Stop' : 'Read aloud'}
            </T>
          </Pressable>
        </View>
      ) : null}
      <ScrollView
        ref={scroll}
        style={{ flex: 1, minHeight: 0 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !reduced })}
      >
        {earlier.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: history }}
            onPress={() => setHistory(!history)}
            style={styles.historyControl}
          >
            <T variant="small" style={{ color: colors.primaryPressed }}>
              {history ? 'Hide earlier questions' : 'Earlier questions (' + earlier.length + ')'}
            </T>
          </Pressable>
        ) : null}
        {!latest || history ? (
          <View style={[styles.bubble, styles.replyBubble]}>
            <T>{challenge.opening}</T>
          </View>
        ) : null}
        {history ? earlier.map((line, index) => <InterviewTurn key={index} line={line} />) : null}
        {remoteReply ? (
          <View style={[styles.bubble, styles.replyBubble]}>
            <T variant="caption">
              {remoteReply.ai
                ? 'AI ROLEPLAY · SIMULATED PERSON'
                : 'AI UNAVAILABLE · GUIDED PRACTICE AVAILABLE'}
            </T>
            <T>{remoteReply.text}</T>
          </View>
        ) : latest ? (
          <InterviewTurn line={latest} />
        ) : null}
        {busy ? <T accessibilityLiveRegion="polite">Waiting for {name}’s AI reply…</T> : null}
        {chatMode === 'choose' ? (
          <View style={{ gap: space.sm }}>
            <T variant="small">
              AI roleplay sends your question and up to six recent exchanges to the configured AI
              service. Your project notes are not attached.
            </T>
            <Button
              title="Allow AI roleplay"
              compact
              uppercase={false}
              onPress={() => setChatMode('ai')}
            />
            <Button
              title="Use guided practice"
              compact
              uppercase={false}
              variant="secondary"
              onPress={() => setChatMode('practice')}
            />
          </View>
        ) : null}
        {pinFeedback?.valid ? (
          <LessonFeedback correct title="Clue pinned" explanation={pinFeedback.message}>
            {step ? (
              <Button
                title="Next clue"
                compact
                uppercase={false}
                onPress={() => {
                  setPinFeedback(null);
                  setHistory(false);
                }}
              />
            ) : (
              <T variant="small">
                All notes are ready. Run the final check below.
              </T>
            )}
          </LessonFeedback>
        ) : step?.phase === 'pin' ? (
          <View style={{ gap: space.sm }}>
            <T variant="caption">
              CLUE {step.index + 1}/{challenge.items.length} · PIN THIS NOTE
            </T>
            <T variant="subheading">{step.item.title}</T>
            <T variant="small">{step.item.detail}</T>
            <T variant="small">Where to pin: {step.target?.title}.</T>
            {challenge.targets.map((target) => (
              <Button
                key={target.id}
                title={'Pin under ' + target.title}
                compact
                uppercase={false}
                variant="secondary"
                onPress={() => pin(target.id)}
              />
            ))}
            {pinFeedback ? (
              <LessonFeedback
                correct={false}
                title="Check this clue"
                explanation={pinFeedback.message}
              >
                {null}
              </LessonFeedback>
            ) : null}
          </View>
        ) : step ? (
          <View style={{ gap: space.sm }}>
            <T variant="caption">
              CLUE {step.index + 1}/{challenge.items.length} · ASK FIRST
            </T>
            <T variant="small">Find out about {step.item.title.toLowerCase()}.</T>
            {step.question ? (
              <>
                <T>{step.question}</T>
                <Button
                  title={'Ask ' + name + ' this question'}
                  compact
                  uppercase={false}
                  testID={'interview-guided-' + step.item.id}
                  disabled={busy}
                  onPress={() =>
                    void send(step.question, chatMode !== 'ai' || remoteReply?.ai === false)
                  }
                />
                {chatMode === 'ai' ? (
                  <Button
                    title="Use authored clue hint"
                    compact
                    uppercase={false}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void send(step.question, true)}
                  />
                ) : null}
              </>
            ) : null}
            <T variant="small">
              Or ask in your own words below. Read the answer, then pin its clue.
            </T>
          </View>
        ) : (
          <View accessibilityLiveRegion="polite" style={styles.clueNotice}>
            <T variant="small" style={{ color: colors.success }}>
              All notes are pinned. Run the final check below.
            </T>
          </View>
        )}
      </ScrollView>
      {draft.dialogue.length >= INTERVIEW_RECENT_TURNS ? (
        <T variant="small" style={{ paddingHorizontal: 12 }}>
          Recent questions and every discovered clue stay available.
        </T>
      ) : null}
      <View style={styles.composer}>
        <TextInput
          ref={input}
          value={question}
          onChangeText={setQuestion}
          onFocus={() => {
            stopReading();
            setComposing(true);
          }}
          onBlur={() => setComposing(false)}
          accessibilityLabel="Ask a practice question"
          placeholder="Ask a follow-up…"
          placeholderTextColor={colors.textSecondary}
          maxLength={400}
          returnKeyType="send"
          onSubmitEditing={() => void send()}
          style={styles.input}
        />
        <Button
          title="Send"
          compact
          uppercase={false}
          disabled={!question.trim()}
          haptic={false}
          loading={busy}
          onPress={() => void send()}
        />
      </View>
    </View>
  );
}
function InterviewTurn({ line }: { line: ChallengeDraft['dialogue'][number] }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.bubble, styles.questionBubble]}>
        <T variant="caption" style={{ color: colors.primaryPressed }}>
          YOU
        </T>
        <T>{line.question}</T>
      </View>
      <View style={[styles.bubble, styles.replyBubble]}>
        <T variant="caption">AUTHORED PRACTICE REPLY</T>
        <T>{line.reply}</T>
        {line.clue ? (
          <T variant="caption" style={{ color: colors.success }}>
            CLUE REVEALED · PIN THE NOTE BELOW
          </T>
        ) : null}
      </View>
    </View>
  );
}
function Board({
  challenge,
  draft,
  onAction,
  empty,
  showTesterControls,
}: { empty?: string } & ChallengePlayProps) {
  const [active, setActive] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const [pieceCheck, setPieceCheck] = useState<{ valid: boolean; message: string } | null>(null);
  const zones = useRef<Record<string, View | null>>({});
  const locked = challenge.kind === 'repair' && draft.failedRuns === 0;
  const place = (item: string, target: string) => {
    const result = piecePlacementFeedback(challenge, item, target);
    onAction({ type: 'place', item, target });
    setSelected(null);
    setPieceCheck(result);
    setNotice('');
    feedback(result.valid ? 'success' : 'error');
  };
  const drop = (event: DropEvent) => {
    let hit = false,
      remaining = challenge.targets.length;
    for (const target of challenge.targets) {
      const zone = zones.current[target.id];
      if (!zone) {
        remaining--;
        continue;
      }
      zone.measureInWindow((x, y, width, height) => {
        if (!hit && pointInRect(event, { x, y, width, height })) {
          hit = true;
          place(event.id, target.id);
        }
        remaining--;
        if (!remaining && !hit) {
          setSelected(event.id);
          setNotice('Selected. Tap its destination.');
        }
      });
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.playContent} showsVerticalScrollIndicator={false}>
      {locked ? (
        <View style={styles.row}>
          <GameActor character={challenge.npc} size={64} />
          <T style={{ flex: 1 }}>{challenge.opening}</T>
        </View>
      ) : null}
      {challenge.items.length ? (
        <Deck
          items={challenge.items}
          index={active % challenge.items.length}
          onIndex={(index) => {
            setActive(index);
            setSelected(null);
            setPieceCheck(null);
          }}
          selected={selected}
          disabled={locked}
          canAdvance={
            draft.assignments[challenge.items[active % challenge.items.length].id] ===
            challenge.items[active % challenge.items.length].target
          }
          onDrop={drop}
          onTap={(item) => {
            setSelected(item.id);
            setPieceCheck(null);
            setNotice('Selected. Tap its destination.');
            feedback('selection');
          }}
        />
      ) : (
        <T>{empty}</T>
      )}
      <View style={challenge.kind === 'layout' ? styles.phone : styles.targets}>
        {challenge.targets.map((target) => {
          const assigned = challenge.items.filter(
            (item) => draft.assignments[item.id] === target.id,
          );
          return (
            <View
              ref={(view) => {
                zones.current[target.id] = view;
              }}
              key={target.id}
              collapsable={false}
              style={[
                styles.zone,
                challenge.kind === 'layout'
                  ? { width: '100%' }
                  : { flexBasis: challenge.targets.length === 2 ? '46%' : '100%' },
                selected && { borderColor: colors.primaryPressed },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${target.title}. ${assigned.map((item) => item.title).join(', ') || 'Empty'}. ${selected ? 'Place selected piece' : 'Select a piece first'}`}
                disabled={locked}
                onPress={() =>
                  selected
                    ? place(selected, target.id)
                    : setNotice('Select a piece, then tap a destination.')
                }
                style={{
                  padding: space.sm,
                  minHeight: challenge.kind === 'layout' ? 64 : 68,
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <T variant="caption">{target.title.toUpperCase()}</T>
                {assigned.length ? (
                  assigned.map((item) => (
                    <View
                      key={item.id}
                      style={
                        item.id === 'action' && challenge.kind === 'layout'
                          ? {
                              backgroundColor: colors.primaryPressed,
                              borderRadius: 8,
                              minHeight: draft.targetSize,
                              justifyContent: 'center',
                              paddingHorizontal: 8,
                            }
                          : undefined
                      }
                    >
                      <T
                        variant="small"
                        style={{
                          color:
                            challenge.kind === 'layout' && !draft.highContrast
                              ? colors.muted
                              : item.id === 'action' && challenge.kind === 'layout'
                                ? colors.surface
                                : colors.text,
                        }}
                      >
                        {item.title}
                      </T>
                    </View>
                  ))
                ) : (
                  <T variant="small">Drop here</T>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
      {challenge.kind === 'layout' || challenge.kind === 'repair' ? (
        <RepairTools {...{ challenge, draft, onAction }} disabled={locked} />
      ) : null}
      {notice ? (
        <T variant="caption" accessibilityLiveRegion="polite">
          {notice}
        </T>
      ) : null}
      {pieceCheck ? (
        <LessonFeedback
          correct={pieceCheck.valid}
          title={pieceCheck.valid ? 'Piece checked' : 'Check this piece'}
          explanation={pieceCheck.message}
        >
          {pieceCheck.valid && active < challenge.items.length - 1 ? (
            <Button
              title="Next piece"
              compact
              uppercase={false}
              onPress={() => {
                setActive(active + 1);
                setSelected(null);
                setPieceCheck(null);
              }}
            />
          ) : null}
        </LessonFeedback>
      ) : null}
      {['wire', 'repair', 'layout'].includes(challenge.kind) ? (
        <Tester {...{ challenge, draft, onAction, showTesterControls }} />
      ) : null}
    </ScrollView>
  );
}
function RepairTools({
  challenge,
  draft,
  onAction,
  disabled,
}: ChallengePlayProps & { disabled: boolean }) {
  return (
    <View style={{ gap: space.sm }}>
      {challenge.needsSize ? (
        <View style={styles.row}>
          <Button
            title="−"
            compact
            variant="secondary"
            disabled={disabled || draft.targetSize <= 28}
            onPress={() => onAction({ type: 'size', value: draft.targetSize - 4 })}
          />
          <T variant="small" style={{ flex: 1, textAlign: 'center' }}>
            Action target: {draft.targetSize}px
          </T>
          <Button
            title="+"
            compact
            variant="secondary"
            disabled={disabled || draft.targetSize >= 64}
            onPress={() => onAction({ type: 'size', value: draft.targetSize + 4 })}
          />
        </View>
      ) : null}
      {challenge.needsContrast ? (
        <Button
          title={draft.highContrast ? 'Contrast repaired · undo' : 'Strengthen text contrast'}
          compact
          variant="secondary"
          disabled={disabled}
          onPress={() => onAction({ type: 'contrast', value: !draft.highContrast })}
        />
      ) : null}
    </View>
  );
}
function Tester({ draft, onAction, showTesterControls = true }: ChallengePlayProps) {
  const messages = draft.tests?.messages ?? [];
  const [showDetails, setShowDetails] = useState(false);
  const run = () => {
    setShowDetails(false);
    onAction({ type: 'run' });
    feedback('light');
  };
  if (draft.tests)
    return (
      <View
        style={[
          styles.testResult,
          { backgroundColor: draft.tests.passed ? colors.successSurface : colors.dangerSurface },
        ]}
      >
        <LessonFeedback
          correct={draft.tests.passed}
          title={draft.tests.passed ? 'This version works!' : 'Repair and rerun'}
          explanation={messages[0] ?? 'Run the tester journey on this version.'}
        >
          <>
            {messages.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showDetails }}
                onPress={() => setShowDetails(!showDetails)}
                style={styles.historyControl}
              >
                <T variant="small" style={{ color: colors.primaryPressed }}>
                  {showDetails ? 'Hide tester details' : `${messages.length} tester notes`}
                </T>
              </Pressable>
            ) : null}
            {showDetails
              ? messages.slice(1).map((message, index) => (
                  <T key={index} variant="small">
                    {message}
                  </T>
                ))
              : null}
            {showTesterControls ? (
              <Button
                title="Run again"
                compact
                variant="secondary"
                uppercase={false}
                haptic={false}
                onPress={run}
              />
            ) : null}
          </>
        </LessonFeedback>
      </View>
    );
  if (!showTesterControls) return null;
  return (
    <Button
      title="Run this version"
      compact
      variant="secondary"
      uppercase={false}
      haptic={false}
      onPress={run}
    />
  );
}
function Packing({ challenge, draft, onAction }: ChallengePlayProps) {
  const [active, setActive] = useState(0),
    [notice, setNotice] = useState('');
  const [reviewed, setReviewed] = useState<string[]>([]);
  const tray = useRef<View>(null),
    shelf = useRef<View>(null);
  const used = challengeCost(challenge, draft),
    compact = useWindowDimensions().height < 750;
  const pack = (id: string) => {
    const item = challenge.items.find((feature) => feature.id === id)!;
    onAction({ type: 'pack', item: id });
    setReviewed([...new Set([...reviewed, id])]);
    const missing = (item.requires ?? []).filter(
      (dependency) => !draft.packed.includes(dependency),
    );
    setNotice(
      `${item.title} added (${item.cost ?? 0} points). ${missing.length ? 'Also needs ' + missing.map((dependency) => challenge.items.find((feature) => feature.id === dependency)?.title).join(', ') + '.' : 'Its dependencies are included.'}`,
    );
    feedback('light');
  };
  const unpack = (id: string) => {
    onAction({ type: 'unpack', item: id });
    setReviewed([...new Set([...reviewed, id])]);
    setNotice(
      `${challenge.items.find((item) => item.id === id)?.title} left out. Check that the remaining version still covers the user’s task.`,
    );
    feedback('selection');
  };
  const drop = (event: DropEvent) => {
    let hit = false;
    for (const [kind, zone] of [
      ['tray', tray.current],
      ['shelf', shelf.current],
    ] as const)
      zone?.measureInWindow((x, y, width, height) => {
        if (!hit && pointInRect(event, { x, y, width, height })) {
          hit = true;
          if (kind === 'tray') pack(event.id);
          else unpack(event.id);
        }
      });
  };
  const activeItem = challenge.items[active];
  return (
    <ScrollView contentContainerStyle={styles.playContent}>
      <View style={styles.row}>
        <T variant="subheading" style={{ flex: 1 }}>
          Build budget
        </T>
        <T
          variant="heading"
          style={{ color: used > (challenge.budget ?? 0) ? colors.danger : colors.primaryPressed }}
        >
          {used}/{challenge.budget}
        </T>
      </View>
      <View ref={tray} collapsable={false} style={[styles.tray, { height: compact ? 120 : 160 }]}>
        <T variant="caption">FIRST VERSION · DROP HERE</T>
        <ScrollView
          nestedScrollEnabled
          contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
        >
          {draft.packed.length ? (
            draft.packed.map((id) => {
              const item = challenge.items.find((part) => part.id === id)!;
              return (
                <DraggableItem
                  key={id}
                  id={id}
                  onDrop={drop}
                  onTap={() => unpack(id)}
                  accessibilityLabel={`${item.title}, packed. Tap to return or drag to shelf.`}
                  style={styles.packed}
                >
                  <T variant="small" style={{ padding: 8 }}>
                    {item.title} · {item.cost}
                  </T>
                </DraggableItem>
              );
            })
          ) : (
            <T variant="small">Pack the smallest complete solution.</T>
          )}
        </ScrollView>
      </View>
      <View ref={shelf} collapsable={false} style={{ zIndex: 20, gap: space.xs }}>
        <T variant="caption">FEATURE SHELF · RETURN EXTRAS HERE</T>
        <Deck
          items={challenge.items}
          index={active}
          onIndex={(index) => {
            setActive(index);
            setNotice('');
          }}
          canAdvance={reviewed.includes(activeItem.id) || draft.packed.includes(activeItem.id)}
          onDrop={drop}
          onTap={(item) => (draft.packed.includes(item.id) ? unpack(item.id) : pack(item.id))}
        />
        <Button
          title="Leave this feature out"
          compact
          variant="quiet"
          uppercase={false}
          onPress={() => unpack(activeItem.id)}
        />
        <T variant="caption">
          {activeItem.requires?.length
            ? `Needs ${activeItem.requires.map((id) => challenge.items.find((item) => item.id === id)?.title).join(' + ')}`
            : 'No dependency'}
          {draft.packed.includes(activeItem.id) ? ' · PACKED' : ''}
        </T>
      </View>
      <T
        accessibilityLiveRegion="polite"
        variant="small"
        style={{ color: used > (challenge.budget ?? 0) ? colors.danger : colors.text }}
      >
        {notice || challenge.opening}
      </T>
      {notice && active < challenge.items.length - 1 ? (
        <Button
          title="Next feature"
          compact
          uppercase={false}
          onPress={() => {
            setActive(active + 1);
            setNotice('');
          }}
        />
      ) : null}
      {challengeProblems(challenge, draft)[0] ? (
        <T variant="small">Whole version: {challengeProblems(challenge, draft)[0]}</T>
      ) : null}
    </ScrollView>
  );
}
function InterviewJourney(props: ChallengePlayProps) {
  const room = roomForChallenge(props.challenge.id);
  if (!room) return <Interview {...props} />;
  return <Interview {...props} presentation="scene" />;
}
export function ChallengePlay(props: ChallengePlayProps) {
  return props.challenge.kind === 'interview' ? (
    <InterviewJourney {...props} />
  ) : props.challenge.kind === 'pack' ? (
    <Packing {...props} />
  ) : (
    <Board {...props} />
  );
}
const styles = StyleSheet.create({
  playContent: { padding: space.sm, gap: space.sm, paddingBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, padding: space.sm },
  deck: { flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 20 },
  arrow: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  piece: {
    flex: 1,
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: radius.sm,
    minHeight: 128,
  },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  zone: {
    flexGrow: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  phone: {
    alignSelf: 'center',
    width: '88%',
    padding: 8,
    gap: 6,
    borderWidth: 4,
    borderColor: colors.text,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  tray: {
    padding: space.sm,
    gap: space.sm,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderRadius: radius.control,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  packed: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  bubble: {
    maxWidth: '94%',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: space.md,
    gap: 6,
  },
  questionBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primarySurface,
    borderColor: '#BBDCF5',
    borderBottomRightRadius: 6,
  },
  replyBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
  },
  interviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  readControl: { minHeight: 48, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
  historyControl: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  chatContent: { paddingHorizontal: 12, paddingBottom: 12, gap: 12, flexGrow: 1 },
  questionHelp: { paddingHorizontal: 12, paddingBottom: 4 },
  questionIdea: {
    minHeight: 48,
    padding: 10,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: 'center',
  },
  clueNotice: { padding: 10, borderRadius: 12, backgroundColor: colors.successSurface },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderTopWidth: 2,
    borderColor: colors.border,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: space.sm,
  },
  testResult: {
    padding: space.md,
    gap: space.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
  },
});
