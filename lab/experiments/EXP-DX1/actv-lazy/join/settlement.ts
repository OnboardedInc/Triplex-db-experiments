import assert from "node:assert/strict";
import { Archive } from "./archive.ts";
import { RecordedNotices } from "./recorded.ts";
import type { JoinedAccount } from "./account.ts";
import type { BulkQueue } from "./bulk.ts";
import { frameMode, type FrameMode } from "./frames.ts";

export class Settlement {
  readonly archive: Archive;
  readonly recorder: RecordedNotices;
  private requested = false;
  private running?: Promise<void>;
  private failure?: unknown;
  private unsubscribe?: () => void;
  private constructor(values: Archive, notices: Archive) {
    this.archive = values;
    this.recorder = new RecordedNotices(notices);
  }
  static async open(
    a: JoinedAccount,
    queue: BulkQueue,
    automatic = false,
    frames: FrameMode = frameMode(),
  ) {
    const values = await Archive.open(a, queue, "values", frames);
    try {
      const worker = new Settlement(values, await Archive.open(a, queue, "notices", frames));
      if (automatic) {
        worker.unsubscribe = a.onNotice(() => worker.wake());
        worker.wake();
      }
      return worker;
    } catch (e) {
      await values.close();
      throw e;
    }
  }
  async settle(sequence: number, elapsedFrom: number = performance.now()) {
    // [DX-ACT1] Why: price the native commit of the exact terminal cursor, and label an adopted cursor as readback. Rejected: choosing the last ACK from any batch or treating completion of verification as durability.
    const timing = (archive: Archive, position: number, seen: number) => {
      const ack = archive.store.counters.lastReceipt;
      const current = ack?.position === position && ack.time >= elapsedFrom && ack.time <= seen;
      return {
        position,
        ms: (current ? ack.time : seen) - elapsedFrom,
        clock: current ? ack.clock : "readback",
        tx: current ? ack.txId : null,
      };
    };
    const store = async () => {
      const state = await this.archive.runValues(sequence);
      const seen = performance.now();
      const row = await this.archive.values(sequence);
      assert(row);
      assert.deepEqual(row.value, state);
      return { state, ...timing(this.archive, row.at, seen) };
    };
    const [values, notices] = await Promise.all([
      store(),
      this.recorder.record(sequence).then((state) => ({
        state,
        ...timing(this.recorder.archive, state.at, performance.now()),
      })),
    ]);
    return { values, notices };
  }
  // [DX-ACT1] Why: a host can wake after a receipt or on restart using native journal state. Rejected: relying on an in-memory task message or polling an idle account.
  wake() {
    this.requested = true;
    if (this.running) return;
    this.running = Promise.resolve()
      .then(() => this.run())
      .catch((e) => {
        this.failure = e;
      })
      .finally(() => {
        this.running = undefined;
        if (this.requested && this.failure === undefined) this.wake();
      });
  }
  private async run() {
    const a = this.archive.source;
    this.failure = undefined;
    while (this.requested) {
      this.requested = false;
      const tail = await a.notices.observe(),
        c = await a.s.controls(await a.s.head());
      if (!tail.value.sequence) continue;
      const record = this.recorder.record(tail.value.sequence);
      const values = async () => {
        for (const r of c.releases
          .filter((r) => r.storage === "owed")
          .sort((l, r) => l.tx - r.tx)) {
          const state = await this.archive.values(r.seq);
          if (!state || state.value.status === "pending") await this.archive.runValues(r.seq);
        }
      };
      const results = await Promise.allSettled([record, values()]);
      for (const r of results) if (r.status === "rejected") throw r.reason;
      // [DX-ACT1] Why: another publisher may have appended debt during this run. Rejected: waiting for a local callback from a foreign process or polling after the worker is idle.
      if ((await a.notices.observe()).value.sequence > tail.value.sequence) this.requested = true;
    }
  }
  async idle() {
    while (this.running) await this.running;
    if (this.failure) throw this.failure;
  }
  async close() {
    this.unsubscribe?.();
    try {
      await this.idle();
    } finally {
      await Promise.all([this.archive.close(), this.recorder.archive.close()]);
    }
  }
}
