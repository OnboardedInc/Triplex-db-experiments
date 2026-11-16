// @ts-nocheck -- [DX-T1-10] Why: qualify recorded heterogeneous run data at this boundary. Rejected: infer a causal win from exit zero or an old session.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { records, percentile } from "./report.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
import { commitClocks, instrumentMetrics, idleAndPhaseMetrics } from "./instrument.mjs";
import { Histogram } from "../bench/lib/hist.ts";

const [base, prefix] = process.argv.slice(2);
if (!base || !/^tx2-dxt1-[a-z0-9-]+$/.test(prefix ?? "")) throw Error("Invalid trial");
const session = path.join(base, prefix + "-session");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim();
const { kind } = read(path.join(session, "request.json"));
if (!["scheduler", "disk", "history", "wal"].includes(kind)) throw Error("Unsupported trial");
const modes =
  kind === "disk"
    ? ["zero", "baseline", "candidate", "baseline"]
    : ["baseline", "candidate", "baseline"];
const q = (values) => ({
  count: values.length,
  p50: percentile(values, 0.5),
  p99: percentile(values, 0.99),
  max: values.length ? Math.max(...values) : null,
});
const check = (ok, message) => {
  if (!ok) throw Error(message);
};
const rows = [];
let build;
for (const [index, mode] of modes.entries()) {
  const i = index + 1,
    tag = `${prefix}-${i}-${mode}`,
    dir = path.join(base, tag);
  check(
    fs.readFileSync(path.join(session, `${i}-exit.txt`), "utf8").trim() === "0",
    "Nonzero controller",
  );
  check(
    !fs.readFileSync(path.join(session, `${i}-remaining.txt`), "utf8").trim(),
    "Owned resources remain",
  );
  const b = read(path.join(dir, "driver/ns-report.json")),
    m = read(path.join(dir, "trace-run.json")),
    t = read(path.join(dir, "trace-summary.json"));
  check(
    b.status === "DONE" && !b.finalizationErrors.length && b.seed.seededSubjects === 10000,
    "Incomplete driver",
  );
  check(
    m.tag === tag &&
      m.slot === tag &&
      m.session === prefix &&
      m.source === source &&
      t.source === source &&
      t.tag === tag &&
      t.complete &&
      m.level === "summary",
    "Source/slot/trace mismatch",
  );
  check(
    b.config.readPath === "replica" &&
      b.config.strictRecordClocks &&
      b.trace.digest === "aa8a7636ff027ab3",
    "Changed exactness or frozen trace",
  );
  const hashes = fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8");
  check(build === undefined || hashes === build, "Source/build bytes differ");
  build = hashes;
  const sealed = await verifiedRawManifest(dir);
  fs.writeFileSync(path.join(session, tag + ".SHA256SUMS"), sealed);
  const writes = [];
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl"))) writes.push(w);
  const primary = writes.filter((w) => w.stream === "background" && !w.resend);
  check(
    primary.length > 0 &&
      new Set(primary.map((w) => w.commandId)).size === primary.length &&
      primary.every((w) => w.outcome === "committed" && !w.expired),
    "Primary accounting differs",
  );
  primary.forEach(commitClocks);
  const instrument = instrumentMetrics(b, writes, [], Histogram);
  check(
    JSON.stringify(instrument) === JSON.stringify(b.instrument),
    "Recorded clock table differs from exact rows",
  );
  const start = Math.min(...primary.map((w) => w.scheduledAt)),
    end = Math.max(...primary.map((w) => w.finishedAt)),
    host = [];
  for await (const h of records(path.join(dir, "trace/raw/system-darwin.jsonl.gz"))) {
    check(
      h.run === tag && h.source === source && h.slot === tag && h.at >= m.startedAt - 1000,
      "Foreign/stale host sample",
    );
    if (h.at >= start && h.at <= end) host.push(h);
  }
  check(
    host.length > 100 &&
      host.every((h) => Number.isFinite(h.otherCpu) && /used\s*=\s*[\d.]+[MG]/.test(h.swap)),
    "Missing host context",
  );
  const swaps = host.map((h) => {
    const v = /used\s*=\s*([\d.]+)([MG])/.exec(h.swap);
    return +v[1] / (v[2] === "M" ? 1024 : 1);
  });
  const driver = read(path.join(dir, "driver-container.json"))[0];
  const env = Object.fromEntries(
    driver.Config.Env.map((e) => {
      const at = e.indexOf("=");
      return [e.slice(0, at), e.slice(at + 1)];
    }),
  );
  const zero = kind === "scheduler" || mode === "zero";
  check(
    b.config.zeroReaders === zero &&
      (zero
        ? b.oracle.status === "NOT-RUN"
        : b.oracle.status === "PASS" &&
          b.oracle.mismatchCount === 0 &&
          !b.oracle.receiptViolations.length),
    "Wrong reader/oracle arm",
  );
  const storage =
    kind === "disk" && mode === "candidate"
      ? "root-disk"
      : kind === "disk" || kind === "scheduler"
        ? "volume"
        : env.DX_HARNESS_STORAGE;
  check(
    env.DX_HARNESS_STORAGE === storage &&
      b.harnessStorage.requested === storage &&
      b.harnessStorage.filesystemType === 0xef53,
    "Harness placement differs",
  );
  if (storage === "root-disk") {
    const v = read(path.join(dir, "harness-volume.json")),
      e = read(path.join(dir, "harness-export.json")),
      c = read(path.join(dir, "harness-cleanup.json"));
    check(
      v.device === `/var/tmp/${tag}-harness` &&
        v.owner.source === source &&
        e.owner.prefix === tag &&
        e.owner.source === source &&
        c.prefix === tag &&
        c.removed &&
        e.at >= m.startedAt &&
        c.at >= e.verifiedAt,
      "Unbound harness export/cleanup",
    );
  }
  if (kind === "scheduler")
    check(
      b.config.schedulerTiming === (mode === "candidate" ? "precise" : "legacy") &&
        b.config.matchDurationS === 200,
      "Scheduler candidate differs",
    );
  else check(b.config.schedulerTiming === "precise", "Scheduler changed in storage/history trial");
  if (kind === "history")
    check(
      b.config.historyGrowthSubjects === (mode === "candidate" ? 4 : null) &&
        b.config.matchDurationS === 900 &&
        !b.config.readerLadderOnly,
      "History workload differs",
    );
  if (kind === "disk")
    check(
      b.config.matchDurationS === 450 && b.config.readerLadderOnly && b.config.maxReaders === 1024,
      "Disk workload differs",
    );
  const phases = idleAndPhaseMetrics(writes, b.phases);
  check(
    JSON.stringify(phases.phaseTypes) === JSON.stringify(t.instrumentIdle.phaseTypes),
    "Slow phase population differs",
  );
  rows.push({
    tag,
    mode,
    source,
    level: m.level,
    primary: primary.length,
    definitions: Object.fromEntries(
      Object.entries(instrument.definitions).map(([k, v]) => [k, v.allPrimary]),
    ),
    timer: instrument.timerLateness,
    postAck: instrument.postAck,
    host: { swapGiB: q(swaps), macCpu: q(host.map((h) => h.otherCpu)) },
    phaseTypes: phases.phaseTypes,
    idle: phases.groups,
    oracle: b.oracle,
    history: b.priorities.P4.history,
    writer: b.phases.map((p) => ({ phase: p.name, thread: p.writerThread })),
    rawBytes: t.rawBytes,
    storage,
  });
}
const result = {
  at: new Date().toISOString(),
  prefix,
  source,
  kind,
  scope:
    "Source-bound diagnostics with same-session bookends; corrected clocks do not qualify acceptance.",
  rows,
};
fs.writeFileSync(path.join(session, "TRIAL.json"), JSON.stringify(result, null, 2) + "\n");
const f = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a");
const md = [
  `# ${prefix}`,
  "",
  `Source ${source}; summary tracing; ${kind} trial, one uninterrupted session. Authoritative offer-to-finish remains the verdict. ACK-only retains lateness; corrected also subtracts actual lateness and is diagnostic.`,
  "",
  "| arm | original p50/p99 ms | ACK-only p50/p99 | corrected p50/p99 | lateness p50/p99 ms | swap GiB | Mac CPU p50/p99 % | >50 burst/growth/sparse |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
];
for (const r of rows)
  md.push(
    `| ${r.tag} | ${Object.values(r.definitions)
      .map((d) => f(d.p50Ms) + "/" + f(d.p99Ms))
      .join(
        " | ",
      )} | ${f(r.timer.p50Ms)}/${f(r.timer.p99Ms)} | ${f(r.host.swapGiB.p50)} | ${f(r.host.macCpu.p50)}/${f(r.host.macCpu.p99)} | ${["burst", "growth", "sparse"].map((k) => r.phaseTypes[k]?.over50 ?? 0).join("/")} |`,
  );
md.push(
  "",
  "Controls are the two baseline rows in this table. Report a gain only when it exceeds their drift. A zero-reader row is context for the loaded disk trial, not a matched semantic-oracle PASS. Raw byte seals are next to this report.",
);
fs.writeFileSync(path.join(session, "TRIAL.md"), md.join("\n") + "\n");
const files = ["TRIAL.json", "TRIAL.md", ...rows.map((r) => r.tag + ".SHA256SUMS")];
fs.writeFileSync(
  path.join(session, "TRIAL.SHA256SUMS"),
  files
    .map(
      (n) =>
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(session, n)))
          .digest("hex") +
        "  " +
        n,
    )
    .join("\n") + "\n",
);
console.log(path.join(session, "TRIAL.md"));
