import type { PullResult } from "./composition.ts";
const lazyRows = (read: () => PullResult["triples"]) => {
  let rows: PullResult["triples"] | undefined;
  return () => rows ??= read();
};
type Entry = { from: number; to: number; value: PullResult; held: readonly (readonly [object, number])[]; bytes: number };
// [DX-R3-P8] Why: an immutable world at one exact cut is unchanged throughout the intersection of its row intervals.
// Rejected: root-revision keys (miss independently changed children), millisecond rounding, or retaining unbounded old slabs.
export class CutCache {
  private entries = new Map<string, Entry>();
  private references = new Map<object, { count: number; bytes: number }>();
  readonly diagnostics = { hits: 0, misses: 0, evictions: 0, bytes: 0, entries: 0 };
  readonly maxBytes: number;
  constructor(maxBytes = 96 * 1024 ** 2) { this.maxBytes = maxBytes; }
  private key(root: string, position: number) { return `${root.length}:${root}@${position}`; }
  get(root: string, position: number, validAt: number, waitedMs: number): PullResult | undefined {
    const key = this.key(root, position), entry = this.entries.get(key);
    if (!entry || validAt < entry.from || validAt >= entry.to) { this.diagnostics.misses++; return; }
    this.entries.delete(key); this.entries.set(key, entry); this.diagnostics.hits++;
    return Object.create(Object.getPrototypeOf(entry.value), { ...Object.getOwnPropertyDescriptors(entry.value),
      waitedMs: { value: waitedMs, enumerable: true, writable: true, configurable: true },
      triples: { get: lazyRows(Object.getOwnPropertyDescriptor(entry.value, "triples")!.get as () => PullResult["triples"]), enumerable: true, configurable: true } });
  }
  put(root: string, position: number, from: number, to: number, value: PullResult, held: readonly (readonly [object, number])[], readTriples: () => PullResult["triples"]) {
    if (!this.maxBytes || !(from < to) || !value.observation) return;
    const key = this.key(root, position);
    if (this.entries.has(key)) this.remove(key);
    // [DX-R3-P8] Why: consumers may alter their result wrapper; the cached certificate remains private and immutable.
    // Rejected: returning the cache's own mutable summary or spreading a lazy result (materializes triples).
    const stored = Object.create(Object.getPrototypeOf(value), { ...Object.getOwnPropertyDescriptors(value),
      observation: { value: Object.freeze({ ...value.observation }), enumerable: true, writable: false, configurable: false },
      triples: { get: readTriples, enumerable: true, configurable: true } });
    const bytes = 1024 + key.length * 2 + held.length * 128;
    this.diagnostics.bytes += bytes;
    for (const [object, size] of held) {
      const ref = this.references.get(object);
      if (ref) ref.count++;
      else { this.references.set(object, { count: 1, bytes: size }); this.diagnostics.bytes += size; }
    }
    this.entries.set(key, { from, to, value: stored, held, bytes });
    while (this.entries.size > 2048 || this.diagnostics.bytes > this.maxBytes) {
      this.remove(this.entries.keys().next().value!); this.diagnostics.evictions++;
    }
    this.diagnostics.entries = this.entries.size;
  }
  private remove(key: string) {
    const entry = this.entries.get(key)!; this.entries.delete(key); this.diagnostics.bytes -= entry.bytes;
    for (const [object] of entry.held) {
      const ref = this.references.get(object)!;
      if (--ref.count === 0) { this.references.delete(object); this.diagnostics.bytes -= ref.bytes; }
    }
  }
  clear() { this.entries.clear(); this.references.clear(); this.diagnostics.bytes = 0; this.diagnostics.entries = 0; }
}
