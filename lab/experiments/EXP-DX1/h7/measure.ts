import fs from "node:fs";
import { Worker } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedRung } from "../../../bench/lib/seed.ts";
import { Model } from "../../../bench/lib/model.ts";
import { R } from "../../../bench/lib/observe.ts";
import { generateTrace } from "../../../bench/lib/trace.ts";
import { buildTraceCommand } from "../../../bench/lib/commands.ts";
import { partsOf } from "../../../bench/lib/model.ts";
import { ids } from "../../../bench/lib/world.ts";
const stage = process.argv[2] ?? "before";
const statePath = "/driver/seed.json";
const subjects = 10000,
  threads = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seed: any;
if (fs.existsSync(statePath)) seed = JSON.parse(fs.readFileSync(statePath, "utf8"));
else {
  const scope = `dxh7-${Date.now()}`;
  const comp = await openComposition("reach", "datomic", scope);
  const s = await seedRung({
    comp,
    subjects,
    runTag: scope,
    batchFacts: 2000,
    budgetMs: 600000,
    recordSubjects: new Set(),
    recordAccounts: new Set(),
    historySubjects: new Set(),
    log: console.log,
  });
  if (!s.complete || s.failures.length) throw Error("Incomplete seed");
  seed = {
    scope,
    instant: s.lastInstant,
    position: s.lastPosition,
    state: [...s.state],
    commits: [],
  };
  fs.writeFileSync(statePath, JSON.stringify(seed));
  await comp.close();
}
const model = new Model(subjects);
for (let i = 0; i < subjects; i++) model.seedDigest(i);
for (const [i, c] of seed.commits) model.addCommit(i, c);
const subjectState = new Map<number, any>(seed.state);
const workers: Worker[] = [],
  ready: Promise<void>[] = [],
  stopped: Promise<void>[] = [];
const records: any[][] = [],
  telemetry: any[][] = [];
for (let w = 0; w < threads; w++) {
  const worker = new Worker(new URL("./profile-worker.ts", import.meta.url), {
    workerData: {
      lane: "datomic",
      scope: seed.scope,
      composition: "reach",
      seed: "ns-v2",
      worker: w,
      subjectShards: stage === "after" ? threads : 1,
      subjects,
      accounts: model.accounts,
      historySample: [],
      sampleSubjects: [],
      oracleRate: 0,
      splitShare: 0,
      entityCacheBytes: Number(process.env.DX_H7_ENTITY_BYTES ?? 128 * 1024 ** 2),
    },
  });
  workers.push(worker);
  ready.push(
    new Promise((resolve, reject) => {
      worker.on("message", (m) => {
        if (m.type === "ready") resolve();
        if (m.type === "error") reject(Error(m.message));
      });
      worker.on("error", reject);
    }),
  );
  stopped.push(
    new Promise((resolve) =>
      worker.on("message", (m) => {
        if (m.type === "stopped") {
          console.log(JSON.stringify({ stage, worker: w, type: "stopped", ...m }));
          resolve();
        }
      }),
    ),
  );
  worker.on("message", (m) => {
    if (m.type === "reads") records.push(...m.records);
    if (m.type === "elu") telemetry.push([w, m]);
    if (m.type === "profile")
      console.log(JSON.stringify({ stage, worker: w, type: "profile", profile: m.profile }));
  });
}
await Promise.all(ready);
const writer = await openComposition("reach", "datomic", seed.scope);
const acked = [
  { instant: seed.instant, position: seed.position, txId: "seed-end", at: Date.now() },
];
const hot = new Set<number>();
const broadcast = () => {
  for (const w of workers) w.postMessage({ type: "basis", acked, hot: [...hot] });
};
broadcast();
const traceStart = Date.now();
let writing = true,
  writes = 0;
// [DX-H7] Why: retain real revision churn and the worker's mixed/historical basis choices in this diagnostic.
// Rejected: static seed-only reads (misses invalidation and old-cut correctness).
const writeTask = (async () => {
  for (const event of generateTrace({ seed: "ns-v2", subjects, durationS: 95 }).filter(
    (e) => !e.resend,
  )) {
    await sleep(Math.max(0, traceStart + event.atMs - Date.now()));
    if (!writing) break;
    const st = subjectState.get(event.subject)!;
    const scheduledAbsMs = traceStart + event.atMs;
    const cmd = buildTraceCommand({ runTag: stage, event, state: st, scheduledAbsMs });
    const out = await writer.transact(cmd.operations, {
      commandId: cmd.commandId,
      actor: event.kind,
      preconditions: cmd.preconditions,
    });
    if (!out.ok) throw Error("diagnostic writer failed: " + out.tag);
    const r = out.value;
    st.stamp = cmd.newStamp;
    st.stampId = r.triples.find(
      (t) => t.entityId === ids.placement(event.subject) && t.attribute === ":placement/stamp",
    )!.id;
    st.stampValidFrom = Math.floor(scheduledAbsMs);
    if (cmd.newAddress) {
      st.address = cmd.newAddress;
      st.addressId = r.triples.find(
        (t) => t.entityId === ids.worker(event.subject) && t.attribute === ":worker/address",
      )!.id;
      st.addressValidFrom = cmd.validRange.from;
    }
    const c = {
      instant: r.instant,
      position: r.position,
      txId: r.txId,
      stamp: cmd.newStamp,
      stampValidFrom: Math.floor(scheduledAbsMs),
      parts: partsOf(cmd.added, cmd.addedValidFrom, cmd.removed, cmd.removedValidFrom),
      ackAtMs: Date.now(),
      stream: event.stream,
    };
    model.addCommit(event.subject, c);
    seed.commits.push([event.subject, c]);
    acked.push({ instant: r.instant, position: r.position, txId: r.txId, at: Date.now() });
    hot.add(event.subject);
    writes++;
    broadcast();
  }
})();
const level = (readers: number, phase: number) =>
  workers.forEach((w, k) =>
    w.postMessage({
      type: "level",
      phase,
      readers: Math.floor(readers / threads) + (k < readers % threads ? 1 : 0),
    }),
  );
level(64, -1);
await sleep(30000);
level(0, -1);
await sleep(1500);
for (const [phase, readers] of [64, 256].entries()) {
  const cpuStart = process.cpuUsage();
  const first = telemetry.length,
    from = performance.timeOrigin + performance.now();
  if (phase === 0) workers[0]!.postMessage({ type: "profile-start" });
  level(readers, phase);
  await sleep(30000);
  level(0, phase);
  const to = performance.timeOrigin + performance.now();
  const cpuUsed = process.cpuUsage(cpuStart);
  await sleep(1500);
  if (phase === 0) workers[0]!.postMessage({ type: "profile-stop" });
  const rows = records.filter((r) => r[R.phase] === phase && r[R.start] >= from && r[R.start] < to);
  const lat = rows.map((r) => r[R.latency]).sort((a, b) => a - b);
  let errors = 0,
    violations = 0;
  for (const row of rows) {
    if (row[R.error]) {
      errors++;
      continue;
    }
    const e = model.expected(row[R.subject], row[R.recordedAt], row[R.validAt]);
    if (e.digest !== row[R.digest] || e.stamp !== row[R.stamp] || e.facts !== row[R.facts])
      violations++;
  }
  const samples = telemetry.slice(first).filter(([, m]) => m.t >= from && m.t < to);
  console.log(
    JSON.stringify({
      stage,
      level: readers,
      from,
      to,
      pulls: rows.length,
      pullsPerS: (rows.length - errors - violations) / ((to - from) / 1000),
      verifiedPulls: rows.length - errors - violations,
      processCpuMsPerPull: (cpuUsed.user + cpuUsed.system) / 1000 / rows.length,
      p99: lat[Math.floor(lat.length * 0.99)],
      errors,
      violations,
      workerTelemetry: samples,
    }),
  );
}
writing = false;
await writeTask;
seed.state = [...subjectState];
seed.instant = acked.at(-1)!.instant;
seed.position = acked.at(-1)!.position;
fs.writeFileSync(statePath, JSON.stringify(seed));
console.log(
  JSON.stringify({
    stage,
    writes,
    trace:
      "ns-v2 steady diagnostic; sequential offers; no straddles, no burst, no ACK-loss injection",
  }),
);
await writer.close();
for (const w of workers) w.postMessage({ type: "stop" });
await Promise.all(stopped);
for (const w of workers) await w.terminate();
let allErrors = 0,
  allViolations = 0;
for (const row of records) {
  if (row[R.error]) {
    allErrors++;
    continue;
  }
  const e = model.expected(row[R.subject], row[R.recordedAt], row[R.validAt]);
  if (e.digest !== row[R.digest] || e.stamp !== row[R.stamp] || e.facts !== row[R.facts])
    allViolations++;
}
console.log(JSON.stringify({ stage, allReads: records.length, allErrors, allViolations }));
if (allErrors || allViolations) process.exitCode = 1;
