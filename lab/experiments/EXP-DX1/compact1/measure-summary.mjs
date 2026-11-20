// @ts-nocheck -- [EXP-CHECKJS] Dynamic JSON measurements and mode-specific result shapes checked by the analyzer.
// [DX-COMPACT1] Why: join each timed transaction to the emitting database writer and its actual log datom count.
// Rejected: treating the wall time of a grouped member as native apply service.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const dir = process.argv[2];
assert(dir, "provide a durable attempt directory");
const component = process.argv[3] ?? "all";
assert(["all", "benchmark", "load"].includes(component));
const hash = (data) => createHash("sha256").update(data).digest("hex");
const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");
const binding = JSON.parse(read("binding.json"));
const cleanup = JSON.parse(read("cleanup.json"));
assert.equal(cleanup.attempt, binding.attempt);
assert.equal(cleanup.slotReleased, binding.slot);
assert.equal(cleanup.rolesRemoved, 3);
assert.deepEqual(binding.durability.slice(0, 3), ["on", "on", "on"]);
for (const [file, expected] of Object.entries(binding.sources)) assert.equal(hash(fs.readFileSync(path.join(dir, "source", file))), expected);
assert.equal(hash(JSON.stringify(binding.sources)), binding.sourceHash);
const logRows = (text) => text.split("\n").filter((x) => x.startsWith("COMPACT ")).map((line) => {
  const row = JSON.parse(line.slice(8));
  assert.equal(row.attempt, binding.attempt);
  assert.equal(row.source, binding.sourceHash);
  return row;
});
const round = (n) => Number(n.toFixed(5));
const sum = (xs) => xs.reduce((acc, n) => acc + n, 0);
const percentile = (xs, q) => xs.slice().sort((a, b) => a - b)[Math.ceil(xs.length * q) - 1];
const p50 = (xs) => percentile(xs, 0.5);

function txLog() {
  const byTid = new Map();
  for (const line of read("tx.log").split("\n")) {
    if (!line.includes(":event :tx/process,")) continue;
    const field = (name) => Number(line.match(new RegExp("(?:^|[ ,{]):" + name + " ([0-9.]+(?:[eE][+-]?[0-9]+)?)"))?.[1]);
    const t = field("t"), tid = field("tid"), datoms = field("datom-count");
    const apply = field("apply-msec"), api = field("api-ms"), readToLog = field("msec");
    assert([t, tid, datoms, apply, api, readToLog].every(Number.isFinite));
    const byT = byTid.get(tid) ?? new Map();
    assert(!byT.has(t));
    byT.set(t, { apply, api, readToLog, datoms });
    byTid.set(tid, byT);
  }
  return byTid;
}

function writerFor(streams, witness, transactions) {
  const candidates = [...streams].filter(([, byT]) => {
    if (witness) {
      const row = byT.get(witness.t);
      if (row?.datoms !== witness.datoms || row.api !== witness.apiMs) return false;
    }
    // [DX-COMPACT1] Why: older attempts lack the marker, but include the complete native transaction signature.
    // Rejected: choosing a stream from one arm or allowing a different writer for successive arms.
    return transactions.every((r) => {
      const observed = byT.get(r.t);
      return observed?.datoms === r.datoms && (r.applyMs === null || r.applyMs === undefined || observed.api === r.applyMs);
    });
  });
  assert.equal(candidates.length, 1, "ambiguous native processor thread");
  return candidates[0];
}

function bench(rows) {
  const start = rows.find((x) => x.kind === "benchmark-start");
  const end = rows.find((x) => x.kind === "benchmark-end");
  assert.equal(start.people, end.people);
  assert.equal(start.factsPerPerson, 160);
  const arms = rows.filter((x) => x.kind === "arm");
  const cold = rows.filter((x) => x.kind === "cold-prices");
  assert.deepEqual(cold.map((x) => x.arm), ["legacy", "compact", "compact", "legacy"]);
  assert(cold.every((x) => x.count === 32));
  const expectedOrder = [];
  for (const block of [0, 1]) for (const depthIndex of (block === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0])) {
    const depth = [1, 8, 32, 64][depthIndex];
    const order = (block + depthIndex) % 2 === 0 ? ["legacy", "compact"] : ["compact", "legacy"];
    expectedOrder.push(...order.map((arm) => [block, depth, arm]));
  }
  assert.deepEqual(arms.map((x) => [x.block, x.depth, x.arm]), expectedOrder);
  const streams = txLog();
  const resolveWriter = (arm, witness) => writerFor(streams, witness, arms.filter((row) => row.arm === arm).flatMap((row) => row.native));
  const writers = { compact: resolveWriter("compact", start.compactWriter), legacy: resolveWriter("legacy", start.incumbentWriter) };
  assert.notEqual(writers.compact[0], writers.legacy[0]);
  const outputs = [];
  const last = new Map([["compact", start.compactT], ["legacy", start.legacyT]]);
  const positions = new Map([["legacy/_", Math.ceil(start.people / 8)]]);
  for (const arm of arms) {
    assert.equal(arm.observed, 120);
    assert.equal(arm.facts, 240);
    assert.equal(arm.reads.count, 24);
    assert.equal(arm.receipts.length, arm.observed);
    assert.equal(sum(arm.native.map((r) => r.members)), arm.observed);
    for (const [i, row] of arm.receipts.entries()) {
      const largest = arm.block * 4 + [1, 8, 32, 64].indexOf(arm.depth);
      const subject = largest * arm.observed + i;
      assert.equal(row.subject, subject);
      assert.equal(row.receipt.command, "write-" + (10000 + subject));
      assert.equal(row.width, 1 + subject % 3);
      assert(Number.isSafeInteger(row.receipt.nativeT));
    }
    const pos = new Map();
    for (const { receipt } of arm.receipts) {
      const account = receipt.account ?? "_";
      const key = account + "/" + receipt.position;
      assert(!pos.has(key));
      pos.set(key, receipt);
    }
    const byAccount = new Map();
    for (const r of pos.values()) {
      const account = r.account ?? "_";
      const group = byAccount.get(account) ?? [];
      group.push(r.position);
      byAccount.set(account, group);
    }
    for (const [account, values] of byAccount) {
      const key = arm.arm + "/" + account;
      const initial = positions.get(key) ?? Math.ceil((start.people - Number(account.slice(1))) / 10);
      assert.deepEqual(values.slice().sort((a, b) => a - b), values.map((_, i) => initial + i + 1));
      positions.set(key, initial + values.length);
    }
    assert(arm.after.inserted >= arm.before.inserted);
    assert(arm.native.every((r) => r.members >= 1 && r.members <= 8));
    const nativeByT = new Map(arm.native.map((r) => [r.t, r]));
    assert.equal(nativeByT.size, arm.native.length);
    for (const row of arm.native) {
      assert(row.t > last.get(arm.arm));
      last.set(arm.arm, row.t);
      assert.equal(arm.receipts.filter((r) => r.receipt.nativeT === row.t).length, row.members);
    }
    const [writer, writerStream] = writers[arm.arm];
    const native = arm.native.map((r) => writerStream.get(r.t));
    const receiptMs = arm.receipts.map(({ receipt }) => receipt.nativeMicros / 1000).filter(Number.isFinite);
    outputs.push({
      arm: arm.arm, block: arm.block, depth: arm.depth, writer, saves: arm.observed, facts: arm.facts,
      savesPerSecond: round(arm.observed * 1000 / arm.wallMs), physical: arm.native.length,
      maxMembers: Math.max(...arm.native.map((r) => r.members)), meanMembers: round(arm.observed / arm.native.length),
      datomsPerSave: round(sum(arm.native.map((r) => r.datoms)) / arm.observed),
      valueBytesPerSave: round(sum(arm.native.map((r) => r.valueBytes)) / arm.observed),
      fressianBytesPerSave: round(sum(arm.native.map((r) => r.fressianBytes)) / arm.observed),
      nativeApplyMsPerSave: round(sum(native.map((r) => r.apply)) / arm.observed),
      nativeApiMsPerSave: round(sum(native.map((r) => r.api)) / arm.observed),
      readToLoggedP50: p50(native.map((r) => r.readToLog)),
      walBytesPerFact: round((arm.after.inserted - arm.before.inserted) / arm.facts),
      peerWaitP50: receiptMs.length ? p50(receiptMs) : undefined,
      ack: arm.ack, reads: arm.reads,
    });
  }
  assert.equal(last.get("legacy"), end.legacyT);
  assert.equal(last.get("compact"), end.compactT);
  return { people: start.people, factsPerPerson: start.factsPerPerson, arms: outputs, cold };
}

function load(rows) {
  const load = rows.find((x) => x.kind === "load");
  const reads = rows.filter((x) => x.kind === "load-read");
  const heap = rows.find((x) => x.kind === "projection-heap");
  assert.equal(load.people, binding.loadPeople ?? 2000);
  assert.equal(load.facts, 160 * load.people);
  assert.equal(load.txs, load.people / 8);
  if (load.people === 100000) {
    const progress = rows.filter((x) => x.kind === "seed-progress");
    assert.deepEqual(progress.map((r) => [r.people, r.txs]), Array.from({ length: 10 }, (_, i) => [(i + 1) * 10000, (i + 1) * 1250]));
    assert(progress.every((r, i) => r.wallMs > (progress[i - 1]?.wallMs ?? 0) && r.wallMs <= load.wallMs));
  }
  assert(load.before.inserted <= load.after.inserted && load.after.inserted <= load.afterIndex.inserted);
  const spacing = Math.max(23, Math.floor(load.people / 87));
  assert.equal(reads.length, Math.ceil(load.people / spacing));
  reads.forEach((row, i) => {
    assert.equal(row.person, i * spacing);
    assert.equal(row.facts, 160);
    assert(row.ms >= 0);
  });
  assert.equal(heap.subjects, 128);
  assert.equal(heap.facts, 20480);
  return {
    people: load.people, facts: load.facts, txs: load.txs, elapsedMs: load.wallMs,
    indexCatchupMs: load.indexCatchupMs,
    factsPerSecond: round(load.facts * 1000 / load.wallMs),
    bodyBytesPerFact: round(load.bytes / load.facts),
    insertedWalBytesPerFact: round((load.after.inserted - load.before.inserted) / load.facts),
    indexedWalBytesPerFact: round((load.afterIndex.inserted - load.before.inserted) / load.facts),
    coldReads: { count: reads.length, p50: percentile(reads.map((r) => r.ms), 0.5), p99: percentile(reads.map((r) => r.ms), 0.99) },
    heapDeltaPerTouchedSubject: round((heap.heapAfter - heap.heapBefore) / heap.subjects),
  };
}

const output = { attempt: binding.attempt, source: binding.sourceHash, phase: binding.phase };
if (binding.phase === "layout") {
  assert.equal(component, "all");
  const sizes = logRows(read("probe.log")).filter((x) => x.kind === "layout-census");
  assert.deepEqual(sizes.map((r) => r.facts), [1, 3, 25]);
  for (const row of sizes) assert.equal(row.datoms, 11);
  output.sizes = sizes.map(({ facts, datoms, bodyBytes, valueBytes, fressianBytes }) => ({ facts, datoms, bodyBytes, valueBytes, fressianBytes }));
} else if (binding.phase === "prototype") {
  const steps = JSON.parse(read("steps.json"));
  if (component !== "load") {
    assert.equal(steps.benchmark, "completed");
    output.benchmark = bench(logRows(read("benchmark.log")));
  }
  if (component !== "benchmark") {
    assert.equal(steps.load, "completed");
    output.load = load(logRows(read("load.log")));
  }
} else if (binding.phase === "load") {
  assert.notEqual(component, "benchmark");
  output.load = load(logRows(read("probe.log")));
} else if (binding.phase === "benchmark") {
  assert.notEqual(component, "load");
  output.benchmark = bench(logRows(read("probe.log")));
} else throw Error("expected layout, prototype, benchmark or load");

console.log(JSON.stringify(output, null, 2));
