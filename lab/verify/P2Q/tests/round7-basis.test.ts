// [EXP-P2Q] Why: Q89c applies to every read route, empty answers, and immutable transaction pins.
// Rejected: checking only one populated pull (misses shortcuts and the Datalog pending view).
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import {
  makeQleverClient,
  type QleverClient,
} from "../../../../packages/qlever/src/QleverClient.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { BasisNotAvailable } from "../../../../packages/qlever/src/broker/errors.js";
import { markerQuery } from "../../../../packages/qlever/src/broker/sparql.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { ModelReplica, attempt, at, freshDir, openRt, ops, writeJson, type Rt } from "./harness.js";

const budget = 40;
const live = process.env["V_P2Q_LIVE"] === "1";
const contract = { name: "round7", parameters: TypeExpr.any, row: TypeExpr.any };
const logical = { find: ["?v"], where: [["s:present", ":v/f0", "?v"]] } as any;
const makers = { standard: makeQleverClient, fresh: makeFreshConnectionClient };
const routes = [
  "getByEntity",
  "getByEntities",
  "query",
  "emptyEntities",
  "dependencyState",
  "emptyDependencies",
  "execute",
  "executePage",
  "select",
  "selectWithRelations",
];
const read = (
  rt: Rt,
  client: QleverClient,
  route: string,
  b: number,
  subject: string,
  recordedAt?: number,
) => {
  const basis = { ...at(b), ...(recordedAt === undefined ? {} : { recordedAt }) },
    a = rt.adapter;
  const native = makeQleverNativeQueries(client, DatabaseScope.test(rt.scope), {
    awaitBasisMs: budget,
  });
  switch (route) {
    case "getByEntity":
      return a.getByEntity(subject, basis);
    case "getByEntities":
      return a.getByEntities([subject], basis);
    case "query":
      return a.query({ entityId: subject }, basis);
    case "emptyEntities":
      return a.getByEntities([], basis);
    case "dependencyState":
      return a.dependencyState([":v/f0"], basis);
    case "emptyDependencies":
      return a.dependencyState([], basis);
    case "execute":
      return rt.executor.execute(logical, false, basis);
    case "executePage":
      return rt.executor.executePage(logical, false, basis);
    case "select":
      return native.select(contract, {}, () => "SELECT ?s WHERE { ?s ?p ?o } LIMIT 0", { basis });
    default:
      return native.selectWithRelations(
        contract,
        {},
        [],
        () => "SELECT ?s WHERE { ?s ?p ?o } LIMIT 0",
        { basis },
      );
  }
};
const markerNative = (replica: ModelReplica, scope: string): QleverClient => ({
  query: async (sparql) => {
    if (!sparql.startsWith("SELECT ?position"))
      throw new Error("future read reached answer request");
    const rows = await replica.query(markerQuery(scope));
    return rows.map((row) => ({
      position: row.brokerPosition,
      incarnation: row.brokerIncarnation,
    }));
  },
  update: (s) => replica.update(s),
  command: () => replica.command(),
  cancel: () => replica.cancel(),
  close: () => replica.close(),
});

const futureChecks = async (rt: Rt, client: QleverClient, label: string) => {
  const pin = rt.broker.head(),
    future = (rt.broker.durable().lsn + 4) * 1024;
  const nativeObserved = Number(
    (
      await client.query(
        `SELECT ?position ?incarnation WHERE { GRAPH ${graphIri(rt.scope)} { <urn:triplex:meta> <urn:triplex:field:position> ?position } }`,
      )
    )[0]?.position?.value ?? 0,
  );
  const records: any[] = [];
  for (const route of routes)
    for (const transaction of [false, true])
      for (const subject of ["s:present", "s:absent"])
        for (const recordedAt of [undefined, Date.now()]) {
          const effect = read(rt, client, route, future, subject, recordedAt);
          const start = performance.now();
          const result = await attempt(
            rt,
            transaction ? rt.adapter.withTransaction(effect) : effect,
          );
          const elapsed = performance.now() - start;
          const error = result.error;
          records.push({ route, transaction, subject, recordedAt, elapsed, ok: result.ok, error });
          writeJson(`round7-${label}-future.json`, records);
          expect(result.ok, `${route} transaction=${transaction}`).toBe(false);
          expect(error).toBeInstanceOf(BasisNotAvailable);
          expect(error).toMatchObject({
            _tag: "ReadError",
            reason: "basis-not-reached",
            required: future,
          });
          const isNative = route.startsWith("select");
          expect(error.observed).toBe(
            transaction && !isNative
              ? pin
              : isNative
                ? nativeObserved
                : rt.broker.durable().lsn * 1024 + 1023,
          );
          expect(error.replica).toBe(
            transaction && !isNative
              ? "the transaction snapshot"
              : isNative
                ? "the QLever replica"
                : "the broker's resolved prefix",
          );
          expect(error.waitedMs).toBeGreaterThanOrEqual(budget - 1);
          expect(elapsed).toBeGreaterThanOrEqual(budget - 1);
          expect(elapsed).toBeLessThan(2000);
        }
};

it("round7 offline all entry points refuse future cuts, including absent entities and empty inputs", async () => {
  const scope = `round7:${randomUUID()}`,
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(
    freshDir("round7-all"),
    scope,
    replica,
    { autoApply: false },
    { basisWaitMs: budget },
  );
  try {
    await rt.run(rt.triples.transact(ops("s:present", 1, "present")));
    await futureChecks(rt, markerNative(replica, scope), "offline");
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});

it("round7 repository preserves earlier and pinned cuts across staged insertion/retraction and a newer global head", async () => {
  const scope = `round7:${randomUUID()}`,
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(
    freshDir("round7-pin"),
    scope,
    replica,
    { autoApply: false },
    { basisWaitMs: budget },
  );
  try {
    const first = await rt.run(rt.triples.transact(ops("s:present", 1, "first")));
    await rt.run(rt.triples.transact(ops("s:later", 1, "later")));
    const pin = rt.broker.head();
    const row = (await rt.run(rt.adapter.getByEntity("s:present", at(first.position))))[0]!;
    await rt.run(
      rt.adapter
        .withTransaction(
          Effect.gen(function* () {
            const pending = yield* rt.adapter.nextCommitPosition();
            yield* rt.adapter.retract(row.id, Date.now(), "pending-retract", pending);
            yield* rt.triples.transact(ops("s:staged", 1, "staged"));
            for (const b of [first.position, pin]) {
              expect((yield* rt.adapter.getByEntity("s:present", at(b))).length).toBe(1);
              expect(
                (yield* rt.adapter.getByEntities(["s:present"], at(b))).get("s:present")?.length,
              ).toBe(1);
              expect((yield* rt.adapter.query({ entityId: "s:present" }, at(b))).length).toBe(1);
              expect((yield* rt.adapter.getByEntity("s:staged", at(b))).length).toBe(0);
              expect((yield* rt.adapter.getByEntity("s:later", at(b))).length).toBe(
                b === pin ? 1 : 0,
              );
            }
            expect(yield* rt.adapter.getById(row.id)).toBeNull();
            expect((yield* rt.adapter.history("s:present")).length).toBe(1);
            // A separate fiber has no transaction context; its commit must not advance this transaction's pin.
            const advance = Effect.promise(() =>
              rt.run(rt.triples.transact(ops("s:concurrent", 1, "new"))),
            );
            yield* advance;
            expect(yield* rt.adapter.currentCommitPosition()).toBe(pin);
            for (const route of routes.filter((route) => !route.startsWith("select"))) {
              const result = yield* Effect.match(
                read(rt, markerNative(replica, scope), route, rt.broker.head(), "s:concurrent"),
                {
                  onFailure: (error: any) => error,
                  onSuccess: () => {
                    throw new Error("advanced head escaped transaction pin");
                  },
                },
              );
              expect(result).toBeInstanceOf(BasisNotAvailable);
              expect(result).toMatchObject({
                required: rt.broker.head(),
                observed: pin,
                replica: "the transaction snapshot",
              });
            }
            writeJson("round7-pin-preserved.json", {
              first: first.position,
              pin,
              globalHead: rt.broker.head(),
            });
            // Avoid committing staged writes after the intentional concurrent scope change.
            return yield* Effect.fail("rollback-test");
          }),
        )
        .pipe(Effect.catch(() => Effect.void)),
    );
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});

describe.skipIf(!live)("round7 live exact basis", () => {
  it.each(Object.keys(makers) as (keyof typeof makers)[])(
    "%s all routes and historical Datalog with pending writes",
    async (kind) => {
      const scope = `round7-live:${randomUUID()}`,
        client = makers[kind]("http://127.0.0.1:7070");
      const rt = await openRt(
        freshDir(`round7-live-${kind}`),
        scope,
        client,
        {},
        { basisWaitMs: budget },
      );
      try {
        const first = await rt.run(rt.triples.transact(ops("s:present", 1, "first")));
        await rt.run(rt.triples.transact(ops("s:present", 1, "second")));
        expect(await rt.broker.drain(60_000)).toBe(true);
        await futureChecks(rt, client, kind);
        const pin = rt.broker.head(),
          rows = await rt.run(rt.adapter.getByEntity("s:present", at(pin)));
        await rt.run(
          rt.adapter.withTransaction(
            Effect.gen(function* () {
              const position = yield* rt.adapter.nextCommitPosition();
              yield* rt.adapter.retract(rows[0]!.id, Date.now(), "staged-retract", position);
              yield* rt.triples.transact(ops("s:present", 1, "staged"));
              for (const b of [first.position, pin]) {
                for (const route of ["execute", "executePage"]) {
                  const value = yield* read(rt, client, route, b, "s:present", Date.now() + 1000);
                  expect(value.results.length).toBe(b === pin ? 2 : 1);
                }
                const dependency = yield* rt.adapter.dependencyState([":v/f0"], at(b));
                expect(dependency.sourcePosition).toBe(b);
              }
              const value = yield* rt.executor.execute(logical);
              expect(value.results.length).toBe(2);
              writeJson(`round7-${kind}-historical.json`, {
                first: first.position,
                pin,
                pendingResults: value.results,
              });
            }),
          ),
        );
      } finally {
        await rt.dispose();
        await rt.broker.close();
        await client.update(`DROP SILENT GRAPH ${graphIri(scope)}`);
        await client.close();
      }
    },
  );
});
