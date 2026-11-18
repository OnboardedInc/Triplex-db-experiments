import type { MessagePort } from "node:worker_threads";
import type { ReadRecord } from "./observe.ts";
import type { ReadObservation } from "./read-observation.ts";
import { countReceiptFallback, receiptReadRow, type ReceiptRead } from "./receipt-read.ts";

// [DX-DRV1] Why: the replica isolate keeps capture promises and the spill receives groups of exact observations.
// Rejected: per-receipt callbacks and result retention on the sender, or releasing a credit before the spill accepts it.
export class ReceiptCapture {
  private readonly pending = new Set<Promise<void>>();
  private readonly batches = new Map<number, number>();
  private records: ReadRecord[] = [];
  private serial = 0;
  private received = 0;
  private closing = false;
  private flushed?: () => void;
  private readonly fallbackReasons: Record<string, number> = {};

  constructor(
    port: MessagePort,
    progress: Int32Array,
    now: () => number,
    observe: (input: ReceiptRead) => Promise<ReadObservation>,
  ) {
    this.port = port;
    this.progress = progress;
    this.now = now;
    this.observe = observe;
    this.port.on("message", ({ id }: { id: number }) => {
      const count = this.batches.get(id);
      if (count === undefined) throw Error("Unknown receipt spill acknowledgement");
      this.batches.delete(id);
      Atomics.add(this.progress, 0, count);
      if (this.batches.size === 0) this.flushed?.();
    });
    this.port.on("close", () => {
      if (!this.closing || this.batches.size) throw Error("Receipt spill closed before draining");
    });
  }
  private readonly port: MessagePort;
  private readonly progress: Int32Array;
  private readonly now: () => number;
  private readonly observe: (input: ReceiptRead) => Promise<ReadObservation>;

  add(id: number, input: ReceiptRead) {
    if (this.closing || id !== this.received + 1)
      throw Error("Unexpected receipt capture sequence");
    this.received = id;
    const capture = this.read(input);
    this.pending.add(capture);
    void capture.finally(() => this.pending.delete(capture));
  }

  private async read(input: ReceiptRead) {
    let result: ReadObservation | { error: string };
    try {
      result = await this.observe(input);
      countReceiptFallback(this.fallbackReasons, result);
    } catch (error) {
      result = { error: String((error as { _tag?: string })?._tag ?? "Error") };
    }
    this.records.push(
      receiptReadRow(
        input.subject,
        input.basis,
        input.basis.recordedPosition,
        input.start,
        this.now() - input.start,
        result,
      ),
    );
    if (this.records.length >= 128) this.send();
  }

  private send() {
    if (!this.records.length) return;
    const id = ++this.serial;
    this.batches.set(id, this.records.length);
    this.port.postMessage({ id, records: this.records, samples: [], splitEvents: [] });
    this.records = [];
  }

  async finish(expected: number) {
    this.closing = true;
    if (expected !== this.received) throw Error("Receipt capture drain count differs from sender");
    await Promise.all(this.pending);
    this.send();
    if (this.batches.size)
      await new Promise<void>((resolve) => {
        this.flushed = resolve;
      });
    if (Atomics.load(this.progress, 0) !== expected)
      throw Error("Receipt spill count differs from sender");
    this.port.close();
    return { retained: expected, fallbackReasons: this.fallbackReasons };
  }
}
