/**
 * [EXP-C8] Contract C8 ("reads never mutate") at the engine boundary, on the shared dev residents.
 *
 * Why this shape: every recursive read path (Datalog rules as in G1's three rule cases, cursor
 * pages with counts, maintained query(), native closures in XTQL, SQL and SPARQL as in G2) runs
 * through a read runtime whose ONLY connection is a wire-level proxy that counts write statements
 * and commits (XTDB pgwire) or update requests (QLever HTTP) (src/engine-write-counter.ts). Facts
 * and a concurrent writer go through a separate direct runtime, so the proxy sees read traffic
 * only and must count zero writes, including during a load run of concurrent recursive readers.
 * A positive control through the same proxy proves the counter sees writes. The load run also
 * reports writer commit latency with and without the recursive readers (P1, TARGETS 1.1 item 5,
 * matched comparison on the same engine). The G2 gate itself carries the same counter for all 142
 * native executions (workloads/runner.ts, lab/bin/gate.mjs).
 * Names are unique to EXP-C8 (scopes `c8-...`, table `c8_...`); nothing else is touched.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { EntityId, Triples, ref, string } from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeXtdbClient,
  makeXtdbMaintainedQueries,
  makeXtdbNativeQueries,
  makeXtdbRuntime,
} from "@triplex-build/triplex-xtdb";
import {
  makeQleverClient,
  makeQleverNativeQueries,
  makeQleverRuntime,
} from "@triplex-build/triplex-qlever";
import {
  startQleverWriteCounter,
  startXtdbWriteCounter,
  type EngineWriteCounter,
} from "../src/engine-write-counter.js";

const xtdbUrl = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb";
const qleverUrl = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070";
const LOAD_MS = Number(process.env["C8_LOAD_MS"] ?? 8_000);
const READERS = Number(process.env["C8_READERS"] ?? 8);

// G1's rule cases (packages/testkit "datalog recursive rules compute the same transitive
// closure", "recursive relations support cursor pagination", "rule patterns unify repeated
// variables"): the same rule shapes over the same kind of facts.
const parentFacts = [
  ["c8:a", "c8:b"],
  ["c8:b", "c8:c"],
  ["c8:c", "c8:d"],
  ["c8:unrelated", "c8:other"],
] as const;
const ancestorRules = [
  { name: "c8-ancestor", body: [["?child", ":c8/parent", "?parent"]] },
  {
    name: "c8-ancestor",
    body: [
      ["?child", ":c8/parent", "?parent"],
      ["c8-ancestor", "?parent", "?ancestor"],
    ],
  },
] as const;
// R10 3.2 WL15 dependency-set: cycle Y<->Z plus a diamond.
const dependencyFacts = [
  ["c8:X", "c8:Y"],
  ["c8:X", "c8:W"],
  ["c8:W", "c8:Z"],
  ["c8:Y", "c8:Z"],
  ["c8:Z", "c8:Y"],
] as const;

const facts = (t: Effect.Success<typeof Triples>) =>
  t.assertBatch([
    ...parentFacts.map(([a, b]) => ({ entityId: EntityId.make(a), attribute: ":c8/parent", value: ref(b) })),
    { entityId: EntityId.make("c8:text-source"), attribute: ":c8/parent", value: string("c8:text-target") },
    { entityId: EntityId.make("c8:self"), attribute: ":c8/same", value: ref("c8:self") },
    { entityId: EntityId.make("c8:not-self"), attribute: ":c8/same", value: ref("c8:other") },
    ...dependencyFacts.map(([a, b]) => ({ entityId: EntityId.make(a), attribute: ":c8/dep", value: ref(b) })),
  ]);

/** The Datalog read paths G1 exercises with rules, plus maintained-query reads (XTDB). */
const datalogReads = Effect.gen(function* () {
  const t = yield* Triples;
  const closure = yield* t.query({
    find: ["?ancestor"],
    where: [["c8-ancestor", "c8:a", "?ancestor"]],
    rules: ancestorRules,
  });
  expect(closure.results.map((row) => row["?ancestor"]).sort()).toEqual(["c8:b", "c8:c", "c8:d"]);
  const shared = yield* t.query({
    find: ["?ancestor"],
    where: [
      ["c8-ancestor", "c8:a", "?ancestor"],
      ["c8-ancestor", "c8:b", "?ancestor"],
    ],
    rules: ancestorRules,
  });
  expect(shared.results.map((row) => row["?ancestor"]).sort()).toEqual(["c8:c", "c8:d"]);
  const self = yield* t.query({
    find: ["?node"],
    where: [["c8-self", "?node", "?node"]],
    rules: [{ name: "c8-self", body: [["?node", ":c8/same", "?node"]] }],
  });
  expect(self.results.map((row) => row["?node"])).toEqual(["c8:self"]);
  const inner = { find: ["?ancestor"], where: [["c8-ancestor", "c8:a", "?ancestor"]], rules: ancestorRules } as const;
  const first = yield* t.queryPage({ inner, limit: 2, includeCount: true });
  const last = yield* t.queryPage({ inner, limit: 2, includeCount: true, cursor: first.nextCursor! });
  expect([first.totalCount, last.totalCount, last.results.length]).toEqual([3, 3, 1]);
});

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]! : NaN;
};

/** A writer committing one small fact batch every 50 ms for `ms`, latencies in ms. */
const writer = (ms: number, label: string) =>
  Effect.gen(function* () {
    const t = yield* Triples;
    const latencies: number[] = [];
    const until = Date.now() + ms;
    let index = 0;
    let failure: string | undefined;
    while (Date.now() < until && failure === undefined) {
      const started = performance.now();
      const exit = yield* Effect.exit(
        t.assertBatch(
          Array.from({ length: 10 }, (_, k) => ({
            entityId: EntityId.make(`c8:writer:${label}:${index}`),
            attribute: ":c8/load",
            value: string(`v${k}`),
          })),
        ),
      );
      latencies.push(performance.now() - started);
      // A failed or unresolved commit is P1 evidence (a writer blocked), not a C8 result; the
      // writer stops there because an unknown outcome must be resolved before another write.
      if (exit._tag === "Failure") failure = String(exit.cause).slice(0, 300);
      index++;
      yield* Effect.sleep("50 millis");
    }
    return Object.assign(latencies, { failure });
  });

const summarize = (latencies: number[] & { failure?: string | undefined }) => ({
  commits: latencies.length,
  p50: Math.round(percentile(latencies, 0.5)),
  p99: Math.round(percentile(latencies, 0.99)),
  max: Math.round(Math.max(...latencies)),
  ...(latencies.failure ? { failure: latencies.failure } : {}),
});

const expectNoWrites = (counter: EngineWriteCounter) => {
  const counts = counter.counts();
  expect(counts.statements).toBeGreaterThan(0);
  expect({ writes: counts.writes, commits: counts.commits, unparsed: counts.unparsed, samples: counts.samples }).toEqual({
    writes: 0,
    commits: 0,
    unparsed: 0,
    samples: [],
  });
  return counts;
};

describe.skipIf(process.env["XTDB_INTEGRATION"] !== "1")("C8 on XTDB: reads never write (engine boundary)", () => {
  it("counts zero writes across rule queries, maintained reads, native closures and a load run", async () => {
    const scope = DatabaseScope.test(`c8-xtdb-${randomUUID()}`);
    const counter = await startXtdbWriteCounter(xtdbUrl);
    const direct = makeXtdbRuntime({ url: xtdbUrl }).layer({ scope, capabilities: Capabilities.none });
    const proxied = makeXtdbRuntime({ url: counter.url }).layer({ scope, capabilities: Capabilities.none });
    const readClient = makeXtdbClient(counter.url);
    const native = makeXtdbNativeQueries(readClient, scope);
    const closureContract = {
      name: "c8/closure",
      parameters: TypeExpr.struct({ from: TypeExpr.required(TypeExpr.text) }),
      row: TypeExpr.struct({ target: TypeExpr.required(TypeExpr.text) }),
    };
    const edges = [
      {
        name: "dep",
        edges: (ctx: any) =>
          `SELECT DISTINCT entity_id AS source, value_string AS target FROM ${ctx.facts()} f WHERE attribute = ${ctx.attribute(":c8/dep")} AND value_type = 'ref' AND entity_id IS NOT NULL AND value_string IS NOT NULL`,
        seeds: (_ctx: unknown, input: any) => [String(input.from)],
      },
    ];
    const xtqlEdges = [
      {
        name: "dep",
        edges: (ctx: any) =>
          `(-> ${ctx.facts()} (where (= attribute ${ctx.attribute(":c8/dep")}) (= value_type "ref")) (return {:source entity_id :target value_string}))`,
        seeds: (_ctx: unknown, input: any) => [String(input.from)],
      },
    ];
    const nativeReads = Effect.gen(function* () {
      const sql = yield* native.selectSqlWithReachability(closureContract, { from: "c8:X" }, edges, (ctx, input: any) =>
        `SELECT DISTINCT target FROM ${ctx.relation("dep")} c WHERE source = ${ctx.bind(input.from)}`,
      );
      expect((sql.rows as any[]).map((row) => row.target).sort()).toEqual(["c8:W", "c8:Y", "c8:Z"]);
      const xtql = yield* native.selectWithReachability(closureContract, { from: "c8:X" }, xtqlEdges, (ctx, input: any) =>
        `(-> (unify (join ${ctx.relation("dep")} [{:source s} {:target t}]) (where (= s ${ctx.bind(input.from)}))) (aggregate t) (return {:target t}))`,
      );
      expect((xtql.rows as any[]).map((row) => row.target).sort()).toEqual(["c8:W", "c8:Y", "c8:Z"]);
      // R10 3.2: rounds (frontier, rows) = (1,2), (2,2), (1,1); every step is a read.
      const rounds = (sql.trace.steps ?? []).filter((step) => step.phase === "frontier-round");
      expect(rounds).toHaveLength(3);
      return rounds.map((step) => step.elapsedMs);
    });
    const maintained = makeXtdbMaintainedQueries(readClient, scope);
    try {
      await Effect.runPromise(Effect.gen(function* () { yield* facts(yield* Triples); }).pipe(Effect.provide(direct), Effect.scoped));
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          // The read runtime's own startup migration (CREATE TABLE ... at layer build) is not a
          // read call; count from here.
          counter.reset();
          yield* datalogReads;
          const view = yield* maintained.query(
            { find: ["?a", "?b"], where: [["c8-ancestor", "?a", "?b"]], rules: ancestorRules },
            { validAt: Date.now() },
          );
          expect(view.reused).toBe(false);
          // a->b,c,d; b->c,d; c->d; unrelated->other; text-source->text-target (string edges count, as in G1)
          expect(view.results).toHaveLength(8);
          const roundMs = yield* nativeReads;
          const reads = counter.counts();
          return { reads, roundMs };
        }).pipe(Effect.provide(proxied), Effect.scoped),
      );
      expectNoWrites(counter);

      // Load run: concurrent recursive readers through the proxy, a writer on the direct runtime.
      const baseline = await Effect.runPromise(writer(LOAD_MS, "alone").pipe(Effect.provide(direct), Effect.scoped));
      counter.reset();
      let readsDone = 0;
      const stop = Date.now() + LOAD_MS;
      const reader = Effect.gen(function* () {
        while (Date.now() < stop) {
          yield* datalogReads;
          yield* nativeReads;
          readsDone++;
        }
      });
      const [loaded] = await Effect.runPromise(
        Effect.all(
          [
            writer(LOAD_MS, "loaded").pipe(Effect.provide(direct), Effect.scoped),
            Effect.all(Array.from({ length: READERS }, () => reader), { concurrency: "unbounded" }).pipe(
              Effect.provide(proxied),
              Effect.scoped,
            ),
          ],
          { concurrency: "unbounded" },
        ),
      );
      const counts = expectNoWrites(counter);
      expect(readsDone).toBeGreaterThan(0);
      console.log(
        JSON.stringify({
          c8: "xtdb",
          readWindow: result.reads,
          frontierRoundMs: result.roundMs.map(Math.round),
          load: { readers: READERS, ms: LOAD_MS, recursiveReadIterations: readsDone, proxy: counts },
          writerAlone: summarize(baseline),
          writerWithRecursiveReaders: summarize(loaded),
        }),
      );

      // Positive control: the same proxy sees a write when one is sent.
      counter.reset();
      const id = randomUUID();
      await readClient.submit([{ sql: "INSERT INTO c8_write_counter_control (_id, v) VALUES (?, ?)", params: [id, 1] }]);
      expect(counter.counts().commits).toBe(1);
      const cleanup = makeXtdbClient(xtdbUrl);
      await cleanup.submit([{ sql: "ERASE FROM c8_write_counter_control WHERE _id = ?", params: [id] }]);
      await cleanup.close();
    } finally {
      await readClient.close();
      await counter.close();
    }
  }, 600_000);
});

describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")("C8 on QLever: reads never write (engine boundary)", () => {
  it("counts zero updates across rule queries, native closures and a load run", async () => {
    const scope = DatabaseScope.test(`c8-qlever-${randomUUID()}`);
    const counter = await startQleverWriteCounter(qleverUrl);
    const direct = makeQleverRuntime({ url: qleverUrl }).layer({ scope, capabilities: Capabilities.none });
    const proxied = makeQleverRuntime({ url: counter.url }).layer({ scope, capabilities: Capabilities.none });
    const readClient = makeQleverClient(counter.url);
    const native = makeQleverNativeQueries(readClient, scope);
    const dep = { key: ":c8/dep", type: TypeExpr.ref("C8Node") };
    const nativeReads = Effect.gen(function* () {
      const result = yield* native.selectWithRelations(
        {
          name: "c8/closure",
          parameters: TypeExpr.struct({ from: TypeExpr.required(TypeExpr.text) }),
          row: TypeExpr.struct({ target: TypeExpr.required(TypeExpr.text) }),
        },
        { from: "c8:X" },
        [
          {
            name: "dep",
            edges: (ctx) => `SELECT DISTINCT ?source ?target WHERE { ${ctx.fact("?source", dep, "?target")} }`,
            seeds: (_ctx, input: any) => [String(input.from)],
          },
        ],
        (ctx, input: any) =>
          `SELECT DISTINCT ?target WHERE { ${ctx.relation("dep", "?source", "?target")} FILTER(?source = ${ctx.literal(input.from)}) }`,
      );
      expect((result.rows as any[]).map((row) => row.target).sort()).toEqual(["c8:W", "c8:Y", "c8:Z"]);
      const rounds = (result.trace.steps ?? []).filter((step) => step.phase === "frontier-round");
      expect(rounds).toHaveLength(3);
      return rounds.map((step) => step.elapsedMs);
    });
    try {
      await Effect.runPromise(Effect.gen(function* () { yield* facts(yield* Triples); }).pipe(Effect.provide(direct), Effect.scoped));
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          counter.reset();
          yield* datalogReads;
          const roundMs = yield* nativeReads;
          return { reads: counter.counts(), roundMs };
        }).pipe(Effect.provide(proxied), Effect.scoped),
      );
      expectNoWrites(counter);

      const baseline = await Effect.runPromise(writer(LOAD_MS, "alone").pipe(Effect.provide(direct), Effect.scoped));
      counter.reset();
      let readsDone = 0;
      const stop = Date.now() + LOAD_MS;
      const reader = Effect.gen(function* () {
        while (Date.now() < stop) {
          yield* datalogReads;
          yield* nativeReads;
          readsDone++;
        }
      });
      const [loaded] = await Effect.runPromise(
        Effect.all(
          [
            writer(LOAD_MS, "loaded").pipe(Effect.provide(direct), Effect.scoped),
            Effect.all(Array.from({ length: READERS }, () => reader), { concurrency: "unbounded" }).pipe(
              Effect.provide(proxied),
              Effect.scoped,
            ),
          ],
          { concurrency: "unbounded" },
        ),
      );
      const counts = expectNoWrites(counter);
      expect(readsDone).toBeGreaterThan(0);
      console.log(
        JSON.stringify({
          c8: "qlever",
          readWindow: result.reads,
          frontierRoundMs: result.roundMs.map(Math.round),
          load: { readers: READERS, ms: LOAD_MS, recursiveReadIterations: readsDone, proxy: counts },
          writerAlone: summarize(baseline),
          writerWithRecursiveReaders: summarize(loaded),
        }),
      );

      counter.reset();
      await readClient.update(
        "INSERT DATA { GRAPH <urn:triplex:c8-write-counter-control> { <urn:c8:s> <urn:c8:p> \"1\" } }",
      );
      expect(counter.counts().commits).toBe(1);
      const cleanup = makeQleverClient(qleverUrl);
      await cleanup.update(
        "DELETE DATA { GRAPH <urn:triplex:c8-write-counter-control> { <urn:c8:s> <urn:c8:p> \"1\" } }",
      );
      await cleanup.close();
    } finally {
      await readClient.close();
      await counter.close();
    }
  }, 600_000);
});
