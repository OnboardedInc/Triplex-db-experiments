// @ts-nocheck -- [EXP-CHECKJS] Native log lines and run configuration are checked at runtime.
import assert from "node:assert/strict";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createInterface } from "node:readline";

export const minimumRate = 9900;
export const ladderArms = [
  { size: 1, depth: 256, prediction: [7000, 9500] },
  { size: 8, depth: 16, prediction: [11000, 19000] },
  { size: 24, depth: 16, prediction: [16000, 28000] },
];
export const bulkProperties = {
  "memory-index-threshold": "128m",
  "memory-index-max": "2g",
  "object-cache-max": "16g",
  "index-parallelism": "2",
  "write-concurrency": "4",
};
export const hold = {
  t: 34766053, head: 187002, records: 431778659,
  checkpoint: "4d1ab9fa2a1adf9ba0e2dc73ef5a71fd8adf7d4780e40c52090acb6f92242a04",
  population: "d51c7a42bd10d651b5971a32bc4aa7d281ec582cc5add5181ae32492ab786b5e",
};

const ptime = (s) => Date.parse(s.slice(0, 23).replace(" ", "T") + "Z");
const num = (s, label) => Number(new RegExp(":" + label + " (\\d+(?:\\.\\d+)?(?:E[+-]?\\d+)?)\\b").exec(s)?.[1]);

export async function observeBulk(lines, phase) {
  const begins = new Map();
  const jobs = [];
  const process = { n: 0, ms: 0, applyMs: 0, segmentSqlMs: 0, segmentSqlN: 0 };
  const storage = { n: 0, ms: 0 };
  const backPressure = { count: 0, memoryIndexMaxMB: null };
  const minuteMetrics = [];
  for await (const line of lines) {
    const wall = ptime(line);
    if (wall < phase.wallStart || wall > phase.wallEnd || !Number.isFinite(wall)) continue;
    const marker = " - AGE_BULK_METRICS ";
    if (line.includes(marker)) {
      const metrics = JSON.parse(line.slice(line.indexOf(marker) + marker.length));
      // [DX-AGE1] Why: a callback bucket can span a change of treatment.
      // Rejected: attributing the adjoining arm's minute to this one.
      if (wall >= phase.wallStart + 60_000) {
        minuteMetrics.push({ wall, metrics });
        const high = metrics.MemoryIndexMB?.hi ?? metrics.MemoryIndexMB;
        if (Number.isFinite(high)) backPressure.memoryIndexMaxMB = Math.max(backPressure.memoryIndexMaxMB ?? 0, high);
        const alarms = metrics.AlarmBackPressure?.sum ?? metrics.AlarmBackPressure;
        if (Number.isFinite(alarms)) backPressure.count += alarms;
      }
      continue;
    }
    const ix = line.includes(":event :update/create-index") && line.includes(":id " + JSON.stringify(phase.database));
    if (ix) {
      const t = num(line, "next-t");
      if (line.includes(":phase :begin") && t > phase.fromT) begins.set(t, wall);
      if (line.includes(":phase :end") && begins.has(t) && t <= phase.t + 1) {
        jobs.push({ nextT: t, start: begins.get(t), end: wall, ms: num(line, "msec") || wall - begins.get(t) });
        begins.delete(t);
      }
    } else if (line.includes(":event :tx/process")) {
      const t = num(line, "t");
      if (t <= phase.fromT || t > phase.t || !Number.isFinite(t)) continue;
      process.n++;
      process.ms += num(line, "msec") || 0;
      process.applyMs += num(line, "apply-msec") || 0;
      for (const m of line.matchAll(/:sql-ms (\d+(?:\.\d+)?)/g)) {
        process.segmentSqlN++;
        process.segmentSqlMs += Number(m[1]);
      }
    } else if (line.includes(":event :storage/put") && Number.isFinite(num(line, "msec"))) {
      storage.n++;
      storage.ms += num(line, "msec");
    }
  }
  // [DX-AGE1] Why: count same-scope start/end pairs that wrote a published index during ongoing writes.
  // Rejected: counting a request-index after the sample or rating the in-memory first burst.
  const complete = jobs.filter((job) => job.nextT <= phase.indexEndT + 1);
  const tail = phase.samples.filter((row, i) => i > 0 && row.seconds >= 25).slice(-4);
  let tailRate = null;
  if (tail.length >= 2) {
    tailRate = tail.reduce((n, row) => n + row.intervalRecords, 0) / tail.reduce((n, row) => n + row.seconds, 0);
  }
  const wallRate = phase.records / phase.seconds;
  const sustainedRate = complete.length >= 2 && tailRate !== null && minuteMetrics.length >= 2
    ? Math.min(wallRate, tailRate) : null;
  return { jobs: complete, createdJobs: jobs, process, storage, backPressure, minuteMetrics, wallRate, tailRate, sustainedRate };
}

export function walDelta(phase) {
  const start = JSON.parse(phase.walStart);
  const end = JSON.parse(phase.walEnd);
  assert.equal(start.wal.stats_reset, end.wal.stats_reset, "WAL counters reset mid-arm");
  assert.equal(start.trackWalIoTiming, "on");
  assert.equal(end.trackWalIoTiming, "on");
  return { timed: end.trackWalIoTiming === "on",
    ...Object.fromEntries(["wal_records", "wal_bytes", "wal_write", "wal_sync", "wal_write_time", "wal_sync_time"]
      .filter((k) => k in start.wal && k in end.wal).map((k) => [k, Number(end.wal[k]) - Number(start.wal[k])])) };
}

export async function readBulkMetrics(file, offset, phase, archive) {
  const fd = fs.openSync(file, "r");
  try {
    const end = fs.fstatSync(fd);
  assert.deepEqual([end.dev, end.ino], [offset.dev, offset.ino], "Transactor event log rotated during the arm");
  assert(end.size >= offset.size, "Transactor event log truncated during the arm");
    const range = () => fs.createReadStream(file, { fd, autoClose: false, start: offset.size, end: end.size - 1 });
    const lines = end.size === offset.size ? [] : createInterface({ input: range(), crlfDelay: Infinity });
    const observed = await observeBulk(lines, phase);
    if (archive && end.size > offset.size) {
      await pipeline(range(), createGzip(), fs.createWriteStream(archive, { flags: "wx", mode: 0o600 }));
    }
    return { ...observed, wal: walDelta(phase), logRange: [offset.size, end.size] };
  } finally {
    fs.closeSync(fd);
  }
}
