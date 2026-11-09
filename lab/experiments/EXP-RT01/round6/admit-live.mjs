import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../..");
const attempt = process.argv[2] ?? "admission1";
assert.match(attempt, /^admission[1-9][0-9]*$/);
const out = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/${attempt}`;
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
assert.equal(process.env.DOCKER_HOST, "unix:///Users/sam/.colima/triplex2/docker.sock");
function run(name, cmd, args) {
  const started = new Date().toISOString(),
    r = spawnSync(cmd, args, {
      cwd: root,
      encoding: "utf8",
      timeout: 300000,
      maxBuffer: 16 * 1024 ** 2,
    });
  fs.writeFileSync(path.join(out, name + ".stdout"), r.stdout ?? "");
  fs.writeFileSync(path.join(out, name + ".stderr"), r.stderr ?? "");
  return {
    name,
    cmd,
    args,
    started,
    ended: new Date().toISOString(),
    exit: r.status,
    error: r.error?.message ?? null,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}
const status = run("status", process.execPath, ["lab/bin/engine.mjs", "status"]),
  disk = run("disk", "df", ["-k", root]),
  pool = JSON.parse(
    fs.readFileSync("/Users/sam/projects/triplex-db-2/lab/locks/pool.json", "utf8"),
  );
const freeBytes = Number(disk.stdout.trim().split("\n").at(-1).trim().split(/\s+/)[3]) * 1024;
// [EXP-RT01] Why: honor the explicit no-exclusive/G03-VM window and preserve another holder's retained/orphaned data. Rejected: waiting on or replacing G03's slot after an occupied admission check.
let reason =
  status.exit !== 0
    ? "status failed"
    : pool.reservations.some(
          (r) =>
            (r.slot !== undefined && r.slot !== "dev") ||
            r.mode === "exclusive" ||
            (r.holder ?? "").startsWith("CX-G03"),
        )
      ? "nonresident or VM-probe reservation occupied"
      : freeBytes < 5 * 1024 ** 3
        ? "host disk below 5 GiB"
        : fs.existsSync("/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json")
          ? "s1 owner exists"
          : pool.retainedVolumes.some((r) => r.volume === "tx2-xtdb-s1-data")
            ? "s1 volume retained by another window"
            : null;
const inspections = [];
if (!reason)
  for (const [name, args, needle] of [
    ["container-before", ["inspect", "tx2-xtdb-s1"], "no such object: tx2-xtdb-s1"],
    ["volume-before", ["volume", "inspect", "tx2-xtdb-s1-data"], "no such volume"],
  ]) {
    const r = run(name, "docker", args);
    inspections.push(r);
    if (r.exit !== 1 || !r.stderr.toLowerCase().includes(needle))
      reason = "existing or unverified slot resource; preserve it";
  }
let up = null;
if (!reason)
  up = run("engine-up", process.execPath, [
    "lab/bin/engine.mjs",
    "up",
    "--lane",
    "xtdb",
    "--slot",
    "s1",
    "--holder",
    "CX-RT01",
    "--exp",
    "EXP-RT01",
    "--fresh",
  ]);
fs.writeFileSync(
  path.join(out, "decision.json"),
  JSON.stringify(
    { at: new Date().toISOString(), freeBytes, pool, status, disk, inspections, reason, up },
    null,
    2,
  ) + "\n",
);
if (up?.exit === 0) {
  fs.copyFileSync(
    "/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json",
    path.join(out, "owner-start.json"),
  );
  run("engine-start", "docker", ["inspect", "tx2-xtdb-s1"]);
  console.log("CX-RT01 owns fresh xtdb-s1");
} else {
  console.log("STOP_WITH_RUNBOOK", reason ?? up?.stderr);
  process.exitCode = 2;
}
