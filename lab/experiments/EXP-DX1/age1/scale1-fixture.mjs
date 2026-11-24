// @ts-nocheck -- [EXP-CHECKJS] loader and SDK modules come from runtime-pinned Git archives.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [loader, destination, nonce, url, repo, source] = process.argv.slice(2);
const fixtureRoot = path.join(loader, "lab/experiments/EXP-DX1");
const fixtureImport = (file) => import(pathToFileURL(path.join(fixtureRoot, file)));
const { source: fixture, populationPins, accounts, width, loaderDepth } =
  await fixtureImport("scale1/decision/plan.ts");
const { Snapshot } = await fixtureImport("load1/snapshot.ts");
process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
process.env.DX_SERVER_RECORD_TIME = "1";
process.env.DX_STRICT_RECORD_CLOCKS = "1";
process.env.DATOMIC_URL = url;
const { openComposition, runtimeApi } = await import(pathToFileURL(path.join(repo, "lab/bench/lib/composition.ts")))
  .then(async (lib) => ({ ...lib, ...(await import(pathToFileURL(path.join(repo, "lab/bench/lib/triplex.ts")))) }));
const { DatomicClient } = await import(pathToFileURL(path.join(repo, "packages/datomic/dist/index.js")));
const w0 = path.join(repo, "packages/w0/dist");
const w0Build = Object.fromEntries(fs.readdirSync(w0, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const file = path.join(entry.parentPath, entry.name);
    return [path.relative(w0, file), createHash("sha256").update(fs.readFileSync(file)).digest("hex")];
  }));
const people = 8;
const { digest: population, factsPerAccount } = populationPins(people, "pooled");
const name = "dx-scale-decision-" + nonce + "-0";
const input = fixture(people, accounts, population);
const client = new DatomicClient(url, 35000);
// [DX-ACT8] DX_ACT8_PROTECT=<attribute> (default unset): the database is declared protected for that attribute before
// anything is saved into it, so a gate can run a removal on request on the held toy. Unset: as before.
if (process.env.DX_ACT8_PROTECT) {
  const made = await client.create(runtimeApi.DatabaseScope.test(name), "lean", true, 35000);
  assert(made.created && made.strictRecordClocks);
  await client.declareProtection(made.db, [process.env.DX_ACT8_PROTECT], false);
  assert((await client.erasureFrontier(made.db)).protected);
}
const comp = await openComposition("reach", "datomic", name);
try {
  // [DX-AGE1] Why: use SCALE1's pinned source generator and Snapshot loader unchanged.
  // Rejected: a native seed that only looks like the bulk-import destination.
  const snapshot = await Snapshot.open(comp, input, input.groups, width, path.join(destination, "fixture.sqlite"));
  try {
    await snapshot.drain(loaderDepth);
    const proof = await snapshot.verify(true, undefined, "feed");
    assert.equal(proof.facts, factsPerAccount * accounts.length);
    assert.equal(proof.cursor, input.groups);
    assert.equal(proof.observed + 1, proof.cut);
    const scope = runtimeApi.DatabaseScope.test(name);
    const opened = await client.create(scope, "lean", true, 35000);
    assert(!opened.created && opened.strictRecordClocks);
    const bytes = JSON.stringify({
      source, slot: "fresh-fixture", nonce, layout: "pooled", people, population, facts: proof.facts,
      verification: "full-command-and-feed-with-pinned-member-probes",
      scopes: [{ name, db: opened.db, cut: proof.cut, seedCut: proof.cut, accounts }],
      proofs: [{ ...proof, sourceSeal: snapshot.source }],
    }) + "\n";
    fs.writeFileSync(path.join(destination, "fixture.json"), bytes, { flag: "wx", flush: true });
    console.log(JSON.stringify({ db: opened.db, cut: proof.cut, sha: createHash("sha256").update(bytes).digest("hex"), w0Build }));
  } finally {
    snapshot.close();
  }
} finally {
  await comp.close();
  client.close();
}
