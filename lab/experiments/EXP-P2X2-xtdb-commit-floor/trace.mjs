// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; unannotated destructured parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-P2X writer trace: a minimal generator for TARGETS 2 and 2.1 (frozen; the sha256 of this file and
// the seed are bound in every receipt, so a change to either starts a new comparison series).
// Why not EXP-N01's generator: at exp/N01-northstar-bench 7a85944 it draws subjects uniformly and puts
// the first burst at 420 s, while TARGETS 2.1 requires a 2% active set with Zipf s = 1.1 for 95% of
// commands and bursts at 120 s + k x 600 s. The brief allows a minimal Poisson generator in that case.
//
// TARGETS 2: 5 to 50 facts per command, bands 60/30/10 (5-10, 11-25, 26-50), uniform inside a band;
// writer mix person 40, system 30, agent 10, runtime 20; steady 15 facts/s; bursts at 50x for 60 s;
// 10% of system signals re-sent with the same commandId 0.5 to 5 s later; 1% lose their ACK and are
// retried; 1% are valid-time corrections 30 days back.
// TARGETS 2.1: active set = 2% of subjects; 95% of commands pick from it by Zipf s = 1.1 over a seeded
// ranking, 5% uniformly from all subjects; a subject leaves the active set after 2,000 s of trace time
// and is replaced by a seeded draw; Poisson arrivals; bursts at 120 s + k x 600 s of the window.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GENERATOR_SHA256 = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex');

export const PARAMS = Object.freeze({
  steadyFactsPerS: 15, burstMultiplier: 50, burstDurationS: 60, burstPeriodS: 600, firstBurstAtS: 120,
  bands: [{ share: 0.6, min: 5, max: 10 }, { share: 0.3, min: 11, max: 25 }, { share: 0.1, min: 26, max: 50 }],
  writers: [{ kind: 'person', share: 0.4 }, { kind: 'system', share: 0.3 }, { kind: 'agent', share: 0.1 }, { kind: 'runtime', share: 0.2 }],
  systemDuplicateRate: 0.1, duplicateDelayMs: [500, 5000], ackLossRate: 0.01, correctionRate: 0.01,
  correctionBackMs: 30 * 86_400_000, activeShare: 0.02, activeZipfS: 1.1, activePickRate: 0.95, activeLifetimeS: 2000,
});

/** mulberry32 */
const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const seedOf = (label) => parseInt(createHash('sha256').update(label).digest('hex').slice(0, 8), 16);
const meanFacts = PARAMS.bands.reduce((sum, b) => sum + b.share * (b.min + b.max) / 2, 0);
export const inBurst = (tS) => tS >= PARAMS.firstBurstAtS && (tS - PARAMS.firstBurstAtS) % PARAMS.burstPeriodS < PARAMS.burstDurationS;

/**
 * Deterministic events for (seed, subjects, durationS): {seq, atMs, kind, subject, facts, band,
 * correction, ackLoss, resend, burst}. A re-send carries its original's seq (same commandId).
 */
export function generateTrace({ seed, subjects, durationS }) {
  const next = rng(seedOf(`p2x-trace:${seed}`));
  const activeSize = Math.max(1, Math.round(subjects * PARAMS.activeShare));
  // Zipf weights over active-set ranks; rank 0 is the hottest slot.
  const weights = Array.from({ length: activeSize }, (_v, k) => 1 / (k + 1) ** PARAMS.activeZipfS);
  const total = weights.reduce((a, b) => a + b, 0);
  const cdf = []; let acc = 0; for (const w of weights) cdf.push((acc += w / total));
  const draw = () => Math.floor(next() * subjects);
  const active = Array.from({ length: activeSize }, () => ({ subject: draw(), joinedS: -next() * PARAMS.activeLifetimeS }));
  const pickActive = (tS) => {
    const u = next();
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
    const slot = active[lo];
    if (tS - slot.joinedS >= PARAMS.activeLifetimeS) { slot.subject = draw(); slot.joinedS = tS; }
    return slot.subject;
  };
  const cuts = new Set([0, durationS]);
  for (let t = PARAMS.firstBurstAtS; t < durationS; t += PARAMS.burstPeriodS) { cuts.add(t); if (t + PARAMS.burstDurationS < durationS) cuts.add(t + PARAMS.burstDurationS); }
  const sorted = [...cuts].sort((a, b) => a - b);
  const events = [];
  let seq = 0;
  for (let k = 0; k + 1 < sorted.length; k++) {
    const start = sorted[k], end = sorted[k + 1], burst = inBurst(start);
    const rate = PARAMS.steadyFactsPerS * (burst ? PARAMS.burstMultiplier : 1) / meanFacts;
    let t = start - Math.log(1 - next()) / rate;
    while (t < end) {
      const u = next(); let a = 0, band = PARAMS.bands.length - 1;
      for (let b = 0; b < PARAMS.bands.length; b++) if (u < (a += PARAMS.bands[b].share)) { band = b; break; }
      const facts = PARAMS.bands[band].min + Math.floor(next() * (PARAMS.bands[band].max - PARAMS.bands[band].min + 1));
      const w = next(); let wa = 0, kind = 'runtime';
      for (const m of PARAMS.writers) if (w < (wa += m.share)) { kind = m.kind; break; }
      const subject = next() < PARAMS.activePickRate ? pickActive(t) : draw();
      const correction = next() < PARAMS.correctionRate;
      const ackLoss = next() < PARAMS.ackLossRate;
      const duplicate = kind === 'system' && next() < PARAMS.systemDuplicateRate;
      const delay = PARAMS.duplicateDelayMs[0] + next() * (PARAMS.duplicateDelayMs[1] - PARAMS.duplicateDelayMs[0]);
      const atMs = Math.round(t * 1e6) / 1e3;
      const base = { seq: seq++, kind, subject, facts, band, correction, ackLoss, burst };
      events.push({ ...base, atMs, resend: false });
      if (duplicate && atMs + delay < durationS * 1000) events.push({ ...base, atMs: Math.round((atMs + delay) * 1e3) / 1e3, ackLoss: false, resend: true });
      t += -Math.log(1 - next()) / rate;
    }
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  return events;
}

export const traceDigest = (events) => createHash('sha256').update(JSON.stringify(events)).digest('hex');
