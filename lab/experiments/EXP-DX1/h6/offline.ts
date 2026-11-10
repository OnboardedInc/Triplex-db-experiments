import fs from "node:fs";
import assert from "node:assert/strict";
import { decodeSweepRows } from "../../../../packages/datomic/dist/index.js";
import {
  canonical,
  worldOf,
  worldCanonical,
  worldSha256,
  reachableRows,
  sha256,
} from "../../../bench/lib/w0-world.ts";
import { evaluateW0, loadW0Pins } from "../../../bench/lib/evaluate.ts";
// [DX-H6] Why: measure exact recorded HTTP bytes single-thread, compare every output to frozen baseline bytes.
// Rejected: synthetic rows or a subset selected for speed.
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/recorded-pages";
const attempt = process.argv[2] ?? "run-" + Date.now();
if (!/^[a-zA-Z0-9-]+$/.test(attempt)) throw Error("safe attempt id required");
const attemptDir = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/offline-runs/" + attempt;
fs.mkdirSync(attemptDir.slice(0, attemptDir.lastIndexOf("/")), { recursive: true });
fs.mkdirSync(attemptDir);
const sources = Object.fromEntries(
  [
    "lab/experiments/EXP-DX1/h6/offline.ts",
    "lab/bench/lib/w0-world.ts",
    "lab/bench/lib/evaluate.ts",
    "packages/datomic/src/sweepRows.ts",
    "packages/datomic/dist/sweepRows.js",
    "packages/datomic/dist/index.js",
    "packages/core/dist/ValueDomain.js",
  ].map((file) => [file, sha256(fs.readFileSync(file))]),
);
for (const file of Object.keys(sources)) {
  const dest = attemptDir + "/sources/" + file;
  fs.mkdirSync(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
  fs.copyFileSync(file, dest);
}
const manifest = JSON.parse(fs.readFileSync(out + "/manifest.json", "utf8")),
  pins = await loadW0Pins();
for (const [file, hash] of Object.entries(manifest.files))
  assert.equal(sha256(fs.readFileSync(out + "/" + file)), hash, file);
const inputs = manifest.pages.map((p: any) => ({
  ...p,
  bytes: fs.readFileSync(`${out}/response-${p.page}.json`, "utf8"),
  golden: JSON.parse(fs.readFileSync(`${out}/golden-${p.page}.json`, "utf8")),
}));
for (const p of inputs) {
  p.goldenWorlds = p.golden.map((r: any) => canonical(r.world));
  p.goldenRecords = p.golden.map((r: any) =>
    canonical({
      subject: r.subject,
      worldSha256: sha256(canonical(r.world)),
      output: r.output,
      record: r.record,
    }),
  );
}
const cpu = () => process.cpuUsage(),
  elapsed = (s: NodeJS.CpuUsage) => {
    const d = process.cpuUsage(s);
    return (d.user + d.system) / 1e6;
  };
const rounds = [];
for (let round = 0; round < 4; round++) {
  const costs = { decode: 0, world: 0, kernel: 0, handover: 0 },
    results = [];
  for (const p of inputs) {
    let c = cpu();
    const rows = decodeSweepRows(JSON.parse(p.bytes), p.subjects, {
      recordedPosition: manifest.basis.position,
      validAt: manifest.basis.validAt,
    });
    assert.ok(rows);
    costs.decode += elapsed(c);
    c = cpu();
    const index = new Map<string, any[]>();
    for (const r of rows) {
      let a = index.get(r.entityId);
      if (!a) index.set(r.entityId, (a = []));
      a.push(r);
    }
    const worlds = p.subjects.map((subject: string) =>
      worldOf(subject, reachableRows([subject], rows, index)),
    );
    costs.world += elapsed(c);
    c = cpu();
    const outputs = [];
    for (const world of worlds) {
      const r = await evaluateW0(world, "R2", manifest.basis, pins);
      outputs.push({
        subject: world.subject,
        worldSha256: worldSha256(world),
        output: r.output,
        record: r.record,
      });
    }
    costs.kernel += elapsed(c);
    c = cpu();
    const encoded = new TextEncoder().encode(canonical(outputs)),
      decoded = JSON.parse(new TextDecoder().decode(encoded));
    costs.handover += elapsed(c);
    for (let i = 0; i < worlds.length; i++) {
      assert.equal(worldCanonical(worlds[i]), p.goldenWorlds[i]);
      assert.equal(canonical(decoded[i]), p.goldenRecords[i]);
    }
    results.push(...decoded);
  }
  rounds.push({
    round,
    ...costs,
    subjects: results.length,
    outputSha256: sha256(canonical(results)),
  });
  console.log(JSON.stringify(rounds.at(-1)));
}
for (const [file, hash] of Object.entries(sources))
  assert.equal(sha256(fs.readFileSync(file)), hash, "source changed: " + file);
fs.writeFileSync(
  attemptDir + "/metrics.json",
  JSON.stringify(
    {
      classification: "DIAGNOSTIC",
      attempt,
      pid: process.pid,
      sources,
      rounds,
      recordingSha256: sha256(fs.readFileSync(out + "/manifest.json")),
    },
    null,
    2,
  ) + "\n",
);
