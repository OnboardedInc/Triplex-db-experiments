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
    const prior = await c.currentPosition();
    const resumed = await persistPublication(fresh, ack.seq, ack.position);
    assert.deepEqual(resumed, {
      position: end.position,
      digest: end.digest,
      fresh: false,
      at: null,
      lastNotice: { position: end.position, at: null },
    });
    assert.equal(await c.currentPosition(), prior);
  } finally {
    await c.close();
  }
});

test("a restarted stored publication preserves a notice already committed in an unfinished part", async () => {
  const c = memoryComposition("datomic", "stored-resume"),
    id = "pl:a",
    writer = new Account(new Objects(c, "target"), "test"),
    validTime = W0.POPULATION_VALID_TIME;
  try {
    await writer.bootstrap(
      [id],
      [
        {
          subject: id,
          facts: [
            { e: id, a: "location", v: "loc:a", tx: 1 },
            { e: id, a: "payRateCents", v: 1500, tx: 1 },
            { e: "loc:a", a: "localMinWageCents", v: 2000, tx: 1 },
          ],
        },
      ],
      { tx: 1, validTime },
    );
    const release = await writer.seal("broad", W0.R2, { durability: "stored" });
    const interrupted = new Account(
      new Objects(
        {
          ...c,
          async transact(ops, meta) {
            const result = await c.transact(ops, meta);
            if (String(meta.commandId) === writer.db.entity("cmd:put:stored:1:0")) {
              assert(result.ok);
              throw Error("writer ended after the first literal part");
            }
            return result;
          },
        },
        "target",
      ),
      "test",
    );
    await assert.rejects(
      persistPublication(interrupted, 1, release.position),
      /first literal part/,
    );
    const cut = await c.currentPosition();
    await assert.rejects(openStored(writer, 1, cut), /missing durable object/);
    const resumed = await persistPublication(writer, 1, release.position);
    assert(!resumed.fresh && resumed.position > cut);
    assert.deepEqual(resumed.lastNotice, { position: cut, at: null });
    const stored = await openStored(writer, 1, resumed.position);
    assert.equal(stored.owedPosition, cut);
    assert.equal(JSON.parse(stored.chunks[0]!.deliveries).length, 1);
  } finally {
    await c.close();
  }
});
