import fs from "node:fs";
import path from "node:path";
// [DX-H5] Why: derive tables from retained bytes, preserving failed prefixes and overlapping stage demand.
// Rejected: assigning zero to missing observations or adding inclusive timers into exclusive wall time.
const root = process.argv[2];
const sum = (rows, key) =>
  rows.reduce((n, row) => n + (typeof row[key] === "number" ? row[key] : 0), 0);
const safeRate = (n, d) => (d > 0 ? n / d : null);
const fmt = (n) => (typeof n === "number" && Number.isFinite(n) ? n.toFixed(3) : "—");
const output = [];
const md = [
  "# DX-H5 derived measurements",
  "",
  "Diagnostic only. Existing gate statuses are copied; this analyzer grants no verdict.",
  "",
];
for (const prefix of fs
  .readdirSync(root)
  .filter((name) => name.startsWith("tx2-dxh5-"))
  .sort()) {
  const dir = path.join(root, prefix, "driver"),
    file = path.join(dir, "receipt.json");
  if (!fs.existsSync(file)) continue;
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const log = path.join(dir, "activation-pages.ndjson");
  const pages = fs.existsSync(log)
    ? fs
        .readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  const timing = pages.map((p) => p.timing);
  const hasRows = timing.some((t) => typeof t.rows === "number");
  const rows = sum(timing, "rows");
  const stages = [
    ["Read and wire decode", "readWallMs", "read"],
    ["Build world and canonical sort", "decodeWallMs", "decode"],
    ["Evaluate kernel", "evaluateWallMs", "kernel"],
    ["Index page rows", "indexWallMs", "index"],
    ["Encode worker result", "resultEncodeWallMs", "resultEncode"],
    ["Controller JSON decode", "controllerDecodeMs", null],
    ["Build outbox", "buildOutboxMs", null],
    ["Publish commit", "publishCommitMs", null],
    ["Independent verification", "verificationMs", null],
  ];
  const stageRows = stages.map(([stage, key, cpuKey]) => {
    const has = timing.some((t) => typeof t[key] === "number");
    const wallS = has ? sum(timing, key) / 1000 : null;
    const hasCpu = cpuKey && pages.some((p) => typeof p.cpu?.[cpuKey] === "number");
    const cpuS = hasCpu ? pages.reduce((n, p) => n + (p.cpu?.[cpuKey] ?? 0), 0) : null;
    return {
      stage,
      demandS: wallS,
      demandPerWallSecond:
        wallS !== null && r.sweep?.wallMs > 0 ? wallS / (r.sweep.wallMs / 1000) : null,
      workerThreadCpuS: cpuS,
      inputRowsPerCpuS: cpuS && hasRows ? safeRate(rows, cpuS) : null,
      cpusAt440kRowsPerS: cpuS && hasRows ? safeRate(440000 * cpuS, rows) : null,
    };
  });
  const preview = r.preview?.metrics ?? [];
  const previewRows = sum(preview, "rows");
  const calibration = ["read", "index", "decode", "evaluate", "hash"].map((stage) => {
    const cpuS = sum(preview, stage + "CpuMs") / 1000;
    return {
      stage,
      cpuS: preview.length ? cpuS : null,
      inputRowsPerCpuS: safeRate(previewRows, cpuS),
      cpusAt440kRowsPerS: safeRate(440000 * cpuS, previewRows),
    };
  });
  const gatewayCpu = {};
  for (const p of preview)
    for (const [k, v] of Object.entries(p.gatewayReadCpuMicros ?? {}))
      gatewayCpu[k] = (gatewayCpu[k] ?? 0) + v / 1e6;
  const result = {
    prefix,
    N: r.N,
    status: r.status,
    error: r.error ?? null,
    measuredSweepWallS: r.sweep?.wallMs / 1000 || null,
    subjectsPerS: r.sweep?.subjectsPerS ?? null,
    ackedMetricSubjects: fs.existsSync(log) ? sum(pages, "subjects") : null,
    ackedPages: pages.length,
    pageRows: hasRows ? rows : null,
    responseBytes: timing.some((t) => typeof t.responseBytes === "number")
      ? sum(timing, "responseBytes")
      : null,
    stages: stageRows,
    preview: {
      subjects: sum(preview, "subjects"),
      rows: previewRows,
      responseBytes: sum(preview, "responseBytes"),
      calibration,
      gatewayRequestIntervalCpuS: gatewayCpu,
      note: "Main/write gateway, no live traffic; request intervals exclude background CPU between requests.",
    },
    seed: r.seed,
    live: r.live ?? null,
    gates: r.gates,
  };
  output.push(result);
  md.push(
    `## ${prefix}`,
    ``,
    `N=${r.N}; receipt status ${r.status}; sweep wall ${fmt(result.measuredSweepWallS)} s; ${fmt(result.subjectsPerS)} subjects/s; ACK-metric prefix ${result.ackedMetricSubjects}/${r.N}.`,
    ``,
    "| Stage | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const t of stageRows)
    md.push(
      `| ${t.stage} | ${fmt(t.demandS)} | ${fmt(t.demandPerWallSecond)} | ${fmt(t.workerThreadCpuS)} | ${fmt(t.inputRowsPerCpuS)} | ${fmt(t.cpusAt440kRowsPerS)} |`,
    );
  md.push(
    "",
    "Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.",
    "",
  );
  if (r.live?.matched) {
    md.push(
      "| Matched live metric | Baseline p50 ms | Baseline p99 ms | Sweep p50 ms | Sweep p99 ms | p99 ratio |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const k of ["read", "commit", "commitService"]) {
      const x = r.live.matched[k];
      md.push(
        `| ${k} | ${fmt(x?.baseline?.p50)} | ${fmt(x?.baseline?.p99)} | ${fmt(x?.sweep?.p50)} | ${fmt(x?.sweep?.p99)} | ${fmt(x?.p99Ratio)} |`,
      );
    }
    md.push(
      "",
      `Full sweep prefix covered: ${r.live.matched.fullSweepCovered}. Sequential evolving-store windows remain diagnostic.`,
      "",
    );
  }
  md.push(
    "No-live preview CPU calibration:",
    "",
    "| Stage | CPU s | Input rows / CPU s | CPUs at 440k rows/s |",
    "| --- | ---: | ---: | ---: |",
  );
  for (const t of calibration)
    md.push(
      `| ${t.stage} | ${fmt(t.cpuS)} | ${fmt(t.inputRowsPerCpuS)} | ${fmt(t.cpusAt440kRowsPerS)} |`,
    );
  md.push(
    "",
    "Gate statuses: " +
      JSON.stringify(
        Object.fromEntries(Object.entries(r.gates ?? {}).map(([k, v]) => [k, v.status])),
      ),
    "",
  );
}
fs.writeFileSync(path.join(root, "analysis.json"), JSON.stringify(output, null, 2) + "\n");
fs.writeFileSync(path.join(root, "MEASUREMENTS.md"), md.join("\n") + "\n");
console.log(
  JSON.stringify(
    output.map((r) => ({
      prefix: r.prefix,
      N: r.N,
      status: r.status,
      wallS: r.measuredSweepWallS,
      subjectsPerS: r.subjectsPerS,
      pages: r.ackedPages,
    })),
    null,
    2,
  ),
);
