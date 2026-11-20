// @ts-nocheck -- [EXP-CHECKJS] the native JSON lines and shell reads are validated at each boundary.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { GiB, docker } from "../../../bin/lib.mjs";

const eventMarker = "DX_AGE1 ";
const cells = ["current-recent", "current-year-idle", "pinned-recent", "pinned-year-idle", "old-cut"];

function events(file, attempt) {
  return fs.readFileSync(file, "utf8").split("\n").filter((line) => line.startsWith(eventMarker))
    .map((line) => {
      const data = JSON.parse(line.slice(eventMarker.length));
      assert.equal(data.attempt, attempt, "Native result belongs to another attempt");
      return data;
    });
}

function only(rows, event) {
  const selected = rows.filter((r) => r.event === event);
  assert.equal(selected.length, 1, "Expected exactly one " + event + " observation");
  return selected[0];
}

export function scaleOptions(opts) {
  const int = (input, min, max) => {
    assert(/^\d+$/.test(input), "Expected a positive integer");
    const n = Number(input);
    assert(Number.isSafeInteger(n) && n >= min && n <= max, "Scale option outside allowed range");
    return n;
  };
  const deep = int(opts.deep ?? "32", 1, 400), thin = int(opts.thin ?? "100", 1, 400);
  assert(deep > 1 || thin > 1, "An active population is required");
  const low = int(opts["low-n"] ?? "24", 8, 180), busy = int(opts["busy-n"] ?? "120", 20, 600);
  const targets = (opts.saves ?? "8000,26000,70000").split(",").map((n) => int(n, 1, 2500000));
  assert(targets.length && targets.length <= 5);
  let previous = 0;
  for (const target of targets) {
    assert(target > previous, "Rungs must be increasing and leave room for the save samples");
    previous = target + low + 2 * busy;
  }
  return { deep, thin, low, busy, targets };
}

function validateSqlName(name) {
  assert.match(name, /^s-(?:[a-f0-9]{32})$|^s2-[A-Za-z0-9_-]+$/);
}

export async function measure(ctx, spec) {
  const { attempt, dir, peer, tx, pg, jdbc, password, capture, signal, floor, write } = ctx;
  const args = [String(spec.deep), String(spec.thin)];
  const run = async (file, mode, inputs = [], env = []) => {
    floor();
    signal.throwIfAborted();
    await capture(["exec", ...env, peer, "/opt/datomic/bin/run", "-m", "triplex.age.scale", mode, ...args, ...inputs],
      path.join(dir, file), signal);
    return events(path.join(dir, file), attempt);
  };
  const seed = only(await run("seed.log", "init"), "seed");
  validateSqlName(seed.name);
  const ddl = docker(["exec", tx, "cat", "/opt/datomic/bin/sql/postgres-table.sql"]);
  const psql = (db, query) => docker(["exec", pg, "psql", "-XAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", db, "-c", query]);
  const rolePss = () => Number(docker(["exec", tx, "awk", "/^Pss:/{print $2}", "/proc/1/smaps_rollup"]));
  const uri = (jdbcUri) => "datomic:sql://" + seed.name + "?" + jdbcUri + "?user=postgres&password=" + password;
  let from = 0, records = seed.records;
  for (const [i, target] of spec.targets.entries()) {
    const prefix = "rung-" + (i + 1);
    const result = only(await run(prefix + ".log", "rung", [seed.name, ...[from, target, spec.low, spec.busy].map(String)]), "rung");
    assert.equal(result.name, seed.name);
    assert.equal(result.from, from);
    assert.equal(result.target, target);
    assert.equal(result.growth.saves, target);
    assert.equal(result.end, target + spec.low + 2 * spec.busy);
    assert.equal(result.head, Math.ceil(seed.population.people / 12) + result.end);
    const transactorPssKiB = rolePss();
    assert(transactorPssKiB > 0);
    const cold = {};
    for (const label of cells) {
      const x = only(await run(prefix + "-" + label + ".log", "cold", [seed.name, String(result.end), label]),
        "peer-cold-read");
      assert.equal(x.cell, label);
      assert.equal(x.saves, result.end);
      cold[label] = x;
    }
    assert(result.bytes < 7 * GiB);
    records += result.growth.records + result.low.records + result.busy.records + result.indexMix.records;
    const measurement = { attempt, name: seed.name, target, records, transactorPssKiB, cold, ...result };
    write(prefix + "-measurement.json", measurement);

    // [DX-AGE1] Why: restore into fresh SQL storage with no destination transactor, then read at the chosen t.
    // Rejected: restoring a different name into the live SQL storage or using a CLI exit code as content evidence.
    const localBackup = "/tmp/age-backup-" + (i + 1);
    const backup = "file:" + localBackup;
    const dest = "age_restore";
    const restoreJdbc = jdbc.replace(/\/postgres$/, "/" + dest);
    assert.notEqual(restoreJdbc, jdbc);
    const vendor = async (op, ...options) => {
      floor();
      const file = prefix + "-" + op + ".log";
      const start = performance.now();
      await capture(["exec", peer, "/opt/datomic/bin/datomic", "-Xms192m", "-Xmx672m", op, ...options],
        path.join(dir, file), signal);
      return { ms: performance.now() - start, output: fs.readFileSync(path.join(dir, file), "utf8") };
    };
    let restoreCreated = false;
    try {
      const backupResult = await vendor("backup-db", uri(jdbc), backup);
      assert(backupResult.output.split("\n").includes(":succeeded"), "Native backup lacked success record");
      const backupBytes = Number(docker(["exec", peer, "du", "-sb", localBackup]).split(/\s/)[0]);
      assert(backupBytes > 0);
      const list = await vendor("list-backups", backup);
      const cut = list.output.split("\n").find((line) => /^\(\s*\d+\s*\)$/.test(line.trim()))?.match(/\d+/)?.[0];
      assert(cut && Number(cut) >= result.backupT, "Backup falls before the final acknowledged basis");
      const verified = await vendor("verify-backup", backup, "true", cut);
      const record = verified.output.split("\n").find((line) => line.includes(":event :verify-backup/complete"));
      assert(record, "Native backup verification did not complete");
      assert.match(record, /:missing-segments #\{\}/);
      assert.match(record, /:unreadable-segments \(\)/);
      assert.equal(record.match(/:t (\d+)(?=[,}])/)?.[1], cut);
      assert(Number(record.match(/:total-segments (\d+)/)?.[1]) > 0);
      psql("postgres", "CREATE DATABASE " + dest);
      restoreCreated = true;
      psql(dest, ddl);
      const restored = await vendor("restore-db", backup, uri(restoreJdbc), cut);
      assert(restored.output.split("\n").includes(":succeeded"), "Native restore lacked success record");
      const start = performance.now();
      const readback = only(await run(prefix + "-restored.log", "restored", [seed.name, String(result.end), cut],
        ["-e", "AGE_RESTORE_JDBC=" + restoreJdbc]), "restored-readback");
      assert.equal(readback.t, Number(cut));
      assert.equal(readback.saves, result.end);
      write(prefix + "-backup.json", { attempt, t: cut, backupMs: backupResult.ms, backupBytes,
        verifyMs: verified.ms, restoreMs: restored.ms, readbackMs: performance.now() - start });
    } catch (error) {
      signal.throwIfAborted();
      write(prefix + "-backup-failure.json", { attempt, t: result.backupT, error: String(error.message) });
    } finally {
      if (restoreCreated) psql("postgres", "DROP DATABASE " + dest);
      docker(["exec", peer, "rm", "-rf", localBackup]);
    }
    from = result.end;
  }
}
