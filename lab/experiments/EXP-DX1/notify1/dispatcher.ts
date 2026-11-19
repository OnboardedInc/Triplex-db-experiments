import assert from "node:assert/strict";
import { setImmediate as yieldTurn, setTimeout as sleep } from "node:timers/promises";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { width } from "./census.ts";
import { receiveOrdered } from "./receiver.ts";
import { Notices, type Tail, type Recipe } from "./journal.ts";
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
export class Dispatcher {
  readonly notices: Notices;
  readonly sink: Documents;
  readonly metrics = metrics();
  constructor(notices: Notices, sink: Documents) {
    this.notices = notices;
    this.sink = sink;
  }
  async derive(
    tail: Row<Tail>,
    old: Row<Cursor> | undefined,
    at: number,
    grant?: () => Promise<void>,
    throughEvent?: number,
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
    const ids = await a.members(e, cursor.start),
      size =
        e.value.selection.kind === "census" ? e.value.census.count : e.value.selection.ids.length;
    assert(ids.length === Math.min(width, size - cursor.start), "Incomplete delivery source range");
    const ranges = [{ event: e, ids }];
    let visits = ids.length;
    const ceiling = Math.min(throughEvent ?? t.sequence, t.sequence);
    if (e.value.selection.kind === "subjects" && e.value.sequence < ceiling) {
      const keys = Array.from(
        { length: Math.min(16, ceiling - e.value.sequence) },
        (_, i) => "event:" + (e.value.sequence + i + 1),
      );
      const rows = await db.rows<Recipe>(keys, at);
      for (const [i, k] of keys.entries()) {
        const row = rows.get(k);
        assert(row, "Gap in live publication prefix");
        const candidate = a.checkedEvent(row, e.value.sequence + i + 1);
        if (
          candidate.value.selection.kind !== "subjects" ||
          visits + candidate.value.selection.ids.length > width
        )
          break;
        assert(
          candidate.value.epoch === t.epoch &&
            candidate.value.parent === hash(ranges.at(-1)!.event.value),
        );
        ranges.push({ event: candidate, ids: candidate.value.selection.ids });
        visits += candidate.value.selection.ids.length;
      }
    }
    const subjects = [...new Set(ranges.flatMap((r) => r.ids))],
      ledgers = await db.rows<string>(subjects.map(ledger), at);
    const states = new Map<string, readonly W0.ItemState[]>(
      subjects.map((s) => [
        s,
        ledgers.has(ledger(s)) ? unpack<W0.ItemState[]>(ledgers.get(ledger(s))!.value) : [],
      ]),
    );
    const initial = new Map(states),
      deliveries: W0.Delivery[] = [];
    const work = await Promise.all(ranges.map((r) => a.work(r.event, r.ids, at))).catch(
      async (error) => {
        if ((await db.get<number>("erasure", await db.head())).id !== guard.id)
          throw new Conflict("Erasure advanced during replay");
        throw error;
      },
    );
    // [DX-STG1] Why: a batch of ordinary saves can revisit a subject. Fold every transition into its predecessor before storing final items and the full delivery list. Rejected: coalescing to the last payload, which loses reversions.
    for (const [r, range] of ranges.entries()) {
      for (const [i, s] of range.ids.entries()) {
        const result = W0.publish({ items: states.get(s)!, subjects: [], pending: [] }, [
          {
            subject: s,
            release: range.event.value.nextHash,
            basis: { tx: BigInt(range.event.at), validTime: range.event.value.validTime },
            workItems: work[r]![i]!,
          },
        ]);
        states.set(s, result.state.items);
        deliveries.push(...result.deliveries);
      }
    }
    const changes = subjects.flatMap((s) =>
      canonical(states.get(s)) === canonical(initial.get(s))
        ? []
        : db.change(ledger(s), ledgers.get(ledger(s)), pack(states.get(s))),
    );
    this.metrics.evaluationMs += performance.now() - start;
    const last = ranges.at(-1)!.event,
      through = cursor.start + ids.length,
      done = through === size;
    const next: Cursor = {
      ...cursor,
      event: done ? last.value.sequence + 1 : cursor.event,
      start: done ? 0 : through,
      parent: done ? hash(last.value) : cursor.parent,
    };
    if (deliveries.length) {
      const packet: Packet = {
        account: db.prefix,
        epoch: t.epoch,
        batch: cursor.batch + 1,
        previous: cursor.previous,
        event: e.value.sequence,
        position: e.at,
        recipe:
          ranges.length === 1
            ? hash(e.value)
            : hash(ranges.map((r) => [r.event.at, hash(r.event.value)])),
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
    this.metrics.evaluations += visits;
    this.metrics.sourceWrites++;
    this.metrics.progressMs += performance.now() - commit;
    return true;
  }
  async receive(p: Packet, digest: string, grant?: () => Promise<void>) {
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
      if (through !== undefined && (cursor?.value.event ?? 1) > through) return false;
      return this.derive(tail, cursor, at, grant, through);
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
