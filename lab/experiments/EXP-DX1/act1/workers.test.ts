import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Replica, ReplicaSnapshot, packEntity } from "../../../../packages/datomic/dist/index.js";
import { evaluateAll } from "../../../bench/lib/w0-replica.ts";
import {
  W0,
  canonical,
  sha256,
  triplexValue,
  V_W0,
  type WorldRow,
} from "../../../bench/lib/w0-world.ts";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { open, observe, oracleRecord } from "./check.ts";
import { workerFinding, workerTrials } from "./bench-proof.ts";

test("the evaluator ladder returns canonical roster order and commits the same ordered pages", async (t) => {
  const rung = W0.rung(1000),
    basis = W0.populationBasis(rung),
    pos = basis.tx,
    release = W0.R1;
  const worlds = [...W0.population(rung, 0, 514)].map(({ world }, i) =>
    i % 16 === 0 ? world : { subject: world.subject, facts: [] },
  );
  const ids = worlds.map((world) => world.subject);
  const rows = new Map<string, WorldRow[]>(ids.map((id) => [id, []])),
    seen = new Set<string>();
  // [DX-ACT1] Why: real shared W0 facts and empty neighbors give worker pages unequal work and both delivery outcomes. Rejected: checking parallel order on identical empty worlds alone.
  for (const world of worlds)
    for (const f of world.facts) {
      const key = canonical(f);
      if (seen.has(key)) continue;
      seen.add(key);
      const entity = rows.get(f.e) ?? [];
      entity.push({
        id: String(seen.size),
        entityId: f.e,
        attribute: f.a,
        value: triplexValue(f.a, f.v),
        position: f.tx,
        validFrom: 0,
      });
      rows.set(f.e, entity);
    }
  const view = new ReplicaSnapshot({
    position: pos,
    validAt: V_W0,
    entities: [...rows].map(([id, group]) => [id, packEntity(1, group)]),
  });
  const unavailable = async () => {
    throw Error("Unexpected mutable source read");
  };
  const replica = new Replica({ head: unavailable, page: unavailable, feed: unavailable }, V_W0);
  const oracle = new DomainOracle(),
    expected: string[] = [],
    states: string[] = [];
  try {
    let withDeliveries = 0;
    for (const world of worlds) {
      const bytes = await oracle.call("evaluate", {
        world,
        release: "R1",
        basis,
      });
      expected.push(bytes);
      const published = JSON.parse(
        await oracle.call("publish", {
          state: emptyWireState(),
          evaluations: [oracleRecord(JSON.parse(bytes))],
        }),
      );
      states.push(canonical(published.state));
      if (published.deliveries.length) withDeliveries++;
    }
    assert.ok(withDeliveries > 0 && withDeliveries < ids.length);
    for (const workers of [1, 2, 3, 4, 5]) {
      const store = await open("act1-workers-" + randomUUID());
      try {
        const r = await evaluateAll({
          replica,
          view,
          position: pos,
          subjects: ids,
          releases: release,
          workers,
          publish: store,
          publication: { layout: "page-cut", frameSize: 256 },
        });
        assert.deepEqual(
          r.records.map((x) => x.subject),
          ids,
        );
        assert.deepEqual(
          r.records.map((x) => x.candidates[0]!.json),
          expected,
        );
        const p = r.publication!;
        assert.equal(p.coverage?.roster, sha256(canonical(ids)));
        assert.deepEqual(
          p.responses.map((f: any) => [f.span.first, f.span.count, f.position]),
          [
            [0, 256, 1],
            [256, 256, 2],
            [512, 2, 3],
          ],
        );
        assert.deepEqual(
          (await observe(store, ids, 3, "page-cut")).map((s) => canonical(s)),
          states,
        );
        t.diagnostic(
          canonical({
            workers,
            scope: store.scopeName,
            roster: p.coverage!.roster,
            expectedStates: sha256(canonical(states)),
            withDeliveries,
            positions: p.responses.map((r: any) => r.position),
          }),
        );
      } finally {
        await store.close();
      }
    }
  } finally {
    oracle.close();
  }
});
test("worker choice excludes incomplete samples and either interference miss", () => {
  const trials = workerTrials("1,2,3,4,5");
  assert.equal(trials.filter((r) => r.arm === "standard-pages").length, 5);
  assert.throws(() => workerTrials("2,2"));
  assert.throws(() => workerTrials("6"));
  const point = (workers: number, adequate: boolean, read: number, commit: number) => ({
    arm: "standard-pages",
    workers,
    fullWindowAnd500PerSide: adequate,
    matched: { read: { p99Ratio: read }, commit: { p99Ratio: commit } },
    wallSeconds: 80,
  });
  const r = workerFinding([
    point(1, true, 1.2, 1.49),
    point(2, true, 1.5, 1.5),
    point(4, false, 1, 1),
    point(5, true, 1.6, 1),
  ] as any);
  assert.equal(r.largestObservedWithinBoth, 2);
  assert.equal(
    workerFinding([point(4, false, 1, 1), point(5, true, 1, 2)] as any).largestObservedWithinBoth,
    null,
  );
});
