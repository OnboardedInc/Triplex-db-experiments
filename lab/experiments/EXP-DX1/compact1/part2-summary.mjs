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
assert.equal(binding.launcher, hash(read("launcher.mjs")));
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

function erasure() {
  assert.equal(last.kind, "erasure-end");
  const proof = of("erasure-proof")[0];
  assert.deepEqual(proof.ids, [{ op: "erase", id: [1, 0], e: "pl:a", a: "ssn" }]);
  assert.deepEqual(proof.empty, [[], []]);
  assert.deepEqual([proof.original.position, proof.erasure.position, proof.repeat.position, proof.fresh.position], [1, 3, 4, 6]);
  const recovery = parse("erasure-recovery.log");
  assert.deepEqual(recovery[0].receipt, proof.erasure);
  assert.deepEqual(recovery[0].marker, proof.marker);
  assert.equal(recovery[0].head, last.head);
  assert.deepEqual(of("owner-retirement").map((r) => r.facts), [513, 2000]);
  const cases = path.join(dir, "source/cases");
  const fixture = JSON.parse(fs.readFileSync(path.join(cases, fs.readdirSync(cases).find((x) => x.startsWith("C07-")))));
  const c07 = of("erasure-c07")[0];
  const input = { ...fixture.input, world: c07.world, basis: { ...fixture.input.basis, tx: c07.position } };
  const test = spawnSync("python3", ["-I", "-B", path.join(dir, "source/lab/bench/lib/w0-oracle.py")],
    { input: JSON.stringify({ op: "evaluate", input }) + "\n", encoding: "utf8" });
  assert.equal(test.status, 0, test.stderr);
  const result = JSON.parse(test.stdout);
  for (const key of ["tasks", "flags", "workItems", "dependencies"]) assert.deepEqual(result[key], fixture.expected[key]);
  const samples = of("protected-price");
  assert.equal(samples.length, last.priceSamples);
  for (const [i, row] of samples.entries()) {
    assert.equal(row.i, i);
    assert.equal(row.block, Math.floor(i / 16));
    assert.equal(row.protected, [0, 3, 5, 6].includes(row.block));
    assert.equal(row.datoms, row.protected ? 13 : 11);
  }
  const perArm = (protect) => {
    const arm = samples.filter((a) => a.protected === protect);
    return Object.fromEntries(["datoms", "valueBytes", "fressianBytes", "prepareMs", "ackMs", "nativeMs"]
      .map((k) => [k, stats(arm.map((a) => a[k]))]));
  };
  return { basis: last.head, ledger: last.ledgerHead, c07: hash(test.stdout), plain: perArm(false), protected: perArm(true) };
}

function ablation() {
  const head = rows[0];
  assert.equal(head.kind, "ablation-start");
  assert.equal(head.people, 192);
  assert.equal(last.kind, "ablation-end");
  assert.match(binding.incumbent ?? "", /^[0-9a-f]{40}$/);
  assert(head.options.groupCommit && head.options.predecessorLookup && head.options.reusePrepared && head.options.smallRows);
  const physical = new Map();
  for (const line of read("tx.log").toString().split("\n").filter((line) => line.includes(":event :tx/process,"))) {
    const num = (k) => Number(line.match(new RegExp("(?:^|[ ,{]):" + k + " ([0-9.]+(?:[eE][+-]?[0-9]+)?)"))?.[1]);
    const record = { tid: num("tid"), t: num("t"), api: num("api-ms"), apply: num("apply-msec"),
      guard: num("tx-fn-ms"), datoms: num("datom-count") };
    assert(Object.values(record).every(Number.isFinite));
    const thread = physical.get(record.tid) ?? new Map();
    assert(!thread.has(record.t));
    thread.set(record.t, record);
    physical.set(record.tid, thread);
  }
  const modes = ["corrected", "compact", "journal", "direct"];
  assert.deepEqual(last.modes, modes);
  const samples = of("ablation-group");
  assert.equal(samples.length, last.groups);
  assert.deepEqual(samples.map((x) => [x.block, x.mode, x.batch]),
    [modes, modes.slice().reverse()].flatMap((order, b) =>
      order.flatMap((mode) => Array.from({ length: 12 }, (_, i) => [b, mode, i]))));
  const groups = {};
  for (const mode of modes) {
    const { t, datoms, apiMs } = head.writers[mode];
    const possible = [...physical].filter(([, thread]) => {
      const seen = thread.get(t);
      return seen?.datoms === datoms && seen.api === apiMs;
    });
    assert.equal(possible.length, 1);
    const [writer, source] = possible[0];
    const arm = samples.filter((v) => v.mode === mode).map((sample) => {
      const observed = source.get(sample.t);
      assert.equal(sample.members, 8);
      assert.equal(observed.datoms, sample.datoms);
      assert.equal(observed.api, sample.apiMs);
      const fullMs = sample.prepareMs + sample.evaluateMs + sample.materializeMs + sample.appendMs;
      return { ...sample, fullMs, applyMs: observed.apply, guardMs: observed.guard };
    });
    groups[mode] = {
      writer,
      perBlock: [0, 1].map((block) => {
        const checked = arm.filter((a) => a.block === block);
        return checked.length * 8000 / checked.reduce((sum, row) => sum + row.fullMs, 0);
      }),
      group: Object.fromEntries(["prepareMs", "speculativeMs", "evaluateMs", "materializeMs", "appendMs", "applyMs",
        "guardMs", "fullMs", "receiptMs", "datoms", "valueBytes", "fressianBytes", "reused"]
        .map((key) => [key, stats(arm.map((a) => a[key]))])),
    };
  }
  assert.equal(new Set(Object.values(groups).map((v) => v.writer)).size, modes.length);
  return { incumbent: binding.incumbent, options: head.options, modes: groups };
}

function mixed() {
  assert.equal(rows[0].kind, "mixed-start");
  assert.equal(last.kind, "mixed-end");
  assert.match(binding.incumbent ?? "", /^[0-9a-f]{40}$/);
  assert.equal(rows[0].people, 640);
  assert.equal(rows[0].options.livePriority, true);
  const samples = of("mixed-window");
  const order = [["corrected", false], ["compact", false], ["corrected", true], ["compact", true]];
  assert.deepEqual(samples.map((s) => [s.path, s.importing]), [...order, ...order.slice().reverse()]);
  assert.deepEqual(samples.map((s) => s.block), [0, 0, 0, 0, 1, 1, 1, 1]);
  assert.equal(samples.length, last.windows);
  const windows = samples.map((s) => {
    assert.equal(s.readers, 64);
    assert.equal(s.liveOffered, 96);
    assert.equal(s.liveMs.length, 96);
    assert.equal(s.importOffered, s.importing ? 24 : 0);
    assert.equal(s.misses.length, s.liveOffered - s.liveAck + s.importOffered - s.importAck);
    assert(s.importOverlap <= s.importAck);
    assert(s.readerOverlap <= s.readers);
    assert.equal(s.factsOverlapped, s.importOverlap * 160);
    return { path: s.path, block: s.block, importing: s.importing, readers: s.readers, readerOverlap: s.readerOverlap,
      liveOffered: s.liveOffered, liveAck: s.liveAck, livePerSecond: s.liveAck * 1000 / s.windowMs,
      write: stats(s.liveMs), read: stats(s.readMs), importOffered: s.importOffered, importAck: s.importAck,
      importOverlap: s.importOverlap, factsPerSecond: s.factsOverlapped * 1000 / s.windowMs,
      errors: s.misses };
  });
  const tailRatios = [];
  for (const path of ["corrected", "compact"]) for (const block of [0, 1]) {
    const [x, y] = [false, true].map((v) => windows.find((w) => w.path === path && w.block === block && w.importing === v));
    tailRatios.push({ path, block, write: y.write.p99 / x.write.p99, read: y.read.p99 / x.read.p99 });
  }
  return { incumbent: binding.incumbent, activeOptions: rows[0].options, windows, tailRatios };
}

const reducers = { surface, history, erasure, ablation, mixed };
assert(reducers[binding.phase], "unexpected probe phase");
console.log(JSON.stringify({ attempt: binding.attempt, source: binding.sourceHash,
  raw: hash(read("probe.log")), ...reducers[binding.phase]() }, null, 2));
