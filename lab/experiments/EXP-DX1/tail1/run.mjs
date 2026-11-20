// @ts-nocheck -- JS CLI options, engine manager callbacks and Docker JSON are checked on use.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import {
  admission,
  DOCKER_HOST,
  docker,
  inspect,
  listTx2Containers,
  readJson,
  readOwner,
  REPO,
  sha256File,
  slotInfo,
  vmDisk,
  withPool,
} from "../../../bin/lib.mjs";
import { frozenDeep, releaseDeepStart } from "../../../bench/lib/deep-profile.ts";
import { matchOffers } from "./replay-input.mjs";
import { arms } from "./arms.mjs";

const roles = ["pg", "tx", "gw-w", "gw-r"];
const GiB = 2 ** 30,
  MiB = 2 ** 20;
const holder = "DX-TAIL1";
const nameLabel = "tx2.tail1";
const peerJar = "peer-1.0.7745.jar";

const write = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const output = (file, cmd, args) => {
  const fd = fs.openSync(file, "wx");
  try {
    execFileSync(cmd, args, { cwd: REPO, timeout: 30_000, stdio: ["ignore", fd, "inherit"] });
  } finally {
    fs.closeSync(fd);
  }
};
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const diskFloor = (directory) => {
  const stat = fs.statfsSync(directory);
  assert(stat.bavail * stat.bsize >= 5 * GiB, "Host disk is below the 5 GiB floor");
};

function spawnBound(command, args, { env, log, signal, deadline }) {
  const fd = fs.openSync(log, "wx");
  const child = spawn(command, args, { cwd: REPO, env, detached: true, stdio: ["ignore", fd, fd] });
  fs.closeSync(fd);
  const stop = () => {
    if (child.pid && child.exitCode === null && child.signalCode === null)
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
  };
  const timer = setTimeout(stop, Math.max(1, deadline - Date.now()));
  if (signal.aborted) stop();
  signal.addEventListener("abort", stop, { once: true });
  const done = new Promise((resolve) => {
    child.once("error", (error) => resolve({ code: null, signal: null, error: String(error) }));
    child.once("close", (code, killed) => resolve({ code, signal: killed }));
  }).finally(() => {
    signal.removeEventListener("abort", stop);
    clearTimeout(timer);
  });
  return { child, stop, done };
}

async function waitFor(probe, child, signal, deadline) {
  for (;;) {
    signal.throwIfAborted();
    assert(Date.now() < deadline, "Timed out waiting for the replay barrier");
    assert(child.pid, "Driver spawn failed");
    assert(
      child.exitCode === null && child.signalCode === null,
      "Driver exited before the replay barrier",
    );
    if (probe()) return;
    await delay(250, undefined, { signal });
  }
}

async function holdMacWindow(identity, signal, deadline) {
  // [DX-TAIL1] Why: older lab runs share this lock around their measured offers.
  // Rejected: holding it through the deep seed, or taking all four heavy tokens while seeding.
  const lock = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "locks", "measure");
  const owner = path.join(lock, "owner.json");
  for (;;) {
    signal.throwIfAborted();
    assert(Date.now() < deadline, "Mac timing window unavailable before the replay deadline");
    try {
      fs.mkdirSync(lock);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      console.log("DX-TAIL1 ready, waiting for the shared Mac timing window");
      await delay(5000, undefined, { signal });
    }
  }
  const record = { pid: process.pid, holder, slot: identity.slot, at: Date.now() };
  try {
    write(owner, record);
  } catch (error) {
    fs.rmdirSync(lock);
    throw error;
  }
  return {
    record,
    release() {
      assert.deepEqual(readJson(owner), record);
      fs.unlinkSync(owner);
      fs.rmdirSync(lock);
    },
  };
}

function reading(rows) {
  return Object.fromEntries(
    Object.entries(rows).map(([role, id]) => {
      const raw = docker([
        "exec",
        id,
        "sh",
        "-c",
        "cat /sys/fs/cgroup/cpu.stat /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.peak",
      ]);
      const lines = raw.split("\n");
      const cpuUsec = Number(/^usage_usec (\d+)$/m.exec(raw)?.[1]);
      const current = Number(lines.at(-2)),
        peak = Number(lines.at(-1));
      assert([cpuUsec, current, peak].every(Number.isSafeInteger));
      return [role, { cpuUsec, current, peak }];
    }),
  );
}

async function reserve(config, manager, names, roleMemory, signal, diskForecast) {
  for (;;) {
    signal.throwIfAborted();
    diskFloor(REPO);
    const result = await withPool((ledger) => {
      try {
        manager.assertMeasureAdmission(holder);
      } catch (error) {
        if (error.code === "REFUSED") return error.message;
        throw error;
      }
      const existing = listTx2Containers({ all: true });
      const slot = ["s1", "s2", "s3"]
        .map((key) => slotInfo(config, "datomic", key))
        .find(
          (info) =>
            !fs.existsSync(info.lockDir) && !existing.some((row) => row.name === info.container),
        );
      if (!slot) return "No Datomic exclusive slot";
      const request = {
        container: names.pg,
        memBytes: Object.values(roleMemory).reduce((sum, n) => sum + n, 0),
        diskForecastBytes: diskForecast,
      };
      const allowed = admission({
        config: {
          ...config,
          pool: { ...config.pool, memLimitBytes: Math.min(config.pool.memLimitBytes, 15 * GiB) },
        },
        reservations: ledger.reservations,
        running: existing,
        request,
        diskUsedBytes: vmDisk(config).usedBytes,
      });
      if (!allowed.ok) return allowed.reasons.join(", ");
      assert(manager.acquireSlot(slot, holder, holder).created);
      for (const role of roles)
        ledger.reservations.push({
          container: names[role],
          lane: "datomic",
          slot: slot.slot,
          holder,
          pid: process.pid,
          state: "tail1",
          cpus: 1,
          memBytes: roleMemory[role],
          diskForecastBytes: role === "pg" ? diskForecast : 0,
        });
      return slot;
    });
    if (typeof result !== "string") return result;
    console.log("Waiting for DX-TAIL1 admission: " + result);
    await delay(5000, undefined, { signal });
  }
}

export async function runTail(options, config, manager) {
  const invokedAt = Date.now();
  assert.equal(options.holder, holder);
  const mac = process.platform === "darwin";
  assert(mac || (process.platform === "linux" && process.env.DX_BARE_METAL === "1"));
  const host = mac ? DOCKER_HOST : "unix:///var/run/docker.sock";
  assert.equal(process.env.DOCKER_HOST, host, "Supply the lab Docker endpoint");
  assert(!process.env.TX2_DOCKER_HOST || process.env.TX2_DOCKER_HOST === host);
  process.env.TX2_DOCKER_HOST = host;
  const arm = options.arm ?? "serial";
  assert(Object.hasOwn(arms, arm), "Unknown DX-TAIL1 arm");
  const variant = arms[arm];
  const datomic = path.join(REPO, "lab/config/datomic");
  const peerHash = fs
    .readFileSync(path.join(datomic, "SHA256SUMS"), "utf8")
    .split("\n")
    .find((line) => line.endsWith("  " + peerJar))
    ?.split(" ")[0];
  assert.match(peerHash, /^[a-f0-9]{64}$/);
  const buildFile = options["image-receipt"];
  const build = buildFile ? readJson(buildFile) : undefined;
  // [DX-TAIL1] Why: allow a still-present, sealed lab build when the original shared image is retired.
  // Rejected: retagging another holder's image or choosing the newest mutable tag between arms.
  if (build) {
    const verification = readJson(path.join(datomic, "verification.json"));
    assert.equal(build.verification.zipSha256, verification.zipSha256);
    assert.equal(build.distribution.find((file) => file.path === peerJar)?.sha256, peerHash);
    assert(build.gpg.stdout.includes("VALIDSIG " + verification.fingerprint + " "));
    assert.equal(
      createHash("sha256")
        .update(
          JSON.stringify({
            sources: build.sources,
            distribution: build.distribution,
          }),
        )
        .digest("hex"),
      build.buildInputsSha256,
    );
    assert.match(build.imageId, /^sha256:[a-f0-9]{64}$/);
  }
  const selector =
    build?.imageId ?? (mac ? config.lanes.datomic.imageId : config.lanes.datomic.image);
  const meta = JSON.parse(docker(["image", "inspect", selector]))[0];
  const image = meta.Id;
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  if (mac || build) assert.equal(image, selector);
  const buildInputHash = meta.Config.Labels["tx2.build-inputs-sha256"];
  assert.match(buildInputHash, /^[a-f0-9]{64}$/);
  if (build) assert.equal(buildInputHash, build.buildInputsSha256);
  if (options.gate !== true) {
    // [DX-TAIL1] Why: the exact publication feed needs the real host time domain before offers.
    // Rejected: spending a full seed before discovering a denied boot-ID read, or labelling a fake clock.
    const { openHostFeedClock } = await import(
      pathToFileURL(path.join(REPO, "packages/host/dist/feed/index.js"))
    );
    openHostFeedClock();
  }
  if (options.preflight === true) {
    const postgres = docker(["image", "inspect", "postgres:17-alpine", "--format", "{{.Id}}"]);
    assert.match(postgres, /^sha256:[a-f0-9]{64}$/);
    console.log(JSON.stringify({ image, postgres, peerHash, buildInputHash }));
    return;
  }
  const seconds = options.full === true ? 5910 : Number(options.seconds ?? 240);
  const receiptPredecessors = options["receipt-predecessors"] === true;
  if (receiptPredecessors)
    assert(
      fs
        .readFileSync(path.join(REPO, "packages/datomic/dist/index.d.ts"), "utf8")
        .includes("receiptPredecessorAttributes"),
      "Build the Datomic runtime with the receipt path",
    );
  assert(mac || seconds <= 900, "The server diagnostic is a bounded prefix");
  const out = path.resolve(options.out),
    archive = fs.realpathSync(options.archive);
  fs.mkdirSync(out, { recursive: false });
  diskFloor(out);
  const nonce = randomUUID(),
    slot = "tx2-dxscale1-tail1-" + nonce;
  const identity = {
    source: git("rev-parse", "HEAD"),
    slot,
    nonce,
    account: 0,
    people: 10000,
    arm: "zero",
  };
  const names = Object.fromEntries(roles.map((role) => [role, slot + "-" + role]));
  const setup = path.join(out, "stack"),
    attempt = path.join(setup, slot);
  const trace = path.join(attempt, "trace/raw"),
    raw = path.join(REPO, "runs", "DX-TAIL1", nonce);
  const barrier = path.join(raw, "barrier"),
    oracle = path.join(raw, "oracle");
  fs.mkdirSync(barrier, { recursive: true });
  const reportFile = path.join(raw, "ns-report.json");
  const archiveOut = path.join(out, "archive");
  execFileSync("python3", [path.join(import.meta.dirname, "archive.py"), archive, archiveOut], {
    timeout: 90_000,
  });
  const input = path.join(archiveOut, "offers.json");
  const plan = matchOffers(readJson(input), frozenDeep(0, 10000), seconds);
  const { stageReplay, sourceInventory } = await import("../scale1/source.ts");
  write(path.join(out, "source.json"), {
    identity,
    oracle: stageReplay(REPO, oracle),
    source: sourceInventory(REPO),
    tail1: Object.fromEntries(
      [
        "run.mjs",
        "archive.py",
        "replay-input.mjs",
        "profile.clj",
        "measure.py",
        "arms.mjs",
        "receipt-oracle.py",
      ].map((file) => [file, sha256File(path.join(import.meta.dirname, file))]),
    ),
    offers: { ...plan, bytes: sha256File(input) },
    datomicImage: {
      image,
      buildInputHash,
      peerHash,
      buildReceiptSha256: buildFile ? sha256File(buildFile) : null,
    },
  });
  const caps = mac
    ? { pg: 320, tx: 1056, "gw-w": 1408, "gw-r": 768 }
    : { pg: 6144, tx: 6144, "gw-w": 6144, "gw-r": 6144 };
  const heaps = mac
    ? { tx: 704, "gw-w": 896, "gw-r": 416 }
    : { tx: 5120, "gw-w": 4096, "gw-r": 4096 };
  const cpus = mac
    ? { pg: "0", tx: "0", "gw-w": "1", "gw-r": "2" }
    : { pg: "1", tx: "0", "gw-w": "2", "gw-r": "4,8" };
  const gc = (role) =>
    "-Xlog:gc*=info,safepoint=info:file=/trace/" +
    role +
    ".log:time,uptimemillis,level,tags:filecount=4,filesize=8m";
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) =>
        !/^(DX_|TX2_|TRIPLEX_|DATOMIC_|JAVA_OPTS$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|NODE_OPTIONS$)/.test(
          name,
        ),
    ),
  );
  Object.assign(env, {
    ...(mac ? {} : { DX_BARE_METAL: "1", DX_BARE_METAL_ROOT: out }),
    DX_STACK_EVIDENCE: setup,
    DX_TAIL1_ATTEMPT: nonce,
    DX_TAIL1_IMAGE: image,
    DX_TAIL1_LESS_ALLOCATION: variant.allocation ? "1" : "0",
    DX_STACK_WAIT_FOR_TRANSACTOR: "1",
    DX_QUIET_LOGS: "1",
    DX_NATIVE_SETTINGS_READBACK: "1",
    DX_INT1_GATEWAYS: mac ? "demand" : "original",
    DX_GW_WRITE_MEMORY: caps["gw-w"] + "m",
    DX_GW_READ_MEMORY: caps["gw-r"] + "m",
    DX_GW_WRITE_JAVA_OPTS:
      "-Xms256m -Xmx" +
      heaps["gw-w"] +
      "m " +
      variant.flags.join(" ") +
      " -Ddatomic.objectCacheMax=" +
      (mac ? "32m " : "1536m ") +
      gc("gw-w"),
    DX_GW_READ_JAVA_OPTS:
      "-Xms256m -Xmx" +
      heaps["gw-r"] +
      "m -XX:+UseG1GC -Ddatomic.objectCacheMax=" +
      (mac ? "32m " : "1536m ") +
      gc("gw-r"),
    TRIPLEX_TRACE_LEVEL: "summary",
    TRIPLEX_TRACE_NODE: "1",
    TRIPLEX_TRACE_GATEWAY: "1",
    TRIPLEX_TRACE_RUN: slot,
    TRIPLEX_TRACE_SLOT: slot,
    TRIPLEX_TRACE_SOURCE: identity.source,
  });
  const controller = new AbortController();
  const interrupt = () => controller.abort(Error("DX-TAIL1 interrupted"));
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const signal = controller.signal;
  let reservation, driver, timer, macWindow, windowTimer;
  let measuredStart;
  const releaseMacWindow = () => {
    if (!macWindow) return;
    const opened = macWindow;
    macWindow = undefined;
    clearTimeout(windowTimer);
    try {
      opened.release();
      write(path.join(out, "timing-window.json"), {
        identity,
        openedAt: opened.record.at,
        closedAt: Date.now(),
      });
    } catch (error) {
      controller.abort(error);
    }
  };
  try {
    if (mac) {
      const bytes = Object.fromEntries(roles.map((role) => [role, caps[role] * MiB]));
      reservation = await reserve(config, manager, names, bytes, signal, 6 * GiB);
    }
    const latest = mac
      ? Date.now() + (seconds === 5910 ? 9000 : 2400) * 1000
      : invokedAt + 29 * 60_000;
    const wPort = reservation?.port ?? 8491,
      rPort = wPort + 10;
    write(path.join(out, "attempt.json"), {
      identity,
      arm,
      collector: variant.collector,
      receiptPredecessors,
      reservation: reservation?.slot ?? null,
      caps,
      heaps,
      cpus,
      seconds,
      platform: process.platform,
    });
    const stackProcess = spawnBound(
      "bash",
      [
        "lab/experiments/EXP-DX1/stack/up.sh",
        slot,
        "--port-write",
        String(wPort),
        "--port-read",
        String(rPort),
        "--cpus-tx",
        cpus.tx,
        "--cpus-pg",
        cpus.pg,
        "--cpus-gw-write",
        cpus["gw-w"],
        "--cpus-gw-read",
        cpus["gw-r"],
        "--pg-memory",
        caps.pg + "m",
        "--tx-memory",
        caps.tx + "m",
        "--tx-java-opts",
        "-Xms256m -Xmx" + heaps.tx + "m -XX:+UseG1GC -XX:MaxGCPauseMillis=50 " + gc("tx"),
        "--object-cache-max",
        mac ? "160m" : "2560m",
        "--memory-index-threshold",
        mac ? "48m" : "128m",
        "--memory-index-max",
        mac ? "128m" : "512m",
        "--pg-settings",
        "-c shared_buffers=" +
          (mac ? "64MB" : "1GB") +
          " -c synchronous_commit=on -c fsync=on -c full_page_writes=on",
      ],
      {
        env,
        log: path.join(out, "stack.log"),
        signal,
        deadline: Math.min(latest, Date.now() + 300_000),
      },
    );
    assert.deepEqual(
      await stackProcess.done,
      { code: 0, signal: null },
      "Stack startup failed; see stack.log",
    );
    const stack = readJson(path.join(attempt, "stack.json"));
    const ids = {};
    for (const role of roles) {
      const m = inspect(names[role]),
        row = stack.containers.find((c) => c.name === names[role]);
      assert(m?.State.Running && row?.id === m.Id && m.Config.Labels[nameLabel] === nonce);
      assert.equal(row.memory, caps[role] * MiB);
      assert.equal(row.cpuset, cpus[role]);
      if (role !== "pg") assert.equal(row.imageId, image);
      ids[role] = m.Id;
    }
    for (const key of ["fsync", "synchronous_commit", "full_page_writes"])
      assert.equal(stack.durability[key], "on");
    assert.equal(
      docker(["exec", ids.tx, "sha256sum", "/opt/datomic/" + peerJar]).split(/\s+/)[0],
      peerHash,
    );
    const runtimeFlags = {};
    for (const role of ["gw-w", "gw-r", "tx"]) {
      const args = docker([
        "exec",
        ids[role],
        "sh",
        "-c",
        [
          "for p in /proc/[0-9]*; do",
          '  [ "$(cat "$p/comm" 2>/dev/null)" = java ] || continue',
          '  tr "\\000" "\\n" < "$p/cmdline" | grep -E "^(-Xm[sx]|-XX:)"',
          "done",
        ].join("\n"),
      ]).split("\n");
      assert.equal(args.filter((arg) => arg.startsWith("-Xmx")).at(-1), "-Xmx" + heaps[role] + "m");
      const selected = role === "gw-w" ? variant.flags : ["-XX:+UseG1GC"];
      for (const flag of selected) assert(args.includes(flag), role + " did not apply " + flag);
      runtimeFlags[role] = args;
    }
    write(path.join(out, "runtime-flags.json"), { identity, ids, flags: runtimeFlags });
    if (options.gate === true) {
      // [DX-TAIL1] Why: use two native writers and an independent replay on their actual receipts.
      // Rejected: exercising only the in-memory adapter or collecting benchmark samples from the gate.
      const suiteEnv = {
        ...env,
        DATOMIC_INTEGRATION: "1",
        DATOMIC_GATEWAY_URL: stack.writeUrl,
        DATOMIC_URL: stack.writeUrl,
        DATOMIC_READ_URLS: stack.readUrl,
        TRIPLEX_DATOMIC_LAYOUT: "lean",
        DX_TAIL1_RECEIPT_CASE: path.join(out, "receipt-native.json"),
        DX_TAIL1_RECEIPTS: "1",
        DX_ACT1_NATIVE: "1",
        DELTA_ATTEMPT: out,
      };
      const checks = [
        [
          "predecessor",
          "node_modules/.bin/vitest",
          [
            "run",
            "packages/datomic/test/predecessor.test.ts",
            "packages/datomic/test/commit-fast.test.ts",
          ],
        ],
        [
          "erasure",
          process.execPath,
          ["--import", "tsx", "--test", "lab/experiments/EXP-DX1/actv-delta/erasure.test.ts"],
        ],
        [
          "oracle",
          "python3",
          [
            path.join(import.meta.dirname, "receipt-oracle.py"),
            out,
            path.join(oracle, "lab/oracles/replay/cli.py"),
          ],
        ],
      ];
      const outcomes = [];
      for (const [name, program, args] of checks) {
        signal.throwIfAborted();
        const check = spawnBound(program, args, {
          env: suiteEnv,
          log: path.join(out, name + ".log"),
          signal,
          deadline: Date.now() + 120_000,
        });
        outcomes.push({ name, ...(await check.done) });
      }
      write(path.join(out, "gate-exits.json"), { identity, ids, outcomes });
      assert(
        outcomes.every((result) => result.code === 0 && result.signal === null),
        "Native predecessor, erasure or oracle check failed",
      );
      return;
    }
    console.log("DX-TAIL1 stack ready, seeding 10,000 deep people");
    driver = spawnBound(
      process.execPath,
      [
        "--max-old-space-size=" + (mac ? "2304" : "6144"),
        "--import",
        "tsx",
        "lab/bench/driver.ts",
        "--lane",
        "datomic",
        "--composition",
        "reach",
        "--profile",
        "deep",
        "--rung",
        "deep-10k",
        "--deep-nonce",
        nonce,
        "--deep-barrier",
        barrier,
        "--zero-readers",
        "--oracle-root",
        oracle,
        "--output",
        reportFile,
        "--read-path",
        "replica",
        "--reader-threads",
        "6",
        "--seed-batch-facts",
        "2000",
        "--replica-history-mib",
        "192",
        "--replica-world-cache-mib",
        "32",
        "--replica-fallback-thread",
        "worker",
        "--reader-basis-wire",
        "delta",
        "--expected-state-retention",
        "worker-journal",
        "--receipt-capture",
        "replica-worker",
        "--tail1-offers",
        input,
        "--tail1-seconds",
        String(seconds),
      ],
      {
        env: {
          ...env,
          TRIPLEX_DATOMIC_LAYOUT: "lean",
          DATOMIC_URL: stack.writeUrl,
          DATOMIC_READ_URLS: stack.readUrl,
          TRIPLEX_TRACE_DIR: path.join(raw, "trace"),
          DX_MODEL_COMPACT: "1",
          DX_NATIVE_GATES: "0",
          DX_PUBLICATION_MODE: "worker",
          DX_SERVER_RECORD_TIME: "1",
          DX_STRICT_RECORD_CLOCKS: "1",
          DX_TAIL1_RECEIPTS: receiptPredecessors ? "1" : "0",
        },
        log: path.join(out, "driver.log"),
        signal,
        deadline: latest - 120_000,
      },
    );
    const readyFile = path.join(barrier, "s0.ready.json");
    await waitFor(
      () => fs.existsSync(readyFile),
      driver.child,
      signal,
      latest - seconds * 1000 - 135_000,
    );
    const ready = readJson(readyFile);
    for (const role of roles) {
      const m = inspect(ids[role]);
      assert(
        m?.State.Running && !m.State.OOMKilled && m.RestartCount === 0,
        role + " restarted during seeding",
      );
    }
    assert.deepEqual(ready.identity, identity);
    assert.deepEqual(ready.seed, readJson(input).seed);
    assert.equal(ready.trace, frozenDeep(0, 10000).sha256);
    if (mac) macWindow = await holdMacWindow(identity, signal, latest - seconds * 1000 - 135_000);
    const { identity: _, ...readyBody } = ready;
    const start = Date.now() + 12_000;
    if (macWindow) {
      if (options.full === true) {
        // [DX-TAIL1] Why: the continuous 98.5-minute diagnostic must preserve the offer gaps.
        // Rejected: monopolizing the lab lock for all 98.5 minutes or pausing the archived traffic.
        windowTimer = setTimeout(releaseMacWindow, start + 240_000 - Date.now());
      } else {
        windowTimer = setTimeout(
          () => controller.abort(Error("Mac measured hold reached fifteen minutes")),
          macWindow.record.at + 890_000 - Date.now(),
        );
      }
    }
    write(path.join(barrier, "go.json"), { ...identity, start, scopes: { s0: readyBody } });
    await waitFor(
      () => fs.existsSync(path.join(barrier, "s0.armed.json")),
      driver.child,
      signal,
      start - 300,
    );
    releaseDeepStart(barrier, [identity], start);
    measuredStart = start;
    console.log("DX-TAIL1 offers released: " + plan.primary + " primary saves");
    const samples = path.join(out, "resources.jsonl");
    const sample = () => {
      const before = Date.now(),
        stats = reading(ids),
        after = Date.now();
      fs.appendFileSync(samples, JSON.stringify({ identity, ids, before, after, stats }) + "\n");
    };
    sample();
    timer = setInterval(() => {
      try {
        diskFloor(out);
        sample();
      } catch (error) {
        controller.abort(error);
      }
    }, 5000);
    const exit = await driver.done;
    clearInterval(timer);
    signal.throwIfAborted();
    assert.deepEqual(exit, { code: 0, signal: null }, "Driver failed; see driver.log");
    sample();
    releaseMacWindow();
    signal.throwIfAborted();
    const report = readJson(reportFile);
    assert.equal(report.traceStartAbsMs, start);
    assert.deepEqual(report.deep.identity, identity);
    assert.deepEqual(report.tailReplay, plan);
    assert.equal(report.status, "DONE");
    assert.equal(report.receiptCapture.matched, plan.primary);
    assert.equal(report.receiptCapture.missing + report.receiptCapture.mismatches, 0);
    assert.equal(report.oracle.mismatchCount, 0);
    assert.equal(report.oracle.exitCode, 0);
    assert(
      report.oracle.reads > 0 && report.oracle.modelCorrectOnSameReads === report.oracle.reads,
    );
    for (const role of roles) {
      const m = inspect(ids[role]);
      assert(m?.State.Running && !m.State.OOMKilled && m.RestartCount === 0);
    }
    const recording = path.join(trace, "gw-w.jfr");
    try {
      fs.writeFileSync(path.join(trace, ".finish"), "", { flag: "wx" });
      const complete = recording + "-complete.jsonl";
      const until = Date.now() + 30_000;
      while (!fs.existsSync(complete) && Date.now() < until)
        await delay(250, undefined, { signal });
      const seal = readJson(complete);
      assert.equal(seal.fileSha256, sha256File(recording));
      assert.equal(seal.source, identity.source);
      assert.equal(seal.run, slot);
      assert.equal(seal.slot, slot);
      assert.equal(seal.process, "gw-w");
    } catch (error) {
      signal.throwIfAborted();
      write(path.join(out, "allocation-dump-error.json"), { error: String(error) });
    }
    for (const file of ["ns-report.json", "oracle-case.json", "oracle-expected.json"])
      fs.copyFileSync(path.join(raw, file), path.join(out, file), fs.constants.COPYFILE_EXCL);
    output(path.join(out, "ns-writes.jsonl.zst"), "zstd", [
      "-q",
      "-c",
      path.join(raw, "ns-writes.jsonl"),
    ]);
  } finally {
    clearInterval(timer);
    clearTimeout(windowTimer);
    if (driver) {
      driver.stop();
      await driver.done;
    }
    releaseMacWindow();
    if (fs.existsSync(reportFile) && !fs.existsSync(path.join(out, "ns-report.json")))
      fs.copyFileSync(reportFile, path.join(out, "ns-report.json"), fs.constants.COPYFILE_EXCL);
    for (const name of ["s0.ready.json", "s0.armed.json", "release.json"]) {
      const file = path.join(barrier, name);
      if (fs.existsSync(file))
        fs.copyFileSync(file, path.join(out, name), fs.constants.COPYFILE_EXCL);
    }
    if (reservation || !mac) {
      // [DX-TAIL1] Why: a partial startup still owns only its individually labelled objects.
      // Rejected: bulk pruning, wiping the shared Datomic slot or stopping other holders.
      const stopped = [];
      for (const role of ["gw-r", "gw-w", "tx", "pg", "extract"]) {
        const m = inspect(slot + "-" + role);
        if (!m) continue;
        assert.equal(m.Config.Labels[nameLabel], nonce);
        if (m.State.Running) docker(["stop", "--time", "12", m.Id]);
        fs.writeFileSync(
          path.join(out, role + "-exit.log"),
          docker(["logs", "--tail", "100", m.Id]) + "\n",
        );
        docker(["rm", "-v", m.Id]);
        assert.equal(inspect(m.Id), null);
        stopped.push({ role, id: m.Id, oom: m.State.OOMKilled, restarts: m.RestartCount });
      }
      for (const [kind, suffix] of [
        ["volume", "pg-data"],
        ["network", "net"],
      ]) {
        const name = slot + "-" + suffix;
        const raw = docker([kind, "inspect", name], { allowFail: true });
        if (!raw) continue;
        assert.equal(JSON.parse(raw)[0].Labels[nameLabel], nonce);
        docker([kind, "rm", name]);
        assert.equal(docker([kind, "inspect", name], { allowFail: true }), null);
      }
      try {
        if (
          measuredStart !== undefined &&
          fs.existsSync(path.join(out, "ns-writes.jsonl.zst")) &&
          !fs.existsSync(path.join(out, "allocation-dump-error.json"))
        ) {
          // [DX-TAIL1] Why: decode in the still-admitted space of the stopped writer.
          // Rejected: adding its CPU or heap to the timed window.
          const recording = path.join(trace, "gw-w.jfr");
          assert(fs.statSync(recording).size > 0, "Missing Java allocation recording");
          const profileLog = path.join(out, "profile.log");
          const profile = spawnBound(
            "docker",
            [
              "-H",
              host,
              "run",
              "--rm",
              "--pull",
              "never",
              "--network",
              "none",
              "--read-only",
              "--name",
              names["gw-w"],
              "--label",
              nameLabel + "=" + nonce,
              "--memory",
              "384m",
              "--memory-swap",
              "384m",
              "--tmpfs",
              "/tmp:size=24m",
              "--mount",
              "type=bind,src=" + recording + ",dst=/profile.jfr,readonly",
              "--mount",
              "type=bind,src=" +
                path.join(import.meta.dirname, "profile.clj") +
                ",dst=/profile.clj,readonly",
              "-e",
              "DATOMIC_JAVA_OPTS=-Xms64m -Xmx224m",
              "--entrypoint",
              "/opt/datomic/bin/run",
              image,
              "/profile.clj",
              String(measuredStart),
              String(measuredStart + seconds * 1000),
            ],
            { env, log: profileLog, signal, deadline: Date.now() + 30_000 },
          );
          assert.deepEqual(
            await profile.done,
            { code: 0, signal: null },
            "Allocation profile decode failed",
          );
          const profileJson = fs
            .readFileSync(profileLog, "utf8")
            .split("\n")
            .filter((line) => line.startsWith("{"))
            .at(-1);
          write(path.join(out, "allocation.json"), JSON.parse(profileJson));
        }
      } catch (error) {
        write(path.join(out, "allocation-decode-error.json"), { error: String(error) });
      } finally {
        const helper = inspect(names["gw-w"]);
        if (helper) {
          assert.equal(helper.Config.Labels[nameLabel], nonce);
          docker(["rm", "-fv", helper.Id]);
          assert.equal(inspect(helper.Id), null);
        }
        if (reservation)
          await withPool((ledger) => {
            assert.equal(readOwner(reservation)?.holder, holder);
            const removed = Object.values(names);
            ledger.reservations = ledger.reservations.filter(
              (row) => !removed.includes(row.container),
            );
            manager.releaseSlot(reservation);
          });
        write(path.join(out, "cleanup.json"), {
          identity,
          stopped,
          released: reservation?.slot ?? null,
        });
      }
    }
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  if (measuredStart !== undefined) {
    execFileSync("python3", [path.join(import.meta.dirname, "measure.py"), out], {
      timeout: 45_000,
      stdio: "inherit",
    });
  }
}
