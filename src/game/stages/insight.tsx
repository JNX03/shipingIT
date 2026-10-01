import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { colors, radius, space, typography } from '@/theme';
import { feedback } from '@/utils/feedback';
import { DraggableItem, pointInRect, type DropEvent } from '../components/drag-item';
import { gameCharacterArt, gamePropArt } from '../art';
import type { GameStageProps } from '../types';
import {
  checkEvidenceSlot,
  checkResearchStage,
  evidenceById,
  hasRecordedEvidence,
  insightSentence,
  insightSlots,
  npcById,
  researchEvidence,
} from '../logic/research';

const shortQuestions: Record<string, string> = {
  person: 'Who?',
  problem: 'What happened?',
  cause: 'Why?',
  need: 'What would help?',
};
function PuzzleSpace({
  id,
  title,
  value,
  selected,
  shake,
  compact,
  onPress,
  register,
}: {
  id: string;
  title: string;
  value?: string;
  selected: boolean;
  shake: number;
  compact: boolean;
  onPress: () => void;
  register: (id: string, view: View | null) => void;
}) {
  const reduced = useMotionReduced();
  const x = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (shake && !reduced)
      x.set(
        withSequence(
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 60 }),
          withTiming(-2, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        ),
      );
  }, [shake, reduced, x]);
  useEffect(() => {
    if (value && !reduced) {
      scale.set(0.97);
      scale.set(
        withSpring(1, { duration: 300, dampingRatio: 0.8, reduceMotion: ReduceMotion.System }),
      );
    }
  }, [value, reduced, scale]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scale: scale.get() }],
  }));
  const evidence = value ? evidenceById(value) : undefined;
  return (
    <Animated.View
      style={[
        styles.puzzlePiece,
        animated,
        {
          minHeight: compact ? 96 : 112,
          borderColor: evidence
            ? colors.secondaryPressed
            : selected
              ? colors.primaryPressed
              : colors.border,
          backgroundColor: evidence ? colors.primarySurface : colors.surface,
        },
      ]}
    >
      <View ref={(view) => register(id, view)} collapsable={false} style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${evidence?.title ?? 'empty'}. ${selected ? 'Place the selected clue' : evidence ? 'Tap to return this clue to the tray' : 'Select a clue, then tap here'}`}
          onPress={onPress}
          style={{ flex: 1, padding: space.sm, gap: space.xs, justifyContent: 'center' }}
        >
          <View style={styles.slotLabel}>
            <T variant="caption" style={{ color: colors.primaryPressed }}>
              {title.toUpperCase()}
            </T>
            <View style={styles.jigsawTab} />
          </View>
          <T
            variant="small"
            numberOfLines={2}
            style={{ color: evidence ? colors.text : colors.textSecondary }}
          >
            {evidence?.title ?? shortQuestions[id]}
          </T>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function InsightStage({ draft, onChange, onComplete }: GameStageProps) {
  const { height } = useWindowDimensions();
  const compact = height < 750;
  const [selected, setSelected] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inspection, setInspection] = useState<'clue' | 'insight' | null>(null);
  const [notice, setNotice] = useState('');
  const [wrongSlot, setWrongSlot] = useState({ id: '', tick: 0 });
  const zones = useRef<Record<string, View | null>>({});
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);
  const cards = researchEvidence.filter(
    (item) => item.id === 'noa-claim' || hasRecordedEvidence(draft, item.id),
  );
  const activeCard = cards[Math.min(activeIndex, cards.length - 1)];
  const check = checkResearchStage('insight', draft);
  const assembled = insightSlots.filter((slot) => draft.insight.slots[slot.id]).length;
  const update = (slots: Record<string, string>) => {
    const insight = { ...latest.current.insight, slots };
    latest.current = { ...latest.current, insight };
    onChange({ insight });
  };
  const place = (id: string, destination: string) => {
    if (id !== 'noa-claim' && !hasRecordedEvidence(latest.current, id)) {
      setNotice('Collect this clue in Explore first.');
      return;
    }
    const result =
      destination === 'set-aside'
        ? { valid: id === 'noa-claim' }
        : checkEvidenceSlot(destination, id);
    if (!result.valid) {
      const evidence = evidenceById(id);
      setNotice(
        evidence?.kind === 'claim'
          ? 'An opinion. Set it aside.'
          : `Try ${evidence?.slot ?? 'another space'}.`,
      );
      setWrongSlot((current) => ({ id: destination, tick: current.tick + 1 }));
      feedback('error');
      return;
    }
    const slots = {
      ...Object.fromEntries(
        Object.entries(latest.current.insight.slots).filter(
          ([slot, card]) => slot !== destination && card !== id,
        ),
      ),
      [destination]: id,
    };
    update(slots);
    setSelected(null);
    setNotice(
      destination === 'set-aside'
        ? 'Opinion set aside.'
        : `${destination[0].toUpperCase()}${destination.slice(1)} connected.`,
    );
    feedback('success');
    const next = cards.findIndex((card) => !Object.values(slots).includes(card.id));
    if (next >= 0) setActiveIndex(next);
  };
  const drop = (event: DropEvent) => {
    const entries = Object.entries(zones.current).filter((entry): entry is [string, View] =>
      Boolean(entry[1]),
    );
    let remaining = entries.length;
    let hit = false;
    for (const [id, view] of entries)
      view.measureInWindow((x, y, width, height) => {
        if (!hit && pointInRect(event, { x, y, width, height })) {
          hit = true;
          place(event.id, id);
        }
        remaining--;
        if (!remaining && !hit) {
          setSelected(event.id);
          setNotice('Selected. Tap a puzzle space.');
        }
      });
  };
  const tapSpace = (id: string) => {
    if (selected) place(selected, id);
    else if (latest.current.insight.slots[id]) {
      const card = latest.current.insight.slots[id];
      const slots = { ...latest.current.insight.slots };
      delete slots[id];
      update(slots);
      setActiveIndex(
        Math.max(
          0,
          cards.findIndex((item) => item.id === card),
        ),
      );
      setNotice('Clue returned to the tray.');
      feedback('selection');
    } else setNotice('Tap the clue, then tap a space.');
  };
  const cycle = (direction: number) => {
    setActiveIndex((index) => (index + direction + cards.length) % cards.length);
    setSelected(null);
    setNotice('');
    feedback('selection');
  };
  if (inspection)
    return (
      <View style={styles.stage}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: space.page, gap: space.lg }}
        >
          <Image
            source={gamePropArt.evidence}
            style={{ width: 72, height: 80, alignSelf: 'center' }}
            contentFit="contain"
            accessible={false}
          />
          <T variant="heading">
            {inspection === 'clue' ? activeCard.title : 'Your connected insight'}
          </T>
          <T selectable>
            {inspection === 'clue' ? `“${activeCard.quote}”` : insightSentence(draft.insight.slots)}
          </T>
          <T variant="small">
            {inspection === 'clue' && activeCard.kind === 'claim'
              ? 'This is an authored challenge claim. Nobody has supplied observations to support it.'
              : 'These are clues from the simulated campus, not real-world research.'}
          </T>
          {inspection === 'clue' && assembled === 4 ? (
            <Button
              title="Read connected insight"
              variant="secondary"
              onPress={() => setInspection('insight')}
            />
          ) : null}
          {inspection === 'insight' ? (
            <View style={{ gap: space.sm }}>
              <T variant="caption">YOUR WORDS · OPTIONAL</T>
              <TextInput
                accessibilityLabel="Optional insight statement"
                multiline
                textAlignVertical="top"
                value={draft.insight.statement}
                onChangeText={(statement) => {
                  const insight = { ...latest.current.insight, statement };
                  latest.current = { ...latest.current, insight };
                  onChange({ insight });
                }}
                placeholder="Rewrite the insight in your own words…"
                placeholderTextColor={colors.textSecondary}
                maxLength={600}
                style={styles.statement}
              />
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button title="Back to puzzle" onPress={() => setInspection(null)} />
        </View>
      </View>
    );
  return (
    <View style={styles.stage}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, compact && { padding: space.sm, gap: space.sm }]}
      >
        <View style={styles.row}>
          <T variant="caption" style={{ flex: 1 }}>
            CLUE {activeIndex + 1}/{cards.length} · HOLD + DRAG
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read the current clue"
            onPress={() => setInspection('clue')}
            style={styles.read}
          >
            <T variant="caption" style={{ color: colors.primaryPressed }}>
              Read clue
            </T>
          </Pressable>
        </View>
        <View style={[styles.deck, { zIndex: 20 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous clue"
            onPress={() => cycle(-1)}
            style={styles.arrow}
          >
            <Icon name="back" size={22} color={colors.primaryPressed} />
          </Pressable>
          <DraggableItem
            key={activeCard.id}
            id={activeCard.id}
            haptic={false}
            onDrop={drop}
            onTap={() => {
              setSelected(activeCard.id);
              setNotice('Selected. Tap a puzzle space.');
              feedback('selection');
            }}
            selected={selected === activeCard.id}
            accessibilityLabel={`${activeCard.title}, ${Object.values(draft.insight.slots).includes(activeCard.id) ? 'already placed' : 'in tray'}, ${activeCard.kind === 'claim' ? 'authored challenge claim' : 'collected practice clue'}`}
            style={[
              styles.clue,
              {
                borderColor: selected === activeCard.id ? colors.primaryPressed : colors.accent,
                minHeight: compact ? 84 : 104,
              },
            ]}
          >
            <View
              style={{
                padding: space.sm,
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'center',
              }}
            >
              <Image
                source={gameCharacterArt[activeCard.npcId]}
                style={{ width: 46, height: 68 }}
                contentFit="contain"
                accessible={false}
              />
              <View style={{ flex: 1, gap: space.xs }}>
                <T variant="caption">{npcById(activeCard.npcId)?.name.toUpperCase()}</T>
                <T variant="small" numberOfLines={2} style={{ color: colors.text }}>
                  {activeCard.title}
                </T>
              </View>
            </View>
          </DraggableItem>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next clue"
            onPress={() => cycle(1)}
            style={styles.arrow}
          >
            <Icon name="next" size={22} color={colors.primaryPressed} />
          </Pressable>
        </View>
        <View style={styles.puzzle}>
          {insightSlots.map((slot) => (
            <PuzzleSpace
              key={slot.id}
              id={slot.id}
              title={slot.title}
              value={draft.insight.slots[slot.id]}
              compact={compact}
              selected={Boolean(selected)}
              shake={wrongSlot.id === slot.id ? wrongSlot.tick : 0}
              register={(id, view) => {
                zones.current[id] = view;
              }}
              onPress={() => tapSpace(slot.id)}
            />
          ))}
        </View>
        <View
          ref={(view) => {
            zones.current['set-aside'] = view;
          }}
          collapsable={false}
          style={[
            styles.reject,
            draft.insight.slots['set-aside'] && {
              borderColor: colors.secondaryPressed,
              backgroundColor: colors.surfaceMuted,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set aside unsupported claims, ${draft.insight.slots['set-aside'] ? 'payment claim set aside' : 'empty'}`}
            onPress={() => tapSpace('set-aside')}
            style={{ minHeight: 54, padding: space.sm, justifyContent: 'center' }}
          >
            <T variant="small" style={{ textAlign: 'center' }}>
              {draft.insight.slots['set-aside']
                ? 'Payment claim set aside'
                : 'Set aside an unsupported claim'}
            </T>
          </Pressable>
        </View>
        <T variant="caption" style={{ textAlign: 'center' }}>
          {assembled}/4 connected ·{' '}
          {draft.insight.slots['set-aside'] ? 'claim sorted' : '1 claim to set aside'}
        </T>
      </ScrollView>
      <View style={[styles.footer, compact && { padding: space.md }]}>
        <T
          accessibilityLiveRegion="polite"
          variant="small"
          style={{ color: check.valid ? colors.success : colors.text }}
        >
          {check.valid
            ? 'Your insight is ready.'
            : notice || 'Four pieces. One claim to set aside.'}
        </T>
        <Button
          title="Pack the first version"
          haptic={false}
          disabled={!check.valid}
          onPress={() => {
            if (checkResearchStage('insight', latest.current).valid) onComplete();
          }}
        />
      </View>
    </View>
  );
}
export default InsightStage;
const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  read: { minWidth: 78, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  deck: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  arrow: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  clue: {
    flex: 1,
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.peach,
  },
  puzzle: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  puzzlePiece: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 120,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.sm,
  },
  slotLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jigsawTab: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.sky,
    borderWidth: 2,
    borderColor: colors.primarySurface,
  },
  reject: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    borderRadius: radius.control,
  },
  statement: {
    ...typography.body,
    minHeight: 130,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: space.md,
  },
  footer: {
    padding: space.lg,
    gap: space.sm,
    borderTopWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
