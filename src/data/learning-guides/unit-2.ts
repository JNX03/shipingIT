import type { UnitContent } from './types';

export const unit2Content: UnitContent = {
  unitId: 2,
  title: 'Define the problem worth solving',
  summary:
    'Choose a specific user, ask about what actually happened, and connect evidence to a need. An insight (ข้อเข้าใจจากหลักฐาน) explains who struggles, in what situation, and why; it leaves room to test more than one solution.',
  lessons: {
    'define-1': {
      title: 'Choose someone you can learn from',
      goal: 'Describe a first user by their situation, goal, and current workaround.',
      why: '“Students” includes people with different needs. A shared situation lets you find relevant people and compare their experiences.',
      steps: [
        'Choose the group facing the same task, rather than everyone who could download an app.',
        'Keep persona details that explain a goal, constraint, or current behavior.',
        'Write who your first user is, when the problem happens, and how they handle it now. Label any unobserved detail as a guess.',
      ],
      success:
        'Your target-user note identifies a reachable group and one situation to investigate. It does not claim that this group has already confirmed your idea.',
      hint: 'Start with “People who need to __ when __, and currently __.” You should be able to name where you could find someone in that situation.',
      exerciseCopy: {
        'f1-a': {
          prompt:
            'You want to investigate group-assignment deadlines. Which first user gives you a clear place to start?',
          context:
            'A useful first group shares a task and situation. You can expand to other groups after learning how this one works.',
          explanation:
            'Year 11 students coordinating assignments across three subjects share a concrete coordination task. You can ask where updates arrive and watch how they find the current deadline. “Students” and “everyone with a phone” leave those situations undefined.',
          hint: 'Choose the answer that tells you both who they are and what they are trying to do.',
        },
        'f1-b': {
          prompt: 'Which persona details would help you decide what to build for those students?',
          context:
            'A persona (ภาพตัวแทนผู้ใช้) is a short summary of relevant patterns. Its details should come from research or be clearly marked as assumptions.',
          explanation:
            'A goal tells you the progress they want; a constraint limits what they can do; current behavior shows the workaround your idea must improve. A favorite color or invented biography does not explain the deadline problem.',
          hint: 'Ask: “Would this detail change the task, the design, or how I test the idea?”',
        },
        'f1-c': {
          prompt:
            'Write a first-user note for your project: who faces the problem, when it happens, and what they do today.',
          context:
            'Example structure, not a research finding: “Group leaders coordinating three subjects, when a deadline changes, who currently search several chats.” Use your own situation; mark details you have not checked as assumptions.',
          explanation:
            'This note gives your next conversation a focus. Check whether the person really faces that situation and uses that workaround. Saving a description does not establish that they need or want your solution.',
          hint: 'Choose one group you can reach. Include their task and workaround, rather than age alone.',
        },
      },
    },
    'define-2': {
      title: 'Ask for a recent experience',
      goal: 'Prepare questions that reveal the sequence of a real problem without steering the answer.',
      why: 'A compliment about your idea gives little guidance. A recent event reveals what the person tried, where they got stuck, and what it cost them.',
      steps: [
        'Choose questions about the last event, the next action, and the time it took.',
        'Decide what you need to record and ask permission, especially for identifying or sensitive details.',
        'Save either an interview plan or actual notes. Keep the person’s words separate from your interpretation.',
      ],
      success:
        'Your notebook is clearly labeled as a plan or a completed conversation. Actual notes include permission, a recent situation, and the person’s response without invented quotes.',
      hint: '“Tell me about the last time…” opens a story. Follow with “What did you do next?” before suggesting a feature.',
      exerciseCopy: {
        'f2-a': {
          prompt:
            'Select every question that helps you understand what happened in a recent problem.',
          context:
            'You are learning about the person’s experience before presenting your solution. Ask for their sequence of actions and the time involved.',
          explanation:
            'The last event, the next action, and the time taken reveal behavior and consequences. Calling your app “amazing” asks for praise; “You hate the current system, right?” pushes a particular answer. Neither helps you understand their experience fairly.',
          hint: 'There are three useful questions. They ask for past actions or time, without telling the person what to think.',
        },
        'f2-b': {
          prompt:
            'The person shares a sensitive detail during your interview. What is the appropriate next step?',
          context:
            'You only need enough information to understand the problem. Sharing a story with you is not permission to publish their identity or quote.',
          explanation:
            'Ask what may be recorded, avoid unnecessary identifying details, and respect a refusal. You can use an alias or leave a sensitive detail out while still learning about the task. Research does not override the participant’s choice.',
          hint: 'Choose the action that lets the participant decide what you may keep.',
        },
        'f2-c': {
          prompt:
            'Save an honest interview notebook: a plan if you have not spoken to anyone, or notes from a conversation you actually had.',
          context:
            'For a plan, begin “Interview plan:” and include your questions. For an actual interview, include an alias, date, permission, recent situation, quote, and workaround. Do not turn a practice character’s answer into a real interview.',
          explanation:
            'A plan prepares you to collect evidence; a completed interview records what a person actually said or did. Keep exact words in quotes and your interpretation in a separate sentence so you can revisit the reasoning later.',
          hint: 'No interview yet? Write a plan with one question about the last event and two follow-ups. Do not invent a participant or response.',
        },
      },
    },
    'define-3': {
      title: 'Show what a claim rests on',
      goal: 'Separate observations from predictions and state what your evidence can and cannot support.',
      why: 'A small observation can explain one situation. Treating it as proof about everyone can send you toward the wrong problem or feature.',
      steps: [
        'Classify the notes: an observed action or reported quote is evidence; an untested prediction is an assumption.',
        'When two accounts disagree, compare the situations before deciding that either is wrong.',
        'Write your source, what happened, the claim it supports, and the limits. If untested, write a collection plan.',
      ],
      success:
        'Your evidence note makes the relationship visible: source → observation → supported claim → remaining uncertainty. It allows a reader to see where you are still guessing.',
      hint: 'Evidence (หลักฐาน) records something observed or reported. An assumption (ข้อสมมติที่ยังไม่ตรวจสอบ) says what you expect but have not checked.',
      exerciseCopy: {
        'f3-a': {
          prompt:
            'Place each note under Evidence or Assumption. Classify what the sentence actually says.',
          context:
            'The paper lists were shown to the researcher and the five-chat sentence was reported by a participant. The payment and AI-trust sentences make predictions.',
          explanation:
            'Seeing two paper lists is evidence of those people’s behavior. The five-chat quote is evidence of what that participant reported, though it is not independently verified. “Everyone will pay” and “AI will make people trust” remain assumptions. None of these notes proves what all students will do.',
          hint: 'Ask whether the sentence records an observation or quote, or predicts an outcome that still needs checking.',
        },
        'f3-b': {
          prompt:
            'One interviewee checks many chats; another finds deadlines in one place. What should you do with the disagreement?',
          context:
            'They may have different subjects, group roles, or update routines. Keep both accounts so you can investigate the difference.',
          explanation:
            'Explore the situations and collect more evidence. The difference may reveal a group that needs help and another that already has a working routine. Deleting an inconvenient answer or favoring a friend hides the distinction your design needs.',
          hint: 'Compare when, where, and for whom the problem occurs before generalizing.',
        },
        'f3-c': {
          prompt:
            'Write an evidence note linking one source to a claim about your project, then state the claim’s limits.',
          context:
            'Use the existing note fields: source/date, what was said or done, what it supports, and what it does not prove. If you have no real evidence yet, say so and describe how you will collect it.',
          explanation:
            'A useful note lets someone follow your reasoning. For example, one observed search across chats may support a coordination problem for that participant; it cannot show that every student has the problem or will buy an app. Saving the note does not independently verify it.',
          hint: 'Write “This supports __ for __ in this situation. It does not yet show __.” Keep the source distinct from your conclusion.',
        },
      },
    },
    'define-4': {
      title: 'Explain the need before the feature',
      goal: 'Write a problem brief connecting the user, situation, difficulty, possible cause, and desired progress.',
      why: 'An insight explains why a person struggles. That gives different solutions a clear outcome to aim for and gives your next test a question to challenge.',
      steps: [
        'Choose the insight that connects a situation and behavior to a reason, rather than a broad preference or feature idea.',
        'Identify the job: what the person wants to accomplish when that situation occurs.',
        'Write your pattern and refined problem statement. Name the supporting evidence and any cause that still needs checking.',
      ],
      success:
        'Your brief names one main need and its consequence, includes the current workaround, and labels uncertain reasoning. It can guide a test without committing you to a particular tool.',
      hint: 'Use “When __, this user __ because __.” Then ask what would change in their day if that difficulty were resolved.',
      exerciseCopy: {
        'f4-a': {
          prompt:
            'Which insight explains why students keep checking deadline updates and gives a solution a clear purpose?',
          context:
            'Look for the relationship between scattered updates, repeated checking, and uncertainty about the current date.',
          explanation:
            'The scattered-update insight links a situation to a behavior and a possible reason: students re-check because the current deadline is unclear. A useful change would make the current date recognizable. “Students like technology” is too broad; “build a chatbot” proposes a tool without explaining the need.',
          hint: 'Choose the statement that explains a difficulty with “when” and “because.”',
        },
        'f4-b': {
          prompt: 'Which statement describes the progress a student wants when a deadline changes?',
          context:
            'A job to be done (สิ่งที่ผู้ใช้ต้องการทำให้สำเร็จ) describes a situation and outcome. A database or a color is a design choice.',
          explanation:
            'Knowing the current date lets the student plan their work. That remains the goal whether you use a calendar, noticeboard, or app. Using a database and making a screen blue describe implementation choices, not the progress the student needs.',
          hint: 'Look for a situation, the help needed, and why that help matters.',
        },
        'f4-c': {
          prompt:
            'Write your problem brief: the pattern you see and the specific problem you will investigate next.',
          context:
            'In the pattern field, connect “when,” the user’s behavior, and “because”; include evidence and uncertainty. In the problem field, name the user, situation, pain, consequence, and workaround. A suspected cause should be labeled as a hypothesis.',
          explanation:
            'The two notes should agree on the same need. Your pattern explains a possible reason; your problem statement captures what goes wrong for whom. If evidence is missing, the next step is to investigate the cause rather than present the brief as validated.',
          hint: 'Read your brief without any proposed feature. Can someone still understand who struggles, what happens, why it matters, and what you need to check?',
        },
      },
    },
  },
  practices: {
    'insight-cause': {
      title: 'Why did the menu promise unavailable lunch?',
      goal: 'Separate what students experience, the information failure behind it, and a proposed change.',
      why: 'A sold-out switch might help because the printed menu stays unchanged. Calling the switch “the cause” skips the explanation of what currently goes wrong.',
      steps: [
        'Read each cafeteria note. Identify whether it describes an unwanted result, why information misleads students, or something the team could build.',
        'Tap a note and its destination, or drag it there: hungry students to Symptom, the unchanged menu to Cause, and the switch to Solution idea.',
        'Check the relationship: an unchanged menu suggests food is available, a student makes the walk, and the sold-out dish leaves them without lunch.',
      ],
      success:
        'All three notes occupy their matching categories. You can explain how a staff-controlled sold-out switch could address the information failure, while still needing to check whether staff can keep it updated.',
      hint: 'Symptom = what goes wrong for the person (อาการของปัญหา). Cause = why it happens (สาเหตุ). Solution idea = a proposed way to change it.',
      feedback: {
        'Students walk away hungry: place this piece.':
          'Expected: the student’s unwanted outcome under Symptom. That note is still unplaced. Select it, then tap Symptom.',
        'Students walk away hungry: try a different destination.':
          'Expected: Symptom. Walking away hungry describes the result for students; it does not explain why the menu misled them. Move this note to Symptom.',
        'Menu never updates: place this piece.':
          'Expected: the information failure under Cause. Place the unchanged-menu note in Cause.',
        'Menu never updates: try a different destination.':
          'Expected: Cause. The printed menu stays up after a dish sells out, so it gives students outdated information. Move this note to Cause.',
        'Add a sold-out switch: place this piece.':
          'Expected: a proposed change under Solution idea. Place the switch there; it has not been built or tested in this scenario.',
        'Add a sold-out switch: try a different destination.':
          'Expected: Solution idea. The switch is something you could add; it is not what currently makes the menu inaccurate. Move it to Solution idea.',
        success:
          'The notes form a useful explanation: unchanged menu → mistaken expectation → a wasted trip for unavailable food. The proposed switch targets that information gap.',
      },
    },
    'scope-lunch': {
      title: 'Give the student a trustworthy stock check',
      goal: 'Pack the complete menu → staff update → updated-time chain within six build points.',
      why: 'Before walking to a stall, a student needs to see what is available and judge how recent that information is. A menu without updates can repeat the original problem.',
      steps: [
        'Pack Live menu for three points so the student can see the dishes.',
        'Add Staff update for two points and Updated time for one. Updates need the menu; the time needs an update to describe.',
        'Return Payment and Accounts if packed. Check that all three stock-check pieces are present and the counter reads 6/6.',
      ],
      success:
        'Live menu, Staff update, and Updated time are packed with their dependencies for 6/6 points. The selection describes a complete stock check; the game does not run a real cafeteria or prove staff will maintain it.',
      hint: 'Dependency (สิ่งที่ต้องมีให้พร้อมก่อน) means one part relies on another. Reading, updating, and judging freshness each serve the student’s decision before walking.',
      feedback: {
        'The first version needs live menu.':
          'Expected: students can see the available dishes. Live menu is missing. Pack it for three points; an update or timestamp alone gives no dish list.',
        'The first version needs staff update.':
          'Expected: stock changes can reach the student. Staff update is missing. Add it for two points so the menu can change when a dish sells out.',
        'The first version needs updated time.':
          'Expected: students can judge how recent the stock check is. Updated time is missing. Add it for one point; a “live” label alone says nothing about when staff checked.',
        'Staff update needs Live menu.':
          'Expected: a menu for staff to change. You packed Staff update without Live menu. Add the menu; the update needs a dish list to operate on.',
        'Updated time needs Staff update.':
          'Expected: an update whose time can be shown. You packed Updated time without Staff update. Add the update rather than displaying a timestamp with no stock-changing action.',
        'Payment needs Accounts.':
          'Expected in this version: a six-point stock check. Payment also needs Accounts and does not answer whether lunch is available. Return Payment instead of expanding this release.',
        ...Object.fromEntries(
          [7, 8, 9, 10, 11, 12].map((used) => [
            `${used}/6 points. Return an extra feature.`,
            `Expected: the complete stock check within six points. Your selection costs ${used}. Return Payment and Accounts; Live menu + Staff update + Updated time uses 3 + 2 + 1 = 6.`,
          ]),
        ),
        success:
          'The student can read available dishes and see how recently staff changed them. You protected that need by leaving payment out of the six-point version.',
      },
    },
    'scope-library': {
      title: 'Make “find a book” lead to a borrowable copy',
      goal: 'Pack a complete find → check availability → reserve flow within five build points.',
      why: 'A title in a search result does not tell Mali whether a copy can be borrowed. Availability and reservation connect finding a book to the next useful action.',
      steps: [
        'Pack Book catalog for two points so Mali can find a title.',
        'Add Copy availability for one point, then Reserve a copy for two. Availability needs the catalog; reservation needs availability.',
        'Return Book club chat and Recommendations if packed. Check all three borrowing pieces and a 5/5 total.',
      ],
      success:
        'Book catalog, Copy availability, and Reserve a copy are packed for 5/5 points with no missing dependency. This activity checks the chosen feature chain; it does not execute or verify a real reservation.',
      hint: 'Ask what Mali can do after each step. Finding a title starts the task; checking a copy and reserving it make the first flow useful.',
      feedback: {
        'The first version needs book catalog.':
          'Expected: Mali can find the title she wants. Book catalog is missing. Add it for two points so availability has a book to refer to.',
        'The first version needs copy availability.':
          'Expected: Mali knows whether a copy can be borrowed. Copy availability is missing. Add it for one point; a search result alone cannot answer her question.',
        'The first version needs reserve a copy.':
          'Expected in this challenge: Mali can act on an available copy. Reserve a copy is missing. Add it for two points to complete the find-check-reserve flow.',
        'Copy availability needs Book catalog.':
          'Expected: availability attached to a book. You packed Copy availability without Book catalog. Add the catalog so the status refers to the title Mali found.',
        'Reserve a copy needs Copy availability.':
          'Expected: a reservation based on an available copy. You packed Reserve a copy without Copy availability. Add availability before promising a copy for pickup.',
        'Recommendations needs Book catalog.':
          'Expected in this version: the five-point borrowing flow. Recommendations needs a catalog but does not complete borrowing. Return Recommendations and keep points for the required flow.',
        ...Object.fromEntries(
          [6, 7, 8, 9, 10, 11, 12].map((used) => [
            `${used}/5 points. Return an extra feature.`,
            `Expected: the complete borrowing flow within five points. Your selection costs ${used}. Return Book club chat and Recommendations; Book catalog + Copy availability + Reserve a copy uses 2 + 1 + 2 = 5.`,
          ]),
        ),
        success:
          'The five-point version carries Mali from a title to an available copy she can reserve. Chat and recommendations can be reconsidered after this core task works.',
      },
    },
  },
  stages: {
    insight: {
      title: 'Connect the queue clues into one explanation',
      goal: 'Use the four collected campus clues to explain who struggles, what goes wrong, why, and what would help.',
      why: 'Mali has a twelve-minute break and cannot judge a queue before walking. Noa’s old board and Ken’s need for recent information explain why a fresh queue report matters more than the unsupported payment idea.',
      steps: [
        'Use Read clue to inspect the full account. Match A short lunch break to Person and A wasted walk to Problem.',
        'Match The board is old to Cause and Fresh information to Need. Drag each clue or select it and tap the matching space.',
        'Put A tempting claim in Set aside. Read the connected insight and check how each clue supports the next part of the explanation.',
      ],
      success:
        'The four collected clues fill different matching spaces and the payment claim is set aside. The connected sentence explains the queue-information problem in the simulated campus; it is not evidence from real interviews.',
      hint: 'Ask each space’s question: Who? What goes wrong? Why? What would help? The board’s missing update process explains the information gap; payment does not.',
      feedback: {
        'Fill person with a card you collected in the conversations.':
          'Expected: a collected clue describing who faces the problem. Person is empty or uses an uncollected clue. Use Mali’s A short lunch break; collect it in Explore first if it is unavailable.',
        'Fill problem with a card you collected in the conversations.':
          'Expected: a collected account of what went wrong. Problem is empty or uses an uncollected clue. Use Mali’s A wasted walk from Explore.',
        'Fill cause with a card you collected in the conversations.':
          'Expected: a collected clue explaining why the information misleads students. Cause is empty or uses an uncollected clue. Use Noa’s The board is old from Explore.',
        'Fill need with a card you collected in the conversations.':
          'Expected: a collected clue about the help needed before walking. Need is empty or uses an uncollected clue. Use Ken’s Fresh information from Explore.',
        'Collect this clue in Explore first.':
          'This puzzle uses clues recorded from the practice conversations. Return to Explore to collect the missing account; filling a space cannot substitute for asking the question.',
        'Try person.':
          'This clue describes who is affected: students with a short break. Move it to Person, rather than using it as the cause or the proposed help.',
        'Try problem.':
          'This clue describes the failed experience: a walk to a queue that was longer than expected. Move it to Problem; the old noticeboard explains why the expectation was wrong.',
        'Try cause.':
          'This clue explains the information failure: the queue changes but the board has no quick update or visible time. Move it to Cause.',
        'Try need.':
          'This clue names the help needed: a recent queue report with a visible update time. Move it to Need; it is the desired change, rather than an account of yesterday’s wasted walk.',
        'An opinion. Set it aside.':
          'The payment claim has no supporting observations and does not explain the queue problem. Select A tempting claim and tap Set aside.',
        'This is an unsupported payment opinion. Put it in the “Set aside” area, not your insight.':
          'Expected: evidence about this queue-information problem. The payment opinion is unsupported. Set it aside so it cannot stand in for the person, problem, cause, or need.',
        'Set aside the unsupported payment claim before continuing.':
          'Your four spaces may be complete, but the payment claim still needs a destination. Put A tempting claim in Set aside; an attractive feature idea is not evidence of this need.',
        'Use a different clue for each puzzle space.':
          'Expected: one distinct clue for each part of the explanation. Reusing a clue does not establish a new relationship. Match the four different collected accounts to their questions.',
        success:
          'Students with short breaks cannot judge the queue before walking because the board becomes stale. A recent report with an update time would support that decision. The next research question is whether staff can keep that information current during lunch.',
      },
    },
  },
  bonusLesson: {
    id: 'pro-unit-2',
    missionId: 2,
    title: 'Two causes behind one complaint',
    subtitle: 'Compare explanations before choosing what to change.',
    nodeType: 'quiz',
    xp: 20,
    minutes: 4,
    exercises: [
      {
        id: 'pro-u2-pickup-evidence',
        type: 'categorize',
        prompt: 'Sort the pickup notes by what each sentence claims.',
        context:
          'Authored practice case: six students missed a reserved-book pickup. The desk closes at 16:00. Four arrived at 16:15 after club activities; two arrived at 15:30 but staff could not find their reserved copies.',
        items: [
          { id: 'late-arrival', text: 'Four students arrived after the desk closed.' },
          {
            id: 'missing-copy',
            text: 'Two students arrived before closing, but staff could not find their copies.',
          },
          { id: 'hours-cause', text: 'Desk hours may conflict with club students’ pickup times.' },
          {
            id: 'universal-fix',
            text: 'Keeping the desk open later will fix every missed pickup.',
          },
        ],
        categories: [
          { id: 'observed', label: 'Observed in this case' },
          { id: 'hypothesis', label: 'Cause to investigate' },
          { id: 'overclaim', label: 'Conclusion beyond the evidence' },
        ],
        correctCategories: {
          'late-arrival': 'observed',
          'missing-copy': 'observed',
          'hours-cause': 'hypothesis',
          'universal-fix': 'overclaim',
        },
        explanation:
          'Arrival times and the missing-copy incidents are observations within this fictional case. A conflict between club schedules and desk hours is a plausible cause to investigate. Later hours alone would not explain the two before-closing failures, so “every missed pickup” goes beyond the evidence.',
        hint: 'Keep the recorded events, a possible explanation, and a promise about all failures in different categories.',
      },
      {
        id: 'pro-u2-pickup-segments',
        type: 'multi',
        prompt:
          'Choose both problem briefs that preserve the difference between the two experiences.',
        context:
          'Four students arrived after closing; two arrived before closing and could not get their reserved copies. You want each brief to guide a different question about what goes wrong.',
        options: [
          {
            id: 'late-group',
            text: 'Club students arriving at 16:15 cannot collect a book from a desk that closes at 16:00.',
          },
          {
            id: 'missing-group',
            text: 'Students arriving before closing still cannot collect a book when staff cannot locate the reserved copy.',
          },
          {
            id: 'all-careless',
            text: 'All students forget to collect books because they are careless.',
          },
          { id: 'build-ai', text: 'The library needs an AI recommendation app.' },
        ],
        correctAnswerIds: ['late-group', 'missing-group'],
        explanation:
          'The first two briefs retain who, when, and what failed. They lead to different investigations: pickup access after clubs and the handling of reserved copies. The notes do not establish carelessness, and a recommendation feature does not explain either failed pickup.',
        hint: 'Select two. One brief should account for late arrival; the other should account for failure while the desk was still open.',
      },
      {
        id: 'pro-u2-pickup-rival-cause',
        type: 'choice',
        prompt:
          'Before choosing reminders as the fix, which investigation best checks why club students arrive late?',
        context:
          'Two explanations remain possible: students may not know the closing time, or they may know it but be unable to leave club activities earlier.',
        options: [
          {
            id: 'sell-reminders',
            text: 'Ask, “Would you love an app that reminds you to collect books?”',
          },
          {
            id: 'check-timeline',
            text: 'Ask what they knew about closing time, when their last club ended, and what they tried before arriving.',
          },
          {
            id: 'assume-forgot',
            text: 'Treat every late arrival as proof that the student forgot.',
          },
          {
            id: 'count-likes',
            text: 'Show a reminder-screen mockup and count compliments about its colors.',
          },
        ],
        correctAnswerIds: ['check-timeline'],
        explanation:
          'Knowledge of the hours plus the actual club timeline helps distinguish an information problem from an access constraint. If students knew the hours but could not leave earlier, a reminder would not change when they can arrive. Investigate before committing to that feature.',
        hint: 'Choose evidence that could distinguish the two explanations. A favorable reaction to a reminder does not tell you why the last pickup failed.',
      },
      {
        id: 'pro-u2-pickup-revise',
        type: 'sort',
        prompt: 'Order the reasoning steps for updating the club-student problem brief.',
        context:
          'You are investigating a suspected conflict between club end times and pickup hours. You have not yet conducted the follow-up conversations.',
        items: [
          {
            id: 'revise-brief',
            text: 'Revise the brief to match what the follow-up supports, keeping any uncertainty visible.',
          },
          {
            id: 'state-hypothesis',
            text: 'Write the hypothesis: club end times may prevent pickup before 16:00.',
          },
          {
            id: 'compare-support',
            text: 'Compare whether each account supports a schedule conflict or points to a different cause.',
          },
          {
            id: 'collect-timeline',
            text: 'With permission, collect recent club end times, knowledge of desk hours, and attempted workarounds.',
          },
        ],
        correctOrder: ['state-hypothesis', 'collect-timeline', 'compare-support', 'revise-brief'],
        explanation:
          'State the uncertainty so you know what to investigate, collect relevant accounts, compare them with the suspected cause, then revise the brief. If accounts disagree, preserve the different situations rather than force one explanation. This ordered plan is not a completed interview or validation result.',
        hint: 'Name what you need to learn before collecting it. Examine the evidence before rewriting the conclusion.',
      },
    ],
  },
};
