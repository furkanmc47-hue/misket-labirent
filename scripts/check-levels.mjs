// Hikâye labirentlerinin çözülebilir olduğunu doğrular: node scripts/check-levels.mjs
import { LEVELS, HUB, PARKOUR, NIGHT } from '../src/levels.js';
import { validateLevel } from '../src/maplogic.js';

let bad = 0;
for (const l of [HUB, ...LEVELS, ...PARKOUR, ...NIGHT]) {
  const p = validateLevel(l);
  console.log(`${l.title}: ${p.length ? p.join('; ') : 'tamam'}`);
  bad += p.length;
}
process.exit(bad ? 1 : 0);
