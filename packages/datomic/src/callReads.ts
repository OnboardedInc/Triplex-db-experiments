// [DX-API1] One API call's reads, collected into batched requests pinned to one position.
//
// Why: a product handler makes tens to thousands of reads per call (lab/experiments/EXP-DX1/api1/API-CALL-READS.md). Each
// is an HTTP round trip to the read gateway today, and each unpinned read resolves its own head, so the reads of one call
// can straddle a commit and return a page no single position ever held. `CallReads` is a per-call loader: every read the
// handler issues in the same tick (for example under `Promise.all`) goes into one `POST /v2/db/{db}/batch` request
// (gateway `batch.clj`, behind TX2_READ_BATCH=1), and every batch of the call is answered at ONE position:
//   - the first batch pins: it names no position (or the caller's `position`), and the gateway answers at its head, or at
//     least at `atLeast` when the call starts from a write receipt; the answer states the position, and every later batch
//     of the call sends it as `basis.recordedPosition`;
//   - a read after the call's own write: `afterWrite(receipt)` drops the pin and the memo; the next batch asks
//     `atLeastPosition` = the receipt's position (the at-least read: the gateway waits on its own peer, then answers at its
//     head, which is at or after the receipt) and pins the position it states. Reads before the write keep the first
//     position; reads after it share the second. A call that writes therefore reads at most one position per write;
//   - a per-call memo: an entity (with the same pattern) or a reach root is asked for once per pinned position; a second
//     read of it is answered from the first answer, without a request.
// The handler is not rewritten as one query: it keeps calling `rows`, `reach` and `ids` where it did before.
// Rejected: a loader without a pin (it would batch round trips but keep the straddle); a memo across calls (it would serve
// a position the caller never pinned); merging several subjects' reach worlds into one entry (the per-root answer must
// be the single route's answer for that root).
import type { TripleRow } from "@triplex-build/triplex";
import type { DatomicClient } from "./DatomicClient.js";
import { decodeRow, type WireRow } from "./protocol.js";

export type BatchReference = { readonly entry: number; readonly attribute?: string; readonly limit?: number };
export type BatchPattern = { readonly attribute?: string; readonly entityType?: string };
export type BatchEntry =
  | { readonly op: "rows"; readonly entityIds: readonly string[]; readonly pattern?: BatchPattern }
  | { readonly op: "rows"; readonly entityIdsFrom: BatchReference; readonly pattern?: BatchPattern }
  | { readonly op: "reach"; readonly roots: readonly string[] }
  | { readonly op: "reach"; readonly rootsFrom: BatchReference }
  | ({ readonly op: "ids"; readonly account: string } & Record<string, unknown>);

export interface BatchRequest {
  readonly basis: { readonly recordedPosition?: number; readonly validAt: number };
  readonly reads: readonly BatchEntry[];
  readonly atLeastPosition?: number;
  readonly basisWaitMs?: number;
  readonly limits?: { readonly maxBytes?: number; readonly timeMs?: number };
  readonly prefetch?: boolean;
  readonly stats?: boolean;
}
export interface BatchStats {
  readonly loads: number;
  readonly handlerCpuMicros: number;
  readonly micros: number;
}
export interface BatchAnswer {
  readonly route: "batch";
  readonly position: number;
  readonly t: string;
  readonly validAt: number;
  readonly entries: number;
  /** Answers of entries `from` to `entries - 1`, in entry order, after following every cursor. */
  readonly answers: readonly unknown[];
  readonly prefetched: number;
  /** Requests this batch took (more than one when the gateway stopped at a byte or time bound). */
  readonly requests: number;
  readonly stats?: BatchStats;
}

type Page = {
  route: string; position: number; t: string; validAt: number; entries: number; from: number;
  next: number | null; stopped: string | null; prefetched: number; stats?: BatchStats; answers: unknown[];
};

/** One batch, following the gateway's cursor until every entry is answered, all at the first page's position. */
export async function readBatch(client: DatomicClient, db: string, request: BatchRequest): Promise<BatchAnswer> {
  if (!/^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/.test(db)) throw new TypeError("Invalid Datomic database name");
  const answers: unknown[] = [];
  let body: Record<string, unknown> = { ...request };
  let first: Page | undefined;
  let requests = 0, loads = 0, cpu = 0, micros = 0;
  for (;;) {
    const page = await client.request<Page>("POST", `/v2/db/${db}/batch`, body);
    requests++;
    if (
      page?.route !== "batch" || !Number.isSafeInteger(page.position) || !Array.isArray(page.answers) ||
      page.answers.length !== (page.next ?? page.entries) - page.from ||
      (first !== undefined && page.position !== first.position) ||
      (request.basis.recordedPosition !== undefined && page.position !== request.basis.recordedPosition)
    )
      throw new TypeError("Invalid batch answer");
    if (request.atLeastPosition !== undefined && page.position < request.atLeastPosition)
      throw new TypeError("The gateway answered a batch below its at-least position");
    first ??= page;
    answers.push(...page.answers);
    if (page.stats) { loads += page.stats.loads; cpu += page.stats.handlerCpuMicros; micros += page.stats.micros; }
    if (page.next === null) break;
    const { atLeastPosition: _drop, ...rest } = request;
    body = { ...rest, basis: { ...request.basis, recordedPosition: first.position }, from: page.next };
  }
  return {
    route: "batch", position: first.position, t: first.t, validAt: first.validAt, entries: first.entries, answers,
    prefetched: first.prefetched, requests,
    ...(request.stats ? { stats: { loads, handlerCpuMicros: cpu, micros } } : {}),
  };
}

export interface CallReadsOptions {
  /** Valid time of every read of the call (default: when the loader is made). */
  readonly validAt?: number;
  /** Pin the call to this position instead of the gateway's head. */
  readonly position?: number;
  /** Start from a write receipt: the first batch is answered at least at this position. */
  readonly atLeast?: number;
  /** Per-call memo (default on). */
  readonly memo?: boolean;
  /** Ask the gateway to prefetch each batch's subjects (default on). */
  readonly prefetch?: boolean;
  /** Ask for the batch's storage loads and handler CPU (diagnostic). */
  readonly stats?: boolean;
  readonly basisWaitMs?: number;
}

// Rows reads coalesced into one entry, at most this many subjects: a batch's byte bound stops between entries, so an
// entry must stay well under it (128 deep-subject entities answer about 1 MB).
const ENTRY_SUBJECTS = 128;
type Pending = { entry: BatchEntry; key: string; resolve: (value: unknown) => void; reject: (error: unknown) => void };
export type ReachWorld = { position: number; t: string; entities: unknown[]; closures: unknown[] } & Record<string, unknown>;

export class CallReads {
  #position: number | undefined;
  #atLeast: number | undefined;
  readonly validAt: number;
  readonly #memo = new Map<string, Promise<unknown>>();
  #queue: Pending[] = [];
  #scheduled = false;
  #inFlight: Promise<void> = Promise.resolve();
  readonly counts = { reads: 0, memoHits: 0, batches: 0, requests: 0, entries: 0, loads: 0, handlerCpuMicros: 0, positions: [] as number[] };

  constructor(readonly client: DatomicClient, readonly db: string, readonly options: CallReadsOptions = {}) {
    this.validAt = options.validAt ?? Date.now();
    this.#position = options.position;
    this.#atLeast = options.atLeast;
  }
  /** The position every read of the call is answered at (undefined until the first batch is answered). */
  get position(): number | undefined {
    return this.#position;
  }
  /** One entity's rows (the single route `/read` with `entityIds: [entityId]`), coalesced with the tick's other reads. */
  rows(entityId: string, pattern?: BatchPattern): Promise<readonly TripleRow[]> {
    const key = "rows " + JSON.stringify([pattern?.attribute ?? null, pattern?.entityType ?? null]) + " " + entityId;
    return this.#ask(key, { op: "rows", entityIds: [entityId], ...(pattern ? { pattern } : {}) }) as Promise<readonly TripleRow[]>;
  }
  /** Several entities' rows; one answer per entity, in the order asked. */
  rowsMany(entityIds: readonly string[], pattern?: BatchPattern): Promise<(readonly TripleRow[])[]> {
    return Promise.all(entityIds.map((id) => this.rows(id, pattern)));
  }
  /** One root's world (the single route `/reach-many` with `roots: [root]`). */
  reach(root: string): Promise<ReachWorld> {
    return this.#ask("reach " + root, { op: "reach", roots: [root] }) as Promise<ReachWorld>;
  }
  /** One ID list page at the call's position (needs TX2_ID_LISTS=1 on the gateway). */
  ids(request: { readonly account: string } & Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.#ask("ids " + JSON.stringify(request), { op: "ids", ...request }) as Promise<Record<string, unknown>>;
  }
  /** The call saved and holds the receipt: later reads are answered at least at its position (a new pin). */
  afterWrite(receipt: { readonly position: number } | number): void {
    const position = typeof receipt === "number" ? receipt : receipt.position;
    if (!Number.isSafeInteger(position) || position < 0) throw new RangeError("Invalid receipt position");
    this.#atLeast = Math.max(this.#atLeast ?? 0, position);
    this.#position = undefined;
    this.#memo.clear();
  }

  #ask(key: string, entry: BatchEntry): Promise<unknown> {
    this.counts.reads++;
    if (this.options.memo !== false) {
      const known = this.#memo.get(key);
      if (known) { this.counts.memoHits++; return known; }
    }
    const answer = new Promise<unknown>((resolve, reject) => this.#queue.push({ entry, key, resolve, reject }));
    if (this.options.memo !== false) this.#memo.set(key, answer);
    if (!this.#scheduled) {
      this.#scheduled = true;
      // The tick's other reads join this batch: setImmediate runs after every microtask continuation of this tick.
      setImmediate(() => { this.#scheduled = false; this.#inFlight = this.#inFlight.then(() => this.#flush()); });
    }
    return answer;
  }

  async #flush(): Promise<void> {
    const pending = this.#queue;
    this.#queue = [];
    if (pending.length === 0) return;
    // Rows reads with the same pattern go in one entry (split by entity afterwards); reach and ids reads one entry each.
    const groups = new Map<string, { entry: BatchEntry; items: Pending[] }>();
    const entries: { entry: BatchEntry; items: Pending[] }[] = [];
    for (const p of pending) {
      if (p.entry.op === "rows" && "entityIds" in p.entry) {
        const g = JSON.stringify(p.entry.pattern ?? null);
        let group = groups.get(g);
        if (!group) {
          group = { entry: { op: "rows", entityIds: [], ...(p.entry.pattern ? { pattern: p.entry.pattern } : {}) }, items: [] };
          groups.set(g, group);
          entries.push(group);
        }
        const ids = (group.entry as unknown as { entityIds: string[] }).entityIds;
        if (ids.length >= ENTRY_SUBJECTS) {
          group = { entry: { op: "rows", entityIds: [], ...(p.entry.pattern ? { pattern: p.entry.pattern } : {}) }, items: [] };
          groups.set(g, group);
          entries.push(group);
        }
        (group.entry as unknown as { entityIds: string[] }).entityIds.push(...p.entry.entityIds);
        group.items.push(p);
      } else entries.push({ entry: p.entry, items: [p] });
    }
    try {
      for (let start = 0; start < entries.length; start += 256) {
        const part = entries.slice(start, start + 256);
        const pinned = this.#position;
        const answer = await readBatch(this.client, this.db, {
          basis: { validAt: this.validAt, ...(pinned !== undefined ? { recordedPosition: pinned } : {}) },
          reads: part.map((e) => e.entry),
          ...(pinned === undefined && this.#atLeast !== undefined && this.#atLeast > 0 ? { atLeastPosition: this.#atLeast } : {}),
          ...(this.options.basisWaitMs !== undefined ? { basisWaitMs: this.options.basisWaitMs } : {}),
          ...(this.options.prefetch === false ? { prefetch: false } : {}),
          ...(this.options.stats ? { stats: true } : {}),
        });
        if (pinned === undefined) this.#position = answer.position;
        else if (answer.position !== pinned) throw new TypeError("A batch was answered at another position than the call's");
        this.counts.batches++;
        this.counts.requests += answer.requests;
        this.counts.entries += part.length;
        this.counts.positions.push(answer.position);
        if (answer.stats) { this.counts.loads += answer.stats.loads; this.counts.handlerCpuMicros += answer.stats.handlerCpuMicros; }
        part.forEach((e, k) => {
          const result = answer.answers[k] as Record<string, unknown>;
          if (e.entry.op === "rows") {
            const rows = ((result["rows"] ?? []) as WireRow[]).map(decodeRow);
            const byEntity = new Map<string, TripleRow[]>();
            for (const row of rows) {
              const list = byEntity.get(row.entity_id);
              if (list) list.push(row); else byEntity.set(row.entity_id, [row]);
            }
            for (const item of e.items) item.resolve(byEntity.get((item.entry as unknown as { entityIds: string[] }).entityIds[0]!) ?? []);
          } else for (const item of e.items) item.resolve(result);
        });
      }
    } catch (error) {
      for (const p of pending) { p.reject(error); this.#memo.delete(p.key); }
    }
  }
}
