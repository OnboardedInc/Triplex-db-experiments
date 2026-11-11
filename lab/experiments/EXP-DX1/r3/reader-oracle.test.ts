import assert from "node:assert/strict";
import { test } from "node:test";
import { MessageChannel } from "node:worker_threads";
import { packEntity, RecentReads } from "../../../../packages/datomic/dist/index.js";
import { startReader } from "../../../bench/reader-worker.ts";
import { COMPOSITIONS } from "../../../bench/lib/composition.ts";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { prepareEntity, publicRow, ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { ids } from "../../../bench/lib/world.ts";
// [DX-R3] Why: execute the real keepRows worker branch and prove its oracle sample used both routes.
// Rejected: checking only ReplicaReader directly (would miss a worker-side gateway bypass).
test(
  "raw oracle samples materialize the local route and independently query the gateway at the unchanged time basis",
  { timeout: 5000 },
  async () => {
    const root = ids.placement(0),
      name = "dxr3-oracle-fixture";
    const rows = [
      {
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
          txId: "_tx/00000000000000000000000001",
        },
      },
    ];
    const index = new ReplicaReader(64 * 1024 ** 2, new RecentReads(20_000, 64 * 1024 ** 2, true));
    index.apply({
      reset: true,
      valid: true,
      position: 1,
      recordTime: 100,
      changes: [[root, undefined, prepareEntity(root, packEntity(1, rows))]],
    });
    index.apply({ reset: false, valid: true, position: 2, recordTime: 200, changes: [] });
    const { port1, port2 } = new MessageChannel();
    const samples: any[] = [],
      records: any[] = [];
    let gatewayCalls = 0,
      stopRequested = false;
    const requestStop = () => {
      if (!stopRequested) {
        stopRequested = true;
        port2.postMessage({ type: "stop" });
      }
    };
    const pull = async (_root: string, basis: any) => {
      assert.equal(_root, root);
      assert.equal(basis.recordedAt, 100);
      assert.equal(basis.recordedPosition, undefined);
      gatewayCalls++;
      setImmediate(requestStop);
      return {
        triples: rows.map(publicRow),
        entities: 1,
        depth: 0,
        roundTrips: 1,
        route: "source",
        language: "fixture",
        waitedMs: 0,
      };
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
    let stoppedResolve!: (message: any) => void, readyResolve!: () => void;
    const ready = new Promise<void>((resolve) => {
      readyResolve = resolve;
    });
    const stopped = new Promise<any>((resolve) => {
      stoppedResolve = resolve;
    });
    port2.on("message", (message) => {
      if (message.type === "ready") readyResolve();
      if (message.type === "reads") {
        samples.push(...message.samples);
        records.push(...message.records);
      }
      if (message.type === "stopped") stoppedResolve(message);
    });
    try {
      await startReader(port1, {
        readPath: "replica",
        replicaImage: index.index.image(),
        rawSampleLimit: 1,
        lane: "datomic",
        scope: "offline-oracle-fixture",
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
        acked: [{ instant: 100, position: 1, txId: rows[0]!.publicMetadata.txId, at: Date.now() }],
        hot: [],
      });
      port2.postMessage({ type: "level", phase: 0, readers: 1 });
      const done = await stopped;
      assert.equal(gatewayCalls, 1);
      assert.equal(samples.length, 1);
      assert.equal(samples[0].route, "replica");
      assert.equal(samples[0].fullCanonical, canonicalWorld(rows.map(publicRow)));
      assert.equal(samples[0].gatewayCanonical, samples[0].fullCanonical);
      assert(records.length > 0);
      assert(records.every((row) => row[12] === null && row[18] === "replica"));
      assert.equal(done.diagnostics.replica.fallback, 0);
    } finally {
      requestStop();
      port1.close();
      port2.close();
      delete COMPOSITIONS[name];
    }
  },
);

// [DX-R3] Why: execute quota renewal in the worker, including open-clock fallbacks before the first local sample.
// Rejected: testing only the driver's coverage counter (would miss budget consumption in readOnce).
test("each phase obtains a local raw sample after the global budget was exhausted; open clocks consume none", { timeout: 5000 }, async () => {
  const root = ids.placement(0), name = "dxr3-oracle-renewal";
  const physical = { id: "stamp", entityId: root, attribute: ":placement/stamp", value: { type: "integer" as const, value: "0" }, position: 1, validFrom: 0,
    publicMetadata: { recordedAt: 100, createdBy: "writer", entityType: null, schemaVersion: 1, txId: "tx-1" } };
  const reader = new ReplicaReader(64 * 1024 ** 2, new RecentReads(20_000, 64 * 1024 ** 2, true));
  reader.apply({ reset: true, valid: true, position: 1, recordTime: 100, changes: [[root, undefined, prepareEntity(root, packEntity(1, [physical]))]] });
  reader.apply({ reset: false, valid: true, position: 2, recordTime: 200, changes: [] });
  const { port1, port2 } = new MessageChannel(), samples: any[] = [], records: any[] = [];
  let readyResolve!: () => void, stopResolve!: (m: any) => void, switched = false, localCalls = 0;
  const ready = new Promise<void>(r => { readyResolve = r; }), stopped = new Promise<any>(r => { stopResolve = r; });
  const basis = (instant: number, position: number) => port2.postMessage({ type: "basis", acked: [{ instant, position, txId: "tx-1", at: Date.now() }], hot: [] });
  const pull = async (_root: string, b: any) => {
    if (b.recordedAt === 200 && !switched) { switched = true; setImmediate(() => basis(100, 1)); }
    if (b.recordedAt === 100) {
      localCalls++;
      if (localCalls === 1) setImmediate(() => port2.postMessage({ type: "level", phase: 1, readers: 1 }));
      else setImmediate(() => port2.postMessage({ type: "stop" }));
    }
    return { triples: [publicRow(physical)], entities: 1, depth: 0, roundTrips: 1, route: "source", language: "fixture", waitedMs: 0 };
  };
  COMPOSITIONS[name] = async () => ({ pull, sweepPull: pull, transact: async () => { throw Error("unused"); }, feedPage: async () => ({ transactions: [] }), close: async () => {} }) as any;
  port2.on("message", m => {
    if (m.type === "ready") readyResolve();
    if (m.type === "reads") { samples.push(...m.samples); records.push(...m.records); }
    if (m.type === "stopped") stopResolve(m);
  });
  try {
    await startReader(port1, { readPath: "replica", replicaImage: reader.index.image(), rawSampleLimit: 1,
      lane: "datomic", scope: name, composition: name, seed: "renewal", worker: 0, subjects: 1, accounts: 20,
      historySample: [], sampleSubjects: [0], oracleRate: 1, splitShare: 0 });
    await ready; basis(200, 2); port2.postMessage({ type: "level", phase: 0, readers: 1 });
    const done = await stopped;
    assert.equal(localCalls, 2);
    assert.deepEqual(samples.map(s => [s.phase, s.route]), [[0, "replica"], [1, "replica"]]);
    assert(samples.every(s => s.fullCanonical === s.gatewayCanonical));
    assert(records.some(r => r[18] === "fallback"));
    assert(records.every(r => r[12] === null));
    assert.equal(done.diagnostics.phases[0].rawLocalSamples, 1);
    assert.equal(done.diagnostics.phases[1].rawLocalSamples, 1);
    assert.equal(done.diagnostics.phases[0].rawFallbackSamples, 0);
  } finally { port1.close(); port2.close(); delete COMPOSITIONS[name]; }
});
