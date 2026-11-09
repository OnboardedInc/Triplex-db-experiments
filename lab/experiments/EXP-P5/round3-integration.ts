// [EXP-P5-R3] Why: exercise the complete corrected paired offline path with a fresh independent population pin. Rejected: recycling round-2 completion flags after review findings.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { memoryComposition } from "../../bench/lib/memory.ts";
import { seedW0 } from "../../bench/lib/w0-seed.ts";
import { freezeMemoryG0, fingerprintSweep } from "../../bench/lib/w0-fingerprint.ts";
import { runMemoryRounds } from "../../bench/lib/w0-rounds.ts";
import { V_W0 } from "../../bench/lib/w0-world.ts";
const dir = process.argv[2];
if (!dir || fs.existsSync(dir)) throw Error("fresh output required");
fs.mkdirSync(dir, { recursive: true });
const scope = "p5-r3-" + randomUUID(),
  comp = memoryComposition("xtdb", scope),
  N = 50;
const seed = await seedW0(comp, N, path.join(dir, "seed.ndjson"));
const oracleFile = path.join(dir, "population.json");
execFileSync("python3", [
  "-I",
  "lab/oracles/domain/cli.py",
  "--population",
  "--rung",
  String(N),
  "--fingerprint",
  "--out",
  oracleFile,
]);
const oracle = JSON.parse(fs.readFileSync(oracleFile, "utf8")),
  basis = { position: seed.basis.tx, validAt: V_W0 },
  expected = { ...oracle.fingerprint, N };
const input = { endpoint: comp.backend.url, scope, basis, expected, counts: seed.counts };
const pin = await freezeMemoryG0(comp, input);
const admission = await fingerprintSweep({ ...input, pin });
const traffic = await runMemoryRounds({
  scope,
  N,
  dir: path.join(dir, "traffic"),
  basis,
  expected,
  counts: seed.counts,
  rounds: 2,
  durationS: 2,
  seed: "p5-r3-matched",
  workers: 2,
  burst: true,
});
fs.writeFileSync(
  path.join(dir, "receipt.json"),
  JSON.stringify(
    {
      status: "OFFLINE-CHECKS-COMPLETE",
      classification: "DIAGNOSTIC",
      acceptance: false,
      N,
      scope,
      seed,
      admission,
      traffic,
    },
    null,
    2,
  ),
);
