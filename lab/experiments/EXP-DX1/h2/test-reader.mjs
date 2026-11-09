import fs from "node:fs";
import { spawn } from "node:child_process";
import { measurementLease } from "../../../bench/lib/w0-lease.ts";
// [DX-H2] Why: integration equivalence uses the same global lease as timed engine runs.
// Rejected: invoking an engine-backed node:test gate without measurement exclusion.
const dir = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H2/reader-tests";
fs.mkdirSync(dir, { recursive: true });
let child;
const lease = await measurementLease(async () => {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
  await new Promise((resolve) => child.once("exit", resolve));
  clearTimeout(timer);
});
try {
  child = spawn(
    process.execPath,
    ["--test", ...process.argv.slice(2), "lab/bench/test/w0-datomic.test.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DXH2_TEST_DIR: dir,
        DATOMIC_URL: "http://127.0.0.1:8497",
        DATOMIC_READ_URLS: "http://127.0.0.1:8498",
      },
    },
  );
  process.exitCode = await new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
} finally {
  lease.release();
}
