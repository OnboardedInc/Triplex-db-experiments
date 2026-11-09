// [EXP-P2B-R3] Why: execute frozen ordered levels sequentially, preserving every failed attempt.
// Rejected: measuring later edits through a live worktree or running our own benchmark cells concurrently.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3";
const run = (script, args = [], env = {}) =>
  new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [script, ...args], {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    c.on("error", reject);
    c.on("exit", (code) => (code === 0 ? resolve() : reject(Error(`stage exit ${code}: ${args}`))));
  });
const files = ["pipeline.mjs", "run.mjs", "sweep.mjs", "archive.py"];
const identities = {};
const controllerId = `controller-${randomUUID()}`;
const controllerDir = path.join(root, controllerId);
fs.mkdirSync(controllerDir);
const continuing = process.argv.includes("--after-pool");
const inheritedInputs = {};
for (const file of files) {
  const source = fs.readFileSync(`lab/experiments/EXP-P2B/round3/${file}`);
  identities[file] = createHash("sha256").update(source).digest("hex");
  const dir = controllerDir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), source);
}
fs.writeFileSync(
  path.join(controllerDir, "source.json"),
  JSON.stringify(identities, null, 2) + "\n",
);
await new Promise((resolve, reject) => {
  const c = spawn("/usr/bin/python3", ["lab/experiments/EXP-P2B/round3/archive.py", "--existing"], {
    stdio: "inherit",
  });
  c.on("exit", (code) => (code === 0 ? resolve() : reject(Error("archive failed"))));
});
if (continuing) {
  const expected = [
    ["matrix-baseline-feed-local-40.json", 9],
    ["matrix-step1-feed-guarded-40.json", 9],
    ["matrix-step2-source-guarded-40.json", 9],
    ["sweep-step3.json", 24],
    ["matrix-step3-pool-40.json", 3],
  ];
  const traces = new Set();
  for (const [file, count] of expected) {
    const bytes = fs.readFileSync(path.join(root, file)),
      rows = JSON.parse(bytes);
    if (rows.length !== count) throw Error("Incomplete inherited level " + file);
    inheritedInputs[file] = createHash("sha256").update(bytes).digest("hex");
    for (const row of rows) {
      const reportFile = path.join(row.out, "report.json"),
        reportBytes = fs.readFileSync(reportFile),
        r = JSON.parse(reportBytes);
      const sums = fs
        .readFileSync(path.join(row.out, "SHA256SUMS"), "utf8")
        .split("\n")
        .map((line) => line.split("  "));
      const expectedReport = sums.find((parts) => parts[1] === "report.json")?.[0];
      if (
        row.exit !== 0 ||
        r.attempt !== row.attempt ||
        r.readers !== row.readers ||
        !r.sourceUnchanged ||
        r.failures.length ||
        r.committed !== 3000 ||
        r.perBandSummary.some((b) => b.stages.offerToAck.n !== 1000) ||
        createHash("sha256").update(reportBytes).digest("hex") !== expectedReport
      )
        throw Error("Invalid inherited attempt " + row.attempt);
      traces.add(r.traceHash);
      inheritedInputs[row.attempt] = expectedReport;
    }
  }
  if (traces.size !== 1) throw Error("Inherited trace mismatch");
} else {
  for (const phase of [
    "baseline-feed-local-40",
    "step1-feed-guarded-40",
    "step2-source-guarded-40",
  ])
    await run("lab/experiments/EXP-P2B/round3/run.mjs", [phase]);
  await run("lab/experiments/EXP-P2B/round3/sweep.mjs");
}
const selected = JSON.parse(fs.readFileSync(path.join(root, "selected-workers.json"))).selected;
if (![4, 8].includes(selected)) throw Error("Invalid measured pool choice");
if (!continuing)
  await run("lab/experiments/EXP-P2B/round3/run.mjs", ["step3-pool-40"], {
    P2B_COUNTS: "0",
    P2B_WORKERS: String(selected),
  });
fs.writeFileSync(
  path.join(controllerDir, "inherited-inputs.json"),
  JSON.stringify(inheritedInputs, null, 2) + "\n",
);
for (const phase of ["step4-sync-40", "step4-async-40", "step5-fullsync-corrected-40"])
  await run("lab/experiments/EXP-P2B/round3/run.mjs", [phase], {
    P2B_WORKERS: String(selected),
    P2B_MAINTENANCE: "on",
  });
for (const [file, expected] of Object.entries(identities))
  if (
    createHash("sha256")
      .update(fs.readFileSync(`lab/experiments/EXP-P2B/round3/${file}`))
      .digest("hex") !== expected
  )
    throw Error("Controller source changed");
fs.writeFileSync(
  path.join(root, "pipeline-complete.json"),
  JSON.stringify({
    completedAt: new Date().toISOString(),
    selected,
    controllerId,
    continuing,
    inheritedInputs,
  }) + "\n",
);
