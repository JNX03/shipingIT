import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectLibrary, PROJECT_LIBRARY_KEY } from './create-project-library';
import {
  emptyProjectLibrary,
  parseProjectLibrary,
  projectDefinitions,
  selectLibraryProject,
} from './project-library-model';
import { createCampusCompassDraft, planCampusTrip } from './templates/map/logic';
import { mapActionIds, mapPieceIds } from './templates/map/types';
import { chooseStudyExercise, createStudyBuddyDraft } from './templates/study/model';

function fixture(initial: string | null = null) {
  const values = new Map<string, string>([
    ['shipingit:adventure:v1', 'original Lunch Lens bytes'],
    ['shipaton-nextgen:learning-state:v1', 'original Notebook and lesson bytes'],
  ]);
  if (initial) values.set(PROJECT_LIBRARY_KEY, initial);
  const reads: string[] = [],
    writes: string[] = [];
  const storage = {
    getItem: async (key: string) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem: async (key: string, value: string) => {
      writes.push(key);
      values.set(key, value);
    },
  };
  return { values, reads, writes, storage, library: createProjectLibrary(storage) };
}

test('the library names three different apps and never creates a second Lunch Lens draft', () => {
  assert.deepEqual(
    projectDefinitions.map((project) => project.id),
    ['lunch', 'map', 'study'],
  );
  const state = emptyProjectLibrary();
  assert.equal(state.selected, 'lunch');
  assert.deepEqual(Object.keys(state.drafts), ['map', 'study']);
  const map = selectLibraryProject(state, 'map');
  assert.equal(map.drafts.map?.templateId, 'map');
  assert.equal(map.drafts.study, null);
  const study = selectLibraryProject(map, 'study');
  assert.equal(study.drafts.study?.exerciseId, 'equation');
  assert.deepEqual(study.drafts.map, map.drafts.map);
  assert.equal(state.drafts.map, null);
});

test('cold reopening preserves both builders, route behavior, selected app and every foreign save byte', async () => {
  const f = fixture();
  await f.library.hydrate();
  assert.equal(f.writes.length, 0);
  assert.equal(f.library.select('map'), true);
  const map = createCampusCompassDraft();
  map.pieces = [...mapPieceIds];
  map.connections = [...mapActionIds];
  map.defaultTrip.preference = 'step-free';
  f.library.saveMap(map);
  const study = chooseStudyExercise(createStudyBuddyDraft(), 'array');
  study.goal = 'debug';
  study.learnerContext = 'My private learning context';
  f.library.select('study');
  f.library.saveStudy(study);
  assert.equal(await f.library.flush(), true);
  const reopened = createProjectLibrary(f.storage);
  await reopened.hydrate();
  const saved = reopened.getSnapshot().data;
  assert.equal(saved.selected, 'study');
  assert.deepEqual(saved.drafts.study, study);
  assert.deepEqual(saved.drafts.map, map);
  assert.equal(planCampusTrip(saved.drafts.map!).route?.stairFlights, 0);
  assert.equal(planCampusTrip(saved.drafts.map!).route?.meters, 345);
  assert.equal(saved.drafts.study?.expectedAnswer, 'undefined');
  assert.equal(f.values.get('shipingit:adventure:v1'), 'original Lunch Lens bytes');
  assert.equal(
    f.values.get('shipaton-nextgen:learning-state:v1'),
    'original Notebook and lesson bytes',
  );
  assert.ok(f.reads.every((key) => key === PROJECT_LIBRARY_KEY));
  assert.ok(f.writes.every((key) => key === PROJECT_LIBRARY_KEY));
});

test('known schemas normalize each draft independently and discard session/consent/award fields', () => {
  const parsed = parseProjectLibrary(
    JSON.stringify({
      version: 1,
      selected: 'unknown',
      drafts: {
        map: { version: 1, pieces: ['map', 'map', 'unknown'], completed: true },
        study: {
          version: 1,
          question: 'q'.repeat(2000),
          expectedAnswer: 'a'.repeat(500),
          remoteConsent: true,
          history: ['private conversation'],
          hints: ['one', 'two', 'three'],
        },
        lunch: { completed: ['launch'], xp: 100000 },
      },
      xp: 500000,
    }),
  );
  assert.equal(parsed.blocked, false);
  assert.equal(parsed.data.selected, 'lunch');
  assert.deepEqual(parsed.data.drafts.map?.pieces, ['map']);
  assert.equal(parsed.data.drafts.study?.question.length, 1200);
  assert.equal(parsed.data.drafts.study?.expectedAnswer.length, 120);
  const serialized = JSON.stringify(parsed.data);
  assert.doesNotMatch(serialized, /"(?:remoteConsent|history|completed|xp|launch)":/);
});

test('future envelope or nested-draft versions never overwrite the original library', async () => {
  for (const source of [
    { version: 2, selected: 'study', important: 'future choices' },
    { version: 1, selected: 'map', drafts: { map: { version: 2, important: 'future map' } } },
    { version: 1, selected: 'study', drafts: { study: { version: 3 } } },
  ]) {
    const original = JSON.stringify(source);
    const f = fixture(original);
    await f.library.hydrate();
    assert.equal(f.library.getSnapshot().readBlocked, true);
    assert.equal(f.library.select('map'), false);
    assert.equal(await f.library.retry(), false);
    assert.equal(f.values.get(PROJECT_LIBRARY_KEY), original);
    assert.equal(f.writes.length, 0);
  }
});

test('unhydrated mutations and failed reads cannot replace an unread saved project', async () => {
  const f = fixture();
  assert.equal(f.library.select('study'), false);
  assert.equal(f.library.saveStudy(createStudyBuddyDraft()), false);
  assert.equal(f.writes.length, 0);
  let fail = true;
  const library = createProjectLibrary({
    ...f.storage,
    getItem: async (key) => {
      if (fail) throw new Error('device busy');
      return f.storage.getItem(key);
    },
  });
  await library.hydrate();
  assert.equal(library.select('map'), false);
  assert.equal(library.getSnapshot().readBlocked, true);
  fail = false;
  assert.equal(await library.retry(), true);
  assert.equal(library.select('map'), true);
  await library.flush();
  assert.equal(f.writes.length, 1);
});

test('write failures retain the latest independent drafts and retry saves that latest snapshot', async () => {
  const f = fixture();
  let fail = true;
  const library = createProjectLibrary({
    ...f.storage,
    setItem: async (key, value) => {
      if (fail) throw new Error('storage unavailable');
      return f.storage.setItem(key, value);
    },
  });
  await library.hydrate();
  library.select('study');
  const draft = createStudyBuddyDraft();
  draft.appName = 'My personal study app';
  library.saveStudy(draft);
  assert.equal(await library.flush(), false);
  assert.equal(library.getSnapshot().data.drafts.study?.appName, draft.appName);
  assert.ok(library.getSnapshot().error);
  fail = false;
  assert.equal(await library.retry(), true);
  const reopened = createProjectLibrary(f.storage);
  await reopened.hydrate();
  assert.equal(reopened.getSnapshot().data.drafts.study?.appName, draft.appName);
});

test('serialized writes drain newer edits and draft inputs are not retained by reference', async () => {
  const f = fixture();
  let release!: () => void;
  let first = true;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const library = createProjectLibrary({
    ...f.storage,
    setItem: async (key, value) => {
      if (first) {
        first = false;
        await held;
      }
      await f.storage.setItem(key, value);
    },
  });
  await library.hydrate();
  library.select('map');
  const flushing = library.flush();
  const study = createStudyBuddyDraft();
  study.appName = 'Newest study choices';
  library.saveStudy(study);
  study.appName = 'External mutation';
  release();
  assert.equal(await flushing, true);
  const reopened = createProjectLibrary(f.storage);
  await reopened.hydrate();
  assert.equal(reopened.getSnapshot().data.drafts.study?.appName, 'Newest study choices');
  assert.equal(reopened.getSnapshot().data.selected, 'map');
});
