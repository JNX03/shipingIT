import {
  createCampusCompassDraft,
  checkCampusCompassBuild,
  normalizeCampusCompassDraft,
  runCampusCompassTest,
} from './logic';

/** Draft registry entry for root integration; no shared registry/schema mutation. */
export const campusCompassTemplate = {
  id: 'map' as const,
  name: 'CampusCompass',
  description: 'Build a campus map with route choices, landmark clues and a stairs-free lab walk.',
  dataLabel: 'Fictional campus · authored local data',
  createConfig: createCampusCompassDraft,
  normalizeConfig: normalizeCampusCompassDraft,
  checkBuild: checkCampusCompassBuild,
  runTest: runCampusCompassTest,
} as const;
