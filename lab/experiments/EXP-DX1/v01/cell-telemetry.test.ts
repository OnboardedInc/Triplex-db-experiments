import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAdmission } from "./credit-evidence.ts";
import { collectCell, nativeEvent, summarizeTelemetry } from "./cell-telemetry.ts";
import { p99Miss, quietVerdict } from "./card-verdict.ts";
import { windowStats } from "./windows.ts";

test("throughput uses the ACK clock and latency retains the original offer cohort", () => {
  const receipt = { p: 1, t: "t", clock: 0, tx: "tx", digest: "digest", size: 1 };
  const [whole, first, second] = windowStats([
    { due: 10, end: 250, dispatched: 245, status: "acked", receipt },
    { due: 1900, end: 2000, dispatched: 1940, status: "acked", receipt },
    { due: 2000, end: 4500, dispatched: 2500, status: "acked", receipt },
    { due: 3750, end: 5050, status: "expired-before-dispatch" },
  ], 0, 4);
  assert.equal(whole!.acked, first!.acked + second!.acked);
  assert.deepEqual([whole!.storedPerSecond, first!.storedPerSecond, second!.storedPerSecond], [0.5, 0.5, 0.5]);
  assert.deepEqual([whole!.latency.count, first!.latency.count, second!.latency.count], [3, 2, 1]);
  assert.deepEqual([first!.latency.p99Ms, second!.latency.p99Ms, second!.expired], [240, 2500, 1]);
  assert(first!.senderWait.p99Ms! >= 235);
});

test("native events keep their native clock, exact boundary and checkpoint cause", () => {
  const stamp = "2026-11-21 12:00:00.123";
  const pg = "2026-11-21T12:00:00.999999999Z " + stamp + " UTC LOG:  checkpoint starting: wal";
  const [start] = nativeEvent(pg, true);
  assert.deepEqual(start, { kind: "checkpoint-start", at: 1795262400123, cause: "wal", line: pg });
  assert.equal(nativeEvent(stamp + " INFO datomic.update - {:event :update/create-index, :phase :begin}", false)[0]!.kind, "index-start");
  assert.equal(nativeEvent(stamp + " INFO datomic.update - {:event :update/new-index}", false)[0]!.kind, "index-adoption");
  assert.equal(nativeEvent(stamp + " INFO datomic.util - {:event :metrics, :MemoryIndexMB {:lo 10, :hi 40, :sum 50, :count 2}}", false)[0]!.memoryHighMB, 40);
  assert.equal(nativeEvent(stamp + " WARN datomic.update - memory-index backpressure", false)[0]!.kind, "memory-alarm");
  assert.equal(nativeEvent(stamp + " INFO datomic - {:AlarmBackPressure {:sum 3, :count 2}}", false)[0]!.alarmCount, 3);
  assert.deepEqual(nativeEvent("PG message without timestamp", true), []);
});

test("one clock keeps both boundaries and fails closed for a stale slot or invalid samples", async () => {
  const now = () => performance.timeOrigin + performance.now();
  const start = now() + 20;
  const binding = { source: "source", slot: "slot", attempt: "attempt", database: "db", firstCut: 42,
    start, end: start + 2000, cell: { rate: 235, loaded: true } } as const;
  const raw = await collectCell({
    async sample(due) {
      const at = now();
      return { due, at, until: at, sender: process.cpuUsage(), errors: [],
        pg: { at, wal: { wal_bytes: 12 }, checkpointer: { num_timed: 0 }, io: [{}] } };
    },
    async events() {
      return { errors: ["synthetic native log unavailable"], events: [
        { kind: "memory-index", at: start + 100, line: "index memory", memoryHighMB: 5 },
        { kind: "index-start", at: start + 1100, line: "index start" },
      ] };
    },
  }, binding, AbortSignal.timeout(5000));
  assert.deepEqual(raw.samples.map(x => x.due), [start, start + 1000, start + 2000]);
  assert.deepEqual(raw.samples.map(s => s.native.lastMemory?.at ?? null), [null, start + 100, start + 100]);
  assert.match(summarizeTelemetry(raw, binding, now()), /PG stat views 3\/3 samples, 0 missed ticks/);
  assert.throws(() => summarizeTelemetry(raw, { ...binding, slot: "stale" }, now()), /cut or time window differs/);
  const stale = structuredClone(raw);
  stale.samples[1]!.pg!.at = start;
  assert.throws(() => summarizeTelemetry(stale, binding, now()));
});

test("measured misses retain their value, bar and sample requirements", () => {
  const observed = { count: 600, p99Ms: 860 };
  assert.match(p99Miss(false, observed, 100, "L256")!, /860 ms.*100 ms/);
  assert.equal(p99Miss(true, observed, 100, "L256"), undefined);
  const alone = { count: 500, p99Ms: 20 }, busy = { count: 500, p99Ms: 50 };
  assert.equal(quietVerdict(alone, { ...busy, count: 499 }, 0, 0).status, "PARTIAL");
  assert.equal(quietVerdict(alone, busy, 0, 0).status, "MET");
  assert.equal(quietVerdict({ ...alone, p99Ms: 80 }, { ...busy, p99Ms: 100 }, 0, 0).status, "MET");
  assert.match(quietVerdict(alone, { ...busy, p99Ms: 50.02 }, 0, 0).reason, /50.02 ms.*2.501×/);
  assert.equal(quietVerdict(alone, { ...busy, p99Ms: 50.02 }, 0, 0).status, "MISSED");
  assert.equal(quietVerdict(alone, busy, 1, 0).status, "MISSED");
  assert.equal(quietVerdict(alone, busy, 0, 1).status, "MISSED");
});

test("rolling evidence distinguishes outstanding credits from barrier turn numbers", () => {
  const mode = { mode: "rolling", credits: 6, quietAccount: 0 } as const;
  const writes = [
    { account: 1, dispatched: 1, end: 4, fairTurn: 1, neighboursAhead: 0, creditReleased: 5 },
    { account: 2, dispatched: 2, end: 6, fairTurn: 2, neighboursAhead: 1, creditReleased: 7 },
    { account: 0, dispatched: 3, end: 4, fairTurn: 3, neighboursAhead: 2, creditReleased: 4 },
    { account: 1, dispatched: 5, end: 6, fairTurn: 4, neighboursAhead: 1, creditReleased: 7 },
  ];
  checkAdmission(writes, mode);
  assert.throws(() => checkAdmission(writes, { mode: "barrier", credits: 6 }));
  assert.throws(() => checkAdmission(writes.map(row => ({ ...row, neighboursAhead: 0 })), mode));
  assert.throws(() => checkAdmission(writes.map(row => ({ ...row, creditReleased: row.end - 1 })), mode));
});
