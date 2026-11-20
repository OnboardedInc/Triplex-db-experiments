import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileHash } from "../scale1/measurements.ts";
import { records } from "../../../trace/report.mjs";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { readNative } from "./measure.ts";

// [DX-W1] Why: qualify the measurement join itself on a sealed 100k thin trace with known reads and ACKs.
// Rejected: a synthetic SQL counter as the only test of the server-side collector.
const [dir, destination] = process.argv.slice(2);
assert(dir && destination);
const names = [
  "head.txt",
  "trace-run.json",
  "driver/ns-report.json",
  "driver/ns-writes.jsonl",
  ...["node-14-0", "gw-w", "tx.jfr"].map((n) => "trace/raw/" + n + ".jsonl.gz"),
];
const pins = new Map(
  fs
    .readFileSync(path.join(dir, "SHA256SUMS"), "utf8")
    .trim()
    .split("\n")
    .map((l) => [l.slice(66), l.slice(0, 64)]),
);
for (const n of names) assert.equal(await fileHash(path.join(dir, n)), pins.get(n));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, names[1]!), "utf8"));
assert(
  manifest.slot === path.basename(dir) &&
    manifest.tag === manifest.slot &&
    manifest.source === fs.readFileSync(path.join(dir, names[0]!), "utf8").trim(),
);
const report = JSON.parse(fs.readFileSync(path.join(dir, names[2]!), "utf8"));
assert(
  report.status === "DONE" &&
    report.config.rungSubjects === 100000 &&
    report.config.zeroReaders &&
    report.seed.complete &&
    report.seed.seededSubjects === 100000,
);
const events = generateTrace({ subjects: 100000, seed: "ns-v2", durationS: 7200 });
assert.equal(traceDigest(events), report.trace.digest);
const expected = new Map(events.filter((e) => !e.resend && e.atMs < 900000).map((e) => [e.seq, e]));
const writes = new Map<string, any>();
for await (const w of records(path.join(dir, names[3]!)))
  if (w.stream === "background" && !w.resend && w.offsetMs < 900000) {
    const e = expected.get(w.seq);
    assert(
      e &&
        w.subject === e.subject &&
        w.facts === e.facts &&
        Math.abs(w.scheduledAt - report.traceStartAbsMs - e.atMs) < 0.001,
    );
    assert(!writes.has(w.traceId) && w.outcome === "committed" && !w.expired);
    writes.set(w.traceId, w);
    expected.delete(w.seq);
  }
assert.equal(expected.size, 0);
assert.equal(writes.size, 7408);
const stats = await readNative(
  writes,
  report.scope,
  manifest,
  "historical",
  ...(names.slice(4).map((n) => path.join(dir, n)) as [string, string, string]),
);
assert.equal(stats.sqlReads, 7047);
assert.equal(stats.commitsReadingSql, 2486);
assert.equal(stats.ackMs.p99, report.priorities.P2.allPrimary.p99Ms);
fs.writeFileSync(
  destination,
  JSON.stringify(
    {
      manifestSha256: await fileHash(path.join(dir, "SHA256SUMS")),
      source: manifest.source,
      slot: manifest.slot,
      denominator: writes.size,
      ...stats,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
