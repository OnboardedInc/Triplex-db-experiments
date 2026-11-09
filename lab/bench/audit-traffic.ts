import { parseLatencyReceipt } from "../receipts/parse.ts";
import { latencyReceipt, recordedConnectionMode } from "../receipts/latency.mjs";
/** [EXP-P5-R2] Why: audit the retained event bytes and matched-window samples independently of transported summary fields. Rejected: accepting a summary flag or legacy short trace digest. */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { generateTrace } from "./lib/trace.ts";
const [file, out] = process.argv.slice(2);
if (!file || !out || fs.existsSync(out)) throw new Error("fresh report/output required");
const bytes = fs.readFileSync(file),
  report = parseLatencyReceipt(bytes, { source: file });
if (report.status !== "OFFLINE-CHECKS-COMPLETE" || !report.traffic?.rounds?.length)
  throw new Error("completed traffic run required");
const hash = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const encode = (v: any): string =>
  Array.isArray(v)
    ? "[" + v.map(encode).join(",") + "]"
    : v !== null && typeof v === "object"
      ? "{" +
        Object.keys(v)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + encode(v[k]))
          .join(",") +
        "}"
      : JSON.stringify(v);
const load = (p: string) =>
  fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((s) => report.lane === "qlever" ? parseLatencyReceipt(s, { lane: report.lane, source: p }) : JSON.parse(s));
const p99 = (a: number[]) =>
  a.length ? [...a].sort((a, b) => a - b)[Math.ceil(a.length * 0.99) - 1]! : null;
const rounds = [];
for (const r of report.traffic.rounds) {
  const arms: any = {};
  const expected = generateTrace({
    seed: report.traffic.seed + ":" + r.round,
    subjects: report.N,
    durationS: r.sweep.trace.offsetS + r.sweep.trace.durationS,
  })
    .filter(
      (e) =>
        e.atMs >= r.sweep.trace.offsetS * 1000 &&
        e.atMs < (r.sweep.trace.offsetS + r.sweep.trace.durationS) * 1000,
    )
    .map((e) => ({ ...e, atMs: e.atMs - r.sweep.trace.offsetS * 1000 }));
  const ms = r.aa ? r.sweep.trace.durationS * 1000 : r.sweep.sweepWallMs;
  for (const name of ["sweep", "baseline"]) {
    const arm = r[name],
      writes = load(arm.rawWrites),
      reads = load(arm.rawReads),
      events = writes.map((x) => x.event);
    if (encode(events) !== encode(expected))
      throw new Error(`round ${r.round} ${name} changed/missing trace events`);
    const readValues = reads.filter((x) => x.startedAtMs <= ms).map((x) => x.latencyMs),
      commitValues = writes
        .filter((x) => x.scheduledAtMs <= ms)
        .map((x) => x.ackAtMs - x.scheduledAtMs);
    if (
      p99(readValues) !== arm.read.p99 ||
      p99(commitValues) !== arm.commit.p99 ||
      readValues.length !== arm.read.count ||
      commitValues.length !== arm.commit.count
    )
      throw new Error("matched-window summary differs from raw observations");
    if (
      reads.some(
        (x) =>
          x.observedPosition < x.basis.position ||
          (x.split !== null && x.split <= x.basis.position),
      ) ||
      new Set(reads.map((x) => x.reader)).size !== 64
    )
      throw new Error("reader/basis binding mismatch");
    const hotShare = reads.filter((x) => x.hot).length / reads.length;
    if (hotShare < 0.5) throw new Error("hot read share below 50%");
    const originals = writes.filter((x) => !x.duplicate);
    if (new Set(originals.map((x) => x.receipt.position)).size !== originals.length)
      throw new Error("duplicate new writer receipt position");
    arms[name] = {
      traceSha256: hash(encode(events)),
      readsSha256: hash(fs.readFileSync(arm.rawReads)),
      writesSha256: hash(fs.readFileSync(arm.rawWrites)),
      hotShare,
      readerClients: 64,
      splitReads: reads.filter((x) => x.split !== null).length,
      readP99: p99(readValues),
      commitP99: p99(commitValues),
      commands: writes.length,
    };
  }
  rounds.push({
    round: r.round,
    kind: r.kind,
    aa: r.aa,
    windowMs: ms,
    arms,
    readRatio:
      arms.sweep.readP99 && arms.baseline.readP99
        ? arms.sweep.readP99 / arms.baseline.readP99
        : null,
    commitRatio:
      arms.sweep.commitP99 && arms.baseline.commitP99
        ? arms.sweep.commitP99 / arms.baseline.commitP99
        : null,
  });
}
fs.writeFileSync(
  out,
  JSON.stringify(
    latencyReceipt({
      qleverConnectionMode: recordedConnectionMode(report),
      status: "OFFLINE-SAMPLES-MATCH",
      acceptance: false,
      reportSha256: hash(bytes),
      auditSourceSha256: hash(fs.readFileSync(new URL(import.meta.url))),
      rounds,
    }),
    null,
    2,
  ) + "\n",
);
