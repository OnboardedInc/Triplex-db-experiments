import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { memoryPlan } from "../int1/memory-plan.ts";
import { nodeImage, pgImage } from "../v01/source.ts";
import { isWriter } from "../v01/profile.ts";

const [action, supplied, mode, rung, out, guestNode] = process.argv.slice(2);
const scorecard = process.env.DX_V01_MAC_FIXTURE === "1";
const readStudy = process.env.DX_V01_MAC_HOLDER === "DX-RD1" || process.env.DX_V01_MAC_READ_STUDY === "1";
assert(!readStudy || scorecard || (action === "--guest" && process.env.DX_V01_FIXTURE_SOURCE));
const realistic = process.env.DX_REAL1_MAC_FIXTURE === "1";
assert(!realistic || !scorecard);
const holder = realistic ? (process.env.DX_REAL1_MAC_HOLDER ?? "DX-REAL1") : scorecard ? (process.env.DX_V01_MAC_HOLDER ?? "DX-V01") : "DX-THIN1";
assert((realistic && holder === "DX-REAL1") || holder === "DX-THIN1" || (scorecard && ["DX-V01", "DX-RD1"].includes(holder)));
const integrated = [
  "int1-thin",
  "int1-deep",
  "int1-proof",
  "int1-campaign-proof",
  "int1-adopted-proof",
  "int1-cold-probe",
  "int1-idle",
  "int1-pooled",
  "int1-isolated",
  "int1-real1",
  "int1-untouched-census",
].includes(mode ?? "");
const repo = fileURLToPath(new URL("../../../../", import.meta.url)),
  dir = path.resolve(supplied ?? ".");
assert(dir.startsWith(path.resolve(repo, "runs") + "/"));
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const sharedGit = action === "--guest" && process.env.DX_V01_FIXTURE_SOURCE ? repo : path.dirname(
  execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: repo,
    encoding: "utf8",
  }).trim(),
);
const main = scorecard && process.env.DX_V01_LAB_RUNTIME ? process.env.DX_V01_LAB_RUNTIME : sharedGit;
const file = path.join(dir, "lab/config/slots.json"),
  cred = path.join(dir, "attempt.json"),
  manifest = path.join(dir, "stack.json");
const write = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
const imageFolder = path.join(dir, "lab/config/datomic");
const manager = (args: string[]) => {
  const argv = ["lab/bin/engine.mjs", ...args, "--lane", "datomic", "--holder", holder];
  const attempt = args.includes("--slot") && fs.existsSync(cred) ? read(cred) : undefined;
  const options = {
    cwd: repo,
    encoding: "utf8" as const,
    maxBuffer: 32 << 20,
    env: {
      ...process.env,
      TX2_CONFIG_DIR: dir,
      TX2_SLOTS_FILE: file,
      TX2_LOCKS_DIR: path.join(main, "lab/locks"),
      TX2_ENGINE_DIR: path.join(main, "runs/engines"),
      TX2_DOCKER_HOST: read(path.join(main, "lab/config/slots.json")).dockerHost,
      ...(attempt?.isolatedVolume ? { TX2_EXCLUSIVE_VOLUME_ID: attempt.nonce } : {}),
    },
  };
  if (args[0] === "logs") {
    const result = spawnSync(process.execPath, argv, options);
    if (result.error || result.status !== 0) throw Error("Unable to read owned engine logs");
    return result.stdout + result.stderr;
  }
  return execFileSync(process.execPath, argv, options);
};
const ownerFile = (s: string) => path.join(main, "lab/locks/datomic-" + s + "/owner.json");
const run = fileURLToPath(import.meta.url);
async function prepare() {
  fs.mkdirSync(dir);
  fs.mkdirSync(path.dirname(imageFolder), { recursive: true });
  fs.cpSync(path.join(repo, "lab/config/datomic"), imageFolder, { recursive: true });
  fs.mkdirSync(path.join(dir, "packages/datomic/src"), { recursive: true });
  fs.cpSync(
    path.join(repo, "packages/datomic/gateway"),
    path.join(dir, "packages/datomic/gateway"),
    { recursive: true },
  );
  fs.copyFileSync(
    path.join(repo, "packages/datomic/src/codec-spec.json"),
    path.join(dir, "packages/datomic/src/codec-spec.json"),
  );
  fs.copyFileSync(
    fileURLToPath(new URL("./slot.ts", import.meta.url)),
    path.join(imageFolder, "slot.ts"),
  );
  const recipe = path.join(imageFolder, "Dockerfile");
  const original = fs.readFileSync(recipe, "utf8");
  // [DX-INT1] Why: JVM1 declares its pinned base before all build stages.
  // Rejected: prepending a stage that makes the Java image ARG local to that stage.
  const firstFrom = original.search(/^FROM /m);
  assert(firstFrom >= 0);
  fs.writeFileSync(
    recipe,
    original.slice(0, firstFrom) +
    (scorecard
      ? `FROM ${pgImage} AS thinpg\nFROM ${nodeImage} AS thinnode\nFROM python:3.13-slim-bookworm@sha256:a5a7017efc5969e00ae2b91c8eb0631049a569652aa4ffc4501769049ae45c72 AS thinpython\n`
      : "FROM postgres:17-alpine AS thinpg\nFROM node:22.23.2-bookworm-slim AS thinnode\n") +
      original.slice(firstFrom) +
      (scorecard ? "\nCOPY --from=thinpython /usr/local/ /usr/local/\nRUN python3 -B -I -c 'import hashlib, json, math'\n" : "") +
      "\nCOPY --from=thinpg / /opt/thin-pg/\nCOPY --from=thinnode /usr/local/bin/node /usr/local/bin/node\n" +
      "RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 && printf '%s\\n' '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/ && /opt/thin-pg/usr/local/bin/postgres --version && node --version\n",
  );
  fs.writeFileSync(
    path.join(imageFolder, "entrypoint.sh"),
    "#!/bin/sh\nexec /usr/local/bin/node --no-warnings --experimental-transform-types /config/slot.ts\n",
  );
  // [DX-THIN1] Why: keep the pool, exclusive slot names, ports and ownership checks common to every worktree.
  // Rejected: substituting a private pool ledger or changing the tag of a resident image.
  for (const name of ["cache-charge.ts", "heap-residency.ts"]) {
    fs.copyFileSync(fileURLToPath(new URL("./" + name, import.meta.url)), path.join(imageFolder, name));
  }
  const diagnosticJdk = process.env.DX_THIN_DIAGNOSTIC_JDK;
  if (diagnosticJdk) {
    const expected = "e3522e707fc7dbe2a72c30746b1e7068301a0213ecd213d4491f35a14eb55578";
    assert.equal(
      createHash("sha256").update(fs.readFileSync(diagnosticJdk)).digest("hex"),
      expected,
      "Unexpected Temurin 21 diagnostic JDK",
    );
    fs.copyFileSync(diagnosticJdk, path.join(imageFolder, "diagnostic-jdk.tar.gz"));
    fs.appendFileSync(
      recipe,
      "RUN mkdir -p /opt/thin-jdk && tar --strip-components=1 -xzf /config/diagnostic-jdk.tar.gz -C /opt/thin-jdk && /opt/thin-jdk/bin/jcmd -h >/dev/null\n",
    );
  }
  const cfg = read(path.join(main, "lab/config/slots.json"));
  const { verifiedTree } = await import(new URL("../../../bin/datomic-context.mjs", import.meta.url).href);
  // [DX-THIN1] Why: keep old and new private images addressable across a native gateway merge. Rejected: reusing a tag derived only from the launcher when the gateway or codec changes.
  cfg.lanes.datomic.image =
    (holder === "DX-REAL1" ? "tx2-dxthin-managed:real1-" : holder === "DX-RD1" ? "tx2-dxthin-rd1:" : "tx2-dxthin-managed:") +
    createHash("sha256")
      .update(JSON.stringify([verifiedTree(imageFolder), verifiedTree(path.join(dir, "packages/datomic/gateway")), verifiedTree(path.join(dir, "packages/datomic/src"))]))
      .digest("hex")
      .slice(0, 16);
  write(file, cfg);
  fs.writeFileSync(path.join(dir, "build.log"), manager(["build"]));
}
function setup(compact: boolean) {
  if (compact) {
    const sourceGateway = path.join(repo, "packages/datomic/gateway");
    const imageGateway = path.join(dir, "packages/datomic/gateway");
    const files = (folder: string) => fs.readdirSync(folder, { recursive: true, encoding: "utf8" })
      .filter(f => fs.statSync(path.join(folder,f)).isFile()).sort();
    const names = files(sourceGateway);
    assert.deepEqual(names, files(imageGateway), "Gateway image file set differs");
    for (const name of names) assert(fs.readFileSync(path.join(sourceGateway,name)).equals(
      fs.readFileSync(path.join(imageGateway,name))), "Rebuild the changed gateway source: " + name);
    const codec = "packages/datomic/src/codec-spec.json";
    assert(fs.readFileSync(path.join(repo,codec)).equals(fs.readFileSync(path.join(dir,codec))),
      "Rebuild the changed gateway codec");
    for (const name of ["slot.ts", "cache-charge.ts", "heap-residency.ts"]) {
      const running = fs.readFileSync(path.join(imageFolder, name));
      assert(
        running.equals(fs.readFileSync(new URL("./" + name, import.meta.url))),
        "Rebuild the compact role image before running changed source",
      );
    }
  }
  const cfg = read(file),
    nonce = randomBytes(10).toString("hex"),
    secret = randomBytes(20).toString("hex");
  // [DX-INT1] Why: every exclusive slot has the same published maximum. Let the manager adjudicate two free slots without tying up a busy builder's preferred slot.
  // Rejected: borrowing a resident or changing the global reservation pool.
  const required = compact ? 1 : 2;
  const slots = integrated
    ? ["s2", "s1", "s3"].filter((s) => !fs.existsSync(ownerFile(s))).slice(0, required)
    : ["s2", "s1"];
  assert.equal(slots.length, required, "Insufficient free exclusive slots");
  const original = read(path.join(main, "lab/config/slots.json")).slots.datomic;
  const gwPolicy = process.env.DX_INT1_GATEWAYS ?? "original";
  const readMode = process.env.DX_TOUCHED_READ_MODE ?? "following";
  const peerGc = process.env.DX_INT1_PEER_GC ?? "g1";
  const smallHeap = process.env.DX_INT1_PEER_HEAP === "128m";
  assert([undefined, "default", "128m"].includes(process.env.DX_INT1_PEER_HEAP));
  assert(!smallHeap || (gwPolicy === "demand" && peerGc === "g1"));
  const seedFeed = process.env.DX_INT1_SEED_FEED ?? "immediate";
  const rowWire = process.env.DX_INT1_ROW_WIRE ?? "plain";
  const memoryPoints = process.env.DX_INT1_MEMORY_POINTS;
  const memory = memoryPlan(memoryPoints, mode ?? "", Number(rung));
  const nativePools = process.env.DX_INT1_NATIVE_POOLS === "1";
  if (nativePools) {
    assert(memory && !memory.scopes && mode === "int1-deep");
    assert(fs.existsSync(path.join(imageFolder, "diagnostic-jdk.tar.gz")));
  }
  if (memory) assert(compact && gwPolicy === "demand" && readMode === "validated");
  assert(rowWire === "plain" || (rowWire === "gzip" && readMode === "validated"));
  assert(["immediate","after-sampling"].includes(seedFeed));
  if (seedFeed === "after-sampling") assert(mode === "int1-deep" || mode === "int1-thin");
  assert(["original", "demand"].includes(gwPolicy) && ["following", "validated"].includes(readMode));
  assert(peerGc === "g1" || (gwPolicy === "demand" && peerGc === "elastic"));
  const writeOptionsAttempt = mode === "int1-adopted-proof" ? randomUUID() : undefined;
  const realisticScorecard = !!writeOptionsAttempt && process.env.DX_V01_MAC_AGE === "realistic";
  const scorecardComparison = !!writeOptionsAttempt && process.env.DX_V01_MAC_COMPARISON === "1";
  const scorecardCreditMode = writeOptionsAttempt ? process.env.DX_V01_CREDIT_MODE : undefined;
  const scorecardWriter = writeOptionsAttempt ? (process.env.DX_V01_MAC_WRITER ?? "grouped") : undefined;
  assert(!writeOptionsAttempt || isWriter(scorecardWriter));
  // [DX-INT1] The card's save tape for its toy (v01/production-card.ts); Saturday's unless the Mac command names one.
  const scorecardTape = writeOptionsAttempt ? (process.env.DX_V01_TAPE ?? "saturday") : undefined;
  assert(scorecardTape === undefined || ["saturday", "production-R", "production-S"].includes(scorecardTape));
  for (const [n, slot] of slots.entries()) {
    const role = n === 0 ? "write" : "read";
    assert(!fs.existsSync(ownerFile(slot)), "Exclusive slot is in use");
    const settings = (cfg.slots.datomic[slot] = { ...original[slot] });
    settings.gatewayOpts =
      (gwPolicy === "demand" ? (smallHeap ? "-Xmx128m" : "-Xmx384m") + " -Ddxthin.cache=demand -Ddatomic.objectCacheMax=32m " +
        (peerGc === "elastic" ? "-Xms32m -XX:+UseZGC -XX:+ZGenerational -XX:SoftMaxHeapSize=96m -XX:ZUncommitDelay=1" :
          "-Xms64m -XX:MinHeapFreeRatio=15 -XX:MaxHeapFreeRatio=30 -XX:-ShrinkHeapInSteps")
        : (compact ? "-Xms128m -Xmx600m" : "-Xms160m -Xmx896m") + " -Ddatomic.objectCacheMax=192m") +
      (compact ? " -Ddxthin.compact=yes" : "") + (memory ? " -Ddxthin.memory=yes" : "") +
      (mode === "int1-campaign-proof" ? " -Ddxthin.campaign=yes" : "") +
      (writeOptionsAttempt ? " -Ddxthin.adopted=" + writeOptionsAttempt + " -Ddxthin.scorecardWriter=" + scorecardWriter : "") +
      (readStudy ? " -Ddxthin.readStudy=yes" : "") +
      (nativePools ? " -Ddxthin.nativePools=yes -XX:NativeMemoryTracking=summary" : "") + " -XX:+ExitOnOutOfMemoryError -Ddxthin.run=" +
      nonce +
      " -Ddxthin.secret=" +
      secret +
      " -Ddxthin.role=" +
      role;
    settings.transactorOpts =
      (compact ? "-Xms192m -Xmx840m" : "-Xms256m -Xmx1170m") + " -XX:+ExitOnOutOfMemoryError" +
      (nativePools ? " -XX:NativeMemoryTracking=summary" : "");
    if (role === "read") settings.memBytes = Math.min(settings.memBytes, 1536 * 1024 ** 2);
  }
  write(file, cfg);
  const census = process.env.DX_INT1_CENSUS ?? "held", cohort = process.env.DX_INT1_COHORT ?? "stride";
  assert(["held", "seed-only"].includes(census) && ["stride", "spread"].includes(cohort));
  write(cred, {
    nonce, secret, slots, compact, census, cohort, writeOptionsAttempt, scorecardWriter, scorecardCreditMode, scorecardComparison, realisticScorecard,
    ...(scorecardTape && scorecardTape !== "saturday" ? { scorecardTape } : {}),
    crossCheck: !!writeOptionsAttempt && process.env.DX_THIN1_CROSSCHECK === "1",
    gwPolicy, readMode, peerGc, smallHeap, seedFeed, rowWire,
    memoryPoints, nativePools,
    readerPages: process.env.DX_INT1_READER_PAGES === "1",
    isolatedVolume: compact,
  });
  return slots;
}
function witness(slot: string) {
  const owner = read(ownerFile(slot)),
    cfg = read(file),
    attempt = read(cred);
  assert(
    owner.holder === holder &&
      owner.mode === "exclusive" &&
      fs.realpathSync(owner.worktree) === fs.realpathSync(repo),
  );
  const find = () => manager(["logs", "--slot", slot, "--tail", "2000"])
    .split("\n").filter((l) => l.startsWith("DXTHIN-SLOT ")).at(-1);
  // [DX-RD1] Why: the compact read peer can still be starting when the managed writer reports healthy.
  // Rejected: binding a half-started stack or giving the slot a fixed startup delay.
  const end = Date.now() + (attempt.compact ? 45_000 : 0);
  const wait = new Int32Array(new SharedArrayBuffer(4));
  let line = find();
  while (!line && Date.now() < end) {
    Atomics.wait(wait, 0, 0, 250);
    line = find();
  }
  assert(line, "Missing live slot identity");
  const event = JSON.parse(line.slice(12));
  assert(
    event.nonce === attempt.nonce &&
      event.role === (slot === (attempt.slots?.[0] ?? "s2") ? "write" : "read"),
  );
  return {
    role: event.role,
    owner: ownerFile(slot),
    name: owner.container,
    createdAt: owner.createdAt,
    endpoint: owner.endpoint,
    address: event.address,
    metrics: "http://" + event.address + ":8989/metrics",
    id: event.containerId,
    readPort: event.readPort,
    source: event.source,
    imageId: cfg.lanes.datomic.imageId,
  };
}
function bind() {
  const cfg = read(file),
    attempt = read(cred);
  const slots: string[] = attempt.slots ?? ["s2", "s1"];
  const peers = slots.map(witness);
  const containers = peers.map((p) => ({ name: p.name, id: p.id, imageId: p.imageId }));
  if (attempt.compact) {
    const writer = peers[0]!;
    assert(peers.length === 1 && writer.role === "write" && writer.readPort === 8081);
    peers.push({
      ...writer,
      role: "read",
      endpoint: "http://" + writer.address + ":" + writer.readPort,
    });
  }
  assert(peers[0]!.source === peers[1]!.source);
  write(manifest, {
    prefix: "tx2-dxthin-" + attempt.nonce,
    writeUrl: scorecard ? "http://" + peers[0]!.address + ":8080" : peers[0]!.endpoint,
    readUrl: peers[1]!.endpoint,
    gatewaySourceSha256: peers[0]!.source,
    buildInputsSha256: cfg.lanes.datomic.buildInputsSha256,
    managed: {
      nonce: attempt.nonce,
      writeOptionsAttempt: attempt.writeOptionsAttempt,
      scorecardWriter: attempt.scorecardWriter,
      scorecardCreditMode: attempt.scorecardCreditMode,
      scorecardComparison: attempt.scorecardComparison,
      realisticScorecard: attempt.realisticScorecard,
      ...(attempt.scorecardTape ? { scorecardTape: attempt.scorecardTape } : {}),
      crossCheck: attempt.crossCheck === true,
      compact: !!attempt.compact,
      census: attempt.census, cohort: attempt.cohort,
      gwPolicy: attempt.gwPolicy, readMode: attempt.readMode,
      peerGc: attempt.peerGc,
      smallHeap: attempt.smallHeap,
      seedFeed: attempt.seedFeed,
      rowWire: attempt.rowWire,
      memoryPoints: attempt.memoryPoints,
      nativePools: attempt.nativePools,
      readerPages: attempt.readerPages,
      peers,
      cacheDiagnostic: fs.existsSync(path.join(imageFolder, "diagnostic-jdk.tar.gz")),
    },
    containers,
  });
}
if (action === "--guest") {
  assert(
    process.platform === "linux" &&
      (mode === "all" || mode === "touched" || integrated) &&
      rung &&
      out,
  );
  const stack = read(manifest);
  Object.assign(process.env, {
    DATOMIC_URL: stack.writeUrl,
    DATOMIC_READ_URLS: stack.readUrl,
    DX_THIN_STACK: manifest,
    DX_THIN_CREDENTIAL: cred,
    TRIPLEX_DATOMIC_LAYOUT: "lean",
    DX_INT1_CENSUS: stack.managed.census ?? "held",
    DX_INT1_COHORT: stack.managed.cohort ?? "stride",
    DX_TOUCHED_READ_MODE: stack.managed.readMode ?? "following",
    DX_INT1_GATEWAYS: stack.managed.gwPolicy ?? "original",
    DX_INT1_PEER_GC: stack.managed.peerGc ?? "g1",
    DX_INT1_PEER_HEAP: stack.managed.smallHeap ? "128m" : "default",
    DX_INT1_SEED_FEED: stack.managed.seedFeed ?? "immediate",
    DX_INT1_ROW_WIRE: stack.managed.rowWire ?? "plain",
    DX_INT1_READER_PAGES: stack.managed.readerPages ? "1" : "0",
    ...(stack.managed.memoryPoints ? { DX_INT1_MEMORY_POINTS: stack.managed.memoryPoints } : {}),
    DX_INT1_NATIVE_POOLS: stack.managed.nativePools ? "1" : "0",
    TRIPLEX_DATOMIC_FAST_PATHS: [...(process.env.TRIPLEX_DATOMIC_FAST_PATHS ?? "").split(",").filter(x => x && x !== "demand-gzip"), ...(stack.managed.rowWire === "gzip" ? ["demand-gzip"] : [])].join(","),
  });
  if (stack.managed.compact) {
    let ready = false;
    for (let n = 0; n < 90 && !ready; n++) {
      try {
        const r = await fetch(new URL("/health", stack.readUrl), {
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) {
          const info = (await r.json()) as any;
          assert(
            info.gatewaySourceHash === stack.gatewaySourceSha256 &&
              info.datomicVersion === "1.0.7745",
          );
          ready = true;
        }
      } catch (e) {
        if (!(e instanceof TypeError) && !(e instanceof DOMException)) throw e;
      }
      if (!ready) await new Promise((r) => setTimeout(r, 1000));
    }
    assert(ready, "Compact read gateway startup deadline");
  }
  if (process.argv[7]) {
    const armRoot = integrated ? path.dirname(out) : out;
    if (integrated) assert.equal(path.basename(armRoot), "int1");
    assert(
      path.basename(path.dirname(armRoot)) === "DX-THIN1" &&
        path.basename(path.dirname(path.dirname(armRoot))) === "evidence",
    );
    process.env.DX_THIN_HOST_PID = process.argv[7];
    process.env.DX_THIN_MEASURE = path.resolve(armRoot, "../../..", "locks", "measure");
  }
  process.argv = [process.execPath, run, "live", mode, rung, out];
  if (mode === "int1-untouched-census") {
    assert((rung === "4096" || rung === "24576") && process.env.DX_V01_FIXTURE_SOURCE);
    const { untouchedCensus } = await import("../int1/untouched-census.ts");
    await untouchedCensus(stack, out!, read(cred).secret, process.env.DX_V01_FIXTURE_SOURCE, Number(rung));
  } else if (mode === "int1-adopted-proof") {
    process.chdir(repo);
    const { parseCredits } = await import("../v01/server-workload.ts");
    if (stack.managed.scorecardTape) process.env.DX_V01_TAPE = stack.managed.scorecardTape;
    const { adoptedToy } = await import("../v01/adopted.ts");
    const { readResidentMappings } = await import("./heap-residency.ts");
    const readyBy = Date.now() + 45_000;
    for (;;) {
      try {
        const answer = await fetch(new URL("/health", stack.readUrl), { signal: AbortSignal.timeout(1000) });
        if (answer.ok && (await answer.json() as { gatewaySourceHash: string }).gatewaySourceHash === stack.gatewaySourceSha256) break;
      } catch {}
      assert(Date.now() < readyBy, "Compact read gateway did not become healthy");
      await delay(250);
    }
    const commands = fs.readdirSync("/proc").filter((n) => /^\d+$/.test(n)).flatMap((n) => {
      const file = "/proc/" + n + "/cmdline";
      try {
        const args = fs.readFileSync(file, "utf8").split("\0");
        return /^(?:.*\/)?java$/.test(args[0] ?? "") ? [args.filter((v) => /^(-X|--add|datomic\.launcher|triplex\.gateway)/.test(v))] : [];
      } catch { return []; }
    });
    assert(stack.managed.writeOptionsAttempt && isWriter(stack.managed.scorecardWriter) && commands.length >= 3);
    if (stack.managed.scorecardWriter === "per-person-ordered" && !stack.managed.scorecardComparison) {
      const { pgdataFixture } = await import("../v01/pgdata-fixture.ts");
      await pgdataFixture(out, process.env.DX_V01_FIXTURE_SOURCE!, stack.prefix, stack.managed.writeOptionsAttempt);
      const secret = read(cred).secret as string;
      assert.match(secret, /^[a-f0-9]{40}$/);
      const host = new URL(stack.writeUrl).hostname;
      const uri = "datomic:sql://{db}?jdbc:postgresql://" + host + ":5432/datomic?user=datomic&password=" + secret;
      const gate = spawnSync("/opt/datomic/bin/run", [path.join(repo, "lab/experiments/EXP-DX1/v01/prep1-mixed-test.clj")], {
        cwd: "/opt/datomic", encoding: "utf8", timeout: 60_000,
        env: { ...process.env, DX_V01_FIXTURE_REPO: repo, WFIX1_URI: uri,
          DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
          DATOMIC_JAVA_OPTS: "-Xms48m -Xmx384m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
          TX2_SUBJECT_SAVE: "1", TX2_SUBJECT_ORDERED_IDS: "1", TX2_SUBJECT_NUMERIC_OWNER: "1",
          TX2_SUBJECT_PREFETCH: "0", TX2_LEAN_NATIVE_QUERY: "1", TX2_LEAN_NATIVE_LOG: "1",
        },
      });
      const log = ((gate.stdout ?? "") + (gate.stderr ?? "")).replaceAll(secret, "[redacted]");
      fs.writeFileSync(path.join(out, "PREP1-MIXED-TEST.log"), log, { flag: "wx" });
      assert.equal(gate.status, 0, "Published PREP1 mixed-ID test failed");
      assert.match(log, /DX_V01_PREP1_MIXED.*:fail 0.*:error 0/);
    }
    const residency = () => {
      const roles: Record<string, { rssBytes: number; threads: number }> = {};
      for (const pid of fs.readdirSync("/proc").filter((n) => /^\d+$/.test(n))) {
        const dir = "/proc/" + pid;
        let args: string[];
        try { args = fs.readFileSync(dir + "/cmdline", "utf8").split("\0"); } catch { continue; }
        if (!/^(?:.*\/)?java$/.test(args[0] ?? "")) continue;
        const role = args.some((v) => v.endsWith("/read-port.clj")) ? "gw-r" :
          args.includes("triplex.gateway.main") ? "gw-w" : args.includes("datomic.launcher") ? "tx" : undefined;
        if (!role) continue;
        assert(!roles[role]);
        const r = readResidentMappings(fs.readFileSync(dir + "/smaps", "utf8"));
        const threads = Number(/^Threads:\s+(\d+)$/m.exec(fs.readFileSync(dir + "/status", "utf8"))?.[1]);
        assert(Number.isSafeInteger(threads) && threads > 0);
        roles[role] = { rssBytes: r.reduce((sum, [, , bytes]) => sum + bytes, 0), threads };
      }
      assert.deepEqual(Object.keys(roles).sort(), ["gw-r", "gw-w", "tx"]);
      return roles;
    };
    if (process.env.DX_V01_MAC_HOLDER === "DX-RD1") {
      // [DX-RD1] Why: prove the prepared-copy admission and entrypoint on real PG17 bytes before the reader ladders.
      const { preparedFixture } = await import("../rd1/prepared-fixture.ts");
      await preparedFixture(out, process.env.DX_V01_FIXTURE_SOURCE!, stack.prefix, stack.managed.writeOptionsAttempt);
    }
    await adoptedToy(out, process.env.DX_V01_FIXTURE_SOURCE!, { write: stack.writeUrl, read: stack.readUrl,
      slot: stack.prefix, attempt: stack.managed.writeOptionsAttempt, gatewaySource: stack.gatewaySourceSha256,
      java: { placement: "owned Mac compact stack", commands }, residency,
      creditMode: parseCredits(stack.managed.scorecardCreditMode),
      realisticToySlot: stack.managed.realisticScorecard ? stack.containers[0].name : undefined }, stack.managed.scorecardWriter,
      stack.managed.scorecardComparison, readStudy);
    if (stack.managed.crossCheck) {
      // [DX-THIN1] Why: replay every toy database from position zero against the captured receipts before release.
      // Rejected: checking after the slot is released, when the stack and its databases are gone.
      const { crossCheck } = await import("../int1/card-crosscheck.ts");
      await crossCheck(out, stack.writeUrl, stack.readUrl);
    }
  } else if (mode === "int1-campaign-proof") {
    assert(Number(rung) === 40);
    process.chdir(repo);
    await (await import("../int1/everything.ts")).localPreflight(out);
  } else if (integrated) {
    process.chdir(repo);
    await import("../int1/trial.ts");
  } else await import("./trial.ts");
} else {
  assert.equal(process.platform, "darwin");
  if (action === "--build") await prepare();
  else if (action === "--bind") bind();
  else if (action === "--remove" && realistic) console.log(manager(["image-remove", "--image-id", read(file).lanes.datomic.imageId]));
  else if (action === "--arm" || action === "--arm-compact") {
    const compact = action === "--arm-compact";
    assert(!compact || integrated);
    assert(
      (mode === "all" || mode === "touched" || integrated) &&
        rung &&
        Number.isSafeInteger(Number(rung)) &&
        out &&
        path.isAbsolute(out) &&
        (scorecard ? fs.statSync(out).isDirectory() && (mode === "int1-adopted-proof" ||
          (mode === "int1-untouched-census" && holder === "DX-THIN1" && (rung === "4096" || rung === "24576"))) :
          !fs.existsSync(out) && (realistic ? mode === "int1-real1" && compact : guestNode && path.isAbsolute(guestNode))),
    );
    const disk = fs.statfsSync(repo, { bigint: true });
    assert(disk.bavail * disk.bsize > (realistic ? 10n : 5n) * 1024n ** 3n);
    const slots = setup(compact);
    const writerSlot = slots[0]!,
      readerSlot = slots[1];
    const exp = holder + "-" + read(cred).nonce;
    // [DX-INT1] Why: keep the realistic toy under the same checked compact mount and holder as the integrated gates.
    // Rejected: borrowing the upstream builder's image tag or reservation.
    const compactOutput = scorecard ? out : realistic && holder === "DX-THIN1" ? path.dirname(out) : undefined;
    try {
      manager(["up", "--slot", writerSlot, "--exp", exp, ...(compactOutput ? ["--scorecard-output", compactOutput] : [])]);
      if (readerSlot) {
        const primary = witness(writerSlot);
        const cfg = read(file);
        cfg.slots.datomic[readerSlot].gatewayOpts += " -Ddxthin.primary=" + primary.address;
        write(file, cfg);
        manager(["up", "--slot", readerSlot, "--exp", exp]);
      }
      bind();
      if (scorecard && process.env.DX_V01_MAC_HELD_PUBLISH === "1") {
        // [DX-INT1] Why: run the held Publish oracle on the merged sender in the existing small reservation.
        // Rejected: starting a second SQL stack or changing the normal scorecard fixture.
        const slot = read(ownerFile(writerSlot)), attempt = read(cred);
        const output = path.join(out, "held-publish");
        fs.mkdirSync(output);
        execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
          "lab/experiments/EXP-DX1/actv-lazy/join/held-gate.ts", output], {
          cwd: repo, stdio: "inherit", timeout: 5 * 60_000,
          env: { ...process.env, DX_ACT1_NATIVE: "1", DATOMIC_URL: slot.endpoint,
            DATOMIC_READ_URLS: slot.endpoint, TRIPLEX_LAB_SLOT_OWNER: ownerFile(writerSlot),
            DX_ACT1_MANAGED_STACK: manifest,
            TX2_WRITE_OPTIONS_ATTEMPT: attempt.writeOptionsAttempt, TRIPLEX_DATOMIC_LAYOUT: "lean",
            TX2_SWEEP_STRICT: "1", TX2_W0_POINT_JOURNAL: "1", TX2_W0_RESTORE_INDEXED_JOURNAL: "1",
            DX_STRICT_RECORD_CLOCKS: "1", DX_SERVER_RECORD_TIME: "1" },
        });
      } else if (scorecard && process.env.DX_V01_MAC_PUBLISH === "1") {
        // [DX-V01] Why: exercise the existing receipt producer on a bounded isolated toy fixture.
        // Rejected: timing a second full seed or reporting the private fixture as the held SCALE1 cut.
        const slot = read(ownerFile(writerSlot));
        const attempt = read(cred);
        const output = path.join(out, "publish");
        fs.mkdirSync(output);
        execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
          "lab/experiments/EXP-DX1/actv-lazy/join/server.ts", "64", output, "--receipt-local"], {
          cwd: repo, stdio: "inherit", timeout: 5 * 60_000,
          env: { ...process.env, DATOMIC_URL: slot.endpoint, TX2_CONFIG_DIR: dir,
            TRIPLEX_LAB_SLOT_OWNER: ownerFile(writerSlot), TX2_WRITE_OPTIONS_ATTEMPT: attempt.writeOptionsAttempt,
            TX2_SWEEP_STRICT: "1", TX2_W0_POINT_JOURNAL: "1", TX2_W0_RESTORE_INDEXED_JOURNAL: "1",
            TRIPLEX_DATOMIC_LAYOUT: "lean", DX_STRICT_RECORD_CLOCKS: "1", DX_SERVER_RECORD_TIME: "1" },
        });
      } else if (realistic) {
        // [DX-REAL1] Why: run the toy client through the port of the pool-owned SQL stack.
        // Rejected: a Mac measurement lease or building a second PostgreSQL stack for the fixture.
        const owner = read(ownerFile(writerSlot));
        assert.equal(owner.holder, holder);
        const port = new URL(owner.endpoint).port;
        execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
          "lab/experiments/EXP-DX1/real1/server.ts", "toy", "--realistic-mix",
          "--out", out, "--port-write", port, "--seconds", rung, "--sweep", "25"], {
          cwd: repo, stdio: "inherit", timeout: 8 * 60_000,
          env: { ...process.env, DX_REAL1_TOY_ADMISSION: "dx-real1-" + read(cred).nonce,
            DX_REAL1_TOY_SLOT: owner.container },
        });
      } else if (scorecard) console.log(manager(["scorecard-fixture", "--slot", writerSlot, "--scorecard-output", out,
        ...(mode === "int1-untouched-census" ? ["--untouched-census", rung] : [])]));
      else execFileSync(
        "colima",
        [
          "ssh",
          "--profile",
          "triplex2",
          "--",
          guestNode,
          "--no-warnings",
          "--experimental-transform-types",
          "--expose-gc",
          "--max-old-space-size=1900",
          run,
          "--guest",
          dir,
          mode,
          rung,
          out,
          String(process.pid),
        ],
        { cwd: repo, stdio: "inherit" },
      );
    } catch (error) {
      const attempt = read(cred);
      for (const slot of slots) {
        if (!fs.existsSync(ownerFile(slot))) continue;
        const owner = read(ownerFile(slot));
        if (
          owner.holder !== holder ||
          owner.experiment !== exp ||
          fs.realpathSync(owner.worktree) !== fs.realpathSync(repo)
        )
          continue;
        try {
          const log = manager(["logs", "--slot", slot, "--tail", "350"]);
          fs.writeFileSync(
            path.join(dir, "failed-" + attempt.nonce + "-" + slot + ".log"),
            log.replaceAll(attempt.secret, "[redacted]"),
            { flag: "wx", mode: 0o600 },
          );
        } catch {}
      }
      throw error;
    } finally {
      for (const slot of slots.slice().reverse())
        if (fs.existsSync(ownerFile(slot))) {
          const o = read(ownerFile(slot));
          if (
            o.holder === holder &&
            o.experiment === exp &&
            fs.realpathSync(o.worktree) === fs.realpathSync(repo)
          )
            if (compact) {
              assert.equal(o.volume, o.container + "-data-" + read(cred).nonce);
              manager(["down", "--slot", slot, "--remove-volume"]);
            } else manager(["down", "--slot", slot, "--note", "Retain the owned SQL attempt"]);
        }
    }
  } else
    throw Error(
      "Use --build DIR, --bind DIR or --arm DIR MODE SIZE NEW_EVIDENCE_DIR GUEST_NODE via the heavy runner",
    );
}
