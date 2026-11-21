import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import { observeBulk, readBulkMetrics } from "./bulk-metrics.mjs";

const base = Date.parse("2026-11-21T06:00:00Z");
const line = (second, event) => new Date(base + second * 1000).toISOString().replace("T", " ").slice(0, -1) +
  " INFO datomic - " + event;
const index = (second, id, t, phase) => line(second,
  `{:event :update/create-index, :next-t ${t}, :id "${id}", :phase :${phase}, :msec 1000.0}`);
const bucket = (second, metrics) => line(second, "AGE_BULK_METRICS " + JSON.stringify(metrics));
const records = 3_200_000;
const phase = { wallStart: base, wallEnd: base + 160000, database: "scope-a", fromT: 100,
  t: 1000, indexEndT: 820, records, seconds: 160,
  samples: [{}, ...Array.from({ length: 4 }, () => ({ seconds: 30, intervalRecords: 450000 }))],
  walStart: JSON.stringify({ trackWalIoTiming: "on", wal: { wal_bytes: 100, wal_sync_time: 10 } }),
  walEnd: JSON.stringify({ trackWalIoTiming: "on", wal: { wal_bytes: 150, wal_sync_time: 14 } }) };
const indexEvents = [
  index(-1, "scope-a", 110, "begin"), index(1, "scope-a", 110, "end"),
  index(8, "scope-b", 150, "begin"), index(9, "scope-b", 150, "end"),
  index(20, "scope-a", 200, "begin"), index(25, "scope-a", 200, "end"),
  index(40, "scope-a", 600, "begin"), index(130, "scope-a", 600, "end"),
  index(132, "scope-a", 900, "begin"), index(140, "scope-a", 900, "end"),
  index(145, "scope-a", 970, "begin"), index(181, "scope-a", 970, "end"),
];
const events = [...indexEvents,
  bucket(1, { AlarmBackPressure: 99 }),
  bucket(61, { AlarmBackPressure: { sum: 2 }, MemoryIndexMB: { hi: 1300 } }),
  bucket(121, { MemoryIndexMB: 1700 }),
  line(130, "{:event :tx/process, :t 550, :msec 3.7, :apply-msec 2.05, :reads {:sql-ms 0.6}}"),
  line(130, "{:event :tx/process, :t 99, :msec 100, :apply-msec 99}"),
];

test("bounds the rate by late samples and two fresh, published native jobs", async () => {
  const x = await observeBulk(events, phase);
  assert.deepEqual(x.jobs.map((j) => j.nextT), [200, 600]);
  assert.deepEqual(x.createdJobs.map((j) => j.nextT), [200, 600, 900]);
  assert.deepEqual(x.backPressure, { count: 2, memoryIndexMaxMB: 1700 });
  assert.deepEqual(x.process, { n: 1, ms: 3.7, applyMs: 2.05, segmentSqlMs: 0.6, segmentSqlN: 1 });
  assert.equal(x.sustainedRate, 15000);
  assert.equal((await observeBulk(events, { ...phase, indexEndT: 400 })).sustainedRate, null);
  assert.equal((await observeBulk(indexEvents, phase)).sustainedRate, null);
});

test("reads and archives the exact fresh event bytes and rejects log rotation", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "age1-metrics-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const live = path.join(dir, "live.log");
  const raw = path.join(dir, "arm.log.gz");
  fs.writeFileSync(live, "unrelated before this attempt\n");
  const offset = fs.statSync(live);
  fs.appendFileSync(live, events.join("\n") + "\n");
  const evidence = await readBulkMetrics(live, offset, phase, raw);
  assert.deepEqual(evidence.wal, { timed: true, wal_bytes: 50, wal_sync_time: 4 });
  assert.equal(gunzipSync(fs.readFileSync(raw)).toString(), events.join("\n") + "\n");
  fs.renameSync(live, path.join(dir, "original.log"));
  fs.writeFileSync(live, events.join("\n") + "\n");
  await assert.rejects(readBulkMetrics(live, offset, phase), /rotated/);
});
