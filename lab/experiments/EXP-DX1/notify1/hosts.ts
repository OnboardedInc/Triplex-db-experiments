import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import type { Packet } from "./dispatcher.ts";
import { receiveOrdered } from "./receiver.ts";
import { Conflict, Documents, hash, pack, unpack, type Op, type Store } from "./store.ts";

type Point = { event: number; offset: number };
type Frame = {
  id: string;
  position: number;
  next: Point;
  deliveries: W0.Delivery[];
  ack?: Op[];
};
interface Feed {
  epoch: string;
  first: Point;
  at(point: Point): Promise<Frame | null>;
  acknowledge?(frame: Frame): Promise<void>;
}
interface Cursor {
  point: Point;
  batch: number;
  previous: string;
  outstanding?: Frame;
}
function hostPacket(source: Documents, feed: Feed, c: Cursor, frame: Frame): Packet {
  return {
    epoch: feed.epoch,
    account: source.prefix,
    batch: c.batch + 1,
    previous: c.previous,
    event: c.point.event,
    position: frame.position,
    recipe: frame.id,
    start: c.point.offset,
    through: frame.next.offset,
    deliveries: frame.deliveries,
  };
}
export function drainHostAccounts(
  sink: Documents,
  accounts: {
    source: Documents;
    feed: Feed;
    afterEffect?: (p: Packet) => Promise<void>;
    atomic?: boolean;
  }[],
) {
  assert.equal(new Set(accounts.map((account) => account.source.prefix)).size, accounts.length);
  // [DX-STG1] Why: a slow source or recipient may suspend its own batch while every other account keeps making progress. Rejected: awaiting the largest account's entire backlog before reading the next native feed.
  return Promise.allSettled(
    accounts.map(({ source, feed, afterEffect, atomic }) =>
      drainHost(source, sink, feed, afterEffect, atomic),
    ),
  );
}
export async function drainHost(
  source: Documents,
  sink: Documents,
  feed: Feed,
  afterEffect?: (p: Packet) => Promise<void>,
  atomic = false,
) {
  const progress = new Documents(sink.store, "host-" + hash(source.prefix));
  let batches = 0,
    effects = 0;
  for (;;) {
    const at = await progress.head(),
      key = "host-cursor:" + feed.epoch,
      stored = await progress.row<Cursor>(key, at);
    const c: Cursor = stored?.value ?? {
      point: feed.first,
      batch: 0,
      previous: hash([source.prefix, feed.epoch, "receiver-genesis"]),
    };
    if (c.outstanding) {
      const { outstanding, ...settled } = c;
      assert(feed.acknowledge && outstanding.ack?.length);
      await feed.acknowledge(outstanding);
      try {
        await progress.commit(
          "host-settle:" + feed.epoch + ":" + outstanding.id,
          [outstanding.id, settled],
          progress.change(key, stored, settled),
          [progress.guard(key, stored)],
        );
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
      continue;
    }
    const spanKey = "host-span:" + feed.epoch + ":" + c.point.event + ":" + c.point.offset;
    let span = await progress.row<string>(spanKey, at);
    if (!span) {
      const planned = await feed.at(c.point);
      if (!planned) return { batches, effects };
      if (atomic) {
        const next: Cursor = { ...c, point: planned.next };
        const packet = planned.deliveries.length ? hostPacket(source, feed, c, planned) : null;
        if (packet) {
          next.batch = packet.batch;
          next.previous = hash(packet);
        }
        if (planned.ack?.length) {
          assert(feed.acknowledge);
          next.outstanding = { ...planned, deliveries: [] };
        }
        const ops = progress.change(key, stored, next),
          checks = [progress.guard(key, stored), progress.guard(spanKey, undefined)];
        const binding = hash([source.prefix, feed.epoch, planned.id, ops]);
        // [DX-STG1] Why: commit the effects, original native ACK obligation and cursor together. Legacy pinned spans finish on their original path. Rejected: advancing only in memory after a delivery.
        try {
          if (packet) {
            if (
              !(await receiveOrdered(sink, source.prefix, packet, next.previous, undefined, {
                binding,
                ops,
                checks,
              }))
            )
              continue;
          } else await progress.commit("host-advance:" + spanKey, binding, ops, checks);
        } catch (e) {
          if (e instanceof Conflict) continue;
          if (
            e instanceof assert.AssertionError &&
            (await progress.row<Cursor>(key, await progress.head()))?.id !== stored?.id
          )
            continue;
          throw e;
        }
        if (packet) {
          batches++;
          effects += packet.deliveries.length;
          await afterEffect?.(packet);
        }
        continue;
      }
      const bytes = pack({
        origin: source.prefix,
        epoch: feed.epoch,
        point: c.point,
        frame: planned,
      });
      try {
        await progress.commit(
          "pin:" + spanKey + ":" + hash(bytes),
          bytes,
          [progress.put(spanKey, bytes)],
          [
            progress.guard(spanKey, undefined),
            {
              _tag: "EntityState",
              entityId: progress.prefix + key,
              tripleIds: stored ? [stored.id] : [],
            },
          ],
        );
      } catch (e) {
        if (e instanceof Conflict) continue;
        throw e;
      }
      span = await progress.get<string>(spanKey, await progress.head());
    }
    const pinned = unpack<{ origin: string; epoch: string; point: Point; frame: Frame }>(
      span.value,
    );
    assert(
      pinned.origin === source.prefix &&
        pinned.epoch === feed.epoch &&
        canonical(pinned.point) === canonical(c.point),
    );
    const frame = pinned.frame;
    const next = { ...c, point: frame.next };
    if (frame.deliveries.length) {
      const p = hostPacket(source, feed, c, frame);
      const digest = hash(p);
      await receiveOrdered(sink, source.prefix, p, digest);
      await afterEffect?.(p);
      next.previous = digest;
      next.batch = p.batch;
    }
    // [DX-STG1] Why: the receiver holds transport progress. The host acknowledges its original pending rows only through its own batch operation. Rejected: appending transport metadata to a source journal with a closed set of admitted writers.
    await feed.acknowledge?.(frame);
    try {
      await progress.commit(
        "host-ack:" + feed.epoch + ":" + c.point.event + ":" + c.point.offset,
        [frame.id, next],
        progress.change(key, stored, next),
        [progress.guard(key, stored)],
      );
    } catch (e) {
      if (e instanceof Conflict) continue;
      throw e;
    }
    batches += Number(!!frame.deliveries.length);
    effects += frame.deliveries.length;
  }
}

interface LazyStore {
  scope: string;
  comp: CompositionHandle;
  head(): Promise<number>;
  controls(p: number): Promise<any>;
  lookup(id: string): Promise<any>;
  commit(
    id: string,
    actor: string,
    ops: readonly unknown[],
    expected: number,
    context?: unknown,
  ): Promise<any>;
}
export async function lazyFeed(store: LazyStore, through: number, packetLimit = 64): Promise<Feed> {
  assert(Number.isInteger(packetLimit) && packetLimit > 0 && packetLimit <= 1024);
  const epoch = (await store.controls(through)).generation;
  assert(typeof epoch === "string" && epoch && epoch !== "uninitialized");
  return {
    epoch,
    first: { event: 1, offset: 0 },
    async acknowledge(f) {
      const ops = f.ack ?? [];
      if (!ops.length) return;
      const id = "lazy/ack/notice-" + f.id,
        context = { source: store.scope, generation: epoch, range: f.id };
      for (;;) {
        const p = await store.head();
        assert.equal((await store.controls(p)).generation, epoch);
        try {
          const r = await store.commit(id, "lazy/ack", ops, p, context);
          assert(r.actor === "lazy/ack" && r.commandId === id && r.txId);
          assert.deepEqual(
            r.changes.map((c: any) => [c.op, c.tripleId, c.retractionTxId]),
            ops.map((o) => ["retract", o.op === "retract" ? o.id : null, r.txId]),
          );
          return;
        } catch (error) {
          if ((await store.head()) === p) throw error;
        }
      }
    },
    async at(p) {
      let scan = p.event;
      while (scan <= through) {
        const txs = (await store.comp.feedPage(scan - 1, Math.min(16, through - scan + 1)))
          .transactions;
        assert(txs.length && txs.every((t, i) => t.position === scan + i && t.txId));
        const ds: W0.Delivery[] = [],
          ack: Op[] = [],
          bindings: unknown[] = [];
        let next = p;
        for (const tx of txs) {
          const cs = tx.changes.filter(
            (x: any) => x.op === "assert" && x.attribute === "lazy/delivery",
          );
          assert(
            !cs.length || tx.actor === "lazy/event" || tx.actor === "lazy/live",
            "Unadmitted LAZY publication",
          );
          const begin = tx.position === p.event ? p.offset : 0;
          assert(begin <= cs.length);
          for (let i = begin; i < cs.length; i++) {
            const x = cs[i],
              d = parseOutbox(x.value.value) as W0.Delivery;
            assert(
              d.seq > 0n &&
                x.entityId === "lazy/pending/" + d.subject &&
                x.assertionTxId === tx.txId,
            );
            ds.push(d);
            ack.push({ op: "retract", id: x.tripleId });
            bindings.push([tx.position, tx.txId, x.tripleId, hash(d)]);
            if (ds.length === packetLimit) {
              next =
                i + 1 === cs.length
                  ? { event: tx.position + 1, offset: 0 }
                  : { event: tx.position, offset: i + 1 };
              break;
            }
          }
          if (ds.length === packetLimit) break;
          next = { event: tx.position + 1, offset: 0 };
        }
        if (ds.length)
          return {
            id: hash([store.scope, epoch, p, next, bindings]),
            position: txs[0]!.position,
            next,
            deliveries: ds,
            ack,
          };
        scan = next.event;
      }
      return null;
    },
  };
}
export async function eraseLazy(
  store: LazyStore,
  drain: () => Promise<unknown>,
  id: string,
  subject: string,
  at: string,
) {
  assert(W0.isPlacementId(subject) && W0.isInstant(at));
  const event = { kind: "erase", at, subject, attribute: "ssn" },
    intent = hash([store.scope, id, event, []]);
  for (;;) {
    const old = await store.lookup(id);
    if (old) {
      assert(old.actor === "lazy/input" && JSON.parse(old.correlationId).context.intent === intent);
      return old;
    }
    await drain();
    const p = await store.head(),
      c = await store.controls(p);
    const progress = c.cursor ? JSON.parse(c.cursor.value.value) : { done: 0 };
    if (progress.done < c.input || progress.open) continue;
    assert(at >= c.at);
    const value = { type: "string", value: canonical(event) };
    const fact = (entityId: string, attribute: string) => ({
      op: "assert",
      entityId,
      attribute,
      value,
      validFrom: 0,
    });
    const ops = [
      ...(c.clock ? [{ op: "retract", id: c.clock.id }] : []),
      fact("lazy/account/clock", "lazy/slot"),
      fact("lazy/account/erasure", "lazy/redact"),
    ];
    try {
      return await store.commit(id, "lazy/input", ops, p, {
        event,
        intent,
        profile: (store as LazyStore & { profile: string }).profile,
      });
    } catch (e) {
      if ((await store.head()) === p) throw e;
    }
  }
}

interface DeltaObjects {
  account: string;
  comp: Store;
  get<T>(key: string, p: number): Promise<{ hash: string; value: T; position: number }>;
  many<T>(keys: string[], p: number): Promise<Map<string, { value: T }>>;
  entity(k: string): string;
}
interface DeltaAccount {
  db: DeltaObjects;
  binding: string;
  head(
    p: number,
  ): Promise<{ hash: string; value: { seq: number; census: string; source: string } }>;
}
type Expansion = { seq: number; event: string; parts: string[]; digest: string };
type DeltaChunk = { seq: number; offset: number; request: string; deliveries: string };
export async function deltaFeed(
  a: DeltaAccount,
  through: number,
  expand: (seq: number) => Promise<Expansion>,
  chunksPerFrame = 1,
): Promise<Feed> {
  assert(Number.isInteger(chunksPerFrame) && chunksPerFrame >= 1 && chunksPerFrame <= 32);
  const db = a.db,
    p = await db.comp.currentPosition(),
    bootstrap = await db.get<unknown>("bootstrap", p),
    head = await a.head(p);
  assert(head.value.seq >= through && head.value.source === a.binding);
  const epoch = hash([db.account, a.binding, bootstrap.hash]);
  return {
    epoch,
    first: { event: 0, offset: 0 },
    async at(point) {
      const seq = point.event;
      if (seq > through) return null;
      const x = await expand(seq),
        cut = await db.comp.currentPosition();
      const event =
        seq === 0
          ? bootstrap
          : await db.get<{ parent: number; sourceCut: number; parentHash: string; census: string }>(
              "event:" + seq,
              cut,
            );
      if (seq) {
        const r = event.value as {
            parent: number;
            sourceCut: number;
            parentHash: string;
            census: string;
          },
          parent = await a.head(r.sourceCut);
        assert(
          parent.hash === r.parentHash &&
            parent.value.seq === r.parent &&
            r.parent === seq - 1 &&
            parent.value.census === r.census,
        );
      }
      assert(
        x.seq === seq &&
          x.event === event.hash &&
          hash(x.parts) === x.digest &&
          (point.offset < x.parts.length || (!x.parts.length && !point.offset)),
      );
      const deliveries: W0.Delivery[] = [];
      const keys = x.parts
        .slice(point.offset, point.offset + chunksPerFrame)
        .map((_, i) => "chunk:" + seq + ":" + (point.offset + i));
      const chunks = keys.length > 1 ? await db.many<DeltaChunk>(keys, cut) : null;
      for (const [i, key] of keys.entries()) {
        const chunk = chunks ? chunks.get(key) : await db.get<DeltaChunk>(key, cut);
        assert(
          chunk &&
            hash(chunk.value) === x.parts[point.offset + i] &&
            chunk.value.seq === seq &&
            chunk.value.request === event.hash,
        );
        deliveries.push(
          ...JSON.parse(chunk.value.deliveries, (k, v) => (k === "seq" ? BigInt(v) : v)),
        );
      }
      const next =
        point.offset + keys.length >= x.parts.length
          ? { event: seq + 1, offset: 0 }
          : { event: seq, offset: point.offset + keys.length };
      return {
        id: hash([db.account, epoch, event.hash, x.digest, point]),
        position: event.position,
        next,
        deliveries,
      };
    },
  };
}

// [DX-STG1] Why: the normal LAZY service wakes a receiver after its projector catches up. Use that wake for batched native acknowledgements and retain its genuine deadline timer. Rejected: polling an idle account.
export function lazyRecipient(store: LazyStore, sink: Documents, atomic = false) {
  const source = new Documents(store.comp, "lazy-sender");
  return {
    drain: async (host: LazyStore) => {
      assert.equal(host.scope, store.scope);
      return (
        await drainHost(
          source,
          sink,
          await lazyFeed(host, await host.head(), atomic ? 1024 : 64),
          undefined,
          atomic,
        )
      ).effects;
    },
  };
}
