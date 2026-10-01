import assert from 'node:assert/strict';
import test from 'node:test';
import { pathActorVisible, pathUnitTheme, visiblePathUnit } from './path-units';

test('the sticky unit follows actual scroll boundaries in either direction, including overscroll', () => {
  const positions = { 1: 0, 2: 1180, 3: 2340, 4: 3500, 5: 4680, 6: 5700, 7: 6760, 8: 7900 };
  assert.equal(visiblePathUnit(positions, -50), 1);
  assert.equal(visiblePathUnit(positions, 500), 1);
  assert.equal(visiblePathUnit(positions, 1190), 2);
  assert.equal(visiblePathUnit(positions, 3600), 4);
  assert.equal(visiblePathUnit(positions, 8000), 8);
  assert.equal(visiblePathUnit(positions, 6000), 6);
  assert.equal(visiblePathUnit(positions, 0), 1);
  assert.equal(visiblePathUnit({}, 0, 3), 3);
});

test('only actor rows intersecting the actual viewport may run a clock', () => {
  assert.equal(pathActorVisible(undefined, 124, 0, 600), false);
  assert.equal(pathActorVisible(0, 124, 0, 600), true);
  assert.equal(pathActorVisible(900, 124, 0, 600), false);
  assert.equal(pathActorVisible(900, 124, 780, 600), true);
  assert.equal(pathActorVisible(900, 124, 1100, 600), false);
  assert.equal(pathActorVisible(900, 124, 800, 0), false);
});

test('all eight sections use distinct colors with readable white header text', () => {
  const themes = Array.from({ length: 8 }, (_, index) => pathUnitTheme(index + 1));
  assert.equal(new Set(themes.map((theme) => theme.tint)).size, 8);
  assert.equal(new Set(themes.map((theme) => theme.scene)).size, 8);
  assert.equal(themes[6]!.scene, 'circuit-board');
  assert.equal(themes[7]!.scene, 'launch-space');
  for (const { tint, character } of themes) {
    const rgb = tint
      .slice(1)
      .match(/../g)!
      .map((hex) => parseInt(hex, 16) / 255);
    const linear = rgb.map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
    const luminance = linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
    assert.ok(1.05 / (luminance + 0.05) >= 4.5, `${tint} provides white text contrast`);
    assert.ok(['ami', 'mali', 'noa'].includes(character));
  }
});
