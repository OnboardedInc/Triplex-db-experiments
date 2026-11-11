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

// [DX-S5] Why: the batched boundary must equal the original oracle, including no-op publication state and distinct R1 worlds/cuts.
// Rejected: validating only candidate counts or using the TypeScript evaluator to manufacture expected batch results.
test("batched oracle equals original outputs and publication states", async () => {
  const comp = memoryComposition("xtdb", "s5-batch");
  const N = 50,
    through = W0.populationBasis(W0.rung(N)).tx;
  await seedW0(comp, N, "/dev/null", undefined, 32, 0, {
    from: 0,
    through,
    latest: new Map(),
    discardLog: true,
    boundedState: true,
  });
  const plain = new DomainOracle(),
    batch = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  const basis1 = { tx: through - 1, validTime: W0.POPULATION_VALID_TIME },
    basis2 = { tx: through, validTime: W0.POPULATION_VALID_TIME };
  const record = (o: any) => ({
    basis: o.basis,
    release: o.release,
    subject: o.subject,
    workItems: o.workItems,
  });
  const apply = async (previous: any, output: any) => {
    const next = JSON.parse(
      await plain.call("publish", { state: previous, evaluations: [record(output)] }),
    );
    assert(!next.error);
    const changed =
      next.deliveries.length > 0 ||
      JSON.stringify(next.state.items) !== JSON.stringify(previous.items);
    return { changed, state: changed ? next.state : previous };
  };
  try {
    for (let i = 0; i < 24; i++) {
      const id = W0.placementId(i),
        world = worldOf(
          id,
          (await comp.sweepPage([id], { position: through, validAt: V_W0 })).rows,
        );
      const r1World = JSON.parse(JSON.stringify(world));
      if (i % 3 === 0) {
        const row = r1World.facts.find((r: any) => r.e === id && r.a === "weeklyMinutes");
        if (row) row.v += 60;
      }
      const r1 = JSON.parse(
        await plain.call("evaluate", { world: r1World, release: "R1", basis: basis1 }),
      );
      const R2 = await plain.call("evaluate", { world, release: "R2", basis: basis2 });
      const first = await apply({ items: [], pending: [], subjects: [] }, r1),
        second = await apply(first.state, JSON.parse(R2));
      const actual = JSON.parse(
        await batch.call("activation-check", { world, r1World, basisR1: basis1, basisR2: basis2 }),
      );
      assert.deepEqual(actual, {
        R2,
        state: second.state,
        r1Changed: first.changed,
        r2Changed: second.changed,
      });
      const requests = ["R2", "R1", "R3"].map((release) => ({ release, basis: basis2 }));
      const expected = await Promise.all(
        requests.map((r) => plain.call("evaluate", { world, ...r })),
      );
      assert.deepEqual(
        JSON.parse(await batch.call("evaluate-many", { world, requests })),
        expected,
      );
    }
  } finally {
    plain.close();
    batch.close();
  }
});
