// @ts-nocheck -- [EXP-CHECKJS] negative unit fixtures intentionally vary dynamic receipt fields.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkScorecard, peerCommand, writeScorecard } from "./scorecard.mjs";

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
    journal: "classic-k", sourceSeed: { "manifest-sha": binding.imageSha } };
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
  assert.throws(() => call({ ...observation, journal: "recorded-predecessor-k" }));
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

// [DX-INT1] Why: the fresh peer must resolve the transactor's container name, so it runs on the stack's network.
test("the fresh peer runs the same java command on the stack network, read-only, or on the host when unset", () => {
  const args = ["-Xmx1g", "-cp", "x", "clojure.main", "-m", "triplex.age.scorecard"];
  assert.deepEqual(peerCommand("/jdk/bin/java", args, "/tmp/s/state.edn", "a", {}), ["/jdk/bin/java", args]);
  const env = { AGE_PEER_DOCKER_NETWORK: "tx2-dxscale1-v01-0123456789ab-net", AGE_PEER_DOCKER_IMAGE: "sha256:" + "a".repeat(64),
    AGE_DATOMIC_HOME: "/opt/datomic-pro", DATOMIC_URI_TEMPLATE: "datomic:sql://{db}?jdbc:postgresql://10.0.0.2:5432/datomic" };
  const [command, argv] = peerCommand("/jdk/bin/java", args, "/tmp/s/state.edn", "a", env);
  assert.equal(command, "docker");
  assert.deepEqual(argv.slice(argv.indexOf("--entrypoint")), ["--entrypoint", "java", env.AGE_PEER_DOCKER_IMAGE, ...args]);
  assert(argv.includes("--network") && argv[argv.indexOf("--network") + 1] === env.AGE_PEER_DOCKER_NETWORK);
  const mounts = argv.filter((a, i) => argv[i - 1] === "--mount");
  assert(mounts.length === 5 && mounts.every((m) => m.endsWith(",readonly")));
  assert(mounts.includes("type=bind,source=/tmp/s,target=/tmp/s,readonly"));
  assert(argv.includes("DATOMIC_URI_TEMPLATE=" + env.DATOMIC_URI_TEMPLATE) && argv.includes("AGE_ATTEMPT=a"));
  assert.throws(() => peerCommand("j", args, "/tmp/s/x", "a", { AGE_PEER_DOCKER_NETWORK: "n" }), /or neither/);
});
