// [CX-VNSR-R2] Why: independently check the repaired answer identity and loader gate against the exact target. Rejected: accepting the builder's adapted loop-1 probe as the loop-3 review.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { checkImports } from "../../../bench/ns-driver/check-imports.mjs";
import { buildDriver } from "../../../bench/ns-driver/build.mjs";
import { runNS } from "../../../bench/ns-driver/driver.mjs";
import { encode, lineReceiver, REQUEST_CAP, RESPONSE_CAP } from "../../../bench/ns-driver/rpc.mjs";

const target = "76e6efd0";
const output = path.resolve(".cache/verify-nsr-r2", "probes-" + randomUUID());
fs.mkdirSync(output, { recursive: true });
const sha = (v) => createHash("sha256").update(v).digest("hex");
const observations = [];
const record = (kind, data) => {
  observations.push({ kind, ...data });
  console.log(JSON.stringify(observations.at(-1)));
};
const graph = checkImports(path.resolve("lab/bench/ns-driver/driver.mjs"));
const bundle = path.join(output, "bundle");
const manifest = buildDriver(bundle);
const loaded = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `await import(${JSON.stringify(pathToFileURL(path.join(bundle, manifest.entry)).href)});`,
  ],
  { encoding: "utf8" },
);
assert.equal(loaded.status, 0, loaded.stderr);
assert.equal(Object.keys(graph.files).length, 9);
record("current bundle", {
  packageFree: Object.keys(graph.files).every((p) => !p.startsWith("packages/")),
  manifest,
});

const fixtures = path.join(output, "loaders");
fs.mkdirSync(path.join(fixtures, "packages"), { recursive: true });
const marker = path.join(fixtures, "candidate-ran");
const candidate = path.join(fixtures, "packages/candidate.mjs");
fs.writeFileSync(
  candidate,
  `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'fixture executed');`,
);
const entry = path.join(fixtures, "entry.mjs");
const refuseCases = {
  worker: `import { Worker as Launch } from 'node:worker_threads'; new Launch(new URL('./packages/candidate.mjs', import.meta.url));`,
  createRequireAlias: `import { createRequire as getLoader } from 'node:module'; const load = getLoader(import.meta.url); load('./packages/candidate.mjs');`,
  computedDynamicImport: `const file = './packages/' + 'candidate.mjs'; await import(file);`,
  computedMemberCall: `const k = 'constructor'; (() => {})[k]('return 1')();`,
};
for (const [name, source] of Object.entries(refuseCases)) {
  fs.writeFileSync(entry, source);
  assert.throws(() => checkImports(entry, fixtures), /runtime loader|dynamic execution/);
  assert.equal(fs.existsSync(marker), false);
  record("loader refused", { name });
}
// [CX-VNSR-R2] Why: binding-pattern property lookup is also reflective constructor access. Rejected: testing only property access and indexed call spelling.
fs.writeFileSync(
  entry,
  `const { constructor: Compile } = function () {}; const task = Compile(${JSON.stringify("return import(" + JSON.stringify(pathToFileURL(candidate).href) + ")")}); await task();`,
);
let admitted;
try {
  admitted = checkImports(entry, fixtures);
} catch (error) {
  record("destructured constructor refused", { error: error.message });
}
if (admitted) {
  const executed = spawnSync(process.execPath, [entry], { encoding: "utf8" });
  assert.equal(executed.status, 0, executed.stderr);
  assert.equal(fs.readFileSync(marker, "utf8"), "fixture executed");
  assert.deepEqual(Object.keys(admitted.files), ["entry.mjs"]);
  record("F2 remains", {
    reason: "Destructured Function constructor admits a runtime candidate import.",
    admitted,
    candidateExecuted: true,
    fixture: entry,
  });
}

const expectedAnswer = {
  rows: [{ value: "expected", map: { 2: 2, 10: 10 } }],
  note: "fixture",
  array: [1, 2],
};
const expectedBytes =
  '{"array":[1,2],"note":"fixture","rows":[{"map":{"10":10,"2":2},"value":"expected"}]}';
const expectedDigest = sha(expectedBytes);
const canonicalRequest = (v) =>
  v === null || typeof v !== "object"
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? "[" + v.map(canonicalRequest).join(",") + "]"
      : "{" +
        Object.keys(v)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + canonicalRequest(v[k]))
          .join(",") +
        "}";
async function exercise(mutant) {
  const runId = randomUUID();
  const captures = [];
  const counters = new Map();
  const requests = Array.from({ length: 4 }, (_, loopTag) => ({
    subject: "subject-1",
    basis: { epoch: "0", position: "0" },
    shape: { kind: "subgraph", hops: loopTag + 3 },
    route: "fixture",
    loopTag,
    extra: { tenant: "fixture", version: 2 },
  }));
  const trace = [{ atMs: 60, command: { subject: "subject-1", commandId: "command-1" } }];
  const server = net.createServer({ allowHalfOpen: true }, (socket) => {
    socket.on("error", () => {});
    lineReceiver(
      socket,
      REQUEST_CAP,
      (request) => {
        let result;
        const tag = request.params.request?.loopTag;
        if (request.method === "read" || request.method === "pull") {
          const sequence = counters.get(tag) ?? 0;
          counters.set(tag, sequence + 1);
          const changed = mutant && request.method === "read" && tag === 3 && sequence === 1;
          result =
            sequence % 2
              ? {
                  array: [1, 2],
                  note: "fixture",
                  rows: [{ map: { 10: 10, 2: 2 }, value: changed ? "WRONG" : "expected" }],
                }
              : structuredClone(expectedAnswer);
        } else if (request.method === "commit")
          result = {
            commandId: "command-1",
            status: "committed",
            receipt: { position: "1", epoch: "0", txId: "tx-1" },
          };
        else result = { started: true };
        const envelope = { schema: "ns-sut/1", runId, id: request.id, ok: true, result };
        const raw = encode(envelope, RESPONSE_CAP);
        captures.push({ request, result, raw: raw.toString() });
        socket.end(raw);
      },
      () => socket.destroy(),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const endpoint = { host: "127.0.0.1", port: server.address().port };
  const key = randomBytes(32),
    keyFile = path.join(output, runId + ".key");
  fs.writeFileSync(keyFile, key);
  const eventDir = path.join(output, runId);
  let result;
  try {
    result = await runNS({
      offline: true,
      readers: 4,
      answerSampleEvery: 16,
      binding: {
        runId,
        sourceSha256: graph.bundleSha256,
        inputsSha256: sha(JSON.stringify({ requests, trace, mutant })),
        slot: "offline-no-slot",
      },
      endpoints: { readers: endpoint, broker: endpoint, consumer: endpoint },
      keyFile,
      output: eventDir,
      readRequests: requests,
      trace,
      pulls: [{ subject: "subject-1", basis: "1" }],
      sweep: { subjects: ["subject-1"], basis: "1", release: "fixture" },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  let previous = "0".repeat(64),
    events = [];
  for (const file of fs
    .readdirSync(eventDir)
    .filter((p) => /^\d+\.json$/.test(p))
    .sort()) {
    const { hmac, ...body } = JSON.parse(fs.readFileSync(path.join(eventDir, file)));
    assert.equal(body.previous, previous);
    assert.equal(hmac, createHmac("sha256", key).update(JSON.stringify(body)).digest("hex"));
    previous = hmac;
    events.push(...body.events);
  }
  const seal = JSON.parse(fs.readFileSync(path.join(eventDir, "seal.json")));
  assert.equal(seal.head, previous);
  const reads = events.filter((e) => e.kind === "read");
  assert.deepEqual([...new Set(reads.map((e) => e.data.loop))].sort(), [0, 1, 2, 3]);
  assert.equal(events.find((e) => e.kind === "answer-policy").data.encoding, "answer-canonical/1");
  const mismatches = [];
  for (const { data } of reads) {
    assert.deepEqual(data.request, requests[data.loop]);
    assert.equal(data.requestKey, canonicalRequest(requests[data.loop]));
    assert.equal(data.answerEncoding, "answer-canonical/1");
    assert.equal(data.sampled, data.sequence % 16 === 0);
    if (data.sampled) {
      assert.equal(sha(data.answerCanonical), data.answerSha256);
      assert.ok(data.responseBytes);
    }
    const capture = captures.find((c) => sha(c.raw) === data.rawWireSha256);
    assert.ok(capture);
    if (data.answerSha256 !== expectedDigest) mismatches.push(data);
  }
  for (const loop of [0, 1, 2, 3]) {
    const ordinary = reads.filter(
      (e) => e.data.loop === loop && e.data.answerSha256 === expectedDigest,
    );
    assert.ok(ordinary.length >= 2);
    assert.equal(ordinary[0].data.answerSha256, ordinary[1].data.answerSha256);
    assert.notEqual(ordinary[0].data.rawWireSha256, ordinary[1].data.rawWireSha256);
    assert.ok(ordinary.some((e) => e.data.sequence === 0 && e.data.sampled));
  }
  const oracleCheck = () => {
    for (const { data } of reads)
      assert.equal(data.answerSha256, expectedDigest, `oracle mismatch loop ${data.loop}`);
  };
  if (mutant) {
    assert.equal(mismatches.length, 1);
    assert.equal(mismatches[0].loop, 3);
    assert.equal(mismatches[0].sequence, 1);
    assert.equal(mismatches[0].sampled, false);
    assert.equal(mismatches[0].answer, undefined);
    assert.throws(oracleCheck, /oracle mismatch loop 3/);
  } else {
    assert.equal(mismatches.length, 0);
    oracleCheck();
  }
  for (const { data } of events.filter((e) => ["ryow", "p4", "sweep"].includes(e.kind))) {
    assert.equal(data.answerSha256, expectedDigest);
    assert.equal(data.sampled, true);
    assert.equal(data.rpcMethod, "pull");
  }
  fs.writeFileSync(
    path.join(output, runId + "-review-capture.json"),
    JSON.stringify({ captures, result, mismatches }, null, 2),
  );
  record("F1 controls", {
    mutant,
    loops: 4,
    reads: reads.length,
    semanticDigest: expectedDigest,
    mismatches: mismatches.map((d) => ({ loop: d.loop, sequence: d.sequence, sampled: d.sampled })),
    equalAnswersAcrossIds: true,
    allLoopsSampled: true,
    independentOracleRejectsMutation: mutant,
    status: result.status,
    eventDir,
  });
}
await exercise(false);
await exercise(true);
fs.writeFileSync(
  path.join(output, "summary.json"),
  JSON.stringify({ target, observations }, null, 2),
);
console.log("Evidence: " + output);
