import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * @param {unknown} value
 * @param {number} pid
 * @param {string} arm
 * @param {"bench" | "activation"} stage
 */
export function assignedScaleArm(value, pid, arm, stage) {
  if (!value || typeof value !== "object") return false;
  const lease = /** @type {Record<string, unknown>} */ (value);
  const suffixes = stage === "bench" ? ["zero", "reader"] : stage === "activation" ? ["w0"] : [];
  return (
    Number.isSafeInteger(pid) && pid > 1 &&
    lease.id === "DX-T1" && lease.kind === "scale-night" && lease.pid === pid &&
    typeof lease.prefix === "string" && /^tx2-dxt1-[a-z0-9-]+$/.test(lease.prefix) &&
    lease.activeArm === arm && suffixes.some((suffix) => arm === lease.prefix + "-" + suffix)
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, pidText, arm, stage] = process.argv.slice(2);
  const pid = Number(pidText);
  // [DX-T1-15] Why: each child borrows a live parent lease only for the exact arm named by the owner.
  // Rejected: trusting a matching PID alone, or allowing one stage's stale grant to start a different stack.
  if (!file || !arm || (stage !== "bench" && stage !== "activation") ||
      !assignedScaleArm(JSON.parse(fs.readFileSync(file, "utf8")), pid, arm, stage))
    throw Error("No matching 24-GiB campaign lease for this arm");
  process.kill(pid, 0);
}
