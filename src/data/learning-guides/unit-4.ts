import type { UnitContent } from './types';

export const unit4Content: UnitContent = {
  unitId: 4,
  title: 'Prototype',
  summary:
    'Make one useful task visible, try its actions, and repair what happens when information is old or a person makes a mistake.',
  lessons: {
    'prototype-1': {
      title: 'Sketch before you polish',
      goal: 'Plan three rough screens that let someone change a deadline and check the result.',
      why: 'A rough prototype (ต้นแบบ) lets you change a confusing step before spending time on code or decoration.',
      steps: [
        'Choose one question: can someone change the deadline without being told where to tap?',
        'Plan a starting screen, an edit screen, and a screen showing the changed date.',
        'Record the format and what each screen does. Call it planned until the screens exist.',
      ],
      success: 'Your note names one testable task and three screens that reach a visible result.',
      hint: 'Start with what the person needs to do. The logo can wait.',
      exerciseCopy: {
        'p1-a': {
          prompt:
            'You need to check whether a three-step flow makes sense. Which first prototype fits?',
          context: 'The uncertainty is the sequence of screens, not login, payment, or branding.',
          explanation:
            'Three rough paper screens let you watch someone move through the task and spot missing steps. A fully coded product costs more to change without answering this question better.',
          hint: 'Choose the cheapest format that makes the task possible to try.',
        },
        'p1-b': {
          prompt: 'Which question can this prototype help you answer?',
          context: 'You can watch a person try a specific task on the screens.',
          explanation:
            'You can observe whether a target user understands how to finish the task. That result alone cannot tell you whether everyone wants the business or whether a database will scale.',
          hint: 'Look for something a person could visibly do during a short session.',
        },
        'p1-c': {
          prompt: 'Plan the three screens for one task in your own project.',
          context:
            'For a deadline board: open the current date, edit it, then see the saved date. Adapt those roles to your task.',
          explanation:
            'This notebook is a brief for making the prototype. Writing the plan does not create the screens; record the status honestly and give each screen a purpose.',
          hint: 'Name the task, the format, and what someone sees or does on screens 1, 2, and 3.',
        },
      },
    },
    'prototype-2': {
      title: 'Make the next action obvious',
      goal: 'Give your flow clear action labels, a visible result, and a way to recover from a mistake.',
      why: 'People should be able to predict a button’s effect and understand an error without guessing from color alone.',
      steps: [
        'Name the main action with a verb and object, such as Save deadline.',
        'Check readable text and easy-to-tap controls. Explain errors in words.',
        'Keep your existing journey and add its button labels, success message, and recovery action.',
      ],
      success: 'A new user can tell what to tap, what changed, and how to try again if it fails.',
      hint: 'Recovery (การกลับมาทำต่อหลังผิดพลาด) could mean keeping the draft or undoing a change.',
      exerciseCopy: {
        'p2-a': {
          prompt: 'Someone has entered a new deadline. Which button best explains the next action?',
          context: 'The button saves the deadline they just edited.',
          explanation:
            'Save deadline names both the action and its object. Proceed and Do the thing leave the person to guess what will happen to the date.',
          hint: 'The label should answer: what will this tap do?',
        },
        'p2-b': {
          prompt: 'Select every choice that helps someone read, act, or recover in your flow.',
          context:
            'Consider a small phone, one-handed use, and a person who cannot distinguish the error color.',
          explanation:
            'Readable contrast, a descriptive button, large touch targets, and undo each remove a different obstacle. A red border alone does not explain the problem or how to fix it.',
          hint: 'Check reading, understanding, tapping, and mistakes. An error needs words too.',
        },
        'p2-c': {
          prompt: 'Add clear actions and recovery to your existing user journey.',
          context:
            'Keep the journey you already wrote. Add the main button labels, what success looks like, and an error message with a useful next action.',
          explanation:
            'A flow becomes easier to try when each action has a predictable result. For example, a failed save should say the draft is kept and offer Retry rather than imply the date was saved.',
          hint: 'Describe one success and one failure: what does the person see, and what can they do next?',
        },
      },
    },
    'prototype-3': {
      title: 'Build something people can try',
      goal: 'Make the main task work from start to finish, and record which parts are simulated.',
      why: 'A picture of a button cannot reveal whether someone understands the next step. A test needs a response they can see.',
      steps: [
        'Walk through the main action and its resulting screen using paper, a clickable prototype, or code.',
        'Explain any manual simulation before the trial, especially saves, messages, or transactions.',
        'Record what exists, where to try it, and the gaps that still block the task.',
      ],
      success:
        'Your notebook gives an accurate status and a way to try one complete task, or the next step needed to make it possible.',
      hint: 'A simulation (การจำลอง) can be useful if the person knows which result is being acted out.',
      exerciseCopy: {
        'p3-a': {
          prompt: 'The screen looks finished, but the main button does nothing. What must you add?',
          context:
            'The trial asks someone to change a deadline and check that the new date appears.',
          explanation:
            'The missing part is the interaction that reaches the task’s result. Link the button to a response, or transparently turn to the next paper screen. A larger logo cannot complete the task.',
          hint: 'Ask what must happen after the person taps.',
        },
        'p3-b': {
          prompt: 'When can you manually simulate the backend in a prototype trial?',
          context:
            'You might switch a paper screen to show a saved state while no real deadline is changed.',
          explanation:
            'A manual simulation is appropriate when its limits are explained and no real transaction is implied. You can test understanding without pretending that a save, payment, or message really happened.',
          hint: 'The person must know what is simulated before relying on the result.',
        },
        'p3-c': {
          prompt: 'Record what someone can actually try in your prototype today.',
          context:
            'Include its status, link or physical location, testable task, simulated parts, and known gaps.',
          explanation:
            'A useful record separates the artifact from the plan. Paper, clickable, and coded are different states; if nothing exists yet, write planned and the concrete next step.',
          hint: 'Could another person find the prototype and tell which actions are real?',
        },
      },
    },
    'prototype-4': {
      title: 'Run a rehearsal',
      goal: 'Prepare a neutral task and check that the prototype lets a participant attempt it.',
      why: 'A rehearsal (การซ้อมก่อนทดสอบ) catches dead buttons and missing screens before they waste a participant’s time.',
      steps: [
        'Write a realistic goal without naming the button or its location.',
        'Try the task yourself and fix anything that prevents it from being attempted.',
        'Record observable success and remaining blockers in your validation plan.',
      ],
      success:
        'Your scenario describes a goal, your success condition is visible, and blockers are fixed or clearly recorded.',
      hint: 'Say “make sure the group sees the new date,” then let the person choose the steps.',
      exerciseCopy: {
        'p4-a': {
          prompt: 'Put these preparations in order so the participant can attempt the task.',
          context: 'A blocked prototype cannot show you whether the person understands the flow.',
          explanation:
            'First write the task scenario, then walk through it yourself. Fix blockers you find before asking a participant to try. Their session should examine understanding, not discover a dead end you already could have caught.',
          hint: 'Define the task before rehearsing it; repair blockers before inviting someone.',
        },
        'p4-b': {
          prompt: 'Which instruction lets you observe whether someone understands the screen?',
          context:
            'The person needs to update a group’s deadline. You want them to choose how to do it.',
          explanation:
            'The changed-deadline scenario gives a goal without telling the person which control to use. Naming the blue Save button supplies the answer; asking about beauty does not test task completion.',
          hint: 'Describe the person’s situation and goal, then stop before giving the clicks.',
        },
        'p4-c': {
          prompt: 'Write the scenario and record your own rehearsal.',
          context:
            'Name the intended participant, the words you will read, observable success, blockers found, and what you fixed or still need to fix.',
          explanation:
            'A rehearsal prepares a participant test; it is not evidence that real users succeeded. Record concrete results such as “the edited date appears on the board” instead of “people like it.”',
          hint: 'Keep an untested result as a success criterion, not a claim that it already happened.',
        },
      },
    },
  },
  practices: {
    'connect-recovery': {
      title: 'Keep Ken’s report through a lost connection',
      goal: 'Wire a retry that keeps the written report and confirms success only after a save response.',
      why: 'Ken loses signal near the sports field. Retrying should continue his work instead of making him type it again.',
      steps: [
        'Place Connection fails in Keep draft locally.',
        'Place Tap Retry in Resend saved draft, and Server confirms in Show saved confirmation.',
        'Run this version. Read all three notes; after changing a destination, run again.',
      ],
      success:
        'The simulated run checks that the draft survives, Retry resends it, and confirmation follows the server response.',
      hint: 'Pressing Retry requests another attempt. It does not prove the save succeeded.',
      feedback: {
        protect:
          'Expected: the report stays available after signal loss. If it is not kept, move Connection fails to Keep draft locally.',
        again:
          'Expected: Retry sends the draft Ken already wrote. If the retry goes elsewhere, move Tap Retry to Resend saved draft.',
        confirmed:
          'Expected: saved confirmation follows Server confirms. Showing success on connection failure or on Retry would make an unsupported claim.',
        rerun:
          'A changed connection needs a new run. The earlier result checked the previous destinations.',
      },
    },
    'launch-stale': {
      title: 'Replace yesterday’s queue result',
      goal: 'Repair both saving a new report and loading it when someone returns to the board.',
      why: 'Noa sees a saved message, but Mali still sees yesterday’s queue. Saving and showing fresh information are separate jobs.',
      steps: [
        'Run the original version: both Tap Submit and Return to board point to yesterday’s cache.',
        'Move Tap Submit to Save the new report, and Return to board to Reload current reports.',
        'Run again and read both notes before keeping this version.',
      ],
      success:
        'The new simulated run shows that submission saves the report and returning reloads current reports.',
      hint: 'Stale (ข้อมูลเก่าที่ยังค้างอยู่) means the shown result is older than the information the person needs.',
      feedback: {
        save: 'Expected: Noa’s submission stores the new report. Actual in the starting version: Submit opens yesterday’s cache, so the save action never happens.',
        fresh:
          'Expected: Mali sees current reports on return. Actual in the starting version: the board opens yesterday’s cache. Repair Return to board as well as Submit.',
        rerun:
          'Correct destinations are only the repair. Run the changed version to check both journeys together.',
      },
    },
    'launch-access': {
      title: 'Make Back safe and Send easy to tap',
      goal: 'Keep unfinished work on Back, confirm a finished save on Send, and enlarge the main touch target.',
      why: 'Ken wants to edit later without losing his report. Mali needs to send it with one hand and know it was saved.',
      steps: [
        'Run the starting version to see both discard routes and the 28px target fail.',
        'Move Tap Back to Back with draft kept, and Tap Send to Save and confirm.',
        'Use + to reach at least 48px in this puzzle, then run again and check the two route notes and touch-target note.',
      ],
      success:
        'All three simulated checks pass on the same version: draft kept, save confirmed, and a target of at least 48px.',
      hint: 'A touch target is the tappable area (พื้นที่ที่แตะได้), not just the visible icon.',
      feedback: {
        draft:
          'Expected: returning to edit later keeps Ken’s draft. Actual in the starting version: Back discards it. Send cannot repair the Back route.',
        save: 'Expected: Send saves and confirms the finished report. Actual in the starting version: Send also discards it. Give each action its own intended destination.',
        size: 'Expected here: at least 48px. Actual at the start: 28px. Enlarge the action with +; repairing the routes alone leaves the one-hand check failing.',
        rerun:
          'A route or size change clears the old run. Rerun to check the complete repaired version.',
      },
    },
  },
  stages: {
    design: {
      title: 'Build a queue screen someone can use',
      goal: 'Help a student compare stalls, notice how old the waits are, and request an update.',
      why: 'The queue cards answer “which stall?”, the update time answers “can I trust this?”, and Refresh gives a next action when the information is old.',
      steps: [
        'Add Title, Queues, Updated, and Refresh by dragging each tile onto the phone or using Place.',
        'Arrange the title first and give every block its own space fully inside the phone. Adjust Space and Corners while keeping the layout readable.',
        'In Try it, choose a stall and tap Refresh board. Watch the choice notice, waits, and update time change before continuing.',
      ],
      success:
        'The four required blocks fit without overlap, and both preview actions work on the current layout. The screen is ready for the later connection task.',
      hint: 'If layout gets crowded, use Line up or remove an optional block. Try both actions again after editing the screen.',
      feedback: {
        pieces:
          'Expected: title, queue cards, update time, and refresh control. A picture or staff entry is optional and cannot replace a required piece.',
        layout:
          'Expected: title first, no overlapping blocks, and every block inside the phone. If one is clipped or covers another, move it before adjusting decoration.',
        choose:
          'Expected: tapping a stall shows which one you chose. If Try it still asks you to choose, tap a queue card on this version.',
        refresh:
          'Expected: Refresh board changes the simulated waits and update time. This preview response lets you inspect the screen; the later Connect game wires its data path.',
        changed:
          'Editing a block or style resets the preview check. Choose a stall and refresh again on the new layout.',
      },
    },
  },
  bonusLesson: {
    id: 'pro-unit-4',
    missionId: 4,
    title: 'Design the wait between tap and result',
    subtitle: 'A study-room booking can be pending, confirmed, or unavailable.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-u4-pending-copy',
        type: 'choice',
        prompt:
          'A student taps Reserve room. The server has not replied. What should the prototype show?',
        context:
          'Another student might reserve the same room. The tap starts a request; it does not yet secure the room.',
        options: [
          { id: 'confirmed', text: 'Room booked. Go there now.' },
          { id: 'pending', text: 'Checking availability… Your room is not reserved yet.' },
          { id: 'empty', text: 'Clear the screen until something happens.' },
        ],
        correctAnswerIds: ['pending'],
        explanation:
          'A pending state (กำลังรอผล) tells the student that the request is underway and prevents them from treating an unconfirmed room as theirs.',
        hint: 'Match the message to what the system actually knows at this moment.',
      },
      {
        id: 'pro-u4-unavailable-recovery',
        type: 'multi',
        prompt:
          'The server says the room was taken before this request finished. Select all useful responses.',
        context: 'The student still needs a study room for the same time and group size.',
        options: [
          { id: 'explain', text: 'Say the room is no longer available and was not booked.' },
          {
            id: 'preserve',
            text: 'Keep the chosen time and group size when showing alternatives.',
          },
          {
            id: 'alternatives',
            text: 'Offer other available rooms or a way to choose another time.',
          },
          { id: 'blame', text: 'Say “You were too slow” and erase the search.' },
          { id: 'false-success', text: 'Show a booking confirmation to avoid disappointing them.' },
        ],
        correctAnswerIds: ['explain', 'preserve', 'alternatives'],
        explanation:
          'Explain the result, keep information the student already entered, and offer a path toward the same goal. Blame and false confirmation add confusion without finding them a room.',
        hint: 'Which choices help the student understand the failure and continue with less repeated work?',
      },
      {
        id: 'pro-u4-confirmation-order',
        type: 'sort',
        prompt: 'Put this successful booking journey in order.',
        context: 'The final screen must reflect a confirmed reservation, not just a tap.',
        items: [
          { id: 'confirmation', text: 'Show the confirmed room and reservation reference.' },
          { id: 'request', text: 'The student taps Reserve room.' },
          { id: 'accepted', text: 'The server returns a successful reservation and reference.' },
          { id: 'waiting', text: 'Show that the request is waiting for a result.' },
        ],
        correctOrder: ['request', 'waiting', 'accepted', 'confirmation'],
        explanation:
          'The request starts the wait. The server’s successful response provides the reservation reference, which the confirmation screen can then show.',
        hint: 'What has to exist before the screen can honestly display a reservation reference?',
      },
      {
        id: 'pro-u4-observe-or-assume',
        type: 'categorize',
        prompt:
          'Separate what this clickable prototype can show from what needs a connected service check.',
        context:
          'The prototype has linked screens and scripted room data. It has no connection to the school’s booking system.',
        categories: [
          { id: 'prototype', label: 'Can observe in this prototype' },
          { id: 'service', label: 'Needs a connected service check' },
        ],
        items: [
          {
            id: 'read-pending',
            text: 'Can the student tell that the room is not yet reserved while waiting?',
          },
          {
            id: 'find-alternative',
            text: 'Can the student find another room after the unavailable screen?',
          },
          {
            id: 'prevent-double',
            text: 'Does the school system prevent two simultaneous reservations of one room?',
          },
          {
            id: 'persist-booking',
            text: 'Is the reservation actually stored in the school’s booking system?',
          },
        ],
        correctCategories: {
          'read-pending': 'prototype',
          'find-alternative': 'prototype',
          'prevent-double': 'service',
          'persist-booking': 'service',
        },
        explanation:
          'Scripted screens let you observe how a person reads the states and finds the next action. They cannot establish real reservation storage or protection against simultaneous bookings.',
        hint: 'Distinguish understanding the screen from the real service carrying out the booking.',
      },
    ],
  },
};
