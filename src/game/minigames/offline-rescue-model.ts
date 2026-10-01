export const offlineScenarios = [
  {
    id: 'saved-route',
    title: '1. Rescue a saved route',
    age: 8,
    failures: 0,
    goal: 'Lose the connection, load the route, then make the saved route usable with its age visible.',
  },
  {
    id: 'empty-cache',
    title: '2. Nothing saved yet',
    age: null,
    failures: 0,
    goal: 'Expose the empty cache honestly. Restore the connection and retry to obtain a route.',
  },
  {
    id: 'stale-retry',
    title: '3. Old cache, failed retry',
    age: 40,
    failures: 1,
    goal: 'Inspect the old route. Keep it through one failed connected retry, then obtain an updated report.',
  },
] as const;
export type OfflineScenarioId = (typeof offlineScenarios)[number]['id'];
export type OfflineAction = 'load' | 'show-cache' | 'toggle-connection' | 'wait' | 'reset';
export interface OfflineRescueState {
  scenarioId: OfflineScenarioId;
  connected: boolean;
  cache: { route: string; age: number } | null;
  view: 'empty' | 'cached' | 'updated';
  request: 'idle' | 'offline' | 'failed' | 'success';
  attempts: number;
  seenOffline: boolean;
  seenStale: boolean;
  seenFailure: boolean;
  feedback: { expected: string; actual: string };
}
export function createOfflineRescue(
  scenarioId: OfflineScenarioId = 'saved-route',
): OfflineRescueState {
  const scenario = offlineScenarios.find((item) => item.id === scenarioId)!;
  return {
    scenarioId,
    connected: false,
    cache:
      scenario.age === null
        ? null
        : { route: 'East gate → Courtyard → Library', age: scenario.age },
    view: 'empty',
    request: 'idle',
    attempts: 0,
    seenOffline: false,
    seenStale: false,
    seenFailure: false,
    feedback: {
      expected: 'Load the route to inspect what happens without a connection.',
      actual: 'Simulated connection is off. The route has not been opened.',
    },
  };
}
export function applyOfflineAction(
  state: OfflineRescueState,
  action: OfflineAction,
): OfflineRescueState {
  if (action === 'reset') return createOfflineRescue(state.scenarioId);
  if (action === 'toggle-connection')
    return {
      ...state,
      connected: !state.connected,
      feedback: {
        expected: 'Changing connection alone must not claim a refreshed route.',
        actual: state.connected
          ? 'Simulated connection cut. Saved data is retained.'
          : 'Simulated connection restored. The report has not been refreshed; retry when ready.',
      },
    };
  if (action === 'wait')
    return {
      ...state,
      cache: state.cache ? { ...state.cache, age: state.cache.age + 5 } : null,
      view: state.view === 'updated' ? 'cached' : state.view,
      feedback: {
        expected: 'Five simulated minutes pass; a stored report must grow older.',
        actual: state.cache
          ? `Report age is now ${state.cache.age + 5} simulated minutes. No refresh happened.`
          : 'Five simulated minutes passed. There is still no saved route.',
      },
    };
  if (action === 'show-cache')
    return {
      ...state,
      view: state.cache ? 'cached' : 'empty',
      seenStale: state.seenStale || Boolean(state.cache && state.cache.age >= 30),
      feedback: {
        expected: 'Display only data that is actually saved, with its age.',
        actual: state.cache
          ? `Saved route opened: checked ${state.cache.age} simulated minutes ago.${state.cache.age >= 30 ? ' It is old; confirm current conditions before relying on it.' : ''}`
          : 'No saved route exists. The empty state offers reconnect and retry; it does not invent a route.',
      },
    };
  if (!state.connected)
    return {
      ...state,
      request: 'offline',
      seenOffline: true,
      feedback: {
        expected:
          'An offline request fails without deleting any saved route or pretending it is current.',
        actual: state.cache
          ? `Request failed: offline. Saved route retained at ${state.cache.age} minutes old. Open the saved route to use it.`
          : 'Request failed: offline. No saved route is available. Restore connection, then retry.',
      },
    };
  const attempts = state.attempts + 1;
  const scenario = offlineScenarios.find((item) => item.id === state.scenarioId)!;
  if (attempts <= scenario.failures)
    return {
      ...state,
      attempts,
      request: 'failed',
      seenFailure: true,
      feedback: {
        expected:
          'A connected retry can still fail. Keep the previous report and its original age.',
        actual: `Simulated server error. ${state.cache ? `The ${state.cache.age}-minute-old route remains available.` : 'No route is available.'} Retry again; the next authored response succeeds.`,
      },
    };
  return {
    ...state,
    attempts,
    request: 'success',
    view: 'updated',
    cache: { route: 'East gate → Covered path → Library', age: 0 },
    feedback: {
      expected: 'Only a successful simulated response replaces the route and resets its age.',
      actual:
        'New simulated response received. Covered-path route displayed; checked just now. The cache now holds this response.',
    },
  };
}
export function offlineGoalMet(state: OfflineRescueState): boolean {
  if (state.scenarioId === 'saved-route')
    return state.seenOffline && state.view === 'cached' && Boolean(state.cache);
  if (state.scenarioId === 'empty-cache')
    return state.seenOffline && state.request === 'success' && state.view === 'updated';
  return (
    state.seenOffline &&
    state.seenStale &&
    state.seenFailure &&
    state.request === 'success' &&
    state.view === 'updated'
  );
}
export function offlineReportLabel(state: OfflineRescueState): string {
  if (state.view === 'empty') return 'No route displayed';
  if (state.view === 'updated' && state.cache?.age === 0)
    return 'New simulated report · checked just now';
  return `Saved report · checked ${state.cache?.age ?? 0} simulated minutes ago`;
}
