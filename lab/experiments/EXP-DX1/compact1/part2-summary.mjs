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
const parse = (file) => {
  const data = read(file).toString().split("\n").filter((l) => l.startsWith("COMPACT ")).map((l) => JSON.parse(l.slice(8)));
  for (const row of data) {
    assert.equal(row.attempt, binding.attempt);
    assert.equal(row.source, binding.sourceHash);
  }
  return data;
};
const rows = parse("probe.log");
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

function history() {
  assert.equal(last.kind, "history-seed");
  assert.equal(last.checkpoints, 228);
  assert.equal(last.interval, 64);
  assert.equal(last.events, 14880);
  assert.equal(last.position, last.events);
  const matrix = [];
  for (const mode of ["current", "pinned"]) for (const strategy of ["chain", "checkpoint"]) {
    const readings = parse(`history-${mode}-${strategy}.log`);
    const end = readings.at(-1);
    assert.equal(end.kind, "history-reader-end");
    assert.equal(end.position, last.position);
    assert.equal(end.nativeT, last.nativeT);
    assert.equal(end.strategy, strategy);
    assert.equal(end.mode, mode);
    assert.equal(end.samples, 48);
    const samples = readings.filter((a) => a.kind === "history-read");
    assert.equal(samples.length, end.samples);
    if (mode === "pinned" && strategy === "checkpoint") {
      const cut = readings.filter((a) => a.kind === "checkpoint-boundaries");
      assert.equal(cut.length, 1);
      assert.equal(cut[0].verified, true);
      assert.deepEqual(cut[0].cuts, [1, 63, 64, 65, 127, 128, 129, 415, 2000]);
    }
    for (const [i, depth] of [1, 64, 415, 2000].entries()) for (const cache of ["cold", "warm"]) {
      const group = samples.filter((a) => a.depth === depth && a.cache === cache);
      assert.deepEqual(group.map((a) => a.person).sort((a, b) => a - b), Array.from({ length: 6 }, (_, j) => i * 6 + j));
      assert(group.every((a) => a.mode === mode && a.strategy === strategy && a.position > 0));
      const folds = mode === "current" && cache === "warm" ? 0 : strategy === "chain" || depth < 64 ? depth : 1 + depth % 64;
      assert(group.every((a) => a.folded === folds));
      matrix.push({ depth, mode, cache, strategy, folds, pauses: group.filter((a) => a.gc > 0).length,
        ms: stats(group.map((a) => a.ms)) });
    }
  }
  return { checkpoints: last.checkpoints, events: last.events, checkpointBytes: last.bytes,
    bytesPerCheckpoint: last.bytes / last.checkpoints, steadyBytesPerSave: last.bytes / last.checkpoints / 64, matrix };
}

const reducers = { surface, history };
assert(reducers[binding.phase], "unexpected probe phase");
console.log(JSON.stringify({ attempt: binding.attempt, source: binding.sourceHash,
  raw: hash(read("probe.log")), ...reducers[binding.phase]() }, null, 2));
