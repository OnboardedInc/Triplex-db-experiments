#!/usr/bin/env node
// Independent read-only sampling. The runner owns cancellation and stop actions.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const execute = promisify(execFile),
  args = process.argv.slice(2);
const option = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback);
const root = process.cwd(),
  output = path.resolve(option("--output", "")),
  control = path.resolve(option("--done", ""));
for (const file of [output, control])
  if (!file.startsWith(path.join(root, "qualification") + path.sep))
    throw new Error("Owned evidence paths required");
const nodes = ["triplex-qlever-candidate-a", "triplex-qlever-candidate-b"];
const intervalMs = 100,
  nodeThresholdBytes = 1536 * 1024 ** 2,
  aggregateThresholdBytes = 3072 * 1024 ** 2;
const run = async (values) =>
  (await execute("docker", values, { timeout: 4000, maxBuffer: 65536 })).stdout;
const inspect = async (name) =>
  JSON.parse(
    await run([
      "inspect",
      "--format",
      '{"state":{{json .State}},"memoryBytes":{{.HostConfig.Memory}},"memorySwapBytes":{{.HostConfig.MemorySwap}},"nanoCpus":{{.HostConfig.NanoCpus}}}',
      name,
    ]),
  );
const sample = async (name) => {
  const started = performance.now();
  try {
    const raw = await run([
      "exec",
      name,
      "cat",
      "/sys/fs/cgroup/memory.current",
      "/sys/fs/cgroup/memory.peak",
      "/sys/fs/cgroup/cpu.stat",
      "/proc/1/status",
    ]);
    const lines = raw.trim().split("\n"),
      cpu = {};
    for (const key of [
      "usage_usec",
      "user_usec",
      "system_usec",
      "nr_periods",
      "nr_throttled",
      "throttled_usec",
    ])
      cpu[key] = Number(raw.match(new RegExp(`^${key} (\\d+)$`, "m"))?.[1] ?? 0);
    return {
      name,
      available: true,
      memoryCurrentBytes: Number(lines[0]),
      cgroupMemoryPeakBytes: Number(lines[1]),
      serverRssBytes: Number(raw.match(/^VmRSS:\s+(\d+) kB$/m)?.[1] ?? 0) * 1024,
      serverHighWaterRssBytes: Number(raw.match(/^VmHWM:\s+(\d+) kB$/m)?.[1] ?? 0) * 1024,
      cpu,
      observationMs: performance.now() - started,
    };
  } catch (error) {
    return {
      name,
      available: false,
      error: String(error),
      observationMs: performance.now() - started,
    };
  }
};
mkdirSync(path.dirname(output), { recursive: true });
const report = {
  format: "triplex-independent-candidate-resource-watch/1",
  startedUtc: new Date().toISOString(),
  requestedSampleIntervalMs: intervalMs,
  nodeThresholdBytes,
  aggregateThresholdBytes,
  inspectBefore: Object.fromEntries(
    await Promise.all(nodes.map(async (name) => [name, await inspect(name)])),
  ),
  samples: [],
  thresholdEvents: [],
  limitations: [
    "Read-only corroboration; this watcher never cancels, restarts or kills servers.",
    "Dockerexec latency makes actual sample cadence variable; exact timings are retained.",
    "cgroup memory includes cache; serverRSS is read independently from PID1 VmRSS. Peaks can be missed.",
    "memory.peak and VmHWM include work before this watcher; they are not per-query deltas.",
  ],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
writeFileSync(
  output + ".ready.json",
  JSON.stringify({ ready: true, output, done: control }) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify({ ready: true, output, done: control }));
const started = performance.now(),
  maximumMs = Number(option("--max-ms", "600000"));
while (!existsSync(control) && performance.now() - started < maximumMs) {
  const sampleStarted = performance.now(),
    observations = await Promise.all(nodes.map(sample));
  const available = observations.filter((item) => item.available),
    total = available.reduce((sum, item) => sum + item.serverRssBytes, 0);
  const event = {
    timestampUtc: new Date().toISOString(),
    elapsedMs: performance.now() - started,
    observations,
    aggregateServerRssBytes: total,
    watcherMemory: process.memoryUsage(),
  };
  report.samples.push(event);
  const threshold =
    available.some((item) => item.serverRssBytes >= nodeThresholdBytes) ||
    total >= aggregateThresholdBytes;
  if (threshold && !report.thresholdEvents.length) {
    report.thresholdEvents.push(event);
    writeFileSync(output + ".threshold.json", JSON.stringify(event, null, 2) + "\n", {
      flag: "wx",
    });
    console.log(JSON.stringify({ threshold: true, aggregateServerRssBytes: total, output }));
  }
  if (report.samples.length % 10 === 0)
    writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, intervalMs - (performance.now() - sampleStarted))),
  );
}
report.finishedUtc = new Date().toISOString();
report.finishReason = existsSync(control) ? "RUNNER_DONE_FLAG" : "WATCHDOG_DEADLINE";
report.inspectAfter = Object.fromEntries(
  await Promise.all(nodes.map(async (name) => [name, await inspect(name)])),
);
report.sampledPeakAggregateServerRssBytes = Math.max(
  0,
  ...report.samples.map((sample) => sample.aggregateServerRssBytes),
);
report.sampledPeakServerRssBytes = Object.fromEntries(
  nodes.map((name) => [
    name,
    Math.max(
      0,
      ...report.samples.flatMap((sample) =>
        sample.observations
          .filter((item) => item.name === name && item.available)
          .map((item) => item.serverRssBytes),
      ),
    ),
  ]),
);
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    finished: true,
    output,
    reason: report.finishReason,
    thresholds: report.thresholdEvents.length,
    samples: report.samples.length,
  }),
);
