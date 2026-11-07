/**
 * The frozen writer trace (TARGETS section 2 and section 2.1, v2), as a deterministic event list.
 *
 * Offer schedule: open-loop Poisson arrivals at the steady rate (15 facts/s); bursts at 50x for 60 s
 * starting at 120 s + k x 600 s of trace time (trace time 0 is the start of the measured window), the
 * same for baselines and candidates.
 * Subjects: an active set of 2% of the rung. 95% of commands pick from the active set with Zipf
 * s = 1.1 over a seeded ranking of its slots; 5% pick uniformly from all subjects. A subject leaves its
 * slot 2,000 s after it entered (initial entries staggered over the previous 2,000 s) and a seeded draw
 * from the inactive subjects replaces it.
 * Sizes: 60% 5-10 facts, 30% 11-25, 10% 26-50, uniform inside a band. Writer mix by command count:
 * people 40, systems 30, agents 10, runtime 20. 10% of system signals are re-sent with the same
 * commandId 0.5-5 s later; 1% of commands lose their ACK; 1% are valid-time corrections 30 days back.
 *
 * Events carry `stream`: "background" for this trace. Overlays (golden scenarios, the P1 split-read
 * commits, the P2 10-fact probe, history growth) are other streams, added on top and accounted for
 * separately; they never replace background commands.
 * The same (seed, subjects, durationS, params) always gives byte-identical events (`traceDigest`); the
 * driver binds the sha256 of this file and of world.ts as the generator source hash.
 */
import { Rng, hash2, seedOf } from "./rng.ts";

export interface TraceParams {
  readonly steadyFactsPerS: number;
  readonly burstMultiplier: number;
  readonly burstDurationS: number;
  readonly burstPeriodS: number;
  readonly firstBurstAtS: number;
  readonly sizeClasses: readonly { readonly share: number; readonly min: number; readonly max: number }[];
  readonly writerMix: readonly { readonly kind: string; readonly share: number }[];
  readonly systemDuplicateRate: number;
  readonly duplicateDelayMs: readonly [number, number];
  readonly ackLossRate: number;
  readonly correctionRate: number;
  readonly correctionBackMs: number;
  readonly activeShare: number;
  readonly activePickShare: number;
  readonly zipfS: number;
  readonly residencyS: number;
}
export const TRACE_DEFAULTS: TraceParams = {
  steadyFactsPerS: 15,
  burstMultiplier: 50,
  burstDurationS: 60,
  burstPeriodS: 600,
  firstBurstAtS: 120,
  sizeClasses: [
    { share: 0.6, min: 5, max: 10 },
    { share: 0.3, min: 11, max: 25 },
    { share: 0.1, min: 26, max: 50 },
  ],
  writerMix: [
    { kind: "person", share: 0.4 },
    { kind: "system", share: 0.3 },
    { kind: "agent", share: 0.1 },
    { kind: "runtime", share: 0.2 },
  ],
  systemDuplicateRate: 0.1,
  duplicateDelayMs: [500, 5000],
  ackLossRate: 0.01,
  correctionRate: 0.01,
  correctionBackMs: 30 * 86_400_000,
  activeShare: 0.02,
  activePickShare: 0.95,
  zipfS: 1.1,
  residencyS: 2000,
};
export type WriterKind = "person" | "system" | "agent" | "runtime";

export interface TraceEvent {
  /** Unique per stream, increasing in original-command order; a re-send carries its original's seq. */
  readonly seq: number;
  /** Scheduled offer time, ms from trace start. */
  readonly atMs: number;
  readonly kind: WriterKind;
  readonly subject: number;
  /** Facts the command asserts (5 to 50). */
  readonly facts: number;
  readonly correction: boolean;
  readonly ackLoss: boolean;
  /** True for a duplicate re-send of command `seq`. */
  readonly resend: boolean;
  readonly burst: boolean;
  /** True when the subject was drawn from the active set (else uniform). */
  readonly active: boolean;
  readonly stream: string;
}

export const meanCommandFacts = (p: TraceParams = TRACE_DEFAULTS) =>
  p.sizeClasses.reduce((sum, c) => sum + c.share * ((c.min + c.max) / 2), 0);

export const inBurst = (tS: number, p: TraceParams = TRACE_DEFAULTS) =>
  tS >= p.firstBurstAtS && (tS - p.firstBurstAtS) % p.burstPeriodS < p.burstDurationS;

/** Rate segments (start s, end s, facts/s) covering [0, durationS). */
export function segments(durationS: number, p: TraceParams = TRACE_DEFAULTS) {
  const cuts = new Set<number>([0, durationS]);
  for (let t = p.firstBurstAtS; t < durationS; t += p.burstPeriodS) {
    cuts.add(t);
    if (t + p.burstDurationS < durationS) cuts.add(t + p.burstDurationS);
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  return sorted.slice(0, -1).map((start, k) => {
    const end = sorted[k + 1]!;
    const burst = inBurst(start, p);
    return { start, end, burst, factsPerS: p.steadyFactsPerS * (burst ? p.burstMultiplier : 1) };
  });
}

/** Cumulative Zipf(s) distribution over ranks 1..n. */
export function zipfCdf(n: number, s: number): Float64Array {
  const cdf = new Float64Array(n);
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += 1 / k ** s;
  let acc = 0;
  for (let k = 1; k <= n; k++) { acc += 1 / k ** s / sum; cdf[k - 1] = acc; }
  cdf[n - 1] = 1;
  return cdf;
}
const searchCdf = (cdf: Float64Array, u: number) => {
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid]! < u) lo = mid + 1; else hi = mid; }
  return lo;
};

/** The active set over time: slots, residency and seeded replacement (TARGETS 2.1 item 1). */
export class ActiveSet {
  readonly size: number;
  readonly slots: Int32Array;
  private readonly members = new Set<number>();
  private readonly queue: { slot: number; leaveAtS: number }[] = [];
  private head = 0;
  private readonly rng: Rng;
  private readonly subjects: number;
  private readonly residencyS: number;
  replacements = 0;
  constructor(seed: string, subjects: number, p: TraceParams = TRACE_DEFAULTS) {
    this.subjects = subjects;
    this.residencyS = p.residencyS;
    this.size = Math.max(1, Math.round(p.activeShare * subjects));
    this.rng = new Rng(seedOf(`active:${seed}`));
    this.slots = new Int32Array(this.size);
    const entries: { slot: number; leaveAtS: number }[] = [];
    for (let k = 0; k < this.size; k++) {
      this.slots[k] = this.draw();
      entries.push({ slot: k, leaveAtS: this.residencyS - this.rng.next() * this.residencyS });
    }
    entries.sort((a, b) => a.leaveAtS - b.leaveAtS || a.slot - b.slot);
    this.queue.push(...entries);
  }
  private draw(): number {
    if (this.members.size >= this.subjects) return this.rng.int(this.subjects);
    for (;;) {
      const i = this.rng.int(this.subjects);
      if (!this.members.has(i)) { this.members.add(i); return i; }
    }
  }
  /** Apply every departure due at or before t (seconds). */
  advance(tS: number): void {
    while (this.head < this.queue.length && this.queue[this.head]!.leaveAtS <= tS) {
      const { slot, leaveAtS } = this.queue[this.head++]!;
      this.members.delete(this.slots[slot]!);
      this.slots[slot] = this.draw();
      this.replacements++;
      this.queue.push({ slot, leaveAtS: leaveAtS + this.residencyS });
    }
    if (this.head > 100_000) { this.queue.splice(0, this.head); this.head = 0; }
  }
  has(i: number) { return this.members.has(i); }
}

export function generateTrace(opts: { seed: string; subjects: number; durationS: number; params?: TraceParams }): TraceEvent[] {
  const p = opts.params ?? TRACE_DEFAULTS;
  const rng = new Rng(seedOf(`trace:${opts.seed}`));
  const active = new ActiveSet(opts.seed, opts.subjects, p);
  const cdf = zipfCdf(active.size, p.zipfS);
  const mean = meanCommandFacts(p);
  const events: TraceEvent[] = [];
  let seq = 0;
  for (const seg of segments(opts.durationS, p)) {
    const rate = seg.factsPerS / mean; // commands per second
    let t = seg.start + rng.exp(rate);
    while (t < seg.end) {
      active.advance(t);
      const u = rng.next();
      let acc = 0;
      let cls = p.sizeClasses[p.sizeClasses.length - 1]!;
      for (const c of p.sizeClasses) if (u < (acc += c.share)) { cls = c; break; }
      const facts = cls.min + rng.int(cls.max - cls.min + 1);
      const w = rng.next();
      let kindAcc = 0;
      let kind: WriterKind = "runtime";
      for (const m of p.writerMix) if (w < (kindAcc += m.share)) { kind = m.kind as WriterKind; break; }
      const fromActive = rng.next() < p.activePickShare;
      const subject = fromActive ? active.slots[searchCdf(cdf, rng.next())]! : rng.int(opts.subjects);
      const correction = rng.next() < p.correctionRate;
      const ackLoss = rng.next() < p.ackLossRate;
      const duplicate = kind === "system" && rng.next() < p.systemDuplicateRate;
      const delay = p.duplicateDelayMs[0] + rng.next() * (p.duplicateDelayMs[1] - p.duplicateDelayMs[0]);
      const atMs = Math.round(t * 1e6) / 1000; // microsecond resolution
      const base = { seq: seq++, kind, subject, facts, correction, ackLoss, burst: seg.burst, active: fromActive, stream: "background" };
      events.push({ ...base, atMs, resend: false });
      if (duplicate && atMs + delay < opts.durationS * 1000)
        events.push({ ...base, atMs: Math.round((atMs + delay) * 1000) / 1000, ackLoss: false, resend: true });
      t += rng.exp(rate);
    }
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  return events;
}

export function traceDigest(events: readonly TraceEvent[]): string {
  let a = 0, b = 0;
  for (const e of events) {
    const [x, y] = hash2(`${e.stream}|${e.seq}|${e.atMs}|${e.kind}|${e.subject}|${e.facts}|${+e.correction}${+e.ackLoss}${+e.resend}${+e.burst}${+e.active}`);
    a = (Math.imul(a, 31) + x) >>> 0;
    b = (Math.imul(b, 37) + y) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

export function traceStats(events: readonly TraceEvent[]) {
  const originals = events.filter((e) => !e.resend);
  const facts = originals.reduce((s, e) => s + e.facts, 0);
  const byKind: Record<string, number> = {};
  for (const e of originals) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  return {
    commands: originals.length,
    resends: events.length - originals.length,
    facts,
    corrections: originals.filter((e) => e.correction).length,
    ackLoss: originals.filter((e) => e.ackLoss).length,
    burstCommands: originals.filter((e) => e.burst).length,
    activeShare: originals.length ? originals.filter((e) => e.active).length / originals.length : 0,
    distinctSubjects: new Set(originals.map((e) => e.subject)).size,
    byKind,
  };
}
