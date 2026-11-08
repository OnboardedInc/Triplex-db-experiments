/** Deterministic sample choices shared by the driver and the bulk seed loader. */
import { Rng, seedOf } from "./rng.ts";
import { BUCKETS, HOP_SHARE, subjectInCell, type Bucket } from "./world.ts";

/** O-REPLAY sample subjects: one per hop class, then evenly spread. */
export function chooseSamples(n: number, k: number): number[] {
  const out = new Set<number>();
  for (const i of [0, 8, 15]) if (i < n) out.add(i);
  for (let j = 0; out.size < Math.min(k, n) && j < 10 * k; j++) out.add(Math.floor(((j + 0.5) * n) / k) % n);
  return [...out].sort((a, b) => a - b);
}

/** The matched P4 history sample: stratified by the frozen bucket x hop weights, distinct, seeded. */
export function chooseHistorySample(n: number, k: number, seed: string, accounts: number): number[] {
  const rng = new Rng(seedOf(`history-sample:${seed}`));
  const out = new Set<number>();
  for (let tries = 0; out.size < k && tries < k * 50; tries++) {
    const u = rng.next();
    const bucket: Bucket = u < BUCKETS.small.share ? "small" : u < BUCKETS.small.share + BUCKETS.medium.share ? "medium" : "large";
    const w = rng.next();
    const hop = w < HOP_SHARE[3] ? 3 : w < HOP_SHARE[3] + HOP_SHARE[4] ? 4 : 6;
    const i = subjectInCell(n, accounts, bucket, hop, rng.next(), rng.next(), rng.next());
    if (i !== null) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}
