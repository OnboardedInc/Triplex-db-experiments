// [DX-BM1] Why: exercise actual packed replica reads, observation encoding and the disk-backed result store without contacting a gateway.
// Rejected: a CPU spinner would leave out the read path, memory traffic, answer checks and real spill.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const [repo, out, workerText, secondsText, nonce, ...options] = process.argv.slice(2);
const worker = Number(workerText),
  seconds = Number(secondsText);
assert(
  Number.isInteger(worker) &&
    worker >= 0 &&
    worker < 6 &&
    seconds > 0 &&
    /^[a-z0-9-]+$/.test(nonce),
);
const load = (name) => import(pathToFileURL(path.join(repo, name)).href);
const { ReplicaReader, prepareEntity, publicRow } = await load("lab/bench/lib/replica-reads.ts");
const { packEntity } = await load("packages/datomic/dist/index.js");
const { ReadRecords } = await load("lab/bench/lib/read-records.ts");
const { observe } = await load("lab/bench/lib/observe.ts");
const { readObservation } = await load("lab/bench/lib/read-observation.ts");
const store = new ReadRecords(path.join(out, "observations"));
const reader = new ReplicaReader(12 * 1024 ** 2, undefined, 32 * 1024 ** 2);
const source = [],
  expected = [],
  roots = [];
const meta = {
  recordedAt: 100,
  createdBy: "fixture",
  entityType: "Person",
  schemaVersion: 1,
  txId: "fixture",
};
for (let i = 0; i < 96; i++) {
  const root = "subject-" + i,
    world = [];
  roots.push(root);
  const rootRows = [];
  for (let c = 0; c < 3; c++) {
    const child = root + "-child-" + c;
    rootRows.push({
      id: child + "-ref",
      entityId: root,
      attribute: ":children",
      value: { type: "ref", value: child },
      position: 1,
      validFrom: 0,
      publicMetadata: meta,
    });
    const rows = Array.from({ length: 10 + (i % 5) }, (_, j) => ({
      id: child + "-" + j,
      entityId: child,
      attribute: ":answer/" + j,
      value: { type: "string", value: "value-" + i + "-" + c + "-" + j },
      position: 1,
      validFrom: 0,
      publicMetadata: meta,
    }));
    source.push([child, 1, prepareEntity(child, packEntity(1, rows))]);
    world.push(...rows.map(publicRow));
  }
  source.push([root, 1, prepareEntity(root, packEntity(1, rootRows))]);
  world.push(...rootRows.map(publicRow));
  expected.push(observe({ triples: world }));
}
reader.install({
  floor: 1,
  position: 1,
  valid: true,
  entities: source,
  history: [],
  times: [[100, 1]],
  timeSafe: true,
  strictRecordClocks: true,
  clockEnds: [[100, 1]],
});
const identity = {
  nonce,
  worker,
  fixture: createHash("sha256").update(JSON.stringify(expected)).digest("hex"),
};
fs.writeFileSync(path.join(out, "ready.json"), JSON.stringify(identity), { flag: "wx" });
const trigger = path.join(path.dirname(out), "go.json");
const waitLimit = Date.now() + 120000;
while (!options.includes("--self-test") && !fs.existsSync(trigger)) {
  if (Date.now() > waitLimit) throw Error("Missing matched block start");
  await delay(10);
}
const startAt = options.includes("--self-test")
  ? Date.now()
  : JSON.parse(fs.readFileSync(trigger, "utf8")).at;
await delay(Math.max(0, startAt - Date.now()));
const start = performance.now(),
  cpu = process.cpuUsage(),
  cpuEnd = start + seconds * 1000;
const miss = async () => {
  throw Error("The local fixture requested a gateway");
};
let count = 0,
  materialized = 0,
  batch = [];
let fraction = 0.025,
  lastCost = process.cpuUsage(),
  lastPulse = performance.now(),
  lastCount = 0;
const ioBytes = () => {
  if (process.platform !== "linux") return null;
  const match = /^write_bytes:\s+(\d+)$/m.exec(fs.readFileSync("/proc/self/io", "utf8"));
  return match ? Number(match[1]) : null;
};
const ioStart = ioBytes();
const basis = { recordedPosition: 1, validAt: 100 };
while (performance.now() < cpuEnd) {
  const pulse = performance.now();
  do {
    const subject = (count * 61 + worker * 7) % roots.length,
      before = performance.now();
    const rows = ((count * 9973) % 10000) / 10000 < fraction;
    if (rows) materialized++;
    const hit = readObservation(await reader.pullAt(roots[subject], basis, miss, undefined, rows));
    const exp = expected[subject],
      value = hit.observed;
    assert(
      hit.route === "replica" &&
        hit.roundTrips === 0 &&
        value.digest === exp.digest &&
        value.facts === exp.facts &&
        value.bytes === exp.bytes,
    );
    batch.push([
      0,
      subject,
      100,
      100,
      performance.timeOrigin + before,
      performance.now() - before,
      value.stamp,
      value.facts,
      value.digest,
      value.bytes,
      hit.depth,
      0,
      null,
      0,
      1,
      0,
      0,
      0,
      "replica",
      hit.language ?? "",
      0,
    ]);
    if (batch.length === 256) {
      store.push(...batch);
      batch = [];
    }
    count++;
  } while (performance.now() < pulse + 15 && performance.now() < cpuEnd);
  // [DX-BM1] Why: pace real completions and copied tuples against the measured six-core local workload.
  // Rejected: adding unrelated CPU work merely to hit an event-loop percentage.
  if (performance.now() - lastPulse >= 1000) {
    const cost = process.cpuUsage(lastCost),
      elapsed = performance.now() - lastPulse,
      use = (cost.user + cost.system) / (1000 * elapsed),
      throughput = (count - lastCount) / elapsed;
    const gain = throughput < 13.5 && use > 0.7 ? -0.015 : (0.76 - use) * 0.09;
    fraction = Math.min(0.8, Math.max(0, fraction + gain));
    lastPulse = performance.now();
    lastCost = process.cpuUsage();
    lastCount = count;
  }
  const pace = start + count / 15;
  await delay(
    Math.max(
      0,
      Math.min(
        cpuEnd - performance.now(),
        Math.max(pulse + 20 - performance.now(), pace - performance.now()),
      ),
    ),
  );
}
if (batch.length) store.push(...batch);
store.checkpoint();
const end = performance.now(),
  cost = process.cpuUsage(cpu),
  ioEnd = ioBytes(),
  reread = new ReadRecords(path.join(out, "observations"), true);
assert.equal(count, reread.length);
let checked = 0;
for (const row of reread) {
  assert.equal(row[8], expected[row[1]].digest);
  assert.equal(row[7], expected[row[1]].facts);
  checked++;
}
assert.equal(checked, count);
const result = {
  ...identity,
  startedAt: startAt,
  seconds: (end - start) / 1000,
  count,
  checked,
  materialized,
  spillBytes: store.encodedBytes,
  blockWriteBytes: ioStart === null || ioEnd === null ? null : ioEnd - ioStart,
  cpuSeconds: (cost.user + cost.system) / 1e6,
  local: reader.diagnostics.local,
  fallback: reader.diagnostics.fallback,
};
assert.equal(result.fallback, 0);
assert.equal(result.local, count);
fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(result) + "\n", { flag: "wx" });
