// [CX-VNSR] Why: execute independent negative controls against the unmodified evaluator. Rejected: changing the code being reviewed to make tests pass.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { checkImports } from "../../bench/ns-driver/check-imports.mjs";
import { buildDriver } from "../../bench/ns-driver/build.mjs";
import { runNS, readerLevel } from "../../bench/ns-driver/driver.mjs";
import { encode, lineReceiver, REQUEST_CAP, RESPONSE_CAP } from "../../bench/ns-driver/rpc.mjs";
import { sameFeedClock, publicationLagMs } from "../../bench/ns-driver/feed.mjs";

const root = process.cwd();
const output = path.resolve(
  process.env.VNSR_EVIDENCE ?? ".cache/verify-nsr",
  `probe-${randomUUID()}`,
);
fs.mkdirSync(output, { recursive: true });
const findings = [];
const record = (name, data) => {
  findings.push({ name, ...data });
  console.log(JSON.stringify(findings.at(-1)));
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const graph = checkImports(path.join(root, "lab/bench/ns-driver/driver.mjs"));
const bundle = path.join(output, "bundle");
buildDriver(bundle);
const load = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `import(${JSON.stringify(path.join(bundle, "lab/bench/ns-driver/driver.mjs"))}).then(() => console.log('loaded'))`,
  ],
  { encoding: "utf8" },
);
assert.equal(load.status, 0, load.stderr);
record("current bundle", {
  files: graph.files,
  bundleSha256: graph.bundleSha256,
  copiedBundleLoads: true,
});

for (const kind of ["worker", "aliased-require"]) {
  const fixture = path.join(output, kind);
  fs.mkdirSync(path.join(fixture, "packages"), { recursive: true });
  const marker = path.join(fixture, "candidate-ran");
  const candidate = path.join(fixture, "packages/candidate.cjs");
  fs.writeFileSync(
    candidate,
    `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'candidate executed');`,
  );
  const code =
    kind === "worker"
      ? `import { Worker } from 'node:worker_threads'; new Worker(new URL('./packages/candidate.cjs', import.meta.url));`
      : `import { createRequire as cr } from 'node:module'; const load = cr(import.meta.url); load('./packages/candidate.cjs');`;
  const entry = path.join(fixture, "entry.mjs");
  fs.writeFileSync(entry, code);
  assert.throws(() => checkImports(entry, fixture), /runtime loader|dynamic execution/);
  assert.equal(fs.existsSync(marker), false);
  record("runtime loader refused", { kind, candidateExecuted: false });
}
const control = path.join(output, "control.mjs");
fs.mkdirSync(path.join(output, "packages"));
for (const extension of ["mjs", "cjs", "ts"])
  fs.writeFileSync(path.join(output, `packages/candidate.${extension}`), "export {};");
for (const code of [
  "import './packages/candidate.mjs';",
  "export * from './packages/candidate.mjs';",
  "import(process.argv[2]);",
  "const x = require('./packages/candidate.cjs');",
  "const load = require; load('./packages/candidate.cjs');",
  "import * as workers from 'node:worker_threads'; new workers.Worker('./packages/candidate.cjs');",
  "import { fork as launch } from 'node:child_process'; launch('./packages/candidate.cjs');",
  "import vm from 'node:vm'; vm.runInThisContext('1');",
  "const load = process.getBuiltinModule('module').createRequire(import.meta.url);",
  "import load = require('./packages/candidate.cjs');",
  "import type { X } from './packages/candidate.ts';",
]) {
  const file =
    code.includes("import type") || code.includes("import load =")
      ? control.replace(".mjs", ".ts")
      : control;
  fs.writeFileSync(file, code);
  assert.throws(
    () => checkImports(file, output),
    /candidate\/outside|dynamic execution\/import|runtime loader/,
  );
}
record("direct import controls", { rejected: 11 });

const domain = {
  primitive: "CLOCK_MONOTONIC",
  bootId: "12345678-1234-1234-1234-123456789abc",
  timeNs: "4026531834",
};
assert.equal(
  sameFeedClock({ ...domain, hostname: "box-a" }, { ...domain, hostname: "box-b" }),
  true,
);
assert.equal(
  sameFeedClock(domain, { ...domain, bootId: "99999999-1234-1234-1234-123456789abc" }),
  false,
);
assert.equal(sameFeedClock(domain, { ...domain, timeNs: "4026531835" }), false);
const position = { source: "s", stream: "s", epoch: "0", position: "1" };
const publication = {
  ...position,
  domain,
  atNs: "1000000",
  publicationId: "tx-1",
  recordId: "a".repeat(64),
};
assert.throws(
  () =>
    publicationLagMs(
      publication,
      {
        ...position,
        atNs: "2000000",
        domain: { ...domain, bootId: "99999999-1234-1234-1234-123456789abc" },
      },
      publication,
    ),
  /clock origin/,
);
record("clock equality controls", {
  hostnameIgnored: true,
  differentBootRefused: true,
  differentNamespaceRefused: true,
});
const completions = Array.from({ length: 256 }, (_, loop) => ({ loop, atNs: "1000000001" }));
assert.equal(readerLevel(completions, "1000000000", "2000000000", 256, [256]).level, 256);
assert.throws(() => readerLevel(completions.slice(1), "1000000000", "2000000000", 256, [256]));
assert.throws(() => readerLevel(completions, "1000000000", "2000000000", 256, [1]));
record("reader controls", { missingLoopRefused: true, wrongRelayRefused: true });

async function runCandidate(mutant) {
  const runId = randomUUID();
  const captured = [];
  let loopOneOrdinal = 0;
  const spoof = {
    atNs: "1",
    receivedAtNs: "1",
    completed: 999999,
    readerLevel: 999999,
    position: "999999",
  };
  const server = net.createServer({ allowHalfOpen: true }, (socket) => {
    socket.on("error", () => {});
    lineReceiver(
      socket,
      REQUEST_CAP,
      (request) => {
        let result;
        if (request.method === "read" || request.method === "pull") {
          result = {
            rows: [
              {
                value:
                  mutant && request.params.request.loopTag === 1 && loopOneOrdinal++ === 1
                    ? "WRONG"
                    : "expected",
              },
            ],
            ...spoof,
          };
        } else if (request.method === "commit") {
          result = {
            commandId: request.params.command.commandId,
            status: "committed",
            receipt: { position: "1", epoch: "0", txId: "tx-1" },
            ...spoof,
          };
        } else result = { started: true, ...spoof };
        const raw = encode(
          { schema: "ns-sut/1", runId, id: request.id, ok: true, result },
          RESPONSE_CAP,
        );
        captured.push({ method: request.method, request, result, raw: raw.toString() });
        socket.end(raw);
      },
      () => socket.destroy(),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const endpoint = { host: "127.0.0.1", port: server.address().port };
  const keyFile = path.join(output, `${runId}.key`);
  fs.writeFileSync(keyFile, randomBytes(32));
  const eventDir = path.join(output, runId);
  let result;
  try {
    result = await runNS({
      offline: true,
      readers: 2,
      binding: {
        runId,
        sourceSha256: graph.bundleSha256,
        inputsSha256: sha("probe inputs"),
        slot: "offline-no-slot",
      },
      keyFile,
      output: eventDir,
      endpoints: { readers: endpoint, broker: endpoint, consumer: endpoint },
      readRequests: [0, 1].map((loopTag) => ({
        subject: "subject-1",
        shape: { kind: "subgraph", hops: loopTag + 3 },
        basis: { epoch: "0", position: "0" },
        route: "fixture-readers",
        loopTag,
        extra: { tenant: "fixture" },
      })),
      answerSampleEvery: 16,
      trace: [{ atMs: 20, command: { subject: "subject-1", commandId: "cmd-1" } }],
      pulls: [{ subject: "subject-1", basis: "1" }],
      sweep: { basis: "1", release: "r", subjects: ["subject-1"] },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const events = fs
    .readdirSync(eventDir)
    .filter((x) => /^\d+\.json$/.test(x))
    .flatMap((x) => JSON.parse(fs.readFileSync(path.join(eventDir, x))).events);
  const reads = events.filter((e) => e.kind === "read");
  assert.deepEqual(events.find((e) => e.kind === "answer-policy").data.sampling, {
    schema: "answer-sampling/1",
    every: 16,
    firstPerLoop: true,
    nonLoopReads: "all",
  });
  for (const row of reads) {
    assert.equal(row.data.sampled, row.data.sequence === 0 || row.data.sequence % 16 === 0);
    if (row.data.sampled) assert.equal(sha(row.data.answerCanonical), row.data.answerSha256);
  }
  for (const read of reads) {
    const response = captured.find((c) => sha(c.raw) === read.data.rawWireSha256);
    assert.ok(response);
    assert.notEqual(read.data.sentAtNs, "1");
    assert.notEqual(read.data.receivedAtNs, "1");
    assert.ok(read.data.loop < 2);
  }
  const unsampled = reads.filter((e) => e.data.loop === 1);
  assert.ok(unsampled.length >= 2);
  const fixed = unsampled.filter(
    (e) =>
      captured.find((c) => sha(c.raw) === e.data.rawWireSha256).result.rows[0].value === "expected",
  );
  assert.ok(fixed.length >= 2);
  assert.equal(fixed[0].data.answerSha256, fixed[1].data.answerSha256);
  assert.notEqual(fixed[0].data.rawWireSha256, fixed[1].data.rawWireSha256);
  // [EXP-NSR-R2] Why: this independent encoding/oracle uses retained full requests, not candidate captures or the driver's canonicalizer. Rejected: trusting a summary boolean to certify changed-answer detection.
  const canonical = (v) =>
    v === null || typeof v !== "object"
      ? JSON.stringify(v)
      : Array.isArray(v)
        ? "[" + v.map(canonical).join(",") + "]"
        : "{" +
          Object.keys(v)
            .sort()
            .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
            .join(",") +
          "}";
  const recompute = () => {
    for (const row of reads) {
      assert.equal(row.data.requestKey, canonical(row.data.request));
      assert.deepEqual(
        Object.keys(row.data.request).sort(),
        ["subject", "shape", "basis", "route", "loopTag", "extra"].sort(),
      );
      assert.equal(row.data.answerEncoding, "answer-canonical/1");
      const expected = { rows: [{ value: "expected" }], ...spoof };
      assert.equal(
        row.data.answerSha256,
        sha(canonical(expected)),
        `Oracle answer mismatch in loop ${row.data.loop}`,
      );
    }
  };
  if (mutant) assert.throws(recompute, /Oracle answer mismatch in loop 1/);
  else recompute();
  assert.ok(unsampled.some((e) => e.data.sampled === true && e.data.answer));
  const noBytes = unsampled.find((e) => !e.data.sampled);
  assert.ok(noBytes);
  assert.equal(noBytes.data.answer, undefined);

  assert.equal(fixed[0].data.id, undefined);

  const wrong = captured.filter((c) => c.result.rows?.[0].value === "WRONG");
  assert.equal(wrong.length, mutant ? 1 : 0);
  if (mutant) {
    const wrongRow = reads.find((e) => e.data.rawWireSha256 === sha(wrong[0].raw));
    assert.equal(wrongRow.data.loop, 1);
    assert.equal(wrongRow.data.sampled, false);
  }
  fs.writeFileSync(
    path.join(output, `${runId}-review-capture.json`),
    JSON.stringify({ captured, result }, null, 2),
  );
  return {
    mutant,
    status: result.status,
    reads: reads.length,
    canonicalAnswersCompareEqual: true,
    rawWireDigestSeparate: true,
    changedResponseCount: wrong.length,
    independentRecomputeRejectedChangedResponse: mutant,
    candidateTimesAndReaderCountsIgnored: true,
    eventDir,
  };
}
record("baseline RPC capture", await runCandidate(false));
record("single changed candidate answer", await runCandidate(true));
fs.writeFileSync(
  path.join(output, "summary.json"),
  JSON.stringify(
    { source: "NSR-round2-working-tree; bound by graph and retained source hashes", findings },
    null,
    2,
  ),
);
console.log("Evidence: " + output);
