import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { fileHash } from "../measurements.ts";
import { activeUnitArgs, dedicatedHost } from "../source.ts";
import {
  stageBulkContinuation,
  stageExtendedLoad,
  stageMaintainedContinuation,
  type BulkContinuation,
  type RecoveredLadder,
} from "./age-bulk-resume.ts";
import { prepareFallback } from "./age-fallback.ts";
import { normalizeScorecardRoles, stoppedInventory } from "./pgdata.ts";
import { read, verifiedOrigin, write, type SeedProof } from "./seed.ts";

const bench = "/var/tmp/triplex-scale1";
const seedDir = path.join(bench, "decision/attempts/arm-d7-wfix-pool-seed");
const bootstrap = "97852735506d9f04d7a2195ee11bc0535b7a2493";
const ageFloor = "2859d6b15";
const bulkSource = "acd350e927515b7c4d99f134f8600ea8de4d63f8";
const maintainedSources = [
  "6d3d44641efacdcd9b3d6fefa299a3b0ace6f885",
  "9573487e08f6ab82acd0c662ce552eca531a13ff",
];
const extendedSource = "d90b3728fc6e1ef823d7974fc11fe21af7ffd9fe";
const bulkPrefix = {
  records: 431778659,
  head: 187002,
  t: 34766053,
  checkpoint: "4d1ab9fa2a1adf9ba0e2dc73ef5a71fd8adf7d4780e40c52090acb6f92242a04",
  population: "d51c7a42bd10d651b5971a32bc4aa7d281ec582cc5add5181ae32492ab786b5e",
};
const sourceLayout = "lean";
const GiB = 2 ** 30;
const dockerEndpoint = "unix:///var/run/docker.sock";
const vendorCache = path.join(
  bench,
  "build-" + bootstrap,
  "downloads/extracted/datomic-pro-1.0.7745",
);
const jdk = "/usr/lib/jvm/java-21-openjdk-amd64/bin";
const role = "datomic";
const primaryDb = "datomic";
const copyDb = "verify_rung";
const baselineRecords = 430_000_000;
const targetRecords = 1_000_000_000;
const bytesPerAddedRecord = 300;
const copyHeadroomBytes = 260e9;

const call = (
  cmd: string,
  args: string[],
  extra: { input?: string; env?: NodeJS.ProcessEnv; cwd?: string; timeout?: number } = {},
) => execFileSync(cmd, args, { timeout: 30000, encoding: "utf8", ...extra }).trim();
const docker = (...args: string[]) => call("docker", args);
const sql = (name: string, db: string, input: string) =>
  call(
    "docker",
    ["exec", "-i", name, "psql", "-qXAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", db],
    { input },
  );
const free = (p: string) => {
  const s = fs.statfsSync(p);
  return s.bavail * s.bsize;
};
const exited = (x: ChildProcess) =>
  new Promise<number | null>((ok, fail) => {
    x.once("exit", ok);
    x.once("error", fail);
  });

async function main(
  out: string,
  ageCheckout: string,
  ageSource: string,
  copyMount: string,
  exportCheckout: string,
  stoppedSeed?: string,
  resumeDiscovery = false,
  bulkLadder = false,
  bulkContinuation?: BulkContinuation,
  ladderEvidence?: string,
  resumeEvidence?: string,
) {
  const bulk = bulkLadder || bulkContinuation !== undefined;
  const bulkSettings = bulkLadder || bulkContinuation === "load";
  const maintained = Boolean(ladderEvidence);
  const maintainedLoading = maintained && bulkContinuation === "load";
  const maintainedMeasurement = maintained && bulkContinuation === "measure-loaded";
  assert(!maintained || bulkContinuation);
  assert.equal(Boolean(resumeEvidence), ageSource === extendedSource && maintainedLoading);
  if (resumeEvidence) {
    assert.equal(resumeEvidence, path.join(bench, "evidence-v01/age-v01-bulk-b/full/held"));
    assert.equal(fs.realpathSync(resumeEvidence), resumeEvidence);
  }
  assert(process.platform === "linux" && process.getuid?.() === 0);
  assert.equal(process.env.DOCKER_HOST, dockerEndpoint);
  assert.equal(path.dirname(out), bench);
  assert.match(path.basename(out), bulk ? /^age-v01-bulk-[a-z]$/ : /^age-v01-1b(?:-[a-z])?$/);
  const prefix = "scale1-" + path.basename(out);
  const pgName = prefix + "-pg",
    copyName = prefix + "-copy";
  const netName = prefix + "-net",
    sourceVolume = resumeDiscovery || bulk ? "scale1-age-v01-1b-c-data" : prefix + "-data";
  const loopback = Object.values(os.networkInterfaces())
    .flat()
    .find((a) => a?.internal && a.family === "IPv4")?.address;
  assert(loopback);
  assert.equal(path.dirname(ageCheckout), bench);
  assert.match(ageSource, /^[a-f0-9]{40}$/);
  assert.equal(call("git", ["rev-parse", "HEAD"], { cwd: ageCheckout }), ageSource);
  if (bulk) {
    assert(
      maintained
        ? maintainedSources.includes(ageSource) || Boolean(resumeEvidence)
        : ageSource === bulkSource,
    );
    assert.equal(call("git", ["status", "--porcelain"], { cwd: ageCheckout }), "");
  }
  call("git", ["merge-base", "--is-ancestor", ageFloor, ageSource], { cwd: ageCheckout });
  assert.equal(path.dirname(exportCheckout), bench);
  const exporter = call("git", ["rev-parse", "HEAD"], { cwd: exportCheckout });
  call("git", ["merge-base", "--is-ancestor", "4d0c68aab", exporter], { cwd: exportCheckout });
  const platform = path.join(bench, "platform"),
    policies = "/sys/devices/system/cpu/cpufreq";
  const machine = await fileHash("/etc/machine-id");
  dedicatedHost(
    read(path.join(platform, "dedicated.json")),
    machine,
    await fileHash(path.join(platform, "delivered.txt")),
    fs
      .readdirSync(policies)
      .filter((d) => /^policy\d+$/.test(d))
      .map((d) => fs.readFileSync(path.join(policies, d, "scaling_governor"), "utf8").trim()),
    fs.readFileSync("/sys/devices/system/cpu/smt/active", "utf8").trim(),
  );
  assert.equal(call("systemctl", [...activeUnitArgs, "triplex-scale1-arm-*.service"]), "");
  assert.equal(docker("ps", "-q"), "");
  assert(
    !docker("ps", "-a", "--format", "{{.Names}}")
      .split("\n")
      .some((v) => [pgName, copyName].includes(v)),
  );
  assert.equal(
    docker("volume", "ls", "--format", "{{.Name}}").split("\n").includes(sourceVolume),
    resumeDiscovery || bulk,
  );
  assert(!docker("network", "ls", "--format", "{{.Name}}").split("\n").includes(netName));
  assert(
    fs.existsSync(path.join(jdk, "java")) && fs.existsSync(path.join(jdk, "jcmd")),
    "Native JDK 21 is required",
  );
  assert.equal(fs.readFileSync(path.join(vendorCache, "VERSION"), "utf8").trim(), "1.0.7745");
  const image = path.join(seedDir, "image.json"),
    transfer = path.join(seedDir, "transfer.json"),
    imageSha = await fileHash(image),
    transferSha = await fileHash(transfer),
    original = read<SeedProof & { disk: { after: number } }>(image);
  const invocationStarted = Date.now();
  fs.mkdirSync(out);
  const identity = {
    source: ageSource,
    nonce: path.basename(out) + "-" + invocationStarted,
    slot: pgName,
    people: 100000 as const,
    layout: "pooled" as const,
    population: original.population,
  };
  const seed = verifiedOrigin(seedDir, identity, transferSha, true);
  assert.equal(seed.facts, 162456470);
  assert.equal(seed.scopes[0]?.seedCut, 87002);
  let held;
  if (stoppedSeed) {
    assert.match(
      stoppedSeed,
      /^\/(?:var\/tmp\/triplex-scale1\/pgdata|mnt\/triplex-scale1-pgdata)\/[a-z0-9-]+\/cluster$/,
    );
    const sealPath = path.join(path.dirname(stoppedSeed), "sealed-pgdata.json");
    const manifest = read(sealPath);
    assert.equal(manifest.data, stoppedSeed);
    assert.deepEqual(
      [manifest.seed.imageSha, manifest.seed.transferSha, manifest.seed.dumpSha, manifest.seed.cut],
      [imageSha, transferSha, seed.sha256, 87002],
    );
    assert.deepEqual(await stoppedInventory(stoppedSeed), manifest.inventory);
    held = { data: stoppedSeed, sealSha: await fileHash(sealPath), inventory: manifest.inventory };
  }
  if (resumeDiscovery) {
    assert(held && /^age-v01-1b-[def]$/.test(path.basename(out)));
    const prior = path.join(bench, "age-v01-1b-c");
    const restored = read(path.join(prior, "restore.json"));
    const exited = read(path.join(prior, "exit.json"));
    const cleaned = read(path.join(prior, "cleanup.json"));
    assert.deepEqual(
      [
        restored.source,
        restored.imageSha,
        restored.transferSha,
        restored.cut,
        restored.postgresTemplate,
      ],
      [ageSource, imageSha, transferSha, 87002, held.sealSha],
    );
    assert(exited.result !== 0 && exited.nonce === restored.nonce && exited.at >= restored.at);
    assert(
      cleaned.nonce === restored.nonce &&
        cleaned.at >= exited.at &&
        cleaned.retained.includes(sourceVolume),
    );
    assert.deepEqual(cleaned.containers, []);
    const directory = path.join(prior, "rung/1000000000");
    const attempts = fs.readdirSync(directory).filter((x) => /^[a-f0-9-]{36}$/.test(x));
    assert.equal(attempts.length, 1);
    const original = path.join(directory, attempts[0]!);
    assert(!fs.existsSync(path.join(original, "rung.log")));
    assert.match(
      fs.readFileSync(path.join(original, "adopt.log"), "utf8"),
      /UnknownHostException: .*seed-tx/,
    );
    if (path.basename(out) !== "age-v01-1b-d") {
      const previous = path.join(bench, "age-v01-1b-d");
      const ended = read(path.join(previous, "cleanup.json"));
      assert.equal(ended.resumedPrivateVolume, sourceVolume);
      assert.equal(ended.postgresTemplate, held.sealSha);
      assert.deepEqual(ended.containers, []);
      assert(!fs.existsSync(path.join(previous, "rung")));
      assert(!fs.existsSync(path.join(previous, "discovery.json")));
      assert(fs.statSync(path.join(previous, "discovery.log")).size > 0);
    }
    if (path.basename(out) === "age-v01-1b-f") {
      const previous = path.join(bench, "age-v01-1b-e");
      const ended = read(path.join(previous, "cleanup.json"));
      const discovered = read(path.join(previous, "discovery.json"));
      assert.deepEqual(
        [ended.nonce, ended.resumedPrivateVolume, ended.postgresTemplate],
        [discovered.nonce, sourceVolume, held.sealSha],
      );
      assert.deepEqual(ended.containers, []);
      assert.equal(discovered.cut, 87002);
      const rung = path.join(previous, "rung/1000000000");
      const admitted = fs.readdirSync(rung).filter((x) => /^[a-f0-9-]{36}$/.test(x));
      assert.equal(admitted.length, 1);
      const raw = path.join(rung, admitted[0]!);
      assert(!fs.existsSync(path.join(raw, "rung.log")));
      assert.match(
        fs.readFileSync(path.join(raw, "adopt.log"), "utf8"),
        /password authentication failed for user "postgres"/,
      );
    }
    assert.equal(docker("ps", "-aq", "--filter", "volume=" + sourceVolume), "");
  }
  if (bulkLadder) {
    // [DX-SCALE1] Why: continue the verified checkpoint on its stopped volume and keep its old evidence immutable.
    // Rejected: re-adopting the original image or rewriting the source calibration checkpoint.
    const prior = path.join(bench, "age-v01-1b-f");
    const cleanup = read(path.join(prior, "cleanup.json"));
    const terminal = read(path.join(prior, "exit.json"));
    assert.deepEqual(cleanup.containers, []);
    assert.deepEqual(
      [cleanup.nonce, cleanup.resumedPrivateVolume, cleanup.imageSha, cleanup.transferSha],
      [terminal.nonce, sourceVolume, imageSha, transferSha],
    );
    assert(cleanup.at >= terminal.at && terminal.result !== 0);
    const base = "age1-" + createHash("sha256").update(seed.scopes[0]!.db).digest("hex") + ".edn";
    for (const [file, digest] of [
      [base, bulkPrefix.checkpoint],
      [base + ".population.edn", bulkPrefix.population],
    ] as const) {
      const input = path.join(prior, file);
      const output = path.join(out, file);
      assert.equal(await fileHash(input), digest);
      fs.copyFileSync(input, output, fs.constants.COPYFILE_EXCL);
      assert.equal(await fileHash(output), digest);
    }
    assert.equal(docker("ps", "-aq", "--filter", "volume=" + sourceVolume), "");
    const point = docker("volume", "inspect", "--format", "{{.Mountpoint}}", sourceVolume);
    assert(point.endsWith("/volumes/" + sourceVolume + "/_data"));
    assert(!fs.existsSync(path.join(point, "postmaster.pid")));
  }
  const ageLab = path.join(ageCheckout, "lab/experiments/EXP-DX1/age1");
  let recovered: RecoveredLadder | undefined;
  if (ladderEvidence) {
    assert.equal(fs.realpathSync(ladderEvidence), ladderEvidence);
    assert.equal(ladderEvidence, path.join(bench, "evidence-v01/age-v01-bulk-a/full/held"));
    recovered = JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(ageLab, "recover-ladder.mjs"), ladderEvidence, "--full"],
        { encoding: "utf8", timeout: 180000 },
      ),
    );
    assert.equal(recovered?.source, bulkSource);
  }
  const previous = path.join(
    bench,
    bulkContinuation === "load" ? "age-v01-bulk-a" : "age-v01-bulk-b",
  );
  const originalIdentity = {
    source: ageSource,
    imageSha,
    transferSha,
    volume: sourceVolume,
    db: seed.scopes[0]!.db,
    seedCut: seed.scopes[0]!.seedCut,
    machine,
  };
  const extended =
    resumeEvidence && recovered
      ? await stageExtendedLoad(
          path.join(bench, "age-v01-bulk-b"),
          out,
          originalIdentity,
          resumeEvidence,
          recovered,
        )
      : undefined;
  const adopted =
    extended ??
    (!bulkContinuation
      ? undefined
      : ladderEvidence && recovered
        ? await stageMaintainedContinuation(
            previous,
            out,
            bulkContinuation,
            originalIdentity,
            ladderEvidence,
            recovered,
          )
        : await stageBulkContinuation(previous, out, bulkContinuation, originalIdentity));
  const pgdata = bulk ? JSON.parse(docker("volume", "inspect", sourceVolume))[0] : undefined;
  const sourceDir = pgdata?.Options?.device ?? pgdata?.Mountpoint;
  if (pgdata) {
    assert.equal(pgdata.Name, sourceVolume);
    assert.equal(docker("ps", "-aq", "--filter", "volume=" + sourceVolume), "");
    assert(
      sourceDir === pgdata.Mountpoint ||
        sourceDir === "/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster",
    );
    assert(!fs.existsSync(path.join(sourceDir, "postmaster.pid")));
  }
  if (extended) {
    assert.equal(sourceDir, "/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster");
    assert.deepEqual(await stoppedInventory(sourceDir), extended.inventory);
  }
  const dataMount = sourceDir ?? bench;
  const copyReal = fs.realpathSync(copyMount);
  const sameFilesystem = fs.statSync(copyReal).dev === fs.statSync(dataMount).dev;
  if (maintainedLoading) {
    assert.equal(dataMount, "/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster");
    assert.equal(fs.statSync(copyReal).dev, fs.statSync(bench).dev);
    assert(!sameFilesystem);
  }
  const maintainedMargin = 16 * GiB;
  const directoryLimit = Number(process.env.DX_SCALE1_AGE_DIRECTORY_LIMIT ?? 400e9);
  assert(!maintained || [400e9, 450e9].includes(directoryLimit));
  assert(!extended || directoryLimit === 400e9);
  const sqlReserve = Number(process.env.DX_SCALE1_AGE_RESTORE_BUDGET ?? directoryLimit);
  const allocated = maintained ? Number(call("du", ["-s", "-B1", dataMount]).split(/\s/)[0]) : 0;
  assert(!maintained || (allocated > 0 && Number.isSafeInteger(allocated)));
  const forecastBytesPerRecord =
    bulkContinuation && process.env.DX_SCALE1_AGE_BYTES_PER_RECORD
      ? Number(process.env.DX_SCALE1_AGE_BYTES_PER_RECORD)
      : bytesPerAddedRecord;
  const sqlCap = maintained
    ? directoryLimit - 5e9
    : bulkContinuation && process.env.DX_SCALE1_AGE_SQL_CAP
      ? Number(process.env.DX_SCALE1_AGE_SQL_CAP)
      : 330e9;
  const copyBudget =
    bulkContinuation && process.env.DX_SCALE1_AGE_COPY_BUDGET
      ? Number(process.env.DX_SCALE1_AGE_COPY_BUDGET)
      : copyHeadroomBytes;
  assert(
    Number.isSafeInteger(forecastBytesPerRecord) &&
      forecastBytesPerRecord >= 50 &&
      forecastBytesPerRecord <= 2048,
  );
  assert(Number.isSafeInteger(sqlCap) && sqlCap >= 330e9 && sqlCap <= 800e9);
  assert(
    Number.isSafeInteger(copyBudget) &&
      copyBudget >= (maintainedMeasurement ? 25 * GiB : copyHeadroomBytes) &&
      copyBudget <= 800e9,
  );
  assert(Number.isSafeInteger(original.disk.after) && original.disk.after > 0);
  // [DX-SCALE1] Why: always leave room for backup and verification, plus a SQL dump on the legacy path.
  // Rejected: reserving the optional dump for a card that adopts stopped physical data.
  const grownSql = original.disk.after + (targetRecords - baselineRecords) * bytesPerAddedRecord;
  const liveReservation = maintainedLoading
    ? directoryLimit - allocated + maintainedMargin
    : bulk
      ? Math.max(0, targetRecords - (adopted?.records ?? bulkPrefix.records)) *
          forecastBytesPerRecord +
        12 * GiB
      : grownSql + 24 * GiB - (resumeDiscovery ? original.disk.after : 0);
  const copyReservation = maintainedLoading
    ? directoryLimit + maintainedMargin
    : maintainedMeasurement
      ? copyBudget + maintainedMargin
      : bulk
        ? copyBudget + 12 * GiB
        : copyHeadroomBytes + (held ? 1 : 2) * grownSql + 24 * GiB;
  const liveFree = free(dataMount),
    copyFree = free(copyReal);
  write(path.join(out, "storage-admission.json"), {
    ...identity,
    sameFilesystem,
    grownSql,
    liveReservation,
    liveFree,
    copyReservation,
    copyFree,
    ...(bulkContinuation ? { forecastBytesPerRecord, sqlCap, copyBudget } : {}),
    ...(maintained ? { allocated, directoryLimit, sqlReserve } : {}),
    at: Date.now(),
  });
  assert(
    sameFilesystem
      ? liveFree >= liveReservation + copyReservation
      : liveFree >= liveReservation && copyFree >= copyReservation,
    "Fresh restore, growing source, backup, verification SQL and scorecard dump do not fit",
  );

  const imageIndex = read<{ Id: string; RepoTags?: string[] }[]>(
    path.join(bench, "build-" + bootstrap, "results/images.json"),
  );
  const pgImage = imageIndex.find((i) => i.RepoTags?.includes("postgres:17-alpine"))?.Id;
  assert(pgImage && /^sha256:[a-f0-9]{64}$/.test(pgImage));
  // [DX-SCALE1] Why: the cached vendor ZIP extraction lacks launch bits.
  // Rejected: rewriting the retained vendor cache or restarting another full SQL restore to discover this.
  const vendorHome = path.join(out, "datomic-runtime");
  const jar = path.join(vendorHome, "datomic-transactor-pro-1.0.7745.jar");
  fs.cpSync(vendorCache, vendorHome, { recursive: true, force: false, errorOnExist: true });
  assert.equal(await fileHash(jar), await fileHash(path.join(vendorCache, path.basename(jar))));
  for (const tool of ["transactor", "datomic", "run", "classpath"]) {
    const native = path.join(vendorHome, "bin", tool);
    assert.equal(await fileHash(native), await fileHash(path.join(vendorCache, "bin", tool)));
    fs.chmodSync(native, 0o755);
    fs.accessSync(native, fs.constants.X_OK);
  }
  const copyDir = path.join(copyReal, path.basename(out));
  fs.mkdirSync(copyDir);
  const restoreBase = maintainedMeasurement ? path.join(bench, "age-copy-scratch") : copyDir;
  if (maintainedMeasurement) {
    fs.mkdirSync(restoreBase, { recursive: true, mode: 0o700 });
    assert.equal(fs.realpathSync(restoreBase), restoreBase);
    assert(Number.isSafeInteger(sqlReserve) && sqlReserve >= allocated && sqlReserve <= 800e9);
    assert(
      free(restoreBase) >=
        sqlReserve +
          maintainedMargin +
          (fs.statSync(copyDir).dev === fs.statSync(restoreBase).dev ? copyBudget : 0),
    );
  }
  const copyData = path.join(
    restoreBase,
    maintainedMeasurement ? path.basename(out) + "-restore-sql" : "restore-sql",
  );
  fs.mkdirSync(copyData);
  const password = adopted?.password ?? randomBytes(20).toString("hex");
  const manifest = {
    ...identity,
    imageSha,
    transferSha,
    cut: seed.scopes[0]!.seedCut,
    pgImage,
    invocationStarted,
    exporter,
    ...(held ? { postgresTemplate: held.sealSha } : {}),
    ...(resumeDiscovery ? { resumedPrivateVolume: sourceVolume } : {}),
    ...(bulk ? { resumedPrivateVolume: sourceVolume, bulkPrefix } : {}),
  };
  write(path.join(out, "identity.json"), manifest);
  const status = (stage: string) =>
    fs.writeFileSync(
      path.join(out, "STATUS.json"),
      JSON.stringify({ ...manifest, stage, at: Date.now() }) + "\n",
    );
  let tx: ChildProcess | undefined, runner: ChildProcess | undefined;
  let txFinished: Promise<number | null> | undefined;
  const roles: string[] = [];
  let network = false;
  const interrupt = () => {
    if (runner?.exitCode === null) runner.kill("SIGTERM");
    if (tx?.exitCode === null) tx.kill("SIGTERM");
  };
  process.on("SIGTERM", interrupt);
  process.on("SIGINT", interrupt);
  try {
    docker(
      "network",
      "create",
      ...(adopted
        ? ["--subnet", adopted.network.subnet, "--gateway", adopted.network.gateway]
        : []),
      netName,
    );
    network = true;
    if (!resumeDiscovery && !bulk) docker("volume", "create", sourceVolume);
    const restoreStarted = Date.now();
    if (held && !resumeDiscovery) {
      status("copying the verified stopped SCALE1 template");
      const point = docker("volume", "inspect", "--format", "{{.Mountpoint}}", sourceVolume);
      assert(point.endsWith("/volumes/" + sourceVolume + "/_data"));
      assert.deepEqual(fs.readdirSync(point), []);
      execFileSync("cp", ["--archive", "--reflink=auto", "--", held.data + "/.", point + "/"], {
        timeout: 900000,
      });
      assert.deepEqual(await stoppedInventory(point), held.inventory);
    }
    status("provisioning owned SQL stores");
    for (const [name, db, mount] of [
      [pgName, primaryDb, sourceVolume],
      [copyName, copyDb, copyData],
    ] as const) {
      call(
        "docker",
        [
          "run",
          "-d",
          "--pull",
          "never",
          "--name",
          name,
          "--network",
          netName,
          ...(adopted
            ? ["--ip", name === pgName ? adopted.network.primary : adopted.network.copy]
            : []),
          "--cpuset-cpus",
          name === pgName ? "1,8" : "8",
          "--memory",
          "8g",
          "--memory-swap",
          "8g",
          "-e",
          "POSTGRES_PASSWORD",
          "-v",
          mount + ":/var/lib/postgresql/data",
          pgImage,
          "postgres",
          "-c",
          "shared_buffers=2GB",
          "-c",
          "synchronous_commit=on",
          "-c",
          "fsync=on",
          "-c",
          "full_page_writes=on",
          "-c",
          "track_io_timing=on",
          ...(bulkSettings ? ["-c", "track_wal_io_timing=on"] : []),
        ],
        { env: { ...process.env, POSTGRES_PASSWORD: password } },
      );
      roles.push(name);
      const deadline = Date.now() + 120000;
      for (;;) {
        try {
          docker("exec", name, "pg_isready", "-h", loopback, "-U", "postgres");
          break;
        } catch {
          assert(Date.now() < deadline, "PostgreSQL did not start");
          await sleep(1000);
        }
      }
      const roleSql =
        (held || bulk) && name === pgName
          ? "ALTER ROLE datomic PASSWORD '" +
            password +
            "';\nALTER ROLE postgres PASSWORD '" +
            password +
            "';"
          : "CREATE ROLE datomic LOGIN PASSWORD '" +
            password +
            "';\nCREATE DATABASE " +
            db +
            " OWNER datomic;\n";
      sql(name, "postgres", roleSql);
      if (name === copyName) {
        sql(name, db, fs.readFileSync(path.join(vendorHome, "bin/sql/postgres-table.sql"), "utf8"));
        sql(name, db, "ALTER TABLE public.datomic_kvs OWNER TO datomic;");
      }
    }
    if (!held && !bulk) {
      status("restoring immutable SCALE1 image");
      const digest = createHash("sha256");
      const stream = new Transform({
        transform(data, _encoding, done) {
          digest.update(data);
          done(null, data);
        },
      });
      const restoreLog = fs.openSync(path.join(out, "pg-restore.log"), "wx");
      try {
        const child = spawn(
          "docker",
          [
            "exec",
            "-i",
            pgName,
            "pg_restore",
            "--exit-on-error",
            "--single-transaction",
            "-U",
            "postgres",
            "-d",
            primaryDb,
          ],
          { stdio: ["pipe", restoreLog, restoreLog] },
        );
        const [code] = await Promise.all([
          exited(child),
          pipeline(fs.createReadStream(path.join(seedDir, "seed.pgdump")), stream, child.stdin!),
        ]);
        assert.equal(code, 0);
        assert.equal(digest.digest("hex"), seed.sha256);
      } finally {
        fs.closeSync(restoreLog);
      }
    }
    docker("update", "--cpuset-cpus", "1", pgName);
    for (const [container, db] of [
      [pgName, primaryDb],
      [copyName, copyDb],
    ] as const)
      assert.equal(
        sql(
          container,
          db,
          "SELECT bool_and(has_table_privilege('datomic','public.datomic_kvs', privilege)) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS p(privilege);",
        ),
        "t",
      );
    const address = (name: string) => {
      const record = JSON.parse(docker("inspect", name))[0];
      const addr = record.NetworkSettings.Networks[netName]?.IPAddress;
      assert(addr && /^\d+\.\d+\.\d+\.\d+$/.test(addr));
      return addr;
    };
    const jdbc = (addr: string, db: string) => "jdbc:postgresql://" + addr + ":5432/" + db;
    const primaryAddress = address(pgName),
      copyAddress = address(copyName);
    const sqlJdbc = jdbc(primaryAddress, primaryDb),
      copyJdbc = jdbc(copyAddress, copyDb);
    // [DX-SCALE1] Why: AGE1's JDBC counters authenticate as postgres across the private bridge.
    // Rejected: assuming POSTGRES_PASSWORD updates an existing cluster or testing against loopback trust.
    for (const [client, server, db] of [
      [copyName, primaryAddress, primaryDb],
      [pgName, copyAddress, copyDb],
    ]) {
      assert.equal(
        call(
          "docker",
          [
            "exec",
            "-e",
            "PGPASSWORD",
            client!,
            "psql",
            "-XAtq",
            "-w",
            "-h",
            server!,
            "-U",
            "postgres",
            "-d",
            db!,
            "-c",
            "SELECT 1",
          ],
          { env: { ...process.env, PGPASSWORD: password } },
        ),
        "1",
      );
    }
    const uri = (d: string) =>
      "datomic:sql://{db}?" + d + "?user=" + role + "&password=" + password;
    assert.equal(
      sql(
        pgName,
        primaryDb,
        "SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes');",
      ),
      "on|on|on",
    );
    const properties = bulkSettings
      ? {
          "memory-index-threshold": maintainedLoading ? "256m" : "128m",
          "memory-index-max": "2g",
          "object-cache-max": "16g",
          "index-parallelism": maintainedLoading ? "4" : "2",
        }
      : {
          "memory-index-threshold": "32m",
          "memory-index-max": "512m",
          "object-cache-max": "512m",
          "index-parallelism": "1",
        };
    const txProps = path.join(out, "sql.properties");
    const applied = {
      ...properties,
      protocol: "sql",
      host: loopback,
      "alt-host": loopback,
      "sql-url": sqlJdbc,
      "sql-user": role,
      "sql-password": password,
      ...(bulkSettings
        ? { "write-concurrency": "4", "metrics-callback": "triplex.age.telemetry/capture!" }
        : {}),
    };
    const template = fs.readFileSync(
      path.join(vendorHome, "config/samples/sql-transactor-template.properties"),
      "utf8",
    );
    fs.writeFileSync(
      txProps,
      template
        .split(/\r?\n/)
        .filter((line) => !(line.split("=")[0]!.trim() in applied))
        .join("\n") +
        "\n" +
        Object.entries(applied)
          .map(([k, v]) => k + "=" + v)
          .join("\n") +
        "\n",
      { mode: 0o600 },
    );
    if (bulkContinuation === "load" && !maintained) {
      assert.equal(await fileHash(txProps), adopted?.propertiesSha);
    }
    if (bulkSettings) {
      const bridge = JSON.parse(docker("network", "inspect", netName))[0].IPAM.Config;
      assert.equal(bridge.length, 1);
      write(path.join(out, "runtime-network.json"), {
        source: ageSource,
        nonce: manifest.nonce,
        slot: pgName,
        propertiesSha: await fileHash(txProps),
        at: Date.now(),
        subnet: bridge[0].Subnet,
        gateway: bridge[0].Gateway,
        primary: primaryAddress,
        copy: copyAddress,
      });
    }
    status("starting native age transactor");
    const txLog = path.join(out, "tx.log");
    const eventLog = path.join(out, "bulk-events.log");
    const transactorCpus = maintainedLoading ? "0,2,3,4,5,6" : bulkSettings ? "0,2,3" : "0";
    const fd = fs.openSync(txLog, "wx");
    tx = spawn(
      "taskset",
      ["-c", transactorCpus, path.join(vendorHome, "bin/transactor"), txProps],
      {
        stdio: ["ignore", fd, fd],
        env: {
          ...process.env,
          PATH: jdk + ":" + process.env.PATH,
          DATOMIC_EXT_CLASSPATH: [
            path.join(ageCheckout, "packages/datomic/gateway/src"),
            ...(bulkSettings ? [path.join(ageLab, "src")] : []),
          ].join(":"),
          JAVA_OPTS: bulkSettings
            ? "-Xms4g -Xmx24g -XX:ActiveProcessorCount=" +
              (maintainedLoading ? 6 : 3) +
              " -XX:+UseG1GC " +
              "-Dlogback.configurationFile=" +
              path.join(ageLab, maintainedLoading ? "continuation-logback.xml" : "bulk-logback.xml")
            : "-Xms1g -Xmx5g -XX:+UseG1GC",
          ...(bulkSettings ? { AGE_TX_EVENT_LOG: eventLog } : {}),
        },
      },
    );
    const txDone = exited(tx);
    txFinished = txDone;
    void txDone.catch(() => {});
    fs.closeSync(fd);
    const stopWaiting = Date.now() + 120000;
    while (!fs.readFileSync(txLog, "utf8").split("\n").includes("System started")) {
      assert(
        Date.now() < stopWaiting && tx.exitCode === null,
        "Native age transactor did not start",
      );
      await sleep(1000);
    }
    // [DX-SCALE1] Why: SQL restores can retain the old peer discovery endpoint until the new transactor registers.
    // Rejected: mapping the stale hostname or counting an unverified TCP listener as an adopted database.
    status("verifying restored scope discovery before starting the aging clock");
    const scope = seed.scopes[0]!;
    const challenge = randomBytes(12).toString("hex");
    const cut = adopted?.cut ?? (bulk ? bulkPrefix.head : scope.seedCut);
    const nativeT = adopted?.nativeT ?? bulkPrefix.t;
    const proof = challenge + ":" + cut;
    const cp = [
      jar,
      path.join(vendorHome, "lib/*"),
      path.join(vendorHome, "resources"),
      path.join(ageCheckout, "packages/datomic/gateway/src"),
    ].join(":");
    const check = `(require '[datomic.api :as d] '[triplex.gateway.main :as gw] '[triplex.gateway.storage :as store]
                              ${bulk ? "'[triplex.age.adopt :as adopt]" : ""})
      (let [name (System/getenv "DX_SCOPE") c (gw/connection (gw/db-uri name)) db @(d/sync c)
            head (store/head-position db)]
        (when-not (and (= head ${cut}) ${bulk ? "(= (adopt/exact-position-t db head) " + nativeT + ")" : "true"})
          (throw (ex-info "Unexpected discovery cut" {:head head :t (d/basis-t db)})))
        (println (str (System/getenv "DX_CHALLENGE") ":" head)))
      (shutdown-agents) (System/exit 0)`;
    const until = Date.now() + 120000;
    let established = false;
    do {
      assert(tx.exitCode === null);
      const fresh = spawnSync(
        path.join(jdk, "java"),
        [
          "-Xms128m",
          "-Xmx1g",
          "-Dtriplex.codec.spec=" + path.join(ageCheckout, "packages/datomic/src/codec-spec.json"),
          "-cp",
          bulk ? cp + ":" + path.join(ageLab, "src") : cp,
          "clojure.main",
          "-e",
          check,
        ],
        {
          timeout: 15000,
          encoding: "utf8",
          cwd: ageCheckout,
          env: {
            ...process.env,
            DATOMIC_URI_TEMPLATE: uri(sqlJdbc),
            DX_SCOPE: scope.db,
            DX_CHALLENGE: challenge,
          },
        },
      );
      fs.appendFileSync(
        path.join(out, "discovery.log"),
        JSON.stringify({
          at: Date.now(),
          status: fresh.status,
          matchedCut: fresh.stdout?.split(/\r?\n/).includes(proof) === true,
          error: fresh.stderr?.match(/\b[A-Za-z]+(?:Exception|Error)\b/)?.[0],
        }) + "\n",
        { mode: 0o600 },
      );
      established = fresh.status === 0 && fresh.stdout.split(/\r?\n/).includes(proof);
      assert(!fresh.stderr?.includes("Unexpected discovery cut"));
      if (!established) await sleep(4000);
    } while (!established && Date.now() < until);
    assert(established, "No fresh native peer rediscovered the exact restored cut");
    write(path.join(out, "discovery.json"), {
      ...manifest,
      at: Date.now(),
      challenge,
      database: scope.db,
      cut,
      ...(bulk ? { nativeT } : {}),
    });
    const javaPids = call("ps", ["-eo", "pid=,comm="])
      .split("\n")
      .map((l) => /^\s*(\d+)\s+java$/.exec(l)?.[1])
      .filter(Boolean)
      .map(Number);
    assert.equal(javaPids.length, 1);
    const txPid = javaPids[0]!;
    const expectedMeasureSettings = {
      txPid,
      group: false,
      saveLedger: true,
      smallRows: true,
      properties,
    };
    const measureSettings = path.join(out, "measure-settings.json");
    write(measureSettings, expectedMeasureSettings);
    const config = {
      source: ageSource,
      target: targetRecords,
      fromRecords: Math.min(
        targetRecords,
        adopted?.records ?? (bulk ? bulkPrefix.records : baselineRecords),
      ),
      ratePrior: adopted?.rate ?? 24000,
      reserveHours: 3,
      maxHours: 9.9,
      maxUsd: 10.8,
      seconds: 120,
      activePerAccount: 2000,
      output: adopted?.output ?? path.join(out, "rung"),
      dataMount,
      copyMount: copyDir,
      maxSqlBytes: sqlCap,
      copyHeadroomBytes: copyBudget,
      bytesPerAddedRecord: forecastBytesPerRecord,
      image,
      imageSha,
      transfer,
      transferSha,
      datomicSha: await fileHash(jar),
      transactorPid: txPid,
      transactorProperties: txProps,
      transactorPropertiesSha: await fileHash(txProps),
      javaPids,
      measureSettings,
      expectedMeasureSettings,
      peerHeap: bulk ? "6g" : "2g",
      peerCache: bulk ? "1g" : "768m",
      copyHeap: "2g",
      ...(bulkSettings ? { bulkEventLog: eventLog } : {}),
      ...(maintainedLoading
        ? {
            pgData: dataMount,
            postgresPid: Number(docker("inspect", "--format", "{{.State.Pid}}", pgName)),
            scorecardMount: bench,
            directoryLimitBytes: directoryLimit,
            ladderEvidence,
            ...(extended
              ? {
                  resumeEvidence,
                  loadingLimits: { floor: 6500, lowCycles: 2, maxHours: 26, maxUsd: 28.34 },
                }
              : {}),
          }
        : {}),
      ...(maintainedMeasurement
        ? {
            restoreMount: restoreBase,
            restoreHeadroomBytes: sqlReserve,
            restorePgData: copyData,
            restorePostgresPid: Number(docker("inspect", "--format", "{{.State.Pid}}", copyName)),
          }
        : {}),
    };
    const configFile = path.join(out, "config.json");
    write(configFile, config);
    const staged = Date.now();
    write(path.join(out, "restore.json"), {
      ...manifest,
      restoreMs: staged - restoreStarted,
      at: staged,
    });
    status(
      bulk
        ? "running AGE1 " + (bulkContinuation ?? "bulk ladder")
        : "running AGE1 admission and rate calibration",
    );
    const ageEnv = {
      ...process.env,
      AGE_JAVA: path.join(jdk, "java"),
      AGE_DATOMIC_HOME: vendorHome,
      AGE_SQL_PASSWORD: password,
      AGE_SQL_JDBC: sqlJdbc,
      AGE_RESTORE_JDBC: copyJdbc,
      DATOMIC_URI_TEMPLATE: uri(sqlJdbc),
      AGE_RESTORE_URI_TEMPLATE: uri(copyJdbc),
    };
    const ageRunner = path.join(ageCheckout, "lab/experiments/EXP-DX1/age1/server.mjs");
    const runAge = (file: string, input: string, logName: string) => {
      const log = fs.openSync(path.join(out, logName), "wx");
      try {
        runner = spawn(
          maintained ? "taskset" : process.execPath,
          [
            ...(maintained ? ["-c", "7,9,10", process.execPath] : []),
            file,
            ...(bulk ? [bulkContinuation ?? "ladder"] : []),
            input,
          ],
          {
            cwd: ageCheckout,
            stdio: ["ignore", log, log],
            env: ageEnv,
          },
        );
        return Promise.race([
          exited(runner),
          txDone.then(() => {
            throw Error("Native transactor exited during AGE1");
          }),
        ]);
      } finally {
        fs.closeSync(log);
      }
    };
    const result = await runAge(ageRunner, configFile, "runner.log");
    write(path.join(out, "exit.json"), {
      ...manifest,
      result,
      at: Date.now(),
      runnerStarted: staged,
    });
    if (bulkLadder) {
      if (result !== 0) {
        status("bulk ladder stopped");
        throw Error("Review the held AGE1 bulk ladder before any further loading");
      }
      const rung = path.join(config.output, String(targetRecords));
      const calibration = read(path.join(rung, "bulk-calibration.json"));
      const admission = read(path.join(rung, "ladder-admission.json"));
      assert(admission.started >= staged && admission.started <= Date.now());
      assert.deepEqual(
        [
          calibration.source,
          calibration.machineHash,
          calibration.db,
          calibration.imageSha,
          calibration.propertiesSha,
        ],
        [
          ageSource,
          admission.binding.machineHash,
          scope.db,
          imageSha,
          config.transactorPropertiesSha,
        ],
      );
      assert.equal(admission.binding.configSha, await fileHash(configFile));
      assert.match(calibration.attempt, /^[a-f0-9-]{36}$/);
      assert(calibration.arms.length === 3 && calibration.best.metrics.jobs.length >= 2);
      assert(
        calibration.best.metrics.sustainedRate >= 9900 &&
          calibration.lastRecords > bulkPrefix.records,
      );
      for (const { file, sum } of calibration.artifacts) {
        assert.equal(file, path.join(calibration.attempt, path.basename(file)));
        assert.equal(await fileHash(path.join(rung, file)), sum);
      }
      const checkpoint = "age1-" + createHash("sha256").update(scope.db).digest("hex") + ".edn";
      assert.equal(await fileHash(path.join(out, checkpoint)), calibration.checkpointSha);
      status("bulk ladder qualified an arm");
      return;
    }
    if (bulkContinuation === "load") {
      status("preserving AGE1 load output");
      assert.equal(result, 0, "AGE1 stopped before the verified 1B cut");
      const rung = path.join(config.output, String(targetRecords));
      const output = read(path.join(rung, "bulk-loaded.json"));
      const admission = read(path.join(rung, "load-admission.json"));
      assert(admission.started >= staged && admission.started <= Date.now());
      assert.deepEqual(
        [
          output.source,
          output.machineHash,
          output.db,
          output.imageSha,
          admission.binding.configSha,
        ],
        [ageSource, machine, scope.db, imageSha, await fileHash(configFile)],
      );
      assert.equal(
        output.calibrationSha,
        adopted?.calibrationSha ?? (await fileHash(path.join(rung, "bulk-calibration.json"))),
      );
      assert(output.phase.bulkLoaded && output.phase.indexedRecords >= targetRecords);
      const checkpoint = "age1-" + createHash("sha256").update(scope.db).digest("hex") + ".edn";
      assert.equal(await fileHash(path.join(out, checkpoint)), output.checkpointSha);
      for (const { file, sum } of output.artifacts) {
        assert.equal(file, path.join(output.attempt, path.basename(file)));
        assert.equal(await fileHash(path.join(rung, file)), sum);
      }
      status("AGE1 indexed cut ready for a fresh measurement transactor");
      return;
    }
    if (result !== 0) {
      assert(!bulk, "AGE1 stopped before the aged measurement seal");
      const fallback = prepareFallback(out, ageRunner, config, staged);
      assert(fallback, "AGE1 ended before a sealed rung. Retain its first evidence");
      const fallbackConfig = path.join(out, "fallback-config.json");
      const { runner: fallbackRunner, ...decision } = fallback;
      const decidedAt = Date.now();
      write(path.join(out, "fallback.json"), { ...manifest, ...decision, at: decidedAt });
      write(fallbackConfig, {
        ...config,
        target: fallback.target,
        fromRecords: fallback.seedRecords,
        ratePrior: fallback.recordsPerSecond,
        diagnosticDeadline: fallback.deadline,
        diagnosticCalibrationLog: fallback.calibrationLog,
        diagnosticRunnerSha: fallback.runnerSha,
      });
      // [DX-SCALE1] Why: reconcile the acknowledged native prefix on the same running transactor.
      // Rejected: restoring the original seed or publishing the smaller seal as an aged scorecard input.
      status("running the AGE1 diagnostic rung from the calibrated prefix");
      const exit = await runAge(fallbackRunner, fallbackConfig, "fallback.log");
      const diagnosticRung = path.join(config.output, String(fallback.target));
      if (exit === 0) {
        const file = path.join(diagnosticRung, "sealed.json");
        const diagnostic = read(file);
        const start = read(path.join(diagnosticRung, "admission.json"));
        assert(diagnostic.source === ageSource && diagnostic.target === fallback.target);
        assert(
          diagnostic.records >= fallback.target &&
            diagnostic.t > fallback.prefixT &&
            diagnostic.head > manifest.cut,
        );
        assert(start.started >= decidedAt && diagnostic.bindingSha === start.binding.runSpecSha);
        assert.deepEqual(
          [start.binding.imageSha, start.binding.transferSha, start.binding.configSha],
          [imageSha, transferSha, await fileHash(fallbackConfig)],
        );
        write(path.join(out, "fallback-seal.json"), {
          ...manifest,
          ...decision,
          at: Date.now(),
          sealSha: await fileHash(file),
          records: diagnostic.records,
          head: diagnostic.head,
          t: diagnostic.t,
        });
        status("sealed AGE1 diagnostic rung");
      } else {
        write(path.join(out, "fallback-exit.json"), {
          ...manifest,
          ...decision,
          exit,
          at: Date.now(),
        });
        throw Error("AGE1 diagnostic stopped before sealing. Retain the calibrated prefix");
      }
      return;
    }
    const rung = path.join(config.output, "1000000000");
    const seal = path.join(rung, "sealed.json");
    const sealSha = await fileHash(seal),
      sealed = read(seal);
    const admission = read(path.join(rung, "admission.json"));
    assert.equal(sealed.source, ageSource);
    assert(sealed.records >= 1e9 && sealed.target === 1e9 && sealed.head > manifest.cut);
    assert(admission.started >= staged && sealed.bindingSha === admission.binding.runSpecSha);
    assert(
      admission.binding.imageSha === imageSha && admission.binding.transferSha === transferSha,
    );
    const datum = seed.scopes[0]!.db;
    const state = path.join(
      path.dirname(config.output),
      "age1-" + createHash("sha256").update(datum).digest("hex") + ".edn",
    );
    const handoff = path.join(rung, "aged-scorecard.json");
    status("verifying aged scorecard handoff");
    execFileSync(
      process.execPath,
      [
        path.join(exportCheckout, "lab/experiments/EXP-DX1/age1/scorecard.mjs"),
        "export",
        seal,
        sealSha,
        state,
        handoff,
      ],
      {
        cwd: exportCheckout,
        env: ageEnv,
        timeout: 300000,
        stdio: "ignore",
      },
    );
    write(path.join(out, "handoff.json"), {
      ...manifest,
      at: Date.now(),
      sealSha,
      records: sealed.records,
      cut: sealed.head,
      t: sealed.t,
      bytes: fs.statSync(handoff).size,
      digest: await fileHash(handoff),
    });
    // [DX-SCALE1] Why: the scorecard restores the exact-aged SQL cut.
    // Rejected: using the original fresh dump or exporting while native writes can still run.
    status("sealing the scorecard SQL dump");
    tx.kill("SIGTERM");
    const stopped = await Promise.race([txDone.then(() => true), sleep(30000).then(() => false)]);
    assert(
      stopped &&
        !call("ps", ["-eo", "pid=,comm="])
          .split("\n")
          .some((line) => new RegExp("^\\s*" + txPid + "\\s+java$").test(line)),
    );
    if (held || bulk) {
      // [DX-SCALE1] Why: v0.1 consumes an independently cloned stopped cluster and exact replay.
      // Rejected: spending another large export and reserving disk for a compatibility dump.
      let stoppedData;
      if (bulk) {
        // [DX-SCALE1] Why: fixture login is part of reopening the exact aged cluster with the pinned card.
        // Rejected: normalizing each scratch after sealing, which changes its PostgreSQL control digest.
        if (maintainedMeasurement) normalizeScorecardRoles(pgName);
        call("docker", ["stop", "--time", "120", pgName], { timeout: 130000 });
        assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", pgName), "0");
        assert.equal(docker("inspect", "--format", "{{.State.Running}}", pgName), "false");
        // [DX-SCALE1] Why: bind the aged runtime seal to the bytes after PostgreSQL's clean stop.
        // Rejected: hashing a live volume or equating a stopped transactor with quiescent SQL.
        stoppedData = { data: dataMount, inventory: await stoppedInventory(dataMount) };
      }
      write(path.join(out, "aged-pgdata.json"), {
        ...manifest,
        sealSha,
        sourceVolume,
        cut: sealed.head,
        t: sealed.t,
        records: sealed.records,
        bundleSha: await fileHash(handoff),
        ...(stoppedData ?? {}),
        at: Date.now(),
      });
      status("sealed aged rung with a stopped PostgreSQL handoff");
      return;
    }
    docker("update", "--cpuset-cpus", "1,8", pgName);
    const dump = path.join(copyDir, "aged.pgdump");
    const partial = dump + ".partial";
    const output = fs.createWriteStream(partial, { flags: "wx" });
    const dumper = spawn(
      "docker",
      ["exec", pgName, "pg_dump", "-U", "postgres", "-Fc", "-Z1", "-d", primaryDb],
      {
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    const hashing = createHash("sha256");
    const passthrough = new Transform({
      transform(data, _encoding, done) {
        hashing.update(data);
        done(null, data);
      },
    });
    const [dumpExit] = await Promise.all([
      exited(dumper),
      pipeline(dumper.stdout!, passthrough, output),
    ]);
    assert.equal(dumpExit, 0);
    const verifyFd = fs.openSync(partial, "r");
    const magic = Buffer.alloc(5);
    try {
      assert.equal(fs.readSync(verifyFd, magic, 0, magic.length, 0), magic.length);
    } finally {
      fs.closeSync(verifyFd);
    }
    assert.equal(magic.toString("ascii"), "PGDMP");
    fs.renameSync(partial, dump);
    fs.chmodSync(dump, 0o400);
    write(path.join(out, "aged-dump.json"), {
      ...manifest,
      at: Date.now(),
      sealSha,
      records: sealed.records,
      cut: sealed.head,
      t: sealed.t,
      bytes: fs.statSync(dump).size,
      digest: hashing.digest("hex"),
    });
    status("sealed aged rung");
  } finally {
    interrupt();
    if (txFinished) {
      await Promise.race([txFinished.catch(() => {}), sleep(10000)]);
      if (tx?.exitCode === null && tx.signalCode === null) tx.kill("SIGKILL");
    }
    for (const name of [...roles].reverse()) {
      docker("stop", "--time", "20", name);
      docker("rm", name);
    }
    if (network) docker("network", "rm", netName);
    const remaining = docker("ps", "-a", "--format", "{{.Names}}")
      .split("\n")
      .filter((name) => roles.includes(name));
    assert(!remaining.length);
    // [DX-SCALE1] Why: calibration or a timed failure may leave a useful checked prefix.
    // Rejected: deleting the original transfer, source volume or recovered backup in the exit hook.
    write(path.join(out, "cleanup.json"), {
      ...manifest,
      containers: remaining,
      retained: [sourceVolume, "native-copy"],
      at: Date.now(),
    });
  }
}

await main(
  process.argv[2]!,
  process.argv[3]!,
  process.argv[4]!,
  process.argv[5]!,
  process.argv[6]!,
  process.argv[7],
  process.argv[8] === "resume-discovery",
  process.argv[8] === "bulk-ladder",
  process.argv[8] === "load" || process.argv[8] === "measure-loaded" ? process.argv[8] : undefined,
  process.argv[9],
  process.argv[10],
);
