// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  rpc,
  encode,
  REQUEST_CAP,
  RESPONSE_CAP,
  validateMessage,
  lineReceiver,
} from "../ns-driver/rpc.mjs";
import { checkImports } from "../ns-driver/check-imports.mjs";
import { generateTrace, readerLevel } from "../ns-driver/driver.mjs";
import { Events } from "../ns-driver/events.mjs";
import { runP3 } from "../p3-driver.mjs";
import { auditP3 } from "../ns-driver/p3.mjs";
import { host } from "../lib/p3.mjs";
import { buildDriver } from "../ns-driver/build.mjs";
import { launchArtifact } from "../ns-driver/launch-artifact.mjs";
const dir =
  process.env.NSR_EVIDENCE ?? fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "NSR-")));
fs.mkdirSync(dir, { recursive: true });
async function runNS(config) {
  const artifact = path.join(dir, "artifact-" + randomUUID());
  buildDriver(artifact);
  const file = path.join(dir, "config-" + randomUUID() + ".json");
  fs.writeFileSync(file, JSON.stringify(config));
  const result = await launchArtifact(artifact, file);
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split("\n").at(-1));
}
const provider = path.resolve("lab/bench/test/fixtures/ns-provider.mjs");
async function service(role, c) {
  const file = path.join(dir, `${role}-${randomUUID()}.json`);
  fs.writeFileSync(file, JSON.stringify(c));
  const child = spawn(
    process.execPath,
    ["packages/qualification/workloads/ns-sut.ts", "--role", role, "--config", file],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (b) => (stderr += b));
  let output = "";
  const ready = new Promise((yes, no) => {
    const timer = setTimeout(() => {
      child.kill();
      no(Error("Service ready timeout " + stderr));
    }, 10000);
    child.once("exit", (code) => {
      clearTimeout(timer);
      no(Error(`Service exit ${code}: ${stderr}`));
    });
    child.stdout.on("data", (b) => {
      output += b;
      const end = output.indexOf("\n");
      if (end >= 0) {
        clearTimeout(timer);
        try {
          yes(JSON.parse(output.slice(0, end)).endpoint);
        } catch (e) {
          no(e);
        }
      }
    });
  });
  const endpoint = await ready;
  return {
    endpoint: { host: endpoint.address, port: endpoint.port },
    async close() {
      const done = once(child, "exit");
      child.kill("SIGTERM");
      const [code] = await done;
      assert.equal(code, 0, stderr);
    },
  };
}
test("NSR: bundler closure includes P3 audit and excludes resolved candidate files", () => {
  const entries = ["driver.mjs", "p3.mjs"];
  const result = entries.map((x) => checkImports(path.resolve("lab/bench/ns-driver", x)));
  assert.ok(result.every((r) => Object.keys(r.files).every((x) => !x.startsWith("packages/"))));
  const file = path.join(dir, "bad-import.mjs");
  fs.writeFileSync(file, 'import "./packages/candidate.mjs";');
  assert.throws(() => checkImports(file, dir));
  fs.writeFileSync(file, "import(process.argv[2]);");
  const computed = checkImports(file, dir);
  assert.equal(Object.keys(computed.files).length, 1); // Runtime refusal is exercised by the executable round 3 controls.
  fs.writeFileSync(path.join(dir, "import-graph.json"), JSON.stringify(result, null, 2));
});
test("NSR: RPC malformed, depth, UTF8, request/response byte caps and binding fail closed", async () => {
  const request = {
    schema: "ns-sut/1",
    runId: "r",
    id: "i",
    method: "commit",
    params: { command: {} },
  };
  validateMessage(request);
  // [EXP-NSR] Why: a deterministic mutation corpus covers type/key combinations beyond named examples. Rejected: relying only on a valid round trip.
  let rng = 0x5eed;
  const wrongValues = [null, [], 42, true, "", { extra: 1 }];
  for (let i = 0; i < 2048; i++) {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    const mutant = structuredClone(request);
    const key = ["schema", "runId", "id", "method", "params"][rng % 5];
    mutant[key] = wrongValues[(rng >>> 8) % wrongValues.length];
    assert.throws(() => validateMessage(mutant));
  }

  for (const bad of [
    null,
    {},
    { ...request, extra: 1 },
    { ...request, method: "exec" },
    { ...request, params: {} },
    JSON.parse('{"__proto__":{}}'),
  ])
    assert.throws(() => validateMessage(bad));
  assert.throws(
    () => encode({ ...request, params: { command: "x".repeat(REQUEST_CAP) } }, REQUEST_CAP),
    /cap/,
  );
  assert.throws(() => encode({ result: "x".repeat(RESPONSE_CAP) }, RESPONSE_CAP), /cap/);
  let nested = {};
  for (let i = 0; i < 70; i++) nested = { nested };
  assert.throws(() => encode(nested, REQUEST_CAP), /nesting/);
  // Seeded malformed inputs exercise the actual TCP parser, including fragmented frames.
  const server = net.createServer({ allowHalfOpen: true }, (s) => {
    s.on("error", () => {});
    lineReceiver(
      s,
      RESPONSE_CAP,
      () => s.end(),
      () => s.destroy(),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    for (const raw of [
      Buffer.from([255, 10]),
      Buffer.from("{}\n{}\n"),
      Buffer.from("{"),
      Buffer.alloc(RESPONSE_CAP + 1, 32),
    ]) {
      const s = net.createConnection({ host: "127.0.0.1", port: server.address().port });
      s.on("error", () => {});
      const closed = new Promise((resolve) => s.once("close", resolve));
      await once(s, "connect");
      s.end(raw);
      await closed;
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
  const wrong = net.createServer({ allowHalfOpen: true }, (s) => {
    s.on("error", () => {});
    lineReceiver(
      s,
      REQUEST_CAP,
      (v) =>
        s.end(
          encode(
            { schema: "ns-sut/1", runId: "old", id: v.id, ok: true, result: null },
            RESPONSE_CAP,
          ),
        ),
      () => s.destroy(),
    );
  });
  await new Promise((r) => wrong.listen(0, "127.0.0.1", r));
  try {
    await assert.rejects(
      rpc({ host: "127.0.0.1", port: wrong.address().port }, "r", "commit", { command: {} }),
      /binding/,
    );
  } finally {
    await new Promise((r) => wrong.close(r));
  }
});
test("NSR: HMAC chunks are fresh, ordered and bind exact attempt/source/inputs/slot", () => {
  const key = randomBytes(32),
    binding = {
      runId: randomUUID(),
      sourceSha256: "a".repeat(64),
      inputsSha256: "b".repeat(64),
      slot: "offline-no-slot",
    };
  const out = path.join(dir, "hr-" + randomUUID()),
    events = new Events(out, key, binding, 100);
  events.write("read", { one: 1 });
  events.write("offer", { two: 2 });
  const seal = events.seal();
  let previous = "0".repeat(64);
  for (let i = 0; i < seal.chunks; i++) {
    const { hmac, ...body } = JSON.parse(
      fs.readFileSync(path.join(out, `${String(i).padStart(8, "0")}.json`)),
    );
    assert.deepEqual(body.binding, binding);
    assert.equal(body.sequence, i);
    assert.equal(body.previous, previous);
    assert.equal(hmac, createHmac("sha256", key).update(JSON.stringify(body)).digest("hex"));
    previous = hmac;
  }
  assert.equal(previous, seal.head);
  assert.throws(() => events.write("late", {}), /sealed/);
  assert.throws(() => new Events(out, key, binding), /fresh/);
});
test("NSR: reader level requires per-second completions and relay evidence", () => {
  const rows = Array.from({ length: 256 }, (_, loop) => ({ loop, atNs: "1000000001" }));
  assert.equal(readerLevel(rows, "1000000000", "2000000000", 256, [256]).level, 256);
  assert.throws(() => readerLevel(rows.slice(1), "1000000000", "2000000000", 256, [256]), /READER/);
  assert.throws(() => readerLevel(rows, "1000000000", "2000000000", 256, [1]), /RELAY/);
  assert.throws(() => readerLevel(rows, "1000000000", "2000000000", 256), /RELAY/);
});
test("NSR: split candidate processes match P3M source trace, lost-ACK accounting and exact feed contents (Mac DIAGNOSTIC)", async () => {
  const seed = "nsr-parity-1";
  const frozen = generateTrace({ seed, subjects: 200, durationS: 100 })
    .filter((e) => !e.resend)
    .slice(0, 4);
  assert.equal(frozen.length, 4);
  const trace = frozen.map((e, i) => ({
    atMs: (i + 1) * 20,
    command: { index: i + 1, commandId: `cmd-${i + 1}`, subject: `subject-${e.subject}` },
  }));
  const monolith = await runP3({
    seed,
    trace,
    lane: "qlever",
    source: "fake-p3",
    stream: "test-stream",
    startToken: '{"after":0}',
    readerComposition: "fake-source-file-pinned",
    provider: path.resolve("lab/bench/test/fixtures/p3-source.mjs"),
    dir,
    offline: true,
    readers: 0,
  });
  const runId = randomUUID(),
    attemptDir = path.join(dir, runId);
  fs.mkdirSync(attemptDir);
  const c = {
    runId,
    seed,
    trace,
    attemptDir,
    provider,
    lane: "qlever",
    source: `fake-p3/${runId}`,
    stream: "test-stream",
    publicationFile: path.join(attemptDir, "publications.db"),
    storeFile: path.join(attemptDir, "broker.db"),
    readerComposition: "fake-source-file-pinned",
    startCursor: { source: `fake-p3/${runId}`, token: '{"after":0}' },
  };
  const services = [];
  try {
    const broker = await service("broker", c);
    services.push(broker);
    const readers = await service("readers", c);
    services.push(readers);
    const consumer = await service("consumer", {
      ...c,
      broker: broker.endpoint,
      storeFile: path.join(attemptDir, "consumer.db"),
    });
    services.push(consumer);
    const keyFile = path.join(attemptDir, "key");
    fs.writeFileSync(keyFile, randomBytes(32));
    const result = await runNS({
      offline: true,
      readers: 256,
      binding: {
        runId,
        sourceSha256: checkImports(path.resolve("lab/bench/ns-driver/driver.mjs")).bundleSha256,
        inputsSha256: createHash("sha256").update(JSON.stringify({ seed, trace })).digest("hex"),
        slot: "offline-no-slot",
      },
      endpoints: {
        broker: broker.endpoint,
        readers: readers.endpoint,
        consumer: consumer.endpoint,
      },
      keyFile,
      output: path.join(attemptDir, "hr"),
      readRequests: [{ subject: "subject-1", basis: "0" }],
      trace,
      pulls: [{ subject: "subject-4", basis: "4" }],
      sweep: { basis: "4", release: "fixture-release", subjects: ["subject-1", "subject-2"] },
    });
    assert.equal(result.status, "DIAGNOSTIC");
    assert.equal(new Set(result.completions.map((x) => x.loop)).size, 256);
    const old = JSON.parse(
      fs.readFileSync(path.join(monolith.config.attemptDir, "observations.json")),
    );
    assert.deepEqual(
      result.consumer.pages.flatMap((x) => x.entries),
      old.consumed.pages.flatMap((x) => x.entries),
    );
    assert.deepEqual(
      result.accounting
        .filter((x) => x.receipt)
        .map((x) => ({ commandId: x.commandId, ...x.receipt })),
      old.acks,
    );
    assert.deepEqual(
      result.accounting.filter((x) => !x.receipt).map((x) => x.commandId),
      monolith.measurement.publishedWithoutAck,
    );
    fs.writeFileSync(
      path.join(attemptDir, "comparison.json"),
      JSON.stringify({ status: "DIAGNOSTIC", split: result, monolith: monolith.runId }, null, 2),
    );
    // The moved pure audit also runs over retained P3M bytes, preserving all planted-delay fixture checks.
    const prefix = JSON.parse(
        fs.readFileSync(path.join(monolith.config.attemptDir, "prefix.json")),
      ),
      records = host.openPublicationReader(monolith.config.publicationFile);
    try {
      assert.deepEqual(
        auditP3({ config: monolith.config, prefix, ...old, records }),
        monolith.measurement,
      );
    } finally {
      records.close();
    }
    await assert.rejects(rpc(readers.endpoint, runId, "commit", { command: {} }), /binding/);
  } finally {
    for (const s of services.reverse()) await s.close();
  }
});

// [EXP-NSR-R2] Why: canonical answer identity must survive transport/key-order differences while retaining full request identity. Rejected: wire hashes as oracle evidence (F1).
test("NSR round2: canonical answer encoding and request keys", async () => {
  const { canonicalAnswer, answerDigest, readEvidence } = await import("../ns-driver/answer.mjs");
  assert.equal(
    canonicalAnswer({ 2: 2, 10: 10, a: [-0, null, true] }),
    '{"10":10,"2":2,"a":[0,null,true]}',
  );
  assert.equal(answerDigest({ b: 2, a: 1 }), answerDigest(JSON.parse('{"a":1, "b":2}')));
  assert.notEqual(answerDigest([1, 2]), answerDigest([2, 1]));
  const request = {
    subject: "s",
    shape: { kind: "graph", hops: 6 },
    basis: { epoch: "0", position: "7" },
    route: "history",
    extra: { tenant: "t" },
  };
  const a = readEvidence(request, { rows: [1] }, Buffer.from('{"id":"a"}\n'), {
    loop: 1,
    sequence: 1,
    every: 16,
  });
  const b = readEvidence(request, { rows: [1] }, Buffer.from('{"id":"b"}\n'), {
    loop: 1,
    sequence: 2,
    every: 16,
  });
  assert.equal(a.answerSha256, b.answerSha256);
  assert.notEqual(a.rawWireSha256, b.rawWireSha256);
  assert.equal(a.requestKey, canonicalAnswer(request));
  assert.equal(a.answer, undefined);
  assert.notEqual(
    a.requestKey,
    canonicalAnswer({ ...request, shape: { ...request.shape, hops: 3 } }),
  );
  assert.notEqual(a.requestKey, canonicalAnswer({ ...request, route: "current" }));
  assert.ok(
    readEvidence(request, { rows: [1] }, Buffer.from("{}"), { loop: 7, sequence: 0, every: 16 })
      .sampled,
  );
});

// [EXP-NSR-R3] Why: raw source execution must not silently emit trusted driver evidence. Rejected: treating the guarded launcher as optional documentation.
test("NSR round3: source runner refuses execution without artifact guard", async () => {
  const { runNS: sourceRun } = await import("../ns-driver/driver.mjs");
  await assert.rejects(sourceRun({ offline: true }), /requires guarded artifact launch/);
});

// [EXP-NSR-R3] Why: G0 must keep the review's executable runtime-loader controls, not only a static graph assertion. Rejected: leaving these regressions in a manual-only script.
test("NSR round3: artifact enforcement rejects runtime candidate loaders", async () => {
  const { runArtifactControls } = await import("../../verify/NSR/round3/artifact-controls.mjs");
  const controls = await runArtifactControls(path.join(dir, "runtime-controls-" + randomUUID()));
  assert.equal(controls.length, 10);
});

// [EXP-NSR-R4] Why: the review's vm and replacement hooks must encounter unreadable candidate bytes. Rejected: a matching loader name as evidence of containment.
test("NSR round4: filesystem denies candidate text despite vm and replaced hooks", async () => {
  const { runFilesystemControls } = await import("../../verify/NSR/round4/filesystem-controls.mjs");
  assert.equal(
    (await runFilesystemControls(path.join(dir, "filesystem-" + randomUUID()))).length,
    9,
  );
});

// [EXP-NSR-R5] Why: legal literal-star paths and inherited host environment must not widen the driver envelope. Rejected: relying on denied subprocess permissions to justify host PATH.
test("NSR round5: exact fresh output grant and minimal recorded child environment", async () => {
  const { runEnvelopeControls } = await import("../../verify/NSR/round5/envelope-controls.mjs");
  assert.equal((await runEnvelopeControls(path.join(dir, "envelope-" + randomUUID()))).length, 8);
});
