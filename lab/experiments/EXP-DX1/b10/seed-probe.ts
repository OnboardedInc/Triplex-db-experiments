import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { V_W0 } from "../../../bench/lib/w0-world.ts";
import { openBulkCounts } from "../h6/bulk-counts.ts";
// [DX-B10] Why: use H6's complete reference seed and full stored-world reader in fresh scopes.
// Rejected: accepting pipelined ACKs without checking every subject's resulting world.
assert.equal(
  typeof process.threadCpuUsage,
  "function",
  "Node runtime must support thread CPU accounting",
);
process.env.TX2_P5_CLOCK_START = String(V_W0);
process.env.TX2_W0_POINT_JOURNAL = "1";
for (const window of [1, 32]) {
  const comp = await openComposition("reach", "datomic", `dxb10-w${window}-${randomUUID()}`);
  const bulk = await openBulkCounts(comp);
  comp.storeCounts = bulk.count;
  try {
    const seed = await seedW0(comp, 1000, `/driver/w${window}.ndjson`, undefined, window);
    const observed = await readW0Fingerprint(
      comp,
      1000,
      { position: seed.basis.tx, validAt: V_W0 },
      AbortSignal.timeout(120000),
    );
    console.log(JSON.stringify({ window, seed, observed }));
    assert.equal(
      observed.worlds,
      "sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad",
    );
  } finally {
    bulk.close();
    await comp.close();
  }
}
