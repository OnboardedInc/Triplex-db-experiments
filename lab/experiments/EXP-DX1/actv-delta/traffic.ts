import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { hash } from "./store.ts";
export type ReadSample = {
  id: string;
  seq: number;
  output: string;
  state: string;
  ms: number;
  at: number;
};
export async function readers(
  a: Account,
  census: readonly string[],
  count: number,
  work: () => Promise<void>,
) {
  const samples: ReadSample[] = [],
    start = performance.now();
  let stop = false,
    reject: unknown;
  const seen = Array.from(
    { length: count },
    (_, i) => census[Math.floor((i * census.length) / count)]!,
  );
  const loops = seen.map(async (id) => {
    while (!stop) {
      try {
        const at = performance.now(),
          position = await a.db.comp.currentPosition(),
          v = await a.readAt(id, position);
        samples.push({
          id,
          seq: v.head.seq,
          output: hash(JSON.parse(W0.outputJson(v.output))),
          state: hash(parseOutbox(W0.publishJson({ state: v.state, deliveries: [] })).state),
          ms: performance.now() - at,
          at: at - start,
        });
      } catch (e) {
        reject = e;
        stop = true;
      }
    }
  });
  try {
    await work();
  } finally {
    stop = true;
    await Promise.all(loops);
  }
  if (reject) throw reject;
  assert(samples.length >= count);
  return samples;
}
