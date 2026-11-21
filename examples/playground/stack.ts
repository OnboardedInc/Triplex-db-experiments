import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { inflateRawSync } from "node:zlib";
import type { Restore } from "./snapshot.ts";
import { checkProfileFlags, laptopCaps, launchProfile, roles, startupFlags } from "../../lab/experiments/EXP-DX1/jvm1/launch.mjs";
import { datomicRuntime } from "../../lab/config/datomic/runtime.mjs";

export const repo = resolve(import.meta.dirname, "../..");
export const loopback = "127.0.0.1";
export const caps = laptopCaps;
export function memoryScale(value: string): 1 | 2 | 4 {
  if (value === "1" || value === "2" || value === "4") return Number(value) as 1 | 2 | 4;
  throw new Error("Choose a memory scale of 1, 2 or 4");
}
const config = join(repo, "lab/config/datomic");
export const datomicVersion = "1.0.7745";
const packageName = "datomic-pro-" + datomicVersion;
const ownership = "triplex.playground";
const exec = promisify(execFile);
const sqlFiles = ["postgres-db.sql", "postgres-table.sql", "postgres-user.sql"];
export const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

export function port(value: string): number {
  const n = Number(value);
  if (
    !/^\d+$/.test(value) ||
    n > 65535 ||
    (n !== 0 && n < 1024) ||
    [5432, 6379, 4222, 4566, 16686, 15442, 17019].includes(n)
  )
    throw new Error("Choose port 0 or an unreserved port between 1024 and 65535");
  return n;
}

export type Docker = (
  args: string[],
  settings?: { buildxDirectory?: string; timeoutMs?: number; signal?: AbortSignal },
) => Promise<string>;
const archiveCommand = (signal?: AbortSignal) => ({
  timeoutMs: 24 * 60 * 60_000,
  ...(signal ? { signal } : {}),
});
export function dockerClient(host?: string, context?: string): Docker {
  const args = context ? ["--context", context] : host ? ["--host", host] : [];
  return async (command, settings) => {
    try {
      return (
        await exec("docker", [...args, ...command], {
          timeout: settings?.timeoutMs ?? 10 * 60_000,
          maxBuffer: 4 * 1024 ** 2,
          encoding: "utf8",
          ...(settings?.signal ? { signal: settings.signal } : {}),
          ...(settings?.buildxDirectory
            ? { env: { ...process.env, BUILDX_CONFIG: settings.buildxDirectory } }
            : {}),
        })
      ).stdout.trim();
    } catch (error) {
      const failure = error as { stderr?: string; code?: string };
      throw new Error(
        `Docker ${command.slice(0, 2).join(" ")} failed: ${failure.stderr?.trim() || failure.code}`,
      );
    }
  };
}

// [DX-PLAY1] Why: verify the same pinned vendor archive as the lab before extracting.
// Rejected: requiring a host unzip tool or letting an archive choose its destination.
async function unpackVendor(zip: Buffer, target: string) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("Datomic distribution index is missing");
  let cursor = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid distribution index");
    const size = zip.readUInt32LE(cursor + 20);
    const length = zip.readUInt16LE(cursor + 28);
    const name = zip.subarray(cursor + 46, cursor + 46 + length).toString("utf8");
    const method = zip.readUInt16LE(cursor + 10);
    const local = zip.readUInt32LE(cursor + 42);
    cursor += 46 + length + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
    if (name.endsWith("/")) continue;
    const parts = name.split("/");
    if (
      parts.shift() !== packageName ||
      parts.some((p) => !p || p === "." || p === ".." || p.includes("\\"))
    )
      throw new Error("Unexpected Datomic distribution path");
    const at = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(at, at + size);
    if (method !== 0 && method !== 8) throw new Error("Unknown ZIP compression");
    const file = join(target, ...parts);
    await mkdir(resolve(file, ".."), { recursive: true });
    await writeFile(file, method === 8 ? inflateRawSync(data) : data, {
      mode: parts[0] === "bin" && parts.length === 2 ? 0o755 : 0o644,
    });
  }
}

async function buildImage(docker: Docker, dir: string, prefix: string) {
  const build = join(dir, "build");
  try {
    const expected = (await readFile(join(config, "SHA256SUMS"), "utf8")).split(/\s/)[0];
    const response = await fetch(
      `https://datomic-pro-downloads.s3.amazonaws.com/${datomicVersion}/${packageName}.zip`,
      {
        signal: AbortSignal.timeout(180_000),
      },
    );
    if (!response.ok)
      throw new Error(`Datomic distribution download returned HTTP ${response.status}`);
    const zip = Buffer.from(await response.arrayBuffer());
    if (hash(zip) !== expected) throw new Error("Datomic distribution checksum mismatch");
    await unpackVendor(zip, join(build, "datomic"));
    await cp(config, join(build, "config"), { recursive: true });
    await cp(join(repo, "packages/datomic/gateway"), join(build, "gateway"), { recursive: true });
    await cp(
      join(repo, "packages/datomic/src/codec-spec.json"),
      join(build, "gateway/codec-spec.json"),
    );
    await cp(join(config, "Dockerfile"), join(build, "Dockerfile"));
    // [DX-PLAY1] Why: the builder's CLI activity metadata belongs to this owned run.
    // Rejected: allowing a linked checkout to update the user's global Docker buildx state.
    const buildxDirectory = join(dir, "buildx");
    await mkdir(buildxDirectory);
    await docker(["build", "--label", `${ownership}=${prefix}`, "-t", prefix, build], {
      buildxDirectory,
    });
    return prefix;
  } finally {
    await rm(build, { recursive: true, force: true });
  }
}

type Ports = { write: number; read: number };
export interface StackOptions {
  docker: Docker;
  prefix: string;
  directory: string;
  ports: Ports;
  signal?: AbortSignal;
  cachedImage?: string;
  memoryScale?: 1 | 2 | 4;
  reducedServerStartup?: boolean;
  writerProbe?: { ordered: boolean; attempt: string };
}

class ContainerExited extends Error {}

async function waitFor<T>(
  poll: () => Promise<T | undefined>,
  message: string,
  signal?: AbortSignal,
) {
  const until = Date.now() + 150_000;
  let recent = "";
  do {
    signal?.throwIfAborted();
    try {
      const ready = await poll();
      if (ready !== undefined) return ready;
    } catch (error) {
      if (error instanceof ContainerExited) throw error;
      recent = error instanceof Error ? error.message : String(error);
    }
    await delay(750, undefined, { signal });
  } while (Date.now() < until);
  throw new Error(`${message}${recent ? ": " + recent : ""}`);
}

export class Stack {
  readonly label: string;
  readonly traceDir: string;
  readonly #opts: StackOptions;
  constructor(opts: StackOptions) {
    if (!/^tx2-dxplay1-[a-f0-9]{12}$/.test(opts.prefix))
      throw new Error("Invalid playground owner");
    this.#opts = opts;
    this.label = `${ownership}=${opts.prefix}`;
    this.traceDir = join(opts.directory, "traces");
  }

  async start(gatewaySpans = true, restore?: Restore) {
    const { docker, prefix, directory, ports, signal, cachedImage } = this.#opts;
    // [DX-INT1] Why: the admitted playground gate exercises a lean save on the same peers as the legacy demo.
    // Rejected: changing the snapshot layout or using a separate unobserved test stack.
    const probe = this.#opts.writerProbe;
    const scale = this.#opts.memoryScale ?? 1;
    const launch = this.launchProfile();
    const pg = prefix + "-pg";
    const tx = prefix + "-tx";
    const network = prefix + "-net";
    const volume = prefix + "-data";
    const extract = prefix + "-extract";
    const gateway = join(repo, "packages/datomic/gateway");
    const codecFile = join(repo, "packages/datomic/src/codec-spec.json");
    const codec = hash(await readFile(codecFile));
    if (restore && restore.manifest.codec !== codec)
      throw new Error("The snapshot was built with a different fact codec");
    await mkdir(this.traceDir, { recursive: true });
    const sourceFiles = (
      await readdir(join(gateway, "src"), { recursive: true, withFileTypes: true })
    )
      .filter((file) => file.isFile())
      .map((file) => join(file.parentPath, file.name))
      .sort();
    const source = hash(
      JSON.stringify(
        await Promise.all(
          sourceFiles.map(async (file) => [
            file.slice(gateway.length + 5),
            hash(await readFile(file)),
          ]),
        ),
      ),
    );
    const image = cachedImage ?? (await buildImage(docker, directory, prefix));
    signal?.throwIfAborted();
    console.log(JSON.stringify({ stack: prefix, image, dockerCpuQuota: 2, ...launch }));
    await docker(["network", "create", "--label", this.label, network]);
    await docker(["volume", "create", "--label", this.label, volume]);
    const runnable = (role: keyof typeof caps, name: string) => [
      "--name",
      name,
      "--label",
      this.label,
      "--network",
      network,
      "--memory",
      caps[role] * scale + "m",
      "--memory-swap",
      caps[role] * scale + "m",
      "--cpus",
      "2",
      "--ulimit",
      "core=0",
    ];
    const secret = randomBytes(24).toString("hex");
    await docker([
      "run",
      "-d",
      "--pull",
      cachedImage ? "never" : "missing",
      ...runnable("pg", pg),
      "-e",
      `POSTGRES_PASSWORD=${secret}`,
      "-v",
      `${volume}:/var/lib/postgresql/data`,
      "postgres:17-alpine",
      "postgres",
      ...Object.entries(launch.pg.settings).flatMap(([key, value]) => ["-c", key + "=" + value]),
    ]);
    await waitFor(
      async () => {
        await docker(["exec", pg, "pg_isready", "-h", loopback, "-U", "postgres"]);
        return true;
      },
      "PostgreSQL did not become ready",
      signal,
    );

    await docker(["create", "--name", extract, "--label", this.label, image]);
    for (const file of sqlFiles) {
      const local = join(directory, file);
      await docker(["cp", `${extract}:/opt/datomic/bin/sql/${file}`, local]);
      // [DX-PLAY1] Why: preserve the vendor database, schema and grants with a fresh secret.
      // Rejected: a published Postgres port or the lab's shared password.
      if (file === "postgres-user.sql") {
        const sql = await readFile(local, "utf8");
        if (!/password\s+'datomic'/i.test(sql))
          throw new Error("Unexpected vendor SQL password statement");
        await writeFile(local, sql.replace(/(password\s+)'datomic'/i, `$1'${secret}'`));
      }
      await docker(["cp", local, `${pg}:/tmp/${file}`]);
      await docker([
        "exec",
        pg,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        file === "postgres-table.sql" ? "datomic" : "postgres",
        "-f",
        "/tmp/" + file,
      ]);
      await rm(local);
    }
    const restoreMs = restore ? await this.restore(restore) : undefined;
    const localConfig = join(directory, "sql.properties");
    const template = join(directory, "sql-template.properties");
    await docker([
      "cp",
      extract + ":/opt/datomic/config/samples/sql-transactor-template.properties",
      template,
    ]);
    const sqlUrl = `jdbc:postgresql://${pg}:5432/datomic`;
    const settings = new Map(
      Object.entries({
        protocol: "sql",
        host: tx,
        "alt-host": tx,
        "sql-url": sqlUrl,
        "sql-user": "datomic",
        "sql-password": secret,
        "memory-index-threshold": launch.index.threshold,
        "memory-index-max": launch.index.max,
        "object-cache-max": launch.tx.cacheMiB + "m",
        "encrypt-channel": "true",
      }),
    );
    // [DX-PLAY1] Why: keep the vendor's SQL driver, port and required settings as in the lab
    // launcher. Rejected: reconstructing a minimal properties file with incomplete defaults.
    const defaults = (await readFile(template, "utf8"))
      .split(/\r?\n/)
      .filter((line) => !settings.has(line.split("=")[0]!.trim()));
    await writeFile(
      localConfig,
      [...defaults, ...[...settings].map(([k, v]) => k + "=" + v), ""].join("\n"),
      { mode: 0o600 },
    );
    await rm(template);
    await docker(["rm", "-v", extract]);
    const mount = (a: string, b: string, ro = false) => [
      "--mount",
      `type=bind,source=${a},target=${b}${ro ? ",readonly" : ""}`,
    ];
    const sources = [
      ...mount(join(gateway, "src"), "/opt/gateway/src", true),
      ...mount(codecFile, "/opt/gateway/codec-spec.json", true),
      "-e",
      "DATOMIC_EXT_CLASSPATH=/opt/gateway/src",
    ];
    // [DX-PLAY1] Why: the vendor transactor reads JVM limits from its arguments, as in the lab launcher.
    // Rejected: a generic JAVA_OPTS variable that leaves the vendor heap defaults in effect.
    await docker([
      "create",
      ...runnable("tx", tx),
      ...sources,
      "--entrypoint",
      "/opt/datomic/bin/transactor",
      image,
      ...launch.tx.flags,
      ...startupFlags,
      "/tmp/sql.properties",
    ]);
    await docker(["cp", localConfig, `${tx}:/tmp/sql.properties`]);
    await rm(localConfig);
    await docker(["start", tx]);
    const checkAlive = async (name: string) => {
      const status = await docker(["inspect", "--format", "{{.State.Status}}", name]);
      if (status === "exited" || status === "dead") {
        const raw = await docker(["logs", "--tail", "40", name]).catch(() => "");
        throw new ContainerExited(
          name + " exited" + (raw ? ": " + raw.replaceAll(secret, "[redacted]") : ""),
        );
      }
    };
    await waitFor(
      async () => {
        await checkAlive(tx);
        await docker(["exec", tx, "bash", "-c", `(exec 3<>/dev/tcp/${tx}/4334) 2>/dev/null`]);
        return true;
      },
      "Datomic transactor did not become ready",
      signal,
    );

    const urls = {} as Record<keyof Ports, string>;
    for (const role of ["write", "read"] as const) {
      signal?.throwIfAborted();
      const name = prefix + "-" + role;
      await docker([
        "run",
        "-d",
        "--restart",
        "on-failure:3",
        ...runnable(role, name),
        ...sources,
        "-p",
        `${loopback}:${ports[role] || ""}:8080`,
        ...(gatewaySpans
          ? [...mount(this.traceDir, "/trace"), "-e", "TRIPLEX_TRACE_DIR=/trace"]
          : []),
        "-e",
        "DATOMIC_JAVA_OPTS=" + [...launch[role === "write" ? "gw-w" : "gw-r"].flags, ...startupFlags].join(" "),
        "-e",
        `DATOMIC_URI_TEMPLATE=datomic:sql://{db}?${sqlUrl}?user=datomic&password=${secret}`,
        "-e",
        `GATEWAY_SOURCE_SHA256=${source}`,
        ...(probe
          ? [
              "-e", "TX2_LEAN_NATIVE_LOG=1",
              "-e", "TX2_LEAN_NATIVE_QUERY=1",
              ...(role === "write" ? [
                "-e", "TX2_WRITE_OPTIONS_ATTEMPT=" + probe.attempt,
                "-e", "TX2_SAVE_LEDGER=" + Number(!probe.ordered),
                "-e", "TX2_SMALL_ROWS=" + Number(!probe.ordered),
                "-e", "TX2_GROUP_COMMIT=" + (probe.ordered ? "0" : "1"),
                "-e", "TX2_GROUP_REUSE_PREPARED=" + (probe.ordered ? "0" : "1"),
                "-e", "TX2_SUBJECT_SAVE=" + Number(probe.ordered),
                "-e", "TX2_SUBJECT_NUMERIC_OWNER=" + Number(probe.ordered),
                "-e", "TX2_SUBJECT_ORDERED_IDS=" + Number(probe.ordered),
                "-e", "TX2_SUBJECT_PREFETCH=0",
              ] : []),
            ]
          : []),
        "-e",
        "TX2_ENTITY_CACHE_BYTES=8388608",
        "-e",
        "TX2_ID_CACHE_ENTRIES=4096",
        "-e",
        "TX2_REACH_SESSION_ENTRIES=4096",
        "-e",
        "TRIPLEX_TRACE_LEVEL=" + (gatewaySpans ? "full" : "off"),
        "-e",
        "TRIPLEX_TRACE_JFR=0",
        "-e",
        `TRIPLEX_TRACE_PROCESS=${role}`,
        "-e",
        `TRIPLEX_TRACE_RUN=${prefix}`,
        "-e",
        `TRIPLEX_TRACE_SLOT=${prefix}`,
        "-e",
        `TRIPLEX_TRACE_SOURCE=${source}`,
        "--entrypoint",
        "/opt/datomic/bin/run",
        image,
        "-m",
        "triplex.gateway.main",
      ]);
      const mounted = await docker([
        "exec",
        name,
        "bash",
        "-c",
        "cd /opt/gateway/src && find . -type f -exec sha256sum {} +",
      ]);
      const actualFiles = mounted
        .split("\n")
        .map((line) => {
          const match = /^([a-f0-9]{64})  \.\/(.+)$/.exec(line);
          if (!match) throw new Error("Unexpected gateway source inventory");
          return [match[2], match[1]];
        })
        .sort(([a], [b]) => (a! < b! ? -1 : a! > b! ? 1 : 0));
      const mountedCodec = await docker([
        "exec",
        name,
        "sha256sum",
        "/opt/gateway/codec-spec.json",
      ]);
      if (hash(JSON.stringify(actualFiles)) !== source || mountedCodec.split(/\s/)[0] !== codec)
        throw new Error("Running gateway sources do not match the playground checkout");
      const address = await docker(["port", name, "8080/tcp"]);
      if (!/^127\.0\.0\.1:\d+$/.test(address))
        throw new Error("Gateway port did not bind to loopback");
      urls[role] = "http://" + address;
      await waitFor(
        async () => {
          await checkAlive(name);
          const res = await fetch(urls[role] + "/health", { signal: AbortSignal.timeout(1500) });
          if (!res.ok) return;
          const body = (await res.json()) as { datomicVersion: string; gatewaySourceHash: string };
          if (body.datomicVersion === datomicVersion && body.gatewaySourceHash === source)
            return true;
          throw new Error("Live gateway identity differs from the playground source");
        },
        `Datomic ${role} gateway did not become ready`,
        signal,
      );
    }
    return { ...urls, source, codec, ...(restoreMs === undefined ? {} : { restoreMs }) };
  }

  private async restore(snapshot: Restore) {
    const { docker, prefix, signal } = this.#opts;
    const pg = prefix + "-pg";
    const stage = "/tmp/playground-restore";
    const start = performance.now();
    await docker(["exec", pg, "mkdir", stage]);
    try {
      // [DX-PLAY1] Why: verify the bytes that reached PostgreSQL before applying any catalog entry.
      // Rejected: trusting a completed Docker copy of a previously hashed but mutable local file.
      for (const [i, path] of snapshot.inputs.entries()) {
        signal?.throwIfAborted();
        const { file, bytes, sha256 } = snapshot.manifest.objects[i]!;
        const target = stage + "/" + file;
        await docker(["cp", path, pg + ":" + target]);
        const size = await docker(["exec", pg, "stat", "-c", "%s", target]);
        const digest = await docker(["exec", pg, "sha256sum", target]);
        if (Number(size) !== bytes || digest.split(/\s/)[0] !== sha256)
          throw new Error("Staged snapshot object failed verification: " + file);
      }
      signal?.throwIfAborted();
      // Concatenating in the container lets pg_restore stream one custom-format archive.
      await docker(
        [
          "exec",
          pg,
          "sh",
          "-c",
          "set -eu; export LC_ALL=C; cat /tmp/playground-restore/postgres-*.dump-part | pg_restore --exit-on-error --single-transaction --clean --if-exists -U postgres -d datomic",
        ],
        archiveCommand(signal),
      );
      return performance.now() - start;
    } finally {
      await docker(["exec", pg, "rm", "-rf", stage]);
    }
  }

  async databaseBytes() {
    const { docker, prefix } = this.#opts;
    return Number(
      await docker([
        "exec",
        prefix + "-pg",
        "psql",
        "-XAt",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        "datomic",
        "-c",
        "SELECT pg_database_size(current_database())",
      ]),
    );
  }

  async memoryPeaks() {
    const { docker, prefix } = this.#opts;
    return Object.fromEntries(
      await Promise.all(
        Object.keys(caps).map(async (role) => {
          const bytes = await docker([
            "exec",
            prefix + "-" + role,
            "sh",
            "-c",
            "cat /sys/fs/cgroup/memory.peak 2>/dev/null || cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes 2>/dev/null || true",
          ]);
          return [role, bytes ? Number(bytes) : null];
        }),
      ),
    );
  }

  async dump(local: string) {
    const { docker, prefix, signal } = this.#opts;
    const roles = [prefix + "-write", prefix + "-read", prefix + "-tx"];
    for (const name of roles) {
      const owner = await docker([
        "inspect",
        "--format",
        '{{index .Config.Labels "triplex.playground"}}',
        name,
      ]);
      if (owner !== prefix) throw new Error("Snapshot role ownership changed");
    }
    await docker(["stop", "--time", "10", ...roles]);
    const pg = prefix + "-pg";
    const file = "/tmp/playground-export.dump";
    await docker(
      ["exec", pg, "pg_dump", "-U", "postgres", "-Fc", "-Z", "6", "-d", "datomic", "-f", file],
      archiveCommand(signal),
    );
    await docker(["cp", pg + ":" + file, local], archiveCommand(signal));
    await docker(["exec", pg, "rm", file]);
  }

  launchProfile() {
    return this.#opts.reducedServerStartup
      ? launchProfile("server", { reduced: true })
      : launchProfile("laptop", { scale: this.#opts.memoryScale ?? 1 });
  }

  // [DX-INT1] Why: verify the running JVM and its own startup log inside the admitted stack.
  // Rejected: running java -version in a new process or trusting the constructed argument list.
  async launchWitness() {
    const { docker, prefix } = this.#opts;
    const policy = this.launchProfile();
    const observed = [];
    for (const role of roles) {
      const name = prefix + "-" + ({ tx: "tx", "gw-w": "write", "gw-r": "read" })[role];
      const inspect = async (id: string) => {
        const row = JSON.parse(await docker(["inspect", id]))[0];
        if (row.Name !== "/" + name || !row.State.Running || row.Config.Labels[ownership] !== prefix)
          throw new Error("Launch witness lost its owned container");
        return { id: row.Id, image: row.Image, started: row.State.StartedAt, restarts: row.RestartCount,
          memory: row.HostConfig.Memory, cpuQuota: row.HostConfig.NanoCpus };
      };
      const engine = await inspect(name);
      const process = () => docker(["exec", engine.id, "bash", "-ceu", [
        "java_pid=",
        'for p in /proc/[0-9]*; do if [[ $(cat "$p/comm" 2>/dev/null || :) == java ]]; then',
        '  test -z "$java_pid"; java_pid=${p##*/}; fi; done',
        'test -n "$java_pid"; printf "pid=%s\\n" "$java_pid"; cut -d " " -f22 "/proc/$java_pid/stat"',
        'tr "\\000" "\\n" < "/proc/$java_pid/cmdline" | grep -E "^-Ddatomic.objectCacheMax="',
      ].join("\n")]);
      const boot = await process();
      const flags = await docker(["logs", "--since", engine.started, engine.id]);
      checkProfileFlags(policy[role], flags);
      if (!flags.includes("Version: " + datomicRuntime(policy[role].major).version) ||
          !boot.split("\n").includes("-Ddatomic.objectCacheMax=" + policy[role].cacheMiB + "m") ||
          engine.memory !== policy[role].memoryMiB * 2 ** 20 || engine.cpuQuota !== 2e9 ||
          boot !== await process() || JSON.stringify(engine) !== JSON.stringify(await inspect(engine.id)))
        throw new Error("Live JVM differs from launch policy for " + role);
      observed.push({ role, engine, boot, flags: flags.split("\n").filter((line) =>
        /^\s*\w+\s+\w+\s+=\s+\S+\s+\{/.test(line) || line.includes("[gc,init")) });
    }
    const keys = Object.keys(policy.pg.settings) as (keyof typeof policy.pg.settings)[];
    const actual = (await docker(["exec", prefix + "-pg", "psql", "-XAtq", "-U", "postgres", "-d", "datomic",
      "-c", keys.map((key) => "SHOW " + key).join("; ")])).trim().split("\n");
    if (keys.some((key, i) => actual[i] !== policy.pg.settings[key])) throw new Error("PostgreSQL launch settings differ");
    return { policy, observed, postgres: Object.fromEntries(keys.map((key, i) => [key, actual[i]])) };
  }

  async inventory() {
    const { docker } = this.#opts;
    const types = ["ps", "volume", "network", "image"] as const;
    return Object.fromEntries(
      await Promise.all(
        types.map(async (type) => {
          const args = type === "ps" ? ["ps", "-aq"] : [type, "ls", "-q"];
          const listed = await docker([...args, "--filter", "label=" + this.label]);
          return [type, [...new Set(listed.split("\n").filter(Boolean))]];
        }),
      ),
    ) as Record<(typeof types)[number], string[]>;
  }

  async stop(keepImage = false) {
    const { docker } = this.#opts;
    const live = await this.inventory();
    if (live.ps.length) await docker(["rm", "-fv", ...live.ps]);
    if (live.volume.length) await docker(["volume", "rm", ...live.volume]);
    if (live.network.length) await docker(["network", "rm", ...live.network]);
    if (!keepImage && live.image.length) await docker(["image", "rm", ...live.image]);
    const remaining = await this.inventory();
    if (
      Object.entries(remaining).some(
        ([kind, items]) => (!keepImage || kind !== "image") && items.length,
      )
    )
      throw new Error(
        "Playground cleanup left owned Docker resources: " + JSON.stringify(remaining),
      );
    return remaining;
  }
}
