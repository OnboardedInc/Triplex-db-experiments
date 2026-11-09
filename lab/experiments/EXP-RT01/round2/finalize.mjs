import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../..");
const experiment = path.dirname(import.meta.dirname);
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const gates = read("lab/experiments/EXP-RT01/evidence/round2-final/execution.json");
assert.equal(gates.sourceUnchanged, true);
assert.equal(gates.phases.length, 14);
for (const phase of gates.phases) {
  assert.equal(phase.exit, 0);
  assert.equal(hash(path.join(experiment, "evidence/round2-final", phase.file)), phase.sha256);
}
for (const [p, sha] of Object.entries(gates.sourceAfter))
  assert.equal(hash(path.join(root, p)), sha, p);
const repro = read("lab/experiments/EXP-RT01/round2/attempt2/execution.json");
assert.equal(repro.sourceUnchanged, true);
assert.equal(repro.error, null);
for (const [p, sha] of Object.entries(repro.after))
  if (p.startsWith("packages/")) assert.equal(hash(path.join(root, p)), sha, p);
const scan = read("lab/experiments/EXP-RT01/round2/scan-final/execution.json");
assert.equal(scan.sourceUnchanged, true);
assert.equal(scan.error, null);
for (const [p, sha] of Object.entries(scan.after))
  if (
    p.startsWith("packages/") ||
    p.endsWith("/scan-cost.ts") ||
    p.endsWith("/main-XtdbStorageAdapter.txt")
  )
    assert.equal(hash(path.join(root, p)), sha, p);
assert.equal(
  hash(path.join(import.meta.dirname, "reproductions/run-scan-final.mjs.txt")),
  scan.before["lab/experiments/EXP-RT01/round2/run-reproductions.mjs"],
);

const values = read("lab/experiments/EXP-RT01/round2/scan-final/scan-cost.stdout");
// [EXP-RT01] Why: publish measured model values only after source/content checks. Rejected: promoting finite timings or process zero into live G6 acceptance.
const table = [
  "| Encoding | Scope history rows | Position-only us | Position + stamp us | Model change |",
  "| --- | --- | --- | --- | --- |",
  ...values.measurements.map(
    (r) =>
      `| ${r.encoding} | ${r.storedScopeVersions} | ${(r.baselineMedianMs * 1000).toFixed(3)} | ${(r.rt01MedianMs * 1000).toFixed(3)} | ${((r.rt01MedianMs / r.baselineMedianMs - 1) * 100).toFixed(1)}% |`,
  ),
].join("\n");
const report = path.join(experiment, "REPORT.md");
const text = fs.readFileSync(report, "utf8");
assert.ok(text.includes("SCAN_RESULTS_PENDING"));
fs.writeFileSync(report, text.replace("SCAN_RESULTS_PENDING", table));
const listed = () =>
  [
    ...new Set(
      execFileSync("git", ["ls-files", "-co", "--exclude-standard", "lab/experiments/EXP-RT01"], {
        cwd: root,
        encoding: "utf8",
      })
        .trim()
        .split("\n"),
    ),
  ]
    .filter(Boolean)
    .sort();
const files = listed();
const raw = files.filter((p) => /\/(evidence|attempt[0-9]+|scan-final)\//.test(p));
const rawBytes = raw.reduce((sum, p) => sum + fs.statSync(path.join(root, p)).size, 0);
assert.ok(rawBytes <= 5000000, `Raw outputs exceed 5 MB: ${rawBytes}`);
for (const p of raw) assert.ok(fs.statSync(path.join(root, p)).size <= 1000000, p);
const delta = execFileSync(
  "git",
  ["diff", "1283f9fb", "--name-only", "--", "lab/acceptance", "lab/oracles/replay"],
  { cwd: root, encoding: "utf8" },
);
assert.equal(delta, "");
fs.writeFileSync(
  path.join(import.meta.dirname, "CLOSURE.json"),
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      productHead: gates.head,
      packageSourceAndLogsMatch: true,
      reproductionPackageAndBuildBytesMatch: true,
      scanSourceUnchanged: scan.sourceUnchanged,
      rawBytes,
      maxRawFileBytes: Math.max(...raw.map((p) => fs.statSync(path.join(root, p)).size)),
      acceptanceAndOracleDelta: delta,
      liveG2G6Qualified: false,
    },
    null,
    2,
  ) + "\n",
);
const writeSums = (dir, paths) =>
  fs.writeFileSync(
    path.join(dir, "SHA256SUMS"),
    paths
      .map((p) => `${hash(path.join(root, p))}  ${path.relative(dir, path.join(root, p))}`)
      .join("\n") + "\n",
  );
writeSums(
  import.meta.dirname,
  listed().filter(
    (p) =>
      p.startsWith(path.relative(root, import.meta.dirname) + "/") && !p.endsWith("/SHA256SUMS"),
  ),
);
writeSums(
  experiment,
  listed().filter((p) => p !== path.relative(root, path.join(experiment, "SHA256SUMS"))),
);
console.log(
  JSON.stringify({
    rawBytes,
    manifest: path.relative(root, path.join(experiment, "SHA256SUMS")),
    liveG2G6Qualified: false,
  }),
);
