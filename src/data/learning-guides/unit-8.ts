import type { UnitContent } from './types';

export const unit8Content: UnitContent = {
  unitId: 8,
  title: 'Ship something you can explain',
  summary:
    'Test a specific task, repair what actually fails, and describe the version you have. Then plan how a small first audience could try it.',
  lessons: {
    'ship-1': {
      title: 'Give a first user one useful task',
      goal: 'Write a small launch plan with a reachable audience and one action they can try.',
      why: 'A launch is useful when you can see whether someone gets the promised benefit. A smaller group makes it easier to notice a blocked step and help.',
      steps: [
        'Choose people who face your problem and a channel where you can reach them.',
        'Invite them to do one task your current version supports. State its limits and how to get help.',
        'Write how you will collect what happened. If the product is still a prototype, say so.',
      ],
      success:
        'Your plan names an audience, channel, first task, support contact, limitations, and feedback method. It describes a planned launch accurately.',
      hint: 'For a deadline board, “find the next assignment due” is an observable first task. “Explore all our features” is too broad.',
      exerciseCopy: {
        'h1-a': {
          prompt:
            'You have a first version of a deadline board. Which launch plan lets you learn whether it helps?',
          context:
            'Students currently search several chats to find due dates. You can support a small group while they try finding their next assignment.',
          explanation:
            'A reachable group and a clear task let you observe the result: did they find the right assignment, or where did they get stuck? A post being seen does not answer that question.',
          hint: 'Choose the plan that names who will try it and what you will watch them do.',
        },
        'h1-b': {
          prompt: 'What can you honestly promise in the invitation for your current version?',
          context:
            'Your board can show saved deadlines today. Automatic reminders are still only a plan.',
          explanation:
            'Promise a benefit that works in this version. Calling a planned reminder “available” makes the invitation misleading and leaves a first user expecting an action they cannot complete.',
          hint: 'Read the promise as a new user: could you experience it today?',
        },
        'h1-c': {
          prompt:
            'Plan a small first try: who will use it, what will they do, and how will you hear what happened?',
          context:
            'Use your own project. If it is not accessible yet, name the prototype task you plan to test and mark the launch as planned.',
          explanation:
            'A useful plan makes the first task and support route concrete. Saving this note does not send invitations or publish your product. Add a live link only after checking that someone else can actually open it.',
          hint: 'Write “Expected: the student finds the next due assignment. I will record: completed or blocked, and the step.” Then add your audience and channel.',
        },
      },
    },
    'ship-2': {
      title: 'Show what exists and what you learned',
      goal: 'Write a short pitch that connects a person’s problem to your artifact and honest evidence.',
      why: 'A reader needs to understand the need before the features. Showing an expected result, an actual result, and a change makes your learning inspectable.',
      steps: [
        'Introduce the user and the problem, then state what evidence you actually have.',
        'Show the focused solution. Explain one observed difficulty and any change you made.',
        'End with a specific ask, then read your pitch aloud and aim for about 60 seconds.',
      ],
      success:
        'Your pitch says who needs help, what exists, what was tested or remains pending, and what you want to do next.',
      hint: 'Evidence (หลักฐาน) describes what happened. “The button looked nice” tells less than “two people could not find the button.”',
      exerciseCopy: {
        'h2-a': {
          prompt: 'Put the four parts of a short pitch in an order a new listener can follow.',
          context:
            'The listener has never seen your project. Help them understand the need and evidence before showing your solution.',
          explanation:
            'Start with the user and problem, explain the evidence and learning, show the focused solution, then ask for a next step. The solution now has a reason to exist.',
          hint: 'First establish who struggles and why. Finish with what you want the listener to do.',
        },
        'h2-b': {
          prompt: 'Which sentence reports this practice test accurately?',
          context:
            'Fictional example: five people tried the prototype. Three completed the task; two struggled at the same step. These are example results, not your own users.',
          explanation:
            'Keep the sample size and both outcomes. “Three of five completed it; two struggled at the same step” tells the audience what happened and where to investigate. It does not prove everyone will succeed.',
          hint: 'Choose the sentence that includes how many tried, how many finished, and what went wrong.',
        },
        'h2-c': {
          prompt:
            'Write your project’s 60-second story, including its actual testing status and one next ask.',
          context:
            'Use your own evidence. You can say “I have an in-app prototype; real-user testing is pending” and ask for permission to run one task with a target user.',
          explanation:
            'A clear pitch can be honest about unfinished testing. Describe the artifact someone can inspect, distinguish simulated walkthroughs from real observations, and say what the next test would resolve.',
          hint: 'Use: who struggles → what you observed → what you made → what you tested → what you need next. Do not copy the five-person example as a result.',
        },
      },
    },
    'ship-3': {
      title: 'Measure a first action after the invitation',
      goal: 'Plan one invitation experiment and measure whether target users start the core task.',
      why: 'Views show that a message reached someone. Task attempts show whether it led to use. Keeping these separate helps you choose what to improve next.',
      steps: [
        'Pick one relevant group and check any community rules before inviting people.',
        'Write one truthful message with a clear first action and a way to share feedback.',
        'Set a time window and the behavior you will count. Record results only after the experiment happens.',
      ],
      success:
        'Your note names one channel, message, action, measure, and time window, plus a result that would make you change the approach.',
      hint: 'Activation (เริ่มใช้จริง) means starting a useful product action. Count “opened the board and tried finding a deadline” separately from message views.',
      exerciseCopy: {
        'h3-a': {
          prompt:
            'Which invitation experiment can reveal whether target users begin using the product?',
          context:
            'You want students who miss due dates to try the deadline board. A popular post could still produce no task attempts.',
          explanation:
            'Try a relevant message and measure the action after it. If people see it but do not start the task, investigate the invitation or entry step. Impressions and followers alone do not show the problem was solved.',
          hint: 'Look for a relevant audience and a measured action beyond seeing the message.',
        },
        'h3-b': {
          prompt: 'Select everything that belongs in a respectful invitation to a community.',
          context:
            'You are asking people to spend time trying an early version. They need to know who it helps, what works now, and how to respond.',
          explanation:
            'Explain the audience and current capabilities, follow required community permission, and offer a feedback route. Repeated unsolicited messages pressure people without improving the test.',
          hint: 'Select the details that help someone make an informed choice. Leave out pressure or spam.',
        },
        'h3-c': {
          prompt: 'Plan one channel, one invitation, and one behavior to measure for your project.',
          context:
            'This is a plan. Name a time window and a decision rule without inventing clicks, users, or revenue.',
          explanation:
            'Choose a measure tied to the useful task. For example, record how many invited students try finding a deadline, then where attempts stop. That separates a message problem from a product problem.',
          hint: 'Write the channel and permission, exact first action, time window, and “If __ happens, I will investigate __.” Keep views and task attempts separate.',
        },
      },
    },
    'ship-4': {
      title: 'Leave a pack someone can inspect',
      goal: 'Summarize your current artifact, evidence limits, and one testable next improvement.',
      why: 'Finishing a learning path is a milestone. A credible project story also explains what works now, what remains unknown, and how the next version will be checked.',
      steps: [
        'Describe what you actually made and whether it is a plan, prototype, tested version, or accessible release.',
        'Record a result that changed your thinking, or say what remains untested.',
        'Choose one improvement and a next test with a date. Add a concise summary for your Project Pack.',
      ],
      success:
        'Your Project Pack describes the existing version and a specific next experiment without turning plans or simulated checks into real-user results.',
      hint: 'Retrospective (ทบทวนสิ่งที่ทำ) means looking back to decide what to change. Name the failed step and the result you want the next version to produce.',
      exerciseCopy: {
        'h4-a': {
          prompt: 'Which submission helps a reviewer judge what your project really does?',
          context:
            'A reviewer should be able to inspect your current artifact and understand the evidence and limitations behind it.',
          explanation:
            'A working demo or honestly labeled prototype gives something concrete to inspect. Evidence and limitations explain what you know. Future features can be listed as plans, but cannot count as finished work.',
          hint: 'Choose the pack that makes the existing artifact and learning visible.',
        },
        'h4-b': {
          prompt: 'Your first version is available. What should guide the next change?',
          context:
            'The launch milestone does not tell you where users succeed or get stuck. Review what they actually did.',
          explanation:
            'Use behavior and feedback to choose one improvement, then test the changed version. For example: users missed the update time, so move it before the queue choices and check whether they notice it before choosing.',
          hint: 'Look for a cycle that connects an observed problem, a change, and another test.',
        },
        'h4-c': {
          prompt:
            'Write your project’s current status, one next improvement, and the test that would check it.',
          context:
            'In ShipingIT, shipping the queue prototype saves a playable version and blueprint inside the app. The characters and queue data are simulated. Describe any separate real project according to its own actual status.',
          explanation:
            'Your Project Pack preserves a truthful record of what you made and learned. An in-app shipped prototype is a concrete artifact; public deployment and real-user testing remain separate steps unless you actually complete them.',
          hint: 'Write “What exists: __. Evidence: __. Still unknown: __. Change: __. Next task and expected result: __. Date: __.” If there is no real-user evidence yet, say so.',
        },
      },
    },
  },
  practices: {
    'connect-club-reminder': {
      title: 'Make a reminder follow the meeting’s status',
      goal: 'Connect the current meeting, Ken’s reminder choice, and cancellation cleanup into one working journey.',
      why: 'Ken chooses a 17:45 reminder for Tuesday’s 18:00 meeting. If the organizer cancels at 17:40, an alert for that meeting would send him toward an event that no longer exists.',
      steps: [
        'Connect “Tap Tuesday’s meeting” to loading current event details.',
        'Connect “Choose Remind me at 17:45” to registration, and “Cancellation arrives” to removal of that meeting’s reminder.',
        'Run this version. Read the three tester notes and correct any failed connection before running again.',
      ],
      success:
        'The simulated journey loads the current meeting, registers the chosen reminder, and removes it on cancellation. All three checks pass on the version you keep.',
      hint: 'Showing “set” is a promise. The reminder must be registered first; cancellation must remove that same reminder.',
      feedback: {
        current:
          'Expected: opening the meeting loads its current time, room, and status. If the check fails, the opening action points elsewhere. Connect it to “Load current event details.”',
        choice:
          'Expected: Ken’s chosen reminder is registered before success appears. If it fails, connect the choice action to “Register the chosen reminder,” then rerun.',
        cancel:
          'Expected: a cancellation removes the scheduled reminder. If it fails, the reminder could remain active. Connect cancellation to removal and rerun the full journey.',
      },
    },
    'launch-library-stale': {
      title: 'Repair the library’s false hold',
      goal: 'Replace stale catalog shortcuts with a checked, saved hold and a useful pickup receipt.',
      why: 'An old “available” card cannot guarantee a copy is ready. The initial journey also loses the pickup deadline and continues offering the held copy to someone else.',
      steps: [
        'Run the original version first. Read the failed hold, receipt, and catalog checks.',
        'Connect Hold to “Recheck and save a ready-copy hold,” confirmation to the saved book and 16:00 deadline, and return to current availability.',
        'Run the repaired version. Check all three notes before keeping it; any further edit needs another run.',
      ],
      success:
        'The hold checks current availability and saves; the receipt shows the saved book and 16:00 deadline; returning reloads availability so the held copy is no longer offered.',
      hint: 'Cache (ข้อมูลที่เก็บไว้ก่อนหน้า) can be out of date. None of these three actions should keep reusing the old available card.',
      feedback: {
        'check-save':
          'Expected: Hold rechecks the ready-copy state and saves the hold. Actual in the original: it reuses an old card. Move Hold from “Reuse old available card” to “Recheck and save a ready-copy hold.”',
        deadline:
          'Expected: the confirmation shows the saved book and 16:00 pickup deadline. Actual in the original: those details are missing. Connect confirmation to “Read saved book and 16:00 deadline.”',
        'fresh-copy':
          'Expected: the held copy stops appearing available. Actual in the original: the catalog still offers it. Connect return to “Reload current copy availability,” then run again.',
      },
    },
    'launch-club-reminder': {
      title: 'Repair an alert for a cancelled meeting',
      goal: 'Remove the cancelled reminder, show its off state, and make the current cancellation readable and easy to act on.',
      why: 'The original keeps a 17:45 alert for a cancelled meeting. Clear has no useful result, reopening shows an old B14 poster, and the small control with pale text is hard to use.',
      steps: [
        'Run the original journey and read all tester notes, including touch size and bright-light reading.',
        'Connect cancellation to removal, Clear to confirmation that the reminder is off, and reopening to current cancelled status. Enlarge the action target to at least 48px and strengthen text contrast.',
        'Run the changed version. Keep it only after all three action checks, touch target, and reading checks pass.',
      ],
      success:
        'The simulated cancelled meeting stays quiet, Clear confirms off, and reopening shows cancellation. The current version also passes the size and contrast checks.',
      hint: 'Repair both behavior and usability. Correct connections alone will not pass while the action target is too small or the text remains pale.',
      feedback: {
        quiet:
          'Expected: cancellation removes this meeting’s reminder. Actual in the original: the 17:45 reminder remains. Connect “Organizer cancels meeting” to “Remove this meeting’s reminder.”',
        off: 'Expected: Clear visibly confirms the reminder is off. Actual in the original: Clear has no useful confirmation. Connect it to “Confirm reminder is off.”',
        latest:
          'Expected: reopening loads the current cancellation. Actual in the original: it shows the old B14 poster. Connect reopening to “Reload current cancelled status.”',
        'touch-target':
          'Expected: the action passes the one-hand test. The original 28px target is too small. Use the size control to reach at least 48px, then rerun.',
        contrast:
          'Expected: the status is readable in bright light. The original pale text fails. Choose “Strengthen text contrast,” then rerun this version.',
      },
    },
  },
  stages: {
    launch: {
      title: 'Test, repair, and play your queue prototype',
      goal: 'Check three simulated user tasks, repair any failed behavior, then play and save the tested prototype inside ShipingIT.',
      why: 'A screen can look finished while a user still misses the update time or a staff report stops before the data. A test compares the result you expect with what this version actually does.',
      steps: [
        'Try the action shown: choose a queue, refresh the board, or publish an update. Read the short result after each action, then continue.',
        'If it fails, tap Repair and fix the highlighted part. Try that action again. Changes clear old test passes.',
        'Open “Play my prototype.” Choose a queue, refresh, and publish Noa’s update. Check the visible results, then ship the playable prototype and finish the journey.',
      ],
      success:
        'All three task checks pass on the current version and you have tried all three prototype actions. Shipping saves the playable prototype and blueprint in this app; its people and queue data are simulated.',
      hint: 'Mali’s task checks queue choices; Ken’s checks the update time; Noa’s checks the staff test console. Try the requested controls before checking. If the entry action is disabled, fix Design or Connect first.',
      feedback: {
        'crowded-choices':
          'Expected: Mali can compare two separate queues. If spacing is below 12, the choices are crowded. In “Find the problem,” tap a queue card, then “Give queue cards more space.” Rerun the changed screen.',
        'freshness-first':
          'Expected: Ken sees how old the wait is before choosing. If the update time sits below the queues, he misses it. Tap the update time and choose “Move update time before queues,” then rerun.',
        'staff-update':
          'Expected: Noa’s report reaches visitor data. If the staff path is missing, it stops before the board. Tap “Noa: publish a queue update,” then connect the staff path: Staff reports → Save update → Queue data.',
        choose:
          'Expected: tapping a queue records your choice. Look for the notice naming the stall you chose. This practice action does not reserve a place in a real queue.',
        refresh:
          'Expected: Refresh changes the simulated waits and update time. A stopped path needs Tap refresh → Read the board → Queue data → Show choices. Check the changed values and notice.',
        'staff-published':
          'Expected: publishing Noa’s update changes the waits and update time, with a notice that the report reached the board. This is a separate staff action, not just another visitor refresh.',
        'retest-current-version':
          'A repair changes the prototype and clears earlier task passes. A passed old version is not evidence for the changed one. Try and check all three tasks again before playing and shipping.',
        shipped:
          'Your playable prototype and blueprint are saved inside ShipingIT. “Play again” reopens it; “Blueprint” shows what you built. This milestone does not publish a website or release an app to stores.',
      },
    },
  },
  bonusLesson: {
    id: 'pro-unit-8',
    missionId: 8,
    title: 'When is a repaired version ready?',
    subtitle: 'Make a release decision from changed behavior and the limits of your evidence.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-u8-regression-order',
        type: 'sort',
        prompt: 'Order the checks after fixing a reminder that survives cancellation.',
        context:
          'Regression (ข้อผิดพลาดที่กลับมาในงานเดิม) can happen when a change fixes one path but breaks another. You need a result from the changed version.',
        items: [
          { id: 'repair', text: 'Change cancellation so it removes that meeting’s reminder.' },
          { id: 'reproduce', text: 'Run the original journey and confirm the reminder remains.' },
          {
            id: 'recheck',
            text: 'Rerun cancellation, Clear, and reopening on the changed version.',
          },
          { id: 'decide', text: 'Record the results and decide whether to keep this version.' },
        ],
        correctOrder: ['reproduce', 'repair', 'recheck', 'decide'],
        explanation:
          'Confirm the actual failure first, repair its cause, then check the changed journey and its nearby actions. The decision comes after the new results, not immediately after editing.',
        hint: 'You need a before result, a change, and an after result before the decision.',
      },
      {
        id: 'pro-u8-version-evidence',
        type: 'multi',
        prompt:
          'Which statements belong in a readiness note for the changed version? Select all that apply.',
        context:
          'You changed the library Hold action to recheck availability. You ran the repaired hold, receipt, and catalog journey; each check passed. Real-user testing is still pending.',
        options: [
          {
            id: 'changed',
            text: 'Hold now rechecks availability and saves before showing confirmation.',
          },
          {
            id: 'current-tests',
            text: 'All three simulated journey checks passed after the change.',
          },
          {
            id: 'old-tests',
            text: 'A pass from an earlier version is enough for this changed version.',
          },
          { id: 'limits', text: 'These checks are simulated; real-user testing is still pending.' },
          { id: 'guarantee', text: 'Every library user is now guaranteed to complete the task.' },
        ],
        correctAnswerIds: ['changed', 'current-tests', 'limits'],
        explanation:
          'Name the change, the checks run on that version, and the evidence limits. An old pass cannot check a new change, and simulated cases cannot guarantee every real user’s outcome.',
        hint: 'Keep what changed, what was checked afterwards, and what is still unknown.',
      },
      {
        id: 'pro-u8-release-states',
        type: 'categorize',
        prompt: 'Match each record to the state it actually supports.',
        context: 'Each record stands alone. Do not infer a later state from an earlier milestone.',
        items: [
          {
            id: 'invitation',
            text: 'A note names a first audience and the task to invite them to try.',
          },
          {
            id: 'saved-prototype',
            text: 'The app saved a playable queue prototype and blueprint after simulated checks.',
          },
          {
            id: 'observation',
            text: 'With permission, you watched a real target user try the task and recorded where they stopped.',
          },
          {
            id: 'live-access',
            text: 'You published a release and checked that another person could open it through its live link.',
          },
        ],
        categories: [
          { id: 'plan', label: 'Launch plan' },
          { id: 'in-app', label: 'In-app shipped prototype' },
          { id: 'real-test', label: 'Real-user test evidence' },
          { id: 'accessible', label: 'Verified accessible release' },
        ],
        correctCategories: {
          invitation: 'plan',
          'saved-prototype': 'in-app',
          observation: 'real-test',
          'live-access': 'accessible',
        },
        explanation:
          'A plan, an in-app artifact, a real-user observation, and a verified accessible release support different claims. Keeping the states explicit makes the project easier to evaluate.',
        hint: 'Ask what action already happened in each record, and what evidence it produced.',
      },
      {
        id: 'pro-u8-next-test-decision',
        type: 'choice',
        prompt:
          'What is the strongest next test after moving the update time above the queue choices?',
        context:
          'Hypothetical real-user observation: two students chose using an old wait estimate without noticing its update time. You moved the timestamp; you have not tested the change with people yet.',
        options: [
          {
            id: 'task-observation',
            text: 'Ask target users to choose a queue without coaching; record whether they check freshness before choosing.',
          },
          {
            id: 'leading-question',
            text: 'Ask “Isn’t the new timestamp much clearer?” and count yes answers.',
          },
          {
            id: 'skip-test',
            text: 'Treat the layout change itself as proof that the problem is solved.',
          },
        ],
        correctAnswerIds: ['task-observation'],
        explanation:
          'The failure was a behavior: choosing before checking freshness. Watch that same task on the changed version without pointing out the timestamp. Their actions can reveal whether the repair helped.',
        hint: 'Test the behavior that failed. Avoid giving away where to look.',
      },
    ],
  },
};
