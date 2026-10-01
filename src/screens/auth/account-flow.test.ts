import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountFlowReducer as reduce,
  accountIntentMode,
  accountPrimaryIntent,
  initialAccountFlow,
} from './account-flow';

test('public account intent selects the method picker without starting an operation', () => {
  for (const intent of ['signup', 'signin', undefined, 'other', ['signup']]) {
    const flow = initialAccountFlow(accountIntentMode(intent));
    assert.equal(flow.mode, intent === 'signup' ? 'signup' : 'signin');
    assert.equal(flow.step, 'methods');
    assert.equal(accountPrimaryIntent(flow), 'none');
  }
});

test('signup never offers a provider call before email advances to a valid final password', () => {
  let flow = reduce(initialAccountFlow(), { type: 'mode', mode: 'signup' });
  flow = reduce(flow, { type: 'email', value: 'maker@example.com' });
  flow = reduce(flow, { type: 'password', value: 'twelve-chars-demo' });
  assert.equal(accountPrimaryIntent(flow), 'none');
  flow = reduce(flow, { type: 'email-method' });
  assert.equal(accountPrimaryIntent(flow), 'advance');
  flow = reduce(flow, { type: 'next' });
  assert.equal(flow.step, 'password');
  assert.equal(accountPrimaryIntent(flow), 'signup');
  assert.equal(accountPrimaryIntent(flow, true), 'none');
  assert.equal(accountPrimaryIntent(reduce(flow, { type: 'password', value: 'short' })), 'none');
});

test('Back preserves both fields within a flow, while switching intent clears the password', () => {
  let flow = reduce(initialAccountFlow(), { type: 'email-method' });
  flow = reduce(flow, { type: 'email', value: 'maker@example.com' });
  flow = reduce(flow, { type: 'next' });
  flow = reduce(flow, { type: 'password', value: 'typed-secret-demo' });
  const back = reduce(flow, { type: 'back' });
  assert.equal(back.step, 'email');
  assert.equal(back.email, flow.email);
  assert.equal(back.password, flow.password);
  assert.deepEqual(reduce(back, { type: 'next' }), flow);
  const changed = reduce(flow, { type: 'mode', mode: 'signup' });
  assert.equal(changed.email, flow.email);
  assert.equal(changed.password, '');
  assert.equal(changed.step, 'methods');
});

test('invalid email cannot advance or offer reset, including keyboard submission', () => {
  for (const email of ['', 'missing-domain', 'a@b', 'a @example.com']) {
    const flow = { ...initialAccountFlow(), step: 'email' as const, email };
    assert.equal(accountPrimaryIntent(flow), 'none');
    assert.equal(reduce(flow, { type: 'next' }).step, 'email');
    assert.equal(accountPrimaryIntent(reduce(flow, { type: 'reset' })), 'none');
  }
});

test('Back from recovery returns invalid addresses to email entry before password', () => {
  const reset = { ...initialAccountFlow(), step: 'reset' as const, email: '' };
  assert.equal(reduce(reset, { type: 'back' }).step, 'email');
  assert.equal(reduce({ ...reset, email: 'invalid-email' }, { type: 'back' }).step, 'email');
  assert.equal(reduce({ ...reset, email: 'maker@example.com' }, { type: 'back' }).step, 'password');
});

test('verification and reset results appear only after real successful operation outcomes', () => {
  const form = {
    ...initialAccountFlow(),
    mode: 'signup' as const,
    step: 'password' as const,
    email: 'maker@example.com',
    password: 'typed-secret-demo',
  };
  assert.deepEqual(reduce(form, { type: 'result', operation: 'signup', success: false }), form);
  const waiting = reduce(form, {
    type: 'result',
    operation: 'signup',
    success: true,
    pendingVerification: true,
  });
  assert.equal(waiting.step, 'verification');
  assert.equal(waiting.password, '');
  assert.equal(accountPrimaryIntent(waiting), 'none');
  const signIn = reduce(waiting, { type: 'signin-after-message' });
  assert.equal(signIn.mode, 'signin');
  assert.equal(signIn.email, form.email);
  assert.equal(signIn.step, 'email');
  const reset = reduce(signIn, { type: 'reset' });
  assert.equal(accountPrimaryIntent(reset), 'reset');
  assert.equal(reduce(reset, { type: 'result', operation: 'reset', success: false }).step, 'reset');
  assert.equal(
    reduce(reset, { type: 'result', operation: 'reset', success: true }).step,
    'reset-result',
  );
});
