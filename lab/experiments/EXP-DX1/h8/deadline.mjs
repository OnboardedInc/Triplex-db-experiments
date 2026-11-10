import fs from "node:fs";
import { execFileSync } from "node:child_process";
// [DX-H8] Why: bash may defer a TERM trap while waiting on foreground Docker; the lease deadline cannot.
// Rejected: relying solely on a parent-shell signal or stopping another owner's container.
const prefix = process.argv[2];
if (!/^tx2-dxh8-[a-z0-9-]+$/.test(prefix ?? "")) throw Error("owned prefix required");
const file = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json";
const output =
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H8/" + prefix + "/deadline-guard.json";
const owns = () => {
  try {
    const x = JSON.parse(fs.readFileSync(file, "utf8"));
    return x.id === "DX-H8" && x.prefix === prefix;
  } catch {
    return false;
  }
};
if (!owns()) throw Error("this attempt must own measurement lease");
const began = fs.statSync(file).mtimeMs;
const leaseMs=Number(process.env.DXH8_LEASE_MS ?? 900000);
if(![900000,4200000].includes(leaseMs))throw Error("15 or 70 minute lease only");
const record = {
  classification: "OWNED-LEASE-DEADLINE-NOT-SEMANTIC-VERDICT",
  prefix,
  guardStartedAt: new Date().toISOString(),
  leaseMtimeEpochMs: began,
  actions: [],
};
const save = () => fs.writeFileSync(output, JSON.stringify(record, null, 2) + "\n");
const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    timeout: 20000,
    env: { ...process.env, DOCKER_HOST: "unix:///Users/sam/.colima/triplex2/docker.sock" },
  });
const pause = () => new Promise((r) => setTimeout(r, 1000));
save();
for (;;) {
  if (!owns()) {
    record.finishedAt = new Date().toISOString();
    record.status = "LEASE-RELEASED";
    save();
    break;
  }
  const elapsed = Date.now() - began;
  if (elapsed >= leaseMs - 120000 && !record.actions.some((a) => a.kind === "stop-driver")) {
    const a = {
      kind: "stop-driver",
      observedAt: new Date().toISOString(),
      reason: "work deadline; reserve two minutes for cleanup",
    };
    record.actions.push(a);
    save();
    try {
      a.output = docker(["stop", "-t", "10", prefix + "-driver"]);
    } catch (e) {
      a.error = String(e);
    }
    save();
  }
  if (
    elapsed >= leaseMs - 40000 &&
    !record.actions.some((a) => a.kind === "force-own-containers")
  ) {
    const a = {
      kind: "force-own-containers",
      observedAt: new Date().toISOString(),
      reason: "final cleanup reserve; no semantic outcome adopted",
    };
    record.actions.push(a);
    save();
    // Only this still-owned prefix's fixed roles; cleanup retains the lock until inventories are empty.
    try {
      a.output = docker([
        "rm",
        "-f",
        ...["driver", "gw-r", "gw-w", "tx", "pg"].map((r) => prefix + "-" + r),
      ]);
    } catch (e) {
      a.error = String(e);
    }
    save();
  }
  if (elapsed >= leaseMs) {
    record.status = "DEADLINE-REACHED-NEEDS-AUDIT";
    record.finishedAt = new Date().toISOString();
    save();
    throw Error(record.status);
  }
  await pause();
}
