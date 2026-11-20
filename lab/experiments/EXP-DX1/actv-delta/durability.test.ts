import assert from "node:assert/strict";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";

test("a timed publish acknowledges its own owed record before any concrete output exists", async () => {
  const c = memoryComposition("datomic", "durable-endpoints"),
    id = W0.placementId(0),
    clock = "2026-11-04T12:00:00.000000Z",
    a = new Account(new Objects(c, "account"), "inputs");
  try {
    await a.bootstrap([id], [{ subject: id, facts: [] }], { tx: 1, validTime: clock });
    const ack = await a.seal("first", W0.R2, { durability: "record" });
    const reader = new Account(new Objects(c, "account"), "inputs");
    const at = await reader.db.many(
      ["owed:" + ack.seq, "event:" + ack.seq, "stored:" + ack.seq],
      ack.position,
    );
    assert.equal(at.get("owed:" + ack.seq)?.position, ack.position);
    assert.equal(at.get("event:" + ack.seq)?.position, ack.position);
    assert.equal(at.get("stored:" + ack.seq), undefined);
  } finally {
    await c.close();
  }
});
