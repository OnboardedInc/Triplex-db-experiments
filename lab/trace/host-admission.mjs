// @ts-nocheck -- [DX-T1-12] Why: decode passive Mac admission counters at a checked boundary; keep failures as unknown, never as zero.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? null;
const native = (command, args) => execFileSync(command, args, { encoding: "utf8", timeout: 5000 });
export const HOST_SAMPLE_MS = 60_000;
export const ARM_RETRY_MS = 20 * HOST_SAMPLE_MS;
// [DX-T1-13] Why: night admission implements Sam's four explicit conditions; pressure, power and clock observations remain visible diagnostics.
// Rejected: lifetime ps CPU percentages or extra memory/log-path blockers that refuse an otherwise quiet Mac.
export function evaluateHostGate(samples, context) {
  const issues = [];
  if (samples.length < 60 || samples.at(-1)?.monoMs - samples[0]?.monoMs < 59000)
    issues.push("fewer than 60 one-second passive samples");
  for (const key of ["monoMs", "swapBytes", "otherCpu"])
    if (!samples.length || samples.some((s) => !Number.isFinite(s[key]) || s[key] < 0))
      issues.push("missing or invalid " + key);
  if (samples.some((s) => s.error || !Array.isArray(s.busyApps)))
    issues.push("native counter unavailable");
  const swapMax = Math.max(...samples.map((s) => s.swapBytes / 1024 ** 3));
  const cpu = median(samples.map((s) => s.otherCpu));
  if (swapMax >= 6) issues.push(`swap ${swapMax.toFixed(3)} GiB must be below 6 GiB`);
  if (cpu >= 25)
    issues.push(`non-VM Mac CPU median ${cpu.toFixed(1)}% must be below 25% of one core`);
  const apps = [...new Set(samples.flatMap((s) => s.busyApps ?? []))];
  if (apps.length) issues.push("named apps must be closed: " + apps.join(", "));
  if (!Number.isFinite(context.diskFreeBytes) || context.diskFreeBytes < 20 * 1024 ** 3)
    issues.push(
      `free disk ${Number.isFinite(context.diskFreeBytes) ? (context.diskFreeBytes / 1024 ** 3).toFixed(3) : "unknown"} GiB must be at least 20 GiB`,
    );
  return {
    schema: "triplex.host-gate/2",
    eligible: issues.length === 0,
    issues: [...new Set(issues)],
    samples: samples.length,
    swapGiB: median(samples.map((s) => s.swapBytes / 1024 ** 3)),
    swapMaxGiB: swapMax,
    macCpuMedian: cpu,
    cpuUnit: "percent of one core; interval process CPU deltas, VM excluded",
    topProcesses: topProcessCpu(samples),
    context,
    diagnostics: {
      pressure: [...new Set(samples.map((s) => s.pressure))],
      minimumFreeInactiveBytes: Math.min(...samples.map((s) => s.freeInactiveBytes)),
      swapoutDelta: samples.at(-1)?.swapouts - samples[0]?.swapouts,
      compressionDelta: samples.at(-1)?.compressions - samples[0]?.compressions,
    },
    note: "Passive admission only, not a latency or oracle PASS. No requests, warmers, process demotion or app shutdown.",
  };
}
export function parseProcessTimes(text) {
  const rows = new Map();
  for (const line of text.trim().split("\n")) {
    const m = /^\s*(\d+)\s+(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)\s+(.+)$/.exec(line);
    if (!m) throw Error("Unsupported native process time row");
    const [, pid, days, hours, minutes, seconds, command] = m;
    rows.set(Number(pid), {
      name: path.basename(command),
      cpuMs:
        ((Number(days ?? 0) * 24 + Number(hours ?? 0)) * 3600 +
          Number(minutes) * 60 +
          Number(seconds)) *
        1000,
    });
  }
  if (!rows.size) throw Error("Empty native process inventory");
  return rows;
}
function processCpuDeltas(previous, current, samplerPid) {
  const deltas = new Map();
  for (const [pid, row] of current) {
    const old = previous.get(pid);
    if (
      pid !== samplerPid &&
      old &&
      old.name === row.name &&
      row.cpuMs > old.cpuMs &&
      !/Virtualization|qemu-system|limactl/.test(row.name)
    ) {
      deltas.set(row.name, (deltas.get(row.name) ?? 0) + row.cpuMs - old.cpuMs);
    }
  }
  return [...deltas];
}
function totalCpu(deltas, elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) throw Error("Invalid native CPU interval");
  return (100 * deltas.reduce((sum, [, ms]) => sum + ms, 0)) / elapsedMs;
}
export function processCpuInterval(previous, current, elapsedMs) {
  return processCpuSample(previous, current, elapsedMs).otherCpu;
}
export function processCpuSample(previous, current, elapsedMs, samplerPid = -1) {
  const processCpuMs = processCpuDeltas(previous, current, samplerPid);
  return { processElapsedMs: elapsedMs, processCpuMs, otherCpu: totalCpu(processCpuMs, elapsedMs) };
}
// [DX-T1-15] Why: rank actual interval CPU time by executable basename across the complete sampled window.
// Rejected: lifetime ps percentages, arguments/paths in the evidence, or treating a process absent at either endpoint as observed.
export function topProcessCpu(samples) {
  const totals = new Map();
  let elapsedMs = 0;
  for (const sample of samples) {
    if (!Array.isArray(sample.processCpuMs) || !(sample.processElapsedMs > 0)) continue;
    elapsedMs += sample.processElapsedMs;
    for (const [name, ms] of sample.processCpuMs) totals.set(name, (totals.get(name) ?? 0) + ms);
  }
  if (elapsedMs === 0) return null; // Older receipts contain only the total.
  return [...totals]
    .sort(([a, ams], [b, bms]) => bms - ams || a.localeCompare(b))
    .slice(0, 10)
    .map(([name, ms]) => ({ name, percent: (100 * ms) / elapsedMs }));
}
export async function collectHostGate(count = 60) {
  if (os.platform() !== "darwin") throw Error("Strict host admission requires the Mac host");
  const samples = [];
  let previous = parseProcessTimes(native("/bin/ps", ["-A", "-o", "pid=,time=,comm="])),
    previousAt = performance.now();
  for (let i = 0; i < count; i++) {
    await new Promise((r) => setTimeout(r, Math.max(1, 1000 - (performance.now() - previousAt))));
    const s = { at: Date.now(), monoMs: performance.now() };
    try {
      s.swapBytes =
        Number(/used = ([\d.]+)M/.exec(native("/usr/sbin/sysctl", ["vm.swapusage"]))?.[1]) *
        1024 ** 2;
      const current = parseProcessTimes(native("/bin/ps", ["-A", "-o", "pid=,time=,comm="])),
        currentAt = performance.now();
      Object.assign(s, processCpuSample(previous, current, currentAt - previousAt, process.pid));
      previous = current;
      previousAt = currentAt;
      s.busyApps = [
        ...new Set(
          [...current.values()]
            .filter((r) => /^(Google Chrome(?: Helper.*)?|Slack(?: Helper.*)?|Paste)$/.test(r.name))
            .map((r) => r.name),
        ),
      ];
    } catch (e) {
      s.error = String(e.message);
    }
    // [DX-T1-13] Why: absent diagnostic gauges must not prevent a quiet host's required CPU/swap/app observation.
    // Rejected: putting optional pressure/load commands in the required native-counter try block.
    try {
      const vm = native("/usr/bin/vm_stat", []),
        page = Number(/page size of (\d+)/.exec(vm)?.[1]);
      const counter = (name) => Number(new RegExp("^" + name + ":\\s+(\\d+)", "m").exec(vm)?.[1]);
      s.freeInactiveBytes = (counter("Pages free") + counter("Pages inactive")) * page;
      s.compressions = counter("Compressions");
      s.swapouts = counter("Swapouts");
      s.pressure = Number(
        native("/usr/sbin/sysctl", ["-n", "kern.memorystatus_vm_pressure_level"]).trim(),
      );
      s.load1 = Number(
        native("/usr/sbin/sysctl", ["-n", "vm.loadavg"])
          .replace(/[{}]/g, "")
          .trim()
          .split(/\s+/)[0],
      );
    } catch (error) {
      s.diagnosticError = String(error.message);
    }
    samples.push(s);
  }
  const context = {
    diskFreeBytes:
      Number(fs.statfsSync(process.cwd()).bavail) * Number(fs.statfsSync(process.cwd()).bsize),
  };
  try {
    context.acPower = /AC Power/.test(native("/usr/bin/pmset", ["-g", "batt"]));
    const power = native("/usr/bin/pmset", ["-g", "custom"]),
      ac = power.split(/AC Power:/)[1]?.split(/\n\S[^\n]*:/)[0];
    context.lowPowerOff = typeof ac === "string" && /lowpowermode\s+0\b/.test(ac);
    const thermal = native("/usr/bin/pmset", ["-g", "therm"]);
    context.thermalNormal =
      thermal
        .split("\n")
        .filter((l) => !/\bNo .*warning/i.test(l))
        .every((l) => !/(thermal|performance).*warning/i.test(l)) &&
      [...thermal.matchAll(/CPU_(?:Speed|Scheduler)_Limit\s*=\s*(\d+)/g)].every(
        (m) => Number(m[1]) === 100,
      );
    const logPath = ["triplex2", "colima-triplex2"]
      .map((n) => path.join(os.homedir(), ".colima/_lima", n, "ha.stderr.log"))
      .find((p) => fs.existsSync(p));
    if (!logPath) throw Error("Triplex2 guest clock log unavailable");
    const log = fs.readFileSync(logPath, "utf8");
    context.clockLogObserved = true;
    context.recentGuestClockSteps = log
      .split("\n")
      .filter((l) => l.includes("guest clock adjusted"))
      .filter((l) => {
        const m = /"time":"([^"]+)"/.exec(l);
        return !m || Date.parse(m[1]) >= Date.now() - 600000;
      }).length;
  } catch (e) {
    context.error = String(e.message);
  }
  return { ...evaluateHostGate(samples, context), samplesRaw: samples };
}

// [DX-T1-15] Why: prior-arm host work and kernel writeback get a passive 60s settle; refusals get independent one-minute windows.
// Rejected: relaxing the 25% bar, reusing a prior gate, or starting after the arm's time reservation has expired.
export async function waitForArmHost({
  checkTime,
  onSample,
  collect = collectHostGate,
  pause = sleep,
  wallNow = Date.now,
  monoNow = () => performance.now(),
}) {
  // Real 60-s collections include small ps/sysctl overhead. Reserve an extra second at each window boundary.
  const sampleReserveMs = HOST_SAMPLE_MS + 1_000;
  checkTime(wallNow() + HOST_SAMPLE_MS + sampleReserveMs);
  await pause(HOST_SAMPLE_MS);
  const deadline = monoNow() + ARM_RETRY_MS;
  let last = null,
    attempts = 0;
  while (monoNow() + sampleReserveMs <= deadline) {
    try {
      checkTime(wallNow() + sampleReserveMs);
    } catch (error) {
      return { gate: last, attempts, reason: error.message };
    }
    const started = monoNow();
    last = await collect();
    attempts++;
    onSample(last, attempts);
    if (last.eligible) {
      try {
        checkTime(wallNow());
      } catch (error) {
        return { gate: last, attempts, reason: error.message };
      }
      if (monoNow() <= deadline) return { gate: last, attempts, reason: null };
      break;
    }
    const delay = Math.max(0, HOST_SAMPLE_MS - (monoNow() - started));
    if (monoNow() + delay + sampleReserveMs > deadline) break;
    if (delay) await pause(delay);
  }
  return {
    gate: last,
    attempts,
    reason: `20-minute retry window exhausted${last?.issues.length ? ": " + last.issues.join("; ") : ""}`,
  };
}
export function hostGateLine(result) {
  const top = result.topProcesses
    ?.map(({ name, percent }) => `${name} ${percent.toFixed(1)}%`)
    .join(", ");
  const status = result.eligible
    ? `Night host gate admitted: swap ${result.swapGiB.toFixed(3)} GiB, Mac CPU ${result.macCpuMedian.toFixed(1)}%, disk ${(result.context.diskFreeBytes / 1024 ** 3).toFixed(2)} GiB; named apps closed`
    : `Night host gate REFUSED: ${result.issues.join("; ")}`;
  return `${status}${top ? `; top CPU ${top}` : ""}`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await collectHostGate();
  const text = JSON.stringify(result, null, 2) + "\n";
  if (process.argv[2]) {
    fs.writeFileSync(process.argv[2], text, { flag: "wx" });
    console.log(hostGateLine(result));
  } else process.stdout.write(text);
  process.exitCode = result.eligible ? 0 : 1;
}
