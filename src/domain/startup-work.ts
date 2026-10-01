/** Optional modules never participate in auth or persisted-state readiness. */
export function optionalStartupWork(input: {
  platform: string;
  authReady: boolean;
  canPlay: boolean;
  sound: boolean;
}) {
  const playable = input.authReady && input.canPlay;
  return { audio: playable && input.sound, webTools: playable && input.platform === 'web' };
}
