import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditStudyHints,
  checkStudyAnswer,
  chooseStudyExercise,
  chooseStudyHintStyle,
  createStudyBuddyDraft,
  describeStudyBuddy,
  hintContainsAnswer,
  normalizeStudyDraft,
  studyExercises,
  studyHintStyles,
} from './model';

test('every authored exercise has three answer-free progressive hints in both styles', () => {
  for (const exercise of studyExercises) {
    for (const style of studyHintStyles) {
      const draft = chooseStudyHintStyle(
        chooseStudyExercise(createStudyBuddyDraft(), exercise.id),
        style.id,
      );
      assert.equal(draft.hints.length, 3);
      assert.equal(new Set(draft.hints).size, 3);
      assert.equal(auditStudyHints(draft).valid, true, `${exercise.id}/${style.id}`);
      assert.ok(draft.hints.every((hint) => !hintContainsAnswer(hint, draft.expectedAnswer)));
    }
  }
});

test('changing exercise and style changes real question/hints while preserving learner configuration', () => {
  const draft = {
    ...createStudyBuddyDraft(),
    appName: 'My tutor',
    learnerContext: 'I know loops.',
    goal: 'debug' as const,
  };
  const array = chooseStudyExercise(draft, 'array');
  const steps = chooseStudyHintStyle(array, 'step');
  assert.match(steps.question, /items\[2\]/);
  assert.equal(steps.expectedAnswer, 'undefined');
  assert.notDeepEqual(steps.hints, array.hints);
  assert.equal(steps.learnerContext, draft.learnerContext);
  assert.equal(steps.goal, 'debug');
  assert.equal(steps.appName, 'My tutor');
  const edited = {
    ...steps,
    hints: ['My first nudge', 'My next nudge', 'My last nudge'] as [string, string, string],
  };
  assert.deepEqual(chooseStudyHintStyle(edited, 'question').hints, edited.hints);
});

test('blank hints and direct answer leaks are caught before practice', () => {
  const draft = createStudyBuddyDraft();
  draft.hints[0] = 'The answer is x = 5.';
  draft.hints[1] = ' ';
  const audit = auditStudyHints(draft);
  assert.equal(audit.valid, false);
  assert.equal(audit.issues.length, 2);
  assert.equal(hintContainsAnswer('The value is 5.', 'x = 5'), true);
  assert.equal(hintContainsAnswer('Think about 15 first.', 'x = 5'), false);
  assert.equal(hintContainsAnswer('The result is 7/8.', '7/8'), true);
  assert.equal(hintContainsAnswer('That entry is UNDEFINED.', 'undefined'), true);
});

test('answer matching does not fabricate a reasoning assessment or expose the answer on mismatch', () => {
  const draft = createStudyBuddyDraft();
  assert.equal(checkStudyAnswer(draft, '5').kind, 'match');
  assert.equal(checkStudyAnswer(draft, ' X = 5. ').kind, 'match');
  const partial = checkStudyAnswer(draft, '3x = 15');
  assert.equal(partial.kind, 'different');
  assert.match(partial.message, /working step|equivalent explanation/);
  assert.ok(!partial.message.includes(draft.expectedAnswer));
  assert.match(checkStudyAnswer(draft, '5').message, /does not prove understanding/);
  const custom = chooseStudyExercise(draft, 'custom');
  assert.equal(checkStudyAnswer(custom, 'My idea').kind, 'self-check');
});

test('restored config is bounded, serializable and rejects unknown enum/field shapes', () => {
  const normalized = normalizeStudyDraft({
    appName: 'a'.repeat(100),
    goal: 'not-a-goal',
    hintStyle: 'bad',
    hints: 'not-an-array',
    question: 'q'.repeat(2000),
    learnerContext: 'c'.repeat(1000),
    secret: 'private',
  });
  assert.equal(normalized.appName.length, 40);
  assert.equal(normalized.question.length, 1200);
  assert.equal(normalized.learnerContext.length, 600);
  assert.equal(normalized.goal, 'understand');
  assert.deepEqual(normalized.hints, createStudyBuddyDraft().hints);
  assert.equal('secret' in normalized, false);
  assert.deepEqual(normalizeStudyDraft(JSON.parse(JSON.stringify(normalized))), normalized);
});

test('public description excludes learner context, expected answer and session text', () => {
  const draft = {
    ...createStudyBuddyDraft(),
    learnerContext: 'PRIVATE_CONTEXT',
    expectedAnswer: 'PRIVATE_ANSWER',
  };
  const description = describeStudyBuddy(draft);
  assert.match(description, /Authored local practice/);
  assert.ok(!description.includes('PRIVATE'));
});
