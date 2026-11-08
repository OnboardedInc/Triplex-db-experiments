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
import { EntityId, Triples } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import { makeFreshConnectionClient } from "../../../../../packages/qlever/src/broker/http.js";
import { buildPublication, markerQuery } from "../../../../../packages/qlever/src/broker/sparql.js";
import { HostBroker } from "../../../../../packages/qlever/src/broker/broker.js";
import {
  makeQleverClient,
  type QleverClient,
} from "../../../../../packages/qlever/src/QleverClient.js";
import { makeQleverStorageAdapter } from "../../../../../packages/qlever/src/QleverStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../../../packages/qlever/src/QleverQueryExecutor.js";
import { makeQleverRuntime } from "../../../../../packages/qlever/src/index.js";
import { assertionIri, graphIri } from "../../../../../packages/qlever/src/rdf.js";
import {
  RUNS,
  attempt,
  at,
  freshDir,
  openRt,
  oracleAt,
  ops,
  sleep,
  writeJson,
} from "../harness.js";

const url = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070";
const live = process.env["V_P2Q_LIVE"] === "1";
const far = () => Date.now() + 10 ** 9;
const q = (subject: string, attr = ":v/f0") =>
  ({ find: ["?v"], where: [[EntityId.make(subject), attr, "?v"]] }) as any;

// Emulated regression of this test's graph only: drop its published rows and rewind its marker to (0, epoch), as a
// replica restart without persisted updates leaves it, but with no downtime.
const rewindGraph = async (client: QleverClient, scope: string, rt: any) => {
  const graph = graphIri(scope);
  const subjects = rt.broker.fromLog(0, {}, () => true).map((row: any) => assertionIri(row.id));
  if (subjects.length)
    await client.update(
      `DELETE { GRAPH ${graph} { ?s ?p ?o } } WHERE { GRAPH ${graph} { ?s ?p ?o } VALUES ?s { ${subjects.join(" ")} } }`,
    );
  const m = (await client.query(markerQuery(scope)))[0]!;
  const rewind = buildPublication(
    scope,
    { position: Number(m["brokerPosition"]!.value), epoch: Number(m["brokerEpoch"]!.value) },
    { position: 0, epoch: rt.broker.epoch },
    [],
  );
  await client.update(rewind.sparql);
};
const realMarker = async (client: QleverClient, scope: string) =>
  Number((await client.query(markerQuery(scope)))[0]?.["brokerPosition"]?.value ?? 0);
const reason = (e: any) => `${e?._tag}:${e?.reason ?? ""}`;

describe.skipIf(!live)("live: surfaces that read the replica directly", () => {
  it("C1 Datalog inside a transaction waits for the replica to reach sourceK, then fails typed; answers after publication", async () => {
    const scope = `v-p2q-live:${randomUUID()}`;
    const client = makeFreshConnectionClient(url);
    const rt = await openRt(freshDir("live-dl"), scope, client, { autoApply: false });
    try {
      const a = await rt.run(rt.triples.transact(ops("s:L1", 1, "a")));
      const expected = oracleAt(
        rt.broker.segmentPath,
        a.position,
        far(),
        (row) => row.entity_id === "s:L1",
      );
      const inTxn = await attempt(rt, rt.adapter.withTransaction(rt.executor.execute(q("s:L1"))));
      const outside = await attempt(rt, rt.triples.queryAll(q("s:L1"), { includeBasis: true }));
      rt.broker.startApplier();
      expect(await rt.broker.drain(60_000)).toBe(true);
      const inTxnAfter = await attempt(
        rt,
        rt.adapter.withTransaction(rt.executor.execute(q("s:L1"))),
      );
      const outsideAfter = await attempt(
        rt,
        rt.triples.queryAll(q("s:L1"), { includeBasis: true }),
      );
      const record = {
        position: a.position,
        oracleRows: expected.length,
        inTransaction: inTxn.ok
          ? { results: inTxn.value.results }
          : { error: reason(inTxn.error), message: String(inTxn.error?.message).slice(0, 200) },
        outsideTransaction: outside.ok
          ? { results: outside.value.results, basis: outside.value.basis.recordedPosition }
          : { error: reason(outside.error), message: String(outside.error?.message).slice(0, 200) },
        inTransactionAfterPublication: inTxnAfter.ok
          ? inTxnAfter.value.results
          : { error: reason(inTxnAfter.error) },
        outsideAfterPublication: outsideAfter.ok
          ? {
              results: outsideAfter.value.results,
              basis: outsideAfter.value.basis.recordedPosition,
            }
          : { error: reason(outsideAfter.error) },
      };
      writeJson("live-datalog-in-transaction.json", record);
      expect(inTxn.ok).toBe(false);
      expect(inTxn.error?.reason).toBe("basis-not-reached");
      expect(outside.ok).toBe(false);
      expect(outside.error?.reason).toBe("basis-not-reached");
      expect(inTxnAfter.ok && inTxnAfter.value.results.length).toBe(expected.length);
      expect(outsideAfter.ok && outsideAfter.value.results.length).toBe(expected.length);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 180_000);

  it("C2 after an unnoticed regression, Datalog and dependencyState never answer below B (typed, or exact after replay)", async () => {
    const scope = `v-p2q-live:${randomUUID()}`;
    const client = makeFreshConnectionClient(url);
    const rt = await openRt(freshDir("live-rg"), scope, client);
    try {
      const a = await rt.run(rt.triples.transact(ops("s:L2", 3, "a")));
      expect(await rt.broker.drain(60_000)).toBe(true);
      await sleep(400);
      await rewindGraph(client, scope, rt);
      const markerAfterRewind = await realMarker(client, scope);
      const t0 = performance.now();
      const afterRegression = await attempt(
        rt,
        rt.triples.queryAll(q("s:L2"), { includeBasis: true }),
      );
      const ms = performance.now() - t0;
      await rewindGraph(client, scope, rt);
      const dep = await attempt(
        rt,
        rt.adapter.dependencyState([":v/f0"], { validAt: far(), recordedPosition: a.position }),
      );
      const pull = await rt.run(rt.adapter.getByEntity("s:L2", at(a.position)));
      const record = {
        position: a.position,
        markerAfterRewind,
        datalogAfter: afterRegression.ok
          ? {
              results: afterRegression.value.results.length,
              basis: afterRegression.value.basis.recordedPosition,
              ms: Math.round(ms),
            }
          : {
              error: reason(afterRegression.error),
              message: String(afterRegression.error?.message).slice(0, 200),
              ms: Math.round(ms),
            },
        dependencyStateAfter: dep.ok ? dep.value : { error: reason(dep.error) },
        regressionsDetected: rt.broker.stats().replicaRegressions,
        repositoryPullAfter: {
          rows: pull.length,
          route: rt.reads.at(-1)?.route,
          oracle: oracleAt(
            rt.broker.segmentPath,
            a.position,
            far(),
            (row) => row.entity_id === "s:L2",
          ).length,
        },
      };
      writeJson("live-regression-cached-marker.json", record);
      expect(markerAfterRewind).toBe(0);
      expect(
        afterRegression.ok
          ? afterRegression.value.results.length === 1
          : afterRegression.error?.reason === "basis-not-reached",
      ).toBe(true);
      expect(
        dep.ok
          ? dep.value.sourcePosition === a.position
          : dep.error?.reason === "basis-not-reached",
      ).toBe(true);
      expect(record.repositoryPullAfter.rows).toBe(3);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 180_000);

  it("C2 residual gap: a zero-downtime regression replayed past B during the executor's requests", async () => {
    // The executor's own client rewinds the graph before each request it sends and waits for the broker to
    // replay before returning, so every executor request sees the regressed replica and the before/after
    // probes (made through the broker's client) both see the marker at or above B.
    const scope = `v-p2q-live:${randomUUID()}`;
    const client = makeFreshConnectionClient(url);
    const broker = await HostBroker.open({
      dir: freshDir("live-gap"),
      scopeKey: scope,
      replica: client,
      minFreeBytes: 256 * 1024 ** 2,
      idleProbeMs: 100,
    });
    const adapter = makeQleverStorageAdapter(client, scope, { broker }) as any;
    let armed = false;
    let rewinds = 0;
    const rt0 = { broker };
    const executorClient: QleverClient = {
      ...client,
      query: async (sparql, options) => {
        if (armed) {
          await rewindGraph(client, scope, rt0);
          rewinds++;
          const result = await client.query(sparql, options);
          for (let i = 0; i < 600 && (await realMarker(client, scope)) < target; i++)
            await sleep(100);
          return result;
        }
        return client.query(sparql, options);
      },
    };
    let target = 0;
    const executor = makeQleverQueryExecutor(executorClient, scope, {
      sourceView: adapter.sourceView,
      resolveBasis: adapter.resolveQueryBasis,
      timeoutMs: 600_000,
      nativeTimeoutMs: 600_000,
    });
    const managed = ManagedRuntime.make(
      Runtime.define({
        name: "v-p2q-gap",
        storage: Layer.succeed(StorageAdapter, adapter),
        queries: Layer.succeed(QueryExecutor, executor),
      }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
    );
    try {
      const triples: any = await managed.runPromise(
        Effect.gen(function* () {
          return yield* Triples;
        }),
      );
      const a = await managed.runPromise(triples.transact(ops("s:gap", 1, "g")));
      expect(await broker.drain(60_000)).toBe(true);
      target = a.position;
      armed = true;
      const res = (await managed.runPromise(
        Effect.match(triples.queryAll(q("s:gap"), { includeBasis: true }), {
          onFailure: (error: any) => ({ ok: false, error }),
          onSuccess: (value: any) => ({ ok: true, value }),
        }),
      )) as any;
      armed = false;
      const record = {
        basis: a.position,
        rewinds,
        outcome: res.ok
          ? { results: res.value.results.length, reportedBasis: res.value.basis.recordedPosition }
          : { error: reason(res.error), message: String(res.error?.message).slice(0, 200) },
        regressionsDetected: broker.stats().replicaRegressions,
      };
      writeJson("live-residual-gap.json", record);
      expect(rewinds).toBeGreaterThan(0);
      expect(res.ok).toBe(false);
      expect(res.error?.reason).toBe("basis-not-reached");
    } finally {
      armed = false;
      await managed.dispose();
      await broker.close();
    }
  }, 900_000);
});

describe.skipIf(!live)("live: the public factory with QLEVER_COMMIT_PATH=broker", () => {
  it("C3 two runtimes for one scope in one process: the second is refused every time; ACKed frames survive", async () => {
    const root = path.join(RUNS, `env-${randomUUID()}`);
    const scope = `v-p2q-live:${randomUUID()}`;
    const saved = {
      path: process.env["QLEVER_COMMIT_PATH"],
      dir: process.env["QLEVER_BROKER_DIR"],
    };
    process.env["QLEVER_COMMIT_PATH"] = "broker";
    process.env["QLEVER_BROKER_DIR"] = root;
    const open = async () => {
      const managed = ManagedRuntime.make(
        makeQleverRuntime({ url }).layer({
          scope: DatabaseScope.test(scope),
          capabilities: Capabilities.none,
        }),
      );
      const triples = await managed.runPromise(
        Effect.gen(function* () {
          return yield* Triples;
        }),
      );
      return { managed, triples };
    };
    try {
      const a = await open();
      const a1 = await a.managed.runPromise(
        a.triples.transact(ops("s:E", 1, "a1"), { commandId: "env-a1" }),
      );
      const bOpen: string[] = [];
      for (let i = 0; i < 6; i++)
        bOpen.push(
          await open().then(
            async (b) => (await b.managed.dispose(), "opened"),
            (error) => `refused: ${String(error?.cause ?? error).slice(0, 140)}`,
          ),
        );
      const a2 = await a.managed.runPromise(
        a.triples.transact(ops("s:E", 1, "a2"), { commandId: "env-a2" }),
      );
      await a.managed.dispose().catch(() => {});
      const streams = fs.readdirSync(root);
      const dir = path.join(root, streams[0]!);
      void createHash;
      const broker = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 256 * 1024 ** 2 });
      const survived = {
        a1: broker.claim("env-a1")?.txId === a1.txId,
        a2: broker.claim("env-a2")?.txId === a2.txId,
      };
      const recovery = broker.stats().recovery;
      await broker.close();
      const record = {
        bOpen,
        streams: streams.length,
        recovery,
        survived,
        brokenFiles: fs.readdirSync(dir).filter((f) => f.startsWith("broken-")),
      };
      writeJson("live-env-double-runtime.json", record);
      expect(bOpen.every((s) => s.startsWith("refused"))).toBe(true);
      expect(survived).toEqual({ a1: true, a2: true });
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
  const insertPart = sparql.includes(" INSERT {")
    ? sparql.slice(sparql.indexOf(" INSERT {"))
    : sparql;
  for (const m of insertPart.matchAll(
    /<urn:triplex:(assertion|claim|operation|meta)[^>]*> <urn:triplex:field:([^>]+)> /g,
  )) {
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
          queries: Layer.succeed(
            QueryExecutor,
            makeQleverQueryExecutor(client, scope, { sourceView: storage.sourceView }),
          ),
        }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
      );
      const triples: any = await managed.runPromise(
        Effect.gen(function* () {
          return yield* Triples;
        }),
      );
      for (let i = 0; i < 5; i++)
        await managed.runPromise(
          triples.transact(ops(`s:a0-${i}`, 10, `a${i}`), { commandId: `amp-a0-${i}` }),
        );
      out.A0 = {
        perCommandInserted: updates.map((u) => u.inserted),
        perCommandDeleted: updates.map((u) => u.deleted),
        byPredicate: predicatesIn(updates.at(-1)!.sparql),
      };
      await managed.dispose();
      await client.close();
    }
    {
      const scope = `v-p2q-live-c:${randomUUID()}`;
      const { client, updates } = counting(makeFreshConnectionClient(url));
      const rt = await openRt(freshDir("live-amp"), scope, client, { maxApplyCommands: 1 });
      for (let i = 0; i < 5; i++) {
        await rt.run(
          rt.triples.transact(ops(`s:c-${i}`, 10, `c${i}`), { commandId: `amp-c-${i}` }),
        );
        expect(await rt.broker.drain(60_000)).toBe(true);
      }
      const publications = updates.filter(
        (u) => u.sparql.includes("broker_position") && u.sparql.includes("<urn:triplex:assertion:"),
      );
      out.candidate = {
        perPublicationInserted: publications.map((u) => u.inserted),
        perPublicationDeleted: publications.map((u) => u.deleted),
        byPredicate: predicatesIn(publications.at(-1)!.sparql),
      };
      await rt.dispose();
      await rt.broker.close();
    }
    writeJson("check8-amplification.json", out);
    expect(out.A0.perCommandInserted.length).toBe(5);
  }, 300_000);
});
