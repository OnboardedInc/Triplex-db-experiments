import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { readScaleJvms, scaleHost, startScaleStack } from "../scale1/bench.ts";
import { now } from "../scale1/decision/observer.ts";
import { field, task, writeTape } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Sender } from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, hex, readScaleSeal } from "../v01/adopt.ts";
import { checkSavedIdentity, feeder, jsonFile } from "../v01/adopted.ts";
import { stackOptions } from "../v01/profile.ts";
import { cleanSource, verifyBuild } from "../v01/source.ts";
import { coldAdmission } from "./cold-admission.mjs";
import { coldStartLog, launchProfile } from "./launch.mjs";
import { summarizeOffers } from "./cold-windows.mjs";

const [source, out, seedDir, imagePin, transferPin, physicalDir, control, walMount] = process.argv.slice(2);
assert(source && out && seedDir && imagePin && transferPin && physicalDir && control && walMount);
assert.match(control, /^[a-f0-9]{64}$/);
assert(path.isAbsolute(out) && path.isAbsolute(physicalDir) && path.isAbsolute(walMount));
const epoch = Date.now();
const deadline = epoch + 55 * 60_000;
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock");
const held = fs.fstatSync(9);
assert.deepEqual([held.ino, held.dev], [lock.ino, lock.dev]);
scaleHost.physical();
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
const seed = readScaleSeal(path.join(fs.realpathSync(seedDir), "image.json"), imagePin, false, transferPin);
const pgdata = fs.realpathSync(physicalDir), walDirectory = fs.realpathSync(walMount);
assert.equal(hex(fs.readFileSync(path.join(pgdata, "global/pg_control"))), control);
const dockerRoot = execFileSync("docker", ["info", "--format", "{{.DockerRootDir}}"], { encoding: "utf8" }).trim();
const volumes = path.join(dockerRoot, "volumes");
assert.notEqual(fs.statSync(volumes).dev, fs.statSync(walDirectory).dev, "WAL and data must use separate filesystems");
const seedBytes = Number(execFileSync("du", ["-sB1", "--", pgdata], { encoding: "utf8" }).split(/\s/)[0]);
assert(seedBytes > 100 * 10 ** 9 && scaleHost.available(volumes) >= seedBytes + 20 * 1024 ** 3, "No room for one disposable copy");
assert(scaleHost.available(walDirectory) >= 16 * 1024 ** 3, "Insufficient WAL disk");
const tape = writeTape(100_000, 235, 0, false, 300);
assert(tape.length === 70_500 && tape.filter((e) => e.account === 0).length === 1050);
const tapeSha256 = hex(JSON.stringify(tape));
fs.mkdirSync(out);
jsonFile(path.join(out, "input.json"), { source, imagePin, transferPin, control, tapeSha256, admission: coldAdmission });

let stopped = false;
const stop = () => { stopped = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
for (const [arm, startup, ramp] of [
  ["today", "today", false], ["startup-tuned", "tuned", false], ["startup-tuned-ramp", "tuned", true],
] as const) {
  assert(!stopped && Date.now() + 7 * 60_000 < deadline, "No time for another arm");
  const armDeadline = Math.min(deadline, Date.now() + 18 * 60_000);
  const dir = path.join(out, arm);
  fs.mkdirSync(dir);
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-cold-" + attempt.replace(/-/g, "").slice(0, 12);
  jsonFile(path.join(dir, "attempt.json"), { source, tag: arm, slot, attempt, control, imagePin, transferPin, tapeSha256 });
  const policy = launchProfile("server", { jvm: "j21-g1", txJvm: "j25-zgc", creditMode: "barrier6", startup });
  assert(Object.values(scaleHost.childrenInventory(slot)).every((xs) => xs.length === 0));
  const startedAt = now();
  try {
    const { engines } = startScaleStack(dir, slot, source, false, stackOptions("subject", attempt), {
      policy, walDirectory, coldSeed: { pgdata, control, log: coldStartLog },
    });
    const stackEvidence = path.join(dir, "engines", slot);
    const trace = path.join(stackEvidence, "trace/raw");
    const [copy] = JSON.parse(fs.readFileSync(path.join(stackEvidence, "pgdata-copy-container.json"), "utf8"));
    const mounts = new Map<string, { Source: string; Name?: string; RW: boolean }>(
      copy.Mounts.map((mount: { Destination: string }) => [mount.Destination, mount]));
    assert.deepEqual([copy.Name, copy.Image, copy.State.ExitCode],
      ["/" + slot + "-seed-copy", engines.pg!.image, 0]);
    assert.deepEqual([mounts.get("/from")?.Source, mounts.get("/from")?.RW], [pgdata, false]);
    assert.deepEqual([mounts.get("/to")?.Name, mounts.get("/to")?.RW], [slot + "-pg-data", true]);
    assert.deepEqual([mounts.get("/wal")?.Source, mounts.get("/wal")?.RW], [path.join(walDirectory, slot), true]);
    const [copiedControl, copiedWal] = fs.readFileSync(path.join(stackEvidence, "pgdata.control.sha256"), "utf8").trim().split("\n");
    assert.equal(copiedControl, control);
    assert.match(copiedWal ?? "", /^[a-f0-9]{64}$/);
    const writer = new DatomicClient(`http://${engines["gw-w"]!.address}:8080`, 35000);
    const reader = new DatomicClient(`http://${engines["gw-r"]!.address}:8080`, 35000);
    const postgres = engines.pg!.id;
    const ready = now();
    const inspect = execFileSync("docker", ["inspect", ...Object.values(engines).map((e) => e.id)]);
    fs.writeFileSync(path.join(dir, "containers.json"), inspect, { flag: "wx" });
    const collector = spawn("taskset", ["-c", "10", "python3", new URL("./cold-counters.py", import.meta.url).pathname, dir,
      path.join(dir, "containers.json"), slot, source, attempt, String(process.pid)], { stdio: "inherit" });
    const collected = new Promise<number | null>((resolve, reject) => {
      collector.once("error", reject);
      collector.once("exit", resolve);
    });
    void collected.catch(() => {});
    try {
      const countersReady = path.join(dir, "counters-ready.json");
      for (let tries = 0; tries < 80 && !fs.existsSync(countersReady) && collector.exitCode === null; tries++)
        await sleep(50);
      const counterStamp = JSON.parse(fs.readFileSync(countersReady, "utf8"));
      assert.deepEqual([counterStamp.slot, counterStamp.source, counterStamp.attempt], [slot, source, attempt]);
      for (const [role, engine] of Object.entries(engines)) assert.equal(counterStamp.roles[role].id, engine.id);

      const initial = await writer.begin(seed.scope.db);
      await writer.release(seed.scope.db, initial.handle);
      assert.equal(initial.position, seed.scope.cut);
      const options = await writer.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
      assert.deepEqual([options.attempt, options.database, options.position, options.rowsVersion,
        options.strictRecordClocks, options.subjectSave, options.subjectNumericOwner, options.subjectOrderedIds,
        options.subjectPrefetch], [attempt, seed.scope.db, seed.scope.cut, 3, true, true, true, true, false]);
      assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
      const senders: Sender[] = seed.scope.accounts.map((account) => {
        const subjects = new Map(tape.filter((e) => e.account === account).map((e) => [task(account, e.subject), e.subject]));
        return { client: writer, scope: seed.scope, rows: new Map(), loadPredecessor: async (entity) => {
          const rows = await writer.rows(seed.scope.db, {
            entityIds: [entity], basis: { recordedPosition: seed.scope.cut, validAt: SEED_VALID_FROM },
          });
          return [0, 1, 2].map((n) => {
            const fields = rows.filter((row) => row.entity_id === entity && row.attribute === field(n));
            assert.equal(fields.length, 1);
            const [row] = fields;
            assert(row?.id && row.recorded_position > 0 && row.recorded_position <= seed.scope.cut && Number.isFinite(row.recorded_at));
            assert.equal(row.value_string, fieldValue(subjects.get(entity)!, 0, n, 0).value);
            return row;
          });
        } };
      });
      assert(!stopped && Date.now() + 6 * 60_000 < armDeadline, "Not enough time after start");
      const start = now() + 200;
      jsonFile(path.join(dir, "start.json"), { source, slot, attempt, startedAt, ready, start });
      const writes = await play(senders, tape, start, attempt, true, true, creditModeSelection("barrier6"), undefined, false,
        { ramp, stopped: () => stopped || Date.now() + 45_000 >= armDeadline });
      jsonFile(path.join(dir, "sampling-stop.json"), { slot, commit: source, nonce: attempt });
      assert.equal(await collected, 0);
      await resolveUncertain(senders, writes.unresolved);
      jsonFile(path.join(dir, "operations.json"), writes.rows);
      const last = await writer.begin(seed.scope.db);
      await writer.release(seed.scope.db, last.handle);
      const seedReadback = await checkAdoptedPeer(reader, seed, last.position);
      const journal = await feeder(reader, seed.scope.db, seed.scope.cut, Math.min(armDeadline - 15_000, Date.now() + 150_000),
        () => last.position, true);
      const byPosition = new Map(journal.map((row) => [row.position, row]));
      const durable = writes.rows.filter((row) => row.receipt);
      assert.equal(journal.length, durable.length);
      for (const row of durable) {
        const observed = byPosition.get(row.receipt!.p);
        assert(observed);
        checkSavedIdentity(row, observed, "subject", options.subjectFunction);
        byPosition.delete(row.receipt!.p);
      }
      assert.equal(byPosition.size, 0);
      assert.equal(writes.rows.length, tape.length);
      assert(writes.rows.every((row) => row.receipt || row.status === "startup-refused" || row.status === "expired-before-dispatch"),
        "Unsettled save or unexpected rejection");
      assert(!ramp || writes.rows.every((row) => row.status !== "expired-before-dispatch"));
      assert(writes.rows.filter((r) => r.status === "startup-refused").every((r) => !r.dispatched && !r.sent && !r.receipt));
      for (const role of ["tx", "gw-w", "gw-r"])
        assert(fs.statSync(path.join(trace, role + "-startup.log")).size > 0);
      assert(fs.statSync(path.join(trace, "prep1-native.ndjson")).size > 0);
      assert(fs.statSync(path.join(trace, "cold-index-jobs.log")).isFile());
      const indexSamples = fs.readFileSync(path.join(trace, "cold-index.ndjson"), "utf8").trimEnd().split("\n");
      assert(indexSamples.slice(0, -1).map((line) => JSON.parse(line)).some(
        (sample) => sample.attempt === attempt && sample.observer?.status === "installed"));
      const java = readScaleJvms(path.join(dir, "jvm"), engines, policy);
      for (const [role, id] of [["postgres", postgres], ["transactor", engines.tx!.id]] as const) {
        const log = fs.openSync(path.join(dir, role + ".log"), "wx");
        try { execFileSync("docker", ["logs", "--timestamps", id], { stdio: ["ignore", log, log] }); }
        finally { fs.closeSync(log); }
      }
      const firstAck = durable.filter((r) => r.status === "acked").reduce((min, row) => Math.min(min, row.end!), Infinity);
      assert(Number.isFinite(firstAck), "No acknowledged saves");
      jsonFile(path.join(dir, "journal.json"), journal);
      jsonFile(path.join(dir, "observed.json"), { source, slot, attempt, control, copiedWal, tapeSha256, imagePin, policy, java, seedReadback,
        firstAcknowledgementAfterSeconds: (firstAck - ready) / 1000,
        ...summarizeOffers(writes.rows, start) });
    } finally {
      writer.close(); reader.close();
      if (!fs.existsSync(path.join(dir, "sampling-stop.json"))) jsonFile(path.join(dir, "sampling-stop.json"), { slot, commit: source, nonce: attempt });
      collector.kill();
      await collected.catch(() => {});
    }
  } finally {
    scaleHost.clean(dir, slot);
  }
}
