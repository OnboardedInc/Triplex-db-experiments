// @ts-nocheck -- [DX-ERASE1] Engine reservation dictionaries, Docker inspect JSON and child IPC are checked when read.
import assert from "node:assert/strict";
import { fork, execFileSync, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  DOCKER_HOST,
  LOCKS,
  REPO,
  SLOTS_FILE,
  admission,
  docker,
  dockerArgs,
  inspect,
  listTx2Containers,
  readOwner,
  sha256,
  sha256File,
  slotInfo,
  vmDisk,
  withPool,
} from "../../../bin/lib.mjs";

const MiB = 2 ** 20;
const GiB = 2 ** 30;
const code = path.relative(REPO, import.meta.dirname);
const caps = { pg: 384, tx: 1152, gw: 1408 };

function localImage(config) {
  // [DX-ERASE1] Why: reuse the engine's read-back build records when it rotates the shared image.
  // Rejected: pulling, tagging or building an image while other experiments use the VM.
  const builds = fs
    .readFileSync(path.join(LOCKS, "events.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .filter((x) => x.event === "datomic-build")
    .reverse();
  for (const b of [config.lanes.datomic, ...builds]) {
    assert.match(b.imageId, /^sha256:[a-f0-9]{64}$/);
    assert.match(b.buildInputsSha256, /^[a-f0-9]{64}$/);
    const actual = docker(
      [
        "image",
        "inspect",
        b.imageId,
        "--format",
        '{{.Id}} {{index .Config.Labels "tx2.build-inputs-sha256"}}',
      ],
      { allowFail: true },
    );
    if (!actual) continue;
    assert.equal(actual, b.imageId + " " + b.buildInputsSha256);
    return b.imageId;
  }
  throw Error("No locally present recorded Datomic image");
}

function bindingInputs(manager) {
  const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
  const builtPackages = ["core", "datomic", "qualification", "w0"];
  const files = git(
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    code,
    "lab/bench/lib",
    "lab/bin",
    "lab/config/datomic",
    "lab/world/W0",
    "lab/oracles",
    "lab/experiments/EXP-DX1/int1",
    "lab/experiments/EXP-DX1/import1",
    "lab/experiments/EXP-DX1/notify1",
    "lab/experiments/EXP-DX1/actv-lazy",
    "lab/experiments/EXP-DX1/actv-delta",
    "lab/experiments/EXP-DX1/w1",
    "lab/experiments/EXP-DX1/wfix1/regression.clj",
    "pnpm-lock.yaml",
  )
    .split("\n")
    .filter((p) => /\.(clj|json|mjs|py|ts|yaml|properties|sh|xml)$|\/SHA256SUMS$/.test(p));
  for (const pkg of builtPackages) {
    const dir = `packages/${pkg}/dist`;
    for (const file of fs.readdirSync(path.join(REPO, dir), { recursive: true }))
      if (file.endsWith(".js")) files.push(path.join(dir, file));
  }
  const gateway = manager.datomicTree(path.join(REPO, "packages/datomic/gateway"));
  return {
    head: git("rev-parse", "HEAD"),
    files: Object.fromEntries(
      [...new Set(files)].sort().map((p) => [p, sha256File(path.join(REPO, p))]),
    ),
    gateway,
    codec: sha256File(path.join(REPO, "packages/datomic/src/codec-spec.json")),
    slots: sha256File(SLOTS_FILE),
  };
}

export async function local(opts, config, manager) {
  assert(process.platform === "darwin" && dockerArgs([])[1] === DOCKER_HOST);
  // [DX-THIN1] Why: the exact same integration fixture must reserve and clean up under the calling builder's own holder.
  // Rejected: requiring the original builder's slot or collecting their files as a fresh gate.
  const holder = opts.holder;
  assert(typeof holder === "string" && /^DX-[A-Z0-9-]{1,26}$/.test(holder));
  const people = Number(opts.people);
  const mode = String(opts.run ?? "scale");
  const subjectWriter = mode === "ledger-parallel" ? "1" : process.env.DX_ERASE1_SUBJECT_WRITER;
  const orderedIds = process.env.DX_ERASE1_ORDERED_IDS;
  assert(subjectWriter === undefined || subjectWriter === "0" || subjectWriter === "1");
  assert(orderedIds === undefined || (orderedIds === "1" && subjectWriter === "1"));
  assert(
    [
      "smoke",
      "scale",
      "batch",
      "overlap",
      "regression",
      "ledger-regression",
      "ledger-overhead",
      "ledger-profile",
      "ledger-match",
      "ledger-reuse",
      "ledger-parallel",
      "ledger-derived",
      "guard-prepared-smoke",
      "fast-smoke",
      "fast-neighbours-smoke",
      "fast",
    ].includes(mode),
  );
  assert(Number.isSafeInteger(people) && people >= 12 && people <= 100_000);
  assert(typeof opts.out === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(opts.out));
  const vault = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2");
  const dir = path.join(vault, "evidence", holder, opts.out);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  fs.mkdirSync(dir);
  const write = (name, value) =>
    fs.writeFileSync(path.join(dir, name + ".json"), JSON.stringify(value, null, 2) + "\n", {
      flag: "wx",
    });
  const inputs = bindingInputs(manager);
  const nonce = randomUUID();
  const prefix = "tx2-dxerase-" + nonce.slice(0, 12);
  const token = randomBytes(24).toString("hex");
  const roles = Object.keys(caps);
  const names = Object.fromEntries(roles.map((r) => [r, prefix + "-" + r]));
  const regression = mode.endsWith("regression");
  // [DX-ERASE1] Why: stage evidence must join the peer and SDK from the same fresh attempt.
  // Rejected: comparing an aggregate HTTP span from an earlier run.
  const profile = mode === "ledger-profile";
  const traceDir = path.join(dir, "trace");
  const traceEnv = {
    TRIPLEX_TRACE_LEVEL: "full",
    TRIPLEX_TRACE_JFR: "0",
    TRIPLEX_TRACE_RUN: nonce,
    TRIPLEX_TRACE_SOURCE: sha256(JSON.stringify(inputs)),
  };
  if (profile) fs.mkdirSync(traceDir);
  const archiveDir = regression ? path.join(dir, "archive") : undefined;
  if (archiveDir) fs.mkdirSync(archiveDir);
  const owned = new Map();
  const volumes = new Set();
  const label = "dxerase.attempt";
  const forecast = Math.ceil(1 + (people * 160 * 1200) / GiB) * GiB;
  const request = {
    container: prefix,
    memBytes: Object.values(caps).reduce((a, b) => a + b) * MiB,
    diskForecastBytes: forecast,
  };
  const abort = new AbortController();
  const stop = () => abort.abort(new Error("Interrupted"));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  let info, network, run, child;
  function diskFloor() {
    const s = fs.statfsSync(REPO);
    const minimum = holder === "DX-THIN1" ? 10 : 5;
    assert(s.bavail * s.bsize >= minimum * GiB, "Host disk below " + minimum + " GiB");
    return s.bavail * s.bsize;
  }
  write("inputs", {
    nonce,
    mode,
    people,
    caps,
    forecast,
    inputs,
    ...(orderedIds ? { subjectOrderedIds: true } : {}),
  });
  try {
    const waitingSince = Date.now();
    while (!info) {
      abort.signal.throwIfAborted();
      diskFloor();
      await withPool((ledger) => {
        // [DX-ERASE1] Why: a newly claimed measurement lease must be able to drain this waiting heavy permit.
        // Rejected: sleeping on a frozen pool while the measurement owner waits for our permit.
        manager.assertMeasureAdmission(holder);
        const live = listTx2Containers({ all: true });
        if (live.some((c) => c.name === "tx2-datomic-dev" && c.running)) return;
        const candidate = ["s1", "s2", "s3"]
          .map((s) => slotInfo(config, "datomic", s, nonce.replaceAll("-", "")))
          .find((s) => !fs.existsSync(s.lockDir) && !live.some((c) => c.name === s.container));
        if (!candidate) return;
        const allowed = admission({
          config: {
            ...config,
            pool: { ...config.pool, memLimitBytes: Math.min(config.pool.memLimitBytes, 15 * GiB) },
          },
          reservations: ledger.reservations,
          running: live,
          request,
          diskUsedBytes: vmDisk(config).usedBytes,
        });
        if (!allowed.ok) return;
        const acquired = manager.acquireSlot(candidate, holder, nonce);
        assert(acquired.created);
        info = candidate;
        for (const role of roles)
          ledger.reservations.push({
            container: names[role],
            lane: "datomic",
            slot: info.slot,
            holder,
            pid: process.pid,
            state: "erase1",
            cpus: 2,
            memBytes: caps[role] * MiB,
            diskForecastBytes: role === "pg" ? forecast : 0,
          });
      });
      if (!info) {
        if (Math.floor((Date.now() - waitingSince) / 5000) % 6 === 0)
          console.log("Waiting for an exclusive SQL slot");
        await delay(5000, undefined, { signal: abort.signal });
      }
    }
    const image = localImage(config);
    const pgImage = docker(["image", "inspect", "postgres:17-alpine", "--format", "{{.Id}}"]);
    assert.match(pgImage, /^sha256:[a-f0-9]{64}$/);
    assert.match(image, /^sha256:[a-f0-9]{64}$/);
    network = docker(["network", "create", "--label", `${label}=${nonce}`, prefix]);
    const password = randomBytes(24).toString("hex");
    const endpoint = info.endpoint;
    const props = [
      "protocol=sql",
      "host=" + names.tx,
      "port=4334",
      "sql-url=jdbc:postgresql://" + names.pg + "/postgres",
      "sql-driver-class=org.postgresql.Driver",
      "sql-user=postgres",
      "sql-password=" + password,
      "memory-index-threshold=48m",
      "memory-index-max=160m",
      "object-cache-max=96m",
    ].join("\n");
    const uri =
      "datomic:sql://{db}?jdbc:postgresql://" +
      names.pg +
      "/postgres?user=postgres&password=" +
      password;
    const gateway = sha256(JSON.stringify(inputs.gateway));

    function start(role, img, extra, entrypoint, args, memory = caps[role]) {
      // [DX-ERASE1] Why: match each cap and ID to a reservation before starting. Rejected: trusting slot names for cleanup.
      const id = docker([
        "create",
        "--pull",
        "never",
        "--name",
        names[role] ?? prefix + "-" + role,
        "--label",
        `${label}=${nonce}`,
        "--label",
        `tx2.holder=${holder}`,
        "--network",
        network,
        "--memory",
        `${memory}m`,
        "--memory-swap",
        `${memory}m`,
        "--cpus",
        "2",
        "--ulimit",
        "core=0",
        "--log-opt",
        "max-size=32m",
        "--log-opt",
        "max-file=2",
        ...extra,
        "--entrypoint",
        entrypoint,
        img,
        ...args,
      ]);
      owned.set(role, id);
      const m = inspect(id);
      assert(m?.Id === id && m.Image === img && m.Config.Labels[label] === nonce);
      assert.equal(m.HostConfig.Memory, memory * MiB);
      assert.equal(m.HostConfig.MemorySwap, m.HostConfig.Memory);
      assert.equal(m.HostConfig.NanoCpus, 2e9);
      for (const mount of m.Mounts) if (mount.Type === "volume") volumes.add(mount.Name);
      docker(["start", id]);
    }
    async function ready(role, check) {
      for (let i = 0; i < 120; i++) {
        abort.signal.throwIfAborted();
        if (await check()) return;
        assert(inspect(owned.get(role))?.State.Running, `${role} stopped during startup`);
        await delay(1000, undefined, { signal: abort.signal });
      }
      throw Error(`${role} startup timed out`);
    }
    const sql = (q) =>
      docker([
        "exec",
        owned.get("pg"),
        "psql",
        "-XAtq",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-c",
        q,
      ]);
    start("pg", pgImage, ["-e", "POSTGRES_PASSWORD=" + password], "docker-entrypoint.sh", [
      "postgres",
      "-c",
      "shared_buffers=64MB",
      "-c",
      "max_wal_size=512MB",
    ]);
    await ready("pg", () =>
      docker(["exec", owned.get("pg"), "pg_isready", "-h", names.pg, "-U", "postgres"], {
        allowFail: true,
      })?.includes("accepting connections"),
    );
    start(
      "tx",
      image,
      [
        "-e",
        "DX_ERASE_PROPS=" + props,
        "-v",
        path.join(import.meta.dirname, "logback.xml") + ":/erase1-logback.xml:ro",
      ],
      "/bin/sh",
      [
        "-c",
        "set -eu; while [ ! -f /tmp/erase1.ready ]; do sleep 1; done; printenv DX_ERASE_PROPS > /tmp/erase1.properties; exec bin/transactor -Xms256m -Xmx704m -XX:ActiveProcessorCount=2 -Dlogback.configurationFile=/erase1-logback.xml /tmp/erase1.properties",
      ],
    );
    const peerPin = fs
      .readFileSync(path.join(REPO, "lab/config/datomic/SHA256SUMS"), "utf8")
      .match(/^([a-f0-9]{64})  peer-1\.0\.7745\.jar$/m)?.[1];
    assert(peerPin);
    const peerHash = docker([
      "exec",
      owned.get("tx"),
      "sha256sum",
      "/opt/datomic/peer-1.0.7745.jar",
    ]).split(/\s+/)[0];
    assert.equal(peerHash, peerPin);
    assert.equal(
      docker(["exec", owned.get("tx"), "sha256sum", "/erase1-logback.xml"]).split(/\s+/)[0],
      inputs.files[`${code}/logback.xml`],
    );
    sql(docker(["exec", owned.get("tx"), "cat", "/opt/datomic/bin/sql/postgres-table.sql"]));
    docker(["exec", owned.get("tx"), "touch", "/tmp/erase1.ready"]);
    const txReady = () =>
      docker(
        [
          "exec",
          owned.get("tx"),
          "bash",
          "-c",
          "(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready",
          "probe",
          names.tx,
        ],
        { allowFail: true },
      ) === "ready";
    await ready("tx", txReady);
    start(
      "gw",
      image,
      [
        "-v",
        path.join(REPO, "packages/datomic/gateway/src") + ":/opt/gateway/src:ro",
        "-v",
        path.join(REPO, "packages/datomic/src/codec-spec.json") +
          ":/opt/gateway/codec-spec.json:ro",
        "-v",
        import.meta.dirname + ":/erase1:ro",
        ...(mode === "ledger-parallel"
          ? ["-v", path.resolve(import.meta.dirname, "../wfix1") + ":/erase1-writer-check:ro"]
          : []),
        ...(archiveDir ? ["-v", archiveDir + ":/dx-archive"] : []),
        ...(profile
          ? [
              "-v",
              traceDir + ":/dx-trace",
              "-e",
              "TRIPLEX_TRACE_DIR=/dx-trace",
              ...Object.entries({
                ...traceEnv,
                TRIPLEX_TRACE_SLOT: info.slot,
                TRIPLEX_TRACE_PROCESS: "gateway",
              }).flatMap(([k, v]) => ["-e", k + "=" + v]),
            ]
          : []),
        ...(mode.startsWith("ledger-") || mode.startsWith("fast") || mode === "guard-prepared-smoke"
          ? ["-v", "/dx-authority", "-e", "TRIPLEX_ERASURE_DIRECTORY=/dx-authority"]
          : []),
        ...(mode.startsWith("fast") ? ["-e", "TRIPLEX_ERASURE_SHRED_GRACE_MS=0"] : []),
        "-p",
        new URL(endpoint).hostname + ":" + info.port + ":8080",
        "-e",
        "DATOMIC_URI_TEMPLATE=" + uri,
        "-e",
        "GATEWAY_SOURCE_SHA256=" + gateway,
        ...(subjectWriter !== undefined
          ? ["-e", "TX2_SUBJECT_SAVE=" + subjectWriter, "-e", "TX2_INT1_WRITE_READBACK=1"]
          : []),
        ...(orderedIds ? ["-e", "TX2_SUBJECT_NUMERIC_OWNER=1", "-e", "TX2_SUBJECT_ORDERED_IDS=1"] : []),
        "-e",
        "DX_ERASE_TOKEN=" + token,
        "-e",
        "DX_ERASE_NONCE=" + nonce,
        "-e",
        "DATOMIC_EXT_CLASSPATH=/opt/gateway/src:/erase1",
        "-e",
        "DATOMIC_JAVA_OPTS=-Xms192m -Xmx736m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=96m",
      ],
      "/opt/datomic/bin/run",
      ["-m", "erase1", "gateway"],
    );
    const gatewayReady = async () => {
      const r = await fetch(endpoint + "/health", { signal: AbortSignal.timeout(2000) }).catch(
        () => null,
      );
      if (!r?.ok) return false;
      assert.deepEqual(await r.json(), { datomicVersion: "1.0.7745", gatewaySourceHash: gateway });
      return true;
    };
    await ready("gw", gatewayReady);
    const mounted = docker([
      "exec",
      owned.get("gw"),
      "sha256sum",
      "/erase1/erase1.clj",
      "/opt/gateway/codec-spec.json",
    ]).split("\n");
    assert.equal(mounted[0].split(" ")[0], inputs.files[`${code}/erase1.clj`]);
    assert.equal(mounted[1].split(" ")[0], inputs.codec);
    const actualGateway = docker([
      "exec",
      owned.get("gw"),
      "find",
      "/opt/gateway/src",
      "-type",
      "f",
      "-exec",
      "sha256sum",
      "{}",
      "+",
    ])
      .split("\n")
      .map((line) => {
        const [hash, file] = line.split(/\s+/);
        return [file.replace("/opt/gateway/", ""), hash];
      })
      .sort();
    assert.deepEqual(
      actualGateway,
      inputs.gateway
        .filter((f) => f.path.startsWith("src/"))
        .map((f) => [f.path, f.sha256])
        .sort(),
    );
    assert.equal(
      sql(
        "SELECT current_setting('fsync'), current_setting('synchronous_commit'), current_setting('server_version_num')::int / 10000",
      ),
      "on|on|17",
    );
    run = {
      nonce,
      mode,
      people,
      caps,
      slot: info.slot,
      images: { image, pgImage },
      peerHash,
      pinnedImage: config.lanes.datomic.imageId,
      gateway,
      ownerHash: sha256File(info.ownerFile),
      containers: Object.fromEntries(owned),
      sourceHash: sha256(JSON.stringify(inputs)),
      freeBytes: diskFloor(),
      host: "mac-vm",
      timing: "diagnostic",
      guardComparison: mode === "guard-prepared-smoke",
    };
    run.binding = sha256(JSON.stringify(run));
    write("native", run);
    child = fork(path.join(import.meta.dirname, "run.ts"), [dir], {
      execArgv: ["--experimental-transform-types", "--max-old-space-size=1024"],
      env: {
        ...process.env,
        DATOMIC_URL: endpoint,
        TRIPLEX_DATOMIC_LAYOUT: "lean",
        TX2_W0_POINT_JOURNAL: "1",
        DX_ERASE_TOKEN: token,
        ...(profile
          ? {
              ...traceEnv,
              TRIPLEX_TRACE_DIR: traceDir,
              TRIPLEX_TRACE_SLOT: info.slot,
              TRIPLEX_TRACE_PROCESS: "client",
            }
          : {}),
        // [DX-ERASE1] Why: local gates share the Mac under one ordinary heavy token.
        // Rejected: serializing other work to make diagnostic timings resemble the server.
        DX_ERASE_MEASURE: "",
      },
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
    abort.signal.addEventListener("abort", () => child.kill("SIGTERM"), { once: true });
    if (abort.signal.aborted) child.kill("SIGTERM");
    child.on("message", async (msg) => {
      try {
        assert.equal(msg.binding, run.binding);
        let result;
        if (msg.op === "guard") {
          result = { free: diskFloor(), vmFree: vmDisk(config).availableBytes };
          assert(result.vmFree >= 4 * GiB, "VM disk below 4 GiB");
        } else if (msg.op === "sql") result = sql(msg.sql);
        else if (msg.op === "fresh")
          result = docker(
            [
              "exec",
              "-i",
              "-e",
              "DATOMIC_JAVA_OPTS=-Xms64m -Xmx224m -XX:ActiveProcessorCount=1 -Ddatomic.objectCacheMax=32m",
              owned.get("gw"),
              "bin/run",
              "-m",
              "erase1",
              "fresh",
            ],
            { input: JSON.stringify(msg.plan) },
          );
        else if (msg.op === "archive") {
          // [DX-ERASE1] Why: preserve a real pre-erasure data backup inside the owned stack.
          // Rejected: constructing a replacement assertion as a stand-in for restore (it loses original history and IDs).
          assert.equal(
            msg.scope,
            JSON.stringify(["triplex-scope-v1", "test", "test", `erase1-${nonce}`, 0]),
          );
          assert(archiveDir && ["backup", "restore"].includes(msg.action));
          const db = "s2-" + Buffer.from(msg.scope).toString("base64url");
          const uriCommand =
            'uri=$(printf %s "$DATOMIC_URI_TEMPLATE" | sed "s/{db}/$DX_ERASE_DB/"); ';
          if (msg.action === "backup") {
            result = docker([
              "exec",
              "-e",
              "DX_ERASE_DB=" + db,
              owned.get("gw"),
              "sh",
              "-ceu",
              uriCommand +
                'exec bin/datomic -Xms64m -Xmx224m backup-db "$uri" file:/dx-archive/data',
            ]);
          } else {
            // [DX-ERASE1] Why: PostgreSQL restores require the old Datomic peers and transactor down.
            // Rejected: an in-place restore while their cache and indexing jobs can still write.
            for (const role of ["gw", "tx"]) {
              const id = owned.get(role);
              assert(inspect(id).Config.Labels[label] === nonce);
              docker(["stop", "--time", "12", id]);
              assert(!inspect(id).State.Running);
            }
            start(
              "restore",
              image,
              [
                "-e",
                "DATOMIC_URI_TEMPLATE=" + uri,
                "-e",
                "DX_ERASE_DB=" + db,
                "-v",
                archiveDir + ":/dx-archive:ro",
              ],
              "sh",
              [
                "-ceu",
                uriCommand +
                  'exec bin/datomic -Xms96m -Xmx800m restore-db file:/dx-archive/data "$uri"',
              ],
              caps.gw,
            );
            const id = owned.get("restore");
            const exit = docker(["wait", id]);
            result = docker(["logs", id]);
            write("archive-restore", {
              id,
              code: Number(exit),
              scope: msg.scope,
              binding: run.binding,
            });
            assert.equal(exit, "0");
            docker(["start", owned.get("tx")]);
            await ready("tx", txReady);
            docker(["start", owned.get("gw")]);
            await ready("gw", gatewayReady);
          }
        } else throw Error("Unknown owned-stack operation");
        child.send({ id: msg.id, result });
      } catch (err) {
        child.send({ id: msg.id, error: String(err) });
      }
    });
    const exit = await new Promise((ok, fail) => {
      child.once("error", fail);
      child.once("exit", (code, signal) => ok({ code, signal }));
    });
    write("driver-exit", exit);
    assert.deepEqual(bindingInputs(manager), inputs, "Measured source drifted");
    assert.deepEqual(exit, { code: 0, signal: null });
  } finally {
    const cleanup = {
      nonce,
      slot: info?.slot,
      removedContainers: [],
      removedVolumes: [],
      removedNetwork: false,
      released: false,
      errors: [],
    };
    function attempt(fn) {
      try {
        fn();
      } catch (e) {
        cleanup.errors.push(String(e));
      }
    }
    for (const [role, id] of [...owned].reverse())
      attempt(() => {
        const m = inspect(id);
        if (!m) return;
        assert.equal(m.Config.Labels[label], nonce);
        write(`exit-${role}`, {
          id,
          running: m.State.Running,
          code: m.State.ExitCode,
          oom: m.State.OOMKilled,
        });
        const logs = spawnSync("docker", dockerArgs(["logs", "--tail", "18000", id]), {
          encoding: "utf8",
          maxBuffer: 64 * MiB,
          timeout: 10000,
        });
        if (logs.status === 0)
          fs.writeFileSync(path.join(dir, `${role}.log`), logs.stdout + logs.stderr, {
            flag: "wx",
          });
        docker(["rm", "-fv", id]);
        assert.equal(inspect(id), null);
        cleanup.removedContainers.push(id);
      });
    for (const vol of volumes)
      attempt(() => {
        assert.equal(docker(["volume", "inspect", vol], { allowFail: true }), null);
        cleanup.removedVolumes.push(vol);
      });
    if (network)
      attempt(() => {
        assert.equal(JSON.parse(docker(["network", "inspect", network]))[0].Labels[label], nonce);
        docker(["network", "rm", network]);
        cleanup.removedNetwork = true;
      });
    if (info && cleanup.errors.length === 0)
      await withPool((ledger) => {
        assert.equal(readOwner(info)?.experiment, nonce);
        ledger.reservations = ledger.reservations.filter(
          (r) => !Object.values(names).includes(r.container),
        );
        manager.releaseSlot(info);
        cleanup.released = true;
      });
    write("cleanup", cleanup);
    assert.deepEqual(cleanup.errors, []);
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
