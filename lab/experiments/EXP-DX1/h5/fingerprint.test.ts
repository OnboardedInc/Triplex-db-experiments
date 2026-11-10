import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { requireFingerprint } from "../../../bench/lib/w0-gates.ts";
import { V_W0 } from "../../../bench/lib/w0-world.ts";
// [DX-H5] Why: timing instrumentation must preserve the full independent population fingerprint.
// Rejected: checking only metric shapes or comparing the instrumented reader with itself.
test("instrumented preview still matches a fresh independent O-DOMAIN population", async () => {
  const dir =
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/fingerprint-unit-" + randomUUID();
  fs.mkdirSync(dir, { recursive: true });
  const comp = memoryComposition("xtdb", "h5-fp-" + randomUUID());
  const seed = await seedW0(comp, 50, dir + "/seed.ndjson");
  execFileSync(
    "python3",
    [
      "-I",
      "lab/oracles/domain/cli.py",
      "--population",
      "--rung",
      "50",
      "--fingerprint",
      "--out",
      dir + "/expected.json",
    ],
    { maxBuffer: 4 << 20 },
  );
  const metrics: any[] = [];
  const fingerprint = await readW0Fingerprint(
    comp,
    50,
    { position: seed.basis.tx, validAt: V_W0 },
    new AbortController().signal,
    (_records, _page, metric) => metrics.push(metric),
  );
  requireFingerprint(fingerprint, JSON.parse(fs.readFileSync(dir + "/expected.json", "utf8")), 50);
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].subjects, 50);
  assert.ok(metrics[0].rows > 0);
  fs.writeFileSync(
    dir + "/observed.json",
    JSON.stringify({ fingerprint, metrics }, null, 2) + "\n",
  );
  await comp.close();
});
