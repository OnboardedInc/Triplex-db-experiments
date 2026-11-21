// @ts-nocheck -- Container and JVM output comes from verified role IDs and is checked at the boundary.
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { postgresEvents, wallBridge } from "./postgres-events.mjs";

const roles = ["gw-w", "gw-r", "tx"];
const execute = promisify(execFile);
const digest = async (file) => {
  const hash = createHash("sha256");
  for await (const data of fs.createReadStream(file)) hash.update(data);
  return hash.digest("hex");
};
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const walSql =
  "SELECT json_build_object('at',extract(epoch from clock_timestamp())*1000,'wal',(SELECT row_to_json(w) FROM pg_stat_wal w),'ioTiming',current_setting('track_wal_io_timing'),'durable',current_setting('synchronous_commit'));";

// [DX-INT1] Why: a JVM stopped during initial readiness can leave its recording outputs under the same role.
// Rejected: passing those files to the live recorder, or deleting the first startup failure.
export function preservePreReadyRecordings(out, raw, ready) {
  assert(!fs.existsSync(path.join(raw, ".finish")), "Recording finish already requested");
  const previous = path.join(out, "pre-ready-recordings");
  for (const role of roles) {
    for (const suffix of [".jfr", ".jfr-complete.jsonl", ".jfr.jsonl", "-jfr-error.txt"]) {
      const name = role + suffix;
      const file = path.join(raw, name);
      const stat = fs.lstatSync(file, { throwIfNoEntry: false });
      if (!stat) continue;
      assert(stat.isFile() && ready[role].restarts > 0, "Unexpected pre-ready recording " + name);
      fs.mkdirSync(previous, { recursive: true });
      const target = path.join(previous, name);
      assert(!fs.existsSync(target));
      fs.renameSync(file, target);
    }
  }
}

export function startWalSamples(out, pgId, binding) {
  assert.match(pgId, /^[0-9a-f]{64}$/);
  const file = path.join(out, "postgres-wal-samples.jsonl");
  const fd = fs.openSync(file, "wx");
  // [DX-TAIL1] Why: poll counters off the save path and start only one diagnostic query at a time.
  // Rejected: issuing Datomic traffic to keep the stack warm or dividing global WAL time by receipts.
  let pending;
  const sample = () => {
    if (pending) return;
    pending = execute(
      "docker",
      ["exec", pgId, "psql", "-XAtq", "-U", "postgres", "-d", "datomic", "-c", walSql],
      { timeout: 5000 },
    )
      .then(({ stdout }) => {
        const row = JSON.parse(stdout);
        assert(Number.isFinite(row.at) && row.ioTiming === "on" && row.durable === "on");
        fs.writeSync(fd, JSON.stringify({ ...binding, pgId, ...row }) + "\n");
      })
      .catch(() => fs.writeSync(fd, JSON.stringify({ ...binding, pgId, sampleError: true }) + "\n"))
      .finally(() => {
        pending = undefined;
      });
  };
  sample();
  const timer = setInterval(sample, 5000);
  return async () => {
    clearInterval(timer);
    await pending;
    fs.closeSync(fd);
  };
}

export async function finishNativeRecording(out, raw, identity, engines, deadline) {
  const binding = {
    source: identity.source,
    slot: identity.slot,
    run: identity.slot,
    nonce: identity.nonce,
  };
  const startedAt = Date.now();
  assert(deadline > startedAt);
  for (const role of [...roles, "pg"]) assert.match(engines[role].id, /^[0-9a-f]{64}$/);
  const inspect = (role) =>
    JSON.parse(
      execFileSync("docker", ["inspect", engines[role].id], { encoding: "utf8", timeout: 8000 }),
    )[0];
  const processes = Object.fromEntries(
    [...roles, "pg"].map((role) => {
      const observed = inspect(role);
      assert.equal(observed.Id, engines[role].id);
      assert.equal(observed.Name, "/" + identity.slot + "-" + role);
      assert(observed.State.Running && !observed.State.OOMKilled);
      if (engines[role].startedAt !== undefined)
        assert.equal(observed.State.StartedAt, engines[role].startedAt);
      if (engines[role].restarts !== undefined)
        assert.equal(observed.RestartCount, engines[role].restarts);
      return [
        role,
        { id: observed.Id, startedAt: observed.State.StartedAt, restarts: observed.RestartCount },
      ];
    }),
  );
  fs.writeFileSync(path.join(raw, ".finish"), "", { flag: "wx" });
  while (roles.some((role) => !fs.existsSync(path.join(raw, role + ".jfr-complete.jsonl")))) {
    if (
      Date.now() >= deadline ||
      roles.some((role) => fs.existsSync(path.join(raw, role + "-jfr-error.txt")))
    )
      throw Error("At least one JVM recording is incomplete");
    await sleep(500);
  }
  const seals = {};
  const traceBytes = {};
  for (const role of roles) {
    const jfr = path.join(raw, role + ".jfr");
    const seal = read(jfr + "-complete.jsonl");
    assert.deepEqual(
      [seal.source, seal.slot, seal.run, seal.role],
      [binding.source, binding.slot, binding.run, role],
    );
    const actual = inspect(role),
      expected = processes[role];
    assert.deepEqual(
      [actual.Id, actual.State.StartedAt, actual.RestartCount],
      [expected.id, expected.startedAt, expected.restarts],
    );
    assert(
      seal.at >= startedAt - 1000 && seal.recordingStart >= Date.parse(expected.startedAt) - 1000,
    );
    assert(
      seal.events > 0 && seal.clockAnchors?.length >= 2 && seal.fileSha256 === (await digest(jfr)),
    );
    seals[role] = seal;
    for (const name of [
      role + ".jfr",
      role + ".jfr.jsonl",
      role + ".jfr-complete.jsonl",
      role + ".jsonl",
    ]) {
      traceBytes[name] = await digest(path.join(raw, name));
    }
  }
  assert.equal(new Set(roles.map((role) => seals[role].clock.bootId)).size, 1);
  const pg = inspect("pg");
  assert.deepEqual(
    [pg.Id, pg.State.StartedAt, pg.RestartCount],
    [processes.pg.id, processes.pg.startedAt, processes.pg.restarts],
  );
  const rawPg = path.join(raw, "postgres.log");
  const fd = fs.openSync(rawPg, "wx");
  try {
    execFileSync("docker", ["logs", engines.pg.id], { stdio: ["ignore", fd, fd], timeout: 30_000 });
  } finally {
    fs.closeSync(fd);
  }
  const sql = path.join(raw, "postgres-events.jsonl");
  const sqlCoverage = await postgresEvents(rawPg, sql, seals.tx, binding);
  assert(
    sqlCoverage.qualified > 0,
    "No PostgreSQL duration reached the same clock as the transactor",
  );
  const wal = path.join(out, "postgres-wal-samples.jsonl");
  const bridge = wallBridge(seals.tx);
  const samples = fs.readFileSync(wal, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  const timed = [];
  for (const sample of samples) {
    assert.equal(sample.pgId, engines.pg.id);
    assert.equal(sample.slot, identity.slot);
    assert.equal(sample.source, identity.source);
    assert.equal(sample.nonce, identity.nonce);
    if (sample.sampleError) continue;
    const observation = bridge(sample.at);
    if (observation)
      timed.push({ ...sample, wallAt: sample.at, at: observation.at, clock: observation.clock });
  }
  assert(timed.length >= 2, "No qualified WAL bracket");
  const mappedWal = path.join(raw, "postgres-wal.jsonl");
  fs.writeFileSync(mappedWal, timed.map((sample) => JSON.stringify(sample)).join("\n") + "\n", {
    flag: "wx",
  });
  for (const file of [rawPg, sql, mappedWal]) traceBytes[path.basename(file)] = await digest(file);
  // [DX-TAIL1] Why: preserve source, role and raw hashes with the physical stack before cleanup.
  // Rejected: treating the trace presence summary as acceptance of save latency or per-t WAL attribution.
  fs.writeFileSync(
    path.join(out, "native-recording.json"),
    JSON.stringify({
      ...binding,
      processes,
      traceBytes,
      sqlCoverage,
      walSamples: samples.length,
      mappedWalSamples: timed.length,
    }) + "\n",
    { flag: "wx" },
  );
}
