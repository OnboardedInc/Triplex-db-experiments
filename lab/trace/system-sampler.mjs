// @ts-nocheck -- Linux proc/cgroup and macOS counters have platform-specific wire shapes.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createGzip } from "node:zlib";
import path from "node:path";
const dir = process.argv[2];
fs.mkdirSync(dir, { recursive: true });
const sink = createGzip({ level: 1 });
sink.pipe(
  fs.createWriteStream(path.join(dir, `system-${process.platform}.jsonl.gz`), { flags: "wx" }),
);
const identity = {
  run: process.env.TRIPLEX_TRACE_RUN,
  source: process.env.TRIPLEX_TRACE_SOURCE,
  slot: process.env.TRIPLEX_TRACE_SLOT,
  process: `system-${process.platform}`,
  thread: 0,
};
let done = false;
const read = (f) => {
  try {
    return fs.readFileSync(f, "utf8");
  } catch {
    return null;
  }
};
function sample() {
  const row = { ...identity, type: "resource", at: Date.now() };
  if (process.platform === "linux") {
    const groups = Object.fromEntries(
      (process.env.TX2_ENGINE_CGROUPS ?? "")
        .split(",")
        .filter(Boolean)
        .map((s) => {
          const i = s.indexOf("=");
          return [s.slice(0, i), s.slice(i + 1)];
        }),
    );
    const ownGroup = read("/proc/self/cgroup")
      ?.trim()
      .split("\n")
      .find((s) => s.startsWith("0::"))
      ?.slice(3);
    if (ownGroup) groups.driver = path.join("/sys/fs/cgroup", ownGroup);
    row.cgroups = Object.fromEntries(
      Object.entries(groups).map(([name, dir]) => [
        name,
        Object.fromEntries(
          [
            "cpu.stat",
            "cpu.pressure",
            "memory.current",
            "memory.events",
            "memory.pressure",
            "io.stat",
            "io.pressure",
          ].map((f) => [f, read(path.join(dir, f))]),
        ),
      ]),
    );
    row.vm = Object.fromEntries(
      [
        "/proc/stat",
        "/proc/meminfo",
        "/proc/diskstats",
        "/proc/pressure/cpu",
        "/proc/pressure/memory",
        "/proc/pressure/io",
      ].map((f) => [f, read(f)]),
    );
  } else if (process.platform === "darwin") {
    for (const [key, cmd, args] of [
      ["cpu", "ps", ["-A", "-o", "pcpu=,comm="]],
      ["swap", "sysctl", ["vm.swapusage"]],
      ["memory", "vm_stat", []],
    ]) {
      try {
        const out = execFileSync(cmd, args, {
          encoding: "utf8",
          timeout: 800,
          stdio: ["ignore", "pipe", "pipe"],
        });
        if (key === "cpu") {
          const processes = out
            .trim()
            .split("\n")
            .map((line) => /^\s*([\d.]+)\s+(.*)$/.exec(line))
            .filter(Boolean);
          row.cpu = processes.reduce((sum, p) => sum + Number(p[1]), 0);
          row.otherCpu = processes
            .filter((p) => !/Virtualization|limactl|ssh /.test(p[2]))
            .reduce((sum, p) => sum + Number(p[1]), 0);
          row.callCpu = processes
            .filter((p) => /UVCAssistant|coreaudiod|zoom|Granola|FathomMeeting/.test(p[2]))
            .reduce((sum, p) => sum + Number(p[1]), 0);
        } else row[key] = out;
      } catch {
        row[key] = null;
      }
    }
  }
  sink.write(JSON.stringify(row) + "\n");
}
// [DX-T1] Why: a separate process keeps samples running while the commit isolate is stalled.
// Rejected: sampling only in the writer's event loop (missing exactly the interval under investigation).
const timer = setInterval(sample, 1000);
sample();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    sample();
    sink.end();
  });
