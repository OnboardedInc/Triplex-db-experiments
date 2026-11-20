import { spawn } from "node:child_process";
import { acquireMeasureLease } from "../../../bin/heavy-lock.mjs";

// [DX-PREP1] Why: the heavy parent owns one admission. Drain the remaining tokens for the timed SQL run.
// Rejected: stopping any other holder or inferring an idle VM from a granted lease.
const started = Date.now();
let lease;
try {
  lease = await acquireMeasureLease("DX-PREP1 guard diagnosis", {
    holder: "DX-PREP1",
    pollMs: 1000,
    timeoutMs: 360_000,
  });
} catch (error) {
  if (error?.code !== "LEASE_TIMEOUT") throw error;
}
console.log(
  "PREP1_LEASE " +
    JSON.stringify({
      drained: Boolean(lease),
      waitMs: Date.now() - started,
    }),
);
try {
  const [executable, ...args] = process.argv.slice(2);
  const child = spawn(executable, args, { stdio: "inherit" });
  process.exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
} finally {
  lease?.release();
}
