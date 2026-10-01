import { useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { GameIcon, type GameIconName } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import type { Exercise } from '@/domain/types';
import { GameActor } from '@/game/components/actor';
import { colors, radius, space } from '@/theme';
import { buildProExerciseHelp } from './pro-exercise-help';
import { useProLearningAccess } from './use-pro-learning-access';

export function ProLessonHelper({
  exercise,
  disabled = false,
}: {
  exercise: Exercise;
  disabled?: boolean;
}) {
  const access = useProLearningAccess();
  const requestPending = useRef(false);
  const [selection, setSelection] = useState({ exerciseId: exercise.id, step: -1 });
  const [layout, setLayout] = useState({ key: '', pages: [] as string[], page: 0 });
  const steps = buildProExerciseHelp(exercise);
  const open =
    selection.exerciseId === exercise.id &&
    selection.step >= 0 &&
    access.allowed &&
    !disabled;
  const source = access.checking
    ? 'Checking your access…'
    : access.message
      ? access.message
      : open
        ? steps[selection.step].lines.join('\n')
        : 'Need a little help?';
  const contentKey = `${exercise.id}:${source}`;
  const pages = Platform.OS === 'web'
    ? shortHelpPages(source)
    : layout.key === contentKey ? layout.pages : [];
  const page = Math.min(layout.key === contentKey ? layout.page : 0, Math.max(0, pages.length - 1));
  const more = !access.checking && page < pages.length - 1;
  const blocked = disabled || access.checking;

  const reveal = async (step: number) => {
    if (blocked || requestPending.current) return;
    requestPending.current = true;
    try {
      if (await access.verify()) setSelection({ exerciseId: exercise.id, step });
    } finally {
      requestPending.current = false;
    }
  };

  return (
    <View testID="ami-lesson-helper" style={{ flexDirection: 'row', gap: space.sm }}>
      <GameActor character="ami" motion="still" active={false} size={64} />
      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
        <View
          testID="ami-help-bubble"
          accessibilityLiveRegion="polite"
          style={{
            minHeight: 64,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: radius.control,
            backgroundColor: colors.surface,
            justifyContent: 'center',
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -7,
              top: 22,
              width: 12,
              height: 12,
              backgroundColor: colors.surface,
              borderLeftWidth: 2,
              borderBottomWidth: 2,
              borderColor: colors.border,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View>
            {/* Measure authored text at the actual width/font scale, then page
                two physical lines at a time without discarding the rest. */}
            <T
              variant="small"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}
              onTextLayout={({ nativeEvent }) => {
                const nextPages: string[] = [];
                for (let index = 0; index < nativeEvent.lines.length; index += 2)
                  nextPages.push(
                    nativeEvent.lines
                      .slice(index, index + 2)
                      .map((line) => line.text.trim())
                      .join('\n'),
                  );
                setLayout((current) =>
                  current.key === contentKey &&
                  current.pages.length === nextPages.length &&
                  current.pages.every((text, index) => text === nextPages[index])
                    ? current
                    : { key: contentKey, pages: nextPages, page: 0 },
                );
              }}
            >
              {source}
            </T>
            <T
              testID="ami-help-guidance"
              variant="small"
              selectable
              numberOfLines={Platform.OS === 'web' ? undefined : 2}
              style={{ color: colors.text }}
            >
              {pages[page] ?? source}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <HelpChip
            title="Hint"
            name="clue"
            selected={open && selection.step === 0}
            disabled={blocked}
            onPress={() => void reveal(0)}
          />
          <HelpChip
            title="Why"
            name="reason"
            selected={open && selection.step === 1}
            disabled={blocked}
            onPress={() => void reveal(1)}
          />
        </View>
        {more || open || access.message ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {more ? (
              <HelpAction
                title="More"
                label={`More Ami help, page ${page + 2} of ${pages.length}`}
                disabled={blocked}
                onPress={() => setLayout((current) => ({ ...current, key: contentKey, page: page + 1 }))}
              />
            ) : null}
            {open && selection.step !== 2 ? (
              <HelpAction title="Example" disabled={blocked} onPress={() => void reveal(2)} />
            ) : null}
            {open ? (
              <HelpAction
                title="Hide"
                onPress={() => setSelection({ exerciseId: exercise.id, step: -1 })}
              />
            ) : null}
            {access.message ? (
              <HelpAction
                title="View Pro"
                label="View Pro membership"
                disabled={disabled}
                onPress={() => router.push('/paywall')}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** RN Web has no text-layout callback; preserve every word in short readable pages. */
function shortHelpPages(text: string): string[] {
  const pages: string[] = [];
  let page = '';
  for (const word of text.split(/\s+/)) {
    if (page && page.length + word.length + 1 > 80) {
      pages.push(page);
      page = '';
    }
    page += `${page ? ' ' : ''}${word}`;
  }
  if (page) pages.push(page);
  return pages;
}

function HelpChip({
  title,
  name,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  name: GameIconName;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ask Ami: ${title}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        paddingHorizontal: space.sm,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderBottomWidth: pressed ? 1 : 3,
        borderColor: selected ? colors.primaryPressed : colors.border,
        backgroundColor: selected ? colors.primarySurface : colors.surface,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <GameIcon name={name} size={22} />
      <T variant="caption" style={{ color: colors.text }}>{title}</T>
    </Pressable>
  );
}

function HelpAction({
  title,
  label = title,
  disabled = false,
  onPress,
}: {
  title: string;
  label?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: space.sm,
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.65 : 1,
      })}
    >
      <T variant="caption" style={{ color: colors.primaryPressed }}>{title}</T>
    </Pressable>
  );
}
