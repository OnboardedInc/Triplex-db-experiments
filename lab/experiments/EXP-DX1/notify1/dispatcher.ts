import assert from "node:assert/strict";
import { setImmediate as yieldTurn, setTimeout as sleep } from "node:timers/promises";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { width } from "./census.ts";
import { receiveOrdered } from "./receiver.ts";
import { Notices, type Tail } from "./journal.ts";
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
  selectionEvaluations: number;
  certified: number;
  fallback: number;
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
export const emptyMetrics = (): Metrics => ({
  visits: 0,
  evaluations: 0,
  selectionEvaluations: 0,
  certified: 0,
  fallback: 0,
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
export class Dispatcher {
  readonly notices: Notices;
  readonly sink: Documents;
  readonly metrics = emptyMetrics();
  constructor(notices: Notices, sink: Documents) {
    this.notices = notices;
    this.sink = sink;
  }
  async derive(
    tail: Row<Tail>,
    old: Row<Cursor> | undefined,
    at: number,
    grant?: () => Promise<void>,
  ) {
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
    const selected = await a.select(e, db, at, at, cursor.start);
    const census = a.censusFor(e);
    const ids = selected.coverage
      ? selected.coverage.ids.slice(cursor.start, cursor.start + width)
      : await a.members(e, cursor.start);
    const size = selected.coverage?.ids.length ?? census.count;
    assert(ids.length === Math.min(width, size - cursor.start), "Incomplete delivery source range");
    const subjects = ids;
    const ledgers = await db.rows<string>(subjects.map(ledger), at);
    const states = new Map<string, readonly W0.ItemState[]>(
      subjects.map((s) => [
        s,
        ledgers.has(ledger(s)) ? unpack<W0.ItemState[]>(ledgers.get(ledger(s))!.value) : [],
      ]),
    );
    const initial = new Map(states),
      deliveries: W0.Delivery[] = [];
    const work = await a.work(e, ids, at).catch(async (error) => {
      if ((await db.get<number>("erasure", await db.head())).id !== guard.id)
        throw new Conflict("Erasure advanced during replay");
      throw error;
    });
    const publicationStart = a.budget ? performance.timeOrigin + performance.now() : 0;
    for (const [i, subject] of ids.entries()) {
      const result = W0.publish({ items: states.get(subject)!, subjects: [], pending: [] }, [
        {
          subject,
          release: e.value.nextHash,
          basis: { tx: BigInt(e.at), validTime: e.value.validTime },
          workItems: work[i]!,
        },
      ]);
      states.set(subject, result.state.items);
      deliveries.push(...result.deliveries);
    }
    const changes = subjects.flatMap((s) =>
      canonical(states.get(s)) === canonical(initial.get(s))
        ? []
        : db.change(ledger(s), ledgers.get(ledger(s)), pack(states.get(s))),
    );
    a.budget?.mark("publish-and-pack", publicationStart);
    this.metrics.evaluationMs += performance.now() - start;
    if (selected.write) changes.push(selected.write);
    const through = cursor.start + ids.length,
      done = through === size;
    const next: Cursor = {
      ...cursor,
      event: done ? e.value.sequence + 1 : cursor.event,
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
    await grant?.();
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
    if (selected.write) {
      this.metrics.certified++;
      this.metrics.selectionEvaluations += selected.coverage!.evaluated;
    } else if (cursor.start === 0 && e.value.kind === "reconcile") this.metrics.fallback++;
    this.metrics.evaluations += ids.length;
    this.metrics.sourceWrites++;
    this.metrics.progressMs += performance.now() - commit;
    return true;
  }
  async receive(p: Packet, digest: string, grant?: () => Promise<void>) {
    this.notices.budget?.packet(p);
    if (await receiveOrdered(this.sink, this.notices.db.prefix, p, digest, grant))
      this.metrics.sinkWrites++;
  }
  async turn(
    afterReceive?: (p: Packet) => Promise<void>,
    through?: number,
    grant?: () => Promise<void>,
  ) {
    const a = this.notices,
      db = a.db,
      at = await db.head();
    const [tail, cursor] = await Promise.all([
      db.get<Tail>("tail", at),
      db.row<Cursor>("cursor", at),
    ]);
    if (!cursor?.value.pending) {
      assert(!tail.value.recipient, "Account uses the registered recipient checkpoint");
      if (through !== undefined && (cursor?.value.event ?? 1) > through) return false;
      return this.derive(tail, cursor, at, grant);
    }
    const c = cursor.value,
      p = unpack<Packet>((await db.get<string>("packet:" + c.batch, at)).value),
      start = performance.now();
    await this.receive(p, c.pending!, grant);
    this.metrics.receiverMs += performance.now() - start;
    await afterReceive?.(p);
    await grant?.();
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
    opts: {
      afterReceive?: (p: Packet) => Promise<void>;
      gapMs?: number;
      through?: number;
      grant?: () => Promise<void>;
    } = {},
  ) {
    for (;;) {
      try {
        await opts.grant?.();
        if (!(await this.turn(opts.afterReceive, opts.through, opts.grant))) return this.metrics;
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
        this.metrics.conflicts++;
      }
      if (opts.gapMs) {
        const start = this.notices.budget ? performance.timeOrigin + performance.now() : 0;
        await sleep(opts.gapMs);
        this.notices.budget?.mark("sleep", start);
      } else await yieldTurn();
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
