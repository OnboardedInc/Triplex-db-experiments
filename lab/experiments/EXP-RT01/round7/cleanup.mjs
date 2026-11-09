import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round7";
assert.ok(!fs.existsSync(path.join(out, "cleanup.json")));
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const original = JSON.parse(fs.readFileSync(path.join(out, "owner-start.json"), "utf8"));
assert.equal(original.holder, "CX-RT01");
assert.equal(original.container, "tx2-xtdb-s1");
assert.equal(original.volume, "tx2-xtdb-s1-data");
const phases = [];
for (const [name, command, args] of [
  ["fstrim", "colima", ["ssh", "-p", "triplex2", "--", "sudo", "fstrim", "-av"]],
  ["docker-context", "docker", ["context", "use", "colima"]],
  ["container-absent", "docker", ["inspect", original.container]],
  ["volume-absent", "docker", ["volume", "inspect", original.volume]],
]) {
  const started = new Date().toISOString();
  const r = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 ** 2,
  });
  for (const kind of ["stdout", "stderr"])
    fs.writeFileSync(path.join(out, name + "." + kind), r[kind] ?? "");
  phases.push({
    name,
    command,
    args,
    started,
    ended: new Date().toISOString(),
    exit: r.status,
    signal: r.signal,
    error: r.error?.message ?? null,
    stdoutSha256: hash(path.join(out, name + ".stdout")),
    stderrSha256: hash(path.join(out, name + ".stderr")),
  });
}
const ownerFile = "/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json",
  poolFile = "/Users/sam/projects/triplex-db-2/lab/locks/pool.json";
const pool = JSON.parse(fs.readFileSync(poolFile, "utf8"));
// [EXP-RT01] Why: cleanup is true only after the exact owned resources are absent, not merely because down exited zero. Rejected: deleting another holder's volume or treating a Docker connection error as proof of absence.
const missingContainer = phases.find((p) => p.name === "container-absent"),
  missingVolume = phases.find((p) => p.name === "volume-absent");
const containerMessage = fs.readFileSync(path.join(out, "container-absent.stderr"), "utf8"),
  volumeMessage = fs.readFileSync(path.join(out, "volume-absent.stderr"), "utf8");
const result = {
  original,
  phases,
  ownerAbsent: !fs.existsSync(ownerFile),
  poolReservationAbsent: !pool.reservations.some((r) => r.container === original.container),
  poolRetainedVolumeAbsent: !(pool.retainedVolumes ?? []).some((r) => r.volume === original.volume),
  containerAbsent:
    missingContainer.exit === 1 &&
    containerMessage.toLowerCase().includes("no such object: " + original.container),
  volumeAbsent: missingVolume.exit === 1 && volumeMessage.includes("no such volume"),
  poolSha256: hash(poolFile),
};
fs.writeFileSync(path.join(out, "cleanup.json"), JSON.stringify(result, null, 2) + "\n");
assert.ok(
  result.ownerAbsent &&
    result.poolReservationAbsent &&
    result.poolRetainedVolumeAbsent &&
    result.containerAbsent &&
    result.volumeAbsent,
);
assert.ok(phases.slice(0, 2).every((p) => p.exit === 0));
console.log(JSON.stringify(result));
