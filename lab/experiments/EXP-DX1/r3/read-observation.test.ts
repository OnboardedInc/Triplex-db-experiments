import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { observe } from "../../../bench/lib/observe.ts";
import { readObservation } from "../../../bench/lib/read-observation.ts";
import type { PullResult } from "../../../bench/lib/composition.ts";

// [DX-R3-P8] Why: the compact internal reply must preserve the complete observation without materializing a public world.
// Rejected: a checksum-only public PullResult or changing the every-read correctness predicate.
test("internal observation preserves every checked field and never reads lazy triples", () => {
  const triples = [{ id: "id", entityId: "root", attribute: ":placement/stamp", value: { type: "number", value: -0 },
    validFrom: 1, validTo: Option.some(2), recordedAt: 3, createdBy: Option.none(),
    entityType: Option.some("Subject"), schemaVersion: Option.some(1), txId: Option.some("tx"),
    retractedAt: Option.none(), retractTxId: Option.none() }];
  const full: PullResult = { triples, entities: 1, depth: 2, roundTrips: 0, route: "replica", language: "packed", waitedMs: 3 };
  const expected = observe(full);
  const lazy = { ...full, observation: expected, get triples(): never { throw Error("materialized on writer thread"); } };
  const reply = structuredClone(readObservation(lazy));
  assert.deepEqual(reply.observed, expected);
  assert.equal(reply.entities, 1); assert.equal(reply.depth, 2); assert.equal(reply.waitedMs, 3);
  assert.equal(reply.route, "replica"); assert.equal("triples" in reply, false);
  for (const field of Object.keys(triples[0]!)) {
    const changed = { ...triples[0], [field]: "wrong" };
    assert.notDeepEqual(observe({ ...full, triples: [changed] }), reply.observed, field);
  }
});
test("unprepared gateway observations still check complete rows", () => {
  const full: PullResult = { triples: [{ id: "a", entityId: "root", attribute: "a", value: { type: "string", value: "v" } }],
    entities: 1, depth: 0, roundTrips: 1, route: "fallback", language: "gateway", waitedMs: 10, replicaFallbackReason: "watermark-timeout" };
  assert.deepEqual(readObservation(full).observed, observe(full));
  assert.equal(readObservation(full).replicaFallbackReason, "watermark-timeout");
});
