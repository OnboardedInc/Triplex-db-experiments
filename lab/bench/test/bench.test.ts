/** NS driver unit tests (G0): trace determinism, histogram accuracy, scheduled-time latency, world counts. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Histogram, bucketHigh, bucketIndex } from "../lib/hist.ts";
import { Digest, Rng } from "../lib/rng.ts";
import { OpenLoopScheduler } from "../lib/scheduler.ts";
import { TRACE_DEFAULTS, generateTrace, meanCommandFacts, segments, traceDigest, traceStats } from "../lib/trace.ts";
import { accountsFor, historyDepth, memberOf, ownFacts, populationCounts, sharedFacts, versioned } from "../lib/world.ts";
import { buildTraceCommand } from "../lib/commands.ts";
import { Model, deltaOf } from "../lib/model.ts";

test("trace: same inputs give byte-identical events; a different seed differs", () => {
  const a = generateTrace({ seed: "ns-v1", subjects: 10_000, durationS: 900 });
  const b = generateTrace({ seed: "ns-v1", subjects: 10_000, durationS: 900 });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(traceDigest(a), traceDigest(b));
  const c = generateTrace({ seed: "ns-v2", subjects: 10_000, durationS: 900 });
  assert.notEqual(traceDigest(a), traceDigest(c));
});

test("trace: rates, burst window, size and writer mix follow TARGETS section 2", () => {
  const events = generateTrace({ seed: "ns-v1", subjects: 10_000, durationS: 1200 });
  const originals = events.filter((e) => !e.resend);
  const steady = originals.filter((e) => e.atMs < 400_000);
  const steadyFactsPerS = steady.reduce((s, e) => s + e.facts, 0) / 400;
  assert.ok(Math.abs(steadyFactsPerS - 15) / 15 < 0.2, `steady ${steadyFactsPerS} facts/s`);
  const burst = originals.filter((e) => e.atMs >= 420_000 && e.atMs < 480_000);
  const burstFactsPerS = burst.reduce((s, e) => s + e.facts, 0) / 60;
  assert.ok(Math.abs(burstFactsPerS - 750) / 750 < 0.1, `burst ${burstFactsPerS} facts/s`);
  assert.ok(burst.every((e) => e.burst) && steady.every((e) => !e.burst));
  const second = originals.filter((e) => e.atMs >= 1_020_000 && e.atMs < 1_080_000);
  assert.ok(second.length > 1000 && second.every((e) => e.burst), "second burst at 1020 s");
  const share = (f: (e: (typeof originals)[number]) => boolean) => originals.filter(f).length / originals.length;
  assert.ok(Math.abs(share((e) => e.facts <= 10) - 0.6) < 0.03);
  assert.ok(Math.abs(share((e) => e.facts > 25) - 0.1) < 0.02);
  assert.ok(originals.every((e) => e.facts >= 5 && e.facts <= 50));
  assert.ok(Math.abs(share((e) => e.kind === "person") - 0.4) < 0.03);
  assert.ok(Math.abs(share((e) => e.kind === "system") - 0.3) < 0.03);
  const stats = traceStats(events);
  const systems = originals.filter((e) => e.kind === "system").length;
  assert.ok(Math.abs(stats.resends / systems - 0.1) < 0.03, `resend share ${stats.resends / systems}`);
  assert.ok(Math.abs(stats.corrections / stats.commands - 0.01) < 0.006);
  assert.ok(Math.abs(stats.ackLoss / stats.commands - 0.01) < 0.006);
  for (const e of events.filter((x) => x.resend)) {
    const orig = originals.find((o) => o.seq === e.seq)!;
    assert.ok(e.atMs - orig.atMs >= 500 && e.atMs - orig.atMs <= 5000);
  }
  assert.ok(Math.abs(meanCommandFacts() - 13.7) < 0.01);
  assert.deepEqual(segments(1200).map((s) => [s.start, s.end, s.burst]), [[0, 420, false], [420, 480, true], [480, 1020, false], [1020, 1080, true], [1080, 1200, false]]);
});

test("histogram: percentiles within 1/128 of exact nearest-rank values", () => {
  const rng = new Rng(7);
  const values: number[] = [];
  const h = new Histogram();
  for (let i = 0; i < 50_000; i++) {
    const us = Math.exp(rng.next() * 18); // 1 us .. ~65 s, log-uniform
    values.push(Math.floor(us));
    h.recordUs(us);
  }
  values.sort((a, b) => a - b);
  for (const p of [1, 10, 50, 90, 99, 99.9, 100]) {
    const exact = values[Math.max(1, Math.ceil((p / 100) * values.length)) - 1]!;
    const got = h.percentileUs(p)!;
    assert.ok(got >= exact - 1e-9 && got <= exact * (1 + 1 / 128) + 1, `p${p}: ${got} vs exact ${exact}`);
  }
  assert.equal(h.count, 50_000);
  for (const v of [0, 1, 255, 256, 511, 512, 1000, 123_456, 2 ** 31, 2 ** 33 + 5]) {
    const i = bucketIndex(v);
    assert.ok(bucketHigh(i) >= v && (i === 0 || bucketHigh(i - 1) < v), `bucket of ${v}`);
  }
  const round = Histogram.fromJSON(JSON.parse(JSON.stringify(h.toJSON())));
  assert.equal(round.percentileUs(99), h.percentileUs(99));
  const merged = new Histogram().merge(h).merge(h);
  assert.equal(merged.count, 100_000);
  assert.equal(merged.percentileUs(50), h.percentileUs(50));
});

test("scheduler: latency is measured from the scheduled time, including queueing behind the subject", async () => {
  const start = performance.now() + 20;
  const jobs = Array.from({ length: 6 }, (_, k) => ({ key: 1, scheduledAt: start + k * 10 }));
  const done: { k: number; latency: number; wait: number }[] = [];
  await new Promise<void>((resolve) => {
    const s = new OpenLoopScheduler(jobs, {
      maxInFlight: 8, deadlineMs: 10_000, now: () => performance.now(),
      exec: () => new Promise((r) => setTimeout(r, 50)),
      onDone: (r) => { done.push({ k: jobs.indexOf(r.job), latency: r.latencyMs, wait: r.waitMs }); if (done.length === jobs.length) resolve(); },
    });
    s.start();
  });
  assert.deepEqual(done.map((d) => d.k), [0, 1, 2, 3, 4, 5], "serial per subject, in offer order");
  for (const d of done) {
    const ideal = 50 * (d.k + 1) - 10 * d.k; // service of all earlier jobs, minus how much later this one was scheduled
    assert.ok(d.latency >= ideal - 2, `job ${d.k}: latency ${d.latency.toFixed(1)} < ideal ${ideal}`);
    assert.ok(d.latency < ideal + 60, `job ${d.k}: latency ${d.latency.toFixed(1)} far above ${ideal}`);
  }
  assert.ok(done[5]!.wait >= 200, "the last job waited behind five 50 ms services");
});

test("scheduler: distinct subjects run in parallel; the in-flight cap queues; deadlines expire unsent jobs", async () => {
  const start = performance.now() + 10;
  const jobs = Array.from({ length: 8 }, (_, k) => ({ key: k, scheduledAt: start }));
  const lat: number[] = [];
  let expired = 0;
  await new Promise<void>((resolve) => {
    const s = new OpenLoopScheduler(jobs, {
      maxInFlight: 4, deadlineMs: 60, now: () => performance.now(),
      exec: () => new Promise((r) => setTimeout(r, 40)),
      onDone: (r) => { if (r.expired) expired++; else lat.push(r.latencyMs); if (lat.length + expired === jobs.length) resolve(); },
    });
    s.start();
  });
  // 4 run at once (~40 ms); the next 4 start at ~40 ms (< 60 ms deadline) and finish at ~80 ms.
  assert.equal(expired, 0);
  lat.sort((a, b) => a - b);
  assert.ok(lat[3]! < 75 && lat[4]! >= 75, `cap of 4: ${lat.map((x) => x.toFixed(0))}`);
  const late = [{ key: 1, scheduledAt: performance.now() - 1000 }];
  const res = await new Promise<any>((resolve) => {
    new OpenLoopScheduler(late, { maxInFlight: 1, deadlineMs: 500, now: () => performance.now(), exec: async () => {}, onDone: resolve }).start();
  });
  assert.equal(res.expired, true);
  assert.ok(res.latencyMs >= 1000, "never a negative or truncated latency for a late offer");
});

test("world: closed-form population counts match materialized generation", () => {
  for (const n of [1, 8, 101, 1001, 2501]) {
    const accounts = accountsFor(n);
    let own = 0, ownEntities = 0, shared = 0, sharedEntities = 0, minW = Infinity, maxW = 0, sumW = 0;
    const sharedBy = new Map<number, number>();
    for (let a = 0; a < accounts; a++) {
      const f = sharedFacts(a);
      shared += f.length;
      sharedEntities += new Set(f.map((x) => x.e)).size;
      sharedBy.set(a, f.length);
    }
    let versionAssertions = 0;
    for (let i = 0; i < n; i++) {
      const f = ownFacts(i, accounts);
      own += f.length;
      ownEntities += new Set(f.map((x) => x.e)).size;
      const w = f.length + sharedBy.get(i % accounts)!;
      minW = Math.min(minW, w); maxW = Math.max(maxW, w); sumW += w;
      versionAssertions += (historyDepth(i) - 1) * versioned(i, 0).length;
    }
    const p = populationCounts(n);
    assert.equal(p.liveFactsAtSeedEnd, own + shared, `n=${n} facts`);
    assert.equal(p.entities, ownEntities + sharedEntities, `n=${n} entities`);
    assert.equal(p.seedAssertions, own + shared + versionAssertions, `n=${n} seed assertions`);
    assert.ok(Math.abs(p.worldFacts.mean - sumW / n) < 1e-9, `n=${n} mean world`);
    if (n >= 101) { assert.equal(p.worldFacts.min, minW); assert.equal(p.worldFacts.max, maxW); }
  }
  const big = populationCounts(10_000);
  assert.ok(big.worldFacts.min >= 50 && big.worldFacts.max <= 2000, `world range ${big.worldFacts.min}..${big.worldFacts.max}`);
});

test("model: seed digest plus commit deltas equals the digest of the materialized world", () => {
  const model = new Model(1000);
  const i = 31; // depth-3 panel subject? i % 30 == 1 -> depth 3
  assert.equal(historyDepth(i), 3);
  const facts = [...ownFacts(i, model.accounts, 2), ...sharedFacts(i % model.accounts)];
  const direct = new Digest();
  for (const f of facts) direct.add(memberOf(f.e, f.a, f.v));
  assert.equal(model.expected(i, Infinity).digest, direct.hex());
  const ev = { seq: 9, atMs: 0, kind: "person" as const, subject: i, facts: 12, correction: true, ackLoss: false, resend: false, burst: false };
  const state = { stamp: 0, stampId: "s0", address: (versioned(i, 2)[1]!.v as any).value, addressId: "a0" };
  const cmd = buildTraceCommand({ runTag: "t", event: ev, state, scheduledAbsMs: 1_800_000_000_000 });
  assert.equal(cmd.operations.filter((o) => o.op === "assert").length, 12);
  assert.equal(cmd.validRange.from, 1_800_000_000_000 - TRACE_DEFAULTS.correctionBackMs);
  model.addCommit(i, { instant: 100, position: 5, txId: "x", stamp: 1, delta: deltaOf(cmd.added, cmd.removed), ackAtMs: 0 });
  const after = new Digest();
  for (const f of facts) {
    if (f.a === ":placement/stamp" || f.a === ":worker/address") continue;
    after.add(memberOf(f.e, f.a, f.v));
  }
  for (const f of cmd.added) after.add(memberOf(f.e, f.a, f.v));
  assert.equal(model.expected(i, 100).digest, after.hex());
  assert.equal(model.expected(i, 99).digest, direct.hex(), "a commit after R is not visible");
  assert.equal(model.expected(i, 100).stamp, 1);
});
