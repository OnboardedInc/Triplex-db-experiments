import fs from "node:fs";
import path from "node:path";
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
  private activeChunk = -1;
  private active: Float64Array | undefined;
  private loaded: { chunk: number; data: Float64Array; strings: (string | null)[] } | undefined;
  private flushedStrings = 0;
  private phases = new Map<number, Set<number>>();
  readonly directory: string | undefined;
  // [DX-R3] Why: full ladders retain tens of millions of exact observations until all late ACKs settle.
  // Rejected: sampling, online final judgments, or keeping the whole numeric log in client memory.
  constructor(directory?: string, resume = false) {
    this.directory = directory;
    if (!directory) return;
    if (!resume) fs.mkdirSync(directory);
    else {
      const state = JSON.parse(fs.readFileSync(path.join(directory, "state.json"), "utf8"));
      if (state.width !== WIDTH || !Number.isSafeInteger(state.count) || state.count < 0)
        throw Error("Invalid observation spill state");
      this.count = state.count;
      this.flushedStrings = state.flushedStrings;
      if (this.count) {
        this.activeChunk = Math.floor((this.count - 1) / CHUNK);
        const loaded = this.load(this.activeChunk);
        this.active = loaded.data;
        this.strings = loaded.strings;
        this.ids = new Map(this.strings.slice(1).map((s, i) => [s!, i + 1]));
      }
    }
  }
  private load(chunk: number) {
    const data = new Float64Array(CHUNK * WIDTH);
    const fd = fs.openSync(path.join(this.directory!, `${chunk}.f64`), "r");
    try {
      let offset = 0;
      const bytes = new Uint8Array(data.buffer);
      while (offset < bytes.length) {
        const n = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
        if (!n) throw Error("Truncated observation spill");
        offset += n;
      }
    } finally { fs.closeSync(fd); }
    const strings = JSON.parse(fs.readFileSync(path.join(this.directory!, `${chunk}.json`), "utf8"));
    return { chunk, data, strings };
  }
  private flushChunk() {
    if (!this.directory || !this.active) return;
    // [DX-R3] Why: a kill during the next checkpoint must leave the preceding committed prefix readable.
    // Rejected: truncating the active chunk in place before state.json advances.
    for (const [name, bytes] of [
      [`${this.activeChunk}.f64`, new Uint8Array(this.active.buffer)],
      [`${this.activeChunk}.json`, JSON.stringify(this.strings)],
    ] as const) {
      const file = path.join(this.directory, name);
      fs.writeFileSync(file + ".tmp", bytes);
      fs.renameSync(file + ".tmp", file);
    }
  }
  checkpoint() {
    if (!this.directory) return;
    this.flushChunk();
    const state = path.join(this.directory, "state.json");
    fs.writeFileSync(state + ".tmp", JSON.stringify({ width: WIDTH, count: this.count, flushedStrings: this.flushedStrings }));
    fs.renameSync(state + ".tmp", state);
  }
  dispose() {
    // [DX-R3] Why: only a fully checked, saved report makes raw observations unnecessary for the bars/oracle.
    // Rejected: deleting the spill on exceptions (a killed run must keep completed phase data).
    if (this.directory) fs.rmSync(this.directory, { recursive: true });
  }
  get residentBytes() {
    return this.directory ? (this.active?.byteLength ?? 0) + (this.loaded?.data.byteLength ?? 0) : this.encodedBytes;
  }
  get length() {
    return this.count;
  }
  get encodedBytes() {
    return Math.ceil(this.count / CHUNK) * CHUNK * WIDTH * 8;
  }
  get stringCount() {
    return this.flushedStrings + this.strings.length - 1;
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
      let data: Float64Array;
      if (this.directory) {
        if (chunk !== this.activeChunk) {
          this.flushChunk();
          this.flushedStrings += this.strings.length - 1;
          this.strings = [null];
          this.ids.clear();
          this.activeChunk = chunk;
          this.active = new Float64Array(CHUNK * WIDTH);
        }
        data = this.active!;
      } else data = this.chunks[chunk] ?? (this.chunks[chunk] = new Float64Array(CHUNK * WIDTH));
      const phase = value[R.phase];
      (this.phases.get(phase) ?? this.phases.set(phase, new Set()).get(phase)!).add(chunk);
      for (let col = 0; col < WIDTH; col++)
        data[offset + col] = text.has(col)
          ? this.intern(value[col] as string | null)
          : (value[col] as number);
    }
    return this.count;
  }
  private row(index: number): ReadRecord {
    const chunk = Math.floor(index / CHUNK), offset = (index % CHUNK) * WIDTH;
    let data: Float64Array, strings = this.strings;
    if (!this.directory) data = this.chunks[chunk]!;
    else if (chunk === this.activeChunk) data = this.active!;
    else {
      if (this.loaded?.chunk !== chunk) this.loaded = this.load(chunk);
      data = this.loaded.data;
      strings = this.loaded.strings;
    }
    const row: any[] = Array.from({ length: WIDTH });
    for (let col = 0; col < WIDTH; col++) {
      const value = data[offset + col]!;
      row[col] = text.has(col) ? strings[value] : value;
    }
    return row as ReadRecord;
  }
  *[Symbol.iterator](): IterableIterator<ReadRecord> {
    for (let i = 0, n = this.count; i < n; i++) yield this.row(i);
  }
  forEach(fn: (record: ReadRecord, index: number) => void): void {
    for (let i = 0, n = this.count; i < n; i++) fn(this.row(i), i);
  }
  forPhase(phase: number, fn: (record: ReadRecord, index: number) => void): void {
    const chunks = this.phases.get(phase);
    if (!chunks) { this.forEach((r, k) => { if (r[R.phase] === phase) fn(r, k); }); return; }
    for (const chunk of chunks)
      for (let k = chunk * CHUNK, end = Math.min(this.count, (chunk + 1) * CHUNK); k < end; k++) {
        const row = this.row(k);
        if (row[R.phase] === phase) fn(row, k);
      }
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
