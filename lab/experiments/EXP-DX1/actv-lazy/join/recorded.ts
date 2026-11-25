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
import { Documents, hash, pack, parse, unpack, type Op } from "../../notify1/store.ts";
import { Conflict } from "../store.ts";
import type { Archive } from "./archive.ts";
import { fillFrame, frameEstimate, type Candidate, type Piece } from "./frames.ts";
import type { JoinedAccount } from "./account.ts";
import { ledgerMode, noticeCandidate, readLedgers, type Ledger, type LedgerMode } from "./ledger-parts.ts";
import {
  derivedSealOn,
  inputUnion,
  isRemoved,
  isSealed,
  namedInputs,
  open,
  outputInputs,
  placeOf,
  seal,
  type Removed,
} from "../../../../bench/lib/derived-seal.ts";
import {
  copyCheck,
  fingerprint,
  frontierFor,
  ticketAccount,
  ticketAccounts,
  touchedSubjects,
  type AccountFrontier,
} from "./account-tickets.ts";

const step = 4;
assert(width % step === 0);
const stateKey = "notice-progress";
const packetKey = (n: number) => "recorded-notices:" + n;
// [DX-ERA4] TX2_DERIVED_SEAL=1: a subject's notice generation (written only when it changes; absent means 0), and a
// delivery as recorded: its subject and generation in clear, the delivery itself sealed (a string), clear when computed
// from no protected value (its canonical JSON), or the removed marker when its input was removed before it was sealed.
const generationKey = (subject: string) => "recorded-generation:" + subject;
export type SealedDelivery = { subject: string; generation: number; sealed: string | Removed };
/** [DX-ERA4] Every subject's ledger opened: its readable items, what each names, and, when an item opens as removed,
 * the generation the subject takes (the removal's sequence). */
async function openLedgers(source: { backend?: { name: string; url: string }; scopeName?: string }, previous: Map<string, Ledger>, fallback: number) {
  const url = source.backend!.url;
  const flat: unknown[] = [],
    where: string[] = [];
  for (const [s, l] of previous) for (const it of l.items) (flat.push(it), where.push(s));
  const values = await open(url, flat, where.map((s) => placeOf(source, s)));
  const out = new Map<string, { items: W0.ItemState[]; named: Map<string, string[]>; forget?: number }>();
  for (const s of previous.keys()) out.set(s, { items: [], named: new Map() });
  values.forEach((v, j) => {
    const o = out.get(where[j]!)!;
    if (isRemoved(v)) {
      o.forget = Math.max(o.forget ?? 0, v.seq ?? fallback);
      return;
    }
    const item = typeof v === "string" ? parse<W0.ItemState>(v) : (v as W0.ItemState);
    o.items.push(item);
    o.named.set(item.id, namedInputs(flat[j]));
  });
  return out;
}
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
  constructor(archive: Archive, ledger: LedgerMode = ledgerMode()) {
    this.archive = archive;
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
    // [DX-ACT9] With TX2_ACCOUNT_TICKETS=1 the frontier is read after the cursor (still before any input), so the
    // cursor's stamp can be checked against the account's removals; otherwise here, as before.
    const account = ticketAccount(a.s);
    // [DX-ERA4] TX2_DERIVED_SEAL=1: the recorder goes on after any removal (a record computed from a removed value is
    // sealed under its key; section 3.4 of era4/DERIVED-COPIES.md); its frames carry the current frontier.
    const sealOn = derivedSealOn();
    assert(!sealOn || b.frames === "bytes", "TX2_DERIVED_SEAL needs TX2_SETTLE_FRAMES=bytes");
    let authority = !sealOn && account === undefined ? await readErasure(a.s.comp) : undefined;
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
    if (sealOn) authority = await frontierFor(a.s);
    else if (account !== undefined) authority = await this.cursorAuthority(prior ? current : undefined, at);
    else if (prior && current.erasureSeq !== authority?.seq)
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
  /**
   * [DX-ACT9] TX2_ACCOUNT_TICKETS=1: the frontier new frames are stamped with, after checking that the recorder may go
   * on from its cursor. It may while no removal published after the cursor's stamp touched the unscoped account, and
   * every entity of this account touched since then belongs to no subject or to a subject with no notice ledger
   * (ACCOUNT-TICKETS.md section 4: a recorded notice and a ledger hold only their own subject's derived values). The
   * frames' tickets name the account, so a removal of this account committed after this check refuses them at Datomic's
   * commit point.
   */
  private async cursorAuthority(cursor: Cursor | undefined, at: number) {
    const a = this.archive.source;
    const stamp = cursor?.erasureSeq;
    const f = await frontierFor(a.s, stamp);
    if (!cursor) return f;
    const refuse = () => {
      throw new ErasureChanged("Recorded notices belong to an earlier removal sequence");
    };
    if (stamp === undefined || !f) return f?.seq === stamp ? f : refuse();
    if (f.perAccount !== true) return f.seq === stamp ? f : refuse();
    const touched = touchedSubjects(f, a.s.held!.prefix, stamp);
    if (touched === "all")
      return stamp <= f.seq && f.accountSeq! <= stamp && f.unscopedSeq! <= stamp ? f : refuse();
    if (touched.size) {
      const ids = [...touched].map((n) => W0.placementId(n));
      const ledgers = await readLedgers(this.archive.db, ids, at);
      if (ids.some((id) => ledgers.get(id)?.head !== undefined)) refuse();
    }
    return f;
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
    // [DX-ACT9] Under TX2_ACCOUNT_TICKETS=1 keyed by the account's removal state (removals elsewhere move only the
    // global sequence); otherwise by the global sequence, as before.
    const wkey = canonical([e.id, e.at, (ticketAccount(a.s) === undefined ? authority?.seq : fingerprint(authority as AccountFrontier | undefined)) ?? null, begin]);
    if (this.window?.key !== wkey) this.window = { key: wkey, work: new Map() };
    const known = this.window.work,
      missing = ids.filter((id) => !known.has(id));
    // [DX-ACT6] Ledgers are read whole (a ledger in parts is joined and checked against its head); the mode is the
    // cursor's for an event already started, else this writer's.
    const mode: LedgerMode = (current.start === 0 && !current.part ? this.ledger === "parts" : current.ledger === "parts")
      ? "parts"
      : "whole";
    const [previous, fresh] = await Promise.all([
      readLedgers(db, ids, at),
      missing.length ? a.notices.work(e, missing, sourceAt) : [],
    ]);
    for (const [i, id] of missing.entries()) known.set(id, fresh[i]!);
    const items = ids.map((id) => known.get(id)!);
    const record = (subject: string, i: number, state: readonly W0.ItemState[]) =>
      W0.publish({ items: state, subjects: [], pending: [] }, [
        {
          subject,
          release: e.value.nextHash,
          basis: { tx: BigInt(e.at), validTime: e.value.validTime },
          workItems: items[i]!,
        },
      ]);
    const candidates = derivedSealOn()
      ? await this.sealedCandidates(ids, items, previous, at, current.event, mode, authority, record)
      : ids.map((subject, i) => {
          const old = previous.get(subject)!;
          return noticeCandidate(db, subject, current.event, old, record(subject, i, old.items), mode);
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
  /**
   * [DX-ERA4] TX2_DERIVED_SEAL=1: the frame's candidates with every delivery and ledger item sealed under the protected
   * assertions it was computed from: its subject's world, and what the item it continues named (DERIVED-COPIES.md 3.2).
   * A subject whose ledger holds a record that opens as removed is forgotten: its ledger is taken as empty and it takes a
   * new generation, the sequence of the removal (3.4). Deliveries carry `{subject, generation, sealed}`.
   */
  private async sealedCandidates(
    ids: string[],
    items: Awaited<ReturnType<JoinedAccount["notices"]["work"]>>,
    previous: Map<string, Ledger>,
    at: number,
    event: number,
    mode: LedgerMode,
    authority: Awaited<ReturnType<typeof readErasure>>,
    record: (subject: string, i: number, state: readonly W0.ItemState[]) => ReturnType<typeof W0.publish>,
  ) {
    const db = this.archive.db,
      source = this.archive.source.s.comp;
    const generations = await db.rows<number>(ids.map(generationKey), at);
    const opened = await openLedgers(source, previous, authority?.seq ?? 0);
    const plans = ids.map((subject, i) => {
      const o = opened.get(subject)!;
      const before = generations.get(generationKey(subject));
      const generation = o.forget === undefined ? (before?.value ?? 0) : o.forget;
      assert(generation >= (before?.value ?? 0), "A subject's notice generation went back");
      const result = record(subject, i, o.forget === undefined ? o.items : []);
      const inputs = outputInputs(items[i]!);
      const named = (id: string) => inputUnion(inputs, o.forget === undefined ? (o.named.get(id) ?? []) : []);
      return { subject, generation, before, result, named, forget: o.forget !== undefined };
    });
    const queue: { inputs: readonly string[]; value: string; place: string }[] = [];
    for (const p of plans) {
      const place = placeOf(source, p.subject);
      for (const d of p.result.deliveries) queue.push({ inputs: p.named(d.id), value: canonical(d), place });
      for (const it of p.result.state.items) queue.push({ inputs: p.named(it.id), value: canonical(it), place });
    }
    const sealed = await seal(source, queue);
    let k = 0;
    return plans.map((p) => {
      const deliveries = p.result.deliveries.map(
        () => ({ subject: p.subject, generation: p.generation, sealed: sealed[k++] }) as unknown as W0.Delivery,
      );
      const state = p.result.state.items.map(() => {
        const v = sealed[k++]!;
        return (typeof v === "string" && !isSealed(v) ? parse<W0.ItemState>(v) : v) as unknown as W0.ItemState;
      });
      const old = previous.get(p.subject)!;
      const c = noticeCandidate(db, p.subject, event, old, { deliveries, state: { items: state } }, mode);
      if (p.generation !== (p.before?.value ?? 0)) {
        // The new generation is written with the subject's ledger (its closing piece), or alone.
        c.ledger.push(...db.change(generationKey(p.subject), p.before, p.generation));
        c.closing = true;
      }
      return c;
    });
  }
  /** [DX-ERA4] The recorded packets with every sealed delivery opened (a removed one reads `{subject, removed}`). */
  async openedPackets(at: number) {
    const comp = this.archive.source.s.comp,
      url = comp.backend!.url;
    const out: Packet[] = [];
    for await (const p of this.orderedPackets(at)) {
      const values = await open(url, p.deliveries.map((d) => (d as unknown as SealedDelivery).sealed ?? d),
        p.deliveries.map((d) => placeOf(comp, (d as unknown as SealedDelivery).subject)));
      out.push({
        ...p,
        deliveries: p.deliveries.map((d, i) => {
          const v = values[i];
          const sd = d as unknown as SealedDelivery;
          if (sd.sealed === undefined) return d;
          if (isRemoved(v)) return { subject: sd.subject, generation: sd.generation, ...v } as unknown as W0.Delivery;
          return { ...parse<W0.Delivery>(typeof v === "string" ? v : canonical(v)), generation: sd.generation } as W0.Delivery;
        }),
      });
    }
    return out;
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
    // [DX-ACT9] TX2_ACCOUNT_TICKETS=1: a packet is served while no removal published after its stamp touched the unscoped
    // account or one of the subjects it holds (one frontier read per stamp); otherwise its stamp must be current.
    const check = copyCheck(a.s);
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
        if (check) await check(p.erasureSeq, p.deliveries.map((d) => d.subject));
        else await recheckErasure(a.s.comp, p.erasureSeq);
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
    // [DX-ACT9] TX2_ACCOUNT_TICKETS=1: each packet checked as when read (its subjects), and the recipient's commit
    // carries a cross-database ticket naming the source account, checked by the gateway under that account's locks.
    const accounts = ticketAccounts(source.s), check = copyCheck(source.s);
    for await (const packet of this.orderedPackets(at)) {
      const subjects = packet.deliveries.map((d) => d.subject);
      const frontier =
        packet.erasureSeq === undefined
          ? undefined
          : check
            ? () => check(packet.erasureSeq, subjects, true)
            : () => readErasure(source.s.comp);
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
          accounts,
          derivedSealOn() ? source.s.comp : undefined,
        )
      )
        effects += packet.deliveries.length;
    }
    return effects;
  }
}
