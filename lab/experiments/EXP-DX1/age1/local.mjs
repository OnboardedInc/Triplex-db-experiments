// @ts-nocheck -- [EXP-CHECKJS] Docker inspection and lab reservation records are validated at runtime.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { acquireMeasureLease } from "../../../bin/heavy-lock.mjs";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DOCKER_HOST, GiB, LOCKS, REPO, admission, docker, dockerArgs, git, inspect,
  listTx2Containers, readOwner, sha256, sleep, slotInfo, vmDisk, withPool,
} from "../../../bin/lib.mjs";

const experiment = "lab/experiments/EXP-DX1/age1";
const holder = "DX-AGE1";
const MiB = 1024 ** 2;
const caps = { pg: 384, tx: 1024, peer: 1280 };
const evidence = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence", holder);
const labRoot = path.join(evidence, "../..");

function hashTree(dir, relative = "") {
  return fs.readdirSync(path.join(dir, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((f) => {
      const name = path.posix.join(relative, f.name);
      if (f.isDirectory()) return hashTree(dir, name);
      assert(f.isFile(), "source input must be a regular file");
      return [[name, sha256(fs.readFileSync(path.join(dir, name)))]];
    });
}

function stage(dir, revision) {
  const source = path.join(dir, "source");
  fs.mkdirSync(source);
  const inputs = [experiment, "lab/bin/engine.mjs", "lab/bin/lib.mjs", "lab/bin/heavy.mjs", "lab/bin/heavy-lock.mjs",
    "lab/config/datomic/verification.json", "packages/datomic/gateway/src", "packages/datomic/src/codec-spec.json"];
  const archive = execFileSync("git", ["archive", revision, ...inputs], { cwd: REPO, maxBuffer: 16 * MiB });
  execFileSync("tar", ["-xf", "-", "-C", source], { input: archive });
  const launcher = path.join(REPO, experiment, "local.mjs");
  const manager = path.join(REPO, "lab", "bin", "engine.mjs");
  for (const file of [launcher, manager, ...["lib.mjs", "heavy.mjs", "heavy-lock.mjs"].map((name) => path.join(REPO, "lab/bin", name))])
    assert.equal(sha256(fs.readFileSync(file)), sha256(fs.readFileSync(path.join(source, path.relative(REPO, file)))), "running launcher differs from its source pin");
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
  assert.match(opts.run ?? "", /^(fidelity|scale|successor)$/);
  const measure = opts.run === "scale" ? await import("./measure.mjs") : null;
  const spec = measure?.scaleOptions(opts);
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
  const lock = path.join(labRoot, "locks", "measure");
  const controller = new AbortController();
  const stop = () => controller.abort(new Error("Interrupted"));
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  let slot, net, locked = false, deadline, watch, lease;
  const write = (file, body) => fs.writeFileSync(path.join(dir, file), JSON.stringify(body, null, 2) + "\n", { flag: "wx" });
  const forecast = (opts.run === "scale" ? 12 : 1) * GiB;
  const floor = () => {
    const stats = fs.statfsSync(dir);
    assert(stats.bavail * stats.bsize >= 5 * GiB, "Host disk is below the 5 GiB floor");
  };
  const releaseMeasure = () => {
    if (!locked) return;
    assert.equal(JSON.parse(fs.readFileSync(path.join(lock, "owner.json"))).attempt, attempt);
    fs.unlinkSync(path.join(lock, "owner.json"));
    fs.rmdirSync(lock);
    locked = false;
  };
  const owned = (id) => {
    const meta = inspect(id);
    assert(meta?.Id === id && meta.Config.Labels["age.attempt"] === attempt, "Container ownership changed");
    return meta;
  };
  try {
    floor();
    // [DX-AGE1] Why: a competing lease can wait for this wrapper's token. Rejected: sleeping indefinitely while both holders wait.
    manager.assertMeasureAdmission(holder);
    lease = await acquireMeasureLease(holder + " " + opts.run, { holder, pollMs: 1000, timeoutMs: 45000 });
    const datomic = image(selectImage()), postgres = image("postgres:17-alpine");
    const source = stage(dir, pin);
    const sources = new Map(hashTree(source));
    if (measure) assert.equal(sources.get(experiment + "/measure.mjs"), sha256(fs.readFileSync(new URL("./measure.mjs", import.meta.url))));
    while (!slot) {
      controller.signal.throwIfAborted();
      floor();
      try {
        fs.mkdirSync(lock);
        fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ id: holder, pid: process.pid, attempt, at: new Date().toISOString() }), { flag: "wx" });
        locked = true;
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
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
      if (!slot) {
        releaseMeasure();
        console.log("[age1] waiting for the exclusive measurement window and Datomic slot");
        await sleep(30000);
      }
    }
    deadline = setTimeout(() => controller.abort(new Error("Measurement window expired")), 14 * 60 * 1000);
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
    const sql = (query) => docker(["exec", pg, "psql", "-XAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-c", query]);
    await ready(pg, () => docker(["exec", pg, "pg_isready", "-h", names.pg, "-U", "postgres"], { allowFail: true })?.includes("accepting connections"));
    const settings = { "memory-index-threshold": "32m", "memory-index-max": "96m", "object-cache-max": "64m", "index-parallelism": 1 };
    const props = { protocol: "sql", host: names.tx, port: 4334, "sql-url": jdbc, "sql-driver-class": "org.postgresql.Driver",
      "sql-user": "postgres", "sql-password": password, ...settings };
    const flags = ["TX2_SAVE_LEDGER=1", "TX2_SMALL_ROWS=1"];
    const logback = "/age/" + experiment + "/logback.xml";
    const classpath = "/age/packages/datomic/gateway/src:/age/" + experiment + "/src";
    const mounted = ["-v", source + ":/age:ro", "-e", "DATOMIC_EXT_CLASSPATH=" + classpath,
      ...flags.flatMap((flag) => ["-e", flag])];
    const tx = run("tx", datomic, [...mounted, "-e", "AGE_PROPERTIES=" + Object.entries(props).map(([k, v]) => k + "=" + v).join("\n"),
      "-e", "JAVA_OPTS=-Xms128m -Xmx640m -XX:ActiveProcessorCount=2 -Dlogback.configurationFile=" + logback],
      "/bin/sh", ["-ceu", 'while [ ! -f /tmp/age.ready ]; do sleep 1; done; printenv AGE_PROPERTIES > /tmp/age.properties; exec /opt/datomic/bin/transactor /tmp/age.properties']);
    const jars = docker(["exec", tx, "bash", "-ceu", "cd /opt/datomic; find . -name '*1.0.7745.jar' -print0 | sort -z | xargs -0 sha256sum"]);
    const verified = JSON.parse(fs.readFileSync(path.join(source, "lab/config/datomic/verification.json")));
    const peerSha1 = docker(["exec", tx, "bash", "-ceu", "cd /opt/datomic; find . -name peer-1.0.7745.jar -print0 | xargs -0 sha1sum"]).split(/\s+/)[0];
    assert.equal(peerSha1, verified.peerSha1);
    assert.match(jars, /datomic-transactor-pro-1\.0\.7745\.jar/);
    sql(docker(["exec", tx, "cat", "/opt/datomic/bin/sql/postgres-table.sql"]));
    docker(["exec", tx, "touch", "/tmp/age.ready"]);
    await ready(tx, () => docker(["exec", tx, "bash", "-c", '(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready', "probe", names.tx], { allowFail: true }) === "ready");
    const durable = sql("select current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')");
    assert.equal(durable, "on|on|on");
    const peer = run("peer", datomic, [...mounted,
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
      settings, flags, spec, roleImages: { datomic, postgres }, jars, peerSha1, durable, caps,
      roles: Object.fromEntries(created), ownerHash: sha256(fs.readFileSync(slot.ownerFile)), startedAt: new Date().toISOString() });
    if (measure) await measure.measure({ attempt, dir, peer, tx, pg, jdbc, password, capture, signal: controller.signal, floor, write }, spec);
    else {
      const ns = opts.run === "fidelity" ? "triplex.age.gate" : "triplex.age.successor";
      await capture(["exec", peer, "/opt/datomic/bin/run", "-m", ns, opts.run],
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
      releaseMeasure();
      lease?.release();
      process.removeListener("SIGTERM", stop);
      process.removeListener("SIGINT", stop);
    }
  }
}
