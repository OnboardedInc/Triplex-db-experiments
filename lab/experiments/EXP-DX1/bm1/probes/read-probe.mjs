// [DX-BM1] Why: identify each native counter by the actual peer parent and physical database position.
// Rejected: associating a nearby transaction or treating an absent counter map as a zero count.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const load = (p) => import(pathToFileURL(path.join(process.cwd(), p)).href);
const { records, alignClockRecord, percentile } = await load("lab/trace/report.mjs");
const { bindNativeTransaction } = await load("lab/trace/native-transactions.mjs");
const root = process.argv[2];
const get = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const hash = (x) => createHash("sha256").update(x).digest("hex");
async function hashFile(file) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
const bounds = (xs) =>
  Object.fromEntries([0.5, 0.9, 0.99].map((p) => ["p" + p * 100, percentile(xs, p)]));
const total = (xs) => xs.reduce((a, b) => a + b, 0);
const cuts = ["off", "on", "on", "off"];
const scopePlan = get(path.join(root, "plan.json"));
const snapshot = hash(fs.readFileSync(path.join(root, "snapshot.json")));

function checkedReads(io) {
  assert(io?.reads && typeof io.reads === "object" && !Array.isArray(io.reads));
  assert(Object.values(io.reads).every((n) => Number.isFinite(n) && n >= 0));
  return io.reads;
}

async function arm(directory, mode, setting, smoke = false) {
  assert.equal(path.dirname(directory), root);
  const info = get(path.join(directory, "foreground.json"));
  const request = get(path.join(directory, "attempt.json"));
  const restore = get(path.join(directory, "restored-proof.json"));
  const release = get(path.join(directory, "cleanup.json"));
  const bind = info.binding;
  assert.equal(bind.source, scopePlan.source);
  assert.equal(bind.checkpointSha256, scopePlan.checkpoint);
  assert.deepEqual(
    [bind.slot, bind.source, bind.nonce],
    [request.slot, request.source, request.nonce],
  );
  assert.deepEqual(
    [restore.slot, restore.source, restore.snapshot],
    [bind.slot, bind.source, snapshot],
  );
  assert.deepEqual(release, { slot: bind.slot, source: bind.source, remaining: [] });
  assert.deepEqual([bind.mode, bind.setting], [mode, setting]);
  const offers = get(path.join(directory, "offers.json"));
  const tape = fs.readFileSync(path.join(directory, "rows.jsonl"), "utf8");
  assert.equal(hash(JSON.stringify(offers)), info.tapeSha256);
  assert.equal(hash(tape), info.rowsSha256);
  assert(
    info.errors.length === 0 && info.eligible === info.offers && offers.length === info.eligible,
  );
  const duration = smoke ? 4000 : 90000;
  assert(
    info.limitMs === duration &&
      info.interval >= duration - 100 &&
      info.interval < duration + 30000 &&
      info.gatewayReadsDuringInterval === 0,
  );
  const writes = tape
    .trim()
    .split("\n")
    .map(JSON.parse)
    .sort((a, b) => a.at - b.at);
  assert.deepEqual(
    writes.map(({ id, facts, at }) => ({ id, facts, at })),
    offers.map(({ id, facts, at }) => ({ id, facts, at })),
  );
  const rows = new Map(writes.map((r) => [r.traceId, r]));
  const positions = new Map(writes.map((r) => [r.t, r]));
  assert.equal(rows.size, offers.length);
  assert.equal(positions.size, offers.length);
  assert(writes.every((r) => Number.isFinite(r.ackMs) && r.ackMs >= 0 && r.old !== r.new));
  const raw = path.join(directory, "engines", bind.slot, "trace/raw");
  let clock;
  function aligned(r) {
    assert(
      r.run === bind.slot && r.slot === bind.slot && r.source === bind.source && r.clock?.bootId,
    );
    clock ??= r.clock;
    assert.equal(r.clock.bootId, clock.bootId);
    const a = alignClockRecord(r, clock);
    assert.notEqual(a.clockAlignmentQualified, false);
    return a;
  }
  const completion = get(path.join(raw, "tx.jfr-complete.jsonl"));
  assert.equal(aligned(completion).type, "jfr-complete");
  assert.equal(completion.role, "tx");
  assert(
    completion.recordingStart <= info.startedAt && completion.at >= info.startedAt + duration - 100,
  );
  assert.equal(completion.fileSha256, await hashFile(path.join(raw, "tx.jfr")));
  const client = new Map(),
    gateways = new Map(),
    native = new Map(),
    functions = new Map();
  for (const file of fs.readdirSync(raw).filter((f) => /^node-\d+-0\.jsonl\.gz$/.test(f))) {
    for await (const e of records(path.join(raw, file))) {
      if (e.type !== "request" || e.name !== "bm1.foreground" || !rows.has(e.traceId)) continue;
      assert.equal(e.attributes?.commandId, rows.get(e.traceId).id);
      assert(!client.has(e.traceId));
      client.set(e.traceId, aligned(e));
    }
  }
  for await (const e of records(path.join(raw, "gw-w.jsonl"))) {
    if (e.type !== "request" || !e.attributes?.datomicT || !rows.has(e.traceId)) continue;
    const parent = client.get(e.traceId);
    assert(e.process === "gw-w" && e.kind === "commit" && e.attributes.status === 200);
    assert.equal(e.attributes.databaseHash, hash(bind.db));
    assert.equal(e.attributes.datomicT, rows.get(e.traceId).t);
    assert(parent?.spans.some((s) => s.id === e.parent && s.name === "client.http"));
    assert(!gateways.has(e.traceId));
    gateways.set(e.traceId, aligned(e));
  }
  for await (const e of records(path.join(raw, "tx.jfr.jsonl"))) {
    if (e.nativeType === "triplex.TransactionFunction" && gateways.has(e.traceId)) {
      const peer = gateways
        .get(e.traceId)
        .spans.find((s) => s.id === e.parent && s.layer === "peer-wait");
      if (!peer) continue;
      const f = aligned(e);
      assert(f.start >= peer.start - 1 && f.end <= peer.end + 1 && !functions.has(f.traceId));
      functions.set(f.traceId, {
        history: f.historyRange ?? "individual",
        millis: f.end - f.start,
        peer: peer.end - peer.start,
      });
    }
    if (
      e.nativeType !== "triplex.NativeTransaction" ||
      e.databaseHash !== hash(bind.db) ||
      !positions.has(e.datomicT)
    )
      continue;
    const id = positions.get(e.datomicT).traceId;
    assert(!native.has(id) && gateways.has(id));
    const txn = bindNativeTransaction(gateways.get(id), [aligned(e)]);
    assert(txn);
    native.set(id, txn);
  }
  assert.deepEqual(
    [client.size, gateways.size, native.size, functions.size],
    Array(4).fill(writes.length),
  );
  const observations = writes.map((w) => {
    const s = native.get(w.traceId).nativeStats;
    const io = gateways.get(w.traceId).attributes.transactionIoStats;
    // The native processor and the gateway's tx-with share an identity and have different boundaries.
    return {
      id: w.id,
      t: w.t,
      traceId: w.traceId,
      apply: s["apply-msec"],
      ack: w.ackMs,
      reads: checkedReads(s["io-stats"]),
      gatewayReads: io?.api === "tx-with" ? checkedReads(io) : undefined,
      gatewayTxWithMs: io?.api === "tx-with" ? io["api-ms"] : undefined,
      ...functions.get(w.traceId),
    };
  });
  const before = get(path.join(directory, "before-counters.json"));
  const after = get(path.join(directory, "after-counters.json"));
  assert(before.at * 1000 <= info.startedAt && after.at * 1000 >= info.startedAt + duration - 100);
  assert.deepEqual(before.cpus, after.cpus);
  const affinity = Object.fromEntries(
    Object.entries(before.processes).map(([role, v]) => {
      assert.equal(v.pid, after.processes[role].pid);
      assert.equal(v.cpus, after.processes[role].cpus);
      return [role, v.cpus];
    }),
  );
  assert.deepEqual(affinity, { pg: "1", tx: "0", "gw-w": "2", "gw-r": "4,8" });
  const pg = {
    walBytes: Number(after.postgres.wal.wal_bytes) - Number(before.postgres.wal.wal_bytes),
    walWriteMs: after.postgres.wal.wal_write_time - before.postgres.wal.wal_write_time,
    dbReadMs: after.postgres.db.blk_read_time - before.postgres.db.blk_read_time,
    method: before.postgres.walSyncMethod,
  };
  const local = {
    count: total(info.fixture.map((f) => f.count)),
    callsPerSecond: total(info.fixture.map((f) => f.count / f.seconds)),
    cores: total(info.fixture.map((f) => f.cpuSeconds / f.seconds)),
    bytesPerSecond: total(info.fixture.map((f) => f.spillBytes / f.seconds)),
  };
  assert.equal(info.fixture.length, mode === "readers" && setting === "on" ? 6 : 0);
  assert(
    info.fixture.every(
      (f) =>
        f.nonce === bind.nonce &&
        f.checked === f.count &&
        f.fallback === 0 &&
        f.startedAt === info.startedAt,
    ),
  );
  const result = {
    binding: info.binding,
    startedAt: info.startedAt,
    n: observations.length,
    local,
    pg,
    affinity,
    tape: info.tapeSha256,
    prior: info.oldRowsSha256,
    requestSequence: hash(JSON.stringify(writes.map((w) => w.intentSha256))),
    ack: bounds(observations.map((m) => m.ack)),
    apply: bounds(observations.map((m) => m.apply)),
    txWith: bounds(observations.map((m) => m.gatewayTxWithMs).filter(Number.isFinite)),
    peer: bounds(observations.map((m) => m.peer)),
    sql: total(observations.map((m) => m.reads.sql ?? 0)),
    gatewayReads: observations.filter((m) => m.gatewayReads).length,
  };
  if (mode === "growth") {
    try {
      result.storage = readStorage(path.join(directory, "tx.log"), observations, bind, setting);
    } catch (error) {
      result.storageError = String(error);
    }
  }
  fs.writeFileSync(
    path.join(directory, "joined-native.jsonl"),
    observations.map((s) => JSON.stringify(s)).join("\n") + "\n",
    { flag: "wx" },
  );
  return result;
}

function readStorage(file, observations, bind, setting) {
  const match = new Map(observations.map((o) => [o.id, o]));
  const logged = new Map();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.startsWith("BM1-STORAGE ")) continue;
    const r = JSON.parse(line.slice(12));
    if (!match.has(r.id)) continue;
    assert(r.schema === "bm1-storage/1" && r.run === bind.slot && r.source === bind.source);
    assert(
      !logged.has(r.id) &&
        r.traceId === match.get(r.id).traceId &&
        Number(r.basisT) < Number(match.get(r.id).t),
    );
    logged.set(r.id, r);
  }
  assert.equal(logged.size, observations.length);
  const calibrations = [...logged.values()].filter((x) => x.calibration);
  assert.equal(calibrations.length, 1);
  const c = calibrations[0];
  assert(c.calibration.found && c.id.startsWith("bm1-cal-"));
  const cal = ["cal-first", "cal-repeat"].map(
    (k) => checkedReads(c.rows.find((m) => m.label === k)?.io).sql ?? 0,
  );
  const calTotal = checkedReads(c.calibration.io).sql ?? 0;
  // Few nested reads can be fully attributed when the controlled first/repeat observation is all cache hits.
  const calibration =
    total(cal) > 0 && cal[1] === 0 && calTotal === cal[0] ? "inclusive" : "unresolved";
  const counts = {},
    actuals = [...logged.values()].filter((x) => x !== c);
  let processSql = 0,
    functionSql = 0,
    unmatched = 0;
  for (const r of actuals) {
    const n = match.get(r.id);
    const nativeSql = n.reads.sql ?? 0,
      outer = checkedReads(r.outer).sql ?? 0;
    processSql += nativeSql;
    functionSql += outer;
    let child = 0;
    for (const row of r.rows) {
      assert(
        row.nanos >= 0 &&
          [
            "new-id-single",
            "new-id-range",
            "old-live-row",
            "retirement-marker",
            "retract-row",
            "revision",
          ].includes(row.label),
      );
      const counter = (counts[row.label] ??= { calls: 0, reads: {} });
      counter.calls++;
      const reads = checkedReads(row.io);
      child += reads.sql ?? 0;
      for (const [key, value] of Object.entries(reads))
        counter.reads[key] = (counter.reads[key] ?? 0) + value;
    }
    if (child > outer || outer > nativeSql) unmatched++;
  }
  const decisions = Object.groupBy(observations, (o) => o.history);
  assert(
    setting === "off"
      ? decisions.individual?.length === observations.length
      : (decisions.empty?.length ?? 0) > 0,
  );
  const splitQualified = calibration === "inclusive" && unmatched === 0;
  const labeled = total(Object.values(counts).map((r) => r.reads.sql ?? 0));
  return {
    n: actuals.length,
    countByKind: counts,
    splitQualified,
    unmatched,
    calibration,
    cal,
    calTotal,
    nativeSql: processSql,
    functionSql,
    residual: splitQualified ? processSql - labeled : null,
    bySort: observations.reduce((out, o) => {
      for (const k of ["avet", "eavt", "aevt", "avet-load", "eavt-load", "aevt-load"])
        out[k] = (out[k] ?? 0) + (o.reads[k] ?? 0);
      return out;
    }, {}),
    decisions: Object.fromEntries(Object.entries(decisions).map(([k, v]) => [k, v.length])),
  };
}

function decision(mode, arms) {
  if (arms.length !== 4 || arms.some((a, i) => a.binding.setting !== cuts[i]))
    return { verdict: "unjudged", reason: "Four independently bound blocks required" };
  assert(arms.every((a) => a.tape === arms[0].tape && a.prior === arms[0].prior));
  assert.equal(new Set(arms.map((a) => a.binding.nonce)).size, 4);
  if (mode === "growth") {
    if (arms.some((a) => !a.storage)) {
      return {
        verdict: "unjudged",
        reason:
          "Native counters are retained. At least one transaction-function counter split did not bind.",
        sqlPerCommit: arms.map((a) => a.sql / a.n),
      };
    }
    const repeats = [
      [0, 1],
      [3, 2],
    ].map(([i, j]) => {
      const a = arms[i].storage,
        b = arms[j].storage;
      return {
        sqlDelta: b.nativeSql / b.n - a.nativeSql / a.n,
        newIdCallsDelta:
          (b.countByKind["new-id-range"]?.calls ?? 0) -
          (a.countByKind["new-id-single"]?.calls ?? 0),
        avetVisitsRatio: a.bySort.avet > 0 ? b.bySort.avet / a.bySort.avet : null,
      };
    });
    return {
      verdict: repeats.every(
        (r) =>
          r.avetVisitsRatio !== null && r.avetVisitsRatio <= 0.7 && Math.abs(r.sqlDelta) <= 0.15,
      )
        ? "supports-small-sql-gain"
        : "inconclusive",
      attribution: arms.every((a) => a.storage.splitQualified) ? "calibrated" : "unjudged",
      repeats,
    };
  }
  const repeats = [
    [0, 1],
    [3, 2],
  ].map(([i, j]) => {
    const a = arms[i],
      b = arms[j];
    const inRange = (x, min, max) => Number.isFinite(x) && x >= min && x <= max;
    const dose =
      inRange(b.local.cores, 3.65, 5.55) &&
      inRange(b.local.callsPerSecond, 71000, 108000) &&
      inRange(b.local.bytesPerSecond, 12000000, 22000000);
    const comparable =
      b.requestSequence === a.requestSequence &&
      inRange(b.pg.walBytes / a.pg.walBytes, 0.85, 1.15) &&
      Math.abs(b.sql - a.sql) <= Math.max(0.2 * a.sql, 0.15 * a.n) &&
      Math.abs(b.pg.walWriteMs - a.pg.walWriteMs) <= Math.max(0.2 * a.pg.walWriteMs, 10) &&
      Math.abs(b.pg.dbReadMs - a.pg.dbReadMs) <= Math.max(0.2 * a.pg.dbReadMs, 10);
    return { apply: b.apply.p90 / a.apply.p90, peer: b.peer.p90 / a.peer.p90, dose, comparable };
  });
  const matches = repeats.every((r) => r.dose && r.comparable);
  return {
    verdict:
      matches && repeats.every((r) => r.apply >= 1.15 || r.peer >= 1.15)
        ? "supports-host-contention"
        : matches &&
            repeats.every((r) => Math.abs(r.apply - 1) < 0.05 && Math.abs(r.peer - 1) < 0.05)
          ? "disfavors-large-host-effect"
          : "inconclusive",
    repeats,
  };
}

if (process.argv[3] === "--smoke") {
  const reading = await arm(process.argv[4], "readers", "off", true);
  assert.equal(reading.n, 3);
  fs.writeFileSync(path.join(root, "small-reading.json"), JSON.stringify(reading, null, 2) + "\n", {
    flag: "wx",
  });
  process.exit(0);
}
const plan = get(path.join(root, "recorded.json")),
  results = {};
for (const mode of ["readers"]) {
  const readings = [],
    unavailable = [];
  for (const entry of plan.filter((r) => r.mode === mode)) {
    try {
      if (entry.error) throw Error(entry.error);
      readings.push(await arm(entry.directory, mode, entry.setting));
    } catch (error) {
      unavailable.push({
        directory: entry.directory && path.basename(entry.directory),
        why: String(error),
        at: error.stack?.split("\n")[1]?.trim(),
      });
    }
  }
  results[mode] = { readings, unavailable, outcome: decision(mode, readings) };
}
fs.writeFileSync(
  path.join(root, "probe-results.json"),
  JSON.stringify(
    {
      source: scopePlan.source,
      checkpoint: scopePlan.checkpoint,
      started: scopePlan.started,
      results,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
