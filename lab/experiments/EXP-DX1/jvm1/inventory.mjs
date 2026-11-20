import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { admission, docker, DOCKER_HOST, listTx2Containers, slotInfo, vmDisk, withPool } from "../../../bin/lib.mjs";

const holder = "DX-JVM1";
const stack = path.join(import.meta.dirname, "../stack");
const mebibyte = 2 ** 20;

export async function inventory(options, config, manager) {
  assert.equal(process.platform, "darwin");
  assert.equal(process.env.DOCKER_HOST, DOCKER_HOST);
  assert.equal(options.holder, holder);
  const caps = { pg: 320, tx: 1056, "gw-w": 1408, "gw-r": 768 };
  const cpus = { pg: "0", tx: "0", "gw-w": "1", "gw-r": "2" };
  const prefix = "tx2-dxt1-jvm1-" + randomUUID();
  const out = path.resolve(options.out);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  fs.mkdirSync(out);
  const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + "\n", {flag:"wx"});
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DX_|TRIPLEX_|DATOMIC_|TX2_|JAVA_OPTS$|JAVA_TOOL_OPTIONS$|_JAVA_OPTIONS$|JDK_JAVA_OPTIONS$)/.test(key)));
  Object.assign(env, {
    DX_STACK_EVIDENCE: out,
    DX_STACK_WAIT_FOR_TRANSACTOR: "1",
    DX_JVM_EVIDENCE: "1",
    DX_NATIVE_SETTINGS_READBACK: "1",
    DX_QUIET_LOGS: "1",
    DX_GW_WRITE_MEMORY: caps["gw-w"] + "m",
    DX_GW_READ_MEMORY: caps["gw-r"] + "m",
    DX_GW_WRITE_JAVA_OPTS: "-Xms256m -Xmx896m -XX:+UseSerialGC -Ddatomic.objectCacheMax=32m",
    DX_GW_READ_JAVA_OPTS: "-Xms256m -Xmx416m -XX:+UseG1GC -Ddatomic.objectCacheMax=32m",
  });
  let slot;
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
        console.log("Waiting for JVM inventory slot");
        await delay(15_000, undefined, {signal:controller.signal});
      }
    }
    const source = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim();
    const files = [import.meta.filename, path.join(import.meta.dirname, "readback.sh"), path.join(stack, "up.sh")];
    write("attempt.json", {prefix, source, slot:slot.slot, at:new Date(), caps, cpus, files:Object.fromEntries(files.map((file) => [path.basename(file), createHash("sha256").update(fs.readFileSync(file)).digest("hex")]))});
    const child = spawn("bash", [
      path.join(stack,"up.sh"), prefix, "--no-publish",
      "--cpus-tx", cpus.tx, "--cpus-pg", cpus.pg, "--cpus-gw-write", cpus["gw-w"], "--cpus-gw-read", cpus["gw-r"],
      "--pg-memory", caps.pg+"m", "--tx-memory", caps.tx+"m",
      "--tx-java-opts", "-Xms256m -Xmx704m -XX:+UseG1GC -XX:MaxGCPauseMillis=50",
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
