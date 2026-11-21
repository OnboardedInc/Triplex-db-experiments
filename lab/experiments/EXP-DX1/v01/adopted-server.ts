import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
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

const [source, campaign, deadlineText, seedDir, imagePin, transferPin, age, writer, jvm, agedFile, agedPin, agedDump, agedDumpPin,
  txJvm = jvm, walDirectory = "", writeJvm = jvm, creditMode = defaultCreditMode] = process.argv.slice(2);
assert(source && campaign && seedDir && imagePin && transferPin);
assert(age === "fresh" || age === "1B");
assert(writer === "grouped" || writer === "subject");
const policy = launchProfile("server", { jvm: jvm as JvmProfile, txJvm: txJvm as JvmProfile,
  writeJvm: writeJvm as JvmProfile, creditMode: creditMode as CreditMode });
const diagnostics = writeDiagnostics(writer);
const retirement = process.env.DX_W1_RETIREMENT_PAIR === "1";
if (retirement) assert(writer === "subject" && jvm === "j21-g1" && writeJvm === "j21-g1" &&
  txJvm === "j25-zgc" && path.isAbsolute(walDirectory) && diagnostics.lookupEvery === 64 && !diagnostics.serialApply);
const end = Number(deadlineText);
assert(Number.isSafeInteger(end) && end > Date.now());
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock"), queue = fs.statSync(`/proc/${process.ppid}/fd/9`);
assert.equal(lock.ino, queue.ino); assert.equal(lock.dev, queue.dev);
scaleHost.physical();
process.env.DX_BARE_METAL = "1";
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
const seed = openScaleSeal(path.join(fs.realpathSync(seedDir), "image.json"), imagePin, false, transferPin);
const expected = age === "1B" ? openAged(age, agedFile, agedPin, agedDump, agedDumpPin) : undefined;
fs.mkdirSync(campaign);
jsonFile(path.join(campaign, "input.json"), { source, age, writer, policy, diagnostics, retirement, separateWal: !!walDirectory, imagePin, transferPin, originalScope: seed.scope,
  agedBundle: expected?.pin, agedDump: expected?.dumpPin });
let stopping = false;
const stop = () => { stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
for (const loaded of [false, true]) {
  assert(!stopping && Date.now() + 10 * 60_000 < end);
  const out = path.join(campaign, retirement ? (loaded ? "append" : "reference") : (loaded ? "loaded" : "zero"));
  fs.mkdirSync(out);
  const floor = age === "1B" ? 320 : 240;
  assert(scaleHost.available(out) >= floor * 1024 ** 3, "Insufficient free space for the disposable restore");
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-" + attempt.slice(0, 12);
  jsonFile(path.join(out, "attempt.json"), { source, tag: path.basename(out), slot, attempt });
  assert(Object.values(scaleHost.childrenInventory(slot)).every((x) => x.length === 0));
  try {
    const options = stackOptions(writer, attempt, diagnostics);
    const treatment = retirement ? { TX2_SUBJECT_APPEND_RETIREMENT: loaded ? "1" : "0" } : {};
    const { engines } = startScaleStack(out, slot, source, writer === "grouped", { ...options, ...treatment }, { policy, walDirectory });
    const peerUrls = () => ({ write: `http://${engines["gw-w"]!.address}:8080`, read: `http://${engines["gw-r"]!.address}:8080` });
    const residency = async () => {
      const { write, read } = peerUrls();
      const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
      assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
      const observed = await nativeMetrics({ prefix: slot, writeUrl: write, readUrl: read, gatewaySourceSha256: health.gatewaySourceHash,
        containers: Object.entries(engines).map(([role, e]) => ({ id: e.id, name: `${slot}-${role}`, imageId: e.image })) });
      return observed.roles as Residency;
    };
    const empty = retirement ? undefined : await residency();
    await restoreDump(expected?.dump ?? seed.dump, expected?.dumpPin ?? seed.image.sha256, slot, engines,
      Math.min(end - 10 * 60_000, Date.now() + 42 * 60_000));
    const write = `http://${engines["gw-w"]!.address}:8080`;
    const read = `http://${engines["gw-r"]!.address}:8080`;
    const jw = readScaleJvms(path.join(out, "restored-jvm"), engines, policy);
    const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
    assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
    const head = expected ? await verifyAged(expected, out, engines.pg!.address) : seed.scope.cut;
    assert(!stopping && Date.now() + 8 * 60_000 < end);
    const peer = { write, read, slot, attempt, gatewaySource: health.gatewaySourceHash, java: jw,
      creditMode: policy.creditMode, serialApply: diagnostics.serialApply, empty, residency };
    if (retirement) {
      let cut = head;
      const [rates, seconds] = age === "fresh" ? [[394, 620], 300] as const : [[50, 235], 120] as const;
      for (const rate of rates) {
        assert(!stopping && Date.now() + (seconds + 120) * 1000 < end);
        const window = path.join(out, String(rate));
        fs.mkdirSync(window);
        const result = await adoptedArm(window, source, peer, seed, writer, true, false, cut, undefined,
          { rate, append: loaded, seconds });
        cut = result.terminal;
      }
    } else {
      const arm = await adoptedArm(out, source, peer, seed, writer, loaded, false, head);
      if (loaded && !stopping) await quietPair(campaign, source, peer, seed, writer, false, arm.terminal);
    }
  } finally {
    scaleHost.clean(out, slot);
  }
  if (retirement) execFileSync("python3", ["-I", "lab/experiments/EXP-DX1/w1/serial/summarize.py",
    out, slot, attempt, source, age, creditMode], { stdio: "inherit" });
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
