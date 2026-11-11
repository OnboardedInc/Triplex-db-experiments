import type { PackedEntity } from "./packed.js";
import { unpackEntity } from "./packed.js";
import type { ReplicaUpdate } from "./Replica.js";
import type { SweepRow } from "../sweepRows.js";

export interface ReadBasis {
  readonly recordedPosition?: number;
  readonly recordedAt?: number;
  readonly validAt: number;
}
type Version = { from: number; until: number; entity: PackedEntity };
export interface ReadDelta extends ReplicaUpdate {
  readonly recordTime?: number;
}
export interface ReadImage {
  readonly floor: number;
  readonly position: number;
  readonly valid: boolean;
  readonly entities: readonly (readonly [string, number, PackedEntity])[];
  readonly history: readonly (readonly [string, readonly Version[]])[];
  readonly times: readonly (readonly [number, number])[];
  readonly timeSafe: boolean;
  readonly strictRecordClocks?: boolean;
}
// [DX-R3] Why: evict whole cuts, so every entity resolves at every admitted position.
// Rejected: independent per-entity LRUs (a global watermark would falsely certify missing history).
export class RecentReads {
  private current = new Map<string, { from: number; entity: PackedEntity }>();
  private history = new Map<string, Version[]>();
  private retired: { id: string; version: Version }[] = [];
  private retiredStart = 0;
  private times = new Map<number, number>();
  private lastTime = -Infinity;
  private timeSafe = true;
  private strictClocks: boolean;
  private retainedBytes = 0;
  floor = 0;
  position = 0;
  valid = false;
  constructor(
    readonly positions = 20_000,
    readonly maxBytes = 64 * 1024 ** 2,
    strictRecordClocks = false,
  ) {
    this.strictClocks = strictRecordClocks === true;
    if (
      !Number.isSafeInteger(positions) ||
      positions < 0 ||
      !Number.isSafeInteger(maxBytes) ||
      maxBytes < 0
    )
      throw new TypeError("Invalid recent-read budget");
  }
  get strictRecordClocks(): boolean { return this.strictClocks; }
  apply(delta: ReadDelta): void {
    if (delta.reset) {
      this.current.clear();
      this.history.clear();
      this.retired = [];
      this.retiredStart = 0;
      this.retainedBytes = 0;
      this.times.clear();
      this.lastTime = -Infinity;
      this.timeSafe = delta.recordTime !== undefined && Number.isFinite(delta.recordTime);
      this.floor = delta.position;
    } else if (!this.valid || delta.position !== this.position + 1) {
      this.valid = false;
      throw new Error("Recent read delta gap");
    }
    this.valid = false;
    for (const [id, previous, entity] of delta.changes) {
      const old = this.current.get(id);
      if (
        !delta.reset &&
        old &&
        old.entity !== previous &&
        (old.entity.revision !== previous?.revision ||
          !previous ||
          !sameBytes(old.entity, previous))
      )
        throw new Error("Recent read predecessor mismatch");
      if (old) {
        const version = { from: old.from, until: delta.position, entity: old.entity };
        const versions = this.history.get(id) ?? [];
        versions.push(version);
        this.history.set(id, versions);
        this.retired.push({ id, version });
        this.retainedBytes += footprint(old.entity);
      }
      this.current.set(id, { from: delta.position, entity });
    }
    this.position = delta.position;
    if (delta.recordTime !== undefined) this.noteTime(delta.recordTime, delta.position);
    else this.timeSafe = false;
    this.floor = Math.max(this.floor, this.position - this.positions);
    while (this.retiredStart < this.retired.length) {
      const item = this.retired[this.retiredStart]!;
      if (item.version.until > this.floor && this.retainedBytes <= this.maxBytes) break;
      this.floor = Math.max(this.floor, item.version.until);
      this.retainedBytes -= footprint(item.version.entity);
      const versions = this.history.get(item.id)!;
      versions.shift();
      if (!versions.length) this.history.delete(item.id);
      delete this.retired[this.retiredStart];
      this.retiredStart++;
    }
    if (this.retiredStart > 1024) {
      this.retired = this.retired.slice(this.retiredStart);
      this.retiredStart = 0;
    }
    for (const [time, p] of this.times) if (p < this.floor) this.times.delete(time);
    this.valid = delta.valid;
  }
  private noteTime(time: number, p: number): void {
    // [DX-R3] Why: non-monotone record clocks cannot be mapped by a position prefix.
    // Rejected: nearest timestamp (would silently answer an irregular time cut).
    if (!Number.isFinite(time)) {
      this.timeSafe = false;
      return;
    }
    if (!Number.isSafeInteger(p) || p < this.floor) return;
    const previous = this.times.get(time);
    if (time < this.lastTime || (previous !== undefined && previous !== p)) this.timeSafe = false;
    this.lastTime = Math.max(this.lastTime, time);
    this.times.set(time, p);
  }
  isOpenClock(time: number): boolean {
    return this.timeSafe && this.times.has(time) && time >= this.lastTime;
  }
  resolve(basis: ReadBasis): number | undefined {
    if (!this.valid || !Number.isFinite(basis.validAt)) return undefined;
    let p = basis.recordedPosition;
    if (basis.recordedAt !== undefined) {
      // [DX-R3] Why: a later clock closes a cut only under a source-enforced immutable strict policy.
      // Rejected: assuming ordinary SPI writers cannot regress after the observed watermark.
      if (p === undefined && !this.strictRecordClocks) return undefined;
      // [DX-R3] Why: the last observed clock can still acquire another equal-clock journal.
      // Rejected: detecting duplicates only after delivery (the preceding admission was already unsafe).
      const mapped =
        this.timeSafe && (p !== undefined || basis.recordedAt < this.lastTime)
          ? this.times.get(basis.recordedAt)
          : undefined;
      if (mapped === undefined || (p !== undefined && p !== mapped)) return undefined;
      p = mapped;
    }
    p ??= this.position;
    return Number.isSafeInteger(p) && p >= this.floor && p <= this.position ? p : undefined;
  }
  private entityAt(id: string, p: number): PackedEntity | undefined {
    const current = this.current.get(id);
    if (current && current.from <= p) return current.entity;
    const versions = this.history.get(id);
    if (versions) {
      let lo = 0,
        hi = versions.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (versions[mid]!.until <= p) lo = mid + 1;
        else hi = mid;
      }
      const version = versions[lo];
      if (version && version.from <= p) return version.entity;
    }
    return undefined;
  }
  visit(
    subject: string,
    basis: ReadBasis,
    visitor: (id: string, entity: PackedEntity, validAt: number) => readonly string[],
  ): { entities: number; depth: number } | undefined {
    const p = this.resolve(basis);
    if (p === undefined) return undefined;
    const seen = new Set([subject]);
    let todo = [subject],
      depth = -1;
    while (todo.length) {
      depth++;
      const next: string[] = [];
      for (const id of todo) {
        const entity = this.entityAt(id, p);
        if (!entity) return undefined;
        for (const ref of visitor(id, entity, basis.validAt))
          if (!seen.has(ref)) {
            seen.add(ref);
            next.push(ref);
          }
      }
      todo = next;
    }
    return { entities: seen.size, depth };
  }
  pull(
    subject: string,
    basis: ReadBasis,
  ): { rows: readonly SweepRow[]; entities: number; depth: number } | undefined {
    const p = this.resolve(basis);
    if (p === undefined) return undefined;
    const seen = new Set([subject]);
    let todo = [subject],
      depth = -1;
    const rows: SweepRow[] = [];
    while (todo.length) {
      depth++;
      const next: string[] = [];
      for (const id of todo) {
        const entity = this.entityAt(id, p);
        if (!entity) return undefined;
        for (const row of unpackEntity(id, entity, basis.validAt, true)) {
          rows.push(row);
          if (row.value.type === "ref" && !seen.has(row.value.value)) {
            seen.add(row.value.value);
            next.push(row.value.value);
          }
        }
      }
      todo = next;
    }
    return { rows, entities: seen.size, depth };
  }
  get historyBytes(): number {
    return this.retainedBytes;
  }
  image(): ReadImage {
    return {
      floor: this.floor,
      position: this.position,
      valid: this.valid,
      entities: [...this.current].map(([id, x]) => [id, x.from, x.entity]),
      history: [...this.history],
      times: [...this.times],
      timeSafe: this.timeSafe,
      strictRecordClocks: this.strictRecordClocks,
    };
  }
  install(image: ReadImage): void {
    this.current = new Map(image.entities.map(([id, from, entity]) => [id, { from, entity }]));
    this.history = new Map(image.history.map(([id, versions]) => [id, [...versions]]));
    this.retired = [...this.history]
      .flatMap(([id, versions]) => versions.map((version) => ({ id, version })))
      .sort((a, b) => a.version.until - b.version.until);
    this.retiredStart = 0;
    this.retainedBytes = this.retired.reduce((n, x) => n + footprint(x.version.entity), 0);
    this.times = new Map(image.times);
    this.lastTime = Math.max(-Infinity, ...this.times.keys());
    this.timeSafe = image.timeSafe;
    this.strictClocks = image.strictRecordClocks === true;
    this.floor = image.floor;
    this.position = image.position;
    this.valid = image.valid;
  }
}

export async function pullAt<T>(
  index: RecentReads,
  subject: string,
  basis: ReadBasis,
  fallback: () => Promise<T>,
  caughtUpTo?: (p: number, timeoutMs: number) => Promise<void>,
  waitMs = 10,
): Promise<
  | { route: "replica"; waitedMs: number; value: NonNullable<ReturnType<RecentReads["pull"]>> }
  | { route: "fallback"; waitedMs: number; value: T }
> {
  const p = basis.recordedPosition;
  let waitedMs = 0;
  if (p !== undefined && p > index.position && caughtUpTo) {
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        caughtUpTo(p, waitMs),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, waitMs);
        }),
      ]);
    } catch {
      /* fallback retains the exact requested basis */
    } finally {
      clearTimeout(timer);
    }
    waitedMs = performance.now() - start;
  }
  const local = index.pull(subject, basis);
  return local
    ? { route: "replica", waitedMs, value: local }
    : { route: "fallback", waitedMs, value: await fallback() };
}

function sameBytes(a: PackedEntity, b: PackedEntity): boolean {
  const x = new Uint8Array(a.buffer, a.offset ?? 0, a.byteLength ?? a.buffer.byteLength);
  const y = new Uint8Array(b.buffer, b.offset ?? 0, b.byteLength ?? b.buffer.byteLength);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// [DX-R3] Why: reader sidecars consume retained memory too, not only the original entity payload.
// Rejected: a payload-only history budget while contribution/reference metadata remains unaccounted.
function footprint(entity: PackedEntity): number {
  const extra = (entity as PackedEntity & { additionalBytes?: number }).additionalBytes ?? 0;
  if (!Number.isSafeInteger(extra) || extra < 0)
    throw new TypeError("Invalid replica sidecar budget");
  return (entity.byteLength ?? entity.buffer.byteLength) + extra;
}
