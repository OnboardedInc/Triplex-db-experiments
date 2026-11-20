// @ts-nocheck -- [EXP-CHECKJS] The evidence reader validates its JSON inputs against the stage contract.
// [DX-COMPACT1] Why: reproduce each measurement from the verified attempt and frozen inputs.
// Rejected: aggregating successful-looking lines across failed or different attempts.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = process.argv[2];
assert(dir, "provide a durable attempt directory");
const read = (file) => fs.readFileSync(path.join(dir, file));
const hash = (data) => createHash("sha256").update(data).digest("hex");
const binding = JSON.parse(read("binding.json"));
const cleanup = JSON.parse(read("cleanup.json"));
assert.equal(binding.attempt, cleanup.attempt);
assert.equal(binding.slot, cleanup.slotReleased);
assert.equal(cleanup.rolesRemoved, 3);
assert.deepEqual(binding.durability.slice(0, 3), ["on", "on", "on"]);
assert.equal(binding.sourceHash, hash(JSON.stringify(binding.sources)));
for (const [file, expected] of Object.entries(binding.sources)) assert.equal(hash(read("source/" + file)), expected);
const log = read("probe.log");
const rows = log.toString().split("\n").filter((l) => l.startsWith("COMPACT ")).map((l) => JSON.parse(l.slice(8)));
for (const row of rows) {
  assert.equal(row.attempt, binding.attempt);
  assert.equal(row.source, binding.sourceHash);
}
const of = (kind) => rows.filter((r) => r.kind === kind);
const last = rows.at(-1);
function q(values, percentile) {
  assert(values.length && values.every(Number.isFinite));
  return values.slice().sort((a, b) => a - b)[Math.ceil(values.length * percentile) - 1];
}
const stats = (samples) => ({ n: samples.length, p50: q(samples, .5), p99: q(samples, .99) });

function surface() {
  assert.equal(last.kind, "surface-end");
  const casesPath = path.join(dir, "source", "cases");
  const fixtures = fs.readdirSync(casesPath).sort().flatMap((file) => {
    let f;
    try { f = JSON.parse(fs.readFileSync(path.join(casesPath, file))); } catch { return []; }
    const p = f.input?.basis?.tx;
    if (f.op !== "affected" || !Array.isArray(f.expected?.affected) || !Number.isSafeInteger(p) || p < 0 || p > 40) return [];
    if (f.input.worlds.some((w) => w.facts.some((fact) => typeof fact.v === "object"))) return [];
    return [f];
  });
  const actual = of("projected-affected");
  assert.equal(actual.length, last.cases);
  assert.deepEqual(actual.map((row) => row.case), fixtures.map((f) => f.id));
  const inputs = actual.map((row, i) => {
    const f = fixtures[i];
    assert.equal(row.through, row.p);
    assert.equal(new Set(row.candidateWorlds.map((w) => w.subject)).size, row.candidateWorlds.length);
    return { op: "affected", input: { ...f.input, basis: { ...f.input.basis, tx: row.p }, worlds: row.candidateWorlds } };
  });
  const result = spawnSync("python3", ["-I", "-B", path.join(dir, "source/lab/bench/lib/w0-oracle.py")],
    { input: inputs.map((record) => JSON.stringify(record)).join("\n") + "\n", encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n").map(JSON.parse), fixtures.map((v) => v.expected));
  const census = of("journal-census");
  assert.deepEqual(census.map((v) => v.facts), [1, 3, 25]);
  for (const row of census) assert.equal(row.datoms, 15 + row.changedEntities + 2 * row.facts);
  const prices = of("projection-price");
  assert.equal(prices.length, last.priceBlocks);
  assert.deepEqual(prices.map((p) => p.mode), Array.from({ length: 16 }, (_, i) => i % 2 ? "edge" : "plain"));
  const price = (mode) => {
    const arms = prices.filter((p) => p.mode === mode);
    for (const p of arms) {
      assert.equal(p.members, 8);
      assert.equal(p.mutations, mode === "edge" ? 16 : 0);
      assert.equal(p.datoms, p.mutations + 3);
      assert.equal(p.lagMicros.length, p.members);
    }
    return {
      blocks: arms.length,
      datomsPerSave: arms[0].datoms / 8,
      valueBytesPerSave: stats(arms.map((p) => p.valueBytes / p.members)),
      fressianBytesPerSave: stats(arms.map((p) => p.fressianBytes / p.members)),
      projectMsPerSave: stats(arms.map((p) => p.projectMs / p.members)),
      lagMs: stats(arms.flatMap((p) => p.lagMicros.map((us) => us / 1000))),
    };
  };
  return { fixtures: actual.map((r) => r.case), oracleOutput: hash(result.stdout),
    journal: census.map(({ facts, datoms, changedEntities, valueBytes, fressianBytes }) =>
      ({ facts, datoms, changedEntities, valueBytes, fressianBytes })),
    projection: { plain: price("plain"), edge: price("edge") } };
}

assert.equal(binding.phase, "surface");
console.log(JSON.stringify({ attempt: binding.attempt, source: binding.sourceHash, raw: hash(log), ...surface() }, null, 2));
