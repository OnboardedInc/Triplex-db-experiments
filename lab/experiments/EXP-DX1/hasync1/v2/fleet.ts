import assert from "node:assert/strict";
import { hash, sleep, type Role } from "../../ha1/common.ts";
import { Account } from "../../ha1/one-db.ts";
import { drop } from "../../ha1/one-backup.ts";
import type { Site, Stack } from "../../ha1/stack.ts";
import { DatomicClient } from "../../../../../packages/datomic/test/ha1-account.ts";
import { auditFeed } from "../faults.ts";
import { ingress } from "../ingress.ts";
import { driveOffers } from "../offers.ts";
import { SyncPair } from "../pair.ts";
import { lsn, Supervisor, timeouts, wait, type Candidate, type Port } from "../supervisor.ts";
import { pgRole, txRole } from "./fleet-config.ts";

type System = {
  id: number;
  account: Account;
  pin: Awaited<ReturnType<Account["send"]>>;
  route: Awaited<ReturnType<typeof ingress>>;
  stream?: Awaited<ReturnType<typeof driveOffers>>;
  routed?: number;
};
const guard = "test ! -e /ha-fence/closed || exit 74; ";
const application = "fleet_b";
const storage = "cells";
const identifier = (s: string) => {
  assert.match(s, /^s2-[A-Za-z0-9_-]{1,60}$/);
  return '"' + s + '"';
};
async function all<T>(tasks: Promise<T>[]) {
  const done = await Promise.allSettled(tasks);
  return done.map((p) => {
    if (p.status === "rejected") throw p.reason;
    return p.value;
  });
}

export async function fleet(s: Stack, pair: SyncPair, count: number) {
  const shared = s.e.mode === "hasync-fleet-shared";
  const bench = s.a !== s.b;
  const groups = Array.from({ length: shared ? 1 : count }, (_, i) => i);
  const systems: System[] = [];
  const fromFields = (id: number) => (shared ? 0 : id);
  const port = (id: number) => 4360 + id;
  const externalPg = (id: number) => 15520 + id;
  const sqlOn = (side: "a" | "b", i: number) => pgRole(side, i);
  const scope = (id: number) => (id + 10).toString(36);
  const db = (id: number) =>
    "s2-" +
    Buffer.from(JSON.stringify(["triplex-scope-v1", "ha1", scope(id), "test", 0])).toString(
      "base64url",
    );
  const sql = (role: Role, query: string, name = "postgres", budget = 3000) => {
    const m = s.members.get(role)!;
    return m.site.docker(
      [
        "exec",
        "-e",
        "PGOPTIONS=-c statement_timeout=" + (budget - 250),
        m.id,
        "psql",
        "-XAtq",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        name,
        "-c",
        query,
      ],
      { timeout: budget },
    );
  };
  const address = (side: "a" | "b", i: number, from: Site) => {
    const to = side === "a" ? s.a : s.b;
    return to === from
      ? ([s.name(sqlOn(side, i)), 5432] as const)
      : ([to.privateAddress!, externalPg(i)] as const);
  };
  const candidate = async (i: number): Promise<Candidate> => {
    const [cluster, receive, replay, timeline] = (
      await sql(
        sqlOn("b", i),
        "select system_identifier,pg_last_wal_receive_lsn(),pg_last_wal_replay_lsn()," +
          "coalesce((select received_tli from pg_stat_wal_receiver),nullif(min_recovery_end_timeline,0),timeline_id) " +
          "from pg_control_system(),pg_control_recovery(),pg_control_checkpoint() where pg_is_in_recovery()",
      )
    ).split("|");
    assert(cluster && receive && replay && timeline && /^\d+$/.test(timeline));
    return { cluster, receive, replay, timeline: Number(timeline) };
  };
  const startPg = async (side: "a" | "b", i: number) => {
    const role = sqlOn(side, i);
    const site = side === "a" ? s.a : s.b;
    const aliases = shared ? [] : ["--network-alias", "db-" + side + "-" + db(i)];
    const source = address("a", i, site);
    const primary = side === "a";
    const opts = primary
      ? ["-e", "POSTGRES_PASSWORD=" + s.admin, ...pair.volume()]
      : [
          "-e",
          "COPY=host=" +
            source[0] +
            " port=" +
            source[1] +
            " user=fleet_rep password=" +
            s.secret +
            " application_name=" +
            application +
            " connect_timeout=2",
        ];
    const copy =
      drop +
      'chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; ' +
      '"$drop" postgres pg_basebackup --checkpoint=fast -D "$PGDATA" -X stream -R -d "$COPY"; ';
    await s.start(
      role,
      site,
      [...aliases, ...opts],
      "/bin/sh",
      [
        "-ceu",
        (primary ? guard : copy) + 'exec docker-entrypoint.sh postgres "$@"',
        "postgres",
        "-c",
        "shared_buffers=" + (shared ? "24MB" : "8MB"),
        "-c",
        "fsync=on",
        "-c",
        "synchronous_commit=on",
        "-c",
        "wal_sender_timeout=5s",
        "-c",
        "wal_receiver_timeout=5s",
        "-c",
        "max_connections=" + (shared ? "180" : "32"),
        "-c",
        "wal_keep_size=64MB",
      ],
      bench ? 5432 : undefined,
      bench ? externalPg(i) : undefined,
    );
    await wait("fleet PostgreSQL " + role, timeouts.setup, async () => {
      const r = await sql(
        role,
        "select current_setting('server_version_num')::int/10000,pg_is_in_recovery()",
      ).catch(() => "");
      return r === "17|" + (primary ? "f" : "t") ? true : undefined;
    });
  };
  const startTx = async (side: "a" | "b", i: number) => {
    const role = txRole(side, i);
    const site = side === "a" ? s.a : s.b;
    const g = fromFields(i);
    const urls = (side === "a" ? (["a"] as const) : (["a", "b"] as const)).map((source) =>
      address(source, g, site).join(":"),
    );
    const props = [
      "protocol=sql",
      "host=" + s.name(role),
      "alt-host=" + (site.privateAddress ?? s.name(role)),
      "port=" + port(i),
      "sql-url=jdbc:postgresql://" +
        urls.join(",") +
        "/" +
        storage +
        "?targetServerType=primary&connectTimeout=1&hostRecheckSeconds=1&currentSchema=%22" +
        db(i) +
        "%22",
      "sql-driver-class=org.postgresql.Driver",
      "sql-user=" + db(i),
      "sql-password=" + s.secret,
      "heartbeat-interval-msec=" + timeouts.heartbeat,
      "memory-index-threshold=8m",
      "memory-index-max=28m",
      "object-cache-max=24m",
    ];
    await s.start(
      role,
      site,
      ["-e", "PROPS=" + props.join("\n"), ...(side === "a" ? pair.volume() : [])],
      "/bin/sh",
      [
        "-ceu",
        (side === "a" ? guard : "") +
          'printf "%s\\n" "$PROPS" > /tmp/fleet.properties; ' +
          "exec bin/transactor -Xms48m -Xmx" +
          (bench ? "320" : "112") +
          "m -XX:ActiveProcessorCount=2 /tmp/fleet.properties",
      ],
      bench ? port(i) : undefined,
    );
    await wait("fleet transactor " + role, timeouts.setup, async () => {
      if (side === "a") return (await s.broker(role, port(i))) || undefined;
      const log = await s.exec(
        role,
        "sh",
        "-c",
        "grep -h ':transactor/standby' log/*.log | tail -1",
      );
      return log.includes(":transactor/standby") && !(await s.broker(role, port(i)))
        ? true
        : undefined;
    });
  };
  const gateway = async (side: "a" | "b") => {
    const role = side === "a" ? "write" : "read";
    const site = side === "a" ? s.a : s.b;
    const host = shared ? s.name(sqlOn(side, 0)) : "db-" + side + "-{db}";
    const env = [
      "-e",
      "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://" +
        host +
        ":5432/" +
        storage +
        "?user={db}&password=" +
        s.secret +
        "&connectTimeout=1&currentSchema=%22{db}%22",
      "-e",
      "GATEWAY_SOURCE_SHA256=" + s.e.source.gateway,
      "-e",
      "DATOMIC_JAVA_OPTS=-Xms64m -Xmx" +
        (bench ? "512" : "192") +
        "m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=36m",
    ];
    await s.start(
      role,
      site,
      env,
      "/opt/datomic/bin/run",
      ["-m", "triplex.gateway.ha-observer", "8080"],
      8080,
    );
    return s.ready(role);
  };

  let fault: number | undefined;
  try {
    s.e.write("fleet-inventory", {
      nonce: s.e.nonce,
      source: s.e.source,
      slot: s.e.slot,
      systems: Array.from({ length: count }, (_, i) => ({
        system: i,
        database: db(i),
        storage: fromFields(i),
      })),
      allocationsMiB: Object.fromEntries(s.caps!),
      topology: shared ? "schemas" : "dedicated",
    });
    await pair.ownedVolume(pair.latch);
    await s.start("tool", s.a, pair.volume(false), "/bin/sh", ["-c", "exec sleep infinity"]);
    const ddl = await s.exec("tool", "cat", "/opt/datomic/bin/sql/postgres-table.sql");
    await all(
      groups.map(async (i) => {
        await startPg("a", i);
        await sql(sqlOn("a", i), "CREATE DATABASE " + storage);
        await sql(
          sqlOn("a", i),
          "CREATE ROLE fleet_rep LOGIN REPLICATION PASSWORD '" + s.secret + "'",
        );
        await s.exec(
          sqlOn("a", i),
          "sh",
          "-ceu",
          'echo "host replication fleet_rep all scram-sha-256" >> "$PGDATA/pg_hba.conf"',
        );
        assert.equal(await sql(sqlOn("a", i), "select pg_reload_conf()"), "t");
      }),
    );
    for (let i = 0; i < count; i++) {
      const q = identifier(db(i));
      const role = sqlOn("a", fromFields(i));
      // [DX-HASYNC1] Why: the vendor DDL grants to postgres and public. Rejected: running it as the cell role, which cannot transfer table ownership to postgres.
      await sql(
        role,
        "CREATE ROLE " +
          q +
          " LOGIN PASSWORD '" +
          s.secret +
          "';" +
          "CREATE SCHEMA " +
          q +
          " AUTHORIZATION " +
          q +
          "; " +
          "ALTER ROLE " +
          q +
          " IN DATABASE " +
          storage +
          " SET search_path TO " +
          q +
          "; SET search_path TO " +
          q +
          "; " +
          ddl +
          "; REVOKE ALL ON TABLE datomic_kvs FROM PUBLIC; GRANT ALL ON TABLE datomic_kvs TO " +
          q,
        storage,
      );
      assert.equal(await sql(role, "SELECT count(*) FROM " + q + ".datomic_kvs", storage), "0");
    }
    await all(Array.from({ length: count }, (_, i) => startTx("a", i)));
    const writer = await gateway("a");
    await all(
      Array.from({ length: count }, async (_, id) => {
        const route = await ingress(writer);
        const account = new Account(s.e.prefix + "-cell-" + id, writer, writer, scope(id), 15000);
        try {
          assert.equal(account.db, db(id));
          await account.open();
          systems.push({ id, account, route, pin: await account.send(account.intent("seed", 16)) });
        } catch (err) {
          route.close();
          account.close();
          throw err;
        }
      }),
    );
    systems.sort((a, b) => a.id - b.id);
    await all(groups.map((i) => startPg("b", i)));
    const identities = await all(
      groups.map(async (i) => {
        const role = sqlOn("a", i);
        await sql(
          role,
          "ALTER SYSTEM SET synchronous_standby_names='FIRST 1 (" + application + ")'",
        );
        assert.equal(await sql(role, "select pg_reload_conf()"), "t");
        const c = await wait("fleet synchronous WAL", timeouts.setup, async () => {
          const row = await sql(
            role,
            "select current_setting('fsync'),current_setting('synchronous_commit')," +
              "current_setting('synchronous_standby_names'),state,sync_state,flush_lsn from pg_stat_replication " +
              "where application_name='" +
              application +
              "'",
          );
          const prefix = "on|on|FIRST 1 (" + application + ")|streaming|sync|";
          return row.startsWith(prefix) ? row.slice(prefix.length) : undefined;
        });
        lsn(c);
        const cluster = await sql(role, "select system_identifier from pg_control_system()");
        const tli = await sql(role, "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8)");
        assert.match(tli, /^[0-9A-F]{8}$/);
        const original = await candidate(i);
        assert.equal(original.cluster, cluster);
        assert.equal(original.timeline, parseInt(tli, 16));
        const active = systems
          .filter((v) => fromFields(v.id) === i)
          .map(({ id }) => s.members.get(txRole("a", id))!.id);
        return {
          i,
          floor: c,
          id: {
            cluster,
            timeline: original.timeline,
            epoch: s.e.nonce,
            primary: s.members.get(role)!.id,
            transactor: hash(JSON.stringify(active)),
          },
          active,
        };
      }),
    );
    assert.equal(new Set(identities.map((v) => v.id.cluster)).size, shared ? 1 : count);
    await all(systems.map(({ id }) => startTx("b", id)));
    const reader = await gateway("b");
    for (const sys of systems) {
      const ac = sys.account;
      ac.changeEndpoint(sys.route.url, reader);
      await ac.pinned(sys.pin);
      // Use a protected application transaction to verify every independent route before injecting the fault.
      sys.pin = await ac.send(ac.intent("protected", 3));
      await ac.pinned(sys.pin);
    }
    const idle = await idleResources(s);
    for (const sys of systems)
      sys.stream = await driveOffers(s.e, sys.account, sys.pin, {
        label: "cell-" + sys.id,
        writer: sys.route.url,
        reader,
      });
    await systems[0]!.stream!.lead();

    const lost = [...s.members.keys()].filter((r) => r === "write" || r.startsWith("fleet-a-"));
    const views = lost.map((role) => ({ role, id: s.members.get(role)!.id }));
    const owned = views.map((v) => v.id);
    const inspectLost = async () => {
      const state = JSON.parse(await s.a.docker(["inspect", "--type", "container", ...owned]));
      assert.equal(state.length, owned.length);
      for (const [i, v] of state.entries()) {
        assert.equal(v.Id, owned[i]);
        assert.equal(v.Config.Labels["ha1.attempt"], s.e.nonce);
        assert.equal(v.Config.Labels["tx2.holder"], s.holder);
      }
      return state as { State: { Running: boolean; ExitCode: number; FinishedAt: string } }[];
    };
    assert((await inspectLost()).every((v) => v.State.Running));
    fault = performance.now();
    await s.a.docker(["kill", "--signal", "KILL", ...owned]);
    const killed = (await inspectLost()).map(({ State }, i) => {
      assert(!State.Running && State.ExitCode === 137);
      return { ...views[i]!, at: State.FinishedAt };
    });
    s.e.log("fleet-host-cut", { fault, killed });
    let close: Promise<void> | undefined;
    const latch = () =>
      (close ??= (async () => {
        // [DX-HASYNC1] Why: one lost host is fenced as a unit before any independently scheduled promotion. Rejected: allowing an early cell to reopen while another old writer can restart.
        assert.equal(
          await s.exec(
            "tool",
            "sh",
            "-ceu",
            'printf "%s\\n" "$1" > /ha-fence/closed; sync; cat /ha-fence/closed',
            "fence",
            s.e.nonce,
          ),
          s.e.nonce,
        );
        assert((await inspectLost()).every((v) => !v.State.Running));
        s.e.write("fleet-fence", { nonce: s.e.nonce, slot: s.e.slot, fault, stopped: killed });
      })());
    const armed = identities.map(({ i, id, floor }) => {
      const subset = systems.filter((sys) => fromFields(sys.id) === i);
      const { timeline, ...owner } = id;
      const source = sqlOn("a", i),
        target = sqlOn("b", i);
      const actions: Port = {
        identity: id,
        seal: () => subset.forEach((sys) => sys.route.seal()),
        drain: async () => {
          throw Error("Fleet drill requires a fault");
        },
        primary: async () => {
          const healthy = await sql(source, "select not pg_is_in_recovery()").catch(() => "");
          assert.equal(healthy, "", "Fault left the source writable");
          return undefined;
        },
        candidate: () => candidate(i),
        fence: async () => {
          await latch();
          return { proof: { ...owner, method: "startup-latch-and-stop" } };
        },
        promote: async () => {
          const cmd = "select pg_promote(true," + Math.floor(timeouts.promote / 1000) + ")";
          assert.equal(await sql(target, cmd, "postgres", timeouts.promote + 750), "t");
          const next = await sql(
            target,
            "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8)",
          );
          return parseInt(next, 16);
        },
        activate: async () => {
          assert.equal(
            await sql(
              target,
              "select current_setting('fsync'),current_setting('synchronous_commit')," +
                "current_setting('synchronous_standby_names'),pg_is_in_recovery()",
            ),
            "on|on||f",
          );
          const activated = performance.now();
          await all(
            subset.map(async (sys) => {
              await wait("fleet broker ready", timeouts.broker, async () => {
                const role = txRole("b", sys.id);
                const v = await s.view(role, timeouts.control);
                assert(!v.State.OOMKilled, "Fleet standby exceeded its cap");
                if (!v.State.Running) await s.restart(role);
                return (await s.broker(role, port(sys.id))) || undefined;
              });
              const client = new DatomicClient(reader, timeouts.control);
              try {
                await wait(
                  "fleet gateway synchronized",
                  Math.max(0, timeouts.broker - (performance.now() - activated)),
                  async () => {
                    const v = await client
                      .request<{ database: string; basis: string }>(
                        "GET",
                        "/ha1/" + sys.account.db + "/sync",
                      )
                      .catch(() => undefined);
                    return v?.database === sys.account.db &&
                      /^\d+$/.test(v.basis) &&
                      BigInt(v.basis) >= BigInt(sys.pin.t.v)
                      ? true
                      : undefined;
                  },
                );
              } finally {
                client.close();
              }
              sys.route.publish(reader);
              sys.routed = performance.now();
              s.e.log("cell-routed", {
                system: sys.id,
                database: sys.account.db,
                cluster: id.cluster,
                at: sys.routed,
              });
            }),
          );
        },
        publish: () => assert(subset.every((v) => v.routed !== undefined)),
        observe: (stage, value) =>
          s.e.log("fleet-" + stage, {
            group: i,
            systems: subset.map((v) => v.id),
            timeline,
            value,
          }),
      };
      return new Supervisor(actions, floor).run("fault", "single-copy-after-fence");
    });
    const supervisors = await Promise.allSettled(armed);
    const traffic = await all(
      systems.map((sys) =>
        sys.stream!.finish(
          { fault: fault!, ...(sys.routed === undefined ? {} : { routed: sys.routed }) },
          true,
        ),
      ),
    );
    for (const outcome of supervisors) if (outcome.status === "rejected") throw outcome.reason;
    const checked = await all(
      systems.map(async (sys, i) => {
        const recovered = await sys.stream!.resolve();
        await sys.account.pinned(sys.pin);
        const feed = await auditFeed(sys.account, sys.account.inputs, sys.account.cursor);
        return {
          system: sys.id,
          database: sys.account.db,
          scope: sys.account.scope,
          timing: traffic[i]!,
          distinctOffers: recovered.settlements.length,
          feed,
        };
      }),
    );
    const first = checked.map((v) => v.timing.faultToNewWriteMs);
    const seen = first.filter((m): m is number => m !== null);
    const result = {
      layout: shared ? "schemas" : "dedicated",
      systems: count,
      fault,
      idle,
      stopped: views,
      storage: identities,
      cells: checked,
      lastMs: seen.length === count ? Math.max(...seen) : null,
      firstMs: seen.length ? Math.min(...seen) : null,
    };
    s.e.write("fleet", result);
    return result;
  } finally {
    await all(
      systems.map(async (sys) => {
        try {
          await sys.stream?.finish({ ...(fault === undefined ? {} : { fault }) });
        } finally {
          sys.account.close();
          sys.route.close();
        }
      }),
    );
  }
}

async function idleResources(s: Stack) {
  const entries = [...s.members];
  const sample = async () =>
    all(
      entries.map(async ([role, m]) => {
        const raw = await m.site.docker([
          "exec",
          m.id,
          "sh",
          "-ceu",
          "cat /sys/fs/cgroup/memory.current; grep '^usage_usec ' /sys/fs/cgroup/cpu.stat",
        ]);
        const match = /^(\d+)\nusage_usec (\d+)$/.exec(raw);
        assert(match);
        return {
          role,
          cpuUsec: Number(match[2]),
          bytes: Number(match[1]),
          at: performance.now(),
          id: m.id,
        };
      }),
    );
  const start = await sample();
  await sleep(11000);
  const end = await sample();
  const resources = end.map((v, i) => {
    const before = start[i]!;
    assert.equal(v.id, before.id);
    assert(v.bytes > 0 && v.cpuUsec >= before.cpuUsec && v.at > before.at);
    return {
      role: v.role,
      id: v.id,
      mib: v.bytes / 2 ** 20,
      cores: (v.cpuUsec - before.cpuUsec) / ((v.at - before.at) * 1000),
    };
  });
  s.e.write("fleet-idle", {
    nonce: s.e.nonce,
    slot: s.e.slot,
    source: s.e.source,
    start,
    end,
    resources,
  });
  return resources;
}
