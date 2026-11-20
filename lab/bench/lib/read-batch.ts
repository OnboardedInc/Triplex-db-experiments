import { R, type ReadRecord } from "./observe.ts";

const WIDTH = R.waitedMs + 1;
const TEXT_COLUMNS = new Set<number>([R.digest, R.error, R.route, R.language]);
export const READ_BATCH_SIZE = 1024;
export type PackedReadBatch = { values: Float64Array<ArrayBuffer>; strings: (string | null)[] };

// [DX-RD1] Why: transfer the numeric rows and intern their strings once per batch.
// Rejected: structured-cloning every boxed tuple or rounding clocks and latencies to fit.
export class ReadBatch {
  private values = new Float64Array(READ_BATCH_SIZE * WIDTH);
  private readonly free: Float64Array<ArrayBuffer>[] = [];
  private strings: (string | null)[] = [null];
  private ids = new Map<string, number>();
  length = 0;

  push(row: ReadRecord): void {
    const offset = this.length++ * WIDTH;
    if (offset >= this.values.length) throw Error("Read batch exceeded its capacity");
    for (let col = 0; col < WIDTH; col++) {
      const field = row[col]!;
      if (!TEXT_COLUMNS.has(col)) this.values[offset + col] = field as number;
      else if (field === null) this.values[offset + col] = 0;
      else {
        const value = field as string;
        let id = this.ids.get(value);
        if (id === undefined) {
          id = this.strings.length;
          this.strings.push(value);
          this.ids.set(value, id);
        }
        this.values[offset + col] = id;
      }
    }
  }

  take(): PackedReadBatch {
    const batch = { values: this.values.subarray(0, this.length * WIDTH), strings: this.strings };
    this.values = this.free.pop() ?? new Float64Array(READ_BATCH_SIZE * WIDTH);
    this.strings = [null];
    this.ids.clear();
    this.length = 0;
    return batch;
  }

  recycle(buffer: ArrayBuffer) {
    if (buffer.byteLength !== READ_BATCH_SIZE * WIDTH * 8 || this.free.length >= 2)
      throw Error("Invalid returned observation buffer");
    this.free.push(new Float64Array(buffer));
  }
}

export function* unpackReadBatch(batch: PackedReadBatch): Iterable<ReadRecord> {
  if (batch.values.length % WIDTH || batch.strings[0] !== null)
    throw Error("Invalid packed read batch");
  for (let offset = 0; offset < batch.values.length; offset += WIDTH) {
    const row = new Array<number | string | null>(WIDTH);
    for (let col = 0; col < WIDTH; col++) {
      const value = batch.values[offset + col]!;
      const field = TEXT_COLUMNS.has(col) ? batch.strings[value] : value;
      if (field === undefined) throw Error("Invalid read batch string index");
      row[col] = field;
    }
    yield row as ReadRecord;
  }
}
