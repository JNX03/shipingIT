import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Exercise, Project, ExerciseAnswer } from '@/domain/types';
import { T } from '@/components/ui/text';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { LessonAnswerVisual } from './lesson-answer-visual';
import { colors, radius, space } from '@/theme';

export function ExerciseInput({
  exercise,
  answer,
  onChange,
  disabled,
  stepIndex = 0,
  checked = false,
}: {
  exercise: Exercise;
  answer: ExerciseAnswer;
  onChange: (answer: ExerciseAnswer) => void;
  disabled: boolean;
  stepIndex?: number;
  checked?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  if (exercise.type === 'choice' || exercise.type === 'multi') {
    const selected = Array.isArray(answer) ? answer : [];
    // Longer learning answers stay in readable rows; short answers can form a two-column grid.
    const tiled =
      exercise.type === 'choice' &&
      exercise.options.length === 4 &&
      exercise.options.every((option) => option.text.length <= 32) &&
      width / fontScale >= 340;
    return (
      <View style={styles.answers}>
        {exercise.type === 'multi' ? <T variant="small">Select all that apply.</T> : null}
        <View style={[styles.answers, tiled && styles.answerGrid]}>
          {exercise.options.map((option, i) => (
            <LessonAnswerVisual
              key={option.id}
              index={i}
              label={option.text}
              selected={selected.includes(option.id)}
              multiple={exercise.type === 'multi'}
              tile={tiled}
              style={tiled ? styles.answerTile : undefined}
              disabled={disabled}
              status={
                checked
                  ? exercise.correctAnswerIds.includes(option.id)
                    ? 'correct'
                    : selected.includes(option.id)
                      ? 'wrong'
                      : undefined
                  : undefined
              }
              onPress={() =>
                onChange(
                  exercise.type === 'choice'
                    ? [option.id]
                    : selected.includes(option.id)
                      ? selected.filter((x) => x !== option.id)
                      : [...selected, option.id],
                )
              }
            />
          ))}
        </View>
      </View>
    );
  }
  if (exercise.type === 'sort') {
    const selected = Array.isArray(answer) ? answer : [];
    const placed = selected.slice(0, stepIndex);
    const chosen = selected[stepIndex];
    return (
      <View style={styles.activity}>
        <T variant="caption">Step {stepIndex + 1} of {exercise.items.length}</T>
        <T variant="subheading">What comes next?</T>
        {placed.length ? (
          <View style={styles.sequence}>
            {placed.map((id, index) => (
              <T key={id} variant="small" style={{ color: colors.success }}>
                {index + 1}. {exercise.items.find((item) => item.id === id)?.text}
              </T>
            ))}
          </View>
        ) : null}
        <View style={styles.answers}>
          {exercise.items.filter((item) => !placed.includes(item.id)).map((item) => (
            <LessonAnswerVisual
              key={item.id}
              label={item.text}
              selected={chosen === item.id}
              disabled={disabled}
              role="radio"
              status={checked ? item.id === exercise.correctOrder[stepIndex] ? 'correct' : chosen === item.id ? 'wrong' : undefined : undefined}
              onPress={() => onChange([...placed, item.id])}
            />
          ))}
        </View>
      </View>
    );
  }
  if (exercise.type === 'categorize') {
    const selected = !Array.isArray(answer) ? (answer as Record<string, string>) : {};
    const item = exercise.items[stepIndex];
    if (!item) return null;
    return (
      <View style={styles.activity}>
        <T variant="caption">Statement {stepIndex + 1} of {exercise.items.length}</T>
        <View style={styles.statement}>
          <T variant="subheading" accessibilityLiveRegion="polite">{item.text}</T>
        </View>
        <View style={styles.answers}>
          {exercise.categories.map((category) => (
            <LessonAnswerVisual
              key={`${item.id}:${category.id}`}
              label={category.label}
              selected={selected[item.id] === category.id}
              disabled={disabled}
              status={checked ? exercise.correctCategories[item.id] === category.id ? 'correct' : selected[item.id] === category.id ? 'wrong' : undefined : undefined}
              onPress={() => onChange({ ...selected, [item.id]: category.id })}
            />
          ))}
        </View>
      </View>
    );
  }
  const values = (!Array.isArray(answer) ? answer : {}) as Partial<Project>;
  return (
    <View style={styles.projectFields}>
      {exercise.fields.map((field) => {
        const length = String(values[field.key] ?? '').trim().length;
        const complete = length >= field.minLength;
        return (
          <View key={field.key} style={styles.answers}>
            <Field
              label={field.label}
              value={values[field.key] ?? ''}
              inputProps={{ editable: !disabled }}
              onChangeText={(text) => !disabled && onChange({ ...values, [field.key]: text })}
              placeholder={field.placeholder}
              help={field.help ?? 'Be specific. A short, clear answer is a great start.'}
            />
            <View style={styles.fieldProgress}>
              {complete ? <Icon name="check" size={18} color={colors.success} /> : null}
              <T
                variant="caption"
                style={{ color: complete ? colors.success : colors.textSecondary }}
              >
                {complete
                  ? 'Ready'
                  : `${Math.max(0, field.minLength - length)} more characters to continue`}
              </T>
              <T variant="caption" style={styles.characterCount}>
                {length} / {field.minLength}
              </T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  answers: { gap: space.md },
  activity: { gap: space.lg },
  answerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  answerTile: { flexBasis: '47%', flexGrow: 1 },
  sequence: {
    gap: space.sm,
    paddingVertical: space.md,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
  },
  emptySequence: { minHeight: 104, justifyContent: 'center' },
  emptySequenceCopy: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sequencePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceStep: {
    minHeight: 68,
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    padding: space.md,
    borderWidth: 2,
    borderRadius: radius.control,
    borderCurve: 'continuous',
  },
  stepNumber: {
    minWidth: 28,
    minHeight: 28,
    borderWidth: 2,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correction: { gap: space.sm, paddingVertical: space.sm },
  statementNavigation: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  statementTab: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: space.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementTabActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  statement: { minHeight: 96, paddingVertical: space.md, justifyContent: 'center' },
  statementActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    alignItems: 'center',
    paddingTop: space.sm,
  },
  projectFields: { gap: space.xl },
  fieldProgress: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  characterCount: { marginLeft: 'auto', fontVariant: ['tabular-nums'] },
});
