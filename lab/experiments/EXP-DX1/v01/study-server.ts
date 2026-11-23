import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readScaleJvms, scaleHost, startScaleStack } from "../scale1/bench.ts";
import { defaultCreditMode, launchProfile, type CreditMode } from "../jvm1/launch.mjs";
import { restoreDump } from "../scale1/seed-image.ts";
import { adoptedArm, jsonFile, quietPair, type Residency } from "./adopted.ts";
import { nativeMetrics } from "../thin1/native-metrics.ts";
import { openScaleSeal, hex } from "./adopt.ts";
import { stackOptions, writeDiagnostics, type Age, type JvmProfile, type Writer } from "./profile.ts";
import { cleanSource, verifyBuild } from "./source.ts";
import { openPreparedLadder, sealedArm } from "../rd1/prepared.ts";

// [DX-THIN1] Why: the realistic card replaced adopted-server.ts with its staged three-arm runner and command line.
// This file keeps the read-study and append-retirement pair runners exactly as gated on INT1 before that merge.
// Rejected: folding two incompatible positional command lines into one runner.
const [source, campaign, deadlineText, seedDir, imagePin, transferPin, age, requestedWriter, jvm, agedFile, agedPin, agedDump, agedDumpPin,
  txJvm = jvm, walDirectory = "", writeJvm = jvm, creditMode = defaultCreditMode, studyJvm = "", readCache = ""] = process.argv.slice(2);
assert(source && campaign && seedDir && imagePin && transferPin);
assert(age === "fresh" || age === "1B");
// The card renamed the ordered writer; both spellings select the same settings.
assert(["grouped", "subject", "per-person-ordered"].includes(requestedWriter ?? ""));
const writer: Writer = requestedWriter === "grouped" ? "grouped" : "per-person-ordered";
const launchOptions = { jvm: jvm as JvmProfile, txJvm: txJvm as JvmProfile,
  writeJvm: writeJvm as JvmProfile, creditMode: creditMode as CreditMode,
  readCacheMiB: readCache ? Number(readCache) as 32 | 1536 | 3072 : undefined };
const control = launchProfile("server", launchOptions);
const tuned = studyJvm && launchProfile("server", { ...launchOptions, readJvm: studyJvm as JvmProfile, readTuned: true });
assert(!tuned || age === "fresh");
const diagnostics = writeDiagnostics(writer, process.env);
const retirement = process.env.DX_W1_RETIREMENT_PAIR === "1";
if (retirement) assert(!tuned && writer === "per-person-ordered" && jvm === "j21-g1" && writeJvm === "j21-g1" &&
  txJvm === "j25-zgc" && path.isAbsolute(walDirectory) && diagnostics.lookupEvery === 64 && !diagnostics.serialApply);
assert(tuned || retirement, "Use scorecard.mjs (adopted-server.ts) for the card; this runner is for the read study or DX_W1_RETIREMENT_PAIR=1");

const end = Number(deadlineText);
assert(Number.isSafeInteger(end) && end > Date.now());
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock"), queue = fs.statSync(`/proc/${process.ppid}/fd/9`);
assert.equal(lock.ino, queue.ino); assert.equal(lock.dev, queue.dev);
scaleHost.physical();
// [DX-INT1] Why: stack/up.sh admits only CPUs in its caller's affinity under DX_BARE_METAL, so a driver pinned to 9,10
// before the stack is refused cores 0-8 (bench 3, 18:57 and 19:43 UTC). The driver is unpinned while each stack starts
// and pinned to 9,10 before its first read or save, so every measured window keeps the same placement.
// Rejected: widening up.sh's check, or pinning only after the first ladder (a second arm would be refused again).
const onlineCpus = tuned ? fs.readFileSync("/sys/devices/system/cpu/online", "utf8").trim() : "";
assert(!tuned || /^[0-9,-]+$/.test(onlineCpus));
const placeDriver = (cpus: string) => execFileSync("taskset", ["-apc", cpus, String(process.pid)], { stdio: "ignore" });
process.env.DX_BARE_METAL = "1";
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
// [DX-RD1] Why: a prepared read study names its ladder and one private PostgreSQL copy through the environment.
// Rejected: a dump restore on a server that holds only the stopped full-size directory.
const preparedSource = process.env.DX_RD1_PGDATA_SOURCE ?? "";
assert(!preparedSource || (tuned && age === "fresh" && process.env.DX_RD1_LADDER && process.env.DX_RD1_PGDATA),
  "A prepared read study needs --read-study, the fresh seal, --ladder and one --pgdata copy");
const seed = openScaleSeal(path.join(fs.realpathSync(seedDir), "image.json"), imagePin, false, transferPin, !preparedSource);
const expected = age === "1B" ? openAged(age, agedFile, agedPin, agedDump, agedDumpPin) : undefined;
const record = { source, age, writer, policy: control, treatment: tuned || undefined, diagnostics, retirement: retirement || undefined, separateWal: !!walDirectory, imagePin, transferPin, originalScope: seed.scope,
  agedBundle: expected?.pin, agedDump: expected?.dumpPin };
const prepared = preparedSource ? openPreparedLadder({ campaign, ladder: process.env.DX_RD1_LADDER!, source: preparedSource,
  copy: process.env.DX_RD1_PGDATA!, wal: walDirectory || undefined, record }) : undefined;
if (!prepared) {
  fs.mkdirSync(campaign);
  jsonFile(path.join(campaign, "input.json"), record);
}
let stopping = false;
const stop = () => { stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
for (const loaded of [false, true]) {
  if (prepared && loaded !== prepared.loaded) continue;
  assert(!stopping && Date.now() + 10 * 60_000 < end);
  const policy = loaded && tuned ? tuned : control;
  const out = path.join(campaign, retirement ? (loaded ? "append" : "reference") : tuned ? (loaded ? "tuned" : "control") : (loaded ? "loaded" : "zero"));
  fs.mkdirSync(out);
  const floor = prepared ? 5 : age === "1B" ? 320 : 240;
  assert(scaleHost.available(out) >= floor * 1024 ** 3, "Insufficient free space for the disposable restore");
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-" + attempt.slice(0, 12);
  jsonFile(path.join(out, "attempt.json"), { source, tag: path.basename(out), slot, attempt });
  assert(Object.values(scaleHost.childrenInventory(slot)).every((x) => x.length === 0));
  await sealedArm(prepared, slot, attempt, async () => {
    let systemIdentifier = "";
    const options = stackOptions(writer, attempt, diagnostics);
    prepared?.claim(slot, attempt);
    if (tuned) placeDriver(onlineCpus);
    const { engines } = startScaleStack(out, slot, source, writer === "grouped", tuned ? {
      ...options, DX_RD1_READ_PROFILE: "1", DX_RD1_READ_FILTER: loaded ? "1" : "0", ...prepared?.env,
    } : retirement ? { ...options, TX2_SUBJECT_APPEND_RETIREMENT: loaded ? "1" : "0" } : options, { policy, walDirectory });
    if (tuned) placeDriver("9,10");
    const peerUrls = () => ({ write: `http://${engines["gw-w"]!.address}:8080`, read: `http://${engines["gw-r"]!.address}:8080` });
    const residency = async () => {
      const { write, read } = peerUrls();
      const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
      assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
      const observed = await nativeMetrics({ prefix: slot, writeUrl: write, readUrl: read, gatewaySourceSha256: health.gatewaySourceHash,
        containers: Object.entries(engines).map(([role, e]) => ({ id: e.id, name: `${slot}-${role}`, imageId: e.image })) });
      return observed.roles as Residency;
    };
    const empty = tuned || retirement ? undefined : await residency();
    const raw = path.join(out, "engines", slot, "trace", "raw");
    if (prepared) systemIdentifier = prepared.live(out, slot, attempt, engines.pg!.id);
    else await restoreDump(expected?.dump ?? seed.dump, expected?.dumpPin ?? seed.image.sha256, slot, engines,
      Math.min(end - 9 * 60_000, Date.now() + (tuned ? 11 : 42) * 60_000), tuned ? () => {
        // [DX-RD1] Why: the restored reader requires a new trace file for its own JVM boot.
        // Rejected: appending samples to an empty-stack JVM's observations or discarding those observations.
        for (const file of ["gw-r.jsonl", "rd1-gc.log", "gw-r-native-settings.json"]) {
          const from = path.join(raw, file);
          if (fs.existsSync(from)) fs.renameSync(from, from + ".before-restore");
        }
      } : undefined);
    const write = `http://${engines["gw-w"]!.address}:8080`;
    const read = `http://${engines["gw-r"]!.address}:8080`;
    const jw = readScaleJvms(path.join(out, "restored-jvm"), engines, policy);
    const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
    assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
    const head = expected ? await verifyAged(expected, out, engines.pg!.address) : seed.scope.cut;
    assert(!stopping && Date.now() + 8 * 60_000 < end);
    const peer = { write, read, slot, attempt, gatewaySource: health.gatewaySourceHash, java: jw,
      creditMode: policy.creditMode, serialApply: diagnostics.serialApply, empty, residency };
    if (tuned) {
      const native = JSON.parse(fs.readFileSync(path.join(raw, "gw-r-native-settings.json"), "utf8"));
      assert.deepEqual([native.source, native.slot, native.process], [source, slot, "gw-r"]);
      if (policy["gw-r"].cacheMiB !== null) assert.equal(native.datomic["datomic.objectCacheMax"].value, policy["gw-r"].cacheMiB * 1024 ** 2);
      const readPeerCounters = containerCounters(engines["gw-r"].id);
      const postgresCounters = containerCounters(engines.pg.id);
      const counters = () => ({ readPeer: readPeerCounters(), postgres: postgresCounters() });
      let terminal = head;
      for (const rate of [50, 235] as const) {
        assert(!stopping && Date.now() + 4 * 60_000 < end);
        const folder = path.join(out, String(rate));
        fs.mkdirSync(folder);
        const arm = await adoptedArm(folder, source, peer, seed, writer, true, false, terminal, undefined, false,
          { rate, batch: loaded ? 8 : 1, sample: true, counters });
        terminal = arm.terminal;
      }
      // [DX-INT1] A `continue` here skipped prepared.complete, so the control ladder exited 0 without
      // ladders/control-complete.json (bench 3, 19:43 UTC) and the tuned ladder was refused; sealedArm now seals.
      if (prepared) assert(!stopping, "Prepared ladder was interrupted");
    } else if (retirement) {
      let cut = head;
      const [rates, seconds] = age === "fresh" ? [[394, 620], 300] as const : [[50, 235], 120] as const;
      for (const rate of rates) {
        assert(!stopping && Date.now() + (seconds + 120) * 1000 < end);
        const window = path.join(out, String(rate));
        fs.mkdirSync(window);
        const result = await adoptedArm(window, source, peer, seed, writer, true, false, cut, undefined, false, undefined,
          { rate, append: loaded, seconds });
        cut = result.terminal;
      }
    } else {
      const arm = await adoptedArm(out, source, peer, seed, writer, loaded, false, head);
      if (loaded && !stopping) await quietPair(campaign, source, peer, seed, writer, false, arm.terminal);
    }
    return systemIdentifier;
  }, () => scaleHost.clean(out, slot), retirement ? () => execFileSync("python3", ["-I", "lab/experiments/EXP-DX1/w1/serial/summarize.py",
    out, slot, attempt, source, age, creditMode], { stdio: "inherit" }) : undefined);
}

if (retirement) {
  const arms = ["reference", "append"].map((arm) =>
    JSON.parse(fs.readFileSync(path.join(campaign, arm, "retirement-diagnostic.json"), "utf8")));
  assert(arms.every((arm) => arm.source === source && arm.creditMode === creditMode));
  assert.notEqual(arms[0].attempt, arms[1].attempt);
  assert.notEqual(arms[0].slot, arms[1].slot);
  assert.deepEqual(arms[0].windows.map((x: { tapeSha256: string }) => x.tapeSha256),
    arms[1].windows.map((x: { tapeSha256: string }) => x.tapeSha256));
  assert.equal(arms[0].windows[0].firstCut, arms[1].windows[0].firstCut);
  jsonFile(path.join(campaign, "retirement-comparison.json"), { source, age, creditMode, imagePin, transferPin, arms });
}

// [DX-RD1] Why: process-group CPU and block I/O can distinguish a busy core from a blocked peer.
// Rejected: treating wall time in a Datomic call as CPU or a PostgreSQL page-cache hit as physical I/O.
function containerCounters(container: string) {
  const pid = execFileSync("docker", ["inspect", "--format", "{{.State.Pid}}", container], { encoding: "utf8" }).trim();
  assert(/^[1-9]\d*$/.test(pid));
  const group = fs.readFileSync(`/proc/${pid}/cgroup`, "utf8").match(/^0::(\/.+)$/m)?.[1];
  assert(group, "Reader study needs cgroup v2 per-container counters");
  return () => Object.fromEntries(["cpu.stat", "cpu.pressure", "io.stat", "io.pressure", "memory.current"].map((file) => {
    const name = path.join("/sys/fs/cgroup", group, file);
    return [file, fs.existsSync(name) ? fs.readFileSync(name, "utf8") : null];
  }));
}

function openAged(label: Age, file?: string, pin?: string, dump?: string, dumpPin?: string) {
  assert(label === "1B" && file && pin && dump && dumpPin && /^[a-f0-9]{64}$/.test(dumpPin));
  const bytes = fs.readFileSync(file);
  assert.equal(hex(bytes), pin);
  const bundle = JSON.parse(bytes.toString());
  assert.equal(bundle.version, "triplex-age1-scorecard/1");
  assert.equal(bundle.sourceSeed?.["manifest-sha"], seed.pin);
  assert.equal(bundle.scope, seed.key);
  assert(Number.isSafeInteger(bundle.logicalHead) && bundle.logicalHead > seed.scope.cut);
  assert(bundle.records >= 1_000_000_000);
  return { file, pin, dump, dumpPin, bundle };
}

async function verifyAged(expected: ReturnType<typeof openAged>, out: string, postgres: string) {
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
    jsonFile(path.join(out, "aged-live-check.json"), result);
    return result.logicalHead;
  } finally {
    if (original === undefined) delete process.env.DATOMIC_URI_TEMPLATE;
    else process.env.DATOMIC_URI_TEMPLATE = original;
  }
}
