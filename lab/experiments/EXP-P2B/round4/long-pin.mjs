// [EXP-P2B-R4] Why: prove an actual ten-minute logical pin stays exact under continuing mutations, purge and checkpoint.
// Rejected: simulating ten minutes by changing a clock or retaining a native SQLite transaction.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const snapshot = process.argv[2];
assert(snapshot && path.isAbsolute(snapshot));
const module = pathToFileURL(path.join(snapshot, "packages/broker/dist/index.js")).href;
const { HostBroker, snapshotRows, LogFeed } = await import(module);
const attempt = `long-pin-${randomUUID()}`,
  out = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4", attempt);
fs.mkdirSync(out);
assert(fs.statfsSync(out).bavail * fs.statfsSync(out).bsize >= 5 * 1024 ** 3);
const hashes = {};
const visit = (dir) => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, item.name);
    if (item.isDirectory()) visit(f);
    else if (item.isFile())
      hashes[path.relative(snapshot, f)] = createHash("sha256")
        .update(fs.readFileSync(f))
        .digest("hex");
  }
};
visit(path.join(snapshot, "packages/broker/src"));
visit(path.join(snapshot, "packages/broker/dist"));
fs.writeFileSync(
  path.join(out, "inputs.json"),
  JSON.stringify({ attempt, snapshot, hashes, node: process.version }, null, 2),
);
const raw = fs.openSync(path.join(out, "samples.jsonl"), "wx");
const cap = 32 * 1024 ** 2,
  b = await HostBroker.open({
    dir: path.join(out, "store"),
    scopeKey: attempt,
    autoApply: false,
    maxWalBytes: cap,
    minFreeBytes: 5 * 1024 ** 3,
  });
const row = (id, value) => ({
  id,
  entity_id: "subject",
  attribute: ":pin",
  value_type: "string",
  value_string: value,
  value_number: null,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 1,
  recorded_position: -1,
  valid_from: 0,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: id,
});
const transact = (id, rows, priors = []) =>
  b.submit({
    operationId: id,
    attemptId: id,
    sourceK: b.head(),
    reads: { entities: new Set(), scopeWide: false },
    claims: [],
    placeholders: [-1],
    rows,
    priors: new Map(priors.map((r) => [r.id, r])),
    newIds: new Set(rows.filter((r) => r.recorded_position < 0).map((r) => r.id)),
  });
let worker,
  lease,
  readerSerial = 0;
const pending = new Map();
const call = (op, basis) =>
  new Promise((resolve, reject) => {
    const id = ++readerSerial;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, basis });
  });
let commits = 0,
  reads = 0,
  readLimits = 0,
  walRefusals = 0,
  peakWal = 0,
  checkpointMaxMs = 0,
  lastCommit = 0,
  maxCommitGapMs = 0;
const positions = [],
  checkpoints = [];
try {
  const initial = await transact("seed", [row("seed", "seed")]);
  assert.equal(initial.kind, "committed");
  const pin = [...initial.positions.values()][0];
  positions.push(pin);
  lease = await b.pinBasis(pin, "ten-minute-pin");
  worker = new Worker(new URL("./read-worker.mjs", import.meta.url), {
    workerData: { module, file: b.segmentPath, watermark: b.readerWatermark.buffer },
  });
  worker.on("message", (packet) => {
    const p = pending.get(packet.id);
    if (p) {
      pending.delete(packet.id);
      if (packet.error) p.reject(packet.error);
      else p.resolve(packet.result);
    }
  });
  await new Promise((resolve, reject) => {
    worker.once("message", (p) => (p.ready ? resolve() : reject(Error("reader startup"))));
    worker.once("error", reject);
  });
  const expected = (await call("pull", pin)).rows;
  assert.equal(expected[0].id, "seed");
  let prior = (await b.pullAt(pin, { entities: ["subject"] })).rows[0];
  const start = process.hrtime.bigint(),
    deadline = start + 600000000000n;
  let nextCheckpoint = 0;
  while (process.hrtime.bigint() < deadline) {
    const seq = commits + 1,
      id = `write-${seq}`,
      rows = [
        { ...prior, retracted_at: seq + 1, retracted_position: -1 },
        row(id, "x".repeat(512)),
      ];
    let result;
    try {
      result = await transact(id, rows, [prior]);
    } catch (e) {
      if (e.reason !== "wal-capacity-exceeded") throw e;
      walRefusals++;
      await b.checkpoint();
      result = await transact(id, rows, [prior]);
    }
    assert.equal(result.kind, "committed");
    commits++;
    positions.push([...result.positions.values()][0]);
    const t = Number(process.hrtime.bigint() - start) / 1e6;
    if (lastCommit) maxCommitGapMs = Math.max(maxCommitGapMs, t - lastCommit);
    lastCommit = t;
    prior = (await b.pullAt(b.head(), { entities: ["subject"] })).rows[0];
    assert.equal(prior.id, id);
    let answer;
    for (let n = 0; n < 5; n++) {
      try {
        answer = await call("pull", pin);
        break;
      } catch (e) {
        if (e.reason !== "read-operation-limit") throw e;
        readLimits++;
      }
    }
    assert(answer);
    assert.equal(answer.inTransaction, false);
    assert.deepEqual(answer.rows, expected);
    reads++;
    const wal = fs.existsSync(b.segmentPath + "-wal")
      ? fs.statSync(b.segmentPath + "-wal").size
      : 0;
    peakWal = Math.max(peakWal, wal);
    assert(wal <= cap);
    if (t >= nextCheckpoint) {
      const before = performance.now(),
        status = await b.checkpoint();
      const elapsed = performance.now() - before;
      checkpointMaxMs = Math.max(checkpointMaxMs, elapsed);
      checkpoints.push({ atMs: t, elapsed, status: status.events.at(-1) });
      assert.equal((await b.purgeCurrent(b.head())).h, pin);
      nextCheckpoint = t + 5000;
    }
    fs.writeSync(
      raw,
      JSON.stringify({
        seq: commits,
        atMs: t,
        position: b.head(),
        wal,
        readExact: true,
        rowHash: createHash("sha256").update(JSON.stringify(answer.rows)).digest("hex"),
        inTransaction: answer.inTransaction,
      }) + "\n",
    );
    await new Promise((r) => setTimeout(r, 200));
  }
  const pinDurationMs = Number(process.hrtime.bigint() - start) / 1e6;
  assert(pinDurationMs >= 600000);
  assert(commits >= 600);
  assert.equal(reads, commits);
  await lease.release();
  lease = undefined;
  await b.purgeCurrent(b.head());
  assert.equal((await call("pull", pin)).eligible, false);
  assert.deepEqual(
    snapshotRows(await b.fromLogAsync(0, { id: "seed" }, () => true), pin),
    expected,
  );
  const feed = new LogFeed(path.dirname(b.segmentPath));
  let cursor = feed.start();
  const delivered = [];
  for (;;) {
    const page = await feed.poll(cursor);
    if (!page.resolutions.length) break;
    delivered.push(
      ...page.resolutions
        .filter((r) => r.kind === "commit")
        .flatMap((r) => r.transacts.map((t) => t.position)),
    );
    cursor = page.cursor;
  }
  assert.deepEqual(delivered, positions);
  assert.equal((await feed.poll(cursor)).resolutions.length, 0);
  for (const [name, digest] of Object.entries(hashes))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(path.join(snapshot, name)))
        .digest("hex"),
      digest,
    );
  fs.writeFileSync(
    path.join(out, "result.json"),
    JSON.stringify(
      {
        attempt,
        snapshot,
        pin,
        pinDurationMs,
        expectedRows: expected,
        fullFsyncProof: b.stats().fullFsyncProof,
        commits,
        reads,
        readLimits,
        walRefusals,
        peakWal,
        cap,
        checkpointMaxMs,
        maxCommitGapMs,
        checkpoints,
        feedPositions: delivered.length,
        feedCursor: cursor,
        sourceStable: true,
        diagnosticOnly: true,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      attempt,
      out,
      pinDurationMs,
      commits,
      reads,
      peakWal,
      cap,
      checkpointMaxMs,
      maxCommitGapMs,
    }),
  );
} finally {
  if (lease) await lease.release();
  if (worker) {
    await call("close");
    await worker.terminate();
  }
  fs.closeSync(raw);
  await b.close();
}
