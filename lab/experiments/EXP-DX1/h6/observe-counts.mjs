import fs from "node:fs";
import { spawn } from "node:child_process";
// [DX-H6] Why: retain cgroup counters even when the sweep fails before its receipt completes.
// Rejected: attributing whole-stack CPU to individual overlapping pages.
const out = "runs/DX-H6-vm";
fs.mkdirSync(out, { recursive: true });
const entries = (process.env.TX2_ENGINE_CGROUPS ?? "")
  .split(",")
  .filter(Boolean)
  .map((x) => x.split("="));
// [DX-H6] Why: the driver cgroup includes worker threads and the independent Python oracle.
// Rejected: treating main-thread CPU as the entire client/evaluation cost.
const ownPath = fs
  .readFileSync("/proc/self/cgroup", "utf8")
  .trim()
  .split("\n")
  .find((line) => line.startsWith("0::"))
  ?.slice(3);
if (ownPath && fs.existsSync("/sys/fs/cgroup" + ownPath + "/cpu.stat"))
  entries.push(["driver-with-oracle", "/sys/fs/cgroup" + ownPath]);
// [DX-H6] Why: an OOM or throttled read must retain resource observations even without a final receipt.
// Rejected: diagnosing every abrupt client exit as a transport failure.
const optional = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
};
const sample = () =>
  fs.appendFileSync(
    out + "/cgroups.ndjson",
    JSON.stringify({
      atMs: Date.now(),
      peers: Object.fromEntries(
        entries.map(([name, p]) => [name, fs.readFileSync(p + "/cpu.stat", "utf8")]),
      ),
      resources: Object.fromEntries(
        entries.map(([name, p]) => [
          name,
          {
            memoryCurrent: optional(p + "/memory.current"),
            memoryPeak: optional(p + "/memory.peak"),
            memoryEvents: optional(p + "/memory.events"),
            io: optional(p + "/io.stat"),
          },
        ]),
      ),
    }) + "\n",
  );

sample();
const timer = setInterval(sample, 1000);
const child = spawn(
  "node",
  [
    "--experimental-strip-types",
    "lab/experiments/EXP-DX1/h6/counts-driver.ts",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => {
  clearInterval(timer);
  sample();
  process.exitCode = code ?? 1;
});
