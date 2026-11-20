import assert from "node:assert/strict";
import { Account } from "../ha1/one-db.ts";
import { hash, loopback, roles, type Role } from "../ha1/common.ts";
import { drop, replicationRole } from "../ha1/one-backup.ts";
import { Stack, type Site } from "../ha1/stack.ts";
import { DatomicClient } from "../../../../packages/datomic/test/ha1-account.ts";
import { ingress } from "./ingress.ts";
import type { Checkpoint } from "./seed.ts";
import {
  lsn,
  Supervisor,
  timeouts,
  wait,
  type Candidate,
  type Durability,
  type Port,
} from "./supervisor.ts";

const standbyName = "sync_b";
const guard = "test ! -e /ha-fence/closed || { echo DX-HASYNC1-fenced >&2; exit 74; }; ";
const pgArgs = [
  "-c",
  "shared_buffers=32MB",
  "-c",
  "wal_log_hints=on",
  "-c",
  "fsync=on",
  "-c",
  "full_page_writes=on",
  "-c",
  "hot_standby=on",
  "-c",
  "wal_sender_timeout=5s",
  "-c",
  "wal_receiver_timeout=5s",
  "-c",
  "wal_receiver_status_interval=1s",
  "-c",
  "wal_keep_size=512MB",
];
type SqlRole = "pg" | "target";
export class SyncPair {
  readonly latch: string;
  readonly primaryData: string;
  readonly transitions: { stage: string; at: number }[] = [];
  route?: Awaited<ReturnType<typeof ingress>>;
  account?: Account;
  cluster = "";
  timeline = 0;
  writer = "";
  reader = "";
  initialFlush = "";
  constructor(
    readonly s: Stack,
    readonly base?: { path: string; checkpoint?: Checkpoint },
  ) {
    this.latch = s.e.prefix + "-fence";
    this.primaryData = s.e.prefix + "-pgdata";
  }
  async docker(
    role: Role,
    command: string,
    args: string[] = [],
    timeout: number = timeouts.control,
  ) {
    const m = this.s.members.get(role);
    assert(m);
    return m.site.docker([command, m.id, ...args], { timeout });
  }
  async sql(role: SqlRole, query: string, db = "postgres", ms: number = timeouts.control) {
    const m = this.s.members.get(role);
    assert(m);
    return m.site.docker(
      [
        "exec",
        "-e",
        "PGOPTIONS=-c statement_timeout=" + Math.max(1, ms - 250),
        m.id,
        "psql",
        "-XAtq",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        db,
        "-c",
        query,
      ],
      { timeout: ms },
    );
  }
  volume(readOnly = true) {
    return [
      "--mount",
      "type=volume,source=" + this.latch + ",target=/ha-fence" + (readOnly ? ",readonly" : ""),
    ];
  }
  async ownedVolume(name: string) {
    const s = this.s;
    assert.equal(
      await s.a.docker(["volume", "create", "--label", "ha1.attempt=" + s.e.nonce, name]),
      name,
    );
    s.sharedVolumes.add(name);
  }
  dataMount() {
    return [
      "--mount",
      "type=volume,source=" + this.primaryData + ",target=/var/lib/postgresql/data",
    ];
  }
  async open(
    options: {
      grouped?: boolean;
      lean?: boolean;
      writeTimeout?: number;
      init?: (ac: Account) => Promise<unknown>;
    } = {},
  ) {
    const s = this.s;
    const cp = this.base?.checkpoint;
    if (cp) assert.equal(cp.layout, options.lean ? "lean" : "legacy");
    await this.ownedVolume(this.latch);
    await this.ownedVolume(this.primaryData);
    await s.start("tool", s.a, this.volume(false), "/bin/sh", ["-c", "exec sleep infinity"]);
    await s.start(
      "pg",
      s.a,
      [
        "--restart",
        "no",
        "-e",
        "POSTGRES_PASSWORD=" + s.admin,
        ...this.volume(),
        ...this.dataMount(),
        ...(this.base
          ? [
              "--mount",
              "type=bind,source=" + this.base.path + ",target=/base" + (cp ? ",readonly" : ""),
            ]
          : []),
        ...(cp ? ["-e", "BASE_LAYOUT=" + cp.layout, "-e", "BASE_MANIFEST=" + cp.manifest] : []),
        ...(s.a === s.b ? ["-p", loopback + "::5432"] : []),
      ],
      "/bin/sh",
      [
        "-ceu",
        guard +
          (cp
            ? 'actual=$(sha256sum "/base/$BASE_LAYOUT/backup_manifest"); test "${actual%% *}" = "$BASE_MANIFEST"; cp -a "/base/$BASE_LAYOUT/." "$PGDATA/"; '
            : "") +
          'exec docker-entrypoint.sh postgres "$@"',
        "primary",
        ...pgArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    await this.pgReady("pg", false, cp ? 360000 : timeouts.setup);
    if (!cp) {
      await s.database("pg", "moving");
      await replicationRole(s);
    }
    await this.tx("active", s.a);
    await this.waitBroker("active", timeouts.setup);
    this.writer = await this.gateway("write", s.a, "pg", options.grouped);
    const ac = new Account(
      s.e.prefix + "-sync",
      this.writer,
      this.writer,
      cp?.key,
      options.writeTimeout,
    );
    this.account = ac;
    if (cp) {
      assert.deepEqual(await ac.w.basis(ac.db), cp.basis);
      assert(cp.basis.t.t === "long");
      ac.cursor = String(BigInt(cp.basis.t.v) + 1n);
      ac.schema = cp.basis.schemaHash;
      assert.equal(hash(JSON.stringify(cp.receipts)), cp.seal);
    } else await ac.open(options.lean ? "lean" : "legacy", options.lean ?? false);
    const setup = cp ?? (await options.init?.(ac));
    assert.match(
      (this.cluster = await this.sql("pg", "select system_identifier from pg_control_system()")),
      /^\d+$/,
    );
    const tli = await this.sql("pg", "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8)");
    assert.match(tli, /^[0-9A-F]{8}$/);
    this.timeline = parseInt(tli, 16);
    if (cp) assert.equal(this.cluster, cp.cluster);
    return { ac, setup };
  }
  async clone(replicationHost?: string, replicationPort = 5432) {
    const s = this.s;
    const remote = replicationHost ?? s.storageHost("pg", s.b);
    const conn =
      "host=" +
      remote +
      " port=" +
      replicationPort +
      " user=ha1stream password=" +
      s.secret +
      " application_name=" +
      standbyName +
      " connect_timeout=2";
    const start = performance.now();
    await s.start(
      "target",
      s.b,
      ["-e", "REPLICATION=" + conn],
      "/bin/sh",
      [
        "-ceu",
        drop +
          'chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; ' +
          '"$drop" postgres pg_basebackup --checkpoint=fast -D "$PGDATA" -X stream -R -d "$REPLICATION"; ' +
          'printf "%s\\n" "synchronous_standby_names = \'FIRST 1 (sync_a)\'" >> "$PGDATA/postgresql.auto.conf"; ' +
          'exec docker-entrypoint.sh postgres "$@"',
        "standby",
        ...pgArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    await this.pgReady("target", true, this.base?.checkpoint ? 360000 : timeouts.setup);
    const received = await wait("initial WAL receiver", timeouts.setup, () =>
      this.candidate().catch(() => undefined),
    );
    assert.equal(received.cluster, this.cluster);
    assert.equal(received.timeline, this.timeline);
    return { copyMs: performance.now() - start, received };
  }
  async service(grouped = false) {
    const s = this.s;
    this.initialFlush = await this.setSync(true);
    await this.tx("standby", s.b);
    await wait("Datomic standby monitoring", timeouts.setup, async () => {
      const marker = await s.exec(
        "standby",
        "sh",
        "-c",
        "grep -h ':transactor/standby' log/*.log | tail -1",
      );
      return marker.includes(":transactor/standby") && !(await s.broker("standby"))
        ? true
        : undefined;
    });
    this.reader = await this.gateway("read", s.b, "target", grouped);
    this.route = await ingress(this.writer);
    this.account!.changeEndpoint(this.route.url, this.reader);
    await this.auditCheckpoint("before");
  }
  async setSync(enabled: boolean) {
    const setting = enabled ? "FIRST 1 (" + standbyName + ")" : "";
    await this.sql("pg", "ALTER SYSTEM SET synchronous_standby_names='" + setting + "'");
    assert.equal(await this.sql("pg", "SELECT pg_reload_conf()"), "t");
    return wait("observed WAL acknowledgement mode", timeouts.setup, async () => {
      const result = await this.sql(
        "pg",
        "SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('synchronous_standby_names'),state,sync_state,flush_lsn " +
          "FROM pg_stat_replication WHERE application_name='" +
          standbyName +
          "'",
      );
      const [fsync, commit, names, state, sync, flush] = result.split("|");
      return fsync === "on" &&
        commit === "on" &&
        names === setting &&
        state === "streaming" &&
        sync === (enabled ? "sync" : "async") &&
        flush
        ? flush
        : undefined;
    });
  }
  async pgReady(role: SqlRole, recovery: boolean, budget: number = timeouts.setup) {
    await wait("PostgreSQL 17 " + role, budget, async () => {
      const result = await this.sql(
        role,
        "select current_setting('server_version_num')::int/10000, current_setting('fsync')," +
          "current_setting('synchronous_commit'),pg_is_in_recovery() where current_setting('listen_addresses')='*'",
      ).catch(() => "");
      return result === "17|on|on|" + (recovery ? "t" : "f") ? true : undefined;
    });
  }
  async candidate(): Promise<Candidate> {
    const [cluster, receive, replay, timeline] = (
      await this.sql(
        "target",
        "select system_identifier, pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), " +
          "coalesce((select received_tli from pg_stat_wal_receiver),nullif(min_recovery_end_timeline,0),timeline_id) " +
          "from pg_control_system(),pg_control_recovery(),pg_control_checkpoint() where pg_is_in_recovery()",
      )
    ).split("|");
    assert(
      cluster && receive && replay && timeline && /^\d+$/.test(timeline),
      "Missing standby recovery state",
    );
    return { cluster, receive, replay, timeline: Number(timeline) };
  }
  async #primary() {
    const row = await this.sql(
      "pg",
      "select current_setting('fsync')='on' and current_setting('synchronous_commit')='on' and " +
        "current_setting('synchronous_standby_names')='FIRST 1 (sync_b)' and exists " +
        "(select 1 from pg_stat_replication where application_name='sync_b' and state='streaming' and sync_state='sync')," +
        "coalesce((select flush_lsn::text from pg_stat_replication where application_name='sync_b'), '0/0')," +
        "coalesce((select max(extract(epoch from (clock_timestamp()-query_start))*1000)::bigint from pg_stat_activity " +
        "where wait_event='SyncRep' and datname='moving'),0) where not pg_is_in_recovery()",
    ).catch(() => undefined);
    if (!row) return undefined;
    const [sync, flush, waiting] = row.split("|");
    assert(flush && /^\d+$/.test(waiting ?? ""));
    return { sync: sync === "t", flush, waitingMs: Number(waiting) };
  }
  async tx(role: "active" | "standby", site: Site) {
    const s = this.s;
    const hosts = [s.storageHost("pg", site) + ":5432"];
    if (role === "standby") hosts.push(s.storageHost("target", site) + ":5432");
    const props = [
      "protocol=sql",
      "host=" + s.name(role),
      "alt-host=" + (site.privateAddress ?? s.name(role)),
      "port=4334",
      "sql-url=jdbc:postgresql://" +
        hosts.join(",") +
        "/moving?targetServerType=primary&connectTimeout=" +
        timeouts.jdbcConnectSeconds +
        "&hostRecheckSeconds=1",
      "sql-driver-class=org.postgresql.Driver",
      "sql-user=moving",
      "sql-password=" + s.secret,
      "heartbeat-interval-msec=" + timeouts.heartbeat,
      "memory-index-threshold=32m",
      "memory-index-max=96m",
      "object-cache-max=64m",
    ];
    const bench = site.privateAddress !== undefined;
    await s.start(
      role,
      site,
      [
        "--restart",
        "no",
        "-e",
        "HA_PROPERTIES=" + props.join("\n"),
        ...(role === "active" ? this.volume() : []),
      ],
      "/bin/sh",
      [
        "-ceu",
        (role === "active" ? guard : "") +
          'printf "%s\\n" "$HA_PROPERTIES" > /tmp/hasync.properties; exec bin/transactor -Xms96m -Xmx' +
          (bench ? "1400" : "288") +
          "m -XX:ActiveProcessorCount=2 /tmp/hasync.properties",
      ],
      bench ? 4334 : undefined,
    );
  }
  async waitBroker(role: "active" | "standby", timeout: number) {
    await wait("serving transactor " + role, timeout, async () => {
      const m = this.s.members.get(role)!;
      const isRunning = await this.docker(role, "inspect", ["--format", "{{.State.Running}}"]);
      if (role === "standby" && isRunning === "false")
        await m.site.docker(["start", m.id], { timeout: timeouts.control });
      const probe = await m.site
        .docker(
          [
            "exec",
            m.id,
            "bash",
            "-c",
            'exec 3<>"/dev/tcp/$1/4334" 2>/dev/null',
            "probe",
            this.s.name(role),
          ],
          { timeout: timeouts.control },
        )
        .then(
          () => true,
          () => undefined,
        );
      return probe;
    });
  }
  async gateway(role: "write" | "read", site: Site, storage: SqlRole, grouped = false) {
    const s = this.s;
    await s.start(
      role,
      site,
      [
        "-e",
        "DATOMIC_URI_TEMPLATE=" +
          s.uri(storage, "moving", "{db}", site) +
          "&connectTimeout=1&hostRecheckSeconds=1",
        "-e",
        "GATEWAY_SOURCE_SHA256=" + s.e.source.gateway,
        "-e",
        "TX2_GROUP_COMMIT=" + Number(grouped),
        "-e",
        "DATOMIC_JAVA_OPTS=-Xms96m -Xmx" +
          (site.privateAddress ? "1600" : "320") +
          "m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=64m",
      ],
      "/opt/datomic/bin/run",
      ["-m", "triplex.gateway.ha-observer", "8080"],
      8080,
    );
    return s.ready(role);
  }
  async fence(planned: boolean) {
    const s = this.s;
    const start = performance.now();
    const marker = "fenced:" + s.e.nonce + ":" + this.cluster;
    // [DX-HASYNC1] Why: the old processes share a durable boot interlock before the controller can promote. Rejected: health failures or a reversible HTTP routing change as proof of fencing.
    const tool = s.members.get("tool")!;
    const command = [
      "exec",
      tool.id,
      "sh",
      "-ceu",
      'if test -e /ha-fence/closed; then test "$(cat /ha-fence/closed)" = "$1"; else ' +
        'set -C; printf "%s\\n" "$1" > /ha-fence/closed; sync -f /ha-fence; fi; cat /ha-fence/closed',
      "fence",
      marker,
    ];
    assert.equal(await s.a.docker(command, { timeout: timeouts.control }), marker);
    const stop = async (role: "pg" | "active") => {
      const v = await s.view(role, timeouts.control);
      assert.equal(v.HostConfig.RestartPolicy.Name, "no");
      assert(
        v.Mounts.some(
          (m: { Name: string; Destination: string; RW: boolean }) =>
            m.Name === this.latch && m.Destination === "/ha-fence" && m.RW === false,
        ),
      );
      if (v.State.Running) {
        if (planned && role === "pg") await this.docker(role, "stop", ["--time=2"], 4000);
        else await this.docker(role, "kill", ["--signal=KILL"]);
      }
      const after = await s.view(role, timeouts.control);
      assert.equal(after.State.Running, false);
      assert.equal(after.State.Restarting, false);
      s.e.log("old-role-stopped", {
        role,
        id: after.Id,
        exit: after.State.ExitCode,
        finished: after.State.FinishedAt,
      });
    };
    let finalFlush: string | undefined;
    if (planned) {
      await stop("active");
      finalFlush = await this.sql("pg", "select pg_current_wal_flush_lsn()");
      const required = lsn(finalFlush);
      await wait("final planned flush", timeouts.replay, async () =>
        lsn((await this.candidate()).replay) >= required ? true : undefined,
      );
      await stop("pg");
    } else {
      await Promise.all([stop("pg"), stop("active")]);
    }
    assert(performance.now() - start <= timeouts.fence, "Fence exceeded budget");
    assert.equal(
      await s.a.docker(["exec", tool.id, "cat", "/ha-fence/closed"], { timeout: timeouts.control }),
      marker,
    );
    return {
      proof: {
        cluster: this.cluster,
        epoch: s.e.nonce,
        primary: s.members.get("pg")!.id,
        transactor: s.members.get("active")!.id,
        method: "startup-latch-and-stop" as const,
      },
      ...(finalFlush === undefined ? {} : { finalFlush }),
    };
  }
  async promote() {
    assert.equal(await this.sql("target", "select pg_promote(false)"), "t");
    return wait("new PostgreSQL timeline", timeouts.promote, async () => {
      const tli = await this.sql(
        "target",
        "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8) where not pg_is_in_recovery()",
      ).catch(() => "");
      return /^[0-9A-F]{8}$/.test(tli) ? parseInt(tli, 16) : undefined;
    });
  }
  async rejoin() {
    const s = this.s;
    const start = performance.now();
    const old = await s.view("pg", timeouts.control);
    assert.equal(old.State.Running, false);
    assert(
      old.Mounts.some(
        (m: { Name: string; Destination: string; RW: boolean }) =>
          m.Name === this.primaryData && m.Destination === "/var/lib/postgresql/data" && m.RW,
      ),
    );
    await this.sql("target", "CHECKPOINT", "postgres", 5000);
    // [DX-HASYNC1] Why: only a new container that first rewinds the fenced disk and verifies recovery may serve A again. Rejected: clearing the old startup interlock.
    await this.docker("pg", "rm");
    s.members.delete("pg");
    const oldHost = s.storageHost("target", s.a);
    const source =
      "host=" +
      oldHost +
      " port=5432 user=postgres password=" +
      s.admin +
      " application_name=sync_a connect_timeout=2 target_session_attrs=read-write";
    const stream =
      "host=" +
      oldHost +
      " port=5432 user=ha1stream password=" +
      s.secret +
      " application_name=sync_a connect_timeout=2";
    await s.start(
      "pg",
      s.a,
      ["-e", "REJOIN_SOURCE=" + source, "-e", "REJOIN_STREAM=" + stream, ...this.dataMount()],
      "/bin/sh",
      [
        "-ceu",
        drop +
          '"$drop" postgres pg_rewind --target-pgdata="$PGDATA" --source-server="$REJOIN_SOURCE" --write-recovery-conf; ' +
          'printf "primary_conninfo = \'%s\'\\n" "$REJOIN_STREAM" >> "$PGDATA/postgresql.auto.conf"; ' +
          'test -f "$PGDATA/standby.signal"; exec docker-entrypoint.sh postgres "$@"',
        "rejoin",
        ...pgArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    await this.pgReady("pg", true, Math.max(0, timeouts.rejoin - (performance.now() - start)));
    assert.equal(
      await this.sql("pg", "select system_identifier from pg_control_system()"),
      this.cluster,
    );
    const m = s.members.get("pg")!;
    const output = await m.site.docker(["logs", "--tail", "35", m.id], {
      timeout: timeouts.control,
    });
    assert.match(output, /pg_rewind:.*(?:Done!|no rewind required)/);
    s.e.log("rejoined", {
      old: old.Id,
      new: m.id,
      ms: performance.now() - start,
      stdout: s.redact(output),
    });
  }
  async activate(policy: Durability, kind: "fault" | "planned") {
    if (policy === "two-copy" && kind === "planned") await this.rejoin();
    if (policy === "single-copy-after-fence") {
      await this.sql("target", "ALTER SYSTEM SET synchronous_standby_names=''");
      assert.equal(await this.sql("target", "select pg_reload_conf()"), "t");
    }
    assert.equal(
      await wait("promoted durability setting", timeouts.replay, async () => {
        const reply = await this.sql(
          "target",
          "select current_setting('fsync'),current_setting('synchronous_commit'),current_setting('synchronous_standby_names')," +
            "exists(select 1 from pg_stat_replication where application_name='sync_a' and state='streaming' and sync_state='sync')",
        );
        const expected = policy === "two-copy" ? "on|on|FIRST 1 (sync_a)|t" : "on|on||f";
        return reply === expected ? reply : undefined;
      }),
      policy === "two-copy" ? "on|on|FIRST 1 (sync_a)|t" : "on|on||f",
    );
    const brokerStart = performance.now();
    await this.waitBroker("standby", timeouts.broker);
    const peer = new DatomicClient(this.reader, timeouts.control);
    try {
      await wait(
        "gateway synchronized on the new transactor",
        Math.max(0, timeouts.broker - (performance.now() - brokerStart)),
        async () => {
          const v = await peer
            .request<{ database: string; basis: string }>(
              "GET",
              "/ha1/" + this.account!.db + "/sync",
            )
            .catch(() => undefined);
          return v?.database === this.account!.db && /^\d+$/.test(v.basis) ? v : undefined;
        },
      );
    } finally {
      peer.close();
    }
  }
  supervisor() {
    const route = this.route!;
    const port: Port = {
      identity: {
        cluster: this.cluster,
        epoch: this.s.e.nonce,
        primary: this.s.members.get("pg")!.id,
        transactor: this.s.members.get("active")!.id,
        timeline: this.timeline,
      },
      seal: () => route.seal(),
      drain: () => route.drain(),
      primary: () => this.#primary(),
      candidate: () => this.candidate(),
      fence: (planned) => this.fence(planned),
      promote: () => this.promote(),
      activate: (policy, kind) => this.activate(policy, kind),
      publish: () => route.publish(this.reader),
      observe: (stage, data) => {
        this.transitions.push({ stage, at: performance.now() });
        this.s.e.log(stage, data);
      },
    };
    return new Supervisor(port, this.initialFlush);
  }
  async auditCheckpoint(stage: "before" | "after") {
    if (!this.base?.checkpoint) return;
    const cp = this.base.checkpoint;
    const { auditSeed } = await import("./seed.ts");
    const receipts = await auditSeed(this.account!, cp.receipts);
    this.s.e.log("seed-identity", { stage, seal: cp.seal, manifest: cp.manifest, receipts });
  }
  async cleanup() {
    this.route?.close();
    this.account?.close();
    const s = this.s;
    for (const volume of s.sharedVolumes) {
      const owned = await s.a.docker([
        "volume",
        "inspect",
        "--format",
        '{{index .Labels "ha1.attempt"}}',
        volume,
      ]);
      assert.equal(owned, s.e.nonce);
      await s.a.docker(["volume", "rm", volume]);
      assert.equal(
        await s.a.docker(["volume", "ls", "-q", "--filter", "name=^" + volume + "$"]),
        "",
      );
      s.e.log("owned-volume-removed", { volume });
    }
  }
}

// Keep the same admission cap as the roles the engine grants this drill.
assert(Object.values(roles).reduce((n, cap) => n + cap, 0) <= 3584);
