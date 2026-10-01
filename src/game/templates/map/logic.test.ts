import assert from 'node:assert/strict';
import test from 'node:test';
import { campusPaths, campusPlaces } from './campus-data';
import { campusCompassTemplate } from './contract';
import {
  campusCompassExampleDraft,
  campusDraftSignature,
  campusRouteDirections,
  checkCampusCompassBuild,
  createCampusCompassDraft,
  findCampusRoutes,
  moveMapPiece,
  normalizeCampusCompassDraft,
  planCampusTrip,
  runCampusCompassTest,
} from './logic';
import type { CampusTrip } from './types';

const labTrip: CampusTrip = {
  origin: 'gate',
  destination: 'lab',
  preference: 'fastest',
  landmark: 'library',
};

test('starter requires adding essential pieces and wiring actual actions', () => {
  const starter = createCampusCompassDraft();
  assert.equal(checkCampusCompassBuild(starter).valid, false);
  assert.equal(runCampusCompassTest(starter).passed, false);
  assert.equal(planCampusTrip(starter).route, null);
  assert.equal(checkCampusCompassBuild(campusCompassExampleDraft()).valid, true);
});

test('lab shortcut is shorter and has stairs; the accessible path actually uses the ramp', () => {
  const routes = findCampusRoutes(labTrip);
  const fastest = routes.find((route) => route.preference === 'fastest')!;
  const stepFree = routes.find((route) => route.preference === 'step-free')!;
  assert.deepEqual(fastest.nodes, ['gate', 'quad', 'stairs', 'lab']);
  assert.equal(fastest.stairFlights, 2);
  assert.equal(fastest.meters, 220);
  assert.deepEqual(stepFree.nodes, ['gate', 'quad', 'ramp', 'lab']);
  assert.equal(stepFree.stairFlights, 0);
  assert.equal(stepFree.rampCount, 1);
  assert.equal(stepFree.meters, 345);
  assert.ok(stepFree.minutes > fastest.minutes);
});

test('selecting the no-stairs route changes both map geometry and directions', () => {
  const draft = campusCompassExampleDraft();
  const shortcut = planCampusTrip(draft, labTrip);
  const accessible = planCampusTrip(draft, { ...labTrip, preference: 'step-free' });
  assert.notEqual(shortcut.mapRoute?.id, accessible.mapRoute?.id);
  assert.deepEqual(accessible.mapRoute?.pathIds, ['gate-quad', 'quad-ramp', 'ramp-lab']);
  assert.ok(shortcut.directions.some((step) => step.terrain === 'stairs'));
  assert.ok(accessible.directions.every((step) => step.terrain !== 'stairs'));
  assert.match(accessible.directions.at(-1)!.text, /west entrance/);
});

test('landmark route includes the selected landmark and its real detour', () => {
  const draft = campusCompassExampleDraft();
  const viaLibrary = planCampusTrip(draft, {
    ...labTrip,
    preference: 'landmark',
    landmark: 'library',
  });
  const viaGarden = planCampusTrip(draft, {
    ...labTrip,
    preference: 'landmark',
    landmark: 'garden',
  });
  assert.ok(viaLibrary.route?.nodes.includes('library'));
  assert.ok(viaGarden.route?.nodes.includes('garden'));
  assert.equal(viaLibrary.route?.meters, 525);
  assert.equal(viaGarden.route?.meters, 355);
  assert.notDeepEqual(viaLibrary.route?.pathIds, viaGarden.route?.pathIds);
  assert.equal(viaLibrary.route?.stairFlights, 0);
});

test('the simulated expected-versus-actual lab test passes only for working map and directions', () => {
  const draft = campusCompassExampleDraft();
  const result = runCampusCompassTest(draft);
  assert.equal(result.id, 'can-find-lab-without-stairs');
  assert.equal(result.passed, true);
  assert.equal(result.checks.length, 4);
  assert.ok(result.checks.every((check) => check.expected && check.actual && check.passed));
  for (const connection of draft.connections) {
    const broken = { ...draft, connections: draft.connections.filter((id) => id !== connection) };
    assert.equal(runCampusCompassTest(broken).passed, false, connection);
  }
  for (const piece of ['places', 'routes', 'map', 'directions'] as const) {
    assert.equal(
      runCampusCompassTest({ ...draft, pieces: draft.pieces.filter((id) => id !== piece) }).passed,
      false,
      piece,
    );
  }
});

test('disconnecting a map action leaves route choices available and removes only map output', () => {
  const draft = campusCompassExampleDraft();
  const plan = planCampusTrip({
    ...draft,
    connections: draft.connections.filter((id) => id !== 'draw-route'),
  });
  assert.ok(plan.route);
  assert.equal(plan.mapRoute, null);
  assert.ok(plan.directions.length > 0);
});

test('directions follow the selected route in reverse without a forward-only entrance cue', () => {
  const route = findCampusRoutes({
    ...labTrip,
    origin: 'lab',
    destination: 'gate',
    preference: 'step-free',
  }).find((entry) => entry.preference === 'step-free')!;
  const directions = campusRouteDirections(route, 'landmarks');
  assert.equal(directions[0].from, 'lab');
  assert.equal(directions[0].to, 'ramp');
  assert.match(directions[0].text, /toward Ramp Junction/);
  assert.doesNotMatch(directions[0].text, /to the lab/);
  assert.equal(directions.at(-1)!.to, 'gate');
});

test('all place pairs produce contiguous routes with correct geometry, distance and accessible terrain', () => {
  for (const origin of campusPlaces) {
    for (const destination of campusPlaces) {
      const options = findCampusRoutes({
        ...labTrip,
        origin: origin.id,
        destination: destination.id,
      });
      for (const route of options) {
        assert.equal(route.nodes[0], origin.id);
        assert.equal(route.nodes.at(-1), destination.id);
        assert.equal(route.pathIds.length, route.nodes.length - 1);
        let distance = 0;
        for (const [index, id] of route.pathIds.entries()) {
          const path = campusPaths.find((entry) => entry.id === id)!;
          assert.ok(path);
          assert.ok(
            (path.from === route.nodes[index] && path.to === route.nodes[index + 1]) ||
              (path.to === route.nodes[index] && path.from === route.nodes[index + 1]),
          );
          if (route.preference !== 'fastest') assert.notEqual(path.terrain, 'stairs');
          distance += path.meters;
        }
        assert.equal(route.meters, distance);
      }
      assert.ok(options.some((route) => route.preference === 'step-free'));
    }
  }
});

test('same-place trips report already there instead of inventing a route or detour', () => {
  const draft = campusCompassExampleDraft();
  const plan = planCampusTrip(draft, { ...labTrip, origin: 'lab', destination: 'lab' });
  assert.equal(plan.route?.meters, 0);
  assert.equal(plan.route?.minutes, 0);
  assert.equal(plan.directions.length, 0);
  assert.match(plan.message, /already at Science Lab/);
  assert.equal(
    plan.options.some((route) => route.preference === 'landmark'),
    false,
  );
  assert.equal(checkCampusCompassBuild({ ...draft, defaultTrip: plan.trip }).valid, false);
});

test('direction style changes real displayed text and preserves the selected geometry', () => {
  const draft = campusCompassExampleDraft();
  const detailed = planCampusTrip(draft);
  const compact = planCampusTrip({ ...draft, style: { ...draft.style, directions: 'compact' } });
  assert.equal(detailed.route?.id, compact.route?.id);
  assert.ok(detailed.directions[0].text.length > compact.directions[0].text.length);
  assert.ok(compact.directions.some((step) => step.text.includes('stairs')));
});

test('screen ordering is immutable, bounded and invalidates prior test signature', () => {
  const draft = campusCompassExampleDraft();
  const before = campusDraftSignature(draft);
  const moved = moveMapPiece(draft, 'map', -1);
  assert.equal(draft.pieces[2], 'map');
  assert.equal(moved.pieces[1], 'map');
  assert.notEqual(campusDraftSignature(moved), before);
  assert.equal(moveMapPiece(draft, 'places', -1), draft);
  assert.equal(moveMapPiece(draft, 'landmarks', 1), draft);
});

test('persisted config round-trips and rejects invalid fields and duplicate pieces', () => {
  const draft = campusCompassExampleDraft();
  assert.deepEqual(normalizeCampusCompassDraft(JSON.parse(JSON.stringify(draft))), draft);
  const normalized = normalizeCampusCompassDraft({
    pieces: ['map', 'map', 'queue', 'directions'],
    connections: ['draw-route', 'book-table'],
    style: { accent: 'broken', labels: 'unknown' },
    defaultTrip: { origin: 'unknown', destination: null },
  });
  assert.deepEqual(normalized.pieces, ['map', 'directions']);
  assert.deepEqual(normalized.connections, ['draw-route']);
  assert.equal(normalized.defaultTrip.origin, 'gate');
  assert.equal(normalized.defaultTrip.destination, 'lab');
  assert.equal(normalized.style.accent, 'forest');
  assert.deepEqual(normalizeCampusCompassDraft(null), createCampusCompassDraft());
});

test('registry contract exposes map-specific local behavior and serializable config', () => {
  assert.equal(campusCompassTemplate.id, 'map');
  assert.equal(campusCompassTemplate.name, 'CampusCompass');
  assert.match(campusCompassTemplate.dataLabel, /Fictional/);
  assert.doesNotThrow(() => JSON.stringify(campusCompassTemplate.createConfig()));
  assert.equal(campusCompassTemplate.runTest(campusCompassExampleDraft()).passed, true);
});
