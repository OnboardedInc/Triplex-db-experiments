import fs from "node:fs";
import { spawn } from "node:child_process";
// [DX-H5] Why: retain cgroup counters even when the sweep fails before its receipt completes.
// Rejected: attributing whole-stack CPU to individual overlapping pages.
const out = "runs/DX-H5-vm";
fs.mkdirSync(out, { recursive: true });
const entries = (process.env.TX2_ENGINE_CGROUPS ?? "")
  .split(",")
  .filter(Boolean)
  .map((x) => x.split("="));
const sample = () =>
  fs.appendFileSync(
    out + "/cgroups.ndjson",
    JSON.stringify({
      atMs: Date.now(),
      peers: Object.fromEntries(
        entries.map(([k, p]) => [k, fs.readFileSync(p + "/cpu.stat", "utf8")]),
      ),
    }) + "\n",
  );
sample();
const timer = setInterval(sample, 1000);
const child = spawn(
  "node",
  ["--experimental-strip-types", "lab/bench/driver.ts", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => {
  clearInterval(timer);
  sample();
  process.exitCode = code ?? 1;
});
