export const studyGoals = [
  { id: 'understand', label: 'Understand the idea', prompt: 'Explain why your next step works.' },
  {
    id: 'practice',
    label: 'Practise independently',
    prompt: 'Try one step yourself before another hint.',
  },
  {
    id: 'debug',
    label: 'Find my mistake',
    prompt: 'Compare what you expected with what actually happened.',
  },
] as const;
export const studyHintStyles = [
  { id: 'question', label: 'Ask me a question' },
  { id: 'step', label: 'Give one small step' },
] as const;
export type StudyGoal = (typeof studyGoals)[number]['id'];
export type StudyHintStyle = (typeof studyHintStyles)[number]['id'];
export type StudyExerciseId = 'equation' | 'fractions' | 'array' | 'custom';

export interface StudyExercise {
  id: StudyExerciseId;
  title: string;
  question: string;
  expectedAnswer: string;
  hints: Record<StudyHintStyle, [string, string, string]>;
}

export const studyExercises: readonly StudyExercise[] = [
  {
    id: 'equation',
    title: 'Solve an equation',
    question: 'Solve 3x + 6 = 21. Show one step of your thinking.',
    expectedAnswer: 'x = 5',
    hints: {
      question: [
        'What operation would undo adding 6?',
        'If you change one side, what must you do to the other side?',
        'Once only 3x remains, what operation would leave a single x?',
      ],
      step: [
        'Start by undoing the addition on both sides.',
        'Write the equation again after subtracting the same amount from both sides.',
        'Undo multiplication next. Check your result in the original equation.',
      ],
    },
  },
  {
    id: 'fractions',
    title: 'Add fractions',
    question: 'What is 3/4 + 1/8? Explain how you chose a common denominator.',
    expectedAnswer: '7/8',
    hints: {
      question: [
        'Can you add numerators when the pieces have different sizes?',
        'How many eighths have the same size as three quarters?',
        'Once the denominators match, which part of each fraction do you add?',
      ],
      step: [
        'Give both fractions the same denominator before adding.',
        'Rename the quarters as eighths by multiplying the top and bottom by the same amount.',
        'Add the numerators and keep the common denominator.',
      ],
    },
  },
  {
    id: 'array',
    title: 'Debug an array',
    question:
      'JavaScript: const items = [1, 2]; console.log(items[2]);\nI expected 2. What is actually logged, and why?',
    expectedAnswer: 'undefined',
    hints: {
      question: [
        'What index does a JavaScript array start with?',
        'Which indices exist in an array with two entries?',
        'Does the requested index point to an existing entry?',
      ],
      step: [
        'Label each entry with its index, starting at zero.',
        'Compare the requested index with the indices you just wrote.',
        'Separate the value you expected from what JavaScript returns for a missing entry.',
      ],
    },
  },
  {
    id: 'custom',
    title: 'Write my own practice',
    question: 'Write a question in the builder.',
    expectedAnswer: '',
    hints: {
      question: [
        'What do you already know?',
        'Which part is unclear?',
        'What small step can you test next?',
      ],
      step: [
        'List the information you have.',
        'Choose one part to work on.',
        'Try that step, then compare it with your expectation.',
      ],
    },
  },
];

export interface StudyBuddyDraft {
  version: 1;
  appName: string;
  goal: StudyGoal;
  hintStyle: StudyHintStyle;
  learnerContext: string;
  exerciseId: StudyExerciseId;
  question: string;
  expectedAnswer: string;
  hints: [string, string, string];
  showKnowledgeCheck: boolean;
}

export function createStudyBuddyDraft(): StudyBuddyDraft {
  const exercise = studyExercises[0];
  return {
    version: 1,
    appName: 'StudyBuddy AI',
    goal: 'understand',
    hintStyle: 'question',
    learnerContext: '',
    exerciseId: exercise.id,
    question: exercise.question,
    expectedAnswer: exercise.expectedAnswer,
    hints: [...exercise.hints.question],
    showKnowledgeCheck: true,
  };
}

export function chooseStudyExercise(draft: StudyBuddyDraft, id: StudyExerciseId): StudyBuddyDraft {
  const exercise = studyExercises.find((item) => item.id === id) ?? studyExercises[0];
  return {
    ...draft,
    exerciseId: exercise.id,
    question: exercise.question,
    expectedAnswer: exercise.expectedAnswer,
    hints: [...exercise.hints[draft.hintStyle]],
  };
}

export function chooseStudyHintStyle(
  draft: StudyBuddyDraft,
  hintStyle: StudyHintStyle,
): StudyBuddyDraft {
  const exercise = studyExercises.find((item) => item.id === draft.exerciseId);
  const untouched =
    exercise && draft.hints.every((hint, index) => hint === exercise.hints[draft.hintStyle][index]);
  return {
    ...draft,
    hintStyle,
    hints: untouched ? [...exercise.hints[hintStyle]] : [...draft.hints],
  };
}

export function normalizeStudyDraft(value: unknown): StudyBuddyDraft {
  const defaults = createStudyBuddyDraft();
  if (!value || typeof value !== 'object') return defaults;
  const source = value as Partial<StudyBuddyDraft>;
  const text = (candidate: unknown, fallback: string, max: number) =>
    typeof candidate === 'string' ? candidate.slice(0, max) : fallback;
  const hintStyle = studyHintStyles.some((item) => item.id === source.hintStyle)
    ? source.hintStyle!
    : defaults.hintStyle;
  const exerciseId = studyExercises.some((item) => item.id === source.exerciseId)
    ? source.exerciseId!
    : defaults.exerciseId;
  const exercise = studyExercises.find((item) => item.id === exerciseId)!;
  return {
    version: 1,
    appName: text(source.appName, defaults.appName, 40),
    goal: studyGoals.some((item) => item.id === source.goal) ? source.goal! : defaults.goal,
    hintStyle,
    exerciseId,
    learnerContext: text(source.learnerContext, '', 600),
    question: text(source.question, exercise.question, 1200),
    expectedAnswer: text(source.expectedAnswer, exercise.expectedAnswer, 120),
    hints: [0, 1, 2].map((index) =>
      text(
        Array.isArray(source.hints) ? source.hints[index] : undefined,
        exercise.hints[hintStyle][index],
        400,
      ),
    ) as [string, string, string],
    showKnowledgeCheck:
      typeof source.showKnowledgeCheck === 'boolean' ? source.showKnowledgeCheck : true,
  };
}

export const STUDY_INPUT_LIMIT = 1200;
export const STUDY_MESSAGE_LIMIT = 40;

function compact(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

/** A deterministic answer marker check, not a semantic AI safety guarantee. */
export function hintContainsAnswer(hint: string, expectedAnswer: string): boolean {
  const answer = compact(expectedAnswer);
  if (!answer) return false;
  const normalized = compact(hint);
  if (normalized.includes(answer)) return true;
  const equation = /^x\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(answer);
  const marker = equation ? equation[1] : /^-?\d+(?:\.\d+)?$/.test(answer) ? answer : null;
  if (marker)
    return new RegExp(
      `(^|[^\\w.])${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w|\\.\\d)`,
    ).test(normalized);
  return false;
}

export interface StudyHintAudit {
  valid: boolean;
  issues: string[];
  expected: string;
  actual: string;
}

export function auditStudyHints(draft: StudyBuddyDraft): StudyHintAudit {
  const issues: string[] = [];
  if (!draft.question.trim()) issues.push('Write a practice question.');
  draft.hints.forEach((hint, index) => {
    if (!hint.trim()) issues.push(`Write hint ${index + 1}.`);
    else if (hintContainsAnswer(hint, draft.expectedAnswer))
      issues.push(`Hint ${index + 1} contains the expected answer. Rewrite it as a nudge.`);
  });
  return {
    valid: issues.length === 0,
    issues,
    expected: 'Each hint helps with one next step without stating the final answer.',
    actual: issues.length
      ? issues.join(' ')
      : draft.expectedAnswer.trim()
        ? 'All three hints avoid the answer marker. Test with a learner to check whether they help.'
        : 'All three hints have text. Add an expected answer to check for direct answer leaks.',
  };
}

export interface StudyAnswerCheck {
  kind: 'match' | 'different' | 'self-check';
  expected: string;
  actual: string;
  message: string;
}

/** Only recognizes the answer format; never claims to evaluate a learner's understanding. */
export function checkStudyAnswer(draft: StudyBuddyDraft, reply: string): StudyAnswerCheck {
  const answer = compact(draft.expectedAnswer);
  const actual = reply.trim();
  const canonical = (value: string) => compact(value).replace(/\s/g, '').replace(/[.!]$/, '');
  if (!answer)
    return {
      kind: 'self-check',
      expected: 'A reasoned attempt in your own words.',
      actual,
      message:
        'This practice has no answer rule. Compare your reasoning with a teacher or trusted source; this prototype cannot judge it.',
    };
  const equation = /^x\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(answer);
  const match =
    canonical(actual) === canonical(answer) ||
    Boolean(equation && canonical(actual) === equation[1]);
  return {
    kind: match ? 'match' : 'different',
    expected: draft.expectedAnswer.trim(),
    actual,
    message: match
      ? 'Your reply matches the authored answer. Explain or test your reasoning next; a text match does not prove understanding.'
      : 'Your reply does not match the authored answer format yet. It may be a working step or an equivalent explanation. Try another step, then check again.',
  };
}

/** Public builder artifact only: private context, answers and session messages are excluded. */
export function describeStudyBuddy(draft: StudyBuddyDraft): string {
  const goal = studyGoals.find((item) => item.id === draft.goal)!.label;
  const style = studyHintStyles.find((item) => item.id === draft.hintStyle)!.label;
  return `${draft.appName.trim() || 'StudyBuddy AI'}: ${goal}. Hint style: ${style}. Authored local practice; no live AI connected.`;
}
