import {
  ErasureChanged,
  readErasure,
  recheckErasure,
  verifySameErasureAuthority,
} from "../../../../bench/lib/datomic-erasure.ts";
import assert from "node:assert/strict";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { width } from "../../notify1/census.ts";
import type { Event } from "../../notify1/journal.ts";
import type { Packet } from "../../notify1/dispatcher.ts";
import { receiveOrdered } from "../../notify1/receiver.ts";
import { Documents, hash, pack, unpack, type Op } from "../../notify1/store.ts";
import { Conflict } from "../store.ts";
import type { Archive } from "./archive.ts";
import { fillFrame, frameEstimate, type Candidate, type Piece } from "./frames.ts";
import type { JoinedAccount } from "./account.ts";
import { ledgerMode, noticeCandidate, readLedgers, type LedgerMode } from "./ledger-parts.ts";
import { ledgerFor, originAt } from "./account-settings.ts";

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
  erasureSeq?: number;
  // [DX-ACT4] Byte-sized frames only: `part` deliveries of subject `start` are already in packets (its ledger change
  // waits for its last part).
  frames?: "bytes";
  part?: number;
  // [DX-ACT6] Set when the event's ledgers are written in parts (TX2_NOTICE_LEDGER=parts); chosen at an event boundary,
  // so `part` counts the same units (deliveries, then ledger parts) after a restart.
  ledger?: "parts";
};
/** A byte-framed packet may start and end inside one subject's deliveries (`part`, `tail`). */
type FramePacket = Packet & { part?: number; tail?: number };

/** [DX-ACT6] Units are the subject's deliveries, then (ledger in parts) its ledger parts; `deliveries` says where the
 * deliveries end. `ledger` is the closing piece: the ledger change, or in parts mode the head change. */
export type NoticeCandidate = Candidate<W0.Delivery | Op> & { ledger: Op[]; deliveries: number };
/**
 * [DX-ACT4] The next byte-sized notice frame from the cursor `current` and the candidates read ahead from
 * `current.start`: the ops exactly as written and the next cursor. Pure, so the database-free check prices the frames.
 */
export function noticeFrame(
  db: Documents,
  prior: Awaited<ReturnType<Documents["row"]>> | undefined,
  current: Cursor,
  candidates: NoticeCandidate[],
  event: {
    account: string;
    position: number;
    recipe: string;
    next: string;
    size: number;
    erasureSeq?: number;
    ledger?: LedgerMode;
  },
) {
  const part = current.part ?? 0;
  if (part) assert(part <= candidates[0]!.units.length, "A split subject's deliveries moved");
  const build = (pieces: readonly Piece[]) => {
    const ops: Op[] = [],
      deliveries: W0.Delivery[] = [];
    for (const p of pieces) {
      const c = candidates[p.index]!;
      for (let j = p.from; j < p.to; j++)
        if (j < c.deliveries) deliveries.push(c.units[j] as W0.Delivery);
        else ops.push(c.units[j] as Op);
      if (p.close) ops.push(...c.ledger);
    }
    const last = pieces.at(-1);
    const end = last ? current.start + last.index + Number(last.close) : current.start,
      tail = last && !last.close ? last.to : 0;
    const done = end === event.size && !tail;
    const seq = event.erasureSeq === undefined ? {} : { erasureSeq: event.erasureSeq };
    const packet: FramePacket | undefined = deliveries.length
      ? {
          account: event.account,
          epoch: current.epoch,
          batch: current.batch + 1,
          previous: current.previous,
          event: current.event,
          position: event.position,
          recipe: event.recipe,
          start: current.start,
          through: end,
          ...(part ? { part } : {}),
          ...(tail ? { tail } : {}),
          deliveries,
          ...seq,
        }
      : undefined;
    const next: Cursor = {
      epoch: current.epoch,
      batch: packet?.batch ?? current.batch,
      previous: packet ? hash(packet) : current.previous,
      event: current.event + Number(done),
      start: done ? 0 : end,
      parent: done ? event.next : current.parent,
      entries: current.entries + deliveries.length,
      ...seq,
      frames: "bytes",
      part: tail,
      ...(event.ledger === "parts" ? { ledger: "parts" as const } : {}),
    };
    ops.push(...db.change(stateKey, prior, next));
    if (packet) ops.push(db.put(packetKey(packet.batch), pack(packet)));
    return { next, ops, packet };
  };
  const filled = candidates.length
    ? fillFrame(candidates, part, (p) => frameEstimate(build(p).ops).fits)
    : { pieces: [], advance: 0, tail: 0, split: false };
  return { ...build(filled.pieces), filled };
}
export type { Cursor };

// [DX-ACT1] Why: retain ordered notice debt for every accepted receipt, even if output settlement becomes obsolete. Rejected: coupling creation of individual notices to a recipient's availability.
export class RecordedNotices {
  private activation?: { id: string; subjects: string[] };
  private window?: { key: string; work: Map<string, Awaited<ReturnType<JoinedAccount["notices"]["work"]>>[number]> };
  readonly archive: Archive;
  /** [DX-ACT6] How new events write ledgers (an event already started keeps its own, named in the cursor). */
  ledger: LedgerMode;
  /** [DX-ACT8, second review] Whether this writer's mode was chosen explicitly (an argument or TX2_NOTICE_LEDGER): such
   * a writer refuses an account whose stored ledger mode differs; otherwise it writes with the stored mode. */
  private readonly explicit: boolean;
  constructor(archive: Archive, ledger?: LedgerMode) {
    this.archive = archive;
    this.explicit = ledger !== undefined || process.env.TX2_NOTICE_LEDGER !== undefined;
    ledger ??= ledgerMode();
    this.ledger = ledger;
    assert(ledger === "whole" || archive.frames === "bytes", "TX2_NOTICE_LEDGER=parts needs TX2_SETTLE_FRAMES=bytes");
  }

  private async page(e: Event, start: number, count = step) {
    const a = this.archive.source;
    if (e.value.kind === "activation") {
      if (this.activation?.id !== e.id)
        this.activation = { id: e.id, subjects: await a.noticeSelection(e) };
      const ids = this.activation.subjects;
      return { ids: ids.slice(start, start + count), size: ids.length };
    }
    this.activation = undefined;
    const begin = Math.floor(start / width) * width;
    const page = await a.notices.members(e, begin);
    const size =
      e.value.selection.kind === "subjects" ? e.value.selection.ids.length : e.value.census.count;
    return { ids: page.slice(start - begin, start - begin + count), size };
  }
  private async turn(through: number) {
    const b = this.archive,
      a = b.source,
      db = b.db;
    const authority = await readErasure(a.s.comp);
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
    const current: Cursor = prior?.value ?? {
      epoch: t.epoch,
      event: 1,
      start: 0,
      batch: 0,
      entries: 0,
      parent: hash([a.db.prefix, t.epoch, t.census]),
      previous: hash([a.db.prefix, t.epoch, "receiver-genesis"]),
    };
    assert(current.epoch === t.epoch);
    if (prior && current.erasureSeq !== authority?.seq)
      throw new ErasureChanged("Recorded notices belong to an earlier removal sequence");
    if (current.event > through) {
      assert(prior);
      return { current, at: prior.at };
    }
    const e = await a.notices.event(current.event, sourceAt);
    assert(e.value.parent === current.parent && e.value.epoch === current.epoch);
    // [DX-ACT4] The framing is chosen at an event boundary (an event started in one framing finishes in it).
    const atBoundary = current.start === 0 && !current.part;
    if (atBoundary ? b.frames === "bytes" : current.frames === "bytes")
      return this.byteFrame(through, e, current, prior, at, authority);
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
      const old = previous.get(key(subject));
      assert(old === undefined || typeof old.value === "string", "A ledger in parts needs byte frames");
      const before = old ? unpack<W0.ItemState[]>(old.value) : [];
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
          ...(authority ? { erasureSeq: authority.seq } : {}),
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
      ...(authority ? { erasureSeq: authority.seq } : {}),
    };
    ops.push(...db.change(stateKey, prior, next));
    if (packet) ops.push(db.put(packetKey(packet.batch), pack(packet)));
    const ack = await b.write(
      "notice",
      "settled-notice:" + hash([a.s.scope, current, next]),
      ops,
      at,
      next,
      authority,
      { key: stateKey, prior },
    );
    return next.event > through ? { current: next, at: ack.position } : undefined;
  }
  // [DX-ACT4] One byte-sized frame of notice entries (frames.ts has the rule). Units are a subject's deliveries; its
  // ledger change is the closing piece and is written with its last deliveries. A subject whose deliveries alone exceed
  // the bound is split by delivery; until its last part is written its ledger keeps the earlier state, so a restart
  // works out the same deliveries again and skips the `part` already recorded.
  private async byteFrame(
    through: number,
    e: Event,
    current: Cursor,
    prior: Awaited<ReturnType<Documents["row"]>> | undefined,
    at: number,
    authority: Awaited<ReturnType<typeof readErasure>>,
  ) {
    const b = this.archive,
      a = b.source,
      db = b.db;
    const sourceAt = await a.s.head();
    // The rest of the current page of 64 subjects; their work items (the read and evaluation) are kept for the page's
    // later frames, keyed by the event and the removal sequence. Ledgers are read fresh in every frame.
    const begin = Math.floor(current.start / width) * width;
    const { ids, size } = await this.page(e, current.start, begin + width - current.start);
    assert(current.start <= size && (ids.length >= 1 || current.start === size));
    const wkey = canonical([e.id, e.at, authority?.seq ?? null, begin]);
    if (this.window?.key !== wkey) this.window = { key: wkey, work: new Map() };
    const known = this.window.work,
      missing = ids.filter((id) => !known.has(id));
    // [DX-ACT6] Ledgers are read whole (a ledger in parts is joined and checked against its head); the mode is the
    // cursor's for an event already started, else this writer's.
    // [DX-ACT8, second review] A held account's stored ledger mode decides a new event's mode (`ledgerFor`).
    const fresh0 = current.start === 0 && !current.part;
    const own: LedgerMode = fresh0 ? ledgerFor((await originAt(a.s, sourceAt)).settings, this.ledger, this.explicit) : this.ledger;
    const mode: LedgerMode = (fresh0 ? own === "parts" : current.ledger === "parts")
      ? "parts"
      : "whole";
    const [previous, fresh] = await Promise.all([
      readLedgers(db, ids, at),
      missing.length ? a.notices.work(e, missing, sourceAt) : [],
    ]);
    for (const [i, id] of missing.entries()) known.set(id, fresh[i]!);
    const items = ids.map((id) => known.get(id)!);
    const candidates = ids.map((subject, i) => {
      const old = previous.get(subject)!;
      const result = W0.publish({ items: old.items, subjects: [], pending: [] }, [
        {
          subject,
          release: e.value.nextHash,
          basis: { tx: BigInt(e.at), validTime: e.value.validTime },
          workItems: items[i]!,
        },
      ]);
      return noticeCandidate(db, subject, current.event, old, result, mode);
    });
    const { next, ops } = noticeFrame(db, prior, current, candidates, {
      account: a.db.prefix,
      position: e.at,
      recipe: hash(e.value),
      next: hash(e.value),
      size,
      ...(authority ? { erasureSeq: authority.seq } : {}),
      ledger: mode,
    });
    const ack = await b.write(
      "notice",
      "settled-notice:" + hash([a.s.scope, current, next]),
      ops,
      at,
      next,
      authority,
      { key: stateKey, prior },
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
  private async *orderedPackets(at: number) {
    const b = this.archive,
      a = b.source,
      db = b.db;
    const state = (await db.get<Cursor>(stateKey, at)).value;
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
        const fp = p as FramePacket;
        assert(
          p.position === bound.at &&
            p.recipe === hash(bound.value) &&
            (p.through > p.start || (p.through === p.start && (fp.tail ?? 0) > (fp.part ?? 0))),
        );
        entries += p.deliveries.length;
        previous = hash(p);
        await recheckErasure(a.s.comp, p.erasureSeq);
        yield p;
      }
    }
    assert(state.entries === entries && state.previous === previous);
  }
  /** [DX-ACT6] The recorded packets in order, checked as `packets` checks them, without holding them all. */
  streamPackets(at: number) {
    return this.orderedPackets(at);
  }
  async packets(at: number) {
    const recorded: Packet[] = [];
    for await (const packet of this.orderedPackets(at)) recorded.push(packet);
    return recorded;
  }
  async deliver(sink: Documents, at: number) {
    let effects = 0;
    const source = this.archive.source;
    for await (const packet of this.orderedPackets(at)) {
      const frontier =
        packet.erasureSeq === undefined ? undefined : () => readErasure(source.s.comp);
      if (frontier) verifySameErasureAuthority(source.s.comp, sink.store);
      if (
        await receiveOrdered(
          sink,
          source.db.prefix,
          packet,
          hash(packet),
          undefined,
          undefined,
          frontier,
        )
      )
        effects += packet.deliveries.length;
    }
    return effects;
  }
}
