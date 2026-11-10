import type { TripleRow } from "@triplex-build/triplex/runtime";

type Entry = { row: TripleRow; previous: Entry | null; next: Entry | null };
// [DX-B3-M4] Why: Map.keys().next() walks deleted slots during a sustained bounded-cache workload.
// Rejected: insertion-ordered Map eviction (first M4 measured 1.96 ms p50 after the ACK).
export class RowCache {
  private readonly entries = new Map<string, Entry>();
  private oldest: Entry | null = null;
  private newest: Entry | null = null;
  constructor(readonly limit = 100000) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Invalid row cache limit");
  }
  get size() {
    return this.entries.size;
  }
  has(id: string) {
    return this.entries.has(id);
  }
  private detach(entry: Entry) {
    if (entry.previous) entry.previous.next = entry.next;
    else this.oldest = entry.next;
    if (entry.next) entry.next.previous = entry.previous;
    else this.newest = entry.previous;
  }
  private promote(entry: Entry) {
    if (this.newest === entry) return;
    this.detach(entry);
    entry.previous = this.newest;
    entry.next = null;
    if (this.newest) this.newest.next = entry;
    else this.oldest = entry;
    this.newest = entry;
  }
  get(id: string): TripleRow | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    this.promote(entry);
    return entry.row;
  }
  set(id: string, row: TripleRow) {
    const existing = this.entries.get(id);
    if (existing) {
      existing.row = row;
      this.promote(existing);
      return;
    }
    const entry: Entry = { row, previous: this.newest, next: null };
    if (this.newest) this.newest.next = entry;
    else this.oldest = entry;
    this.newest = entry;
    this.entries.set(id, entry);
    if (this.entries.size > this.limit) this.delete(this.oldest!.row.id);
  }
  delete(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.detach(entry);
    this.entries.delete(id);
  }
  clear() {
    this.entries.clear();
    this.oldest = this.newest = null;
  }
}
