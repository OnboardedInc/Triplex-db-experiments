// [EXP-NSR] Why: container names are neither kernel nor clock identities. Rejected: hostname and process-relative performance.now.
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
export function clockDomain() {
  // [EXP-NSR-R4] Why: the trusted launcher captures the inherited kernel namespace before filesystem restriction. Rejected: granting the driver access to proc outside its layout.
  if (os.platform() === "linux" && process.env.NSR_LINUX_CLOCK)
    return linuxDomain(JSON.parse(process.env.NSR_LINUX_CLOCK));
  if (os.platform() === "linux")
    return linuxDomain({
      offsetText: fs.readFileSync("/proc/self/timens_offsets", "utf8"),
      bootId: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
      timeNs: String(fs.statSync("/proc/self/ns/time", { bigint: true }).ino),
      primitive: "CLOCK_MONOTONIC",
    });
  if (os.platform() !== "darwin") throw Error("Clock domain unavailable");
  const boot =
    process.env.NSR_DARWIN_BOOT_ID ||
    execFileSync("/usr/sbin/sysctl", ["-n", "kern.bootsessionuuid"], {
      encoding: "utf8",
    }).trim();
  const hash = (v) => createHash("sha256").update(v).digest("hex");
  return {
    primitive: "node-hrtime-v1",
    host: hash("darwin:" + boot),
    boot: hash(boot),
    origin: "host-boot",
  };
}
export const now = () => String(process.hrtime.bigint());

// [EXP-G03-R5] Why: Q100q accepts distinct time namespaces only when both offsets are actually zero. Rejected: inode equality or missing offsets as a clock proof.
function linuxDomain(facts) {
 const rows=String(facts.offsetText).trim().split("\n").map(l=>l.trim().split(/\s+/));
 if(!facts.bootId||rows.length!==2||new Set(rows.map(r=>r[0])).size!==2||rows.some(r=>r.length!==3||!["monotonic","boottime"].includes(r[0])||!/^[-]?\d+$/.test(r[1])||!/^\d+$/.test(r[2])||BigInt(r[1])!==0n||BigInt(r[2])!==0n))throw Error("NSR clock offsets missing/nonzero");
 return {bootId:facts.bootId,primitive:"CLOCK_MONOTONIC",offsets:{monotonic:["0","0"],boottime:["0","0"]}};
}
