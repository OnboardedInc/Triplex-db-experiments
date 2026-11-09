// [EXP-P2Q] Why: enumerate the actual service contracts and prove each read reaches the shared policy.
// Rejected: a hand-picked regression list (transactionsForEntity was absent from that list).
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { Effect } from "effect";
import { expect, it, vi } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import * as policy from "../../../../packages/qlever/src/broker/snapshot.js";
import { BasisNotAvailable } from "../../../../packages/qlever/src/broker/errors.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { ModelReplica, openRt, freshDir, ops, attempt, at, writeJson, REPO } from "./harness.js";

const members = (file: string, name: string) => {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(`${REPO}/${file}`, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(
    (node) => ts.isInterfaceDeclaration(node) && node.name.text === name,
  ) as ts.InterfaceDeclaration;
  expect(declaration).toBeDefined();
  return declaration.members.map((member) => (member.name as ts.Identifier).text).sort();
};
const contracts = {
  StorageAdapterService: {
    rows: ["getById", "getByEntity", "getByEntities", "query", "history"],
    values: ["dependencyState"],
    introspection: ["currentCommitPosition"],
    mutation: [
      "supportedValueTypes",
      "validateConstraints",
      "withTransaction",
      "nextCommitPosition",
      "claimCommand",
      "insert",
      "batchInsert",
      "retract",
      "initialize",
      "close",
    ],
  },
  TriplesService: {
    rows: [
      "get",
      "entity",
      "entities",
      "entityPage",
      "match",
      "history",
      "transaction",
      "transactionByCommand",
      "transactions",
    ],
    values: ["transactionsForEntity", "dependencyState", "queryAll", "query", "queryPage"],
    introspection: ["currentPosition", "explain", "explainPage"],
    mutation: ["assert", "assertBatch", "retract", "retractByPattern", "transact"],
  },
  QueryExecutorService: {
    rows: [],
    values: ["execute", "executePage"],
    introspection: ["explain", "explainPage"],
    mutation: [],
  },
};

it("round8 public read inventory requires a policy classification for every declared member", () => {
  for (const [name, contract] of Object.entries(contracts)) {
    const file =
      name === "TriplesService"
        ? "packages/core/src/store/Triples.ts"
        : `packages/core/src/storage/${name === "StorageAdapterService" ? "StorageAdapter" : "QueryExecutor"}.ts`;
    expect(Object.values(contract).flat().sort()).toEqual(members(file, name));
  }
  expect(members("packages/core/src/entity/Repository.ts", "Repository")).toEqual([
    "at",
    "count",
    "find",
    "get",
    "getMany",
    "model",
    "timeline",
  ]);
  const repository = fs.readFileSync(`${REPO}/packages/core/src/entity/Repository.ts`, "utf8");
  expect(repository).toContain("Effect.succeed(stubRepository<M, All>(model))");
  for (const read of ["get", "getMany", "find", "count", "timeline"])
    expect(repository).toContain(`${read}: () => die("Repository.${read}")`);
  writeJson("round8-policy-inventory.json", {
    contracts,
    repository: "explicit unimplemented stubs, not snapshot-capable",
    native: ["select", "selectWithRelations"],
    rawQuery: "not implemented by broker",
  });
});

it("round8 every executable public read reaches the shared basis check; row reads reach the shared snapshot mask", async () => {
  const scope = DatabaseScope.test(`round8-policy:${randomUUID()}`),
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(
    freshDir("round8-policy"),
    scope,
    replica,
    { autoApply: false },
    { basisWaitMs: 40 },
  );
  const recorded: any[] = [];
  try {
    const committed = await rt.run(
      rt.triples.transact(ops("s:policy", 1, "first"), { commandId: "round8-policy" }),
    );
    const row = (await rt.run(rt.adapter.getByEntity("s:policy")))[0]!;
    const logical = { find: ["?v"], where: [["s:policy", ":v/f0", "?v"]] } as any;
    expect("rawQuery" in rt.adapter).toBe(false);
    const a = rt.adapter,
      t = rt.triples,
      e = rt.executor;
    const nativeClient = {
      query: async () => [
        { position: { type: "literal" as const, value: String(committed.position) } },
      ],
      update: async () => ({}),
      command: async () => ({}),
      cancel: async () => {},
      close: async () => {},
    };
    const native = makeQleverNativeQueries(nativeClient, scope, { awaitBasisMs: 40 });
    expect(Object.keys(native).sort()).toEqual(["select", "selectWithRelations"]);
    const contract = { name: "policy", parameters: TypeExpr.any, row: TypeExpr.any };
    const future = committed.position + 4096;
    let explicit = true;
    const basis = () => (explicit ? at(future) : undefined);
    const calls: Record<string, () => any> = {
      "StorageAdapterService.getById": () => a.getById(row.id),
      "StorageAdapterService.getByEntity": () => a.getByEntity("s:policy", basis()),
      "StorageAdapterService.getByEntities": () => a.getByEntities(["s:policy"], basis()),
      "StorageAdapterService.query": () => a.query({ entityId: "s:policy" }, basis()),
      "StorageAdapterService.history": () => a.history("s:policy"),
      "StorageAdapterService.dependencyState": () =>
        a.dependencyState([], basis() ?? at(committed.position)),
      "TriplesService.get": () => t.get(row.id),
      "TriplesService.entity": () => t.entity("s:policy"),
      "TriplesService.entities": () => t.entities(["s:policy"]),
      "TriplesService.entityPage": () => t.entityPage({ entityType: "_Transaction" }),
      "TriplesService.match": () => t.match({ entityId: "s:policy" }),
      "TriplesService.history": () => t.history("s:policy"),
      "TriplesService.transaction": () => t.transaction(committed.txId),
      "TriplesService.transactionByCommand": () => t.transactionByCommand("round8-policy"),
      "TriplesService.transactions": () => t.transactions(),
      "TriplesService.transactionsForEntity": () =>
        t.transactionsForEntity("s:policy", {
          snapshotPosition: explicit ? future : committed.position,
        }),
      "TriplesService.dependencyState": () => t.dependencyState([]),
      "TriplesService.queryAll": () => t.queryAll(logical),
      "TriplesService.query": () => t.query(logical),
      "TriplesService.queryPage": () => t.queryPage({ inner: logical }),
      "QueryExecutorService.execute": () => e.execute(logical, false, basis()),
      "QueryExecutorService.executePage": () => e.executePage(logical, false, basis()),
      "native.select": () =>
        native.select(contract, {}, () => "SELECT ?s WHERE { ?s ?p ?o }", {
          basis: { recordedPosition: explicit ? future : committed.position },
        }),
      "native.selectWithRelations": () =>
        native.selectWithRelations(contract, {}, [], () => "SELECT ?s WHERE { ?s ?p ?o }", {
          basis: { recordedPosition: explicit ? future : committed.position },
        }),
    };
    const expected = Object.entries(contracts)
      .flatMap(([service, groups]) =>
        [...groups.rows, ...groups.values].map((name) => `${service}.${name}`),
      )
      .concat(["native.select", "native.selectWithRelations"]);
    expect(Object.keys(calls).sort()).toEqual(expected.sort());
    const stopped = new BasisNotAvailable({
      required: 6144,
      observed: committed.position,
      replica: "policy sentinel",
      surface: "repository",
      waitedMs: 40,
    });
    const check = vi.spyOn(policy, "awaitSnapshotBasis").mockRejectedValue(stopped);
    try {
      for (const [name, call] of Object.entries(calls))
        for (const transaction of [false, true]) {
          check.mockClear();
          const effect = call();
          const outcome = await attempt(rt, transaction ? a.withTransaction(effect) : effect);
          const expectedRequired = [
            "StorageAdapterService.getByEntity",
            "StorageAdapterService.getByEntities",
            "StorageAdapterService.query",
            "StorageAdapterService.dependencyState",
            "TriplesService.transactionsForEntity",
            "QueryExecutorService.execute",
            "QueryExecutorService.executePage",
            "native.select",
            "native.selectWithRelations",
          ].includes(name)
            ? future
            : committed.position;
          expect(check.mock.calls[0]?.[0].required, `${name} silently substituted its basis`).toBe(
            expectedRequired,
          );
          recorded.push({
            name,
            checkedRequired: check.mock.calls[0]?.[0].required,
            expectedRequired,
            transaction,
            checkCalls: check.mock.calls.length,
            error: outcome.error,
          });
          writeJson("round8-policy-coverage.json", recorded);
          expect(check.mock.calls.length, `${name} bypassed basis policy`).toBeGreaterThan(0);
          expect(outcome.ok).toBe(false);
          expect(outcome.error).toBe(stopped);
        }
    } finally {
      check.mockRestore();
    }
    explicit = false;
    const mask = vi.spyOn(policy, "snapshotRows");
    try {
      for (const name of Object.entries(contracts).flatMap(([service, group]) =>
        group.rows.map((read) => `${service}.${read}`),
      )) {
        mask.mockClear();
        const outcome = await attempt(rt, calls[name]!());
        expect(outcome.ok, `${name} fixture must answer`).toBe(true);
        expect(mask.mock.calls.length, `${name} bypassed snapshot representation`).toBeGreaterThan(
          0,
        );
        const raw = name.endsWith(".history");
        expect(mask.mock.calls.some((call) => call[3] === raw)).toBe(true);
      }
    } finally {
      mask.mockRestore();
    }
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});

it("round8 shared mask clears the whole retirement tuple for position, time and pending cuts without mutating raw history", () => {
  const row = {
    id: "row",
    retracted_at: 20,
    retracted_position: 3072,
    retract_tx_id: "retire",
  } as any;
  for (const [cut, time] of [
    [2048, 30],
    [4096, 10],
  ]) {
    expect(policy.snapshotRows([row], cut!, { validAt: 50, recordedAt: time })).toEqual([
      { ...row, retracted_at: null, retracted_position: null, retract_tx_id: null },
    ]);
  }
  expect(policy.snapshotRows([row], 4096, { validAt: 50, recordedAt: 20 })).toEqual([row]);
  expect(policy.snapshotRows([row], 2048, undefined, true)).toEqual([row]);
  expect(
    policy.snapshotRows([{ ...row, retracted_position: null }], 4096, {
      validAt: 50,
      recordedAt: 10,
    })[0]?.retract_tx_id,
  ).toBeNull();
  expect(row.retract_tx_id).toBe("retire");
  expect(
    policy.snapshotRows([{ ...row, retracted_position: -1 }], 2048)[0]?.retract_tx_id,
  ).toBeNull();
});

it("round8 real journal future basis refuses present and absent entities in and out, including exact fields and wait", async () => {
  const scope = DatabaseScope.test(`round8-journal:${randomUUID()}`),
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(
    freshDir("round8-journal"),
    scope,
    replica,
    { autoApply: false },
    { basisWaitMs: 40 },
  );
  const rows: any[] = [];
  try {
    await rt.run(rt.triples.transact(ops("s:policy", 1, "present")));
    const pin = rt.broker.head(),
      future = (rt.broker.durable().lsn + 4) * 1024;
    for (const entity of ["s:policy", "s:absent"])
      for (const transaction of [false, true]) {
        const read = rt.triples.transactionsForEntity(entity, {
          snapshotPosition: future,
          limit: 1,
        });
        const started = performance.now();
        const outcome = await attempt(rt, transaction ? rt.adapter.withTransaction(read) : read);
        rows.push({ entity, transaction, elapsedMs: performance.now() - started, ...outcome });
        writeJson("round8-policy-journal-future.json", rows);
        expect(outcome.ok).toBe(false);
        expect(outcome.error).toBeInstanceOf(BasisNotAvailable);
        expect(outcome.error).toMatchObject({
          reason: "basis-not-reached",
          required: future,
          observed: transaction ? pin : rt.broker.durable().lsn * 1024 + 1023,
          replica: transaction ? "the transaction snapshot" : "the broker's resolved prefix",
        });
        expect(outcome.error.waitedMs).toBeGreaterThanOrEqual(39);
        expect(performance.now() - started).toBeLessThan(500);
      }
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});

it("round8 explicit transaction cut masks staged retirement, while raw history retains the retirement", async () => {
  const scope = DatabaseScope.test(`round8-stage:${randomUUID()}`),
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(freshDir("round8-stage"), scope, replica, { autoApply: false });
  try {
    const first = await rt.run(rt.triples.transact(ops("s:policy", 1, "present")));
    const basis = at(first.position),
      before = await rt.run(rt.adapter.getByEntity("s:policy", basis));
    const bytes = JSON.stringify(before);
    await rt.run(
      rt.adapter
        .withTransaction(
          Effect.gen(function* () {
            const position = yield* rt.adapter.nextCommitPosition();
            yield* rt.adapter.retract(before[0]!.id, Date.now(), "pending", position);
            const after = JSON.stringify(yield* rt.adapter.getByEntity("s:policy", basis));
            const history = yield* rt.adapter.history("s:policy");
            writeJson("round8-policy-staged-mask.json", { bytes, after, history });
            expect(after).toBe(bytes);
            expect(history[0]!.retract_tx_id).toBe("pending");
            return yield* Effect.fail("rollback-staged-check");
          }),
        )
        .pipe(
          Effect.catch((error) =>
            error === "rollback-staged-check" ? Effect.void : Effect.fail(error),
          ),
        ),
    );
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});
