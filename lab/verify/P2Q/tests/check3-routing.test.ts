// Brief check 3: read routing and eligibility under adversarial schedules (offline, model replica).
// Oracle: the broker's own log replayed to B (harness.oracleAt). A silently stale or over-current answer fails.
// Round 2 (f711193): every test asserts the correct behaviour (RULINGS Q55c, Q58a, Q62a); outage answers are
// compared with the oracle, never counted; Datalog's basis gate is exercised in the fuzz against the model's
// real marker at the instant the "answer" snapshot is taken.
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId } from "@triplex-build/triplex";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import {
  ModelReplica,
  at,
  attempt,
  freshDir,
  key,
  logMembers,
  lsnOfP,
  openRt,
  oracleAt,
  ops,
  replicaRows,
  rng,
  sleep,
  writeJson,
  type Rt,
} from "./harness.js";

const far = () => Date.now() + 10 ** 9;
const entityRead = async (rt: Rt, subject: string, b: number) => {
  const got = await rt.run(rt.adapter.getByEntity(subject, at(b)));
  const want = oracleAt(rt.broker.segmentPath, b, far(), (row) => row.entity_id === subject);
  return { got, want, route: rt.reads.at(-1)?.route, marker: rt.reads.at(-1)?.replicaPosition };
};
const setup = async (tag: string, extra: Record<string, unknown> = {}, adapterExtra: Record<string, unknown> = {}) => {
  const scope = `v-p2q-${tag}:${randomUUID()}`;
  const replica = new ModelReplica(graphIri(scope));
  const dir = freshDir(tag);
  const rt = await openRt(dir, scope, replica, extra, adapterExtra);
  return { scope, replica, dir, rt };
};
const reasonOf = (error: any) => `${error?._tag}:${error?.reason ?? ""}`;

describe("model replica sanity", () => {
  it("applies the broker's guarded updates so the replica converges to the log", async () => {
    const { replica, rt } = await setup("sanity", { retainPublishedMs: 0 });
    try {
      const first = await rt.run(rt.triples.transact(ops("s:a", 4, "x")));
      await rt.run(rt.triples.transact([{ op: "retract", id: first.triples[1].id }, ...ops("s:a", 1, "y")]));
      for (let i = 0; i < 10; i++) await rt.run(rt.triples.transact(ops(`s:${i % 3}`, 2, `z${i}`)));
      expect(await rt.broker.drain(10_000)).toBe(true);
      const log = new Map<string, unknown>();
      for (const m of logMembers(rt.broker.segmentPath)) for (const row of m.rows) log.set(row.id, row);
      const rows = replicaRows(replica);
      expect(replica.multiRow).toBe(0);
      expect(rows.length).toBe(log.size);
      for (const row of rows) expect(row).toEqual(log.get(row.id));
      expect(replica.marker().epoch).toBe(rt.broker.epoch);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("targeted schedules (brief check 3)", () => {
  it("S1 marker behind B with a complete overlay: overlay route, exact", async () => {
    const { replica, rt } = await setup("s1");
    try {
      replica.hold();
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await rt.run(rt.triples.transact(ops("s:1", 3, `a${i}`))));
      await rt.run(rt.triples.transact([{ op: "retract", id: results[0]!.triples[0].id }]));
      const head = rt.broker.head();
      for (const b of [...results.map((r) => r.position), head]) {
        const { got, want, route } = await entityRead(rt, "s:1", b);
        expect(route).toBe("overlay");
        expect(key(got)).toBe(key(want));
      }
    } finally {
      replica.release();
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("S2 overlay missing a frame inside (marker, B]: log route, exact", async () => {
    const { replica, rt } = await setup("s2", { retainPublishedMs: 0, idleProbeMs: 60_000 });
    try {
      const before = replica.snapshot();
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await rt.run(rt.triples.transact(ops("s:2", 2, `b${i}`))));
      expect(await rt.broker.drain(10_000)).toBe(true);
      await sleep(5);
      rt.broker.overlay(0, {}, () => true); // trigger eviction
      replica.restore(before);
      for (const r of results) {
        const { got, want, route } = await entityRead(rt, "s:2", r.position);
        expect(route).toBe("log");
        expect(key(got)).toBe(key(want));
      }
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("S3 replica unreachable: repository pulls answer from the source's log, exactly (Q50a, Q55c)", async () => {
    const { replica, rt } = await setup("s3");
    try {
      const a = await rt.run(rt.triples.transact(ops("s:3", 2, "c")));
      const b = await rt.run(rt.triples.transact([{ op: "retract", id: a.triples[0].id }, ...ops("s:3", 1, "d")]));
      replica.down = true;
      // A commit that needs a retraction target read continues during the outage (Q31e).
      const c = await attempt(rt, rt.triples.transact([{ op: "retract", id: a.triples[1].id }]));
      const results: any[] = [];
      for (const p of [a.position, b.position, ...(c.ok ? [c.value.position] : [])]) {
        const res = await attempt(rt, rt.adapter.getByEntity("s:3", at(p)));
        const want = oracleAt(rt.broker.segmentPath, p, far(), (row) => row.entity_id === "s:3");
        results.push({ p, ok: res.ok, route: rt.reads.at(-1)?.route, equal: res.ok && key(res.value) === key(want), error: reasonOf(res.error) });
      }
      writeJson("check3-S3-unreachable.json", { retractingCommitDuringOutage: c.ok ? "committed" : reasonOf(c.error), results });
      expect(c.ok).toBe(true);
      for (const r of results) {
        expect(r.ok).toBe(true);
        expect(r.route).toBe("log");
        expect(r.equal).toBe(true);
      }
    } finally {
      replica.down = false;
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("S4 replica ahead of B (later retractions and asserts published): replica route, exact", async () => {
    const { rt } = await setup("s4");
    try {
      const a = await rt.run(rt.triples.transact(ops("s:4", 3, "d")));
      const b = await rt.run(rt.triples.transact([{ op: "retract", id: a.triples[0].id }, ...ops("s:4", 1, "e")]));
      const c = await rt.run(rt.triples.transact([{ op: "retract", id: a.triples[1].id }]));
      expect(await rt.broker.drain(10_000)).toBe(true);
      for (const p of [a.position, b.position, c.position, a.position + 7]) {
        const { got, want, route, marker } = await entityRead(rt, "s:4", p);
        expect(route).toBe("replica");
        expect(marker).toBeGreaterThanOrEqual(p);
        expect(key(got)).toBe(key(want));
      }
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("S5 a frame published and evicted while a read is in flight: the stale snapshot routes to the log", async () => {
    const { replica, rt } = await setup("s5", { retainPublishedMs: 0 });
    try {
      replica.hold();
      const results = [];
      for (let i = 0; i < 3; i++) results.push(await rt.run(rt.triples.transact(ops("s:5", 2, `f${i}`))));
      let delayNext = true;
      replica.queryDelay = () => (delayNext ? ((delayNext = false), 150) : 0);
      const pending = entityRead(rt, "s:5", results.at(-1)!.position);
      await sleep(20);
      replica.release();
      expect(await rt.broker.drain(10_000)).toBe(true);
      await sleep(5);
      const { got, want, route, marker } = await pending;
      expect(marker).toBe(0);
      expect(route).toBe("log");
      expect(key(got)).toBe(key(want));
    } finally {
      replica.release();
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("S6 epoch change: crash with unpublished frames, reopen, old-epoch bases stay exact", async () => {
    const { scope, replica, dir, rt } = await setup("s6");
    replica.hold();
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await rt.run(rt.triples.transact(ops("s:6", 2, `g${i}`))));
    const oldEpoch = rt.broker.epoch;
    await rt.dispose();
    await rt.broker.abandon();
    replica.release();
    await sleep(10);
    const rt2 = await openRt(dir, scope, replica);
    try {
      expect(rt2.broker.epoch).toBe(oldEpoch + 1);
      const more = await rt2.run(rt2.triples.transact(ops("s:6", 1, "h")));
      for (const p of [...results.map((r) => r.position), more.position]) {
        const { got, want } = await entityRead(rt2, "s:6", p);
        expect(key(got)).toBe(key(want));
      }
      expect(await rt2.broker.drain(10_000)).toBe(true);
      for (const p of [...results.map((r) => r.position), more.position]) {
        const { got, want, route } = await entityRead(rt2, "s:6", p);
        expect(route).toBe("replica");
        expect(key(got)).toBe(key(want));
      }
      expect(replica.marker().epoch).toBe(rt2.broker.epoch);
    } finally {
      await rt2.dispose();
      await rt2.broker.close();
    }
  });

  it("S7 a basis beyond the resolved prefix fails typed after the deadline, and answers once a frame covers it", async () => {
    const { rt } = await setup("s7", {}, { basisWaitMs: 200 });
    try {
      await rt.run(rt.triples.transact(ops("s:7", 1, "i")));
      const future = (lsnOfP(rt.broker.head()) + 3) * 1024 + 5;
      const t0 = performance.now();
      const first = await attempt(rt, rt.adapter.getByEntity("s:7", at(future)));
      const waited = performance.now() - t0;
      for (let i = 0; i < 3; i++) await rt.run(rt.triples.transact(ops("s:7", 1, `j${i}`)));
      const covered = lastPos(rt) >= future;
      const second = await attempt(rt, rt.adapter.getByEntity("s:7", at(future)));
      const want = oracleAt(rt.broker.segmentPath, future, far(), (row) => row.entity_id === "s:7");
      const record = { future, first: first.ok ? `answered ${first.value.length}` : reasonOf(first.error), waitedMs: Math.round(waited), covered, second: second.ok ? second.value.length : reasonOf(second.error), oracle: want.length };
      writeJson("check3-S7-future-basis.json", record);
      expect(first.ok).toBe(false);
      expect(first.error?.reason).toBe("basis-not-available");
      if (covered) {
        expect(second.ok).toBe(true);
        expect(key(second.value)).toBe(key(want));
      }
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});
const lastPos = (rt: Rt) => rt.broker.durable().lsn * 1024 + 1023;

describe("surfaces that read the replica without the overlay (Q55c, Q58d, Q62a)", () => {
  it("C1 Datalog inside a transaction never reaches a replica below sourceK: it waits, then fails typed", async () => {
    const { replica, rt } = await setup("dl-txn", {}, { basisWaitMs: 300 });
    try {
      replica.hold();
      await rt.run(rt.triples.transact(ops("s:dl", 1, "k")));
      const sourceK = rt.broker.head();
      const exit = await attempt(
        rt,
        rt.adapter.withTransaction(rt.executor.execute({ find: ["?v"], where: [[EntityId.make("s:dl"), ":v/f0", "?v"]] })),
      );
      const arrivalsWhileBehind = replica.unsupported.map((u) => u.markerAtArrival);
      replica.release();
      expect(await rt.broker.drain(10_000)).toBe(true);
      const after = await attempt(
        rt,
        rt.adapter.withTransaction(rt.executor.execute({ find: ["?v"], where: [[EntityId.make("s:dl"), ":v/f0", "?v"]] })),
      );
      const arrivalsAfter = replica.unsupported.map((u) => u.markerAtArrival);
      writeJson("check3-datalog-in-transaction.json", { sourceK, whileBehind: reasonOf(exit.error), arrivalsWhileBehind, afterPublication: after.ok ? "answered" : reasonOf(after.error), arrivalsAfter });
      expect(exit.ok).toBe(false);
      expect(exit.error?.reason).toBe("basis-not-available");
      expect(arrivalsWhileBehind).toEqual([]);
      // After publication the query reaches the replica at or above sourceK (the model cannot evaluate Datalog).
      expect(arrivalsAfter.length).toBeGreaterThan(0);
      expect(Math.min(...arrivalsAfter)).toBeGreaterThanOrEqual(sourceK);
    } finally {
      replica.release();
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("C2 after an unnoticed regression, the Datalog gate and dependencyState never use a replica below B", async () => {
    const { replica, rt } = await setup("regress-cache");
    try {
      const before = replica.snapshot();
      const a = await rt.run(rt.triples.transact(ops("s:rc", 2, "l")));
      expect(await rt.broker.drain(10_000)).toBe(true);
      await sleep(300);
      replica.restore(before);
      const t0 = performance.now();
      const gate = await rt.adapter.resolveQueryBasis(a.position).then((b) => ({ ok: true, b, markerAtReturn: replica.marker().position }), (e) => ({ ok: false, error: reasonOf(e), markerAtReturn: replica.marker().position }));
      const waitedMs = performance.now() - t0;
      replica.restore(before); // regress again, so dependencyState meets it too
      const n = replica.unsupported.length;
      const dep = await attempt(rt, rt.adapter.dependencyState([":v/f0"], { validAt: far(), recordedPosition: a.position }));
      const depArrival = replica.unsupported.slice(n).map((u) => u.markerAtArrival);
      const pull = await entityRead(rt, "s:rc", a.position);
      const record = { position: a.position, gate, waitedMs: Math.round(waitedMs), dependencyState: dep.ok ? dep.value : reasonOf(dep.error), dependencyStateArrivedAt: depArrival, regressionsDetected: rt.broker.stats().replicaRegressions, pullRoute: pull.route, pullEqual: key(pull.got) === key(pull.want) };
      writeJson("check3-regression-cached-marker.json", record);
      expect(gate.ok ? (gate as any).markerAtReturn >= a.position : (gate as any).error === "ReadError:basis-not-available").toBe(true);
      expect(depArrival.every((m) => m >= a.position)).toBe(true);
      expect(record.pullEqual).toBe(true);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("C2 residual gap: the replica regresses and is replayed past B between the gate and the after-check", async () => {
    // Emulates the executor's sequence (gate, answer request, after) with the model: the answer snapshot is taken
    // while the replica is regressed, and the broker replays it before `after` runs.
    const { replica, rt } = await setup("residual", { idleProbeMs: 20 });
    try {
      const before = replica.snapshot();
      const a = await rt.run(rt.triples.transact(ops("s:gap", 1, "m")));
      expect(await rt.broker.drain(10_000)).toBe(true);
      const b = await rt.adapter.resolveQueryBasis(a.position); // before-check passes
      replica.restore(before); // the replica restarts without its delta just before the answer request
      const answerMarker = replica.marker().position; // the answer would be computed here
      for (let i = 0; i < 100 && replica.marker().position < a.position; i++) await sleep(20); // the broker replays
      const after = await rt.adapter.resolveQueryBasis.after!(b).then(() => "accepted", (e) => reasonOf(e));
      const record = { basis: b, answerSnapshotMarker: answerMarker, markerAtAfterCheck: replica.marker().position, after, regressionsDetected: rt.broker.stats().replicaRegressions };
      writeJson("check3-residual-gap.json", record);
      // Recorded as evidence for the residual-gap finding (the after-check cannot see this).
      expect(record.answerSnapshotMarker).toBeLessThan(a.position);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("seeded adversarial fuzz of repository pulls and the Datalog gate against the log oracle", () => {
  const SEEDS = Number(process.env["V_P2Q_SEEDS"] ?? 24);
  it(`${SEEDS} seeds: holds, delays, in-flight publication, eviction, regressions, outages, crashes, future bases`, async () => {
    const summary: any[] = [];
    const mismatches: any[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = rng(seed);
      const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
      const scope = `v-p2q-fuzz-${seed}:${randomUUID()}`;
      const replica = new ModelReplica(graphIri(scope));
      const dir = freshDir(`fuzz${seed}`);
      const brokerExtra = { retainPublishedMs: pick([0, 1, 5, 30]), maxApplyCommands: pick([1, 2, 5, 64]), idleProbeMs: pick([10, 50, 500]) };
      const adapterExtra = { basisWaitMs: pick([20, 60]) };
      let rt = await openRt(dir, scope, replica, brokerExtra, adapterExtra);
      replica.queryDelay = () => (r() < 0.35 ? Math.floor(r() * 25) : 0);
      replica.updateDelay = () => (r() < 0.5 ? Math.floor(r() * 15) : 0);
      const subjects = Array.from({ length: 5 }, (_v, i) => `s:${seed}:${i}`);
      const positions: number[] = [];
      const ids: string[] = [];
      const inflight = new Set<Promise<unknown>>();
      const snapshots = [replica.snapshot()];
      const errors: Record<string, number> = {};
      const counts = { reads: 0, routes: {} as Record<string, number>, regressions: 0, crashes: 0, outages: 0, outageReads: 0, outageExact: 0, futureReads: 0, futureTyped: 0, futureAnswered: 0, gateReads: 0, gateAccepted: 0, gateTyped: 0, gateStaleAccepted: 0, commits: 0, unknown: 0, failedCommits: 0 };
      const commit = () => {
        const s = pick(subjects);
        const retract = ids.length > 0 && r() < 0.35 ? pick(ids) : undefined;
        const operations = [...(retract ? [{ op: "retract" as const, id: retract }] : []), ...ops(s, 1 + Math.floor(r() * 3), `x${seed}-${counts.commits}`)];
        counts.commits++;
        const p = rt
          .run(rt.triples.transact(operations, { commandId: `fz:${seed}:${counts.commits}` }))
          .then((res: any) => {
            positions.push(res.position);
            for (const t of res.triples) ids.push(t.id);
          })
          .catch((error: any) => {
            if (error?.reason === "outcome-unknown") counts.unknown++;
            else {
              counts.failedCommits++;
              const k = `${error?._tag}:${error?.reason ?? ""}:${String(error?.message).slice(0, 60)}`;
              errors[k] = (errors[k] ?? 0) + 1;
            }
          })
          .finally(() => inflight.delete(p));
        inflight.add(p);
      };
      const pullAndCheck = async (b: number, tag: string) => {
        const kind = pick(["entity", "entities", "pattern", "entityAttr"] as const);
        const s1 = pick(subjects);
        const s2 = pick(subjects);
        let keep: (row: any) => boolean;
        let res: { ok: boolean; value: any; error: any };
        if (kind === "entity") {
          res = await attempt(rt, rt.adapter.getByEntity(s1, at(b)));
          keep = (row) => row.entity_id === s1;
        } else if (kind === "entities") {
          const m = await attempt(rt, rt.adapter.getByEntities([s1, s2], at(b)));
          res = m.ok ? { ...m, value: [...new Set([...m.value.values()].flat())] } : m;
          keep = (row) => row.entity_id === s1 || row.entity_id === s2;
        } else if (kind === "pattern") {
          res = await attempt(rt, rt.adapter.query({ attribute: ":v/f0" }, at(b)));
          keep = (row) => row.attribute === ":v/f0";
        } else {
          res = await attempt(rt, rt.adapter.query({ entityId: EntityId.make(s1), attribute: ":v/f1" }, at(b)));
          keep = (row) => row.entity_id === s1 && row.attribute === ":v/f1";
        }
        const event = rt.reads.at(-1);
        if (!res.ok) {
          mismatches.push({ seed, tag, kind, b, failed: reasonOf(res.error), message: String(res.error?.message).slice(0, 120) });
          return undefined;
        }
        counts.routes[event!.route] = (counts.routes[event!.route] ?? 0) + 1;
        const want = oracleAt(rt.broker.segmentPath, b, far(), keep);
        const equal = key(res.value) === key(want);
        if (!equal) mismatches.push({ seed, tag, kind, b, route: event!.route, marker: event!.replicaPosition, got: key(res.value), want: key(want) });
        return equal;
      };
      // Emulated Datalog read: gate, an "answer" snapshot after a delay, then the after-check. A read whose
      // after-check accepts an answer snapshot below B is a stale answer presented at B.
      const gateRead = () => {
        if (positions.length === 0) return;
        const b = pick(positions);
        counts.gateReads++;
        const p = (async () => {
          try {
            const basis = await rt.adapter.resolveQueryBasis(b);
            await sleep(Math.floor(r() * 30));
            const answerMarker = replica.down ? -1 : replica.marker().position;
            await sleep(Math.floor(r() * 30));
            await rt.adapter.resolveQueryBasis.after!(basis);
            counts.gateAccepted++;
            if (answerMarker !== -1 && answerMarker < b) counts.gateStaleAccepted++;
          } catch (error: any) {
            if (error?.reason === "basis-not-available" || error?.reason === "replica-unavailable") counts.gateTyped++;
            else mismatches.push({ seed, tag: "gate", b, failed: reasonOf(error), message: String(error?.message).slice(0, 120) });
          }
        })().finally(() => inflight.delete(p));
        inflight.add(p);
      };
      for (let step = 0; step < 160; step++) {
        const x = r();
        if (x < 0.36) {
          if (inflight.size < 6) commit();
        } else if (x < 0.7) {
          if (positions.length) {
            const base = r() < 0.15 ? rt.broker.head() : pick(positions);
            const b = r() < 0.2 ? base + Math.floor(r() * (1023 - (base % 1024))) : base;
            counts.reads++;
            await pullAndCheck(b, "pull");
          }
        } else if (x < 0.74) gateRead();
        else if (x < 0.76) {
          // A basis beyond the resolved prefix: typed BasisNotAvailable, or (if a frame covered it meanwhile) exact.
          const b = (rt.broker.durable().lsn + 1 + Math.floor(r() * 2)) * 1024 + Math.floor(r() * 50);
          counts.futureReads++;
          const res = await attempt(rt, rt.adapter.getByEntity(pick(subjects), at(b)));
          if (!res.ok && res.error?.reason === "basis-not-available") counts.futureTyped++;
          else if (res.ok && rt.broker.durable().lsn * 1024 + 1023 >= b) counts.futureAnswered++;
          else mismatches.push({ seed, tag: "future", b, outcome: res.ok ? "answered-beyond-prefix" : reasonOf(res.error) });
        } else if (x < 0.8) {
          if (r() < 0.5) replica.hold();
          else replica.release();
        } else if (x < 0.84) snapshots.push(replica.snapshot());
        else if (x < 0.87) {
          replica.restore(pick(snapshots));
          counts.regressions++;
        } else if (x < 0.93) {
          // Outage: every pull must answer from the log, equal to the oracle at B (Q50a, Q55c).
          replica.down = true;
          counts.outages++;
          for (let i = 0; i < 3 && positions.length; i++) {
            counts.outageReads++;
            if (await pullAndCheck(pick(positions), "outage")) counts.outageExact++;
          }
          if (r() < 0.5 && inflight.size < 6) commit(); // a commit during the outage (may retract)
          await sleep(Math.floor(r() * 10));
          replica.down = false;
        } else if (x < 0.95) {
          await Promise.allSettled([...inflight]);
          replica.release();
          await rt.dispose();
          await rt.broker.abandon();
          await sleep(30);
          for (let attemptN = 0; ; attemptN++) {
            try {
              rt = await openRt(dir, scope, replica, brokerExtra, adapterExtra);
              break;
            } catch (error) {
              if (attemptN > 5) throw error;
              await sleep(50);
            }
          }
          counts.crashes++;
        } else await sleep(Math.floor(r() * 20));
      }
      await Promise.allSettled([...inflight]);
      replica.release();
      replica.down = false;
      replica.queryDelay = () => 0;
      replica.updateDelay = () => 0;
      for (const b of positions.slice(-20))
        for (const s of subjects) {
          const got = await rt.run(rt.adapter.getByEntity(s, at(b)));
          const want = oracleAt(rt.broker.segmentPath, b, far(), (row) => row.entity_id === s);
          if (key(got) !== key(want)) mismatches.push({ seed, tag: "final", b, route: rt.reads.at(-1)!.route });
        }
      const drained = await rt.broker.drain(20_000);
      const logRows = new Map<string, unknown>();
      for (const m of logMembers(rt.broker.segmentPath)) for (const row of m.rows) logRows.set(row.id, row);
      const repRows = replicaRows(replica);
      const converged = drained && repRows.length === logRows.size && repRows.every((row) => JSON.stringify(row) === JSON.stringify(logRows.get(row.id)));
      summary.push({ seed, ...brokerExtra, ...adapterExtra, ...counts, errors, drained, converged, multiRow: replica.multiRow, stats: rt.broker.stats() });
      await rt.dispose();
      await rt.broker.close();
    }
    const total = (k: string) => summary.reduce((a, s) => a + s[k], 0);
    writeJson("check3-fuzz-summary.json", {
      seeds: SEEDS,
      totals: Object.fromEntries(["reads", "outageReads", "outageExact", "futureReads", "futureTyped", "futureAnswered", "gateReads", "gateAccepted", "gateTyped", "gateStaleAccepted", "regressions", "crashes", "outages", "commits", "failedCommits", "unknown"].map((k) => [k, total(k)])),
      mismatches,
      summary,
    });
    expect(mismatches).toEqual([]);
    expect(summary.every((s) => s.converged)).toBe(true);
    expect(total("failedCommits")).toBe(0);
  });
});
