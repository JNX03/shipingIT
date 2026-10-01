import type {
  Exercise,
  ExerciseOption,
  Lesson,
  Mission,
  NodeType,
  ProjectField,
  ProjectInputField,
  WorldId,
} from '../domain/types';
import { getBonusLesson, learningGuideIndex } from './learning-guides';

const options = (texts: string[]): ExerciseOption[] =>
  texts.map((text, index) => ({ id: String(index), text }));
function choice(
  id: string,
  prompt: string,
  texts: string[],
  correct: number,
  explanation: string,
  hint: string,
  context?: string,
): Exercise {
  return {
    id,
    type: 'choice',
    prompt,
    options: options(texts),
    correctAnswerIds: [String(correct)],
    explanation,
    hint,
    context,
  };
}
function multi(
  id: string,
  prompt: string,
  texts: string[],
  correct: number[],
  explanation: string,
  hint: string,
): Exercise {
  return {
    id,
    type: 'multi',
    prompt,
    options: options(texts),
    correctAnswerIds: correct.map(String),
    explanation,
    hint,
  };
}
function sort(
  id: string,
  prompt: string,
  texts: string[],
  correct: number[],
  explanation: string,
  hint: string,
): Exercise {
  return {
    id,
    type: 'sort',
    prompt,
    items: options(texts),
    correctOrder: correct.map(String),
    explanation,
    hint,
  };
}
function categorize(
  id: string,
  prompt: string,
  texts: string[],
  labels: string[],
  assignments: number[],
  explanation: string,
  hint: string,
): Exercise {
  return {
    id,
    type: 'categorize',
    prompt,
    items: options(texts),
    categories: labels.map((label, index) => ({ id: String(index), label })),
    correctCategories: Object.fromEntries(
      assignments.map((category, index) => [String(index), String(category)]),
    ),
    explanation,
    hint,
  };
}
function field(
  key: ProjectField,
  label: string,
  placeholder: string,
  minLength = 20,
  help?: string,
): ProjectInputField {
  return { key, label, placeholder, minLength, help };
}
function project(
  id: string,
  prompt: string,
  fields: ProjectInputField[],
  explanation: string,
  hint: string,
): Exercise {
  return { id, type: 'project', prompt, fields, explanation, hint };
}
function lesson(
  id: string,
  missionId: number,
  title: string,
  subtitle: string,
  nodeType: NodeType,
  exercises: Exercise[],
  minutes = 4,
): Lesson {
  return {
    id,
    missionId,
    title,
    subtitle,
    nodeType,
    exercises,
    minutes,
    xp: nodeType === 'boss' ? 40 : nodeType === 'project' || nodeType === 'experiment' ? 30 : 20,
  };
}

const authoredLessons: Lesson[] = [
  lesson(
    'discover-1',
    1,
    'Start with a problem',
    'Notice the need before choosing the tool.',
    'lesson',
    [
      choice(
        'd1-a',
        'Which one is a problem?',
        [
          'Build an AI homework assistant.',
          'Students miss deadlines because assignments are scattered across different places.',
          'Create a new school app.',
        ],
        1,
        'A problem describes an unwanted situation for a person. An app or AI assistant is one possible solution, and we have not tested whether it helps yet.',
        'Look for a person, a situation, and something that goes wrong.',
      ),
      categorize(
        'd1-b',
        'Separate problems from solutions.',
        [
          'A reminder bot for schoolwork',
          'Students cannot find the correct assignment version',
          'A digital queue for lunch',
          'Students spend most of lunch waiting',
        ],
        ['Problem', 'Solution'],
        [1, 0, 1, 0],
        'Problems describe friction in someone’s life. Solutions describe things we could make. Keeping them separate leaves room for better ideas.',
        'Ask: does this describe a struggle, or a thing to build?',
      ),
      choice(
        'd1-c',
        'What should an innovator do first?',
        [
          'Pick the newest technology.',
          'Observe when and why a real person struggles.',
          'Design a logo.',
        ],
        1,
        'Innovation begins with understanding. A small, well-understood need is a stronger starting point than a fashionable tool.',
        'Understand the experience before designing the answer.',
      ),
      project(
        'd1-d',
        'Find your first problem.',
        [
          field(
            'problem',
            'What goes wrong for someone?',
            'Example: Students miss assignment deadlines when updates are split between group chats and paper notices.',
            24,
          ),
        ],
        'You have a starting hypothesis. It is not validated yet. Next, look for a real moment that supports or challenges it.',
        'Write who struggles, what happens, and the situation. Leave out the app you want to build.',
      ),
    ],
  ),
  lesson(
    'discover-2',
    1,
    'Become a problem detective',
    'Collect observations without jumping to conclusions.',
    'experiment',
    [
      choice(
        'd2-a',
        'Which is an observation?',
        [
          'Students are lazy.',
          'Three students checked two chat groups to find one deadline.',
          'Everyone needs a better app.',
        ],
        1,
        'The number of people and the action can be observed. “Lazy” is an interpretation, and “everyone” is an untested generalization.',
        'Choose something another person could see or record.',
      ),
      sort(
        'd2-b',
        'Put the discovery process in order.',
        ['Suggest an idea', 'Notice an event', 'Describe the pain', 'Look for a pattern'],
        [1, 2, 3, 0],
        'Start with what happened, identify the cost to the person, compare more situations, and only then propose a solution.',
        'Evidence comes before an idea.',
      ),
      project(
        'd2-c',
        'Record a real moment.',
        [
          field(
            'observations',
            'What did you actually notice?',
            'Where and when? What did someone do? What slowed them down? If this is practice, begin with “Practice scenario:”.',
            30,
            'Do not invent a real observation. You can use your chosen practice world and label it clearly.',
          ),
        ],
        'Your notebook now separates a visible event from your interpretation. A practice observation is useful for learning, but is not real-world evidence.',
        'Describe behavior: “They opened three tabs,” rather than “They were confused.”',
      ),
    ],
    5,
  ),
  lesson(
    'discover-3',
    1,
    'Find the pain underneath',
    'Understand what the struggle costs the person.',
    'mentor',
    [
      choice(
        'd3-a',
        'Students wait in a lunch queue. Which question finds the pain?',
        [
          'Would you like a queue app?',
          'What did you miss because you were waiting?',
          'What color should the queue app be?',
        ],
        1,
        'Pain is the consequence: lost eating time, a missed activity, or uncertainty. A long queue matters because of what it prevents.',
        'Explore the consequence, not your proposed feature.',
      ),
      multi(
        'd3-b',
        'Which details help you judge a pain point?',
        [
          'How often it happens',
          'What the person currently does to cope',
          'How exciting your app name sounds',
          'What it costs in time, money, or effort',
        ],
        [0, 1, 3],
        'Frequency, workarounds, and consequences help you compare problems. Your enthusiasm does not measure someone else’s need.',
        'Choose details about the user’s experience.',
      ),
      project(
        'd3-c',
        'Explain the cost of your problem.',
        [
          field(
            'painPoints',
            'When it happens, what does it cost?',
            'This happens when __. It costs the person __. Their current workaround is __.',
            30,
          ),
        ],
        'You now have a pain hypothesis to investigate. Mark unknowns honestly so the next conversation can test them.',
        'If you do not know the frequency yet, write “frequency unknown” rather than guessing.',
      ),
    ],
  ),
  lesson(
    'discover-4',
    1,
    'Choose a problem worth exploring',
    'Make a small, testable discovery plan.',
    'boss',
    [
      choice(
        'd4-a',
        'Which problem is the strongest place to start?',
        [
          'A huge global problem with no reachable users.',
          'A specific recurring struggle among people you can talk to this week.',
          'An idea that has no competitors.',
        ],
        1,
        'Reachable users make learning possible. Start with a narrow situation you can investigate; you can widen the scope later.',
        'Choose a problem you can learn about this week.',
      ),
      choice(
        'd4-b',
        'Your mentor asks: “How do you know this matters?”',
        [
          'My friends said my idea sounds cool.',
          'I need to ask about recent experiences and observe the current workaround.',
          'It uses AI, so it must matter.',
        ],
        1,
        'Interest in an idea is not evidence of a problem. Recent examples and workarounds give you something concrete to investigate.',
        'The best next step turns uncertainty into a question.',
      ),
      project(
        'd4-c',
        'Set your discovery challenge.',
        [
          field(
            'assumptions',
            'What are you assuming?',
            'I assume __ experiences __ at least __. I do not know yet whether __.',
            30,
          ),
          field(
            'nextSteps',
            'One action you can take this week',
            'I will speak with __ about the last time __. I will record what they did and what surprised me.',
            30,
          ),
        ],
        'Mission complete: a problem, an observation, a pain hypothesis, and a concrete next action. You have chosen something to investigate, not declared it validated.',
        'Choose a reachable person and one past experience. Ask permission before taking notes.',
      ),
    ],
    5,
  ),

  lesson(
    'define-1',
    2,
    'Choose your first user',
    'A useful audience is specific and reachable.',
    'lesson',
    [
      choice(
        'f1-a',
        'Who is the clearest first user?',
        [
          'Everyone with a phone',
          'Students',
          'Year 11 students coordinating group assignments across three subjects',
        ],
        2,
        'A narrow first user has a shared situation. That makes recruiting, asking questions, and evaluating a solution much easier.',
        'Look for a shared behavior and context.',
      ),
      choice(
        'f1-b',
        'What belongs in a useful persona?',
        [
          'A made-up favorite color',
          'A relevant goal, constraint, and current behavior',
          'A long fictional biography',
        ],
        1,
        'A persona supports decisions when it captures evidence-based goals and constraints. Decorative details do not explain the need.',
        'Include details that change a product decision.',
      ),
      project(
        'f1-c',
        'Name the person you are building for.',
        [
          field(
            'targetUser',
            'Your first target user',
            'People who __, in the situation __, who currently solve it by __.',
            30,
          ),
        ],
        'Use this group to recruit your first conversations. Treat details you have not observed as assumptions.',
        'Avoid “everyone.” Pick one situation and one reachable group.',
      ),
    ],
  ),
  lesson(
    'define-2',
    2,
    'Ask without leading',
    'Learn from recent behavior, not compliments.',
    'experiment',
    [
      multi(
        'f2-a',
        'Choose the useful interview questions.',
        [
          'Tell me about the last time this happened.',
          'Would you use my amazing app?',
          'What did you do next?',
          'How much time did it take?',
          'You hate the current system, right?',
        ],
        [0, 2, 3],
        'Past-event questions reveal actual behavior. Leading questions and promises about the future tend to produce polite, unreliable answers.',
        'Ask about a specific past event without selling your idea.',
      ),
      choice(
        'f2-b',
        'A participant shares something sensitive. What do you do?',
        [
          'Save their full name and post the quote.',
          'Ask what may be recorded, minimize identifying details, and respect a refusal.',
          'Keep recording because research is important.',
        ],
        1,
        'Participants control what they share. Ask permission, collect only what is needed, and anonymize your notes.',
        'Research is a conversation with consent.',
      ),
      project(
        'f2-c',
        'Prepare or record your first interview.',
        [
          field(
            'interviews',
            'Interview notebook',
            'Real interview: participant alias, date, permission, situation, exact quote, current workaround. If not done yet, start “Interview plan:” and write your questions.',
            40,
          ),
        ],
        'A plan is a useful artifact, but it is not a completed interview. Replace planned notes with what happened when you speak to a participant.',
        'Preserve their words separately from what you think those words mean.',
      ),
    ],
    6,
  ),
  lesson(
    'define-3',
    2,
    'Evidence or assumption?',
    'Keep what you know separate from what you guess.',
    'quiz',
    [
      categorize(
        'f3-a',
        'Sort what you have learned.',
        [
          'Two participants showed me their paper reminder lists.',
          'Everyone will pay for reminders.',
          'A participant said, “I checked five chats yesterday.”',
          'AI will make people trust the app.',
        ],
        ['Evidence', 'Assumption'],
        [0, 1, 0, 1],
        'A quote or observed behavior is evidence about that event, not proof about everyone. Predictions remain assumptions until tested.',
        'Ask whether this was observed or is still a prediction.',
      ),
      choice(
        'f3-b',
        'Two interviews disagree. What should you do?',
        [
          'Delete the inconvenient answer.',
          'Explore the different situations and collect more evidence.',
          'Pick the answer from your closest friend.',
        ],
        1,
        'Contradictions may reveal different user groups or contexts. They are a reason to investigate, not average away the story.',
        'Look for the context behind each answer.',
      ),
      project(
        'f3-c',
        'Build an honest evidence note.',
        [
          field(
            'evidence',
            'What supports or challenges your problem?',
            'Source/date: __. What happened or was said: __. What it supports: __. What it does NOT prove: __. If untested, write “No real evidence yet” and your collection plan.',
            40,
          ),
        ],
        'An evidence note includes its limits. The app records your work; it does not independently verify your claims.',
        'A sample of two cannot justify a claim about all students.',
      ),
    ],
  ),
  lesson(
    'define-4',
    2,
    'Turn a pattern into an insight',
    'Define the problem you will actually solve.',
    'boss',
    [
      choice(
        'f4-a',
        'Which is an actionable insight?',
        [
          'Students like technology.',
          'When updates arrive in several places, students keep re-checking because they cannot tell which deadline is current.',
          'We should build a chatbot.',
        ],
        1,
        'An insight connects a situation, behavior, and underlying need. It gives multiple solutions a clear job to do.',
        'Look for “when,” “because,” and a human need.',
      ),
      choice(
        'f4-b',
        'Which statement describes a job to be done?',
        [
          'Use a database.',
          'When a deadline changes, help me identify the current date so I can plan my work.',
          'Make the home screen blue.',
        ],
        1,
        'A job describes progress the person wants in a situation. It remains useful even if your first solution changes.',
        'Describe the desired outcome instead of the tool.',
      ),
      project(
        'f4-c',
        'Write your problem brief.',
        [
          field(
            'insights',
            'The pattern you are seeing',
            'When __, my target user __ because __. Evidence so far is __; the remaining uncertainty is __.',
            40,
          ),
          field(
            'problem',
            'Refine your problem statement',
            'For [specific user] in [situation], [pain] causes [consequence]. They currently [workaround].',
            40,
          ),
        ],
        'You have a clearer brief. If the insight is still a hypothesis, label it and use your next test to challenge it.',
        'Keep one main need in the statement. A solution comes next.',
      ),
    ],
    5,
  ),

  lesson('scope-1', 3, 'Choose a direction', 'Explore possibilities before committing.', 'lesson', [
    choice(
      's1-a',
      'Your user needs one reliable deadline. Which approach explores solutions well?',
      [
        'Choose AI immediately.',
        'Compare a shared calendar, a weekly digest, and a simple deadline board.',
        'Build all three at once.',
      ],
      1,
      'Different approaches can solve the same need. Compare how directly each helps the user, how quickly you can test it, and what could fail.',
      'One problem can have more than one good solution.',
    ),
    choice(
      's1-b',
      'Which value proposition is clearest?',
      [
        'The best AI-powered platform.',
        'One place for group leaders to confirm the current deadline without searching old chats.',
        'A powerful and innovative experience.',
      ],
      1,
      'A value proposition names the user, job, and benefit. Specific language makes it possible to test whether the promise is true.',
      'Describe what becomes easier for a particular person.',
    ),
    project(
      's1-c',
      'Give your direction a clear promise.',
      [
        field('name', 'Working project name', 'A short name you can change later', 2),
        field(
          'valueProposition',
          'Why would your user choose it?',
          'For __ who need __, this helps them __ by __. Other approaches considered: __.',
          35,
        ),
      ],
      'A working name and a concrete promise are enough to begin. You can change both as you learn.',
      'Choose one direction and explain the outcome, not a list of technologies.',
    ),
  ]),
  lesson(
    'scope-2',
    3,
    'Build the smallest useful test',
    'An MVP tests one risky assumption.',
    'project',
    [
      choice(
        's2-a',
        'What makes a good MVP?',
        [
          'It contains every feature competitors offer.',
          'It tests a key assumption with the smallest usable experience.',
          'It looks unfinished on purpose.',
        ],
        1,
        'Minimum means focused, and viable means useful enough to test the assumption. Quality and clear scope matter more than the feature count.',
        'What is the smallest thing that can teach you something important?',
      ),
      categorize(
        's2-b',
        'Scope a first deadline-board test.',
        [
          'Show the current deadline',
          'Let the group leader update it',
          'Custom profile frames',
          'A public social feed',
        ],
        ['Must have', 'Later'],
        [0, 0, 1, 1],
        'The board cannot deliver its promise without reading and updating deadlines. Profile decoration and a social feed do not test that promise.',
        'Protect the one job you promised to do.',
      ),
      project(
        's2-c',
        'Draw a boundary around your MVP.',
        [
          field(
            'mvp',
            'The smallest useful experience',
            'Our MVP lets [user] do [one job]. It tests [assumption]. It will not include [two exclusions].',
            40,
          ),
        ],
        'Explicit exclusions keep the first experiment achievable. An MVP can be manual, no-code, or a simple prototype.',
        'Name the assumption and two things you will deliberately leave out.',
      ),
    ],
  ),
  lesson(
    'scope-3',
    3,
    'Cut the feature creep',
    'Trade-offs are part of making a product.',
    'quiz',
    [
      choice(
        's3-a',
        'A feature takes two weeks and does not test your main assumption. What now?',
        [
          'Add it because it is impressive.',
          'Put it in Later and protect the first test.',
          'Stop the whole project.',
        ],
        1,
        'You can keep an idea without building it now. A Later list is a deliberate trade-off, not a rejection forever.',
        'Compare its learning value with its effort.',
      ),
      multi(
        's3-b',
        'What should influence your first scope?',
        [
          'The user’s critical task',
          'Available time and skills',
          'Every suggestion from a friend',
          'The riskiest assumption',
          'Accessibility for your target users',
        ],
        [0, 1, 3, 4],
        'Scope should balance user value, learning value, real constraints, and usability. Every request is input, not an automatic requirement.',
        'Choose factors that determine whether the first test can work.',
      ),
      project(
        's3-c',
        'Make your feature decisions visible.',
        [
          field(
            'features',
            'Must have / Nice to have / Later',
            'Must have: __. Nice to have: __. Later: __. Time limit: __. The first feature I would cut is __ because __.',
            40,
          ),
        ],
        'Your scope now has an explicit priority order. Revisit it when a test reveals new evidence.',
        'Keep Must have to the features needed for one complete user task.',
      ),
    ],
  ),
  lesson(
    'scope-4',
    3,
    'Map the first successful journey',
    'Describe the user’s path to value.',
    'boss',
    [
      sort(
        's4-a',
        'Order a simple deadline-checking journey.',
        [
          'Read the current deadline',
          'Choose an assignment',
          'Decide what to work on next',
          'Open the board',
        ],
        [3, 1, 0, 2],
        'A journey begins with an entry point and ends in a user outcome. The final step is a decision or action, not simply another screen.',
        'What must happen before the user can see a deadline?',
      ),
      choice(
        's4-b',
        'Where should you remove friction first?',
        [
          'The step that prevents users from reaching the main outcome.',
          'A rarely used decorative setting.',
          'The logo animation.',
        ],
        0,
        'Focus on the steps every target user needs to complete. A beautiful extra cannot rescue a broken core journey.',
        'Find the critical path.',
      ),
      project(
        's4-c',
        'Write your first user flow.',
        [
          field(
            'userJourney',
            'From starting point to success',
            '1. User starts at __. 2. They __. 3. They __. 4. Success means __. If something fails, they can __.',
            40,
          ),
          field(
            'description',
            'Your project in one sentence',
            'We help [user] achieve [outcome] with [focused solution].',
            20,
          ),
        ],
        'You have a promise, a scope, and a complete user task. You are ready to make that task visible in a prototype.',
        'Include the successful ending and one way to recover from an error.',
      ),
    ],
  ),

  lesson('prototype-1', 4, 'Sketch before you polish', 'Make ideas cheap to change.', 'lesson', [
    choice(
      'p1-a',
      'What is the best first prototype for testing a three-step flow?',
      [
        'Three rough paper screens people can walk through.',
        'A fully coded product with authentication and billing.',
        'A finished brand book.',
      ],
      0,
      'Paper screens can expose confusing labels and missing steps in minutes. Use the least expensive format that answers your question.',
      'Match prototype fidelity to the uncertainty.',
    ),
    choice(
      'p1-b',
      'What question should a prototype answer?',
      [
        'Will everybody love our business?',
        'Can a target user understand how to complete this specific task?',
        'Which database scales to a million users?',
      ],
      1,
      'A prototype tests specific interaction assumptions. It cannot, by itself, prove demand or technical scalability.',
      'Choose one observable user task.',
    ),
    project(
      'p1-c',
      'Plan three rough screens.',
      [
        field(
          'prototype',
          'Prototype notebook',
          'Format: paper / clickable / coded. Task to test: __. Screen 1: __. Screen 2: __. Screen 3: __. Link or file location if available: __.',
          45,
        ),
      ],
      'This note becomes your prototype brief. Label it “planned” until the screens exist.',
      'Each screen should move the person closer to the task outcome.',
    ),
  ]),
  lesson('prototype-2', 4, 'Make the next action obvious', 'Clarity beats cleverness.', 'quiz', [
    choice(
      'p2-a',
      'Which button best helps someone save a deadline?',
      ['Proceed', 'Do the thing', 'Save deadline'],
      2,
      'A clear verb and object tell users what will happen. Clever but vague labels add unnecessary guessing.',
      'Name the action and what it affects.',
    ),
    multi(
      'p2-b',
      'Which choices improve usability?',
      [
        'Readable text with enough contrast',
        'A button that says what it does',
        'Errors shown only by turning a border red',
        'Touch targets large enough to tap',
        'A way to undo a mistaken action',
      ],
      [0, 1, 3, 4],
      'Usability includes perception, understanding, touch, and recovery. Explain errors in words as well as color.',
      'Think about different abilities, devices, and mistakes.',
    ),
    project(
      'p2-c',
      'Audit your core flow for clarity.',
      [
        field(
          'userJourney',
          'Update your flow with clear actions',
          'Keep your existing flow. Add: primary button labels, the success message, and a helpful error with a recovery action.',
          45,
        ),
      ],
      'Clear actions and recovery states make the prototype a more realistic test.',
      'Read every label aloud. Could a new user predict what happens next?',
    ),
  ]),
  lesson(
    'prototype-3',
    4,
    'Build something people can try',
    'Connect the journey, including the awkward moments.',
    'project',
    [
      choice(
        'p3-a',
        'Your prototype looks great, but the main button does nothing. What is missing?',
        [
          'A larger logo.',
          'The interaction needed to finish the test task.',
          'A social media account.',
        ],
        1,
        'A prototype can be low fidelity, but it must support the behavior you want to observe. A facilitator may simulate an action if the test is transparent.',
        'Make the target task possible from beginning to end.',
      ),
      choice(
        'p3-b',
        'When is it okay to simulate a backend manually?',
        [
          'When users are told the prototype is a simulation and no real transaction is implied.',
          'When you pretend the system is fully working.',
          'Never; every prototype needs production infrastructure.',
        ],
        0,
        'A transparent simulation can test desirability or usability cheaply. Do not imply that a transaction, message, or service really happened when it did not.',
        'Be honest about what the test does and does not do.',
      ),
      project(
        'p3-c',
        'Record your prototype’s current state.',
        [
          field(
            'prototype',
            'What exists and how can it be tried?',
            'Status: planned / paper / clickable / coded. Link or physical location: __. Testable task: __. Simulated parts: __. Known gaps: __.',
            45,
          ),
        ],
        'A testable artifact and an honest list of limitations are more useful than a claim that everything is finished.',
        'If it is still planned, state that and list the next concrete step.',
      ),
    ],
    6,
  ),
  lesson('prototype-4', 4, 'Run a rehearsal', 'Find test blockers before inviting users.', 'boss', [
    sort(
      'p4-a',
      'Prepare a usability test.',
      [
        'Ask a participant to try the task',
        'Fix blockers in the prototype',
        'Write a neutral task scenario',
        'Walk through the task yourself',
      ],
      [2, 3, 1, 0],
      'Define the task, rehearse it, fix anything that prevents the task from being attempted, then invite users.',
      'A test cannot reveal much if the prototype cannot be operated.',
    ),
    choice(
      'p4-b',
      'Which test instruction is neutral?',
      [
        'Tap the blue Save button at the bottom.',
        'You learned the deadline changed. Make sure the group sees the new date.',
        'Do you like my beautiful design?',
      ],
      1,
      'A scenario names the user’s goal without giving away the interface steps. That allows you to observe whether the design is understandable.',
      'Describe the goal, not the clicks.',
    ),
    project(
      'p4-c',
      'Prepare your test scenario.',
      [
        field(
          'validationPlan',
          'Rehearsal and participant task',
          'Target participant: __. Scenario to read: __. Task success means __. Rehearsal blockers found: __. What I fixed or still need to fix: __.',
          45,
        ),
      ],
      'Your prototype now has a testable purpose. Next you will decide what evidence would change your mind.',
      'Make success something you can observe without asking whether they liked it.',
    ),
  ]),

  lesson(
    'validate-1',
    5,
    'Test the risky assumption',
    'Design a test that could prove you wrong.',
    'lesson',
    [
      choice(
        'v1-a',
        'Which hypothesis can you test?',
        [
          'Our product is amazing.',
          'At least 3 of 5 target users can find the latest deadline without help in one minute.',
          'Our product will change education forever.',
        ],
        1,
        'A testable hypothesis names a group, behavior, and threshold. Set the threshold before seeing the results.',
        'Use a measurable action and a clear decision rule.',
      ),
      choice(
        'v1-b',
        'Why choose a pass threshold before testing?',
        [
          'It makes failure impossible.',
          'It reduces the temptation to redefine success after seeing the result.',
          'It guarantees the product is validated.',
        ],
        1,
        'Predefining success makes interpretation more honest. A small test informs a decision; it does not prove universal demand.',
        'Protect the experiment from your own hopes.',
      ),
      project(
        'v1-c',
        'Write an experiment you can fail.',
        [
          field(
            'validationPlan',
            'Hypothesis and decision rule',
            'We believe __. We will test with __ target users by __. We will measure __. Before testing, success means __. If it fails, we will __.',
            50,
          ),
        ],
        'You have a hypothesis, method, measure, and decision. Keep the threshold unchanged while you collect this round of results.',
        'Choose a behavior, not a compliment or a follower count.',
      ),
    ],
  ),
  lesson(
    'validate-2',
    5,
    'Watch without rescuing',
    'Let the design speak for itself.',
    'experiment',
    [
      multi(
        'v2-a',
        'What should you do during a usability test?',
        [
          'Ask permission to observe and take notes',
          'Explain every button before the task',
          'Let participants think aloud',
          'Record hesitation and mistakes',
          'Tell them the design is being tested, not their ability',
        ],
        [0, 2, 3, 4],
        'A safe, neutral session reveals where the design helps or gets in the way. Coaching through each step hides those problems.',
        'Support the person without giving away the answer.',
      ),
      choice(
        'v2-b',
        'A participant cannot finish. What do you record?',
        [
          'A failed person.',
          'The point of difficulty, their words, and any help you gave.',
          'A success because you eventually showed them.',
        ],
        1,
        'Assisted completion is different from independent completion. Record the distinction and use the confusion to improve the design.',
        'Keep the measurement honest and the tone kind.',
      ),
      project(
        'v2-c',
        'Capture the test, including its limits.',
        [
          field(
            'validationResults',
            'Results notebook',
            'Status: not run / practice / real test. Participant alias and context: __. Task completed without help? __. Observed difficulty: __. Quote: __. Help given: __.',
            45,
          ),
        ],
        '“Not run yet” is an honest status. Do not invent participants or successful results to complete a lesson.',
        'Separate what happened from why you think it happened.',
      ),
    ],
    6,
  ),
  lesson(
    'validate-3',
    5,
    'Read the evidence carefully',
    'A small test is a clue, not a verdict on everyone.',
    'quiz',
    [
      choice(
        'v3-a',
        'Two of five participants finished without help. Your threshold was three. What follows?',
        [
          'The test missed its threshold; investigate the failed steps before deciding what to change.',
          'Round up because the idea is good.',
          'Nobody anywhere wants the product.',
        ],
        0,
        'The result does not meet the rule for this test. It points to a next investigation, not a universal conclusion about demand.',
        'Use the rule you set and avoid overgeneralizing.',
      ),
      choice(
        'v3-b',
        'Everyone says “nice app,” but nobody tries it again. Which evidence matters most?',
        [
          'The compliment alone.',
          'The gap between positive comments and repeated behavior.',
          'Your favorite screenshot.',
        ],
        1,
        'Polite feedback and actual use can differ. Investigate why the product did not become useful enough to return to.',
        'Behavior gives you evidence that compliments cannot.',
      ),
      project(
        'v3-c',
        'Separate findings from interpretation.',
        [
          field(
            'feedback',
            'What did the test teach you?',
            'Observed pattern: __. Supporting notes: __. Another possible explanation: __. Sample limits: __. The next thing to check: __.',
            45,
          ),
        ],
        'Alternative explanations protect you from treating the first story as a fact.',
        'If the test is not run, write the analysis questions you will use, labeled “Analysis plan.”',
      ),
    ],
  ),
  lesson('validate-4', 5, 'Keep, improve, or pivot?', 'Let evidence change the plan.', 'boss', [
    choice(
      'v4-a',
      'Users need deadline clarity, but will not install another app. What is a useful next move?',
      [
        'Ignore them and add more features.',
        'Test a simpler delivery method inside a tool they already use.',
        'Conclude deadlines do not matter.',
      ],
      1,
      'The need may be real while the delivery method is wrong. Change the solution assumption without discarding useful problem evidence.',
      'Separate the need from the channel.',
    ),
    categorize(
      'v4-b',
      'Choose the appropriate decision.',
      [
        'Core task works; test with a new group',
        'Labels block completion; simplify and retest',
        'Repeated evidence shows a different urgent need',
      ],
      ['Continue', 'Improve', 'Pivot'],
      [0, 1, 2],
      'Continue when the current direction deserves another test, improve when execution blocks value, and pivot when evidence changes the core direction.',
      'Ask whether the uncertainty is about execution or the underlying need.',
    ),
    project(
      'v4-c',
      'Make an evidence-based decision.',
      [
        field(
          'validationDecision',
          'Your decision and why',
          'Decision: continue / improve / pivot / not enough evidence. Evidence: __. Change to make: __. Next test: __.',
          45,
        ),
      ],
      'Choosing “not enough evidence” is valid. Your decision should match what the research actually supports.',
      'Include the evidence that could still change your mind.',
    ),
  ]),

  lesson(
    'business-1',
    6,
    'Understand the alternatives',
    'Your competitor may be a spreadsheet.',
    'lesson',
    [
      choice(
        'b1-a',
        'What competes with a new school planning tool?',
        [
          'Only other startup apps.',
          'Chat groups, paper notes, calendars, and doing nothing.',
          'Nothing if it uses AI.',
        ],
        1,
        'An alternative is anything people currently use to get the job done, including a manual workaround or accepting the problem.',
        'Start with current behavior, not an app-store category.',
      ),
      choice(
        'b1-b',
        'Which difference is most meaningful?',
        [
          'Our logo is new.',
          'The product solves a costly task more simply for a specific group.',
          'We use more technologies.',
        ],
        1,
        'Differentiation matters when a user can feel the benefit. A technical distinction only matters if it improves the outcome or cost.',
        'Explain why someone would change their current behavior.',
      ),
      project(
        'b1-c',
        'Map the current alternatives.',
        [
          field(
            'competitors',
            'Three ways people handle this today',
            'Alternative 1: __; useful because __; gap __. Alternative 2: __. Alternative 3: __. Our specific difference: __.',
            45,
          ),
        ],
        'Include the strongest alternative honestly. If the current workaround is good enough, you have more to learn.',
        'Ask users what they used the last time, then verify that alternative yourself.',
      ),
    ],
  ),
  lesson(
    'business-2',
    6,
    'Who pays, and why?',
    'A user and a buyer can be different people.',
    'lesson',
    [
      choice(
        'b2-a',
        'Students use a tool, but schools buy it. Who should you learn from?',
        [
          'Students only.',
          'Schools only.',
          'Both: students for usefulness and schools for purchasing needs.',
        ],
        2,
        'The user experiences the product; the buyer decides whether the expense is worthwhile. Their goals and constraints can differ.',
        'Map who uses, who decides, and who pays.',
      ),
      choice(
        'b2-b',
        'What is the best first pricing evidence?',
        [
          'A price copied from an unrelated app.',
          'A real conversation about current spending, budget, and the value of solving the problem.',
          'Your desired revenue divided by an imagined audience.',
        ],
        1,
        'Pricing starts with the value delivered and the buyer’s context. A stated willingness to pay remains weaker than an actual purchase.',
        'Learn about money already spent and decisions already made.',
      ),
      project(
        'b2-c',
        'Sketch your business model.',
        [
          field(
            'businessModel',
            'User, buyer, value, and cost',
            'User: __. Buyer: __. Value delivered: __. Possible revenue model: __. Pricing hypothesis (not validated): __. Major costs: __.',
            45,
          ),
        ],
        'A free community project can have a sustainability model too: grants, school support, volunteers, or a capped budget.',
        'A business model explains how the product can keep serving people.',
      ),
    ],
  ),
  lesson(
    'business-3',
    6,
    'Can the numbers work?',
    'Use simple arithmetic before making big promises.',
    'quiz',
    [
      choice(
        'b3-a',
        'A service earns 100 per customer each month and costs 35 to serve them. What remains before fixed costs?',
        ['65', '135', '35'],
        0,
        '100 minus 35 leaves 65 in contribution per customer before fixed costs such as rent or a base software subscription. This is not net profit.',
        'Revenue minus variable cost gives contribution.',
      ),
      choice(
        'b3-b',
        'Which cost is easy to miss in an AI app?',
        [
          'The time on the phone’s clock.',
          'Per-request API usage, retries, and support.',
          'The number of letters in the app name.',
        ],
        1,
        'Usage-linked costs can grow with activity. Estimate a realistic range and set limits before assuming that more users always improves the economics.',
        'Consider what happens each time someone uses the product.',
      ),
      project(
        'b3-c',
        'Stress-test your cost assumptions.',
        [
          field(
            'businessModel',
            'Add a simple cost scenario',
            'Keep your user/buyer model. Add: revenue per user __; variable cost __; contribution __; monthly fixed cost __; what happens if usage doubles __. Label all estimates.',
            50,
          ),
        ],
        'This is an estimate for learning, not a forecast. Record the source of each number and the uncertainties.',
        'If revenue is zero, define the budget or support needed to sustain the service.',
      ),
    ],
  ),
  lesson(
    'business-4',
    6,
    'Check feasibility',
    'A useful idea also needs a practical way to work.',
    'boss',
    [
      multi(
        'b4-a',
        'Which constraints belong in a feasibility check?',
        [
          'Access to the data you need',
          'Skills and available time',
          'Consent and privacy needs',
          'An assumption that users never make mistakes',
          'Ongoing operating cost',
        ],
        [0, 1, 2, 4],
        'Feasibility includes technical access, human capability, appropriate data handling, and costs. Plan for mistakes instead of assuming them away.',
        'Ask what could stop the product from delivering safely and reliably.',
      ),
      choice(
        'b4-b',
        'The school cannot share student records. What should you do?',
        [
          'Collect them secretly.',
          'Redesign the test around information users can provide with permission, or choose a different approach.',
          'Pretend the data integration works.',
        ],
        1,
        'A constraint may call for a different solution. Only use data you are authorized to access, and minimize what you collect.',
        'Design around real access and consent.',
      ),
      project(
        'b4-c',
        'Make a realistic technical plan.',
        [
          field(
            'technicalPlan',
            'What is needed to make it work?',
            'Approach: manual / no-code / code. Needed data: __. Permission/access: __. Main components: __. Top risk: __. Smallest feasibility test: __.',
            50,
          ),
        ],
        'You now have a feasibility question to answer before committing to the full build.',
        'Test the most uncertain dependency early.',
      ),
    ],
  ),

  lesson('build-1', 7, 'Choose the simplest tool', 'Use technology to serve the task.', 'lesson', [
    choice(
      'u1-a',
      'Which tool choice is strongest for a first test?',
      [
        'The most complex stack you have heard of.',
        'The simplest approach you can maintain that supports the core user task.',
        'Whatever appears most often on social media.',
      ],
      1,
      'A spreadsheet, no-code tool, or a small coded app can all be appropriate. Choose according to the user task, constraints, and your ability to iterate.',
      'Start with requirements and constraints, not hype.',
    ),
    categorize(
      'u1-b',
      'Match each responsibility. Frontend (ส่วนที่ผู้ใช้เห็น) presents the screens. Backend (ระบบเบื้องหลัง) enforces trusted rules. Database (ฐานข้อมูล) stores records.',
      [
        'Show a deadline on screen',
        'Check that a user may edit an assignment',
        'Persist assignment records',
        'Render a form error',
      ],
      ['Frontend', 'Backend', 'Database'],
      [0, 1, 2, 0],
      'The frontend presents the experience, the backend enforces trusted rules, and the database stores records. A client-side check alone cannot secure shared data.',
      'Separate presentation, trusted decisions, and storage.',
    ),
    project(
      'u1-c',
      'Choose and explain your approach.',
      [
        field(
          'technicalPlan',
          'Your implementation approach',
          'Tool/stack: __. Why it fits the core task: __. Frontend: __. Backend/trusted rules if needed: __. Data storage: __. Offline/error behavior: __.',
          50,
        ),
      ],
      'A justified simple choice is better than an unexplained fashionable one.',
      'Keep the feasibility risks from the previous mission in this plan.',
    ),
  ]),
  lesson(
    'build-2',
    7,
    'Build one vertical slice',
    'Finish a small journey from screen to saved result.',
    'project',
    [
      sort(
        'u2-a',
        'Order a useful build loop.',
        [
          'Test the real user task',
          'Choose one thin user journey',
          'Implement the smallest working slice',
          'Fix the most important failure',
        ],
        [1, 2, 0, 3],
        'A vertical slice goes from an input through the necessary logic to a visible, saved outcome. Test it before widening the product.',
        'Finish one complete task before adding many partial features.',
      ),
      choice(
        'u2-b',
        'AI generated your feature. What happens next?',
        [
          'Ship without reading it.',
          'Understand it, run it, test edge cases, and check how it handles data.',
          'Assume that compiling proves correctness.',
        ],
        1,
        'Generated code is a draft you are responsible for. Test behavior, failures, and data handling; never put secret service keys into client code.',
        'You own the result even when AI helped write it.',
      ),
      project(
        'u2-c',
        'Track a real build slice.',
        [
          field(
            'buildStatus',
            'What actually works today?',
            'Slice: __. Status: planned / in progress / working. Implemented: __. Not implemented: __. Where to try it: __. Next action: __.',
            45,
          ),
        ],
        'Be precise about working behavior. A plan is useful, but it is not a running MVP.',
        'Choose one action whose result can survive closing and reopening the app.',
      ),
    ],
    6,
  ),
  lesson('build-3', 7, 'Debug with evidence', 'Reproduce, isolate, fix, and verify.', 'quiz', [
    choice(
      'u3-a',
      'A saved deadline disappears after restart. What is the best first step?',
      [
        'Change random files.',
        'Write exact reproduction steps and inspect where the save should persist.',
        'Hide the restart button.',
      ],
      1,
      'A reliable reproduction gives you a way to test a hypothesis and prove a fix. Random edits make the cause harder to understand.',
      'Make the failure repeatable before changing the code.',
    ),
    multi(
      'u3-b',
      'Which checks protect a first release?',
      [
        'The happy path',
        'Missing or invalid input',
        'Network failure',
        'Restart after saving',
        'Only the screenshot that looks best',
      ],
      [0, 1, 2, 3],
      'People encounter bad input, weak networks, and restarts. Testing these is part of making the product useful, not optional polish.',
      'Try the situations that interrupt a real person’s task.',
    ),
    project(
      'u3-c',
      'Keep a test and fix log.',
      [
        field(
          'updates',
          'What failed, and what changed?',
          'Issue: __. Steps to reproduce: __. Expected: __. Actual: __. Fix or next hypothesis: __. Verification result: __.',
          45,
        ),
      ],
      'Mark verification as “not tested” until you have repeated the steps after the change.',
      'A fix is demonstrated by behavior, not by a claim that the code looks right.',
    ),
  ]),
  lesson(
    'build-4',
    7,
    'Know if it is working',
    'Measure the outcome and check release readiness.',
    'boss',
    [
      choice(
        'u4-a',
        'Which metric fits a deadline-clarity product?',
        [
          'Number of screens in the app.',
          'Share of target users who can find the current deadline without help.',
          'Number of colors in the design.',
        ],
        1,
        'A useful metric reflects the job you promised to help with. Track a baseline and avoid collecting more personal data than needed.',
        'Measure successful user behavior.',
      ),
      choice(
        'u4-b',
        'A core task still loses saved work. Is the MVP ready?',
        [
          'Yes, if the launch image is polished.',
          'No. Fix data loss before inviting people to depend on it.',
          'Yes, because MVP means unreliable.',
        ],
        1,
        'An MVP may be small, but its core promise should work. Protect people’s time and data before expanding the audience.',
        'Minimum scope does not mean disposable user work.',
      ),
      project(
        'u4-c',
        'Write a release-readiness note.',
        [
          field(
            'buildStatus',
            'Ready to test with real users?',
            'Core task: __. Verified working: __. Known limitations: __. Data persistence test: __. Error recovery: __. Outcome metric: __. Release decision: ready / not ready, because __.',
            55,
          ),
        ],
        'If you are not ready, the next step is clear. A truthful readiness note is part of good product judgment.',
        'Include what you actually tested and what remains unknown.',
      ),
    ],
  ),

  lesson('ship-1', 8, 'Launch to learn', 'Start with a small group you can support.', 'lesson', [
    choice(
      'h1-a',
      'What is a strong first launch plan?',
      [
        'Post everywhere and hope.',
        'Invite a reachable target group, give one clear task, and watch for problems.',
        'Spend the whole budget before anyone uses it.',
      ],
      1,
      'A small launch gives you a chance to help, observe, and fix problems. Choose a channel where your first users already are.',
      'Who will try it, where will they hear about it, and what will they do first?',
    ),
    choice(
      'h1-b',
      'What should your launch message promise?',
      [
        'A specific benefit that works today.',
        'Every feature on your future roadmap.',
        'Guaranteed results for everyone.',
      ],
      0,
      'The message should match the current product. Clear limitations build trust and set up useful feedback.',
      'Promise the value that a new user can actually experience.',
    ),
    project(
      'h1-c',
      'Plan a small, useful launch.',
      [
        field(
          'launchStrategy',
          'First audience and first action',
          'Audience: __. Channel: __. Invitation: __. First task: __. Support/contact: __. Known limitations to disclose: __. Feedback method: __.',
          50,
        ),
      ],
      'You have a launch plan, not a launch claim. Record the live link only when the project is actually accessible.',
      'Begin with people whose problem you understand and who can give feedback.',
    ),
  ]),
  lesson(
    'ship-2',
    8,
    'Tell the story with evidence',
    'A pitch makes the need, solution, and learning clear.',
    'project',
    [
      sort(
        'h2-a',
        'Order a clear short pitch.',
        [
          'Show the focused solution',
          'Introduce the user and problem',
          'Explain the evidence and what you learned',
          'Ask for a specific next step',
        ],
        [1, 2, 0, 3],
        'Lead with the human need, support it with honest evidence, show the solution, then explain what you want the audience to do.',
        'Make the audience care before describing the features.',
      ),
      choice(
        'h2-b',
        'How should you present the test results?',
        [
          'Everyone loves it.',
          'In our five-person test, three completed the task; two struggled at the same step.',
          'Hide the sample size.',
        ],
        1,
        'Numbers need context. Showing what failed and how it changed the design demonstrates learning rather than weakening your story.',
        'State the sample, behavior, and limitations.',
        'Five people tried the prototype: three completed the task, and two struggled at the same step.',
      ),
      project(
        'h2-c',
        'Write a 60-second pitch.',
        [
          field(
            'pitch',
            'Your project story',
            'For [user], [problem] leads to [cost]. We observed [honest evidence]. Our solution [core action]. We tested [actual status/result]. Next we need [specific ask].',
            65,
          ),
        ],
        'Read it aloud and time it. Replace broad claims with a concrete story and evidence you can show.',
        'If testing is pending, say so and explain the test you will run.',
      ),
    ],
    5,
  ),
  lesson(
    'ship-3',
    8,
    'Find your first users',
    'Choose one channel and one measurable experiment.',
    'experiment',
    [
      choice(
        'h3-a',
        'Which marketing experiment teaches you most?',
        [
          'Try one message in a relevant community and measure whether target users start the core task.',
          'Buy followers.',
          'Count impressions as proof that the product solves the problem.',
        ],
        0,
        'A channel experiment connects a message to actual behavior. Reach is useful context, but it is not activation or retention.',
        'Measure the action that follows the view.',
      ),
      multi(
        'h3-b',
        'What belongs in a responsible community invitation?',
        [
          'A clear explanation of who it helps',
          'Permission from the community when required',
          'A truthful description of current capabilities',
          'Repeated unsolicited messages',
          'A simple way to share feedback',
        ],
        [0, 1, 2, 4],
        'Respect the community and describe the product honestly. Useful outreach should give people a choice, not pressure them.',
        'Be relevant, transparent, and respectful.',
      ),
      project(
        'h3-c',
        'Design your first distribution experiment.',
        [
          field(
            'marketing',
            'One channel, one message, one measure',
            'Target group: __. Channel and permission: __. Message: __. Call to action: __. Measure: __. Time window: __. What would make us change the approach: __.',
            55,
          ),
        ],
        'Use a small test before expanding. Do not enter fictional users, clicks, or revenue as results.',
        'Connect the channel to the user you defined in Mission 2.',
      ),
    ],
  ),
  lesson(
    'ship-4',
    8,
    'Ship, reflect, and go further',
    'Turn the project into an honest, competition-ready pack.',
    'boss',
    [
      choice(
        'h4-a',
        'What makes a project submission credible?',
        [
          'A long feature list with future work described as finished.',
          'A working demo or honest prototype, evidence, limitations, and clear learning.',
          'Claims that no one else has ever had the idea.',
        ],
        1,
        'Judges can evaluate a clear problem, a concrete artifact, and what you learned. Distinguish plans, tests, and shipped behavior.',
        'Help someone inspect what actually exists.',
      ),
      choice(
        'h4-b',
        'What comes after launch?',
        [
          'Stop learning because the project is done.',
          'Review behavior and feedback, choose one improvement, and test the next version.',
          'Only change the logo.',
        ],
        1,
        'Shipping starts a new learning cycle. Make the next decision from evidence and keep a record of the change.',
        'Learn, build, test, improve, and repeat.',
      ),
      project(
        'h4-c',
        'Write your next chapter.',
        [
          field(
            'nextSteps',
            'Retrospective and next experiment',
            'What I made: __. What evidence changed my mind: __. What remains untested: __. Next improvement: __. Next test and date: __. Opportunity to explore: __.',
            60,
          ),
          field(
            'description',
            'A clear summary for your Project Pack',
            'Who it helps, the problem, what currently exists, and the evidence or testing status.',
            35,
          ),
        ],
        'You have completed the learning path. Your Project Pack preserves plans and evidence honestly; completing lessons does not automatically mean the product has been launched.',
        'Open Compete to find relevant opportunities and verify each organizer’s current requirements.',
      ),
    ],
    5,
  ),
];

const missionData: Omit<Mission, 'lessonIds'>[] = [
  {
    id: 1,
    title: 'Discover',
    subtitle: 'Find problems worth solving.',
    description:
      'Notice real struggles, separate problems from ideas, and choose a question to investigate.',
    color: '#2876E3',
    icon: 'discover',
    outcome: 'A problem, an observation, a pain hypothesis, and your next discovery action.',
    guidebook: [
      {
        title: 'Notice before you invent',
        body: 'A problem names a person, a situation, and an unwanted outcome. “Build an app” is a solution. Keep asking what the person is trying to achieve.',
      },
      {
        title: 'Observation is not interpretation',
        body: '“Three students checked two chats” is observable. “Students are lazy” is an interpretation. Write the event first, then possible explanations.',
      },
      {
        title: 'Practice honestly',
        body: 'A beginner world is a fictional scenario. Label practice notes clearly. They develop your skills but do not count as real-world validation.',
      },
    ],
  },
  {
    id: 2,
    title: 'Define',
    subtitle: 'Understand the person behind the problem.',
    description:
      'Choose your first user, interview without leading, and turn evidence into a focused problem brief.',
    color: '#10A3A3',
    icon: 'user',
    outcome: 'A target user, interview notebook, evidence note, and problem statement.',
    guidebook: [
      {
        title: 'Ask about the last time',
        body: 'Concrete past events beat future promises. Ask what happened, what they did, and what it cost. Avoid pitching during discovery.',
      },
      {
        title: 'Keep the source and its limits',
        body: 'Record participant aliases, permission, context, and exact quotes separately from interpretation. Small samples cannot support claims about everyone.',
      },
    ],
  },
  {
    id: 3,
    title: 'Scope',
    subtitle: 'Make the smallest thing that matters.',
    description: 'Compare directions, protect your core promise, and map one complete user task.',
    color: '#E99218',
    icon: 'scope',
    outcome: 'A value proposition, a focused MVP, feature priorities, and a user journey.',
    guidebook: [
      {
        title: 'Minimum and viable',
        body: 'An MVP is the smallest usable way to test a risky assumption. It can be a manual service, a prototype, no-code, or software.',
      },
      {
        title: 'Keep a Later list',
        body: 'A feature is essential only if it is needed to deliver the first promise or answer the test question. Write down exclusions so the scope stays small.',
      },
    ],
  },
  {
    id: 4,
    title: 'Prototype',
    subtitle: 'Make your idea something people can try.',
    description: 'Sketch, clarify, connect the flow, and rehearse a neutral user task.',
    color: '#9361D9',
    icon: 'prototype',
    outcome: 'A prototype notebook, an understandable flow, and a test scenario.',
    guidebook: [
      {
        title: 'Fidelity follows the question',
        body: 'Paper can test comprehension. A clickable flow can test navigation. Code may be needed for technical behavior. Use only the fidelity needed to learn.',
      },
      {
        title: 'Make mistakes recoverable',
        body: 'Use clear labels, readable contrast, large touch targets, and errors explained in words. Include a way back when the user makes a mistake.',
      },
    ],
  },
  {
    id: 5,
    title: 'Validate',
    subtitle: 'Replace guesses with useful evidence.',
    description:
      'Set a decision rule, run a neutral test, and choose whether to continue, improve, or pivot.',
    color: '#D94C83',
    icon: 'test',
    outcome: 'An experiment plan, results notebook, feedback, and a reasoned decision.',
    guidebook: [
      {
        title: 'Choose success in advance',
        body: 'A hypothesis needs a target group, a behavior, and a measurable threshold. Decide what you will do if the test fails before seeing results.',
      },
      {
        title: 'A small test has limits',
        body: 'Report the sample, context, failures, and help given. A compliment is not repeated usage. A usability test is not proof of willingness to pay.',
      },
    ],
  },
  {
    id: 6,
    title: 'Make It Work',
    subtitle: 'Find a practical way for your idea to last.',
    description: 'Map alternatives, understand buyers and costs, and test feasibility.',
    color: '#198E83',
    icon: 'business',
    outcome: 'An alternatives map, business model, cost scenario, and feasibility plan.',
    guidebook: [
      {
        title: 'The workaround is a competitor',
        body: 'Ask how the job is done now. The alternative might be paper, a spreadsheet, a familiar chat, or tolerating the problem.',
      },
      {
        title: 'Estimates need labels',
        body: 'Separate revenue, variable costs, and fixed costs. Write the source and uncertainty for every estimate. A forecast is not actual revenue.',
      },
    ],
  },
  {
    id: 7,
    title: 'Build',
    subtitle: 'Turn a focused plan into a working experience.',
    description:
      'Choose suitable tools, build one slice, debug with evidence, and verify the core promise.',
    color: '#5869D8',
    icon: 'build',
    outcome: 'A technical plan, accurate build status, test log, and release-readiness note.',
    guidebook: [
      {
        title: 'Build a vertical slice',
        body: 'Finish one small user task from input to saved outcome. Test errors and restart behavior before adding breadth.',
      },
      {
        title: 'AI code still needs judgment',
        body: 'Understand generated code, verify what it does with data, and test it. Keep service secrets out of mobile clients and public repositories.',
      },
    ],
  },
  {
    id: 8,
    title: 'Ship',
    subtitle: 'Put your work into the world, then keep learning.',
    description:
      'Launch deliberately, tell the story honestly, find users, and prepare your next experiment.',
    color: '#EC703A',
    icon: 'ship',
    outcome: 'A launch plan, pitch, marketing experiment, retrospective, and Project Pack.',
    guidebook: [
      {
        title: 'Start with a reachable group',
        body: 'Choose one audience, one channel, and one core task. Disclose limitations and make it easy to report problems.',
      },
      {
        title: 'Show what exists',
        body: 'For a competition or portfolio, distinguish planned work, prototypes, real tests, and shipped behavior. Verify eligibility and deadlines with the organizer.',
      },
    ],
  },
];
export const lessons: Lesson[] = authoredLessons.map(learningGuideIndex.applyLessonCopy);

export const missions: Mission[] = missionData.map((mission) => ({
  ...mission,
  lessonIds: lessons.filter((item) => item.missionId === mission.id).map((item) => item.id),
}));
export function getLesson(id: string): Lesson | undefined {
  return lessons.find((item) => item.id === id) ?? getBonusLesson(id);
}
export function getMission(id: number): Mission | undefined {
  return missions.find((item) => item.id === id);
}

export const worlds: {
  id: WorldId;
  title: string;
  description: string;
  scenario: string;
  icon: string;
}[] = [
  {
    id: 'school',
    title: 'School',
    description: 'Make everyday school life easier.',
    scenario:
      'Practice scenario: students spend much of their lunch break waiting in the cafeteria queue. Some leave without eating. Explore when it happens and what causes the delay.',
    icon: 'school',
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Help the people around you.',
    scenario:
      'Practice scenario: neighbors want to share unused tools but cannot tell who has what or when an item will be returned.',
    icon: 'community',
  },
  {
    id: 'environment',
    title: 'Environment',
    description: 'Turn small frictions into less waste.',
    scenario:
      'Practice scenario: a school has recycling bins, but people hesitate because the labels do not match the packaging they carry.',
    icon: 'environment',
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Make learning more accessible.',
    scenario:
      'Practice scenario: new students struggle to find revision materials at the right level among many shared links.',
    icon: 'learn',
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    description: 'Design with people, not assumptions.',
    scenario:
      'Practice scenario: campus visitors who use mobility aids cannot tell which entrances are step-free. Any real research should include the people affected.',
    icon: 'user',
  },
  {
    id: 'productivity',
    title: 'Productivity',
    description: 'Give people back their time.',
    scenario:
      'Practice scenario: group-project members repeat status questions because work is scattered across messages, documents, and verbal updates.',
    icon: 'project',
  },
  {
    id: 'healthcare',
    title: 'Healthcare',
    description: 'Improve an everyday care experience.',
    scenario:
      'Practice scenario: clinic visitors do not know what documents to bring for an appointment. Focus on access and communication, not medical advice or diagnosis.',
    icon: 'test',
  },
  {
    id: 'small-business',
    title: 'Small Business',
    description: 'Support the people building locally.',
    scenario:
      'Practice scenario: a weekend market seller records orders on paper and sometimes loses track of which orders have been collected.',
    icon: 'business',
  },
];
