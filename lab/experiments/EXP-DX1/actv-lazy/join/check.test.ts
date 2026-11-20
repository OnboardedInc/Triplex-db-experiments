import assert from "node:assert/strict";
import test from "node:test";
import { W0 } from "../../../../bench/lib/w0-world.ts";
import type { JoinedAccount } from "./account.ts";
import { Reference } from "./check.ts";

test("a four-process census preserves every output and ordered notice through release changes", async () => {
  const sequential = new Reference(),
    parallel = new Reference(4),
    ids = Array.from({ length: 132 }, (_, i) => W0.placementId(i)),
    world = (i: number): W0.World => ({
      subject: ids[i]!,
      facts: [
        { e: ids[i]!, a: "location", v: "loc:l", tx: 1 },
        { e: "loc:l", a: "localMinWageCents", v: 1700, tx: 1 },
        { e: ids[i]!, a: "payRateCents", v: 1400 + i, tx: 1 },
      ],
    }),
    unusedReader = {} as JoinedAccount;
  try {
    let old: W0.ReleaseDoc | null = null;
    for (const [i, r] of [W0.R1, W0.R2, W0.R3].entries()) {
      const b = { tx: 10 + i, validTime: W0.POPULATION_VALID_TIME };
      const [a, c] = await Promise.all(
        [sequential, parallel].map((observer) =>
          observer.check(unusedReader, ids, world, r.doc, b, old, undefined, true, false),
        ),
      );
      assert.deepEqual(a, c);
      assert.deepEqual(sequential.owed, parallel.owed);
      old = r.doc;
    }
    await assert.rejects(
      parallel.check(
        unusedReader,
        ids.toReversed(),
        world,
        W0.R2.doc,
        { tx: 20, validTime: W0.POPULATION_VALID_TIME },
        old,
        undefined,
        true,
        false,
      ),
      /retain the enrolled subject order/,
    );
  } finally {
    sequential.close();
    parallel.close();
  }
});
