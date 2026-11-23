import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { readScaleJvms, scaleHost, startScaleStack } from "../scale1/bench.ts";
import { now } from "../scale1/decision/observer.ts";
import { field, task, writeTape, type Write } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Save, type Sender } from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, hex, readScaleSeal } from "../v01/adopt.ts";
import { checkSavedIdentity, feeder, jsonFile } from "../v01/adopted.ts";
import { stackOptions } from "../v01/profile.ts";
import { cleanSource, verifyBuild } from "../v01/source.ts";
import { coldStartLog, creditModes, launchProfile, type CreditMode } from "./launch.mjs";
import { summarizeOffers } from "./cold-windows.mjs";
import { agedAdmission, agedPredecessor, type AgedAdmission } from "./startup-aged.ts";

// [DX-JVM1] Why: time the first window after a restart of the three JVMs on storage that carried traffic, so the log tail
// names the active set as it would in production, and compare no read with the owner-approved one-time start-up read.
// Rejected: a start-up read on a fresh copy (its log tail is the loader's and names none of the tape's people), a
// prefetch of the offered subjects, replaying saves, or any reader that is still running when admission opens.
export const restartArmNames = ["today", "today-cache32", "startup-read", "startup-read-cache32"] as const;
type ArmName = (typeof restartArmNames)[number];
const { values, positionals } = parseArgs({
  allowPositionals: true, options: {
    "credit-mode": { type: "string", default: "rolling6" },
    arms: { type: "string", default: "today-cache32,startup-read-cache32" },
    rate: { type: "string", default: "394" },
    "pre-seconds": { type: "string", default: "120" },
    "aged-bundle": { type: "string" },
    "aged-sha256": { type: "string" },
  },
});
const creditMode = values["credit-mode"] as CreditMode;
assert(creditModes.includes(creditMode), "Unknown credit mode");
const arms = values.arms!.split(",") as ArmName[];
assert(arms.length >= 1 && arms.length <= 4 && new Set(arms).size === arms.length && arms.every((a) => restartArmNames.includes(a)));
const rate = Number(values.rate) as 235 | 394;
assert(rate === 235 || rate === 394);
const preSeconds = Number(values["pre-seconds"]);
assert(Number.isInteger(preSeconds) && preSeconds >= 60 && preSeconds <= 180);
assert.equal(positionals.length, 8);
const [source, out, seedDir, imagePin, transferPin, physicalDir, control, walMount] = positionals;
assert(source && out && seedDir && imagePin && transferPin && physicalDir && control && walMount);
assert.match(control, /^[a-f0-9]{64}$/);
assert(path.isAbsolute(out) && path.isAbsolute(physicalDir) && path.isAbsolute(walMount));
const agedBundle = values["aged-bundle"], agedSha = values["aged-sha256"];
assert((agedBundle === undefined) === (agedSha === undefined), "The aged bundle needs its SHA-256");
const epoch = Date.now();
// Per arm: copy (4 min at 430M, 7 at 1B), start, traffic, restart, read, window, drains and checks.
const armMinutes = agedBundle ? 26 : 22;
const deadline = epoch + (arms.length * armMinutes + 2) * 60_000;
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock");
const held = fs.fstatSync(9);
assert.deepEqual([held.ino, held.dev], [lock.ino, lock.dev]);
scaleHost.physical();
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
const seed = readScaleSeal(path.join(fs.realpathSync(seedDir), "image.json"), imagePin, false, transferPin);
const pgdata = fs.realpathSync(physicalDir), walDirectory = fs.realpathSync(walMount);
assert.equal(hex(fs.readFileSync(path.join(pgdata, "global/pg_control"))), control);
const aged: AgedAdmission | undefined = agedBundle ? agedAdmission(agedBundle, agedSha!, seed, pgdata) : undefined;
const dockerRoot = execFileSync("docker", ["info", "--format", "{{.DockerRootDir}}"], { encoding: "utf8" }).trim();
const volumes = path.join(dockerRoot, "volumes");
assert.notEqual(fs.statSync(volumes).dev, fs.statSync(walDirectory).dev, "WAL and data must use separate filesystems");
const seedBytes = Number(execFileSync("du", ["-sB1", "--", pgdata], { encoding: "utf8" }).split(/\s/)[0]);
assert(seedBytes > 100 * 10 ** 9 && scaleHost.available(volumes) >= seedBytes + 20 * 1024 ** 3, "No room for one disposable copy");
assert(scaleHost.available(walDirectory) >= 16 * 1024 ** 3, "Insufficient WAL disk");
if (arms.some((a) => a.endsWith("cache32"))) {
  // [DX-PREP1] Same host floor as the cache32 arms: role caps total 79 GiB.
  const total = Number(/MemTotal:\s+(\d+) kB/.exec(fs.readFileSync("/proc/meminfo", "utf8"))![1]) * 1024;
  assert(total >= 89 * 1024 ** 3, "The 32 GiB cache arms need at least 89 GiB MemTotal");
}
const tape = writeTape(100_000, rate, 0, false, preSeconds + 300);
const rebase = (xs: Write[], shift: number) => xs.map((e, ordinal) => ({ ...e, ordinal, ms: e.ms - shift }));
const preTape = rebase(tape.filter((e) => e.ms < preSeconds * 1000), 0);
const postTape = rebase(tape.filter((e) => e.ms >= preSeconds * 1000), preSeconds * 1000);
assert(postTape.every((e) => e.ms >= 0 && e.ms < 300_000) && preTape.length + postTape.length === tape.length);
const tapeSha256 = hex(JSON.stringify(tape));
const tapePeople = [...new Map(tape.map((e) => [e.account + "/" + e.subject, { account: e.account, person: e.subject }])).values()];
// [DX-JVM1] Why: these bounds come from STARTUP-READ.md: the window covers the traffic before the restart, the
// segment budget covers its owners at about 2.5 leaves each, and the time limit keeps the restart inside 60 seconds.
const readBudget = { windowSeconds: preSeconds, maxTransactions: 200_000, maxOwners: 40_000, maxSegments: 150_000,
  timeLimitMs: 30_000, threads: 8, aevt: [":triplex.entity/row", ":triplex.entity/rev"] };
fs.mkdirSync(out);
jsonFile(path.join(out, "input.json"), { source, imagePin, transferPin, control, tapeSha256, creditMode, arms, rate, preSeconds,
  preOffers: preTape.length, postOffers: postTape.length, readBudget, aged: aged?.summary ?? null });

let stopped = false;
const stop = () => { stopped = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

function inspect(slot: string) {
  return Object.fromEntries(["pg", "tx", "gw-w", "gw-r"].map((role) => {
    const [c] = JSON.parse(execFileSync("docker", ["inspect", slot + "-" + role], { encoding: "utf8" }));
    return [role, { id: c.Id as string, image: c.Image as string, pid: c.State.Pid as number, startedAt: c.State.StartedAt as string,
      running: c.State.Running as boolean, address: c.NetworkSettings.Networks[slot + "-net"].IPAddress as string }];
  }));
}
const readerThreads = (pid: number) => fs.readdirSync(`/proc/${pid}/task`).map((t) => {
  try { return fs.readFileSync(`/proc/${pid}/task/${t}/comm`, "utf8").trim(); } catch { return ""; }
}).filter((name) => name.startsWith("tx2-sread"));

async function health(address: string, until: number) {
  for (;;) {
    try {
      const response = await fetch(`http://${address}:8080/health`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return now();
    } catch { /* not yet serving */ }
    assert(Date.now() < until, "Gateway did not become healthy after the restart");
    await sleep(100);
  }
}

// [DX-JVM1] Why: stop and start the same three JVM containers, keeping PostgreSQL and its data, as a process restart does.
// Rejected: a new stack on a new copy (that is the cold trial) or killing PostgreSQL (storage survives a JVM restart).
async function restartJvms(slot: string, trace: string, read: boolean, until: number) {
  const stopAt = now();
  // The gateways run under bin/run, which does not forward SIGTERM; they hold no state, so a short grace suffices.
  execFileSync("docker", ["stop", "-t", "5", slot + "-gw-w", slot + "-gw-r"]);
  execFileSync("docker", ["stop", "-t", "60", slot + "-tx"]);
  const stoppedAt = now();
  // The observers reopen their files on boot; keep the traffic before the restart beside the measured window.
  for (const name of ["prep1-native.ndjson", "cold-index.ndjson", "cold-index-jobs.log"])
    if (fs.existsSync(path.join(trace, name))) fs.renameSync(path.join(trace, name), path.join(trace, "before-restart-" + name));
  for (const role of readRoles) for (const kind of ["enabled", "request.json", "request.taken.json", "report.json"])
    assert(!fs.existsSync(path.join(trace, `startup-read-${role}.${kind}`)), "Stale start-up read file");
  if (read) for (const role of readRoles) fs.writeFileSync(path.join(trace, `startup-read-${role}.enabled`), "", { flag: "wx" });
  execFileSync("docker", ["start", slot + "-tx"]);
  const txStartedAt = inspect(slot).tx.startedAt;
  for (;;) {
    const logs = execFileSync("docker", ["logs", "--since", txStartedAt, slot + "-tx"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (logs.split("\n").includes("System started")) break;
    assert(inspect(slot).tx.running && Date.now() < until, "Transactor did not restart");
    await sleep(200);
  }
  const transactorReady = now();
  execFileSync("docker", ["start", slot + "-gw-w", slot + "-gw-r"]);
  const engines = inspect(slot);
  await Promise.all([health(engines["gw-w"]!.address, until), health(engines["gw-r"]!.address, until)]);
  const gatewaysReady = now();
  return { engines, times: { stopAt, stoppedAt, transactorReady, gatewaysReady } };
}

// [DX-JVM1] Why: the transactor reads the leaves the save function touches; the write peer reads the owner's leaves and
// public ID through its own serving connection, which it keeps. Both finish before admission opens.
const readRoles = ["tx", "gw-w"] as const;
function javaPid(container: string) {
  const rows = execFileSync("docker", ["top", container, "-eo", "pid,comm"], { encoding: "utf8" }).trim().split("\n").slice(1)
    .map((line) => line.trim().split(/\s+/)).filter(([, comm]) => comm === "java");
  assert.equal(rows.length, 1, "Expected one Java process in " + container);
  return Number(rows[0]![0]);
}
async function startupReadStep(slot: string, trace: string, db: string, attempt: string) {
  const started = now();
  const storage = `datomic:sql://${db}?jdbc:postgresql://${slot}-pg:5432/datomic?user=datomic&password=datomic`;
  const requests = {
    tx: { ...readBudget, uri: storage + "&ApplicationName=triplex-startup-read", attempt },
    "gw-w": { ...readBudget, uri: storage + "&ApplicationName=triplex-gw-w", attempt, aevt: [], avetId: true, releaseConnection: false },
  };
  for (const role of readRoles) {
    fs.writeFileSync(path.join(trace, `.startup-read-${role}.request.json`), JSON.stringify(requests[role]), { flag: "wx" });
    fs.renameSync(path.join(trace, `.startup-read-${role}.request.json`), path.join(trace, `startup-read-${role}.request.json`));
  }
  const reports: Record<string, any> = {};
  for (const role of readRoles) {
    const report = path.join(trace, `startup-read-${role}.report.json`);
    while (!fs.existsSync(report)) {
      assert(now() - started < readBudget.timeLimitMs + 60_000, "Start-up read report missing: " + role);
      await sleep(50);
    }
    const result = JSON.parse(fs.readFileSync(report, "utf8"));
    const pid = javaPid(slot + "-" + role);
    for (let i = 0; i < 100 && readerThreads(pid).length; i++) await sleep(20);
    const threadsAtAdmission = readerThreads(pid);
    assert.deepEqual(threadsAtAdmission, [], "A start-up reader thread is still running at admission: " + role);
    assert.equal(result.attempt, attempt);
    assert(["complete", "segment-budget", "time-limit"].includes(result.status), `Start-up read failed (${role}): ` + result.status);
    assert.deepEqual(result.readerThreadsAtReport, []);
    assert(result.poolTerminated);
    fs.rmSync(path.join(trace, `startup-read-${role}.enabled`));
    reports[role] = { ...result, request: { ...result.request, uri: "<storage uri>" }, threadsAtAdmission };
  }
  return { ...reports, waitedMs: now() - started };
}

// Storage reads per save by 15-second bin of the scheduled offer, from the transactor's own io-stats on each reply.
function readsByBin(rows: Save[], start: number) {
  return Array.from({ length: 20 }, (_, i) => {
    const xs = rows.filter((r) => r.receipt && start + i * 15_000 <= r.due && r.due < start + (i + 1) * 15_000);
    const reads = xs.map((r) => (r.stage as { nativeIoStats?: { reads?: Record<string, number> } } | undefined)?.nativeIoStats?.reads ?? {});
    const mean = (k: string) => reads.length ? reads.reduce((n, x) => n + (x[k] ?? 0), 0) / reads.length : null;
    return { from: i * 15, saves: xs.length, withStats: reads.filter((x) => typeof x.eavt === "number").length,
      sql: mean("sql"), eavtLoad: mean("eavt-load"), aevtLoad: mean("aevt-load"), avetLoad: mean("avet-load") };
  });
}

for (const arm of arms) {
  const read = arm.startsWith("startup-read"), cache32 = arm.endsWith("cache32");
  assert(!stopped && Date.now() + 15 * 60_000 < deadline, "No time for another arm");
  const armDeadline = Math.min(deadline, Date.now() + armMinutes * 60_000);
  const dir = path.join(out, arm);
  fs.mkdirSync(dir);
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-cold-" + attempt.replace(/-/g, "").slice(0, 12);
  jsonFile(path.join(dir, "attempt.json"), { source, tag: arm, slot, attempt, control, imagePin, transferPin, tapeSha256 });
  const policy = launchProfile("server", { jvm: "j21-g1", txJvm: "j25-zgc", creditMode, startup: "today",
    ...(cache32 ? { txCacheMiB: 32768 as const } : {}) });
  assert(Object.values(scaleHost.childrenInventory(slot)).every((xs) => xs.length === 0));
  const startedAt = now();
  const head0 = aged?.head ?? seed.scope.cut;
  try {
    const started = startScaleStack(dir, slot, source, false, {
      ...stackOptions("per-person-ordered", attempt), ...(read ? { DX_JVM1_STARTUP_READ_HOOK: "1" } : {}),
    }, { policy, walDirectory, coldSeed: { pgdata, control, log: coldStartLog } });
    const stackEvidence = path.join(dir, "engines", slot);
    const trace = path.join(stackEvidence, "trace/raw");
    const [copy] = JSON.parse(fs.readFileSync(path.join(stackEvidence, "pgdata-copy-container.json"), "utf8"));
    const mounts = new Map<string, { Source: string; Name?: string; RW: boolean }>(
      copy.Mounts.map((mount: { Destination: string }) => [mount.Destination, mount]));
    assert.deepEqual([copy.Name, copy.Image, copy.State.ExitCode], ["/" + slot + "-seed-copy", started.engines.pg!.image, 0]);
    assert.deepEqual([mounts.get("/from")?.Source, mounts.get("/from")?.RW], [pgdata, false]);
    assert.deepEqual([mounts.get("/to")?.Name, mounts.get("/to")?.RW], [slot + "-pg-data", true]);
    assert.deepEqual([mounts.get("/wal")?.Source, mounts.get("/wal")?.RW], [path.join(walDirectory, slot), true]);
    const [copiedControl, copiedWal] = fs.readFileSync(path.join(stackEvidence, "pgdata.control.sha256"), "utf8").trim().split("\n");
    assert.equal(copiedControl, control);
    assert.match(copiedWal ?? "", /^[a-f0-9]{64}$/);

    // Traffic before the restart: unmeasured, it defines the active set, as production traffic before a restart does.
    let writer = new DatomicClient(`http://${started.engines["gw-w"]!.address}:8080`, 35000);
    let reader = new DatomicClient(`http://${started.engines["gw-r"]!.address}:8080`, 35000);
    const writeOptions = async (position: number) => {
      const initial = await writer.begin(seed.scope.db);
      await writer.release(seed.scope.db, initial.handle);
      assert.equal(initial.position, position);
      const options = await writer.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
      assert.deepEqual([options.attempt, options.database, options.position, options.rowsVersion,
        options.strictRecordClocks, options.subjectSave, options.subjectNumericOwner, options.subjectOrderedIds,
        options.subjectPrefetch], [attempt, seed.scope.db, position, 3, true, true, true, true, false]);
      // Same check as cold-server.ts; the subjectFunction repair on the one branch applies here as well.
      assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
      return options;
    };
    let pre: Awaited<ReturnType<typeof play>>;
    let preHead: number;
    const senders: Sender[] = seed.scope.accounts.map((account) => {
      const subjects = new Map(tape.filter((e) => e.account === account).map((e) => [task(account, e.subject), e.subject]));
      return { client: writer, scope: { ...seed.scope, cut: head0 }, rows: new Map(), loadPredecessor: async (entity) => {
        const rows = await writer.rows(seed.scope.db, {
          entityIds: [entity], basis: { recordedPosition: head0, validAt: SEED_VALID_FROM },
        });
        return [0, 1, 2].map((n) => {
          const fields = rows.filter((row) => row.entity_id === entity && row.attribute === field(n));
          assert.equal(fields.length, 1);
          const [row] = fields;
          assert(row?.id && row.recorded_position > 0 && row.recorded_position <= head0 && Number.isFinite(row.recorded_at));
          if (aged && row.recorded_position > seed.scope.cut) agedPredecessor(aged, account, subjects.get(entity)!, n, row);
          else assert.equal(row.value_string, fieldValue(subjects.get(entity)!, 0, n, 0).value);
          return row;
        });
      } };
    });
    try {
      await writeOptions(head0);
      const agedLive = aged ? await aged.checkLive(reader, tapePeople) : null;
      if (agedLive) jsonFile(path.join(dir, "aged-live.json"), agedLive);
      const preStart = now() + 200;
      pre = await play(senders, preTape, preStart, attempt + "-pre", true, true, creditModeSelection(creditMode), undefined, false,
        { ramp: false, stopped: () => stopped || Date.now() + 10 * 60_000 >= armDeadline });
      await resolveUncertain(senders, pre.unresolved);
      assert(pre.rows.every((r) => r.receipt || r.status === "expired-before-dispatch"), "Unsettled save before the restart");
      const pin = await writer.begin(seed.scope.db);
      await writer.release(seed.scope.db, pin.handle);
      preHead = pin.position;
      assert.equal(preHead, head0 + pre.rows.filter((r) => r.receipt).length);
      jsonFile(path.join(dir, "pre-operations.json"), pre.rows);
    } finally {
      writer.close(); reader.close();
    }

    // The restart and, in the start-up read arms, the one-time read. Admission opens only after both.
    const restarted = await restartJvms(slot, trace, read, armDeadline - 8 * 60_000);
    const engines = restarted.engines;
    const readReport = read ? await startupReadStep(slot, trace, seed.scope.db, attempt) : null;
    const admittedAt = now();
    writer = new DatomicClient(`http://${engines["gw-w"]!.address}:8080`, 35000);
    reader = new DatomicClient(`http://${engines["gw-r"]!.address}:8080`, 35000);
    for (const s of senders) { s.client = writer; s.scope = { ...s.scope, cut: preHead }; }
    const inspectBytes = execFileSync("docker", ["inspect", ...Object.values(engines).map((e) => e.id)]);
    fs.writeFileSync(path.join(dir, "containers.json"), inspectBytes, { flag: "wx" });
    const collector = spawn("taskset", ["-c", "10", "python3", new URL("./cold-counters.py", import.meta.url).pathname, dir,
      path.join(dir, "containers.json"), slot, source, attempt, String(process.pid)], { stdio: "inherit" });
    const collected = new Promise<number | null>((resolve, reject) => {
      collector.once("error", reject);
      collector.once("exit", resolve);
    });
    void collected.catch(() => {});
    try {
      const countersReady = path.join(dir, "counters-ready.json");
      for (let tries = 0; tries < 80 && !fs.existsSync(countersReady) && collector.exitCode === null; tries++) await sleep(50);
      const counterStamp = JSON.parse(fs.readFileSync(countersReady, "utf8"));
      assert.deepEqual([counterStamp.slot, counterStamp.source, counterStamp.attempt], [slot, source, attempt]);
      for (const [role, engine] of Object.entries(engines)) assert.equal(counterStamp.roles[role].id, engine.id);
      const options = await writeOptions(preHead);
      const javaPids = readRoles.map((role) => javaPid(slot + "-" + role));
      assert(javaPids.every((pid) => readerThreads(pid).length === 0), "A start-up reader thread exists at admission");
      assert(!stopped && Date.now() + 6 * 60_000 < armDeadline, "Not enough time after the restart");
      const start = now() + 200;
      jsonFile(path.join(dir, "start.json"), { source, slot, attempt, startedAt, restart: restarted.times, admittedAt, start });
      const writes = await play(senders, postTape, start, attempt, true, true, creditModeSelection(creditMode), undefined, false,
        { ramp: false, stopped: () => stopped || Date.now() + 45_000 >= armDeadline });
      const readersAfter = javaPids.flatMap((pid) => readerThreads(pid));
      jsonFile(path.join(dir, "sampling-stop.json"), { slot, commit: source, nonce: attempt });
      assert.equal(await collected, 0);
      await resolveUncertain(senders, writes.unresolved);
      jsonFile(path.join(dir, "operations.json"), writes.rows);
      assert.deepEqual(readersAfter, [], "A start-up reader thread ran after admission");
      const last = await writer.begin(seed.scope.db);
      await writer.release(seed.scope.db, last.handle);
      const seedReadback = aged ? await aged.readback(reader, last.position) : await checkAdoptedPeer(reader, seed, last.position);
      const journal = await feeder(reader, seed.scope.db, head0, Math.min(armDeadline - 15_000, Date.now() + 180_000),
        () => last.position, true);
      const byPosition = new Map(journal.map((row) => [row.position, row]));
      const durable = [...pre.rows, ...writes.rows].filter((row) => row.receipt);
      assert.equal(journal.length, durable.length);
      for (const row of durable) {
        const observed = byPosition.get(row.receipt!.p);
        assert(observed);
        checkSavedIdentity(row, observed, "per-person-ordered", options.subjectFunction);
        byPosition.delete(row.receipt!.p);
      }
      assert.equal(byPosition.size, 0);
      assert.equal(writes.rows.length, postTape.length);
      assert(writes.rows.every((row) => row.receipt || row.status === "expired-before-dispatch"), "Unsettled save or unexpected rejection");
      for (const role of ["tx", "gw-w", "gw-r"]) assert(fs.statSync(path.join(trace, role + "-startup.log")).size > 0);
      assert(fs.statSync(path.join(trace, "prep1-native.ndjson")).size > 0);
      const java = readScaleJvms(path.join(dir, "jvm"), Object.fromEntries(Object.entries(started.engines).map(([role, e]) =>
        [role, { ...e, id: engines[role]!.id, image: engines[role]!.image }])) as typeof started.engines, policy);
      for (const [role, id] of [["postgres", engines.pg!.id], ["transactor", engines.tx!.id]] as const) {
        const log = fs.openSync(path.join(dir, role + ".log"), "wx");
        try { execFileSync("docker", ["logs", "--timestamps", id], { stdio: ["ignore", log, log] }); }
        finally { fs.closeSync(log); }
      }
      const firstAck = writes.rows.filter((r) => r.status === "acked").reduce((min, row) => Math.min(min, row.end!), Infinity);
      assert(Number.isFinite(firstAck), "No acknowledged saves");
      jsonFile(path.join(dir, "journal.json"), journal);
      const t = restarted.times;
      jsonFile(path.join(dir, "observed.json"), { source, slot, attempt, arm, control, copiedWal, tapeSha256, imagePin, policy, java,
        seedReadback, preHead, preOffers: pre.rows.length, preStored: pre.rows.filter((r) => r.receipt).length,
        restart: {
          stopSeconds: (t.stoppedAt - t.stopAt) / 1000,
          transactorReadySeconds: (t.transactorReady - t.stoppedAt) / 1000,
          gatewaysReadySeconds: (t.gatewaysReady - t.stoppedAt) / 1000,
          startupReadSeconds: readReport ? (admittedAt - t.gatewaysReady) / 1000 : 0,
          admittedSeconds: (admittedAt - t.stoppedAt) / 1000,
          firstAcknowledgementSeconds: (firstAck - t.stoppedAt) / 1000,
        },
        startupRead: readReport, readsByBin: readsByBin(writes.rows, start),
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
