import assert from "node:assert/strict";
import { test } from "node:test";
import { MessageChannel } from "node:worker_threads";
import { packEntity } from "../../../../packages/datomic/dist/index.js";
import { ReplicaReader, prepareEntity, publicRow } from "../../../bench/lib/replica-reads.ts";
import { startReader } from "../../../bench/reader-worker.ts";
import { COMPOSITIONS } from "../../../bench/lib/composition.ts";
import { ids } from "../../../bench/lib/world.ts";
import { TX, result } from "./fixtures.ts";

// [DX-V1-R2] Why: exercise the actual worker branch, its fallback routing, caught errors and drained counts.
// Rejected: inferring route/sample behavior from ReplicaReader alone or a source-string assertion.
async function probe(kind: "closed" | "open" | "wrong-gateway" | "wrong-prepared") {
  const root = ids.placement(0),
    name = `dx-v1-r2-${kind}`;
  const physical = {
    id: "stamp",
    entityId: root,
    attribute: ":placement/stamp",
    value: { type: "integer" as const, value: "0" },
    position: 1,
    validFrom: 0,
    publicMetadata: {
      recordedAt: 100,
      createdBy: "writer",
      entityType: null,
      schemaVersion: 1,
      txId: TX,
    },
  };
  const entity = prepareEntity(root, packEntity(1, [physical])),
    reader = new ReplicaReader();
  if (kind === "wrong-prepared") {
    // This is a reviewer-owned injected bad summary, not a claim that the production packer produces one.
    const stats = new DataView(entity.stats);
    for (let offset = 0; offset < stats.byteLength; offset += 64)
      stats.setFloat64(offset + 16, 7, true);
  }
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [[root, undefined, entity]],
  });
  if (kind !== "open")
    reader.apply({ position: 2, reset: false, valid: true, recordTime: 200, changes: [] });
  const { port1, port2 } = new MessageChannel();
  let readyResolve!: () => void,
    stoppedResolve!: (m: any) => void,
    calls = 0,
    stop = false;
  const ready = new Promise<void>((r) => {
      readyResolve = r;
    }),
    stopped = new Promise<any>((r) => {
      stoppedResolve = r;
    });
  const records: any[] = [],
    samples: any[] = [];
  const requestStop = () => {
    if (!stop) {
      stop = true;
      port2.postMessage({ type: "stop" });
    }
  };
  port2.on("message", (m) => {
    if (m.type === "ready") readyResolve();
    if (m.type === "reads") {
      records.push(...m.records);
      samples.push(...m.samples);
    }
    if (m.type === "stopped") stoppedResolve(m);
    if (m.type === "error") throw Error(m.message);
  });
  const pull = async (_root: string, basis: any) => {
    calls++;
    assert.equal(_root, root);
    assert.equal(basis.recordedAt, 100);
    assert.equal(basis.recordedPosition, undefined);
    setImmediate(requestStop);
    return result([
      publicRow(
        kind === "wrong-gateway"
          ? { ...physical, value: { type: "integer", value: "9" } }
          : physical,
      ),
    ]);
  };
  COMPOSITIONS[name] = async () =>
    ({
      pull,
      sweepPull: pull,
      transact: async () => {
        throw Error("unused");
      },
      feedPage: async () => ({ transactions: [] }),
      close: async () => {},
    }) as any;
  try {
    await startReader(port1, {
      readPath: "replica",
      replicaImage: reader.index.image(),
      rawSampleLimit: 1,
      lane: "datomic",
      scope: "offline-review",
      composition: name,
      seed: "fixture",
      worker: 0,
      subjects: 1,
      accounts: 20,
      historySample: [],
      sampleSubjects: [0],
      oracleRate: 1,
      splitShare: 0,
    });
    await ready;
    port2.postMessage({
      type: "basis",
      acked: [{ instant: 100, position: 1, txId: TX, at: Date.now() }],
      hot: [],
    });
    port2.postMessage({ type: "level", phase: 0, readers: 1 });
    const done = await stopped;
    assert(records.length > 0);
    assert.equal(done.diagnostics.readAttempts.attempted, done.diagnostics.readAttempts.completed);
    assert.equal(done.diagnostics.readAttempts.completed, records.length);
    assert.equal(done.diagnostics.readAttempts.active, 0);
    if (kind === "closed") {
      assert.equal(calls, 1);
      assert.equal(samples.length, 1);
      assert.equal(samples[0].route, "replica");
      assert.equal(samples[0].fullCanonical, samples[0].gatewayCanonical);
    } else if (kind === "open") {
      assert(calls >= 2);
      assert.equal(samples.length, 1);
      assert.equal(samples[0].route, "fallback");
      assert(records.every((r) => r[18] === "fallback"));
    } else {
      assert.equal(samples.length, 0);
      assert(records.some((r) => r[12] === "Error"));
    }
    console.log(
      JSON.stringify({
        readerProbe: kind,
        calls,
        records: records.length,
        samples: samples.length,
        sampleRoutes: samples.map((s) => s.route),
        errors: records.filter((r) => r[12] !== null).length,
        accounting: done.diagnostics.readAttempts,
      }),
    );
  } finally {
    requestStop();
    port1.close();
    port2.close();
    delete COMPOSITIONS[name];
  }
}
for (const kind of ["closed", "open", "wrong-gateway", "wrong-prepared"] as const)
  test(`real worker: ${kind}`, { timeout: 5000 }, () => probe(kind));
