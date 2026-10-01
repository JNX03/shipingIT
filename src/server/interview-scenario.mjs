export default {
  "npcs": [
    {
      "id": "mali",
      "name": "Mali",
      "role": "Student",
      "location": "Courtyard",
      "position": {
        "x": 0.27,
        "y": 0.66
      },
      "greeting": "Hi! I have twelve minutes before class. I’m deciding whether I can get lunch.",
      "prompts": [
        "Tell me about the last time you bought lunch.",
        "Who has the hardest time choosing a lunch queue?"
      ],
      "evidenceIds": [
        "mali-person",
        "mali-problem"
      ]
    },
    {
      "id": "noa",
      "name": "Noa",
      "role": "Canteen staff",
      "location": "Food stall",
      "position": {
        "x": 0.72,
        "y": 0.32
      },
      "greeting": "Hello! I look after this stall. What would you like to find out about the lunch rush?",
      "prompts": [
        "How do people find out when the queue changes?",
        "Why does the noticeboard become out of date?"
      ],
      "evidenceIds": [
        "noa-cause",
        "noa-claim"
      ]
    },
    {
      "id": "ken",
      "name": "Ken",
      "role": "Student athlete",
      "location": "Sports path",
      "position": {
        "x": 0.78,
        "y": 0.73
      },
      "greeting": "Hey! I’m heading to practice. I need to decide where to eat before walking across campus.",
      "prompts": [
        "How do you decide whether a queue is worth the walk?",
        "What information would help you make that decision?"
      ],
      "evidenceIds": [
        "ken-need"
      ]
    }
  ],
  "evidence": [
    {
      "id": "mali-person",
      "npcId": "mali",
      "title": "A short lunch break",
      "quote": "My class break is twelve minutes. Other students in my timetable have the same problem.",
      "meaning": "Students with short breaks between classes",
      "slot": "person",
      "kind": "observation"
    },
    {
      "id": "mali-problem",
      "npcId": "mali",
      "title": "A wasted walk",
      "quote": "Yesterday I walked to the noodle stall. The line was much longer than I expected, so I left without lunch.",
      "meaning": "Cannot judge the queue before walking to the stall",
      "slot": "problem",
      "kind": "observation"
    },
    {
      "id": "noa-cause",
      "npcId": "noa",
      "title": "The board is old",
      "quote": "We write the queue on the board at opening. It changes during lunch, but the board has no time or quick way to update it.",
      "meaning": "Queue information becomes stale and has no update time",
      "slot": "cause",
      "kind": "observation"
    },
    {
      "id": "ken-need",
      "npcId": "ken",
      "title": "Fresh information",
      "quote": "I need to see the queue and when someone checked it. A prediction alone would not tell me if it is still true.",
      "meaning": "A recent queue report with a visible update time",
      "slot": "need",
      "kind": "observation"
    },
    {
      "id": "noa-claim",
      "npcId": "noa",
      "title": "A tempting claim",
      "quote": "Everybody would love a payment app. Well… I haven’t actually asked them.",
      "meaning": "An opinion about payments, not evidence of the queue problem",
      "slot": null,
      "kind": "claim"
    }
  ]
};

/** Fictional challenge facts mirrored from the authored game catalog; IDs are challenge item IDs. */
export const challengeScenarios = {
  'explore-last-time': {
    npcId: 'mali',
    role: 'student who missed the campus shuttle',
    opening:
      'I missed the shuttle yesterday. I do not need another app that promises perfect travel.',
    evidence: [
      {
        id: 'event',
        fact: 'Yesterday the shuttle left five minutes before the time on the poster.',
      },
      {
        id: 'impact',
        fact: 'I walked to the next stop and arrived twenty minutes late for my lab.',
      },
    ],
  },
  'explore-workaround': {
    npcId: 'noa',
    role: 'staff member at the campus lost-and-found desk',
    opening: 'I run the campus lost-and-found desk. We already have a box and a notebook.',
    evidence: [
      {
        id: 'notebook',
        fact: 'I write the item and the finder’s number in a paper notebook, then keep the item here.',
      },
      {
        id: 'search',
        fact: 'Students describe items differently. Searching the handwritten pages takes ages.',
      },
    ],
  },
  'explore-library-handoff': {
    npcId: 'mali',
    role: 'student trying to borrow a library book',
    opening:
      'I tried to borrow River Atlas yesterday. The catalog said one copy was available, but I came back empty-handed.',
    evidence: [
      {
        id: 'catalog-claim',
        fact: 'At 15:20 the catalog showed one River Atlas copy. At the desk, staff said that copy was on the return cart and not ready to borrow.',
      },
      {
        id: 'wasted-walk',
        fact: 'After a nine-minute walk, I had no book to take home. I wrote the title on paper and left to catch my bus.',
      },
      {
        id: 'handoff-question',
        fact: 'I do not know how quickly staff can update a returned copy or a hold. Ask the desk about that handoff before promising live availability.',
      },
    ],
  },
  'explore-club-room': {
    npcId: 'ken',
    role: 'astronomy club member following a room change',
    opening:
      'Tuesday astronomy club starts at 18:00. I followed the poster to B14, but the club had moved.',
    evidence: [
      {
        id: 'room-change',
        fact: 'Last Tuesday the organizer changed the room from B14 to B16 at 17:40. The paper poster at the stairs still showed B14.',
      },
      {
        id: 'missed-start',
        fact: 'After finding B14 empty, I checked the chat and walked to B16. I missed the first six minutes of the meeting.',
      },
      {
        id: 'reminder-question',
        fact: 'I do not know how many members silence reminders. Check their preferences; my missed meeting cannot prove that everyone wants alerts.',
      },
    ],
  },
};
