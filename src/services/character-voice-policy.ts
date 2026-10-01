export interface InstalledVoice {
  identifier: string;
  language: string;
  quality?: string;
  localService?: boolean;
}
export type VoiceCharacter = 'ami' | 'mali' | 'noa' | 'ken';
const profiles: Record<VoiceCharacter, { rate: number; pitch: number; index: number }> = {
  ami: { rate: 0.96, pitch: 1, index: 0 },
  mali: { rate: 1.01, pitch: 1.03, index: 1 },
  noa: { rate: 0.93, pitch: 0.99, index: 2 },
  ken: { rate: 0.98, pitch: 0.97, index: 3 },
};
const localeKey = (value: string) => value.replace(/_/g, '-').toLowerCase();
/** The SDK exposes locale/quality, not gender. Only a returned existing ID is selected. */
export function selectInstalledVoice(
  voices: readonly InstalledVoice[],
  character: VoiceCharacter = 'ami',
  locale = 'en-US',
) {
  const language = localeKey(locale);
  const family = language.split('-')[0];
  const profile = profiles[character];
  const candidates = voices.filter(
    (voice) =>
      voice.identifier &&
      voice.localService !== false &&
      localeKey(voice.language).split('-')[0] === family,
  );
  const rank = (voice: InstalledVoice) =>
    (voice.quality === 'Enhanced' ? 0 : 2) + (localeKey(voice.language) === language ? 0 : 1);
  candidates.sort((a, b) => rank(a) - rank(b) || a.identifier.localeCompare(b.identifier));
  const best = candidates.filter(
    (voice) => rank(voice) === (candidates[0] ? rank(candidates[0]) : -1),
  );
  const selected = best[profile.index % Math.max(1, best.length)];
  return {
    language: selected?.language ?? locale,
    voice: selected?.identifier,
    quality: selected?.quality,
    rate: profile.rate,
    pitch: profile.pitch,
  };
}
/** No load happens at import/startup. Concurrent first listens share one bounded lookup. */
export function createInstalledVoiceCache(load: () => Promise<InstalledVoice[]>, waitMs = 800) {
  let cached: InstalledVoice[] | undefined;
  let pending: Promise<InstalledVoice[]> | undefined;
  return {
    get(): Promise<InstalledVoice[]> {
      if (cached) return Promise.resolve(cached);
      pending ??= Promise.resolve()
        .then(load)
        .then(
          (voices) => {
            if (voices.length) cached = voices;
            return voices;
          },
          () => [],
        )
        .finally(() => {
          pending = undefined;
        });
      const lookup = pending;
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve([]), waitMs);
        void lookup.then((voices) => {
          clearTimeout(timer);
          resolve(voices);
        });
      });
    },
  };
}
