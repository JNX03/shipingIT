import { Pressable, StyleSheet, View } from 'react-native';
import type { Exercise, ExerciseAnswer, Lesson, Project } from '@/domain/types';
import { Field } from '@/components/ui/field';
import { GameIcon } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { GameActor } from '@/game/components/actor';
import { colors, radius, space } from '@/theme';
import {
  applyUnitFinalMove,
  unitFinalDraftLabels,
  unitFinalGameForLesson,
  type UnitFinalGameDefinition,
  type UnitFinalMove,
} from './unit-final-game-model';

export { isUnitFinalLesson, unitFinalGameForLesson } from './unit-final-game-model';
export interface UnitFinalGameProps {
  lesson: Lesson;
  exercise: Exercise;
  answer: ExerciseAnswer;
  onChange: (answer: ExerciseAnswer) => void;
  disabled: boolean;
  /** Grading, feedback, Continue and hearts belong to the shared footer. */
  stepIndex?: number;
  checked?: boolean;
  onMistake?: () => void;
}

/** Replaces ExerciseInput only. The lesson screen owns source prompt, hints, Check/Continue and saving. */
export function UnitFinalGame(props: UnitFinalGameProps) {
  const definition = unitFinalGameForLesson(props.lesson);
  if (!definition || !props.lesson.exercises.some((exercise) => exercise.id === props.exercise.id))
    return null;
  return <FinalGameActivity key={props.exercise.id} {...props} definition={definition} />;
}

function FinalGameActivity({
  lesson,
  exercise,
  answer,
  onChange,
  disabled: busy,
  stepIndex = 0,
  checked = false,
  definition,
}: UnitFinalGameProps & { definition: UnitFinalGameDefinition }) {
  const disabled = busy || checked;
  const caseIndex =
    exercise.type === 'categorize'
      ? Math.max(0, Math.min(stepIndex, exercise.items.length - 1))
      : 0;
  const draft = unitFinalDraftLabels(exercise, answer);
  const stage = Math.max(
    0,
    lesson.exercises.findIndex((item) => item.id === exercise.id),
  );
  const move = (action: UnitFinalMove) => {
    if (!disabled) onChange(applyUnitFinalMove(exercise, answer, action));
  };
  const selections = Array.isArray(answer) ? answer : [];
  const assignments = !Array.isArray(answer) ? (answer as Record<string, string>) : {};
  const currentCase = exercise.type === 'categorize' ? exercise.items[caseIndex] : undefined;

  return (
    <View style={styles.game} testID={'unit-final-' + definition.layout}>
      <View style={styles.mission}>
        <GameActor character={definition.npc} motion="still" size={68} />
        <View style={{ flex: 1, gap: space.xs }}>
          <T variant="caption">UNIT {definition.unitId} · FINAL GAME</T>
          <T variant="subheading">{definition.title}</T>
          <T variant="small">{definition.goal}</T>
        </View>
      </View>
      <View
        style={styles.stageRoute}
        accessibilityLabel={'Current task: ' + definition.stages[stage]}
      >
        {definition.stages.map((label, index) => (
          <View key={label} style={[styles.stage, index === stage && styles.activeStage]}>
            <T
              variant="caption"
              style={{ color: index === stage ? colors.primaryPressed : colors.textSecondary }}
            >
              {index + 1}. {label}
            </T>
          </View>
        ))}
      </View>

      {exercise.type !== 'project' && exercise.type !== 'categorize' ? (
        <GameScene definition={definition} exercise={exercise} labels={draft} />
      ) : null}

      {exercise.type === 'choice' || exercise.type === 'multi' ? (
        <View style={styles.shelf}>
          <T variant="caption">
            {exercise.type === 'multi'
              ? 'INCLUDE THE CHECKS YOU NEED · TAP AGAIN TO REMOVE'
              : 'CHOOSE A PIECE FOR THE SCENE'}
          </T>
          {exercise.options.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole={exercise.type === 'multi' ? 'checkbox' : 'radio'}
              accessibilityLabel={definition.action + ': ' + option.text}
              accessibilityState={{ checked: selections.includes(option.id), disabled }}
              disabled={disabled}
              testID={'final-option-' + option.id}
              onPress={() => move({ type: 'choose', id: option.id })}
              style={({ pressed }) => [
                styles.piece,
                selections.includes(option.id) && styles.selectedPiece,
                pressed && !disabled && styles.pressed,
              ]}
            >
              <GameIcon name={definition.icon} size={34} />
              <View style={{ flex: 1, gap: space.xs }}>
                <T variant="caption">
                  {selections.includes(option.id)
                    ? 'IN YOUR DRAFT'
                    : definition.action.toUpperCase()}
                </T>
                <T variant="small">{option.text}</T>
              </View>
            </Pressable>
          ))}
          <T variant="small">
            Your selection changes the draft above. Use the lesson’s Check button to test your
            decision.
          </T>
        </View>
      ) : exercise.type === 'sort' ? (
        <View style={styles.shelf}>
          <T variant="caption">
            {definition.layout === 'backpack'
              ? 'PACK THE NEXT STEP'
              : 'ADD THE NEXT REHEARSAL STEP'}
          </T>
          {exercise.items
            .filter((item) => !selections.slice(0, stepIndex).includes(item.id))
            .map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={'Add next: ' + item.text}
                accessibilityState={{ disabled }}
                disabled={disabled}
                testID={'final-sequence-' + item.id}
                style={({ pressed }) => [
                  styles.piece,
                  selections[stepIndex] === item.id && styles.selectedPiece,
                  pressed && !disabled && styles.pressed,
                ]}
                onPress={() => move({ type: 'sequence', id: item.id, index: stepIndex })}
              >
                <GameIcon
                  name={definition.layout === 'backpack' ? 'scope' : 'prototype'}
                  size={34}
                />
                <T variant="small" style={{ flex: 1 }}>
                  {item.text}
                </T>
              </Pressable>
            ))}
          <T variant="small">Place one step, then use Check. Continue opens the next step.</T>
        </View>
      ) : exercise.type === 'categorize' && currentCase ? (
        <View style={styles.testBay}>
          <View style={styles.caseHeading}>
            <GameIcon name="validate" size={44} />
            <View style={{ flex: 1 }}>
              <T variant="caption">
                PRACTICE CASE {caseIndex + 1}/{exercise.items.length}
              </T>
              <T variant="subheading">{currentCase.text}</T>
            </View>
          </View>
          <T variant="small">
            Choose a destination, then use Check. Continue brings the next case. These cases are
            practice scenarios.
          </T>
          <View style={styles.decisions}>
            {exercise.categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="radio"
                accessibilityLabel={category.label + ': ' + currentCase.text}
                accessibilityState={{
                  checked: assignments[currentCase.id] === category.id,
                  disabled,
                }}
                disabled={disabled}
                testID={'final-category-' + category.id}
                style={[
                  styles.decision,
                  assignments[currentCase.id] === category.id && styles.selectedPiece,
                ]}
                onPress={() =>
                  move({ type: 'categorize', itemId: currentCase.id, categoryId: category.id })
                }
              >
                <GameIcon
                  name={category.id === '0' ? 'momentum' : category.id === '1' ? 'build' : 'idea'}
                  size={36}
                />
                <T variant="small">{category.label}</T>
              </Pressable>
            ))}
          </View>
          <View style={styles.routed}>
            <T variant="caption">
              YOUR DRAFT DECISIONS · {Object.keys(assignments).length}/{exercise.items.length}
            </T>
            {draft.map((label) => (
              <T key={label} variant="small">
                {label}
              </T>
            ))}
          </View>
        </View>
      ) : exercise.type === 'project' ? (
        <View
          style={[styles.notebook, definition.layout === 'launch-route' && styles.deliveryPack]}
        >
          <View style={styles.caseHeading}>
            <GameIcon
              name={definition.layout === 'launch-route' ? 'project' : definition.icon}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <T variant="subheading">{definition.destination}</T>
              <T variant="small">
                Write your actual next move. Your draft stays editable until you check it.
              </T>
            </View>
          </View>
          {exercise.fields.map((field) => {
            const values = assignments as Partial<Project>;
            const text = values[field.key] ?? '';
            const length = text.trim().length;
            return (
              <View key={field.key} style={{ gap: space.xs }}>
                <Field
                  label={field.label}
                  value={text}
                  placeholder={field.placeholder}
                  help={field.help}
                  inputProps={{ editable: !disabled }}
                  onChangeText={(text) => move({ type: 'write', field: field.key, text })}
                />
                <T
                  variant="caption"
                  style={{
                    color: length >= field.minLength ? colors.primaryPressed : colors.textSecondary,
                  }}
                >
                  {length >= field.minLength
                    ? 'Draft ready for Check'
                    : Math.max(0, field.minLength - length) + ' more characters needed'}
                </T>
              </View>
            );
          })}
          <T variant="small">
            Keep practice scenarios and unknown results labeled. Writing this plan does not mean the
            research, build, or launch has happened.
          </T>
        </View>
      ) : null}
    </View>
  );
}

function DraftNotes({ labels, empty }: { labels: string[]; empty: string }) {
  return labels.length ? (
    <View style={{ gap: space.sm }}>
      {labels.map((label, index) => (
        <T key={index} variant="small">
          {label}
        </T>
      ))}
    </View>
  ) : (
    <T variant="small" style={{ color: colors.textSecondary }}>
      {empty}
    </T>
  );
}

/** Eight different work surfaces; every preview is built only from the learner's current answer. */
function GameScene({
  definition,
  exercise,
  labels,
}: {
  definition: UnitFinalGameDefinition;
  exercise: Exercise;
  labels: string[];
}) {
  if (definition.layout === 'evidence-board')
    return (
      <View style={styles.evidenceBoard}>
        <View style={styles.boardPin}>
          <GameIcon name="evidence" size={44} />
          <T variant="caption">INVESTIGATE THIS WEEK</T>
        </View>
        <View style={styles.paper}>
          <DraftNotes labels={labels} empty="Tap a lead below to pin it to the discovery board." />
        </View>
        <T variant="caption">A pinned lead is a question to investigate, not validated evidence.</T>
      </View>
    );
  if (definition.layout === 'cause-map')
    return (
      <View style={styles.causeMap}>
        <View style={styles.port}>
          <GameIcon name="profile" size={34} />
          <T variant="small">Person in a situation</T>
        </View>
        <View style={styles.connector} />
        <View style={[styles.port, styles.connectionNote]}>
          <T variant="caption">
            {exercise.id === 'f4-a' ? 'WORKING EXPLANATION' : 'DESIRED PROGRESS'}
          </T>
          <DraftNotes labels={labels} empty="Connect one note from the shelf below." />
        </View>
        <View style={styles.connector} />
        <View style={styles.port}>
          <GameIcon name="define" size={34} />
          <T variant="small">A focused problem brief</T>
        </View>
      </View>
    );
  if (definition.layout === 'backpack')
    return (
      <View style={styles.backpack}>
        <View style={styles.packHandle} />
        <View style={styles.caseHeading}>
          <GameIcon name="scope" size={48} />
          <T variant="subheading" style={{ flex: 1 }}>
            {exercise.type === 'sort'
              ? 'Four spaces for the complete route'
              : 'Protect the core route'}
          </T>
        </View>
        {exercise.type === 'sort' ? (
          exercise.items.map((item, index) => (
            <View key={item.id} style={styles.packSlot}>
              <T variant="caption">{index + 1}</T>
              <T variant="small" style={{ flex: 1 }}>
                {labels[index] ?? 'An unpacked step'}
              </T>
            </View>
          ))
        ) : (
          <View style={styles.packSlot}>
            <DraftNotes labels={labels} empty="Choose which blocker to remove first." />
          </View>
        )}
      </View>
    );
  if (definition.layout === 'prototype')
    return (
      <View style={styles.phone}>
        <View style={styles.speaker} />
        <View style={styles.phoneScreen}>
          <T variant="caption">REHEARSAL PLAN PREVIEW</T>
          <GameIcon name="prototype" size={52} />
          <DraftNotes
            labels={labels.map((label, index) =>
              exercise.type === 'sort' ? index + 1 + '. ' + label : label,
            )}
            empty="Add a rehearsal step or task card to the preview."
          />
          <View style={styles.mockButton}>
            <T variant="caption">A PLAN TO TRY · NOT A TEST RESULT</T>
          </View>
        </View>
      </View>
    );
  if (definition.layout === 'test-bay')
    return (
      <View style={styles.testBay}>
        <View style={styles.caseHeading}>
          <GameIcon name="validate" size={48} />
          <View style={{ flex: 1 }}>
            <T variant="subheading">Change the experiment</T>
            <T variant="small">Keep the need. Examine the delivery barrier.</T>
          </View>
        </View>
        <View style={styles.experimentTray}>
          <T variant="caption">PROPOSED NEXT EXPERIMENT</T>
          <DraftNotes
            labels={labels}
            empty="Choose an experiment below to put it in the test bay."
          />
        </View>
      </View>
    );
  if (definition.layout === 'resource-balance')
    return (
      <View style={styles.balance}>
        <View style={styles.balancePans}>
          <View style={styles.pan}>
            <GameIcon name="project" size={44} />
            <T variant="small">The delivery promise</T>
          </View>
          <View style={styles.pan}>
            <GameIcon name="business" size={44} />
            <T variant="small">
              {labels.length} {exercise.type === 'multi' ? 'checks chosen' : 'approach chosen'}
            </T>
          </View>
        </View>
        <View style={styles.balanceBeam} />
        <View style={styles.balanceStem} />
        <View style={styles.paper}>
          <T variant="caption">DRAFT DELIVERY CHECKS</T>
          <DraftNotes labels={labels} empty="Bring the access and resource checks into the plan." />
        </View>
        <T variant="caption">
          Selection counts show your draft. They do not prove feasibility or assign money values.
        </T>
      </View>
    );
  if (definition.layout === 'wire-journey')
    return (
      <View style={styles.wireJourney}>
        <View style={styles.port}>
          <GameIcon name="build" size={40} />
          <T variant="small">Find the current deadline and keep the saved work</T>
        </View>
        <View
          style={[styles.wire, labels.length > 0 && { backgroundColor: colors.primaryPressed }]}
        />
        <View style={[styles.port, labels.length > 0 && styles.connectionNote]}>
          <T variant="caption">
            {exercise.id === 'u4-a' ? 'MEASURE CONNECTED' : 'RELEASE DECISION CONNECTED'}
          </T>
          <DraftNotes labels={labels} empty="Wire a measure or decision from the shelf below." />
        </View>
        <T variant="caption">
          This is your proposed connection. Check it against the actual core promise.
        </T>
      </View>
    );
  return (
    <View style={styles.launchPad}>
      <View style={styles.caseHeading}>
        <GameIcon name="ship" size={52} />
        <View style={{ flex: 1 }}>
          <T variant="subheading">Load the handoff pack</T>
          <T variant="small">An honest artifact, then one next improvement.</T>
        </View>
      </View>
      <View style={styles.crate}>
        <T variant="caption">CURRENT PACK CONTENTS</T>
        <DraftNotes
          labels={labels}
          empty="Load a proposal from below. The Check button reviews it before you move on."
        />
      </View>
      <View style={styles.runway}>
        <View style={styles.runwayStripe} />
        <View style={styles.runwayStripe} />
        <View style={styles.runwayStripe} />
      </View>
      <T variant="caption">This route prepares a handoff. It does not publish a project.</T>
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: space.md },
  mission: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stageRoute: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  stage: {
    flexBasis: '30%',
    flexGrow: 1,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  activeStage: { backgroundColor: colors.primarySurface, borderColor: colors.primaryPressed },
  shelf: { gap: space.sm },
  piece: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 72,
    padding: space.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
  },
  selectedPiece: { borderColor: colors.primaryPressed, backgroundColor: colors.primarySurface },
  pressed: { backgroundColor: colors.surfaceMuted },
  evidenceBoard: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.peach,
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: radius.control,
  },
  boardPin: { flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' },
  paper: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    minHeight: 80,
  },
  causeMap: {
    padding: space.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.control,
  },
  port: {
    padding: space.md,
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    alignItems: 'center',
  },
  connectionNote: { borderColor: colors.primaryPressed, backgroundColor: colors.primarySurface },
  connector: { width: 4, height: 22, alignSelf: 'center', backgroundColor: colors.primaryPressed },
  backpack: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.primarySurface,
    borderWidth: 3,
    borderColor: colors.primaryPressed,
    borderRadius: 28,
  },
  packHandle: {
    width: 72,
    height: 14,
    borderWidth: 4,
    borderColor: colors.primaryPressed,
    borderRadius: radius.control,
    alignSelf: 'center',
  },
  packSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: space.sm,
    backgroundColor: colors.surface,
  },
  caseHeading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  phone: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    gap: space.sm,
    padding: space.sm,
    borderWidth: 4,
    borderRadius: 26,
    borderColor: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  speaker: {
    width: 64,
    height: 6,
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  phoneScreen: {
    gap: space.md,
    minHeight: 150,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
  },
  mockButton: {
    backgroundColor: colors.primarySurface,
    padding: space.sm,
    borderRadius: radius.control,
  },
  testBay: {
    gap: space.md,
    padding: space.md,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceMuted,
  },
  experimentTray: {
    gap: space.sm,
    padding: space.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primaryPressed,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
  },
  decisions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  decision: {
    flexGrow: 1,
    flexBasis: '28%',
    minHeight: 84,
    padding: space.sm,
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
  },
  routed: { gap: space.sm, paddingTop: space.sm },
  notebook: {
    gap: space.lg,
    padding: space.md,
    borderLeftWidth: 5,
    borderColor: colors.primaryPressed,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.control,
  },
  deliveryPack: { borderWidth: 3, borderColor: colors.accent, backgroundColor: colors.peach },
  balance: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.control,
  },
  balancePans: { flexDirection: 'row', gap: space.md },
  pan: {
    flex: 1,
    gap: space.sm,
    padding: space.md,
    minHeight: 100,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.control,
  },
  balanceBeam: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  balanceStem: { width: 8, height: 18, backgroundColor: colors.accent, alignSelf: 'center' },
  wireJourney: {
    gap: space.sm,
    padding: space.md,
    borderWidth: 2,
    borderColor: colors.primaryPressed,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.control,
  },
  wire: { height: 30, width: 5, alignSelf: 'center', backgroundColor: colors.border },
  launchPad: {
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.peach,
    borderRadius: radius.control,
  },
  crate: {
    minHeight: 100,
    gap: space.sm,
    padding: space.md,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  runway: {
    minHeight: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.textSecondary,
    borderRadius: radius.sm,
  },
  runwayStripe: { width: 34, height: 4, backgroundColor: colors.surface },
});
