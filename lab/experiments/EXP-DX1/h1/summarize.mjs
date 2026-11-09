// [DX-H1] Why: reproduce the table from persisted reports and actual write events.
// Rejected: hand-copying quantiles or treating a missing sample as zero latency.
import fs from "node:fs";
import path from "node:path";
import { Histogram } from "../../../bench/lib/hist.ts";
for (const dir of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(path.join(dir, "ns-report.json"), "utf8"));
  const eventsFile = path.join(dir, "ns-writes.jsonl");
  const writes = fs.existsSync(eventsFile)
    ? fs
        .readFileSync(eventsFile, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((s) => JSON.parse(s))
    : [];
  const commits = new Histogram();
  for (const w of writes)
    if (w.stream === "background" && !w.resend && w.outcome === "committed")
      commits.recordMs(w.latencyMs);
  const http = {};
  for (const counts of [
    report.httpRequests?.main,
    ...(report.httpRequests?.workers ?? []).map((w) => w.counts),
  ]) {
    for (const [kind, row] of Object.entries(counts ?? {})) {
      const total = (http[kind] ??= { operations: 0, requests: 0, failed: 0 });
      for (const k of ["operations", "requests", "failed"]) total[k] += row[k];
    }
  }
  for (const row of Object.values(http))
    row.requestsPerOperation = row.operations ? row.requests / row.operations : null;
  const p = report.priorities ?? {};
  const invalid = [];
  if (report.client?.invalid)
    invalid.push("client saturated: " + report.client.saturatedPhases.join(", "));
  if (report.seed && !report.seed.complete) invalid.push("rung not fully seeded");
  if (report.config.devOverrides.length)
    invalid.push("development overrides: " + report.config.devOverrides.join(", "));
  if (!report.config.zeroReaders && !report.config.baselineWrites)
    invalid.push("no matched zero-reader baseline");
  console.log(
    JSON.stringify(
      {
        dir,
        status: report.status,
        config: report.config,
        error: report.error,
        seed: report.seed,
        commit: commits.summary(),
        pull: p.P4?.weightedMix?.read,
        roundTrips: report.pullRoundTrips,
        http,
        feedLag: p.P3?.lag,
        sweep: p.P5?.sweep,
        correctness: report.correctness,
        writer: report.writer,
        P2: p.P2,
        P3: p.P3,
        maintenance: report.maintenance,
        invalid,
        oracle: report.oracle,
        engineSamples: report.engineSamples?.length,
        extrapolatedSeedSeconds: report.seed?.factsPerS
          ? { 10000: 384785 / report.seed.factsPerS, 100000: 3848930 / report.seed.factsPerS }
          : null,
      },
      null,
      2,
    ),
  );
}
