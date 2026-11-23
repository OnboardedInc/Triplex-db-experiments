// @ts-nocheck -- [EXP-CHECKJS] loader and SDK modules are imported by path from this checkout.
// [DX-INT1] Why: a toy copy of the held SCALE1 seed's shape: one pooled database, ten accounts, the SCALE1 generator and
// Snapshot loader, and two loader frames in flight with the first frame committed after the second, as the 100,000-person
// pooled load did across its 87,002 frames. Rejected: a sequential toy (every member position rises, which hid the stop).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const [destination, nonce, url, repo, source, peopleText] = process.argv.slice(2);
const fixtureImport = (file) => import(pathToFileURL(path.join(repo, "lab/experiments/EXP-DX1", file)));
const { source: fixture, populationPins, accounts, width, loaderDepth } = await fixtureImport("scale1/decision/plan.ts");
const { Snapshot } = await fixtureImport("load1/snapshot.ts");
process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
process.env.DX_SERVER_RECORD_TIME = "1";
process.env.DX_STRICT_RECORD_CLOCKS = "1";
process.env.DATOMIC_URL = url;
const { openComposition, runtimeApi } = await import(pathToFileURL(path.join(repo, "lab/bench/lib/composition.ts")))
  .then(async (lib) => ({ ...lib, ...(await import(pathToFileURL(path.join(repo, "lab/bench/lib/triplex.ts")))) }));
const { DatomicClient } = await import(pathToFileURL(path.join(repo, "packages/datomic/dist/index.js")));
const people = Number(peopleText);
assert(Number.isSafeInteger(people) && people >= 2 && people <= 32 && loaderDepth === 2);
const { digest: population, factsPerAccount } = populationPins(people, "pooled");
const name = "dx-scale-decision-" + nonce + "-0";
const input = fixture(people, accounts, population);
const client = new DatomicClient(url, 35000);
const comp = await openComposition("reach", "datomic", name);
const order = [];
try {
  const snapshot = await Snapshot.open(comp, input, input.groups, width, path.join(destination, "fixture.sqlite"));
  try {
    await snapshot.drain(loaderDepth, {
      // The first frame waits until the second has committed, so account 0's later people get the earlier position.
      beforeSend: async (first) => { if (first === 0) await sleep(4000); },
      afterWrite: (first) => order.push(first),
    });
    const proof = await snapshot.verify(true, undefined, "feed");
    assert.equal(proof.facts, factsPerAccount * accounts.length);
    assert.equal(proof.cursor, input.groups);
    assert.equal(proof.observed + 1, proof.cut);
    const scope = runtimeApi.DatabaseScope.test(name);
    const opened = await client.create(scope, "lean", true, 35000);
    assert(!opened.created && opened.strictRecordClocks);
    const bytes = JSON.stringify({
      source, slot: "launch-fix-fixture", nonce, layout: "pooled", people, population, facts: proof.facts,
      verification: "full-command-and-feed-with-pinned-member-probes",
      scopes: [{ name, db: opened.db, cut: proof.cut, seedCut: proof.cut, accounts }],
      proofs: [{ ...proof, sourceSeal: snapshot.source }],
    }) + "\n";
    fs.writeFileSync(path.join(destination, "fixture.json"), bytes, { flag: "wx", flush: true });
    console.log("DX_INT1_SEED " + JSON.stringify({ db: opened.db, cut: proof.cut, order,
      sha: createHash("sha256").update(bytes).digest("hex") }));
  } finally {
    snapshot.close();
  }
} finally {
  await comp.close();
  client.close();
}
