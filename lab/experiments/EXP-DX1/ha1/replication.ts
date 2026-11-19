import assert from "node:assert/strict";
import { Account } from "../../../../packages/datomic/test/ha1-account.ts";
import { clock, until } from "./common.ts";
import type { Stack } from "./stack.ts";

export async function replication(s: Stack) {
  await s.tool();
  await s.postgres("pg", s.a);
  await s.database("pg", "moving");
  await s.sql("pg", "CREATE ROLE ha1stream LOGIN REPLICATION PASSWORD '" + s.secret + "'");
  await s.exec(
    "pg",
    "sh",
    "-ceu",
    'echo "host replication ha1stream all scram-sha-256" >> "$PGDATA/pg_hba.conf"',
  );
  assert.equal(await s.sql("pg", "SELECT pg_reload_conf()"), "t");
  const conn =
    "host=" +
    s.storageHost("pg", s.b) +
    " port=5432 user=ha1stream password=" +
    s.secret +
    " application_name=ha1standby";
  await s.start(
    "target",
    s.b,
    ["-e", "HA1_CONN=" + conn],
    "/bin/sh",
    [
      "-ceu",
      'chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; su-exec postgres pg_basebackup -D "$PGDATA" -X stream -R -d "$HA1_CONN"; exec docker-entrypoint.sh postgres -c shared_buffers=32MB',
    ],
    5432,
  );
  await until(
    "streaming replica",
    async () =>
      (await s.sql(
        "pg",
        "SELECT state FROM pg_stat_replication WHERE application_name='ha1standby'",
      )) === "streaming" || undefined,
  );
  assert.equal(await s.sql("target", "SELECT pg_is_in_recovery()"), "t");
  const cluster = await s.sql("pg", "SELECT system_identifier FROM pg_control_system()");
  assert.equal(await s.sql("target", "SELECT system_identifier FROM pg_control_system()"), cluster);
  await s.tx("active", s.a, "pg", "moving");
  await until("broker", async () => (await s.broker("active")) || undefined);
  await s.gateway("write", s.a, "pg", "moving");
  const url = await s.ready("write");
  const ac = new Account(s.e.prefix + "-sync", url, url);
  await ac.open();
  try {
    const old = await ac.send(ac.intent("opening")),
      arms: { state: string; sync: boolean; times: number[] }[] = [];
    for (const [i, sync] of [false, true, false, true].entries()) {
      const config = sync ? "FIRST 1 (ha1standby)" : "";
      await s.sql("pg", "ALTER SYSTEM SET synchronous_standby_names = '" + config + "'");
      assert.equal(await s.sql("pg", "SELECT pg_reload_conf()"), "t");
      const state = await until("synchronous setting", async () => {
        const read = await s.sql(
          "pg",
          "SELECT current_setting('synchronous_commit'),current_setting('synchronous_standby_names'),state,sync_state FROM pg_stat_replication WHERE application_name='ha1standby'",
        );
        return read === "on|" + config + "|streaming|" + (sync ? "sync" : "async")
          ? read
          : undefined;
      });
      const times = [];
      for (let j = 0; j < 30; j++) {
        const input = ac.intent("arm-" + i + "-" + j, 10, "person-" + j),
          start = clock();
        await ac.send(input);
        times.push(clock() - start);
      }
      arms.push({ state, sync, times });
    }
    const lsn = await s.sql("pg", "SELECT pg_current_wal_flush_lsn()");
    assert.match(lsn, /^[0-9A-F]+\/[0-9A-F]+$/);
    await until(
      "remote durable WAL",
      async () =>
        (await s.sql(
          "pg",
          "SELECT flush_lsn >= '" +
            lsn +
            "' AND sync_state='sync' FROM pg_stat_replication WHERE application_name='ha1standby'",
        )) === "t" || undefined,
    );
    // [DX-HA1] Why: promotion is safe only once the old primary cannot restart and the synchronous copy holds its WAL. Rejected: checking just the primary's local commit result.
    const fault = await s.kill("pg");
    await s.remove("pg");
    await s.remove("write");
    await s.remove("active");
    assert.equal(await s.sql("target", "SELECT pg_promote(true,60)"), "t");
    assert.equal(
      await s.sql(
        "target",
        "SELECT NOT pg_is_in_recovery() AND pg_last_wal_replay_lsn() >= '" + lsn + "'",
      ),
      "t",
    );
    assert.equal(await s.sql("target", "SHOW synchronous_standby_names"), "");
    await s.tx("active", s.b, "target", "moving");
    await until("promoted broker", async () => (await s.broker("active")) || undefined);
    await s.gateway("write", s.b, "target", "moving");
    const next = await s.ready("write");
    ac.changeEndpoint(next, next);
    const recovered = await ac.verify();
    await ac.pinned(old);
    const fresh = await ac.send(ac.intent("new-primary"));
    await ac.pinned(fresh);
    const quantiles = (sync: boolean) => {
      const a = arms
        .filter((x) => x.sync === sync)
        .flatMap((x) => x.times)
        .sort((a, b) => a - b);
      return {
        n: a.length,
        p50: a[Math.ceil(0.5 * a.length) - 1],
        p99: a[Math.ceil(0.99 * a.length) - 1],
      };
    };
    const result = {
      nonce: s.e.nonce,
      cluster,
      lsn,
      arms,
      localFlush: quantiles(false),
      remoteFlush: quantiles(true),
      fault,
      recovered,
      firstNewMs: ac.arrivals.get(fresh.operationId)! - fault.from,
      postPromotion: await ac.verify(),
      fresh,
    };
    s.e.write("replication", result);
    return { localFlush: result.localFlush, remoteFlush: result.remoteFlush, recovered };
  } finally {
    ac.close();
  }
}
