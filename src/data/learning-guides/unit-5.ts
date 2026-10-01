import type { UnitContent } from './types';

export const unit5Content: UnitContent = {
  unitId: 5,
  title: 'Validate: learn from what actually happens',
  summary:
    'Choose a result that could change your plan, observe without coaching, and compare the result with your original rule. The Library and Club scenes are fictional practice cases; real validation needs your own honestly recorded tests.',
  lessons: {
    'validate-1': {
      title: 'Give your idea a test it can fail',
      goal: 'Write one test with a target user, observable task, pass threshold, and next decision.',
      why: 'A useful test checks a risky assumption, such as whether someone can find the current deadline. A compliment cannot tell you whether the task works.',
      steps: [
        'Pick one uncertain behavior that matters to the user. Write who will try it and what they must do.',
        'Set the time limit and pass threshold before collecting results. In the example, at least 3 of 5 target users must finish without help in one minute.',
        'Save your experiment plan, including what you will investigate or change if it misses the threshold.',
      ],
      success:
        'Someone else could run your test and tell whether it met the rule. You have a plan, not a claim that the product is already validated.',
      hint: 'Hypothesis (สมมติฐาน) means a claim you can check. Threshold (เกณฑ์ผ่าน) is the result you decide is enough for this test.',
      exerciseCopy: {
        'v1-a': {
          prompt: 'Which claim tells you exactly who to test, what to watch, and when it passes?',
          context:
            'A student needs the latest deadline before planning their homework. You want to know whether the deadline screen lets them find it independently.',
          explanation:
            '“At least 3 of 5 target users” gives a threshold; “find the latest deadline without help in one minute” gives the behavior and time limit. “Amazing” and “change education” do not say what you would measure.',
          hint: 'Look for a person, a visible action, a time limit, and a number that can be missed.',
        },
        'v1-b': {
          prompt: 'Why write the pass threshold before anyone tries the prototype?',
          context:
            'Suppose only 2 of 5 people finish. You might feel tempted to call two enough after seeing that result.',
          explanation:
            'Choosing the rule first prevents you from moving the goalposts to protect the idea. It does not make failure impossible or prove demand; it makes this round easier to interpret honestly.',
          hint: 'Ask which answer protects your decision from changing just because you dislike the result.',
        },
        'v1-c': {
          prompt:
            'Write the experiment you will run and the result that would make you reconsider.',
          context:
            'Use your own project. If you are still planning, describe a future test. Include who, task, measure, pass rule, and what a missed rule would change.',
          explanation:
            'A test plan turns “people will understand it” into a checkable task. Keep the rule fixed during this round. Meeting a text requirement saves your plan; it does not show that participants completed the task.',
          hint: 'Try this structure: “I believe [user] can [task]. I will observe [measure]. Success means [rule]. If it fails, I will check [uncertainty].”',
        },
      },
    },
    'validate-2': {
      title: 'Observe the task without giving the answer',
      goal: 'Plan a respectful session and record independent completion separately from assisted completion.',
      why: 'If you explain each button, you are testing whether someone can follow your instructions. Watching where they hesitate reveals what the design needs to explain by itself.',
      steps: [
        'Ask permission to observe and take notes. Explain that you are testing the design and that the person may stop.',
        'Give a goal without naming the clicks. Let them think aloud; note the point where they hesitate or take a wrong turn.',
        'Record what happened, any help you gave, and the accurate status: not run, practice, or real test.',
      ],
      success:
        'Your notebook says whether the task was completed without help and describes the difficult step. An unrun test stays labeled “not run.”',
      hint: 'Unassisted (ทำได้เองโดยไม่ช่วย) excludes hints from the moderator. Helping a person is fine; count that outcome as assisted.',
      exerciseCopy: {
        'v2-a': {
          prompt:
            'Select every action that supports the person while keeping the test informative.',
          context:
            'You ask someone to find the latest deadline. You need to see whether the interface makes sense before you explain it.',
          explanation:
            'Ask permission, invite thinking aloud, record hesitation and mistakes, and say the design is being tested. Explaining every button first hides the confusion you need to notice.',
          hint: 'Choose actions that make the session respectful without revealing the route through the screen.',
        },
        'v2-b': {
          prompt:
            'The participant gets stuck, and you show them the next step. What belongs in the notes?',
          context:
            'The original rule requires completion without help. The participant eventually reaches the right deadline after your guidance.',
          explanation:
            'Record the difficult point, their words, and the help you gave. The eventual finish is assisted completion, so it does not pass a rule requiring independent completion. The difficulty is evidence about the design, not a judgment of the person.',
          hint: 'Preserve both facts: they were stuck at a particular step, and they finished after help.',
        },
        'v2-c': {
          prompt:
            'Save a results note with an honest test status and the help, if any, that was given.',
          context:
            'If you ran a real session, use an alias and the actual task outcome. If you only used a fictional case, label it practice. If you have not tested, write “not run” and the observations you plan to record.',
          explanation:
            'A usable note lets you distinguish what happened from what you think it means. “Not run” is useful information. Do not turn a scripted character reply into a real participant quote or invent a successful session.',
          hint: 'Include status, task, completion without help, difficult step, and help given. Use “no quote recorded” when you have no actual quote.',
        },
      },
    },
    'validate-3': {
      title: 'Compare the result with the rule',
      goal: 'Interpret a missed threshold and choose the next uncertainty to investigate.',
      why: 'A disappointing result can reveal a fixable label, a poor delivery channel, or a mistaken assumption. The numbers tell you what happened in this test; they do not explain the cause on their own.',
      steps: [
        'Compare the observed count with the threshold you wrote before the test. Keep assisted finishes separate.',
        'Use task notes to find the difficult step. Separate the observation from possible explanations.',
        'Write a finding, the limits of the sample, and one next check. If no test ran, save an analysis plan instead.',
      ],
      success:
        'Your conclusion fits the evidence: 2 of 5 independent finishes misses a 3-of-5 rule, but it does not prove that nobody wants the product.',
      hint: 'Evidence (หลักฐาน) is the recorded result. “The label confused them” is an explanation to investigate unless your notes support it.',
      exerciseCopy: {
        'v3-a': {
          prompt:
            'Expected: at least 3 of 5 finish without help. Actual: 2 of 5. What should you conclude?',
          context:
            'This is a hypothetical result. The rule was set before the session; you have notes about where participants got stuck.',
          explanation:
            'Two is below three, so this test missed its threshold. Inspect the failed steps before deciding on a change. Rounding up changes the rule; concluding that nobody wants it stretches a small usability result into a claim about everyone.',
          hint: 'Apply the original rule first. Then choose an investigation that the task notes can support.',
        },
        'v3-b': {
          prompt:
            'People compliment the app but never try it again. Which evidence deserves closer attention?',
          context:
            'Positive comments and returning to use the product are different signals. You want to learn whether the product earns a place in their routine.',
          explanation:
            'The gap between compliments and repeated behavior needs investigation. Perhaps the task rarely occurs, the product is difficult to reopen, or the existing workaround is easier. The gap matters, but the reason is still unknown.',
          hint: 'Look for the answer that compares what people say with what they actually do.',
        },
        'v3-c': {
          prompt:
            'Write what the results support, another possible explanation, and what to check next.',
          context:
            'Use actual notes when you have them. For a practice case, label the finding fictional. If no session ran, label your entry “Analysis plan” and list the questions you will use after testing.',
          explanation:
            'A finding needs supporting notes. An alternative explanation and a sample limit keep you from mistaking your first interpretation for a fact. Name a next check that could distinguish between the explanations.',
          hint: 'For example, check whether people misunderstood a label or opened an old link. Those causes require different changes; do not claim either without evidence.',
        },
      },
    },
    'validate-4': {
      title: 'Choose what to keep and what to change',
      goal: 'Choose continue, improve, pivot, or not enough evidence, and connect that choice to a next test.',
      why: 'A real need can survive a failed solution. Students may need a clear deadline yet refuse another app. Your next move should address the uncertainty the evidence exposed.',
      steps: [
        'Identify whether the problem is the need, the delivery method, or a specific step in the design.',
        'Continue to another test if the direction still fits; improve a blocked step; pivot if repeated evidence points to a different core direction.',
        'Save the decision with its supporting evidence, change, and next test. Choose not enough evidence when the record cannot support a decision.',
      ],
      success:
        'Your decision names a concrete next action and the evidence behind it. Completing this lesson does not automatically validate your project.',
      hint: 'Pivot (ปรับทิศทาง) changes a core assumption about the need or solution. Rewriting a confusing button label is usually an improvement.',
      exerciseCopy: {
        'v4-a': {
          prompt:
            'The deadline need remains, but users reject another app. Which next experiment fits that evidence?',
          context:
            'People still struggle to find the current date. Installing a separate app is the part they will not do.',
          explanation:
            'Test delivery inside a tool they already use. That checks the channel assumption while preserving the evidence about deadline confusion. Extra features do not address the install barrier, and rejecting one channel does not mean the need disappeared.',
          hint: 'Keep the user’s goal in view, and change how the useful information reaches them.',
        },
        'v4-b': {
          prompt: 'Match each situation to Continue, Improve, or Pivot.',
          context:
            'Decide what kind of change is justified: another test of the current direction, a repair to execution, or a change to the core direction.',
          explanation:
            'A working core task supports continuing with a new group. Labels that block completion call for improvement and a retest. Repeated evidence of a different urgent need can justify a pivot. None of these choices guarantees future success.',
          hint: 'A blocked step suggests repair. A different underlying need suggests a different direction.',
        },
        'v4-c': {
          prompt: 'Save your next decision, the evidence behind it, and the test that will follow.',
          context:
            'Use your project’s actual research status. If your evidence comes only from these lessons, say “not enough evidence” and describe the first real test you need.',
          explanation:
            'A defensible decision connects evidence to action. It can preserve the current direction, repair a specific difficulty, change a core assumption, or wait for more evidence. State what result could still change your mind.',
          hint: '“Improve the date label, then test whether target users can find the current deadline without help” is more useful than “make it better.”',
        },
      },
    },
  },
  practices: {
    'explore-library-handoff': {
      title: 'Library: trace the availability mismatch',
      goal: 'Collect and pin the event, its cost to Mali, and the staff handoff that still needs checking.',
      why: 'A reader expects an available copy to be borrowable. In this fictional case, the catalog shows one copy but the desk says it is on the return cart. A screen promise needs a working process behind it.',
      steps: [
        'Ask “What happened during your last library visit?” Read the reply, then pin “One copy on the screen” to What happened.',
        'Ask “What was the impact of the wasted walk?” Pin “Nine minutes, no book” to Why it mattered.',
        'Ask “What still needs checking before promising live availability?” Pin the staff-update note to Still needs checking, then check the board.',
      ],
      success:
        'All three replies are uncovered and correctly pinned. You can explain the mismatch and its cost while leaving staff update speed unresolved. These are authored case notes, not your real interview results.',
      hint: 'If a note is unavailable, ask its follow-up first. If its destination is wrong, separate the event, the consequence, and the unanswered process question.',
      feedback: {
        'catalog-claim':
          'Expected: a copy shown as available can be borrowed. In this case: the desk says it is still on the return cart. This reply belongs in What happened; it does not establish how often the mismatch occurs.',
        'wasted-walk':
          'Expected: the walk ends with River Atlas to take home. In this case: Mali spends nine minutes walking and leaves without it. That is the consequence, so pin it to Why it mattered.',
        'handoff-question':
          'The case has no answer about who updates returned copies or how quickly. Pin the note to Still needs checking; do not promise live availability from an unanswered question.',
      },
    },
    'explore-club-room': {
      title: 'Club: follow the stale room information',
      goal: 'Separate the room-change event, Ken’s missed start, and the unanswered reminder question.',
      why: 'A member needs the current room before a meeting starts. In this fictional case, the room changes from B14 to B16 while the poster still shows B14. Learning the cause comes before choosing alerts as a solution.',
      steps: [
        'Ask “What happened at the last club meeting?” Pin “B14 became B16” to What happened.',
        'Ask “What was the impact of missing the start?” Pin “Six minutes of searching” to Why it mattered.',
        'Ask “What is still unknown about reminders reaching members?” Pin that reply to Still needs checking, then check the board.',
      ],
      success:
        'The three case replies are uncovered and correctly pinned. You know why Ken reached the wrong room and missed six minutes, while reminder preferences remain an open question.',
      hint: 'The stale poster explains this incident. It does not tell you whether members enable reminders or whether everyone wants alerts.',
      feedback: {
        'room-change':
          'Expected: the poster points to the room used at 18:00. In this case: the room changes at 17:40, but the poster still says B14. Pin the mismatch to What happened.',
        'missed-start':
          'Expected: Ken arrives for the start. In this case: he finds B14 empty, checks the chat, and reaches B16 six minutes late. That consequence belongs in Why it mattered.',
        'reminder-question':
          'No reminder preferences were checked in this case. Put the note in Still needs checking. Ken’s missed start cannot prove that alerts will reach or help every member.',
      },
    },
    'insight-library-evidence': {
      title: 'Library: audit what the case can support',
      goal: 'Sort six notes into Case evidence, Assumption, and Open question without overstating the case.',
      why: 'A team can accidentally turn a guess into a product promise. Keeping recorded case details separate from beliefs and unanswered questions shows what must be tested before building a live availability feature.',
      steps: [
        'Read each card’s detail. Place the unavailable copy and nine-minute trip in Case evidence.',
        'Place “Everyone wants an account” and “The catalog is always current” in Assumption. The case does not establish either guarantee.',
        'Place update ownership and the hold deadline in Open question, then check all six placements.',
      ],
      success:
        'All six notes match their categories. The case supports one availability mismatch and one wasted trip; it leaves account demand, update ownership, and hold policy unvalidated.',
      hint: 'Assumption (ข้อสมมติ) is a belief being treated as true. A question asks for information you do not have. Case evidence here means a fact supplied by the fictional scene.',
      feedback: {
        'copy-not-ready':
          'Case evidence: the supplied scene says the catalog showed one copy while the desk said it was on the return cart. This is a specific mismatch, not a measured failure rate.',
        'walk-cost':
          'Case evidence: Mali’s nine-minute walk ended without the book. That records the cost in this scene; it does not measure every reader’s experience.',
        'everyone-signs-in':
          'Assumption: no account-choice test appears in the case. “Everyone” predicts behavior beyond what these notes show.',
        'always-current':
          'Assumption: a title search does not guarantee a ready copy. The scene actually gives a counterexample to that guarantee.',
        'update-owner':
          'Open question: the case does not identify who updates availability. Check the desk process before assigning that responsibility in the product.',
        'hold-deadline':
          'Open question: the desk’s supported pickup deadline is unknown. Ask about the workflow before promising a hold duration.',
      },
    },
  },
  stages: {},
  bonusLesson: {
    id: 'pro-unit-5',
    missionId: 5,
    title: 'Pro: compare two versions fairly',
    subtitle: 'Change one thing, keep the measurement honest.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-unit-5-fair-comparison',
        type: 'choice',
        prompt: 'Which next test gives the clearest check of a new availability label?',
        context:
          'Fictional experiment: readers mistake “In catalog” for “Ready to borrow.” You change that label to “Ready at desk” and want to learn whether the wording helps.',
        options: [
          {
            id: 'same-task-one-change',
            text: 'Use comparable target readers, the same task and time limit, and change only the label.',
          },
          {
            id: 'coach-new-version',
            text: 'Explain the new label to each reader before timing them.',
          },
          {
            id: 'change-everything',
            text: 'Change the label, layout, task, and participant group together.',
          },
        ],
        correctAnswerIds: ['same-task-one-change'],
        explanation:
          'Holding the task and conditions steady makes the label easier to investigate. Coaching or changing several things introduces other possible explanations. Even a careful small comparison gives a clue, not certainty about the cause.',
        hint: 'Ask what else could explain a better result besides the label.',
      },
      {
        id: 'pro-unit-5-comparison-notes',
        type: 'multi',
        prompt: 'Select every record needed to interpret this comparison.',
        context:
          'Your pass rule is finding a ready-to-borrow copy without help in 60 seconds. Two prototype versions use different labels.',
        options: [
          { id: 'version', text: 'Which prototype version each person used' },
          {
            id: 'time-outcome',
            text: 'Elapsed time and whether they found the correct ready copy',
          },
          { id: 'help', text: 'Any hint or explanation the moderator gave' },
          {
            id: 'conditions',
            text: 'How participants were recruited and which task they received',
          },
          { id: 'favorite-color', text: 'The designer’s favorite color as proof the label worked' },
        ],
        correctAnswerIds: ['version', 'time-outcome', 'help', 'conditions'],
        explanation:
          'Version links each result to the design. Time and outcome check the rule. Help distinguishes independent from assisted finishes. Recruitment and task context reveal differences between groups. A designer’s color preference does not measure task success.',
        hint: 'Keep records that let someone check the result or notice an unfair difference between versions.',
      },
      {
        id: 'pro-unit-5-count-the-rule',
        type: 'categorize',
        prompt:
          'Classify each scheduled session against the rule: correct copy, no help, within 60 seconds.',
        context:
          'These are fictional session notes. “Not run” is a status to report separately; it must not become an invented pass or a completed test.',
        items: [
          { id: 'independent-42', text: 'Correct copy in 42 seconds, no help' },
          { id: 'independent-55', text: 'Correct copy in 55 seconds, no help' },
          {
            id: 'assisted-35',
            text: 'Correct copy in 35 seconds after the moderator points to the label',
          },
          { id: 'late-75', text: 'Correct copy in 75 seconds, no help' },
          { id: 'not-started', text: 'Participant cancels; the session never starts' },
        ],
        categories: [
          { id: 'passes-rule', label: 'Passes the rule' },
          { id: 'misses-rule', label: 'Test ran; misses the rule' },
          { id: 'not-run', label: 'Not run' },
        ],
        correctCategories: {
          'independent-42': 'passes-rule',
          'independent-55': 'passes-rule',
          'assisted-35': 'misses-rule',
          'late-75': 'misses-rule',
          'not-started': 'not-run',
        },
        explanation:
          'The 42- and 55-second independent finishes pass. The assisted finish misses “no help,” and 75 seconds exceeds the time limit. Report two passes from four completed sessions, plus one session not run. You do not yet have five completed test outcomes.',
        hint: 'All three conditions must hold. A fast assisted finish still misses the rule; a cancelled session has no task outcome.',
      },
      {
        id: 'pro-unit-5-report-the-change',
        type: 'choice',
        prompt: 'Which report matches these two small rounds without claiming more than they show?',
        context:
          'Different fictional target readers try the same task under similar conditions. Version A: 2 of 5 pass without help within 60 seconds. Version B: 3 of 5 pass. Both rounds are complete; the threshold was 3 of 5.',
        options: [
          {
            id: 'bounded-result',
            text: 'B met this round’s threshold and A did not. Check the difficulty notes and test again before claiming the label caused the improvement.',
          },
          {
            id: 'universal-proof',
            text: 'The new label proves all readers will understand the product.',
          },
          {
            id: 'ignore-a',
            text: 'Remove A’s result from the record because B looks better.',
          },
        ],
        correctAnswerIds: ['bounded-result'],
        explanation:
          'Three of five meets the predefined threshold; two of five does not. The difference is worth investigating, but small groups may differ for other reasons. Keep both rounds, inspect the observed difficulties, and use another test to check whether the change helps consistently.',
        hint: 'Separate the recorded comparison from a claim about causation (เหตุและผล) or every future reader.',
      },
    ],
  },
};
