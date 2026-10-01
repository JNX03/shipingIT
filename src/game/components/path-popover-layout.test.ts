import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import type { AdventureState } from '../state';
import { adventurePathAction } from './path-action';
import { pathPopoverLayout } from './path-popover-layout';

test('a lower visible node places the whole callout above it within Android safe bounds', () => {
  const anchor = { x: 102, y: 470, width: 76, height: 72 };
  const result = pathPopoverLayout({
    anchor,
    width: 360,
    height: 640,
    safeTop: 24,
    safeBottom: 24,
    cardHeight: 220,
  });
  assert.equal(result.arrowEdge, 'bottom');
  assert.equal(result.top, 238);
  assert.ok(result.top >= 40);
  assert.ok(result.top + 220 <= 600);
  assert.equal(result.left + result.arrowLeft + 8, anchor.x + anchor.width / 2);
});

test('an upper visible node places its callout below and keeps the path position fixed', () => {
  const anchor = { x: 130, y: 170, width: 76, height: 72 };
  const result = pathPopoverLayout({
    anchor,
    width: 360,
    height: 640,
    safeTop: 24,
    safeBottom: 24,
    cardHeight: 220,
  });
  assert.equal(result.arrowEdge, 'top');
  assert.equal(result.top, 254);
  assert.equal(result.width, 328);
});

test('large copy is constrained to the larger visible region and can scroll to its action', () => {
  const result = pathPopoverLayout({
    anchor: { x: 180, y: 300, width: 76, height: 72 },
    width: 360,
    height: 640,
    safeTop: 24,
    safeBottom: 24,
    cardHeight: 700,
  });
  assert.equal(result.arrowEdge, 'bottom');
  assert.equal(result.maxHeight, 248);
  assert.equal(result.top, 40);
  assert.equal(result.left, 16);
  assert.ok(result.arrowLeft >= 20 && result.arrowLeft <= result.width - 36);
});

test('narrow and wide windows clamp card width and arrow independently of the path bend', () => {
  for (const width of [320, 360, 800]) {
    const result = pathPopoverLayout({
      anchor: { x: width - 100, y: 180, width: 76, height: 72 },
      width,
      height: 640,
      safeTop: 24,
      safeBottom: 24,
      cardHeight: 210,
    });
    assert.ok(result.left >= 16);
    assert.ok(result.left + result.width <= width - 16);
    assert.ok(result.width <= 440);
    assert.ok(result.arrowLeft >= 20 && result.arrowLeft <= result.width - 36);
  }
});

test('captured150-Spark draft never advertises new Insight or Scope rewards', () => {
  const captured = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/adventure-native-20260930.json'), 'utf8'),
  ) as AdventureState;
  assert.equal(adventurePathAction('explore', captured), 'Play again');
  assert.equal(adventurePathAction('insight', captured), 'Rebuild stage');
  assert.equal(adventurePathAction('scope', captured), 'Rebuild stage');
  assert.equal(adventurePathAction('design', captured), 'Continue +80 Sparks');
  assert.equal(
    adventurePathAction('explore', { completed: [], earned: [], started: false }),
    'Start +60 Sparks',
  );
});
