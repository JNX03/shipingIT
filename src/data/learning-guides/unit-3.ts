import type { UnitContent } from './types';

export const unit3Content: UnitContent = {
  unitId: 3,
  title: 'Scope',
  summary:
    'Choose the smallest complete user task you can build with your time and skills. Count prerequisites, keep essential usability, and explain what you leave for later.',
  lessons: {
    'scope-1': {
      title: 'Choose a useful direction',
      goal: 'Compare ways to show one current deadline, then write a promise for your own project.',
      why: 'A tool is only useful if it helps someone finish their task. Comparing a calendar, a digest, and a board reveals different update effort and failure risks.',
      steps: [
        'Compare how each approach helps a group leader find the current date and who would keep it current.',
        'Choose the promise that names a person, a task, and a benefit.',
        'Give your project a working name and write its value proposition: who it helps, what becomes easier, and how.',
      ],
      success:
        'Your promise describes one useful outcome, and you can explain why your chosen direction is worth trying.',
      hint: 'Value proposition (คุณค่าที่เสนอ) means the reason a user would choose your solution. Start with “For [user] who needs [job]…”',
      exerciseCopy: {
        's1-a': {
          prompt: 'How should you explore ways to give a group leader one reliable deadline?',
          context:
            'Worked example: assignment dates are scattered across chats. A shared calendar, weekly digest, and deadline board could each help, but someone must keep the date current.',
          explanation:
            'Compare the three approaches before choosing. A digest may miss a change between editions; a calendar or board still needs an owner to update it. Choose a direction you can test with a complete user task.',
          hint: 'Compare approaches that solve the same need before committing your build time.',
        },
        's1-b': {
          prompt: 'Which promise makes the benefit clear enough to check?',
          context:
            'The group leader needs to confirm today’s deadline without reading old messages. A promise should say what becomes easier for that person.',
          explanation:
            '“One place for group leaders to confirm the current deadline” names the user, task, and benefit. You could later check whether someone finds the current date. “Best” and “innovative” do not define that outcome.',
          hint: 'Look for a specific person doing a specific job more easily.',
        },
        's1-c': {
          prompt: 'Name your project and write the user benefit you want to test.',
          context:
            'Use your own project. In the value-proposition field, name the user, their job, your approach, and another approach you considered. The name can change later.',
          explanation:
            'This records a direction to investigate. The promise is still an assumption until someone tries it; a working name and a clear benefit help you decide what the first version must do.',
          hint: 'For the deadline example: “For group leaders checking changed dates, one board shows the current deadline. We also considered a weekly digest.”',
        },
      },
    },
    'scope-2': {
      title: 'Keep one complete task',
      goal: 'Define a small MVP that can test one risky assumption without leaving the user stuck.',
      why: 'A deadline board that cannot be updated soon becomes misleading. Removing decoration saves effort; removing the update step breaks the promised outcome.',
      steps: [
        'Identify the assumption your first version needs to test.',
        'Keep reading the current deadline and letting the group leader update it; place the unrelated extras in Later.',
        'Write your own MVP’s user task, assumption, and two explicit exclusions.',
      ],
      success:
        'Your MVP statement describes a usable task and a question it can help answer, with two features deliberately excluded.',
      hint: 'MVP (รุ่นแรกที่เล็กแต่ใช้งานได้) is small enough to build and complete enough to learn from. Ask what fails if you remove each feature.',
      exerciseCopy: {
        's2-a': {
          prompt: 'What makes a first version useful as an MVP?',
          context:
            'For the deadline board, one assumption is that a group leader can keep the date current so students can plan their work. A first test needs a usable way to read and update that date.',
          explanation:
            'An MVP tests a key assumption through the smallest usable experience. Copying every competitor feature spends time without answering the question; deliberately poor quality can prevent the task from working.',
          hint: 'The version needs to help the user do something and teach you something specific.',
        },
        's2-b': {
          prompt: 'Sort the features for a first test of a current deadline board.',
          context:
            'The promise is to show the current deadline. Keep the steps needed to maintain and read it. This first test does not need social activity or profile decoration.',
          explanation:
            'Showing the deadline and letting the group leader update it are Must have: without either, students cannot reliably use the current date. Profile frames and a public feed belong in Later because neither completes that task.',
          hint: 'If removing the feature breaks reading or updating the deadline, it belongs in Must have.',
        },
        's2-c': {
          prompt: 'Write the boundary of your own first useful test.',
          context:
            'In the MVP field, include the user, one complete job, the assumption being tested, and two things you will leave out. Keep the plan achievable with your available time and skills.',
          explanation:
            'The statement sets a boundary for your first experiment. A manual board or simple prototype may be enough to try the task. Writing the plan does not yet prove that users can complete it or that the assumption is true.',
          hint: 'Try: “Our MVP lets [user] do [job]. It tests whether [assumption]. We will leave out [extra] and [extra].”',
        },
      },
    },
    'scope-3': {
      title: 'Make the trade-off visible',
      goal: 'Prioritize features against the user’s task, your constraints, and the question you need to test.',
      why: 'Every added feature uses build time and may need other features first. A clear Later list protects the useful first version while keeping good ideas available.',
      steps: [
        'Compare a feature’s effort with the user benefit and learning it adds to the first test.',
        'Include available skills, the risky assumption, and accessibility when choosing the first scope.',
        'Write Must have, Nice to have, and Later; add a time limit and the first feature you would cut with a reason.',
      ],
      success:
        'Your feature list has a priority order and an explained first cut that preserves the complete user task.',
      hint: 'Trade-off (การเลือกโดยยอมเสียบางอย่าง) means explaining what you gain and give up. Count a feature’s prerequisites as part of its effort.',
      exerciseCopy: {
        's3-a': {
          prompt:
            'A two-week feature will not test your main assumption. What should you do first?',
          context:
            'You are protecting the first deadline-board test. The proposed feature adds effort without helping you learn whether the board can stay current.',
          explanation:
            'Put the feature in Later and protect the first test. The consequence is a smaller initial version and earlier learning; the idea remains available if later evidence makes it worth the effort.',
          hint: 'An interesting idea can wait without ending the whole project.',
        },
        's3-b': {
          prompt:
            'Which factors should shape a usable, achievable first scope? Select all that apply.',
          context:
            'A first test needs to serve the target user and fit your resources. For example, readable text is part of being able to check a deadline, even in a small version.',
          explanation:
            'Consider the critical task, available time and skills, riskiest assumption, and accessibility for target users. A friend’s suggestion is useful input to evaluate, but including every suggestion would remove your scope boundary.',
          hint: 'Choose the factors that affect whether your user can finish the task and whether you can build and learn from it.',
        },
        's3-c': {
          prompt: 'Write your feature priorities and explain what you would cut first.',
          context:
            'Use the feature field to record Must have, Nice to have, Later, your time limit, and a first cut with its consequence. Keep prerequisites with the features that depend on them.',
          explanation:
            'This makes the decision understandable to someone helping you build. Cutting a profile frame can save effort while preserving deadline checking; cutting the only update method would leave dates stale. Revisit the order when a test gives you new evidence.',
          hint: 'Ask of your first cut: “What time do we save, and can the user still finish the promised task?”',
        },
      },
    },
    'scope-4': {
      title: 'Trace the path to value',
      goal: 'Map a complete journey from opening your project to a useful result, including a way to recover.',
      why: 'A feature list can hide gaps between steps. Walking through the journey reveals whether someone can reach the outcome before you spend time building extras.',
      steps: [
        'Order the deadline journey from opening the board to deciding what to work on next.',
        'Prioritize the step that blocks the main outcome.',
        'Write your own start-to-success flow, one recovery path, and a one-sentence project description.',
      ],
      success:
        'Your user flow ends in a useful decision or action, and it says what the user can do if a step fails.',
      hint: 'User journey (เส้นทางที่ผู้ใช้ทำงานจนสำเร็จ) includes the outcome. “Opened a screen” is a step; “knows what to work on next” is the benefit.',
      exerciseCopy: {
        's4-a': {
          prompt: 'Order the steps that help a student decide what to work on next.',
          context:
            'In this example, the board contains several assignments. The student must open it and choose the relevant assignment before reading its deadline.',
          explanation:
            'Open the board → choose an assignment → read the current deadline → decide what to work on next. Each step supplies what the next step needs, and the journey ends in a decision the student can use.',
          hint: 'The board is the entry point. The work decision comes after the relevant date is known.',
        },
        's4-b': {
          prompt: 'Which friction should you remove first from the user’s journey?',
          context:
            'You have limited build time. A core step is preventing users from reaching the promised outcome, while decorative settings and the logo animation are optional.',
          explanation:
            'Fix the step that blocks the main outcome. If a student cannot find the relevant deadline, polishing the logo does not help them plan their work. This protects the critical path before improving extras.',
          hint: 'Friction (อุปสรรคระหว่างใช้งาน) matters most where it prevents the task from being completed.',
        },
        's4-c': {
          prompt: 'Describe your first complete user flow and its useful ending.',
          context:
            'In the user-journey field, write the entry point, actions, success, and one recovery step. In the description field, connect the user, outcome, and focused solution in one sentence.',
          explanation:
            'The flow makes your scope checkable: someone can trace whether the proposed features support every step. A recovery step explains what to do when blocked, such as asking the group leader to confirm a missing date. Trying the flow is the next step; writing it is a plan.',
          hint: 'Finish with “Success means the user can…” and “If this step fails, they can…”',
        },
      },
    },
  },
  practices: {
    'design-thumb': {
      title: 'Keep the small version usable with one hand',
      goal: 'Arrange the shuttle screen so Ken can read the status and reach Notify me while carrying his bag.',
      why: 'Scope includes being able to use the main action. Moving a button and enlarging its target can solve a barrier without adding another feature.',
      steps: [
        'Move Campus shuttle to Top · context, Next shuttle · 6 min to Middle · status, and Notify me to Bottom · action.',
        'Use + to grow the action target from 28px to at least 48px.',
        'Run this version, read the check result, and finish after the current layout passes.',
      ],
      success:
        'The three pieces match their zones and the target is at least 48px. A passing run lets you finish this practice layout.',
      hint: 'If the action is still in the middle, making it larger will not fix the placement check. Match the zone and size, then rerun.',
      feedback: {
        title:
          'Campus shuttle identifies the screen. If it is at the bottom, move it to the top context zone.',
        status:
          'The six-minute status belongs in the middle so Ken can read it before choosing the action.',
        action:
          'Notify me should be at the bottom. An action in the middle or top does not match this one-hand layout.',
        targetSize:
          'The practice requires at least 48px. If the displayed target is 28px, press + five times to reach 48px.',
        run: 'A changed piece or target size clears the old run. Run the current arrangement before finishing.',
        success:
          'The practice layout puts the six-minute status before a reachable Notify me action. You kept the same features and removed a usability barrier.',
      },
    },
    'design-readable': {
      title: 'Keep review and readability in scope',
      goal: 'Make the broken-light report readable for Noa and place its evidence before Send report.',
      why: 'A small report form still needs readable evidence and a usable submit action. Cutting those to save effort would stop the task from working at the bright counter.',
      steps: [
        'Place Report a broken light at the top, Photo and location in the middle, and Send report at the bottom.',
        'Grow the action target to at least 48px and choose Strengthen text contrast.',
        'Run this version and repair the specific placement, size, or contrast failure before finishing.',
      ],
      success:
        'The practice puts evidence before submission, uses a target of at least 48px, and has stronger contrast with a passing current run.',
      hint: 'Contrast (ความต่างระหว่างข้อความกับพื้นหลัง) helps text stand out. A larger button alone will not repair the pale text.',
      feedback: {
        title: 'The report title belongs at the top to explain what this screen is for.',
        status:
          'Photo and location belong in the middle, before the send action. If they are at the bottom, move them into the evidence zone.',
        action:
          'Send report belongs at the bottom, after Noa has a chance to review the photo and location.',
        targetSize:
          'Below 48px, the target check fails. Use + until Action target shows at least 48px.',
        contrast:
          'If Bright-light reading reports pale text, choose Strengthen text contrast and rerun. Undoing the repair makes that check fail again.',
        run: 'The run checks this arrangement, size, and contrast setting. Any later change needs a fresh run.',
        success:
          'The practice checks pass: the report’s evidence comes before Send, and its size and contrast settings meet this exercise’s requirements.',
      },
    },
    'connect-report': {
      title: 'Scope the whole report loop',
      goal: 'Connect starting a report, saving it, and returning to the updated board into one complete flow.',
      why: 'A visible form is only part of the job. If Send skips saving or Done leads to the wrong place, the next person cannot read the update.',
      steps: [
        'Connect Tap Add report to Open report form.',
        'Connect Tap Send report to Save and confirm, then Tap Done to Updated board.',
        'Run this version and compare all three results with the intended destinations before finishing.',
      ],
      success:
        'The start, save, and return checks pass for the current connections. The simulated journey has a complete start-save-read loop.',
      hint: 'Match each button’s promise: Add opens the form, Send saves and confirms, Done shows the update. A new connection needs a new run.',
      feedback: {
        add: 'Expected: Open report form. If Add leads to Save and confirm or Updated board, Mali has no place to start writing.',
        submit:
          'Expected: Save and confirm. If Send leads straight to the board, the connection skips the saving-and-confirmation step.',
        done: 'Expected: Updated board. If Done returns to the form, the flow does not reach the place where the update can be read.',
        start: 'If “Mali starts a report” fails, reconnect Tap Add report to Open report form.',
        save: 'If “The report is saved” fails, reconnect Tap Send report to Save and confirm.',
        return: 'If “The update is visible” fails, reconnect Tap Done to Updated board.',
        run: 'Changing a connection clears the previous check. Rerun all three steps to verify this version.',
        success:
          'All three practice destinations match: start at the form, save and confirm, then return to the updated board. Each step supports the next person reading the report.',
      },
    },
  },
  stages: {
    scope: {
      title: 'Pack one useful queue-checking loop',
      goal: 'Fit a current queue board and a way to refresh it inside the seven-point build budget.',
      why: 'In this campus story, students decide whether a lunch queue is worth the walk. They need the report, when it was checked, and a way for someone to update it. The same read-and-update principle applies to your deadline-board example.',
      steps: [
        'Read each shelf card’s cost and Needs line. A dependency is another feature it requires to work.',
        'Pack Queue board (3), Updated time (2), and Report a queue (2) by tapping or dragging them into the first-version tray.',
        'Return extras to the shelf. Keep the required loop at 7/7 with its prerequisites present, then choose Design this version.',
      ],
      success:
        'All three core features are packed, no prerequisite is missing, and the total is 7/7. Design this version becomes available.',
      hint: 'Dependency (สิ่งที่ต้องมีก่อน) counts toward the budget too. Updated time and Report a queue both need Queue board; alerts do not replace any of those three jobs.',
      feedback: {
        'queue-board':
          'Without Queue board, students cannot see a report, and both Updated time and Report a queue are missing their prerequisite. Pack the board for 3 points.',
        freshness:
          'Without Updated time, a displayed report could be old without showing it. This required feature costs 2 points and needs Queue board.',
        'report-update':
          'Without Report a queue, there is no way to refresh the information. This required feature costs 2 points and needs Queue board.',
        'favorite-stall':
          'Favorite stalls adds 2 points. With the complete seven-point loop, the tray becomes 9/7; return favorites to preserve the first useful version.',
        notifications:
          'Notifications costs 3 points and needs Report a queue. Added to the core loop, it makes 10/7; a useful alert idea can wait.',
        'ai-predictions':
          'AI predictions costs 5 points and needs Report a queue. The core loop plus predictions is 12/7, and a prediction cannot replace showing when a report was checked.',
        payments:
          'Payments costs 4 points and requires Accounts, which costs 2 more. Together with the core loop, that is 13/7 and does not solve the queue-information problem.',
        accounts:
          'Accounts costs 2 points. The queue loop fits without it; adding it makes 9/7 unless you break a required part of the loop.',
        budget:
          'A total below 7/7 can still be incomplete. Check the three required jobs; a total above 7/7 means an extra feature must return to the shelf.',
        dependency:
          'A card marked Needs is not usable on its own. Keep its prerequisite or remove the dependent extra; removing Queue board breaks both update features.',
        success:
          'The 3 + 2 + 2 point loop fits the game’s build budget: students can read a report, judge its freshness, and refresh it. Extras stay on the shelf for later.',
      },
    },
  },
  bonusLesson: {
    id: 'pro-unit-3',
    missionId: 3,
    title: 'Count the hidden work',
    subtitle: 'Scope a workshop booking trial with dependencies and a manual fallback.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-u3-dependency-cost',
        type: 'choice',
        prompt: 'Which plan gives visitors a complete booking flow within six build hours?',
        context:
          'Planning exercise: a school repair workshop opens tomorrow. Session list costs 2 hours; Reserve a slot costs 2 and needs the list; Booking confirmation costs 1 and needs reservations. Recommendations costs 3 extra hours.',
        options: [
          { id: 'pro-u3-cost-confirm-only', text: 'Build Booking confirmation alone: 1 hour.' },
          {
            id: 'pro-u3-cost-complete',
            text: 'Session list + Reserve a slot + Booking confirmation: 5 hours.',
          },
          {
            id: 'pro-u3-cost-with-extra',
            text: 'The complete booking flow plus Recommendations: 8 hours.',
          },
        ],
        correctAnswerIds: ['pro-u3-cost-complete'],
        explanation:
          'The complete chain costs 2 + 2 + 1 = 5 hours, leaving one hour. Confirmation alone lacks both prerequisites; adding recommendations exceeds the six-hour budget. Count the work needed for the promise, not just the final feature.',
        hint: 'Follow every “needs” link and add its cost before comparing the total with six hours.',
      },
      {
        id: 'pro-u3-first-trial-decisions',
        type: 'multi',
        prompt: 'Which decisions fit one six-hour first trial? Select all that apply.',
        context:
          'The complete booking flow uses 5 hours. A cancellation link costs 1 hour and needs reservations, which are included. An already staffed help desk can handle the first ten visitors’ booking problems without extra build work. Recommendations costs 3 hours.',
        options: [
          {
            id: 'pro-u3-decision-cancel',
            text: 'Use the remaining hour for a cancellation link so visitors can release a slot.',
          },
          {
            id: 'pro-u3-decision-manual',
            text: 'Tell visitors that booking problems go to the existing help desk during this small trial.',
          },
          {
            id: 'pro-u3-decision-recommend',
            text: 'Add Recommendations before opening because it sounds impressive.',
          },
          {
            id: 'pro-u3-decision-defer',
            text: 'Put Recommendations in Later and state that the first version only handles booking.',
          },
        ],
        correctAnswerIds: [
          'pro-u3-decision-cancel',
          'pro-u3-decision-manual',
          'pro-u3-decision-defer',
        ],
        explanation:
          'The cancellation link brings build effort to six hours and its prerequisite is present. The existing desk supplies a stated, limited fallback. Deferring recommendations preserves the booking promise; adding them would exceed the budget. Manual support still uses staff time, so the ten-visitor limit matters.',
        hint: 'Check build hours, prerequisites, and the help desk’s stated capacity. An existing manual process still has a limit.',
      },
      {
        id: 'pro-u3-build-order',
        type: 'sort',
        prompt: 'Order the work so prerequisites exist before each dependent step.',
        context:
          'Reserve a slot needs the Session list. Booking confirmation needs a reservation. The final journey check needs all three parts.',
        items: [
          {
            id: 'pro-u3-order-confirm',
            text: 'Add Booking confirmation after a reservation is made.',
          },
          {
            id: 'pro-u3-order-check',
            text: 'Try choosing a session, reserving it, and reading its confirmation.',
          },
          { id: 'pro-u3-order-list', text: 'Make the available Session list.' },
          { id: 'pro-u3-order-reserve', text: 'Add Reserve a slot for a listed session.' },
        ],
        correctOrder: [
          'pro-u3-order-list',
          'pro-u3-order-reserve',
          'pro-u3-order-confirm',
          'pro-u3-order-check',
        ],
        explanation:
          'List → reserve → confirm → check the whole journey. A confirmation screen needs a reservation to confirm, and a reservation needs an available session. The last step checks the connection between parts before the trial.',
        hint: 'Start with the part that has no prerequisite. The full journey check comes after the connected parts exist.',
      },
      {
        id: 'pro-u3-build-manual-later',
        type: 'categorize',
        prompt: 'Separate the required build, the limited manual fallback, and later extras.',
        context:
          'For this first workshop trial, visitors must find a session, reserve a slot, and see confirmation. The existing desk handles booking problems for up to ten visitors. Recommendations and badges are outside the first booking promise.',
        items: [
          { id: 'pro-u3-sort-list', text: 'Available Session list' },
          { id: 'pro-u3-sort-reserve', text: 'Reserve a slot' },
          { id: 'pro-u3-sort-confirm', text: 'Booking confirmation' },
          { id: 'pro-u3-sort-help', text: 'Booking problem handled by the existing help desk' },
          { id: 'pro-u3-sort-recommend', text: 'Personalized repair recommendations' },
          { id: 'pro-u3-sort-badges', text: 'Animated visitor badges' },
        ],
        categories: [
          { id: 'pro-u3-category-build', label: 'Build before opening' },
          { id: 'pro-u3-category-manual', label: 'Handle manually in this trial' },
          { id: 'pro-u3-category-later', label: 'Later' },
        ],
        correctCategories: {
          'pro-u3-sort-list': 'pro-u3-category-build',
          'pro-u3-sort-reserve': 'pro-u3-category-build',
          'pro-u3-sort-confirm': 'pro-u3-category-build',
          'pro-u3-sort-help': 'pro-u3-category-manual',
          'pro-u3-sort-recommend': 'pro-u3-category-later',
          'pro-u3-sort-badges': 'pro-u3-category-later',
        },
        explanation:
          'The three build items form the required five-hour booking chain. The desk supplies a limited manual fallback. Recommendations and badges can wait because removing them leaves the booking task complete. Make that boundary clear to visitors and review it after the trial.',
        hint: 'Keep the full find-reserve-confirm job in Build. Use Manual only for the existing staffed fallback described in the scenario.',
      },
    ],
  },
};
