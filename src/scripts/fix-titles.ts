import { repairBadProductTitles } from '../lib/db';

const repaired = repairBadProductTitles();
console.log(`[fix-titles] Repaired ${repaired} product titles.`);
