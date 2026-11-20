// @ts-nocheck -- [EXP-CHECKJS] Docker inspection and lab reservation records are validated at runtime.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import {
  DOCKER_HOST, GiB, LOCKS, REPO, admission, docker, dockerArgs, git, inspect,
  listTx2Containers, readOwner, sha256, sleep, slotInfo, vmDisk, withPool,
} from "../../../bin/lib.mjs";

const experiment = "lab/experiments/EXP-DX1/age1";
const holder = "DX-AGE1";
const MiB = 1024 ** 2;
const evidence = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence", holder);
const eraseSource = "d0ccf312373141d0d919cc17e18a5989e60b74ce";

function hashTree(dir, relative = "") {
  return fs.readdirSync(path.join(dir, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((f) => {
      const name = path.posix.join(relative, f.name);
      if (f.isDirectory()) return hashTree(dir, name);
      assert(f.isFile(), "source input must be a regular file");
      return [[name, sha256(fs.readFileSync(path.join(dir, name)))]];
    });
}

function stage(dir, revision, erasure) {
  const source = path.join(dir, "source");
  fs.mkdirSync(source);
  // [DX-AGE1] Why: the merged engine loads the JVM policy before admitting an AGE1 slot.
  // Rejected: binding only the top-level engine file while using different launch-policy bytes.
  const provisioner = ["lab/bin/engine.mjs", "lab/bin/lib.mjs", "lab/bin/heavy.mjs", "lab/bin/heavy-lock.mjs",
    "lab/config/datomic/runtime.mjs", "lab/experiments/EXP-DX1/jvm1/launch.mjs"];
  const inputs = [experiment, ...provisioner,
    "lab/config/datomic/verification.json", "packages/datomic/gateway", "packages/datomic/src/codec-spec.json"];
  const archive = execFileSync("git", ["archive", revision, ...inputs], { cwd: REPO, maxBuffer: 16 * MiB });
  execFileSync("tar", ["-xf", "-", "-C", source], { input: archive });
  if (erasure) {
    const privateModules = ["envelope", "erase", "privacy"].map((s) =>
      "packages/datomic/gateway/src/triplex/gateway/" + s + ".clj");
    const sourceBytes = execFileSync("git", ["archive", eraseSource, ...privateModules], { cwd: REPO });
    execFileSync("tar", ["-xf", "-", "-C", source], { input: sourceBytes });
  }
  for (const file of [path.join(experiment, "local.mjs"), ...provisioner])
    assert.equal(sha256(fs.readFileSync(path.join(REPO, file))), sha256(fs.readFileSync(path.join(source, file))), "running launcher differs from its source pin");
  return source;
}

function capture(args, file, signal) {
  const fd = fs.openSync(file, "wx");
  return new Promise((resolve, reject) => {
    const child = spawn("docker", dockerArgs(args), { stdio: ["ignore", fd, fd], signal });
    fs.closeSync(fd);
    let spawnError;
    child.once("error", (error) => { spawnError = error; });
    child.once("close", (code) => code === 0 && !spawnError ? resolve() : reject(spawnError ?? Error("Native child exited " + code)));
  });
}

async function fixturePort(peer) {
  // [DX-AGE1] Why: route only the small SDK loader through the peer's loopback socket.
  // Rejected: publishing a gateway from the lab's isolated Docker network.
  const sockets = new Set();
  const proxy = createServer((socket) => {
    sockets.add(socket);
    const child = spawn("docker", dockerArgs(["exec", "-i", peer, "bash", "-ceu",
      'exec 3<>/dev/tcp/localhost/8080; cat <&3 & reader=$!; trap "kill $reader 2>/dev/null || true" EXIT; cat >&3']),
    { stdio: ["pipe", "pipe", "ignore"] });
    socket.pipe(child.stdin);
    child.stdout.pipe(socket);
    socket.on("error", () => child.kill());
    child.stdin.on("error", () => socket.destroy());
    child.on("error", () => socket.destroy());
    child.on("close", () => socket.destroy());
    socket.on("close", () => { sockets.delete(socket); child.stdin.end(); });
  });
  await new Promise((resolve, reject) => {
    proxy.once("error", reject);
    proxy.listen(0, "localhost", resolve);
  });
  const port = proxy.address().port;
  assert(![15442, 17019].includes(port));
  return {
    url: "http://localhost:" + port,
    close: () => { for (const s of sockets) s.destroy(); proxy.close(); },
  };
}

export async function local(opts, config, manager) {
  assert.equal(process.platform, "darwin");
  assert.equal(opts.holder, holder);
  assert.equal(dockerArgs([])[1], DOCKER_HOST);
  const image = (ref) => docker(["image", "inspect", "--format", "{{.Id}}", ref]);
  const selectImage = () => {
    // [DX-AGE1] Why: use the read-back build record when the lab rotates the Datomic image.
    // Rejected: pulling or rebuilding a shared image for a read-only source mount.
    const builds = fs.readFileSync(path.join(LOCKS, "events.jsonl"), "utf8").trim().split("\n")
      .map((line) => JSON.parse(line)).filter((e) => e.event === "datomic-build").reverse();
    const pinned = [config.lanes.datomic, ...builds].find(({ imageId, buildInputsSha256 }) => {
      const readback = docker(["image", "inspect", "--format", '{{.Id}} {{index .Config.Labels "tx2.build-inputs-sha256"}}',
        imageId], { allowFail: true });
      return readback === imageId + " " + buildInputsSha256 && (!opts.image || opts.image === imageId);
    });
    assert(pinned, "Locally present, recorded Datomic build required");
    return pinned.imageId;
  };
  if (opts["check-images"]) {
    console.log(JSON.stringify({ datomic: image(selectImage()), postgres: image("postgres:17-alpine") }));
    return;
  }
  assert.match(opts.out ?? "", /^[a-z0-9][a-z0-9-]{1,49}$/);
  assert.match(opts.run ?? "", /^(fidelity|adopted-fidelity|fidelity-arms|fidelity-arms-load|successor|erased-successor|native-suite)$/);
  const adopting = opts.run === "adopted-fidelity";
  const erasure = opts.run === "erased-successor";
  const caps = adopting ? { pg: 384, tx: 896, peer: 1280, clone: 896 } : { pg: 384, tx: 1024, peer: 1280 };
  const heavy = path.join(LOCKS, "heavy");
  const tokens = fs.readdirSync(heavy).filter((name) => /^\d+$/.test(name)).flatMap((name) => {
    try {
      const token = JSON.parse(fs.readFileSync(path.join(heavy, name, "owner.json"), "utf8"));
      return token.pid === process.ppid ? [token] : [];
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return [];
    }
  });
  // [DX-AGE1] Why: a correctness gate needs one ordinary heavy token.
  // Rejected: reserving every token to collect Mac timings that are diagnostic.
  assert.equal(tokens.length, 1, "Run each small gate under one ordinary heavy token");
  assert.equal(tokens[0].label, holder);
  const revision = git(["rev-parse", "HEAD"]);
  const pin = opts.source ?? revision;
  assert.match(pin, /^[0-9a-f]{40}$/);
  const attempt = randomUUID(), prefix = "tx2-dxage-" + attempt.slice(0, 12);
  const dir = path.join(evidence, opts.out);
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(dir);
  const created = new Map(), volumes = new Set();
  const names = Object.fromEntries(Object.keys(caps).map((r) => [r, prefix + "-" + r]));
  const labels = ["--label", "age.attempt=" + attempt, "--label", "tx2.holder=" + holder];
  const controller = new AbortController();
  const stop = () => controller.abort(new Error("Interrupted"));
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  let slot, net, deadline, watch;
  const write = (file, body) => fs.writeFileSync(path.join(dir, file), JSON.stringify(body, null, 2) + "\n", { flag: "wx" });
  const forecast = GiB;
  const floor = () => {
    const stats = fs.statfsSync(dir);
    assert(stats.bavail * stats.bsize >= 5 * GiB, "Host disk is below the 5 GiB floor");
  };
  const owned = (id) => {
    const meta = inspect(id);
    assert(meta?.Id === id && meta.Config.Labels["age.attempt"] === attempt, "Container ownership changed");
    return meta;
  };
  try {
    floor();
    const datomic = image(selectImage()), postgres = image("postgres:17-alpine");
    const source = stage(dir, pin, erasure);
    const sources = new Map(hashTree(source));
    const slotDeadline = Date.now() + 120000;
    while (!slot) {
      controller.signal.throwIfAborted();
      floor();
      await withPool((ledger) => {
        manager.assertMeasureAdmission(holder);
        const live = listTx2Containers({ all: true });
        const candidate = ["s1", "s2", "s3"].map((key) => slotInfo(config, "datomic", key))
          .find((info) => !fs.existsSync(info.lockDir) && !live.some((row) => row.name === info.container));
        if (!candidate) return;
        const allowed = admission({
          config, reservations: ledger.reservations, running: live, diskUsedBytes: vmDisk(config).usedBytes,
          request: { container: prefix, memBytes: Object.values(caps).reduce((a, b) => a + b) * MiB, diskForecastBytes: forecast },
        });
        if (!allowed.ok) return;
        assert(manager.acquireSlot(candidate, holder, attempt).created);
        slot = candidate;
        for (const [role, memory] of Object.entries(caps)) ledger.reservations.push({
          container: names[role], lane: "datomic", slot: slot.slot, holder, pid: process.pid,
          state: "age1", cpus: 2, memBytes: memory * MiB, diskForecastBytes: role === "pg" ? forecast : 0,
        });
      });
      if (!slot) {
        assert(Date.now() < slotDeadline, "No Datomic correctness slot before deadline");
        console.log("[age1] waiting for a Datomic correctness slot");
        await sleep(15000);
      }
    }
    deadline = setTimeout(() => controller.abort(new Error("Correctness gate deadline reached")), 7 * 60 * 1000);
    watch = setInterval(() => {
      try { floor(); } catch (error) { controller.abort(error); }
    }, 5000);
    const run = (role, img, args, entry, argv) => {
      const mem = String(caps[role] * MiB);
      const id = docker(["create", "--pull", "never", "--name", names[role], ...labels,
        "--network", net, "--cpus", "2", "--memory", mem, "--memory-swap", mem,
        "--ulimit", "core=0", ...args, "--entrypoint", entry, img, ...argv]);
      created.set(role, id);
      const meta = owned(id);
      for (const mount of meta.Mounts) {
        if (mount.Type === "volume") volumes.add(mount.Name);
        else assert(mount.Source === source && mount.Destination === "/age" && !mount.RW, "Unexpected writable mount");
      }
      assert.equal(meta.Image, img);
      assert.equal(meta.HostConfig.Memory, Number(mem));
      assert.equal(meta.HostConfig.MemorySwap, Number(mem));
      assert.equal(meta.HostConfig.NanoCpus, 2e9);
      assert(!Object.keys(meta.HostConfig.PortBindings ?? {}).length);
      docker(["start", id]);
      return id;
    };
    async function ready(id, check) {
      for (let i = 0; i < 120; i++) {
        controller.signal.throwIfAborted();
        assert(owned(id).State.Running, "Owned process stopped during startup");
        if (check()) return;
        await sleep(1000);
      }
      throw Error("Owned process startup timed out");
    }
    net = docker(["network", "create", "--internal", ...labels, prefix]);
    const password = randomBytes(24).toString("hex"), jdbc = "jdbc:postgresql://" + names.pg + "/postgres";
    const pg = run("pg", postgres, ["-e", "POSTGRES_PASSWORD=" + password], "docker-entrypoint.sh",
      ["postgres", "-c", "shared_buffers=48MB", "-c", "max_wal_size=256MB", "-c", "track_wal_io_timing=on"]);
    const sql = (query, db = "postgres") => docker(["exec", pg, "psql", "-XAt", "-v", "ON_ERROR_STOP=1",
      "-U", "postgres", "-d", db, "-c", query]);
    await ready(pg, () => docker(["exec", pg, "pg_isready", "-h", names.pg, "-U", "postgres"], { allowFail: true })?.includes("accepting connections"));
    const settings = opts.run === "fidelity-arms-load"
      ? { "memory-index-threshold": "96m", "memory-index-max": "192m", "object-cache-max": "96m", "index-parallelism": 2 }
      : { "memory-index-threshold": "32m", "memory-index-max": "96m", "object-cache-max": "64m", "index-parallelism": 1 };
    const flags = ["TX2_SAVE_LEDGER=1", "TX2_SMALL_ROWS=1"];
    const logback = "/age/" + experiment + "/logback.xml";
    const classpath = "/age/packages/datomic/gateway/src:/age/" + experiment + "/src";
    const mounted = ["-v", source + ":/age:ro", "-e", "DATOMIC_EXT_CLASSPATH=" + classpath,
      ...flags.flatMap((flag) => ["-e", flag])];
    const transactor = (role, url) => {
      const props = { protocol: "sql", host: names[role], port: 4334, "sql-url": url,
        "sql-driver-class": "org.postgresql.Driver", "sql-user": "postgres", "sql-password": password, ...settings };
      return run(role, datomic, [...mounted, "-e", "AGE_PROPERTIES=" + Object.entries(props).map(([k, v]) => k + "=" + v).join("\n"),
        "-e", "JAVA_OPTS=-Xms128m -Xmx640m -XX:ActiveProcessorCount=2 -Dlogback.configurationFile=" + logback],
        "/bin/sh", ["-ceu", 'while [ ! -f /tmp/age.ready ]; do sleep 1; done; printenv AGE_PROPERTIES > /tmp/age.properties; exec /opt/datomic/bin/transactor /tmp/age.properties']);
    };
    const startTransactor = async (role, id) => {
      docker(["exec", id, "touch", "/tmp/age.ready"]);
      await ready(id, () => docker(["exec", id, "bash", "-c", '(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready',
        "probe", names[role]], { allowFail: true }) === "ready");
    };
    const tx = transactor("tx", jdbc);
    const jars = docker(["exec", tx, "bash", "-ceu", "cd /opt/datomic; find . -name '*1.0.7745.jar' -print0 | sort -z | xargs -0 sha256sum"]);
    const verified = JSON.parse(fs.readFileSync(path.join(source, "lab/config/datomic/verification.json")));
    const peerSha1 = docker(["exec", tx, "bash", "-ceu", "cd /opt/datomic; find . -name peer-1.0.7745.jar -print0 | xargs -0 sha1sum"]).split(/\s+/)[0];
    assert.equal(peerSha1, verified.peerSha1);
    assert.match(jars, /datomic-transactor-pro-1\.0\.7745\.jar/);
    const ddl = docker(["exec", tx, "cat", "/opt/datomic/bin/sql/postgres-table.sql"]);
    sql(ddl);
    await startTransactor("tx", tx);
    const durable = sql("select current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')");
    assert.equal(durable, "on|on|on");
    const peer = run("peer", datomic, [...mounted,
      ...(erasure ? ["-e", "TRIPLEX_ERASURE_DIRECTORY=/tmp/age-erasure"] : []),
      "-e", "DATOMIC_JAVA_OPTS=-Xms128m -Xmx768m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=96m -Dtriplex.codec.spec=/age/packages/datomic/src/codec-spec.json -Dlogback.configurationFile=" + logback,
      "-e", "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?" + jdbc + "?user=postgres&password=" + password,
      "-e", "AGE_ATTEMPT=" + attempt, "-e", "AGE_SQL_JDBC=" + jdbc, "-e", "AGE_SQL_PASSWORD=" + password,
      "-e", "AGE_MAX_SQL_BYTES=" + (7 * GiB),
    ], "/bin/sleep", ["infinity"]);
    const listing = docker(["exec", peer, "bash", "-ceu", "cd /age; find . -type f -print0 | xargs -0 sha256sum"]);
    const actual = new Map(listing.split("\n").map((line) => {
      const entry = /^([a-f0-9]{64})  \.\/(.+)$/.exec(line);
      assert(entry, "Invalid mounted source listing");
      return [entry[2], entry[1]];
    }));
    assert.deepEqual(actual, sources);
    write("binding.json", { attempt, phase: opts.run, slot: slot.slot, source: pin, sourceHashes: Object.fromEntries(sources),
      eraseSource: erasure ? eraseSource : undefined,
      settings, flags, timings: "diagnostic", heavyToken: tokens[0], roleImages: { datomic, postgres }, jars, peerSha1, durable, caps,
      roles: Object.fromEntries(created), ownerHash: sha256(fs.readFileSync(slot.ownerFile)), startedAt: new Date().toISOString() });
    if (adopting) {
      const loaderPin = "04e864ae07af65b952d015cb9907a35bc66ecf09";
      const loader = path.join(dir, "loader-source");
      fs.mkdirSync(loader);
      const files = ["lab/bench/lib", "lab/experiments/EXP-DX1/scale1/decision/plan.ts",
        "lab/experiments/EXP-DX1/load1"];
      const archive = execFileSync("git", ["archive", loaderPin, ...files], { cwd: REPO, maxBuffer: 16 * MiB });
      execFileSync("tar", ["-xf", "-", "-C", loader], { input: archive });
      fs.writeFileSync(path.join(loader, "package.json"), '{"type":"module"}\n', { flag: "wx" });
      const loaderHashes = Object.fromEntries(hashTree(loader));
      fs.symlinkSync(path.join(REPO, "node_modules"), path.join(loader, "node_modules"));
      const builds = Object.fromEntries(["core", "datomic", "qualification", "testkit"].map((pkg) =>
        [pkg, Object.fromEntries(hashTree(path.join(REPO, "packages", pkg, "dist")))]));
      write("loader-binding.json", { attempt, loaderPin, loaderHashes, builds });
      const server = capture(["exec", "-e", "TX2_SAVE_LEDGER=0", "-e", "TX2_SMALL_ROWS=0",
        "-e", "TX2_GROUP_QUEUE_CLOCK=1",
        peer, "bash", "-ceu", 'echo $$ > /tmp/age-gw.pid; exec /opt/datomic/bin/run -m triplex.gateway.main'],
        path.join(dir, "gateway.log"), controller.signal);
      server.catch(() => {});
      const transport = await fixturePort(peer);
      let fixture;
      try {
        for (let retry = 0; ; retry++) {
          controller.signal.throwIfAborted();
          assert(retry < 120, "Small loader gateway did not start");
          if (await fetch(transport.url + "/health", { signal: AbortSignal.timeout(500) }).then((r) => r.ok, () => false)) break;
          await sleep(1000);
        }
        const stdout = path.join(dir, "fixture-loader.json");
        const out = fs.openSync(stdout, "wx");
        const err = fs.openSync(path.join(dir, "fixture-loader.log"), "wx");
        try {
          await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, ["--import", "tsx", path.join(source, experiment, "scale1-fixture.mjs"),
              loader, dir, attempt, transport.url, REPO, loaderPin],
              { cwd: REPO, stdio: ["ignore", out, err], signal: controller.signal });
            child.once("error", reject);
            child.once("exit", (code) => code === 0 ? resolve() : reject(Error("SCALE1 fixture writer failed")));
          });
        } finally {
          fs.closeSync(out);
          fs.closeSync(err);
        }
        fixture = JSON.parse(fs.readFileSync(stdout, "utf8"));
      } finally {
        transport.close();
      }
      docker(["exec", peer, "bash", "-ceu", 'kill "$(cat /tmp/age-gw.pid)"']);
      await server.catch(() => {});
      docker(["cp", path.join(dir, "fixture.json"), peer + ":/tmp/age-fixture.json"]);
      const indexLog = path.join(dir, "seed-index.log");
      await capture(["exec", peer, "/opt/datomic/bin/run", "-m", "triplex.age.gate",
        "index-fixture", "/tmp/age-fixture.json", fixture.sha], indexLog, controller.signal);
      const index = JSON.parse(fs.readFileSync(indexLog, "utf8").split("\n")
        .find((line) => line.startsWith("DX_AGE1 ")).slice(8));
      assert.deepEqual([index.event, index.attempt, index.db, index.manifestSha],
        ["fixture-cut", attempt, fixture.db, fixture.sha]);
      assert(Number.isSafeInteger(index.t) && index.t > 0);
      const clone = "age-clone-" + attempt;
      const cloneSql = "age_clone";
      const cloneJdbc = jdbc.replace(/\/postgres$/, "/" + cloneSql);
      assert.notEqual(cloneJdbc, jdbc);
      const uri = (name, url) => "datomic:sql://" + name + "?" + url + "?user=postgres&password=" + password;
      const command = async (file, ...args) => {
        await capture(["exec", peer, "/opt/datomic/bin/datomic", "-Xms128m", "-Xmx640m", ...args],
          path.join(dir, file), controller.signal);
        assert(fs.readFileSync(path.join(dir, file), "utf8").split("\n").includes(":succeeded"));
      };
      const backup = "file:/tmp/age-fixture-backup";
      await command("seed-backup.log", "backup-db", uri(fixture.db, jdbc), backup);
      // [DX-AGE1] Why: the vendor preserves the database identity when it restores.
      // Rejected: renaming a restore in the source catalog (collides even with its transactor stopped).
      sql("CREATE DATABASE " + cloneSql);
      sql(ddl, cloneSql);
      await command("seed-clone.log", "restore-db", backup, uri(clone, cloneJdbc), String(index.t));
      const cloneTx = transactor("clone", cloneJdbc);
      await startTransactor("clone", cloneTx);
      await capture(["exec", "-e", "AGE_CLONE_URI=" + uri(clone, cloneJdbc), peer, "/opt/datomic/bin/run", "-m", "triplex.age.gate",
        opts.run, "/tmp/age-fixture.json", fixture.sha, clone], path.join(dir, "probe.log"), controller.signal);
    }
    else if (opts.run === "native-suite") {
      // [DX-AGE1] Why: run INT1's native suite and compile the rung against the archived gateway source.
      // Rejected: blessing an older shared image's embedded gateway or building a replacement image.
      await capture(["exec", "-e", "TX2_SAVE_LEDGER=0", "-e", "TX2_SMALL_ROWS=0", peer, "/bin/bash", "-ceu",
        'cp /age/packages/datomic/gateway/{codec-cases,codec-vectors,history-range-case}.json /opt/gateway/; ' +
        'exec /opt/datomic/bin/run -m triplex.age.gate native-suite'],
      path.join(dir, "probe.log"), controller.signal);
    } else {
      const ns = erasure ? "triplex.age.erased-successor"
        : opts.run === "successor" ? "triplex.age.successor" : "triplex.age.gate";
      const args = opts.run.startsWith("fidelity-arms")
        ? ["fidelity-arms", opts.run.endsWith("-load") ? "load" : "standard"]
        : [opts.run];
      await capture(["exec", peer, "/opt/datomic/bin/run", "-m", ns, ...args],
        path.join(dir, "probe.log"), controller.signal);
    }
  } finally {
    clearTimeout(deadline);
    clearInterval(watch);
    try {
      for (const [role, id] of [...created].reverse()) {
        owned(id);
        if (role !== "peer") await capture(["logs", id], path.join(dir, role + ".log")).catch(() => {});
        docker(["rm", "-fv", id]);
        assert(!inspect(id), "Owned role remains");
      }
      for (const volume of volumes) assert(!docker(["volume", "inspect", volume], { allowFail: true }), "Owned volume remains");
      if (net) {
        assert.equal(JSON.parse(docker(["network", "inspect", net]))[0].Labels["age.attempt"], attempt);
        docker(["network", "rm", net]);
        assert(!docker(["network", "inspect", net], { allowFail: true }), "Owned network remains");
      }
      if (slot) await withPool((ledger) => {
        assert.equal(readOwner(slot)?.holder, holder);
        assert.equal(readOwner(slot)?.pid, process.pid);
        ledger.reservations = ledger.reservations.filter((r) => !Object.values(names).includes(r.container));
        manager.releaseSlot(slot);
      });
      write("cleanup.json", { attempt, rolesRemoved: created.size, volumesRemoved: volumes.size, slotReleased: slot?.slot ?? null });
    } finally {
      process.removeListener("SIGTERM", stop);
      process.removeListener("SIGINT", stop);
    }
  }
}
