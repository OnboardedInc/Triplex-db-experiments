// [CX-VP2Q-4-R8] Why: exercise public cursor ingress and compare full snapshot payloads, including retirement metadata.
// Rejected: the older harness key (intentionally drops mutable retirement fields and cannot prove Q89i).
// [CX-VP2Q-4-R8] Why: openRt supplies DatabaseScope.test(scope) to the core runtime; cursor scope must match that exact identity.
// Rejected: using the adapter graph scope as the cursor scope (the harness constructs them separately).
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import { preparePagination, finishPagination } from "../../../../packages/core/src/Pagination.js";
import { prepareEntityPage, encodeEntityPageCursor } from "../../../../packages/core/src/EntityPage.js";
import { makeQleverClient } from "../../../../packages/qlever/src/QleverClient.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { ModelReplica, openRt, freshDir, ops, attempt, writeJson, type Rt } from "./harness.js";

const live = process.env["V_P2Q_LIVE"] === "1";
const makers = { standard: makeQleverClient, fresh: makeFreshConnectionClient };
const logical: any = { find: ["?v"], where: [["s:immutable", ":v/f0", "?v"]] };
const budget = 40;
const entityType = "_Transaction";
const cursorAt = (rt: Rt, position: number, instant: number) => {
  const prepared = preparePagination({ query: { inner: logical, limit: 1 }, now: instant,
    recordedPosition: position, scope: DatabaseScope.test(rt.scope), basis: { recordedAt: instant, validAt: instant } });
  return finishPagination(prepared, { results: [{ "?v": "" }, { "?v": "z" }] }).nextCursor!;
};
const entityCursorAt = (rt: Rt, position: number, instant: number) => encodeEntityPageCursor(
  prepareEntityPage({ request: { entityType, limit: 1, basis: { recordedAt: instant, validAt: instant } },
    now: instant, recordedPosition: position, scope: DatabaseScope.test(rt.scope) }), "");

async function publicFuture(rt: Rt, kind: string, includeHistory: boolean) {
  const pin = rt.broker.head(), future = (rt.broker.durable().lsn + 4) * 1024, instant = Date.now();
  const cursor = cursorAt(rt, future, instant), entityCursor = entityCursorAt(rt, future, instant);
  const routes: Record<string, () => any> = {
    entityPage: () => rt.triples.entityPage({ entityType, cursor: entityCursor, limit: 1 }),
    query: () => rt.triples.query(logical, { pageSize: 1, cursor }),
    queryPage: () => rt.triples.queryPage({ inner: logical, limit: 1, cursor }),
    ...(includeHistory ? { transactionsForEntity: () => rt.triples.transactionsForEntity("s:immutable" as any,
      { snapshotPosition: future, limit: 1 }),
      transactionsForAbsentEntity: () => rt.triples.transactionsForEntity("s:absent" as any, { snapshotPosition: future, limit: 1 }) } : {}),
  };
  const results: any[] = [];
  for (const [route, read] of Object.entries(routes)) for (const transaction of [false, true]) {
    const start = performance.now();
    const effect = read();
    const result = await attempt(rt, transaction ? rt.adapter.withTransaction(effect) : effect);
    const elapsedMs = performance.now() - start;
    results.push({ route, transaction, pin, future, elapsedMs, ...result });
    writeJson(`round8-${kind}-public-future.json`, results);
    expect.soft(result.ok, `${route} transaction=${transaction}`).toBe(false);
    expect.soft(result.error, `${route} transaction=${transaction}`).toMatchObject({
      _tag: "ReadError", reason: "basis-not-reached", required: future });
    expect.soft(elapsedMs, `${route} waits transaction=${transaction}`).toBeGreaterThanOrEqual(budget - 1);
  }
}

// [CX-VP2Q-4-R8] Why: positive relation reads require a nonempty named edge definition, unlike a future gate that refuses before materialization.
// Rejected: [] (the relation API correctly rejects that fixture before answering).
const serialize = (value: any): string => JSON.stringify(value instanceof Map ? [...value] : value);
async function immutable(rt: Rt, client: any, kind: string, published: boolean, querySurfaces: boolean) {
  const first = await rt.run(rt.triples.transact(ops("s:immutable", 1, "first")));
  if (published) expect(await rt.broker.drain(60_000)).toBe(true);
  const instant = Date.now(), basis = { recordedPosition: first.position, recordedAt: instant, validAt: instant };
  const row = (await rt.run(rt.adapter.getByEntity("s:immutable", basis)))[0]!;
  const native = makeQleverNativeQueries(client, rt.scope as any, { awaitBasisMs: budget });
  const contract = { name: "round8", parameters: TypeExpr.any, row: TypeExpr.any };
  const build = (ctx: any) => `SELECT ?v WHERE { ${ctx.fact("s:immutable", { key: ":v/f0", type: TypeExpr.text }, "?v")} } ORDER BY ?v`;
  const routes: Record<string, () => any> = {
    getByEntity: () => rt.adapter.getByEntity("s:immutable", basis),
    getByEntities: () => rt.adapter.getByEntities(["s:immutable"], basis),
    query: () => rt.adapter.query({ entityId: "s:immutable" }, basis),
    entity: () => rt.triples.entity("s:immutable" as any, basis),
    entities: () => rt.triples.entities(["s:immutable" as any], basis),
    match: () => rt.triples.match({ entityId: "s:immutable" as any }, basis),
    ...(querySurfaces ? {
      execute: () => rt.executor.execute(logical, false, basis).pipe(Effect.map((r: any) => r.results)),
      executePage: () => rt.executor.executePage(logical, false, basis).pipe(Effect.map((r: any) => r.results)),
      queryAll: () => rt.triples.queryAll(logical, { basis }).pipe(Effect.map((r: any) => r.results)),
      pagedQuery: () => rt.triples.query(logical, { basis }).pipe(Effect.map((r: any) => r.results)),
      queryPage: () => rt.triples.queryPage({ inner: logical }, { basis }).pipe(Effect.map((r: any) => r.results)),
      select: () => native.select(contract, {}, build, { basis }).pipe(Effect.map((r: any) => r.rows)),
      selectWithRelations: () => native.selectWithRelations(contract, {}, [{ name: "edge", edges: (ctx: any) => `SELECT ?source ?target WHERE { ${ctx.fact("?source", { key: ":v/f0", type: TypeExpr.text }, "?target")} }` }], (ctx: any) => `SELECT ?v WHERE { ${ctx.relation("edge", ctx.entity("s:immutable"), "?v")} } ORDER BY ?v`, { basis }).pipe(Effect.map((r: any) => r.rows)),
      dependencyState: () => rt.adapter.dependencyState([":v/f0"], basis),
    } : {}),
  };
  const before: Record<string, string> = {};
  for (const [route, read] of Object.entries(routes)) before[route] = serialize(await rt.run(read()));
  // [CX-VP2Q-4-R8] Why: time-only public queryAll is explicitly unqualified inside a pending transaction, even before later writes.
  // Rejected: aborting the entire matrix on that typed refusal (would skip the remaining supported read routes).
  const beforeTx = querySurfaces ? await attempt(rt, rt.adapter.withTransaction(routes.queryAll!())) : undefined;
  if (beforeTx) {
    writeJson(`round8-${kind}-time-only-transaction.json`, { before: beforeTx });
    expect(beforeTx.ok).toBe(false);
    expect(beforeTx.error?._tag).toBe("DatalogValidationError");
  }
  await new Promise(resolve => setTimeout(resolve, 5));
  await rt.run(rt.triples.retract(row.id as any));
  await rt.run(rt.triples.transact(ops("s:immutable", 1, "replacement")));
  if (published) expect(await rt.broker.drain(60_000)).toBe(true);
  const records: any[] = [];
  for (const [route, read] of Object.entries(routes)) for (const transaction of [false, true]) {
    const effect = read();
    const outcome = await attempt(rt, transaction ? rt.adapter.withTransaction(effect) : effect);
    if (route === "queryAll" && transaction && beforeTx) {
      records.push({ route, transaction, basis, supported: false, beforeError: beforeTx.error, error: outcome.error });
      writeJson(`round8-${kind}-immutable.json`, records);
      writeJson(`round8-${kind}-time-only-transaction.json`, { before: beforeTx, after: outcome });
      expect.soft(outcome.ok).toBe(false);
      expect.soft(outcome.error?._tag).toBe(beforeTx.error?._tag);
      continue;
    }
    if (!outcome.ok) {
      records.push({ route, transaction, basis, before: before[route], error: outcome.error, equal: false });
      writeJson(`round8-${kind}-immutable.json`, records);
      expect.soft(outcome.ok, `${kind} ${route} transaction=${transaction} unexpectedly refused`).toBe(true);
      continue;
    }
    const after = serialize(outcome.value);
    records.push({ route, transaction, basis, before: before[route], after, equal: before[route] === after });
    writeJson(`round8-${kind}-immutable.json`, records);
    expect.soft(after, `${kind} ${route} transaction=${transaction} immutable snapshot`).toBe(before[route]);
  }
}

it("round8 offline public cursors refuse future basis inside and outside transactions", async () => {
  const scope = DatabaseScope.test(`round8:${randomUUID()}`), client = new ModelReplica(graphIri(scope));
  const rt = await openRt(freshDir("round8-future"), scope, client, { autoApply: false }, { basisWaitMs: budget });
  try {
    await rt.run(rt.triples.transact(ops("s:immutable", 1, "first")));
    await publicFuture(rt, "offline", false);
  } finally { await rt.dispose(); await rt.broker.close(); }
});

it.each(["overlay", "log", "replica"])("round8 offline %s full historical bytes exclude later retirement metadata", async kind => {
  const scope = DatabaseScope.test(`round8:${randomUUID()}`), client = new ModelReplica(graphIri(scope));
  const rt = await openRt(freshDir(`round8-${kind}`), scope, client, { autoApply: kind === "replica" });
  try {
    if (kind === "log") client.down = true;
    await immutable(rt, client, kind, kind === "replica", false);
  } finally { await rt.dispose(); await rt.broker.close(); }
});

describe.skipIf(!live)("round8 live independent public entry points and named snapshots", () => {
  it.each(Object.keys(makers) as (keyof typeof makers)[])("%s future public cursors and journal snapshot", async kind => {
    const scope = DatabaseScope.test(`round8:${randomUUID()}`), client = makers[kind]("http://127.0.0.1:7070");
    const rt = await openRt(freshDir("round8-live-future"), scope, client, {}, { basisWaitMs: budget });
    try {
      await rt.run(rt.triples.transact(ops("s:immutable", 1, "first")));
      expect(await rt.broker.drain(60_000)).toBe(true);
      await publicFuture(rt, kind, true);
    } finally { await rt.dispose(); await rt.broker.close(); await client.update(`DROP SILENT GRAPH ${graphIri(scope)}`); await client.close(); }
  });
  it.each(Object.keys(makers) as (keyof typeof makers)[])("%s immutable payloads on both query surfaces and repository", async kind => {
    const scope = DatabaseScope.test(`round8:${randomUUID()}`), client = makers[kind]("http://127.0.0.1:7070");
    const rt = await openRt(freshDir("round8-live-immutable"), scope, client, {}, { basisWaitMs: budget });
    try { await immutable(rt, client, kind, true, true); }
    finally { await rt.dispose(); await rt.broker.close(); await client.update(`DROP SILENT GRAPH ${graphIri(scope)}`); await client.close(); }
  });
});
