import { Histogram } from "./hist.ts";
import { traceNow, traceWork, withoutTrace } from "./tracing.ts";

type Key = { source: string; stream: string; epoch: string; position: string };
type Writer = {
  capture(key: Key, id: string): unknown;
  persistCaptured(token: any): Key & { publicationId: string; recordId: string; atNs: string };
};
const keyOf = (key: Key) => JSON.stringify([key.source, key.stream, key.epoch, key.position]);

// [DX-T1-5] Why: capture at native publication, then persist the apparatus witness after the existing finishedAt boundary.
// Rejected: recapturing time in a later callback, moving the latency timestamp, or declaring a run valid with pending/failed writes.
export class DeferredPublications {
  private readonly entries = new Map<
    string,
    {
      key: Key;
      id: string;
      token: unknown;
      at: number;
      traceId: string | null;
      scheduled: boolean;
      finishedAt?: number;
    }
  >();
  private readonly pending = new Set<Promise<void>>();
  private readonly delays = new Histogram();
  private readonly storage = new Histogram();
  private persisted = 0;
  private failure: unknown;
  constructor(
    private readonly writer: Writer,
    private readonly readBack: (key: Key) => unknown,
  ) {}
  capture(key: Key, id: string, traceId: string | null, held: boolean) {
    const k = keyOf(key),
      prior = this.entries.get(k);
    if (prior) {
      if (prior.id !== id) throw Error("Deferred publication identity mismatch");
      return;
    }
    const at = traceNow(),
      token = this.writer.capture(key, id);
    this.entries.set(k, { key: { ...key }, id, token, at, traceId, scheduled: false });
    if (!held) this.release(key);
  }
  release(key: Key, finishedAt?: number) {
    const entry = this.entries.get(keyOf(key));
    if (!entry || entry.scheduled) return;
    if (finishedAt !== undefined && !Number.isFinite(finishedAt))
      throw Error("Invalid publication completion boundary");
    entry.finishedAt = finishedAt;
    entry.scheduled = true;
    // [DX-T1-5] Why: completed request contexts must not collect a child span after their recorder has drained.
    // Rejected: dropping deferred SQLite work; retain every interval as a thread overlay with its causing trace ID.
    withoutTrace(() => {
      const p = new Promise<void>((resolve) =>
        setImmediate(() => {
          const start = traceNow();
          try {
            if (entry.finishedAt !== undefined && start < entry.finishedAt)
              throw Error("Witness started before measured completion");
            traceWork(
              "driver.publication.persist-deferred",
              () => {
                const record = this.writer.persistCaptured(entry.token);
                const actual = this.readBack(entry.key);
                if (
                  keyOf(record) !== keyOf(entry.key) ||
                  record.publicationId !== entry.id ||
                  !/^[a-f0-9]{64}$/.test(record.recordId) ||
                  !/^(0|[1-9][0-9]*)$/.test(record.atNs) ||
                  JSON.stringify(actual) !== JSON.stringify(record)
                )
                  throw Error("Deferred publication record/readback binding mismatch");
              },
              {
                commitTraceId: entry.traceId,
                position: entry.key.position,
                operationId: entry.id,
                finishedAt: entry.finishedAt ?? null,
              },
              true,
            );
            this.persisted++;
            this.delays.recordMs(traceNow() - entry.at);
            this.storage.recordMs(traceNow() - start);
          } catch (error) {
            this.failure ??= error;
          } finally {
            this.pending.delete(p);
            resolve();
          }
        }),
      );
      this.pending.add(p);
    });
  }
  async flush() {
    for (const entry of this.entries.values()) this.release(entry.key);
    while (this.pending.size) await Promise.all(this.pending);
    if (this.failure) throw this.failure;
    if (this.persisted !== this.entries.size)
      throw Error("Incomplete deferred publication witnesses");
    return {
      captured: this.entries.size,
      persisted: this.persisted,
      pending: this.pending.size,
      captureToDurable: this.delays.summary(),
      storage: this.storage.summary(),
    };
  }
}
