import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMentorInput, mentorModelContract, parseModelOutput } from './mentor-contract.mjs';

const fields = ['message', 'challenge', 'evidencePrompt', 'nextAction'];
const reply = {
  message: 'A variable names a stored value.',
  challenge: '',
  evidencePrompt: '',
  nextAction: '',
};
const envelope = (value) => ({
  status: 'completed',
  output: [
    {
      type: 'message',
      status: 'completed',
      content: [{ type: 'output_text', text: JSON.stringify(value) }],
    },
  ],
});
const projectFields = [
  'name',
  'description',
  'problem',
  'targetUser',
  'painPoints',
  'observations',
  'interviews',
  'evidence',
  'assumptions',
  'insights',
  'valueProposition',
  'features',
  'mvp',
  'userJourney',
  'prototype',
  'validationPlan',
  'validationResults',
  'validationDecision',
  'competitors',
  'businessModel',
  'technicalPlan',
  'buildStatus',
  'pitch',
  'launchStrategy',
  'marketing',
  'feedback',
  'updates',
  'nextSteps',
  'firstUser',
  'shippedUrl',
];

test('a question needs no project and normalizes without implied notebook consent', () => {
  assert.deepEqual(validateMentorInput({ prompt: '  What is a variable?  ' }), {
    prompt: 'What is a variable?',
    intent: 'answer',
  });
  assert.deepEqual(
    validateMentorInput({
      prompt: 'Explain recursion.',
      project: {},
      history: [],
      attachProject: false,
    }),
    {
      prompt: 'Explain recursion.',
      intent: 'answer',
    },
  );
  assert.deepEqual(validateMentorInput({ prompt: 'Explain recursion.', attachProject: true }), {
    prompt: 'Explain recursion.',
    intent: 'answer',
    attachProject: true,
    project: {},
  });
});

test('invalid root shapes and caller-selected identity, role, or provider controls are rejected', () => {
  for (const value of [
    null,
    [],
    'question',
    {},
    { prompt: 1 },
    { prompt: '' },
    { prompt: ' \n\t ' },
  ])
    assert.equal(validateMentorInput(value), null);
  for (const field of [
    'userId',
    'role',
    'messages',
    'instructions',
    'model',
    'provider',
    'apiKey',
    'allowRemote',
  ])
    assert.equal(
      validateMentorInput({ prompt: 'A question', [field]: 'untrusted-control' }),
      null,
      field,
    );
});

test('prompt length is bounded before trimming and valid questions are trimmed', () => {
  assert.equal(validateMentorInput({ prompt: 'x' }).prompt, 'x');
  assert.equal(validateMentorInput({ prompt: 'x'.repeat(2000) }).prompt.length, 2000);
  assert.equal(validateMentorInput({ prompt: 'x'.repeat(2001) }), null);
  assert.equal(validateMentorInput({ prompt: ` ${'x'.repeat(2000)}` }), null);
  assert.equal(validateMentorInput({ prompt: '  x  ' }).prompt, 'x');
});

test('notebook fields require explicit boolean attachment consent', () => {
  const project = {
    problem: 'Students cannot see the current lunch queue.',
    interviews: 'Anonymous fictional notes.',
  };
  for (const attachProject of [undefined, false, 'true', 1, null])
    assert.equal(
      validateMentorInput({ prompt: 'What should I test?', project, attachProject }),
      null,
    );
  const normalized = validateMentorInput({
    prompt: 'What should I test?',
    project,
    attachProject: true,
  });
  assert.deepEqual(normalized.project, project);
  assert.equal(normalized.attachProject, true);
  assert.equal(validateMentorInput({ prompt: 'Question only', attachProject: 'false' }), null);
  // An object containing notebook fields is not the legacy empty-object case.
  assert.equal(validateMentorInput({ prompt: 'Question only', project: { problem: '' } }), null);
});

test('attached project preserves supported fields and rejects unknown fields, types, and oversize values', () => {
  const project = Object.fromEntries(projectFields.map((field) => [field, 'fixture']));
  assert.deepEqual(
    validateMentorInput({ prompt: 'Review this.', attachProject: true, project }).project,
    project,
  );
  assert.equal(
    validateMentorInput({
      prompt: 'Review this.',
      attachProject: true,
      project: { problem: 'x'.repeat(3000) },
    }).project.problem.length,
    3000,
  );
  for (const invalid of [
    null,
    [],
    { secret: 'fixture' },
    { problem: 42 },
    { problem: null },
    { problem: 'x'.repeat(3001) },
  ])
    assert.equal(
      validateMentorInput({ prompt: 'Review this.', attachProject: true, project: invalid }),
      null,
    );
  assert.equal(
    validateMentorInput({
      prompt: 'Review this.',
      attachProject: true,
      project: Object.fromEntries(projectFields.map((field) => [field, 'x'.repeat(3000)])),
    }),
    null,
  );
});

test('history accepts only six completed exchanges, trims both sides, and preserves order', () => {
  const history = Array.from({ length: 6 }, (_, index) => ({
    question: `  Question ${index}  `,
    answer: `  Answer ${index}  `,
  }));
  assert.deepEqual(
    validateMentorInput({ prompt: 'Continue.', history }).history,
    history.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() })),
  );
  assert.equal(
    validateMentorInput({ prompt: 'Continue.', history: [...history, history[0]] }),
    null,
  );
  const maximumTurn = { question: 'q'.repeat(2000), answer: 'a'.repeat(2000) };
  assert.ok(validateMentorInput({ prompt: 'Continue.', history: Array(6).fill(maximumTurn) }));
});

test('history rejects partial, pending, role-forged, null, and oversized exchanges', () => {
  for (const history of [null, {}, 'past conversation'])
    assert.equal(validateMentorInput({ prompt: 'Continue.', history }), null);
  for (const turn of [
    null,
    [],
    {},
    { question: 'q' },
    { answer: 'a' },
    { question: ' ', answer: 'a' },
    { question: 'q', answer: '' },
    { question: 1, answer: 'a' },
    { question: 'q', answer: null },
    { question: 'q'.repeat(2001), answer: 'a' },
    { question: 'q', answer: 'a'.repeat(2001) },
    { question: 'q', answer: 'a', role: 'system' },
    { question: 'q', answer: 'a', pending: true },
    { question: 'q', answer: 'a', evidenceId: 'untrusted' },
  ])
    assert.equal(validateMentorInput({ prompt: 'Continue.', history: [turn] }), null);
});

test('focus remains optional and permits only the established five values', () => {
  for (const focus of ['problem', 'evidence', 'scope', 'validation', 'pitch'])
    assert.equal(validateMentorInput({ prompt: 'Help me.', focus }).focus, focus);
  for (const focus of [null, '', 'chat', 'system', 0, []])
    assert.equal(validateMentorInput({ prompt: 'Help me.', focus }), null);
});

test('answer and progressive-hint intent normalize explicitly without accepting ambiguous levels', () => {
  assert.deepEqual(validateMentorInput({ prompt: 'Help me.', intent: 'hint' }), {
    prompt: 'Help me.',
    intent: 'hint',
    hintLevel: 1,
  });
  for (const hintLevel of [1, 2, 3])
    assert.equal(
      validateMentorInput({ prompt: 'Help me.', intent: 'hint', hintLevel }).hintLevel,
      hintLevel,
    );
  for (const hintLevel of [null, 0, 4, -1, 1.5, '1', true])
    assert.equal(validateMentorInput({ prompt: 'Help me.', intent: 'hint', hintLevel }), null);
  for (const intent of [null, '', 'explain', false, 1])
    assert.equal(validateMentorInput({ prompt: 'Help me.', intent }), null);
  assert.equal(validateMentorInput({ prompt: 'Help me.', intent: 'answer', hintLevel: 1 }), null);
  assert.equal(validateMentorInput({ prompt: 'Help me.', hintLevel: 1 }), null);
  assert.deepEqual(validateMentorInput({ prompt: 'Help me.', intent: 'answer' }), {
    prompt: 'Help me.',
    intent: 'answer',
  });
});

test('the whole normalized input budget applies even when every turn and notebook field is individually valid', () => {
  const request = {
    prompt: 'p',
    attachProject: true,
    project: {
      problem: 'p'.repeat(3000),
      targetUser: 'u'.repeat(3000),
      painPoints: 'x'.repeat(1000),
      description: '',
    },
    history: Array(6).fill({ question: 'q'.repeat(2000), answer: 'a'.repeat(2000) }),
  };
  const normalized = validateMentorInput(request);
  assert.ok(normalized);
  const remaining = 32000 - JSON.stringify(normalized).length;
  assert.ok(remaining > 0 && remaining < 3000);
  request.project.description = 'd'.repeat(remaining);
  const boundary = validateMentorInput(request);
  assert.ok(boundary);
  assert.equal(JSON.stringify(boundary).length, 32000);
  request.project.description += 'd';
  assert.ok(JSON.stringify(request.project).length < 45000);
  assert.equal(validateMentorInput(request), null);
});

test('the model contract separates completed history from current input and never interpolates user content into system instructions', () => {
  const input = validateMentorInput({
    prompt: 'CURRENT_UNTRUSTED_QUESTION',
    intent: 'hint',
    hintLevel: 2,
    history: [{ question: 'PRIOR_UNTRUSTED_QUESTION', answer: 'PRIOR_UNTRUSTED_ANSWER' }],
    attachProject: true,
    project: { problem: 'PRIVATE_ATTACHED_NOTE' },
  });
  const contract = mentorModelContract(input);
  const baseline = mentorModelContract(validateMentorInput({ prompt: 'A plain question.' }));
  assert.equal(contract.instructions, baseline.instructions);
  assert.deepEqual(contract.history, input.history);
  assert.deepEqual(contract.input, {
    prompt: input.prompt,
    intent: 'hint',
    hintLevel: 2,
    attachProject: true,
    project: { problem: 'PRIVATE_ATTACHED_NOTE' },
  });
  assert.equal(Object.hasOwn(contract.input, 'history'), false);
  for (const marker of [
    'CURRENT_UNTRUSTED_QUESTION',
    'PRIOR_UNTRUSTED_QUESTION',
    'PRIOR_UNTRUSTED_ANSWER',
    'PRIVATE_ATTACHED_NOTE',
  ]) {
    assert.equal(contract.instructions.includes(marker), false);
    assert.equal(JSON.stringify([contract.history, contract.input]).split(marker).length - 1, 1);
  }
  assert.deepEqual(baseline.history, []);
  assert.equal(Object.hasOwn(baseline.input, 'project'), false);
});

test('strict model schema requires the four string fields while allowing irrelevant advice to be empty', () => {
  const { schema } = mentorModelContract(validateMentorInput({ prompt: 'What is a variable?' }));
  assert.deepEqual(schema.required, fields);
  assert.deepEqual(Object.keys(schema.properties), fields);
  assert.equal(schema.additionalProperties, false);
  for (const field of fields) {
    assert.equal(schema.properties[field].type, 'string');
    assert.equal(schema.properties[field].maxLength, 2000);
    assert.equal(schema.properties[field].minLength, field === 'message' ? 1 : 0);
  }
  assert.deepEqual(
    parseModelOutput(envelope({ ...reply, message: '  A natural answer.  ', challenge: ' ' })),
    {
      mode: 'live',
      message: 'A natural answer.',
      challenge: '',
      evidencePrompt: '',
      nextAction: '',
    },
  );
});

test('every output field remains required and typed; only the answer must be nonempty', () => {
  assert.deepEqual(parseModelOutput(envelope(reply)), { mode: 'live', ...reply });
  for (const field of fields) {
    const missing = { ...reply };
    delete missing[field];
    assert.equal(parseModelOutput(envelope(missing)), null, `missing ${field}`);
    for (const value of [null, 1, false, [], {}])
      assert.equal(parseModelOutput(envelope({ ...reply, [field]: value })), null, field);
  }
  for (const message of ['', ' \t\n '])
    assert.equal(parseModelOutput(envelope({ ...reply, message })), null);
  for (const extra of [{ mode: 'live' }, { reason: 'extra' }, { ignored: true }])
    assert.equal(parseModelOutput(envelope({ ...reply, ...extra })), null);
});

test('each reply field accepts 2000 characters and rejects 2001', () => {
  for (const field of fields) {
    assert.ok(parseModelOutput(envelope({ ...reply, [field]: 'x'.repeat(2000) })));
    assert.equal(parseModelOutput(envelope({ ...reply, [field]: 'x'.repeat(2001) })), null);
  }
});

test('failed, truncated, refused, or malformed provider output never becomes a live mentor answer', () => {
  for (const status of [undefined, 'incomplete', 'failed', 'cancelled', 'in_progress'])
    assert.equal(parseModelOutput({ ...envelope(reply), status }), null);
  assert.equal(parseModelOutput({ ...envelope(reply), error: { code: 500 } }), null);
  const refused = envelope(reply);
  refused.output[0].content.push({ type: 'refusal', refusal: 'No.' });
  assert.equal(parseModelOutput(refused), null);
  const truncated = envelope(reply);
  truncated.output[0].status = 'incomplete';
  assert.equal(parseModelOutput(truncated), null);
  assert.equal(
    parseModelOutput({
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: '{' }] }],
    }),
    null,
  );
  for (const value of [null, [], 'plain text'])
    assert.equal(parseModelOutput(envelope(value)), null);
});
