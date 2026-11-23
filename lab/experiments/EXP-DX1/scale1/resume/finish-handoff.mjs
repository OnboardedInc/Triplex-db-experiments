// @ts-nocheck -- server records are validated at runtime.
// Server only, approved by the orchestrator on 2026-11-23: finish the post-seal steps that AGE1 resume-host.mjs
// (bb9ec7324) skipped after its export check returned, because line 162-163 passed stdio "ignore" and line 20 called
// .trim() on the null result. Runs resume-host's remaining steps in its order with its own functions:
// handoff.json, start the held cluster, normalizeScorecardRoles, clean stop, aged-pgdata.json from stoppedInventory.
// node finish-handoff.mjs OUT AGE_CHECKOUT CONTROLLER_REPOSITORY
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const [out, ageCheckout, controller] = process.argv.slice(2);
const lab = "lab/experiments/EXP-DX1/age1";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const fileSha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const call = (cmd, args, extra = {}) => (execFileSync(cmd, args, { timeout: 30000, encoding: "utf8", ...extra }) ?? "").trim();
const docker = (...args) => call("docker", args);
const write = (file, body) => fs.writeFileSync(file, JSON.stringify(body, null, 2) + "\n", { flag: "wx", mode: 0o600 });

assert(process.platform === "linux" && process.getuid() === 0);
assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
const pins = read(path.join(ageCheckout, lab, "readback-pins.json"));
const source = call("git", ["rev-parse", "HEAD"], { cwd: ageCheckout });
assert.equal(call("git", ["status", "--porcelain"], { cwd: ageCheckout }), "");
const identity = read(path.join(out, "identity.json"));
const config = read(path.join(out, "config.json"));
assert.equal(fileSha(path.join(out, "config.json")), pins.configSha);
const rung = path.join(config.output, "1000000000");
const seal = path.join(rung, "sealed.json"), handoff = path.join(rung, "aged-scorecard.json");
const sealSha = fileSha(seal), sealed = read(seal);
// The same assertion resume-host made before its export check.
assert.deepEqual([sealed.source, sealed.resume?.failedAttempt, sealed.t, sealed.head, sealed.records],
  [source, pins.attempt, pins.t, pins.head, pins.records]);
const bundle = read(handoff);
assert.deepEqual([bundle.version, bundle.physicalT, bundle.logicalHead, bundle.records, bundle.sealSha],
  ["triplex-age1-scorecard/1", pins.t, pins.head, pins.records, sealSha]);
assert(!fs.existsSync(path.join(out, "handoff.json")) && !fs.existsSync(path.join(out, "aged-pgdata.json")));
const dataMount = config.dataMount, volume = identity.resumedPrivateVolume;
assert.equal(JSON.parse(docker("volume", "inspect", volume))[0].Options?.device, dataMount);
assert(!fs.existsSync(path.join(dataMount, "postmaster.pid")));
assert.equal(docker("ps", "-aq"), "", "Containers exist");
const { normalizeScorecardRoles, stoppedInventory } = await import(pathToFileURL(path.join(controller,
  "lab/experiments/EXP-DX1/scale1/decision/pgdata.ts")));

// resume-host lines 164-165, unchanged.
write(path.join(out, "handoff.json"), { ...identity, at: Date.now(), sealSha, records: sealed.records, cut: sealed.head,
  t: sealed.t, bytes: fs.statSync(handoff).size, digest: fileSha(handoff), resumedFrom: pins.attempt, resumeSource: source });
// The transactor already stopped in the crash cleanup, so start the held cluster alone with resume-host's settings.
const pgName = "scale1-" + path.basename(out) + "-resume-pg";
try {
  docker("run", "-d", "--pull", "never", "--name", pgName, "--network", "none", "--cpuset-cpus", "1",
    "--memory", "8g", "--memory-swap", "8g", "-v", volume + ":/var/lib/postgresql/data",
    identity.pgImage, "postgres", "-c", "shared_buffers=2GB", "-c", "synchronous_commit=on", "-c", "fsync=on",
    "-c", "full_page_writes=on", "-c", "track_io_timing=on");
  const deadline = Date.now() + 300000;
  for (;;) {
    try { docker("exec", pgName, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"); break; }
    catch { assert(Date.now() < deadline, "PostgreSQL did not start"); await sleep(1000); }
  }
  // resume-host lines 170-172, unchanged.
  normalizeScorecardRoles(pgName);
  call("docker", ["stop", "--time", "120", pgName], { timeout: 130000 });
  assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", pgName), "0");
} finally {
  try { docker("rm", "-f", pgName); } catch {}
}
assert.equal(docker("ps", "-aq"), "");
// resume-host lines 173-176, unchanged.
const inventory = await stoppedInventory(dataMount);
write(path.join(out, "aged-pgdata.json"), { ...identity, sealSha, sourceVolume: volume, cut: sealed.head, t: sealed.t,
  records: sealed.records, bundleSha: fileSha(handoff), data: dataMount, inventory, at: Date.now(),
  resumedFrom: pins.attempt, resumeSource: source });
console.log(JSON.stringify({ event: "resume-sealed", handoff, handoffSha256: fileSha(handoff), sealSha,
  pgdata: dataMount, inventory, finishedBy: "scale1/resume/finish-handoff.mjs" }));
