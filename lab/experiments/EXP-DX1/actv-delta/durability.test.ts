import assert from "node:assert/strict";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import { decodeOwed, openStored, persistPublication } from "./dispatch.ts";

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

test("a release ACK supplies record mode while stored mode requires the later actual guard", async () => {
  const c = memoryComposition("datomic", "stored-endpoint"),
    id = "pl:a",
    validTime = W0.POPULATION_VALID_TIME,
    basis = { tx: 1, validTime },
    a = new Account(new Objects(c, "target"), "test");
  try {
    await a.bootstrap([id], [{ subject: id, facts: [] }], basis, true, "native");
    const ack = await a.seal("literal", W0.R2, { durability: "stored" }),
      fresh = new Account(new Objects(c, "target"), "test");
    const recorded = await decodeOwed(fresh, ack.seq, ack.position);
    assert(recorded.owed);
    await assert.rejects(openStored(fresh, ack.seq, ack.position), /missing durable object/);
    const end = await persistPublication(a, ack.seq, ack.position);
    assert(end.position > ack.position && end.lastNotice.position === end.position);
    const read = await openStored(fresh, ack.seq, end.position);
    assert.equal(end.digest, read.digest);
    assert.deepEqual(read.chunks, []);
  } finally {
    await c.close();
  }
});
