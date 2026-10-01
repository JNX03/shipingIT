import type { NpcId, StageId } from '../game/types';

/** Reading scenes accompany existing activities. They do not award progress or run gameplay. */
export const storybookNotice =
  'These are authored practice stories with fictional characters. Conversations and outcomes are examples for learning, not real interviews, live AI, or evidence of a public launch.';

export const storyCharacterNames: Record<NpcId, string> = {
  mali: 'Mali',
  noa: 'Noa',
  ken: 'Ken',
};

// Explicit IDs keep scene links independent of display titles and catalog ordering.
export const storyChallengeIds = [
  'explore-last-time',
  'explore-workaround',
  'insight-observation',
  'insight-cause',
  'scope-lunch',
  'scope-library',
  'design-thumb',
  'design-readable',
  'connect-report',
  'connect-recovery',
  'launch-stale',
  'launch-access',
  'explore-library-handoff',
  'explore-club-room',
  'insight-library-evidence',
  'insight-club-evidence',
  'scope-library-hold',
  'scope-club-update',
  'design-library-pickup',
  'design-club-cancelled',
  'connect-library-hold',
  'connect-club-reminder',
  'launch-library-stale',
  'launch-club-reminder',
] as const;
export type StoryChallengeId = (typeof storyChallengeIds)[number];

export const storyLessonIds = [
  'discover-1',
  'discover-2',
  'discover-3',
  'discover-4',
  'define-1',
  'define-2',
  'define-3',
  'define-4',
  'scope-1',
  'scope-2',
  'scope-3',
  'scope-4',
  'prototype-1',
  'prototype-2',
  'prototype-3',
  'prototype-4',
  'validate-1',
  'validate-2',
  'validate-3',
  'validate-4',
  'business-1',
  'business-2',
  'business-3',
  'business-4',
  'build-1',
  'build-2',
  'build-3',
  'build-4',
  'ship-1',
  'ship-2',
  'ship-3',
  'ship-4',
] as const;
export type StoryLessonId = (typeof storyLessonIds)[number];
export type StoryMissionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type StoryContentRef =
  | { kind: 'adventure'; stageId: StageId }
  | { kind: 'challenge'; challengeId: StoryChallengeId }
  | { kind: 'lesson'; lessonId: StoryLessonId };
export type StoryContentSelection =
  | { kind: 'adventure'; stageId: StageId }
  | { kind: 'challenge'; challengeId: string }
  | { kind: 'lesson'; lessonId: string };

export const storyGlossary = {
  evidence: {
    english: 'Evidence',
    thai: 'หลักฐาน',
    meaning: 'Something observed or recorded, with a source and limits.',
  },
  assumption: {
    english: 'Assumption',
    thai: 'ข้อสมมติที่ยังไม่ได้ตรวจสอบ',
    meaning: 'A belief to check, rather than a fact to rely on.',
  },
  insight: {
    english: 'Insight',
    thai: 'ความเข้าใจเบื้องลึก',
    meaning: 'A connection between a person’s situation, difficulty, and need.',
  },
  friction: {
    english: 'Friction',
    thai: 'อุปสรรคที่ทำให้ทำสิ่งหนึ่งได้ยาก',
    meaning: 'Something that slows or blocks a person’s task.',
  },
  workaround: {
    english: 'Workaround',
    thai: 'วิธีแก้ขัดที่ใช้อยู่',
    meaning: 'How a person handles the problem today.',
  },
  stale: {
    english: 'Stale information',
    thai: 'ข้อมูลเก่าที่อาจใช้ไม่ได้แล้ว',
    meaning: 'A previous result that may no longer describe the current situation.',
  },
  freshness: {
    english: 'Freshness',
    thai: 'ความใหม่ของข้อมูล',
    meaning: 'When the information was checked or updated.',
  },
  mvp: {
    english: 'MVP',
    thai: 'รุ่นเล็กที่สุดที่ยังใช้งานได้',
    meaning: 'The smallest useful experience that can answer an important question.',
  },
  dependency: {
    english: 'Dependency',
    thai: 'สิ่งที่ต้องมีหรือทำก่อน',
    meaning: 'A feature or step that another one relies on.',
  },
  contrast: {
    english: 'Contrast',
    thai: 'ความแตกต่างระหว่างตัวอักษรกับพื้นหลัง',
    meaning: 'Enough visual difference to read text clearly.',
  },
  recovery: {
    english: 'Recovery',
    thai: 'การกลับมาทำต่อหลังเกิดข้อผิดพลาด',
    meaning: 'A way to continue after a mistake or failure without losing work.',
  },
  hypothesis: {
    english: 'Hypothesis',
    thai: 'สมมติฐานที่ทดสอบได้',
    meaning: 'A specific belief with a way to check whether it holds.',
  },
  threshold: {
    english: 'Threshold',
    thai: 'เกณฑ์ที่ตั้งไว้ล่วงหน้า',
    meaning: 'The result needed to meet a decision rule chosen before a test.',
  },
  pivot: {
    english: 'Pivot',
    thai: 'การเปลี่ยนทิศทางจากหลักฐานใหม่',
    meaning: 'Changing an important part of the approach because of what was learned.',
  },
  feasibility: {
    english: 'Feasibility',
    thai: 'ความเป็นไปได้ในการทำจริง',
    meaning: 'Whether the idea can work within real access, time, skill, and cost constraints.',
  },
  contribution: {
    english: 'Contribution',
    thai: 'รายรับหักต้นทุนผันแปร',
    meaning: 'Revenue minus the cost of serving a customer, before fixed costs.',
  },
  slice: {
    english: 'Vertical slice',
    thai: 'งานเล็กหนึ่งงานที่ทำได้ครบตั้งแต่ต้นจนจบ',
    meaning: 'One complete task, from input through a saved result.',
  },
  frontend: {
    english: 'Frontend',
    thai: 'ส่วนที่ผู้ใช้เห็นและโต้ตอบด้วย',
    meaning: 'The screens and controls a person uses, including visible feedback.',
  },
  backend: {
    english: 'Backend',
    thai: 'ระบบเบื้องหลังที่ตรวจสอบและจัดการคำขอ',
    meaning: 'The server-side part that enforces trusted rules and handles requests.',
  },
  database: {
    english: 'Database',
    thai: 'ฐานข้อมูลที่เก็บข้อมูลไว้ใช้งานภายหลัง',
    meaning: 'Organized records that remain available for later use.',
  },
  persona: {
    english: 'Persona',
    thai: 'ตัวแทนกลุ่มผู้ใช้ที่อ้างอิงข้อมูล',
    meaning: 'A research-based description of a user group and its relevant situation.',
  },
  value: {
    english: 'Value proposition',
    thai: 'คุณค่าที่เสนอให้ผู้ใช้',
    meaning: 'The useful outcome an approach offers a particular person.',
  },
  fidelity: {
    english: 'Prototype fidelity',
    thai: 'ระดับรายละเอียดของต้นแบบ',
    meaning:
      'How closely a prototype represents the appearance and behavior of an intended product.',
  },
  consent: {
    english: 'Consent',
    thai: 'ความยินยอม',
    meaning: 'A person’s informed choice about taking part and sharing information.',
  },
} as const;
export type StoryGlossaryId = keyof typeof storyGlossary;
export type SixStoryBeats = readonly [
  StoryBeat,
  StoryBeat,
  StoryBeat,
  StoryBeat,
  StoryBeat,
  StoryBeat,
];
export interface StoryLine {
  speaker: NpcId;
  text: string;
}
export interface StoryBeat {
  title: string;
  text: string;
  ref: StoryContentRef;
}
export interface StoryChapter {
  id: string;
  collection: 'project' | 'practice' | 'mission';
  title: string;
  opening: string;
  stakes: string;
  conversation: readonly StoryLine[];
  beats: SixStoryBeats;
  ending: string;
  nextQuestion: string;
  glossary: readonly StoryGlossaryId[];
  missionId?: StoryMissionId;
}

const adventure = (stageId: StageId): StoryContentRef => ({ kind: 'adventure', stageId });
const challenge = (challengeId: StoryChallengeId): StoryContentRef => ({
  kind: 'challenge',
  challengeId,
});
const lesson = (lessonId: StoryLessonId): StoryContentRef => ({ kind: 'lesson', lessonId });
const beat = (ref: StoryContentRef, title: string, text: string): StoryBeat => ({
  ref,
  title,
  text,
});
type StoryMoment = readonly [title: string, text: string];

/** Six reading moments can all point to one real practice. They are not six new levels. */
function practiceBeats(
  challengeId: StoryChallengeId,
  moments: readonly [StoryMoment, StoryMoment, StoryMoment, StoryMoment, StoryMoment, StoryMoment],
): SixStoryBeats {
  const ref = challenge(challengeId);
  return [
    beat(ref, ...moments[0]),
    beat(ref, ...moments[1]),
    beat(ref, ...moments[2]),
    beat(ref, ...moments[3]),
    beat(ref, ...moments[4]),
    beat(ref, ...moments[5]),
  ];
}

export const storyChapters: readonly StoryChapter[] = [
  {
    id: 'campus-lunch-rush',
    collection: 'project',
    title: 'Campus: twelve minutes for lunch',
    opening:
      'The courtyard is busy. Mali has twelve minutes before class, and the noodle stall is across campus.',
    stakes:
      'A long walk to an unexpectedly long line can use the whole break. The team needs a better way to judge the queue before walking.',
    conversation: [
      {
        speaker: 'mali',
        text: 'Yesterday I reached the noodle stall and left without lunch. The line was longer than I expected.',
      },
      {
        speaker: 'noa',
        text: 'We write the queue at opening. During lunch it changes, and the board has no update time.',
      },
      {
        speaker: 'ken',
        text: 'Show me the queue and when someone checked it. I need to decide before I walk.',
      },
    ],
    beats: [
      beat(
        adventure('explore'),
        'Hear all three sides',
        'Ask Mali about her short break and wasted walk, Noa about the old board, and Ken about the information he trusts. Collect their authored evidence cards.',
      ),
      beat(
        adventure('insight'),
        'Build the reason',
        'Place “A short lunch break” under Person, “A wasted walk” under Problem, “The board is old” under Cause, and “Fresh information” under Need. Set aside “A tempting claim”: the payment opinion has not been checked.',
      ),
      beat(
        adventure('scope'),
        'Spend seven points',
        'Pack Queue board for three points, Updated time for two, and Report a queue for two. The update time and reports need the queue board. Payments and predictions stay outside this first version.',
      ),
      beat(
        adventure('design'),
        'Make a readable board',
        'Place a title, queue choices, update time, and refresh action fully on the phone. Give blocks their own space; the design still needs the characters’ walkthroughs.',
      ),
      beat(
        adventure('connect'),
        'Let refresh reach the data',
        'Connect Tap refresh to Read the board, Read the board to Queue data, and Queue data to Show choices. Each link carries the visitor from a request to visible current choices.',
      ),
      beat(
        adventure('launch'),
        'Repair what the walkthroughs reveal',
        'Mali needs more space between choices. Ken needs the Updated time before the queue choices. Noa needs Staff reports connected to Save update, then Save update to Queue data. After repairing, rerun their simulated walkthroughs on the current prototype before shipping it in the app.',
      ),
    ],
    ending:
      'The in-app Lunch Lens prototype has a complete queue-checking story and three simulated walkthroughs. Its artifact records the scope, screen, connections, and current result.',
    nextQuestion:
      'Would recent queue reports help real students decide in time? That remains a future research question, not a result of reading this story.',
    glossary: ['evidence', 'insight', 'freshness', 'mvp', 'dependency'],
  },
  {
    id: 'library-reliable-holds',
    collection: 'project',
    title: 'Library: a hold you can trust',
    opening:
      'At 15:20, River Atlas looks available in the catalog. At the desk, Mali learns that the copy is still on the return cart.',
    stakes:
      'A catalog result is useful only if the copy can actually be borrowed. Mali has already spent nine minutes walking and still needs to catch her bus.',
    conversation: [
      {
        speaker: 'mali',
        text: 'I need the copy state before I walk, and a deadline I can understand before I make a hold.',
      },
      {
        speaker: 'noa',
        text: 'For this practice version, the desk will update copy status and use a 16:00 pickup deadline.',
      },
      {
        speaker: 'ken',
        text: 'Then the promise is one reliable hold, not a catalog full of extras.',
      },
    ],
    beats: [
      beat(
        challenge('explore-library-handoff'),
        'Follow the handoff',
        'Ask about the catalog claim, the nine-minute empty trip, and who can keep the copy state current. Pin the event, impact, and open question separately.',
      ),
      beat(
        challenge('insight-library-evidence'),
        'Keep the unknowns visible',
        'Sort the 15:20 mismatch and empty trip as case evidence. Everyone wanting an account is an assumption. The status owner and supported hold duration remain questions.',
      ),
      beat(
        challenge('scope-library-hold'),
        'Pack a seven-point promise',
        'Choose title search, staff copy status, hold until 16:00, and checked-at time. Copy status needs the catalog; the hold and freshness depend on copy status.',
      ),
      beat(
        challenge('design-library-pickup'),
        'Read before committing',
        'In the next practice update, staff make the copy ready at 15:35. Arrange River Atlas, the ready-copy and 16:00 details, then Hold this copy. Repair contrast and make the action at least 48px.',
      ),
      beat(
        challenge('connect-library-hold'),
        'Finish all three steps',
        'Opening River Atlas loads current copy details. Hold checks and saves the ready-copy hold. A confirmed save leads to the book and pickup-deadline receipt.',
      ),
      beat(
        challenge('launch-library-stale'),
        'Replace the cached shortcuts',
        'Run the broken authored journey before editing it. Connect Hold to a checked save, confirmation to a useful receipt, and return to refreshed availability. Rerun the changed version so the old available card no longer stands in for the result.',
      ),
    ],
    ending:
      'The practice journey now connects a checked copy to a saved hold and a clear pickup promise. A held copy is no longer offered through the stale catalog route.',
    nextQuestion:
      'How quickly could an actual library desk maintain status, and what hold policy could it support? The story uses an agreed practice constraint.',
    glossary: ['friction', 'assumption', 'dependency', 'stale', 'contrast'],
  },
  {
    id: 'club-meeting-move',
    collection: 'project',
    title: 'Club: the room moved, the poster did not',
    opening:
      'Last Tuesday, the astronomy organizer moved the 18:00 meeting from B14 to B16 at 17:40. Ken followed the old paper poster.',
    stakes:
      'Ken lost six minutes finding the room. Next Tuesday brings a different change: a cancellation that must not leave a 17:45 reminder active.',
    conversation: [
      {
        speaker: 'ken',
        text: 'I found B14 empty, checked the chat, and arrived in B16 after the meeting started.',
      },
      {
        speaker: 'mali',
        text: 'That is a concrete event. It still does not tell us that every member wants an alert.',
      },
      {
        speaker: 'noa',
        text: 'Keep the current meeting visible, let the organizer update it, and let members choose their reminder.',
      },
    ],
    beats: [
      beat(
        challenge('explore-club-room'),
        'Hear the missed start',
        'Ask about the room change, what happened after it, and whether reminders would reach members. The last question stays open rather than becoming a promise.',
      ),
      beat(
        challenge('insight-club-evidence'),
        'Facts before alerts',
        'Keep the 17:40 room change and Ken’s six-minute delay as case evidence. All members reading chat and alerts preventing every miss are assumptions. Quiet hours and the backup update owner need checking.',
      ),
      beat(
        challenge('scope-club-update'),
        'Fit a complete seven-point version',
        'Pack current event details, organizer update, updated-at time, and member reminder control. Updates and reminders need the event; freshness needs the update. Chat and location tracking stay on the shelf.',
      ),
      beat(
        challenge('design-club-cancelled'),
        'Make next Tuesday’s cancellation clear',
        'Place the meeting context above Cancelled · updated 17:40, with Clear tonight’s reminder in the thumb zone. Strengthen contrast and make the action at least 48px.',
      ),
      beat(
        challenge('connect-club-reminder'),
        'Connect the chosen reminder',
        'Load the current meeting, register Ken’s chosen 17:45 reminder, and remove it if the 18:00 meeting is cancelled at 17:40. Run the three-step authored journey.',
      ),
      beat(
        challenge('launch-club-reminder'),
        'Stop the cancelled alert',
        'Run the broken version first. Repair cancellation to remove the reminder, Clear to confirm it is off, and reopen to current cancelled status. Repair the small target and pale text, then rerun the current version.',
      ),
    ],
    ending:
      'The practice flow follows the organizer’s current event and a member’s reminder choice. The cancellation no longer points to an old B14 poster or leaves the scheduled reminder in place.',
    nextQuestion:
      'Which reminders do real members choose, and who maintains changes when an organizer is away? A clear practice flow does not answer those questions.',
    glossary: ['evidence', 'assumption', 'freshness', 'dependency', 'recovery'],
  },
  {
    id: 'case-shuttle-departure',
    collection: 'practice',
    title: 'The shuttle left early',
    opening:
      'Mali remembers yesterday’s missed shuttle. She is tired of promises about perfect travel.',
    stakes:
      'The early departure led to a twenty-minute delay at her lab. A useful interview must find both the event and its cost.',
    conversation: [
      {
        speaker: 'mali',
        text: 'The poster had a time, but the shuttle left five minutes before it.',
      },
      { speaker: 'ken', text: 'Ask what happened next before suggesting a new app.' },
      {
        speaker: 'mali',
        text: 'I walked to the next stop and arrived twenty minutes late for my lab.',
      },
    ],
    beats: practiceBeats('explore-last-time', [
      ['Meet Mali', 'Begin with the missed shuttle rather than a feature pitch.'],
      ['Ask about yesterday', 'A question about the last event uncovers the early departure.'],
      ['Follow what happened next', 'A follow-up uncovers the walk and late arrival.'],
      ['Pin the event', 'Place An early departure under What happened.'],
      ['Pin the impact', 'Place A missed lab under Why it mattered.'],
      [
        'Keep the limit',
        'These authored clues describe one journey; they do not establish how often shuttles leave early.',
      ],
    ]),
    ending:
      'The evidence board holds an event and an impact, giving a later idea a specific problem to address.',
    nextQuestion:
      'What else would you need to learn before changing the shuttle information system?',
    glossary: ['evidence', 'friction'],
  },
  {
    id: 'case-lost-and-found',
    collection: 'practice',
    title: 'A notebook full of lost things',
    opening: 'Noa already has a box and a paper notebook at the lost-and-found desk.',
    stakes:
      'The existing process protects items, but different descriptions make the handwritten pages slow to search.',
    conversation: [
      {
        speaker: 'noa',
        text: 'I write the item and the finder’s number in the notebook, then keep the item here.',
      },
      {
        speaker: 'mali',
        text: 'So the box is not the whole problem. Which part of the process is difficult?',
      },
      {
        speaker: 'noa',
        text: 'Students describe items differently. Searching the pages takes ages.',
      },
    ],
    beats: practiceBeats('explore-workaround', [
      [
        'Start with what exists',
        'The desk has a functioning workaround. Do not assume that nothing is being done.',
      ],
      [
        'Ask how it works now',
        'Uncover the paper notebook before asking about the difficult part.',
      ],
      ['Follow the search', 'Ask where the current process slows down.'],
      ['Record the workaround', 'Place A paper notebook under Current workaround.'],
      ['Record the remaining friction', 'Place No way to search under Remaining friction.'],
      [
        'Protect what already works',
        'A later idea should keep custody of items clear while addressing the search difficulty.',
      ],
    ]),
    ending: 'The board distinguishes a current process from the part that still causes difficulty.',
    nextQuestion:
      'Which descriptions help staff find an item without collecting more personal detail than necessary?',
    glossary: ['workaround', 'friction'],
  },
  {
    id: 'case-study-room-notes',
    collection: 'practice',
    title: 'Booked rooms, empty seats',
    opening:
      'Ken has study-room notes: three students waited during ten minutes, and two booked rooms remained empty for thirty minutes.',
    stakes:
      'The notes suggest a booking problem. They do not prove that everyone would pay or that an AI prediction would stop every no-show.',
    conversation: [
      { speaker: 'ken', text: 'We can record the waiting students and empty rooms.' },
      { speaker: 'noa', text: 'Where did “everyone will pay” come from?' },
      { speaker: 'ken', text: 'That is our prediction. It belongs with the assumptions.' },
    ],
    beats: practiceBeats('insight-observation', [
      ['Read the notes', 'Look for actions and times that were recorded in this authored case.'],
      ['Place the waiting students', 'Three students waited belongs under Observed.'],
      ['Place the empty rooms', 'Two rooms stayed empty belongs under Observed.'],
      ['Separate the payment promise', 'Everyone will pay belongs under Assumed.'],
      ['Separate the AI promise', 'AI will fix attendance also belongs under Assumed.'],
      [
        'Keep a question alive',
        'The sorting activity identifies which claims still need evidence.',
      ],
    ]),
    ending: 'The board preserves the observations without disguising two predictions as facts.',
    nextQuestion:
      'What caused those rooms to remain empty, and did their bookings still serve a useful purpose?',
    glossary: ['evidence', 'assumption'],
  },
  {
    id: 'case-sold-out-menu',
    collection: 'practice',
    title: 'The menu promised lunch',
    opening: 'Mali reaches a stall whose printed menu still shows a dish that sold out earlier.',
    stakes:
      'Students leave hungry. A proposed switch may help, but the team must first separate the symptom from its cause.',
    conversation: [
      { speaker: 'mali', text: 'I arrived expecting that dish and left without lunch.' },
      { speaker: 'noa', text: 'The printed menu stays up after we sell out.' },
      { speaker: 'ken', text: 'A sold-out switch is an idea for changing that cause.' },
    ],
    beats: practiceBeats('insight-cause', [
      ['Notice the failed outcome', 'Walking away hungry is what students experience.'],
      ['Read the information gap', 'The printed menu stays unchanged after stock runs out.'],
      ['Name the proposal', 'A sold-out switch is something the team could build.'],
      ['Place the symptom', 'Students walk away hungry belongs under Symptom.'],
      [
        'Place cause and solution',
        'Menu never updates belongs under Cause; Add a sold-out switch belongs under Solution idea.',
      ],
      [
        'Avoid a shortcut',
        'A solution suggestion is useful input, but it does not replace understanding why the problem occurs.',
      ],
    ]),
    ending:
      'The notes now distinguish the unwanted outcome, an information cause, and a proposed intervention.',
    nextQuestion: 'Could staff make a stock update quickly during the busiest part of lunch?',
    glossary: ['insight', 'friction'],
  },
  {
    id: 'case-lunch-stock-check',
    collection: 'practice',
    title: 'Six points before the walk',
    opening:
      'Noa’s first lunch version has six build points. Students need to know which dishes are available before visiting.',
    stakes:
      'Payment is tempting, but a stock check must include the update process and its freshness.',
    conversation: [
      {
        speaker: 'noa',
        text: 'The menu costs three points, staff updates cost two, and the updated time costs one.',
      },
      { speaker: 'mali', text: 'Those six points answer my question before I walk.' },
      {
        speaker: 'ken',
        text: 'Payment needs accounts as well. It does not fit this first promise.',
      },
    ],
    beats: practiceBeats('scope-lunch', [
      ['Name the first promise', 'Let a student check current stock before walking.'],
      ['Pack the menu', 'Live menu uses three points and is required.'],
      ['Pack staff updates', 'Staff update uses two points and requires the menu.'],
      ['Pack the time', 'Updated time uses one point and requires staff updates.'],
      ['Return the extras', 'Payment and accounts exceed the complete six-point version.'],
      [
        'Check the whole chain',
        'The packed version needs all three required features and their dependencies within budget.',
      ],
    ]),
    ending: 'The six-point stock check contains reading, updating, and a visible freshness signal.',
    nextQuestion: 'What would let staff keep the menu useful without interrupting service?',
    glossary: ['mvp', 'dependency', 'freshness'],
  },
  {
    id: 'case-small-library-launch',
    collection: 'practice',
    title: 'Five points for a borrowable book',
    opening:
      'Mali wants to find a book and know whether she can borrow it. This first library challenge has five points.',
    stakes:
      'Search alone is incomplete. A catalog, copy availability, and a reservation must fit together.',
    conversation: [
      { speaker: 'mali', text: 'A search result helps only if the copy can be borrowed.' },
      {
        speaker: 'noa',
        text: 'The catalog costs two, availability costs one, and reservation costs two.',
      },
      { speaker: 'ken', text: 'Chat and recommendations can wait until the core task works.' },
    ],
    beats: practiceBeats('scope-library', [
      [
        'Define the borrowing task',
        'Find a title, check its copies, and reserve one that is available.',
      ],
      ['Pack the catalog', 'Book catalog is required and costs two points.'],
      ['Add availability', 'Copy availability costs one point and depends on the catalog.'],
      ['Add reservation', 'Reserve a copy costs two points and depends on availability.'],
      [
        'Keep extras for later',
        'Book club chat and recommendations do not fit the five-point complete version.',
      ],
      [
        'Confirm the scope',
        'The required chain uses exactly five points. This is the introductory library activity, before the later seven-point reliable-hold case.',
      ],
    ]),
    ending: 'The small library version supports the complete find-check-reserve task.',
    nextQuestion: 'Who keeps the copy availability accurate after a reservation?',
    glossary: ['mvp', 'dependency'],
  },
  {
    id: 'case-one-hand-shuttle',
    collection: 'practice',
    title: 'A sports bag in one hand',
    opening: 'Ken is carrying a sports bag while checking the campus shuttle.',
    stakes:
      'The primary action is difficult to reach. The screen needs context, current status, and an action large enough to tap.',
    conversation: [
      {
        speaker: 'ken',
        text: 'I can hold my phone in one hand, but I need the main action close to my thumb.',
      },
      {
        speaker: 'mali',
        text: 'Keep Campus shuttle at the top and the six-minute status in the middle.',
      },
      { speaker: 'ken', text: 'Put Notify me at the bottom and make its target at least 48px.' },
    ],
    beats: practiceBeats('design-thumb', [
      ['Read the misplaced screen', 'The context, status, and action start in the wrong zones.'],
      ['Move the title', 'Place Campus shuttle in Top · context.'],
      ['Move the status', 'Place Next shuttle · 6 min in Middle · status.'],
      ['Bring the action closer', 'Place Notify me in Bottom · action.'],
      ['Grow the target', 'Use the existing size control to reach at least 48px.'],
      [
        'Run the changed layout',
        'The authored layout check must match the current arrangement and target size.',
      ],
    ]),
    ending: 'The practice screen has a clear hierarchy and a reachable action target.',
    nextQuestion: 'What would someone notice when using this arrangement while carrying a bag?',
    glossary: ['friction', 'recovery'],
  },
  {
    id: 'case-bright-counter-report',
    collection: 'practice',
    title: 'Pale text at a bright counter',
    opening: 'Noa tries to read a broken-light report at a bright counter.',
    stakes:
      'The photo and location need to be reviewed before sending, but pale text and a small action get in the way.',
    conversation: [
      {
        speaker: 'noa',
        text: 'Pale text disappears here. I need to read the evidence before I send it.',
      },
      { speaker: 'mali', text: 'Place the report title first, then the photo and location.' },
      { speaker: 'noa', text: 'Make Send report readable and at least 48px.' },
    ],
    beats: practiceBeats('design-readable', [
      ['Notice the reading condition', 'Bright light makes the low-contrast text harder to read.'],
      ['Set the context', 'Report a broken light belongs in the top zone.'],
      ['Review the evidence', 'Photo and location belong in the middle, before the action.'],
      ['Place the send action', 'Send report belongs in the bottom action zone.'],
      [
        'Repair size and contrast',
        'Grow the target to at least 48px and strengthen the text contrast.',
      ],
      [
        'Run this version',
        'Check the actual current layout, size, and contrast before finishing the activity.',
      ],
    ]),
    ending:
      'The practice report puts review before submission and makes its main action easier to read and tap.',
    nextQuestion: 'Does the report still make sense without relying on its color alone?',
    glossary: ['evidence', 'contrast'],
  },
  {
    id: 'case-report-to-board',
    collection: 'practice',
    title: 'A report needs a destination',
    opening:
      'Mali can see Add report, Send report, and Done. Each button needs a result that matches its promise.',
    stakes:
      'Opening a form is only the start. The report must be saved, confirmed, and visible on the updated board.',
    conversation: [
      { speaker: 'mali', text: 'Add report should let me write. Send should save what I entered.' },
      { speaker: 'noa', text: 'And after Done, someone needs to read the updated board.' },
      { speaker: 'ken', text: 'Connect every step, then run the whole authored journey.' },
    ],
    beats: practiceBeats('connect-report', [
      ['Read the button promises', 'Identify starting, saving, and reading as different steps.'],
      ['Wire the start', 'Tap Add report leads to Open report form.'],
      ['Wire the save', 'Tap Send report leads to Save and confirm.'],
      ['Wire the return', 'Tap Done leads to Updated board.'],
      [
        'Run all three checks',
        'The authored journey checks starting a report, saving it, and seeing the update.',
      ],
      [
        'Keep the current proof',
        'Changing a connection clears the previous run; rerun the current version before keeping it.',
      ],
    ]),
    ending: 'The practice flow contains a complete start-save-read loop.',
    nextQuestion: 'What should a report flow preserve if the connection fails during saving?',
    glossary: ['dependency', 'recovery'],
  },
  {
    id: 'case-offline-retry',
    collection: 'practice',
    title: 'The signal dropped near the field',
    opening: 'Ken loses signal while sending a report near the sports field.',
    stakes:
      'A retry must preserve what he wrote and show success only after the save is confirmed.',
    conversation: [
      { speaker: 'ken', text: 'Do not make me type the whole report again.' },
      { speaker: 'noa', text: 'Keep the draft, resend it on Retry, and wait for confirmation.' },
      {
        speaker: 'mali',
        text: 'A success message should describe a real result inside this simulated journey.',
      },
    ],
    beats: practiceBeats('connect-recovery', [
      [
        'Find the interruption',
        'Connection fails is a recoverable step, not permission to discard the work.',
      ],
      ['Keep the draft', 'Connect failure to Keep draft locally.'],
      ['Continue the operation', 'Connect Tap Retry to Resend saved draft.'],
      ['Wait for confirmation', 'Connect Server confirms to Show saved confirmation.'],
      [
        'Run the authored journey',
        'Check draft protection, retry, and confirmation in their intended destinations.',
      ],
      ['Rerun after edits', 'A later connection change needs a new run of this version.'],
    ]),
    ending:
      'The practice flow protects the entered report and separates retrying from confirmed success.',
    nextQuestion:
      'How could a real implementation avoid creating a duplicate report after a retry?',
    glossary: ['recovery', 'dependency'],
  },
  {
    id: 'case-yesterdays-board',
    collection: 'practice',
    title: 'Saved, but still showing yesterday',
    opening: 'Noa sees a saved message, but the queue board still contains yesterday’s result.',
    stakes:
      'A save claim and a cached screen can disagree. Both submitting and returning need repair.',
    conversation: [
      { speaker: 'noa', text: 'My new report never reaches the board through this shortcut.' },
      { speaker: 'mali', text: 'And I still see yesterday when I return.' },
      { speaker: 'ken', text: 'Run the broken journey, change both destinations, then rerun it.' },
    ],
    beats: practiceBeats('launch-stale', [
      ['Inspect the old routes', 'Submit and return both start at yesterday’s cache.'],
      [
        'Run before repairing',
        'The original authored journey reveals the failed save and stale return.',
      ],
      ['Repair submission', 'Connect Tap Submit to Save the new report.'],
      ['Repair the return', 'Connect Return to board to Reload current reports.'],
      ['Rerun the repaired version', 'Both tester notes must pass against the new destinations.'],
      [
        'Keep the current result',
        'The completed practice requires the changed version’s passing run, not its old failure report.',
      ],
    ]),
    ending: 'The practice replaces two cached shortcuts with a save and a refreshed read.',
    nextQuestion:
      'Which timestamp would help someone recognize old queue information before trusting it?',
    glossary: ['stale', 'freshness', 'recovery'],
  },
  {
    id: 'case-draft-losing-back',
    collection: 'practice',
    title: 'Back should not erase the draft',
    opening: 'Ken’s main action is tiny, and the Back button discards the report he was editing.',
    stakes:
      'Leaving to edit later should keep the draft. Sending should save and confirm rather than take the discard route.',
    conversation: [
      { speaker: 'ken', text: 'I want to return later without losing what I wrote.' },
      { speaker: 'mali', text: 'When I send the finished report, I need to know it was saved.' },
      {
        speaker: 'noa',
        text: 'Repair both routes and the small target, then run the journey again.',
      },
    ],
    beats: practiceBeats('launch-access', [
      [
        'Notice the bad defaults',
        'Back and Send both start by discarding the draft; the target starts at 28px.',
      ],
      [
        'Run the broken journey',
        'Let the authored notes expose the lost draft, missing confirmation, and small target.',
      ],
      ['Repair Back', 'Connect Tap Back to Back with draft kept.'],
      ['Repair Send', 'Connect Tap Send to Save and confirm.'],
      ['Make the action reachable', 'Increase the target to at least 48px.'],
      [
        'Rerun the whole version',
        'The repaired routes and target size must pass together before this practice can be kept.',
      ],
    ]),
    ending:
      'The practice keeps the draft on return and gives the finished report a confirmed save route.',
    nextQuestion: 'What other interruption could make a learner lose unfinished work?',
    glossary: ['recovery', 'friction'],
  },
  {
    id: 'mission-discover',
    collection: 'mission',
    missionId: 1,
    title: 'Mission 1: the deadline detective',
    opening:
      'In this curriculum practice story, a group assignment has updates in chat and on paper. Mali cannot tell which deadline is current.',
    stakes:
      'Picking a fashionable tool first could hide the actual difficulty. The team needs a problem and a discovery question before a product name.',
    conversation: [
      {
        speaker: 'mali',
        text: 'I keep checking the same places because I do not know which update is newest.',
      },
      { speaker: 'ken', text: 'Let us describe that moment before calling it an app idea.' },
      {
        speaker: 'noa',
        text: 'And label this as practice. We have not observed real participants.',
      },
    ],
    beats: [
      beat(
        lesson('discover-1'),
        'Name a problem',
        'Separate missed or unclear deadlines from proposed tools such as a reminder bot. Write the person, situation, and unwanted outcome.',
      ),
      beat(
        lesson('discover-2'),
        'Record an event',
        'Use the lesson’s example of three students checking two chat groups. Keep visible behavior separate from interpretations such as “lazy.” Label your own fictional notes as practice.',
      ),
      beat(
        lesson('discover-3'),
        'Find the cost',
        'Ask what waiting or repeated checking prevents someone from doing. Record a pain hypothesis without inventing its frequency.',
      ),
      beat(
        lesson('discover-4'),
        'Choose a reachable question',
        'Narrow the investigation to a group whose recent deadline experiences you could learn about.',
      ),
      beat(
        lesson('discover-4'),
        'Keep assumptions visible',
        'Write what you think happens and what you still do not know. The discovery challenge is a question, not validation.',
      ),
      beat(
        lesson('discover-4'),
        'Choose the next action',
        'Finish with an observation note, a pain hypothesis, and one discovery action. If real research comes later, ask permission before taking notes.',
      ),
    ],
    ending:
      'The practice project has a specific problem to investigate and an honest next discovery action.',
    nextQuestion: 'Which recent experience could challenge your first explanation?',
    glossary: ['evidence', 'assumption', 'hypothesis'],
  },
  {
    id: 'mission-define',
    collection: 'mission',
    missionId: 2,
    title: 'Mission 2: whose deadline problem?',
    opening:
      'The team narrows the practice brief to Year 11 students coordinating group work across three subjects.',
    stakes:
      '“Everyone with a phone” is too broad to guide a first test. The team needs a relevant goal, constraint, current behavior, and source limits.',
    conversation: [
      {
        speaker: 'ken',
        text: 'Which situation makes this group different from every other student?',
      },
      {
        speaker: 'mali',
        text: 'Ask about the last assignment update, not whether I like an amazing new app.',
      },
      { speaker: 'noa', text: 'Keep an interview plan separate from a completed interview.' },
    ],
    beats: [
      beat(
        lesson('define-1'),
        'Choose the first user',
        'Describe the shared group-work situation and current workaround. Avoid decorative biography that does not affect a decision.',
      ),
      beat(
        lesson('define-2'),
        'Ask without pitching',
        'Prepare questions about the last time, what happened next, and time spent. Leading questions invite compliments rather than useful detail.',
      ),
      beat(
        lesson('define-2'),
        'Keep control with the participant',
        'For a later real conversation, record permission and only necessary details. For this authored practice, keep the notebook labeled as a plan or practice.',
      ),
      beat(
        lesson('define-3'),
        'Separate evidence from belief',
        'A participant showing a paper reminder is evidence about that moment. Everyone paying for reminders remains an assumption.',
      ),
      beat(
        lesson('define-4'),
        'Connect situation and need',
        'Explain how scattered updates cause repeated checking because the current deadline is unclear. Keep remaining uncertainty in the brief.',
      ),
      beat(
        lesson('define-4'),
        'Write one focused job',
        'Describe the outcome: when a deadline changes, help the group identify the current date so they can plan their work.',
      ),
    ],
    ending:
      'The practice brief names a first user, a neutral interview plan, an evidence note, and a focused job.',
    nextQuestion: 'Could another group have the same symptom for a different reason?',
    glossary: ['persona', 'workaround', 'consent', 'insight', 'assumption'],
  },
  {
    id: 'mission-scope',
    collection: 'mission',
    missionId: 3,
    title: 'Mission 3: one current deadline',
    opening:
      'The team can build a board, a reminder, or another chat. Mali still needs one clear answer about the current assignment date.',
    stakes:
      'A large feature list can leave the critical task unfinished. The first scope must protect the promised outcome.',
    conversation: [
      { speaker: 'mali', text: 'I want to choose an assignment and read its current deadline.' },
      { speaker: 'noa', text: 'Someone also needs a way to update that deadline.' },
      { speaker: 'ken', text: 'Profile frames and a public feed can go on Later.' },
    ],
    beats: [
      beat(
        lesson('scope-1'),
        'Compare directions',
        'Consider more than one approach before choosing a working name and a specific value promise.',
      ),
      beat(
        lesson('scope-2'),
        'Protect one useful test',
        'The first deadline-board version needs the current deadline and a group leader’s update. Name the risky assumption and two exclusions.',
      ),
      beat(
        lesson('scope-3'),
        'Make trade-offs visible',
        'Sort features into Must have, Nice to have, and Later. Choose what you would cut first if time shrinks.',
      ),
      beat(
        lesson('scope-4'),
        'Trace the successful path',
        'Open the board, choose an assignment, read the current deadline, then decide what to work on next.',
      ),
      beat(
        lesson('scope-4'),
        'Include a way back',
        'Describe recovery if a step fails. Another screen is not the final outcome; a useful decision is.',
      ),
      beat(
        lesson('scope-4'),
        'Say the promise plainly',
        'Write one sentence connecting the first user, the deadline problem, and the focused solution.',
      ),
    ],
    ending:
      'The practice project has a small scope and one complete user journey. Extras remain recorded for later.',
    nextQuestion: 'Which part of this small journey carries the most uncertainty?',
    glossary: ['value', 'mvp', 'dependency', 'recovery'],
  },
  {
    id: 'mission-prototype',
    collection: 'mission',
    missionId: 4,
    title: 'Mission 4: three screens, one clear task',
    opening:
      'The deadline idea needs something a person could try. The team starts with three rough screens rather than a polished brand.',
    stakes:
      'A beautiful screen cannot reveal whether a task is understandable if its primary action does nothing.',
    conversation: [
      { speaker: 'ken', text: 'What question are these screens meant to answer?' },
      {
        speaker: 'mali',
        text: 'Can I change a deadline and know the group will see the new date?',
      },
      { speaker: 'noa', text: 'Use a clear Save deadline label. Explain any simulated parts.' },
    ],
    beats: [
      beat(
        lesson('prototype-1'),
        'Sketch at the right fidelity',
        'Plan three rough screens that answer one interaction question. Keep the status as planned until an artifact exists.',
      ),
      beat(
        lesson('prototype-2'),
        'Make labels predictable',
        'Save deadline describes an action and object more clearly than Proceed or Do the thing.',
      ),
      beat(
        lesson('prototype-2'),
        'Make mistakes recoverable',
        'Review readable contrast, large touch targets, useful error words, and a way to undo a mistaken action.',
      ),
      beat(
        lesson('prototype-3'),
        'Connect the task',
        'Record whether the prototype is paper, clickable, or coded, which task is testable, and which parts are transparently simulated.',
      ),
      beat(
        lesson('prototype-4'),
        'Prepare a neutral rehearsal',
        'Write a scenario about making the group see a changed date. Do not give away the exact button sequence.',
      ),
      beat(
        lesson('prototype-4'),
        'Record blockers honestly',
        'The rehearsal notebook can state what remains blocked. A written rehearsal plan is not a completed user session.',
      ),
    ],
    ending:
      'The practice notebook describes a prototype, its task, limitations, and a neutral rehearsal scenario.',
    nextQuestion: 'What behavior would show that the person understood the flow without coaching?',
    glossary: ['fidelity', 'contrast', 'recovery', 'hypothesis'],
  },
  {
    id: 'mission-validate',
    collection: 'mission',
    missionId: 5,
    title: 'Mission 5: decide before the result',
    opening:
      'The lesson example asks whether at least three of five target users can find the latest deadline without help in one minute.',
    stakes:
      'A team can redefine success after seeing a disappointing result. Choosing the decision rule first helps keep the learning honest.',
    conversation: [
      { speaker: 'noa', text: 'Write the threshold before collecting results.' },
      {
        speaker: 'mali',
        text: 'If I need help, record the help rather than calling it independent success.',
      },
      { speaker: 'ken', text: 'And if no test ran, “not run” is the right status.' },
    ],
    beats: [
      beat(
        lesson('validate-1'),
        'Make the hypothesis measurable',
        'Name the target group, behavior, time limit, and threshold. Decide what a failed result would change.',
      ),
      beat(
        lesson('validate-2'),
        'Plan observation without coaching',
        'Ask permission, let the participant think aloud, and note hesitation. The design is being examined, not the person’s ability.',
      ),
      beat(
        lesson('validate-2'),
        'Record the actual status',
        'Choose not run, practice, or real test accurately. This story uses curriculum examples and supplies no real participant results.',
      ),
      beat(
        lesson('validate-3'),
        'Use the original rule',
        'In the lesson’s hypothetical two-of-five result, the three-of-five threshold was missed. Do not round it up or infer that nobody wants the product.',
      ),
      beat(
        lesson('validate-3'),
        'Consider another explanation',
        'Separate observed difficulty from your interpretation, include sample limits, and name the next uncertainty.',
      ),
      beat(
        lesson('validate-4'),
        'Choose the next decision',
        'Continue, improve, pivot, or record not enough evidence. A useful need may survive even when the chosen delivery channel does not.',
      ),
    ],
    ending:
      'The practice project has a decision rule and an honest results or analysis plan. It is not marked validated just because the lessons are complete.',
    nextQuestion:
      'Which result would make you change the design, and which would make you change the direction?',
    glossary: ['hypothesis', 'threshold', 'evidence', 'pivot'],
  },
  {
    id: 'mission-business',
    collection: 'mission',
    missionId: 6,
    title: 'Mission 6: can the small idea last?',
    opening:
      'Paper notes, calendars, and familiar chats already compete with a deadline board. The team must understand why anyone would change.',
    stakes:
      'Usefulness alone does not provide data access, staff time, or a sustainable budget. A free community project still has costs.',
    conversation: [
      { speaker: 'ken', text: 'Our strongest alternative may be the chat everyone already knows.' },
      {
        speaker: 'mali',
        text: 'I might use the board, but someone else may decide whether to fund it.',
      },
      { speaker: 'noa', text: 'Label each cost estimate. A scenario is not actual revenue.' },
    ],
    beats: [
      beat(
        lesson('business-1'),
        'Map today’s alternatives',
        'Compare three current approaches, their strengths, and their gaps. Include doing nothing if that is a real alternative.',
      ),
      beat(
        lesson('business-2'),
        'Separate user and buyer',
        'Identify who experiences the task, who decides, and who pays or supports it. Keep a pricing idea labeled as a hypothesis.',
      ),
      beat(
        lesson('business-3'),
        'Use simple arithmetic',
        'The lesson’s 100 revenue minus 35 variable cost leaves 65 before fixed costs. It is contribution, not net profit.',
      ),
      beat(
        lesson('business-3'),
        'Stress the assumptions',
        'Consider higher usage, retries, support, and a zero-revenue budget. Record the source and uncertainty of estimates.',
      ),
      beat(
        lesson('business-4'),
        'Check real constraints',
        'List data access, permission, skills, time, and ongoing cost. Redesign if needed data cannot be shared appropriately.',
      ),
      beat(
        lesson('business-4'),
        'Choose the smallest feasibility question',
        'Record the approach, components, top dependency, and smallest way to investigate it before a full build.',
      ),
    ],
    ending:
      'The practice project has an alternatives map, a sustainability hypothesis, a cost scenario, and a feasibility plan.',
    nextQuestion: 'Which uncertain dependency could stop the core promise from working?',
    glossary: ['workaround', 'contribution', 'feasibility', 'dependency'],
  },
  {
    id: 'mission-build',
    collection: 'mission',
    missionId: 7,
    title: 'Mission 7: from edit to saved deadline',
    opening:
      'The team plans one complete deadline change, from entering a date to seeing the saved result after reopening.',
    stakes:
      'A working-looking screen can hide lost data. The project needs an accurate build status and verification record before a readiness claim.',
    conversation: [
      { speaker: 'mali', text: 'If the date disappears after restart, the core promise failed.' },
      { speaker: 'ken', text: 'Choose the simplest tool you can maintain, then finish one slice.' },
      {
        speaker: 'noa',
        text: 'Compiling is not proof that the user task works. Keep unverified behavior labeled.',
      },
    ],
    beats: [
      beat(
        lesson('build-1'),
        'Choose a fitting approach',
        'Explain why manual, no-code, or code fits the task and constraints. Separate presentation, trusted decisions, and storage.',
      ),
      beat(
        lesson('build-2'),
        'Define one complete slice',
        'Pick one edit-to-saved-result task instead of building many partial features.',
      ),
      beat(
        lesson('build-2'),
        'Write the true build status',
        'State planned, in progress, or working, and list what is and is not implemented. Generated code still needs understanding and behavioral verification.',
      ),
      beat(
        lesson('build-3'),
        'Make a failure reproducible',
        'For the lesson’s disappearing-deadline example, record exact steps, expected result, and actual result before choosing a fix.',
      ),
      beat(
        lesson('build-3'),
        'Keep verification separate',
        'Write a fix or next hypothesis and its verification status. Mark not tested until the changed behavior has actually been checked.',
      ),
      beat(
        lesson('build-4'),
        'Write a readiness note',
        'Record persistence, error recovery, limitations, and an outcome metric. If these are unverified, the release decision can be not ready.',
      ),
    ],
    ending:
      'The team now has a technical plan, an honest build status, and a clear readiness note in its practice notebook.',
    nextQuestion:
      'What evidence would let you change the readiness status from unknown to verified?',
    glossary: ['frontend', 'backend', 'database', 'slice', 'recovery', 'evidence'],
  },
  {
    id: 'mission-ship',
    collection: 'mission',
    missionId: 8,
    title: 'Mission 8: tell the next chapter honestly',
    opening:
      'The Deadline Board practice project has a focused story. The team prepares a small launch plan and an inspectable Project Pack.',
    stakes:
      'A plan, prototype, test, and public release are different states. The pitch must make the current state clear.',
    conversation: [
      {
        speaker: 'mali',
        text: 'Tell me the benefit I can experience today, not every feature on the roadmap.',
      },
      { speaker: 'ken', text: 'A pitch can say testing is pending and explain the next question.' },
      {
        speaker: 'noa',
        text: 'Finish the pack with what exists, what remains untested, and the next improvement.',
      },
    ],
    beats: [
      beat(
        lesson('ship-1'),
        'Start with a reachable audience',
        'Plan one group, one clear task, a support contact, and honest limitations. Record a live link only when the product is actually accessible.',
      ),
      beat(
        lesson('ship-2'),
        'Lead with the human need',
        'Introduce the user and problem, explain the evidence and learning, show the focused solution, and make a specific ask.',
      ),
      beat(
        lesson('ship-2'),
        'Give numbers their context',
        'The lesson’s five-person pitch example includes three completions and two difficulties. Use it as an example, not as your own test result.',
      ),
      beat(
        lesson('ship-3'),
        'Plan one distribution experiment',
        'Choose a relevant channel, permission where required, a truthful message, and the behavior to measure after someone sees it.',
      ),
      beat(
        lesson('ship-4'),
        'Make the pack inspectable',
        'Distinguish plans, existing prototypes, real tests, and shipped behavior. Completing the path does not automatically launch a product.',
      ),
      beat(
        lesson('ship-4'),
        'Write the next chapter',
        'Record what changed your mind, what remains untested, one improvement, and the next experiment. Verify organizer requirements if pursuing a competition.',
      ),
    ],
    ending:
      'The practice Project Pack explains the problem, scope, current artifact, evidence limits, and next step. The story ends with a plan the reader can inspect.',
    nextQuestion: 'What is the smallest next step that would give your project new evidence?',
    glossary: ['evidence', 'hypothesis', 'consent'],
  },
];

export function getStoryChapter(id: string): StoryChapter | undefined {
  return storyChapters.find((chapter) => chapter.id === id);
}

export function getStoryForContent(reference: StoryContentSelection): StoryChapter | undefined {
  return storyChapters.find((chapter) =>
    chapter.beats.some(({ ref }) => {
      if (reference.kind !== ref.kind) return false;
      if (reference.kind === 'adventure' && ref.kind === 'adventure')
        return reference.stageId === ref.stageId;
      if (reference.kind === 'challenge' && ref.kind === 'challenge')
        return reference.challengeId === ref.challengeId;
      return (
        reference.kind === 'lesson' && ref.kind === 'lesson' && reference.lessonId === ref.lessonId
      );
    }),
  );
}

export function getMissionStory(missionId: StoryMissionId): StoryChapter | undefined {
  return storyChapters.find((chapter) => chapter.missionId === missionId);
}
