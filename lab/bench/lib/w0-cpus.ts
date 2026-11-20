import { execFileSync } from "node:child_process";
import { readFileSync, readlinkSync, readdirSync } from "node:fs";

// [DX-ACT1] Why: benchmark the worker ladder without lending the two live reader cores to evaluators. Rejected: counting vCPUs or changing a process-wide mask after worker creation.
export const evalCpus = [7, 8, 9, 10, 11] as const;
export function workerCount(value: string) {
  if (!/^[1-5]$/.test(value)) throw Error("Evaluator count must be 1 through 5 on this profile");
  return Number(value);
}
const tid = () => readlinkSync("/proc/thread-self").split("/").at(-1)!;
function pin(id: string, cpus: string) {
  execFileSync("taskset", ["-pc", cpus, id], { stdio: "pipe" });
}
const affinity = () =>
  /^Cpus_allowed_list:\s*(.+)$/m
    .exec(readFileSync("/proc/thread-self/status", "utf8"))?.[1]
    ?.trim();
export function pinCoordinator() {
  if (process.platform !== "linux")
    throw Error("Reserved activation cores require the Linux bench");
  for (const id of readdirSync("/proc/self/task")) {
    try {
      pin(id, "6-11");
    } catch (e) {
      if (readdirSync("/proc/self/task").includes(id)) throw e;
    }
  }
  pin(tid(), "6");
  if (affinity() !== "6") throw Error("Coordinator CPU readback failed");
  process.env.DX_ACT1_RESERVED_CPUS = "1";
  return 6;
}
export function pinWorker(
  role: "reader" | "writer" | "follower" | "evaluator" | "selector",
  index = 0,
) {
  if (process.env.DX_ACT1_RESERVED_CPUS !== "1") return undefined;
  const cpu =
    role === "reader"
      ? [3, 5][index]
      : role === "evaluator"
        ? evalCpus[index]
        : role === "selector"
          ? 7
          : 6;
  if (cpu === undefined) throw Error("Worker outside reserved CPU plan");
  pin(tid(), String(cpu));
  if (affinity() !== String(cpu)) throw Error("Worker CPU readback failed");
  return cpu;
}
