// Brief check 3: read routing and eligibility under adversarial schedules (offline, model replica).
// Oracle: the broker's own log replayed to B (harness.oracleAt). A silently stale or over-current answer fails.
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId } from "@triplex-build/triplex";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import {
  ModelReplica,
  at,
  key,
  logMembers,
  lsnOfP,
  openRt,
  freshDir,
  oracleAt,
  ops,
  replicaRows,
  rng,
  sleep,
  writeJson,
  attempt,
  type Rt,
} from "./harness.js";

const far = () => Date.now() + 10 ** 9;
const entityRead = async (rt: Rt, subject: string, b: number) => {
  const got = await rt.run(rt.adapter.getByEntity(subject, at(b)));
  const want = oracleAt(rt.broker.segmentPath, b, far(), (row) => row.entity_id === subject);
  return { got, want, route: rt.reads.at(-1)?.route, marker: rt.reads.at(-1)?.replicaPosition };
};
const setup = async (tag: string, extra: Record<string, unknown> = {}) => {
  const scope = `v-p2q-${tag}:${randomUUID()}`;
  const replica = new ModelReplica(graphIri(scope));
  const dir = freshDir(tag);
  const rt = await openRt(dir, scope, replica, extra);
  return { scope, replica, dir, rt };
};

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
    const { replica, rt } = await setup("s2", { retainPublishedMs: 0 });
    try {
      const before = replica.snapshot();
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await rt.run(rt.triples.transact(ops("s:2", 2, `b${i}`))));
      expect(await rt.broker.drain(10_000)).toBe(true);
      await sleep(5);
      rt.broker.overlay(0, {}, () => true); // trigger eviction
      replica.restore(before); // the replica lost everything after `before` (restart without persisted updates)
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

  it("S3 replica unreachable: repository pulls fail (record the type) rather than answer", async () => {
    const { replica, rt } = await setup("s3");
    try {
      const r = await rt.run(rt.triples.transact(ops("s:3", 2, "c")));
      replica.down = true;
      const res = await attempt(rt, rt.adapter.getByEntity("s:3", at(r.position)));
      expect(res.ok).toBe(false);
      const error = res.error;
      const record = { tag: error?._tag, message: error?.message, cause: String(error?.cause) };
      writeJson("check3-S3-unreachable.json", record);
      // Q50a/Q55c want a fallback to the source's own record; the branch fails with a generic ReadError.
      expect(record.tag).toBe("ReadError");
      // The source's own record could have answered: show it.
      const fromLog = rt.broker.fromLog(0, { entities: ["s:3"] }, () => true);
      expect(fromLog.length).toBe(2);
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
      await sleep(20); // the read has its snapshot (marker 0)
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

  it("S7 a basis beyond the head: record whether the adapter answers it (non-repeatable) or refuses", async () => {
    const { rt } = await setup("s7");
    try {
      const a = await rt.run(rt.triples.transact(ops("s:7", 1, "i")));
      const future = (lsnOfP(rt.broker.head()) + 3) * 1024 + 5;
      const exit1 = await attempt(rt, rt.adapter.getByEntity("s:7", at(future)));
      for (let i = 0; i < 3; i++) await rt.run(rt.triples.transact(ops("s:7", 1, `j${i}`)));
      const exit2 = await attempt(rt, rt.adapter.getByEntity("s:7", at(future)));
      const n = (e: any) => (e.ok ? e.value.length : `failed:${e.error?._tag}`);
      writeJson("check3-S7-future-basis.json", { head0: a.position, future, first: n(exit1), second: n(exit2), headAfter: rt.broker.head() });
      // Record only; A0 also answers a future position from what it holds. A non-repeatable answer at a named
      // basis is reported as a finding against property (2) in VERIFY.md.
      expect(true).toBe(true);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("surfaces that read the replica without the overlay (Q50b, Q55c)", () => {
  it("Datalog inside a transaction reads the replica at sourceK without waiting (model shows the arrival marker)", async () => {
    const { replica, rt } = await setup("dl-txn");
    try {
      replica.hold();
      await rt.run(rt.triples.transact(ops("s:dl", 1, "k")));
      const sourceK = rt.broker.head();
      const exit = await attempt(
        rt,
        rt.adapter.withTransaction(
          rt.executor.execute({ find: ["?v"], where: [[EntityId.make("s:dl"), ":v/f0", "?v"]] }),
        ),
      );
      const arrivals = replica.unsupported.map((u) => u.markerAtArrival);
      writeJson("check3-datalog-in-transaction.json", { sourceK, replicaMarker: replica.marker().position, arrivals, exit: exit.ok ? "success" : String(exit.error?._tag) });
      // The executor sent its query to a replica whose marker is below sourceK: no wait, no overlay.
      expect(arrivals.length).toBeGreaterThan(0);
      expect(Math.max(...arrivals)).toBeLessThan(sourceK);
    } finally {
      replica.release();
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("after an unnoticed replica regression, resolveQueryBasis and dependencyState trust the cached marker", async () => {
    const { replica, rt } = await setup("regress-cache");
    try {
      const before = replica.snapshot();
      const a = await rt.run(rt.triples.transact(ops("s:rc", 2, "l")));
      expect(await rt.broker.drain(10_000)).toBe(true);
      await sleep(300); // applier idle
      replica.restore(before); // replica restarted without persisted updates; no new commit follows
      const t0 = performance.now();
      const basis = await rt.adapter.resolveQueryBasis(a.position);
      const waitedMs = performance.now() - t0;
      const unsupportedBefore = replica.unsupported.length;
      const dep = await attempt(rt, rt.adapter.dependencyState([":v/f0"], { validAt: far(), recordedPosition: a.position }));
      const depArrival = replica.unsupported.slice(unsupportedBefore).map((u) => u.markerAtArrival);
      const record = {
        position: a.position,
        cachedMarker: rt.broker.replicaPosition(),
        actualReplicaMarker: replica.marker().position,
        resolveQueryBasis: basis,
        waitedMs,
        dependencyStateQueryArrivedAtMarker: depArrival,
        dependencyStateExit: dep.ok ? "success" : String(dep.error?._tag),
      };
      writeJson("check3-regression-cached-marker.json", record);
      expect(basis).toBe(a.position); // claims eligibility although the replica is at 0
      expect(record.actualReplicaMarker).toBeLessThan(a.position);
      expect(depArrival.length).toBe(1);
      expect(depArrival[0]).toBeLessThan(a.position);
      // Repository pulls are still exact (they read the marker in the same request).
      const { got, want, route } = await entityRead(rt, "s:rc", a.position);
      expect(route).not.toBe("replica");
      expect(key(got)).toBe(key(want));
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("seeded adversarial fuzz of repository pulls against the log oracle", () => {
  const SEEDS = Number(process.env["V_P2Q_SEEDS"] ?? 24);
  it(`${SEEDS} seeds: holds, delays, in-flight publication, eviction, regressions, outages, crashes`, async () => {
    const summary: any[] = [];
    const mismatches: any[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = rng(seed);
      const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
      const scope = `v-p2q-fuzz-${seed}:${randomUUID()}`;
      const replica = new ModelReplica(graphIri(scope));
      const dir = freshDir(`fuzz${seed}`);
      const brokerExtra = { retainPublishedMs: pick([0, 1, 5, 30]), maxApplyCommands: pick([1, 2, 5, 64]) };
      let rt = await openRt(dir, scope, replica, brokerExtra);
      replica.queryDelay = () => (r() < 0.35 ? Math.floor(r() * 25) : 0);
      replica.updateDelay = () => (r() < 0.5 ? Math.floor(r() * 15) : 0);
      const subjects = Array.from({ length: 5 }, (_v, i) => `s:${seed}:${i}`);
      const positions: number[] = [];
      const ids: string[] = [];
      const inflight = new Set<Promise<unknown>>();
      const snapshots = [replica.snapshot()];
      const errors: Record<string, number> = {};
      const counts = { reads: 0, routes: {} as Record<string, number>, regressions: 0, crashes: 0, outages: 0, outageReads: 0, outageTyped: 0, commits: 0, unknown: 0, conflicts: 0 };
      const commit = () => {
        const s = pick(subjects);
        const retract = ids.length > 0 && r() < 0.35 ? pick(ids) : undefined;
        const operations = [
          ...(retract ? [{ op: "retract" as const, id: retract }] : []),
          ...ops(s, 1 + Math.floor(r() * 3), `x${seed}-${counts.commits}`),
        ];
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
              counts.conflicts++;
              const k = `${error?._tag}:${error?.reason ?? ""}:${String(error?.message).slice(0, 60)}`;
              errors[k] = (errors[k] ?? 0) + 1;
            }
          })
          .finally(() => inflight.delete(p));
        inflight.add(p);
      };
      const read = async () => {
        if (positions.length === 0) return;
        const base = r() < 0.15 ? rt.broker.head() : pick(positions);
        const b = r() < 0.2 ? base + Math.floor(r() * (1023 - (base % 1024))) : base;
        const kind = pick(["entity", "entities", "pattern", "entityAttr"] as const);
        const s1 = pick(subjects);
        const s2 = pick(subjects);
        let got: readonly any[];
        let keep: (row: any) => boolean;
        if (kind === "entity") {
          got = await rt.run(rt.adapter.getByEntity(s1, at(b)));
          keep = (row) => row.entity_id === s1;
        } else if (kind === "entities") {
          const m = await rt.run(rt.adapter.getByEntities([s1, s2], at(b)));
          got = [...new Set([...m.values()].flat())];
          keep = (row) => row.entity_id === s1 || row.entity_id === s2;
        } else if (kind === "pattern") {
          got = await rt.run(rt.adapter.query({ attribute: ":v/f0" }, at(b)));
          keep = (row) => row.attribute === ":v/f0";
        } else {
          got = await rt.run(rt.adapter.query({ entityId: EntityId.make(s1), attribute: ":v/f1" }, at(b)));
          keep = (row) => row.entity_id === s1 && row.attribute === ":v/f1";
        }
        const event = rt.reads.at(-1)!;
        const want = oracleAt(rt.broker.segmentPath, b, far(), keep);
        counts.reads++;
        counts.routes[event.route] = (counts.routes[event.route] ?? 0) + 1;
        if (key(got) !== key(want))
          mismatches.push({ seed, kind, b, route: event.route, marker: event.replicaPosition, got: key(got), want: key(want) });
      };
      for (let step = 0; step < 160; step++) {
        const x = r();
        if (x < 0.4) {
          if (inflight.size < 6) commit();
        } else if (x < 0.8) await read();
        else if (x < 0.85) {
          if (r() < 0.5) replica.hold();
          else replica.release();
        } else if (x < 0.89) snapshots.push(replica.snapshot());
        else if (x < 0.92) {
          replica.restore(pick(snapshots));
          counts.regressions++;
        } else if (x < 0.95) {
          // Outage: reads must fail, never answer.
          replica.down = true;
          counts.outages++;
          for (let i = 0; i < 2 && positions.length; i++) {
            const exit = await attempt(rt, rt.adapter.getByEntity(pick(subjects), at(pick(positions))));
            counts.outageReads++;
            if (!exit.ok && exit.error?._tag === "ReadError") counts.outageTyped++;
            else mismatches.push({ seed, kind: "outage-answered", exit: exit.ok ? "success" : String(exit.error?._tag) });
          }
          replica.down = false;
        } else if (x < 0.97) {
          // Crash and reopen: a new epoch; the replica keeps whatever it had.
          await Promise.allSettled([...inflight]);
          replica.release();
          await rt.dispose();
          await rt.broker.abandon();
          await sleep(30);
          for (let attempt = 0; ; attempt++) {
            try {
              rt = await openRt(dir, scope, replica, brokerExtra);
              break;
            } catch (error) {
              if (attempt > 5) throw error;
              await sleep(50);
            }
          }
          counts.crashes++;
        } else await sleep(Math.floor(r() * 20));
      }
      await Promise.allSettled([...inflight]);
      replica.release();
      replica.queryDelay = () => 0;
      replica.updateDelay = () => 0;
      // Final sweep: every subject at every committed position, then after a full drain.
      for (const b of positions.slice(-20))
        for (const s of subjects) {
          const got = await rt.run(rt.adapter.getByEntity(s, at(b)));
          const want = oracleAt(rt.broker.segmentPath, b, far(), (row) => row.entity_id === s);
          if (key(got) !== key(want)) mismatches.push({ seed, kind: "final", b, route: rt.reads.at(-1)!.route });
        }
      const drained = await rt.broker.drain(20_000);
      const logRows = new Map<string, unknown>();
      for (const m of logMembers(rt.broker.segmentPath)) for (const row of m.rows) logRows.set(row.id, row);
      const repRows = replicaRows(replica);
      const converged = drained && repRows.length === logRows.size && repRows.every((row) => JSON.stringify(row) === JSON.stringify(logRows.get(row.id)));
      summary.push({ seed, ...brokerExtra, ...counts, errors, drained, converged, multiRow: replica.multiRow, stats: rt.broker.stats() });
      await rt.dispose();
      await rt.broker.close();
    }
    writeJson("check3-fuzz-summary.json", { seeds: SEEDS, mismatches, summary });
    expect(mismatches).toEqual([]);
    expect(summary.every((s) => s.converged)).toBe(true);
  });
});
