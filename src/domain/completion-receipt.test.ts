import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  issueCompletionReceipt,
  readCompletionReceipt,
  revokeCompletionReceipt,
} from './completion-receipt';
import type { CompletionResult } from './types';

function successfulResult(): CompletionResult {
  return {
    success: true,
    alreadyCompleted: false,
    xpEarned: 20,
    newAchievements: ['problem-hunter'],
    missionCompleted: null,
  };
}
afterEach(() => revokeCompletionReceipt());

test('receipts snapshot a successful result and require both token and lesson', () => {
  const result = successfulResult();
  const token = issueCompletionReceipt('discover-1', result);
  assert.equal(typeof token, 'string');
  result.xpEarned = 0;
  result.newAchievements.push('pathfinder');
  const receipt = readCompletionReceipt(token, 'discover-1')!;
  assert.equal(receipt.result.xpEarned, 20);
  assert.deepEqual(receipt.result.newAchievements, ['problem-hunter']);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.result), true);
  assert.equal(Object.isFrozen(receipt.result.newAchievements), true);
  assert.equal(readCompletionReceipt(token, 'discover-2'), null);
  assert.equal(readCompletionReceipt([token], 'discover-1'), null);
});

test('new receipt and explicit session reset invalidate prior tokens', () => {
  const first = issueCompletionReceipt('discover-1', successfulResult());
  const second = issueCompletionReceipt('discover-1', successfulResult());
  assert.notEqual(first, second);
  assert.equal(readCompletionReceipt(first, 'discover-1'), null);
  revokeCompletionReceipt(first);
  assert.ok(readCompletionReceipt(second, 'discover-1'));
  revokeCompletionReceipt();
  assert.equal(readCompletionReceipt(second, 'discover-1'), null);
});

test('failed and malformed results issue no receipt and clear previous presentation', () => {
  const invalidResults = [
    { ...successfulResult(), success: false },
    { ...successfulResult(), xpEarned: NaN },
    { ...successfulResult(), xpEarned: -1 },
    { ...successfulResult(), xpEarned: 21 },
    { ...successfulResult(), xpEarned: 1.5 },
    { ...successfulResult(), alreadyCompleted: true },
    { ...successfulResult(), missionCompleted: 8 },
    { ...successfulResult(), newAchievements: [42] },
    { success: true },
    null,
  ];
  for (const result of invalidResults) {
    const previous = issueCompletionReceipt('discover-1', successfulResult());
    assert.equal(issueCompletionReceipt('discover-1', result as CompletionResult), null);
    assert.equal(readCompletionReceipt(previous, 'discover-1'), null);
  }
  assert.equal(issueCompletionReceipt('unknown', successfulResult()), null);
});

test('a successful replay receipt preserves actual zero XP and any newly earned badge', () => {
  const result: CompletionResult = {
    success: true,
    alreadyCompleted: true,
    xpEarned: 0,
    newAchievements: ['first-perfect'],
    missionCompleted: null,
  };
  const token = issueCompletionReceipt('discover-1', result);
  assert.deepEqual(readCompletionReceipt(token, 'discover-1')?.result, result);
});
