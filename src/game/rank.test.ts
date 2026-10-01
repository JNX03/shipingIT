import assert from 'node:assert/strict';
import test from 'node:test';
import { builderRank } from './rank';

test('personal rank starts at one and advances at every 100 lifetime earned Sparks', () => {
  for (const [earned, level, towardNext, remaining] of [
    [0, 1, 0, 100],
    [99, 1, 99, 1],
    [100, 2, 0, 100],
    [330, 4, 30, 70],
    [400, 5, 0, 100],
    [845, 9, 45, 55],
  ]) {
    const rank = builderRank(earned!);
    assert.equal(rank.level, level);
    assert.equal(rank.towardNext, towardNext);
    assert.equal(rank.remaining, remaining);
    assert.equal(rank.nextLevel, level! + 1);
  }
});

test('invalid numeric totals display level one rather than an invalid rank', () => {
  for (const invalid of [NaN, Infinity, -40]) {
    assert.deepEqual(builderRank(invalid), builderRank(0));
  }
  assert.equal(builderRank(330.9).earned, 330);
});
