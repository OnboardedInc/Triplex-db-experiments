import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [mode, repository, output, source, seedDirectory] = process.argv.slice(2);
const prefix = "lab/experiments/EXP-DX1";
const roles = ["tx", "gw-w", "gw-r"];
const empty = { containers: [], volumes: [], networks: [] };
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const write = (file, result) => fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
const producer = (file) => import(pathToFileURL(path.resolve(repository, file)).href);
const git = (...args) => execFileSync("git", ["-C", repository, ...args], { encoding: "utf8" }).trim();
assert.match(source, /^[a-f0-9]{40}$/);
assert.equal(git("rev-parse", "HEAD"), source);
assert.equal(git("diff", "--name-only", "HEAD"), "");
const { fieldPlan } = await producer(prefix + "/w1/field/bench-check.ts");
const { jvmPolicy, serverArms } = await producer(prefix + "/jvm1/policy.mjs");
const plan = fieldPlan();

function percentile(xs, q) {
  return xs.toSorted((a, b) => a - b)[Math.ceil(q * xs.length) - 1];
}

function phaseReading(phase, expected) {
  const { schedule, label } = expected;
  assert.equal(phase.label, label);
  assert.equal(phase.scheduleSha256, hash(JSON.stringify(schedule)));
  assert.equal(phase.offered, schedule.length);
  assert.deepEqual(phase.failures, []);
  assert.equal(phase.rows.length, phase.offered);
  assert.deepEqual(phase.readback, { journalEntries: phase.offered, fields: phase.offered });
  assert.deepEqual(phase.counts, { native: phase.offered, sameSubjectShared: 0, logical: phase.offered });
  const byId = new Map(phase.rows.map((row) => [row.id, row]));
  const basis = phase.rows.toSorted((a, b) => a.p - b.p);
  assert.equal(byId.size, phase.offered);
  assert.equal(new Set(basis.map((r) => r.t)).size, phase.offered);
  for (const [i, row] of basis.entries()) {
    assert.equal(row.p, phase.headBefore + 1 + i);
    assert(row.size === 1 && Number(row.t) > 0 && Number.isFinite(row.clock));
    assert(!i || basis[i - 1].clock < row.clock);
    assert(row.due <= row.hand && row.hand < row.end && row.end <= phase.wall);
    assert(row.bytes > 0 && row.ops > 0);
    for (const key of ["prepareMs", "awaitMs", "gatewayQueueMs", "nativeEntryMs", "readyToNativeMs"]) {
      assert(Number.isFinite(row[key]) && row[key] >= 0, key);
    }
  }
  const accounts = new Map();
  for (const offer of schedule) {
    const row = byId.get([label, offer.account, offer.person, offer.ordinal].join("-"));
    assert(row && row.account === offer.account && row.person === offer.person && row.due === offer.ms);
    if (!accounts.has(row.account)) accounts.set(row.account, []);
    accounts.get(row.account).push(row.end - row.due);
  }
  const counts = Object.fromEntries([...accounts].map(([account, times]) => [account, {
    acked: times.length, p50Ms: percentile(times, 0.50), p99Ms: percentile(times, 0.99),
  }]));
  assert.deepEqual(phase.byAccount, counts);
  assert.equal(phase.perSecond, 1000 * phase.offered / phase.wall);
  const p99 = (fn) => percentile(basis.map(fn), 0.99);
  assert.equal(phase.p99Ms, p99((r) => r.end - r.due));
  return {
    label, offered: phase.offered, byAccount: counts, p99Ms: phase.p99Ms, wallMs: phase.wall,
    throughput: phase.perSecond, peakBacklog: phase.peakBacklog,
    rowsSha256: hash(JSON.stringify(phase.rows)),
    queueP99: p99((r) => r.gatewayQueueMs + r.nativeEntryMs),
    prepareP99: p99((r) => r.prepareMs),
    stageP99Ms: {
      scheduledToSender: p99((r) => r.hand - r.due),
      readyToNative: p99((r) => r.readyToNativeMs),
      nativeAwait: p99((r) => r.awaitMs),
    },
  };
}

function stackReading(directory, arm, policy, start) {
  assert.equal(arm.source, source);
  assert.match(arm.slot, /^tx2-dxt1-jvm1-[a-f0-9-]{36}$/);
  assert.deepEqual(read(path.join(directory, "identity.json")), arm);
  const cleanup = path.join(directory, "cleanup.json");
  assert.deepEqual(read(cleanup), empty);
  assert(fs.statSync(cleanup).mtimeMs >= start);
  assert.deepEqual(read(path.join(directory, "durability.json")), { settings: "on|on|on" });
  const placements = read(path.join(directory, "placements.json"));
  assert.equal(placements.sender, policy.cpus.sender);
  const root = path.join(directory, "engines", arm.slot);
  const records = {};
  for (const role of roles) {
    const engine = placements.engines.find((e) => e.role === role);
    assert(engine && engine.cpus === policy.cpus[role] && engine.bytes === policy.memory[role] * 2 ** 20);
    assert.match(engine.id, /^[a-f0-9]{64}$/);
    assert(Date.parse(engine.startedAt) >= start - 1000);
    const dir = path.join(root, "trace/raw");
    const logs = fs.readdirSync(dir).filter((name) => name.match(new RegExp("^" + role + "\\.log(?:\\.[0-9]+)?$")));
    const collector = policy.opts[role].includes("-XX:+UseSerialGC") ? "Serial" : "G1";
    assert(logs.length);
    let pauses = 0;
    const logHashes = {};
    for (const name of logs) {
      const bytes = fs.readFileSync(path.join(dir, name));
      const lines = bytes.toString().trim().split("\n");
      assert(lines.some((line) => /^\[\d{4}-\d\d-\d\dT[\d:.]+(?:[+-]\d{4}|Z)\]/.test(line)));
      for (const line of lines) {
        if (/\[gc\s*\].*\bPause .* \d+\.\d+ms$/.test(line)) pauses++;
        if (/\[gc\s*\].*Using /.test(line)) assert(line.includes("Using " + collector));
      }
      assert(fs.statSync(path.join(dir, name)).mtimeMs >= Date.parse(engine.startedAt) - 1000);
      logHashes[name] = hash(bytes);
    }
    records[role] = { id: engine.id, cores: engine.cpus.split(",").length, collector, pauses, logHashes };
  }
  return records;
}

const sample = { ...plan[0], schedule: plan[0].schedule.slice(0, 8) };
if (mode === "produce-small") {
  const { DatomicClient } = await producer("packages/datomic/dist/index.js");
  const { withStack } = await producer(prefix + "/w1/bench.ts");
  const { fieldPhase, scopeKey } = await producer(prefix + "/w1/field/traffic.ts");
  const start = Date.now();
  const arm = { source, slot: "tx2-dxt1-jvm1-" + randomUUID(), nonce: randomUUID(), population: "deep", lookup: "individual", readers: false };
  const relative = path.join(output, "results", "small");
  fs.mkdirSync(relative, { recursive: true });
  await withStack(relative, arm, async (env) => {
    const client = new DatomicClient(env.DATOMIC_URL, 35000);
    try {
      const scope = scopeKey(arm.nonce + "-small");
      const opened = await client.create(scope, "lean", true, 35000);
      assert(opened.created && opened.strictRecordClocks);
      const result = await fieldPhase(client, opened.db, 0, arm.nonce, sample.label, sample.schedule, false, new Map());
      write(path.join(relative, "producer-small.json"), { arm, start, scope, db: opened.db, result });
    } finally {
      client.close();
    }
  }, false, "individual", false, { policy: jvmPolicy("server", "present"), deadline: start + 240_000 });
} else if (mode === "check-small") {
  // [DX-BM1] Why: exercise the same producer's real offer, receipt, journal and field checks before restoring large arms.
  // Rejected: a fabricated agreement fixture that would miss wrong stage fields or incompatible native options.
  const directory = path.join(output, "results", "small");
  const file = path.join(directory, "producer-small.json");
  const { arm, start, scope, db, result } = read(file);
  assert(fs.statSync(file).mtimeMs >= start);
  assert.equal(scope, JSON.stringify(["triplex-scope-v1", "test", "field", arm.nonce + "-small", 0]));
  assert.equal(db, "s2-" + Buffer.from(scope).toString("base64url"));
  assert.equal(result.headBefore, 0);
  write(path.join(directory, "collector-small.json"), {
    arm, start, producerSha256: hash(fs.readFileSync(file)), reading: phaseReading(result, sample),
    roles: stackReading(directory, arm, jvmPolicy("server", "present"), start),
  });
} else {
  assert.equal(mode, "check-campaign");
  const seed = read(path.join(seedDirectory, "seed.json"));
  assert.equal(seed.source, source);
  assert.equal(seed.facts, 16_245_050);
  assert.deepEqual(read(path.join(seedDirectory, "results/seed/cleanup.json")), empty);
  const results = path.join(output, "results");
  const campaign = read(path.join(results, "comparison.json"));
  assert.equal(campaign.source, source);
  assert.deepEqual(campaign.results.map((r) => r.name), serverArms);
  const comparisons = [];
  for (const result of campaign.results) {
    const directory = path.join(results, result.name);
    const { arm, policy, seed: requested, predictionHash, startedAt, deadline } = read(path.join(directory, "request.json"));
    assert.deepEqual(requested, seed);
    assert.equal(result.dumpSha256, seed.dumpSha256);
    assert.deepEqual(arm, result.arm);
    assert.deepEqual(policy, jvmPolicy("server", result.name));
    assert.equal(predictionHash, hash(fs.readFileSync(path.join(results, "PREDICTIONS.md"))));
    assert.equal(result.predictionHash, predictionHash);
    const file = path.join(directory, "field-summary.json");
    const { arm: recorded, summary } = read(file);
    assert.deepEqual(recorded, arm);
    assert.deepEqual(summary, result.summary);
    assert.equal(result.evidenceSha256, hash(fs.readFileSync(file)));
    assert(fs.statSync(file).mtimeMs >= startedAt && fs.statSync(file).mtimeMs <= deadline);
    assert(fs.statSync(path.join(directory, "result.json")).mtimeMs >= fs.statSync(file).mtimeMs);
    assert.deepEqual(read(path.join(directory, "result.json")), result);
    let cut = seed.seedCut;
    const baselines = new Map();
    const phases = plan.map((expected, index) => {
      const raw = path.join(directory, expected.label + ".json");
      assert(fs.statSync(raw).mtimeMs >= startedAt && fs.statSync(raw).mtimeMs <= fs.statSync(file).mtimeMs);
      const phase = read(raw);
      assert.equal(phase.headBefore, cut);
      cut += phase.offered;
      const measured = phaseReading(phase, expected);
      if (expected.baseline === expected.label) baselines.set(expected.label, measured.byAccount[9].p99Ms);
      measured.quietRatio = measured.byAccount[9].p99Ms / baselines.get(expected.baseline);
      for (const key of ["label", "offered", "rowsSha256", "queueP99", "prepareP99", "p99Ms"]) {
        assert.equal(summary[index][key], measured[key]);
      }
      assert.equal(summary[index].quietP99Ratio, measured.quietRatio);
      return measured;
    });
    comparisons.push({ name: result.name, arm, phases, roles: stackReading(directory, arm, policy, startedAt) });
  }
  write(path.join(results, "collector.json"), { source, dumpSha256: seed.dumpSha256, comparisons });
}
