import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../.."),
  raw = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round7",
  out = path.join(raw, "live-attempt1");
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const phases = [];
function run(name, cmd, args, timeout = 600000) {
  const started = new Date().toISOString(),
    stdout = fs.openSync(path.join(out, name + ".stdout"), "wx"),
    stderr = fs.openSync(path.join(out, name + ".stderr"), "wx");
  const r = spawnSync(cmd, args, { cwd: root, stdio: ["ignore", stdout, stderr], timeout });
  fs.closeSync(stdout);
  fs.closeSync(stderr);
  const result = {
    name,
    cmd,
    args,
    started,
    ended: new Date().toISOString(),
    exit: r.status,
    error: r.error?.message ?? null,
  };
  phases.push(result);
  return result;
}
// [EXP-RT01] Why: one future authorized heavy grant owns the complete attempt and its cleanup, even when G2/G6 fails. Rejected: a runbook that leaves an acquired slot behind after a failing shell command.
const ownerFile = "/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json";
const ownerExistedBefore = fs.existsSync(ownerFile);
const admission = run("admission", process.execPath, [
  path.join(import.meta.dirname, "admit-live.mjs"),
  "admission1",
]);
const currentOwner = fs.existsSync(ownerFile)
  ? JSON.parse(fs.readFileSync(ownerFile, "utf8"))
  : null;
const ownedDuringAttempt =
  !ownerExistedBefore &&
  currentOwner?.holder === "CX-RT01" &&
  currentOwner?.experiment === "EXP-RT01";
let acquired = admission.exit === 0 && ownedDuringAttempt,
  failure = acquired ? null : "admission stopped";
try {
  if (acquired) {
    fs.copyFileSync(
      path.join(raw, "admission1/owner-start.json"),
      path.join(raw, "owner-start.json"),
    );
    fs.copyFileSync(
      path.join(raw, "admission1/engine-start.stdout"),
      path.join(raw, "engine-start.json"),
    );
    const g2 = run("g2", process.execPath, [path.join(import.meta.dirname, "run-g2.mjs")], 6000000);
    if (g2.exit !== 0) failure = "G2 first failure";
    else {
      const g6 = run("g6", process.execPath, ["--experimental-strip-types", path.join(import.meta.dirname, "g6.mjs")], 21600000);
      if (g6.exit !== 0) failure = g6.exit === 3 ? "G6 TIMING_INVALID (unjudged)" : "G6 first failure";
    }
  }
} finally {
  if (ownedDuringAttempt) {
    run("engine-end", "docker", ["inspect", "tx2-xtdb-s1"]);
    run("engine-log", "docker", ["logs", "tx2-xtdb-s1"]);
    const down = run("engine-down", process.execPath, [
      "lab/bin/engine.mjs",
      "down",
      "--lane",
      "xtdb",
      "--slot",
      "s1",
      "--holder",
      "CX-RT01",
      "--remove-volume",
    ]);
    if (down.exit !== 0) failure = (failure ?? "") + "; engine down failed";
    else {
      const cleanup = run("cleanup", process.execPath, [
        path.join(import.meta.dirname, "cleanup.mjs"),
      ]);
      if (cleanup.exit !== 0) failure = (failure ?? "") + "; cleanup verification failed";
    }
  }
  fs.writeFileSync(
    path.join(out, "execution.json"),
    JSON.stringify({ acquired, ownedDuringAttempt, ownerExistedBefore, phases, failure }, null, 2) +
      "\n",
  );
}
if (failure) process.exitCode = 1;
