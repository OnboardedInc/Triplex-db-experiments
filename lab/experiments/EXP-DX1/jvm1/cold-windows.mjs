import assert from "node:assert/strict";

// [DX-JVM1] Why: bin by original scheduled offer, retaining refusal and recovery denominators.
// Rejected: reporting only fast admitted saves as if the original 235/s was served.
export function summarizeOffers(rows, start) {
  function rank(values, n) {
    return values.length >= n && n > 0 ? values[n - 1] : null;
  }
  function window(from, to) {
    const offers = rows.filter((r) => start + from * 1000 <= r.due && r.due < start + to * 1000);
    const acked = offers.filter((r) => r.status === "acked");
    const latency = acked.map((r) => r.end - r.due).sort((a, b) => a - b);
    const queue = offers.flatMap((r) => r.dispatched === undefined ? [] : [r.dispatched - r.due]).sort((a, b) => a - b);
    const quiet = acked.filter((r) => r.account === 0).map((r) => r.end - r.due).sort((a, b) => a - b);
    return {
      from, to, offers: offers.length, acks: acked.length,
      ackedInWindow: rows.filter((r) => r.status === "acked" && start + from * 1000 <= r.end && r.end < start + to * 1000).length,
      recoveries: offers.filter((r) => r.status === "recovered").length,
      expired: offers.filter((r) => r.status === "expired-before-dispatch").length,
      rateRefusals: offers.filter((r) => r.startupRefusal === "rate").length,
      queueRefusals: offers.filter((r) => r.startupRefusal === "queue").length,
      demandReads: offers.filter((r) => r.predecessorReadMs !== undefined).length,
      ackP50Ms: rank(latency, Math.ceil(.50 * latency.length)),
      ackP99Ms: rank(latency, Math.ceil(.99 * latency.length)),
      allOfferP99Ms: rank(latency, Math.ceil(.99 * offers.length)),
      senderQueueP99Ms: rank(queue, Math.ceil(.99 * queue.length)),
      quietAckP99Ms: rank(quiet, Math.ceil(.99 * quiet.length)),
    };
  }
  const bins = Array.from({ length: 20 }, (_, i) => window(i * 15, (i + 1) * 15));
  assert.equal(bins.reduce((n, b) => n + b.offers, 0), rows.length);
  const settled = (key) => bins.findIndex((_, i) => bins.slice(i).every((b) => b[key] !== null && b[key] < 50));
  const all = settled("allOfferP99Ms"), acknowledged = settled("ackP99Ms");
  return {
    bins, prefixes: [30, 60, 120].map((end) => window(0, end)), entire: window(0, 300),
    allOfferSettledSeconds: all < 0 ? null : 15 * all,
    ackP99SettledSeconds: acknowledged < 0 ? null : 15 * acknowledged,
  };
}
