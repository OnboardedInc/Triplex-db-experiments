// [DX-T1-10] Why: a bounded diagnostic on its own file tests the database disk's idle path without touching any PG data.
// Rejected: a default keep-warm process, fsync on a PG file, or unrecorded background writes.
import fs from "node:fs";
import { once } from "node:events";
const prefix = process.env.TRIPLEX_TRACE_RUN,
  source = process.env.TRIPLEX_TRACE_SOURCE;
if (
  !/^tx2-dxt1-[a-z0-9-]+$/.test(prefix ?? "") ||
  !/^[a-f0-9]{40}$/.test(source ?? "") ||
  process.env.TRIPLEX_TRACE_SLOT !== prefix
)
  throw Error("Unbound disk sentinel");
const output = fs.createWriteStream("/trace/idle-sentinel.jsonl", { flags: "wx" });
const fd = fs.openSync("/probe/idle-sentinel.bin", "wx"),
  buffer = Buffer.alloc(4096, 0x5a);
let stopped = false,
  sequence = 0;
process.on("SIGTERM", () => {
  stopped = true;
});
const until = Date.now() + 1800000;
while (!stopped && Date.now() < until) {
  const at = performance.timeOrigin + performance.now(),
    cpu = process.cpuUsage();
  fs.writeSync(fd, buffer, 0, buffer.length, 0);
  const syncAt = performance.timeOrigin + performance.now();
  fs.fdatasyncSync(fd);
  const end = performance.timeOrigin + performance.now(),
    usage = process.cpuUsage(cpu);
  const row = {
    type: "disk-sentinel",
    process: "idle-sentinel",
    at,
    syncAt,
    end,
    sequence: ++sequence,
    run: prefix,
    source,
    slot: prefix,
    bytes: 4096,
    cpuMs: (usage.user + usage.system) / 1000,
    deviceNumber: fs.fstatSync(fd).dev,
  };
  if (!output.write(JSON.stringify(row) + "\n")) await once(output, "drain");
  await new Promise((r) => setTimeout(r, Math.max(0, 10 - (end - at))));
}
fs.closeSync(fd);
output.end();
await once(output, "finish");
