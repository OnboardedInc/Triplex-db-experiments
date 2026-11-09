# Triplex on XTDB

Independent, experimental XTDB 2.2 runtime for the pinned Triplex source fork.
This implementation is under qualification. The ten-goal completion target is
tracked in `qualification/`; passing upstream conformance alone is insufficient.

## Run locally

From the repository root:

```sh
node scripts/xtdb-resources.mjs
docker compose -f compose.xtdb.yaml up -d
pnpm --filter @triplex-build/triplex build
pnpm --filter @triplex-build/triplex-testkit build
pnpm --filter @triplex-build/triplex-xtdb build
XTDB_INTEGRATION=1 pnpm --filter @triplex-build/triplex-xtdb test
python3 scripts/xtdb-oracles.py
```

The service binds only `127.0.0.1:5442`. The local development endpoint has no
production authentication setup. Persistent log and storage live in `.xtdb/data`.
Do not remove these files or use volume-removing commands to reset tests. Tests
use fresh logical database scopes and retain their data and evidence.

## Public application surface

```ts
import { Effect } from "effect";
import { Triples, EntityId, string } from "@triplex-build/triplex";
import { DatabaseScope, Capabilities } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "@triplex-build/triplex-xtdb";

const runtime = makeXtdbRuntime({
  url: "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb",
});
const layer = runtime.layer({
  scope: DatabaseScope.make({ env: "dev", tenant: "example", database: "main", generation: 0 }),
  capabilities: Capabilities.none,
});
const program = Effect.gen(function* () {
  const triples = yield* Triples;
  yield* triples.transact(
    [
      {
        op: "assert",
        entityId: EntityId.make("person:alice"),
        attribute: ":person/name",
        value: string("Alice"),
      },
    ],
    { commandId: "create-alice-1" },
  );
  return yield* triples.query({
    find: ["?name"],
    where: [["person:alice", ":person/name", "?name"]],
  });
});
await Effect.runPromise(program.pipe(Effect.provide(layer), Effect.scoped));
```

Queries read Triplex Datalog. Rule declarations define relations; assertions,
retractions and batches use Triplex's mutation APIs. Queries may allocate internal
working relations but never implicitly assert application facts. Persisting
derived facts is an explicit Triplex transaction.

Recursive rules currently implement the pinned Triplex binary identity rule
contract, including its `maxDepth` bound (default 100). XTDB evaluates successive
server-resident relation sets at one source cut. Reaching that declared depth
returns bounded reachability; it does not establish an unbounded fixed point.
Completed general strata, recursive interval answers and explicit unbounded
fixed-point declarations remain acceptance items.

## Transaction boundary

XTDB transactions are non-interactive. The adapter stages callback operations
over a fixed logical source position, including pending reads, and submits one
guarded atomic batch. Built-in data-only commands may retry confirmed position
conflicts; arbitrary callbacks require explicit replay safety. Application
precondition conflicts are terminal.

Public Datalog inside the callback uses the same source cut plus a bounded local
delta sent to XTDB as a relation. Nested callbacks use isolated staged savepoints;
rolling one back preserves successful siblings, and a successful savepoint that
would overwrite intervening sibling changes fails with a serialization conflict.

Interruption before submission discards staged changes. A possibly submitted
operation must resolve its durable outcome; a connection failure does not prove
rollback. Unknown outcomes carry operation/attempt identifiers for recovery.
Caller-supplied command IDs remain the durable application replay identity.

`resolveXtdbOperation(client, scope, operationId)` resolves an unknown operation
to its committed position and attempt identity. A missing marker returns
`unresolved`; it never implies rejection or permission to replay blindly.

Native submission, successful processing and visibility on subsequent readers
are separate boundaries. The adapter waits for successful processing and reader
visibility before acknowledging success. Every assertion retains its own ID;
XTDB document-version history does not replace Triplex assertion identity.

## Value compatibility

| Value      | Public contract                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `number`   | Finite binary64; retains the existing Triplex numeric family.                                                                                                                                                |
| `integer`  | Exact signed 64-bit; `integer(bigintOrDecimalText)` returns a tagged canonical decimal payload. Number arguments are rejected.                                                                               |
| `datetime` | Finite binary64 epoch-millisecond payload, distinct from a valid-time or knowledge coordinate.                                                                                                               |
| JSON       | Preserves the pinned runtime's `JSON.stringify` projection, including object key order. Typed constraint identity separately uses canonical JSON. DuckDB's original source-byte identity differs explicitly. |
| Blob       | Retains content ID, MIME type, safe nonnegative size and optional filename. Queries project content identity.                                                                                                |

Native text fields and identifiers require well-formed Unicode. Isolated UTF-16
surrogates are rejected before submission because the UTF-8 transport otherwise
replaces them silently. JSON payloads retain escaped surrogate code units through
their lossless JSON-text carrier. This is an explicit encoding boundary.

Exact integer results and cursor values retain `{type: "integer", value: "…"}`.
Exact sums reject signed-64-bit overflow. Mixing exact integer and floating
domains requires an explicit supported conversion; no implicit float widening
is performed. Legacy backends that lack the new type reject it explicitly.
`TypeExpr.int64` adds the exact schema primitive; the existing `integer` schema
primitive and its content identity remain unchanged.

## Native XTQL and SQL reads

`makeXtdbNativeQueries(client, scope)` reads the same Triplex assertions and
journal used by `makeXtdbRuntime`. Writes and history continue through Triplex.
`select` executes authored XTQL; `selectSql` executes authored native SQL. Neither
query path compiles a Datalog AST. Parameters and rows are validated with the
existing Triplex `TypeExpr`/`TypeSchema` types.

```ts
import { Effect } from "effect";
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbClient, makeXtdbNativeQueries } from "@triplex-build/triplex-xtdb";

const client = makeXtdbClient(process.env.XTDB_URL!);
const scope = DatabaseScope.test("native-example");
const Counter = Attribute.int64(":native/counter");
const native = makeXtdbNativeQueries(client, scope);
const contract = {
  name: "example/counter",
  parameters: TypeExpr.struct({ entity: TypeExpr.required(TypeExpr.text) }),
  row: TypeExpr.struct({ counter: TypeExpr.required(TypeExpr.int64) }),
};
try {
  const xtql = await Effect.runPromise(native.select(contract,
    { entity: "native:subject" }, (ctx, decoded) => {
      const input = decoded as { entity: string }; // Already schema-validated.
      return `(-> ${ctx.facts()}
        (where (= entity_id ${ctx.bind(input.entity)})
               (= attribute ${ctx.attribute(Counter)}))
        (return {:counter value_string}))`;
    }, { basis: { validAt: 10.5 }, includeRaw: true }));

  const sql = await Effect.runPromise(native.selectSql(contract,
    { entity: "native:subject" }, (ctx, decoded) => {
      const input = decoded as { entity: string };
      return `SELECT value_string AS counter FROM ${ctx.facts()} f
        WHERE entity_id = ${ctx.bind(input.entity)}
          AND attribute = ${ctx.attribute(Counter)}`;
    }, { basis: xtql.basis })); // Reuse the complete resolved source cut.
  console.log(xtql.rows, sql.rows);
} finally {
  await client.close();
}
```

These signatures and native query forms run through compiled public exports in
`experiments/native-entry.ts`. Its fixture writes a counter before reading it;
the example above reads an existing counter. An `int64` result retains the
canonical tagged decimal value without passing through `Number`. `TypeExpr.any`
and `includeRaw` retain native data rather than guessing scalar families.
Runtime-authored `TypeExpr` contracts return validated `unknown` rows; they do
not assert an unchecked caller-supplied TypeScript generic.

`ctx.facts()` closes scope, knowledge position, optional recorded time and
half-open valid time. `ctx.recordedFacts()` uses the same knowledge cut over all
business-time intervals. `ctx.history()` includes known retracted assertions
and masks retraction metadata not known at the cut. Fractional times remain
binary64 coordinates. Use `ctx.bind` for values and `ctx.attribute` for schema
handles; authored SQL uses native `$n` parameters. The XTQL wrapper keeps native
question marks and dollar-quoted text out of the legacy placeholder rewriter.

Numeric parameters preserve negative zero through the float8 transport. Native
trace evidence encodes negative zero as
`{ type: "float64", bits: "8000000000000000" }`, because ordinary JSON prints both
signed zeros as `0`. This tag describes evidence; query values and decoded rows
remain native numbers. Use the existing runtime `nativeEvidenceValue` helper
before JSON when deriving native parameter or application-owned cursor digests.
The facade does not infer a cursor identity for arbitrary native programs.

`selectSql` rejects mutation/control statements and multiple statements. These
are trusted native query builders, not a general query sandbox. Raw native table
access does not automatically inherit helper cuts, authorization, portable
Datalog errors or pending-transaction overlays. Native-only expressions remain
available; the matched71-case library qualifies those authored tasks separately.

`maxRows` rejects an oversized complete result instead of returning a partial
answer. Paging is explicitly authored at `result.basis`. Cancellation bounds the
caller's wait; a client abort alone does not prove backend resource reclamation.

`selectSqlWithReachability(contract, input, definitions, build, options)` (SQL) and
`selectWithReachability(...)` (XTQL) answer bounded closures with reads only (contract
C8, EXP-C8). Each definition's `edges(ctx, input)` returns columns `source,target` in
the call's language; optional `seeds(ctx, input)` (ids, or `{ query }` yielding `seed`)
restricts the relation to pairs from those starts, otherwise every source is closed.
The closure runs in the shared `frontierClosure` (`@triplex-build/triplex/runtime`) at
one resolved source cut and reaches the final builder as one inline parameter through
`ctx.relation(name)`. `strategy: "single-read"` (default) reads each edge relation once;
`"rounds"` reads once per frontier round. Exceeding pair, visited, edge, row or round
budgets fails with `RecursionBudgetExceeded`, never a partial closure. Nothing is written.

## Additional temporal and reuse APIs

`makeXtdbTemporalQueries(client, scope).queryIntervals(query, options)` evaluates
the existing Datalog AST over a bounded business-time window at a committed
source position. XTDB creates elementary spans, evaluates correlated relations,
and coalesces adjacent identical answers. Recursive interval evaluation is an
explicit open gate. Oversized answers fail rather than returning a partial set.

`makeXtdbMaintainedQueries(client, scope)` keeps complete generations keyed by source
position, query, compiler identity and temporal cut. `query(query, options)` is read-only
(C8): it returns a published generation when one exists and otherwise evaluates the same
answer directly, unpublished (`reused: false`). `publish(query, options)` is the write-path
call that stores a missing generation. This baseline does not claim incremental support
maintenance or automatic background refresh.

## Evidence and limits

Archived runtime-status documents and qualification receipts describe their
original builds. Current receipts use the portable-export policy and owned
engine identities. See the root `MOUNT.md` and `qualification/devloop/README.md`
for the quota-backed storage, shared resource queue and current admission rules.
The present local XTDB owner has a 3 GiB container cap. The hard owned disk limit
is 50 GB including the source ZIP; old 12 GiB policies are historical. Small fixture
passes do not establish ten-goal completion, final scale or latency acceptance.
