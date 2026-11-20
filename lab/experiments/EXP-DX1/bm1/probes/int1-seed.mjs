import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

const [out, access, source, nonce, peopleArg] = process.argv.slice(2);
const people = Number(peopleArg);
const active = people / 50;
assert([1_000, 1_000_000].includes(people));
assert.match(nonce, /^[0-9a-f]{12}$/);
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), source);
const stackBytes = fs.readFileSync(access);
const stack = JSON.parse(stackBytes);
assert.equal(stack.prefix, "tx2-dxbm1-thin-" + nonce);
assert.equal(stack.writeUrl, process.env.DATOMIC_URL);
assert.equal(stack.readUrl, process.env.DATOMIC_READ_URLS);
assert.equal(process.env.DX_INT1_COHORT, "spread");
const importFromProducer = (file) => import(pathToFileURL(path.resolve(file)).href);
const { openComposition } = await importFromProducer("lab/bench/lib/composition.ts");
const { Account } = await importFromProducer("lab/experiments/EXP-DX1/int1/account.ts");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const accessSha256 = sha(stackBytes);
const scope = "bm1-thin-" + nonce + "-" + people;
const binding = sha(JSON.stringify([source, stack.prefix, scope, people, accessSha256]));
fs.mkdirSync(out);
const database = new DatabaseSync(path.join(out, "population.sqlite"));
const composition = await openComposition("reach", "datomic", scope);

try {
  assert.equal(await composition.currentPosition(), 0);
  // [DX-BM1] Why: build the same INT1 roster and verify each durable frame before sealing it.
  // Rejected: measuring a second capacity trial or mistaking precomputed reader fixture rows for a native seed.
  const account = new Account(composition, "thin", binding, 0, people, database, undefined, undefined, undefined, true);
  const started = performance.now();
  let seeded = 0;
  for (const touched of [true, false]) {
    let group = [];
    for (let i = 0; i < people; i++) {
      if (account.isTouched(i) !== touched) continue;
      group.push(i);
      if (group.length < 48) continue;
      await account.seed(group);
      seeded += group.length;
      if (account.head % 1000 === 0) console.log(JSON.stringify({ people, seeded, cut: account.head }));
      group = [];
    }
    if (group.length) {
      await account.seed(group);
      seeded += group.length;
    }
    assert.equal(seeded, touched ? active : people);
  }
  const ingestMs = performance.now() - started;
  const verified = performance.now();
  const cut = Math.ceil(active / 48) + Math.ceil((people - active) / 48);
  const proof = await account.verifySeedFeed(async () => {});
  assert.equal(proof.count, cut);
  assert.equal(proof.facts, people * 8);
  assert.equal(await composition.currentPosition(), cut);
  assert.equal(account.head, cut);
  database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  const summary = { source, slot: stack.prefix, scope, nonce, binding, accessSha256, people, activeCohort: active,
    cut, facts: proof.facts, feed: proof, ingestMs, verifyMs: performance.now() - verified };
  fs.writeFileSync(path.join(out, "seed.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(summary));
} finally {
  database.close();
  await composition.close();
}
