import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { canonical } from "../../../bench/lib/w0-world.ts";
// [DX-H6] Why: delayed ACKs exercise bounded pipelining, ordered submissions and scalar replacement dependencies.
// Rejected: a test that checks only the requested window setting.
async function run(window: number) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh6-seed-"));
  let position = 0,
    active = 0,
    peak = 0;
  const submissions: any[] = [],
    live = new Set<string>();
  const comp: any = {
    currentPosition: async () => 0,
    storeCounts: async () => ({ position }),
    transact: (operations: any[], meta: any) => {
      const p = ++position;
      active++;
      peak = Math.max(peak, active);
      for (const o of operations)
        if (o.op === "retract")
          assert.ok(live.has(o.id), "replacement waits for its assertion ACK");
      submissions.push({ operations, meta });
      return new Promise((resolve) =>
        setImmediate(() => {
          active--;
          const triples = operations
            .filter((o) => o.op === "assert")
            .map((o, i) => ({ ...o, id: `${p}:${i}` }));
          for (const t of triples) live.add(t.id);
          resolve({ ok: true, value: { position: p, triples } });
        }),
      );
    },
  };
  try {
    const r = await seedW0(comp, 50, path.join(dir, "commands.ndjson"), undefined, window);
    return { submissions, peak, r };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
test("windows preserve the exact reference stream and replacement ids", async () => {
  const baseline = await run(1);
  for (const window of [16, 32, 64]) {
    const actual = await run(window);
    assert.equal(canonical(actual.submissions), canonical(baseline.submissions));
    assert.ok(actual.peak > 1 && actual.peak <= window);
    assert.equal(actual.r.commands, baseline.r.commands);
  }
});
