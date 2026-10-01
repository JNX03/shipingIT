import type { Exercise, ProjectField } from '../../domain/types';

export interface ProHelpStep {
  title: string;
  lines: string[];
}

// Clearly fictional practice notes. The helper never reads or writes the learner's notebook.
const practiceNotes: Record<ProjectField, string> = {
  name: 'One Clear Deadline',
  description: 'One place for classmates to check the latest assignment deadline.',
  problem:
    'Students miss assignment deadlines when updates are split across chats and paper notices.',
  targetUser: 'Classmates who receive assignment changes in several different places.',
  painPoints: 'Finding the newest deadline takes time; an old screenshot can look current.',
  observations:
    'Practice scenario: a classmate checks two chats before asking which deadline is correct.',
  interviews: 'Practice question: Tell me about the last time an assignment deadline changed.',
  evidence:
    'Practice evidence plan: observe three classmates checking a changed deadline. No interviews have happened yet.',
  assumptions: 'We assume one current deadline list would help. We still need to test this.',
  insights:
    'Practice hypothesis: the problem may be finding the newest update, rather than forgetting it.',
  valueProposition:
    'Help classmates find the current deadline quickly, with a visible update time.',
  features: 'Show assignments, current deadlines, and the time each entry was updated.',
  mvp: 'One shared deadline list for one class; leave chat and automatic reminders out of the first test.',
  userJourney: 'Open the list → find the assignment → check its deadline and update time.',
  prototype: 'Draw a list screen and an assignment detail screen on paper.',
  validationPlan:
    'Ask three classmates to find a changed deadline using the paper prototype. Record time and mistakes.',
  validationResults:
    'No real test yet. Practice result format: participant, task, time, errors, and exact observation.',
  validationDecision:
    'Wait for real results before deciding. Revise the update label if users cannot identify the newest entry.',
  competitors:
    'Class group chats and paper notices are current alternatives. Compare how people find the newest update.',
  businessModel:
    'Test whether a school values a maintained deadline list before choosing a price or payment model.',
  technicalPlan:
    'Store assignment title, deadline, and update time. Start with one class and protect editing access.',
  buildStatus: 'Practice plan only: paper screens are planned; no working app has shipped.',
  pitch:
    'Students lose track of changed deadlines. We will test one clear list with one class before building more.',
  launchStrategy:
    'Invite three classmates to a short prototype test, then revise based on what they do.',
  marketing: 'Explain the one task it helps with: checking the latest assignment deadline.',
  feedback: 'Practice prompt: What was confusing when you tried to find the current deadline?',
  updates: 'Planned update: make the most recent change easier to spot after a real test.',
  nextSteps: 'Schedule three prototype tests and record the results before adding features.',
  firstUser: 'No real first user yet. Plan: invite one classmate to test the deadline task.',
  shippedUrl:
    'No live project link yet. Add the real address only after publishing your own project.',
};

/** Deterministic guidance from the lesson's authored answer key, never an AI response. */
export function buildProExerciseHelp(exercise: Exercise): ProHelpStep[] {
  let approach: string;
  let example: string[];
  switch (exercise.type) {
    case 'choice':
    case 'multi':
      approach =
        exercise.type === 'multi'
          ? 'Test each option against the hint separately. Keep every option that fits, then check that you did not keep an unsupported claim.'
          : 'Compare the options against the hint. Cross out an option when it answers a different question or assumes something the scenario has not shown.';
      example = exercise.correctAnswerIds
        .map((id) => exercise.options.find((option) => option.id === id)?.text ?? '')
        .filter(Boolean);
      break;
    case 'sort':
      approach =
        'Find the step that must happen first. Then ask what evidence or output each later step needs from the step before it.';
      example = exercise.correctOrder.map(
        (id, index) => `${index + 1}. ${exercise.items.find((item) => item.id === id)?.text ?? id}`,
      );
      break;
    case 'categorize':
      approach =
        'Define each category in your own words, then classify one item at a time. Judge what the item actually says, rather than what it might lead to later.';
      example = exercise.items.map(
        (item) =>
          `${item.text} → ${exercise.categories.find((category) => category.id === exercise.correctCategories[item.id])?.label ?? ''}`,
      );
      break;
    case 'project':
      approach =
        'Write one concrete statement for each field. Separate what you observed from what you assume; mark planned tests and practice notes clearly.';
      example = exercise.fields.map((field) => `${field.label}: ${practiceNotes[field.key]}`);
      break;
  }
  return [
    { title: '1 · Find your approach', lines: [exercise.hint, approach] },
    { title: '2 · Reason it through', lines: [exercise.explanation] },
    {
      title: exercise.type === 'project' ? '3 · Worked practice example' : '3 · Worked answer',
      lines: [
        ...(exercise.type === 'project'
          ? [
              'Fictional deadline-list project. Adapt the structure to your own idea; these notes are not evidence.',
            ]
          : []),
        ...example,
        exercise.explanation,
      ],
    },
  ];
}
