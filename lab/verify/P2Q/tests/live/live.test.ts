// V-P2Q live checks against the shared tx2-qlever-dev resident (V_P2Q_LIVE=1, QLEVER_URL=http://127.0.0.1:7070).
// Every graph is unique to this file (v-p2q-live:<uuid>); nothing is rebuilt, cleared or restarted.
// 1. Datalog inside a transaction while the replica is behind sourceK (no applier): answer vs the log.
// 2. Datalog and dependencyState after a replica regression the broker has not noticed (emulated by removing
//    this graph's published rows and rewinding its marker, as a restart without persisted updates leaves it).
// 3. Two runtimes for one scope in one process through the public factory and QLEVER_COMMIT_PATH=broker.
// 4. Triples per 10-fact command on A0 and on the candidate (brief check 8), from QLever's own delta counts.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, QueryExecutor, Runtime, StorageAdapter } from "@triplex-build/triplex/runtime";
import { makeFreshConnectionClient } from "../../../../../packages/qlever/src/broker/http.js";
import { buildPublication, markerQuery } from "../../../../../packages/qlever/src/broker/sparql.js";
import { HostBroker } from "../../../../../packages/qlever/src/broker/broker.js";
import { makeQleverClient, type QleverClient } from "../../../../../packages/qlever/src/QleverClient.js";
import { makeQleverStorageAdapter } from "../../../../../packages/qlever/src/QleverStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../../../packages/qlever/src/QleverQueryExecutor.js";
import { makeQleverRuntime } from "../../../../../packages/qlever/src/index.js";
import { assertionIri, graphIri } from "../../../../../packages/qlever/src/rdf.js";
import { RUNS, attempt, at, freshDir, key, openRt, oracleAt, ops, sleep, writeJson } from "../harness.js";

const url = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070";
const live = process.env["V_P2Q_LIVE"] === "1";
const far = () => Date.now() + 10 ** 9;
const q = (subject: string, attr = ":v/f0") => ({ find: ["?v"], where: [[EntityId.make(subject), attr, "?v"]] }) as any;

describe.skipIf(!live)("live: surfaces that read the replica directly", () => {
  it("Datalog inside a transaction answers at sourceK from a replica that does not have sourceK", async () => {
    const scope = `v-p2q-live:${randomUUID()}`;
    const client = makeFreshConnectionClient(url);
    const rt = await openRt(freshDir("live-dl"), scope, client, { autoApply: false });
    try {
      const a = await rt.run(rt.triples.transact(ops("s:L1", 1, "a")));
      const expected = oracleAt(rt.broker.segmentPath, a.position, far(), (row) => row.entity_id === "s:L1");
      const inTxn = await attempt(
        rt,
        rt.adapter.withTransaction(
          Effect.gen(function* () {
            const datalog = yield* rt.executor.execute(q("s:L1"));
            const pull = yield* rt.adapter.getByEntity("s:L1");
            const sourceK = yield* rt.adapter.currentCommitPosition();
            return { datalog: datalog.results, pull: pull.length, sourceK };
          }),
        ),
      );
      const t0 = performance.now();
      const outside = await attempt(rt, rt.triples.queryAll(q("s:L1"), { includeBasis: true }));
      const outsideMs = performance.now() - t0;
      rt.broker.startApplier();
      expect(await rt.broker.drain(60_000)).toBe(true);
      const inTxnAfter = await attempt(rt, rt.adapter.withTransaction(rt.executor.execute(q("s:L1"))));
      const record = {
        position: a.position,
        oracleRows: expected.length,
        inTransaction: inTxn.ok ? inTxn.value : { error: inTxn.error?._tag, message: inTxn.error?.message },
        outsideTransaction: outside.ok ? { results: outside.value.results, basis: outside.value.basis } : { error: outside.error?._tag, message: String(outside.error?.message).slice(0, 300), cause: String(outside.error?.cause).slice(0, 300), ms: Math.round(outsideMs) },
        inTransactionAfterPublication: inTxnAfter.ok ? inTxnAfter.value.results : { error: inTxnAfter.error?._tag },
      };
      writeJson("live-datalog-in-transaction.json", record);
      expect(expected.length).toBe(1);
      expect(inTxn.ok).toBe(true);
      // The finding: the pull sees the commit, the Datalog answer at the same sourceK does not.
      expect(inTxn.value.pull).toBe(1);
      expect(inTxn.value.datalog.length).toBe(0);
      expect(inTxnAfter.ok && inTxnAfter.value.results.length).toBe(1);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 180_000);

  it("after an unnoticed replica regression, Datalog answers with includeBasis at a basis it was not computed at", async () => {
    const scope = `v-p2q-live:${randomUUID()}`;
    const client = makeFreshConnectionClient(url);
    const rt = await openRt(freshDir("live-rg"), scope, client);
    try {
      const a = await rt.run(rt.triples.transact(ops("s:L2", 3, "a")));
      expect(await rt.broker.drain(60_000)).toBe(true);
      const beforeRegression = await attempt(rt, rt.triples.queryAll(q("s:L2"), { includeBasis: true }));
      await sleep(400);
      // Emulate the replica restarting without its persisted delta: drop this graph's published rows and rewind
      // the marker to the fenced state (position 0, this epoch). No commit follows, so the applier never notices.
      const graph = graphIri(scope);
      const rows = rt.broker.fromLog(0, {}, () => true);
      for (const row of rows) await client.update(`DELETE WHERE { GRAPH ${graph} { ${assertionIri(row.id)} ?p ?o } }`);
      const m = (await client.query(markerQuery(scope)))[0]!;
      const rewind = buildPublication(scope, { position: Number(m["brokerPosition"]!.value), epoch: Number(m["brokerEpoch"]!.value) }, { position: 0, epoch: rt.broker.epoch }, []);
      await client.update(rewind.sparql);
      const replicaMarker = Number((await client.query(markerQuery(scope)))[0]?.["brokerPosition"]?.value ?? 0);
      const t0 = performance.now();
      const afterRegression = await attempt(rt, rt.triples.queryAll(q("s:L2"), { includeBasis: true }));
      const ms = performance.now() - t0;
      const dep = await attempt(rt, rt.adapter.dependencyState([":v/f0"], { validAt: far(), recordedPosition: a.position }));
      const pull = await rt.run(rt.adapter.getByEntity("s:L2", at(a.position)));
      const record = {
        position: a.position,
        cachedMarker: rt.broker.replicaPosition(),
        replicaMarkerAfterRewind: replicaMarker,
        datalogBefore: beforeRegression.ok ? { results: beforeRegression.value.results.length, basis: beforeRegression.value.basis.recordedPosition } : beforeRegression.error?._tag,
        datalogAfter: afterRegression.ok ? { results: afterRegression.value.results.length, basis: afterRegression.value.basis.recordedPosition, ms: Math.round(ms) } : { error: afterRegression.error?._tag, message: String(afterRegression.error?.message).slice(0, 200) },
        dependencyStateAfter: dep.ok ? dep.value : { error: dep.error?._tag },
        repositoryPullAfter: { rows: pull.length, route: rt.reads.at(-1)?.route, oracle: oracleAt(rt.broker.segmentPath, a.position, far(), (row) => row.entity_id === "s:L2").length },
      };
      writeJson("live-regression-cached-marker.json", record);
      expect(record.repositoryPullAfter.rows).toBe(3);
      expect(afterRegression.ok).toBe(true);
      expect(afterRegression.value.basis.recordedPosition).toBe(a.position);
      expect(afterRegression.value.results.length).toBe(0); // stale answer presented at basis a.position
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 180_000);
});

describe.skipIf(!live)("live: the public factory with QLEVER_COMMIT_PATH=broker", () => {
  it("two runtimes for one scope in one process share the stream; ACKed frames after the takeover", async () => {
    const root = path.join(RUNS, `env-${randomUUID()}`);
    const scope = `v-p2q-live:${randomUUID()}`;
    const saved = { path: process.env["QLEVER_COMMIT_PATH"], dir: process.env["QLEVER_BROKER_DIR"] };
    process.env["QLEVER_COMMIT_PATH"] = "broker";
    process.env["QLEVER_BROKER_DIR"] = root;
    const open = async () => {
      const managed = ManagedRuntime.make(makeQleverRuntime({ url }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }));
      const triples = await managed.runPromise(Effect.gen(function* () { return yield* Triples; }));
      return { managed, triples };
    };
    try {
      const a = await open();
      const a1 = await a.managed.runPromise(a.triples.transact(ops("s:E", 1, "a1"), { commandId: "env-a1" }));
      // B's open can lose the fence race to A's applier (BrokerFailed "Replica fence failed"); retry as a restart would.
      let b: Awaited<ReturnType<typeof open>> | undefined;
      const bOpenErrors: string[] = [];
      for (let i = 0; i < 6 && !b; i++)
        b = await open().catch((error) => (bOpenErrors.push(String(error?.cause ?? error).slice(0, 120)), undefined));
      if (!b) throw new Error(`second runtime never opened: ${bOpenErrors.join(" | ")}`);
      const b1 = await b.managed.runPromise(b.triples.transact(ops("s:E", 1, "b1"), { commandId: "env-b1" }));
      const a2 = await a.managed.runPromise(a.triples.transact(ops("s:E", 1, "a2"), { commandId: "env-a2" }));
      const b2 = await b.managed.runPromise(b.triples.transact(ops("s:E", 1, "b2"), { commandId: "env-b2" }));
      await a.managed.dispose().catch(() => {});
      await b.managed.dispose().catch(() => {});
      // The factory hashes the runtime's scope key (not the raw test name), so take the one stream it created.
      const streams = fs.readdirSync(root);
      expect(streams.length).toBe(1);
      const dir = path.join(root, streams[0]!);
      void createHash;
      let reopen: any;
      try {
        const broker = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 256 * 1024 ** 2 });
        reopen = {
          opened: true,
          recovery: broker.stats().recovery,
          survived: Object.fromEntries(
            [["env-a1", a1], ["env-b1", b1], ["env-a2", a2], ["env-b2", b2]].map(([id, r]: any) => [id, broker.claim(id)?.txId === r.txId]),
          ),
        };
        await broker.close();
      } catch (error) {
        reopen = { opened: false, error: String(error).slice(0, 240) };
      }
      const record = { bOpenErrors, acked: { a1: a1.position, b1: b1.position, a2: a2.position, b2: b2.position }, reopen, brokenFiles: fs.readdirSync(dir).filter((f) => f.startsWith("broken-")) };
      writeJson("live-env-double-runtime.json", record);
      expect(record).toBeDefined();
    } finally {
      if (saved.path === undefined) delete process.env["QLEVER_COMMIT_PATH"];
      else process.env["QLEVER_COMMIT_PATH"] = saved.path;
      if (saved.dir === undefined) delete process.env["QLEVER_BROKER_DIR"];
      else process.env["QLEVER_BROKER_DIR"] = saved.dir;
    }
  }, 180_000);
});

// ------------------------------------------------------------------ check 8: write amplification

const counting = (inner: QleverClient) => {
  const updates: { sparql: string; inserted?: number; deleted?: number }[] = [];
  const client: QleverClient = {
    ...inner,
    update: async (sparql, options) => {
      const response: any = await inner.update(sparql, options);
      const op = response?.operations?.[0]?.["delta-triples"]?.operation;
      updates.push({ sparql, inserted: op?.inserted, deleted: op?.deleted });
      return response;
    },
  };
  return { client, updates };
};
const predicatesIn = (sparql: string) => {
  const counts: Record<string, number> = {};
  const insertPart = sparql.includes(" INSERT {") ? sparql.slice(sparql.indexOf(" INSERT {")) : sparql;
  for (const m of insertPart.matchAll(/<urn:triplex:(assertion|claim|operation|meta)[^>]*> <urn:triplex:field:([^>]+)> /g)) {
    const k = `${m[1]}:${m[2]!.replace(/_(order|native)$/, "_$1")}`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
};

describe.skipIf(!live)("live: triples per 10-fact command (brief check 8)", () => {
  it("A0 and candidate, five 10-fact commands each, from QLever's delta counts", async () => {
    const out: any = {};
    {
      const scope = `v-p2q-live-a0:${randomUUID()}`;
      const { client, updates } = counting(makeQleverClient(url));
      const storage = makeQleverStorageAdapter(client, scope);
      const managed = ManagedRuntime.make(
        Runtime.define({
          name: "v-p2q-a0",
          storage: Layer.succeed(StorageAdapter, storage),
          queries: Layer.succeed(QueryExecutor, makeQleverQueryExecutor(client, scope, { sourceView: storage.sourceView })),
        }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
      );
      const triples: any = await managed.runPromise(Effect.gen(function* () { return yield* Triples; }));
      for (let i = 0; i < 5; i++) await managed.runPromise(triples.transact(ops(`s:a0-${i}`, 10, `a${i}`), { commandId: `amp-a0-${i}` }));
      out.A0 = { perCommandInserted: updates.map((u) => u.inserted), perCommandDeleted: updates.map((u) => u.deleted), byPredicate: predicatesIn(updates.at(-1)!.sparql) };
      await managed.dispose();
      await client.close();
    }
    {
      const scope = `v-p2q-live-c:${randomUUID()}`;
      const { client, updates } = counting(makeFreshConnectionClient(url));
      const rt = await openRt(freshDir("live-amp"), scope, client, { maxApplyCommands: 1 });
      for (let i = 0; i < 5; i++) {
        await rt.run(rt.triples.transact(ops(`s:c-${i}`, 10, `c${i}`), { commandId: `amp-c-${i}` }));
        expect(await rt.broker.drain(60_000)).toBe(true);
      }
      const publications = updates.filter((u) => u.sparql.includes("broker_position") && u.sparql.includes("<urn:triplex:assertion:"));
      out.candidate = { perPublicationInserted: publications.map((u) => u.inserted), perPublicationDeleted: publications.map((u) => u.deleted), byPredicate: predicatesIn(publications.at(-1)!.sparql) };
      await rt.dispose();
      await rt.broker.close();
    }
    writeJson("check8-amplification.json", out);
    expect(out.A0.perCommandInserted.length).toBe(5);
  }, 300_000);
});
