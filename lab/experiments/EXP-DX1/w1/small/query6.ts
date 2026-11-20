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
const a = (id: string, attribute: string, value: string): TransactOp => ({
  op: "assert",
  entityId: owner(id),
  attribute: Attribute.make(attribute),
  value: { type: "string", value },
  validFrom: 0,
});

async function withScope<T>(
  url: string,
  key: string,
  layout: Layout,
  run: (
    t: typeof Triples.Service,
    rt: ReturnType<typeof runtime>,
    client: DatomicClient,
    db: string,
  ) => Promise<T>,
): Promise<T> {
  const client = new DatomicClient(url, 30000);
  const scope = DatabaseScope.test(key);
  const rt = runtime(client, scope, layout);
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
) {
  return ManagedRuntime.make(
    Runtime.define({
      name: "query6",
      storage: Layer.succeed(
        StorageAdapter,
        makeDatomicStorageAdapter(client, scope, { layout, serverRecordTime: false }),
      ),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    }).layer({
      scope,
      capabilities: Capabilities.none,
      deterministic: { startTime: 100, seed: "query6" },
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
  return withScope(url, nonce + "-" + layout, layout, async (t, rt, client, db) => {
    const run = rt.runPromise;
    const first = await run(
      t.transact([a("j:1", ":j/a", "one"), a("j:1", ":j/b", "two")], {
        actor: "client",
        commandId: "c1",
      }),
    );
    const second = await run(
      t.transact(
        [
          a("j:2", ":j/a", "three"),
          { op: "retract", id: first.triples[1]!.id },
          a("j:1", ":j/a", "four"),
          { op: "retract", id: first.triples[0]!.id },
        ],
        { actor: "client", commandId: "c2" },
      ),
    );
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
    const next = await run(
      t.transact(
        [
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
            attribute: Attribute.make(":n/z"),
            value: { type: "number", value: -0 },
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
        ],
        { actor: "client", commandId: "c3" },
      ),
    );
    const page2 = await run(
      t.queryPage({ ...wrapped, cursor: page1.nextCursor }, { basis: fixed }),
    );
    assert.equal(page2.nextCursor, undefined);
    assert.deepEqual(page2.results, [{ "?s": "j:2", "?v": "three" }]);
    assert.equal(typed.ownerPage.nextBeforePosition, second.position);
    const older = await run(
      t.transactionsForEntity(owner("j:1"), {
        limit: 1,
        snapshotPosition: typed.ownerPage.snapshotPosition,
        beforePosition: typed.ownerPage.nextBeforePosition,
      }),
    );
    assert.equal(older.transactions[0]?.txId, first.txId);
    const exact = results(
      await run(
        t.query(
          {
            find: ["?int", "?zero"],
            where: [
              ["n:1", ":n/i", "?int"],
              ["n:1", ":n/z", "?zero"],
            ],
          },
          { basis: cut },
        ),
      ),
    );
    assert.equal(
      exact[0]?.["?int"] && JSON.stringify(exact[0]["?int"]),
      JSON.stringify(integer("9007199254740993")),
    );
    assert(Object.is(exact[0]?.["?zero"], -0));
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
          { basis: cut },
        ),
      ),
    );
    assert.deepEqual(recursive, [{ "?y": "n:2" }, { "?y": "n:3" }]);
    const explain = await run(t.explainPage(wrapped));
    assert.equal(explain.queryPlan?.backend, "datomic-datalog");
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
      typed: { ...typed, older },
      exact: { binding: exact[0]?.["?int"], negativeZero: Object.is(exact[0]?.["?zero"], -0) },
      recursive,
      explainBackend: explain.queryPlan?.backend,
      log: commits.map((row) => row.transaction),
      physical: commits.map((row) => [row.t, row.transaction.operationId]),
    };
  });
}

// [DX-W1] Why: use identical saves and verify every recorded result outside each latency sample.
// Rejected: attributing differences in row count or an unverified acknowledgement to query coverage.
export function queryCost(url: string, nonce: string, layout: Layout, covered: boolean) {
  return withScope(url, nonce, layout, async (t, rt, client) => {
    const run = rt.runPromise;
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
      assert(write && write.status === 200);
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
    return { nonce, covered, layout, samples };
  });
}
