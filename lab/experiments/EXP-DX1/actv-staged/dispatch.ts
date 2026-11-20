import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Account, type Batch, type Leaf } from "./account.ts";
import { Blocks, Repository, absent, digest, live, replace, set, type Ref } from "./storage.ts";

async function stagedDelivery(
  blocks: Blocks,
  ref: Ref | null,
  offset: number,
  at: number,
): Promise<W0.Delivery | null> {
  if (!ref || offset >= ref.owed) return null;
  if (ref.first === ref.last) {
    const rows = await blocks.get<Leaf[]>(ref.hash, "page", at);
    const ds = rows.flatMap((r) => r.added);
    assert.equal(ds.length, ref.owed);
    return ds[offset]!;
  }
  const refs = await blocks.get<Ref[]>(ref.hash, "index", at);
  for (const child of refs) {
    if (offset < child.owed) return stagedDelivery(blocks, child, offset, at);
    offset -= child.owed;
  }
  throw Error("Incomplete delivery directory");
}
export async function dispatch(
  a: Account,
  sink: Repository,
  afterEffect?: (d: W0.Delivery) => Promise<void>,
) {
  let count = 0,
    first: number | null = null,
    last: number | null = null;
  for (;;) {
    const at = await a.head(),
      c = (await a.control(at)).data;
    const checkpoint = await a.db.cell<{ batch: number; offset: number }>("sender", at);
    const cursor = checkpoint?.data ?? { batch: 1, offset: 0 };
    if (cursor.batch > c.publication) return { count, first, last };
    const batch = (await a.db.must<Batch>("batch:" + cursor.batch, at)).data;
    let delivery: W0.Delivery | null;
    if ("activation" in batch) {
      const vs = await a.visible(batch.activation, at);
      assert.equal(vs.data.publication, cursor.batch);
      delivery = await stagedDelivery(
        new Blocks(a.db, batch.activation),
        vs.data.seal.root,
        cursor.offset,
        vs.at,
      );
    } else delivery = batch.deliveries[cursor.offset] ?? null;
    const next = delivery
      ? { ...cursor, offset: cursor.offset + 1 }
      : { batch: cursor.batch + 1, offset: 0 };
    const id = "send:" + cursor.batch + ":" + cursor.offset,
      intent = { source: a.db.scope, cursor, delivery };
    const ops = checkpoint ? replace(checkpoint, next) : [set("sender", next)];
    if (delivery) {
      const inbox = "inbox:" + digest(a.db.scope) + ":" + delivery.subject;
      const receipt = "receive:" + digest([a.db.scope, cursor]);
      if (!(await sink.recovered(receipt, intent))) {
        const prior = await sink.cell<W0.ReceiverState>(inbox, await sink.store.currentPosition());
        const received = W0.receive(prior?.data ?? W0.EMPTY_RECEIVER, [delivery]);
        assert.equal(
          canonical(received.applied.effects),
          canonical([delivery]),
          "Unordered subject effect",
        );
        // [DX-STG1] Why: store the effect and receiver progress together, before acknowledging the separate sender. Rejected: retrying a side effect on the strength of a sender-local checkpoint.
        await sink.write(
          receipt,
          intent,
          [
            ...(prior ? replace(prior, received.state) : [set(inbox, received.state)]),
            set("effect:" + digest([a.db.scope, cursor]), delivery),
          ],
          [prior ? live(prior) : absent(inbox)],
        );
      }
      first ??= performance.now();
      last = performance.now();
      count++;
      await afterEffect?.(delivery);
      const key = "ack:" + delivery.subject,
        old = await a.db.cell<number>(key, at);
      ops.push(...(old ? replace(old, old.data + 1) : [set(key, 1)]));
    }
    await a.db.write(id, intent, ops, [checkpoint ? live(checkpoint) : absent("sender")]);
  }
}
