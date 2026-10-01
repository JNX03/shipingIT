import assert from 'node:assert/strict';
import test from 'node:test';
import { getStoryForContent, storyChapters } from '../data/storybook';
import { mixedPathNodes } from '../game/mixed-path';
import {
  activityStoryContext,
  activityStoryMoments,
  conversationLayout,
  storyReferenceKey,
} from './story-conversation';
import { getLesson } from '../data/curriculum';

test('all 138 authored beats remain reachable through their real 62 activities, with no chapter viewer', () => {
  const reached = new Set<string>();
  const dialogue = new Set<string>();
  for (const node of mixedPathNodes) {
    const chapter = getStoryForContent(node.ref)!;
    const before = JSON.stringify(chapter);
    const moments = activityStoryMoments(chapter, node.ref);
    assert.ok(moments.length, node.key);
    for (const moment of moments) {
      const beat = chapter.beats[moment.index]!;
      assert.equal(storyReferenceKey(beat.ref), node.key);
      assert.equal(moment.title, beat.title);
      assert.equal(moment.text, beat.text);
      reached.add(moment.key);
      if (moment.dialogue) {
        assert.deepEqual(moment.dialogue, chapter.conversation[moment.index]);
        dialogue.add(`${chapter.id}:${moment.index}`);
      }
    }
    assert.equal(JSON.stringify(chapter), before);
  }
  assert.equal(reached.size, 138);
  for (const chapter of storyChapters) {
    chapter.beats.forEach((_, index) => assert.ok(reached.has(`${chapter.id}:${index}`)));
    chapter.conversation.forEach((_, index) => assert.ok(dialogue.has(`${chapter.id}:${index}`)));
    assert.deepEqual(activityStoryMoments(chapter), []);
  }
});

test('one core game receives its own objective while a six-moment practice receives all its authored context', () => {
  const gameRef = { kind: 'adventure' as const, stageId: 'insight' as const };
  const game = activityStoryMoments(getStoryForContent(gameRef)!, gameRef);
  assert.equal(game.length, 1);
  assert.equal(game[0]!.title, 'Build the reason');
  const practiceRef = { kind: 'challenge' as const, challengeId: 'explore-last-time' };
  const practice = activityStoryMoments(getStoryForContent(practiceRef)!, practiceRef);
  assert.equal(practice.length, 6);
  assert.deepEqual(
    practice.map((moment) => moment.index),
    [0, 1, 2, 3, 4, 5],
  );
});

test('every chapter setup and ending is shown in its first/last real activity and mission context stays exact', () => {
  for (const chapter of storyChapters) {
    const first = chapter.beats[0].ref;
    const last = chapter.beats[5].ref;
    assert.equal(getStoryForContent(first)?.id, chapter.id);
    assert.equal(getStoryForContent(last)?.id, chapter.id);
    const setup = activityStoryContext(chapter, first);
    assert.equal(setup.opening, chapter.opening);
    assert.equal(setup.stakes, chapter.stakes);
    const closing = activityStoryContext(chapter, last);
    assert.equal(closing.ending, chapter.ending);
    assert.equal(closing.nextQuestion, chapter.nextQuestion);
    if (chapter.missionId) {
      for (const { ref } of chapter.beats) {
        assert.equal(ref.kind, 'lesson');
        if (ref.kind === 'lesson')
          assert.equal(getLesson(ref.lessonId)?.missionId, chapter.missionId);
      }
    }
  }
});

test('narrow and large-text conversation layout reserves readable space without fixed bubble heights', () => {
  assert.equal(conversationLayout(320, 1).avatarSize, 42);
  assert.equal(conversationLayout(390, 1).avatarSize, 56);
  assert.equal(conversationLayout(390, 1.5).avatarSize, 42);
  assert.equal(conversationLayout(320, 2).stacked, true);
  assert.equal(conversationLayout(1024, 3).stacked, true);
});
