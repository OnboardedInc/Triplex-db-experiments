import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../../../..");
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live3";
assert.ok(!fs.existsSync(out), "retain previous attempt");
assert.equal(process.env.DOCKER_HOST, "unix:///Users/sam/.colima/triplex2/docker.sock");
fs.mkdirSync(out, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function run(name, cmd, args) {
  const started = new Date().toISOString();
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, `${name}: ${r.stderr}`);
  fs.writeFileSync(path.join(out, `${name}.stdout`), r.stdout);
  fs.writeFileSync(path.join(out, `${name}.stderr`), r.stderr);
  return { cmd, args, started, ended: new Date().toISOString(), exit: r.status, stdout: r.stdout };
}
const sourceHead = run("head", "git", ["rev-parse", "HEAD"]);
assert.equal(sourceHead.stdout.trim(), "37ae44a9a1fa4a8ef153c5118ee9aed03be86a8b");
const status = run("status", process.execPath, ["lab/bin/engine.mjs", "status"]);
const context = run("context", "docker", ["context", "show"]);
const disk = run("disk", "df", ["-k", root]);
const freeBytes = Number(disk.stdout.trim().split("\n").at(-1).trim().split(/\s+/)[3]) * 1024;
assert.ok(Number.isSafeInteger(freeBytes) && freeBytes > 0);
const poolBytes = fs.readFileSync("/Users/sam/projects/triplex-db-2/lab/locks/pool.json");
fs.writeFileSync(path.join(out, "pool.json"), poolBytes);
const pool = JSON.parse(poolBytes);
const exclusive = pool.reservations.filter((r) =>
  (r.slot !== undefined && r.slot !== "dev") || r.mode === "exclusive" ||
  (r.holder ?? "").startsWith("CX-G03"));
assert.equal(exclusive.length, 0, "this receipt describes a free-slot disk stop");
assert.ok(!fs.existsSync("/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json"));
assert.ok(!pool.retainedVolumes.some((r) => r.volume === "tx2-xtdb-s1-data"));
const files = ["lab/experiments/EXP-RT01/round6/RUNBOOK.md", "lab/experiments/EXP-RT01/round6/g6.mjs"];
const sources = files.map((p) => {
  const bytes = fs.readFileSync(path.join(root, p));
  fs.writeFileSync(path.join(out, path.basename(p)), bytes);
  return { path: p, sha256: hash(bytes) };
});
const g6 = fs.readFileSync(path.join(root, files[1]), "utf8");
// [EXP-RT01] Why: apply the committed history forecast before acquiring an engine. Rejected: admitting at the bare 5 GiB floor and discovering the known shortfall after fresh measurements.
assert.match(g6, /1024 >\s+10 \* 1024 \*\* 3,\s+"history disk forecast"/);
const guardBytes = 5 * 1024 ** 3;
const requiredFreeBytesExclusive = 10 * 1024 ** 3;
assert.ok(freeBytes <= requiredFreeBytesExclusive, "disk now fits; do not publish a stale refusal");
const receipt = {
  result: "NOT_RUN_DISK_FORECAST", at: new Date().toISOString(),
  sourceHead: sourceHead.stdout.trim(), sources,
  commands: { sourceHead, status, context, disk },
  freeBytes, guardBytes, forecastGrowthBytes: requiredFreeBytesExclusive - guardBytes,
  requiredFreeBytesExclusive, shortfallToThresholdBytes: requiredFreeBytesExclusive - freeBytes,
  exclusiveReservations: exclusive, poolSha256: hash(poolBytes),
  acquired: false, lifecycleCommands: [], gatesRun: [],
  cleanup: "No resource acquired; no release, removal, fstrim or context mutation performed.",
  qualification: "No G2/G6, A/A rule, native row counts or no-regression result granted.",
};
fs.writeFileSync(path.join(out, "RESULT.json"), JSON.stringify(receipt, null, 2) + "\n");
fs.copyFileSync(import.meta.filename, path.join(out, "preflight.mjs"));
const manifest = fs.readdirSync(out).sort().map((p) => {
  const bytes = fs.readFileSync(path.join(out, p));
  return `${hash(bytes)}  ${p}\n`;
}).join("");
fs.writeFileSync(path.join(out, "SHA256SUMS"), manifest);
for (const line of manifest.trim().split("\n")) {
  const [expected, p] = line.split("  ");
  assert.equal(hash(fs.readFileSync(path.join(out, p))), expected);
}
for (const name of ["RESULT.json", "SHA256SUMS"])
  fs.copyFileSync(path.join(out, name), path.join(import.meta.dirname, name));
console.log(JSON.stringify({ result: receipt.result, freeBytes, requiredFreeBytesExclusive, out }));
