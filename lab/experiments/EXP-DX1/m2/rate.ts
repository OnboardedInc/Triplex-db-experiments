import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { V_W0 } from "../../../bench/lib/w0-world.ts";
import { openBulkCounts } from "../h6/bulk-counts.ts";
// [DX-M2] Why: B10 window-32 comparison retains its full-world oracle. Adapted from b10/seed-probe.ts.
// Why: use H6's complete reference seed and full stored-world reader in fresh scopes.
// Rejected: accepting pipelined ACKs without checking every subject's resulting world.
assert.equal(
  typeof process.threadCpuUsage,
  "function",
  "Node runtime must support thread CPU accounting",
);
process.env.TX2_P5_CLOCK_START = String(V_W0);
process.env.TX2_W0_POINT_JOURNAL = "1";
const arm = process.argv[2];
assert.match(arm ?? "", /^[AB][12]$/);
for (const window of [32]) {
  const comp = await openComposition("reach", "datomic", `dxm2-${arm}-w${window}-${randomUUID()}`);
  const bulk = await openBulkCounts(comp);
  comp.storeCounts = bulk.count;
  try {
    console.log(JSON.stringify({ arm, window, phase: "seed-start" }));
    const transactorCpuBefore = readFileSync("/tx-cpu/cpu.stat", "utf8");
    const cpuBefore = process.cpuUsage();
    const seed = await seedW0(comp, 1000, `/driver/${arm}-${randomUUID()}.ndjson`, undefined, window);
    const loadCpuMicros = process.cpuUsage(cpuBefore);
    const transactorCpuAfter = readFileSync("/tx-cpu/cpu.stat", "utf8");
    const usage = (text: string) => {
      const match = /^usage_usec (\d+)$/m.exec(text);
      assert.ok(match, "transactor cgroup CPU counter required");
      return Number(match[1]);
    };
    const transactorCpuMicros = usage(transactorCpuAfter) - usage(transactorCpuBefore);
    assert.ok(transactorCpuMicros > 0, "owned transactor CPU counter must advance during commits");
    const observed = await readW0Fingerprint(
      comp,
      1000,
      { position: seed.basis.tx, validAt: V_W0 },
      AbortSignal.timeout(120000),
    );
    assert.equal(
      observed.worlds,
      "sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad",
    );
    console.log(JSON.stringify({ arm, window, seed, loadCpuMicros, transactorCpuBefore, transactorCpuAfter, transactorCpuMicros, transactorCpuMicrosPerCommit: transactorCpuMicros / seed.commands, observed }));
  } catch (error) {
    console.error(JSON.stringify({ arm, window, error: String(error), stack: (error as Error).stack }));
    process.exitCode = 1;
  } finally {
    bulk.close();
    await comp.close();
  }
}
