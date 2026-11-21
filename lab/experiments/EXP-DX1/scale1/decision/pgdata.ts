import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { dedicatedHost } from "../source.ts";

const bench = "/var/tmp/triplex-scale1";
const scratch = "/mnt/triplex-scale1-pgdata";
const assignment = path.join(bench, "platform");
const archive = path.join(bench, "decision/attempts/arm-d7-wfix-pool-seed");
const bootstrap = "97852735506d9f04d7a2195ee11bc0535b7a2493";
const GiB = 2 ** 30;
const digest = /^[a-f0-9]{64}$/;
const read = <T = any>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file: string, contents: unknown) =>
  fs.writeFileSync(file, JSON.stringify(contents) + "\n", { flag: "wx", mode: 0o400, flush: true });
async function fileHash(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
const call = (program: string, args: string[], timeout = 30000) =>
  execFileSync(program, args, { timeout, encoding: "utf8" }).trim();
const docker = (...args: string[]) => call("docker", args);
const remaining = (dir: string) => {
  const s = fs.statfsSync(dir);
  return s.bavail * s.bsize;
};

function assignedPath(dir: string) {
  assert(
    /^\/(?:var\/tmp\/triplex-scale1\/pgdata|mnt\/triplex-scale1-pgdata)\/[a-z][a-z0-9-]{1,48}$/.test(
      dir,
    ),
  );
  const parent = path.dirname(dir);
  if (parent === scratch) assert.notEqual(fs.statSync("/mnt").dev, fs.statSync(bench).dev);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  assert.equal(fs.realpathSync(parent), parent);
  return dir;
}

type Inventory = { files: number; bytes: number; controlSha: string; treeSha: string };
export async function stoppedInventory(dir: string): Promise<Inventory> {
  assert.equal(fs.realpathSync(dir), dir);
  assert.equal(fs.readFileSync(path.join(dir, "PG_VERSION"), "utf8").trim(), "17");
  assert(!fs.existsSync(path.join(dir, "postmaster.pid")));
  const control = path.join(dir, "global/pg_control");
  assert.equal(fs.statSync(control).size, 8192);
  const root = fs.statSync(dir);
  const tree = createHash("sha256");
  let files = 0;
  let bytes = 0;
  // [DX-SCALE1] Why: identify the exact files and their privileges in the stopped cluster.
  // Rejected: comparing only PG_VERSION, apparent size or the control file.
  async function visit(parent: string) {
    for (const name of fs.readdirSync(parent).sort()) {
      const current = path.join(parent, name);
      const s = fs.lstatSync(current);
      assert.equal(s.dev, root.dev);
      assert(s.isDirectory() || (s.isFile() && s.nlink === 1));
      tree.update(
        JSON.stringify([
          path.relative(dir, current),
          s.mode,
          s.uid,
          s.gid,
          s.isFile() ? await fileHash(current) : null,
        ]) + "\n",
      );
      if (s.isDirectory()) await visit(current);
      else {
        files++;
        bytes += s.size;
      }
    }
  }
  await visit(dir);
  return { files, bytes, controlSha: await fileHash(control), treeSha: tree.digest("hex") };
}

const sql = (container: string, database: string, command: string) =>
  docker(
    "exec",
    container,
    "psql",
    "-qXAt",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    "postgres",
    "-d",
    database,
    "-c",
    command,
  );

// [DX-SCALE1] Why: the scorecard opens a sealed cluster with the benchmark fixture roles.
// Rejected: assuming container startup can change login on an existing PostgreSQL directory.
export function normalizeScorecardRoles(container: string) {
  sql(
    container,
    "postgres",
    "ALTER ROLE datomic PASSWORD 'datomic'; ALTER ROLE postgres PASSWORD 'datomic'",
  );
}

async function prepare(dir: string, imageSha: string, transferSha: string) {
  assert(digest.test(imageSha) && digest.test(transferSha));
  assert.equal(await fileHash(path.join(archive, "image.json")), imageSha);
  assert.equal(await fileHash(path.join(archive, "transfer.json")), transferSha);
  const image = read(path.join(archive, "image.json"));
  const transfer = read(path.join(archive, "transfer.json"));
  assert.deepEqual(
    [
      transfer.tag,
      transfer.result,
      transfer.source,
      transfer.nonce,
      transfer.summaryFiles["image.json"],
    ],
    [path.basename(archive), "success", image.source, image.nonce, imageSha],
  );
  assert(
    image.facts === 162456470 && image.scopes.length === 1 && image.scopes[0].seedCut === 87002,
  );
  assert.equal(image.scopes[0].accounts.length, 10);
  assert(digest.test(image.sha256));
  const dump = path.join(archive, "seed.pgdump");
  assert.equal(fs.statSync(dump).size, image.bytes);
  assert(remaining(path.dirname(dir)) > Math.max(image.bytes, image.disk.after) + 24 * GiB);
  const imageList = read<{ Id: string; RepoTags?: string[] }[]>(
    path.join(bench, "build-" + bootstrap, "results/images.json"),
  );
  const postgres = imageList.find((x) => x.RepoTags?.includes("postgres:17-alpine"))?.Id;
  assert(postgres && /^sha256:[a-f0-9]{64}$/.test(postgres));
  assert.equal(docker("image", "inspect", "--format", "{{.Id}}", postgres), postgres);
  const started = Date.now(),
    nonce = randomUUID(),
    slot = "scale1-pgdata-" + nonce.slice(0, 8);
  fs.mkdirSync(dir, { mode: 0o700 });
  const data = path.join(dir, "cluster");
  fs.mkdirSync(data, { mode: 0o700 });
  const state = (stage: string) =>
    fs.writeFileSync(
      path.join(dir, "STATUS.json"),
      JSON.stringify({ stage, started, nonce, slot, at: Date.now() }) + "\n",
    );
  let container: string | undefined;
  let pg: ReturnType<typeof spawn> | undefined;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    if (pg?.exitCode === null) pg.kill("SIGTERM");
  };
  const timer = setTimeout(interrupt, 95 * 60_000);
  process.on("SIGTERM", interrupt);
  process.on("SIGINT", interrupt);
  try {
    // [DX-SCALE1] Why: stage one exact template with the fixture role expected by both native runners.
    // Rejected: exposing a PostgreSQL port or capturing an aging instance after it advances.
    container = docker(
      "run",
      "-d",
      "--pull",
      "never",
      "--name",
      slot,
      "--network",
      "none",
      "--cpuset-cpus",
      "1,8",
      "--memory",
      "8g",
      "--memory-swap",
      "8g",
      "--env",
      "POSTGRES_PASSWORD=datomic",
      "--mount",
      "type=bind,source=" + data + ",target=/var/lib/postgresql/data",
      postgres,
      "postgres",
      "-c",
      "shared_buffers=2GB",
      "-c",
      "fsync=on",
      "-c",
      "synchronous_commit=on",
      "-c",
      "full_page_writes=on",
    );
    assert(/^[a-f0-9]{64}$/.test(container));
    const until = started + 120000;
    const loopback = Object.values(os.networkInterfaces())
      .flat()
      .find((address) => address?.internal && address.family === "IPv4")?.address;
    assert(loopback);
    for (;;) {
      try {
        docker("exec", container, "pg_isready", "-h", loopback, "-U", "postgres");
        break;
      } catch {
        assert(!interrupted && Date.now() < until);
        await sleep(1000);
      }
    }
    sql(container, "postgres", "CREATE ROLE datomic LOGIN PASSWORD 'datomic'");
    sql(container, "postgres", "CREATE DATABASE datomic OWNER datomic");
    const restoreStarted = Date.now();
    state("streaming the original exact PostgreSQL image");
    const h = createHash("sha256");
    const hashPipe = new Transform({
      transform(chunk, _encoding, done) {
        h.update(chunk);
        done(null, chunk);
      },
    });
    const log = fs.openSync(path.join(dir, "restore.log"), "wx", 0o600);
    try {
      pg = spawn(
        "docker",
        [
          "exec",
          "-i",
          container,
          "pg_restore",
          "--exit-on-error",
          "--single-transaction",
          "-U",
          "postgres",
          "-d",
          "datomic",
        ],
        { stdio: ["pipe", log, log] },
      );
      const active = pg;
      const ended = new Promise<number | null>((resolve, reject) => {
        active.once("error", reject);
        active.once("exit", resolve);
      });
      const [code] = await Promise.all([
        ended,
        pipeline(fs.createReadStream(dump), hashPipe, active.stdin!),
      ]);
      assert(!interrupted);
      assert.equal(code, 0);
      assert.equal(h.digest("hex"), image.sha256);
    } finally {
      fs.closeSync(log);
    }
    const restoreMs = Date.now() - restoreStarted;
    assert.equal(
      sql(
        container,
        "datomic",
        "select current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')",
      ),
      "on|on|on",
    );
    assert.equal(
      sql(
        container,
        "datomic",
        "select bool_and(has_table_privilege('datomic','public.datomic_kvs',p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) as t(p)",
      ),
      "t",
    );
    docker("stop", "--time", "30", container);
    assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", container), "0");
    docker("rm", container);
    container = undefined;
    const control = docker(
      "run",
      "--rm",
      "--pull",
      "never",
      "--network",
      "none",
      "--mount",
      "type=bind,source=" + data + ",target=/check,readonly",
      "--entrypoint",
      "pg_controldata",
      postgres,
      "/check",
    );
    assert.match(control, /^Database cluster state:\s+shut down$/m);
    state("hashing the stopped PostgreSQL template");
    const inventory = await stoppedInventory(data);
    assert(!interrupted);
    assert(inventory.files > 0 && inventory.bytes >= image.disk.after * 0.9);
    write(path.join(dir, "sealed-pgdata.json"), {
      source: call("git", ["rev-parse", "HEAD"]),
      seed: {
        source: image.source,
        nonce: image.nonce,
        cut: 87002,
        imageSha,
        transferSha,
        dumpSha: image.sha256,
      },
      postgres,
      data,
      nonce,
      slot,
      started,
      restoreMs,
      sealed: Date.now(),
      inventory,
    });
    state("sealed the stopped fresh PostgreSQL template");
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
    if (container) {
      docker("stop", "--time", "25", container);
      docker("rm", container);
    }
  }
}

async function adoptRestoredAge(dir: string, imageSha: string, transferSha: string) {
  const age = path.join(bench, "age-v01-1b-b");
  assert(digest.test(imageSha) && digest.test(transferSha));
  assert.equal(await fileHash(path.join(archive, "image.json")), imageSha);
  assert.equal(await fileHash(path.join(archive, "transfer.json")), transferSha);
  const image = read(path.join(archive, "image.json"));
  const transfer = read(path.join(archive, "transfer.json"));
  assert.deepEqual(
    [transfer.result, transfer.source, transfer.nonce, transfer.summaryFiles["image.json"]],
    ["success", image.source, image.nonce, imageSha],
  );
  const ident = read(path.join(age, "identity.json"));
  const state = read(path.join(age, "STATUS.json"));
  const cleanup = read(path.join(age, "cleanup.json"));
  assert.deepEqual(
    [ident.source, ident.imageSha, ident.transferSha, ident.cut],
    ["2859d6b1578b431043aa8064371693c9da595338", imageSha, transferSha, 87002],
  );
  for (const observation of [state, cleanup]) {
    assert.deepEqual([observation.nonce, observation.slot], [ident.nonce, ident.slot]);
    assert(observation.at >= ident.invocationStarted);
  }
  assert.equal(state.stage, "starting native age transactor");
  assert.equal(ident.slot, "scale1-age-v01-1b-b-pg");
  assert.deepEqual(cleanup.containers, []);
  assert(!fs.existsSync(path.join(age, "rung")));
  assert(!fs.existsSync(path.join(age, "restore.json")));
  const failure = fs.readFileSync(path.join(age, "tx.log"), "utf8");
  assert.match(failure, /^taskset: failed to execute .*\/bin\/transactor: Permission denied\s*$/);
  const volume = "scale1-age-v01-1b-b-data";
  assert(cleanup.retained.includes(volume));
  assert.equal(docker("ps", "-aq", "--filter", "volume=" + volume), "");
  const from = docker("volume", "inspect", "--format", "{{.Mountpoint}}", volume);
  assert(from.endsWith("/volumes/" + volume + "/_data"));
  assert.match(ident.pgImage, /^sha256:[a-f0-9]{64}$/);
  assert.equal(docker("image", "inspect", "--format", "{{.Id}}", ident.pgImage), ident.pgImage);
  const started = Date.now(),
    nonce = randomUUID(),
    slot = "scale1-pgdata-" + nonce.slice(0, 8);
  const original = await stoppedInventory(from);
  assert(original.bytes >= image.disk.after * 0.9);
  assert(remaining(path.dirname(dir)) >= original.bytes + 24 * GiB);
  fs.mkdirSync(dir, { mode: 0o700 });
  const data = path.join(dir, "cluster");
  const status = (stage: string) =>
    fs.writeFileSync(
      path.join(dir, "STATUS.json"),
      JSON.stringify({ stage, started, nonce, slot, at: Date.now() }) + "\n",
    );
  status("copying the exact stopped restore before any Datomic traffic");
  call("cp", ["--archive", "--reflink=auto", "--", from, data], 900000);
  assert.deepEqual(await stoppedInventory(data), original);
  // [DX-SCALE1] Why: match both downstream launchers' fixture login on a private clone.
  // Rejected: changing the held restoration or reading its generated password into evidence.
  const id = docker(
    "run",
    "-d",
    "--pull",
    "never",
    "--name",
    slot,
    "--network",
    "none",
    "--cpuset-cpus",
    "1,8",
    "--memory",
    "8g",
    "--memory-swap",
    "8g",
    "--mount",
    "type=bind,source=" + data + ",target=/var/lib/postgresql/data",
    ident.pgImage,
    "postgres",
    "-c",
    "synchronous_commit=on",
    "-c",
    "fsync=on",
    "-c",
    "full_page_writes=on",
  );
  assert(/^[a-f0-9]{64}$/.test(id));
  try {
    const until = Date.now() + 120000;
    for (;;) {
      try {
        docker("exec", id, "pg_isready", "-U", "postgres", "-d", "datomic");
        break;
      } catch {
        assert(Date.now() < until);
        await sleep(1000);
      }
    }
    normalizeScorecardRoles(id);
    assert.equal(
      sql(
        id,
        "datomic",
        "SELECT current_setting('fsync'), current_setting('synchronous_commit'), current_setting('full_page_writes')",
      ),
      "on|on|on",
    );
  } finally {
    docker("stop", "--time", "25", id);
    assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", id), "0");
    docker("rm", id);
  }
  status("hashing the stopped fixture-compatible template");
  const inventory = await stoppedInventory(data);
  assert.deepEqual(await stoppedInventory(from), original);
  write(path.join(dir, "sealed-pgdata.json"), {
    source: call("git", ["rev-parse", "HEAD"]),
    seed: {
      source: image.source,
      nonce: image.nonce,
      cut: 87002,
      imageSha,
      transferSha,
      dumpSha: image.sha256,
    },
    restoredAge: { nonce: ident.nonce, slot: ident.slot, stagedAt: state.at, original },
    postgres: ident.pgImage,
    data,
    nonce,
    slot,
    started,
    sealed: Date.now(),
    inventory,
  });
  status("sealed the stopped fresh PostgreSQL template");
}

async function clone(sealPath: string, destinations: string[]) {
  assert(
    destinations.length >= 1 &&
      destinations.length <= 3 &&
      new Set(destinations).size === destinations.length,
  );
  assert.equal(path.basename(sealPath), "sealed-pgdata.json");
  const seal = read<{ data: string; nonce: string; inventory: Inventory }>(sealPath);
  assert.equal(path.join(path.dirname(sealPath), "cluster"), seal.data);
  const manifestSha = await fileHash(sealPath);
  assert.deepEqual(await stoppedInventory(seal.data), seal.inventory);
  const dedicated = new Map<number, { dir: string; count: number }>();
  for (const dir of destinations) {
    assert(!fs.existsSync(dir));
    const parent = path.dirname(dir);
    const dev = fs.statSync(parent).dev;
    const plan = dedicated.get(dev) ?? { dir: parent, count: 0 };
    plan.count++;
    dedicated.set(dev, plan);
  }
  for (const { dir, count } of dedicated.values())
    assert(
      remaining(dir) >= count * seal.inventory.bytes + 16 * GiB,
      "Disposable copies do not fit",
    );
  for (const dir of destinations) {
    assert(remaining(path.dirname(dir)) >= seal.inventory.bytes + 16 * GiB);
    fs.mkdirSync(dir, { mode: 0o700 });
    const dest = path.join(dir, "cluster");
    const started = Date.now();
    call("cp", ["--archive", "--reflink=auto", "--", seal.data, dest], 900000);
    const observed = await stoppedInventory(dest);
    assert.deepEqual(observed, seal.inventory);
    write(path.join(dir, "copy.json"), {
      manifestSha,
      origin: seal.nonce,
      attempt: randomUUID(),
      started,
      at: Date.now(),
      dest,
      observed,
    });
  }
  assert.deepEqual(await stoppedInventory(seal.data), seal.inventory);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  assert(process.platform === "linux" && process.getuid?.() === 0);
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
  const policies = "/sys/devices/system/cpu/cpufreq";
  dedicatedHost(
    read(path.join(assignment, "dedicated.json")),
    await fileHash("/etc/machine-id"),
    await fileHash(path.join(assignment, "delivered.txt")),
    fs
      .readdirSync(policies)
      .filter((x) => /^policy\d+$/.test(x))
      .map((x) => fs.readFileSync(path.join(policies, x, "scaling_governor"), "utf8").trim()),
    fs.readFileSync("/sys/devices/system/cpu/smt/active", "utf8").trim(),
  );
  assert.equal(docker("ps", "-q"), "");
  const [verb, ...args] = process.argv.slice(2);
  if (verb === "prepare" || verb === "adopt-restored-age") {
    assert.equal(args.length, 3);
    const run = verb === "prepare" ? prepare : adoptRestoredAge;
    await run(assignedPath(args[0]!), args[1]!, args[2]!);
  } else {
    assert.equal(verb, "clone");
    const [seal, ...copies] = args;
    assert(seal);
    assert.equal(path.join(assignedPath(path.dirname(seal)), "sealed-pgdata.json"), seal);
    await clone(seal, copies.map(assignedPath));
  }
}
