import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { GameActor } from '@/game/components/actor';
import { TaskBriefing } from './task-briefing';
import { getTaskGuide } from '@/data/learning-guides';
import type { GameCharacter } from '@/game/components/actor';
import { readCharacterLine, stopCharacterVoice } from '@/game/speech';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { useAppStore } from '@/store/app-store';
import {
  activityStoryContext,
  conversationLayout,
  storyReferenceKey,
} from '@/domain/story-conversation';
import {
  storyCharacterNames,
  storyGlossary,
  type StoryChapter,
  type StoryContentSelection,
  type StoryGlossaryId,
} from '@/data/storybook';
import { colors, radius, space } from '@/theme';

export { storyReferenceKey } from '@/domain/story-conversation';

/** Story scenes are part of the ordinary path and level opening, with no reward or save actions. */
export function StoryIntro({
  story,
  reference,
  compact = false,
}: {
  story: StoryChapter;
  reference?: StoryContentSelection;
  compact?: boolean;
}) {
  const refKey = reference ? storyReferenceKey(reference) : '';
  return (
    <View style={styles.content}>
      <TaskBriefing guide={reference ? getTaskGuide(reference) : undefined} />
      <ActivityConversation
        key={`${story.id}:${refKey}`}
        story={story}
        compact={compact}
        reference={reference}
      />
    </View>
  );
}

function ActivityConversation({
  story,
  compact,
  reference,
}: {
  story: StoryChapter;
  compact: boolean;
  reference?: StoryContentSelection;
}) {
  const { width, fontScale } = useWindowDimensions();
  const layout = conversationLayout(width, fontScale);
  const reduced = useMotionReduced();
  const sound = useAppStore((state) => state.settings.sound);
  const context = activityStoryContext(story, reference);
  const moments = context.moments;
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [moreContext, setMoreContext] = useState(false);
  const voiceVersion = useRef({ value: 0 });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const voice = voiceVersion.current;
    return () => {
      mounted.current = false;
      voice.value++;
      stopCharacterVoice();
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setSpeaking(null);
        voiceVersion.current.value++;
        stopCharacterVoice();
      };
    }, [setFocused, setSpeaking]),
  );
  if (!moments.length) return null;
  const listen = (id: string, text: string, character: GameCharacter) => {
    const version = ++voiceVersion.current.value;
    stopCharacterVoice();
    if (speaking === id) {
      setSpeaking(null);
      return;
    }
    setSpeaking(id);
    void readCharacterLine(text, () => {
      if (mounted.current && voiceVersion.current.value === version) setSpeaking(null);
    }, { character });
  };
  const bubble = (id: string, character: GameCharacter, text: string, title?: string) => {
    const guide = character === 'ami';
    return (
      <View
        key={id}
        style={[styles.conversation, guide && styles.guideRow, layout.stacked && styles.stacked]}
      >
        <View style={[styles.face, { width: layout.avatarSize, height: layout.avatarSize }]}>
          <GameActor
            character={character}
            motion={speaking === id ? 'talk' : 'still'}
            size={layout.avatarSize * (guide ? 3 : 2.5)}
            style={{
              position: 'absolute',
              left: -layout.avatarSize * (guide ? 1.05 : 0.75),
              top: -layout.avatarSize * (guide ? 0.4 : 0.27),
            }}
            active={focused && !reduced && speaking === id}
          />
        </View>
        <View
          style={[styles.bubble, guide && styles.guideBubble, layout.stacked && styles.fullBubble]}
        >
          <View style={styles.bubbleHeader}>
            <T variant="caption" style={styles.speaker}>
              {guide ? 'Ami' : storyCharacterNames[character]}
            </T>
            <Button
              title={speaking === id ? 'Stop' : 'Listen'}
              variant="quiet"
              compact
              uppercase={false}
              haptic={false}
              disabled={!sound || !focused}
              onPress={() => listen(id, text, character)}
            />
          </View>
          {title ? (
            <T variant="subheading" selectable>
              {title}
            </T>
          ) : null}
          <T variant={compact ? 'small' : 'body'} selectable>
            {text}
          </T>
          {!layout.stacked ? (
            <View
              pointerEvents="none"
              style={[styles.tail, guide ? styles.guideTail : styles.characterTail]}
            />
          ) : null}
        </View>
      </View>
    );
  };
  return (
    <View style={styles.content}>
      {!compact ? (
        <T variant="title" accessibilityRole="header">
          {story.title}
        </T>
      ) : null}
      {moreContext ? <T variant="small" selectable>{context.opening}</T> : null}
      {moreContext && context.stakes ? (
        <T variant="small" selectable>
          {context.stakes}
        </T>
      ) : null}
      {(moreContext ? moments : moments.slice(0, 1)).map((moment) => (
        <View key={moment.key} style={styles.moment}>
          {moment.dialogue
            ? bubble(`${moment.key}:dialogue`, moment.dialogue.speaker, moment.dialogue.text)
            : null}
          {moreContext || !moment.dialogue
            ? bubble(moment.key, 'ami', moment.text, moreContext ? moment.title : undefined)
            : null}
        </View>
      ))}
      {moreContext && context.ending ? (
        <View style={styles.ending}>
          <T variant="small" selectable>
            {context.ending}
          </T>
          <T variant="small" selectable>
            {context.nextQuestion}
          </T>
        </View>
      ) : null}
      <Button title={moreContext ? 'Less context' : 'More context'} variant="quiet" compact uppercase={false} onPress={() => setMoreContext(!moreContext)} />
      {moreContext ? <StoryWordHelp ids={story.glossary} /> : null}
    </View>
  );
}

/** Definitions remain available in an active lesson without leaving its current question. */
export function StoryWordHelp({ ids }: { ids: readonly StoryGlossaryId[] }) {
  const [words, setWords] = useState(false);
  if (!ids.length) return null;
  return (
    <View style={styles.content}>
      <Button
        title={words ? 'Hide word help' : 'Word help · English / ไทย'}
        variant="quiet"
        compact
        haptic={false}
        onPress={() => setWords(!words)}
      />
      {words
        ? ids.map((id) => {
            const word = storyGlossary[id];
            return (
              <View key={id} style={styles.word}>
                <T variant="subheading">
                  {word.english} · {word.thai}
                </T>
                <T variant="small" selectable>
                  {word.meaning}
                </T>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  moment: { gap: space.md },
  conversation: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  guideRow: { flexDirection: 'row-reverse' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  face: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.sky,
  },
  bubble: {
    flex: 1,
    minWidth: 0,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  fullBubble: { flex: undefined, width: '100%' },
  guideBubble: { backgroundColor: colors.primarySurface, borderColor: colors.sky },
  bubbleHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  speaker: { color: colors.primaryDeep },
  tail: {
    position: 'absolute',
    top: 20,
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  characterTail: { left: -7, borderTopWidth: 0, borderRightWidth: 0 },
  guideTail: {
    right: -7,
    backgroundColor: colors.primarySurface,
    borderColor: colors.sky,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  ending: { gap: space.sm },
  word: {
    padding: space.md,
    gap: space.xs,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.control,
  },
});
