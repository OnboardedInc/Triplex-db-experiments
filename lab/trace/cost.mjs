// @ts-nocheck -- Bench JSON rows are checked for exact arm/source/outcome before quantiles are reported.
import fs from "node:fs";
import path from "node:path";
import { records, percentile } from "./report.mjs";
const [base, prefix] = process.argv.slice(2);
const rows = [];
for (const [i, level] of ["off", "full", "full", "off"].entries()) {
  const dir = path.join(base, `${prefix}-${i + 1}-${level}`);
  const report = JSON.parse(fs.readFileSync(path.join(dir, "driver/ns-report.json"), "utf8"));
  const source = fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim();
  if (
    report.status !== "DONE" ||
    report.seed?.seededSubjects !== 10000 ||
    !report.config?.zeroReaders ||
    report.config?.matchDurationS !== 200 ||
    report.config?.readPath !== "replica" ||
    report.config?.strictRecordClocks !== true ||
    typeof report.trace?.digest !== "string" ||
    !/^[0-9a-f]{40}$/.test(source)
  )
    throw Error("Unfinished/wrong cost arm");
  // [DX-T1] Why: the measured level must be this arm's actual producer setting, and traced arms must drain successfully.
  // Rejected: labelling an old/partial arm as full from its directory name alone.
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "trace-run.json"), "utf8"));
  const tracing = JSON.parse(fs.readFileSync(path.join(dir, "trace-summary.json"), "utf8"));
  if (
    manifest.tag !== path.basename(dir) ||
    manifest.source !== source ||
    manifest.level !== level ||
    tracing.source !== source ||
    (level === "full" ? !tracing.complete : !tracing.disabled)
  )
    throw Error("Cost trace level/source/collection mismatch");
  const writes = [];
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl")))
    if (w.stream === "background" && !w.resend) {
      if (w.outcome !== "committed" || w.expired) throw Error("Incomplete cost writer trace");
      writes.push(w);
    }
  if (!writes.length) throw Error("Empty cost arm");
  rows.push({
    tag: path.basename(dir),
    level,
    source,
    trace: report.trace?.digest,
    subjects: report.seed.seededSubjects,
    n: writes.length,
    p50Ms: percentile(
      writes.map((w) => w.latencyMs),
      0.5,
    ),
    p99Ms: percentile(
      writes.map((w) => w.latencyMs),
      0.99,
    ),
    transactP50Ms: percentile(
      writes.map((w) => w.transactReturnedAt - w.transactCalledAt),
      0.5,
    ),
    transactP99Ms: percentile(
      writes.map((w) => w.transactReturnedAt - w.transactCalledAt),
      0.99,
    ),
  });
}
if (
  new Set(rows.map((r) => r.source)).size !== 1 ||
  new Set(rows.map((r) => r.trace)).size !== 1 ||
  new Set(rows.map((r) => r.n)).size !== 1
)
  throw Error("Cost arms differ in source/trace/command denominator");
const average = (level, key) =>
  rows.filter((r) => r.level === level).reduce((n, r) => n + r[key], 0) / 2;
const delta = Object.fromEntries(
  ["p50Ms", "p99Ms", "transactP50Ms", "transactP99Ms"].map((key) => [
    key,
    {
      off: average("off", key),
      full: average("full", key),
      deltaMs: average("full", key) - average("off", key),
      percent: 100 * (average("full", key) / average("off", key) - 1),
    },
  ]),
);
const out = {
  source: rows[0].source,
  order: "off,full,full,off",
  durationSeconds: 200,
  subjects: 10000,
  rows,
  delta,
};
fs.writeFileSync(path.join(base, `${prefix}-COST.json`), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(
  path.join(base, `${prefix}-COST.md`),
  "# Tracing cost\n\nSame source, 10,000 subjects, zero readers; frozen first 200 seconds including the 120-second burst. Order: off, full, full, off. Whole offer-to-finish latency remains the primary measure; transact-only is diagnostic.\n\n| arm | n | p50 ms | p99 ms | transact p50 ms | transact p99 ms |\n| --- | ---: | ---: | ---: | ---: | ---: |\n" +
    rows
      .map(
        (r) =>
          `| ${r.tag} | ${r.n} | ${r.p50Ms} | ${r.p99Ms} | ${r.transactP50Ms} | ${r.transactP99Ms} |`,
      )
      .join("\n") +
    "\n\nDelta uses the mean of each arm quantile (not a pooled percentile).\n\n```json\n" +
    JSON.stringify(delta, null, 2) +
    "\n```\n",
);
console.log(JSON.stringify(out));
