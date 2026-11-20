import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkScorecard, writeScorecard } from "./scorecard.mjs";

const sha = (x) => createHash("sha256").update(x).digest("hex");

test("the handoff binds the exact seal, restore, attempt and two replay ledgers", (testCase) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "age1-bundle-test-"));
  testCase.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const attempt = randomUUID();
  const directory = path.join(root, attempt);
  fs.mkdirSync(directory);
  const source = "a".repeat(40), target = 1e9, records = target + 20, t = 39, head = 33, db = "test-scope";
  const binding = { attempt, source, runSpecSha: sha("spec"), target, imageSha: sha("image"), datomicSha: sha("jar"), db };
  const observation = { event: "scorecard-cut", attempt, physicalT: t, logicalHead: head, records, database: db,
    sourceSeed: { "manifest-sha": binding.imageSha } };
  const event = (fields) => "DX_AGE1 " + JSON.stringify({ attempt, ...fields }) + "\n";
  const files = { "binding.json": JSON.stringify(binding), "seal.log": event({ event: "seal-cut", target, t, head, records }),
    "restore-readback.log": event({ event: "restore-readback", t, head }) };
  for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(directory, name), bytes);
  const state = path.join(root, "state.edn"), final = path.join(root, "sealed.json"), card = path.join(root, "aged-scorecard.json");
  fs.writeFileSync(state, "checkpoint");
  fs.writeFileSync(state + ".population.edn", "population");
  const sealed = JSON.stringify({ attempt, source, bindingSha: binding.runSpecSha, target, records, t, head,
    checkpointSha: sha("checkpoint"), seedLedgerSha: sha("population"),
    hashes: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, sha(bytes)])) });
  fs.writeFileSync(final, sealed);
  const call = (value = observation) => writeScorecard(final, sha(sealed), state, card, value);
  assert.throws(() => call({ ...observation, attempt: randomUUID() }));
  assert.throws(() => call({ ...observation, records: records + 1 }));
  assert.throws(() => writeScorecard(final, sha("stale seal"), state, card, observation));
  const first = call();
  assert.equal(first.sha256, sha(fs.readFileSync(card)));
  assert.deepEqual(first, call());
  assert.throws(() => checkScorecard(card, sha("stale handoff")), /digest differs/);
  fs.writeFileSync(state + ".population.edn", "different population");
  assert.throws(call, /digest differs/);
  fs.writeFileSync(state + ".population.edn", "population");
  fs.writeFileSync(path.join(directory, "restore-readback.log"), event({ event: "restore-readback", t: t - 1, head }));
  assert.throws(call, /digest differs/);
});
