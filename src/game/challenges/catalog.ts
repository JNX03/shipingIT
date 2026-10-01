import type { Challenge } from './model';

const definitions: Omit<Challenge, 'prerequisite' | 'reward'>[] = [
  {
    id: 'explore-last-time',
    title: 'Ask about the last time',
    stage: 'explore',
    kind: 'interview',
    npc: 'mali',
    instructions: 'Ask Mali what happened. Pin the event and its impact to your evidence board.',
    opening:
      'I missed the shuttle yesterday. I do not need another app that promises perfect travel.',
    targets: [
      { id: 'event', title: 'What happened' },
      { id: 'impact', title: 'Why it mattered' },
    ],
    items: [
      {
        id: 'event',
        title: 'An early departure',
        detail: 'Yesterday the shuttle left five minutes before the time on the poster.',
        target: 'event',
        keywords: ['last', 'yesterday', 'happened', 'when', 'tell me', 'departure'],
      },
      {
        id: 'impact',
        title: 'A missed lab',
        detail: 'I walked to the next stop and arrived twenty minutes late for my lab.',
        target: 'impact',
        keywords: ['then', 'after', 'impact', 'late', 'affect', 'cost', 'why', 'result'],
      },
    ],
  },
  {
    id: 'explore-workaround',
    title: 'Follow the workaround',
    stage: 'explore',
    kind: 'interview',
    npc: 'noa',
    instructions: 'Find out how Noa handles lost items now, then uncover the difficult part.',
    opening: 'I run the campus lost-and-found desk. We already have a box and a notebook.',
    targets: [
      { id: 'current', title: 'Current workaround' },
      { id: 'friction', title: 'Remaining friction' },
    ],
    items: [
      {
        id: 'notebook',
        title: 'A paper notebook',
        detail:
          'I write the item and the finder’s number in a paper notebook, then keep the item here.',
        target: 'current',
        keywords: ['now', 'today', 'currently', 'how', 'notebook', 'handle', 'process'],
      },
      {
        id: 'search',
        title: 'No way to search',
        detail: 'Students describe items differently. Searching the handwritten pages takes ages.',
        target: 'friction',
        keywords: ['hard', 'difficult', 'problem', 'slow', 'search', 'frustrat', 'why', 'then'],
      },
    ],
  },
  {
    id: 'insight-observation',
    title: 'Seen, or assumed?',
    stage: 'insight',
    kind: 'sort',
    npc: 'ken',
    instructions: 'Sort the study-room notes. Keep observations separate from predictions.',
    opening: 'Our room-booking idea needs evidence before we build it.',
    targets: [
      { id: 'observed', title: 'Observed' },
      { id: 'assumed', title: 'Assumed' },
    ],
    items: [
      {
        id: 'wait',
        title: 'Three students waited',
        detail: 'During our ten-minute observation, three students waited outside a booked room.',
        target: 'observed',
      },
      {
        id: 'pay',
        title: 'Everyone will pay',
        detail: 'We think every student would pay for a premium room.',
        target: 'assumed',
      },
      {
        id: 'empty',
        title: 'Two rooms stayed empty',
        detail: 'Two rooms marked booked remained empty for thirty minutes.',
        target: 'observed',
      },
      {
        id: 'ai',
        title: 'AI will fix attendance',
        detail: 'An AI prediction will definitely stop every no-show.',
        target: 'assumed',
      },
    ],
  },
  {
    id: 'insight-cause',
    title: 'Separate cause from solution',
    stage: 'insight',
    kind: 'sort',
    npc: 'mali',
    instructions: 'Sort the cafeteria notes into symptom, cause and proposed solution.',
    opening: 'A feature suggestion is not the same thing as the reason a problem happens.',
    targets: [
      { id: 'symptom', title: 'Symptom' },
      { id: 'cause', title: 'Cause' },
      { id: 'solution', title: 'Solution idea' },
    ],
    items: [
      {
        id: 'walk',
        title: 'Students walk away hungry',
        detail: 'Students reach a sold-out stall and leave without lunch.',
        target: 'symptom',
      },
      {
        id: 'menu',
        title: 'Menu never updates',
        detail: 'The printed menu stays up after a dish sells out.',
        target: 'cause',
      },
      {
        id: 'toggle',
        title: 'Add a sold-out switch',
        detail: 'A quick switch could let staff mark unavailable dishes.',
        target: 'solution',
      },
    ],
  },
  {
    id: 'scope-lunch',
    title: 'Ship a lunch check',
    stage: 'scope',
    kind: 'pack',
    npc: 'noa',
    instructions: 'Fit a reliable stock check into six points. Leave payment for another release.',
    opening: 'Students need to know what is available before walking here.',
    budget: 6,
    targets: [],
    items: [
      {
        id: 'menu',
        title: 'Live menu',
        detail: 'List the dishes currently available.',
        cost: 3,
        required: true,
      },
      {
        id: 'update',
        title: 'Staff update',
        detail: 'Let staff mark a dish sold out.',
        cost: 2,
        requires: ['menu'],
        required: true,
      },
      {
        id: 'time',
        title: 'Updated time',
        detail: 'Show how fresh the information is.',
        cost: 1,
        requires: ['update'],
        required: true,
      },
      {
        id: 'pay',
        title: 'Payment',
        detail: 'Take payments and handle refunds.',
        cost: 4,
        requires: ['account'],
      },
      { id: 'account', title: 'Accounts', detail: 'Add sign-in and password recovery.', cost: 2 },
    ],
  },
  {
    id: 'scope-library',
    title: 'A smaller library launch',
    stage: 'scope',
    kind: 'pack',
    npc: 'mali',
    instructions:
      'Make borrowing work in five points. A search without availability is not enough.',
    opening: 'I want to find a book and know whether I can borrow it.',
    budget: 5,
    targets: [],
    items: [
      {
        id: 'catalog',
        title: 'Book catalog',
        detail: 'Find a book by title.',
        cost: 2,
        required: true,
      },
      {
        id: 'stock',
        title: 'Copy availability',
        detail: 'Show which copies can be borrowed.',
        cost: 1,
        requires: ['catalog'],
        required: true,
      },
      {
        id: 'reserve',
        title: 'Reserve a copy',
        detail: 'Hold an available copy for pickup.',
        cost: 2,
        requires: ['stock'],
        required: true,
      },
      { id: 'social', title: 'Book club chat', detail: 'Discuss favorite books.', cost: 3 },
      {
        id: 'recommend',
        title: 'Recommendations',
        detail: 'Personalized reading suggestions.',
        cost: 4,
        requires: ['catalog'],
      },
    ],
  },
  {
    id: 'design-thumb',
    title: 'Bring the action closer',
    stage: 'design',
    kind: 'layout',
    npc: 'ken',
    instructions:
      'Arrange the shuttle screen. Keep the main action in the thumb zone, with a 48px target.',
    opening: 'I check the shuttle while holding my sports bag in one hand.',
    needsSize: true,
    targets: [
      { id: 'top', title: 'Top · context' },
      { id: 'middle', title: 'Middle · status' },
      { id: 'bottom', title: 'Bottom · action' },
    ],
    initial: { title: 'bottom', status: 'top', action: 'middle' },
    items: [
      { id: 'title', title: 'Campus shuttle', detail: 'Screen context', target: 'top' },
      {
        id: 'status',
        title: 'Next shuttle · 6 min',
        detail: 'Information people came for',
        target: 'middle',
      },
      { id: 'action', title: 'Notify me', detail: 'Primary action', target: 'bottom' },
    ],
  },
  {
    id: 'design-readable',
    title: 'Make the report readable',
    stage: 'design',
    kind: 'layout',
    npc: 'noa',
    instructions:
      'Put evidence before the action. Repair low contrast and make the submit target at least 48px.',
    opening: 'I read this on a bright counter. Pale text disappears.',
    needsSize: true,
    needsContrast: true,
    targets: [
      { id: 'top', title: 'Top · context' },
      { id: 'middle', title: 'Middle · evidence' },
      { id: 'bottom', title: 'Bottom · action' },
    ],
    initial: { title: 'middle', status: 'bottom', action: 'top' },
    items: [
      { id: 'title', title: 'Report a broken light', detail: 'Screen context', target: 'top' },
      {
        id: 'status',
        title: 'Photo and location',
        detail: 'Evidence to review before sending',
        target: 'middle',
      },
      { id: 'action', title: 'Send report', detail: 'Primary action', target: 'bottom' },
    ],
  },
  {
    id: 'connect-report',
    title: 'Wire a useful report',
    stage: 'connect',
    kind: 'wire',
    npc: 'mali',
    instructions:
      'Connect each action to its result. Run the journey to prove the report can be edited, saved and read.',
    opening: 'A button should lead somewhere that matches its promise.',
    targets: [
      { id: 'form', title: 'Open report form' },
      { id: 'saved', title: 'Save and confirm' },
      { id: 'board', title: 'Updated board' },
    ],
    items: [
      { id: 'add', title: 'Tap Add report', detail: 'Start writing a report', target: 'form' },
      {
        id: 'submit',
        title: 'Tap Send report',
        detail: 'Persist the entered report',
        target: 'saved',
      },
      { id: 'done', title: 'Tap Done', detail: 'Read the updated information', target: 'board' },
    ],
    testCases: [
      {
        id: 'start',
        title: 'Mali starts a report',
        action: 'add',
        expected: 'form',
        failure: 'Add report must open the form.',
      },
      {
        id: 'save',
        title: 'The report is saved',
        action: 'submit',
        expected: 'saved',
        failure: 'Send must save and confirm.',
      },
      {
        id: 'return',
        title: 'The update is visible',
        action: 'done',
        expected: 'board',
        failure: 'Done must show the updated board.',
      },
    ],
  },
  {
    id: 'connect-recovery',
    title: 'Wire a safe retry',
    stage: 'connect',
    kind: 'wire',
    npc: 'ken',
    instructions: 'Connect the offline journey. Keep the draft, then retry it, then show success.',
    opening: 'My signal drops near the sports field. Do not make me type everything again.',
    targets: [
      { id: 'draft', title: 'Keep draft locally' },
      { id: 'retry', title: 'Resend saved draft' },
      { id: 'success', title: 'Show saved confirmation' },
    ],
    items: [
      { id: 'offline', title: 'Connection fails', detail: 'Protect entered work', target: 'draft' },
      {
        id: 'tap-retry',
        title: 'Tap Retry',
        detail: 'Continue the failed operation',
        target: 'retry',
      },
      {
        id: 'response',
        title: 'Server confirms',
        detail: 'Show the real result',
        target: 'success',
      },
    ],
    testCases: [
      {
        id: 'protect',
        title: 'Ken loses signal',
        action: 'offline',
        expected: 'draft',
        failure: 'A failure must keep the draft.',
      },
      {
        id: 'again',
        title: 'Ken retries once',
        action: 'tap-retry',
        expected: 'retry',
        failure: 'Retry must resend the saved draft.',
      },
      {
        id: 'confirmed',
        title: 'Success follows confirmation',
        action: 'response',
        expected: 'success',
        failure: 'Only a confirmed save should show success.',
      },
    ],
  },
  {
    id: 'launch-stale',
    title: 'Repair a stale result',
    stage: 'launch',
    kind: 'repair',
    npc: 'noa',
    instructions:
      'Run the broken journey first. Repair the actions and rerun until both testers pass.',
    opening: 'The report says saved, but the queue board still shows yesterday.',
    targets: [
      { id: 'save', title: 'Save the new report' },
      { id: 'refresh', title: 'Reload current reports' },
      { id: 'cache', title: 'Show yesterday’s cache' },
    ],
    initial: { submit: 'cache', return: 'cache' },
    items: [
      { id: 'submit', title: 'Tap Submit', detail: 'Noa sends a new queue length', target: 'save' },
      {
        id: 'return',
        title: 'Return to board',
        detail: 'Mali checks the new result',
        target: 'refresh',
      },
    ],
    testCases: [
      {
        id: 'save',
        title: 'Noa: my report is stored',
        action: 'submit',
        expected: 'save',
        failure: 'Noa: Submit opened cached data instead of saving.',
      },
      {
        id: 'fresh',
        title: 'Mali: I can see the update',
        action: 'return',
        expected: 'refresh',
        failure: 'Mali: the board still shows yesterday. Reload current reports.',
      },
    ],
  },
  {
    id: 'launch-access',
    title: 'Repair the one-hand journey',
    stage: 'launch',
    kind: 'repair',
    npc: 'ken',
    instructions:
      'Run the testers first. Repair the missing route and the small target, then rerun.',
    opening: 'The primary action is tiny, and its back button loses the draft.',
    needsSize: true,
    targets: [
      { id: 'keep', title: 'Back with draft kept' },
      { id: 'confirm', title: 'Save and confirm' },
      { id: 'discard', title: 'Discard draft' },
    ],
    initial: { back: 'discard', send: 'discard' },
    items: [
      { id: 'back', title: 'Tap Back', detail: 'Ken returns to edit later', target: 'keep' },
      {
        id: 'send',
        title: 'Tap Send',
        detail: 'Mali submits the finished report',
        target: 'confirm',
      },
    ],
    testCases: [
      {
        id: 'draft',
        title: 'Ken: my draft is still here',
        action: 'back',
        expected: 'keep',
        failure: 'Ken: Back erased my draft.',
      },
      {
        id: 'save',
        title: 'Mali: I know it was saved',
        action: 'send',
        expected: 'confirm',
        failure: 'Mali: Send did not confirm a saved report.',
      },
    ],
  },
  // Continue with two authored project cases. Appending preserves existing saved proofs.
  {
    id: 'explore-library-handoff',
    title: 'Library: follow one borrow',
    stage: 'explore',
    kind: 'interview',
    npc: 'mali',
    instructions:
      'Ask about the last visit, what followed, and what still needs checking. Pin each reply without turning an open question into a fact.',
    opening:
      'I tried to borrow River Atlas yesterday. The catalog said one copy was available, but I came back empty-handed.',
    targets: [
      { id: 'event', title: 'What happened' },
      { id: 'impact', title: 'Why it mattered' },
      { id: 'question', title: 'Still needs checking' },
    ],
    items: [
      {
        id: 'catalog-claim',
        title: 'One copy on the screen',
        detail:
          'At 15:20 the catalog showed one River Atlas copy. At the desk, staff said that copy was on the return cart and not ready to borrow.',
        target: 'event',
        keywords: ['last', 'yesterday', 'happened', 'when', 'visit', 'catalog', 'copy'],
      },
      {
        id: 'wasted-walk',
        title: 'Nine minutes, no book',
        detail:
          'After a nine-minute walk, I had no book to take home. I wrote the title on paper and left to catch my bus.',
        target: 'impact',
        keywords: ['after', 'then', 'impact', 'affect', 'walk', 'result', 'why'],
      },
      {
        id: 'handoff-question',
        title: 'Can staff keep holds current?',
        detail:
          'I do not know how quickly staff can update a returned copy or a hold. Ask the desk about that handoff before promising live availability.',
        target: 'question',
        keywords: ['still', 'check', 'unknown', 'know', 'uncertain', 'handoff', 'promise'],
      },
    ],
  },
  {
    id: 'explore-club-room',
    title: 'Club: follow the room change',
    stage: 'explore',
    kind: 'interview',
    npc: 'ken',
    instructions:
      'Ask about the last club meeting, what followed, and what still needs checking. Pin each reply to the evidence board.',
    opening:
      'Tuesday astronomy club starts at 18:00. I followed the poster to B14, but the club had moved.',
    targets: [
      { id: 'event', title: 'What happened' },
      { id: 'impact', title: 'Why it mattered' },
      { id: 'question', title: 'Still needs checking' },
    ],
    items: [
      {
        id: 'room-change',
        title: 'B14 became B16',
        detail:
          'Last Tuesday the organizer changed the room from B14 to B16 at 17:40. The paper poster at the stairs still showed B14.',
        target: 'event',
        keywords: ['last', 'tuesday', 'happened', 'when', 'poster', 'room', 'changed'],
      },
      {
        id: 'missed-start',
        title: 'Six minutes of searching',
        detail:
          'After finding B14 empty, I checked the chat and walked to B16. I missed the first six minutes of the meeting.',
        target: 'impact',
        keywords: ['after', 'then', 'impact', 'affect', 'miss', 'result', 'why'],
      },
      {
        id: 'reminder-question',
        title: 'Will reminders reach members?',
        detail:
          'I do not know how many members silence reminders. Check their preferences; my missed meeting cannot prove that everyone wants alerts.',
        target: 'question',
        keywords: ['still', 'check', 'unknown', 'know', 'uncertain', 'reminder', 'alert'],
      },
    ],
  },
  {
    id: 'insight-library-evidence',
    title: 'Library: audit the evidence',
    stage: 'insight',
    kind: 'sort',
    npc: 'noa',
    instructions:
      'Sort the Library notes into evidence, assumptions, and questions. A recorded event supports a claim; a promise needs checking.',
    opening:
      'One unsuccessful visit shows a handoff problem. It does not tell us every reader’s needs.',
    targets: [
      { id: 'evidence', title: 'Case evidence' },
      { id: 'assumption', title: 'Assumption' },
      { id: 'question', title: 'Open question' },
    ],
    items: [
      {
        id: 'copy-not-ready',
        title: 'Copy not ready at 15:20',
        detail: 'The catalog showed one copy; desk staff said it was still on the return cart.',
        target: 'evidence',
      },
      {
        id: 'walk-cost',
        title: 'A nine-minute empty trip',
        detail: 'Mali walked for nine minutes and left without River Atlas.',
        target: 'evidence',
      },
      {
        id: 'everyone-signs-in',
        title: 'Everyone wants an account',
        detail: 'We assume every reader will create an account before checking a book.',
        target: 'assumption',
      },
      {
        id: 'always-current',
        title: 'The catalog is always current',
        detail: 'We think a title search alone guarantees that a copy is ready at the desk.',
        target: 'assumption',
      },
      {
        id: 'update-owner',
        title: 'Who updates a returned copy?',
        detail: 'We have not checked who changes availability when a copy leaves the return cart.',
        target: 'question',
      },
      {
        id: 'hold-deadline',
        title: 'How long can a hold last?',
        detail: 'Ask the desk which pickup deadline they can support before choosing a policy.',
        target: 'question',
      },
    ],
  },
  {
    id: 'insight-club-evidence',
    title: 'Club: facts before alerts',
    stage: 'insight',
    kind: 'sort',
    npc: 'mali',
    instructions:
      'Separate the Club evidence from predictions and unanswered questions. An alert idea is not proof that members will see it.',
    opening:
      'A current event page may help. First, decide what the room-change story actually supports.',
    targets: [
      { id: 'evidence', title: 'Case evidence' },
      { id: 'assumption', title: 'Assumption' },
      { id: 'question', title: 'Open question' },
    ],
    items: [
      {
        id: 'changed-at-1740',
        title: 'Room changed at 17:40',
        detail: 'The organizer moved Tuesday’s 18:00 meeting from B14 to B16.',
        target: 'evidence',
      },
      {
        id: 'six-minutes',
        title: 'Ken missed six minutes',
        detail: 'Ken followed the old poster, then found the current room in chat.',
        target: 'evidence',
      },
      {
        id: 'all-read-chat',
        title: 'All members read the chat',
        detail: 'We assume every member checks the chat before leaving for a meeting.',
        target: 'assumption',
      },
      {
        id: 'alerts-fix-all',
        title: 'Alerts prevent every miss',
        detail: 'We predict a reminder will stop all missed and cancelled meetings.',
        target: 'assumption',
      },
      {
        id: 'silent-members',
        title: 'Who silences reminders?',
        detail: 'We still need to ask about reminder preferences and quiet hours.',
        target: 'question',
      },
      {
        id: 'backup-organizer',
        title: 'Who posts a cancellation?',
        detail: 'We have not checked who updates the event when the organizer is absent.',
        target: 'question',
      },
    ],
  },
  {
    id: 'scope-library-hold',
    title: 'Library: pack a reliable hold',
    stage: 'scope',
    kind: 'pack',
    npc: 'noa',
    instructions:
      'Pack a complete seven-point Library version: find a title, use a staff-confirmed copy state, hold a ready copy, and show freshness. Respect every dependency.',
    opening:
      'Practice constraint: the desk will update copy status and use a 16:00 pickup deadline. Build for that agreed handoff.',
    budget: 7,
    targets: [],
    items: [
      {
        id: 'catalog',
        title: 'Title search',
        detail: 'Find River Atlas and open its copy details.',
        cost: 2,
        required: true,
      },
      {
        id: 'copy-state',
        title: 'Staff copy status',
        detail: 'Staff mark a copy ready, on the return cart, or already held.',
        cost: 2,
        requires: ['catalog'],
        required: true,
      },
      {
        id: 'hold',
        title: 'Hold until 16:00',
        detail: 'Save a hold only for a ready copy and show its pickup deadline.',
        cost: 2,
        requires: ['copy-state'],
        required: true,
      },
      {
        id: 'freshness',
        title: 'Checked-at time',
        detail: 'Show when staff last checked the copy state.',
        cost: 1,
        requires: ['copy-state'],
        required: true,
      },
      {
        id: 'recommendations',
        title: 'Reading recommendations',
        detail: 'Suggest similar titles; this does not make a copy ready to borrow.',
        cost: 3,
        requires: ['catalog'],
      },
      {
        id: 'pickup-alert',
        title: 'Pickup alert',
        detail: 'Send an extra reminder for a saved hold.',
        cost: 2,
        requires: ['hold'],
      },
    ],
  },
  {
    id: 'scope-club-update',
    title: 'Club: pack a current meeting',
    stage: 'scope',
    kind: 'pack',
    npc: 'ken',
    instructions:
      'Use seven points for a current event, organizer updates, a checked-at time, and a reminder members can choose. Pack the whole dependency chain.',
    opening:
      'Practice constraint: the organizer owns room changes and cancellations. Members choose whether to set a reminder.',
    budget: 7,
    targets: [],
    items: [
      {
        id: 'events',
        title: 'Current event details',
        detail: 'Show Tuesday’s meeting time, room, and cancellation status.',
        cost: 2,
        required: true,
      },
      {
        id: 'organizer-edit',
        title: 'Organizer update',
        detail: 'Let the organizer change the room or cancel the meeting.',
        cost: 2,
        requires: ['events'],
        required: true,
      },
      {
        id: 'freshness',
        title: 'Updated-at time',
        detail: 'Show when the organizer last changed the meeting.',
        cost: 1,
        requires: ['organizer-edit'],
        required: true,
      },
      {
        id: 'reminder',
        title: 'Member reminder control',
        detail: 'Let a member set or clear a local reminder for the current event.',
        cost: 2,
        requires: ['events'],
        required: true,
      },
      {
        id: 'chat',
        title: 'Group chat',
        detail: 'Add a conversation room; it does not keep event details current.',
        cost: 3,
      },
      {
        id: 'member-map',
        title: 'Member location map',
        detail: 'Show where members are; the meeting can work without tracking them.',
        cost: 4,
        requires: ['events'],
      },
    ],
  },
  {
    id: 'design-library-pickup',
    title: 'Library: show the pickup promise',
    stage: 'design',
    kind: 'layout',
    npc: 'mali',
    instructions:
      'Arrange context, checked copy details, then the hold action. Make the action at least 48px, strengthen contrast, and run this version.',
    opening:
      'Practice update: staff made River Atlas ready at 15:35. Show the ready copy and 16:00 deadline before I commit to a hold.',
    needsSize: true,
    needsContrast: true,
    targets: [
      { id: 'top', title: 'Top · book context' },
      { id: 'middle', title: 'Middle · copy and deadline' },
      { id: 'bottom', title: 'Bottom · hold action' },
    ],
    initial: { title: 'bottom', status: 'top', action: 'middle' },
    items: [
      {
        id: 'title',
        title: 'Reserve River Atlas',
        detail: 'Name the book being held.',
        target: 'top',
      },
      {
        id: 'status',
        title: '1 ready copy · checked 15:35 · pickup by 16:00',
        detail: 'Review availability, freshness, and deadline before holding.',
        target: 'middle',
      },
      {
        id: 'action',
        title: 'Hold this copy',
        detail: 'Keep the primary action in reach of one thumb.',
        target: 'bottom',
      },
    ],
    testCases: [
      {
        id: 'context',
        title: 'Book context first',
        action: 'title',
        expected: 'top',
        failure: 'Name River Atlas at the top so the hold has clear context.',
      },
      {
        id: 'promise',
        title: 'Pickup promise before action',
        action: 'status',
        expected: 'middle',
        failure: 'Put the checked copy and pickup deadline above the action.',
      },
      {
        id: 'reach',
        title: 'Hold in the thumb zone',
        action: 'action',
        expected: 'bottom',
        failure: 'Place Hold this copy at the bottom, within reach.',
      },
    ],
  },
  {
    id: 'design-club-cancelled',
    title: 'Club: make a cancellation clear',
    stage: 'design',
    kind: 'layout',
    npc: 'ken',
    instructions:
      'Arrange the cancelled meeting screen. Show the cancellation before the reminder action, use a 48px target and readable contrast, then run it.',
    opening:
      'Practice update: next Tuesday’s meeting is cancelled at 17:40. Help me clear tonight’s reminder.',
    needsSize: true,
    needsContrast: true,
    targets: [
      { id: 'top', title: 'Top · meeting context' },
      { id: 'middle', title: 'Middle · current status' },
      { id: 'bottom', title: 'Bottom · reminder action' },
    ],
    initial: { title: 'middle', status: 'bottom', action: 'top' },
    items: [
      {
        id: 'title',
        title: 'Astronomy club · next Tuesday',
        detail: 'Identify which meeting changed.',
        target: 'top',
      },
      {
        id: 'status',
        title: 'Cancelled · updated 17:40',
        detail: 'Make the current status easy to read before someone travels.',
        target: 'middle',
      },
      {
        id: 'action',
        title: 'Clear tonight’s reminder',
        detail: 'Offer the action that fits a cancelled meeting.',
        target: 'bottom',
      },
    ],
    testCases: [
      {
        id: 'context',
        title: 'Meeting identified',
        action: 'title',
        expected: 'top',
        failure: 'Name Tuesday’s astronomy meeting at the top.',
      },
      {
        id: 'cancelled',
        title: 'Cancellation before action',
        action: 'status',
        expected: 'middle',
        failure: 'Put the current cancellation status above the reminder action.',
      },
      {
        id: 'clear',
        title: 'Clear action in reach',
        action: 'action',
        expected: 'bottom',
        failure: 'Move Clear tonight’s reminder into the bottom thumb zone.',
      },
    ],
  },
  {
    id: 'connect-library-hold',
    title: 'Library: wire the whole hold',
    stage: 'connect',
    kind: 'wire',
    npc: 'noa',
    instructions:
      'Wire all three steps: inspect the current copy, save a checked hold, then read the pickup receipt. Run the journey on this version.',
    opening:
      'Practice case: River Atlas is now ready. A hold needs a saved result and a visible 16:00 deadline.',
    targets: [
      { id: 'details', title: 'Load current copy details' },
      { id: 'saved-hold', title: 'Check and save the hold' },
      { id: 'pickup-receipt', title: 'Show book and pickup deadline' },
    ],
    items: [
      {
        id: 'open-book',
        title: 'Tap River Atlas',
        detail: 'Inspect availability and its checked-at time.',
        target: 'details',
      },
      {
        id: 'hold-copy',
        title: 'Tap Hold this copy',
        detail: 'Recheck that the copy is ready before saving a hold.',
        target: 'saved-hold',
      },
      {
        id: 'hold-confirmed',
        title: 'Hold save confirms',
        detail: 'Show the saved book and pickup-by-16:00 receipt.',
        target: 'pickup-receipt',
      },
    ],
    testCases: [
      {
        id: 'inspect',
        title: 'Noa checks this copy',
        action: 'open-book',
        expected: 'details',
        failure: 'Opening the book must load its current copy details.',
      },
      {
        id: 'hold',
        title: 'The ready copy is held',
        action: 'hold-copy',
        expected: 'saved-hold',
        failure: 'Hold must check availability and save the hold.',
      },
      {
        id: 'receipt',
        title: 'The pickup promise is visible',
        action: 'hold-confirmed',
        expected: 'pickup-receipt',
        failure: 'After confirmation, show River Atlas and the 16:00 pickup deadline.',
      },
    ],
  },
  {
    id: 'connect-club-reminder',
    title: 'Club: wire the reminder choice',
    stage: 'connect',
    kind: 'wire',
    npc: 'ken',
    instructions:
      'Wire all three steps: load the current meeting, register a chosen reminder, and remove it if the meeting is cancelled. Run the journey.',
    opening:
      'Practice case: Ken chooses a 17:45 reminder for next Tuesday’s 18:00 meeting. A cancellation at 17:40 must clear it.',
    targets: [
      { id: 'current-event', title: 'Load current event details' },
      { id: 'registered', title: 'Register the chosen reminder' },
      { id: 'removed', title: 'Remove cancelled-event reminder' },
    ],
    items: [
      {
        id: 'open-meeting',
        title: 'Tap Tuesday’s meeting',
        detail: 'Read the current time, room, and status.',
        target: 'current-event',
      },
      {
        id: 'set-reminder',
        title: 'Choose Remind me at 17:45',
        detail: 'Register Ken’s choice before showing it as set.',
        target: 'registered',
      },
      {
        id: 'cancelled-update',
        title: 'Cancellation arrives',
        detail: 'Clear the scheduled reminder for that cancelled meeting.',
        target: 'removed',
      },
    ],
    testCases: [
      {
        id: 'current',
        title: 'Ken sees the current meeting',
        action: 'open-meeting',
        expected: 'current-event',
        failure: 'Open must load the organizer’s current event details.',
      },
      {
        id: 'choice',
        title: 'Ken’s choice is registered',
        action: 'set-reminder',
        expected: 'registered',
        failure: 'The chosen reminder must be registered before showing success.',
      },
      {
        id: 'cancel',
        title: 'A cancelled meeting stays quiet',
        action: 'cancelled-update',
        expected: 'removed',
        failure: 'Cancellation must remove the scheduled reminder for this meeting.',
      },
    ],
  },
  {
    id: 'launch-library-stale',
    title: 'Library: repair a false hold',
    stage: 'launch',
    kind: 'repair',
    npc: 'noa',
    instructions:
      'Run the broken journey first. Replace its cached shortcuts with a checked save, a useful receipt, and a refreshed catalog. Rerun this repaired version.',
    opening:
      'Practice bug: Hold opens an old “available” card, the receipt has no deadline, and the catalog still offers the same held copy.',
    targets: [
      { id: 'checked-save', title: 'Recheck and save a ready-copy hold' },
      { id: 'receipt', title: 'Read saved book and 16:00 deadline' },
      { id: 'refresh', title: 'Reload current copy availability' },
      { id: 'cache', title: 'Reuse old available card' },
    ],
    initial: { hold: 'cache', confirmation: 'cache', return: 'cache' },
    items: [
      {
        id: 'hold',
        title: 'Tap Hold',
        detail: 'Noa needs a saved hold checked against the ready-copy state.',
        target: 'checked-save',
      },
      {
        id: 'confirmation',
        title: 'Open saved confirmation',
        detail: 'Mali needs the saved book and pickup deadline.',
        target: 'receipt',
      },
      {
        id: 'return',
        title: 'Return to catalog',
        detail: 'The held copy must no longer appear available.',
        target: 'refresh',
      },
    ],
    testCases: [
      {
        id: 'check-save',
        title: 'Noa: hold uses current availability',
        action: 'hold',
        expected: 'checked-save',
        failure: 'Noa: Hold reused an old card. Recheck availability and save the ready-copy hold.',
      },
      {
        id: 'deadline',
        title: 'Mali: pickup details are visible',
        action: 'confirmation',
        expected: 'receipt',
        failure: 'Mali: the confirmation has no saved book or 16:00 deadline.',
      },
      {
        id: 'fresh-copy',
        title: 'Noa: a held copy is no longer offered',
        action: 'return',
        expected: 'refresh',
        failure: 'Noa: the catalog still offers the held copy. Reload current availability.',
      },
    ],
  },
  {
    id: 'launch-club-reminder',
    title: 'Club: repair the cancelled alert',
    stage: 'launch',
    kind: 'repair',
    npc: 'ken',
    instructions:
      'Run the broken journey first. Repair all three actions, the small target, and pale text. Rerun the changed version before keeping it.',
    opening:
      'Practice bug: next Tuesday’s cancelled meeting keeps its 17:45 reminder. Clear does nothing, and reopening shows the old B14 poster.',
    needsSize: true,
    needsContrast: true,
    targets: [
      { id: 'remove', title: 'Remove this meeting’s reminder' },
      { id: 'confirm', title: 'Confirm reminder is off' },
      { id: 'current', title: 'Reload current cancelled status' },
      { id: 'old-poster', title: 'Show old B14 poster' },
    ],
    initial: { cancel: 'old-poster', clear: 'old-poster', reopen: 'old-poster' },
    items: [
      {
        id: 'cancel',
        title: 'Organizer cancels meeting',
        detail: 'Ken’s reminder for the cancelled meeting must be removed.',
        target: 'remove',
      },
      {
        id: 'clear',
        title: 'Tap Clear reminder',
        detail: 'Show that this reminder is off after removing it.',
        target: 'confirm',
      },
      {
        id: 'reopen',
        title: 'Reopen Tuesday’s meeting',
        detail: 'Read the current cancellation instead of the old room.',
        target: 'current',
      },
    ],
    testCases: [
      {
        id: 'quiet',
        title: 'Ken: no cancelled-meeting alert',
        action: 'cancel',
        expected: 'remove',
        failure: 'Ken: the 17:45 reminder still exists. Remove it when the meeting is cancelled.',
      },
      {
        id: 'off',
        title: 'Ken: Clear has a visible result',
        action: 'clear',
        expected: 'confirm',
        failure: 'Ken: Clear did not confirm that the reminder is off.',
      },
      {
        id: 'latest',
        title: 'Mali: the cancellation remains visible',
        action: 'reopen',
        expected: 'current',
        failure: 'Mali: reopening shows the old B14 poster. Reload the current cancellation.',
      },
    ],
  },
];
export const challengeCatalog: Challenge[] = definitions.map((entry, index) => ({
  ...entry,
  reward: 25,
  prerequisite: definitions[index - 1]?.id ?? null,
}));
export function challengeById(id: string) {
  return challengeCatalog.find((challenge) => challenge.id === id);
}
export function isChallengeUnlocked(id: string, completed: Record<string, string>) {
  const challenge = challengeById(id);
  return Boolean(challenge && (!challenge.prerequisite || completed[challenge.prerequisite]));
}
