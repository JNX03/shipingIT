import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { getLesson, lessons, missions } from '../data/curriculum';
import {
  getStoryForContent,
  storyChapters,
  storyChallengeIds,
  storyLessonIds,
} from '../data/storybook';
import { createInitialState, getLessonState } from '../domain/progression';
import { createAppStore, persistedSnapshot, STORAGE_KEY } from '../store/createAppStore';
import { challengeCatalog, isChallengeUnlocked } from './challenges/catalog';
import { createAdventureStore, adventureSnapshot } from './create-adventure-store';
import { mixedPathNodes, mixedPathUnits, mixedReferenceKey } from './mixed-path';
import {
  mixedCurrentNode,
  mixedNodeState,
  mixedPathOffset,
  type MixedPathProgress,
} from './mixed-path-state';
import { adventureXP, initialAdventure } from './state';
import { stageIds } from './types';

function emptyProgress(): MixedPathProgress {
  return {
    adventure: initialAdventure(),
    completedLessonIds: [],
    practices: {},
    practicesReady: true,
  };
}
function find(key: string) {
  const node = mixedPathNodes.find((entry) => entry.key === key);
  assert.ok(node, key);
  return node;
}

test('one path contains every existing content reference exactly once, with all stories', () => {
  assert.equal(mixedPathNodes.length, 62);
  assert.equal(new Set(mixedPathNodes.map((entry) => entry.key)).size, 62);
  const refs = mixedPathNodes.map((entry) => mixedReferenceKey(entry.ref));
  assert.deepEqual(
    new Set(refs),
    new Set([
      ...lessons.map((entry) => `lesson:${entry.id}`),
      ...stageIds.map((id) => `adventure:${id}`),
      ...challengeCatalog.map((entry) => `challenge:${entry.id}`),
    ]),
  );
  assert.deepEqual(
    storyLessonIds,
    lessons.map((entry) => entry.id),
  );
  assert.deepEqual(
    storyChallengeIds,
    challengeCatalog.map((entry) => entry.id),
  );
  const stories = mixedPathNodes.map((entry) => {
    const story = getStoryForContent(entry.ref);
    assert.ok(story, `${entry.key} has a same-path and ordinary-entry story`);
    return story.id;
  });
  assert.deepEqual(new Set(stories), new Set(storyChapters.map((chapter) => chapter.id)));
});

test('mixed units preserve the exact ordering of all three original ledgers', () => {
  assert.deepEqual(
    mixedPathNodes.flatMap(({ ref }) => (ref.kind === 'lesson' ? [ref.lessonId] : [])),
    lessons.map((entry) => entry.id),
  );
  assert.deepEqual(
    mixedPathNodes.flatMap(({ ref }) => (ref.kind === 'adventure' ? [ref.stageId] : [])),
    stageIds,
  );
  assert.deepEqual(
    mixedPathNodes.flatMap(({ ref }) => (ref.kind === 'challenge' ? [ref.challengeId] : [])),
    challengeCatalog.map((entry) => entry.id),
  );
  assert.equal(mixedPathUnits.length, missions.length);
  assert.deepEqual(
    mixedPathUnits.map((unit) => unit.id),
    missions.map((mission) => mission.id),
  );
  for (const mission of missions) {
    const unit = mixedPathUnits.find((entry) => entry.id === mission.id)!;
    assert.deepEqual(
      unit.nodes.flatMap(({ ref }) => (ref.kind === 'lesson' ? [ref.lessonId] : [])),
      mission.lessonIds,
    );
  }
});

test('every unit spaces three practices between four lessons, with no practice-only tail', () => {
  assert.equal(mixedPathUnits.length, 8);
  for (const [index, unit] of mixedPathUnits.entries()) {
    const review = unit.nodes.filter(({ ref }) => ref.kind !== 'adventure');
    assert.deepEqual(
      review.map(({ ref }) => ref.kind),
      ['lesson', 'challenge', 'lesson', 'challenge', 'lesson', 'challenge', 'lesson'],
      `${unit.title} has one practice between each pair of lessons`,
    );
    assert.deepEqual(
      unit.nodes.flatMap(({ ref }) => (ref.kind === 'challenge' ? [ref.challengeId] : [])),
      challengeCatalog.slice(index * 3, index * 3 + 3).map((entry) => entry.id),
      `${unit.title} preserves the exact sequential practice block`,
    );
  }
});

test('all lesson prefixes retain their actual lesson gate regardless of games or practice', () => {
  for (let count = 0; count <= lessons.length; count++) {
    const progress = emptyProgress();
    progress.completedLessonIds = lessons.slice(0, count).map((entry) => entry.id);
    for (const lesson of lessons) {
      const state = mixedNodeState(find(`lesson:${lesson.id}`), progress);
      assert.equal(
        state.unlocked,
        getLessonState(lesson.id, progress.completedLessonIds) !== 'locked',
      );
      assert.equal(state.done, progress.completedLessonIds.includes(lesson.id));
    }
  }
});

test('all game and practice prefixes retain their independent gates with no lesson completion', () => {
  for (let count = 0; count <= stageIds.length; count++) {
    const progress = emptyProgress();
    progress.adventure = {
      completed: stageIds.slice(0, count),
      earned: stageIds.slice(0, count),
      started: true,
    };
    stageIds.forEach((id, index) => {
      const state = mixedNodeState(find(`adventure:${id}`), progress);
      assert.equal(state.unlocked, index <= count);
      assert.equal(state.done, index < count);
      if (state.done) assert.equal(state.action, 'Play again');
    });
  }
  for (let count = 0; count <= challengeCatalog.length; count++) {
    const progress = emptyProgress();
    progress.practices = Object.fromEntries(
      challengeCatalog.slice(0, count).map((entry) => [entry.id, '2026-09-29']),
    );
    for (const challenge of challengeCatalog) {
      const state = mixedNodeState(find(`challenge:${challenge.id}`), progress);
      assert.equal(state.unlocked, isChallengeUnlocked(challenge.id, progress.practices));
      assert.equal(state.done, Boolean(progress.practices[challenge.id]));
      if (state.done) assert.equal(state.action, 'Play again');
    }
  }
});

test('locked details name the real missing ledger prerequisite, including older saved gaps', () => {
  const progress = emptyProgress();
  assert.match(mixedNodeState(find('adventure:insight'), progress).detail, /Find the story/);
  assert.equal(
    mixedNodeState(find('lesson:define-1'), progress).detail,
    `Complete “${getLesson('discover-1')!.title}” to unlock this lesson.`,
  );
  assert.match(
    mixedNodeState(find('challenge:explore-workaround'), progress).detail,
    /Ask about the last time/,
  );
  progress.practicesReady = false;
  assert.equal(mixedNodeState(find('challenge:explore-last-time'), progress).unlocked, false);
  assert.match(mixedNodeState(find('challenge:explore-last-time'), progress).detail, /Loading/);
});

test('Continue follows all 62 interleaved steps without introducing a blocked cross-track gate', () => {
  const progress = emptyProgress();
  for (const node of mixedPathNodes) {
    assert.equal(mixedCurrentNode(progress)?.key, node.key);
    assert.equal(mixedNodeState(node, progress).unlocked, true);
    if (node.ref.kind === 'lesson') progress.completedLessonIds.push(node.ref.lessonId);
    else if (node.ref.kind === 'adventure') {
      progress.adventure.completed.push(node.ref.stageId);
      progress.adventure.earned.push(node.ref.stageId);
    } else progress.practices[node.ref.challengeId] = '2026-09-29';
  }
  assert.equal(mixedCurrentNode(progress), undefined);
});

test('captured 150-Spark save projects into the mixed path without writes, reset, or new rewards', async () => {
  const raw = readFileSync(join(__dirname, 'fixtures/adventure-native-20260930.json'), 'utf8');
  let writes = 0;
  const store = createAdventureStore(
    {
      getItem: async () => raw,
      setItem: async () => {
        writes++;
      },
    },
    () => new Date(2026, 8, 30, 12),
  );
  await store.getState().hydrate();
  const before = adventureSnapshot(store.getState());
  const progress = { ...emptyProgress(), adventure: store.getState() };
  assert.equal(mixedCurrentNode(progress)?.key, 'adventure:insight');
  const insight = mixedNodeState(find('adventure:insight'), progress);
  assert.equal(insight.action, 'Rebuild stage');
  assert.match(insight.detail, /Sparks are already saved/);
  assert.equal(mixedNodeState(find('adventure:scope'), progress).unlocked, false);
  assert.equal(mixedNodeState(find('adventure:scope'), progress).action, 'Rebuild stage');
  mixedPathNodes.forEach((node) => {
    mixedNodeState(node, progress);
    getStoryForContent(node.ref);
  });
  await store.getState().flush();
  assert.equal(adventureXP(store.getState()), 150);
  assert.deepEqual(adventureSnapshot(store.getState()), before);
  assert.equal(writes, 0);
});

test('a saved 230-Spark game checkpoint preserves Connect access and catches up the first lesson', () => {
  const progress = emptyProgress();
  progress.adventure = {
    completed: stageIds.slice(0, 4),
    earned: stageIds.slice(0, 4),
    started: true,
  };
  const before = JSON.stringify(progress);
  assert.equal(adventureXP(progress.adventure), 230);
  assert.equal(mixedCurrentNode(progress)?.key, 'lesson:discover-1');
  assert.equal(mixedNodeState(find('adventure:connect'), progress).action, 'Continue +70 Sparks');
  assert.equal(mixedNodeState(find('lesson:discover-1'), progress).unlocked, true);
  assert.equal(JSON.stringify(progress), before);
});

test('the captured five-game 330-Spark checkpoint cannot highlight Ship over its first ready lesson', () => {
  const progress = emptyProgress();
  progress.adventure = {
    completed: stageIds.slice(0, 5),
    earned: stageIds.slice(0, 5),
    started: true,
  };
  const before = JSON.stringify(progress);
  assert.equal(mixedCurrentNode(progress)?.key, 'lesson:discover-1');
  assert.equal(mixedNodeState(find('adventure:launch'), progress).unlocked, true);
  assert.equal(JSON.stringify(progress), before);
});

test('a validated skipped lesson unlocks its successor but is never completed or rewarded', () => {
  const progress = emptyProgress();
  progress.passedLessonIds = ['discover-1'];
  progress.skippedLessonIds = ['discover-1'];
  const skipped = mixedNodeState(find('lesson:discover-1'), progress);
  assert.equal(skipped.done, false);
  assert.equal(skipped.earned, false);
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.unlocked, true);
  assert.match(skipped.detail, /Skipped/);
  assert.equal(mixedNodeState(find('lesson:discover-2'), progress).unlocked, true);
  assert.equal(mixedCurrentNode(progress)?.key, 'adventure:explore');
  assert.deepEqual(progress.completedLessonIds, []);
});

test('an unprojected skip marker cannot hide a ready lesson or unlock its successor', () => {
  const progress = emptyProgress();
  progress.skippedLessonIds = ['discover-1'];
  assert.equal(mixedCurrentNode(progress)?.key, 'lesson:discover-1');
  assert.equal(mixedNodeState(find('lesson:discover-1'), progress).skipped, false);
  assert.equal(mixedNodeState(find('lesson:discover-2'), progress).unlocked, false);
});

test('a saved lesson checkpoint and project remain unchanged when projected or read', async () => {
  const saved = createInitialState();
  saved.completedLessonIds = ['discover-1'];
  saved.xp = lessons[0]!.xp;
  saved.project.name = 'My existing project';
  saved.lessonCompletions = { 'discover-1': { completedAt: '2026-09-29', perfect: true } };
  saved.activityDates = ['2026-09-29'];
  saved.activityLog = { '2026-09-29': ['discover-1'] };
  let writes = 0;
  const store = createAppStore(
    {
      getItem: async (key) => key === STORAGE_KEY ? JSON.stringify(saved) : null,
      setItem: async () => {
        writes++;
      },
    },
    () => new Date(2026, 8, 30, 12),
  );
  await store.getState().hydrate();
  const before = persistedSnapshot(store.getState());
  const progress = {
    ...emptyProgress(),
    completedLessonIds: store.getState().completedLessonIds,
    lessonCompletions: store.getState().lessonCompletions,
  };
  assert.equal(mixedCurrentNode(progress)?.key, 'adventure:explore');
  assert.equal(mixedNodeState(find('lesson:discover-1'), progress).action, 'Practice lesson');
  mixedPathNodes.forEach((node) => mixedNodeState(node, progress));
  await store.getState().flushPersistence();
  assert.deepEqual(persistedSnapshot(store.getState()), before);
  assert.equal(store.getState().project.name, 'My existing project');
  assert.equal(writes, 0);
});

test('Continue catches up unfinished tracks after a later track is complete', () => {
  const progress = emptyProgress();
  progress.adventure = { completed: [...stageIds], earned: [...stageIds], started: true };
  progress.practices = Object.fromEntries(
    challengeCatalog.map((entry) => [entry.id, '2026-09-29']),
  );
  assert.equal(mixedCurrentNode(progress)?.key, 'lesson:discover-1');
  progress.completedLessonIds = lessons.map((entry) => entry.id);
  assert.equal(mixedCurrentNode(progress), undefined);
});

test('narrow and large-text path bends keep the node within its row', () => {
  for (const width of [240, 280, 320, 420]) {
    for (const scale of [1, 1.5, 2, 3]) {
      for (let index = 0; index < 12; index++) {
        assert.ok(Math.abs(mixedPathOffset(index, width, scale)) + 49 <= width / 2);
      }
    }
  }
});

test('legacy course/story routes and view=lessons resolve to the same unswitched path', () => {
  for (const file of ['course.tsx', 'story-preview.tsx']) {
    const route = readFileSync(join(__dirname, '../app', file), 'utf8');
    assert.match(route, /<Redirect href="\/\(tabs\)"/);
    assert.doesNotMatch(route, /view:|LearnScreen/);
  }
  const home = readFileSync(join(__dirname, 'screens/home.tsx'), 'utf8');
  assert.doesNotMatch(
    home,
    /LearnScreen|PathPractice|viewSwitch|useLocalSearchParams|stickyHeaderIndices/,
  );
  assert.match(home, /mixedPathUnits\.map/);
  assert.doesNotMatch(home, /Read story|Read unit story|Read chapter story|<StoryIntro/);
  for (const file of [
    '../screens/lesson/index.tsx',
    'challenges/screen.tsx',
    'screens/stage.tsx',
  ]) {
    const opening = readFileSync(join(__dirname, file), 'utf8');
    assert.match(opening, /<StoryIntro story=\{story\} reference=/);
  }
});
