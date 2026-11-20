import { Archive } from "./archive.ts";
import { RecordedNotices } from "./recorded.ts";
import type { JoinedAccount } from "./account.ts";
import type { BulkQueue } from "./bulk.ts";

export class Settlement {
  readonly archive: Archive;
  readonly recorder: RecordedNotices;
  private requested = false;
  private running?: Promise<void>;
  private failure?: unknown;
  private constructor(values: Archive, notices: Archive) {
    this.archive = values;
    this.recorder = new RecordedNotices(notices);
  }
  static async open(a: JoinedAccount, queue: BulkQueue) {
    const values = await Archive.open(a, queue);
    try {
      return new Settlement(values, await Archive.open(a, queue, "notices"));
    } catch (e) {
      await values.close();
      throw e;
    }
  }
  async settle(sequence: number, elapsedFrom: number = performance.now()) {
    const [values, notices] = await Promise.all([
      this.archive
        .runValues(sequence)
        .then((state) => ({ state, ms: performance.now() - elapsedFrom })),
      this.recorder
        .record(sequence)
        .then((state) => ({ state, ms: performance.now() - elapsedFrom })),
    ]);
    return { values, notices };
  }
  // [DX-ACT1] Why: a host can wake after a receipt or on restart using native journal state. Rejected: relying on an in-memory task message or polling an idle account.
  wake() {
    this.requested = true;
    if (this.running) return;
    this.running = this.run()
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
    }
  }
  async idle() {
    while (this.running) await this.running;
    if (this.failure) throw this.failure;
  }
  async close() {
    try {
      await this.idle();
    } finally {
      await Promise.all([this.archive.close(), this.recorder.archive.close()]);
    }
  }
}
