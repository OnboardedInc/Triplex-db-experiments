// [DX-JVM1] Why: bound the cold sender's backlog before issuing a transaction and retain every offer.
// Rejected: moving the latency clock to dispatch or treating an unsubmitted write as a timeout.
export const coldAdmission = Object.freeze({ queueMs: 25, stepMs: 15_000, rates: [120, 160, 200, 220, 235] });

export function startupAdmission() {
  /** @type {Map<number, number>} */
  const fractions = new Map();
  /** @param {number} account @param {number} elapsedMs */
  return (account, elapsedMs) => {
    const rate = coldAdmission.rates[Math.min(coldAdmission.rates.length - 1, Math.floor(elapsedMs / coldAdmission.stepMs))];
    if (account === 0 || rate === 235) return true;
    const neighbours = 2 * 235 - 7;
    const credit = (fractions.get(account) ?? 0) + 2 * rate - 7;
    fractions.set(account, credit % neighbours);
    return credit >= neighbours;
  };
}
