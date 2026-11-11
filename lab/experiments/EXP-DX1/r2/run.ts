import { runReplicaDriver } from "../../../bench/lib/w0-replica-driver.ts";
const args = process.argv.slice(2);
if (args.includes("--corpus")) await import("./corpus-run.ts");
else {
  await runReplicaDriver(args);
  // [DX-R2] Why: equality and the corpus share one bounded 1k clone, reducing contention for the measurement lock.
  // Rejected: another engine admission just to run the small supported-scope corpus; 10k numbers still use a fresh clone.
  if (args.includes("--corpus-after")) await import("./corpus-run.ts");
}
