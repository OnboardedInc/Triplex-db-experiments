// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-NSR] Why: container names are neither kernel nor clock identities. Rejected: hostname and process-relative performance.now.
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
export function clockDomain() {
  // [EXP-NSR-R4] Why: the trusted launcher captures the inherited kernel namespace before filesystem restriction. Rejected: granting the driver access to proc outside its layout.
  if (os.platform() === "linux" && process.env.NSR_LINUX_CLOCK)
    return JSON.parse(process.env.NSR_LINUX_CLOCK);
  if (os.platform() === "linux")
    return {
      bootId: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
      timeNs: String(fs.statSync("/proc/self/ns/time", { bigint: true }).ino),
      primitive: "CLOCK_MONOTONIC",
    };
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
