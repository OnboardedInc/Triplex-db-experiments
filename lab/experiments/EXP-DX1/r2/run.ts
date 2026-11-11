import { runReplicaDriver } from "../../../bench/lib/w0-replica-driver.ts";
if (process.argv.includes("--corpus")) await import("./corpus-run.ts");
else await runReplicaDriver(process.argv.slice(2));
