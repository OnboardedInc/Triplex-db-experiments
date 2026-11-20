// [DX-COMPACT1] Why: give a falsifiable one-database forecast for the exact offer schedule.
// Rejected: scaling the fastest Mac burst to the production database.
const packedQuiet = {
  fixedMs: 2.6, perMemberMs: 0.95, cap: 8, lateGroupProbability: 0.02,
  lateGroupLowMs: 8, lateGroupHighMs: 28, smallJitterMs: 0.7,
};
const journalQuiet = {
  fixedMs: 2.9, perMemberMs: 1.38, cap: 8, lateGroupProbability: 0.035,
  lateGroupLowMs: 8, lateGroupHighMs: 45, smallJitterMs: 0.7,
};
const journalMixed = {
  fixedMs: 3.1, perMemberMs: 1.62, cap: 8, lateGroupProbability: 0.04,
  lateGroupLowMs: 10, lateGroupHighMs: 55, smallJitterMs: 0.7,
};

/** @param {typeof packedQuiet} assumptions @param {number} rate @param {number} seconds @param {number} seed */
function predict(assumptions, rate, seconds, seed) {
  const { fixedMs, perMemberMs, cap, lateGroupProbability, lateGroupLowMs, lateGroupHighMs, smallJitterMs } = assumptions;
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const offered = rate * seconds;
  /** @param {number} i */
  const due = (i) => i * 1000 / rate;
  /** @type {number[]} */
  const latencies = [];
  let next = 0;
  let finish = 0;
  let batches = 0;
  while (next < offered) {
    const start = Math.max(finish, due(next));
    let end = next + 1;
    while (end < offered && end - next < cap && due(end) <= start) end++;
    const long = random() < lateGroupProbability ? lateGroupLowMs + random() * (lateGroupHighMs - lateGroupLowMs) : 0;
    finish = start + fixedMs + (end - next) * perMemberMs + random() * smallJitterMs + long;
    for (; next < end; next++) latencies.push(finish - due(next));
    batches++;
  }
  latencies.sort((a, b) => a - b);
  /** @param {number} fraction */
  const q = (fraction) => latencies[Math.ceil(fraction * latencies.length) - 1];
  return { rate, seconds, offered, batches, p50Ms: q(0.5), p99Ms: q(0.99), maxMs: q(1) };
}

/** @param {typeof packedQuiet} assumptions */
function scenario(assumptions) {
  const { fixedMs, perMemberMs, cap, lateGroupProbability, lateGroupLowMs, lateGroupHighMs, smallJitterMs } = assumptions;
  const meanCycleMs = fixedMs + cap * perMemberMs + smallJitterMs / 2 +
    lateGroupProbability * (lateGroupLowMs + lateGroupHighMs) / 2;
  const capacity = cap * 1000 / meanCycleMs;
  return {
    assumptions,
    grossSaturatedSavesPerSecond: capacity,
    usefulWithMaintenanceAndHeadroom: capacity * 0.85 * 0.75,
    openLoop: [predict(assumptions, 235, 60, 1281), predict(assumptions, 394, 60, 1282)],
  };
}

console.log(JSON.stringify({
  packedQuiet: scenario(packedQuiet),
  journalQuiet: scenario(journalQuiet),
  journalMixed: scenario(journalMixed),
}, null, 2));
