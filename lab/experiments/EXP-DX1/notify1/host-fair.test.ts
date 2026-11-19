import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { openComposition } from "../../../bench/lib/composition.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { originalWorld } from "./fixture.ts";
import { drainHostAccounts } from "./hosts.ts";
import { receiveOrdered } from "./receiver.ts";
import { Documents, hash, pack, unpack } from "./store.ts";

test(
  "host feeds sharing a receiver finish another account during a lost acknowledgement",
  { timeout: 30000 },
  async () => {
    const epoch = randomUUID(),
      scope = "notice-host-fair-" + epoch;
    const native = process.env.NOTIFY_NATIVE === "1";
    const open = (name: string) =>
      native
        ? openComposition("reach", "datomic", name)
        : Promise.resolve(memoryComposition("datomic", name));
    const [source, recipient] = await Promise.all([open(scope), open(scope + "-receiver")]);
    try {
      const busy = new Documents(source, "busy"),
        quiet = new Documents(source, "quiet");
      const sink = new Documents(recipient, "shared");
      const fixture = originalWorld(3);
      const record = W0.evaluateWorld(
        { ...fixture, facts: fixture.facts.map((f) => ({ ...f, tx: 1 })) },
        W0.R1,
        {
          tx: 1,
          validTime: W0.POPULATION_VALID_TIME,
        },
      );
      assert(!W0.isFailure(record));
      const effects = W0.publish(W0.EMPTY_OUTBOX, [W0.recordOf(record)]).deliveries;
      assert(effects.length > 0);
      const stuck = Promise.withResolvers<void>(),
        done = Promise.withResolvers<void>();
      const observe = async (db: Documents) => {
        const origin = hash([db.prefix, epoch]);
        return unpack<W0.Delivery[]>(
          (await sink.get<string>("effects:" + origin + ":1", await sink.head())).value,
        );
      };
      const sourceFrame = async (db: Documents) => {
        const ack = await db.commit(
          "native-event",
          effects,
          [db.put("frame", pack(effects))],
          [db.guard("frame", undefined)],
        );
        return {
          epoch,
          first: { event: 1, offset: 0 },
          async at(point: { event: number; offset: number }) {
            if (point.event === 2) {
              if (db === quiet) {
                // [DX-STG1] Why: the quiet account must checkpoint before the busy account sees its lost reply. Rejected: checking both only after resuming the stalled account.
                const progress = new Documents(recipient, "host-" + hash(db.prefix));
                const cursor = await progress.get<{ point: { event: number } }>(
                  "host-cursor:" + epoch,
                  await progress.head(),
                );
                assert.equal(cursor.value.point.event, 2);
                assert.deepEqual(await observe(db), effects);
                done.resolve();
              }
              return null;
            }
            assert.deepEqual(point, { event: 1, offset: 0 });
            if (db === quiet) await stuck.promise;
            const row = await db.get<string>("frame", ack.position);
            const deliveries = unpack<W0.Delivery[]>(row.value);
            assert(row.at === ack.position && hash(deliveries) === hash(effects));
            return {
              id: hash([db.prefix, ack.txId, deliveries]),
              position: ack.position,
              next: { event: 2, offset: 0 },
              deliveries,
            };
          },
        };
      };
      const feeds = [
        { source: busy, feed: await sourceFrame(busy) },
        { source: quiet, feed: await sourceFrame(quiet) },
      ];
      const outcomes = await drainHostAccounts(sink, [
        {
          ...feeds[0]!,
          afterEffect: async () => {
            stuck.resolve();
            await done.promise;
            throw Error("lost busy ACK");
          },
        },
        feeds[1]!,
      ]);
      assert(
        outcomes[0]?.status === "rejected" && String(outcomes[0].reason).includes("lost busy ACK"),
      );
      assert(outcomes[1]?.status === "fulfilled" && outcomes[1].value.effects === effects.length);
      const again = await drainHostAccounts(sink, feeds);
      assert(again.every((r) => r.status === "fulfilled"));
      for (const db of [quiet, busy]) {
        assert.deepEqual(await observe(db), effects);
        const origin = hash([db.prefix, epoch]);
        assert.equal(
          (await sink.get<{ batch: number }>("received:" + origin, await sink.head())).value.batch,
          1,
        );
      }
    } finally {
      await recipient.close();
      await source.close();
    }
  },
);

test("an overlapping retransmission recovers the original receipt after its first lookup missed", async () => {
  const epoch = randomUUID(),
    scope = "notice-receiver-race-" + epoch;
  const storage =
    process.env.NOTIFY_NATIVE === "1"
      ? await openComposition("reach", "datomic", scope)
      : memoryComposition("datomic", scope);
  try {
    const db = new Documents(storage, "recipient"),
      delayed = new Documents(storage, "recipient");
    const account = "test-account",
      origin = hash([account, epoch]);
    const delivery: W0.Delivery = {
      id: "pay",
      key: "one",
      kind: "notify.pay-below-minimum",
      subject: "pl:a",
      rule: "MINWAGE",
      payload: "{}",
      version: "one",
      seq: 1n,
    };
    const p = {
      account,
      epoch,
      batch: 1,
      previous: hash([account, epoch, "receiver-genesis"]),
      event: 1,
      position: 1,
      recipe: hash(delivery),
      start: 0,
      through: 1,
      deliveries: [delivery],
    };
    const original = delayed.original.bind(delayed),
      missed = Promise.withResolvers<void>(),
      resume = Promise.withResolvers<void>();
    delayed.original = async (id, intent) => {
      const found = await original(id, intent);
      if (!found) {
        missed.resolve();
        await resume.promise;
      }
      return found;
    };
    const slow = receiveOrdered(delayed, account, p, hash(p));
    await missed.promise;
    try {
      assert.equal(await receiveOrdered(db, account, p, hash(p)), true);
    } finally {
      resume.resolve();
    }
    assert.equal(await slow, false);
    const altered = { ...p, deliveries: [{ ...delivery, payload: '{"different":true}' }] };
    await assert.rejects(receiveOrdered(db, account, altered, hash(altered)), /content mismatch/i);
    const effects = await db.get<string>("effects:" + origin + ":1", await db.head());
    assert.deepEqual(unpack(effects.value), [delivery]);
  } finally {
    await storage.close();
  }
});
