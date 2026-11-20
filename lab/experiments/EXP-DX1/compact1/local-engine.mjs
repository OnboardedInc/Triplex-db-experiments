// @ts-nocheck -- [EXP-CHECKJS] Runtime-checked reservation records and untyped native tool output.
// [DX-COMPACT1] Why: reserve the three live processes against one exclusive lab slot.
// Rejected: attaching a retained volume or running an unbudgeted Docker stack.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  DOCKER_HOST, GiB, REPO, admission, docker, dockerArgs, git, inspect, listTx2Containers,
  readOwner, sha256, sleep, slotInfo, vmDisk, withPool,
} from "../../../bin/lib.mjs";

const holder = "DX-COMPACT1";
const mounts = "/compact";
const MiB = 1024 ** 2;
const caps = { pg: 320, tx: 896, peer: 896 };

function capture(args, file, signal) {
  const fd = fs.openSync(file, "wx");
  return new Promise((resolve, reject) => {
    const child = spawn("docker", dockerArgs(args), { stdio: ["ignore", fd, fd], signal });
    fs.closeSync(fd);
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(Error(`Docker command exited ${code}; see ${path.basename(file)}`)));
  });
}

function copySources(dir, phase, tree = REPO) {
  const sources = {};
  const copy = (relative, target) => {
    const from = path.join(tree, relative);
    if (fs.statSync(from).isDirectory()) {
      for (const name of fs.readdirSync(from).sort()) copy(path.join(relative, name), path.join(target, name));
      return;
    }
    const bytes = fs.readFileSync(from);
    const to = path.join(dir, "source", target);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, bytes, { flag: "wx" });
    sources[target] = sha256(bytes);
  };
  const experiment = path.relative(REPO, import.meta.dirname);
  if (phase === "floor") copy(path.join(experiment, "src/triplex/compact/floor.clj"), "src/triplex/compact/floor.clj");
  else copy(path.join(experiment, "src"), "src");
  copy(path.join(experiment, "logback.xml"), "logback.xml");
  copy(path.join(experiment, "local-engine.mjs"), "local-engine.mjs");
  copy("lab/bin/engine.mjs", "engine.mjs");
  if (phase !== "floor") {
    copy("packages/datomic/gateway/src", "src");
    copy("packages/datomic/src/codec-spec.json", "codec-spec.json");
    copy("lab/world/W0/schema.json", "schema.json");
    if (phase === "prototype" || phase === "surface") {
      copy("lab/world/W0/cases", "cases");
      for (const name of ["client.ts", "sdk-check.ts", "gate.ts"]) copy(path.join(experiment, name), name);
      // [DX-COMPACT1] Why: run Python against the same immutable source input as both readers.
      // Rejected: hashing the current checkout's oracle only after it has run.
      for (const relative of ["lab/bench/lib/w0-oracle.py", "lab/oracles/domain/w0.py",
        "lab/oracles/domain/jsontok.py", "lab/world/W0/releases"]) copy(relative, relative);
    }
  }
  return sources;
}

function pinnedSources(dir, phase, commit) {
  // [DX-COMPACT1] Why: an admitted attempt must use the named revision even if the worktree advanced while queued.
  // Rejected: attaching the current working tree after a long semaphore wait.
  const tree = fs.mkdtempSync(path.join(dir, "stage-"));
  try {
    const args = ["archive", "--format=tar", commit, path.relative(REPO, import.meta.dirname), "lab/bin/engine.mjs"];
    if (phase !== "floor") args.push("packages/datomic/gateway/src", "packages/datomic/src/codec-spec.json", "lab/world/W0");
    if (phase === "prototype" || phase === "surface") args.push("lab/bench/lib/w0-oracle.py", "lab/oracles/domain/w0.py", "lab/oracles/domain/jsontok.py");
    const archive = spawnSync("git", args, { cwd: REPO, maxBuffer: 32 * MiB });
    assert.equal(archive.status, 0, archive.stderr?.toString());
    const unpack = spawnSync("tar", ["-xf", "-", "-C", tree], { input: archive.stdout });
    assert.equal(unpack.status, 0, unpack.stderr?.toString());
    return copySources(dir, phase, tree);
  } finally {
    fs.rmSync(tree, { recursive: true, force: true });
  }
}

async function measureLock(root, prefix, signal) {
  const dir = path.join(root, "locks", "measure");
  let told = 0;
  for (;;) {
    signal.throwIfAborted();
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify({
        id: holder, pid: process.pid, prefix, kind: "compact-probe", at: new Date().toISOString(),
      }) + "\n", { flag: "wx" });
      return () => {
        const owner = JSON.parse(fs.readFileSync(path.join(dir, "owner.json"), "utf8"));
        assert.equal(owner.prefix, prefix);
        fs.rmSync(dir, { recursive: true });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() - told > 30000) {
        console.log("[compact] waiting for the lab measurement window");
        told = Date.now();
      }
      await sleep(5000);
    }
  }
}

export async function runCompactProbe(opts, config, manager) {
  assert.equal(process.platform, "darwin");
  assert.equal(opts.holder, holder);
  assert.equal(dockerArgs([])[1], DOCKER_HOST);
  assert(!process.env.DOCKER_HOST || process.env.DOCKER_HOST === DOCKER_HOST);
  const phase = opts.run;
  const profile = opts.profile ?? "baseline";
  const loadPeople = Number(opts.people ?? "2000");
  assert(["floor", "layout", "prototype", "benchmark", "load", "surface", "history"].includes(phase));
  assert(["baseline", "large-index", "parallel-index"].includes(profile));
  assert(opts.people === undefined || (phase === "load" && [2000, 100000].includes(loadPeople)));
  assert.match(opts.out ?? "", /^[a-z0-9][a-z0-9-]{1,49}$/);
  const imageRef = opts.image ?? config.lanes.datomic.image;
  assert.match(imageRef, /^tx2-datomic:[a-z0-9][a-z0-9.-]{0,63}$/);
  const root = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2");
  const parent = path.join(root, "evidence", holder);
  fs.mkdirSync(parent, { recursive: true });
  const dir = path.join(parent, opts.out);
  fs.mkdirSync(dir);
  const write = (file, data) => fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  assert(!opts.source || /^[a-f0-9]{40}$/.test(opts.source));
  const sourceCommit = git(["rev-parse", "--verify", (opts.source ?? "HEAD") + "^{commit}"]);
  const sources = pinnedSources(dir, phase, sourceCommit);
  const sourceHash = sha256(JSON.stringify(sources));
  const attempt = randomUUID();
  const prefix = "tx2-dxcompact-" + attempt.slice(0, 12);
  const reserved = Object.keys(caps).map((role) => prefix + "-" + role);
  const created = new Map();
  const volumes = new Set();
  const abort = new AbortController();
  const onSignal = () => abort.abort(Error("interrupted"));
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  let slot, net, releaseMeasure, deadline;
  const floor = () => {
    const stat = fs.statfsSync(dir);
    assert(stat.bavail * stat.bsize >= 5 * GiB, "host disk free below 5 GiB");
  };
  const assertOwned = (id) => {
    const current = inspect(id);
    assert(current?.Id === id && current.Config.Labels["compact.attempt"] === attempt);
    return current;
  };
  const label = ["--label", "compact.attempt=" + attempt, "--label", "tx2.holder=" + holder];
  try {
    while (!slot) {
      abort.signal.throwIfAborted();
      floor();
      releaseMeasure = await measureLock(root, prefix, abort.signal);
      try {
        await withPool((ledger) => {
          manager.assertMeasureAdmission(holder);
          const live = listTx2Containers({ all: true });
          const candidate = ["s1", "s2", "s3"].map((key) => slotInfo(config, "datomic", key))
            .find((info) => !fs.existsSync(info.lockDir) && !live.some((row) => row.name === info.container));
          if (!candidate) return;
          const diskForecastBytes = (phase === "load" && loadPeople === 100000 ? 4 : phase === "load" ? 2 : 1) * GiB;
          const allowed = admission({
            config: { ...config, pool: { ...config.pool, memLimitBytes: Math.min(15 * GiB, config.pool.memLimitBytes) } },
            reservations: ledger.reservations, running: live, diskUsedBytes: vmDisk(config).usedBytes,
            request: { container: prefix, memBytes: Object.values(caps).reduce((a, b) => a + b) * MiB, diskForecastBytes },
          });
          if (!allowed.ok) return;
          assert(manager.acquireSlot(candidate, holder, prefix).created);
          slot = candidate;
          for (const [role, memory] of Object.entries(caps)) ledger.reservations.push({
            container: prefix + "-" + role, lane: "datomic", slot: slot.slot, holder,
            pid: process.pid, state: "compact-probe", cpus: 2, memBytes: memory * MiB,
            diskForecastBytes: role === "pg" ? diskForecastBytes : 0,
          });
        });
      } catch (error) {
        if (error.code !== "REFUSED") throw error;
      }
      if (!slot) {
        releaseMeasure();
        releaseMeasure = undefined;
        console.log("[compact] waiting for a pool-admitted exclusive Datomic slot");
        await sleep(5000);
      }
    }

    deadline = setTimeout(() => abort.abort(Error("measurement window expired")), 14 * 60 * 1000);
    floor();
    const image = (reference) => docker(["image", "inspect", "--format", "{{.Id}}", reference]);
    // [DX-COMPACT1] Why: a retagged build may still contain the verified native distribution.
    // Rejected: launching a mutable tag or rebuilding a shared image to match an old gateway hash.
    const datomicImage = image(imageRef);
    const peerSha1 = JSON.parse(fs.readFileSync(path.join(REPO, "lab/config/datomic/verification.json"))).peerSha1;
    const pgImage = image("postgres:17-alpine");
    const password = randomBytes(24).toString("hex");
    const pg = prefix + "-pg", tx = prefix + "-tx";
    const jdbc = "jdbc:postgresql://" + pg + "/postgres";
    const source = path.join(dir, "source");
    const run = (role, img, extra, entry, argv) => {
      abort.signal.throwIfAborted();
      const memory = caps[role] * MiB;
      const id = docker(["create", "--pull", "never", "--name", prefix + "-" + role, ...label,
        "--network", net, "--cpus", "2", "--memory", String(memory), "--memory-swap", String(memory),
        "--ulimit", "core=0", ...extra, "--entrypoint", entry, img, ...argv]);
      created.set(role, id);
      const actual = assertOwned(id);
      assert.equal(actual.Image, img);
      assert.equal(actual.HostConfig.Memory, memory);
      assert.equal(actual.HostConfig.MemorySwap, memory);
      assert(!Object.keys(actual.HostConfig.PortBindings ?? {}).length);
      for (const mount of actual.Mounts) {
        if (mount.Type === "volume") volumes.add(mount.Name);
        else assert(mount.Source === source && mount.Destination === mounts && !mount.RW);
      }
      docker(["start", id]);
      return id;
    };
    async function ready(id, check) {
      for (let i = 0; i < 120; i++) {
        abort.signal.throwIfAborted();
        assert(assertOwned(id).State.Running, "owned process stopped during startup");
        if (check()) return;
        await sleep(1000);
      }
      throw Error("owned process startup timed out");
    }
    net = docker(["network", "create", "--internal", ...label, prefix]);
    const pgId = run("pg", pgImage, ["-e", "POSTGRES_PASSWORD=" + password], "docker-entrypoint.sh", [
      "postgres", "-c", "shared_buffers=48MB", "-c", "track_wal_io_timing=on",
    ]);
    const sql = (query) => docker(["exec", pgId, "psql", "-XAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-c", query]);
    await ready(pgId, () => docker(["exec", pgId, "pg_isready", "-h", pg, "-U", "postgres"], { allowFail: true })?.includes("accepting connections"));
    const threshold = profile === "large-index" ? "64m" : "32m";
    const indexParallelism = profile === "parallel-index" ? 2 : 1;
    const settings = { threshold, indexParallelism, max: "96m", cache: "64m" };
    const props = [
      "protocol=sql", "host=" + tx, "port=4334",
      "sql-url=" + jdbc, "sql-driver-class=org.postgresql.Driver", "sql-user=postgres",
      "sql-password=" + password, "memory-index-threshold=" + threshold,
      "memory-index-max=" + settings.max, "object-cache-max=" + settings.cache,
      "index-parallelism=" + indexParallelism,
    ].join("\n");
    const mounted = ["-v", source + ":" + mounts + ":ro", "-e", "DATOMIC_EXT_CLASSPATH=/compact/src"];
    const txId = run("tx", datomicImage, [...mounted, "-e", "COMPACT_PROPERTIES=" + props,
      "-e", "JAVA_OPTS=-Xms128m -Xmx512m -XX:ActiveProcessorCount=2 -Dlogback.configurationFile=/compact/logback.xml"],
    "/bin/sh", ["-ceu", 'while [ ! -f /tmp/compact.ready ]; do sleep 1; done; printenv COMPACT_PROPERTIES > /tmp/compact.properties; exec /opt/datomic/bin/transactor /tmp/compact.properties']);
    const jars = docker(["exec", txId, "bash", "-ceu", "cd /opt/datomic; find . -name '*1.0.7745.jar' -print0 | sort -z | xargs -0 sha256sum"]);
    const readPeerSha1 = docker(["exec", txId, "bash", "-ceu", "cd /opt/datomic; find . -name 'peer-1.0.7745.jar' -print0 | xargs -0 sha1sum"]);
    assert.equal(readPeerSha1.split(/\s+/)[0], peerSha1);
    assert.match(jars, /datomic-transactor-pro-1\.0\.7745\.jar/);
    sql(docker(["exec", txId, "cat", "/opt/datomic/bin/sql/postgres-table.sql"]));
    docker(["exec", txId, "touch", "/tmp/compact.ready"]);
    await ready(txId, () => docker(["exec", txId, "bash", "-c", '(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready', "probe", tx], { allowFail: true }) === "ready");
    const durable = sql("select current_setting('fsync'), current_setting('synchronous_commit'), current_setting('full_page_writes'), current_setting('wal_sync_method')").split("|");
    assert.deepEqual(durable.slice(0, 3), ["on", "on", "on"]);
    const peerId = run("peer", datomicImage, [...mounted,
      "-e", "DATOMIC_JAVA_OPTS=-Xms128m -Xmx544m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=96m -Dtriplex.codec.spec=/compact/codec-spec.json -Dlogback.configurationFile=/compact/logback.xml",
      "-e", "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?" + jdbc + "?user=postgres&password=" + password,
      "-e", "COMPACT_JDBC=" + jdbc, "-e", "COMPACT_SQL_PASSWORD=" + password, "-e", "COMPACT_ATTEMPT=" + attempt,
      "-e", "COMPACT_SOURCE=" + sourceHash, "-e", "COMPACT_PROFILE=" + profile,
      "-e", "TX2_GROUP_COMMIT=1",
    ], "/bin/sleep", ["infinity"]);
    // [DX-COMPACT1] Why: compare exact file membership and bytes independently of the VM's collation.
    // Rejected: comparing a locale-sorted text listing to JavaScript's code-unit order.
    const listing = docker(["exec", peerId, "bash", "-ceu", "cd /compact; find . -type f -print0 | xargs -0 sha256sum"]);
    const boundFiles = new Map();
    for (const line of listing.split("\n")) {
      const entry = /^([a-f0-9]{64})  \.\/(.+)$/.exec(line);
      assert(entry && !boundFiles.has(entry[2]), "invalid mounted file listing");
      boundFiles.set(entry[2], entry[1]);
    }
    assert.deepEqual(boundFiles, new Map(Object.entries(sources)));
    const binding = {
      attempt, prefix, phase, profile, slot: slot.slot, source: sourceCommit, sourceHash, sources,
      ...(phase === "load" ? { loadPeople } : {}),
      image: datomicImage, pgImage, jars, peerSha1, durability: durable, roles: Object.fromEntries(created), caps, settings,
      owner: sha256(fs.readFileSync(slot.ownerFile)), startedAt: new Date().toISOString(),
    };
    write("binding.json", binding);
    const namespace = ["floor", "surface", "history"].includes(phase) ? "triplex.compact." + phase : "triplex.compact.probe";
    const invoke = (step, file, args = []) =>
      capture(["exec", peerId, "/opt/datomic/bin/run", "-m", namespace, step, ...args], path.join(dir, file), abort.signal);
    if (phase === "history") {
      await invoke("seed", "probe.log");
      for (const mode of ["current", "pinned"]) {
        for (const strategy of ["chain", "checkpoint"]) {
          await invoke("sample", `history-${mode}-${strategy}.log`, [strategy, mode]);
        }
      }
    } else if (phase !== "prototype") await invoke(phase, "probe.log", phase === "load" ? [String(loadPeople)] : []);
    else {
      // [DX-COMPACT1] Why: an independent probe can still produce useful evidence after another probe fails.
      // Rejected: losing the capacity and read measurements after a semantic failure, or mixing concurrent timed arms.
      const steps = {};
      const collect = async (name, f) => {
        abort.signal.throwIfAborted();
        try { await f(); steps[name] = "completed"; }
        catch (error) { steps[name] = String(error); }
      };
      await collect("oracle", () => invoke("oracle", "probe.log"));
      if (steps.oracle === "completed") await collect("recovery", () => invoke("recovery", "recovery.log"));
      await collect("benchmark", () => invoke("benchmark", "benchmark.log"));
      await collect("sdk", async () => {
        const { checkSdk } = await import(pathToFileURL(path.join(source, "sdk-check.ts")).href);
        const fd = fs.openSync(path.join(dir, "sdk-stderr.log"), "wx");
        const rpc = spawn("docker", dockerArgs(["exec", "-i", peerId, "/opt/datomic/bin/run", "-m", "triplex.compact.rpc"]), {
          stdio: ["pipe", "pipe", fd], signal: abort.signal,
        });
        fs.closeSync(fd);
        write("sdk.json", await checkSdk(rpc, binding));
      });
      await collect("load", () => invoke("load", "load.log"));
      write("steps.json", steps);
      assert(Object.values(steps).every((step) => step === "completed"), "one or more independent prototype probes failed");
    }
  } finally {
    clearTimeout(deadline);
    try {
      for (const [role, id] of [...created].reverse()) {
        assertOwned(id);
        if (role !== "peer") await capture(["logs", id], path.join(dir, role + ".log")).catch(() => {});
        docker(["rm", "-fv", id]);
        assert(!inspect(id));
      }
      for (const name of volumes) assert(!docker(["volume", "inspect", name], { allowFail: true }), "owned volume remains");
      if (net) {
        assert.equal(JSON.parse(docker(["network", "inspect", net]))[0].Labels["compact.attempt"], attempt);
        docker(["network", "rm", net]);
        assert(!docker(["network", "inspect", net], { allowFail: true }));
      }
      if (slot) await withPool((ledger) => {
        assert.equal(readOwner(slot)?.holder, holder);
        assert.equal(readOwner(slot)?.pid, process.pid);
        ledger.reservations = ledger.reservations.filter((entry) => !reserved.includes(entry.container));
        manager.releaseSlot(slot);
      });
      write("cleanup.json", { attempt, rolesRemoved: created.size, volumesRemoved: volumes.size, slotReleased: slot?.slot ?? null });
    } finally {
      releaseMeasure?.();
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
    }
  }
}
