import {
  readErasure,
  recheckErasure,
  verifySameErasureAuthority,
} from "../../../../bench/lib/datomic-erasure.ts";
import assert from "node:assert/strict";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { memberPage, width } from "../../notify1/census.ts";
import { Documents, hash, pack, unpack, type Op, type Row } from "../../notify1/store.ts";
import type { Store } from "../store.ts";
import { Conflict, openStore, type EntityGuard } from "../store.ts";
import { worldsAt, winner } from "../decision.ts";
import { LazyReader } from "../read.ts";
import { JoinedAccount, type Marker } from "./account.ts";
import { address } from "./index.ts";
import { evaluateRows } from "./material.ts";
import { BulkQueue, bulkClaim, type BulkClass } from "./bulk.ts";
import {
  fillFrame,
  frameEstimate,
  frameMode,
  preconditionMode,
  windowOf,
  type Candidate,
  type FrameMode,
  type Piece,
  type Precondition,
} from "./frames.ts";

const step = 16;
assert(width % step === 0);
const progressKey = (sequence: number) => "values:" + sequence;
const pageKey = (sequence: number, from: number) => "answer:" + sequence + ":" + from;
type Answer = { subject: string; changes: [string, string | null][]; json: string };
type Page = { identity: string; start: number; through: number; previous: string; bytes: string };
export type Progress = {
  identity: string;
  through: number;
  status: "pending" | "stored" | "superseded";
  hash: string;
  changes: number;
} & Partial<ByteFrames>;
// [DX-ACT4] Byte-sized frames (TX2_SETTLE_FRAMES=bytes): the release's progress names its framing, so a restart resumes a
// release in the framing it started with; pages are numbered by frame, and a frame ends at subject `through`, unit
// `part` (part > 0 only after a split subject).
type ByteFrames = { frames: "bytes"; frame: number; part: number };
type FramePage = {
  identity: string;
  frame: number;
  start: number;
  part: number;
  through: number;
  tail: number;
  previous: string;
  bytes: string;
};
/** A changed subject's values without its full answer; `part` is the offset of the first change when split. */
export type Changes = { subject: string; changes: [string, string | null][]; part?: number };
const framePageKey = (sequence: number, frame: number) => "answer:" + sequence + ":f" + frame;
export const identityOf = (scope: string, marker: Marker, position: number) =>
  hash([
    scope,
    marker.joined,
    marker.seq,
    marker.release,
    marker.cut,
    marker.at,
    position,
    marker.census,
    marker.notice,
    marker.compiler,
  ]);

/**
 * [DX-ACT4] The next byte-sized values frame from the release's progress `current` and the candidates read ahead (in
 * census order from `current.through`): the ops exactly as written and the next progress. Pure, so the database-free
 * check (frames-check.ts) prices the frames the writer will write.
 */
export function valuesFrame(
  db: Documents,
  key: string,
  prior: Row<Progress> | undefined,
  current: Progress,
  pageKey: string,
  candidates: Candidate<[string, string | null]>[],
  count: number,
) {
  const start = current.through,
    part = current.part!,
    frame = current.frame! + 1,
    identity = current.identity;
  if (part) assert(part < candidates[0]!.units.length, "A split subject's changes moved");
  const build = (pieces: readonly Piece[]) => {
    const last = pieces.at(-1)!,
      whole = last.to === candidates[last.index]!.units.length;
    const through = start + last.index + Number(whole),
      tail = whole ? 0 : last.to;
    const entries: Changes[] = pieces
      .filter((p) => p.to > p.from)
      .map((p) => ({
        subject: candidates[p.index]!.subject,
        changes: candidates[p.index]!.units.slice(p.from, p.to),
        ...(p.from ? { part: p.from } : {}),
      }));
    const page: FramePage = { identity, frame, start, part, through, tail, previous: current.hash, bytes: pack(entries) };
    const next: Progress = {
      identity,
      through,
      status: through === count && !tail ? "stored" : "pending",
      hash: hash(page),
      changes: current.changes + entries.reduce((n, row) => n + row.changes.length, 0),
      frames: "bytes",
      frame,
      part: tail,
    };
    return { next, ops: [...db.change(key, prior, next), db.put(pageKey, page)], entries };
  };
  const filled = fillFrame(candidates, part, (pieces) => frameEstimate(build(pieces).ops).fits);
  return { ...build(filled.pieces), filled };
}
export const valuesProgress = (identity: string): Progress => ({
  identity,
  through: 0,
  status: "pending",
  hash: identity,
  changes: 0,
  frames: "bytes",
  frame: 0,
  part: 0,
});
export { framePageKey, progressKey };

export class Archive {
  readonly db: Documents;
  readonly source: JoinedAccount;
  readonly store: Store;
  readonly queue: BulkQueue;
  /** The framing new work starts with (a release already started keeps its own). */
  readonly frames: FrameMode;
  /** The frames this process admitted: count and largest rows, wire estimate and estimated service, and the sum of
   * estimated service (bounded evidence, not one entry per frame). */
  readonly admitted = { frames: 0, rowsMax: 0, wireMax: 0, usMax: 0, usSum: 0 };
  /** [DX-ACT5] What each frame's commit needs to hold (TX2_SETTLE_PRECONDITION). */
  readonly precondition: Precondition;
  /** [DX-ACT5] Frames sent to the writer, refused at commit (the precondition failed), and committed; with the turns'
   * client-side intervals (bounded) for the live-side reading. */
  readonly contest = new Contest();
  /** [DX-ACT5] The account's pause and pace, read before each frame (TX2_SETTLE_CONTROL=1; unset, none). */
  control?: { gate: () => Promise<void> };
  /** [DX-ACT5] Diagnostic: no frame is sent after this `performance.now()` time (SettlementStopped). */
  stopAt?: number;
  private constructor(
    source: JoinedAccount,
    store: Store,
    queue: BulkQueue,
    channel: string,
    frames: FrameMode,
    precondition: Precondition,
  ) {
    this.source = source;
    this.store = store;
    this.queue = queue;
    this.frames = frames;
    this.precondition = precondition;
    this.db = new Documents(store.comp, source.s.held ? "settlement-" + channel + source.s.names.documents : "settlement");
  }
  static async open(
    source: JoinedAccount,
    queue: BulkQueue,
    channel: "values" | "notices" = "values",
    frames: FrameMode = frameMode(),
    precondition: Precondition = preconditionMode(),
  ) {
    const s = source.s;
    // [DX-ACT1] Why: the held scorecard includes archive writes and indexes in the same physical database.
    // Rejected: benchmarking background work in two empty databases.
    const store = s.held
      ? await openStore(s.scope, s.profile, "write", s.held)
      : await openStore("lazy-settlement-" + hash([s.scope, channel]).slice(0, 40));
    return new Archive(source, store, queue, channel, frames, precondition);
  }
  close() {
    return this.store.close();
  }
  async write(
    kind: BulkClass,
    id: string,
    ops: Op[],
    at: number,
    context: unknown,
    authority: Awaited<ReturnType<typeof readErasure>>,
    progress?: { key: string; prior: Row<unknown> | undefined },
  ) {
    // [DX-ACT1] Why: constrain native preparation and durable turns independently of page count. Rejected: a multi-megabyte atomic frame or assuming a timeout can preempt a durable native transaction.
    const estimate = frameEstimate(ops);
    assert(estimate.fits, "Bulk batch exceeds W1 service estimate");
    const n = this.admitted;
    if (n) {
      n.frames++;
      n.rowsMax = Math.max(n.rowsMax, estimate.rows);
      n.wireMax = Math.max(n.wireMax, estimate.wire);
      n.usMax = Math.max(n.usMax, estimate.us);
      n.usSum += estimate.us;
    }
    if (authority) verifySameErasureAuthority(this.source.s.comp, this.store.comp);
    // [DX-ERASE1] Why: admission can wait after a page was derived, so the same ticket belongs on the destination commit.
    // Rejected: a source read immediately before enqueueing (removal can publish while the batch waits).
    // [DX-ACT5] With TX2_SETTLE_PRECONDITION=progress the frame is refused only if its writer's progress row moved.
    const guards: EntityGuard[] | undefined =
      this.precondition === "progress" && progress
        ? [{ entityId: this.db.prefix + progress.key, tripleIds: progress.prior ? [progress.prior.id] : [] }]
        : undefined;
    assert(this.precondition === "head" || guards, "A settlement frame names its progress row");
    await this.control?.gate();
    if (this.stopAt !== undefined && performance.now() > this.stopAt) throw new SettlementStopped();
    const c = this.contest;
    c.offered++;
    try {
      const r = await this.queue.submit(this.turnKey(), async () => {
        const begun = performance.now();
        try {
          return await bulkClaim(
            this.store.scope,
            id,
            kind,
            () => this.store.commit(id, "lazy/settlement", ops, at, context, undefined, undefined, guards),
            authority,
          );
        } finally {
          c.turn(begun, performance.now());
        }
      });
      c.done(true);
      return r;
    } catch (e) {
      if (e instanceof Conflict) c.done(false);
      throw e;
    }
  }
  /** [DX-ACT5] The key the bulk queue rotates on: the account (held accounts share one database scope). */
  turnKey() {
    const s = this.source.s;
    return s.held ? s.scope + "/" + s.held.account : s.scope;
  }

  async values(sequence: number) {
    const r = await this.source.receipt(sequence);
    assert.equal(r.marker.storage, "owed");
    return this.db.row<Progress>(progressKey(sequence), await this.store.head());
  }
  async turn(sequence: number) {
    const a = this.source,
      s = a.s;
    const at = await this.store.head(),
      sourceAt = await s.head();
    const r = await a.receipt(sequence, sourceAt),
      { marker: m, event: e, census } = r;
    assert.equal(m.storage, "owed");
    const authority = await recheckErasure(s.comp, m.erasureSeq);
    const identity = identityOf(s.scope, m, e.at),
      key = progressKey(sequence),
      prior = await this.db.row<Progress>(key, at);
    const current: Progress = prior?.value ??
      (this.frames === "bytes"
        ? valuesProgress(identity)
        : {
            identity,
            through: 0,
            status: "pending",
            hash: identity,
            changes: 0,
          });
    assert(current.identity === identity && current.through <= census.count);
    if (current.status !== "pending") return current;
    const latest = await s.controls(sourceAt);
    assert(
      latest.generation === m.joined && latest.masks.length === 0,
      "Settlement requires the unprotected joined epoch",
    );
    const displaced = latest.releases.some((x) => x.tx > e.at && x.from <= m.from);
    // [DX-ACT1] Why: output pages are immutable under their own receipt. A later release can obsolete the unfinished copy without retiring its ordered notices. Rejected: overwriting a subject's current answers from an earlier cut.
    const finish = async (next: Progress, page?: Page) => {
      const ops = [...this.db.change(key, prior, next)];
      if (page) ops.push(this.db.put(pageKey(sequence, page.start), page));
      await this.write(
        "activation",
        "settled-values:" + hash([identity, current.through, next]),
        ops,
        at,
        next,
        authority,
        { key, prior },
      );
      return next;
    };
    if (displaced) return finish({ ...current, status: "superseded" });
    if (current.through === census.count) return finish({ ...current, status: "stored" });
    if (current.frames === "bytes") return this.byteFrame(sequence, r, current, prior, at, authority);
    assert(current.through % step === 0);
    const start = current.through,
      page = Math.floor(start / width) * width;
    const ids = (await memberPage(a.db, census, page, m.cut)).slice(
      start - page,
      start - page + step,
    );
    assert(ids.length === Math.min(step, census.count - start));
    const basis = { tx: e.at, validTime: m.at };
    const worlds = await worldsAt(s, s.profile, ids, { tx: m.cut, validTime: m.at });
    assert.deepEqual(
      worlds.map((w) => w.subject),
      ids,
    );
    const values = evaluateRows(
      { worlds, basis },
      m.old ? W0.compileRelease(m.old) : undefined,
      W0.compileRelease(m.document),
      true,
    );
    const changed = values.rows
      .filter((row) => row.rows.length)
      .map(
        (row): Answer => ({
          subject: row.subject,
          changes: row.rows.map(([k, , value]) => [k, value]),
          json: row.json!,
        }),
      );
    const through = start + ids.length;
    const next: Page = { identity, start, through, previous: current.hash, bytes: pack(changed) };
    return finish(
      {
        identity,
        through,
        status: through === census.count ? "stored" : "pending",
        hash: hash(next),
        changes: current.changes + changed.reduce((n, row) => n + row.changes.length, 0),
      },
      next,
    );
  }
  // [DX-ACT4] One byte-sized frame of changed values (frames.ts has the rule). Its candidates are the rest of the
  // current census page, evaluated at the record's cut once per page (kept in `window` for the page's later frames);
  // it writes the subjects that fit, each as its changes only. A subject whose changes alone exceed the bound is split
  // by change: its first changes here, the rest in the next frames.
  private window?: { key: string; changes: Map<string, [string, string | null][]> };
  private async byteFrame(
    sequence: number,
    r: Awaited<ReturnType<JoinedAccount["receipt"]>>,
    current: Progress,
    prior: Row<Progress> | undefined,
    at: number,
    authority: Awaited<ReturnType<typeof readErasure>>,
  ) {
    const a = this.source,
      s = a.s;
    const { marker: m, event: e, census } = r;
    const identity = current.identity,
      start = current.through,
      { begin, end } = windowOf(start, census.count, width);
    const ids = (await memberPage(a.db, census, begin, m.cut)).slice(start - begin, end - begin);
    assert(ids.length === end - start && ids.length >= 1);
    const key = canonical([identity, authority?.seq ?? null, begin]);
    if (this.window?.key !== key) this.window = { key, changes: new Map() };
    const known = this.window.changes,
      missing = ids.filter((id) => !known.has(id));
    if (missing.length) {
      const basis = { tx: e.at, validTime: m.at };
      const worlds = await worldsAt(s, s.profile, missing, { tx: m.cut, validTime: m.at });
      assert.deepEqual(
        worlds.map((w) => w.subject),
        missing,
      );
      const values = evaluateRows(
        { worlds, basis },
        m.old ? W0.compileRelease(m.old) : undefined,
        W0.compileRelease(m.document),
        false,
      );
      for (const id of missing) known.set(id, []);
      for (const row of values.rows) known.set(row.subject, row.rows.map(([k, , value]) => [k, value]));
    }
    const candidates = ids.map((subject) => ({ subject, units: known.get(subject)!, closing: false }));
    const { next, ops } = valuesFrame(this.db, progressKey(sequence), prior, current,
      framePageKey(sequence, current.frame! + 1), candidates, census.count);
    await this.write(
      "activation",
      "settled-values:" + hash([identity, current.through, current.part, next]),
      ops,
      at,
      next,
      authority,
      { key: progressKey(sequence), prior },
    );
    return next;
  }
  async runValues(sequence: number, onFrame?: () => Promise<void>) {
    for (;;) {
      try {
        const p = await this.turn(sequence);
        if (p.status !== "pending") return p;
        await onFrame?.();
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
    }
  }
  async stored(sequence: number) {
    const { marker, event, census } = await this.source.receipt(sequence);
    const identity = identityOf(this.source.s.scope, marker, event.at),
      at = await this.store.head();
    const frontier = (await this.db.get<Progress>(progressKey(sequence), at)).value;
    assert(frontier.identity === identity && frontier.through <= census.count);
    assert(frontier.status !== "stored" || frontier.through === census.count);
    if (frontier.frames === "bytes") {
      const output = await this.storedFrames(sequence, frontier, identity, at);
      await recheckErasure(this.source.s.comp, marker.erasureSeq);
      return { frontier, output, frames: "bytes" as FrameMode };
    }
    let previous = identity;
    const output: Answer[] = [];
    for (let j = 0; j < frontier.through; j += step * 32) {
      const ids = Array.from(
        { length: Math.min(32, Math.ceil((frontier.through - j) / step)) },
        (_, i) => j + i * step,
      );
      const rows = await this.db.rows<Page>(
        ids.map((i) => pageKey(sequence, i)),
        at,
      );
      for (const i of ids) {
        const p = rows.get(pageKey(sequence, i))?.value;
        assert(
          p?.identity === identity &&
            p.start === i &&
            p.through === Math.min(i + step, census.count) &&
            p.previous === previous,
        );
        output.push(...unpack<Answer[]>(p.bytes));
        previous = hash(p);
      }
    }
    assert(
      previous === frontier.hash &&
        frontier.changes === output.reduce((n, row) => n + row.changes.length, 0),
    );
    await recheckErasure(this.source.s.comp, marker.erasureSeq);
    return { frontier, output: output as (Answer | Changes)[], frames: "count" as FrameMode };
  }
  // [DX-ACT4] Reads every frame page of a byte-framed release in order and joins split subjects: each page must start
  // where the previous one ended, chain to its hash, and a piece with `part` must continue the same subject at exactly
  // the number of changes already joined. Returns each changed subject once, with its changes only.
  private async storedFrames(sequence: number, frontier: Progress, identity: string, at: number) {
    let previous = identity,
      through = 0,
      tail = 0;
    const output: Changes[] = [];
    for (let first = 1; first <= frontier.frame!; first += 32) {
      const keys = Array.from({ length: Math.min(32, frontier.frame! - first + 1) }, (_, i) =>
        framePageKey(sequence, first + i),
      );
      const rows = await this.db.rows<FramePage>(keys, at);
      for (const [i, k] of keys.entries()) {
        const p = rows.get(k)?.value;
        assert(
          p?.identity === identity &&
            p.frame === first + i &&
            p.start === through &&
            p.part === tail &&
            p.previous === previous &&
            (p.through > p.start || p.tail > p.part),
          "Frame page out of order",
        );
        for (const piece of unpack<Changes[]>(p.bytes)) {
          assert(piece.changes.length > 0);
          const last = output.at(-1);
          if (piece.part) {
            assert(last?.subject === piece.subject && last.changes.length === piece.part, "Split subject out of order");
            last.changes.push(...piece.changes);
          } else {
            assert(last?.subject !== piece.subject, "Duplicate settled subject");
            output.push({ subject: piece.subject, changes: [...piece.changes] });
          }
        }
        previous = hash(p);
        through = p.through;
        tail = p.tail;
      }
    }
    assert(
      previous === frontier.hash &&
        through === frontier.through &&
        tail === frontier.part &&
        frontier.changes === output.reduce((n, row) => n + row.changes.length, 0),
    );
    return output;
  }
  reader() {
    const source = this.source,
      s = source.s;
    // [DX-ACT4] Byte-framed pages hold changes only, so a read at the release's own basis is worked out from the record,
    // as every read before settlement is (the gates check it equals the answer the archive used to return).
    if (this.frames === "bytes") return new LazyReader(s, s.profile, 2 << 20, undefined, "shared-cut");
    return new LazyReader(
      s,
      s.profile,
      2 << 20,
      undefined,
      "shared-cut",
      async (subject, b, c, latest) => {
        const r = c.releases.find((entry) => entry.id === winner(c, b));
        if (r?.storage !== "owed" || r.tx !== b.tx || b.validTime !== r.at || latest.masks.length)
          return;
        const { marker, event, census } = await source.receipt(r.seq, b.tx);
        const identity = identityOf(s.scope, marker, event.at);
        const ordinal = /^pl:s[0-9]{8}$/.test(subject) ? Number(subject.slice(4)) : -1;
        const leaf = s.held
          ? ordinal >= 0 && ordinal < census.count ? Math.floor(ordinal / width) : undefined
          : (await source.db.row<number>(address(subject), marker.cut))?.value;
        if (leaf === undefined) return;
        const at = await this.store.head(),
          keys = Array.from({ length: width / step }, (_, i) =>
            pageKey(r.seq, leaf * width + i * step),
          );
        for (const page of (await this.db.rows<Page>(keys, at)).values()) {
          assert(
            page.value.identity === identity &&
              page.key === pageKey(r.seq, page.value.start) &&
              page.value.through <= census.count,
          );
          const row = unpack<Answer[]>(page.value.bytes).find((x) => x.subject === subject);
          if (!row) continue;
          const parsed = JSON.parse(row.json);
          assert(
            parsed.subject === subject &&
              parsed.release === r.release &&
              canonical(parsed.basis) === canonical(b),
          );
          await recheckErasure(s.comp, marker.erasureSeq);
          return row.json;
        }
      },
    );
  }
}

export class SettlementStopped extends Error {}
/** [DX-ACT5] Exact counts of one writer's frames, per-second commit and refusal counts from `origin`, and the turns'
 * client-side intervals (the first 20,000; toy evidence). */
export class Contest {
  offered = 0;
  refused = 0;
  committed = 0;
  origin = performance.now();
  readonly seconds = new Map<number, { committed: number; refused: number }>();
  readonly turns: [number, number][] = [];
  turn(begun: number, ended: number) {
    if (this.turns.length < 20_000) this.turns.push([begun, ended]);
  }
  done(ok: boolean) {
    if (ok) this.committed++;
    else this.refused++;
    const k = Math.floor((performance.now() - this.origin) / 1000),
      b = this.seconds.get(k) ?? { committed: 0, refused: 0 };
    if (ok) b.committed++;
    else b.refused++;
    this.seconds.set(k, b);
  }
  reset(origin = performance.now()) {
    this.offered = this.refused = this.committed = 0;
    this.origin = origin;
    this.seconds.clear();
    this.turns.length = 0;
  }
  summary() {
    return {
      offered: this.offered,
      refused: this.refused,
      committed: this.committed,
      perSecond: [...this.seconds].sort((a, b) => a[0] - b[0]).map(([s, v]) => ({ s, ...v })),
    };
  }
}
