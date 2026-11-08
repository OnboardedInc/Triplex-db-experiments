// EXP-P2Q broker against a live QLever (QLEVER_INTEGRATION=1, QLEVER_URL). Graph names are unique per test
// (`p2q-it:<uuid>`), so this is safe on the shared dev resident; it never rebuilds or clears the server.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, QueryExecutor, Runtime, StorageAdapter } from "@triplex-build/triplex/runtime";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { HostBroker, type BrokerEvent, type HostBrokerOptions } from "../src/broker/broker.js";
import type { BrokerReadEvent, QleverBrokerStorageAdapterService } from "../src/broker/BrokerStorageAdapter.js";
import { makeFreshConnectionClient } from "../src/broker/http.js";
import { buildPublication, markerQuery } from "../src/broker/sparql.js";
import { BasisNotAvailable } from "../src/broker/errors.js";
import type { QleverClient } from "../src/QleverClient.js";
import { assertionIri, graphIri } from "../src/rdf.js";

const url = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070";
const ROOT = path.resolve(import.meta.dirname, "../../../runs/broker/EXP-P2Q/it");
const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

const open = async (dir: string, scope: string, extra: Partial<HostBrokerOptions> = {}, executorClient?: (client: QleverClient) => QleverClient) => {
  const client = makeFreshConnectionClient(url);
  const events: BrokerEvent[] = [];
  const reads: BrokerReadEvent[] = [];
  const broker = await HostBroker.open({
    dir, scopeKey: scope, replica: client, minFreeBytes: 256 * 1024 ** 2, onEvent: (e) => events.push(e), ...extra,
  });
  const adapter = makeQleverStorageAdapter(client, scope, {
    broker,
    brokerOptions: { onRead: (e) => reads.push(e) },
  }) as QleverBrokerStorageAdapterService;
  const layer = Runtime.define({
    name: "p2q-it",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(
      QueryExecutor,
      makeQleverQueryExecutor(executorClient ? executorClient(client) : client, scope, { sourceView: adapter.sourceView, resolveBasis: adapter.resolveQueryBasis }),
    ),
  }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () {
    return yield* Triples;
  }));
  return {
    client, broker, adapter, triples, events, reads,
    run: <A, E>(e: Effect.Effect<A, E>) => managed.runPromise(e),
    exit: <A, E>(e: Effect.Effect<A, E>) =>
      managed.runPromise(Effect.match(e, { onFailure: (error) => ({ ok: false as const, error: error as any }), onSuccess: (value) => ({ ok: true as const, value }) })),
    dispose: () => managed.dispose(),
  };
};
const ops = (subject: string, facts: number, tag: string) =>
  Array.from({ length: facts }, (_v, i) => ({ op: "assert" as const, entityId: EntityId.make(subject), attribute: `:p2q/f${i}`, value: string(`${tag}-${i}`) }));
const at = (position: number) => ({ validAt: Date.now() + 1, recordedPosition: position });

describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")("EXP-P2Q broker with a live QLever replica", () => {
  it("publishes asynchronously, keeps RYOW at every returned position, and the replica converges", async () => {
    const dir = path.join(ROOT, randomUUID());
    dirs.push(dir);
    const scope = `p2q-it:${randomUUID()}`;
    const rt = await open(dir, scope);
    try {
      const results = [];
      for (let i = 0; i < 12; i++) {
        const r = await rt.run(rt.triples.transact(ops(`subj:${i % 3}`, 5, `t${i}`), { commandId: `it-${i}` }));
        results.push(r);
        const rows = await rt.run(rt.adapter.getByEntity(`subj:${i % 3}`, at(r.position)));
        expect(rows.filter((row) => row.value_string?.startsWith(`t${i}-`))).toHaveLength(5);
      }
      expect(await rt.broker.drain(60_000)).toBe(true);
      const before = rt.reads.length;
      for (let s = 0; s < 3; s++) {
        const rows = await rt.run(rt.adapter.getByEntity(`subj:${s}`, at(results.at(-1)!.position)));
        expect(rows).toHaveLength(20);
      }
      expect(rt.reads.slice(before).every((e) => e.route === "replica")).toBe(true);
      const published = rt.events.filter((e) => e.type === "published");
      expect(published.length).toBeGreaterThan(0);
      // A Datalog query waits for the replica (no overlay merge), then answers at the head.
      expect((await rt.adapter.resolveQueryBasis(undefined)).basis).toBe(rt.broker.head());
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 120_000);

  it("recovers when the replica's marker goes backwards (a restart without persisted updates)", async () => {
    const dir = path.join(ROOT, randomUUID());
    dirs.push(dir);
    const scope = `p2q-it:${randomUUID()}`;
    const rt = await open(dir, scope, { retainPublishedMs: 0 });
    try {
      const first = [];
      for (let i = 0; i < 4; i++) first.push(await rt.run(rt.triples.transact(ops(`subj:back${i}`, 3, `b${i}`))));
      expect(await rt.broker.drain(60_000)).toBe(true);
      // Simulate the replica losing its delta since position 0: rewind the marker of this test graph only.
      const marker = (await rt.client.query(markerQuery(scope)))[0]!;
      const rewind = buildPublication(
        scope,
        { position: Number(marker["brokerPosition"]!.value), epoch: Number(marker["brokerEpoch"]!.value) },
        { position: 0, epoch: 0 },
        [],
      );
      await rt.client.update(rewind.sparql);
      // The overlay has evicted the published frames (retainPublishedMs 0), so the replay must come from the log.
      const next = await rt.run(rt.triples.transact(ops("subj:back0", 3, "after")));
      expect(await rt.broker.drain(60_000)).toBe(true);
      expect(rt.events.some((e) => e.type === "replica-regressed")).toBe(true);
      expect(rt.broker.stats().replicaRegressions).toBe(1);
      for (let i = 0; i < 4; i++) {
        const rows = await rt.run(rt.adapter.getByEntity(`subj:back${i}`, at(next.position)));
        expect(rows).toHaveLength(i === 0 ? 6 : 3);
      }
      const after = (await rt.client.query(markerQuery(scope)))[0]!;
      expect(Number(after["brokerEpoch"]!.value)).toBe(rt.broker.epoch);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 120_000);

  it("replays unpublished frames after a crash, fences the old epoch, and a re-sent update is a no-op", async () => {
    const dir = path.join(ROOT, randomUUID());
    dirs.push(dir);
    const scope = `p2q-it:${randomUUID()}`;
    const first = await open(dir, scope, { autoApply: false });
    const committed = [];
    for (let i = 0; i < 5; i++) committed.push(await first.run(first.triples.transact(ops("subj:crash", 3, `c${i}`))));
    // Nothing was published: every read so far was served by the overlay.
    expect(first.reads.every((e) => e.route !== "replica" || e.replicaPosition >= e.basis)).toBe(true);
    const oldEpoch = first.broker.epoch;
    await first.dispose();
    await first.broker.abandon();
    const second = await open(dir, scope);
    try {
      expect(second.broker.epoch).toBe(oldEpoch + 1);
      expect(await second.broker.drain(60_000)).toBe(true);
      const rows = await second.run(second.adapter.getByEntity("subj:crash", at(committed.at(-1)!.position)));
      expect(rows).toHaveLength(15);
      // An update guarded by the superseded epoch matches nothing.
      const marker = (await second.client.query(markerQuery(scope)))[0]!;
      const position = Number(marker["brokerPosition"]!.value);
      const stale = buildPublication(scope, { position, epoch: oldEpoch }, { position: position + 1024, epoch: oldEpoch }, []);
      const response = (await second.client.update(stale.sparql)) as { operations?: { "delta-triples"?: { operation?: { inserted?: number } } }[] };
      expect(response.operations?.[0]?.["delta-triples"]?.operation?.inserted ?? 0).toBe(0);
      const after = (await second.client.query(markerQuery(scope)))[0]!;
      expect(Number(after["brokerPosition"]!.value)).toBe(position);
      expect(Number(after["brokerEpoch"]!.value)).toBe(second.broker.epoch);
      // After eviction the overlay is not eligible for an old snapshot; the log answers instead.
      await new Promise((resolve) => setTimeout(resolve, 2_100));
      expect(second.broker.overlay(0, { entities: ["subj:crash"] }, () => true)).toBeUndefined();
      expect(second.broker.fromLog(0, { entities: ["subj:crash"] }, () => true)).toHaveLength(15);
    } finally {
      await second.dispose();
      await second.broker.close();
    }
  }, 120_000);

  it("Q72b regression case (V-P2Q live residual): a zero-downtime reset replayed past B between the executor's requests is refused", async () => {
    // Adapted from V-P2Q's live residual test (verify/P2Q 856af98, live.test.ts): the executor's own client
    // drops this graph's published rows and rewinds its marker (incarnation untouched) before each request it
    // sends, then returns only once the broker has fenced and replayed past B, so the gate's probe and the
    // after-check both see the marker at or above B. At f711193 this returned 0 rows at reported basis B.
    const dir = path.join(ROOT, randomUUID());
    dirs.push(dir);
    const scope = `p2q-it:${randomUUID()}`;
    const graph = graphIri(scope);
    const realMarker = async (client: QleverClient) => Number((await client.query(markerQuery(scope)))[0]?.["brokerPosition"]?.value ?? 0);
    const state = { armed: false, rewinds: 0, target: 0 };
    let brokerRef: HostBroker | undefined;
    const rewind = async (client: QleverClient) => {
      const subjects = brokerRef!.fromLog(0, {}, () => true).map((row) => assertionIri(row.id));
      if (subjects.length)
        await client.update(`DELETE { GRAPH ${graph} { ?s ?p ?o } } WHERE { GRAPH ${graph} { ?s ?p ?o } VALUES ?s { ${subjects.join(" ")} } }`);
      const m = (await client.query(markerQuery(scope)))[0]!;
      await client.update(
        buildPublication(scope, { position: Number(m["brokerPosition"]!.value), epoch: Number(m["brokerEpoch"]!.value) }, { position: 0, epoch: brokerRef!.epoch }, []).sparql,
      );
    };
    const rt = await open(dir, scope, { idleProbeMs: 100 }, (client) => ({
      ...client,
      query: async (sparql: string, options?: any) => {
        if (!state.armed) return client.query(sparql, options);
        await rewind(client);
        state.rewinds++;
        const result = await client.query(sparql, options);
        for (let i = 0; i < 600 && (await realMarker(client)) < state.target; i++) await new Promise((r) => setTimeout(r, 100));
        return result;
      },
    }));
    brokerRef = rt.broker;
    try {
      const a = await rt.run(rt.triples.transact(ops("s:gap", 1, "g")));
      expect(await rt.broker.drain(60_000)).toBe(true);
      const q = { find: ["?v"], where: [[EntityId.make("s:gap"), ":p2q/f0", "?v"]] } as any;
      state.target = a.position;
      state.armed = true;
      const res = await rt.exit(rt.triples.queryAll(q, { includeBasis: true }));
      state.armed = false;
      expect(state.rewinds).toBeGreaterThanOrEqual(1);
      expect(rt.broker.stats().replicaRegressions).toBeGreaterThanOrEqual(1);
      expect(res.ok).toBe(false);
      expect(res.ok ? undefined : res.error).toBeInstanceOf(BasisNotAvailable);
      expect(res.ok ? undefined : res.error.reason).toBe("basis-not-reached");
      expect(res.ok ? "" : String(res.error.message)).toMatch(/reset during the read/);
      // Unarmed, the same read answers exactly at B.
      const again = await rt.exit(rt.triples.queryAll(q, { includeBasis: true }));
      expect(again.ok && again.value.results.length).toBe(1);
      expect(again.ok && (again.value as any).basis.recordedPosition).toBe(a.position);
    } finally {
      state.armed = false;
      await rt.dispose();
      await rt.broker.close();
    }
  }, 900_000);

  it("dependencyState answers in one request that carries the marker (Q72b) on a live replica", async () => {
    const dir = path.join(ROOT, randomUUID());
    dirs.push(dir);
    const scope = `p2q-it:${randomUUID()}`;
    const rt = await open(dir, scope);
    try {
      const a = await rt.run(rt.triples.transact(ops("s:dep", 2, "d")));
      expect(await rt.broker.drain(60_000)).toBe(true);
      const dep = await rt.run(rt.adapter.dependencyState([":p2q/f0", ":p2q/f1"], { validAt: Date.now() + 1, recordedPosition: a.position }));
      expect(dep.sourcePosition).toBe(a.position);
      const empty = await rt.run(rt.adapter.dependencyState([":p2q/none"], { validAt: Date.now() + 1, recordedPosition: a.position }));
      expect(empty.sourcePosition).toBe(0);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  }, 120_000);
});
