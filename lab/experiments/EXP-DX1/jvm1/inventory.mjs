// @ts-nocheck -- Engine reservations, CLI options and Docker evidence are verified dynamically.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { admission, docker, DOCKER_HOST, listTx2Containers, slotInfo, vmDisk, withPool } from "../../../bin/lib.mjs";
import { finishNativeRecording, preservePreReadyRecordings, startWalSamples } from "../../../trace/native-recording.mjs";

const holder = "DX-JVM1";
const stack = path.join(import.meta.dirname, "../stack");
const mebibyte = 2 ** 20;

export async function inventory(options, config, manager) {
  assert.equal(process.platform, "darwin");
  assert.equal(process.env.DOCKER_HOST, DOCKER_HOST);
  assert.equal(options.holder, holder);
  const sdkGate = options["sdk-gate"] === true;
  const recordEvents = options.events === true;
  assert(!recordEvents || sdkGate, "Use --events with --sdk-gate");
  const sdkFiles = options["sdk-files"] === undefined ? [] : String(options["sdk-files"]).split(",");
  assert(!sdkFiles.length || (sdkGate && sdkFiles.every((file) => /^[a-z0-9-]+\.test\.ts$/.test(file))),
    "Use --sdk-files with --sdk-gate and comma-separated Datomic SDK test filenames");
  const sdkTestName = options["sdk-test-name"];
  assert(sdkTestName === undefined || (typeof sdkTestName === "string" && sdkFiles.length),
    "Use --sdk-test-name with --sdk-files");
  const zgc = options.zgc === true;
  const g1 = options.g1 === true;
  const javaMajor = process.env.DX_JAVA ?? "21";
  assert(!zgc || javaMajor === "25", "The shared Mac ZGC correctness gate requires Java 25");
  assert(!(g1 && zgc), "Select at most one uniform collector");
  const collectors = zgc ? { tx: "Z", "gw-w": "Z", "gw-r": "Z" }
    : { tx: "G1", "gw-w": g1 ? "G1" : "Serial", "gw-r": "G1" };
  // [DX-JVM1] Why: exercise ZGC in every serving role with the same small Mac reservation.
  // Rejected: using the server heap budget or comparing collector pause timing on the shared Mac.
  const gc = (role) => `-XX:+Use${collectors[role]}GC` + (zgc ? " -XX:ConcGCThreads=1 -XX:ParallelGCThreads=1" : "");
  const caps = { pg: 320, tx: 1056, "gw-w": 1408, "gw-r": 768 };
  const cpus = { pg: "0", tx: "0", "gw-w": "1", "gw-r": "2" };
  const prefix = "tx2-dxt1-jvm1-" + randomUUID();
  const out = path.resolve(options.out);
  const root = path.resolve(import.meta.dirname, "../../../.."), pkg = path.join(root, "packages/datomic");
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  fs.mkdirSync(out);
  const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + "\n", {flag:"wx"});
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DX_|TRIPLEX_|DATOMIC_|TX2_|JAVA_OPTS$|JAVA_TOOL_OPTIONS$|_JAVA_OPTIONS$|JDK_JAVA_OPTIONS$)/.test(key)));
  Object.assign(env, {
    DX_JAVA: javaMajor,
    ...(process.env.DX_DATOMIC_IMAGE_RECEIPT ? { DX_DATOMIC_IMAGE_RECEIPT: process.env.DX_DATOMIC_IMAGE_RECEIPT } : {}),
    DX_STACK_EVIDENCE: out,
    DX_STACK_WAIT_FOR_TRANSACTOR: "1",
    DX_JVM_EVIDENCE: "1",
    DX_NATIVE_SETTINGS_READBACK: "1",
    DX_QUIET_LOGS: "1",
    DX_GW_WRITE_MEMORY: caps["gw-w"] + "m",
    DX_GW_READ_MEMORY: caps["gw-r"] + "m",
    DX_GW_WRITE_JAVA_OPTS: "-Xms256m -Xmx896m " + gc("gw-w") + " -Ddatomic.objectCacheMax=32m",
    DX_GW_READ_JAVA_OPTS: "-Xms256m -Xmx416m " + gc("gw-r") + " -Ddatomic.objectCacheMax=32m",
    ...(sdkGate ? { DX_SERVER_RECORD_TIME: "1", DX_STRICT_RECORD_CLOCKS: "1", DX_GATEWAY_SELFTEST: "1" } : {}),
    ...(recordEvents ? { TRIPLEX_TRACE_LEVEL: "summary", TRIPLEX_TRACE_COMPONENTS: "gateway,tx-jfr,gw-jfr,postgres" } : {}),
  });
  let slot;
  const admissionDeadline = Date.now() + 60_000;
  try {
    // [DX-JVM1] Why: the three roles need one exclusively owned SQL reservation and a private volume.
    // Rejected: attaching to the resident stack or charging split processes as a single running container.
    while (!slot) {
      controller.signal.throwIfAborted();
      const disk = fs.statfsSync(out);
      assert(disk.bavail * disk.bsize >= 5 * 2 ** 30, "Host disk below lab floor");
      slot = await withPool((ledger) => {
        manager.assertMeasureAdmission(holder);
        const running = listTx2Containers({ all: true });
        const candidate = ["s1", "s2", "s3"].map((id) => slotInfo(config, "datomic", id))
          .find((info) => !fs.existsSync(info.lockDir) && !running.some((row) => row.name === info.container));
        const request = {
          container: prefix + "-pg",
          memBytes: Object.values(caps).reduce((a, b) => a + b) * mebibyte,
          diskForecastBytes: 2 ** 30,
        };
        const verdict = admission({config, reservations:ledger.reservations, running, request, diskUsedBytes: vmDisk(config).usedBytes});
        if (!candidate || !verdict.ok) return;
        assert(manager.acquireSlot(candidate, holder, holder).created);
        for (const [role, cap] of Object.entries(caps)) {
          ledger.reservations.push({
            container: prefix + "-" + role, lane:"datomic", slot:candidate.slot, holder,
            pid:process.pid, state:"jvm-inventory", cpus:1, memBytes:cap * mebibyte,
            diskForecastBytes:role === "pg" ? request.diskForecastBytes : 0,
          });
        }
        return candidate;
      });
      if (!slot) {
        assert(Date.now() < admissionDeadline, "No sufficiently small exclusive slot became available");
        console.log("Waiting for JVM inventory slot");
        await delay(15_000, undefined, {signal:controller.signal});
      }
    }
    const source = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim();
    const files = [import.meta.filename, path.join(import.meta.dirname, "readback.sh"), path.join(import.meta.dirname, "launch.mjs"), path.join(stack, "up.sh"), ...sdkFiles.map((file) => path.join(pkg, "test", file))];
    write("attempt.json", {prefix, source, slot:slot.slot, diagnostic: true, javaMajor, collectors, sdkGate, sdkFiles, sdkTestName, recordEvents, at:new Date(), caps, cpus, files:Object.fromEntries(files.map((file) => [path.relative(root, file), createHash("sha256").update(fs.readFileSync(file)).digest("hex")]))});
    const child = spawn("bash", [
      path.join(stack,"up.sh"), prefix,
      "--gateway-src", path.join(pkg, "gateway"), "--codec-spec", path.join(pkg, "src/codec-spec.json"),
      ...(sdkGate ? ["--port-write", String(slot.port), "--port-read", String(slot.port + 10)] : ["--no-publish"]),
      "--cpus-tx", cpus.tx, "--cpus-pg", cpus.pg, "--cpus-gw-write", cpus["gw-w"], "--cpus-gw-read", cpus["gw-r"],
      "--pg-memory", caps.pg+"m", "--tx-memory", caps.tx+"m",
      "--tx-java-opts", "-Xms256m -Xmx704m " + gc("tx") + (zgc ? "" : " -XX:MaxGCPauseMillis=50"),
      "--object-cache-max", "160m", "--memory-index-threshold", "48m", "--memory-index-max", "128m",
      "--pg-settings", "-c shared_buffers=64MB -c synchronous_commit=on -c fsync=on -c full_page_writes=on",
    ], {env, stdio:"inherit", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(300_000)])});
    const status = await new Promise((resolve, reject) => {
      child.on("error", (error) => {
        if (error.name !== "AbortError") reject(error);
      });
      child.on("close", resolve);
    });
    assert.equal(status, 0, "Inventory stack startup did not complete");
    const stackConfig = JSON.parse(fs.readFileSync(path.join(out, prefix, "stack.json"), "utf8"));
    const readyAt = Date.now();
    await delay(5000, undefined, {signal:controller.signal});
    const roles = {};
    for (const c of stackConfig.containers.filter((c) => !c.name.endsWith("-pg"))) {
      const before = docker(["inspect", "--format", "{{.Id}} {{.State.StartedAt}} {{.RestartCount}} {{.State.Running}}", c.id]);
      const role = c.name.slice(prefix.length + 1);
      const observed = fs.readFileSync(path.join(out, prefix, "config", role + ".process.txt"), "utf8");
      assert.equal(/^collector=(.+)$/m.exec(observed)?.[1], "Use" + collectors[role] + "GC");
      const startedAt = /^startedAt=(.+)$/m.exec(observed)?.[1];
      const restarts = /^restarts=(\d+)$/m.exec(observed)?.[1];
      assert.equal(before, [c.id, startedAt, restarts, true].join(" "));
      const pid = /^pid=(\d+)$/m.exec(observed)?.[1];
      assert(pid);
      const rss = docker(["exec", c.id, "awk", "/^VmRSS:/ {print $2}", "/proc/" + pid + "/status"]);
      const memory = docker(["exec", c.id, "cat", "/sys/fs/cgroup/memory.current"]);
      assert.match(rss, /^\d+$/);
      assert.match(memory, /^\d+$/);
      assert.equal(docker(["inspect", "--format", "{{.Id}} {{.State.StartedAt}} {{.RestartCount}} {{.State.Running}}", c.id]), before);
      roles[role] = {id:c.id, imageId:c.imageId, pid:Number(pid), startedAt, restarts:Number(restarts),
        startupToAllReadyMs: readyAt - Date.parse(startedAt), processRssKiB:Number(rss), cgroupBytes:Number(memory)};
    }
    write("idle-boot.json", {prefix, source, slot:slot.slot, diagnostic: true, readyAt, sampledAt:Date.now(), roles});
    if (sdkGate) {
      // [DX-JVM1] Why: SDK regressions use both writer variables, and both must resolve to this reservation.
      // Rejected: relying on legacy localhost fallbacks, which can select another stack.
      const writer = "http://127.0.0.1:" + slot.port;
      const raw = path.join(out, prefix, "trace/raw");
      if (recordEvents) preservePreReadyRecordings(out, raw, roles);
      const log = fs.openSync(path.join(out, "sdk-sql.log"), "wx");
      const identity = {source, slot:prefix, nonce:prefix.slice("tx2-dxt1-jvm1-".length)};
      const pg = stackConfig.containers.find((c) => c.name === prefix + "-pg");
      const stopWal = recordEvents ? startWalSamples(out, pg.id, identity) : undefined;
      let status, failure;
      try {
        // [DX-JVM1] Why: keep the exact SDK test budget and sample WAL while the child works.
        // Rejected: treating Vitest's default five seconds as a performance bar or blocking the recorder's timer.
        const test = spawn(process.execPath, [path.join(root, "node_modules/vitest/vitest.mjs"), "run", "--maxWorkers=1",
          ...(sdkFiles.length ? ["--testTimeout=30000"] : []),
          ...(sdkTestName ? ["--testNamePattern", sdkTestName] : []),
          "--reporter=default", "--reporter=json", "--outputFile.json=" + path.join(out, "vitest.json"),
          ...sdkFiles.map((file) => "test/" + file)], {
          cwd: pkg, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(sdkFiles.includes("clock-order.test.ts") ? 300_000 : 240_000)]),
          stdio: ["ignore", log, log], env: {
            ...env, DATOMIC_INTEGRATION: "1", DATOMIC_URL: writer, DATOMIC_GATEWAY_URL: writer,
            DATOMIC_READ_URLS: "http://127.0.0.1:" + (slot.port + 10),
            ...(sdkFiles.includes("clock-order.test.ts") ? { DX_CLOCK_EVIDENCE_DIR: path.join(out, "clock") } : {}),
          },
        });
        status = await new Promise((resolve) => {
          test.once("error", (error) => { failure = error; });
          test.once("close", resolve);
        });
      } finally {
        fs.closeSync(log);
        await stopWal?.();
      }
      for (const [role, identity] of Object.entries(roles)) {
        const post = path.join(out, "post-sdk");
        execFileSync("bash", [path.join(import.meta.dirname, "readback.sh"), identity.id, post, role], { env, timeout: 30_000 });
        assert.deepEqual(fs.readFileSync(path.join(post, role + ".process.txt")),
          fs.readFileSync(path.join(out, prefix, "config", role + ".process.txt")));
      }
      assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), source);
      // [DX-JVM1] Why: preserve runtime binding even for failed assertions. Rejected: skipping JVM readback when the SDK exits nonzero.
      if (failure) throw failure;
      assert.equal(status, 0, "SDK assertions did not complete successfully. See sdk-sql.log and vitest.json");
      if (recordEvents) {
        // [DX-JVM1] Why: exercise the production recorder against this owned SQL gate's role IDs and source.
        // Rejected: counting trace files from a previous attempt or using the Mac timings as performance evidence.
        await finishNativeRecording(out, raw, identity, {...roles, pg: { id: pg.id }}, Date.now() + 45_000);
      }
    }
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    if (slot) {
      execFileSync("bash", [path.join(stack, "down.sh"), prefix, "--volumes"], {env, stdio:"inherit"});
      const objects = [
        docker(["ps", "-aq", "--filter", "name=^/"+prefix+"-"]),
        docker(["volume", "ls", "-q", "--filter", "name="+prefix]),
        docker(["network", "ls", "-q", "--filter", "name="+prefix]),
      ].filter(Boolean);
      write("cleanup.json", {prefix, objects});
      assert.deepEqual(objects, []);
      await withPool((ledger) => {
        ledger.reservations = ledger.reservations.filter((r) => !(r.holder === holder && r.pid === process.pid && r.container.startsWith(prefix+"-")));
        manager.releaseSlot(slot);
      });
    }
  }
}
