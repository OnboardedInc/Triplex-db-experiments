import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { canonical } from "../../../bench/lib/w0-world.ts";
// [DX-H6] Why: delayed ACKs exercise bounded pipelining, ordered submissions and scalar replacement dependencies.
// Rejected: a test that checks only the requested window setting.
async function run(window: number, prefix = 0, retain = true) {
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
    const r = await seedW0(
      comp,
      50,
      path.join(dir, "commands.ndjson"),
      undefined,
      window,
      prefix,
      retain,
    );
    return { submissions, peak, r, retained: fs.existsSync(path.join(dir, "commands.ndjson")) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
// [DX-H8] Why: omitting bulky seed logs must preserve every command, count and stream digest.
// Rejected: generating less evidence by reducing seeded contents or skipping ACK-order checks.
test("seed log omission preserves commands, counts and command digest", async () => {
  const baseline = await run(1);
  const bounded = await run(1, 0, false);
  assert.equal(baseline.retained, true);
  assert.equal(bounded.retained, false);
  assert.equal(canonical(bounded.submissions), canonical(baseline.submissions));
  assert.equal(bounded.r.commands, baseline.r.commands);
  assert.equal(bounded.r.logSha256, baseline.r.logSha256);
  assert.equal(canonical(bounded.r.counts), canonical(baseline.r.counts));
});
