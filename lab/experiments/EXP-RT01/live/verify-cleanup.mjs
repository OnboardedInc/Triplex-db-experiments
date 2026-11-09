import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live-window";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(path.join(out, p), "utf8"));
assert.ok(!fs.existsSync(path.join(out, "cleanup-verification.json")));
const original = read("cleanup.json"),
  g2 = read("g2-attempt1/execution.json"),
  owner = read("owner-start.json");
assert.equal(owner.holder, "CX-RT01");
assert.deepEqual(original.original, owner);
assert.ok(
  original.ownerAbsent && original.poolReservationAbsent && original.poolRetainedVolumeAbsent,
);
for (const phase of original.phases) {
  assert.ok(phase.started > g2.live.ended);
  for (const kind of ["stdout", "stderr"])
    assert.equal(hash(path.join(out, phase.name + "." + kind)), phase[kind + "Sha256"]);
}
const container = original.phases.find((p) => p.name === "container-absent"),
  volume = original.phases.find((p) => p.name === "volume-absent");
// [EXP-RT01] Why: the original checker expected a capital N, but Docker emitted lowercase; qualify only the exact retained absence response for this owned resource. Rejected: rewriting the failed cleanup receipt or treating any exit-one as absence.
assert.equal(original.containerAbsent, false);
assert.equal(container.exit, 1);
assert.deepEqual(container.args, ["inspect", owner.container]);
assert.equal(
  fs.readFileSync(path.join(out, "container-absent.stderr"), "utf8").trim().toLowerCase(),
  "error: no such object: " + owner.container,
);
assert.equal(volume.exit, 1);
assert.deepEqual(volume.args, ["volume", "inspect", owner.volume]);
assert.equal(
  fs.readFileSync(path.join(out, "volume-absent.stderr"), "utf8").trim(),
  "Error response from daemon: get " + owner.volume + ": no such volume",
);
const trim = original.phases.find((p) => p.name === "fstrim"),
  context = original.phases.find((p) => p.name === "docker-context");
assert.equal(trim.exit, 0);
assert.deepEqual(trim.args, ["ssh", "-p", "triplex2", "--", "sudo", "fstrim", "-av"]);
assert.match(fs.readFileSync(path.join(out, "fstrim.stdout"), "utf8"), /bytes\) trimmed/);
assert.equal(context.exit, 0);
assert.deepEqual(context.args, ["context", "use", "colima"]);
assert.equal(fs.readFileSync(path.join(out, "docker-context.stdout"), "utf8").trim(), "colima");
const result = {
  attempt: randomUUID(),
  observedAt: new Date().toISOString(),
  originalCleanupSha256: hash(path.join(out, "cleanup.json")),
  originalRunnerSha256: hash(path.join(out, "cleanup-original.mjs")),
  verifierSha256: hash(import.meta.filename),
  retainedOriginalFalseNegative: true,
  correction: "Docker returned lowercase no such object; original checker required uppercase No",
  resourceObservationEnded: original.phases.at(-1).ended,
  containerAbsentAtCleanup: true,
  volumeAbsentAtCleanup: true,
  slotReleasedAtCleanup: true,
  fstrimCompleted: true,
  dockerContextCommandCompleted: true,
  noLifecycleRetried: true,
};
fs.writeFileSync(
  path.join(out, "cleanup-verification.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
