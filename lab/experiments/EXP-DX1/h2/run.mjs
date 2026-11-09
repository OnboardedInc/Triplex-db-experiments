import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
const composition = "reach";
if (!["public", "reach", "both"].includes(composition))
  throw Error("usage: run.sh public|reach|both [driver flags]");
const evidence = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H2";
let child;
let timedOut = false;

for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    timedOut = true;
    child?.kill(signal);
  });
// [DX-H2] Why: the driver rotates bounded leases between seed ACKs; cap the whole command at the task time box.
// Rejected: one unbounded measurement lease across seeding.
const timer = setTimeout(() => {
  timedOut = true;
  child?.kill("SIGTERM");
  setTimeout(() => child?.kill("SIGKILL"), 3000).unref();
}, 10800_000);
try {
  for (const selected of composition === "both" ? ["public", "reach"] : [composition]) {
    const id = selected + "-" + Date.now();
    const destination = path.join(evidence, "runs", id);
    fs.mkdirSync(destination, { recursive: true });
    fs.mkdirSync("runs", { recursive: true });
    const link = path.resolve("runs", "DX-H2-" + id);
    fs.symlinkSync(destination, link, "dir");
    const args = [
      "lab/bench/driver.ts",
      "--lane",
      "datomic",
      "--composition",
      selected,
      "--world",
      "w0",
      "--output",
      path.join(link, "receipt.json"),
      ...process.argv.slice(2),
    ];
    const env = {
      ...process.env,
      DATOMIC_URL: process.env.DATOMIC_URL ?? "http://127.0.0.1:8497",
      DATOMIC_READ_URLS: process.env.DATOMIC_READ_URLS ?? "http://127.0.0.1:8498",
    };
    fs.writeFileSync(
      path.join(destination, "command.json"),
      JSON.stringify(
        {
          args,
          endpoints: { DATOMIC_URL: env.DATOMIC_URL, DATOMIC_READ_URLS: env.DATOMIC_READ_URLS },
          head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          engine: {
            containers: process.env.TX2_ENGINE_CONTAINER ?? null,
            cpus: process.env.TX2_ENGINE_CPUS ?? null,
          },
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    const log = fs.openSync(path.join(destination, "console.log"), "w");
    child = spawn(process.execPath, args, { env, stdio: ["ignore", log, log] });
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code) => resolve(code ?? 1));
    });
    fs.closeSync(log);
    process.stderr.write("Evidence: " + destination + "\n");
    process.exitCode = Math.max(process.exitCode ?? 0, code);
    if (timedOut) break;
  }
} finally {
  clearTimeout(timer);
}
