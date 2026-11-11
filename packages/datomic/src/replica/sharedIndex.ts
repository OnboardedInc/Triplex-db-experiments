import type { PackedEntity } from "./packed.js";

export interface EntityTable extends Iterable<readonly [string, PackedEntity]> {
  get(id: string): PackedEntity | undefined;
  values(): Iterable<PackedEntity>;
}
export interface SharedIndexImage {
  readonly index: SharedArrayBuffer;
  readonly buffers: readonly SharedArrayBuffer[];
}
const encoder = new TextEncoder(),
  decoder = new TextDecoder();
const hash = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
};
// [DX-R2] Why: immutable entity slices share slab handles, not one SAB wrapper per entity.
// Rejected: a new full-store byte image on every pass (adds 4.7 GB at 100k).
export class Slabs {
  private buffer = new SharedArrayBuffer(0);
  private offset = 0;
  put(entity: PackedEntity): PackedEntity {
    const size = entity.byteLength ?? entity.buffer.byteLength;
    if (this.offset + size > this.buffer.byteLength) {
      this.buffer = new SharedArrayBuffer(Math.max(1 << 20, size));
      this.offset = 0;
    }
    const offset = this.offset;
    new Uint8Array(this.buffer, offset, size).set(
      new Uint8Array(entity.buffer, entity.offset ?? 0, size),
    );
    this.offset += Math.ceil(size / 8) * 8;
    return { buffer: this.buffer, offset, byteLength: size, revision: entity.revision };
  }
}
// [DX-R2] Why: a shared open-addressed index avoids cloning hundreds of thousands of tuples into every worker.
// Rejected: per-worker Maps (multiply retained index objects and UTF-16 strings).
export function shareIndex(table: EntityTable): SharedIndexImage {
  let count = 0,
    textBytes = 0;
  for (const [id] of table) {
    count++;
    textBytes += encoder.encode(JSON.stringify(id)).byteLength;
  }
  let slots = 1;
  while (slots < count * 2) slots *= 2;
  const start = 8 + slots * 4,
    textStart = start + count * 32;
  const index = new SharedArrayBuffer(textStart + textBytes);
  const view = new DataView(index),
    bytes = new Uint8Array(index),
    buckets = new Uint32Array(index, 8, slots);
  view.setUint32(0, slots, true);
  view.setUint32(4, count, true);
  const buffers: SharedArrayBuffer[] = [],
    handles = new Map<SharedArrayBuffer, number>();
  let text = textStart;
  let i = 0;
  for (const [id, e] of table) {
    const textBytes = encoder.encode(JSON.stringify(id));
    let handle = handles.get(e.buffer);
    if (handle === undefined) {
      handle = buffers.length;
      handles.set(e.buffer, handle);
      buffers.push(e.buffer);
    }
    const offset = start + i * 32;
    [text, textBytes.length, handle, e.offset ?? 0, e.byteLength ?? e.buffer.byteLength].forEach(
      (v, j) => view.setUint32(offset + j * 4, v, true),
    );
    view.setFloat64(offset + 24, e.revision, true);
    bytes.set(textBytes, text);
    text += textBytes.length;
    let slot = hash(id) & (slots - 1);
    while (buckets[slot]) slot = (slot + 1) & (slots - 1);
    buckets[slot] = i + 1;
    i++;
  }
  return { index, buffers };
}
export class SharedIndex implements EntityTable {
  private readonly view: DataView;
  private readonly buckets: Uint32Array;
  private readonly start: number;
  constructor(private readonly image: SharedIndexImage) {
    this.view = new DataView(image.index);
    this.buckets = new Uint32Array(image.index, 8, this.view.getUint32(0, true));
    this.start = 8 + this.buckets.length * 4;
  }
  private id(i: number) {
    const offset = this.start + i * 32;
    return JSON.parse(
      decoder.decode(
        new Uint8Array(
          this.image.index,
          this.view.getUint32(offset, true),
          this.view.getUint32(offset + 4, true),
        ),
      ),
    ) as string;
  }
  private entity(i: number): PackedEntity {
    const offset = this.start + i * 32;
    return {
      buffer: this.image.buffers[this.view.getUint32(offset + 8, true)]!,
      offset: this.view.getUint32(offset + 12, true),
      byteLength: this.view.getUint32(offset + 16, true),
      revision: this.view.getFloat64(offset + 24, true),
    };
  }
  get(id: string) {
    let slot = hash(id) & (this.buckets.length - 1);
    while (this.buckets[slot]) {
      const i = this.buckets[slot]! - 1;
      if (this.id(i) === id) return this.entity(i);
      slot = (slot + 1) & (this.buckets.length - 1);
    }
    return undefined;
  }
  *values() {
    for (let i = 0; i < this.view.getUint32(4, true); i++) yield this.entity(i);
  }
  *[Symbol.iterator](): IterableIterator<readonly [string, PackedEntity]> {
    for (let i = 0; i < this.view.getUint32(4, true); i++) yield [this.id(i), this.entity(i)];
  }
}

// [DX-R2] Why: the runtime also retains the compact index; removing worker copies alone leaves 3 GB of Map/SAB metadata at 100k.
// Rejected: keeping the bootstrap Map alive after freezing it into the shared index.
export class OverlayTable implements EntityTable {
  constructor(
    readonly base: EntityTable,
    readonly delta = new Map<string, PackedEntity>(),
  ) {}
  get(id: string) {
    return this.delta.get(id) ?? this.base.get(id);
  }
  has(id: string) {
    return this.get(id) !== undefined;
  }
  set(id: string, entity: PackedEntity) {
    this.delta.set(id, entity);
  }
  *values() {
    for (const [, entity] of this) yield entity;
  }
  *[Symbol.iterator](): IterableIterator<readonly [string, PackedEntity]> {
    for (const entry of this.base) if (!this.delta.has(entry[0])) yield entry;
    yield* this.delta;
  }
}
