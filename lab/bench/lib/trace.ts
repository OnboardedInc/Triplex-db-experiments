/**
 * The fixed writer trace of TARGETS section 2, as a deterministic event list.
 *
 * Rate: steady 15 facts/s; bursts at 50x (750 facts/s) for 60 s every 600 s, first burst at
 * `firstBurstAtS` of trace time. Command sizes: 60% 5-10 facts, 30% 11-25, 10% 26-50 (uniform inside
 * a class). Writer mix by command count: people 40, systems 30, agents 10, runtime 20. 10% of system
 * signals are re-sent with the same commandId 0.5-5 s later; 1% of commands lose their ACK (the driver
 * drops the receipt and retries); 1% are retroactive valid-time corrections 30 days back.
 *
 * Arrivals are a Poisson process per constant-rate segment (rate = facts rate / mean command size),
 * drawn from one seeded stream, so the same (seed, subjects, durationS, firstBurstAtS) always gives
 * byte-identical events. `traceDigest` hashes them for receipts.
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
}
export const TRACE_DEFAULTS: TraceParams = {
  steadyFactsPerS: 15,
  burstMultiplier: 50,
  burstDurationS: 60,
  burstPeriodS: 600,
  firstBurstAtS: 420,
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
};
export type WriterKind = "person" | "system" | "agent" | "runtime";

export interface TraceEvent {
  /** Unique, increasing in original-command order; a re-send carries its original's seq. */
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

export function generateTrace(opts: { seed: string; subjects: number; durationS: number; params?: TraceParams }): TraceEvent[] {
  const p = opts.params ?? TRACE_DEFAULTS;
  const rng = new Rng(seedOf(`trace:${opts.seed}`));
  const mean = meanCommandFacts(p);
  const events: TraceEvent[] = [];
  let seq = 0;
  for (const seg of segments(opts.durationS, p)) {
    const rate = seg.factsPerS / mean; // commands per second
    let t = seg.start + rng.exp(rate);
    while (t < seg.end) {
      const u = rng.next();
      let acc = 0;
      let cls = p.sizeClasses[p.sizeClasses.length - 1]!;
      for (const c of p.sizeClasses) if (u < (acc += c.share)) { cls = c; break; }
      const facts = cls.min + rng.int(cls.max - cls.min + 1);
      const w = rng.next();
      let kindAcc = 0;
      let kind: WriterKind = "runtime";
      for (const m of p.writerMix) if (w < (kindAcc += m.share)) { kind = m.kind as WriterKind; break; }
      const subject = rng.int(opts.subjects);
      const correction = rng.next() < p.correctionRate;
      const ackLoss = rng.next() < p.ackLossRate;
      const duplicate = kind === "system" && rng.next() < p.systemDuplicateRate;
      const delay = p.duplicateDelayMs[0] + rng.next() * (p.duplicateDelayMs[1] - p.duplicateDelayMs[0]);
      const atMs = Math.round(t * 1000 * 1000) / 1000; // microsecond resolution
      const base = { seq: seq++, kind, subject, facts, correction, ackLoss, burst: seg.burst };
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
    const [x, y] = hash2(`${e.seq}|${e.atMs}|${e.kind}|${e.subject}|${e.facts}|${+e.correction}${+e.ackLoss}${+e.resend}${+e.burst}`);
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
    byKind,
  };
}
