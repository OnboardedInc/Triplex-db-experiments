import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { threadId } from "node:worker_threads";
let started = false;
// [DX-T1-4] Why: two out-of-phase clock brackets verify V8 sample time against the guest boot clock.
// Rejected: guessing a profile offset from a slow request, or charging unsampled gaps to JavaScript CPU.
function triplexCpuProfileClockMarker(): void {
  const until = process.hrtime.bigint() + 6_000_000n;
  while (process.hrtime.bigint() < until) {
    /* [DX-T1-4] Why: make a short calibration stack sampleable before/after timed work. Rejected: work inside a measured phase. */
  }
}
export function cpuProfileClock(stage: "start" | "end"): void {
  if (process.env.TRIPLEX_TRACE_CPU_PROFILE !== "1") return;
  const dir = process.env.TRIPLEX_TRACE_DIR;
  if (!dir || process.platform !== "linux")
    throw new Error("CPU profile requires an owned Linux trace directory");
  fs.mkdirSync(dir, { recursive: true });
  const before = Number(process.hrtime.bigint()) / 1e6;
  triplexCpuProfileClockMarker();
  const after = Number(process.hrtime.bigint()) / 1e6;
  const row = {
    type: "cpu-profile-clock",
    stage,
    run: process.env.TRIPLEX_TRACE_RUN,
    source: process.env.TRIPLEX_TRACE_SOURCE,
    slot: process.env.TRIPLEX_TRACE_SLOT,
    process: `node-${process.pid}`,
    thread: threadId,
    beforeMonoMs: before,
    afterMonoMs: after,
    at: performance.timeOrigin + performance.now(),
    clock: {
      domain: "linux-monotonic",
      bootId: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
    },
  };
  fs.appendFileSync(
    path.join(dir, `cpu-profile-clock-${process.pid}-${threadId}.jsonl`),
    JSON.stringify(row) + "\n",
    { flag: started ? "a" : "wx" },
  );
  started = true;
}
