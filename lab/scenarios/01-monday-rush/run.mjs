// Scenario 1: Monday onboarding rush (TARGETS 6 row 1). Spec and golden only; not yet run by the GS gate.
import { BT, T, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `o${String(n).padStart(5, '0')}`;

export function generate(spec, p) {
  const fresh = Array.from({ length: p.placements }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.placements + n));
  // Arrivals spread over the business-hours window with a 10x burst (the 9am peak) at burstAt for burstMs.
  const weight = t => (t >= p.burstAt * p.liveMs && t < p.burstAt * p.liveMs + p.burstMs) ? p.burstFactor : 1;
  const steps = 1000, cdf = [];
  let total = 0; for (let i = 0; i < steps; i++) { total += weight(i / steps * p.liveMs); cdf.push(total); }
  const timeOf = q => { const target = q * total; const i = cdf.findIndex(c => c >= target); return Math.round(i / steps * p.liveMs); };
  const events = [];
  fresh.forEach((sid, n) => {
    const at = timeOf((n + 0.5) / fresh.length);
    events.push({ at, emit: (s, rng) => T.onboard(s, rng, sid, { at, writer: 'person' }) });
    events.push({ at: at + p.submitDelayMs, emit: (s, rng) => T.section1Submit(s, rng, sid, { at: at + p.submitDelayMs }) });
  });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: idle, events });
  return { stream, digestSubjects: [...fresh, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: fresh, negative: idle } };
}
