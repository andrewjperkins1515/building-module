/**
 * Runs every browser smoke script against a running app (default http://localhost:5173).
 *   npm run dev            # in one terminal
 *   npm run e2e            # in another; BASE_URL=https://… npm run e2e to target a deployment
 * A script fails if it exits non-zero or reports browser console errors.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const scripts = ["buildings", "owner-crm", "contacts", "communications", "deals", "deal-stages", "deal-progress", "deal-approvals"];
let failed = 0;
for (const name of scripts) {
  const r = spawnSync(process.execPath, [path.join(__dirname, `${name}.cjs`)], { encoding: "utf8", env: process.env });
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0 && /errors:\s*none/i.test(out);
  console.log(`\n${ok ? "PASS" : "FAIL"}  ${name}`);
  console.log(out.trim().split("\n").map((l) => "    " + l).join("\n"));
  if (!ok) failed++;
}
console.log(`\n${scripts.length - failed}/${scripts.length} scripts passed`);
process.exit(failed ? 1 : 0);
