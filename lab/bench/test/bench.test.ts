/** NS driver unit tests (G0): trace determinism and frozen schedule, histogram accuracy, scheduled-time latency,
 * world buckets and closed-form counts, valid-time model, durable feed consumer. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Histogram, bucketHigh, bucketIndex } from "../lib/hist.ts";
import { Digest, Rng } from "../lib/rng.ts";
import { OpenLoopScheduler } from "../lib/scheduler.ts";
import { ActiveSet, TRACE_DEFAULTS, generateTrace, meanCommandFacts, segments, traceDigest, traceStats } from "../lib/trace.ts";
import { BUCKETS, HOP_SHARE, accountOfSubject, accountsFor, hopOf, memberOf, ownFacts, populationCounts, sharedFacts, subjectInCell, worldFactsOf, OWN_FACTS, type Bucket } from "../lib/world.ts";
import { buildTraceCommand } from "../lib/commands.ts";
import { Model, partsOf } from "../lib/model.ts";
import { FeedConsumer } from "../lib/feed.ts";

test("trace: same inputs give byte-identical events; a different seed differs", () => {
  const a = generateTrace({ seed: "ns-v2", subjects: 10_000, durationS: 900 });
  const b = generateTrace({ seed: "ns-v2", subjects: 10_000, durationS: 900 });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(traceDigest(a), traceDigest(b));
  assert.notEqual(traceDigest(a), traceDigest(generateTrace({ seed: "ns-v3", subjects: 10_000, durationS: 900 })));
});

test("trace: rates, bursts at 120 s + k x 600 s, size and writer mix (TARGETS 2 and 2.1)", () => {
  const events = generateTrace({ seed: "ns-v2", subjects: 10_000, durationS: 1300 });
  const originals = events.filter((e) => !e.resend);
  const steady = originals.filter((e) => e.atMs >= 180_000 && e.atMs < 720_000);
  const steadyFactsPerS = steady.reduce((s, e) => s + e.facts, 0) / 540;
  assert.ok(Math.abs(steadyFactsPerS - 15) / 15 < 0.15, `steady ${steadyFactsPerS} facts/s`);
  const burst = originals.filter((e) => e.atMs >= 120_000 && e.atMs < 180_000);
  const burstFactsPerS = burst.reduce((s, e) => s + e.facts, 0) / 60;
  assert.ok(Math.abs(burstFactsPerS - 750) / 750 < 0.1, `burst ${burstFactsPerS} facts/s`);
  assert.ok(burst.every((e) => e.burst) && steady.every((e) => !e.burst));
  assert.deepEqual(segments(1300).map((s) => [s.start, s.end, s.burst]), [[0, 120, false], [120, 180, true], [180, 720, false], [720, 780, true], [780, 1300, false]]);
  const share = (f: (e: (typeof originals)[number]) => boolean) => originals.filter(f).length / originals.length;
  assert.ok(Math.abs(share((e) => e.facts <= 10) - 0.6) < 0.03);
  assert.ok(Math.abs(share((e) => e.facts > 25) - 0.1) < 0.02);
  assert.ok(originals.every((e) => e.facts >= 5 && e.facts <= 50));
  // uniform inside a band
  const band1 = originals.filter((e) => e.facts <= 10);
  for (let f = 5; f <= 10; f++) assert.ok(Math.abs(band1.filter((e) => e.facts === f).length / band1.length - 1 / 6) < 0.03, `size ${f}`);
  assert.ok(Math.abs(share((e) => e.kind === "person") - 0.4) < 0.03);
  assert.ok(Math.abs(share((e) => e.kind === "system") - 0.3) < 0.03);
  const stats = traceStats(events);
  assert.ok(Math.abs(stats.resends / originals.filter((e) => e.kind === "system").length - 0.1) < 0.03);
  assert.ok(Math.abs(stats.corrections / stats.commands - 0.01) < 0.006);
  assert.ok(Math.abs(stats.ackLoss / stats.commands - 0.01) < 0.006);
  assert.ok(Math.abs(meanCommandFacts() - 13.7) < 0.01);
  assert.ok(events.every((e) => e.stream === "background"));
});

test("trace: active set is 2% of the rung, 95% of commands hit it with Zipf skew, residency 2,000 s", () => {
  const n = 10_000;
  const events = generateTrace({ seed: "ns-v2", subjects: n, durationS: 3000 }).filter((e) => !e.resend);
  assert.ok(Math.abs(traceStats(events).activeShare - 0.95) < 0.01);
  const set = new ActiveSet("ns-v2", n);
  assert.equal(set.size, 200);
  const initial = [...set.slots];
  assert.equal(new Set(initial).size, 200, "distinct active subjects");
  set.advance(1000);
  const changedBy1000 = initial.filter((s, k) => set.slots[k] !== s).length;
  assert.ok(changedBy1000 > 60 && changedBy1000 < 140, `about half replaced by 1,000 s (staggered): ${changedBy1000}`);
  set.advance(2000);
  assert.equal(initial.filter((s, k) => set.slots[k] === s).length, 0, "every initial member left by 2,000 s");
  // Zipf: the most frequent subject in a window is hit far more than the median active subject
  const window = events.filter((e) => e.atMs < 600_000 && e.active);
  const counts = new Map<number, number>();
  for (const e of window) counts.set(e.subject, (counts.get(e.subject) ?? 0) + 1);
  const sorted = [...counts.values()].sort((a, b) => b - a);
  assert.ok(sorted[0]! > 8 * sorted[Math.floor(sorted.length / 2)]!, `zipf skew ${sorted[0]} vs median ${sorted[Math.floor(sorted.length / 2)]}`);
});

test("histogram: percentiles within 1/128 of exact nearest-rank values", () => {
  const rng = new Rng(7);
  const values: number[] = [];
  const h = new Histogram();
  for (let i = 0; i < 50_000; i++) {
    const us = Math.exp(rng.next() * 18);
    values.push(Math.floor(us));
    h.recordUs(us);
  }
  values.sort((a, b) => a - b);
  for (const p of [1, 10, 50, 90, 99, 99.9, 100]) {
    const exact = values[Math.max(1, Math.ceil((p / 100) * values.length)) - 1]!;
    const got = h.percentileUs(p)!;
    assert.ok(got >= exact - 1e-9 && got <= exact * (1 + 1 / 128) + 1, `p${p}: ${got} vs exact ${exact}`);
  }
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
    new OpenLoopScheduler(jobs, {
      maxInFlight: 8, deadlineMs: 10_000, now: () => performance.now(),
      exec: () => new Promise((r) => setTimeout(r, 50)),
      onDone: (r) => { done.push({ k: jobs.indexOf(r.job), latency: r.latencyMs, wait: r.waitMs }); if (done.length === jobs.length) resolve(); },
    }).start();
  });
  assert.deepEqual(done.map((d) => d.k), [0, 1, 2, 3, 4, 5], "serial per subject, in offer order");
  for (const d of done) {
    const ideal = 50 * (d.k + 1) - 10 * d.k;
    assert.ok(d.latency >= ideal - 2 && d.latency < ideal + 60, `job ${d.k}: latency ${d.latency.toFixed(1)} vs ideal ${ideal}`);
  }
  assert.ok(done[5]!.wait >= 200);
});

test("scheduler: parallel across subjects, in-flight cap, deadline expiry, injected overlay jobs join the subject queue", async () => {
  const start = performance.now() + 10;
  const jobs = Array.from({ length: 8 }, (_, k) => ({ key: k, scheduledAt: start }));
  const lat: number[] = [];
  let injectedAfter = -1;
  await new Promise<void>((resolve) => {
    const order: number[] = [];
    const s = new OpenLoopScheduler<{ key: number; scheduledAt: number; tag?: string }>(jobs, {
      maxInFlight: 4, deadlineMs: 60, now: () => performance.now(),
      exec: (j) => new Promise((r) => setTimeout(r, 40)),
      onDone: (r) => { order.push(r.job.key); if (r.job.tag === "overlay") injectedAfter = order.filter((k) => k === 0).length; else lat.push(r.latencyMs); if (lat.length === 8 && injectedAfter >= 0) resolve(); },
    });
    s.start();
    setTimeout(() => s.inject({ key: 0, scheduledAt: performance.now(), tag: "overlay" }), 15);
  });
  lat.sort((a, b) => a - b);
  assert.ok(lat[3]! < 75 && lat[4]! >= 75, `cap of 4: ${lat.map((x) => x.toFixed(0))}`);
  assert.equal(injectedAfter, 2, "overlay ran after subject 0's background job, serially");
  const res = await new Promise<any>((resolve) => new OpenLoopScheduler([{ key: 1, scheduledAt: performance.now() - 1000 }], { maxInFlight: 1, deadlineMs: 500, now: () => performance.now(), exec: async () => {}, onDone: resolve }).start());
  assert.equal(res.expired, true);
  assert.ok(res.latencyMs >= 1000);
});

test("world: hop classes, frozen P4 buckets and closed-form counts match materialization", () => {
  for (const n of [1, 21, 401, 2001, 10_000]) {
    const accounts = accountsFor(n);
    let own = 0, shared = 0, ownEntities = 0, sharedEntities = 0;
    for (let a = 0; a < accounts; a++) { const f = sharedFacts(a); shared += f.length; sharedEntities += new Set(f.map((x) => x.e)).size; }
    for (let i = 0; i < n; i++) { const f = ownFacts(i, accounts); own += f.length; ownEntities += new Set(f.map((x) => x.e)).size; assert.equal(f.length, OWN_FACTS[hopOf(i)]); }
    const p = populationCounts(n);
    assert.equal(p.liveFactsAtSeedEnd, own + shared, `n=${n} facts`);
    assert.equal(p.entities, ownEntities + sharedEntities, `n=${n} entities`);
  }
  const n = 10_000, accounts = accountsFor(n);
  const shareOf = (f: (i: number) => boolean) => { let c = 0; for (let i = 0; i < n; i++) if (f(i)) c++; return c / n; };
  for (const [b, spec] of Object.entries(BUCKETS)) {
    assert.ok(Math.abs(shareOf((i) => { const w = worldFactsOf(i, accounts); return w >= spec.lo && w <= spec.hi; }) - spec.share) < 0.01, `bucket ${b}`);
  }
  for (const hop of [3, 4, 6] as const) assert.ok(Math.abs(shareOf((i) => hopOf(i) === hop) - HOP_SHARE[hop]) < 0.001);
  // hop depth is real: BFS depth over the materialized world equals the class
  for (const i of [0, 8, 15, 37, 9999]) {
    const facts = [...ownFacts(i, accounts), ...sharedFacts(accountOfSubject(i, accounts))];
    const byEntity = new Map<string, string[]>();
    for (const f of facts) if (f.v.type === "ref") (byEntity.get(f.e) ?? byEntity.set(f.e, []).get(f.e)!).push(f.v.value);
    let frontier = [facts[0]!.e], depth = -1;
    const seen = new Set(frontier);
    while (frontier.length) { depth++; frontier = frontier.flatMap((e) => byEntity.get(e) ?? []).filter((e) => !seen.has(e) && seen.add(e)); }
    assert.equal(depth, hopOf(i), `subject ${i} depth`);
  }
  const rng = new Rng(3);
  for (const b of ["small", "medium", "large"] as Bucket[]) for (const hop of [3, 4, 6] as const) {
    const i = subjectInCell(n, accounts, b, hop, rng.next(), rng.next(), rng.next())!;
    const w = worldFactsOf(i, accounts);
    assert.ok(i < n && hopOf(i) === hop && w >= BUCKETS[b].lo && w <= BUCKETS[b].hi, `cell ${b}/${hop}: ${i} ${w}`);
  }
});

test("model: valid-time aware digests equal the materialized world at (R, V)", () => {
  const model = new Model(1000);
  const i = 15;
  const seedFacts = [...ownFacts(i, model.accounts), ...sharedFacts(accountOfSubject(i, model.accounts))];
  const seedDigest = new Digest();
  for (const f of seedFacts) seedDigest.add(memberOf(f.e, f.a, f.v));
  assert.equal(model.expected(i, Infinity, Date.now()).digest, seedDigest.hex());
  const sched = 1_800_000_000_000;
  const ev = { seq: 9, atMs: 0, kind: "person" as const, subject: i, facts: 12, correction: true, ackLoss: false, resend: false, burst: false, active: true, stream: "background" };
  const st = { stamp: 0, stampId: "s0", stampValidFrom: 1_700_000_000_000, address: "x", addressId: "a0", addressValidFrom: 1_700_000_000_000 };
  const addr = seedFacts.find((f) => f.a === ":worker/address")!.v as any;
  st.address = addr.value;
  const cmd = buildTraceCommand({ runTag: "t", event: ev, state: st, scheduledAbsMs: sched });
  assert.equal(cmd.operations.filter((o) => o.op === "assert").length, 12);
  model.addCommit(i, { instant: 100, position: 5, txId: "x", stamp: 1, stampValidFrom: sched, parts: partsOf(cmd.added, cmd.addedValidFrom, cmd.removed, cmd.removedValidFrom), ackAtMs: 0, stream: "background" });
  const at = (V: number) => {
    const d = new Digest();
    for (const f of seedFacts) if (f.a !== ":placement/stamp" && f.a !== ":worker/address") d.add(memberOf(f.e, f.a, f.v));
    cmd.added.forEach((f, k) => { if (cmd.addedValidFrom[k]! <= V) d.add(memberOf(f.e, f.a, f.v)); });
    return d.hex();
  };
  assert.equal(model.expected(i, 100, sched + 1).digest, at(sched + 1));
  assert.equal(model.expected(i, 100, sched + 1).stamp, 1);
  const past = sched - 10 * 86_400_000; // after the correction's validFrom (30 days back), before the command
  assert.equal(model.expected(i, 100, past).digest, at(past), "corrected address visible, new stamp and event not yet valid");
  assert.equal(model.expected(i, 100, past).stamp, -1, "old stamp retracted, new one not yet valid");
  assert.equal(model.expected(i, 99, sched + 1).digest, seedDigest.hex(), "a commit after R is not visible");
});

test("feed consumer: durable checkpoints, three crash points, keyed effects never duplicate", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ns-feed-"));
  const txs = Array.from({ length: 30 }, (_, k) => ({ position: k + 1, txId: `tx${k + 1}`, changes: [{ op: "assert", tripleId: `assertion-${k + 1}`, entityId: `pl:${String(k % 5).padStart(8, "0")}`, attribute: ":placement/stamp", value: { type: "integer", value: String(Math.floor(k / 5) + 1) }, validFrom: 1 }] }));
  let t = 0;
  const handle: any = { feedPage: async (after: number, limit: number) => { const page = txs.filter((x) => x.position > after).slice(0, Math.min(limit, 4)); return { transactions: page, next: page.at(-1)?.position }; }, close: async () => {} };
  const consumer = new FeedConsumer({
    dir, epoch: "e0", startAfter: 0, now: () => (t += 1),
    publicationOf: (key) => ({ ...key, clock: "host-monotonic", atMonoMs: 0 }),
    commitOf: (p) => ({ instant: 0, ackAt: 0, subject: (p - 1) % 5, subjects: [(p - 1) % 5], stamp: Math.floor((p - 1) / 5) + 1, correction: false, correctionValidFrom: null }),
    open: async () => handle, log: () => {},
    crashes: [{ at: 5, point: "before-effect" }, { at: 15, point: "after-effect" }, { at: 30, point: "after-checkpoint" }],
  });
  consumer.recoverDelayMs = 0;
  const run = consumer.run();
  while (consumer.checkpoint < 30) await new Promise((r) => setTimeout(r, 20));
  consumer.stop();
  await run;
  assert.equal(consumer.crashReport().filter((c) => c.fired).length, 3);
  assert.equal(consumer.visibleDuplicateEffects(), 0);
  assert.ok(consumer.counts.replayAttempts > 0, "the after-effect crash replays effects as attempts");
  assert.equal(consumer.counts.redeliveryMismatches, 0);
  assert.equal(consumer.counts.entries, 30);
  const replay = await consumer.replayCheck(handle, 0);
  assert.equal(replay.exact, true);
  consumer.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("feed lag uses source publication 100 to durable knowledge 400, never record stamp 399", async () => {
  for (const missing of [false, true]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd01-r2-clock-"));
    let consumer: FeedConsumer;
    const handle: any = { feedPage: async () => {
      consumer.stop();
      return { next: 1, transactions: [{ position: 1, txId: "tx1", changes: [{ op: "assert", tripleId: "a1", entityId: "pl:00000000", attribute: ":a", validFrom: 0 }] }] };
    }, close: async () => {} };
    consumer = new FeedConsumer({ dir, epoch: "1", startAfter: 0, now: () => 400,
      publicationOf: (key) => missing ? undefined : { ...key, clock: "host-monotonic", atMonoMs: 100 },
      commitOf: () => ({ instant: 399, ackAt: 101, subject: 0, subjects: [0], stamp: 399000, correction: false, correctionValidFrom: null }),
      open: async () => handle, log: () => {}, crashes: [],
    });
    try {
      if (missing) {
        await assert.rejects(consumer.run(), /Missing source publication instant/);
        assert.equal(consumer.lags.length, 0);
        assert.equal(consumer.checkpoint, 0);
      } else {
        await consumer.run();
        assert.equal(consumer.lags[0]?.lagMs, 300);
        assert.notEqual(consumer.lags[0]?.lagMs, 1);
      }
    } finally { consumer.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  }
});
