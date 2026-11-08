#!/usr/bin/env node
/** Print the EXP-P4 report tables (markdown) from one or more p4-report.json files.
 *   node lab/experiments/EXP-P4-current-path/summarize.ts REPORT.json [...] */
import fs from "node:fs";

const f = (v: any, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? "-" : typeof v === "number" ? v.toFixed(d) : String(v));
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const arms: string[] = (r.arms ?? []).map((a: any) => a.name);
  console.log(`\n## ${r.config.lane} ${r.config.source} ${r.config.subjects} subjects, regime ${r.config.regime} (${r.runTag}, status ${r.status})\n`);
  console.log(`Seed: ${r.seed?.commands} commands, ${r.seed?.assertions} assertions, ${f(r.seed?.wallS, 0)} s (${f(r.seed?.factsPerS, 0)} facts/s), lean ${r.seed?.lean}`);
  if (r.oracle) {
    console.log(`\nO-REPLAY ${r.oracle.status} (verdict ${r.oracle.oracleVerdict}, version ${r.oracle.oracleVersion}, ${r.oracle.entityQueries} entity queries, ${r.oracle.pairs} (subject, basis) pairs, ${r.oracle.recordedCommands} recorded of ${r.oracle.positions} positions, ${f(r.oracle.wallS, 0)} s)\n`);
    console.log("| arm | pulls checked | (subject, basis) keys | mismatched pulls |\n| --- | --- | --- | --- |");
    for (const [a, v] of Object.entries<any>(r.oracle.perArm ?? {})) console.log(`| ${a} | ${v.pulls} | ${v.keys} | ${v.mismatchedPulls} |`);
  }
  console.log(`\nCross-arm digest mismatches: ${r.crossArm?.mismatches}; pull errors ${JSON.stringify(r.gateErrors)}; gate routes ${JSON.stringify(r.gateRoutes)}`);
  console.log("\n### Single-client pull latency, weighted mix at the current basis (ms)\n");
  console.log(`| stage | ${arms.map((a) => `${a} p50 | ${a} p99`).join(" | ")} |\n| --- | ${arms.map(() => "--- | ---").join(" | ")} |`);
  for (const s of r.stages) console.log(`| ${s.stage} | ${arms.map((a) => `${f(s.timing?.weightedMix?.[a]?.p50Ms)} | ${f(s.timing?.weightedMix?.[a]?.p99Ms)}`).join(" | ")} |`);
  console.log("\n### Per bucket (p50 / p99 ms)\n");
  console.log(`| stage | arm | small | medium | large |\n| --- | --- | --- | --- | --- |`);
  for (const s of r.stages) for (const a of arms) { const b = s.timing?.byBucket?.[a] ?? {}; console.log(`| ${s.stage} | ${a} | ${["small", "medium", "large"].map((k) => `${f(b[k]?.p50Ms)} / ${f(b[k]?.p99Ms)} (n ${b[k]?.count ?? 0})`).join(" | ")} |`); }
  console.log("\n### Per hop class (p50 / p99 ms)\n");
  console.log(`| stage | arm | hop 3 | hop 4 | hop 6 |\n| --- | --- | --- | --- | --- |`);
  for (const s of r.stages) for (const a of arms) { const b = s.timing?.byHop?.[a] ?? {}; console.log(`| ${s.stage} | ${a} | ${["3", "4", "6"].map((k) => `${f(b[k]?.p50Ms)} / ${f(b[k]?.p99Ms)}`).join(" | ")} |`); }
  console.log("\n### Flatness on the matched sample (one pull per subject per arm; p50 / p99 ms; ratio to d1)\n");
  const d1 = r.stages.find((s: any) => s.stage === "d1");
  console.log(`| stage | ${arms.map((a) => `${a} p50 / p99 (p99 x d1)`).join(" | ")} |\n| --- | ${arms.map(() => "---").join(" | ")} |`);
  for (const s of r.stages) console.log(`| ${s.stage} | ${arms.map((a) => `${f(s.timing?.flatness?.[a]?.p50Ms)} / ${f(s.timing?.flatness?.[a]?.p99Ms)} (${f(s.timing?.flatness?.[a]?.p99Ms / d1?.timing?.flatness?.[a]?.p99Ms)})`).join(" | ")} |`);
  console.log("\n### Bytes read per pull (matched sample)\n");
  console.log(`| stage | arm | engine CPU ms/pull | page faults/pull | XTDB rows read/pull | pages used/pull | files used/pull | H1 rows / bytes examined |\n| --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const s of r.stages) for (const a of arms) {
    const b = s.bytes?.[a] ?? {};
    console.log(`| ${s.stage} | ${a} | ${f(b.engine?.cpuMsPerPull)} | ${f(b.engine?.pgfaultPerPull, 0)} | ${f(b.explain?.perPull?.scan_rows_read, 0)} | ${f(b.explain?.perPull?.scan_pages_used, 1)} | ${f(b.explain?.perPull?.scan_files_used, 1)} | ${b.examined ? `${f(b.examined.rowsPerPull, 0)} / ${f(b.examined.bytesPerPull, 0)}` : "-"} |`);
  }
  console.log("\n### Closed loop (best level per arm and stage)\n");
  console.log(`| stage | arm | level | pulls/s | p50 ms | engine cores | pulls per engine CPU-s | pulls/s per quota core | host cores | pulls per host CPU-s |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const s of r.stages) for (const a of arms) {
    const rows = s.closedLoop?.[a] ?? [];
    const best = rows.reduce((m: any, x: any) => (!m || x.pullsPerS > m.pullsPerS ? x : m), null);
    if (best) console.log(`| ${s.stage} | ${a} | ${best.level} | ${f(best.pullsPerS, 1)} | ${f(best.latency?.p50Ms)} | ${f(best.engineCpuCores)} | ${f(best.pullsPerEngineCpuS, 1)} | ${f(best.pullsPerSPerQuotaCore, 1)} | ${f(best.hostProcessCpuCores)} | ${f(best.pullsPerHostCpuS, 0)} |`);
  }
  console.log("\n### Gate latency at concurrency (p50 / p99 ms)\n");
  for (const s of r.stages) console.log(`- ${s.stage}: ${arms.map((a) => `${a} ${f(s.gate?.latencyAtConcurrency?.[a]?.p50Ms)} / ${f(s.gate?.latencyAtConcurrency?.[a]?.p99Ms)}`).join("; ")} (${s.gate?.pulls} pulls, ${f(s.gate?.wallS, 0)} s, settle ${JSON.stringify(s.settle)})`);
  if (r.eligibility) console.log(`\n### Eligibility\n\n\`\`\`json\n${JSON.stringify(r.eligibility, (k, v) => (k === "tableAfterPurge" ? undefined : v), 1)}\n\`\`\``);
  console.log(`\nH1 table: ${JSON.stringify(r.table)}`);
}
