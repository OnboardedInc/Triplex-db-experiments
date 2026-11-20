import assert from "node:assert/strict";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { width } from "../../notify1/census.ts";
import type { Event } from "../../notify1/journal.ts";
import type { Packet } from "../../notify1/dispatcher.ts";
import { receiveOrdered } from "../../notify1/receiver.ts";
import { Documents, hash, pack, unpack, type Op } from "../../notify1/store.ts";
import { Conflict } from "../store.ts";
import type { Archive } from "./archive.ts";

const step = 4;
assert(width % step === 0);
const stateKey = "notice-progress";
const packetKey = (n: number) => "recorded-notices:" + n;
type Cursor = {
  epoch: string;
  event: number;
  start: number;
  parent: string;
  batch: number;
  previous: string;
  entries: number;
};

// [DX-ACT1] Why: retain ordered notice debt for every accepted receipt, even if output settlement becomes obsolete. Rejected: coupling creation of individual notices to a recipient's availability.
export class RecordedNotices {
  private activation?: { id: string; subjects: string[] };
  readonly archive: Archive;
  constructor(archive: Archive) {
    this.archive = archive;
  }

  private async page(e: Event, start: number) {
    const a = this.archive.source;
    if (e.value.kind === "activation") {
      if (this.activation?.id !== e.id)
        this.activation = { id: e.id, subjects: await a.noticeSelection(e) };
      const ids = this.activation.subjects;
      return { ids: ids.slice(start, start + step), size: ids.length };
    }
    this.activation = undefined;
    const begin = Math.floor(start / width) * width;
    const page = await a.notices.members(e, begin);
    const size =
      e.value.selection.kind === "subjects" ? e.value.selection.ids.length : e.value.census.count;
    return { ids: page.slice(start - begin, start - begin + step), size };
  }
  private async turn(through: number) {
    const b = this.archive,
      a = b.source,
      db = b.db;
    const sourceAt = await a.s.head(),
      at = await b.store.head(),
      tail = await a.notices.event(through, sourceAt);
    const prior = await db.row<Cursor>(stateKey, at),
      t = tail.value;
    const controls = await a.s.controls(sourceAt);
    assert(
      controls.generation === t.epoch && controls.masks.length === 0,
      "Protected source notice needs a retention rule",
    );
    const current = prior?.value ?? {
      epoch: t.epoch,
      event: 1,
      start: 0,
      batch: 0,
      entries: 0,
      parent: hash([a.db.prefix, t.epoch, t.census]),
      previous: hash([a.db.prefix, t.epoch, "receiver-genesis"]),
    };
    assert(current.epoch === t.epoch);
    if (current.event > through) return { current, at };
    const e = await a.notices.event(current.event, sourceAt);
    assert(e.value.parent === current.parent && e.value.epoch === current.epoch);
    const { ids, size } = await this.page(e, current.start);
    assert(current.start <= size && ids.length === Math.min(step, size - current.start));
    const key = (subject: string) => "recorded-ledger:" + subject;
    const [previous, items] = await Promise.all([
      db.rows<string>(ids.map(key), at),
      a.notices.work(e, ids, sourceAt),
    ]);
    const ops: Op[] = [],
      deliveries: W0.Delivery[] = [];
    for (const [i, subject] of ids.entries()) {
      const old = previous.get(key(subject)),
        before = old ? unpack<W0.ItemState[]>(old.value) : [];
      const result = W0.publish({ items: before, subjects: [], pending: [] }, [
        {
          subject,
          release: e.value.nextHash,
          basis: { tx: BigInt(e.at), validTime: e.value.validTime },
          workItems: items[i]!,
        },
      ]);
      if (canonical(result.state.items) !== canonical(before))
        ops.push(...db.change(key(subject), old, pack(result.state.items)));
      deliveries.push(...result.deliveries);
    }
    const end = current.start + ids.length,
      done = end === size;
    const packet: Packet | undefined = deliveries.length
      ? {
          account: a.db.prefix,
          epoch: current.epoch,
          batch: current.batch + 1,
          previous: current.previous,
          event: current.event,
          position: e.at,
          recipe: hash(e.value),
          start: current.start,
          through: end,
          deliveries,
        }
      : undefined;
    const next: Cursor = {
      epoch: current.epoch,
      batch: packet?.batch ?? current.batch,
      previous: packet ? hash(packet) : current.previous,
      event: current.event + Number(done),
      start: done ? 0 : end,
      parent: done ? hash(e.value) : current.parent,
      entries: current.entries + deliveries.length,
    };
    ops.push(...db.change(stateKey, prior, next));
    if (packet) ops.push(db.put(packetKey(packet.batch), pack(packet)));
    const ack = await b.write(
      "notice",
      "settled-notice:" + hash([a.s.scope, current, next]),
      ops,
      at,
      next,
    );
    return next.event > through ? { current: next, at: ack.position } : undefined;
  }
  async record(through: number, afterFrame?: () => Promise<void>) {
    try {
      for (;;) {
        try {
          const r = await this.turn(through);
          if (r) return r;
          await afterFrame?.();
        } catch (e) {
          if (!(e instanceof Conflict)) throw e;
        }
      }
    } finally {
      this.activation = undefined;
    }
  }
  async packets(at: number) {
    const b = this.archive,
      a = b.source,
      db = b.db;
    const state = (await db.get<Cursor>(stateKey, at)).value;
    const packets: Packet[] = [];
    let previous = hash([a.db.prefix, state.epoch, "receiver-genesis"]),
      entries = 0;
    const head = await a.s.head();
    let bound: Event | undefined;
    for (let offset = 1; offset <= state.batch; offset += 32) {
      const keys = Array.from({ length: Math.min(32, state.batch - offset + 1) }, (_, i) =>
        packetKey(offset + i),
      );
      const rows = await db.rows<string>(keys, at);
      for (const [i, key] of keys.entries()) {
        const p = unpack<Packet>(rows.get(key)!.value);
        assert(
          p.batch === offset + i &&
            p.previous === previous &&
            p.account === a.db.prefix &&
            p.epoch === state.epoch,
        );
        if (bound?.value.sequence !== p.event) bound = await a.notices.event(p.event, head);
        assert(p.position === bound.at && p.recipe === hash(bound.value) && p.through > p.start);
        entries += p.deliveries.length;
        packets.push(p);
        previous = hash(p);
      }
    }
    assert(state.entries === entries && state.previous === previous);
    return packets;
  }
  async deliver(sink: Documents, at: number) {
    let effects = 0;
    for (const packet of await this.packets(at))
      if (await receiveOrdered(sink, this.archive.source.db.prefix, packet, hash(packet)))
        effects += packet.deliveries.length;
    return effects;
  }
}
