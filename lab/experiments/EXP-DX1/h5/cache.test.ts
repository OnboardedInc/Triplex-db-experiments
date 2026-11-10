import assert from "node:assert/strict";
import { test } from "node:test";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
process.env.TX2_W0_CACHE_MAX_ENTITIES = "2";
await import("../../../bench/lib/w0-cache.ts");
// [DX-H5] Why: bounded eviction must request a new peer session and retain the original reference-repair validation.
// Rejected: treating an evicted reference as an empty row set.
test("cache eviction changes session and unresolved references still require a full response", async () => {
  const client = new DatomicClient("http://127.0.0.1:1");
  const empty = { rev: 0, rows: [], storedRows: [] };
  client.reachCache.set(
    "s-test",
    new Map([
      ["root", empty],
      ["a", empty],
      ["b", empty],
    ]),
  );
  const previous = client.reachSession,
    calls: any[] = [];
  (client as any).request = async (_method: string, _path: string, body: any) => {
    calls.push(body);
    return {
      position: 1,
      t: "1000",
      reset: false,
      entities: calls.length === 1 ? [["root", 0]] : [["root", 0, []]],
      closures: [["root", ["root"]]],
    };
  };
  try {
    const response: any = await client.reachEntities("s-test", ["root"], {
      recordedPosition: 1,
      validAt: 0,
    });
    assert.notEqual(client.reachSession, previous);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].full, true);
    assert.equal(client.reachDiagnostics.refMisses, 1);
    assert.ok(response);
    assert.equal(client.reachCache.get("s-test")?.has("a"), false);
  } finally {
    client.close();
  }
});
