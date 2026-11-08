/**
 * H1: an in-process current table behind the composition seam (EXP-P4; R24 sections 4.2, 4.3 and 6).
 *
 * What it holds: every row that is visible at some basis at or above the retention horizon H, that is the live
 * rows plus the rows retracted at positions after H, indexed by entity. Rows keep Triplex's own valid time
 * (`validFrom`, `validTo`), so valid time is filtered at read time and is not part of eligibility (R24 4.3).
 *
 * Eligibility (R24 4.3 rule (1), TARGETS 4.1 item 4, RULINGS Q68a): a read at recorded time R is served only when
 *   instant(H) <= R            nothing the read could see was purged (purged rows were retracted at or before H)
 *   R <= instant(W)            every position whose instant is at or before R has been applied
 * W is the highest contiguous applied position, read fresh on every read (never cached by a caller), so a
 * regression of W (a restore from an older snapshot) immediately narrows what is served.
 * The upper rule relies on instants strictly increasing with position: Triplex core takes the instant before it
 * allocates the position and the adapters serialize commits by a compare-and-set on the scope position, so a
 * later position always took its instant after the earlier commit finished. The table checks this on every
 * applied position; after the first non-increasing pair it switches to the strict rule R < instant(W), which is
 * safe for any non-decreasing order. The broker version (R24 4.2) stamps instants itself and enforces this.
 * Anything else (B below H, B above W, a poisoned table) is not served: the composition waits at most
 * WATERMARK_WAIT_MS for W and then routes the read to the source (TARGETS 4.1 items 5 and 6, Q31d).
 *
 * How it is fed: the writer's own opening applies each receipt before transact returns (read-your-own-write
 * through this composition, the "written with the frame" stand-in), and every opening also reads the source's
 * ordered feed to fill gaps (lost ACKs, other writers) or, for followers, to follow the source at all.
 * Not modeled here: erasure (no workload here erases; Q68f covers current copies), the SQLite file and its
 * locking (R24 open question 2), the one-hour default horizon policy (Q68b; `purge` sets H explicitly).
 */
import { WATERMARK_WAIT_MS, type Basis, type CompositionHandle, type Outcome, type PullResult, type PulledTriple, type Receipt } from "./composition.ts";
import { memberOf } from "./world.ts";

export interface CurrentRow {
  readonly id: string;
  readonly entityId: string;
  readonly attribute: string;
  readonly value: any;
  readonly validFrom: number;
  readonly validTo: number | undefined;
  readonly recordedAt: number;
  readonly position: number;
  retractedAt: number | undefined;
  retractedPosition: number | undefined;
}
/** One applied transaction: its position, instant, asserted rows and the ids it retracts. */
export interface AppliedTx {
  readonly position: number;
  readonly instant: number;
  readonly asserts: readonly { id: string; entityId: string; attribute: string; value: any; validFrom: number; validTo?: number }[];
  readonly retracts: readonly string[];
}
export type Ineligible = "below-horizon" | "above-watermark" | "empty" | "poisoned";
export interface TablePull {
  readonly triples: PulledTriple[];
  readonly entities: number;
  readonly roundTrips: number;
  /** Rows the read examined (visible or not) and their canonical member bytes: H1's "bytes read" (R24 6 Measure). */
  readonly rowsExamined: number;
  readonly bytesExamined: number;
}

/** Core values carry Option fields (validTo); receipts, feed records and pulls normalize to number | undefined. */
export const optionalNumber = (v: any): number | undefined =>
  v === null || v === undefined ? undefined : typeof v === "number" ? v : v._tag === "Some" ? Number(v.value) : v._tag === "None" ? undefined : Number(v);

export class CurrentTable {
  private readonly byEntity = new Map<string, CurrentRow[]>();
  private readonly byId = new Map<string, CurrentRow>();
  /** instants[p] for applied positions 1..W (index 0 unused). */
  private instants: number[] = [Number.NEGATIVE_INFINITY];
  private readonly pending = new Map<number, AppliedTx>();
  private w = 0;
  private h = 0;
  private hInstant = Number.NEGATIVE_INFINITY;
  private strictInstants = true;
  private poisonReason: string | null = null;
  /** Counters for receipts (apply cost is measured by the caller around `apply`). */
  readonly counters = { applied: 0, buffered: 0, duplicates: 0, purgedRows: 0, instantOrderViolations: 0 };

  get watermark() { return this.w; }
  get horizon() { return this.h; }
  get horizonInstant() { return this.hInstant; }
  get strict() { return this.strictInstants; }
  get poisoned() { return this.poisonReason; }
  get pendingCount() { return this.pending.size; }
  instantOf(position: number): number | undefined { return position >= 1 && position <= this.w ? this.instants[position] : undefined; }

  /** Apply a transaction; out-of-order arrivals wait in a reorder buffer until the gap below them is filled. */
  apply(tx: AppliedTx): void {
    if (tx.position <= this.w || this.pending.has(tx.position)) { this.counters.duplicates++; return; }
    this.pending.set(tx.position, tx);
    if (tx.position !== this.w + 1) { this.counters.buffered++; return; }
    for (let next = this.pending.get(this.w + 1); next; next = this.pending.get(this.w + 1)) {
      this.pending.delete(next.position);
      this.applyOne(next);
    }
  }

  private applyOne(tx: AppliedTx) {
    const previous = this.instants[this.w]!;
    if (!(tx.instant > previous)) { this.strictInstants = false; this.counters.instantOrderViolations++; }
    for (const id of tx.retracts) {
      const row = this.byId.get(id);
      // A complete table (built from position 1) holds every row a later transaction can retract.
      if (!row) { this.poisonReason ??= `retract of unknown row ${id} at position ${tx.position}`; continue; }
      if (row.retractedPosition !== undefined) { this.poisonReason ??= `row ${id} retracted twice (positions ${row.retractedPosition}, ${tx.position})`; continue; }
      row.retractedAt = tx.instant;
      row.retractedPosition = tx.position;
    }
    for (const a of tx.asserts) {
      if (this.byId.has(a.id)) { this.poisonReason ??= `assertion identity ${a.id} applied twice`; continue; }
      const row: CurrentRow = {
        id: a.id, entityId: a.entityId, attribute: a.attribute, value: a.value, validFrom: a.validFrom, validTo: a.validTo,
        recordedAt: tx.instant, position: tx.position, retractedAt: undefined, retractedPosition: undefined,
      };
      this.byId.set(row.id, row);
      const list = this.byEntity.get(row.entityId);
      if (list) list.push(row); else this.byEntity.set(row.entityId, [row]);
    }
    this.instants[tx.position] = tx.instant;
    this.w = tx.position;
    this.counters.applied++;
  }

  /** R24 4.3 rule (1) in instant terms (the bench basis is {recordedAt, validAt}). */
  eligibility(recordedAt: number): { ok: true } | { ok: false; reason: Ineligible } {
    if (this.poisonReason !== null) return { ok: false, reason: "poisoned" };
    if (this.w === 0) return { ok: false, reason: "empty" };
    if (recordedAt < this.hInstant) return { ok: false, reason: "below-horizon" };
    const upper = this.instants[this.w]!;
    if (this.strictInstants ? recordedAt > upper : recordedAt >= upper) return { ok: false, reason: "above-watermark" };
    return { ok: true };
  }

  /** Breadth-first subject pull at one basis, the same traversal as the `public` composition. */
  pull(root: string, basis: Basis): TablePull {
    const R = basis.recordedAt, V = basis.validAt;
    const seen = new Set<string>([root]);
    let frontier = [root];
    const triples: PulledTriple[] = [];
    let roundTrips = 0, rowsExamined = 0, bytesExamined = 0;
    while (frontier.length) {
      roundTrips++;
      const next: string[] = [];
      for (const e of frontier) {
        const rows = this.byEntity.get(e);
        if (!rows) continue;
        for (const row of rows) {
          rowsExamined++;
          bytesExamined += memberOf(row.entityId, row.attribute, row.value).length;
          if (row.recordedAt > R) continue;
          if (row.retractedAt !== undefined && row.retractedAt <= R) continue;
          if (row.validFrom > V || (row.validTo !== undefined && V >= row.validTo)) continue;
          triples.push({ id: row.id, entityId: row.entityId, attribute: row.attribute, value: row.value, validFrom: row.validFrom, ...(row.validTo !== undefined ? { validTo: row.validTo } : {}) });
          if (row.value?.type === "ref" && !seen.has(row.value.value)) {
            seen.add(row.value.value);
            next.push(row.value.value);
          }
        }
      }
      frontier = next;
    }
    return { triples, entities: seen.size, roundTrips, rowsExamined, bytesExamined };
  }

  /** Move the horizon to `position`: drop rows retracted at or before it (R24 4.2 item 3, purge off the commit path). */
  purge(position: number): number {
    if (position <= this.h) return 0;
    if (position > this.w) throw new Error(`purge horizon ${position} is above the watermark ${this.w}`);
    let removed = 0;
    for (const [e, rows] of this.byEntity) {
      const kept = rows.filter((r) => r.retractedPosition === undefined || r.retractedPosition > position);
      if (kept.length === rows.length) continue;
      for (const r of rows) if (r.retractedPosition !== undefined && r.retractedPosition <= position) { this.byId.delete(r.id); removed++; }
      if (kept.length) this.byEntity.set(e, kept); else this.byEntity.delete(e);
    }
    this.h = position;
    this.hInstant = this.instants[position]!;
    this.counters.purgedRows += removed;
    return removed;
  }

  stats() {
    let live = 0, retracted = 0, bytes = 0;
    for (const row of this.byId.values()) {
      if (row.retractedPosition === undefined) live++; else retracted++;
      bytes += memberOf(row.entityId, row.attribute, row.value).length + row.id.length + 48;
    }
    return { watermark: this.w, horizon: this.h, entities: this.byEntity.size, rows: this.byId.size, live, retracted, approxBytes: bytes, strictInstants: this.strictInstants, poisoned: this.poisonReason, pending: this.pending.size, counters: { ...this.counters } };
  }

  /** A plain-object snapshot (structured-clone safe) for handing the table to follower threads. */
  snapshot() {
    return { w: this.w, h: this.h, hInstant: this.hInstant, strict: this.strictInstants, instants: this.instants.slice(0, this.w + 1), rows: [...this.byId.values()] };
  }

  static fromSnapshot(s: ReturnType<CurrentTable["snapshot"]>): CurrentTable {
    const t = new CurrentTable();
    t.w = s.w; t.h = s.h; t.hInstant = s.hInstant; t.strictInstants = s.strict; t.instants = [...s.instants];
    for (const r of s.rows) {
      const row: CurrentRow = { ...r };
      t.byId.set(row.id, row);
      const list = t.byEntity.get(row.entityId);
      if (list) list.push(row); else t.byEntity.set(row.entityId, [row]);
    }
    return t;
  }
}

/** A receipt plus the command's operations as an applied transaction (retract ids come from the operations). */
export function appliedFromReceipt(receipt: Receipt, operations: readonly any[]): AppliedTx {
  return {
    position: receipt.position,
    instant: receipt.instant,
    asserts: receipt.triples.map((t: any) => ({ id: t.id, entityId: t.entityId, attribute: t.attribute, value: t.value, validFrom: Number(t.validFrom), validTo: optionalNumber(t.validTo) })),
    retracts: operations.filter((op) => op.op === "retract").map((op) => op.id),
  };
}

/** A source feed record (`Triples.transactions`) as an applied transaction. */
export function appliedFromFeed(record: any): AppliedTx {
  const asserts: AppliedTx["asserts"][number][] = [];
  const retracts: string[] = [];
  for (const c of record.changes ?? []) {
    if (c.op === "assert") asserts.push({ id: c.tripleId, entityId: c.entityId, attribute: c.attribute, value: c.value, validFrom: Number(c.validFrom), validTo: optionalNumber(c.validTo) });
    else if (c.op === "retract") retracts.push(c.tripleId);
  }
  return { position: Number(record.position), instant: Number(record.instant), asserts, retracts };
}

export interface H1Options {
  /** Applies receipts of its own transacts (true for the writer's opening). */
  readonly applyReceipts?: boolean;
  /** Feed poll interval while following; 0 disables the background poller (gap filling still runs on demand). */
  readonly followEveryMs?: number;
  /** Feed page size. */
  readonly feedLimit?: number;
  /** Wait budget for an ineligible basis before falling back (TARGETS 4.1 item 5). */
  readonly waitMs?: number;
}

export interface H1Handle extends CompositionHandle {
  readonly table: CurrentTable;
  /** Read the source feed from W until it is exhausted; returns the number of transactions applied. */
  catchUp(): Promise<number>;
  /** Stop or resume the background feed poller (the GS.04b consumer cut). */
  setFollowing(on: boolean): void;
  /** Replace the table (W regression test: a restore from an older snapshot). */
  replaceTable(table: CurrentTable): void;
  readonly routes: Record<string, number>;
}

/**
 * The H1 composition: `source` stays the source of truth and the fallback; reads that the table is eligible
 * for are served in process. Route names: "current-h1" or "fallback:<reason>" (reason = why the table was not
 * eligible after the wait).
 */
export function h1Composition(source: CompositionHandle, opts: H1Options = {}, table = new CurrentTable()): H1Handle {
  let tbl = table;
  const waitMs = opts.waitMs ?? WATERMARK_WAIT_MS;
  const feedLimit = opts.feedLimit ?? 500;
  const routes: Record<string, number> = {};
  let following = (opts.followEveryMs ?? 0) > 0;
  let catching: Promise<number> | null = null;
  const catchUp = (): Promise<number> => {
    catching ??= (async () => {
      let applied = 0;
      try {
        for (;;) {
          const page = await source.feedPage(tbl.watermark, feedLimit);
          if (!page.transactions.length) break;
          for (const record of page.transactions) { tbl.apply(appliedFromFeed(record)); applied++; }
          if (page.transactions.length < feedLimit) break;
        }
      } finally {
        catching = null;
      }
      return applied;
    })();
    return catching;
  };
  let timer: ReturnType<typeof setInterval> | null = null;
  if (following) timer = setInterval(() => { if (following) void catchUp().catch(() => {}); }, opts.followEveryMs);
  timer?.unref?.();
  const count = (route: string) => { routes[route] = (routes[route] ?? 0) + 1; };

  const pull = async (root: string, basis: Basis, between?: () => Promise<void>): Promise<PullResult> => {
    const t0 = performance.now();
    let verdict = tbl.eligibility(basis.recordedAt);
    // Wait at most waitMs for W to reach the basis (only "above-watermark" can resolve by waiting).
    while (!verdict.ok && verdict.reason === "above-watermark" && performance.now() - t0 < waitMs) {
      if (tbl.pendingCount > 0 || following) void catchUp().catch(() => {});
      await new Promise((r) => setTimeout(r, 1));
      verdict = tbl.eligibility(basis.recordedAt);
    }
    const waitedMs = performance.now() - t0;
    if (verdict.ok) {
      // A split read's later steps use the same basis; the table answers all steps from one in-process pass,
      // so `between` runs after the first level would be indistinguishable: run it before returning.
      const out = tbl.pull(root, basis);
      if (between) await between();
      count("current-h1");
      return { triples: out.triples, entities: out.entities, roundTrips: out.roundTrips, depth: out.roundTrips - 1, route: "current-h1", language: "in-process", waitedMs, rowsExamined: out.rowsExamined, bytesExamined: out.bytesExamined } as PullResult;
    }
    const fallback = await source.pull(root, basis, between);
    count(`fallback:${verdict.reason}`);
    return { ...fallback, route: `fallback:${verdict.reason}`, waitedMs };
  };

  return {
    ...source,
    name: `h1(${source.name})`,
    get table() { return tbl; },
    routes,
    assignments: {
      ...source.assignments,
      current: { lane: source.assignments.source.lane, role: "H1 in-process current table (EXP-P4), fed by receipts and the source feed" },
      replicationEdges: [{ from: "source", to: "current-h1", consumerSourceSha256: null, generation: "h1-in-process" }],
    },
    watermarks: async () => ({ ...(await source.watermarks()), "current-h1": tbl.watermark }),
    transact: async (operations, meta): Promise<Outcome<Receipt>> => {
      const out = await source.transact(operations, meta);
      if (out.ok && opts.applyReceipts !== false) {
        // A receipt describes the transaction exactly only when every operation is a plain assert or retract
        // and every retract took effect (core skips a retract of an already retracted row without failing);
        // otherwise the source feed, which lists every change, is the record to apply.
        const retracts = operations.filter((op) => op.op === "retract").length;
        const plain = operations.every((op) => op.op === "assert" || op.op === "retract");
        const reported = (out.value as any).retracted;
        if (plain && (reported === undefined || reported === retracts)) tbl.apply(appliedFromReceipt(out.value, operations));
        if (!plain || tbl.watermark < out.value.position) await catchUp();
      }
      return out;
    },
    pull,
    sweepPull: (root, basis) => pull(root, basis),
    catchUp,
    setFollowing: (on) => { following = on && timer !== null; },
    replaceTable: (t) => { tbl = t; },
    close: async () => { if (timer) clearInterval(timer); await source.close(); },
  };
}
