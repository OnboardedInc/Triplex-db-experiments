import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import { type ReachWire } from "../reach.js";
import type { DatomicClient } from "../DatomicClient.js";
import {
  SharedIndex,
  OverlayTable,
  Slabs,
  shareIndex,
  type SharedIndexImage,
  type EntityTable,
} from "./sharedIndex.js";
import { inlineSource } from "./inlineSource.js";
import type { SweepRow } from "../sweepRows.js";
import { decodeReplicaRows } from "./decodeRows.js";
import { packEntity, unpackEntity, type PackedEntity } from "./packed.js";

export interface ReplicaJournal {
  readonly position: number;
  readonly entities: readonly string[];
  readonly replacement?: ReachWire & { readonly incremental?: boolean };
}
export interface ReplicaSource {
  head(): Promise<number>;
  capability?(basis: ResolvedTemporalBasis): Promise<string | undefined>;
  page(roots: readonly string[], basis: ResolvedTemporalBasis, need?: boolean): Promise<ReachWire>;
  feed(
    after: number,
    limit: number,
    waitMs: number,
  ): Promise<{ head: number; transactions: readonly ReplicaJournal[] }>;
}
export class ReplicaInvalid extends Error {}
export class ReplicaUnsupportedScope extends ReplicaInvalid {
  override readonly name = "ReplicaUnsupportedScope";
  constructor(readonly reason: string) {
    super("Unsupported replica scope: " + reason);
  }
}
const position = (p: number) => {
  if (!Number.isSafeInteger(p) || p < 0) throw new ReplicaInvalid("Invalid position");
};
export interface ReplicaImage {
  readonly position: number;
  readonly validAt: number;
  readonly entities: readonly (readonly [string, PackedEntity])[];
  readonly shared?: SharedIndexImage;
}
export class ReplicaSnapshot {
  private readonly entities: EntityTable;
  private shared: ReplicaImage | undefined;
  readonly position: number;
  readonly validAt: number;
  constructor(image: ReplicaImage) {
    this.entities = image.shared
      ? new OverlayTable(new SharedIndex(image.shared), new Map(image.entities))
      : new Map(image.entities);
    this.shared = image.shared ? image : undefined;
    this.position = image.position;
    this.validAt = image.validAt;
  }
  image(): ReplicaImage {
    return { position: this.position, validAt: this.validAt, entities: [...this.entities] };
  }
  sharedImage(): ReplicaImage {
    return (this.shared ??= {
      position: this.position,
      validAt: this.validAt,
      entities: [],
      shared: shareIndex(this.entities),
    });
  }

  get bytes(): number {
    if (this.entities.bytes !== undefined) return this.entities.bytes;
    let n = 0;
    for (const e of this.entities.values()) n += e.byteLength ?? e.buffer.byteLength;
    return n;
  }
  world(subjectId: string): SweepRow[] {
    return walk(this.entities, this.validAt, subjectId);
  }
}
export interface ReplicaUpdate {
  readonly position: number;
  readonly reset: boolean;
  readonly valid: boolean;
  readonly changes: readonly (readonly [string, PackedEntity | undefined, PackedEntity])[];
}
export class Replica {
  static readonly UnsupportedScope = ReplicaUnsupportedScope;
  static source(
    client: DatomicClient,
    db: string,
    head: () => Promise<number>,
    validAt: number,
  ): ReplicaSource {
    return inlineSource(client, db, head, validAt);
  }
  // [DX-R3] Why: publish complete atomic cuts and old immutable buffers to optional read indexes.
  // Rejected: exposing the mutable entity Map (workers could observe half a journal).
  onUpdate: ((update: ReplicaUpdate) => void) | undefined;
  private entities = new OverlayTable(new Map<string, PackedEntity>());
  private baseImage: SharedIndexImage | undefined;
  private slabs = new Slabs();
  private watermark = 0;
  private valid = false;
  private serial: Promise<unknown> = Promise.resolve();
  private following: Promise<void> | undefined;
  private stopped = true;
  private roots: readonly string[] = [];
  private configured = false;
  private captureEpoch = 0;
  private waiters = new Set<{ p: number; resolve(): void; reject(e: unknown): void }>();
  private captures = new Map<
    number,
    Set<{ resolve(view: ReplicaSnapshot): void; reject(e: unknown): void }>
  >();
  private view(): ReplicaSnapshot {
    return new ReplicaSnapshot({
      position: this.watermark,
      validAt: this.validAt,
      entities: this.baseImage ? [...this.entities.delta] : [...this.entities],
      ...(this.baseImage ? { shared: this.baseImage } : {}),
    });
  }
  private rejectCaptures(error: unknown) {
    for (const requests of this.captures.values())
      for (const request of requests) request.reject(error);
    this.captures.clear();
  }
  constructor(
    readonly source: ReplicaSource,
    readonly validAt: number,
  ) {
    if (!Number.isFinite(validAt)) throw new TypeError("Explicit valid time required");
  }
  get position(): number {
    return this.watermark;
  }
  get isValid(): boolean {
    return this.valid;
  }
  get bytes(): number {
    if (this.entities.bytes !== undefined) return this.entities.bytes;
    let n = 0;
    for (const e of this.entities.values()) n += e.byteLength ?? e.buffer.byteLength;
    return n;
  }
  private exclusive<T>(f: () => Promise<T>): Promise<T> {
    const next = this.serial.then(f);
    this.serial = next.catch(() => {});
    return next;
  }
  private invalidate(e: unknown): never {
    this.valid = false;
    this.onUpdate?.({ position: this.watermark, reset: true, valid: false, changes: [] });
    for (const w of this.waiters) w.reject(e);
    this.waiters.clear();
    this.rejectCaptures(e);
    throw e;
  }
  private advance(p: number) {
    this.watermark = p;
    const requests = this.captures.get(p);
    if (requests) {
      const view = this.view();
      for (const request of requests) request.resolve(view);
      this.captures.delete(p);
    }
    for (const w of this.waiters)
      if (w.p <= p) {
        w.resolve();
        this.waiters.delete(w);
      }
  }
  private async load(
    roots: readonly string[],
    p: number,
    into: Map<string, PackedEntity>,
    need = false,
  ) {
    const batches = Array.from({ length: Math.ceil(roots.length / 64) }, (_, i) =>
      roots.slice(i * 64, i * 64 + 64),
    );
    let next = 0;
    const run = async () => {
      while (next < batches.length) {
        const batch = batches[next++]!;
        const response = await this.source.page(
          batch,
          { recordedPosition: p, validAt: this.validAt },
          need,
        );
        await this.acceptPage(response, batch, p, into, need);
      }
    };
    const settled = await Promise.allSettled(
      Array.from({ length: need ? 1 : Math.min(4, batches.length) }, run),
    );
    for (const result of settled) if (result.status === "rejected") throw result.reason;
  }
  private async acceptPage(
    response: ReachWire,
    batch: readonly string[],
    p: number,
    into: Map<string, PackedEntity>,
    need: boolean,
    allowKnown = false,
  ) {
    if (
      response.declined !== undefined ||
      response.position !== p ||
      !/^\d+$/.test(response.t) ||
      typeof response.reset !== "boolean" ||
      !Array.isArray(response.entities) ||
      !Array.isArray(response.closures) ||
      response.closures.length !== batch.length
    )
      throw new ReplicaInvalid("Page declined or basis/shape mismatch");
    const received = new Set<string>();
    for (const entry of response.entities) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 3 ||
        typeof entry[0] !== "string" ||
        !Number.isSafeInteger(entry[1]) ||
        entry[1] < 0 ||
        !Array.isArray(entry[2]) ||
        received.has(entry[0])
      )
        throw new ReplicaInvalid("Incomplete or duplicate entity");
      const [id, rev, wire] = entry as [string, number, unknown[]];
      const rows = decodeReplicaRows(id, rev, wire, p);
      const packed = packEntity(rev, rows),
        previous = into.get(id);
      // [DX-R2] Why: pages at one cut must agree; reuse immutable buffers for overlapping closures.
      // Rejected: retaining duplicate common entities or accepting a different revision at the same cut.
      if (previous && (previous.revision !== rev || !equalBytes(previous, packed)))
        throw new ReplicaInvalid("Revision contents changed");
      const current = this.entities.get(id);
      into.set(
        id,
        previous ??
          (current?.revision === rev && equalBytes(current, packed)
            ? current
            : this.slabs.put(packed)),
      );
      received.add(id);
    }
    response.closures.forEach(([root, ids], n) => {
      if (
        root !== batch[n] ||
        !Array.isArray(ids) ||
        !ids.includes(root) ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !received.has(id))
      )
        throw new ReplicaInvalid("Closure coverage mismatch");
    });
    const missing = new Set<string>();
    for (const id of received)
      for (const r of unpackEntity(id, into.get(id)!, this.validAt))
        if (r.value.type === "ref" && !received.has(r.value.value)) {
          // [DX-R2] Why: unchanged reference targets retain their exact prior rows; changed targets must be in this journal.
          // Rejected: a network refresh per journal or treating an unknown target as empty.
          if (allowKnown && this.entities.has(r.value.value)) continue;
          if (!need) throw new ReplicaInvalid("Reference coverage mismatch");
          if (!into.has(r.value.value) && !this.entities.has(r.value.value))
            missing.add(r.value.value);
        }
    if (missing.size) await this.load([...missing], p, into, true);
  }
  bootstrap(roots: readonly string[], p?: number): Promise<void> {
    return this.exclusive(async () => {
      try {
        this.rejectCaptures(new ReplicaInvalid("Replica rebuilt before requested snapshot"));
        this.valid = false;
        const cut = p ?? (await this.source.head());
        position(cut);
        const unsupported = await this.source.capability?.({
          recordedPosition: cut,
          validAt: this.validAt,
        });
        if (unsupported !== undefined) throw new ReplicaUnsupportedScope(unsupported);
        if (p === undefined && cut < this.watermark)
          throw new ReplicaInvalid("Rebuild head regressed");
        const unique = [...new Set(roots)];
        if (unique.length !== roots.length) throw new ReplicaInvalid("Duplicate bootstrap root");
        this.roots = unique;
        this.configured = true;
        this.slabs = new Slabs();
        const next = new Map<string, PackedEntity>();
        await this.load(unique, cut, next);
        this.baseImage = shareIndex(next);
        this.entities = new OverlayTable(new SharedIndex(this.baseImage));
        this.roots = unique;
        this.valid = true;
        this.onUpdate?.({
          position: cut,
          reset: true,
          valid: true,
          changes: [...next].map(([id, e]) => [id, undefined, e] as const),
        });
        this.advance(cut);
      } catch (e) {
        this.invalidate(e);
      }
    });
  }
  followOnce(waitMs = 0, through?: number): Promise<void> {
    return this.exclusive(() => this.applyFeed(waitMs, through));
  }
  private async applyFeed(waitMs: number, through?: number): Promise<void> {
    try {
      if (!this.valid) throw new ReplicaInvalid("Replica requires rebuild");
      const page = await this.source.feed(this.watermark, 1000, waitMs);
      position(page.head);
      if (page.head < this.watermark || !Array.isArray(page.transactions))
        throw new ReplicaInvalid("Feed regressed");
      let expected = this.watermark;
      for (const tx of page.transactions) {
        if (
          tx.position !== ++expected ||
          tx.position > page.head ||
          !Array.isArray(tx.entities) ||
          tx.entities.some((id: unknown) => typeof id !== "string") ||
          new Set(tx.entities).size !== tx.entities.length
        )
          throw new ReplicaInvalid("Feed gap or invalid journal");
      }
      if (!page.transactions.length && page.head > this.watermark)
        throw new ReplicaInvalid("Feed omitted journals");
      if (!page.transactions.length) await new Promise((resolve) => setTimeout(resolve, 1));
      for (const tx of page.transactions) {
        if (through !== undefined && tx.position > through) break;
        // [DX-R2] Why: inline replacements bind complete changed rows and new references to this exact journal cut.
        // Rejected: current-head reads; legacy sources retain the old exact-position need path.
        const changes = new Map<string, PackedEntity>();
        if (tx.replacement !== undefined)
          await this.acceptPage(
            tx.replacement,
            tx.entities,
            tx.position,
            changes,
            false,
            tx.replacement.incremental === true,
          );
        else await this.load(tx.entities, tx.position, changes, true);
        const replaced = [...changes].map(([id, e]) => [id, this.entities.get(id), e] as const);
        for (const [id, e] of changes) this.entities.set(id, e);
        this.onUpdate?.({ position: tx.position, reset: false, valid: true, changes: replaced });
        this.advance(tx.position);
      }
    } catch (e) {
      this.invalidate(e);
    }
  }
  caughtUpTo(p: number): Promise<void> {
    position(p);
    if (!this.valid) return Promise.reject(new ReplicaInvalid("Replica requires rebuild"));
    if (this.watermark >= p) return Promise.resolve();
    return new Promise((resolve, reject) => this.waiters.add({ p, resolve, reject }));
  }
  async snapshotAt(p: number): Promise<ReplicaSnapshot> {
    position(p);
    if (!this.valid || p < this.watermark)
      return Promise.reject(new ReplicaInvalid("Exact current snapshot unavailable"));
    if (p === this.watermark) return Promise.resolve(this.view());
    // [DX-R1] Why: register synchronously before an in-flight batch can pass P; advance captures P before its next journal.
    // Rejected: queuing the capture behind a follower batch (it could finish beyond the requested position).
    const epoch = this.captureEpoch;
    const result = new Promise<ReplicaSnapshot>((resolve, reject) => {
      const requests = this.captures.get(p) ?? new Set();
      requests.add({ resolve, reject });
      this.captures.set(p, requests);
    });
    void this.exclusive(async () => {
      while (this.valid && this.watermark < p && epoch === this.captureEpoch)
        await this.applyFeed(1000, p);
    }).catch((error) => this.rejectCaptures(error));
    return result;
  }
  capture(): Promise<ReplicaSnapshot> {
    return this.exclusive(async () => {
      if (!this.valid) throw new ReplicaInvalid("Replica requires rebuild");
      const p = await this.source.head();
      position(p);
      if (p < this.watermark) throw new ReplicaInvalid("Capture head regressed");
      while (this.watermark < p) await this.applyFeed(1000, p);
      return this.view();
    });
  }
  world(subjectId: string): SweepRow[] {
    if (!this.valid) throw new ReplicaInvalid("Replica requires rebuild");
    return walk(this.entities, this.validAt, subjectId);
  }
  snapshotSubject(subjectId: string): ReplicaSnapshot {
    if (!this.valid) throw new ReplicaInvalid("Replica requires rebuild");
    // [DX-S5] Why: capture one complete reachable world synchronously at the current cut, sharing only immutable packed buffers.
    // Rejected: cloning the entire accumulated overlay for every live read (100k profiles spent most CPU copying/counting and collecting it).
    const entities = new Map<string, PackedEntity>();
    walk(this.entities, this.validAt, subjectId, entities);
    return new ReplicaSnapshot({
      position: this.watermark,
      validAt: this.validAt,
      entities: [...entities],
    });
  }
  start(): void {
    if (!this.configured) throw new ReplicaInvalid("Bootstrap roots required before following");
    if (this.following) return;
    this.stopped = false;
    this.following = (async () => {
      while (!this.stopped) {
        try {
          if (!this.valid) await this.bootstrap(this.roots);
          else await this.followOnce(1000);
        } catch {
          if (!this.stopped) await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    })().finally(() => {
      this.following = undefined;
    });
  }
  async stop(): Promise<void> {
    this.stopped = true;
    this.captureEpoch++;
    this.rejectCaptures(new ReplicaInvalid("Replica stopped"));
    await this.following;
    await this.serial;
    for (const w of this.waiters) w.reject(new ReplicaInvalid("Replica stopped"));
    this.waiters.clear();
    this.rejectCaptures(new ReplicaInvalid("Replica stopped"));
  }
}
function equalBytes(a: PackedEntity, b: PackedEntity) {
  const x = new Uint8Array(a.buffer, a.offset ?? 0, a.byteLength),
    y = new Uint8Array(b.buffer, b.offset ?? 0, b.byteLength);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function walk(
  entities: EntityTable,
  validAt: number,
  subjectId: string,
  captured?: Map<string, PackedEntity>,
): SweepRow[] {
  const seen = new Set([subjectId]),
    rows: SweepRow[] = [];
  for (const id of seen) {
    const entity = entities.get(id);
    if (!entity) throw new ReplicaInvalid("Missing referenced entity: " + id);
    captured?.set(id, entity);
    for (const row of unpackEntity(id, entity, validAt)) {
      rows.push(row);
      if (row.value.type === "ref") seen.add(row.value.value);
    }
  }
  return rows;
}
