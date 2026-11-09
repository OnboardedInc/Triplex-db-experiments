// [EXP-P2B-R3] Why: correlate tails with whole-host activity without spawning probes on the broker loop.
// Rejected: using load average alone as proof that another process caused a particular sample.
import { parentPort, workerData } from "node:worker_threads";
import fs from "node:fs";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
const fd = fs.openSync(workerData.file, "wx");
const raw = (x) =>
  fs.writeSync(fd, JSON.stringify({ ns: process.hrtime.bigint().toString(), ...x }) + "\n");
let last = os.cpus(),
  tick = 0;
const timer = setInterval(() => {
  const cores = os.cpus();
  let idle = 0,
    total = 0;
  cores.forEach((c, i) => {
    for (const k of Object.keys(c.times)) {
      const d = c.times[k] - last[i].times[k];
      total += d;
      if (k === "idle") idle += d;
    }
  });
  last = cores;
  raw({ type: "host", load: os.loadavg(), busy: total ? 1 - idle / total : 0, free: os.freemem() });
  if (tick++ % 8 === 0)
    try {
      raw({
        type: "processes",
        rows: execFileSync("/bin/ps", ["-Ao", "pid,pcpu,comm"], { encoding: "utf8" })
          .trim()
          .split("\n")
          .slice(1)
          .map((x) => {
            const m = x.trim().match(/^(\d+)\s+([\d.]+)\s+(.+)$/);
            return m ? { pid: +m[1], cpu: +m[2], name: m[3].split("/").at(-1) } : null;
          })
          .filter((x) => x && x.cpu >= 5)
          .sort((a, b) => b.cpu - a.cpu)
          .slice(0, 12),
      });
    } catch (e) {
      raw({ type: "probe-error", error: String(e) });
    }
}, 250);
let io;
try {
  io = spawn("/usr/sbin/iostat", ["-d", "-w", "1"]);
  io.stdout.on("data", (b) => raw({ type: "iostat", text: b.toString() }));
  io.on("error", (e) => raw({ type: "probe-error", error: String(e) }));
} catch (e) {
  raw({ type: "probe-error", error: String(e) });
}
parentPort.on("message", () => {
  clearInterval(timer);
  io?.kill("SIGTERM");
  fs.closeSync(fd);
  parentPort.postMessage({ stopped: true });
});
