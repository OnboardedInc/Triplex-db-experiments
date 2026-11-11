import { R, type ReadRecord } from "./observe.ts";

export interface ObservationRecords extends Iterable<ReadRecord> {
  readonly length: number;
  push(...values: ReadRecord[]): number;
  forEach(fn: (record: ReadRecord, index: number) => void): void;
  map<T>(fn: (record: ReadRecord, index: number) => T): T[];
  filter(fn: (record: ReadRecord, index: number) => unknown): ReadRecord[];
  find(fn: (record: ReadRecord, index: number) => unknown): ReadRecord | undefined;
}
const WIDTH = R.waitedMs + 1;
const CHUNK = 4096;
const text = new Set<number>([R.digest, R.error, R.route, R.language]);
// [DX-R3] Why: retain every observation losslessly without millions of boxed JS tuple fields.
// Rejected: sampling reads, online judging before late ACKs, or retaining duplicate digest/route strings.
export class ReadRecords implements ObservationRecords {
  private chunks: Float64Array[] = [];
  private strings: (string | null)[] = [null];
  private ids = new Map<string, number>();
  private count = 0;
  get length() {
    return this.count;
  }
  get encodedBytes() {
    return this.chunks.length * CHUNK * WIDTH * 8;
  }
  get stringCount() {
    return this.strings.length - 1;
  }
  private intern(value: string | null): number {
    if (value === null) return 0;
    let id = this.ids.get(value);
    if (id === undefined) {
      id = this.strings.length;
      this.strings.push(value);
      this.ids.set(value, id);
    }
    return id;
  }
  push(...values: ReadRecord[]): number {
    for (const value of values) {
      if (value.length !== WIDTH) throw Error("Read observation width mismatch");
      const index = this.count++,
        chunk = Math.floor(index / CHUNK),
        offset = (index % CHUNK) * WIDTH;
      const data = this.chunks[chunk] ?? (this.chunks[chunk] = new Float64Array(CHUNK * WIDTH));
      for (let col = 0; col < WIDTH; col++)
        data[offset + col] = text.has(col)
          ? this.intern(value[col] as string | null)
          : (value[col] as number);
    }
    return this.count;
  }
  private row(index: number): ReadRecord {
    const data = this.chunks[Math.floor(index / CHUNK)]!,
      offset = (index % CHUNK) * WIDTH;
    const row: any[] = Array.from({ length: WIDTH });
    for (let col = 0; col < WIDTH; col++) {
      const value = data[offset + col]!;
      row[col] = text.has(col) ? this.strings[value] : value;
    }
    return row as ReadRecord;
  }
  *[Symbol.iterator](): IterableIterator<ReadRecord> {
    for (let i = 0, n = this.count; i < n; i++) yield this.row(i);
  }
  forEach(fn: (record: ReadRecord, index: number) => void): void {
    for (let i = 0, n = this.count; i < n; i++) fn(this.row(i), i);
  }
  map<T>(fn: (record: ReadRecord, index: number) => T): T[] {
    const result = Array.from({ length: this.count }) as T[];
    this.forEach((row, index) => {
      result[index] = fn(row, index);
    });
    return result;
  }
  filter(fn: (record: ReadRecord, index: number) => unknown): ReadRecord[] {
    const result: ReadRecord[] = [];
    this.forEach((row, index) => {
      if (fn(row, index)) result.push(row);
    });
    return result;
  }
  find(fn: (record: ReadRecord, index: number) => unknown): ReadRecord | undefined {
    for (let i = 0, n = this.count; i < n; i++) {
      const row = this.row(i);
      if (fn(row, i)) return row;
    }
    return undefined;
  }
}
