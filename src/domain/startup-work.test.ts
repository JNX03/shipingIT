import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalStartupWork } from './startup-work';
test('optional startup work waits for real auth readiness and playable access', () => {
  for (const platform of ['ios', 'android', 'web'])
    for (const canPlay of [true, false])
      assert.deepEqual(optionalStartupWork({ platform, canPlay, authReady: false, sound: true }), {
        audio: false,
        webTools: false,
      });
  assert.deepEqual(
    optionalStartupWork({ platform: 'web', canPlay: false, authReady: true, sound: true }),
    { audio: false, webTools: false },
  );
});
test('native never initializes the browser connector; muted startup never initializes audio', () => {
  for (const platform of ['ios', 'android']) {
    assert.deepEqual(
      optionalStartupWork({ platform, canPlay: true, authReady: true, sound: true }),
      { audio: true, webTools: false },
    );
    assert.deepEqual(
      optionalStartupWork({ platform, canPlay: true, authReady: true, sound: false }),
      { audio: false, webTools: false },
    );
  }
});
test('authenticated web keeps tools available independently of its sound preference', () => {
  assert.deepEqual(
    optionalStartupWork({ platform: 'web', canPlay: true, authReady: true, sound: false }),
    { audio: false, webTools: true },
  );
});
