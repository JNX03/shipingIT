import test from 'node:test';
import assert from 'node:assert/strict';
import { createInstalledVoiceCache, selectInstalledVoice } from './character-voice-policy';
const voices = [
  { identifier: 'installed-basic', language: 'en-US', quality: 'Default' },
  { identifier: 'installed-enhanced', language: 'en-US', quality: 'Enhanced' },
  { identifier: 'remote-web', language: 'en-US', quality: 'Enhanced', localService: false },
  { identifier: 'other-locale', language: 'th-TH', quality: 'Enhanced' },
];
test('prefers an actual matching enhanced ID without invented gender/name assumptions', () => {
  const result = selectInstalledVoice(voices);
  assert.equal(result.voice, 'installed-enhanced');
  assert.equal(result.language, 'en-US');
  assert.equal(result.pitch, 1);
  assert.ok(voices.some((v) => v.identifier === result.voice));
});
test('no compatible installed voice safely uses system locale default', () => {
  assert.equal(selectInstalledVoice(voices, 'ami', 'ja-JP').voice, undefined);
  assert.equal(selectInstalledVoice([]).voice, undefined);
});
test('character profiles remain natural and distinct without requiring extra voices', () => {
  const profiles = (['ami', 'mali', 'noa', 'ken'] as const).map((c) =>
    selectInstalledVoice(voices, c),
  );
  assert.equal(new Set(profiles.map((v) => v.rate + ':' + v.pitch)).size, 4);
  assert.ok(
    profiles.every((v) => v.rate >= 0.9 && v.rate <= 1.05 && v.pitch >= 0.95 && v.pitch <= 1.05),
  );
});
test('catalog is on demand, concurrent cached, and never requested at construction', async () => {
  let calls = 0;
  const cache = createInstalledVoiceCache(async () => {
    calls++;
    return voices;
  });
  assert.equal(calls, 0);
  await Promise.all([cache.get(), cache.get()]);
  assert.equal(calls, 1);
  await cache.get();
  assert.equal(calls, 1);
});
test('slow lookup has bounded first-listen fallback while a later result can still cache', async () => {
  let finish!: (v: typeof voices) => void;
  const cache = createInstalledVoiceCache(
    () =>
      new Promise((r) => {
        finish = r;
      }),
    5,
  );
  assert.deepEqual(await cache.get(), []);
  finish(voices);
  await new Promise((r) => setImmediate(r));
  assert.equal((await cache.get()).length, voices.length);
});
