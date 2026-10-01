import { writeFileSync } from 'node:fs';
import { researchNpcs, researchEvidence } from '../src/game/logic/research';

writeFileSync(new URL('../src/server/interview-scenario.mjs', import.meta.url), 'export default '+JSON.stringify({npcs:researchNpcs,evidence:researchEvidence},null,2)+';\n');
process.stdout.write('Synced authored interview scenario for the AI server.\n');
