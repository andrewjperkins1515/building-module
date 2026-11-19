/**
 * Exports the prototype's fictional seed dataset as JSON fixtures for database seeding and tests.
 * Run: npm run export:fixtures
 * Note: many dates are generated relative to "today", so re-running changes them.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { buildSeedState } from "../src/data/seed";

const out = "docs/handoff/fixtures";
mkdirSync(out, { recursive: true });
const state = buildSeedState();

const counts: Record<string, number> = {};
for (const [k, v] of Object.entries(state)) if (Array.isArray(v)) {
  writeFileSync(`${out}/${k}.json`, JSON.stringify(v, null, 2) + "\n");
  counts[k] = v.length;
}
writeFileSync(`${out}/manifest.json`, JSON.stringify({ generatedAt: new Date().toISOString(), stateVersion: state.version, counts }, null, 2) + "\n");
console.log("Exported fixtures:", counts);
