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
import { firstOffer } from "../ha1/first-offer.ts";

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
// [Opus W1] Why: the covering owner root reuses the paired runner; its treatment arm keeps the directory name "append".
// Rejected: a third runner with its own tape, windows and summary (they must match the retirement pair exactly).
const pairOption = process.env.DX_W1_PAIR_OPTION ?? "append-retirement";
assert(pairOption === "append-retirement" || (retirement && pairOption === "owner-head"));
const treatmentKey = pairOption === "owner-head" ? "TX2_SUBJECT_OWNER_HEAD" : "TX2_SUBJECT_APPEND_RETIREMENT";
if (retirement) assert(!tuned && writer === "per-person-ordered" && jvm === "j21-g1" && writeJvm === "j21-g1" &&
  txJvm === "j25-zgc" && path.isAbsolute(walDirectory) && diagnostics.lookupEvery === 64 && !diagnostics.serialApply);
// [DX-RD2] Why: the pinned short-cut pair (TX2_PINNED_SHORTCUT off, then on) reuses this runner's prepared aged arms.
// Rejected: a separate launcher with its own copy admission and aged fresh-peer check.
const pinnedPair = process.env.DX_RD2_PINNED_PAIR === "1";
// [DX-RD2] Why: the tuned pinned arm runs both pinned options on the read study's tuned reader (three cores, 3 GiB
// cache, the early filter) with client batches of eight, admitted from the held aged copy like the pinned pair.
// Rejected: the read study's own tuned arm, which admits only the fresh seal and needs a control ladder first.
const pinnedTuned = process.env.DX_RD2_PINNED_TUNED === "1";
const pinnedTunedPolicy = pinnedTuned ? launchProfile("server", { ...launchOptions, readTuned: true, readCacheMiB: 3072 }) : undefined;
if (pinnedTuned) assert(!tuned && !retirement && !pinnedPair && writer === "per-person-ordered" && age === "1B",
  "The tuned pinned arm uses the card's writer on the aged database");
if (pinnedPair) assert(!tuned && !retirement && writer === "per-person-ordered", "The pinned pair uses the card's writer and server profile");
assert(tuned || retirement || pinnedPair || pinnedTuned, "Use scorecard.mjs (adopted-server.ts) for the card; this runner is for the read study, DX_W1_RETIREMENT_PAIR=1, DX_RD2_PINNED_PAIR=1 or DX_RD2_PINNED_TUNED=1");

const end = Number(deadlineText);
assert(Number.isSafeInteger(end) && end > Date.now());
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock"), queue = fs.statSync(`/proc/${process.ppid}/fd/9`);
assert.equal(lock.ino, queue.ino); assert.equal(lock.dev, queue.dev);
scaleHost.physical();
// [DX-INT1] Why: stack/up.sh admits only CPUs in its caller's affinity under DX_BARE_METAL, so a driver pinned to 9,10
// before the stack is refused cores 0-8 (bench 3, 18:57 and 19:43 UTC). The driver is unpinned while each stack starts
// and pinned to 9,10 before its first read or save, so every measured window keeps the same placement.
// Rejected: widening up.sh's check, or pinning only after the first ladder (a second arm would be refused again).
const onlineCpus = tuned || pinnedTuned ? fs.readFileSync("/sys/devices/system/cpu/online", "utf8").trim() : "";
assert(!(tuned || pinnedTuned) || /^[0-9,-]+$/.test(onlineCpus));
const placeDriver = (cpus: string) => execFileSync("taskset", ["-apc", cpus, String(process.pid)], { stdio: "ignore" });
process.env.DX_BARE_METAL = "1";
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
// [DX-RD1] Why: a prepared read study names its ladder and one private PostgreSQL copy through the environment.
// Rejected: a dump restore on a server that holds only the stopped full-size directory.
// [DX-INT1] The append-retirement pair uses the same prepared path: one invocation per arm (--ladder reference, then
// append), each on a new private copy, because the server holds only the stopped directory and room for one copy.
// [DX-INT1] Why: the 1 billion pair runs from the held stopped aged cluster as the scorecard does (adopted-server.ts
// --pgdata-source with --aged-bundle): a new physical copy per arm, the aged bundle's fresh-peer check on the stack's
// network, and no dump. Rejected: restoring the aged dump per arm (33-42 minutes each, capped at 42).
const preparedSource = process.env.DX_RD1_PGDATA_SOURCE ?? "";
assert(!preparedSource || (((tuned && age === "fresh") || retirement || pinnedPair || pinnedTuned) && process.env.DX_RD1_LADDER && process.env.DX_RD1_PGDATA),
  "A prepared run needs --read-study on the fresh seal or DX_W1_RETIREMENT_PAIR=1, a ladder and one --pgdata copy");
const seed = openScaleSeal(path.join(fs.realpathSync(seedDir), "image.json"), imagePin, false, transferPin, !preparedSource);
const expected = age === "1B" ? openAged(age, agedFile, agedPin, agedDump, agedDumpPin, !preparedSource) : undefined;
const record = { source, age, writer, policy: control, treatment: tuned || pinnedTunedPolicy || undefined, diagnostics, retirement: retirement || undefined, pinnedPair: pinnedPair || undefined, pinnedTuned: pinnedTuned || undefined, pairOption: retirement ? pairOption : undefined, separateWal: !!walDirectory, imagePin, transferPin, originalScope: seed.scope,
  agedBundle: expected?.pin, agedDump: expected?.dumpPin || undefined };
const prepared = preparedSource ? openPreparedLadder({ campaign, ladder: process.env.DX_RD1_LADDER!, source: preparedSource,
  copy: process.env.DX_RD1_PGDATA!, wal: walDirectory || undefined, record, kind: retirement ? "retirement" : pinnedPair ? "pinned" : pinnedTuned ? "pinned-tuned" : "read" }) : undefined;
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
  const policy = loaded && tuned ? tuned : pinnedTunedPolicy ?? control;
  const out = path.join(campaign, retirement ? (loaded ? "append" : "reference") : pinnedPair ? (loaded ? "on" : "off") : pinnedTuned ? (loaded ? "pinned-tuned-repeat" : "pinned-tuned") : tuned ? (loaded ? "tuned" : "control") : (loaded ? "loaded" : "zero"));
  fs.mkdirSync(out);
  const floor = prepared ? 5 : age === "1B" ? 320 : 240;
  assert(scaleHost.available(out) >= floor * 1024 ** 3, "Insufficient free space for the disposable restore");
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-" + attempt.slice(0, 12);
  jsonFile(path.join(out, "attempt.json"), { source, tag: path.basename(out), slot, attempt });
  assert(Object.values(scaleHost.childrenInventory(slot)).every((x) => x.length === 0));
  let offered = false;
  try {
    await sealedArm(prepared, slot, attempt, async () => {
      let systemIdentifier = "";
      const options = stackOptions(writer, attempt, diagnostics);
      prepared?.claim(slot, attempt);
      if (tuned || pinnedTuned) placeDriver(onlineCpus);
      const { engines } = startScaleStack(out, slot, source, writer === "grouped", tuned ? {
        ...options, DX_RD1_READ_PROFILE: "1", DX_RD1_READ_FILTER: loaded ? "1" : "0", ...prepared?.env,
      } : retirement ? { ...options, [treatmentKey]: loaded ? "1" : "0", ...prepared?.env }
        : pinnedPair ? { ...options, DX_PINNED_SHORTCUT: loaded ? "1" : "0", DX_PINNED_CUT_LOOKUP: loaded ? "1" : "0", ...prepared?.env }
        : pinnedTuned ? { ...options, DX_PINNED_SHORTCUT: "1", DX_PINNED_CUT_LOOKUP: "1", DX_RD1_READ_PROFILE: "1", DX_RD1_READ_FILTER: "1", ...prepared?.env }
        : options, { policy, walDirectory });
      if (tuned || pinnedTuned) placeDriver("9,10");
      const peerUrls = () => ({ write: `http://${engines["gw-w"]!.address}:8080`, read: `http://${engines["gw-r"]!.address}:8080` });
      const residency = async () => {
        const { write, read } = peerUrls();
        const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
        assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
        const observed = await nativeMetrics({ prefix: slot, writeUrl: write, readUrl: read, gatewaySourceSha256: health.gatewaySourceHash,
          containers: Object.entries(engines).map(([role, e]) => ({ id: e.id, name: `${slot}-${role}`, imageId: e.image })) });
        return observed.roles as Residency;
      };
      const empty = tuned || retirement || pinnedPair || pinnedTuned ? undefined : await residency();
      const raw = path.join(out, "engines", slot, "trace", "raw");
      if (prepared) systemIdentifier = prepared.live(out, slot, attempt, engines.pg!.id);
      else await restoreDump(expected?.dump || seed.dump, expected?.dumpPin || seed.image.sha256, slot, engines,
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
      const head = expected ? await verifyAged(expected, out, engines.pg!.address, slot, attempt, engines["gw-r"]!.image) : seed.scope.cut;
      assert(!stopping && Date.now() + 8 * 60_000 < end);
      const peer = { write, read, slot, attempt, gatewaySource: health.gatewaySourceHash, java: jw,
        creditMode: policy.creditMode, serialApply: diagnostics.serialApply, empty, residency };
      firstOffer((retirement ? "retirement " : pinnedPair || pinnedTuned ? "pinned " : "read-study ") + path.basename(out));
      offered = true;
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
            { rate, append: loaded, seconds, agedHead: head });
          cut = result.terminal;
        }
        if (prepared) assert(!stopping, "Prepared arm was interrupted");
      } else if (pinnedTuned) {
        const native = JSON.parse(fs.readFileSync(path.join(raw, "gw-r-native-settings.json"), "utf8"));
        assert.deepEqual([native.source, native.slot, native.process], [source, slot, "gw-r"]);
        assert.equal(native.datomic["datomic.objectCacheMax"].value, 3072 * 1024 ** 2);
        const { pinnedLadder, tunedSeats, tunedBatch } = await import("../rd1/pinned-ladder.ts");
        await pinnedLadder(out, read, seed, head, true, false, { seats: tunedSeats, batch: tunedBatch });
        if (prepared) assert(!stopping, "Prepared tuned pinned ladder was interrupted");
      } else if (pinnedPair) {
        const { pinnedLadder } = await import("../rd1/pinned-ladder.ts");
        await pinnedLadder(out, read, seed, head, loaded);
        if (prepared) assert(!stopping, "Prepared pinned ladder was interrupted");
      } else {
        const arm = await adoptedArm(out, source, peer, seed, writer, loaded, false, head);
        if (loaded && !stopping) await quietPair(campaign, source, peer, seed, writer, false, arm.terminal);
      }
      return systemIdentifier;
    }, () => scaleHost.clean(out, slot), retirement ? () => execFileSync("python3", ["-I", "lab/experiments/EXP-DX1/w1/serial/summarize.py",
      out, slot, attempt, source, age, creditMode], { stdio: "inherit" }) : undefined);
  } catch (error) {
    if (prepared && !offered) {
      const target = prepared.setAside(attempt);
      console.error(`The ${prepared.ladder} arm stopped before its first save; its records are in ${target}. ` +
        `Run the same arm again with the same campaign on a new copy of the held cluster.`);
    }
    throw error;
  }
}

if (pinnedPair && (!prepared || prepared.ladder === "on")) {
  const [off, on] = ["off", "on"].map((arm) => JSON.parse(fs.readFileSync(path.join(campaign, arm, "pinned-ladder.json"), "utf8")));
  assert(off.shortcut === false && on.shortcut === true && off.head === on.head);
  const steps = off.steps.map((a: any, i: number) => {
    const b = on.steps[i];
    assert.deepEqual([a.pin, a.position, a.seats], [b.pin, b.position, b.seats]);
    return { pin: a.pin, position: a.position, seats: a.seats, goodput: [a.goodput, b.goodput], p50Ms: [a.read.p50Ms, b.read.p50Ms],
      p99Ms: [a.read.p99Ms, b.read.p99Ms], errors: [a.errors, b.errors], currentShare: b.shortcut.current / Math.max(1, b.shortcut.current + b.shortcut.asOf) };
  });
  jsonFile(path.join(campaign, "pinned-comparison.json"), { source, age, head: on.head, steps });
  console.log("[DX-RD2] " + JSON.stringify(steps));
}
if (retirement && (!prepared || prepared.ladder === "append")) {
  const arms = ["reference", "append"].map((arm) =>
    JSON.parse(fs.readFileSync(path.join(campaign, arm, "retirement-diagnostic.json"), "utf8")));
  assert(arms.every((arm) => arm.source === source && arm.creditMode === creditMode));
  assert.notEqual(arms[0].attempt, arms[1].attempt);
  assert.notEqual(arms[0].slot, arms[1].slot);
  assert.deepEqual(arms[0].windows.map((x: { tapeSha256: string }) => x.tapeSha256),
    arms[1].windows.map((x: { tapeSha256: string }) => x.tapeSha256));
  assert.equal(arms[0].windows[0].firstCut, arms[1].windows[0].firstCut);
  // [Opus W1] Why: state the migrated-person read cost as treatment over reference for each window, phase and read.
  const ratio = (a?: number | null, b?: number | null) => a && b ? Math.round((a / b) * 1000) / 1000 : null;
  const migratedReadRatios = arms[1].windows.map((w: any, i: number) => {
    const ref = arms[0].windows[i].migratedReads, trt = w.migratedReads;
    if (!ref || !trt) return { rate: w.rate, unavailable: true };
    return { rate: w.rate, ...Object.fromEntries(["loaded", "settled"].map((phase) => [phase, Object.fromEntries(
      ["current", "pinned"].map((kind) => [kind, { p50: ratio(trt[phase][kind].p50Ms, ref[phase][kind].p50Ms),
        p99: ratio(trt[phase][kind].p99Ms, ref[phase][kind].p99Ms) }]))])) };
  });
  // [DX-INT1] Why: late SQL reads per save for loader-edited and untouched people, reference then treatment, per window.
  const ownerGroupReads = arms[1].windows.map((w: any, i: number) => {
    const late = (arm: any) => arm.halves[1].byOwnerGroup ?? {};
    const ref = late(arms[0].windows[i]), trt = late(w);
    return { rate: w.rate, ...Object.fromEntries([...new Set([...Object.keys(ref), ...Object.keys(trt)])].sort().map((g) => [g, {
      saves: [ref[g]?.saves ?? 0, trt[g]?.saves ?? 0],
      sqlReadsPerSave: [ref[g]?.sqlReadsPerSave.mean ?? null, trt[g]?.sqlReadsPerSave.mean ?? null] }])) };
  });
  jsonFile(path.join(campaign, "retirement-comparison.json"), { source, age, creditMode, imagePin, transferPin, arms,
    pairOption, migratedReadRatios, ownerGroupReads });
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

function openAged(label: Age, file?: string, pin?: string, dump?: string, dumpPin?: string, restore = true) {
  assert(label === "1B" && file && pin);
  // A prepared copy is the held aged cluster itself; naming a dump as well would leave two sources for one arm.
  if (restore) assert(dump && dumpPin && /^[a-f0-9]{64}$/.test(dumpPin));
  else assert(!dump && !dumpPin, "A prepared 1B arm takes --aged-bundle only; pass empty dump arguments");
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

async function verifyAged(expected: ReturnType<typeof openAged>, out: string, postgres: string, slot: string, attempt: string, peerImage: string) {
  assert(process.env.AGE_JAVA && process.env.AGE_DATOMIC_HOME);
  // [DX-V01] Why: check the fresh peer against the exact aged replay bundle before touching the restored arm.
  // Rejected: treating the 1B label or the dump size as proof of age.
  const { checkScorecard } = await import("../age1/scorecard.mjs");
  const original = process.env.DATOMIC_URI_TEMPLATE;
  const sql = new URL(`postgresql://${postgres}/datomic`);
  sql.searchParams.set("user", "datomic");
  sql.searchParams.set("password", "datomic");
  process.env.DATOMIC_URI_TEMPLATE = "datomic:sql://{db}?jdbc:postgresql:" + sql.href.slice("postgresql:".length);
  // [DX-INT1] The fresh peer runs on the stack's own network (age1/scorecard.mjs peerCommand).
  process.env.AGE_PEER_DOCKER_NETWORK = slot + "-net";
  process.env.AGE_PEER_DOCKER_IMAGE = peerImage;
  try {
    const result = checkScorecard(expected.file, expected.pin);
    assert.equal(result.logicalHead, expected.bundle.logicalHead);
    jsonFile(path.join(out, "aged-live-check.json"), { ...result, source, slot, attempt, peer: { network: slot + "-net", image: peerImage } });
    return result.logicalHead;
  } finally {
    delete process.env.AGE_PEER_DOCKER_NETWORK;
    delete process.env.AGE_PEER_DOCKER_IMAGE;
    if (original === undefined) delete process.env.DATOMIC_URI_TEMPLATE;
    else process.env.DATOMIC_URI_TEMPLATE = original;
  }
}
