import type { UnitContent } from './types';

export const unit7Content: UnitContent = {
  unitId: 7,
  title: 'Build something that works',
  summary:
    'Follow one action from a tap to a visible, saved result. Choose a tool you can maintain, connect the flow, reproduce failures, and decide what is ready from evidence.',
  lessons: {
    'build-1': {
      title: 'Choose a tool for the job',
      goal: 'Choose a practical way to let a student find and save the current assignment deadline.',
      why: 'A complicated tool does not automatically solve the problem. Your first version needs a readable screen, trustworthy editing rules, and somewhere to keep the deadline.',
      steps: [
        'Compare tools against the core task, your available time, and what you can maintain.',
        'Separate what appears on screen, who is allowed to change it, and where records are stored.',
        'Write your approach in the notebook, including what happens when saving fails or the device is offline.',
      ],
      success:
        'Your plan names a fitting tool, its screen, its trusted rules if needed, its storage, and one failure behavior. It explains why the tool fits this task.',
      hint: 'Frontend (ส่วนที่ผู้ใช้เห็น) shows the deadline. Backend (ระบบที่ตรวจสอบกติกา) checks editing permission. Database (ฐานข้อมูล) keeps the record.',
      exerciseCopy: {
        'u1-a': {
          prompt: 'You have one week to test a deadline tool. What should guide your tool choice?',
          context:
            'The first task is simple: students find the current deadline and an authorized editor can update it. You will need to maintain the first version yourself.',
          explanation:
            'Choose the simplest approach you can maintain that supports the task. A spreadsheet, no-code tool, or small coded app may fit; compare access, editing rules, storage, and time before choosing.',
          hint: 'Look for a choice that serves the user task and is realistic for you to keep working.',
        },
        'u1-b': {
          prompt: 'Which part of an app owns each responsibility?',
          context:
            'A student reads an assignment deadline. An editor changes it. The deadline must still exist when the app opens again.',
          explanation:
            'The frontend displays the deadline and form error. The backend checks whether an editor may change an assignment. The database persists the record, meaning it keeps the value for later use. Hiding an edit button alone does not enforce permission.',
          hint: 'Ask: is this showing something, making a trusted decision, or keeping a record?',
        },
        'u1-c': {
          prompt: 'Write a small technical plan for your project’s core task.',
          context:
            'Use your own project, or the deadline example. A plan can use manual steps, no-code, or code. Name the parts needed for one task rather than listing tools you might someday use.',
          explanation:
            'A useful plan connects each tool to a responsibility. For example: a form shows the date, a permission rule limits edits, storage keeps the assignment, and a failed save leaves the entered date available to retry. This note records your plan; it does not build those parts.',
          hint: 'Use the fields in the template. If a trusted backend is not needed for your test, say why and what limits that creates.',
        },
      },
    },
    'build-2': {
      title: 'Finish one complete journey',
      goal: 'Define one small journey that starts with an input and ends with a result that survives reopening.',
      why: 'Ten unfinished screens cannot tell you whether the core promise works. One complete journey lets you test the screen, the logic, and the saved data together.',
      steps: [
        'Choose one thin journey, such as enter a deadline, save it, and reopen to read it.',
        'Build the smallest version of that journey, then try it from the beginning.',
        'Record what works, what is unfinished, where to try it, and the next failure to fix.',
      ],
      success:
        'Your build note identifies one journey and an honest status: planned, in progress, or working. A working claim includes an outcome you actually tried.',
      hint: 'A vertical slice (เส้นทางเล็ก ๆ ที่ทำงานครบ) connects the screen, necessary logic, storage, and visible result for one task.',
      exerciseCopy: {
        'u2-a': {
          prompt: 'Put the build loop in order so you finish and improve one useful task.',
          context:
            'For the deadline example, a complete slice lets someone enter a date, save it, and read that same date after reopening.',
          explanation:
            'Choose one thin journey, implement its smallest working slice, test the real task, then fix the most important failure. Each loop answers whether that journey works before you add another feature.',
          hint: 'Decide what to finish first. Then build, try the task, and use the failure to choose the next change.',
        },
        'u2-b': {
          prompt:
            'AI gives you code for saving a deadline. What must happen before you rely on it?',
          context:
            'The code compiles and the Save button appears. You have not checked an invalid date, a failed connection, or reopening the app.',
          explanation:
            'Understand the generated code, run it, test edge cases, and inspect how it handles data. Compiling checks that code can be processed; it does not show that a deadline is saved correctly. Keep secret service keys out of client code.',
          hint: 'Look for a choice that checks behavior and data handling, not just whether the code runs.',
        },
        'u2-c': {
          prompt: 'Record the true status of one build slice.',
          context:
            'If you have only a design or plan, select planned. If the screen works but saving is unfinished, say in progress. Use working only for behavior you have run and checked.',
          explanation:
            'A precise status helps you choose the next action. “Date form works; saving not implemented” is useful evidence of progress. “MVP done” hides the same unfinished work. This notebook entry records status; it does not complete the implementation.',
          hint: 'Name one journey, what is implemented, what is missing, where it can be tried, and one next action.',
        },
      },
    },
    'build-3': {
      title: 'Find the failure before fixing it',
      goal: 'Turn a disappearing saved deadline into a repeatable test with expected and actual results.',
      why: 'If you cannot repeat the failure, you cannot tell whether a change fixed it. Exact steps help you locate the first place where the result stops matching the promise.',
      steps: [
        'Record the input and actions: enter a date, save, close, and reopen.',
        'Write expected versus actual behavior, then inspect the saving and loading path.',
        'Make one focused change and repeat the same steps. Record the result, or mark it not tested.',
      ],
      success:
        'Your log lets someone repeat the issue and see whether the changed version keeps the deadline. Untested fixes remain labeled not tested.',
      hint: 'Reproduce (ทำให้ปัญหาเกิดซ้ำ) first. “Expected: date remains; actual: blank after reopen” is more useful than “saving is broken.”',
      exerciseCopy: {
        'u3-a': {
          prompt:
            'A deadline appears after saving but disappears after restart. What should you do first?',
          context:
            'Expected: reopening shows the saved date. Actual: the deadline field is empty. You do not yet know whether saving or loading failed.',
          explanation:
            'Write exact reproduction steps and inspect where the save should persist. The date may only be held in memory, the storage write may fail, or reopening may read the wrong record. A repeatable case lets you investigate these possibilities one at a time.',
          hint: 'Start with an observable failure and the data path, before changing random code.',
        },
        'u3-b': {
          prompt: 'Which checks help you trust the first release? Select all that apply.',
          context:
            'Someone must enter a valid deadline, recover from mistakes or a weak connection, and find the saved date when they return.',
          explanation:
            'Check the normal task, invalid or missing input, network failure, and restart after saving. Together they cover common ways the task can fail. A good screenshot only shows one moment; it cannot prove that input is checked or data is kept.',
          hint: 'Include situations that interrupt the user’s task as well as the path that works normally.',
        },
        'u3-c': {
          prompt: 'Write one test-and-fix log with a checkable result.',
          context:
            'Use a failure you actually saw. If you have not run your project yet, label the deadline example as a planned test and leave verification as not tested.',
          explanation:
            'Keep the issue, reproduction steps, expected result, actual result, proposed fix or hypothesis, and verification together. A changed file is evidence of a change; repeating the task successfully is evidence that this failure was fixed.',
          hint: 'Example steps: enter 12 October, save, close, reopen. Write what you expected and what appeared; do not invent a passing result.',
        },
      },
    },
    'build-4': {
      title: 'Decide whether people can rely on it',
      goal: 'Choose a measure of task success and make a release decision from what you have verified.',
      why: 'A small product still makes a promise. People need the current deadline and their saved work; more screens or better colors do not compensate for losing that result.',
      steps: [
        'Choose a measure tied to the user’s job, such as finding the current deadline without help.',
        'Check saved data, recovery from errors, and known limitations of the core journey.',
        'Write ready or not ready with the evidence behind your decision and the next action.',
      ],
      success:
        'Your readiness note names the core task, actual checks, limitations, and outcome metric. It withholds a ready decision when the core task loses work.',
      hint: 'Measure successful behavior. “4 of 5 found the deadline” needs an actual observed test; without one, record the metric as planned.',
      exerciseCopy: {
        'u4-a': {
          prompt: 'Which metric shows whether a deadline-clarity product helps its target users?',
          context:
            'The promise is that students can find the current deadline without asking someone else. You want to measure that promise.',
          explanation:
            'The share of target users who find the current deadline without help measures the promised job. Count successful attempts out of all attempts in a defined test. Screens and colors describe the product, but do not show whether someone completed the task.',
          hint: 'Look for a result the user can achieve, not a count of things you built.',
        },
        'u4-b': {
          prompt:
            'The core task still loses saved work after restart. Is the MVP ready for people to rely on?',
          context:
            'The date looks correct immediately after Save, but disappears when the app reopens. The launch image is finished.',
          explanation:
            'Fix data loss before asking people to depend on the MVP. Minimum viable product means a small version that delivers its core value. A deadline tool that loses the deadline has not delivered that value reliably.',
          hint: 'Judge the core promise: can the user return and still find the saved result?',
        },
        'u4-c': {
          prompt: 'Write a release-readiness note supported by your actual checks.',
          context:
            'List verified behavior separately from unknown behavior. If you have not built or tested the journey, record that and choose not ready.',
          explanation:
            'A readiness note connects a decision to evidence: the core task, verified behavior, limitations, persistence check, error recovery, and outcome metric. An honest not-ready decision identifies the next test or repair needed.',
          hint: 'Replace “works well” with a result: what action did you try, what remained after reopening, and what happened when saving failed?',
        },
      },
    },
  },
  practices: {
    'design-library-pickup': {
      title: 'Show the book and the pickup promise',
      goal: 'Let a reader check River Atlas, its ready copy, and the 16:00 pickup deadline before choosing to hold it.',
      why: 'A hold action without the book name and current pickup terms could make someone reserve the wrong item or miss the deadline.',
      steps: [
        'Place Reserve River Atlas at the top, the ready-copy details checked at 15:35 in the middle, and Hold this copy at the bottom.',
        'Increase the action target to at least 48px and strengthen the text contrast.',
        'Run this version and inspect the placement, touch-target, and reading notes. After a change, run again.',
      ],
      success:
        'The simulated checks pass: book context first, checked copy and 16:00 deadline before the action, a reachable hold action, and readable text.',
      hint: 'Arrange the decision in reading order: which book, what can I collect and by when, then what can I do?',
      feedback: {
        context:
          'Expected: River Atlas is named at the top. If it appears elsewhere, move the book title before the details and hold action.',
        promise:
          'Expected: 1 ready copy, checked 15:35, pickup by 16:00 in the middle. A hold button above these terms asks for commitment too early.',
        reach:
          'Expected: Hold this copy in the bottom slot. Move the action there so its purpose and position follow the details.',
        size: 'The starting 28px action target is too small for this check. Use + until the displayed target is at least 48px.',
        contrast:
          'Pale text fails the reading check. Use Strengthen text contrast, then run the changed version.',
        passed:
          'This arrangement passes the authored practice checks. You made the pickup terms visible before the hold choice.',
      },
    },
    'design-club-cancelled': {
      title: 'Make the cancellation change the next action',
      goal: 'Show which astronomy meeting was cancelled and offer a clear way to remove tonight’s reminder.',
      why: 'Someone may still have a reminder set for a meeting that no longer happens. They need the current status before deciding what to do.',
      steps: [
        'Put Astronomy club · next Tuesday at the top, Cancelled · updated 17:40 in the middle, and Clear tonight’s reminder at the bottom.',
        'Make the action target at least 48px and strengthen text contrast.',
        'Run this version. Use the notes to repair the misplaced piece or reading issue, then rerun.',
      ],
      success:
        'The simulated checks show the meeting first, its cancellation before the reminder action, and a readable action in reach.',
      hint: 'The screen should answer three questions in order: which meeting, what changed, and what can I do about my reminder?',
      feedback: {
        context:
          'Expected: next Tuesday’s astronomy meeting in the top slot. If the cancellation is shown without context, move the meeting title first.',
        cancelled:
          'Expected: Cancelled · updated 17:40 in the middle. If this is below the action, a reader can act before seeing the new status.',
        clear:
          'Expected: Clear tonight’s reminder at the bottom. This task arranges the action; it does not send or cancel a real notification.',
        size: 'Use + to raise the shown action target from 28px to at least 48px, then rerun the touch-target check.',
        contrast:
          'Use Strengthen text contrast so the cancellation and action can pass the simulated reading check.',
        passed:
          'The arrangement now puts the current cancellation before the matching action. The authored layout checks pass.',
      },
    },
    'connect-library-hold': {
      title: 'Connect a hold to its saved receipt',
      goal: 'Map each action to the step that checks a current copy, saves a hold, and shows the pickup receipt.',
      why: 'A button that only displays “held” can hide an unsaved request. A useful hold flow checks availability and shows confirmation after the hold is saved.',
      steps: [
        'Connect Tap River Atlas to Load current copy details so the reader can inspect availability and its checked time.',
        'Connect Tap Hold this copy to Check and save the hold, and Hold save confirms to Show book and pickup deadline.',
        'Run the journey and inspect all three notes. Repair the wrong destination and run this version again.',
      ],
      success:
        'All three simulated mappings pass: opening loads current details, holding checks and saves, and confirmation shows River Atlas with pickup by 16:00.',
      hint: 'Opening is a read. Holding is a checked write. The receipt follows confirmation of that write, not the initial tap.',
      feedback: {
        inspect:
          'Expected: Tap River Atlas loads current copy details. If it leads to saving or a receipt, move it to the details destination first.',
        hold: 'Expected: Tap Hold this copy checks availability and saves the hold. Sending it straight to a receipt would skip the saved result.',
        receipt:
          'Expected: Hold save confirms leads to the book and 16:00 pickup receipt. A save needs a visible result the reader can use.',
        passed:
          'The practice flow reaches a saved-hold step before its receipt. The simulation checks the mapping; a real reservation still requires a working storage service.',
      },
    },
  },
  stages: {
    connect: {
      title: 'Wire the refresh',
      goal: 'Connect a visitor’s Refresh tap to reading current queue data and displaying the queue choices.',
      why: 'The old local screen shows Rice 8 minutes and Noodle 3, checked 6 minutes ago. Refresh reads the next practice report: Rice 4, Noodle 7, updated just now. Connecting the whole flow lets those values replace the visible cards; a read does not change staff records.',
      steps: [
        'Tap Tap refresh, then Read the board to connect the trigger to its action. You can also drag the first block onto the next.',
        'Join Read the board to Queue data, then Queue data to Show choices. These three wires connect the request, its data, and the visible result.',
        'Choose Run signal or Refresh board. Compare the expected and actual cards: old values remain while reading, then the new waits and update time appear when Show choices receives them. Continue after it passes; changing a wire requires a fresh run.',
      ],
      success:
        'The board shows 3/3 wires joined and a delivered signal. The playable local preview changes from Rice/Noodle 8/3 minutes to 4/7, with Updated just now, then offers Continue. This checks the practice flow; real queue freshness still needs a real data source.',
      hint: 'Trigger (สิ่งที่เริ่มงาน): a tap. Action: read the board. Data: stall, wait, updated time. Result: show those values in the queue cards.',
      feedback: {
        'tap>load':
          'Expected: Tap refresh starts Read the board. A direct wire to Show choices skips the request and gives the result no new data.',
        'load>queues':
          'Expected: Read the board reaches Queue data. Without that wire, the request cannot supply the latest waits and update time to the next step.',
        'queues>render':
          'Expected: Queue data reaches Show choices. Without it, the flow can read data but cannot deliver it to the visible cards.',
        invalid:
          'A wire that skips or reverses a step fails this workshop. Open Wires, remove that connection, return to the board, and join the adjacent steps in order.',
        stale:
          'A previous signal run only checks its previous wires. After repairing a connection, run the current version before continuing.',
        passed:
          'Queue data → Show choices delivered the new local cards and update time. The preview now matches the expected 4/7-minute waits. You connected a user action to a read, its data, and a visible result.',
      },
    },
  },
  bonusLesson: {
    id: 'pro-unit-7',
    missionId: 7,
    title: 'One tap, one saved hold',
    subtitle: 'Handle repeated taps and uncertain saves without a false receipt.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-u7-uncertain-save',
        type: 'choice',
        prompt: 'A hold request times out after it was sent. What is the safest next step?',
        context:
          'The server may have saved the hold, but the phone received no confirmation. Each hold request has a reference you can use to check its status.',
        options: [
          {
            id: 'pro-u7-uncertain-success',
            text: 'Show a successful pickup receipt because the reader tapped Hold.',
          },
          {
            id: 'pro-u7-uncertain-status',
            text: 'Show that confirmation is pending and check the saved result using the same request reference.',
          },
          {
            id: 'pro-u7-uncertain-new',
            text: 'Immediately send several new hold requests with new references.',
          },
        ],
        correctAnswerIds: ['pro-u7-uncertain-status'],
        explanation:
          'A timeout means the phone lacks confirmation; it does not prove that saving failed. Checking the original request lets you recover the result without creating another hold or claiming success too early.',
        hint: 'Separate “no response reached the phone” from “no record exists on the server.”',
      },
      {
        id: 'pro-u7-confirmation-order',
        type: 'sort',
        prompt: 'Order this successful hold journey from first tap to useful confirmation.',
        context:
          'The server rechecks availability when saving. While this request is pending, the phone prevents repeated taps from creating extra requests.',
        items: [
          {
            id: 'pro-u7-order-receipt',
            text: 'Show the saved book and pickup deadline in the receipt.',
          },
          {
            id: 'pro-u7-order-save',
            text: 'Send one referenced hold request; the server checks availability and saves it.',
          },
          { id: 'pro-u7-order-tap', text: 'Accept the Hold tap and mark the action as pending.' },
          {
            id: 'pro-u7-order-confirm',
            text: 'Receive confirmation that this request has a saved hold.',
          },
        ],
        correctOrder: [
          'pro-u7-order-tap',
          'pro-u7-order-save',
          'pro-u7-order-confirm',
          'pro-u7-order-receipt',
        ],
        explanation:
          'The tap starts a pending request. The server checks and saves it, confirmation returns, and the screen shows that saved result. Displaying the receipt before confirmation would turn an intention into a false promise.',
        hint: 'The visible success depends on confirmed storage, not simply on pressing the button.',
      },
      {
        id: 'pro-u7-state-messages',
        type: 'categorize',
        prompt: 'Match each message to the state it truthfully describes.',
        context:
          'Pending means waiting for a confirmed result (กำลังรอผลยืนยัน). A failed request and a confirmed saved hold need different messages.',
        categories: [
          { id: 'pro-u7-state-pending', label: 'Waiting for confirmation' },
          { id: 'pro-u7-state-saved', label: 'Confirmed saved hold' },
          { id: 'pro-u7-state-rejected', label: 'Hold rejected' },
        ],
        items: [
          {
            id: 'pro-u7-message-wait',
            text: 'Checking your request. A pickup receipt is not confirmed yet.',
          },
          {
            id: 'pro-u7-message-receipt',
            text: 'River Atlas held. Pick up by 16:00. Here is your confirmed hold reference.',
          },
          {
            id: 'pro-u7-message-unavailable',
            text: 'This copy is no longer available. No hold was created; choose another copy.',
          },
        ],
        correctCategories: {
          'pro-u7-message-wait': 'pro-u7-state-pending',
          'pro-u7-message-receipt': 'pro-u7-state-saved',
          'pro-u7-message-unavailable': 'pro-u7-state-rejected',
        },
        explanation:
          'Each message should reflect a known state: wait while confirmation is unknown, give pickup terms after a confirmed save, or explain a confirmed rejection and the next available action. These distinctions help the reader avoid a wasted trip.',
        hint: 'Use a success receipt only when the saved hold is confirmed. “No hold was created” also needs a known rejection, not just a timeout.',
      },
      {
        id: 'pro-u7-retry-evidence',
        type: 'multi',
        prompt: 'Which results are useful evidence that retrying is safe? Select all that apply.',
        context:
          'The hold service promises that repeating the same request reference returns its original result. This property is called idempotency: ทำซ้ำคำขอเดิมแล้วไม่สร้างรายการซ้ำ.',
        options: [
          {
            id: 'pro-u7-evidence-repeat',
            text: 'Two taps using the same reference leave exactly one stored hold.',
          },
          {
            id: 'pro-u7-evidence-timeout',
            text: 'After a lost response, checking the same reference returns the original saved hold.',
          },
          {
            id: 'pro-u7-evidence-reopen',
            text: 'Reopening reloads the confirmed hold and its pickup deadline.',
          },
          {
            id: 'pro-u7-evidence-animation',
            text: 'The success animation plays even when no save result is known.',
          },
          {
            id: 'pro-u7-evidence-color',
            text: 'The Hold button changes color after the first tap.',
          },
        ],
        correctAnswerIds: [
          'pro-u7-evidence-repeat',
          'pro-u7-evidence-timeout',
          'pro-u7-evidence-reopen',
        ],
        explanation:
          'Check stored records after repeated requests, recovery after a lost response, and reload after reopening. These results test duplication and persistence. A color change or animation only shows interface feedback; it cannot establish that exactly one hold was saved.',
        hint: 'Look for observations of the saved result across repetition, interrupted confirmation, and returning to the app.',
      },
    ],
  },
};
