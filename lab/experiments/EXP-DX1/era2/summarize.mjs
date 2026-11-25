// [DX-ERA2] One table from era2/fault.ts results: node lab/experiments/EXP-DX1/era2/summarize.mjs DIR [DIR ...]
// Counts are results; the latency columns are diagnostic (Mac).
import fs from "node:fs";
import path from "node:path";

const rows = [];
for (const dir of process.argv.slice(2))
  for (const f of fs.readdirSync(dir).filter((x) => /^result-.*\.json$/.test(x)).sort()) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const o = r.otherAccounts, s = r.removalAccount, c = r.contested ?? {}, lat = r.latencyMs ?? {};
    const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + "%" : "-");
    rows.push([
      r.label, r.accounts, r.removalRate, `${r.removals.done}/${r.removals.planned}`,
      `${o.savesRefused} of ${o.saves} (${pct(o.savesRefused, o.saves)})`, o.replays, o.unavailable, o.frontierChanged,
      Math.round(o.delayMs), `${o.readsRefused} of ${o.reads}`, `${o.framesRefused} of ${o.frames}`,
      `${r.reach.inlineEntities}/${r.reach.referenceEntities}`,
      `${s.savesRefused} of ${s.saves}`, `${c.savesRefused ?? "-"} of ${c.saves ?? "-"}`,
      lat.quiet ? `${lat.quiet.p50}/${lat.quiet.p99}` : "-", lat.other ? `${lat.other.p50}/${lat.other.p99}` : "-",
      `${r.removals.p50}/${r.removals.p99}`,
      `${r.checks.wrong} wrong, ${r.checks.removedMarked}/${r.checks.removed} marked, leaks ${Object.values(r.checks.leaks ?? {}).reduce((a, b) => a + b, 0)}`,
    ]);
  }
const head = ["cell", "accounts", "removals/s", "removals done", "other accounts: saves refused", "CasConflict replays",
  "503 attempts", "ErasureFrontierChanged", "delay ms (sum)", "reads refused", "frames refused", "Reach inline/ref",
  "removal account (other subjects): saves refused", "contested saves refused", "quiet p50/p99 ms", "other p50/p99 ms",
  "removal p50/p99 ms", "checks"];
console.log("| " + head.join(" | ") + " |");
console.log("| " + head.map(() => "---").join(" | ") + " |");
for (const r of rows) console.log("| " + r.join(" | ") + " |");
