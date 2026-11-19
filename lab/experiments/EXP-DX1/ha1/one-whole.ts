import assert from "node:assert/strict";
import { clock, until } from "./common.ts";
import {
  Account,
  DatomicClient,
  errorCode,
  immutable,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { healthyBroker, populate, receipts, verifySuffix, requestIndex } from "./one-db.ts";
import { conninfo, drop, latency, replicationRole, traffic } from "./one-backup.ts";
import { ackProxy } from "./ack-proxy.ts";
import type { Stack } from "./stack.ts";

export async function oneWhole(s: Stack, people: number, measureSync: boolean) {
  await s.tool();
  await s.postgres("pg", s.a);
  await s.database("pg", "moving");
  await replicationRole(s);
  await s.tx("active", s.a, "pg", "moving");
  await healthyBroker(s, "active");
  await s.gateway("write", s.a, "pg", "moving");
  const initial = await s.ready("write"),
    ac = new Account(s.e.prefix + "-one", initial, initial);
  try {
    await ac.open();
    const population = await populate(s, ac, people, 330000);
    const old = await ac.send(ac.intent("past"));
    const live = traffic(ac, "precopy");
    let copyMs = 0;
    const cluster = await s.sql("pg", "SELECT system_identifier FROM pg_control_system()");
    try {
      const t = clock();
      await s.start(
        "target",
        s.b,
        ["-e", "HA1_CONN=" + conninfo(s, s.b, "ha1standby")],
        "/bin/sh",
        [
          "-ceu",
          drop +
            'chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; "$drop" postgres pg_basebackup --checkpoint=fast -D "$PGDATA" -X stream -R -d "$HA1_CONN"; exec docker-entrypoint.sh postgres -c shared_buffers=32MB',
        ],
        5432,
      );
      await until("live standby replay", async () => {
        try {
          return (
            (await s.sql(
              "target",
              "select pg_is_in_recovery() AND pg_last_wal_replay_lsn() IS NOT NULL",
            )) === "t" || undefined
          );
        } catch {
          return undefined;
        }
      });
      copyMs = clock() - t;
    } finally {
      await live.stop();
    }
    assert(live.samples.some((a) => a.end - a.start > 0));
    assert.equal(
      await s.sql("target", "SELECT system_identifier FROM pg_control_system()"),
      cluster,
    );
    const setting = async (sync: boolean) => {
      const name = sync ? "FIRST 1 (ha1standby)" : "";
      await s.sql("pg", "ALTER SYSTEM SET synchronous_standby_names='" + name + "'");
      assert.equal(await s.sql("pg", "SELECT pg_reload_conf()"), "t");
      return until("observed WAL acknowledgement mode", async () => {
        const r = await s.sql(
          "pg",
          "SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('synchronous_standby_names'),state,sync_state FROM pg_stat_replication WHERE application_name='ha1standby'",
        );
        return r === "on|on|" + name + "|streaming|" + (sync ? "sync" : "async") ? r : undefined;
      });
    };
    const blocks: { sync: boolean; setting: string; ms: number[] }[] = [];
    if (measureSync) {
      // [DX-HA1] Why: 4,096 real ten-fact writes per mode put 41 observations in each upper percentile. Rejected: pricing remote commit from the slowest of 60 on one VM.
      for (const [i, sync] of [
        false,
        true,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
        true,
        true,
        false,
        true,
        false,
        false,
        true,
      ].entries()) {
        const config = await setting(sync),
          ms: number[] = [];
        for (let k = 0; k < 512; k++) {
          const input = ac.intent(
              "cost-" + i + "-" + k,
              10,
              "tenant-" + (k % 10) + "/cost-" + i + "-" + k,
            ),
            t = clock();
          await ac.send(input);
          ms.push(clock() - t);
        }
        blocks.push({ sync, setting: config, ms });
        s.e.log("cost-block", { i, sync, stats: latency(ms) });
      }
    }
    await setting(true);
    await requestIndex(ac);
    await receipts(ac, ac.inputs, ac.w);
    const before = await ac.send(ac.intent("before-fence")),
      cursor = String(BigInt(before.t.v) + 1n);
    const p = await ackProxy(initial),
      client = new DatomicClient(p.url, 20000),
      pending = ac.intent("lost");
    let original: ReturnType<typeof immutable>;
    try {
      const lost = client.transact(ac.db, pending).then(
        () => {
          throw Error("ACK escaped");
        },
        (e) => assert.equal(errorCode(e), "Transport"),
      );
      await p.wait([pending.operationId], true);
      const raw = p.requests.get(pending.operationId)!;
      assert.equal(raw.status, 200);
      original = immutable(raw.reply);
      p.drop();
      await lost;
    } finally {
      p.close();
      client.close();
    }
    const frozen = clock();
    await s.sql("pg", "ALTER ROLE moving NOLOGIN");
    await s.sql(
      "pg",
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='moving'",
    );
    assert.equal(
      await s.sql("pg", "SELECT count(*) FROM pg_stat_activity WHERE usename='moving'"),
      "0",
    );
    const lsn = await s.sql("pg", "SELECT pg_current_wal_flush_lsn()");
    assert.match(lsn, /^[0-9A-F]+\/[0-9A-F]+$/);
    await until(
      "durable on target",
      async () =>
        (await s.sql(
          "pg",
          "SELECT flush_lsn >= '" +
            lsn +
            "' AND sync_state='sync' FROM pg_stat_replication WHERE application_name='ha1standby'",
        )) === "t" || undefined,
    );
    const durable = clock();
    await s.kill("pg");
    await s.remove("pg");
    await s.remove("write");
    await s.remove("active");
    const fenced = clock();
    assert.equal(await s.sql("target", "SELECT pg_promote(true,60)"), "t");
    assert.equal(
      await s.sql(
        "target",
        "SELECT NOT pg_is_in_recovery() AND pg_last_wal_replay_lsn() >= '" + lsn + "'",
      ),
      "t",
    );
    // [DX-HA1] Why: the physical copy inherited NOLOGIN from the old writer fence. Rejected: enabling target writers before old-primary removal and confirmed replay.
    await s.sql("target", "ALTER ROLE moving LOGIN");
    const promoted = clock();
    await s.tx("active", s.b, "target", "moving");
    await healthyBroker(s, "active");
    const elected = clock();
    await s.gateway("write", s.b, "target", "moving");
    const next = await s.ready("write");
    ac.changeEndpoint(next, next);
    const gateway = clock();
    assert.deepEqual(await ac.send(pending), original);
    await ac.pinned(old);
    const fresh = await ac.send(ac.intent("new-site"));
    const end = clock();
    await receipts(ac);
    const feed = await verifySuffix(ac, cursor, [pending, ac.inputs.at(-1)!]);
    await ac.pinned(fresh);
    const cost = (sync: boolean) => {
      const selected = blocks.filter((b) => b.sync === sync);
      return selected.length
        ? {
            ...latency(selected.flatMap((b) => b.ms)),
            blockP99: selected.map((b) => latency(b.ms).p99),
          }
        : null;
    };
    const result = {
      population,
      copyMs,
      concurrentCopyWrites: live.samples.length,
      cluster,
      lsn,
      pauseMs: end - frozen,
      catchupMs: durable - frozen,
      oldRoleRemovalMs: fenced - durable,
      promotionMs: promoted - fenced,
      txRecoveryMs: elected - promoted,
      gatewayMs: gateway - elected,
      clientMs: end - gateway,
      validatedBeforeCut: ac.inputs.length - 3,
      finalGateChecks: 2,
      original,
      fresh,
      feed,
      localFlush: cost(false),
      synchronous: cost(true),
      auditedReceipts: ac.receipts.size,
    };
    s.e.write("whole-database", { nonce: s.e.nonce, result, blocks, copyWrites: live.samples });
    return result;
  } finally {
    ac.close();
  }
}
