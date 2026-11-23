import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readScaleJvms, scaleHost, startScaleStack } from "../scale1/bench.ts";
import { launchProfile } from "../jvm1/launch.mjs";
import { restoreDump } from "../scale1/seed-image.ts";
import { adoptedArm, jsonFile, quietPair, recordMixedIds, type Residency } from "./adopted.ts";
import { nativeMetrics } from "../thin1/native-metrics.ts";
import { openScaleSeal, hex, type AdoptedSeed } from "./adopt.ts";
import { timeBudget, defaultWriter, physicalArms, writeDiagnostics, jvmProfiles, serverStages, stackOptions, type JvmProfile } from "./profile.ts";
import { cleanSource, verifyBuild } from "./source.ts";
import { claimPgdata, inspectPgdata, pgdataArgs, pgdataTarget, preflightWal, sealedPgdata } from "./pgdata.ts";
import { openSequence, startSequentialArm } from "./sequential.ts";

import { parseWindow, parseCredits } from "./server-workload.ts";
import { realSeed, proveRealistic } from "./realistic.ts";
import { physicalTelemetry } from "./cell-telemetry.ts";
import { firstOffer } from "../ha1/first-offer.ts";

const [source, campaign, deadlineText, seedDir, imagePin, transferPin, age, requestedWriter, jvm, agedFile, agedPin,
  agedDump, agedDumpPin, txJvm, walDirectory, armText, startedText, forecast, windowText, creditText, writeJvm, pgdataSource, ...pgdataPaths] = process.argv.slice(2);
assert(source && campaign && seedDir && imagePin && transferPin);
assert(age === "fresh" || age === "1B" || age === "realistic");
assert(requestedWriter === defaultWriter);
assert(jvmProfiles.includes(jvm as JvmProfile) && jvmProfiles.includes(txJvm as JvmProfile));
const windowSeconds = parseWindow(windowText), creditMode = parseCredits(creditText);
const { budget, comparisonMinutes } = timeBudget(windowSeconds, age === "realistic");
const policy = launchProfile("server", { jvm: jvm as JvmProfile, txJvm: txJvm as JvmProfile, writeJvm: writeJvm as JvmProfile, creditMode });
const diagnostics = writeDiagnostics(requestedWriter, process.env);
const stages = serverStages(policy, !!walDirectory);
assert(armText === "" || /^[1-3]$/.test(armText ?? ""), "Choose arm 1, 2 or 3");
const sequenceArm = armText ? Number(armText) : undefined;
const end = Number(deadlineText);
assert(Number.isSafeInteger(end) && end > Date.now());
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock"), queue = fs.statSync(`/proc/${process.ppid}/fd/9`);
assert.equal(lock.ino, queue.ino); assert.equal(lock.dev, queue.dev);
scaleHost.physical();
process.env.DX_BARE_METAL = "1";
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
pgdataArgs(pgdataPaths, pgdataSource, sequenceArm);
const copies = pgdataSource ? inspectPgdata(pgdataSource, pgdataPaths, fs.realpathSync(path.dirname(campaign))) : [];
let wal: ReturnType<typeof preflightWal> | undefined;
if (walDirectory) {
  try {
    assert(copies.length === (sequenceArm === undefined ? physicalArms : 1), "Separate WAL needs prepared scorecard copies");
    wal = preflightWal(walDirectory, copies.map(copy => copy.dir));
  } catch (error) {
    launchFailure(error);
  }
}
if (age === "realistic") assert(sequenceArm && copies.length === 1 && pgdataSource && windowSeconds === 300);
const seed: AdoptedSeed = age === "realistic"
  ? await realSeed(fs.realpathSync(seedDir), imagePin, transferPin, fs.realpathSync(pgdataSource!), copies.map(copy => copy.dir))
  : openScaleSeal(path.join(fs.realpathSync(seedDir), "image.json"), imagePin, false, transferPin, !copies.length);
const expected = age === "1B" ? openAged(agedFile, agedPin) : undefined;
if (!copies.length && expected) {
  assert(agedDump && agedDumpPin && /^[a-f0-9]{64}$/.test(agedDumpPin));
}
const input = { source, age, writer: requestedWriter, jvm: jvm as JvmProfile, imagePin, transferPin, originalScope: seed.scope, realistic: seed.realisticBinding,
  txJvm: txJvm as JvmProfile, writeJvm: writeJvm as JvmProfile, diagnostics, separateWal: !!wal, stages, wal, windowSeconds, creditMode,
  agedBundle: expected?.pin, agedDump: agedDumpPin || undefined };
let spent = 0, previousSystem: string | undefined;
if (sequenceArm !== undefined) {
  assert(pgdataSource && copies.length === 1 && forecast);
  const sequence = openSequence(campaign, { input, sealed: sealedPgdata(pgdataSource),
    cut: expected?.bundle.logicalHead ?? seed.realistic?.proof.cut ?? seed.scope.cut,
    buildSha256: hex(fs.readFileSync(process.env.DX_V01_BUILD_RECEIPT!)), forecast });
  const progress = startSequentialArm(campaign, sequence, sequenceArm, copies[0]!, Number(startedText));
  spent = progress.elapsed;
  previousSystem = progress.previous.at(-1)?.systemIdentifier;
} else {
  fs.mkdirSync(campaign);
  jsonFile(path.join(campaign, "input.json"), { ...input, pgdata: copies.length ? copies : undefined });
}
if (seed.realistic) {
  const destination = path.join(campaign, "realistic-image.json");
  const bytes = fs.readFileSync(path.join(seedDir, "image.json"));
  assert.equal(hex(bytes), imagePin);
  if (fs.existsSync(destination)) assert.equal(hex(fs.readFileSync(destination)), imagePin);
  else fs.writeFileSync(destination, bytes, { flag: "wx", mode: 0o600 });
}
let stopping = false;
const stop = () => { stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
const minute = 60_000;
const pairedEnd = Math.min(end - budget.comparison * minute, Date.now() - spent + budget.adoptionAndP1to4 * minute);
const headlineEnd = Math.min(end - budget.comparison * minute,
  Date.now() - spent + (budget.adoptionAndP1to4 + budget.P6 + budget.P7 + budget.P8) * minute);
let systemIdentifier = previousSystem;
for (const [i, stage] of stages.entries()) {
  if (sequenceArm !== undefined && i + 1 !== sequenceArm) continue;
  const { loaded, comparison } = stage;
  const writer = defaultWriter;
  const stageEnd = comparison ? Math.min(end, Date.now() + comparisonMinutes * minute)
    : loaded ? Math.min(headlineEnd, pairedEnd + budget.P7 * minute) : pairedEnd;
  assert(!stopping && Date.now() + 10 * minute < stageEnd, "Insufficient time to start the next scorecard arm");
  const root = path.join(campaign, stage.root);
  fs.mkdirSync(root, { recursive: true });
  const out = path.join(root, loaded ? "loaded" : "zero");
  fs.mkdirSync(out);
  const copy = copies[sequenceArm === undefined ? i : 0];
  const floor = copy ? 5 : age === "1B" ? 320 : 240;
  assert(scaleHost.available(out) >= floor * 1024 ** 3, "Insufficient free space for the scorecard arm");
  const emptyReference = copy && loaded && !comparison && !seed.realistic
    ? await emptyResidency(path.join(out, "p7-empty"), stage.policy) : undefined;
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-" + attempt.slice(0, 12);
  beginStack(out, slot, attempt);
  let verifiedLaunch = false;
  try {
    const options = { ...stackOptions(writer, attempt, diagnostics), DX_V01_CELL_COUNTERS: "1" };
    if (copy) claimPgdata(copy, source, slot, attempt);
    const { engines } = startScaleStack(out, slot, source, false, copy ? {
      ...options, DX_V01_PGDATA: copy.dir, DX_V01_PGDATA_CONTROL_SHA: copy.controlSha256,
      DX_V01_PGDATA_FILE_ID: copy.device + ":" + copy.inode,
    } : options, { policy: stage.policy, walDirectory: stage.separateWal ? wal!.wal : undefined });
    const java = checkLaunch(out, slot, attempt, engines, stage);
    const residency = () => stackResidency(slot, engines);
    let empty = emptyReference;
    if (copy) {
      const container = engines.pg!.id;
      const liveFileId = execFileSync("docker", ["exec", container, "stat", "-c", "%d:%i", pgdataTarget],
        { encoding: "utf8", timeout: 10000 }).trim();
      assert.equal(liveFileId, copy.device + ":" + copy.inode);
      const liveCluster = execFileSync("docker", ["exec", container, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "postgres",
        "-d", "datomic", "-c", "SELECT current_setting('data_directory'), system_identifier FROM pg_control_system()"],
        { encoding: "utf8", timeout: 10000 }).trim().split("|");
      assert.equal(liveCluster[0], pgdataTarget);
      assert.match(liveCluster[1] ?? "", /^[1-9][0-9]*$/);
      systemIdentifier ??= liveCluster[1];
      assert.equal(liveCluster[1], systemIdentifier, "Prepared arms must share the sealed PostgreSQL system identifier");
      jsonFile(path.join(out, "pgdata.json"), { source, slot, attempt, at: Date.now(), container, copy, liveFileId, systemIdentifier });
    } else {
      if (!comparison) empty = await residency();
      await restoreDump(expected ? agedDump! : seed.dump, expected ? agedDumpPin! : seed.image.sha256, slot, engines,
        Math.min(stageEnd - 10 * 60_000, Date.now() + 42 * 60_000));
    }
    const write = `http://${engines["gw-w"]!.address}:8080`;
    const read = `http://${engines["gw-r"]!.address}:8080`;
    const jw = copy ? java : readScaleJvms(path.join(out, "restored-jvm"), engines, stage.policy);
    const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
    assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
    if (seed.realistic) {
      const native = await proveRealistic(write, seed.realistic, engines["gw-w"]!.id);
      jsonFile(path.join(out, "realistic-live.json"), { at: Date.now(), source, slot, attempt, native, host: hex(fs.readFileSync("/etc/machine-id")), seal: seed.realisticBinding });
    }
    const head = expected ? await verifyAged(expected, out, slot, attempt, engines.pg!.address) : seed.realistic?.proof.cut ?? seed.scope.cut;
    assert(!stopping && Date.now() + 8 * 60_000 < stageEnd);
    verifiedLaunch = true;
    console.log(`[DX-V01] Verified live server startup for ${stage.name}/${loaded ? "loaded" : "zero"} before offers`);
    const peer = { write, read, slot, attempt, gatewaySource: health.gatewaySourceHash, java: jw, empty, residency, windowSeconds, creditMode: stage.policy.creditMode, serialApply: diagnostics.serialApply, telemetry: physicalTelemetry(out, engines) };
    firstOffer("realistic-card " + path.basename(out));
    const arm = await adoptedArm(out, source, peer, seed, writer, loaded, false, head, undefined, comparison);
    if (loaded && !stopping) {
      const quietEnd = comparison ? stageEnd : Math.min(headlineEnd - budget.P8 * minute, Date.now() + budget.P6 * minute);
      const cut = await quietPair(root, source, peer, seed, writer, false, arm.terminal, quietEnd);
      let after = cut;
      if (!stopping && !comparison) {
        const { runImport } = await import("./import-arm.ts");
        after = runImport(root, source, peer, seed, writer, false, cut);
      }
      if (!stopping && !comparison) await recordMixedIds(root, source, peer, seed, writer, after);
    }
  } catch (error) {
    if (!verifiedLaunch) launchFailure(error);
    throw error;
  } finally {
    scaleHost.clean(out, slot);
  }
  if (sequenceArm !== undefined) assert(!stopping, "Sequential arm was interrupted");
}

function beginStack(out: string, slot: string, attempt: string) {
  assert(Object.values(scaleHost.childrenInventory(slot)).every((x) => x.length === 0));
  jsonFile(path.join(out, "attempt.json"), { source, slot, nonce: attempt, tag: path.basename(out) });
}

async function stackResidency(slot: string, engines: ReturnType<typeof startScaleStack>["engines"]) {
  const writeUrl = `http://${engines["gw-w"]!.address}:8080`;
  const readUrl = `http://${engines["gw-r"]!.address}:8080`;
  const health = await (await fetch(new URL("/health", writeUrl), { signal: AbortSignal.timeout(2000) })).json() as any;
  assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
  const observed = await nativeMetrics({ prefix: slot, writeUrl, readUrl, gatewaySourceSha256: health.gatewaySourceHash,
    containers: Object.entries(engines).map(([role, e]) => ({ id: e.id, name: `${slot}-${role}`, imageId: e.image })) });
  return observed.roles as Residency;
}

async function emptyResidency(out: string, policy: ReturnType<typeof launchProfile>) {
  fs.mkdirSync(out);
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-" + attempt.slice(0, 12);
  beginStack(out, slot, attempt);
  try {
    const { engines } = startScaleStack(out, slot, source, false, stackOptions("per-person-ordered", attempt), { policy });
    const java = readScaleJvms(path.join(out, "live-jvm"), engines, policy);
    const roles = await stackResidency(slot, engines);
    jsonFile(path.join(out, "residency.json"), { source, attempt, slot, at: Date.now(), java, roles });
    return roles;
  } finally {
    scaleHost.clean(out, slot);
  }
}

function openAged(file?: string, pin?: string) {
  assert(file && pin);
  const bytes = fs.readFileSync(file);
  assert.equal(hex(bytes), pin);
  const bundle = JSON.parse(bytes.toString());
  assert.equal(bundle.version, "triplex-age1-scorecard/1");
  assert.equal(bundle.sourceSeed?.["manifest-sha"], seed.pin);
  assert.equal(bundle.scope, seed.key);
  assert(Number.isSafeInteger(bundle.logicalHead) && bundle.logicalHead > seed.scope.cut);
  assert(bundle.records >= 1_000_000_000);
  return { file, pin, bundle };
}

async function verifyAged(expected: ReturnType<typeof openAged>, out: string, slot: string, attempt: string, postgres: string) {
  assert(process.env.AGE_JAVA && process.env.AGE_DATOMIC_HOME);
  // [DX-V01] Why: check the fresh peer against the exact aged replay bundle before touching the restored arm.
  // Rejected: treating the 1B label or the dump size as proof of age.
  const { checkScorecard } = await import("../age1/scorecard.mjs");
  const original = process.env.DATOMIC_URI_TEMPLATE;
  const sql = new URL(`postgresql://${postgres}/datomic`);
  sql.searchParams.set("user", "datomic");
  sql.searchParams.set("password", "datomic");
  process.env.DATOMIC_URI_TEMPLATE = "datomic:sql://{db}?jdbc:postgresql:" + sql.href.slice("postgresql:".length);
  try {
    const result = checkScorecard(expected.file, expected.pin);
    assert.equal(result.logicalHead, expected.bundle.logicalHead);
    jsonFile(path.join(out, "aged-live-check.json"), { ...result, source, slot, attempt });
    return result.logicalHead;
  } finally {
    if (original === undefined) delete process.env.DATOMIC_URI_TEMPLATE;
    else process.env.DATOMIC_URI_TEMPLATE = original;
  }
}

function launchFailure(error: unknown): never {
  const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
  console.error("[DX-V01] Early launch check stopped before offers. " + detail);
  throw error;
}

function checkLaunch(out: string, slot: string, attempt: string, engines: ReturnType<typeof startScaleStack>["engines"],
  stage: ReturnType<typeof serverStages>[number]) {
  const java = readScaleJvms(path.join(out, "live-jvm"), engines, stage.policy);
  for (const { role, container, process } of java) {
    const expected = stage.policy[role];
    assert(process.split("\n").includes("memory.max=" + expected.memoryMiB * 2 ** 20), "Live JVM memory limit differs for " + role);
    const cpuSet = (list: string) => list.split(",").flatMap((interval) => {
      assert(/^\d+(?:-\d+)?$/.test(interval));
      const [lo, hi = lo] = interval.split("-").map(Number);
      return Array.from({ length: hi! - lo! + 1 }, (_, i) => lo! + i);
    });
    const effective = /^cpuset.cpus.effective=(.+)$/m.exec(process)?.[1];
    assert(effective);
    assert.deepEqual(cpuSet(effective), cpuSet(expected.cpus!), "Live JVM core placement differs for " + role);
    if (expected.cacheMiB !== null) {
      const pid = /^pid=(\d+)$/m.exec(process)?.[1];
      assert(pid);
      execFileSync("docker", ["exec", container, "sh", "-ceu",
        'tr "\\000" "\\n" < "/proc/$1/cmdline" | grep -Fxq -- "$2"', "sh", pid, "-Ddatomic.objectCacheMax=" + expected.cacheMiB + "m"],
        { timeout: 10000 });
    }
  }
  jsonFile(path.join(out, "launch-check.json"), { source, slot, attempt, at: Date.now(),
    policy: stage.policy, diagnostics, separateWal: stage.separateWal, postgres: engines.pg!.id,
    java: java.map(({ role, container }) => ({ role, container })) });
  return java;
}
