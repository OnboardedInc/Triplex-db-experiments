// @ts-nocheck -- Trace and driver records cross a JSON boundary and are checked before joining.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { docker, readJson, sha256File } from "../../../bin/lib.mjs";
import { bindNativeTransaction, nativeWaitLegs } from "../../../trace/native-transactions.mjs";
import { alignClockRecord } from "../../../trace/report.mjs";
import { postgresEvents, wallBridge } from "../../../trace/postgres-events.mjs";

const roles = ["gw-w", "gw-r", "tx"];
const jsonLines = (file) => fs.readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);
const store = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });

function readPostgres(id) {
  const sql =
    "SELECT json_build_object('at',extract(epoch from clock_timestamp())*1000, 'wal',(SELECT row_to_json(w) FROM pg_stat_wal w), 'ioTiming',current_setting('track_wal_io_timing'), 'durable',current_setting('synchronous_commit'), 'duration',current_setting('log_duration'));";
  return JSON.parse(
    docker(["exec", id, "psql", "-XAtq", "-U", "postgres", "-d", "datomic", "-c", sql]),
  );
}

export async function observeEventGate({
  out,
  trace,
  identity,
  readyRuntime,
  ids,
  env,
  stack,
  signal,
  eventBaseline,
  verifyReadyRuntime,
  spawnBound,
}) {
  const { source, slot, nonce } = identity;
  const ledger = path.join(out, "event-ledger.json");
  const pgBefore = readPostgres(ids.pg);
  const child = spawnBound(
    process.execPath,
    ["--import", "tsx", path.join(import.meta.dirname, "event-smoke.ts"), ledger, nonce],
    {
      env: {
        ...env,
        DATOMIC_GATEWAY_URL: stack.writeUrl,
        TRIPLEX_TRACE_DIR: path.join(out, "client-trace"),
      },
      log: path.join(out, "event-driver.log"),
      signal,
      deadline: Date.now() + 120_000,
    },
  );
  assert.deepEqual(
    await child.done,
    { code: 0, signal: null },
    "Event smoke failed; see event-driver.log",
  );
  verifyReadyRuntime();
  const pgAfter = readPostgres(ids.pg);
  const loaded = readJson(ledger);
  assert.deepEqual([loaded.source, loaded.slot, loaded.nonce], [source, slot, nonce]);
  assert.match(loaded.databaseHash, /^[0-9a-f]{64}$/);
  assert.equal(loaded.rows.length, 192);
  assert.equal(new Set(loaded.rows.map((r) => r.traceId)).size, 192);
  assert.equal(new Set(loaded.rows.flatMap((r) => r.assertions)).size, 960);
  let last = 0n;
  for (const [subject, r] of loaded.rows.entries()) {
    assert(
      subject === r.subject &&
        r.start <= r.ackAt &&
        r.assertions.length === 5 &&
        BigInt(r.t) > last,
    );
    last = BigInt(r.t);
  }
  const lat = loaded.rows.map((r) => r.ackAt - r.start).sort((a, b) => a - b);
  const p50Ms = lat[Math.ceil(lat.length / 2) - 1];
  const p99Ms = lat[Math.ceil(lat.length * 0.99) - 1];
  if (eventBaseline) {
    assert.equal(pgBefore.duration, "off");
    store(path.join(out, "event-observations.json"), {
      identity,
      ids,
      eventBaseline,
      ledgerSha256: sha256File(ledger),
      p50Ms,
      p99Ms,
    });
    return;
  }
  fs.writeFileSync(path.join(trace, ".finish"), "", { flag: "wx" });
  const until = Date.now() + 55_000;
  while (roles.some((r) => !fs.existsSync(path.join(trace, r + ".jfr-complete.jsonl")))) {
    assert(
      Date.now() < until &&
        !roles.some((r) => fs.existsSync(path.join(trace, r + "-jfr-error.txt"))),
      "JFR drain failed",
    );
    await delay(250, undefined, { signal });
  }
  const bound = (r, role) => {
    assert.deepEqual([r.run, r.slot, r.source, r.process], [slot, slot, source, role]);
    assert.equal(r.clock.domain, "linux-monotonic");
    assert.match(r.clock.bootId, /^[0-9a-f-]{36}$/);
  };
  const roleRows = {};
  const seals = {};
  const capture = {};
  for (const role of roles) {
    const file = path.join(trace, role + ".jfr");
    const seal = readJson(file + "-complete.jsonl");
    seals[role] = seal;
    bound(seal, role);
    assert.equal(seal.fileSha256, sha256File(file));
    assert(
      seal.clockSamples >= 2 &&
        seal.recordingStart >= Date.parse(readyRuntime[role].startedAt) - 1000,
    );
    roleRows[role] = jsonLines(file + ".jsonl");
    assert.equal(roleRows[role].length, seal.events);
    for (const r of roleRows[role]) {
      bound(r, role);
      assert(
        r.clock.crossProcessQualified &&
          Number.isFinite(r.wallStart) &&
          r.wallEnd >= r.wallStart &&
          r.end >= r.start,
      );
    }
    const resources = jsonLines(path.join(trace, role + ".jsonl")).filter(
      (r) => r.type === "jvm-runtime",
    );
    assert(resources.length >= 2);
    for (const r of resources) {
      bound(r, role);
      assert(r.processors >= 1 && r.heapMaxBytes >= r.heapCommittedBytes && r.collectors.length);
      assert(r.cpuStat?.nr_throttled >= 0 && r.cpuStat.throttled_usec >= 0);
    }
    capture[role] = {
      jfrSha256: seal.fileSha256,
      jfrEvents: seal.events,
      runtimeSamples: resources.length,
    };
  }
  // [DX-TAIL1] Why: require native data for the exact t returned to the SDK, with matching database and boot.
  // Rejected: nearest native event, treating overlapping WAL totals as per-save data, or joining by a bare t.
  const peer = jsonLines(path.join(trace, "gw-w.jsonl"));
  const tx = roleRows.tx;
  const joined = loaded.rows.map((saved) => {
    const candidates = peer.filter(
      (r) => r.traceId === saved.traceId && r.attributes?.datomicT === saved.t,
    );
    assert.equal(candidates.length, 1, "No unique observed gateway transaction for SDK receipt");
    const gw = candidates[0];
    bound(gw, "gw-w");
    assert.equal(gw.attributes.databaseHash, loaded.databaseHash);
    const submitted = gw.spans.filter((s) => s.name === "d/transact-async");
    const awaiting = gw.spans.filter((s) => s.name.startsWith("peer.transact-await"));
    assert.equal(submitted.length, 1);
    assert.equal(awaiting.length, 1);
    assert(
      gw.start <= submitted[0].start &&
        submitted[0].end <= awaiting[0].end &&
        awaiting[0].end <= gw.end,
    );
    const nativeCandidates = tx.filter(
      (r) => r.databaseHash === loaded.databaseHash && r.datomicT === saved.t,
    );
    assert(nativeCandidates.every((r) => r.clock.bootId === gw.clock.bootId));
    const mapped = nativeCandidates.map((r) => alignClockRecord(r, gw.clock));
    const native = bindNativeTransaction(gw, mapped);
    assert(native, "Missing native transaction with exact database/t");
    const edges = nativeWaitLegs(
      { ...gw, gatewayRoot: gw.root, peerStart: submitted[0].start, peerEnd: awaiting[0].end },
      native,
    );
    return {
      ...saved,
      receive: gw.start,
      submit: submitted[0].start,
      peerResponse: awaiting[0].end,
      response: gw.end,
      native: native.nativeStats,
      nativeLoggedAt: native.start,
      nativeWallAt: native.logWallMs,
      edges,
    };
  });
  assert.equal(pgBefore.durable, "on");
  assert.equal(pgAfter.ioTiming, "on");
  assert.equal(pgBefore.duration, "on");
  assert(pgBefore.at < joined[0].nativeWallAt && pgAfter.at >= joined.at(-1).nativeWallAt);
  assert.equal(pgBefore.wal.stats_reset, pgAfter.wal.stats_reset);
  assert(pgAfter.wal.wal_sync >= pgBefore.wal.wal_sync);
  const pgLog = path.join(out, "event-postgres.log");
  fs.writeFileSync(pgLog, docker(["logs", ids.pg]), { flag: "wx" });
  const pgTimeline = path.join(out, "event-postgres.jsonl");
  const pgCoverage = await postgresEvents(pgLog, pgTimeline, seals.tx, {
    source,
    slot,
    run: slot,
    nonce,
  });
  assert(
    jsonLines(pgTimeline).some(
      (r) =>
        r.type === "event" &&
        r.application === "triplex-tx" &&
        pgBefore.at <= r.wallEnd &&
        r.wallEnd <= pgAfter.at,
    ),
    "No transactor SQL duration mapped to its guest boot clock",
  );
  assert(wallBridge(seals.tx)(pgAfter.at), "WAL readback outside the measured clock bracket");
  verifyReadyRuntime();
  store(path.join(out, "event-observations.json"), {
    identity,
    ids,
    ledgerSha256: sha256File(ledger),
    capture,
    p50Ms,
    p99Ms,
    pgBefore,
    pgAfter,
    pgSha256: sha256File(pgLog),
    pgEventSha256: sha256File(pgTimeline),
    pgCoverage,
    joined,
  });
}
