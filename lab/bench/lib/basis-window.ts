import { Histogram } from "./hist.ts";

export interface SuffixDelta<T> {
  from: number | null;
  start: number;
  end: number;
  reset: boolean;
  added: T[];
}

// [DX-T1-6] Why: keep exactly the existing acknowledged-receipt suffix without cloning 2,000 old receipts every 100 ms.
// Rejected: sampling fewer bases or changing their order/retention (would change the reader workload).
export function suffixDelta<T>(window: readonly T[], total: number, previous: number | null): SuffixDelta<T> {
  if (!Number.isSafeInteger(total) || total < window.length || (previous !== null && (!Number.isSafeInteger(previous) || previous < 0 || previous > total)))
    throw Error("Invalid basis suffix cursor");
  const start = total - window.length;
  const reset = previous === null || previous < start;
  return { from: previous, start, end: total, reset, added: window.slice(reset ? 0 : previous! - start) };
}

export class BasisWindow<T> {
  private start = 0;
  private end: number | null = null;
  private values: T[] = [];
  apply(delta: SuffixDelta<T>): T[] {
    if (![delta.start, delta.end].every(Number.isSafeInteger) || delta.start < 0 || delta.end < delta.start ||
        delta.from !== this.end || (this.end !== null && (delta.end < this.end || delta.start < this.start)))
      throw Error("Missing, stale or reordered basis delta");
    if (delta.reset) {
      if (delta.added.length !== delta.end - delta.start || (this.end !== null && this.end >= delta.start))
        throw Error("Invalid basis reset");
      this.values = delta.added.slice();
    } else {
      if (this.end === null || delta.start > this.end || delta.added.length !== delta.end - this.end)
        throw Error("Invalid basis append");
      this.values.splice(0, delta.start - this.start);
      this.values.push(...delta.added);
      if (this.values.length !== delta.end - delta.start) throw Error("Basis suffix length mismatch");
    }
    this.start = delta.start;
    this.end = delta.end;
    return this.values;
  }
}

// [DX-T1-6] Why: claimed message/latency savings must reproduce from this attempt's actual writer-thread intervals.
// Rejected: trusting a cached summary counter or an earlier run's matching-looking histogram.
export function validateBasisBroadcast(report: any, events: any[], manifest: any, endedAt: number): void {
  const histogram = new Histogram();
  let messages = 0, items = 0;
  if (!report || !events.length || !["snapshot", "delta"].includes(report.mode)) throw Error("Missing basis broadcast evidence");
  for (const e of events) {
    const a = e.attributes;
    if (e.type !== "event" || e.name !== "driver.reader-basis.broadcast" || e.run !== manifest.tag || e.source !== manifest.source || e.slot !== manifest.slot || e.thread !== 0 ||
        !Number.isFinite(e.start) || !Number.isFinite(e.end) || e.start < manifest.startedAt || e.end > endedAt || e.end < e.start ||
        a?.mode !== report.mode || ![a.workers, a.added, a.window].every((v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0) ||
        a.added > a.window || (a.mode === "snapshot" && a.added !== a.window) || !Number.isFinite(a.wallMs) || a.wallMs < 0 || a.wallMs > e.end - e.start + 0.1)
      throw Error("Foreign, stale or invalid basis broadcast");
    messages += a.workers; items += a.workers * a.added; histogram.recordMs(a.wallMs);
  }
  if (report.ticks !== events.length || report.messages !== messages || report.ackItems !== items || JSON.stringify(report.wall) !== JSON.stringify(histogram.summary()))
    throw Error("Basis broadcast summary differs from observed intervals");
}
