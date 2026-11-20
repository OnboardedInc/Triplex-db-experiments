import assert from "node:assert/strict";
import { serialize } from "node:v8";
import { test } from "node:test";
import {
  InstalledHistory,
  historicalResult,
  type HistoricalPayload,
} from "../lib/historical-fallback.ts";
import { ReplicaReader } from "../lib/replica-reads.ts";

const basis = { recordedAt: 100, validAt: 2 };
const payload: HistoricalPayload = {
  root: "root",
  recordedAt: basis.recordedAt,
  t: "42",
  from: 1,
  to: 3,
  result: { depth: 0, entities: 1, roundTrips: 1, route: "source", language: "reach", waitedMs: 0 },
  triples: serialize([
    {
      id: "value",
      entityId: "root",
      attribute: "signed",
      value: { type: "number", value: -0 },
      validTo: { _tag: "Some", value: 3 },
      txId: { _tag: "None" },
    },
  ]),
};

test("installed history preserves exact payload, refuses another valid interval and clears on rebuild", async () => {
  const cache = new InstalledHistory(1_024);
  const reader = new ReplicaReader(0);
  const newer = {
    position: 2,
    recordTime: 200,
    clockEnd: 2,
    valid: true,
    reset: true,
    changes: [],
  };
  reader.index.apply(newer);
  reader.installedHistory = cache;
  assert(!reader.canInstallHistory(basis), "A non-strict clock cannot authorize installation");
  reader.install({ ...reader.index.image(), strictRecordClocks: true });
  assert(reader.canInstallHistory(basis));
  assert(!reader.canInstallHistory({ recordedAt: 300, validAt: 2 }));
  assert.throws(() => cache.put("root", { recordedAt: 99, validAt: 2 }, payload), /cut mismatch/);
  cache.put("root", basis, payload);
  const miss = async () => historicalResult(payload, false);
  const hit = await reader.pullAt("root", basis, async () => {
    throw Error("Installed cut made an HTTP exchange");
  });
  assert.equal(hit.route, "replica");
  assert(Object.is(hit.triples[0]!.value.value, -0));
  assert.deepEqual(hit.triples[0]!.validTo.value, 3);
  assert.equal(cache.get("root", { ...basis, validAt: 3 }), undefined);
  assert.equal((await reader.pullAt("other", basis, miss)).route, "fallback");
  reader.apply({ ...newer, position: 3, clockEnd: 3, recordTime: 300 });
  assert.equal(cache.diagnostics.bytes, 0);
  assert.equal((await reader.pullAt("root", basis, miss)).route, "fallback");
});
