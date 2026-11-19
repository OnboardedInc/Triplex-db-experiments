import assert from "node:assert/strict";
import { clock, sleep, until } from "./common.ts";
import { Account, healthyBroker, populate, receipts, verifySuffix, immutable } from "./one-db.ts";
import { backupCut, vendorResult } from "./move.ts";
import type { Stack, Site } from "./stack.ts";

export async function replicationRole(s: Stack) {
  await s.sql("pg", "CREATE ROLE ha1stream LOGIN REPLICATION PASSWORD '" + s.secret + "'");
  await s.exec(
    "pg",
    "sh",
    "-ceu",
    'echo "host replication ha1stream all scram-sha-256" >> "$PGDATA/pg_hba.conf"',
  );
  assert.equal(await s.sql("pg", "SELECT pg_reload_conf()"), "t");
}
export function conninfo(s: Stack, from: Site, app: string) {
  return (
    "host=" +
    s.storageHost("pg", from) +
    " port=5432 user=ha1stream password=" +
    s.secret +
    " application_name=" +
    app
  );
}
export const drop = "drop=$(command -v gosu || command -v su-exec); ";
export function traffic(ac: Account, label: string, gap = 40) {
  let running = true,
    seq = 0;
  const samples: { op: string; start: number; end: number }[] = [];
  const work = (async () => {
    while (running) {
      const input = ac.intent(label + "-" + ++seq, 10, "tenant-" + (seq % 10) + "/edit-" + seq),
        start = clock();
      await ac.send(input);
      samples.push({ op: input.operationId, start, end: clock() });
      await sleep(gap);
    }
  })();
  work.catch(() => {});
  return {
    samples,
    async stop() {
      running = false;
      await work;
    },
  };
}
export function latency(samples: number[]) {
  assert(samples.length > 0);
  const a = [...samples].sort((x, y) => x - y);
  const q = (p: number) => a[Math.ceil(p * a.length) - 1]!;
  return { n: a.length, p50: q(0.5), p99: q(0.99), max: a.at(-1)! };
}
export async function nativeCli(s: Stack, db: string, action: string, ...args: string[]) {
  const start = clock(),
    out = await s.exec(
      "tool",
      "/opt/datomic/bin/datomic",
      "-Xms96m",
      "-Xmx320m",
      "-XX:ActiveProcessorCount=2",
      action,
      ...args,
    );
  vendorResult(action, out, args, db);
  const row = { action, ms: clock() - start, output: s.redact(out) };
  s.e.log("vendor-command", row);
  return row;
}
const vault = "/tmp/ha1-vault",
  base = vault + "/base",
  wal = vault + "/wal",
  restore = vault + "/restore";
export async function oneBackup(s: Stack, people: number) {
  // [DX-HA1] Why: both backups must survive losing A's volume and processes. Rejected: restoring from a backup path on the lost primary.
  await s.start("tool", s.b, [], "/bin/sh", ["-c", "exec sleep infinity"]);
  await s.postgres("pg", s.a);
  await s.database("pg", "moving");
  await replicationRole(s);
  await s.start("target", s.b, [], "/bin/sh", ["-c", "exec sleep infinity"], 5432);
  await s.tx("active", s.a, "pg", "moving");
  await healthyBroker(s, "active");
  await s.gateway("write", s.a, "pg", "moving");
  const url = await s.ready("write"),
    ac = new Account(s.e.prefix + "-one", url, url);
  const bytes = (role: "target" | "tool", dir: string) =>
    s.exec(role, "du", "-sb", dir).then((v) => Number(v.split(/\s/)[0]));
  try {
    await ac.open();
    const population = await populate(s, ac, people, 390000);
    const anchor = await ac.send(ac.intent("pre-backup")),
      afterSeed = ac.inputs.length,
      cursor = String(BigInt(anchor.t.v) + 1n);
    await s.exec(
      "target",
      "sh",
      "-ceu",
      drop +
        'mkdir -p "$1/wal"; chown -R postgres:postgres "$1"; "$drop" postgres pg_receivewal --no-loop --synchronous -D "$1/wal" -d "$2" </dev/null >"$1/receiver.log" 2>&1 & echo $! >"$1/receiver.pid"',
      "vault",
      vault,
      conninfo(s, s.b, "ha1archive"),
    );
    await until(
      "off-primary WAL receiver",
      async () =>
        (await s.sql(
          "pg",
          "SELECT state FROM pg_stat_replication WHERE application_name='ha1archive'",
        )) === "streaming" || undefined,
    );
    const physicalId = await s.sql("pg", "SELECT system_identifier FROM pg_control_system()");
    const backup = "file:/tmp/ha1-datomic",
      src = s.uri("pg", "moving", ac.db, s.b);
    const writer = traffic(ac, "live");
    let pgBaseMs = 0,
      pgBaseBytes = 0,
      datFullBytes = 0,
      datFinalBytes = 0,
      datFullMs = 0,
      datIncrMs = 0,
      finalT = "",
      baselineT = "";
    const windows: { name: string; from: number; to: number }[] = [];
    let baseEnd = "",
      walStart = "";
    try {
      const timed = async (name: string, f: () => Promise<unknown>) => {
        const from = clock();
        await f();
        const to = clock();
        windows.push({ name, from, to });
        return to - from;
      };
      await timed("ordinary", () => sleep(1800));
      pgBaseMs = await timed("pgBase", async () => {
        await s.exec(
          "target",
          "sh",
          "-ceu",
          drop +
            'exec "$drop" postgres pg_basebackup --checkpoint=fast --wal-method=stream --manifest-checksums=SHA256 -D "$1" -d "$2"',
          "base",
          base,
          conninfo(s, s.b, "ha1base"),
        );
      });
      pgBaseBytes = await bytes("target", base);
      assert(
        (await s.exec("target", "pg_verifybackup", base)).includes("backup successfully verified"),
      );
      const manifest = JSON.parse(await s.exec("target", "cat", base + "/backup_manifest"));
      s.e.log("base-manifest", {
        sha256: (await s.exec("target", "sha256sum", base + "/backup_manifest")).split(" ")[0],
        files: manifest.Files.length,
        ranges: manifest["WAL-Ranges"],
      });
      assert.equal(String(manifest["WAL-Ranges"][0]["End-LSN"]).includes("/"), true);
      baseEnd = manifest["WAL-Ranges"][0]["End-LSN"];
      walStart = await s.sql("pg", "SELECT pg_current_wal_lsn()");
      datFullMs = await timed("datomicFull", () => nativeCli(s, ac.db, "backup-db", src, backup));
      baselineT = backupCut((await nativeCli(s, ac.db, "list-backups", backup)).output, anchor.t.v);
      datFullBytes = await bytes("tool", "/tmp/ha1-datomic");
      const bridge = await ac.send(ac.intent("between-backups"));
      datIncrMs = await timed("datomicDelta", () => nativeCli(s, ac.db, "backup-db", src, backup));
      finalT = backupCut((await nativeCli(s, ac.db, "list-backups", backup)).output, bridge.t.v);
      assert(BigInt(finalT) > BigInt(baselineT));
      datFinalBytes = await bytes("tool", "/tmp/ha1-datomic");
    } finally {
      await writer.stop();
    }
    await nativeCli(s, ac.db, "verify-backup", backup, "true", finalT);
    const pgCut = await ac.send(ac.intent("archive-boundary"));
    const mark = "ha1_" + s.e.nonce.replaceAll("-", ""),
      archiveAt = clock();
    const markLsn = await s.sql("pg", "SELECT pg_create_restore_point('" + mark + "')"),
      seg = await s.sql("pg", "SELECT pg_walfile_name('" + markLsn + "')");
    assert.match(seg, /^[A-F0-9]{24}$/);
    await s.sql("pg", "SELECT pg_switch_wal()");
    await until("completed WAL file in external archive", async () => {
      try {
        return (
          (await s.exec("target", "stat", "-c", "%s", wal + "/" + seg)) === "16777216" || undefined
        );
      } catch {
        return undefined;
      }
    });
    const archiveFlushMs = clock() - archiveAt;
    const walPayload = Number(
      await s.sql("pg", "SELECT pg_wal_lsn_diff('" + markLsn + "','" + walStart + "')"),
    );
    await s.exec(
      "target",
      "sh",
      "-ceu",
      'kill -TERM "$(cat "$1/receiver.pid")"',
      "stop-wal",
      vault,
    );
    await until(
      "archive stopped",
      async () =>
        (await s.sql(
          "pg",
          "SELECT count(*) FROM pg_stat_replication WHERE application_name='ha1archive'",
        )) === "0" || undefined,
    );
    const walFiles = (
      await s.exec("target", "sh", "-c", 'ls "$1" | grep -E "^[0-9A-F]{24}$"', "segments", wal)
    ).split("\n");
    assert(walFiles.includes(seg));
    const walArchiveBytes = walFiles.length * 16777216;
    for (let i = 0; i < 8; i++) await ac.send(ac.intent("after-archive-" + i));
    const oldInputs = [...ac.inputs],
      loss = await s.kill("pg");
    await s.remove("write");
    await s.remove("active");
    await s.remove("pg");
    const sourceIsolationMs = clock() - loss.from;
    const measureRestore = async (
      kind: "wal" | "datomic",
      cut: string,
      restoreStorage: () => Promise<unknown>,
    ) => {
      const from = clock();
      await restoreStorage();
      const storageMs = clock() - from;
      await s.tx("active", s.b, "target", "moving");
      await healthyBroker(s, "active");
      await s.gateway("write", s.b, "target", "moving");
      const recovered = await s.ready("write");
      ac.changeEndpoint(recovered, recovered);
      const present = oldInputs.filter(
          (i) => BigInt(ac.receipts.get(i.operationId)!.t.v) <= BigInt(cut),
        ),
        missing = oldInputs.filter(
          (i) => BigInt(ac.receipts.get(i.operationId)!.t.v) > BigInt(cut),
        );
      const last = present.reduce((a, b) =>
        BigInt(ac.receipts.get(a.operationId)!.t.v) > BigInt(ac.receipts.get(b.operationId)!.t.v)
          ? a
          : b,
      );
      const rec = ac.receipts.get(last.operationId)!;
      assert.deepEqual(immutable(await ac.r.operation(ac.db, last.operationId)), rec);
      await ac.pinned(anchor);
      const fresh = await ac.send(ac.intent("restored-" + kind, 1, "new-" + kind));
      const firstWriteMs = clock() - from;
      await receipts(ac, present);
      for (const m of missing)
        assert.equal((await ac.r.operation(ac.db, m.operationId)).status, "absent");
      const expected = oldInputs
        .slice(afterSeed)
        .filter((i) => BigInt(ac.receipts.get(i.operationId)!.t.v) <= BigInt(cut));
      expected.push(ac.inputs.at(-1)!);
      await verifySuffix(ac, cursor, expected);
      await ac.pinned(fresh);
      const row = {
        kind,
        nativeCut: cut,
        acknowledged: oldInputs.length,
        survived: present.length,
        missing: missing.map((i) => i.operationId),
        lastReceipt: rec,
        ageMs: loss.from - ac.arrivals.get(last.operationId)!,
        storageMs,
        firstWriteMs,
        fresh,
      };
      s.e.write("restore-" + kind, { nonce: s.e.nonce, db: ac.db, row });
      await s.remove("write");
      await s.remove("active");
      return row;
    };
    const physical = await measureRestore("wal", pgCut.t.v, async () => {
      const script =
        drop +
        String.raw`test ! -e "$2"; cp -a "$1" "$2"; touch "$2/recovery.signal"; printf "\nrestore_command = 'cp %s/%%f %%p'\nrecovery_target_name = '%s'\nrecovery_target_action = 'promote'\n" "$3" "$4" >> "$2/postgresql.auto.conf"; chown -R postgres:postgres "$2"; "$drop" postgres pg_ctl -D "$2" -l "$5/recovery.log" -o "-c shared_buffers=32MB -c listen_addresses=*" -w -t 120 start`;
      await s.exec("target", "sh", "-ceu", script, "restore", base, restore, wal, mark, vault);
      await until(
        "WAL restore point promoted",
        async () =>
          (await s.sql(
            "target",
            "SELECT NOT pg_is_in_recovery() AND pg_last_wal_replay_lsn() >= '" + markLsn + "'",
          )) === "t" || undefined,
      );
      assert.equal(
        await s.sql("target", "SELECT system_identifier FROM pg_control_system()"),
        physicalId,
      );
      const log = await s.exec("target", "cat", vault + "/recovery.log");
      assert(log.includes(mark));
      s.e.log("wal-recovery", { mark, markLsn, log: s.redact(log) });
    });
    await s.remove("target");
    const logical = await measureRestore("datomic", finalT, async () => {
      await s.postgres("target", s.b);
      await s.database("target", "moving");
      assert.notEqual(
        await s.sql("target", "SELECT system_identifier FROM pg_control_system()"),
        physicalId,
      );
      await nativeCli(
        s,
        ac.db,
        "restore-db",
        backup,
        s.uri("target", "moving", ac.db, s.b),
        finalT,
      );
    });
    const impact = windows.map((w) => {
      const a = writer.samples
        .filter((x) => x.start >= w.from && x.end <= w.to)
        .map((x) => x.end - x.start);
      return { ...w, latency: a.length ? latency(a) : null, commits: a.length };
    });
    const result = {
      population,
      sourceIsolationMs,
      datFullFacts: oldInputs
        .filter((i) => BigInt(ac.receipts.get(i.operationId)!.t.v) <= BigInt(baselineT))
        .reduce((n, i) => n + i.newIds.length, 0),
      datDeltaFacts: oldInputs
        .filter((i) => {
          const t = BigInt(ac.receipts.get(i.operationId)!.t.v);
          return t > BigInt(baselineT) && t <= BigInt(finalT);
        })
        .reduce((n, i) => n + i.newIds.length, 0),
      pgBaseMs,
      pgBaseBytes,
      baseEnd,
      walPayload,
      walFiles,
      walArchiveBytes,
      archiveFlushMs,
      datFullMs,
      datFullBytes,
      datIncrMs,
      deltaBytes: datFinalBytes - datFullBytes,
      baselineT,
      finalT,
      physical,
      logical,
      impact,
    };
    s.e.write("backup-cost", { nonce: s.e.nonce, db: ac.db, result, writer: writer.samples });
    return result;
  } finally {
    ac.close();
  }
}
