import type { UnitContent } from './types';

export const unit6Content: UnitContent = {
  unitId: 6,
  title: 'Make the value last',
  summary:
    'Compare the tools people already use, separate users from funders, and check money, time, and access before promising a bigger product.',
  lessons: {
    'business-1': {
      title: 'Give someone a reason to switch',
      goal: 'Compare three current alternatives and name one useful difference for your user.',
      why: 'A familiar chat or notebook may already do the job well enough. Your idea needs a benefit that makes changing habits worthwhile.',
      steps: [
        'Think of the last time the task happened. Identify what the person used, including a manual workaround.',
        'For three alternatives, write what works and where the task still breaks down.',
        'In the project field, describe one difference that improves the outcome for your specific user.',
      ],
      success:
        'Your comparison names three alternatives, their useful parts, and a specific gap your idea could address.',
      hint: 'Workaround (วิธีแก้ขัด) means how someone handles the problem today. Include it even if it is free.',
      exerciseCopy: {
        'b1-a': {
          prompt:
            'A student already plans schoolwork somehow. Which alternatives must a new planning tool compete with?',
          context: 'Compare ways to get the task done, not just products that look like your app.',
          explanation:
            'Chat groups, paper notes, calendars, and accepting a missed task are all alternatives. Adding AI does not remove these existing choices.',
          hint: 'What would the student do if your tool did not exist?',
        },
        'b1-b': {
          prompt:
            'Which difference gives a specific group a useful reason to leave its current tool?',
          context: 'A meaningful difference changes the user’s result, effort, or cost.',
          explanation:
            'Solving a costly task more simply gives the user a benefit to compare. A new logo or more technologies alone does not explain why switching is worthwhile.',
          hint: 'Picture someone using it. What becomes easier or less costly?',
        },
        'b1-c': {
          prompt: 'Compare three ways your target user handles the task today.',
          context:
            'For each alternative, name a strength and a gap. Finish with your proposed difference. If you have not checked actual behavior, label these as alternatives to investigate.',
          explanation:
            'A fair comparison includes the strongest current option. If it already solves the task well, investigate another gap before building. Writing this map does not prove demand.',
          hint: 'For a deadline task, consider a calendar, a class chat, and paper notes. Use examples that fit your own project.',
        },
      },
    },
    'business-2': {
      title: 'Connect value to someone who can fund it',
      goal: 'Name the user, the funding decision maker, the benefit, and the main costs.',
      why: 'The person who benefits may not control the budget. A free tool also needs someone to cover time, hosting, and support.',
      steps: [
        'Identify who uses the product and who decides whether to pay or provide support.',
        'Explain what each person gains and what they currently spend money or time on.',
        'Write a possible funding model, label the price as a hypothesis, and list major costs.',
      ],
      success:
        'Your model connects a specific benefit to a possible source of support and labels untested price assumptions.',
      hint: 'Buyer (ผู้ตัดสินใจซื้อ) and user (ผู้ใช้) can be different people. School support can fund a free student tool.',
      exerciseCopy: {
        'b2-a': {
          prompt:
            'Students use the tool and schools buy it. Whose needs should you understand before choosing a business model?',
          context:
            'Students know the daily task. Schools know the purchasing decision and budget constraints.',
          explanation:
            'Learn from both. A school can approve spending on a tool students cannot use, or students can like a tool no school can afford. Neither group alone answers both questions.',
          hint: 'One group experiences the task; another approves the expense.',
        },
        'b2-b': {
          prompt: 'Before setting a price, which evidence is the most useful starting point?',
          context:
            'You are learning how a buyer values this task. You have not yet established what they will purchase.',
          explanation:
            'Current spending, budget, and the value of solving the problem help form a price hypothesis. A conversation is useful evidence about context; it is not an actual purchase.',
          hint: 'Look for money already spent and decisions already made.',
        },
        'b2-c': {
          prompt: 'Sketch how your project could keep serving people.',
          context:
            'Write the user, buyer or supporter, benefit, possible funding model, price hypothesis, and main costs. For a free project, name the budget, grant, school support, or volunteer time it would need.',
          explanation:
            'A business model explains how the work can continue. Keep possible funding separate from confirmed support, and do not write that buyers agreed unless that actually happened.',
          hint: 'Who saves time or money? Who could approve support? What must someone keep paying for or doing?',
        },
      },
    },
    'business-3': {
      title: 'Check what is left after serving a user',
      goal: 'Calculate contribution and show how usage could change your costs.',
      why: 'Revenue is not profit. More activity can mean more API requests, retries, and support work, so a growing product can still run out of money.',
      steps: [
        'Subtract the cost of serving one customer from that customer’s revenue.',
        'List fixed costs separately and consider what happens when activity doubles.',
        'Keep your earlier user and buyer model in the project field, then add a labeled cost scenario.',
      ],
      success:
        'Your scenario separates contribution from fixed costs and identifies an uncertainty that could change the result.',
      hint: 'Contribution (เงินเหลือก่อนหักต้นทุนคงที่) = revenue minus variable cost. Fixed costs still need to be covered.',
      exerciseCopy: {
        'b3-a': {
          prompt:
            'In this example, each customer brings in 100 per month and costs 35 to serve. What remains before fixed costs?',
          context:
            'The two numbers use the same currency and monthly period. Rent and base subscriptions have not been deducted.',
          explanation:
            '100 − 35 = 65 per customer. This is contribution toward fixed costs. It becomes profit only after all relevant costs are deducted.',
          hint: 'Subtract 35 from 100. Do not add the cost to revenue.',
        },
        'b3-b': {
          prompt:
            'As people use an AI app more often, which costs should you include in the estimate?',
          context:
            'Consider repeated actions, including failed requests that need a retry and questions that need support.',
          explanation:
            'API requests, retries, and support can consume money or staff time with each use. Estimate a range and an activity limit rather than assuming more users automatically means more profit.',
          hint: 'What gets used up each time the app handles a request?',
        },
        'b3-c': {
          prompt: 'Add a cost scenario to your existing business model.',
          context:
            'This field also holds your earlier user and buyer model: keep that text. Add revenue per user, variable cost, contribution, monthly fixed costs, and a doubled-usage scenario. Label numbers as estimates and note their sources.',
          explanation:
            'Subtract variable cost before considering fixed costs. If revenue is zero, calculate the support or budget required. A scenario helps expose risks; it is not recorded revenue or a sales forecast.',
          hint: 'More requests by the same users can increase cost without increasing revenue. What limit would keep that manageable?',
        },
      },
    },
    'business-4': {
      title: 'Find the dependency that could stop the promise',
      goal: 'Write a practical delivery plan and a small test of its most uncertain dependency.',
      why: 'A useful idea cannot deliver if required data is unavailable, nobody maintains it, or the team cannot afford the ongoing work.',
      steps: [
        'Check needed data and permission, skills, available time, and operating cost.',
        'Choose a manual, no-code, or coded approach that can meet those constraints.',
        'Write the main components, biggest risk, and smallest feasibility test; label the test as planned until it runs.',
      ],
      success:
        'Your plan names a real constraint, an appropriate approach, and a check that could show the approach cannot work.',
      hint: 'Feasibility (ความเป็นไปได้ในการทำจริง) asks whether you can deliver. Test the uncertain dependency before polishing the screen.',
      exerciseCopy: {
        'b4-a': {
          prompt: 'Select every constraint you must check before relying on this product to work.',
          context: 'Include technical access, people, responsible data use, and ongoing resources.',
          explanation:
            'Data access, skills and time, consent and privacy, and operating cost all affect delivery. Assuming users never make mistakes is not a constraint check; the design needs a way to handle mistakes.',
          hint: 'Select four real resource or access checks. Leave out the perfect-user assumption.',
        },
        'b4-b': {
          prompt:
            'Your plan needs student records, but the school cannot share them. What is a workable next step?',
          context:
            'Treat unavailable data as a design constraint before spending time on the integration.',
          explanation:
            'Use information people can provide with permission, minimize what is needed, or choose another approach. Secret collection and a pretend integration do not solve the access problem.',
          hint: 'Change the approach to fit the data you can actually use.',
        },
        'b4-c': {
          prompt: 'Plan the smallest check that could reveal whether your approach can work.',
          context:
            'Write your approach, needed data, access or permission, main components, top risk, and smallest feasibility test. For example, check who can update a record before depending on automatic updates.',
          explanation:
            'A feasibility plan makes a dependency testable. Writing the plan does not mean access is granted or the build works. Record what you still need to check before committing to the full version.',
          hint: 'Ask: if this dependency fails, can the user still complete the core task?',
        },
      },
    },
  },
  practices: {
    'insight-club-evidence': {
      title: 'Choose what the room-change story supports',
      goal: 'Sort six cards into Case evidence, Assumption, or Open question.',
      why: 'Ken lost six minutes after following an old poster. That supports a problem with current information; it does not prove everyone reads chat or that reminders prevent every miss.',
      steps: [
        'Read each card in this authored Club case. Use Prev and Next to inspect all six.',
        'Drag a card to its category, or select it and tap the destination.',
        'Check that two events, two predictions, and two unanswered questions are separated before finishing.',
      ],
      success:
        'The room change and Ken’s delay are case evidence; universal claims are assumptions; reminder preferences and update ownership remain open questions.',
      hint: 'Assumption (ข้อสมมติ) predicts something without checking it. An open question names information you still need.',
      feedback: {
        'Room changed at 17:40: try a different destination.':
          'The case states this event happened. Move it to Case evidence; it does not predict future behavior.',
        'Ken missed six minutes: try a different destination.':
          'This is the effect described in the case. Move it to Case evidence, without treating one case as measured demand.',
        'All members read the chat: try a different destination.':
          '“All” goes beyond what happened to Ken. Move this unverified claim to Assumption.',
        'Alerts prevent every miss: try a different destination.':
          'A proposed reminder has not been shown to prevent every miss. Move this prediction to Assumption.',
        'Who silences reminders?: try a different destination.':
          'Preferences and quiet hours have not been checked. Move the card to Open question.',
        'Who posts a cancellation?: try a different destination.':
          'The backup updater is not known. Move the card to Open question; the app still needs someone to maintain its information.',
        'This version works. Ready to keep it.':
          'All six cards match their categories. You have organized this practice case; you have not established willingness to pay or reminder effectiveness.',
      },
    },
    'scope-library-hold': {
      title: 'Spend seven points on a complete library handoff',
      goal: 'Pack title search, staff copy status, a hold until 16:00, and a checked-at time within seven points.',
      why: 'Finding a title is not enough to promise pickup. A hold depends on a copy being ready, and staff must maintain that state. The desk’s role and deadline are practice constraints.',
      steps: [
        'Use Prev and Next to read each feature’s cost and dependency. Tap or drag a feature into the tray.',
        'Pack the path from Title search to Staff copy status to Hold until 16:00, plus Checked-at time.',
        'Return recommendations and the extra pickup alert to the shelf; the four required features use 2 + 2 + 2 + 1 = 7 points.',
      ],
      success:
        'The tray uses 7/7 points and includes every required feature and dependency. This checks the feature plan, not a working reservation system.',
      hint: 'A dependency (สิ่งที่ต้องมีก่อน) supports another feature. A hold needs staff copy status; recommendations cannot replace it.',
      feedback: {
        'Staff copy status needs Title search.':
          'You packed status without the title it belongs to. Add Title search so staff can update the selected copy.',
        'Hold until 16:00 needs Staff copy status.':
          'A hold cannot be based on a title alone. Add Staff copy status to distinguish a ready copy from one on the return cart.',
        'Checked-at time needs Staff copy status.':
          'The timestamp needs a copy state to describe. Add Staff copy status; a time alone does not say whether pickup is possible.',
        'Reading recommendations needs Title search.':
          'Recommendations need a title, but they do not complete the pickup task. Return them and use the budget for the required handoff.',
        'Pickup alert needs Hold until 16:00.':
          'A pickup alert needs a saved hold. In this seven-point version, return the extra alert and complete the four required features first.',
        'The first version needs title search.':
          'The learner needs to find River Atlas before checking its copy. Pack Title search.',
        'The first version needs staff copy status.':
          'The current tray cannot distinguish ready, returned, and already held copies. Pack Staff copy status.',
        'The first version needs hold until 16:00.':
          'The tray does not yet include a saved hold and pickup deadline. Pack Hold until 16:00.',
        'The first version needs checked-at time.':
          'The copy state has no freshness cue. Pack Checked-at time so the user can see when staff checked it.',
        '8/7 points. Return an extra feature.':
          'You are one point over. Keep the four required features and return optional recommendations or the pickup alert.',
        '9/7 points. Return an extra feature.':
          'You are two points over. The required loop already uses seven; return the optional pickup alert or recommendations.',
        '10/7 points. Return an extra feature.':
          'You are three points over. Reading recommendations cost three points and do not make the copy ready to borrow.',
        '11/7 points. Return an extra feature.':
          'You are four points over. Return optional features, then check that every required part of the hold loop is still packed.',
        '12/7 points. Return an extra feature.':
          'All six features cost twelve. Return Reading recommendations and Pickup alert to keep the complete seven-point hold loop.',
        'This version works. Ready to keep it.':
          'The four required features fit in seven points. The plan depends on staff maintaining copy status; this puzzle has not tested that real handoff.',
      },
    },
    'scope-club-update': {
      title: 'Keep the meeting current before adding more features',
      goal: 'Fit current event details, organizer updates, an updated-at time, and member reminder control into seven points.',
      why: 'Members need the current room and cancellation status. A new chat or location map adds work without replacing the organizer who keeps those facts current.',
      steps: [
        'Read the shelf cards and their costs. Tap or drag the four required features into the tray.',
        'Check the dependencies: organizer updates need event details; the timestamp needs organizer updates; reminders need event details.',
        'Leave Group chat and Member location map on the shelf. The required version costs 2 + 2 + 1 + 2 = 7 points.',
      ],
      success:
        'The tray uses 7/7 points with a complete update chain and a reminder members can choose. The organizer’s ongoing work is still part of the plan.',
      hint: 'A reminder points to an event; it cannot make an old room correct. Fund or assign the update work before adding extras.',
      feedback: {
        'Organizer update needs Current event details.':
          'The organizer needs an event to change. Pack Current event details before relying on Organizer update.',
        'Updated-at time needs Organizer update.':
          'A timestamp must describe an actual update path. Pack Organizer update so the current tray can maintain meeting facts.',
        'Member reminder control needs Current event details.':
          'A reminder needs the current event to refer to. Pack Current event details; an alert alone cannot correct the room.',
        'Member location map needs Current event details.':
          'The map needs event details, but tracking members is outside this version’s task. Return it and complete the update loop.',
        'The first version needs current event details.':
          'The tray has no complete time, room, and cancellation information. Pack Current event details.',
        'The first version needs organizer update.':
          'The tray cannot keep a room change or cancellation current. Pack Organizer update.',
        'The first version needs updated-at time.':
          'Members cannot see when the information changed. Pack Updated-at time.',
        'The first version needs member reminder control.':
          'The required version lets members choose or clear a reminder. Pack Member reminder control.',
        '8/7 points. Return an extra feature.':
          'You are one point over. Return Group chat or Member location map, then restore any missing required feature.',
        '9/7 points. Return an extra feature.':
          'You are two points over. Spend seven on the complete event and update loop before adding chat or tracking.',
        '10/7 points. Return an extra feature.':
          'You are three points over. Group chat costs three and does not replace current event details.',
        '11/7 points. Return an extra feature.':
          'You are four points over. Return the four-point Member location map; the meeting can work without tracking members.',
        '12/7 points. Return an extra feature.':
          'You are five points over. Return optional features and check the four required cards rather than cutting the updater.',
        '13/7 points. Return an extra feature.':
          'You are six points over. Keep the required event, update, timestamp, and reminder cards; return chat and the map.',
        '14/7 points. Return an extra feature.':
          'All six features cost fourteen. Return Group chat and Member location map to leave the complete seven-point version.',
        'This version works. Ready to keep it.':
          'The required update loop fits in seven points. This checks your scope; it does not prove members will enable reminders or that the organizer will always update on time.',
      },
    },
  },
  stages: {},
  bonusLesson: {
    id: 'pro-unit-6',
    missionId: 6,
    title: 'Keep a community tool running',
    subtitle: 'Plan for limited volunteer time and the end of a sponsor grant.',
    xp: 20,
    minutes: 4,
    nodeType: 'quiz',
    exercises: [
      {
        id: 'pro-unit-6-costs',
        type: 'categorize',
        prompt: 'Separate the costs you must keep covering from setup work and unconfirmed income.',
        context:
          'Fictional planning case: a sponsor covers this month only. The team is considering a paid club service for next month.',
        items: [
          { id: 'hosting', text: 'Hosting costs 200 every month.' },
          { id: 'checks', text: 'An organizer must check room changes every week.' },
          { id: 'setup', text: 'Importing the initial event list takes three hours once.' },
          {
            id: 'renewal',
            text: 'The team hopes two clubs will pay next month; neither has agreed.',
          },
        ],
        categories: [
          { id: 'ongoing', label: 'Ongoing cost or work' },
          { id: 'once', label: 'One-time setup' },
          { id: 'unknown-income', label: 'Unconfirmed income' },
        ],
        correctCategories: {
          hosting: 'ongoing',
          checks: 'ongoing',
          setup: 'once',
          renewal: 'unknown-income',
        },
        explanation:
          'Hosting and checking updates recur even after setup ends. Import work is one-time in this case. Hoped-for renewals cannot be counted as money available to pay next month’s bills.',
        hint: 'Recurring (เกิดซ้ำ) work needs someone every week or month. A hoped-for payment is still uncertain.',
      },
      {
        id: 'pro-unit-6-break-even',
        type: 'choice',
        prompt: 'If exactly two clubs pay, how much is left after these monthly cash costs?',
        context:
          'Planning numbers: each club pays 150 per month and costs 50 to serve. Fixed hosting costs 200 per month. Volunteer labor is not priced in this calculation.',
        options: [
          { id: 'zero', text: '0: these cash costs are just covered.' },
          { id: 'one-hundred', text: '100: one club’s contribution is the final profit.' },
          { id: 'three-hundred', text: '300: all revenue is available to spend.' },
        ],
        correctAnswerIds: ['zero'],
        explanation:
          'Two clubs bring in 300 and cost 100 to serve. The remaining 200 covers hosting, leaving 0. This is cash break-even for the listed costs, not a cushion for surprises or payment for volunteer time.',
        hint: 'Break-even (จุดคุ้มทุน) here means revenue equals the listed cash costs. Calculate 2 × (150 − 50) − 200.',
      },
      {
        id: 'pro-unit-6-capacity',
        type: 'multi',
        prompt:
          'Choose both actions that keep the proposed service within the team’s actual capacity.',
        context:
          'A volunteer has 40 minutes a week. Each update check is estimated to take 5 minutes. Clubs request 12 checks. Funding alone does not create more volunteer time.',
        options: [
          {
            id: 'cap',
            text: 'Offer at most eight checks for now and explain which requests must wait.',
          },
          {
            id: 'measure',
            text: 'Time real checks, including corrections, before increasing the limit.',
          },
          {
            id: 'money-fixes-time',
            text: 'Accept all twelve because a paid service has unlimited capacity.',
          },
          {
            id: 'hide-delay',
            text: 'Promise same-day checks for all twelve and hide the overflow.',
          },
        ],
        correctAnswerIds: ['cap', 'measure'],
        explanation:
          '40 ÷ 5 allows eight checks under the estimate; twelve would need 60 minutes. A clear cap protects the promise. Measuring the work may reveal that even eight is too many when corrections are included.',
        hint: 'Capacity (กำลังรองรับงาน) depends on available time as well as money. Select a limit and a way to check the estimate.',
      },
      {
        id: 'pro-unit-6-renewal-plan',
        type: 'sort',
        prompt: 'Order the planning steps before expanding a service whose sponsor funding ends.',
        context:
          'Determine costs before setting an offer. A funding decision maker needs that offer before deciding. Expansion comes after you compare the recorded commitments with what delivery needs.',
        items: [
          {
            id: 'compare',
            text: 'Compare recorded funding commitments and workload with costs before expanding.',
          },
          {
            id: 'offer',
            text: 'Write a capped service offer with price, responsibilities, and renewal terms.',
          },
          {
            id: 'cost',
            text: 'Estimate the ongoing money and volunteer time needed without the sponsor.',
          },
          {
            id: 'decision',
            text: 'Ask the person who controls the budget to decide on that specific offer.',
          },
        ],
        correctOrder: ['cost', 'offer', 'decision', 'compare'],
        explanation:
          'Costs inform the terms; the terms make the funding decision concrete; recorded commitments then support a delivery decision. A proposal or encouraging reply still does not equal a received payment.',
        hint: 'First learn what continuation needs. Last decide whether commitments and capacity support expansion.',
      },
    ],
  },
};
