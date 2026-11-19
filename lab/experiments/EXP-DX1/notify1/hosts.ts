import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import type { Packet } from "./dispatcher.ts";
import { receiveOrdered } from "./receiver.ts";
import {
  Conflict,
  Documents,
  hash,
  pack,
  unpack,
  type Check,
  type Op,
  type Store,
} from "./store.ts";

type Point = { event: number; offset: number };
type Frame = {
  id: string;
  position: number;
  next: Point;
  deliveries: W0.Delivery[];
  ack?: Op[];
  checks?: Check[];
};
interface Feed {
  epoch: string;
  first: Point;
  at(point: Point): Promise<Frame | null>;
}
interface Cursor {
  point: Point;
  batch: number;
  previous: string;
}
export async function drainHost(
  source: Documents,
  sink: Documents,
  feed: Feed,
  afterEffect?: (p: Packet) => Promise<void>,
) {
  let batches = 0,
    effects = 0;
  for (;;) {
    const at = await source.head(),
      key = "host-cursor:" + feed.epoch,
      stored = await source.row<Cursor>(key, at);
    const c = stored?.value ?? {
      point: feed.first,
      batch: 0,
      previous: hash([source.prefix, feed.epoch, "receiver-genesis"]),
    };
    const spanKey = "host-span:" + feed.epoch + ":" + c.point.event + ":" + c.point.offset;
    let span = await source.row<string>(spanKey, at);
    if (!span) {
      const planned = await feed.at(c.point);
      if (!planned) return { batches, effects };
      const bytes = pack({
        origin: source.prefix,
        epoch: feed.epoch,
        point: c.point,
        frame: planned,
      });
      try {
        await source.commit(
          "pin:" + spanKey + ":" + hash(bytes),
          bytes,
          [source.put(spanKey, bytes)],
          [
            source.guard(spanKey, undefined),
            {
              _tag: "EntityState",
              entityId: source.prefix + key,
              tripleIds: stored ? [stored.id] : [],
            },
          ],
        );
      } catch (e) {
        if (e instanceof Conflict) continue;
        throw e;
      }
      span = await source.get<string>(spanKey, await source.head());
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
      const p: Packet = {
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
      const digest = hash(p);
      await receiveOrdered(sink, source.prefix, p, digest);
      await afterEffect?.(p);
      next.previous = digest;
      next.batch = p.batch;
    }
    // [DX-STG1] Why: one CAS acknowledges the exact host range, including LAZY's original pending row IDs, after durable receipt. Rejected: counting an expansion callback or ACKing each notice separately.
    try {
      await source.commit(
        "host-ack:" + feed.epoch + ":" + c.point.event + ":" + c.point.offset,
        [frame.id, next],
        [...(frame.ack ?? []), ...source.change(key, stored, next)],
        [source.guard(key, stored), ...(frame.checks ?? [])],
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
export async function lazyFeed(store: LazyStore, through: number): Promise<Feed> {
  const epoch = (await store.controls(through)).generation;
  assert(typeof epoch === "string" && epoch && epoch !== "uninitialized");
  return {
    epoch,
    first: { event: 1, offset: 0 },
    async at(p) {
      let scan = p.event;
      while (scan <= through) {
        const txs = (await store.comp.feedPage(scan - 1, Math.min(16, through - scan + 1)))
          .transactions;
        assert(txs.length && txs.every((t, i) => t.position === scan + i && t.txId));
        const ds: W0.Delivery[] = [],
          ack: Op[] = [],
          checks: Check[] = [],
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
            checks.push({ _tag: "TripleLive", id: x.tripleId });
            bindings.push([tx.position, tx.txId, x.tripleId, hash(d)]);
            if (ds.length === 64) {
              next =
                i + 1 === cs.length
                  ? { event: tx.position + 1, offset: 0 }
                  : { event: tx.position, offset: i + 1 };
              break;
            }
          }
          if (ds.length === 64) break;
          next = { event: tx.position + 1, offset: 0 };
        }
        if (ds.length)
          return {
            id: hash([store.scope, epoch, p, next, bindings]),
            position: txs[0]!.position,
            next,
            deliveries: ds,
            ack,
            checks,
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
): Promise<Feed> {
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
      let deliveries: W0.Delivery[] = [];
      if (x.parts.length) {
        const chunk = await db.get<DeltaChunk>("chunk:" + seq + ":" + point.offset, cut);
        assert(
          hash(chunk.value) === x.parts[point.offset] &&
            chunk.value.seq === seq &&
            chunk.value.request === event.hash,
        );
        deliveries = JSON.parse(chunk.value.deliveries, (k, v) => (k === "seq" ? BigInt(v) : v));
      }
      const next =
        point.offset + 1 >= x.parts.length
          ? { event: seq + 1, offset: 0 }
          : { event: seq, offset: point.offset + 1 };
      return {
        id: hash([db.account, epoch, event.hash, x.digest, point]),
        position: event.position,
        next,
        deliveries,
      };
    },
  };
}
