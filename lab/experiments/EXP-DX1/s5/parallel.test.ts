import assert from "node:assert/strict";
import { test } from "node:test";
import { forEachBounded, orderedMap } from "../../../bench/lib/w0-parallel.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { W0, V_W0, worldOf } from "../../../bench/lib/w0-world.ts";

// [DX-S5] Why: deliberately complete page reads out of order and compare serial/parallel oracle bytes on distinct worlds/releases.
// Rejected: checking only task counts (which would miss swapped responses or completion-order fingerprints).
test("ordered pages and pipelined oracle preserve every byte", async () => {
  const mem = memoryComposition("xtdb", "s5-parallel");
  const N = 100,
    through = W0.populationBasis(W0.rung(N)).tx;
  await seedW0(mem, N, "/dev/null", undefined, 32, 0, {
    from: 0,
    through,
    latest: new Map(),
    discardLog: true,
    boundedState: true,
  });
  const basis = { position: through, validAt: V_W0 };
  const serial = await readW0Fingerprint(mem, N, basis, AbortSignal.timeout(30000));
  const delayed = {
    ...mem,
    sweepPage: async (roots: readonly string[], b: typeof basis) => {
      await new Promise((r) => setTimeout(r, roots[0] === W0.placementId(0) ? 20 : 1));
      return mem.sweepPage(roots, b);
    },
  };
  const metricsSeen: any[] = [];
  const parallel = await readW0Fingerprint(
    delayed,
    N,
    basis,
    AbortSignal.timeout(30000),
    (_records, _page, metrics) => {
      metricsSeen.push(metrics);
    },
    4,
  );
  assert.deepEqual(parallel, serial);
  assert(metricsSeen[0].readWallMs >= 15, "request latency must include prefetched RPC time");
  const worlds = await Promise.all(
    Array.from({ length: 12 }, async (_, i) =>
      worldOf(W0.placementId(i), (await mem.sweepPage([W0.placementId(i)], basis)).rows),
    ),
  );
  const oracle = new DomainOracle();
  try {
    const args = worlds.map((world, i) => ({
      world,
      release: ["R1", "R2", "R3"][i % 3],
      basis: { tx: through, validTime: W0.POPULATION_VALID_TIME },
    }));
    const expected = [];
    for (const arg of args) expected.push(await oracle.call("evaluate", arg));
    const actual: string[] = [];
    let active = 0,
      peak = 0;
    await forEachBounded(args, 4, async (arg, i) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, (i % 3) * 2));
      actual[i] = await oracle.call("evaluate", arg);
      active--;
    });
    assert.deepEqual(actual, expected);
    assert.equal(peak, 4);
  } finally {
    oracle.close();
  }
  const got = [];
  for await (const x of orderedMap([0, 1, 2, 3], 3, async (i) => {
    await new Promise((r) => setTimeout(r, (4 - i) * 2));
    return i;
  }))
    got.push(x);
  assert.deepEqual(got, [0, 1, 2, 3]);
  await assert.rejects(
    forEachBounded([1], 0, async () => {}),
    /invalid/,
  );
  await assert.rejects(
    forEachBounded([1, 2], 2, async (i) => {
      if (i === 2) throw Error("observed failure");
    }),
    /observed failure/,
  );
});
