import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { clock, Evidence, hash, loopback, roles, until, type Role } from "./common.ts";

export interface Site {
  key: string;
  repo: string;
  datomicId: string;
  privateAddress?: string;
  docker: (args: string[], opts?: { timeout?: number }) => Promise<string>;
}
type Member = { site: Site; id: string; image: string; role: Role; volumes: string[] };
const pgRoles = new Set<Role>(["pg", "target"]);
export class Stack {
  readonly members = new Map<Role, Member>();
  readonly networks = new Map<Site, string>();
  readonly pgIds = new Map<Site, string>();
  readonly secret = randomBytes(18).toString("hex");
  readonly admin = randomBytes(18).toString("hex");
  readonly e: Evidence;
  readonly a: Site;
  readonly b: Site;
  constructor(e: Evidence, a: Site, b: Site) {
    this.e = e;
    this.a = a;
    this.b = b;
  }
  name(r: Role) {
    return this.e.prefix + "-" + r;
  }
  async open() {
    for (const site of new Set([this.a, this.b])) {
      const id = await site.docker([
        "network",
        "create",
        "--label",
        "ha1.attempt=" + this.e.nonce,
        this.e.prefix,
      ]);
      this.networks.set(site, id);
      const pg = await site.docker([
        "image",
        "inspect",
        "postgres:17-alpine",
        "--format",
        "{{.Id}}",
      ]);
      assert.match(pg, /^sha256:[a-f0-9]{64}$/);
      this.pgIds.set(site, pg);
      assert.equal(
        await site.docker(["image", "inspect", site.datomicId, "--format", "{{.Id}}"]),
        site.datomicId,
      );
    }
  }
  async start(
    role: Role,
    site: Site,
    args: string[],
    entry: string,
    argv: string[],
    port?: number,
  ) {
    assert(!this.members.has(role));
    const image = pgRoles.has(role) ? this.pgIds.get(site)! : site.datomicId;
    const cross = this.a !== this.b;
    let published: string[] = [];
    if (!cross && port === 8080 && this.e.mode.startsWith("load-")) {
      // [DX-LOAD1] Why: the VM assigns a free port at container start. Rejected: probing the Mac's socket table for a port used by the VM.
      published = ["-p", loopback + "::" + port];
    } else if (port && (cross || port === 8080)) {
      let hostPort = port;
      if (port === 8080) {
        if (cross) hostPort = role === "read" ? 28481 : 28480;
        else {
          const probe = net.createServer();
          await new Promise<void>((ok, fail) => {
            probe.once("error", fail);
            probe.listen(0, loopback, ok);
          });
          const bound = probe.address();
          assert(bound && typeof bound === "object");
          hostPort = bound.port;
          await new Promise<void>((ok) => probe.close(() => ok()));
        }
      }
      // [DX-HA1] Why: an explicit port survives a gateway container restart. Rejected: ephemeral Docker publication that silently moves the client endpoint.
      published = ["-p", (site.privateAddress ?? loopback) + ":" + hostPort + ":" + port];
    }
    const mb = roles[role] * (cross ? 4 : 1);
    const mounts = pgRoles.has(role)
      ? []
      : [
          "-v",
          site.repo + "/packages/datomic/gateway/src:/opt/gateway/src:ro",
          "-v",
          site.repo + "/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro",
        ];
    const id = await site.docker([
      "create",
      "--pull",
      "never",
      "--name",
      this.name(role),
      "--label",
      "ha1.attempt=" + this.e.nonce,
      "--label",
      "tx2.holder=DX-HA1",
      "--label",
      "tx2.managed-by=lab/bin/engine.mjs",
      "--memory",
      mb + "m",
      "--memory-swap",
      mb + "m",
      "--cpus",
      cross ? "3" : "1.5",
      "--network",
      this.networks.get(site)!,
      ...published,
      ...mounts,
      ...args,
      "--entrypoint",
      entry,
      image,
      ...argv,
    ]);
    const m: Member = { site, id, image, role, volumes: [] };
    this.members.set(role, m);
    const view = await this.view(role);
    assert.equal(view.Image, image);
    assert.equal(view.HostConfig.Memory, mb * 2 ** 20);
    m.volumes = view.Mounts.filter((v: any) => v.Type === "volume").map((v: any) => v.Name);
    this.e.log("role", { role, site: site.key, id, image, volumes: m.volumes, capMiB: mb });
    await site.docker(["start", id]);
    if (!pgRoles.has(role)) {
      for (const dest of ["/opt/gateway/src", "/opt/gateway/codec-spec.json"]) {
        const mount = view.Mounts.find((m: any) => m.Destination === dest);
        assert(mount && mount.Type === "bind" && mount.RW === false);
      }
      const raw = await this.exec(
        role,
        "sh",
        "-ceu",
        "cd /opt/gateway/src; find . -type f -exec sha256sum {} +",
      );
      const entries = raw
        .split("\n")
        .map((line) => {
          const m = /^([0-9a-f]{64})  \.\/(.+)$/.exec(line);
          assert(m);
          return [m[2]!, m[1]!];
        })
        .sort((a, b) => (a[0]! < b[0]! ? -1 : 1));
      const gateway = hash(JSON.stringify(entries)),
        codec = (await this.exec(role, "sha256sum", "/opt/gateway/codec-spec.json")).split(" ")[0];
      assert.equal(gateway, this.e.source.gateway);
      assert.equal(codec, this.e.source.codec);
      this.e.log("mounted-inputs", { id, role, gateway, codec });
    }
  }
  async view(role: Role) {
    const m = this.members.get(role)!;
    const v = JSON.parse(await m.site.docker(["inspect", "--type", "container", m.id]))[0];
    assert.equal(v.Id, m.id);
    assert.equal(v.Config.Labels["ha1.attempt"], this.e.nonce);
    return v;
  }
  async exec(role: Role, ...args: string[]) {
    const m = this.members.get(role)!;
    return m.site.docker(["exec", m.id, ...args], { timeout: 1800000 });
  }
  async kill(role: Role, beforeDispatch?: () => Promise<void>) {
    const m = this.members.get(role)!,
      v = await this.view(role);
    assert(v.State.Running);
    if (beforeDispatch) await beforeDispatch();
    const from = clock();
    await m.site.docker(["kill", "--signal", "KILL", m.id]);
    const to = clock();
    const after = await this.view(role);
    assert(!after.State.Running && after.State.ExitCode === 137);
    const event = { role, id: m.id, from, to, finishedAt: after.State.FinishedAt };
    this.e.log("kill", event);
    return event;
  }
  async restart(role: Role) {
    const m = this.members.get(role)!;
    assert(!(await this.view(role)).State.Running);
    await m.site.docker(["start", m.id]);
  }
  async remove(role: Role) {
    const m = this.members.get(role);
    if (!m) return;
    await this.view(role);
    await m.site.docker(["rm", "-fv", m.id]);
    assert.equal(await m.site.docker(["ps", "-aq", "--no-trunc", "--filter", "id=" + m.id]), "");
    for (const v of m.volumes)
      assert.equal(await m.site.docker(["volume", "ls", "-q", "--filter", "name=^" + v + "$"]), "");
    this.members.delete(role);
  }
  async cleanup() {
    for (const role of [...this.members.keys()].reverse()) await this.remove(role);
    for (const [site, id] of this.networks) {
      const net = JSON.parse(await site.docker(["network", "inspect", id]))[0];
      assert.equal(net.Labels["ha1.attempt"], this.e.nonce);
      await site.docker(["network", "rm", id]);
      assert.equal(await site.docker(["network", "ls", "-q", "--filter", "id=" + id]), "");
    }
  }
  async capture() {
    for (const [role, m] of this.members) {
      const v = await this.view(role);
      this.e.log("state", {
        role,
        id: m.id,
        status: v.State.Status,
        exit: v.State.ExitCode,
        oom: v.State.OOMKilled,
      });
      const raw = await m.site.docker(["logs", "--tail", "180", m.id]).catch(() => "(unavailable)");
      fs.writeFileSync(path.join(this.e.dir, role + "-console.txt"), this.redact(raw));
      if (!pgRoles.has(role) && role !== "tool") {
        const log = await this.exec(
          role,
          "sh",
          "-c",
          "tail -n 220 log/*.log 2>/dev/null || true",
        ).catch(() => "");
        if (log) fs.writeFileSync(path.join(this.e.dir, role + "-datomic.txt"), this.redact(log));
      }
    }
  }
  redact(s: string) {
    return s.replaceAll(this.secret, "[redacted]").replaceAll(this.admin, "[redacted]");
  }
  async tool() {
    await this.start("tool", this.a, [], "/bin/sh", ["-c", "exec sleep infinity"]);
  }
  storageHost(role: "pg" | "target", from: Site) {
    const m = this.members.get(role)!;
    return m.site === from ? this.name(role) : m.site.privateAddress!;
  }
  uri(role: "pg" | "target", storage: string, db: string, from: Site, user = storage) {
    return (
      "datomic:sql://" +
      db +
      "?jdbc:postgresql://" +
      this.storageHost(role, from) +
      ":5432/" +
      storage +
      "?user=" +
      user +
      "&password=" +
      this.secret
    );
  }
  async sql(role: "pg" | "target", query: string, db = "postgres") {
    return this.exec(
      role,
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
    );
  }
  async postgres(role: "pg" | "target", site: Site) {
    await this.start(
      role,
      site,
      ["-e", "POSTGRES_PASSWORD=" + this.admin],
      "docker-entrypoint.sh",
      ["postgres", "-c", "shared_buffers=32MB"],
      5432,
    );
    await until("PostgreSQL ready", async () => {
      try {
        if (await this.exec(role, "pg_isready", "-h", loopback, "-U", "postgres")) return true;
      } catch {}
      return undefined;
    });
    assert.equal(
      await this.sql(
        role,
        "select current_setting('server_version_num')::int / 10000, current_setting('fsync'), current_setting('synchronous_commit')",
      ),
      "17|on|on",
    );
  }
  async database(role: "pg" | "target", name: "moving" | "neighbor") {
    await this.sql(role, "CREATE ROLE " + name + " LOGIN PASSWORD '" + this.secret + "'");
    await this.sql(role, "CREATE DATABASE " + name);
    const ddl = await this.exec("tool", "cat", "/opt/datomic/bin/sql/postgres-table.sql");
    await this.sql(role, ddl, name);
    await this.sql(
      role,
      "REVOKE ALL ON TABLE datomic_kvs FROM PUBLIC; GRANT ALL ON TABLE datomic_kvs TO " + name,
      name,
    );
  }
  async tx(role: "active" | "standby", site: Site, pg: "pg" | "target", store: string) {
    const host = this.name(role);
    const opts = [
      "protocol=sql",
      "host=" + host,
      "alt-host=" + (site.privateAddress ?? host),
      "port=4334",
      "sql-url=jdbc:postgresql://" + this.storageHost(pg, site) + ":5432/" + store,
      "sql-driver-class=org.postgresql.Driver",
      "sql-user=" + store,
      "sql-password=" + this.secret,
      "memory-index-threshold=32m",
      "memory-index-max=96m",
      "object-cache-max=64m",
    ];
    // [DX-HA1] Why: the vendor launcher accepts heap bounds as arguments and advertises its own broker. Rejected: a shared advertised address that can silently reconnect to the old active.
    await this.start(
      role,
      site,
      ["-e", "HA1_PROPERTIES=" + opts.join("\n")],
      "/bin/sh",
      [
        "-c",
        'printf "%s\n" "$HA1_PROPERTIES" > /tmp/ha1.properties; exec bin/transactor -Xms96m -Xmx' +
          (site.privateAddress ? "1400" : "288") +
          "m -XX:ActiveProcessorCount=2 /tmp/ha1.properties",
      ],
      this.a !== this.b &&
        (this.e.mode === "failures" ||
          this.e.mode === "one-failover" ||
          this.e.mode.startsWith("load-"))
        ? 4334
        : undefined,
    );
  }
  async broker(role: "active" | "standby") {
    return (
      (await this.exec(
        role,
        "bash",
        "-c",
        "if (exec 3<>/dev/tcp/$1/4334) 2>/dev/null; then echo active; else echo closed; fi",
        "probe",
        this.name(role),
      )) === "active"
    );
  }
  sharedScope(role: "write" | "read") {
    return JSON.stringify(["triplex-scope-v1", "ha1", this.e.prefix + "-" + role, "shared", 0]);
  }
  sharedDb(role: "write" | "read") {
    return "s2-" + Buffer.from(this.sharedScope(role)).toString("base64url");
  }
  async gateway(role: "write" | "read", site: Site, pg: "pg" | "target", store: string) {
    const size = site.privateAddress ? "1600" : "320";
    await this.start(
      role,
      site,
      [
        "-e",
        ...(this.e.mode.startsWith("load-")
          ? [
              "TRIPLEX_TRACE_LEVEL=" + (this.e.mode === "load-profile" ? "full" : "off"),
              "-e",
              "TX2_GROUP_COMMIT=" + Number(this.e.mode === "load-live"),
              "-e",
              "TX2_LOAD1_PRIORITY=" + Number(this.e.mode === "load-live"),
              "-e",
              "TX2_GROUP_QUEUE_CLOCK=" + Number(this.a === this.b && this.e.mode === "load-live"),
              "-e",
              "TRIPLEX_TRACE_JFR=0",
              "-e",
              "TX2_LOAD1_PROFILE=" + Number(this.e.mode === "load-profile"),
              "-e",
              "TRIPLEX_TRACE_RUN=" + this.e.nonce,
              "-e",
              "TRIPLEX_TRACE_SOURCE=" + this.e.source.git,
              "-e",
              "TRIPLEX_TRACE_SLOT=" + this.e.slot,
              "-e",
            ]
          : []),
        ...(this.e.mode === "one-account"
          ? [
              "HA1_SHARED_SCOPE=" + this.sharedScope(role),
              "-e",
              "HA1_ADMIN_TOKEN=" + this.admin,
              "-e",
            ]
          : []),
        "DATOMIC_URI_TEMPLATE=" + this.uri(pg, store, "{db}", site),
        "-e",
        "GATEWAY_SOURCE_SHA256=" + this.e.source.gateway,
        "-e",
        "DATOMIC_JAVA_OPTS=-Xms96m -Xmx" +
          size +
          "m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=64m",
      ],
      "/opt/datomic/bin/run",
      [
        "-m",
        this.e.mode === "one-account"
          ? "triplex.gateway.ha-shared"
          : this.e.mode.startsWith("one-")
            ? "triplex.gateway.ha-observer"
            : "triplex.gateway.main",
      ],
      8080,
    );
    return this.endpoint(role);
  }
  async endpoint(role: "write" | "read") {
    const m = this.members.get(role)!,
      port = (await this.view(role)).NetworkSettings.Ports["8080/tcp"][0].HostPort;
    return "http://" + (m.site.privateAddress ?? loopback) + ":" + port;
  }
  async ready(role: "write" | "read") {
    const url = await this.endpoint(role);
    await until("gateway " + role, async () => {
      const r = await fetch(url + "/health", { signal: AbortSignal.timeout(2500) }).catch(
        () => undefined,
      );
      if (!r?.ok) {
        assert((await this.view(role)).State.Running, "Gateway stopped during startup");
        return undefined;
      }
      const v = (await r.json()) as { gatewaySourceHash: string; datomicVersion: string };
      assert.equal(v.gatewaySourceHash, this.e.source.gateway);
      assert.equal(v.datomicVersion, "1.0.7745");
      return true;
    });
    return url;
  }
}
