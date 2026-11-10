import fs from "node:fs";
import path from "node:path";
// [DX-H5] Why: keep each page's actual observations inspectable and avoid summing overlapping cgroup intervals.
// Rejected: inventing an exclusive stage partition from concurrent inclusive wall timers.
const root = process.argv[2];
const lines = (f) =>
  fs
    .readFileSync(f, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((s) => JSON.parse(s));
const f = (x) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(3) : "—");
const out = [
  "# DX-H5 page and cgroup observations",
  "",
  "Derived observations only; no verdict. Times are seconds, bytes decimal MB. CPU is thread seconds unless explicitly marked cgroup. Page age includes startup and occupied workers. Dispatch is assignment-to-worker-receipt. Publication queue excludes verification/build/commit. Gateway header is service wall, not CPU.",
  "",
];
const windows = [];
for (const name of fs
  .readdirSync(root)
  .filter((n) => /^tx2-dxh5-w/.test(n))
  .sort()) {
  const dir = path.join(root, name, "driver"),
    file = path.join(dir, "activation-pages.ndjson");
  if (!fs.existsSync(file)) continue;
  const pages = lines(file).sort((a, b) => a.page - b.page);
  if (!pages.length) continue;
  const receipt = JSON.parse(fs.readFileSync(path.join(dir, "receipt.json"), "utf8"));
  out.push(
    `## ${name}`,
    "",
    "| Page | Subjects | Rows | MB | Read HTTPs | Page age | Dispatch | Read | Gateway | World | Kernel | Encode | Publish queue | Verify | Outbox build | Commit | Publish datoms | Client CPU |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const p of pages) {
    const t = p.timing;
    out.push(
      `| ${p.page} | ${p.subjects} | ${t.rows} | ${f(t.responseBytes / 1e6)} | ${t.readRequests} | ${f(t.workerWaitMs / 1000)} | ${f(t.workerDispatchWaitMs / 1000)} | ${f(t.readWallMs / 1000)} | ${f(t.gatewayMicros / 1e6)} | ${f(t.decodeWallMs / 1000)} | ${f(t.evaluateWallMs / 1000)} | ${f(t.resultEncodeWallMs / 1000)} | ${f(t.publishQueueMs / 1000)} | ${f(t.verificationMs / 1000)} | ${f(t.buildOutboxMs / 1000)} | ${f(t.publishCommitMs / 1000)} | ${t.publishDatoms ?? "—"} | ${f(p.cpu?.total)} |`,
    );
  }
  const start = pages[0].timing.assignedAtEpochMs - pages[0].timing.assignedAtMs;
  const end = start + receipt.sweep.wallMs;
  const samples = lines(path.join(dir, "cgroups.ndjson")).filter(
    (s) => s.atMs >= start && s.atMs <= end,
  );
  const first = samples[0],
    last = samples.at(-1);
  if (samples.length < 2) continue;
  const seconds = (last.atMs - first.atMs) / 1000;
  const usage = (s) => Number(/^usage_usec (\d+)/m.exec(s ?? "")?.[1]);
  const cpu = {};
  const peak = {};
  for (const key of Object.keys(first.peers)) {
    const delta = (usage(last.peers[key]) - usage(first.peers[key])) / 1e6;
    cpu[key] = { cpuS: delta, cpuPerSampledSecond: delta / seconds };
    peak[key] = Math.max(...samples.map((s) => Number(s.resources?.[key]?.memoryPeak ?? 0)));
  }
  windows.push({
    name,
    sweepStartEpochMs: start,
    sweepEndEpochMs: end,
    sampledStartEpochMs: first.atMs,
    sampledEndEpochMs: last.atMs,
    sampledSeconds: seconds,
    cpu,
    peak,
  });
  out.push(
    "",
    `Cgroup inner sampled interval: ${f(seconds)} s of ${f(receipt.sweep.wallMs / 1000)} s sweep. Shared live traffic and the Python oracle are included. No per-page cgroup deltas are added.`,
    "",
    "| Cgroup | CPU seconds | CPUs in sampled interval | Peak bytes since container start |",
    "| --- | ---: | ---: | ---: |",
  );
  for (const [key, v] of Object.entries(cpu))
    out.push(`| ${key} | ${f(v.cpuS)} | ${f(v.cpuPerSampledSecond)} | ${peak[key]} |`);
  out.push("");
}
fs.writeFileSync(path.join(root, "PAGES.md"), out.join("\n") + "\n");
fs.writeFileSync(path.join(root, "cgroup-windows.json"), JSON.stringify(windows, null, 2) + "\n");
console.log(JSON.stringify(windows, null, 2));
