import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { checkSeedFrames, runHeld, seedPositions } from "../actv-lazy/join/held-campaign.ts";
import { FirstOfferReached } from "../ha1/first-offer.ts";
import { openColdWriter } from "../jvm1/cold-open.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { census, checkScopeOpen, installsSince } from "../real1/held-census.ts";
import { now } from "../scale1/decision/observer.ts";
import { field, task, writeTape } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Sender } from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, hex, readScaleSeal } from "../v01/adopt.ts";
import { checkSavedIdentity, feeder, jsonFile } from "../v01/adopted.ts";
import { stackOptions } from "../v01/profile.ts";

// [DX-INT1] Why: reproduce on the Mac, at toy size, the pre-offer stops that ended four full-size launches on bench 3,
// against a stopped copy of the same shape (held, pooled, two loader frames committed out of member order, sealed by
// the SCALE1 seed source 97852735), then run the repaired pre-offer code from this checkout to its first offer.
// Rejected: running the bare-metal launchers here (they require Linux, root, the server lock and full-size seals).
// Usage (one ordinary heavy token per phase):
//   node lab/bin/heavy.mjs --label DX-THIN1-launchfix -- node --no-warnings --experimental-transform-types \
//     lab/experiments/EXP-DX1/int1/launch-fixes.ts held|realistic|cold|publish NEW_OR_EXISTING_EVIDENCE_DIR
// DX_DATOMIC_IMAGE_RECEIPT names a DX-THIN1 Java 21 image receipt. Clocks are diagnostic.
const [phase, outArg] = process.argv.slice(2);
assert(["held", "realistic", "cold", "publish"].includes(phase ?? "") && outArg && path.isAbsolute(outArg));
assert.equal(process.platform, "darwin");
assert(process.env.DX_DATOMIC_IMAGE_RECEIPT);
const repo = path.resolve(import.meta.dirname, "../../../..");
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8", env: dockerEnv }).trim();
// The lab VM only; the census helpers call docker with this process's environment.
process.env.DOCKER_HOST = "unix://" + process.env.HOME + "/.colima/triplex2/docker.sock";
const dockerEnv = { ...process.env };
const seedSource = "97852735506d9f04d7a2195ee11bc0535b7a2493";
const heldVolume = "tx2-dxthin1-lf-held-a";
const out = outArg;
fs.mkdirSync(out, { recursive: true });
const free = fs.statfsSync(out);
assert(free.bavail * free.bsize >= 10 * 1024 ** 3, "Under 10 GiB free on the Mac");
const log = (label: string, data: unknown) => {
  console.log("DX_INT1_LAUNCH_FIX " + label + " " + JSON.stringify(data));
  fs.appendFileSync(path.join(out, "proof.ndjson"), JSON.stringify({ phase, label, at: Date.now(), data }) + "\n");
};
const source = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();

function gatewayTree(commit: string) {
  const dir = path.join(repo, "runs/DX-THIN1/launch-fixes/trees", commit);
  if (!fs.existsSync(path.join(dir, "gateway/codec-spec.json"))) {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync("sh", ["-c", `git -C "$1" archive "$2" -- packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$3"`,
      "sh", repo, commit, dir]);
    fs.renameSync(path.join(dir, "packages/datomic/gateway"), path.join(dir, "gateway"));
    fs.copyFileSync(path.join(dir, "packages/datomic/src/codec-spec.json"), path.join(dir, "gateway/codec-spec.json"));
  }
  return path.join(dir, "gateway");
}
function up(prefix: string, ports: [number, number], env: Record<string, string>, extra: string[] = []) {
  execFileSync("bash", ["lab/experiments/EXP-DX1/stack/up.sh", prefix, "--port-write", String(ports[0]), "--port-read", String(ports[1]),
    "--cpus-tx", "4,5", "--cpus-pg", "3", "--cpus-gw-write", "5,6", "--cpus-gw-read", "7",
    "--pg-memory", "384m", "--tx-memory", "1200m", "--tx-java-opts", "-Xms128m -Xmx768m", "--gw-memory", "900m",
    "--object-cache-max", "64m", "--memory-index-threshold", "8m", "--memory-index-max", "32m", ...extra], {
    cwd: repo, stdio: "inherit",
    env: { ...dockerEnv, DX_STACK_EVIDENCE: path.join(out, "engines"), DX_INT1_GATEWAYS: "demand", DX_JAVA: "21", ...env },
  });
  return { write: "http://127.0.0.1:" + ports[0], read: "http://127.0.0.1:" + ports[1] };
}
function down(prefix: string) {
  execFileSync("bash", ["lab/experiments/EXP-DX1/stack/down.sh", prefix, "--volumes"], { cwd: repo, stdio: "inherit", env: dockerEnv });
}
function seed() {
  const file = path.join(out, "..", "held", "fixture", "fixture.json");
  return readScaleSeal(file, hex(fs.readFileSync(file)), true);
}
// The ordered writer's gateway settings as the server runners pass them, without the bare-metal routing switches.
function orderedWriter(attempt: string) {
  const { DX_PREP1_SERVER, DX_V01_ADOPTED_STACK, DX_PREP1_SUBJECT, ...rest } = stackOptions("per-person-ordered", attempt);
  return { ...rest, TX2_SUBJECT_SAVE: DX_PREP1_SUBJECT } as Record<string, string>;
}

if (phase === "held") {
  // The SCALE1 seed writer's settings at 97852735 (DX-SCALE1 arm-d7-wfix-pool-seed writer-expectation.json).
  const nonce = randomUUID(), prefix = "tx2-dxthin1-lf-seed";
  const expectation = JSON.parse(fs.readFileSync(path.join(process.env.HOME!,
    "Claude/Projects/triplex-db-2/evidence/DX-SCALE1/arm-d7-wfix-pool-seed/summaries/writer-expectation.json"), "utf8"));
  assert.equal(expectation.source, seedSource);
  const urls = up(prefix, [8591, 8592], {
    DX_GROUP_COMMIT: "0", DX_GROUP_QUEUE_CLOCK: "1", DX_LIVE_PRIORITY: "0", DX_FIELD_COALESCE: "0", DX_W1_EXTRA: "1",
    DX_SMALL_ROWS: "0", DX_GROUP_REUSE_PREPARED: "0", DX_PREDECESSOR_LOOKUP: "0", DX_W1_LEDGER: "0", DX_W1_PACKED_JOURNAL: "0",
    DX_W1_FAST_REPLY: "0", DX_GROUP_MAX_MEMBERS: "8", DX_COMMIT_HINTS: "false", DX_WRITE_OPTIONS_ATTEMPT: nonce,
  }, ["--gateway-src", gatewayTree(seedSource)]);
  try {
    const fixture = path.join(out, "fixture");
    fs.mkdirSync(fixture);
    execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
      "lab/experiments/EXP-DX1/int1/launch-fixes-seed.mjs", fixture, nonce, urls.write, repo, seedSource, "32"],
    { cwd: repo, stdio: "inherit", timeout: 8 * 60_000 });
    const held = seed();
    const client = new DatomicClient(urls.write, 35000);
    try {
      const options = await client.request<any>("GET", "/v1/db/" + held.scope.db + "/write-options");
      for (const [key, value] of Object.entries(expectation.options)) assert.deepEqual(options.options[key], value, key);
      log("seed-writer", { gatewaySourceHash: options.gatewaySourceHash, expectedGatewaySourceHash: expectation.gatewaySourceHash,
        options: options.options, subjectFunction: options.subjectFunction ?? null, position: options.position });
    } finally { client.close(); }
    log("seed", { people: held.image.people, facts: held.image.facts, cut: held.scope.cut, db: held.scope.db });
    for (const role of ["gw-r", "gw-w", "tx"]) docker("stop", "-t", "30", prefix + "-" + role);
    docker("stop", "-t", "60", prefix + "-pg");
    const control = docker("run", "--rm", "--network", "none", "--user", "70:70", "-v", prefix + "-pg-data:/d:ro",
      "--entrypoint", "pg_controldata", "postgres:17-alpine", "/d");
    assert.match(control, /^Database cluster state:\s+shut down\s*$/m);
    docker("volume", "create", heldVolume);
    docker("run", "--rm", "--network", "none", "-v", prefix + "-pg-data:/from:ro", "-v", heldVolume + ":/to",
      "--entrypoint", "/bin/sh", "postgres:17-alpine", "-ceu", "cp -a /from/. /to/");
    log("held", { volume: heldVolume, cluster: "shut down", sealedBy: seedSource });
  } finally {
    down(prefix);
  }
} else if (phase === "realistic") {
  // real1/server.ts extend at this checkout: census of the held copy, scope open, census, named installs.
  const held = seed(), prefix = "tx2-dxthin1-lf-real1";
  const urls = up(prefix, [8593, 8594], { DX_GROUP_COMMIT: "1", DX_QUIET_LOGS: "1" }, ["--clone-seed", heldVolume]);
  try {
    const sealed = census(prefix, held.scope.db);
    assert.equal(sealed.head, held.scope.cut);
    const reader = new DatomicClient(urls.read, 35000);
    try { await checkAdoptedPeer(reader, held, held.scope.cut); } finally { reader.close(); }
    const opened = census(prefix, held.scope.db);
    // The check at 8597e3ef7 compared this second count with the sealed count.
    log("stop-at-8597e3ef7", { sealedRecords: sealed.nativeRecords, afterOpenRecords: opened.nativeRecords,
      extra: opened.nativeRecords - sealed.nativeRecords, wouldPass: opened.nativeRecords === sealed.nativeRecords });
    const listed = installsSince(prefix, held.scope.db, sealed.nativeT);
    const result = checkScopeOpen(sealed, opened, listed);
    jsonFile(path.join(out, "native-scope-open.json"), result);
    log("repaired", { records: result.records, added: result.added, retracted: result.retracted, transactions: result.transactions,
      idents: result.idents, attributes: Object.fromEntries([...new Set(listed.map((r) => r.attribute))]
        .map((a) => [a, listed.filter((r) => r.attribute === a).map((r) => (r.added ? "+" : "-")).join("")])) });
    log("first-offer", { reached: "before the first extension write (real1 load)", head: opened.head });
  } finally {
    down(prefix);
  }
} else if (phase === "cold") {
  // jvm1/cold-server.ts at this checkout, on a stack started from the held copy with the ordered writer's settings.
  const held = seed(), prefix = "tx2-dxthin1-lf-cold", attempt = randomUUID();
  const urls = up(prefix, [8595, 8596], orderedWriter(attempt), ["--clone-seed", heldVolume]);
  const writer = new DatomicClient(urls.write, 35000), reader = new DatomicClient(urls.read, 35000);
  try {
    const before = await writer.request<any>("GET", "/v1/db/" + held.scope.db + "/write-options");
    log("stop-at-8ab832093", { subjectSave: before.subjectSave, subjectFunction: before.subjectFunction ?? null,
      wouldPass: /^:triplex\.subject\/v-[a-f0-9]{24}$/.test(before.subjectFunction ?? "") });
    const ready = now();
    const { options, scopeOpen } = await openColdWriter(writer, held.scope, attempt);
    log("repaired", { ...scopeOpen, openMs: scopeOpen.openEnd - scopeOpen.openStart, diagnostic: true });
    // The runner's own senders and tape, cut to the first three offers.
    const tape = writeTape(held.image.people as Parameters<typeof writeTape>[0], 235, 0, false, 2).slice(0, 3);
    const senders: Sender[] = held.scope.accounts.map((account) => {
      const subjects = new Map(tape.filter((e) => e.account === account).map((e) => [task(account, e.subject), e.subject]));
      return { client: writer, scope: held.scope, rows: new Map(), loadPredecessor: async (entity) => {
        const rows = await writer.rows(held.scope.db, { entityIds: [entity], basis: { recordedPosition: held.scope.cut, validAt: SEED_VALID_FROM } });
        return [0, 1, 2].map((n) => {
          const fields = rows.filter((row) => row.entity_id === entity && row.attribute === field(n));
          assert.equal(fields.length, 1);
          assert.equal(fields[0]!.value_string, fieldValue(subjects.get(entity)!, 0, n, 0).value);
          return fields[0]!;
        });
      } };
    });
    const start = now() + 200;
    const writes = await play(senders, tape, start, attempt, true, true, creditModeSelection("rolling6"), undefined, false,
      { ramp: false, stopped: () => false });
    await resolveUncertain(senders, writes.unresolved);
    const last = await writer.begin(held.scope.db);
    await writer.release(held.scope.db, last.handle);
    const journal = await feeder(reader, held.scope.db, held.scope.cut, Date.now() + 60_000, () => last.position, true);
    const byPosition = new Map(journal.map((row) => [row.position, row]));
    const durable = writes.rows.filter((row) => row.receipt);
    assert.equal(durable.length, tape.length);
    for (const row of durable) checkSavedIdentity(row, byPosition.get(row.receipt!.p)!, "per-person-ordered", options.subjectFunction);
    log("first-offer", { offered: tape.length, acknowledged: durable.length, firstAckAfterReadyMs: Math.min(...durable.map((r) => r.end!)) - ready,
      positions: durable.map((r) => r.receipt!.p), diagnostic: true });
  } finally {
    writer.close(); reader.close();
    down(prefix);
  }
} else {
  // actv-lazy/join/held-campaign.ts at this checkout: adopted-peer checks, writer options, seed positions, first Publish.
  const held = seed(), prefix = "tx2-dxthin1-lf-publish", attempt = randomUUID();
  const urls = up(prefix, [8597, 8598], orderedWriter(attempt), ["--clone-seed", heldVolume]);
  const reader = new DatomicClient(urls.read, 35000), writer = new DatomicClient(urls.write, 35000);
  try {
    await checkAdoptedPeer(reader, held, held.scope.cut);
    await checkAdoptedPeer(writer, held, held.scope.cut);
    let old: string | undefined;
    try {
      // The assertion at 8ab832093, line 196, applied to the same positions.
      const positions = await seedPositions(reader, held);
      const monotone = positions.every((p, i) => i === 0 || p >= positions[i - 1]!);
      if (!monotone) old = "positions fall in member order at " + positions.findIndex((p, i) => i > 0 && p < positions[i - 1]!);
      log("stop-at-8ab832093", { positions, monotone, wouldPass: monotone });
      log("repaired", checkSeedFrames(positions, held.scope.cut));
    } catch (error) {
      log("repaired-failed", { error: String(error) });
      throw error;
    }
    assert(old, "The toy copy did not reproduce the out-of-order frames");
    // The held runner itself, not in diagnostic mode, stopped by the dry-run hook just before its first Publish offer.
    const health = await writer.request<{ gatewaySourceHash: string }>("GET", "/health");
    Object.assign(process.env, { DATOMIC_URL: urls.write, DATOMIC_READ_URLS: urls.read, TRIPLEX_DATOMIC_LAYOUT: "lean",
      TX2_SWEEP_STRICT: "1", TX2_W0_POINT_JOURNAL: "1", TX2_W0_RESTORE_INDEXED_JOURNAL: "1", DX_STRICT_RECORD_CLOCKS: "1",
      DX_SERVER_RECORD_TIME: "1", DX_DRY_RUN_FIRST_OFFER: "1" });
    const runner = path.join(out, "held-runner");
    fs.mkdirSync(runner);
    let reached = false;
    try {
      await runHeld(runner, source, { slot: prefix, attempt, write: urls.write, read: urls.read,
        gatewaySource: health.gatewaySourceHash, java: { origin: "launch-fix toy on the Mac" } }, held);
    } catch (error) {
      if (!(error instanceof FirstOfferReached)) throw error;
      reached = true;
    } finally {
      delete process.env.DX_DRY_RUN_FIRST_OFFER;
    }
    assert(reached, "The held runner did not reach its first offer");
    const input = JSON.parse(fs.readFileSync(path.join(runner, "held-input.json"), "utf8"));
    log("first-offer", { reached: "actv-lazy/join/held-campaign.ts runHeld, before its first Publish offer",
      positions: input.positions, writer: { attempt: input.options.attempt === attempt, subjectFunction: input.options.subjectFunction } });
  } finally {
    reader.close(); writer.close();
    down(prefix);
  }
}
