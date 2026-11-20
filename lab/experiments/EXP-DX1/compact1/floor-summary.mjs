// @ts-nocheck -- [EXP-CHECKJS] Dynamic JSON measurements and indexed numeric arrays; the analyzer asserts the observed schema.
// [DX-COMPACT1] Why: calculate effects from balanced native measurements and preserve cell counts.
// Rejected: fitting all per-transaction tails to a single latency-by-size slope.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const hash = (data) => createHash("sha256").update(data).digest("hex");
const numbers = (matrix, q) => {
  const ordered = matrix.slice().sort((a, b) => a - b);
  return ordered[Math.ceil(ordered.length * q) - 1];
};
const mid = (xs) => numbers(xs, 0.5);
const round = (n) => Number(n.toFixed(5));

function regress(samples, observation) {
  const terms = (row) => [1, row.datoms - 1, row.valueBytes / 1024, row.lookups];
  const augmented = Array.from({ length: 4 }, () => Array(5).fill(0));
  for (const row of samples) {
    const x = terms(row);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) augmented[i][j] += x[i] * x[j];
      augmented[i][4] += x[i] * row[observation];
    }
  }
  for (let col = 0; col < 4; col++) {
    const pivot = augmented[col][col];
    assert(pivot > 0);
    augmented[col] = augmented[col].map((n) => n / pivot);
    for (let row = 0; row < 4; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      augmented[row] = augmented[row].map((n, i) => n - factor * augmented[col][i]);
    }
  }
  const beta = augmented.map((row) => row[4]);
  const mean = samples.reduce((n, row) => n + row[observation], 0) / samples.length;
  const residual = samples.reduce((n, row) => n + (row[observation] - terms(row).reduce((s, x, i) => s + x * beta[i], 0)) ** 2, 0);
  const total = samples.reduce((n, row) => n + (row[observation] - mean) ** 2, 0);
  const [fixedMs, perDatomMs, perKiBMs, perLookupMs] = beta.map(round);
  return { fixedMs, perDatomMs, perKiBMs, perLookupMs, r2: round(1 - residual / total) };
}

function parse(dir) {
  const read = (name) => fs.readFileSync(path.join(dir, name));
  const bind = JSON.parse(read("binding.json"));
  const cleanup = JSON.parse(read("cleanup.json"));
  assert.equal(bind.phase, "floor");
  assert.equal(cleanup.attempt, bind.attempt);
  assert.equal(cleanup.slotReleased, bind.slot);
  assert.equal(cleanup.rolesRemoved, 3);
  assert.deepEqual(bind.durability.slice(0, 3), ["on", "on", "on"]);
  for (const [file, digest] of Object.entries(bind.sources)) assert.equal(hash(read("source/" + file)), digest);
  assert.equal(hash(JSON.stringify(bind.sources)), bind.sourceHash);

  const rows = read("probe.log").toString().split("\n").filter((x) => x.startsWith("COMPACT "))
    .map((line) => JSON.parse(line.slice(8)));
  for (const row of rows) {
    assert.equal(row.attempt, bind.attempt);
    assert.equal(row.source, bind.sourceHash);
  }
  const start = rows[0];
  const end = rows.at(-1);
  assert.equal(start.kind, "floor-start");
  assert.equal(start.profile, bind.profile);
  assert.equal(end.kind, "floor-end");
  assert.equal(end.database, start.database);
  const matrix = [];
  for (const n of [1, 4, 8, 16, 32, 64])
    for (const bytes of [100, 1024, 4096, 16384])
      for (const lookups of [0, 1, 4, 16, 64]) matrix.push([n + 1, bytes, lookups]);
  const cells = Array.from({ length: matrix.length }, () => []);
  const seen = new Set();
  let previous = start.indexedThrough;
  const advance = (t) => {
    assert(Number.isSafeInteger(t) && t > previous);
    previous = t;
  };
  for (const row of rows.filter((x) => x.kind === "floor-cell")) {
    assert(Number.isSafeInteger(row.block) && row.block >= 0 && row.block < 12);
    assert.deepEqual([row.datoms, row.valueBytes, row.lookups], matrix[row.cell]);
    assert(!seen.has(row.block + "/" + row.cell));
    assert(Number.isFinite(row.peerMs) && row.peerMs > 0 && Number.isFinite(row.io["api-ms"]));
    seen.add(row.block + "/" + row.cell);
    advance(row.t);
    cells[row.cell].push(row);
  }
  const medians = cells.map((cell, i) => {
    assert.equal(cell.length, 12);
    const [datoms, valueBytes, lookups] = matrix[i];
    return { datoms, valueBytes, lookups, applyMs: mid(cell.map((r) => r.io["api-ms"])), peerMs: mid(cell.map((r) => r.peerMs)) };
  });
  const burst = new Map();
  for (const row of rows.filter((x) => x.kind === "floor-ceiling")) {
    assert([0, 1].includes(row.block) && [1, 64].includes(row.depth));
    assert([1, 2, 4, 8, 16, 32, 64, 128].includes(row.members));
    assert(row.wallMs > 0 && row.transactions === 120 && row.t.length === row.transactions);
    for (const t of row.t) advance(t);
    const key = row.depth + "/" + row.members;
    const bin = burst.get(key) ?? new Map();
    assert(!bin.has(row.block));
    bin.set(row.block, row);
    burst.set(key, bin);
  }
  assert.equal(burst.size, 16);
  assert.equal(previous, end.head);
  const txLog = read("tx.log").toString();
  const applyByT = new Map();
  for (const line of txLog.split("\n")) {
    if (!line.includes(":event :tx/process,")) continue;
    const t = Number(line.match(/(?:^|[ ,]):t (\d+)/)?.[1]);
    const apply = Number(line.match(/:apply-msec ([\d.]+)/)?.[1]);
    const logged = Number(line.match(/(?:^|[ ,]):msec ([\d.]+)/)?.[1]);
    const datoms = Number(line.match(/:datom-count (\d+)/)?.[1]);
    assert([t, apply, logged, datoms].every(Number.isFinite));
    assert(!applyByT.has(t));
    applyByT.set(t, { apply, logged, datoms });
  }
  for (const cell of cells) for (const row of cell) assert.equal(applyByT.get(row.t)?.datoms, row.datoms);
  const ceiling = [...burst.values()].map((bin) => {
    assert.equal(bin.size, 2);
    const arms = [bin.get(0), bin.get(1)];
    const { depth, members } = arms[0];
    return { depth, members,
      savesPerSecond: arms.map((r) => round(r.transactions * members * 1000 / r.wallMs)),
      physicalTxPerSecond: arms.map((r) => round(r.transactions * 1000 / r.wallMs)),
      applyP50: arms.map((r) => r.applyP50), peerP50: arms.map((r) => r.peerP50), peerP99: arms.map((r) => r.peerP99),
      applyBusyFraction: arms.map((r) => round(r.t.reduce((sum, t) => {
        const stats = applyByT.get(t);
        assert.equal(stats?.datoms, members + 1);
        return sum + stats.apply;
      }, 0) / r.wallMs)),
      readToLoggedP50: arms.map((r) => mid(r.t.map((t) => applyByT.get(t).logged))),
      walBytesPerMember: arms.map((r) => round((r.after.inserted - r.before.inserted) / r.transactions / r.members)),
      walWritesPerTx: arms.map((r) => round((r.after.writes - r.before.writes) / r.transactions)),
    };
  });
  return {
    source: bind.source, sourceHash: bind.sourceHash, profile: bind.profile, settings: bind.settings,
    samples: { factorial: seen.size, burstTransactions: 3840, perCeilingCell: 240 },
    fixedAndSlopes: { apply: regress(medians, "applyMs"), peer: regress(medians, "peerMs") },
    medians, ceiling,
    indexAdoptions: txLog.split("\n").filter((line) => line.includes(":event :update/adopted-index,")).length,
    hashes: Object.fromEntries(["binding.json", "cleanup.json", "probe.log", "tx.log"].map((f) => [f, hash(read(f))])),
  };
}

console.log(JSON.stringify(process.argv.slice(2).map(parse), null, 2));
