import assert from "node:assert/strict";
import { Account } from "../ha1/one-db.ts";
import { hash, loopback, roles, type Role } from "../ha1/common.ts";
import { drop, replicationRole } from "../ha1/one-backup.ts";
import { Stack, type Site } from "../ha1/stack.ts";
import { DatomicClient } from "../../../../packages/datomic/test/ha1-account.ts";
import { ingress } from "./ingress.ts";
import type { Checkpoint } from "./seed.ts";
import type { PowerFence } from "./power-fence.ts";
import { coldCopy, coldMount, coldPhases, type ColdSeed } from "./sunday-seed.ts";
import { catchUp, type CatchUp } from "./catch-up.ts";
import { checkProfileFlags, launchProfile, startupFlags } from "../jvm1/launch.mjs";
import { selectedWriter } from "../v01/profile.ts";
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
export const replicationPort = 25432;
const coldBudgetMs = 20 * 60000;
export const sundayProfile = launchProfile("server");
export type SundayPair = { primary: ColdSeed; standby: ColdSeed; scope: string };
export class SyncPair {
  readonly latch: string;
  readonly primaryData: string;
  readonly transitions: { stage: string; at: number }[] = [];
  route?: Awaited<ReturnType<typeof ingress>>;
  account?: Account;
  beforeReplacement?: () => Promise<void>;
  replacement?: Awaited<ReturnType<SyncPair["startReplacement"]>>;
  cluster = "";
  timeline = 0;
  writer = "";
  reader = "";
  nextWriter = "";
  initialFlush = "";
  initialStandby?: { copyMs: number; received: Awaited<ReturnType<SyncPair["candidate"]>>; attach: unknown };
  readonly walSamples: { label: string; at: number; lsn: string }[] = [];
  constructor(
    readonly s: Stack,
    readonly base?: { path: string; checkpoint?: Checkpoint; ownerUid?: number; ownerGid?: number },
    readonly powerFence?: PowerFence,
    readonly sunday?: SundayPair,
    readonly combined = false,
  ) {
    assert(!combined || (["DX-CHK1", "DX-THIN1"].includes(s.holder) && s.a === s.b && !sunday));
    this.latch = s.e.prefix + "-fence";
    this.primaryData = s.e.prefix + "-pgdata";
  }
  get storage() {
    return this.sunday ? "datomic" : "moving";
  }
  get postgresArgs() {
    return this.sunday
      ? [
          ...pgArgs,
          ...Object.entries(sundayProfile.pg.settings).flatMap(([k, v]) => ["-c", k + "=" + v]),
          "-c",
          "wal_keep_size=32GB",
          "-c",
          "listen_addresses=*",
          // [DX-HASYNC2] Why: the staged seed was never vacuumed, so the first start of every copy ran a vacuum pass that wrote
          // about 29 MB/s of WAL with no saves (November 23). A database in service has had that pass once; a 30-minute case
          // at 235 saves/s does not reach the insert threshold that would start another. Rejected: measuring failover while
          // the standby absorbs a one-off maintenance stream that the next start of the same copy would repeat.
          "-c",
          "autovacuum=off",
        ]
      : pgArgs;
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
  // [DX-HASYNC2] Why: a standby on the other server streams over the direct replication address when the run has one.
  // Rejected: carrying base-backup and catch-up WAL through the SSH overlay, which bounds a rebuild at about 49 MiB/s.
  replicationEndpoint(role: SqlRole, from: Site) {
    const m = this.s.members.get(role)!;
    if (this.sunday && m.site !== from && m.site.replicationAddress)
      return { host: m.site.replicationAddress, port: replicationPort };
    return { host: this.s.storageHost(role, from), port: 5432 };
  }
  replicationPublish(site: Site) {
    return this.sunday && this.s.a !== this.s.b && site.replicationAddress
      ? ["-p", site.replicationAddress + ":" + replicationPort + ":5432"]
      : [];
  }
  async walSample(label: string, role: SqlRole = "pg") {
    const value = await this.sql(role, "select pg_current_wal_flush_lsn() where not pg_is_in_recovery()");
    lsn(value);
    this.walSamples.push({ label, at: performance.now(), lsn: value });
    return value;
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
        ...(this.sunday ? coldMount(this.sunday.primary) : []),
        ...(this.base
          ? [
              "--mount",
              "type=bind,source=" + this.base.path + ",target=/base" + (cp ? ",readonly" : ""),
            ]
          : []),
        ...(cp ? ["-e", "BASE_LAYOUT=" + cp.layout, "-e", "BASE_MANIFEST=" + cp.manifest] : []),
        ...(s.a === s.b ? ["-p", loopback + "::5432"] : []),
        ...this.replicationPublish(s.a),
      ],
      "/bin/sh",
      [
        "-ceu",
        guard +
          (this.sunday ? coldCopy : "") +
          (cp
            ? 'actual=$(sha256sum "/base/$BASE_LAYOUT/backup_manifest"); test "${actual%% *}" = "$BASE_MANIFEST"; pg_verifybackup "/base/$BASE_LAYOUT"; cp -a "/base/$BASE_LAYOUT/." "$PGDATA/"; '
            : "") +
          'exec docker-entrypoint.sh postgres "$@"',
        "primary",
        ...this.postgresArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    let standbyStart = 0;
    if (this.sunday) {
      // [DX-HASYNC2] Why: each server copies and checks only its own disks, so both copies run at once, and the standby is
      // attached before any Datomic process starts. Rejected: the serial order that left the standby 21 GB behind.
      standbyStart = performance.now();
      await this.startStandby();
      await Promise.all([
        this.pgReady("pg", false, coldBudgetMs),
        this.pgReady("target", true, coldBudgetMs),
      ]);
    } else await this.pgReady("pg", false, cp ? 360000 : timeouts.setup);
    if (this.sunday) {
      assert.match(s.secret, /^[a-f0-9]{36}$/);
      assert.match(s.admin, /^[a-f0-9]{36}$/);
      await this.sql(
        "pg",
        "ALTER ROLE datomic PASSWORD '" +
          s.secret +
          "'; ALTER ROLE postgres PASSWORD '" +
          s.admin +
          "'",
      );
      await this.sql(
        "pg",
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ha1stream') THEN " +
          "ALTER ROLE ha1stream LOGIN REPLICATION PASSWORD '" +
          s.secret +
          "'; ELSE " +
          "CREATE ROLE ha1stream LOGIN REPLICATION PASSWORD '" +
          s.secret +
          "'; END IF; END $$",
      );
      await this.walSample("primary-ready");
      await this.recordWalSource("primary-ready");
      assert.match(
        (this.cluster = await this.sql("pg", "select system_identifier from pg_control_system()")),
        /^\d+$/,
      );
      this.timeline = parseInt(
        await this.sql("pg", "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8)"),
        16,
      );
      await this.checkCold("pg", this.sunday.primary);
      await this.checkCold("target", this.sunday.standby);
      const received = await wait("initial WAL receiver", timeouts.setup, () =>
        this.candidate().catch(() => undefined),
      );
      assert.equal(received.cluster, this.cluster);
      assert.equal(received.timeline, this.timeline);
      const attach = await this.attachSync("pg", "target", standbyName);
      this.initialStandby = { copyMs: performance.now() - standbyStart, received, attach };
      await this.walSample("standby-synchronous");
    } else if (!cp) {
      await s.database("pg", "moving");
      await replicationRole(s);
    }
    await this.tx("active", s.a);
    await this.waitBroker("active", timeouts.setup);
    if (this.sunday) await this.walSample("transactor-serving");
    this.writer = await this.gateway("write", s.a, "pg", options.grouped);
    const ac = new Account(
      s.e.prefix + "-sync",
      this.writer,
      this.writer,
      cp?.key,
      options.writeTimeout,
      cp?.scope ?? this.sunday?.scope,
    );
    this.account = ac;
    if (cp) {
      assert.deepEqual(await ac.w.basis(ac.db), cp.basis);
      assert(cp.basis.t.t === "long");
      ac.cursor = String(BigInt(cp.basis.t.v) + 1n);
      ac.schema = cp.basis.schemaHash;
      assert.equal(
        hash(JSON.stringify({ receipts: cp.receipts, history: cp.history ?? null })),
        cp.seal,
      );
    } else if (!this.sunday) await ac.open(options.lean ? "lean" : "legacy", options.lean ?? false);
    const setup = cp ?? (await options.init?.(ac));
    assert.match(
      (this.cluster = await this.sql("pg", "select system_identifier from pg_control_system()")),
      /^\d+$/,
    );
    const tli = await this.sql("pg", "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8)");
    assert.match(tli, /^[0-9A-F]{8}$/);
    this.timeline = parseInt(tli, 16);
    if (cp) assert.equal(this.cluster, cp.cluster);
    if (this.sunday) {
      assert.equal(this.cluster, this.sunday.primary.cluster);
    }
    return { ac, setup };
  }
  async clone(replicationHost?: string, replicationPort = 5432) {
    if (this.sunday) {
      assert(this.initialStandby && replicationHost === undefined, "Sunday standby attaches in open()");
      return this.initialStandby;
    }
    return this.cloneLive(replicationHost, replicationPort);
  }
  async startStandby() {
    assert(this.sunday);
    const s = this.s;
    const up = this.replicationEndpoint("pg", s.b);
    const conn =
      "host=" +
      up.host +
      " port=" +
      up.port +
      " user=ha1stream password=" +
      s.secret +
      " application_name=" +
      standbyName +
      " connect_timeout=2";
    await s.start(
      "target",
      s.b,
      [...coldMount(this.sunday.standby, "FIRST 1 (sync_a)", conn), ...this.replicationPublish(s.b)],
      "/bin/sh",
      ["-ceu", coldCopy + 'exec docker-entrypoint.sh postgres "$@"', "standby", ...this.postgresArgs],
      5432,
    );
  }
  // [DX-HASYNC2] Why: reach synchronous acknowledgement only after a measured catch-up to zero lag, and record it.
  // Rejected: switching to synchronous mode while the standby is still behind and timing out on a fixed budget.
  async attachSync(primary: SqlRole, standby: SqlRole, app: string, capMs = coldBudgetMs) {
    const start = performance.now();
    // The catch-up rate is measured only once the standby streams, so connection set-up cannot read as zero progress.
    await wait("WAL receiver streaming for " + app, timeouts.setup, async () =>
      (await this.sql(standby, "select status from pg_stat_wal_receiver").catch(() => "")) === "streaming"
        ? true
        : undefined,
    );
    const caught: CatchUp = await catchUp(
      "standby " + app + " catching up before synchronous mode",
      () => this.sql(primary, "select pg_current_wal_flush_lsn()"),
      () => this.sql(standby, "select pg_last_wal_replay_lsn()"),
      { capMs },
    );
    this.mark("standby-caught-up", { app, ...caught });
    const setting = "FIRST 1 (" + app + ")";
    await this.sql(primary, "ALTER SYSTEM SET synchronous_standby_names='" + setting + "'");
    assert.equal(await this.sql(primary, "SELECT pg_reload_conf()"), "t");
    const synced = await wait("synchronous mode for " + app, timeouts.setup, async () => {
      const row = await this.sql(
        primary,
        "select current_setting('fsync'),current_setting('synchronous_commit'),current_setting('synchronous_standby_names')," +
          "state,sync_state from pg_stat_replication where application_name='" +
          app +
          "'",
      );
      return row === "on|on|" + setting + "|streaming|sync" ? row : undefined;
    });
    const zero = await this.zeroLag(primary, standby, app);
    const result = { caught, synced, zero, ms: performance.now() - start };
    this.mark("standby-synchronous", { app, ...zero });
    return result;
  }
  // Primary flush position first, then the standby's flush and replay through the primary's own view.
  async zeroLag(primary: SqlRole, standby: SqlRole, app: string, budget = 10000) {
    const start = performance.now();
    const required = await this.sql(primary, "select pg_current_wal_flush_lsn()");
    const row = await wait("zero replication lag for " + app, budget, async () => {
      const [flush, replay, sync] = (
        await this.sql(
          primary,
          "select flush_lsn, replay_lsn, sync_state from pg_stat_replication where application_name='" + app + "'",
        )
      ).split("|");
      return flush && replay && sync === "sync" && lsn(flush) >= lsn(required) && lsn(replay) >= lsn(required)
        ? { flush, replay }
        : undefined;
    });
    const standbyReplay = await this.sql(standby, "select pg_last_wal_replay_lsn()");
    assert(lsn(standbyReplay) >= lsn(required), "Standby replay is behind the primary flush");
    return { required, ...row, standbyReplay, waitedMs: performance.now() - start };
  }
  async recordWalSource(label: string) {
    // [DX-HASYNC2] Why: keep the evidence for the vacuum cause with every case: seed vacuum state, freeze age and WAL counters.
    // Rejected: failing a case because a diagnostic query failed.
    try {
      await this.#walSource(label);
    } catch (error) {
      this.s.e.log("wal-source", { label, error: this.s.redact?.(String(error)) ?? "query failed" });
    }
  }
  async #walSource(label: string) {
    const tables = await this.sql(
      "pg",
      "select coalesce(string_agg(t.relname||':'||n_live_tup||':'||n_dead_tup||':'||n_ins_since_vacuum||':'||" +
        "coalesce(last_vacuum::text,'-')||':'||coalesce(last_autovacuum::text,'-')||':'||age(c.relfrozenxid)||':'||c.relpages, ';' order by c.relpages desc),'') " +
        "from pg_stat_user_tables t join pg_class c on c.oid=t.relid",
      this.storage,
    );
    const database = await this.sql(
      "pg",
      "select age(datfrozenxid)||'|'||current_setting('autovacuum')||'|'||current_setting('autovacuum_freeze_max_age')||'|'||" +
        "(select count(*) from pg_stat_activity where backend_type='autovacuum worker')||'|'||" +
        "(select wal_records||':'||wal_fpi||':'||wal_bytes from pg_stat_wal) from pg_database where datname='" +
        this.storage +
        "'",
    );
    this.s.e.log("wal-source", { label, tables, database, samples: this.walSamples });
  }
  async cloneLive(replicationHost?: string, replicationPort = 5432) {
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
      this.sunday
        ? coldMount(this.sunday.standby, "FIRST 1 (sync_a)", conn)
        : ["-e", "REPLICATION=" + conn],
      "/bin/sh",
      [
        "-ceu",
        (this.sunday
          ? coldCopy
          : drop +
            'chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; ' +
            '"$drop" postgres pg_basebackup --checkpoint=fast -D "$PGDATA" -X stream -R -d "$REPLICATION"; ' +
            'printf "%s\\n" "synchronous_standby_names = \'FIRST 1 (sync_a)\'" >> "$PGDATA/postgresql.auto.conf"; ') +
          'exec docker-entrypoint.sh postgres "$@"',
        "standby",
        ...this.postgresArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    await this.pgReady(
      "target",
      true,
      this.sunday ? 720000 : this.base?.checkpoint ? 360000 : timeouts.setup,
    );
    if (this.sunday) await this.checkCold("target", this.sunday.standby);
    const received = await wait("initial WAL receiver", timeouts.setup, () =>
      this.candidate().catch(() => undefined),
    );
    assert.equal(received.cluster, this.cluster);
    assert.equal(received.timeline, this.timeline);
    return { copyMs: performance.now() - start, received };
  }
  async checkCold(role: SqlRole, seed: ColdSeed) {
    const m = this.s.members.get(role)!;
    const view = await this.s.view(role);
    assert(
      view.Mounts.some(
        (x: { Source: string; Destination: string; RW: boolean }) =>
          x.Source === seed.directory && x.Destination === "/cold" && !x.RW,
      ),
    );
    const logs = await m.site.docker(["logs", "--tail", this.sunday ? "1400" : "35", m.id]);
    assert(logs.split("\n").includes("verified-cold-copy " + seed.sha256));
    const phases = coldPhases(logs);
    this.mark("cold-copy", { role, id: m.id, sha256: seed.sha256, cluster: seed.cluster, ...phases });
    return phases;
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
    this.route = await ingress(this.writer, Boolean(this.sunday) || this.combined);
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
        "current_setting('synchronous_standby_names')='FIRST 1 (sync_b)', exists " +
        "(select 1 from pg_stat_replication where application_name='sync_b' and state='streaming' and sync_state='sync')," +
        "coalesce((select flush_lsn::text from pg_stat_replication where application_name='sync_b'), '0/0')," +
        "coalesce((select max(extract(epoch from (clock_timestamp()-query_start))*1000)::bigint from pg_stat_activity " +
        "where wait_event='SyncRep' and datname='" +
        this.storage +
        "'),0) where not pg_is_in_recovery()",
    ).catch(() => undefined);
    if (!row) return undefined;
    const [configured, sync, flush, waiting] = row.split("|");
    assert(flush && /^\d+$/.test(waiting ?? ""));
    return {
      configured: configured === "t",
      sync: sync === "t",
      flush,
      waitingMs: Number(waiting),
    };
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
        "/" +
        this.storage +
        "?targetServerType=primary&connectTimeout=" +
        timeouts.jdbcConnectSeconds +
        "&hostRecheckSeconds=1",
      "sql-driver-class=org.postgresql.Driver",
      "sql-user=" + this.storage,
      "sql-password=" + s.secret,
      "heartbeat-interval-msec=" + timeouts.heartbeat,
      "memory-index-threshold=" + (this.sunday ? sundayProfile.index.threshold : "32m"),
      "memory-index-max=" + (this.sunday ? sundayProfile.index.max : "96m"),
      "object-cache-max=" + (this.sunday ? sundayProfile.tx.cacheMiB + "m" : "64m"),
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
          'printf "%s\\n" "$HA_PROPERTIES" > /tmp/hasync.properties; exec bin/transactor ' +
          (this.sunday
            ? [...sundayProfile.tx.flags, ...startupFlags].join(" ")
            : "-Xms96m -Xmx" +
              (process.platform === "linux" ? "1400" : "288") +
              "m -XX:ActiveProcessorCount=2") +
          " /tmp/hasync.properties",
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
  async gateway(role: "write" | "read" | "write-b", site: Site, storage: SqlRole, grouped = false) {
    const s = this.s;
    const profile = sundayProfile[role === "read" ? "gw-r" : "gw-w"];
    await s.start(
      role,
      site,
      [
        "-e",
        "DATOMIC_URI_TEMPLATE=" +
          s.uri(storage, this.storage, "{db}", site) +
          "&connectTimeout=1&hostRecheckSeconds=1",
        "-e",
        "GATEWAY_SOURCE_SHA256=" + s.e.source.gateway,
        ...(this.sunday || this.combined
          ? [
              "HA1_FLEET_HTTP=1",
              ...(this.combined ? ["TX2_SUBJECT_APPEND_RETIREMENT=1", "TX2_WRITE_OPTIONS_ATTEMPT=" + s.e.nonce] : []),
              // [DX-THIN1] Why: the card added two import-timing keys to the writer settings; keep the Sunday gateway unchanged.
              // Rejected: forwarding scorecard-only import instrumentation to the failover gateway.
              ...Object.entries(selectedWriter("per-person-ordered"))
                .filter(([key]) => key.startsWith("TX2_") && key !== "TX2_LOAD1_PRIORITY" && key !== "TX2_LOAD2_TIMING")
                .map(([key, value]) => key + "=" + value),
            ].flatMap((setting) => ["-e", setting])
          : ["-e", "TX2_GROUP_COMMIT=" + Number(grouped)]),
        "-e",
        "DATOMIC_JAVA_OPTS=" +
          (this.sunday
            ? [...profile.flags, ...startupFlags].join(" ")
            : "-Xms96m -Xmx" +
              (process.platform === "linux" ? "1600" : "320") +
              "m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=64m"),
      ],
      "/opt/datomic/bin/run",
      ["-m", "triplex.gateway.ha-observer", "8080"],
      8080,
    );
    return s.ready(role);
  }
  async checkServerProfile() {
    if (!this.sunday) return;
    for (const [role, profile] of [
      ["active", sundayProfile.tx],
      ["standby", sundayProfile.tx],
      ["write", sundayProfile["gw-w"]],
      ["read", sundayProfile["gw-r"]],
    ] as const) {
      await this.checkJvm(role, profile);
    }
  }
  async checkJvm(role: Role, profile: typeof sundayProfile.tx) {
    const m = this.s.members.get(role)!;
    const view = await this.s.view(role);
    assert.equal(view.HostConfig.CpusetCpus, profile.cpus);
    assert.equal(view.HostConfig.Memory, profile.memoryMiB * 2 ** 20);
    checkProfileFlags(profile, await m.site.docker(["logs", "--tail", "1400", m.id]));
    this.mark("server-jvm", {
      role,
      id: m.id,
      profile: "server",
      cpus: profile.cpus,
      memoryMiB: profile.memoryMiB,
      flags: profile.flags,
    });
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
    await this.sql("target", "CHECKPOINT", "postgres", this.sunday ? 120000 : 5000);
    // [DX-HASYNC1] Why: only a new container that first rewinds the fenced disk and verifies recovery may serve A again. Rejected: clearing the old startup interlock.
    await this.docker("pg", "rm");
    s.members.delete("pg");
    const up = this.replicationEndpoint("target", s.a);
    const source =
      "host=" +
      up.host +
      " port=" +
      up.port +
      " user=postgres password=" +
      s.admin +
      " application_name=sync_a connect_timeout=2 target_session_attrs=read-write";
    const stream =
      "host=" +
      up.host +
      " port=" +
      up.port +
      " user=ha1stream password=" +
      s.secret +
      " application_name=sync_a connect_timeout=2";
    await s.start(
      "pg",
      s.a,
      [
        "-e",
        "REJOIN_SOURCE=" + source,
        "-e",
        "REJOIN_STREAM=" + stream,
        ...this.dataMount(),
        ...this.replicationPublish(s.a),
      ],
      "/bin/sh",
      [
        "-ceu",
        drop +
          '"$drop" postgres pg_rewind --target-pgdata="$PGDATA" --source-server="$REJOIN_SOURCE" --write-recovery-conf; ' +
          'printf "primary_conninfo = \'%s\'\\n" "$REJOIN_STREAM" >> "$PGDATA/postgresql.auto.conf"; ' +
          'test -f "$PGDATA/standby.signal"; exec docker-entrypoint.sh postgres "$@"',
        "rejoin",
        ...this.postgresArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    await this.pgReady(
      "pg",
      true,
      Math.max(0, (this.sunday ? 240000 : timeouts.rejoin) - (performance.now() - start)),
    );
    assert.equal(
      await this.sql("pg", "select system_identifier from pg_control_system()"),
      this.cluster,
    );
    const m = s.members.get("pg")!;
    const output = await m.site.docker(["logs", "--tail", "35", m.id], {
      timeout: timeouts.control,
    });
    assert.match(output, /pg_rewind:.*(?:Done!|no rewind required)/);
    this.mark("rejoined", {
      old: old.Id,
      new: m.id,
      ms: performance.now() - start,
      stdout: s.redact(output),
    });
  }
  async activate(policy: Durability, kind: "fault" | "planned") {
    if (policy === "two-copy" && kind === "planned") await this.rejoin();
    if (policy === "two-copy" && kind === "fault") {
      // [DX-HASYNC1] Why: preserve protected acknowledgements across recovery by keeping ingress sealed through replacement. Rejected: opening on the promoted copy while its replica catches up.
      await this.beforeReplacement?.();
      this.replacement = await this.startReplacement();
    }
    if (policy === "single-copy-after-fence") {
      await this.sql("target", "ALTER SYSTEM SET synchronous_standby_names=''");
      assert.equal(await this.sql("target", "select pg_reload_conf()"), "t");
      this.mark("durability-alarm", {
        cluster: this.cluster,
        durableCopies: 1,
        needsStandby: true,
      });
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
    this.mark("broker-ready", { ms: performance.now() - brokerStart });
    const peer = new DatomicClient(this.reader, timeouts.control);
    try {
      const synced = await wait(
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
      this.mark("peer-ready", { basis: synced.basis, ms: performance.now() - brokerStart });
    } finally {
      peer.close();
    }
    if (this.sunday) {
      this.nextWriter ||= await this.gateway("write-b", this.s.b, "target");
      await this.checkJvm("write-b", sundayProfile["gw-w"]);
    }
  }
  async probeOldDiskBoot() {
    const s = this.s;
    const old = await s.view("pg");
    assert(!old.State.Running);
    assert(old.Mounts.some((m: { Name: string }) => m.Name === this.primaryData));
    await s.remove("pg");
    const probe =
      'id=$(LC_ALL=C pg_controldata "$PGDATA" | awk -F ": *" \'$1=="Database system identifier" {print $2}\'); ' +
      'test "$id" = "$EXPECTED_CLUSTER"; printf "old disk %s detected\\n" "$id"; ';
    await s.start(
      "pg",
      s.a,
      [...this.volume(), ...this.dataMount(), "-e", "EXPECTED_CLUSTER=" + this.cluster],
      "/bin/sh",
      ["-ceu", probe + guard + "exec docker-entrypoint.sh postgres"],
    );
    const after = await wait("returning old disk refused", timeouts.promote, async () => {
      const v = await s.view("pg", timeouts.control);
      return v.State.Running ? undefined : v;
    });
    assert(after.Id !== old.Id && after.State.ExitCode === 74);
    assert(after.Mounts.some((m: { Name: string }) => m.Name === this.primaryData));
    assert(after.Mounts.some((m: { Name: string; RW: boolean }) => m.Name === this.latch && !m.RW));
    const m = s.members.get("pg")!;
    const logs = await m.site.docker(["logs", "--tail", "35", m.id]);
    assert(
      logs.includes("old disk " + this.cluster + " detected") && logs.includes("DX-HASYNC1-fenced"),
    );
    const result = {
      old: old.Id,
      rebooted: after.Id,
      disk: this.primaryData,
      cluster: this.cluster,
      exit: after.State.ExitCode,
      latch: this.latch,
    };
    s.e.write("old-disk-boot", { nonce: s.e.nonce, slot: s.e.slot, source: s.e.source, ...result });
    return result;
  }
  async startReplacement() {
    const s = this.s;
    const old = await s.view("pg");
    assert(!old.State.Running && (await this.sql("target", "select pg_is_in_recovery()")) === "f");
    assert(old.Mounts.some((m: { Name: string }) => m.Name === this.primaryData));
    await s.remove("pg");
    const from = this.replicationEndpoint("target", s.a);
    const conn =
      "host=" +
      from.host +
      " port=" +
      from.port +
      " user=ha1stream password=" +
      s.secret +
      " application_name=sync_a connect_timeout=2 target_session_attrs=read-write";
    const start = performance.now();
    this.mark("replacement-start", { endpoint: from.port === replicationPort ? "direct" : "overlay" });
    await s.start(
      "pg",
      s.a,
      this.sunday
        ? [...coldMount(this.sunday.primary, "", conn), ...this.replicationPublish(s.a)]
        : ["-e", "REPLACEMENT=" + conn],
      "/bin/sh",
      [
        "-ceu",
        (this.sunday
          ? coldCopy
          : drop +
            'chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; ' +
            '"$drop" postgres pg_basebackup -D "$PGDATA" -d "$REPLACEMENT" --checkpoint=fast -X stream -R --manifest-checksums=SHA256; ' +
            'pg_verifybackup "$PGDATA"; ') +
          'du -sk "$PGDATA" | sed "s/^/backup-kib /"; test -f "$PGDATA/standby.signal"; ' +
          'exec docker-entrypoint.sh postgres "$@"',
        "replacement",
        ...this.postgresArgs,
      ],
      s.a === s.b ? undefined : 5432,
    );
    await this.pgReady(
      "pg",
      true,
      this.sunday ? coldBudgetMs : this.base?.checkpoint ? 360000 : timeouts.setup,
    );
    const copiedMs = performance.now() - start;
    this.mark("replacement-ready", { copiedMs });
    assert.equal(
      await this.sql("pg", "select system_identifier from pg_control_system()"),
      this.cluster,
    );
    const expected = await this.sql("target", "select pg_current_wal_flush_lsn()");
    let transfer: unknown;
    if (this.sunday) {
      // [DX-HASYNC2] Why: record the WAL bytes and time of the rebuild's catch-up separately from the local copy.
      const replayStart = await this.sql("pg", "select pg_last_wal_replay_lsn()").catch(() => "");
      transfer = {
        replayStart,
        ...(await this.attachSync("target", "pg", "sync_a")),
        endpoint: from.port === replicationPort ? "direct" : "overlay",
      };
      this.mark("replacement-synchronous", transfer);
    } else {
      await wait("replacement catches the survivor release prefix", timeouts.replay, async () => {
        const v = await this.sql("pg", "select pg_last_wal_replay_lsn()").catch(() => "");
        return v && lsn(v) >= lsn(expected) ? v : undefined;
      });
      await this.sql("target", "ALTER SYSTEM SET synchronous_standby_names='FIRST 1 (sync_a)'");
      assert.equal(await this.sql("target", "select pg_reload_conf()"), "t");
      await wait("replacement required for commits", timeouts.replay, async () => {
        const row = await this.sql(
          "target",
          "select current_setting('fsync'),current_setting('synchronous_commit')," +
            "current_setting('synchronous_standby_names'),state,sync_state from pg_stat_replication where application_name='sync_a'",
        );
        return row === "on|on|FIRST 1 (sync_a)|streaming|sync" ? row : undefined;
      });
    }
    const mbr = s.members.get("pg")!;
    assert(mbr.id !== old.Id && !mbr.volumes.includes(this.primaryData));
    const log = await mbr.site.docker(["logs", "--tail", this.sunday ? "1400" : "35", mbr.id]);
    const m = /^backup-kib (\d+)\s/m.exec(log);
    assert(m);
    const phases = this.sunday ? await this.checkCold("pg", this.sunday.primary) : undefined;
    if (!this.sunday) assert(log.includes("backup successfully verified"));
    return {
      old: old.Id,
      new: mbr.id,
      copiedMs,
      bytes: Number(m[1]) * 1024,
      expected,
      start,
      ...(phases ? { phases, transfer } : {}),
    };
  }
  async inspectFirstDisk() {
    assert(this.sunday);
    const s = this.s;
    assert(!(await s.view("active")).State.Running && !(await s.view("standby")).State.Running);
    assert(!(await s.view("target")).State.Running && !(await s.view("pg")).State.Running);
    assert.equal(
      await s.exec("tool", "cat", "/ha-fence/closed"),
      `fenced:${s.e.nonce}:${this.cluster}`,
    );
    // [DX-HASYNC1] Why: read the first disk after the last writer is stopped, with PostgreSQL in forced recovery. Rejected: destroying the second disk or restarting the fenced primary as a writer.
    await s.remove("write");
    await s.remove("pg");
    await s.start(
      "pg",
      s.a,
      [...this.dataMount()],
      "/bin/sh",
      [
        "-ceu",
        'printf "\\nprimary_conninfo = \'\'\\nrestore_command = \'\'\\n" >> "$PGDATA/postgresql.auto.conf"; touch "$PGDATA/standby.signal"; exec docker-entrypoint.sh postgres "$@"',
        "first-disk-readback",
        ...this.postgresArgs,
      ],
      5432,
    );
    await this.pgReady("pg", true, 240000);
    assert.equal(
      await this.sql("pg", "select system_identifier from pg_control_system()"),
      this.cluster,
    );
    assert.equal(await this.sql("pg", "select count(*) from pg_stat_wal_receiver"), "0");
    const url = await this.gateway("write", s.a, "pg");
    return {
      url,
      id: s.members.get("pg")!.id,
      cluster: this.cluster,
      replay: await this.sql("pg", "select pg_last_wal_replay_lsn()"),
    };
  }
  async verifyReplacement(copy: Awaited<ReturnType<SyncPair["startReplacement"]>>,
    combinedReceipt?: Awaited<ReturnType<Account["send"]>>) {
    // [DX-CHK1] Why: use the already pinned, ordered receipt on the strict rolling fixture.
    // Rejected: adding a legacy recovery-probe write with its own authored clock.
    assert(!combinedReceipt || this.combined);
    const s = this.s;
    const ac = this.account!;
    assert.equal(s.members.get("pg")!.id, copy.new);
    const receipt = combinedReceipt ?? await ac.send(ac.intent("first-reprotected", 3));
    if (!combinedReceipt) await ac.pinned(receipt);
    const cut = await this.sql("target", "select pg_current_wal_flush_lsn()");
    const flush = await wait(
      "the protected save is durable on the fresh standby",
      timeouts.replay,
      async () => {
        const v = await this.sql(
          "target",
          "select flush_lsn from pg_stat_replication where application_name='sync_a' and sync_state='sync'",
        );
        return v && lsn(v) >= lsn(cut) ? v : undefined;
      },
    );
    const result = {
      old: copy.old,
      new: copy.new,
      cluster: this.cluster,
      copiedMs: copy.copiedMs,
      protectedMs: performance.now() - copy.start,
      bytes: copy.bytes,
      expected: copy.expected,
      flush,
      receipt,
    };
    s.e.write("standby-recreated", {
      nonce: s.e.nonce,
      slot: s.e.slot,
      source: s.e.source,
      ...result,
    });
    this.mark("durability-restored", { durableCopies: 2, flush, receipt });
    return result;
  }
  mark(stage: string, data: unknown) {
    this.transitions.push({ stage, at: performance.now() });
    this.s.e.log(stage, data);
  }
  async replaySince(floor: string) {
    const native = await this.s.exec("standby", "sh", "-ceu", "cat log/*.log");
    const entries = [
      ...native.matchAll(
        /:event :log\/catchup, :bytes (\d+), :tail-t (\d+), :index-t (\d+), :msec (\d+)/g,
      ),
    ]
      .map(([, bytes, tail, index, ms]) => ({
        bytes: Number(bytes),
        tail: tail!,
        index: index!,
        ms: Number(ms),
      }))
      .filter((entry) => BigInt(entry.tail) >= BigInt(floor));
    this.s.e.write("native-replay", {
      nonce: this.s.e.nonce,
      database: this.account!.db,
      floor,
      entries,
    });
    return entries;
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
      fence: async (planned) => {
        if (!planned && this.powerFence) {
          const { timeline: _timeline, ...owner } = port.identity;
          return { proof: await this.powerFence(owner) };
        }
        return this.fence(planned);
      },
      promote: () => this.promote(),
      activate: (policy, kind) => this.activate(policy, kind),
      publish: () => route.publish(this.sunday ? this.nextWriter : this.reader),
      observe: (stage, data) => this.mark(stage, data),
    };
    return new Supervisor(port, this.initialFlush);
  }
  async auditCheckpoint(stage: "before" | "after") {
    if (!this.base?.checkpoint) return;
    const cp = this.base.checkpoint;
    const { auditSeed } = await import("./seed.ts");
    const receipts = await auditSeed(this.account!, cp.receipts);
    const edits = cp.history
      ? await (await import("./v2/history.ts")).auditHistory(this.account!, cp.history)
      : 0;
    this.s.e.log("seed-identity", { stage, seal: cp.seal, manifest: cp.manifest, receipts, edits });
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
