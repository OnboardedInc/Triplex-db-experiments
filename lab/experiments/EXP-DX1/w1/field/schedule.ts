import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
export const rates = [3.5, 23.5, 39.4] as const;
export type Offer = {
  ms: number;
  account: number;
  person: number;
  subtask: number;
  ordinal: number;
  extra: boolean;
};
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
// [DX-W1] Why: minute totals alone cannot identify same-person interarrival times. Price explicitly jittered sessions and expose the gap assumption.
// Rejected: treating the account-wide interarrival interval as the time between two saves by one person.
export function offers(
  rate: number,
  seconds: number,
  accounts: readonly number[],
  gap = 3,
): Offer[] {
  const out: Offer[] = [],
    count = Math.round(rate * seconds),
    lanes = Math.max(1, Math.round(rate * gap));
  for (const account of accounts) {
    const rand = rng(6199 + account * 1217 + Math.round(rate * 10)),
      order: number[] = [];
    for (let j = 0; j < lanes; j++) order.push(j);
    for (let j = lanes - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [order[j], order[k]] = [order[k]!, order[j]!];
    }
    for (let s = 0; s < lanes; s++) {
      const n = Math.floor((count + lanes - 1 - s) / lanes);
      if (!n) continue;
      const period = (seconds * 1000) / n,
        initial = Math.floor(rand() * 415),
        phase = (order[s]! + 0.5) / lanes;
      for (let j = 0; j < n; j++) {
        const ordinal = initial + j,
          person = s + lanes * Math.floor(ordinal / 415);
        out.push({
          ms: (j + 0.35 * phase + 0.65 * rand()) * period,
          account,
          person,
          subtask: Math.floor((ordinal % 415) / 19),
          ordinal: ordinal % 415,
          extra: rand() < 0.2,
        });
      }
    }
  }
  assert.equal(out.length, count * accounts.length);
  return out.sort((a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person);
}
export function quantile(xs: number[], q: number) {
  assert(xs.length);
  return [...xs].sort((a, b) => a - b)[Math.ceil(q * xs.length) - 1]!;
}
