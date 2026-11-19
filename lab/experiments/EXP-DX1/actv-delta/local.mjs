import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { fork } from "node:child_process";
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
  assert(["schedules", "price", "rungs", "controls", "preflight", "loaded", "crash", "solo-check"].includes(opts.run));
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
  let info, net;
  const created = new Map(),
    volumes = new Set();
  const limit = Math.min(config.pool.memLimitBytes, 15 * 2 ** 30);
  try {
    while (!info) {
      const stat = fs.statfsSync(".");
      assert(stat.bavail * stat.bsize >= 5 * 2 ** 30, "host disk below floor");
      try {
        await withPool((ledger) => {
          manager.assertMeasureAdmission(opts.holder);
          const live = listTx2Containers({ all: true });
          const candidate = ["s1", "s2", "s3"]
            .map((s) => slotInfo(config, "datomic", s))
            .find((s) => !fs.existsSync(s.lockDir) && !live.some((c) => c.name === s.container));
          if (!candidate) return;
          const req = {
            container: prefix,
            memBytes: Object.values(caps).reduce((a, b) => a + b, 0) * 2 ** 20,
            diskForecastBytes: 4 * 2 ** 30,
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
        "-e",
        "DATOMIC_JAVA_OPTS=-Xms192m -Xmx656m -XX:ActiveProcessorCount=2 -Ddatomic.objectCacheMax=160m",
      ],
      "/opt/datomic/bin/run",
      ["-m", "triplex.gateway.main"],
    );
    const mounted = docker([
      "exec",
      gw,
      "sh",
      "-c",
      "cd /opt/gateway/src && find . -type f -exec sha256sum {} +",
    ])
      .split("\n")
      .map((v) => [v.slice(68), v.slice(0, 64)])
      .sort();
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
    child.on("message", (m) => {
      if (m?.type === "storage") {
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
  }
}
