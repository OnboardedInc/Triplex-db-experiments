// [DX-ACT7] The Mac miniature of the 1 billion settlement run (driven by act7/miniature.sh, which owns the stack and the
// aging). `seed OUT WRITE_URL`: the SCALE1 toy fixture through this branch's gateway (8 subjects in each of ten accounts).
// `run OUT WRITE_URL READ_URL`: build the toy handoff bundle from AGE1's ledgers, cross-check the TypeScript replay
// against AGE1's own `expected-adopted` for every adopted subject, then run the held runner on the aged copy with the
// environment's options (DX_ACT7_ADOPT=0 runs it as before, without the aged adoption). Timings are diagnostic.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { openScaleSeal } from "../../v01/adopt.ts";
import { seedToy, runHeld } from "../join/held-campaign.ts";
import { agedFields, openAgedBundle } from "./aged.ts";

const [mode, out, write, read] = process.argv.slice(2);
assert(out && write);
const hex = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const source = fs.readFileSync(path.join(out, "source"), "utf8").trim();
const fixtureDir = path.join(out, "fixture");
if (mode === "seed") {
  fs.mkdirSync(fixtureDir);
  seedToy(fixtureDir, randomUUID(), write, source);
  const file = path.join(fixtureDir, "fixture.json");
  const seed = openScaleSeal(file, hex(fs.readFileSync(file)), true);
  fs.writeFileSync(path.join(out, "seed.json"), JSON.stringify({ db: seed.scope.db, seedCut: seed.scope.cut,
    people: seed.image.people }) + "\n");
  console.log("ACT7 SEED " + JSON.stringify({ db: seed.scope.db, seedCut: seed.scope.cut, people: seed.image.people }));
} else {
  assert.equal(mode, "run");
  assert(read);
  const file = path.join(fixtureDir, "fixture.json");
  const imagePin = hex(fs.readFileSync(file));
  const seed = openScaleSeal(file, imagePin, true);
  const aging = path.join(out, "aging");
  const aged = JSON.parse(fs.readFileSync(path.join(aging, "aged.json"), "utf8"));
  const checkpoint = fs.readFileSync(path.join(aging, "checkpoint.edn")),
    population = fs.readFileSync(path.join(aging, "population.edn"));
  // The toy handoff, in the 1 billion bundle's shape (version string of its own; act7/aged.ts admits it as a toy).
  const bundle = {
    version: "triplex-act7-toy-aged/1", scope: seed.key, database: seed.scope.db, layout: "lean-v3-strict-solo-k",
    sourceSeed: { "manifest-sha": imagePin }, nativeId: "toy", physicalT: aged.physicalT, records: aged.datoms,
    logicalHead: aged.seedHead + aged.saves,
    clocks: { seedHead: aged.seedHead, tapeSaves: aged.saves, active: aged.active, lastOperation: aged.lastOperation,
      lastTransaction: aged.lastTransaction, lastRecordedAt: aged.lastRecordedAt },
    checkpointSha: hex(checkpoint), populationSha: hex(population),
    replayLedgerGzip: gzipSync(Buffer.from(JSON.stringify([checkpoint.toString("base64"), population.toString("base64")])))
      .toString("base64"),
  };
  const bundleFile = path.join(out, "toy-handoff.json");
  if (!fs.existsSync(bundleFile)) fs.writeFileSync(bundleFile, JSON.stringify(bundle, null, 2) + "\n");
  const pin = hex(fs.readFileSync(bundleFile));
  const seal = openAgedBundle(bundleFile, pin, { imagePin, scopeKey: seed.key, db: seed.scope.db, seedCut: seed.scope.cut,
    people: seed.image.people, toy: true });
  // The replay against AGE1's own expected-adopted, every adopted subject, every field.
  let compared = 0, agedRows = 0;
  for (const e of aged.expected as { k: number; account: number; local: number;
    rows: { id: string; attribute: string; value_string: string; recorded_position: number }[] }[]) {
    assert.equal(seal.index.get(e.account + "/" + e.local), e.k);
    const mine = agedFields(seal.replay, e.k);
    for (const r of e.rows) {
      const j = Number(r.attribute.split("-").at(-1));
      const m = mine?.[j];
      if (r.recorded_position > aged.seedHead) {
        assert.deepEqual([m?.id, m?.value, m?.position], [r.id, r.value_string, r.recorded_position], "replay differs at " + e.k + "/" + j);
        agedRows++;
      } else assert.equal(m, undefined, "replay names an aged row AGE1 does not at " + e.k + "/" + j);
      compared++;
    }
  }
  console.log("ACT7 REPLAY " + JSON.stringify({ subjects: aged.expected.length, rows: compared, agedRows, probes: seal.replay.probes.size }));
  fs.writeFileSync(path.join(out, "replay-check.json"), JSON.stringify({ subjects: aged.expected.length, rows: compared, agedRows,
    probes: [...seal.replay.probes.entries()].map(([n, p]) => ({ n, owner: p.owner, width: p.width })) }, null, 2) + "\n");
  const adopt = process.env.DX_ACT7_ADOPT !== "0";
  const health = (await (await fetch(new URL("/health", write))).json()) as { gatewaySourceHash: string };
  process.env.DATOMIC_URL = write;
  process.env.DATOMIC_READ_URLS = read;
  const run = path.join(out, process.env.DX_ACT7_RUN_NAME ?? "run");
  fs.mkdirSync(run);
  const peer = { slot: "act7-miniature", attempt: randomUUID(), write, read, gatewaySource: health.gatewaySourceHash,
    java: { origin: "managed-laptop" } };
  try {
    await runHeld(run, source, peer as never, (adopt ? { ...seed, aged: seal } : seed) as never, true);
    console.log("ACT7 RUN PASS");
  } catch (e) {
    console.log("ACT7 RUN FAIL " + String((e as Error).message ?? e).slice(0, 600));
    process.exitCode = 1;
  }
}
