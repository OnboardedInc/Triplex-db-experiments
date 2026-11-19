import assert from "node:assert/strict";
import { setImmediate as yieldTurn, setTimeout as sleep } from "node:timers/promises";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { width } from "./census.ts";
import { Notices, type Event, type Tail } from "./journal.ts";
import { Conflict, Documents, hash, pack, unpack, type Row } from "./store.ts";

interface Cursor {
  event: number;
  start: number;
  parent: string;
  batch: number;
  previous: string;
  pending: string | null;
}
export interface Packet {
  epoch: string;
  account: string;
  batch: number;
  previous: string;
  event: number;
  position: number;
  recipe: string;
  start: number;
  through: number;
  deliveries: readonly W0.Delivery[];
}
type Receipt = { batch: number; digest: string };
export interface Metrics {
  visits: number;
  evaluations: number;
  deliveries: number;
  packets: number;
  sourceWrites: number;
  sinkWrites: number;
  evaluationMs: number;
  progressMs: number;
  receiverMs: number;
  ackMs: number;
  conflicts: number;
}
const metrics = (): Metrics => ({
  visits: 0,
  evaluations: 0,
  deliveries: 0,
  packets: 0,
  sourceWrites: 0,
  sinkWrites: 0,
  evaluationMs: 0,
  progressMs: 0,
  receiverMs: 0,
  ackMs: 0,
  conflicts: 0,
});
const ledger = (s: string) => "ledger:" + s;
const inbox = (origin: string, s: string) => "receiver:" + origin + ":" + s;
const empty = (p: Packet) => hash([p.account, p.epoch, "receiver-genesis"]);
export class Dispatcher {
  readonly notices: Notices;
  readonly sink: Documents;
  readonly metrics = metrics();
  constructor(notices: Notices, sink: Documents) {
    this.notices = notices;
    this.sink = sink;
  }
  async derive(tail: Row<Tail>, old: Row<Cursor> | undefined, at: number) {
    const a = this.notices,
      db = a.db,
      t = tail.value;
    const cursor: Cursor = old?.value ?? {
      event: 1,
      start: 0,
      parent: hash([db.prefix, t.epoch, t.census]),
      batch: 0,
      previous: hash([db.prefix, t.epoch, "receiver-genesis"]),
      pending: null,
    };
    if (cursor.event > t.sequence) return false;
    const e = await a.event(cursor.event, at);
    assert(
      e.value.epoch === t.epoch && e.value.parent === cursor.parent,
      "Missing publication predecessor",
    );
    const guard = await db.get<number>("erasure", at),
      start = performance.now();
    const ids = await a.members(e, cursor.start),
      size =
        e.value.selection.kind === "census" ? e.value.census.count : e.value.selection.ids.length;
    assert(ids.length === Math.min(width, size - cursor.start), "Incomplete delivery source range");
    const [work, ledgers] = await Promise.all([
      a.work(e, ids, at).catch(async (error) => {
        if ((await db.get<number>("erasure", await db.head())).id !== guard.id)
          throw new Conflict("Erasure advanced during replay");
        throw error;
      }),
      db.rows<string>(ids.map(ledger), at),
    ]);
    const deliveries: W0.Delivery[] = [],
      changes = [];
    for (const [i, s] of ids.entries()) {
      const prior = ledgers.get(ledger(s)),
        items = prior ? unpack<W0.ItemState[]>(prior.value) : [];
      const next = W0.publish({ items, subjects: [], pending: [] }, [
        {
          subject: s,
          release: e.value.nextHash,
          basis: { tx: BigInt(e.at), validTime: e.value.validTime },
          workItems: work[i]!,
        },
      ]);
      if (canonical(next.state.items) !== canonical(items))
        changes.push(...db.change(ledger(s), prior, pack(next.state.items)));
      deliveries.push(...next.deliveries);
    }
    this.metrics.evaluationMs += performance.now() - start;
    const through = cursor.start + ids.length,
      done = through === size;
    const next: Cursor = {
      ...cursor,
      event: done ? cursor.event + 1 : cursor.event,
      start: done ? 0 : through,
      parent: done ? hash(e.value) : cursor.parent,
    };
    if (deliveries.length) {
      const packet: Packet = {
        account: db.prefix,
        epoch: t.epoch,
        batch: cursor.batch + 1,
        previous: cursor.previous,
        event: e.value.sequence,
        position: e.at,
        recipe: hash(e.value),
        start: cursor.start,
        through,
        deliveries,
      };
      const digest = hash(packet);
      next.batch = packet.batch;
      next.previous = digest;
      next.pending = digest;
      changes.push(db.put("packet:" + packet.batch, pack(packet)));
    }
    const commit = performance.now();
    // [DX-STG1] Why: this CAS advances the actual published item ledger, immutable packet and contiguous cursor in one write, even when only retirements changed. Rejected: allocating sequences from receiver ACKs or a release-private ledger.
    await db.commit(
      "derive:" + cursor.event + ":" + cursor.start,
      [e.id, next, hash(changes)],
      [...changes, ...db.change("cursor", old, next)],
      [
        db.guard("cursor", old),
        { _tag: "EntityState", entityId: db.prefix + "erasure", tripleIds: [guard.id] },
      ],
    );
    this.metrics.visits++;
    this.metrics.evaluations += ids.length;
    this.metrics.sourceWrites++;
    this.metrics.progressMs += performance.now() - commit;
    return true;
  }
  async receive(p: Packet, digest: string) {
    assert.equal(hash(p), digest);
    assert(p.account === this.notices.db.prefix && p.deliveries.length > 0);
    const db = this.sink,
      origin = hash([p.account, p.epoch]),
      key = "received:" + origin,
      id = key + ":" + p.batch;
    const before = await db.original(id, digest);
    if (before) return;
    const at = await db.head(),
      head = await db.row<Receipt>(key, at);
    assert(
      (head?.value.batch ?? 0) + 1 === p.batch && (head?.value.digest ?? empty(p)) === p.previous,
      "Out-of-order receiver packet",
    );
    const subjects = [...new Set(p.deliveries.map((d) => d.subject))],
      rows = await db.rows<string>(
        subjects.map((s) => inbox(origin, s)),
        at,
      );
    const by = new Map<string, W0.Delivery[]>();
    for (const d of p.deliveries) {
      if (!by.has(d.subject)) by.set(d.subject, []);
      by.get(d.subject)!.push(d);
    }
    const ops = [];
    for (const [subject, ds] of by) {
      const k = inbox(origin, subject),
        prior = rows.get(k),
        state = prior ? unpack<W0.ReceiverState>(prior.value) : W0.EMPTY_RECEIVER;
      const next = W0.receive(state, ds);
      assert.equal(canonical(next.applied.effects), canonical(ds), "Gap or duplicate at receiver");
      ops.push(...db.change(k, prior, pack(next.state)));
    }
    const ack = { batch: p.batch, digest };
    // [DX-STG1] Why: a single receiver transaction stores the actual ordered effects with deduplication and progress. Rejected: acknowledging a non-idempotent external call whose result can be lost.
    await db.commit(
      id,
      digest,
      [
        ...ops,
        ...db.change(key, head, ack),
        db.put("effects:" + origin + ":" + p.batch, pack(p.deliveries)),
      ],
      [db.guard(key, head)],
    );
    this.metrics.sinkWrites++;
  }
  async turn(afterReceive?: (p: Packet) => Promise<void>, through?: number) {
    const a = this.notices,
      db = a.db,
      at = await db.head();
    const [tail, cursor] = await Promise.all([
      db.get<Tail>("tail", at),
      db.row<Cursor>("cursor", at),
    ]);
    if (!cursor?.value.pending) {
      if (through !== undefined && (cursor?.value.event ?? 1) > through) return false;
      return this.derive(tail, cursor, at);
    }
    const c = cursor.value,
      p = unpack<Packet>((await db.get<string>("packet:" + c.batch, at)).value),
      start = performance.now();
    await this.receive(p, c.pending!);
    this.metrics.receiverMs += performance.now() - start;
    await afterReceive?.(p);
    const ackTime = performance.now();
    await db.commit(
      "ack:" + c.batch,
      c.pending,
      [...db.change("cursor", cursor, { ...c, pending: null })],
      [db.guard("cursor", cursor)],
    );
    this.metrics.ackMs += performance.now() - ackTime;
    this.metrics.sourceWrites++;
    this.metrics.packets++;
    this.metrics.deliveries += p.deliveries.length;
    return true;
  }
  async drain(
    opts: { afterReceive?: (p: Packet) => Promise<void>; gapMs?: number; through?: number } = {},
  ) {
    for (;;) {
      try {
        if (!(await this.turn(opts.afterReceive, opts.through))) return this.metrics;
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
        this.metrics.conflicts++;
      }
      if (opts.gapMs) await sleep(opts.gapMs);
      else await yieldTurn();
    }
  }
  async effects() {
    const origin = hash([this.notices.db.prefix, (await this.notices.observe()).value.epoch]);
    const at = await this.sink.head(),
      head = await this.sink.row<Receipt>("received:" + origin, at),
      effects: W0.Delivery[] = [];
    for (let i = 1; i <= (head?.value.batch ?? 0); i++)
      effects.push(
        ...unpack<W0.Delivery[]>(
          (await this.sink.get<string>("effects:" + origin + ":" + i, at)).value,
        ),
      );
    return effects;
  }
}
// [DX-STG1] Why: each account may have one bounded batch in flight. A slow receiver yields its lane while other accounts complete successive batches. Rejected: one global FIFO or waiting for every receiver at a round barrier.
export async function drainAccounts(
  accounts: { worker: Dispatcher; afterReceive?: (p: Packet) => Promise<void> }[],
) {
  assert(new Set(accounts.map((x) => x.worker.notices.db.prefix)).size === accounts.length);
  return Promise.allSettled(
    accounts.map(({ worker, afterReceive }) => worker.drain({ afterReceive })),
  );
}
