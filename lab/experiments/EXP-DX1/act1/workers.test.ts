import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Replica, ReplicaSnapshot, packEntity } from "../../../../packages/datomic/dist/index.js";
import { evaluateAll } from "../../../bench/lib/w0-replica.ts";
import { W0, canonical, sha256, V_W0 } from "../../../bench/lib/w0-world.ts";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { open, observe, oracleRecord } from "./check.ts";
import { workerFinding, workerTrials } from "./bench-proof.ts";

test("the evaluator ladder returns canonical roster order and commits the same ordered pages", async () => {
  const ids = Array.from({ length: 514 }, (_, i) => W0.placementId(i)),
    pos = 10,
    release = W0.R1;
  const basis = { tx: pos, validTime: W0.POPULATION_VALID_TIME };
  const view = new ReplicaSnapshot({
    position: pos,
    validAt: V_W0,
    entities: ids.map((id) => [id, packEntity(1, [])]),
  });
  const unavailable = async () => {
    throw Error("Unexpected mutable source read");
  };
  const replica = new Replica({ head: unavailable, page: unavailable, feed: unavailable }, V_W0);
  const oracle = new DomainOracle(),
    expected: string[] = [],
    states: string[] = [];
  try {
    for (const subject of ids) {
      const bytes = await oracle.call("evaluate", {
        world: { subject, facts: [] },
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
    }
    for (const workers of [1, 2, 4, 5]) {
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
      } finally {
        await store.close();
      }
    }
  } finally {
    oracle.close();
  }
});
test("worker choice excludes incomplete samples and either interference miss", () => {
  const trials = workerTrials("1,2,4,5");
  assert.equal(trials.filter((r) => r.arm === "standard-pages").length, 4);
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
