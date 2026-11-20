import assert from "node:assert/strict";
import { Layer, ManagedRuntime } from "effect";
import {
  Attribute,
  EntityId,
  Triples,
  integer,
  ref,
  type DatalogQuery,
  type TransactOp,
} from "../../../../../packages/core/dist/index.js";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "../../../../../packages/core/dist/runtime/index.js";
import {
  DatomicClient,
  makeDatomicQueryExecutor,
  makeDatomicStorageAdapter,
  type DatomicRequestSample,
} from "../../../../../packages/datomic/dist/index.js";

type Layout = "lean" | "legacy";
const owner = (id: string) => EntityId.make(id);
const at = 1_000_000_000_000_000;
const cut = { validAt: at };
const a = (id: string, attribute: string, value: string, validFrom = 0): TransactOp => ({
  op: "assert",
  entityId: owner(id),
  attribute: Attribute.make(attribute),
  value: { type: "string", value },
  validFrom,
});

async function withScope<T>(
  url: string,
  key: string,
  layout: Layout,
  clock: number | null,
  run: (
    t: typeof Triples.Service,
    rt: ReturnType<typeof runtime>,
    client: DatomicClient,
    db: string,
  ) => Promise<T>,
): Promise<T> {
  const client = new DatomicClient(url, 30000);
  const scope = DatabaseScope.test(key);
  const rt = runtime(client, scope, layout, clock);
  try {
    const created = await client.create(scope, layout, true);
    assert.equal(created.created, true);
    assert.equal(created.layout ?? "legacy", layout);
    const t = await rt.runPromise(Triples);
    return await run(t, rt, client, created.db);
  } finally {
    await rt.dispose();
    await client.delete(scope);
    client.close();
  }
}
function runtime(
  client: DatomicClient,
  scope: ReturnType<typeof DatabaseScope.test>,
  layout: Layout,
  clock: number | null,
) {
  return ManagedRuntime.make(
    Runtime.define({
      name: "query6",
      storage: Layer.succeed(
        StorageAdapter,
        makeDatomicStorageAdapter(client, scope, {
          layout,
          serverRecordTime: true,
          recordedJournalReads: true,
        }),
      ),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    }).layer({
      scope,
      capabilities: Capabilities.none,
      ...(clock === null ? {} : { deterministic: { startTime: clock, seed: `query6-${clock}` } }),
    }),
  );
}

const ordered = (query: DatalogQuery) => ({
  ...query,
  orderBy: query.find
    .filter((variable) => typeof variable === "string")
    .map((variable) => ({ variable, direction: "asc" as const })),
});
const results = <T>(value: { results: readonly T[] }) => value.results;

// [DX-W1] Why: keep the documented R-JNL-5 operations and record the exact bytes from the public SDK.
// Rejected: comparing only the gateway status or counting synthetic journal rows as retained triples.
export function queryProof(url: string, nonce: string, layout: Layout) {
  return withScope(url, nonce + "-" + layout, layout, 100, async (t, rt, client, db) => {
    const run = rt.runPromise;
    // [DX-W1] Why: use the real K writer while the reader's business clock stays at 100.
    // Rejected: disabling server-assigned record time, which bypasses the K save ledger.
    const commitAt = async (
      clock: number,
      commandId: string,
      operations: readonly TransactOp[],
    ) => {
      const writer = runtime(client, DatabaseScope.test(nonce + "-" + layout), layout, clock);
      try {
        const triples = await writer.runPromise(Triples);
        const receipt = await writer.runPromise(
          triples.transact(operations, { actor: "client", commandId }),
        );
        assert.equal(receipt.instant, clock);
        return receipt;
      } finally {
        await writer.dispose();
      }
    };
    const first = await commitAt(100, "c1", [a("j:1", ":j/a", "one"), a("j:1", ":j/b", "two", 10)]);
    const second = await commitAt(101, "c2", [
      a("j:2", ":j/a", "three"),
      { op: "retract", id: first.triples[1]!.id },
      a("j:1", ":j/a", "four"),
      { op: "retract", id: first.triples[0]!.id },
    ]);
    const fixed = { ...cut, recordedAt: second.instant };
    const selection = { entityId: owner(second.txId) };
    const changes = { ...selection, attribute: Attribute.make(":_tx/change") };
    const entities = { ...selection, attribute: Attribute.make(":_tx/changed-entity") };
    const app = { attribute: Attribute.make(":j/a") };
    const sorts = <T extends { id: string }>(rows: readonly T[]) =>
      [...rows].sort((l, r) => l.id.localeCompare(r.id));
    const matched = {
      changes: sorts(await run(t.match(changes, fixed))),
      entities: sorts(await run(t.match(entities, fixed))),
      app: sorts(await run(t.match(app, fixed))),
      prior: sorts(await run(t.match(app, { ...cut, recordedAt: first.instant }))),
    };
    const datalog = {
      changes: results(
        await run(
          t.query(
            ordered({
              find: ["?v"],
              where: [[second.txId, ":_tx/change", "?v"]],
            }),
            { basis: fixed },
          ),
        ),
      ),
      entities: results(
        await run(
          t.query(
            ordered({
              find: ["?v"],
              where: [[second.txId, ":_tx/changed-entity", "?v"]],
            }),
            { basis: fixed },
          ),
        ),
      ),
      actor: results(
        await run(
          t.query(
            ordered({
              find: ["?v", "?actor"],
              where: [
                ["?subject", ":j/a", "?v", "?tx"],
                ["?tx", ":_tx/actor", "?actor"],
              ],
            }),
            { basis: fixed },
          ),
        ),
      ),
      alternatives: results(
        await run(
          t.query(
            ordered({
              find: ["?subject"],
              where: [
                ["?subject", ":j/a", "?v"],
                [
                  "or",
                  [
                    ["?subject", ":j/a", "four"],
                    ["?subject", ":j/b", "two"],
                  ],
                ],
                ["not", ["?subject", ":j/a", "three"]],
              ],
            }),
            { basis: fixed },
          ),
        ),
      ),
      aggregate: results(
        await run(
          t.query(
            {
              find: ["?count"],
              aggregate: [["count", "?subject", "?count"]],
              where: [["?subject", ":j/a", "?v"]],
            },
            { basis: fixed },
          ),
        ),
      ),
    };
    const optional = results(
      await run(
        t.query(
          ordered({
            find: ["?subject", "?b"],
            where: [["?subject", ":j/a", "?v"]],
            optionalProjection: {
              rowBinding: "?subject",
              fields: [{ attribute: ":j/b", variable: "?b" }],
            },
          }),
          { basis: fixed },
        ),
      ),
    );
    const wrapped = {
      inner: { find: ["?s", "?v"], where: [["?s", ":j/a", "?v"]] },
      orderBy: [{ variable: "?s", direction: "asc" }],
      limit: 1,
      includeCount: true,
    } as const;
    const page1 = await run(t.queryPage(wrapped, { basis: fixed }));
    assert(page1.nextCursor);
    const plain = ordered(wrapped.inner);
    const plain1 = await run(t.query(plain, { basis: fixed, pageSize: 1 }));
    assert(plain1.nextCursor);
    // [DX-W1] Why: a dependency read must report both the future valid-time edge and the later retraction.
    // Rejected: inferring attribute freshness from the latest scope receipt, which misses both facts.
    const dependencies = await Promise.all(
      [first.instant, second.instant].map((recordedAt) =>
        run(t.dependencyState([":j/b"], { validAt: 0, recordedAt })),
      ),
    );
    assert.deepEqual(dependencies, [
      { sourcePosition: first.position, nextTemporalBoundary: 10 },
      { sourcePosition: second.position },
    ]);
    const typed = {
      one: await run(t.transaction(second.txId)),
      command: await run(t.transactionByCommand("c2")),
      page: await run(t.transactions({ after: first.position, limit: 1 })),
      ownerPage: await run(t.transactionsForEntity(owner("j:1"), { limit: 1 })),
    };
    assert(typed.one);
    assert.deepEqual(typed.one, typed.command);
    assert.deepEqual(typed.page.transactions, [typed.one]);
    assert.deepEqual(typed.ownerPage.transactions, [typed.one]);
    await assert.rejects(
      run(
        t.transact(
          [
            {
              op: "assert",
              entityId: owner("n:1"),
              attribute: Attribute.make(":n/value"),
              value: { type: "number", value: -0 },
              validFrom: 0,
            },
          ],
          { commandId: "negative-zero" },
        ),
      ),
      { _tag: "InvalidTripleError" },
    );
    assert.equal(await run(t.currentPosition()), second.position);
    const next = await commitAt(102, "c3", [
      a("j:0", ":j/a", "arrived later"),
      {
        op: "assert",
        entityId: owner("n:1"),
        attribute: Attribute.make(":n/i"),
        value: integer("9007199254740993"),
        validFrom: 0,
      },
      {
        op: "assert",
        entityId: owner("n:1"),
        attribute: Attribute.make(":n/value"),
        value: { type: "number", value: 0.30000000000000004 },
        validFrom: 0,
      },
      {
        op: "assert",
        entityId: owner("n:1"),
        attribute: Attribute.make(":n/p"),
        value: ref(owner("n:2")),
        validFrom: 0,
      },
      {
        op: "assert",
        entityId: owner("n:2"),
        attribute: Attribute.make(":n/p"),
        value: ref(owner("n:3")),
        validFrom: 0,
      },
    ]);
    const page2 = await run(
      t.queryPage({ ...wrapped, cursor: page1.nextCursor }, { basis: fixed }),
    );
    assert.equal(page2.nextCursor, undefined);
    assert.deepEqual(page2.results, [{ "?s": "j:2", "?v": "three" }]);
    const plain2 = await run(t.query(plain, { pageSize: 1, cursor: plain1.nextCursor }));
    assert.equal(plain2.nextCursor, undefined);
    const complete = results(await run(t.queryAll(plain, { basis: fixed })));
    assert.deepEqual([plain1.results, plain2.results], [page1.results, page2.results]);
    assert.deepEqual(complete, [...page1.results, ...page2.results]);
    assert.equal(typed.ownerPage.nextBeforePosition, second.position);
    const older = await run(
      t.transactionsForEntity(owner("j:1"), {
        limit: 1,
        snapshotPosition: typed.ownerPage.snapshotPosition,
        beforePosition: typed.ownerPage.nextBeforePosition,
      }),
    );
    assert.equal(older.transactions[0]?.txId, first.txId);
    const numerics: DatalogQuery = {
      find: ["?int", "?num"],
      where: [
        ["n:1", ":n/i", "?int"],
        ["n:1", ":n/value", "?num"],
      ],
    };
    // [DX-W1] Why: capture the implicit cursor clock and prove numeric parity at the acknowledged cut.
    // Rejected: letting the deterministic reader's old wall time stand in for the write's recorded time.
    const implicit = await run(t.query(numerics, { basis: cut, includeBasis: true }));
    assert.equal(implicit.basis?.recordedPosition, next.position);
    const latest = { ...cut, recordedAt: next.instant };
    const exact = results(await run(t.query(numerics, { basis: latest })));
    assert.equal(
      exact[0]?.["?int"] && JSON.stringify(exact[0]["?int"]),
      JSON.stringify(integer("9007199254740993")),
    );
    assert(Object.is(exact[0]?.["?num"], 0.30000000000000004));
    const recursive = results(
      await run(
        t.query(
          ordered({
            find: ["?y"],
            where: [["parent", "n:1", "?y"]],
            rules: [
              { name: "parent", body: [["?x", ":n/p", "?y"]] },
              {
                name: "parent",
                body: [
                  ["?x", ":n/p", "?z"],
                  ["parent", "?z", "?y"],
                ],
              },
            ],
          }),
          { basis: latest },
        ),
      ),
    );
    assert.deepEqual(recursive, [{ "?y": "n:2" }, { "?y": "n:3" }]);
    const explain = await Promise.all([run(t.explain(plain)), run(t.explainPage(wrapped))]);
    assert(explain.every((plan) => plan.queryPlan?.backend === "datomic-datalog"));
    const log = await client.log(db, "0");
    const commits = log.rows.filter((row) => row.kind === "commit");
    assert.equal(commits.length, 3);
    assert.deepEqual(
      (await client.log(db, String(BigInt(commits[0]!.t) + 1n))).rows.filter(
        (row) => row.kind === "commit",
      ),
      commits.slice(1),
    );
    assert.deepEqual((await client.log(db, log.nextT)).rows, []);
    for (const [i, commit] of commits.entries()) {
      const operation = await client.operation(db, commit.transaction.operationId);
      const receipt = [first, second, next][i]!;
      assert.deepEqual(
        [
          operation.status,
          operation.operationId,
          operation.t?.v,
          operation.position?.v,
          operation.recordedAt?.v,
        ],
        [
          "committed",
          commit.transaction.operationId,
          commit.t,
          String(receipt.position),
          receipt.instant,
        ],
      );
    }
    return {
      db,
      receipts: [first, second, next],
      matched,
      datalog,
      optional,
      order: [page1.results, page2.results],
      counts: [page1.totalCount, page2.totalCount],
      dependencies,
      complete,
      typed: { ...typed, older },
      exact: {
        binding: exact[0]?.["?int"],
        number: exact[0]?.["?num"],
        negativeZeroRejected: true,
      },
      implicitNumericPage: { recordedAt: implicit.basis?.recordedAt, results: implicit.results },
      recursive,
      explainBackend: explain.map((plan) => plan.queryPlan?.backend),
      log: commits.map((row) => row.transaction),
      physical: commits.map((row) => [row.t, row.transaction.operationId]),
    };
  });
}

// [DX-W1] Why: use identical saves and verify every recorded result outside each latency sample.
// Rejected: attributing differences in row count or an unverified acknowledgement to query coverage.
export function queryCost(url: string, nonce: string, layout: Layout, covered: boolean) {
  return withScope(url, nonce, layout, null, async (t, rt, client, db) => {
    const run = rt.runPromise;
    const writer = await client.request<{
      database: string;
      ledger: boolean;
      packedJournal: boolean;
      packedJournalCount: number;
      leanNativeQuery: boolean;
      installedDefinitionMatches: boolean;
      selectedDefinitionSha256: string;
    }>("GET", `/v2/db/${db}/write-options`);
    assert.equal(writer.database, db);
    assert.equal(writer.ledger, true);
    assert.equal(writer.packedJournal, false);
    assert.equal(writer.packedJournalCount, 0);
    assert.equal(writer.installedDefinitionMatches, true, JSON.stringify(writer));
    assert.match(writer.selectedDefinitionSha256, /^[a-f0-9]{64}$/);
    assert.equal(writer.leanNativeQuery, covered);
    const seed = await run(
      t.transact(Array.from({ length: 48 }, (_, i) => a("e:" + i, ":field", "seed"))),
    );
    let last = seed.triples[0]!;
    const samples = [];
    let requests: DatomicRequestSample[] = [];
    client.onRequest = (request) => requests.push(request);
    for (let n = 0; n < 64; n++) {
      const expected = "value:" + n;
      requests = [];
      const start = performance.now();
      const committed = await run(
        t.transact([{ op: "retract", id: last.id }, a("e:0", ":field", expected)], {
          commandId: "save:" + n,
        }),
      );
      const saved = performance.now() - start;
      const write = requests.find((entry) => entry.path.endsWith("/transact"));
      assert(write && write.status === 200 && write.position === committed.position);
      assert(write.datoms !== undefined && write.datoms > 0);
      assert.equal(committed.position, seed.position + n + 1);
      assert.equal(committed.retracted, 1);
      last = committed.triples[0]!;
      const stored = await run(t.get(last.id));
      assert.deepEqual(stored, last);
      assert.deepEqual(last.value, { type: "string", value: expected });
      const read = performance.now();
      const basis = { ...cut, recordedAt: committed.instant };
      requests = [];
      const answers = covered
        ? results(
            await run(
              t.query(
                {
                  find: ["?v"],
                  where: [["e:0", ":field", "?v"]],
                },
                { basis },
              ),
            ),
          )
        : (
            await run(
              t.match({ entityId: owner("e:0"), attribute: Attribute.make(":field") }, basis),
            )
          ).map((row) => ({ "?v": row.value.value }));
      const readMs = performance.now() - read;
      assert.deepEqual(answers, [{ "?v": expected }]);
      const response = requests.find((entry) => entry.path.endsWith(covered ? "/q" : "/read"));
      assert(response && response.status === 200);
      samples.push({
        n,
        command: "save:" + n,
        position: committed.position,
        id: last.id,
        saved,
        readMs,
        expected,
        write: [write.requestBytes, write.responseBytes, write.datoms],
        read: [response.requestBytes, response.responseBytes],
      });
    }
    return { db, nonce, covered, layout, writer, samples };
  });
}
