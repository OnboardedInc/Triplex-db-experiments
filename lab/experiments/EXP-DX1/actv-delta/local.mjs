import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { fork } from "node:child_process";
import { availableParallelism, loadavg } from "node:os";
import { acquireMeasureLease, HEAVY_SLOTS, readMeasureLease } from "../../../bin/heavy-lock.mjs";
import { setTimeout as delay } from "node:timers/promises";
import {
  admission,
  docker,
  dockerArgs,
  DOCKER_HOST,
  inspect,
  listTx2Containers,
  readOwner,
  slotInfo,
  vmDisk,
  withPool,
} from "../../../bin/lib.mjs";

export async function local(opts, config, manager) {
  assert(
    process.platform === "darwin" && opts.holder === "DX-ACT2" && dockerArgs([])[1] === DOCKER_HOST,
  );
  if (opts.run === "recover-slot") return recoverSlot(opts, config, manager);
  assert(
    [
      "schedules",
      "price",
      "rungs",
      "controls",
      "preflight",
      "loaded",
      "crash",
      "solo-check",
      "deep-loaded",
      "audit-check",
      "audit-loaded",
      "audit-faults",
      "joined-admission",
      "joined-load",
      "joined-server-check",
    ].includes(opts.run),
  );
  const joined = opts.run.startsWith("joined-");
  const dir = path.resolve(opts.out),
    nonce = randomUUID(),
    prefix = "tx2-dxdelta-" + nonce.slice(0, 8);
  fs.mkdirSync(dir, { recursive: false });
  const caps = { pg: 256, tx: 896, gw: 1024 },
    labels = ["--label", "delta.attempt=" + nonce],
    names = Object.keys(caps).map((r) => prefix + "-" + r);
  const attempt = { nonce, run: opts.run, prefix, source: process.env.DELTA_SOURCE ?? null };
  const write = (name, obj) =>
    fs.writeFileSync(path.join(dir, name + ".json"), JSON.stringify(obj) + "\n", { flag: "wx" });
  let info, net, lease;
  const created = new Map(),
    volumes = new Set();
  const limit = Math.min(config.pool.memLimitBytes, 15 * 2 ** 30);
  try {
    // [DX-ACT2] Why: drain every lab heavy token and freeze other admissions before the matched timing. Rejected: relying on an idle-looking container count while another experiment starts.
    if (opts.run === "joined-load") {
      const parent = readMeasureLease();
      // The outer heavy wrapper retains the lease throughout this exact child and cleans it on exit.
      if (parent?.pid === process.ppid && parent.holder === opts.holder && !parent.stale)
        lease = { owner: parent, tokens: HEAVY_SLOTS };
      else
        lease = await acquireMeasureLease("DX-ACT2 joined comparison", {
          holder: opts.holder,
          pollMs: 5000,
        });
    }
    while (!info) {
      const stat = fs.statfsSync(".");
      assert(stat.bavail * stat.bsize >= 5 * 2 ** 30, "host disk below floor");
      try {
        await withPool((ledger) => {
          manager.assertMeasureAdmission(opts.holder);
          const live = listTx2Containers({ all: true });
          if (
            lease &&
            live.some((c) => c.running && !/^tx2-(?:xtdb|qlever|datomic)-dev$/.test(c.name))
          )
            return;
          const candidate = ["s1", "s2", "s3"]
            .map((s) => slotInfo(config, "datomic", s))
            .find((s) => !fs.existsSync(s.lockDir) && !live.some((c) => c.name === s.container));
          if (!candidate) return;
          const req = {
            container: prefix,
            memBytes: Object.values(caps).reduce((a, b) => a + b, 0) * 2 ** 20,
            diskForecastBytes:
              (["audit-loaded", "deep-loaded", "joined-load"].includes(opts.run) ? 8 : 4) * 2 ** 30,
          };
          const allowed = admission({
            config: { ...config, pool: { ...config.pool, memLimitBytes: limit } },
            reservations: ledger.reservations,
            running: live,
            request: req,
            diskUsedBytes: vmDisk(config).usedBytes,
          });
          if (!allowed.ok) return;
          assert(manager.acquireSlot(candidate, opts.holder, "DX-ACT2-delta").created);
          info = candidate;
          for (const [role, mb] of Object.entries(caps))
            ledger.reservations.push({
              container: prefix + "-" + role,
              lane: "datomic",
              slot: info.slot,
              holder: opts.holder,
              pid: process.pid,
              state: "delta",
              cpus: 2,
              memBytes: mb * 2 ** 20,
              diskForecastBytes: role === "pg" ? req.diskForecastBytes : 0,
            });
        });
      } catch (e) {
        if (e.code !== "REFUSED") throw e;
      }
      if (!info) {
        console.log("Waiting for a pool-admitted exclusive slot");
        await delay(5000);
      }
    }
    if (!docker(["image", "inspect", "postgres:17-alpine"], { allowFail: true }))
      docker(["pull", "--quiet", "postgres:17-alpine"]);
    const image = config.lanes.datomic.imageId,
      pgImage = docker(["image", "inspect", "postgres:17-alpine", "--format", "{{.Id}}"]);
    assert.match(pgImage, /^sha256:[a-f0-9]{64}$/);
    assert.equal(docker(["image", "inspect", image, "--format", "{{.Id}}"]), image);
    const manifest = manager
      .datomicSources()
      .gateway.filter((f) => f.path.startsWith("src/"))
      .map((f) => [f.path.slice(4), f.sha256])
      .sort();
    const gateway = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    net = docker(["network", "create", ...labels, prefix]);
    const password = randomBytes(20).toString("hex"),
      pg = names[0],
      tx = names[1],
      gw = names[2];
    function start(role, img, extra, entry, argv) {
      const id = docker([
        "create",
        "--pull",
        "never",
        "--name",
        prefix + "-" + role,
        ...labels,
        "--label",
        "tx2.holder=" + opts.holder,
        "--network",
        net,
        "--cpus",
        "2",
        "--memory",
        caps[role] + "m",
        "--memory-swap",
        caps[role] + "m",
        "--ulimit",
        "core=0",
        ...extra,
        "--entrypoint",
        entry,
        img,
        ...argv,
      ]);
      created.set(role, id);
      const meta = inspect(id);
      assert(
        meta?.Id === id &&
          meta.Image === img &&
          meta.Config.Labels["delta.attempt"] === nonce &&
          meta.HostConfig.Memory === caps[role] * 2 ** 20,
      );
      for (const m of meta.Mounts) if (m.Type === "volume") volumes.add(m.Name);
      docker(["start", id]);
      return id;
    }
    async function wait(name, fn) {
      for (let i = 0; i < 180; i++) {
        if (await fn()) return;
        assert(inspect(name)?.State.Running, "owned role stopped " + name);
        await delay(1000);
      }
      throw Error("startup timed out " + name);
    }
    start("pg", pgImage, ["-e", "POSTGRES_PASSWORD=" + password], "docker-entrypoint.sh", [
      "postgres",
      "-c",
      "shared_buffers=48MB",
    ]);
    const sql = (q) =>
      docker(["exec", pg, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-c", q]);
    await wait(pg, () =>
      docker(["exec", pg, "pg_isready", "-h", new URL(info.endpoint).hostname, "-U", "postgres"], {
        allowFail: true,
      })?.includes("accepting connections"),
    );
    const props = [
      "protocol=sql",
      "host=" + tx,
      "port=4334",
      "sql-url=jdbc:postgresql://" + pg + "/postgres",
      "sql-driver-class=org.postgresql.Driver",
      "sql-user=postgres",
      "sql-password=" + password,
      "memory-index-threshold=32m",
      "memory-index-max=96m",
      "object-cache-max=64m",
    ].join("\n");
    const boot =
      "set -eu; cat /opt/datomic/bin/sql/postgres-table.sql; while [ ! -f /tmp/delta.ready ]; do sleep 1; done; printenv DELTA_PROPERTIES > /tmp/delta.properties; exec bin/transactor -Xms128m -Xmx448m -XX:ActiveProcessorCount=2 /tmp/delta.properties";
    start("tx", image, ["-e", "DELTA_PROPERTIES=" + props], "/bin/sh", ["-c", boot]);
    sql(docker(["exec", tx, "cat", "/opt/datomic/bin/sql/postgres-table.sql"]));
    docker(["exec", tx, "touch", "/tmp/delta.ready"]);
    await wait(
      tx,
      () =>
        docker(
          [
            "exec",
            tx,
            "bash",
            "-c",
            "(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready",
            "probe",
            tx,
          ],
          { allowFail: true },
        ) === "ready",
    );
    const root = process.cwd(),
      uri =
        "datomic:sql://{db}?jdbc:postgresql://" +
        pg +
        "/postgres?user=postgres&password=" +
        password;
    start(
      "gw",
      image,
      [
        "-v",
        path.join(root, "packages/datomic/gateway/src") + ":/opt/gateway/src:ro",
        "-v",
        path.join(root, "packages/datomic/src/codec-spec.json") +
          ":/opt/gateway/codec-spec.json:ro",
        "-p",
        new URL(info.endpoint).hostname + ":" + info.port + ":8080",
        "-e",
        "DATOMIC_URI_TEMPLATE=" + uri,
        "-e",
        "GATEWAY_SOURCE_SHA256=" + gateway,
        ...(joined
          ? ["-e", "TX2_LIVE_PRIORITY=1", "-e", "TX2_WRITE_OPTIONS_ATTEMPT=" + nonce]
          : []),
        "-e",
        "DATOMIC_JAVA_OPTS=-Xms192m -Xmx656m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=160m",
      ],
      "/opt/datomic/bin/run",
      ["-m", "triplex.gateway.main"],
    );
    const { mountedGateway } = await import("./power.mjs");
    const mounted = mountedGateway(gw);
    assert.deepEqual(mounted, manifest);
    await wait(gw, async () => {
      const r = await fetch(info.endpoint + "/health", { signal: AbortSignal.timeout(1500) }).catch(
        () => undefined,
      );
      if (!r?.ok) return false;
      assert.equal((await r.json()).gatewaySourceHash, gateway);
      return true;
    });
    assert.equal(
      sql("select current_setting('fsync'),current_setting('synchronous_commit')"),
      "on|on",
    );
    const binding = {
      ...attempt,
      slot: info.slot,
      ownerHash: createHash("sha256").update(fs.readFileSync(info.ownerFile)).digest("hex"),
      roles: Object.fromEntries(created),
      gateway,
      image,
      pgImage,
      caps,
      ...(lease ? { measurement: lease.owner, heavyTokens: lease.tokens } : {}),
    };
    write("native", binding);
    const child = fork(path.join(import.meta.dirname, "native.ts"), [opts.run, dir], {
      execArgv: ["--import", "tsx"],
      env: {
        ...process.env,
        DATOMIC_URL: info.endpoint,
        DX_ACT1_NATIVE: "1",
        TRIPLEX_DATOMIC_LAYOUT: "lean",
        TX2_SWEEP_STRICT: "1",
        TX2_W0_POINT_JOURNAL: "1",
        TRIPLEX_LAB_SLOT_OWNER: info.ownerFile,
      },
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    let studyImage, restoredBlock = -1;
    async function restoreStudyImage(m) {
      assert(lease && opts.run === "joined-load" && m.nonce === nonce);
      assert.deepEqual(readMeasureLease(), lease.owner);
      assert.equal(createHash("sha256").update(fs.readFileSync(info.ownerFile)).digest("hex"), binding.ownerHash);
      for (const [role, id] of created) {
        const observed = inspect(id);
        assert(observed?.State.Running && observed.Name === "/" + prefix + "-" + role);
        assert.equal(observed.Config.Labels["delta.attempt"], nonce);
      }
      const pgId = created.get("pg");
      const dump = "/tmp/dx-act2-r1.pgdump";
      const digest = () => docker(["exec", pgId, "sha256sum", dump]).split(/\s+/)[0];
      if (m.action === "seal") {
        assert(!studyImage);
        assert(docker(["exec", pgId, "test", "!", "-e", dump], { allowFail: true }) !== null);
        // [DX-ACT2] Why: the same private R1 cut is the starting state for every arm. Rejected: accumulating hundreds of earlier releases on the second policy's account.
        docker(["exec", pgId, "pg_dump", "-U", "postgres", "-Fc", "-Z1", "-d", "postgres", "-f", dump]);
        studyImage = {
          sha256: digest(),
          bytes: Number(docker(["exec", pgId, "stat", "-c", "%s", dump])),
          nonce, ownerHash: binding.ownerHash,
        };
        assert(/^[a-f0-9]{64}$/.test(studyImage.sha256) && studyImage.bytes > 0);
        write("seed-image", studyImage);
        return studyImage;
      }
      assert(m.action === "restore" && studyImage && m.sha256 === studyImage.sha256);
      assert(Number.isSafeInteger(m.block) && m.block > restoredBlock);
      assert.equal(digest(), studyImage.sha256);
      // [DX-ACT2] Why: replace only the derived fixture on this owned SQL volume, with both Datomic roles stopped. Rejected: restoring under a live peer that can retain the previous native cut.
      for (const role of ["gw", "tx"]) docker(["stop", "--time", "20", created.get(role)]);
      for (const role of ["gw", "tx"]) assert(!inspect(created.get(role)).State.Running);
      docker(["exec", pgId, "pg_restore", "--exit-on-error", "--single-transaction",
        "--if-exists", "--clean", "-U", "postgres", "-d", "postgres", dump]);
      docker(["start", created.get("tx")]);
      await wait(tx, () =>
        docker(["exec", tx, "bash", "-c", "(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready",
          "probe", tx], { allowFail: true }) === "ready",
      );
      docker(["start", created.get("gw")]);
      await wait(gw, async () => {
        const r = await fetch(info.endpoint + "/health", { signal: AbortSignal.timeout(1500) }).catch(
          () => undefined,
        );
        if (!r?.ok) return false;
        assert.equal((await r.json()).gatewaySourceHash, gateway);
        return true;
      });
      assert.equal(sql("select current_setting('fsync'),current_setting('synchronous_commit')"), "on|on");
      restoredBlock = m.block;
      const proof = { image: studyImage, block: m.block, restoredAt: Date.now() };
      write("restored-" + m.block, proof);
      return proof;
    }
    let restarts = 0;
    child.on("message", async (m) => {
      if (m?.type === "joinedImage") {
        try {
          child.send({ id: m.id, image: await restoreStudyImage(m) });
        } catch (e) {
          child.send({ id: m.id, error: String(e) });
        }
      }
      if (m?.type === "cpu") {
        try {
          assert(lease && opts.run === "joined-load" && m.nonce === nonce);
          assert.deepEqual(readMeasureLease(), lease.owner);
          const foreign = listTx2Containers().filter(
            (c) => !names.includes(c.name) && !/^tx2-(?:xtdb|qlever|datomic)-dev$/.test(c.name),
          );
          assert.equal(
            foreign.length,
            0,
            "An unowned nonresident stack is active during the comparison",
          );
          const vm = docker(["exec", created.get("gw"), "cat", "/proc/pressure/cpu"]);
          const guests = docker(["exec", created.get("gw"), "cat", "/proc/loadavg"]);
          child.send({
            id: m.id,
            cpu: {
              at: Date.now(),
              vm,
              guests,
              host: { cpus: availableParallelism(), load: loadavg() },
              exclusive: true,
            },
          });
        } catch (e) {
          child.send({ id: m.id, error: String(e) });
        }
      }
      if (m?.type === "power") {
        try {
          assert(
            ["crash", "audit-faults"].includes(opts.run) &&
              m.nonce === nonce &&
              m.seq === ++restarts &&
              [1, 2].includes(restarts),
          );
          const { recoverPower } = await import("./power.mjs");
          const recovered = await recoverPower({
            created,
            nonce,
            endpoint: info.endpoint,
            gateway,
            sql,
          });
          child.send({ id: m.id, recovered });
        } catch (e) {
          child.send({ id: m.id, error: String(e) });
        }
      }
      if (m?.type === "storage") {
        if (m.checkpoint) {
          assert(opts.run === "price" && ["on", "off"].includes(process.env.DELTA_PRICE_ARM));
          sql("CHECKPOINT");
        }
        const data = sql(
          "SELECT pg_database_size(current_database()),pg_wal_lsn_diff(pg_current_wal_insert_lsn(),'0/0')",
        )
          .split("|")
          .map(Number);
        child.send({ id: m.id, data });
      }
    });
    const code = await new Promise((ok, fail) => {
      child.once("error", fail);
      child.once("exit", ok);
    });
    assert.equal(code, 0, "native gate failed");
  } finally {
    for (const [role, id] of [...created].reverse()) {
      const m = inspect(id);
      if (m) {
        assert.equal(m.Config.Labels["delta.attempt"], nonce);
        if (m.State.OOMKilled || !m.State.Running)
          write("exit-" + role, { oom: m.State.OOMKilled, code: m.State.ExitCode });
        docker(["rm", "-fv", id]);
        assert(!inspect(id));
      }
    }
    for (const vol of volumes)
      assert(!docker(["volume", "inspect", vol], { allowFail: true }), "owned volume remains");
    if (net) {
      assert.equal(
        JSON.parse(docker(["network", "inspect", net]))[0].Labels["delta.attempt"],
        nonce,
      );
      docker(["network", "rm", net]);
    }
    if (info) {
      await withPool((ledger) => {
        assert.equal(readOwner(info)?.holder, opts.holder);
        ledger.reservations = ledger.reservations.filter((e) => !names.includes(e.container));
        manager.releaseSlot(info);
      });
    }
    write("cleanup", {
      nonce,
      roles: created.size,
      volumesRemoved: volumes.size,
      slotReleased: info?.slot ?? null,
    });
    lease?.release?.();
  }
}

async function recoverSlot(opts, config, manager) {
  const dir = path.resolve(opts.out);
  const attempt = JSON.parse(fs.readFileSync(path.join(dir, "attempt.json")));
  const n = JSON.parse(fs.readFileSync(path.join(dir, "native.json")));
  assert(
    n.nonce === attempt.nonce &&
      n.prefix === "tx2-dxdelta-" + attempt.nonce.slice(0, 8) &&
      /^tx2-dxdelta-[0-9a-f]{8}$/.test(n.prefix) &&
      n.prefix.endsWith(n.nonce.slice(0, 8)) &&
      ["s1", "s2", "s3"].includes(n.slot),
  );
  const file = path.join(dir, "cleanup.json");
  assert(!fs.existsSync(file));
  const info = slotInfo(config, "datomic", n.slot);
  const receipt = await withPool((ledger) => {
    assert(readOwner(info)?.holder === opts.holder);
    assert.equal(
      createHash("sha256").update(fs.readFileSync(info.ownerFile)).digest("hex"),
      n.ownerHash,
    );
    const names = ["pg", "tx", "gw"].map((role) => n.prefix + "-" + role);
    const owned = ledger.reservations.filter((r) => r.slot === n.slot && r.holder === opts.holder);
    assert.deepEqual(owned.map((r) => r.container).sort(), [...names].sort());
    assert(owned.every((r) => r.pid === owned[0].pid && r.state === "delta"));
    assert.throws(() => process.kill(owned[0].pid, 0), { code: "ESRCH" });
    // [DX-ACT2] Why: interrupted callers may outlive their terminal reply. Recover only the exact reservation and nonce-owned stack after proving its manager exited. Rejected: releasing the slot by holder or name alone.
    const network = JSON.parse(docker(["network", "inspect", n.prefix]))[0];
    assert.equal(network.Labels["delta.attempt"], n.nonce);
    assert(Object.keys(network.Containers).every((id) => Object.values(n.roles).includes(id)));
    const volumes = new Set();
    for (const role of ["gw", "tx", "pg"]) {
      const id = n.roles[role],
        m = inspect(id);
      if (!m) continue;
      assert(
        m.Id === id &&
          m.Name === "/" + n.prefix + "-" + role &&
          m.Config.Labels["delta.attempt"] === n.nonce &&
          m.Config.Labels["tx2.holder"] === opts.holder &&
          m.Image === (role === "pg" ? n.pgImage : n.image),
      );
      for (const mount of m.Mounts) if (mount.Type === "volume") volumes.add(mount.Name);
      docker(["rm", "-fv", id]);
      assert(!inspect(id));
    }
    for (const v of volumes)
      assert(!docker(["volume", "inspect", v], { allowFail: true }), "owned volume remains");
    docker(["network", "rm", network.Id]);
    ledger.reservations = ledger.reservations.filter((r) => !owned.includes(r));
    manager.releaseSlot(info);
    assert(!fs.existsSync(info.ownerFile));
    return {
      nonce: n.nonce,
      roles: names.length,
      volumesRemoved: volumes.size,
      slotReleased: n.slot,
      recovered: true,
    };
  });
  fs.writeFileSync(file, JSON.stringify(receipt) + "\n", { flag: "wx" });
}
