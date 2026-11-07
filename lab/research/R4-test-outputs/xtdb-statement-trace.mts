// Mock XtdbClient: records every submit() so we can see how one Triplex transact becomes XTDB statements.
// No network, no engine. Run: cd packages/xtdb && pnpm exec tsx ../../lab/research/R4-test-outputs/xtdb-statement-trace.mts
import { Effect, Layer } from "effect";
import { EntityId, Triples, string, number } from "/Users/sam/projects/triplex-db-2/packages/xtdb/node_modules/@triplex-build/triplex/dist/index.js";
import { Capabilities, DatabaseScope, Runtime, StorageAdapter, QueryExecutor } from "/Users/sam/projects/triplex-db-2/packages/xtdb/node_modules/@triplex-build/triplex/dist/runtime/index.js";
import { makeXtdbStorageAdapter } from "/Users/sam/projects/triplex-db-2/packages/xtdb/src/XtdbStorageAdapter.ts";
import { makeXtdbQueryExecutor } from "/Users/sam/projects/triplex-db-2/packages/xtdb/src/XtdbQueryExecutor.ts";

const submits: { sql: string; params?: readonly unknown[] }[][] = [];
const client: any = {
  async query(sql: string) {
    if (/FROM tx_attempts/.test(sql)) return [{ operation_id: "x" }]; // receipt found
    return []; // position 0, no claims, no rows
  },
  async submit(statements: any[]) { submits.push(statements); return {}; },
  async close() {},
};
const scope = DatabaseScope.test("trace");
const adapter = makeXtdbStorageAdapter(client, scope);
const runtime = Runtime.define({ name: "trace", storage: Layer.succeed(StorageAdapter, adapter), queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scope)) });

const summarize = (stmts: { sql: string; params?: readonly unknown[] }[]) =>
  stmts.map((s) => {
    const t = /^(ASSERT|INSERT INTO (\w+))/.exec(s.sql);
    const rows = t?.[2] ? (s.sql.match(/\(TIMESTAMP WITH TIME ZONE/g) ?? []).length : undefined;
    return t?.[2] ? `INSERT ${t[2]} x${rows}` : s.sql.slice(0, 60);
  });

const program = Effect.gen(function* () {
  const t = yield* Triples;
  const scenarios: [string, any[], any][] = [
    ["1 string assert, no meta", [{ op: "assert", entityId: EntityId.make("e1"), attribute: ":a/b", value: string("x"), entityType: "Thing" }], undefined],
    ["1 assert + commandId + actor", [{ op: "assert", entityId: EntityId.make("e2"), attribute: ":a/b", value: string("x"), entityType: "Thing" }], { commandId: "c1", actor: "me" }],
    ["5 asserts, 1 entity", [1,2,3,4,5].map((i) => ({ op: "assert", entityId: EntityId.make("e3"), attribute: `:a/b${i}`, value: string("x"), entityType: "Thing" })), undefined],
  ];
  for (const [name, ops, meta] of scenarios) {
    const before = submits.length;
    yield* t.transact(ops, meta);
    const s = submits.slice(before);
    console.log(`\n== ${name}: XTDB submit() calls = ${s.length}`);
    for (const line of summarize(s[0]!)) console.log("   ", line);
  }
});
await Effect.runPromise(program.pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));
