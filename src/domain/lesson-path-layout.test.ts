import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lessonPathNodeAreaHeight,
  lessonPopoverScrollTarget,
  lessonStoryScrollTarget,
} from './lesson-path-layout';

test('each checkpoint or lesson row reserves the entire short callout before the inline story', () => {
  assert.equal(lessonPathNodeAreaHeight(null), 570);
  for (const row of [0, 1, 2, 3, 4]) {
    for (const measuredPopoverHeight of [180, 240, 400]) {
      const nodeAreaHeight = lessonPathNodeAreaHeight(row, measuredPopoverHeight);
      assert.ok(nodeAreaHeight >= 570);
      assert.ok(nodeAreaHeight >= 122 + row * 100 + measuredPopoverHeight + 20);
    }
  }
});

test('a desktop viewport keeps a locked callout below a tall sticky intro', () => {
  const sectionTop = 0;
  const bannerHeight = 199;
  const popoverHeight = 210;
  const viewportHeight = 565;
  const row = 1;
  const y = lessonPopoverScrollTarget({
    sectionTop,
    bannerHeight,
    popoverHeight,
    viewportHeight,
    row,
  });
  const visiblePopoverTop = sectionTop + bannerHeight + 122 + row * 100 - y;
  assert.ok(visiblePopoverTop >= bannerHeight + 8);
  assert.ok(visiblePopoverTop + popoverHeight <= viewportHeight - 16);
});

test('short mobile windows keep the title below the banner and leave the action scrollable', () => {
  const bannerHeight = 190;
  const popoverHeight = 250;
  const row = 4;
  const y = lessonPopoverScrollTarget({
    sectionTop: 700,
    bannerHeight,
    popoverHeight,
    viewportHeight: 360,
    row,
  });
  const visiblePopoverTop = 700 + bannerHeight + 122 + row * 100 - y;
  assert.equal(visiblePopoverTop, bannerHeight + 8);
  assert.ok(lessonPathNodeAreaHeight(row, popoverHeight) > 122 + row * 100 + popoverHeight);
});

test('explicit inline story reveal scrolls the banner away and keeps its heading visible', () => {
  const sectionTop = 676;
  const bannerHeight = 199;
  const nodeAreaHeight = lessonPathNodeAreaHeight(4, 240);
  const storyTop = sectionTop + bannerHeight + nodeAreaHeight;
  const y = lessonStoryScrollTarget(sectionTop, nodeAreaHeight, bannerHeight);
  assert.equal(storyTop - y, 8);
});

test('a short embedded lesson can show its callout after the mission introduction scrolls away', () => {
  const sectionTop = 676;
  const bannerHeight = 199;
  const popoverHeight = 250;
  const row = 4;
  const y = lessonPopoverScrollTarget({
    sectionTop,
    bannerHeight,
    popoverHeight,
    viewportHeight: 180,
    row,
    stickyBanner: false,
  });
  assert.equal(sectionTop + bannerHeight + 122 + row * 100 - y, 8);
});
