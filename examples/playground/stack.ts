import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { inflateRawSync } from "node:zlib";

export const repo = resolve(import.meta.dirname, "../..");
export const loopback = "127.0.0.1";
export const caps = { pg: 256, tx: 1024, write: 640, read: 640 } as const;
const config = join(repo, "lab/config/datomic");
const version = "1.0.7745";
const packageName = "datomic-pro-" + version;
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

export type Docker = (args: string[]) => Promise<string>;
export function dockerClient(host?: string, context?: string): Docker {
  const args = context ? ["--context", context] : host ? ["--host", host] : [];
  return async (command) => {
    try {
      return (
        await exec("docker", [...args, ...command], {
          timeout: 10 * 60_000,
          maxBuffer: 4 * 1024 ** 2,
          encoding: "utf8",
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
      `https://datomic-pro-downloads.s3.amazonaws.com/${version}/${packageName}.zip`,
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
    await docker(["build", "--label", `${ownership}=${prefix}`, "-t", prefix, build]);
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
}

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

  async start(gatewaySpans = true) {
    const { docker, prefix, directory, ports, signal, cachedImage } = this.#opts;
    const pg = prefix + "-pg";
    const tx = prefix + "-tx";
    const network = prefix + "-net";
    const volume = prefix + "-data";
    const extract = prefix + "-extract";
    const gateway = join(repo, "packages/datomic/gateway");
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
      caps[role] + "m",
      "--memory-swap",
      caps[role] + "m",
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
    const localConfig = join(directory, "sql.properties");
    const sqlUrl = `jdbc:postgresql://${pg}:5432/datomic`;
    await writeFile(
      localConfig,
      [
        "protocol=sql",
        `host=${tx}`,
        `alt-host=${tx}`,
        `sql-url=${sqlUrl}`,
        "sql-user=datomic",
        `sql-password=${secret}`,
        "memory-index-threshold=8m",
        "memory-index-max=32m",
        "object-cache-max=64m",
        "encrypt-channel=true",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    await docker(["rm", "-v", extract]);
    const mount = (a: string, b: string, ro = false) => [
      "--mount",
      `type=bind,source=${a},target=${b}${ro ? ",readonly" : ""}`,
    ];
    const sources = [
      ...mount(join(gateway, "src"), "/opt/gateway/src", true),
      ...mount(
        join(repo, "packages/datomic/src/codec-spec.json"),
        "/opt/gateway/codec-spec.json",
        true,
      ),
      "-e",
      "DATOMIC_EXT_CLASSPATH=/opt/gateway/src",
    ];
    await docker([
      "create",
      ...runnable("tx", tx),
      ...sources,
      "-e",
      "JAVA_OPTS=-Xms128m -Xmx640m -XX:+ExitOnOutOfMemoryError",
      "--entrypoint",
      "/opt/datomic/bin/transactor",
      image,
      "/tmp/sql.properties",
    ]);
    await docker(["cp", localConfig, `${tx}:/tmp/sql.properties`]);
    await rm(localConfig);
    await docker(["start", tx]);
    await waitFor(
      async () => {
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
        "DATOMIC_JAVA_OPTS=-Xms64m -Xmx352m -Ddatomic.objectCacheMax=32m -XX:+ExitOnOutOfMemoryError",
        "-e",
        `DATOMIC_URI_TEMPLATE=datomic:sql://{db}?${sqlUrl}?user=datomic&password=${secret}`,
        "-e",
        `GATEWAY_SOURCE_SHA256=${source}`,
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
      if (
        hash(JSON.stringify(actualFiles)) !== source ||
        mountedCodec.split(/\s/)[0] !==
          hash(await readFile(join(repo, "packages/datomic/src/codec-spec.json")))
      )
        throw new Error("Running gateway sources do not match the playground checkout");
      const address = await docker(["port", name, "8080/tcp"]);
      if (!/^127\.0\.0\.1:\d+$/.test(address))
        throw new Error("Gateway port did not bind to loopback");
      urls[role] = "http://" + address;
      await waitFor(
        async () => {
          const res = await fetch(urls[role] + "/health", { signal: AbortSignal.timeout(1500) });
          if (!res.ok) return;
          const body = (await res.json()) as { datomicVersion: string; gatewaySourceHash: string };
          if (body.datomicVersion === version && body.gatewaySourceHash === source) return true;
          throw new Error("Live gateway identity differs from the playground source");
        },
        `Datomic ${role} gateway did not become ready`,
        signal,
      );
    }
    return { ...urls, source };
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

  async stop() {
    const { docker } = this.#opts;
    const live = await this.inventory();
    if (live.ps.length) await docker(["rm", "-fv", ...live.ps]);
    if (live.volume.length) await docker(["volume", "rm", ...live.volume]);
    if (live.network.length) await docker(["network", "rm", ...live.network]);
    if (live.image.length) await docker(["image", "rm", ...live.image]);
    const remaining = await this.inventory();
    if (Object.values(remaining).some((items) => items.length))
      throw new Error(
        "Playground cleanup left owned Docker resources: " + JSON.stringify(remaining),
      );
    return remaining;
  }
}
