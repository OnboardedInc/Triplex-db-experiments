// @ts-nocheck -- [DX-T1-10] Why: distinguish measured server execution from durable Sync waits using sealed windows and aggregate WAL counters. Rejected: assign a cumulative counter or coincident SQL to an exact transaction ID.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { records, percentile } from "./report.mjs";
import { parsePostgres, correlateStatements } from "./anatomy.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
const [base, directory] = process.argv.slice(2),
  dir = path.resolve(directory);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex"),
  check = (v, m) => {
    if (!v) throw Error(m);
  };
const text = fs.readFileSync(path.join(dir, "IDLE.json")),
  seals = fs.readFileSync(path.join(dir, "IDLE.SHA256SUMS"), "utf8");
check(seals.split("\n").includes(sha(text) + "  IDLE.json"), "Gap dataset bytes differ");
const input = JSON.parse(text),
  q = (xs) => ({ n: xs.length, p50: percentile(xs, 0.5), p99: percentile(xs, 0.99) }),
  result = {
    at: new Date().toISOString(),
    inputSha256: sha(text),
    reporterSha256: sha(fs.readFileSync(new URL(import.meta.url))),
    runs: [],
  };
for (const run of input.runs) {
  check(/^tx2-dxt1-[a-z0-9-]+$/.test(run.tag), "Foreign tag");
  const root = path.join(base, run.tag),
    manifest = JSON.parse(fs.readFileSync(path.join(root, "trace-run.json")));
  check(
    manifest.source === run.source && manifest.slot === run.tag && manifest.tag === run.tag,
    "Foreign source/slot",
  );
  await verifiedRawManifest(root);
  const statements = [],
    wal = [];
  for await (const line of createInterface({
    input: fs.createReadStream(path.join(root, "trace/raw/pg.log.gz")).pipe(createGunzip()),
    crlfDelay: Infinity,
  })) {
    const r = parsePostgres(line);
    if (
      r &&
      r.end >= manifest.startedAt - 1000 &&
      (["begin", "commit", "rollback"].includes(r.kind) ||
        /\b(?:from|into|update|join)\s+"?datomic_kvs\b/i.test(line))
    )
      statements.push(r);
  }
  for await (const r of records(path.join(root, "trace/raw/postgres.jsonl.gz"))) {
    check(
      r.run === run.tag &&
        r.source === run.source &&
        r.slot === run.tag &&
        r.at >= manifest.startedAt - 1000,
      "Foreign/stale PG sample",
    );
    if (r.wal) wal.push(r);
  }
  const joined = correlateStatements(
    run.rows.map((r) => ({
      traceId: r.traceId,
      start: r.peerStart,
      end: r.peerEnd,
      gap: r.gap,
      warmup: r.warmup,
    })),
    statements,
  );
  const groups = [];
  for (const gap of run.groups.map((g) => g.gap)) {
    const rows = run.rows.filter((r) => !r.warmup && r.gap === gap),
      ids = new Set(rows.map((r) => r.traceId)),
      clean = joined.filter(
        (r) => ids.has(r.traceId) && !r.ambiguousStatements && r.statements.length,
      );
    const start = Math.min(...rows.map((r) => r.scheduledAt)),
      end = Math.max(...rows.map((r) => r.ack));
    const samples = wal.filter((r) => r.at >= start && r.at <= end).sort((a, b) => a.at - b.at),
      first = samples[0],
      last = samples.at(-1);
    let delta = null;
    if (samples.length >= 2) {
      delta = Object.fromEntries(
        ["wal_write", "wal_write_time", "wal_sync", "wal_sync_time", "wal_bytes"].map((k) => {
          const n = Number(last.wal[k]) - Number(first.wal[k]);
          check(Number.isFinite(n) && n >= 0, "Reset/unknown WAL counter");
          return [k, n];
        }),
      );
    }
    groups.push({
      gap,
      commands: rows.length,
      cleanWindows: clean.length,
      ambiguousWindows: joined.filter((r) => ids.has(r.traceId) && r.ambiguousStatements).length,
      statements: q(clean.map((r) => r.statements.length)),
      executeMs: q(clean.map((r) => r.statements.reduce((n, s) => n + s.ms, 0))),
      wal: delta,
      walSampleWindow:
        first && last
          ? {
              start: first.at,
              end: last.at,
              acksInWindow: rows.filter((r) => r.ack >= first.at && r.ack <= last.at).length,
            }
          : null,
      averageWalWriteMs: delta?.wal_write ? delta.wal_write_time / delta.wal_write : null,
    });
  }
  result.runs.push({ tag: run.tag, source: run.source, level: run.level, host: run.host, groups });
}
const f = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a"),
  lines = [
    "# Idle-gap storage observations",
    "",
    "SQL is a time-window correlation, with the existing 2-ms uncertainty and ambiguous intervals excluded. Execute durations exclude the later implicit commit at protocol Sync. WAL counters are aggregate over each stated sample window, including background work and asynchronous statistics publication; they are not exact transaction counts or a per-request storage partition. O_DSYNC accounts durability in WAL write time, so zero explicit sync time is not zero durable I/O.",
    "",
    "| arm / full tracing | G ms | clean/commands | SQL execute total p50/p99 ms | statements p50 | aggregate WAL writes / write ms | average WAL write ms |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
for (const r of result.runs)
  for (const g of r.groups.filter((g) => [25, 1000].includes(g.gap)))
    lines.push(
      `| ${r.tag} | ${g.gap} | ${g.cleanWindows}/${g.commands} | ${f(g.executeMs.p50)}/${f(g.executeMs.p99)} | ${f(g.statements.p50)} | ${g.wal?.wal_write ?? "n/a"}/${f(g.wal?.wal_write_time)} | ${f(g.averageWalWriteMs)} |`,
    );
lines.push(
  "",
  "Each arm inherits the CPU/swap context and adjacent plain controls in IDLE.md; exact sample windows and counter deltas are in IDLE-STORAGE.json. The virtual versus physical disk and individual backend Sync durations remain unsplit.",
);
fs.writeFileSync(path.join(dir, "IDLE-STORAGE.json"), JSON.stringify(result, null, 2) + "\n");
fs.writeFileSync(path.join(dir, "IDLE-STORAGE.md"), lines.join("\n") + "\n");
fs.writeFileSync(
  path.join(dir, "IDLE-STORAGE.SHA256SUMS"),
  ["IDLE-STORAGE.json", "IDLE-STORAGE.md"]
    .map((n) => sha(fs.readFileSync(path.join(dir, n))) + "  " + n)
    .join("\n") + "\n",
);
