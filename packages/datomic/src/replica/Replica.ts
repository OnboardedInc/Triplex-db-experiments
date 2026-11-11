import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import { decodeEntity, type ReachWire } from "../reach.js";
import type { SweepRow } from "../sweepRows.js";
import { packEntity, unpackEntity, type PackedEntity } from "./packed.js";

export interface ReplicaJournal {
  readonly position: number;
  readonly entities: readonly string[];
}
export interface ReplicaSource {
  head(): Promise<number>;
  page(roots: readonly string[], basis: ResolvedTemporalBasis, need?: boolean): Promise<ReachWire>;
  feed(
    after: number,
    limit: number,
    waitMs: number,
  ): Promise<{ head: number; transactions: readonly ReplicaJournal[] }>;
}
export class ReplicaInvalid extends Error {}
const position = (p: number) => {
  if (!Number.isSafeInteger(p) || p < 0) throw new ReplicaInvalid("Invalid position");
};
export interface ReplicaImage {
  readonly position: number;
  readonly validAt: number;
  readonly entities: readonly (readonly [string, PackedEntity])[];
}
export class ReplicaSnapshot {
  private readonly entities: ReadonlyMap<string, PackedEntity>;
  readonly position: number;
  readonly validAt: number;
  constructor(image: ReplicaImage) {
    this.entities = new Map(image.entities);
    this.position = image.position;
    this.validAt = image.validAt;
  }
  image(): ReplicaImage {
    return { position: this.position, validAt: this.validAt, entities: [...this.entities] };
  }
  sharedImage(): ReplicaImage {
    // [DX-R1] Why: 1k recorded worlds took 36s to hand thousands of SAB handles to fresh workers.
    // Rejected: one shared buffer per entity in workerData; one packed byte copy per pass shares a single handle with all workers.
    const buffer = new SharedArrayBuffer(this.bytes);
    const bytes = new Uint8Array(buffer);
    let offset = 0;
    const entities: [string, PackedEntity][] = [];
    for (const [id, entity] of this.entities) {
      const byteLength = entity.byteLength ?? entity.buffer.byteLength;
      bytes.set(new Uint8Array(entity.buffer, entity.offset ?? 0, byteLength), offset);
      entities.push([id, { revision: entity.revision, buffer, offset, byteLength }]);
      offset += byteLength;
    }
    return { position: this.position, validAt: this.validAt, entities };
  }
  get bytes(): number {
    let n = 0;
    for (const e of this.entities.values()) n += e.byteLength ?? e.buffer.byteLength;
    return n;
  }
  world(subjectId: string): SweepRow[] {
    return walk(this.entities, this.validAt, subjectId);
  }
}
export class Replica {
  private entities = new Map<string, PackedEntity>();
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
      entities: [...this.entities],
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
    for (let i = 0; i < roots.length; i += 64) {
      const batch = roots.slice(i, i + 64);
      const response = await this.source.page(
        batch,
        { recordedPosition: p, validAt: this.validAt },
        need,
      );
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
        const decoded = decodeEntity(id, rev, wire);
        const byId = new Map(decoded.storedRows.map((r) => [r.id, r]));
        const rows = decoded.rows.map((r): SweepRow => {
          const stored = byId.get(r.id)!;
          if (
            !Number.isSafeInteger(stored.recorded_position) ||
            stored.recorded_position < 0 ||
            stored.recorded_position > p
          )
            throw new ReplicaInvalid("Row beyond cut");
          return {
            id: r.id,
            entityId: id,
            attribute: r.attribute,
            value: r.value,
            position: stored.recorded_position,
            validFrom: stored.valid_from,
            ...(stored.valid_to === null ? {} : { validTo: stored.valid_to }),
          };
        });
        const packed = packEntity(rev, rows),
          previous = into.get(id);
        // [DX-R1] Why: overlapping bootstrap pages must agree at their pinned cut.
        // Rejected: last-page-wins (would conceal incoherent responses).
        if (previous && previous.revision === rev && !equalBytes(previous.buffer, packed.buffer))
          throw new ReplicaInvalid("Revision contents changed");
        into.set(id, packed);
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
            if (!need) throw new ReplicaInvalid("Reference coverage mismatch");
            if (!into.has(r.value.value) && !this.entities.has(r.value.value))
              missing.add(r.value.value);
          }
      if (missing.size) await this.load([...missing], p, into, true);
    }
  }
  bootstrap(roots: readonly string[], p?: number): Promise<void> {
    return this.exclusive(async () => {
      try {
        this.rejectCaptures(new ReplicaInvalid("Replica rebuilt before requested snapshot"));
        this.valid = false;
        const cut = p ?? (await this.source.head());
        position(cut);
        if (p === undefined && cut < this.watermark)
          throw new ReplicaInvalid("Rebuild head regressed");
        const unique = [...new Set(roots)];
        if (unique.length !== roots.length) throw new ReplicaInvalid("Duplicate bootstrap root");
        this.roots = unique;
        this.configured = true;
        const next = new Map<string, PackedEntity>();
        await this.load(unique, cut, next);
        this.entities = next;
        this.roots = unique;
        this.valid = true;
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
        // [DX-R1] Why: the journal has logical changes, but not the physical revision/complete current row set.
        // Rejected: guessing a new revision or applying a partial retraction; refresh only changed closures at the exact cut.
        const changes = new Map<string, PackedEntity>();
        await this.load(tx.entities, tx.position, changes, true);
        for (const [id, e] of changes) this.entities.set(id, e);
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
function equalBytes(a: SharedArrayBuffer, b: SharedArrayBuffer) {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a),
    y = new Uint8Array(b);
  return x.every((v, i) => v === y[i]);
}

function walk(
  entities: ReadonlyMap<string, PackedEntity>,
  validAt: number,
  subjectId: string,
): SweepRow[] {
  const seen = new Set([subjectId]),
    rows: SweepRow[] = [];
  for (const id of seen) {
    const entity = entities.get(id);
    if (!entity) throw new ReplicaInvalid("Missing referenced entity: " + id);
    for (const row of unpackEntity(id, entity, validAt)) {
      rows.push(row);
      if (row.value.type === "ref") seen.add(row.value.value);
    }
  }
  return rows;
}
