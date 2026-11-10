import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { requireFingerprint } from "../../../bench/lib/w0-gates.ts";
import { sha256, V_W0 } from "../../../bench/lib/w0-world.ts";
import { openBulkCounts } from "./bulk-counts.ts";
// [DX-H6] Why: isolate window-size effects in fresh scopes while retaining full stored-row/reference checks.
// Rejected: accepting command ACK order without checking the independently generated population fingerprint.
const out = "runs/DX-H6-vm";
fs.mkdirSync(out, { recursive: true });
process.env.TX2_P5_CLOCK_START = String(V_W0);
process.env.TX2_W0_POINT_JOURNAL = "1";
const sources = Object.fromEntries(
  [
    "lab/experiments/EXP-DX1/h6/seed-probe.ts",
    "lab/bench/lib/w0-seed.ts",
    "lab/bench/lib/w0-public.ts",
    "lab/bench/lib/w0-datomic-reader.ts",
    "packages/datomic/dist/index.js",
    "packages/datomic/dist/sweepRows.js",
  ].map((file) => [file, sha256(fs.readFileSync(file))]),
);
const report: any = {
  classification: "DIAGNOSTIC-NOT-ACCEPTANCE",
  N: 50,
  sources,
  windows: [],
  status: "RUNNING",
};
const save = () =>
  fs.writeFileSync(out + "/seed-probe.json", JSON.stringify(report, null, 2) + "\n");
save();
try {
  for (const window of [16, 32, 64]) {
    const scope = "dxh6-seed-probe-" + window + "-" + randomUUID(),
      comp = await openComposition("reach", "datomic", scope),
      bulk = await openBulkCounts(comp);
    comp.storeCounts = bulk.count;
    try {
      const seed = await seedW0(comp, 50, `${out}/seed-w${window}.ndjson`, undefined, window);
      execFileSync("python3", [
        "-I",
        "lab/oracles/domain/cli.py",
        "--population",
        "--rung",
        "50",
        "--fingerprint",
        "--out",
        `${out}/reference-w${window}.json`,
      ]);
      const expected = JSON.parse(fs.readFileSync(`${out}/reference-w${window}.json`, "utf8"));
      for (const [file, hash] of Object.entries(expected.sources))
        if (sha256(fs.readFileSync("lab/oracles/domain/" + file)) !== hash)
          throw Error("oracle source changed");
      const observed = await readW0Fingerprint(
        comp,
        50,
        { position: seed.basis.tx, validAt: V_W0 },
        AbortSignal.timeout(120000),
      );
      requireFingerprint(observed, expected, 50);
      report.windows.push({ scope, window, seed, observed, status: "MATCH" });
      save();
    } finally {
      bulk.close();
      await comp.close();
    }
  }
  for (const [file, hash] of Object.entries(sources))
    if (sha256(fs.readFileSync(file)) !== hash) throw Error("source changed: " + file);
  report.status = "MATCH";
} catch (error) {
  report.status = "FAIL";
  report.error = String(error);
  throw error;
} finally {
  save();
}
