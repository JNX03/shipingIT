import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOfflineAction as act,
  createOfflineRescue,
  offlineGoalMet,
  offlineReportLabel,
} from './offline-rescue-model';

test('offline rescue preserves cache and age; reconnect alone cannot claim a fresh report', () => {
  let state = createOfflineRescue();
  state = act(state, 'load');
  assert.equal(state.request, 'offline');
  assert.equal(state.cache?.age, 8);
  assert.equal(offlineGoalMet(state), false);
  state = act(state, 'show-cache');
  assert.equal(offlineGoalMet(state), true);
  assert.match(offlineReportLabel(state), /8 simulated minutes/);
  state = act(state, 'toggle-connection');
  assert.equal(state.view, 'cached');
  assert.equal(state.cache?.age, 8);
  state = act(state, 'wait');
  assert.equal(state.cache?.age, 13);
  assert.match(offlineReportLabel(state), /13 simulated minutes/);
});
test('no cache never fabricates data and needs a successful retry to meet the goal', () => {
  let state = act(createOfflineRescue('empty-cache'), 'show-cache');
  assert.equal(state.cache, null);
  assert.equal(state.view, 'empty');
  state = act(state, 'load');
  assert.equal(state.cache, null);
  assert.equal(offlineGoalMet(state), false);
  state = act(state, 'toggle-connection');
  assert.equal(state.cache, null);
  state = act(state, 'load');
  assert.equal(state.request, 'success');
  assert.equal(state.cache?.age, 0);
  assert.equal(offlineGoalMet(state), true);
});
test('old cache survives failed connected retry; only successful response updates route and age', () => {
  let state = act(createOfflineRescue('stale-retry'), 'load');
  state = act(state, 'show-cache');
  const cached = state.cache;
  state = act(state, 'toggle-connection');
  state = act(state, 'load');
  assert.equal(state.request, 'failed');
  assert.equal(state.cache, cached);
  assert.equal(state.cache?.age, 40);
  assert.equal(offlineGoalMet(state), false);
  state = act(state, 'load');
  assert.equal(state.attempts, 2);
  assert.equal(state.cache?.age, 0);
  assert.match(state.cache!.route, /Covered path/);
  assert.equal(offlineGoalMet(state), true);
  state = act(state, 'toggle-connection');
  state = act(state, 'load');
  assert.equal(state.cache?.age, 0);
  assert.match(state.cache!.route, /Covered path/);
  const reset = act(state, 'reset');
  assert.equal(reset.attempts, 0);
  assert.equal(reset.cache?.age, 40);
  assert.equal(offlineGoalMet(reset), false);
});
