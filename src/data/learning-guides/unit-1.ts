import type { UnitContent } from './types';

export const unit1Content: UnitContent = {
  unitId: 1,
  title: 'Discover',
  summary:
    'Start with something that goes wrong for a person. Learn what happened, what they did next, and which parts of your explanation still need evidence.',
  lessons: {
    'discover-1': {
      title: 'Name the struggle before the tool',
      goal: 'Describe who struggles, when it happens, and what goes wrong.',
      why: 'A reminder bot and a queue app are possible answers. Understanding the struggle first lets you choose an answer that actually fits.',
      steps: [
        'Compare the examples: a problem describes an unwanted experience; a solution describes something to make.',
        'Pick one situation you know or use the deadline practice scenario.',
        'Write the person, situation, and unwanted outcome in your project note. Label a fictional example “Practice scenario”.',
      ],
      success:
        'Your note names a person and a difficulty without choosing an app yet. It is a starting hypothesis, not a confirmed need.',
      hint: 'Try “When __, __ cannot __.” For example: “When assignment updates arrive in different places, students cannot tell which deadline is current.”',
      exerciseCopy: {
        'd1-a': {
          prompt: 'Which statement describes something going wrong for a person?',
          context: 'An AI assistant or a school app could help later. First, identify the experience it would need to improve.',
          explanation:
            'Missing deadlines because assignments are scattered describes a person’s difficulty and its situation. The assistant and the app are proposed solutions. We still need to learn whether scattered information causes those missed deadlines.',
          hint: 'Look for a person, something that goes wrong, and the situation around it.',
        },
        'd1-b': {
          prompt: 'Put each struggle under Problem and each proposed tool under Solution.',
          explanation:
            'Finding the correct assignment version and having time to eat are user problems. A reminder bot and a digital queue are tools we might build. Separating these leaves room to consider a simpler or better-fitting answer.',
          hint: '“Cannot” and “spend most of lunch waiting” describe experiences. A bot or digital queue describes a thing to make.',
        },
        'd1-c': {
          prompt: 'Before choosing a tool for a school problem, what should you do first?',
          explanation:
            'Observe a real person’s struggle so you can describe when it happens and what it prevents them from doing. A new technology or logo does not tell you whether the problem matters.',
          hint: 'Choose the action that helps you understand someone’s experience.',
        },
        'd1-d': {
          prompt: 'Write one problem you can investigate.',
          context: 'Use your own situation or the deadline practice scenario. If you have not observed it, say that it is a hypothesis or practice example.',
          explanation:
            'This note gives you something specific to investigate. “Students miss deadlines when updates are split between chat and paper” is more useful than “Build a school app”, but its cause still needs checking.',
          hint: 'Name who, when, and what goes wrong. Hypothesis (ข้อคาดการณ์ที่ต้องตรวจสอบ) means you have a possible explanation, not proof.',
        },
      },
    },
    'discover-2': {
      title: 'Write what happened, then what you think',
      goal: 'Record a visible action separately from your interpretation of it.',
      why: '“Three students checked two chats” gives someone else an event to examine. “Students are lazy” hides the event behind a judgment.',
      steps: [
        'Identify details that someone could see or record: actions, people, place, and time.',
        'Put noticing an event before describing its cost, comparing cases, and suggesting an idea.',
        'Write one observation note. Use “Practice scenario” if the event is fictional, and keep guesses about the cause separate.',
      ],
      success:
        'Your note says what happened and where or when. A reader can tell which details were observed and which are still guesses.',
      hint: 'Write “They opened two chat groups to find the deadline”, then separately “I wonder whether they knew which group had the latest update.”',
      exerciseCopy: {
        'd2-a': {
          prompt: 'Which note records an action rather than a judgment or prediction?',
          explanation:
            'Three students checking two chat groups is observable behavior. Calling them lazy guesses at their motivation. Saying everyone needs an app jumps from a small event to an untested solution.',
          hint: 'Observation (สิ่งที่สังเกตได้) describes what people did, not what you think they felt or needed.',
        },
        'd2-b': {
          prompt: 'Order the steps from noticing a struggle to suggesting an idea.',
          context: 'Imagine you see someone checking several places for a deadline. What should come before a proposed fix?',
          explanation:
            'Notice the event, describe what it costs the person, look for a pattern across more situations, then suggest an idea. One event tells you what to investigate; a pattern helps you judge whether it happens beyond that case.',
          hint: 'Start with the event. Put the idea last, after you have compared what happened.',
        },
        'd2-c': {
          prompt: 'Record one event without guessing the person’s motives.',
          context: 'Include where or when it happened and the actions you saw. A fictional example must begin with “Practice scenario:”.',
          explanation:
            'An observation note preserves the event for later questions. “Opened three tabs” describes behavior; “was confused” is an interpretation unless the person told you that. A labeled practice note teaches the method without claiming real research.',
          hint: 'Use this shape: “At __, I saw __ do __. What happened next was __.” If a detail is unknown, leave it unknown.',
        },
      },
    },
    'discover-3': {
      title: 'Find what the struggle costs',
      goal: 'Explain the consequence of a problem and how the person copes with it now.',
      why: 'A long queue becomes a meaningful problem when it costs someone eating time or makes them miss class. The consequence tells you what an improvement should protect.',
      steps: [
        'Choose a question about what happened after the struggle, rather than asking someone to approve an app.',
        'Look for frequency, the current workaround, and time, money, or effort lost.',
        'Write the cost and current workaround in your pain note. Mark any frequency or consequence you have not checked as unknown.',
      ],
      success:
        'Your note explains a concrete consequence and a current way of coping. It distinguishes known details from a pain hypothesis.',
      hint: 'Workaround (วิธีแก้ขัดที่ใช้อยู่) means what someone does today to get by, such as asking a friend for the latest deadline.',
      exerciseCopy: {
        'd3-a': {
          prompt: 'Which question helps you learn why waiting in the lunch queue mattered?',
          context: 'A student waited for lunch. You want to understand the consequence before choosing a feature.',
          explanation:
            '“What did you miss because you were waiting?” asks about the cost of that experience. A queue-app question or a color choice asks about your solution before you know what the student needs.',
          hint: 'Ask what the wait stopped them from doing.',
        },
        'd3-b': {
          prompt: 'Select all details that help you judge how much a problem matters to the person.',
          explanation:
            'Frequency tells you how often the struggle occurs. A workaround shows how someone already copes. Time, money, or effort shows its cost. An exciting app name tells you none of these.',
          hint: 'Select details about the person’s experience and current behavior.',
        },
        'd3-c': {
          prompt: 'Describe the cost of your problem and the current workaround.',
          context: 'Write what happens, what it costs, and how the person handles it now. You can use a labeled practice case. Do not fill gaps with invented numbers.',
          explanation:
            'The note connects the struggle to a consequence worth investigating. If you write “frequency unknown”, your next conversation can ask about another recent occurrence instead of treating a guess as evidence.',
          hint: 'Try “When __ happens, the person loses __. They cope by __. I still need to check __.”',
        },
      },
    },
    'discover-4': {
      title: 'Turn your guess into a discovery plan',
      goal: 'Choose a reachable person and a recent experience that could test your problem hypothesis.',
      why: 'You can learn this week from a specific person’s experience. A broad claim with nobody to ask gives you little to check.',
      steps: [
        'Choose a specific struggle among people you can reach this week.',
        'Write the assumption behind your problem, including what you do not know yet.',
        'Plan one conversation about the last time it happened. Ask permission to take notes and record actions, consequences, and surprises.',
      ],
      success:
        'Your project has a problem, an observation note, a pain hypothesis, and a next action with a person and a recent-event question. Completing the plan does not validate the problem.',
      hint: 'Start the plan with “I will speak with __ about the last time __.” Ask about an experience that could challenge your explanation as well as support it.',
      exerciseCopy: {
        'd4-a': {
          prompt: 'Which starting point lets you learn about the problem this week?',
          explanation:
            'A specific recurring struggle among reachable people gives you recent cases to investigate. A huge problem without access to users is difficult to study, and having no competitors does not prove a need.',
          hint: 'Choose a situation where you can ask someone what happened recently.',
        },
        'd4-b': {
          prompt: 'You have a problem idea but no concrete evidence yet. What is the strongest next step?',
          context: 'Your mentor asks, “How do you know this matters?” You can answer honestly while planning how to learn.',
          explanation:
            'Ask about recent experiences and examine the current workaround. Those details can reveal a need or challenge your idea. Friends saying “cool” and an AI label do not establish that the problem matters.',
          hint: 'Choose an action that can produce a specific example, not praise for the idea.',
        },
        'd4-c': {
          prompt: 'Write your assumption and one action to check it this week.',
          context: 'Keep both fields concrete: what you think happens, what remains unknown, and who you will ask about which recent event. A practice plan can use a fictional person if it is labeled.',
          explanation:
            'You now have a discovery plan. It tells you what to learn next without pretending the interview has already happened. Keep observations and reported experiences separate from your interpretation when you carry it out.',
          hint: 'Assumption (สิ่งที่คิดว่าเป็นจริงแต่ยังไม่ได้ตรวจสอบ): “I think __. I do not know __.” Next action: “I will ask __ about the last time __.”',
        },
      },
    },
  },
  practices: {
    'explore-last-time': {
      title: 'Find the event and its impact',
      goal: 'Find out why Mali missed yesterday’s shuttle and what happened afterward.',
      why: '“I missed the shuttle” is only the start of the story. The departure time and late arrival show what a travel improvement would need to address.',
      steps: [
        'Ask “What happened on your last shuttle trip?” to uncover the event.',
        'Ask “What was the impact on your lab?” to learn the consequence.',
        'Place An early departure under What happened and A missed lab under Why it mattered.',
      ],
      success:
        'Both revealed cards are in their matching destinations: the shuttle left five minutes before the poster time; Mali walked to another stop and arrived twenty minutes late for her lab. This is one authored practice journey, not a frequency estimate.',
      hint: 'Ask about the trip first. If the reply asks you to start with what happened, uncover the event before asking about its impact.',
      feedback: {
        event:
          'Expected: learn and place the early departure as the event. If the card is still hidden, ask about the last shuttle trip. If it is under Why it mattered, move it to What happened.',
        impact:
          'Expected: learn and place the late lab arrival as the impact. If you only have the departure, follow up about the effect on Mali’s lab; then place A missed lab under Why it mattered.',
      },
    },
    'explore-workaround': {
      title: 'Understand what already works',
      goal: 'Separate Noa’s current lost-item process from the part that is still difficult.',
      why: 'The box and notebook already keep items at the desk. A useful change should address slow searching without overlooking that working process.',
      steps: [
        'Ask “How do you handle lost items now?” to uncover the paper notebook.',
        'Ask “What is difficult about searching the handwritten pages?” to find the remaining friction.',
        'Place A paper notebook under Current workaround and No way to search under Remaining friction.',
      ],
      success:
        'The board separates the process from its weakness: Noa records the item and finder’s number, but different descriptions make the handwritten pages slow to search.',
      hint: 'Start with what Noa does now. “No way to search” names the search difficulty in the case; it does not mean the desk has no records.',
      feedback: {
        notebook:
          'Expected: A paper notebook belongs under Current workaround. If it is hidden, ask how Noa handles lost items now. If you put it under Remaining friction, move it: the notebook is the current process.',
        search:
          'Expected: No way to search belongs under Remaining friction. If it is hidden, first uncover the notebook, then ask about searching the pages. The friction is slow matching across different item descriptions.',
      },
    },
    'insight-observation': {
      title: 'Keep predictions out of the observation pile',
      goal: 'Separate the study-room events from two promises that the notes cannot support.',
      why: 'Waiting students and empty booked rooms suggest questions to investigate. They do not tell you whether students will pay or whether AI will prevent every no-show.',
      steps: [
        'Read each card’s detail and look for a recorded action or time.',
        'Place Three students waited and Two rooms stayed empty under Observed.',
        'Place Everyone will pay and AI will fix attendance under Assumed.',
      ],
      success:
        'All four cards are placed. The observed pile holds the ten-minute waiting note and thirty-minute empty-room note; the assumed pile holds payment and AI predictions. The activity does not establish why the rooms were empty.',
      hint: 'Evidence (หลักฐาน) here is the recorded practice event. A statement about what everyone will do or what a future system will guarantee still needs checking.',
      feedback: {
        wait:
          'Expected: Observed. The case records three students waiting during a ten-minute observation. If you placed it under Assumed, use the recorded action as the reason to move it.',
        empty:
          'Expected: Observed. Two booked rooms stayed empty for thirty minutes in the case. Their reason for being empty is still unknown.',
        pay:
          'Expected: Assumed. No payment behavior is recorded. If you placed it under Observed, separate the team’s prediction from what the room notes actually show.',
        ai:
          'Expected: Assumed. The claim promises that a proposed AI prediction will stop every no-show; there is no test result supporting that promise.',
      },
    },
  },
  stages: {
    explore: {
      title: 'Meet the people behind the lunch problem',
      goal: 'Collect four useful clues about deciding where to eat during a short break, while keeping a payment prediction separate.',
      why: 'Mali describes the wasted trip, Noa explains how the information gets old, and Ken explains what he needs before walking. Together, their accounts give you a problem to investigate rather than an app to sell.',
      steps: [
        'Use Meet Mali or tap the map to reach her. Ask about her last lunch break and who has difficulty choosing a queue; keep both clues.',
        'Follow the next task to Noa. Ask why the noticeboard gets out of date. Keep that clue, and keep the payment claim for checking when it appears.',
        'Meet Ken and ask what information helps him decide before walking. Keep Fresh information, then use Build the insight when the four useful clues are ready.',
      ],
      success:
        'You have visited Mali, Noa, and Ken and kept A wasted walk, A short lunch break, The board is old, and Fresh information from their replies. A tempting claim remains an assumption. These are simulated conversations, not interviews with real customers.',
      hint: 'After a useful reply, tap Keep this clue; asking alone does not save it. Use the guided question if your own question does not uncover the clue you need.',
      feedback: {
        'mali-problem':
          'Expected: A wasted walk kept from Mali’s reply. If the progress has not changed, ask about the last time she bought lunch, then tap Keep this clue. Yesterday’s long line made her leave without lunch.',
        'mali-person':
          'Expected: A short lunch break kept from Mali’s reply. If it is missing, ask who has the hardest time choosing a lunch queue. Her twelve-minute break describes the affected group in this story.',
        'noa-cause':
          'Expected: The board is old kept from Noa’s reply. If it is missing, ask why the noticeboard becomes out of date. The board is written at opening and lacks an update time or quick update process.',
        'noa-claim':
          'Expected: treat A tempting claim as an assumption to check. “Everybody would love a payment app” is Noa’s opinion without having asked them. Keeping it for checking does not make it one of the four useful queue clues.',
        'ken-need':
          'Expected: Fresh information kept from Ken’s reply. If the stage still asks for this clue, ask what information helps him decide whether the queue is worth the walk. He needs the queue report and when it was checked.',
      },
    },
  },
  bonusLesson: {
    id: 'pro-unit-1',
    missionId: 1,
    title: 'When the stories disagree',
    subtitle: 'Compare accounts without forcing them to fit your first guess.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-u1-clarify-conflict',
        type: 'choice',
        prompt: 'Sam says the checkout sheet was missing at pickup. You have a photo of it from earlier. What should you ask?',
        context: 'Practice case: a club lends sports equipment. Sam collected a racket yesterday. Your photo shows a sheet at the desk at 14:00; Sam arrived at 15:00. You did not watch that pickup.',
        options: [
          { id: 'clarify', text: 'At 15:00, where did you look and what did you do next?' },
          { id: 'dismiss', text: 'My photo proves the sheet was there, so you must be mistaken.' },
          { id: 'pitch', text: 'Would a checkout app solve all of this?' },
        ],
        correctAnswerIds: ['clarify'],
        explanation:
          'The accounts concern different times. Asking where Sam looked and what followed may explain the difference. A 14:00 photo does not establish what was available at 15:00, and an app pitch skips the missing detail.',
        hint: 'Clarify the time and sequence before deciding that either account is wrong.',
      },
      {
        id: 'pro-u1-source-of-note',
        type: 'categorize',
        prompt: 'Sort the notes by how you know them.',
        context: 'You took the 14:00 photo, but you were absent during Sam’s 15:00 pickup. Sam described the pickup afterward. All details belong to this fictional practice case.',
        items: [
          { id: 'photo', text: 'I photographed a checkout sheet on the desk at 14:00.' },
          { id: 'account', text: 'Sam said, “At 15:00 I checked both drawers and could not find the sheet.”' },
          { id: 'cause', text: 'The sheet must have gone missing because staff are careless.' },
          { id: 'demand', text: 'Every club member would pay for a checkout app.' },
        ],
        categories: [
          { id: 'direct', label: 'Directly observed' },
          { id: 'reported', label: 'Reported by someone' },
          { id: 'assumed', label: 'Assumed' },
        ],
        correctCategories: { photo: 'direct', account: 'reported', cause: 'assumed', demand: 'assumed' },
        explanation:
          'Your photo records what you saw at 14:00. Sam’s account is a reported experience worth following up, but you did not witness it. Staff carelessness and willingness to pay are interpretations or predictions with no supporting evidence here.',
        hint: 'A reported experience can be evidence. Keep its source visible instead of rewriting it as something you personally saw.',
      },
      {
        id: 'pro-u1-challenge-the-guess',
        type: 'multi',
        prompt: 'You guess that missing sheets cause every slow pickup. Which two cases would help challenge that explanation?',
        context: 'The club can introduce you to members who had different recent pickup experiences. Select cases that help you compare what changes.',
        options: [
          { id: 'slow-with-sheet', text: 'A slow pickup where the sheet was available' },
          { id: 'quick-without-sheet', text: 'A quick pickup where no sheet was available' },
          { id: 'praise', text: 'A friend who likes your proposed app but has never borrowed equipment' },
          { id: 'logo', text: 'A member who wants to help choose the app logo' },
        ],
        correctAnswerIds: ['slow-with-sheet', 'quick-without-sheet'],
        explanation:
          'A slow pickup with the sheet challenges the claim that a missing sheet explains every delay. A quick pickup without it may reveal another workable process. Neither case proves the whole cause, but both can make your explanation more accurate.',
        hint: 'Look for recent cases that your current explanation does not predict well.',
      },
      {
        id: 'pro-u1-compare-accounts',
        type: 'sort',
        prompt: 'Order this investigation so the conclusion follows the details.',
        context: 'You will compare Sam’s slow pickup with another member’s smooth pickup. Both accounts need the same kinds of questions.',
        items: [
          { id: 'question', text: 'Ask each person to walk through their most recent pickup.' },
          { id: 'notes', text: 'Record each sequence, time, workaround, and source of the account.' },
          { id: 'compare', text: 'Compare where the sequences differ and mark any missing details.' },
          { id: 'revise', text: 'Revise your explanation and choose one remaining question to check.' },
        ],
        correctOrder: ['question', 'notes', 'compare', 'revise'],
        explanation:
          'Use comparable questions, preserve the details of each account, then compare them. Revise the explanation after that comparison. You may discover that the delay involves locating equipment or reaching staff, not only finding a sheet.',
        hint: 'Collect both accounts before comparing them; compare before revising your explanation.',
      },
    ],
  },
};
