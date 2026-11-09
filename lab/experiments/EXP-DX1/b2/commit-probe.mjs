// [DX-B2-N3] Why: attribute the measured staging gap to core, codec and HTTP serialization.
// Rejected: changing the write protocol based on an unmeasured guess.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Session } from "node:inspector";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../../../../packages/core/dist/index.js";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "../../../../packages/core/dist/runtime/index.js";
import {
  DatomicClient,
  makeDatomicStorageAdapter,
  makeDatomicQueryExecutor,
} from "../../../../packages/datomic/dist/index.js";
import { buildTraceCommand } from "../../../bench/lib/commands.ts";
import { generateTrace, TRACE_DEFAULTS, meanCommandFacts } from "../../../bench/lib/trace.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
const dir = `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2/commit-probe-${Date.now()}-${randomUUID()}`;
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(import.meta.filename, `${dir}/runner.mjs`);
let owns = false;
const release = () => {
  if (owns) {
    fs.rmdirSync(lock);
    owns = false;
  }
};
process.once("SIGTERM", () => {
  release();
  process.exit(143);
});
process.once("SIGINT", () => {
  release();
  process.exit(130);
});
while (true) {
  try {
    fs.mkdirSync(lock);
    owns = true;
    break;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    await sleep(5000);
  }
}
const watchdog = setTimeout(() => {
  release();
  process.exit(124);
}, 870000);
const scope = DatabaseScope.test(`DX-B2-probe-${randomUUID()}`),
  client = new DatomicClient("http://127.0.0.1:8493", 35000),
  adapter = makeDatomicStorageAdapter(client, scope, { admissionQueue: true });
const runtime = ManagedRuntime.make(
  Runtime.define({
    name: "DX-B2-probe",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
  }).layer({ scope, capabilities: Capabilities.none }),
);
const observations = [],
  all = [];
let samples = [];
client.onRequest = (s) => samples.push(s);
const session = new Session();
const post = (m, p = {}) =>
  new Promise((resolve, reject) => session.post(m, p, (e, v) => (e ? reject(e) : resolve(v))));
try {
  const triples = await runtime.runPromise(Triples),
    states = new Map();
  const seeded = await runtime.runPromise(
    triples.assertBatch(
      Array.from({ length: 200 }, (_, i) => [
        {
          entityId: ids.placement(i),
          attribute: ":placement/stamp",
          value: { type: "integer", value: "0" },
          validFrom: SEED_VALID_FROM,
        },
        {
          entityId: ids.worker(i),
          attribute: ":worker/address",
          value: { type: "string", value: "Synthetic address" },
          validFrom: SEED_VALID_FROM,
        },
      ]).flat(),
    ),
  );
  for (let i = 0; i < 200; i++)
    states.set(i, {
      stamp: 0,
      stampId: seeded[i * 2].id,
      stampValidFrom: SEED_VALID_FROM,
      address: "Synthetic address",
      addressId: seeded[i * 2 + 1].id,
      addressValidFrom: SEED_VALID_FROM,
    });
  const trace = generateTrace({
    seed: "DX-B2-shapes",
    subjects: 200,
    durationS: 1000,
    params: {
      ...TRACE_DEFAULTS,
      steadyFactsPerS: 55 * meanCommandFacts(),
      firstBurstAtS: 1e9,
      systemDuplicateRate: 0,
      ackLossRate: 0,
      activePickShare: 0,
    },
  });
  console.log("probe: 3,000 warm-up commits");
  for (let i = 0; i < 4000; i++) {
    if (i === 3000) {
      session.connect();
      await post("Profiler.enable");
      await post("Profiler.start");
      console.log("probe: 1,000 profiled commits");
    }
    const subject = i % 200,
      state = states.get(subject),
      event = { ...trace[i % trace.length], subject, seq: i, stream: "probe" },
      cmd = buildTraceCommand({ runTag: String(scope), event, state, scheduledAbsMs: Date.now() });
    samples = [];
    const start = performance.now();
    const receipt = await runtime.runPromise(
      triples.transact(cmd.operations, {
        commandId: cmd.commandId,
        preconditions: cmd.preconditions,
      }),
    );
    const end = performance.now(),
      stamp = receipt.triples.find((t) => t.attribute === ":placement/stamp");
    assert.ok(stamp);
    Object.assign(state, {
      stamp: cmd.newStamp,
      stampId: stamp.id,
      stampValidFrom: stamp.validFrom,
    });
    if (cmd.newAddress !== null) {
      const row = receipt.triples.find((t) => t.attribute === ":worker/address");
      Object.assign(state, {
        address: cmd.newAddress,
        addressId: row.id,
        addressValidFrom: row.validFrom,
      });
    }
    assert.equal(samples.length, 2);
    const [begin, tx] = samples;
    const row = {
      wallMs: end - start,
      beginMs: begin.finished - begin.started,
      beginGatewayMs: begin.gatewayMicros / 1000,
      stagingMs: tx.started - begin.finished,
      beginDecodeMs: client.commitDiagnostics.beginDecodeMicros / 1000,
      transactEncodeMs: client.commitDiagnostics.transactEncodeMicros / 1000,
      coreStagingMs:
        tx.started -
        begin.finished -
        (client.commitDiagnostics.beginDecodeMicros +
          client.commitDiagnostics.transactEncodeMicros) /
          1000,
      transactMs: tx.finished - tx.started,
      transactGatewayMs: tx.gatewayMicros / 1000,
      datomicMs: tx.transactMicros / 1000,
      requestSerializeMs: tx.serializeMicros / 1000,
      gatewayParseMs: tx.parseMicros / 1000,
      outsideGatewayMs:
        tx.finished - tx.started - (tx.gatewayMicros + tx.serializeMicros + tx.parseMicros) / 1000,
      datoms: tx.datoms,
      facts: event.facts,
      requestBytes: tx.requestBytes,
    };
    all.push(row);
    if (i >= 3000) observations.push(row);
  }
  const profile = (await post("Profiler.stop")).profile;
  session.disconnect();
  fs.writeFileSync(`${dir}/host.cpuprofile`, JSON.stringify(profile));
  const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)];
  const stats = Object.fromEntries(
    Object.keys(observations[0]).map((k) => [
      k,
      {
        p50: pct(
          observations.map((r) => r[k]),
          0.5,
        ),
        p99: pct(
          observations.map((r) => r[k]),
          0.99,
        ),
      },
    ]),
  );
  const paths = [
    "packages/datomic/src/DatomicClient.ts",
    "packages/datomic/dist/DatomicClient.js",
    "packages/datomic/gateway/src/triplex/gateway/storage.clj",
    "packages/datomic/gateway/src/triplex/gateway/main.clj",
  ];
  const result = {
    diagnostic: true,
    scope,
    dir,
    warmup: 3000,
    n: 1000,
    fixture:
      "200 subjects with stamp/address only; real buildTraceCommand shapes and public Triples.transact; attribution probe, not N4 qualification",
    stats,
    hashes: Object.fromEntries(
      paths.map((p) => [p, createHash("sha256").update(fs.readFileSync(p)).digest("hex")]),
    ),
  };
  fs.writeFileSync(`${dir}/raw.json`, JSON.stringify({ all, observations }));
  fs.writeFileSync(`${dir}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  fs.writeFileSync(
    `${dir}/error.json`,
    JSON.stringify({ error: String(e.stack), all, observations }),
  );
  throw e;
} finally {
  clearTimeout(watchdog);
  release();
  await runtime.dispose();
  await client.delete(scope).catch(() => {});
  client.close();
}
