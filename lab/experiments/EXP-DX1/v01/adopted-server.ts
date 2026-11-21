import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { scaleHost, startScaleStack } from "../scale1/bench.ts";
import { restoreDump } from "../scale1/seed-image.ts";
import { adoptedArm, jsonFile, quietPair, recordMixedIds, type Residency } from "./adopted.ts";
import { nativeMetrics } from "../thin1/native-metrics.ts";
import { openScaleSeal, hex } from "./adopt.ts";
import { budget, isWriter, jvmProfiles, physicalJvm, stackOptions, type Age, type JvmProfile } from "./profile.ts";
import { cleanSource, verifyBuild } from "./source.ts";

const [source, campaign, deadlineText, seedDir, imagePin, transferPin, age, requestedWriter, jvm, agedFile, agedPin, agedDump, agedDumpPin] = process.argv.slice(2);
assert(source && campaign && seedDir && imagePin && transferPin);
assert(age === "fresh" || age === "1B");
assert(isWriter(requestedWriter));
assert(jvmProfiles.includes(jvm as JvmProfile));
const jvmProfile = jvm as JvmProfile;
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
jsonFile(path.join(campaign, "input.json"), { source, age, writer: requestedWriter, jvm: jvmProfile, imagePin, transferPin, originalScope: seed.scope,
  agedBundle: expected?.pin, agedDump: expected?.dumpPin });
let stopping = false;
const stop = () => { stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
const orderedEnd = Date.now() + budget.adoptionAndP1to4 * 60_000;
const groupedDir = path.join(campaign, "grouped", "campaign");
if (requestedWriter === "per-person-ordered") fs.mkdirSync(groupedDir, { recursive: true });
const stages = requestedWriter === "per-person-ordered"
  ? [{writer: requestedWriter, loaded: false}, {writer: requestedWriter, loaded: true}, {writer: "grouped", loaded: true}] as const
  : [{writer: requestedWriter, loaded: true}] as const;
for (const { writer, loaded } of stages) {
  const stageEnd = writer === "per-person-ordered" ? orderedEnd : Math.min(end, Date.now() + budget.comparison * 60_000);
  assert(!stopping && Date.now() + 10 * 60_000 < stageEnd);
  const root = writer === "grouped" && requestedWriter !== writer ? groupedDir : campaign;
  const out = path.join(root, loaded ? "loaded" : "zero");
  fs.mkdirSync(out);
  const floor = age === "1B" ? 320 : 240;
  assert(scaleHost.available(out) >= floor * 1024 ** 3, "Insufficient free space for the disposable restore");
  const attempt = randomUUID();
  const slot = "tx2-dxscale1-v01-" + attempt.slice(0, 12);
  assert(Object.values(scaleHost.childrenInventory(slot)).every((x) => x.length === 0));
  try {
    const { engines } = startScaleStack(out, slot, source, writer === "grouped", stackOptions(writer, attempt, jvmProfile));
    const peerUrls = () => ({ write: `http://${engines["gw-w"]!.address}:8080`, read: `http://${engines["gw-r"]!.address}:8080` });
    const residency = async () => {
      const { write, read } = peerUrls();
      const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
      assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
      const observed = await nativeMetrics({ prefix: slot, writeUrl: write, readUrl: read, gatewaySourceSha256: health.gatewaySourceHash,
        containers: Object.entries(engines).map(([role, e]) => ({ id: e.id, name: `${slot}-${role}`, imageId: e.image })) });
      return observed.roles as Residency;
    };
    const empty = writer === "per-person-ordered" ? await residency() : undefined;
    await restoreDump(expected?.dump ?? seed.dump, expected?.dumpPin ?? seed.image.sha256, slot, engines,
      Math.min(stageEnd - 10 * 60_000, Date.now() + 42 * 60_000));
    const write = `http://${engines["gw-w"]!.address}:8080`;
    const read = `http://${engines["gw-r"]!.address}:8080`;
    const jw = await readJvm(engines, jvmProfile);
    const health = await (await fetch(new URL("/health", write), { signal: AbortSignal.timeout(2000) })).json() as any;
    assert.match(health.gatewaySourceHash, /^[a-f0-9]{64}$/);
    const head = expected ? await verifyAged(expected, out, engines.pg!.address) : seed.scope.cut;
    assert(!stopping && Date.now() + 8 * 60_000 < stageEnd);
    const peer = { write, read, slot, attempt, gatewaySource: health.gatewaySourceHash, java: jw, empty, residency };
    const arm = await adoptedArm(out, source, peer, seed, writer, loaded, false, head);
    if (loaded && !stopping) {
      const cut = await quietPair(root, source, peer, seed, writer, false, arm.terminal);
      let after = cut;
      if (!stopping && writer === "per-person-ordered") {
        const { runImport } = await import("./import-arm.ts");
        after = runImport(root, source, peer, seed, writer, false, cut);
      }
      if (!stopping) await recordMixedIds(root, source, peer, seed, writer, after);
    }
  } finally {
    scaleHost.clean(out, slot);
  }
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

async function readJvm(engines: Record<string, { id: string }>, profile: JvmProfile) {
  const expected = physicalJvm(profile);
  const result = [];
  for (const role of ["tx", "gw-w", "gw-r"]) {
    const id = engines[role]!.id;
    const args = execFileSync("docker", ["exec", id, "sh", "-ec",
      'java -version 2>&1; for p in /proc/[0-9]*; do [ "$(cat "$p/comm" 2>/dev/null)" = java ] || continue; tr "\\000" "\\n" < "$p/cmdline" | grep -E "^(-X|-Ddatomic[.]|-Dlogback[.]|--enable-native-access|--sun-misc)" ; done'],
    { encoding: "utf8", timeout: 10000 });
    assert(args.includes('version "' + expected.major + "."));
    assert(args.trim().split("\n").includes(expected.selectedCollector));
    result.push({ role, container: id, observed: args.trim().split("\n") });
  }
  return result;
}
