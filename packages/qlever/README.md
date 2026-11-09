# Triplex on QLever

This independent backend is under qualification against the complete ten-goal
contract. It uses QLever RDF storage, native SPARQL queries and SPARQL Update.
It does not execute XTDB SQL or use another database under QLever.

```ts
import { Effect } from "effect";
import { EntityId, Triples, integer } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "@triplex-build/triplex-qlever";

const layer = makeQleverRuntime({ url: "http://127.0.0.1:7019" }).layer({
  scope: DatabaseScope.test("example"),
  capabilities: Capabilities.none,
});
const program = Effect.gen(function* () {
  const triples = yield* Triples;
  yield* triples.transact(
    [
      {
        op: "assert",
        entityId: EntityId.make("ledger:one"),
        attribute: ":amount",
        value: integer("9007199254740993"),
        validFrom: 1,
      },
    ],
    { commandId: "ledger:one:create" },
  );
  return yield* triples.queryAll({
    find: ["?amount"],
    where: [["ledger:one", ":amount", "?amount"]],
  });
});
await Effect.runPromise(program.pipe(Effect.provide(layer), Effect.scoped));
```

`makeQleverRuntime` composes the public `Runtime.define` contract with a shared
QLever client, `StorageAdapter` and `QueryExecutor`. Applications use Triplex's
existing schema, fact and transaction APIs. Datalog queries read relations;
rule declarations define query programs. Asserting, retracting and batching
application facts always use transactional mutation APIs. There is no implicit
application write caused by a query.

Each Triplex assertion has an immutable identity, represented by an RDF subject
inside a scope-specific named graph. RDF triple deduplication therefore does
not collapse separate assertions. Valid-time and recorded-time coordinates
are explicit Triplex metadata. Retained assertion and retraction coordinates
allow logical source-position snapshots across fresh connections; document or
RDF version history is not used as a substitute for assertion history.

Callbacks stage rows over a fixed committed source position. Triple reads and
Datalog queries receive that source and its pending overlay. Nested callbacks
have isolated child state: failed children discard their changes; a successful
child conflicts if its parent changed concurrently. Explicit historical
Datalog inside a pending callback is currently rejected. The adapter submits
one conditional `DELETE/INSERT WHERE` operation containing facts, claims,
journal facts, source position and an operation marker. Built-in data-only
commands retry confirmed source conflicts; arbitrary callbacks execute once
unless explicitly declared replay safe.

HTTP submission, processing, durable operation-marker lookup and reader
visibility are separate observations. A transport failure does not prove
rollback. Unresolved operations return `TransactionOutcomeUnknown` with
operation and attempt identities. Caller command IDs provide application replay
identity. Interruption after the commit boundary can be observed after a commit;
applications recover using their command ID. Anonymous process loss without a
previously known identity has no durable replay guarantee.

Full finite binary64, signed int64 and temporal payloads are retained as lexical
strings. QLever 0.6.0 natively uses signed 60-bit integers and a 49-bit floating
mantissa. Native probes observed int64 maximum becoming `-1` and
`1.0000000000000002` becoming `1.0`; raw native numbers cannot implement Triplex's
full value contract. Fixed-width hexadecimal order keys preserve numeric
comparison and extrema without numeric coercion. Exact int64 sums use two
bounded 32-bit contribution channels accumulated by QLever, then reconstruct
two scalar outputs and check signed-64-bit overflow. Contributions are capped
at 100,000 rows. Ordinary-number SUM currently requires proved bounded integral
inputs. AVG uses a proved bounded integral SUM and count followed by one
binary64 result decode; filters and ordering over that decoded AVG remain
unsupported. Arbitrary floating SUM and computed arithmetic remain open
capabilities. Bounded binary recursive rules and optional scalar projections
have focused public tests; broader query compatibility remains under qualification.

Text and namespace identifiers require well-formed Unicode. Isolated JavaScript
UTF-16 surrogates are rejected before submission, preventing replacement-character
collisions in UTF-8 identity encoding. JSON strings retain isolated surrogates
through their escaped JSON representation. RDF literal generation also shields
literal backslash-u/U text from QLever's Unicode preprocessing; public tests
cover JSON surrogates, emoji, combining characters and literal escaped paths.

The compact source strategy has a provisional admission limit of 32 logical
patterns, including nested clauses, rules and optional fields. This is a resource
guard, not a demonstrated scaling bound. Three earlier query runs exhausted the
original 4 GiB development cap; those failed gates remain retained. A bounded
native family mask now summarizes candidate numeric types in one result row.
The compact strategy must pass fresh complete public qualification before any
compatibility claim is promoted.

`makeQleverTemporalQueries(client, scope).queryIntervals(query, options)` provides
a bounded interval API over the same Datalog AST. QLever discovers relevant
valid-time boundaries under one committed source cut, including nested negation,
dynamic attributes and optional projection fields. It evaluates each elementary
span through the normal query executor, then coalesces bounded final answers.
This baseline costs a source-cut query, a boundary query and one point query per
span, plus any numeric-domain probes. `maxSpans`, `maxSpanAnswerRows`, `maxRows`
and one overall deadline reject oversized work without returning partial answers.
Recursive interval answers are explicitly unsupported. Server-resident span
execution and larger-scale interval costs are still open gates.

The new `compact-v3` qualification profile uses QLever 0.6.0, commit `6c5861a`,
with the pinned ARM64-capable image, 4 GiB container memory and four CPUs. Its
native allocation is 512 MB, with four query threads, a 64 MB cache, 32 MB maximum
cache entry and planning budget 100. These limits do not include every server
allocation. The original 4 GiB profile with 2 GB allocation and sixteen threads,
and both 2 GiB experimental nodes, remain stopped and retained. Passing the new
profile does not pass the earlier failed gates. Port 7019 binds localhost. The
development `--no-access-check` configuration is not a production authentication
setup. Run `scripts/qlever-compact-v3-ready.py --configure` under the qualification
lease after each start; `--check` rejects a stale process receipt or changed native
budget. The runtime does not change global server settings automatically.

`--persist-updates` writes the complete native delta snapshot to a temporary
file and renames it before publishing the next reader snapshot. This creates
write and transient disk costs proportional to all retained delta triples.
Pinned-source review found unpublished delta mutation before persistence without
exception rollback on that path. This implies a risk that a later modification
publishes changes from a failed operation; single-modify failure atomicity remains
unqualified. A live native counterexample showed a failed
multi-operation request retaining its first INSERT. The adapter uses one modify
operation, but that alone does not repair failure atomicity. A globally fenced,
fail-closed managed writer is a future candidate, not an implemented guarantee.
Power-loss durability remains unqualified. Successful concurrent conditional
updates, cancellation during WHERE evaluation, clean restart and recovery after
a read-triggered OOM are narrower observations than crash-safe writes.

The common acceptance ledger and evidence live in [qualification](../../qualification/).
The competing implementations retain the same full ten-goal target and entity,
fact, history, graph, presence and command scale dimensions. Passing the small
storage fixtures does not pass upstream conformance, the workload packet, large
scale, recovery or the complete ten-goal system.

## Schema-aware native SPARQL

`makeQleverNativeQueries(client, scope).select(contract, parameters, build, options)`
is a separate application-facing query surface. The builder authors SPARQL;
it does not produce or compile Datalog. Existing Triplex schema attribute
handles select the typed assertion payload and its committed temporal guards:

```ts
const Balance = Attribute.int64(":account/balance");
const Account = EntityType.make("Account", {
  attributes: { balance: Attribute.use(Balance) },
});
const result = await Effect.runPromise(
  makeQleverNativeQueries(client, scope).select(
    {
      name: "large-accounts",
      parameters: TypeExpr.struct({ minimum: TypeExpr.required(TypeExpr.int64) }),
      row: TypeExpr.struct({ account: TypeExpr.required(TypeExpr.text), balance: TypeExpr.required(TypeExpr.int64) }),
    },
    { minimum: integer("9007199254740993") },
    (view, input) => `SELECT DISTINCT ?account ?balance WHERE {
      ${view.fact("?account", Account.balance, "?balance", { order: "?balanceOrder" })}
      FILTER(?balanceOrder >= ${view.integerOrder((input as { minimum: { value: string } }).minimum.value)})
    } ORDER BY ?balanceOrder ?account LIMIT 20`,
    { basis: { validAt: 100 }, includeRaw: true },
  ),
);
```

The returned basis contains the scope, source position and valid/recorded-time
coordinates. Supply that basis on later independently authored page queries to
retain the same cut. Native pagination is explicit SPARQL `ORDER BY`/`LIMIT`;
this facade does not infer a universal cursor for arbitrary native programs.
Contracts validate parameters and decode declared row domains. `TypeExpr.any`
retains RDF bindings, including term kind, datatype, language and unbound fields;
`includeRaw` retains those protocol terms alongside a declared decode.

Trace parameter evidence preserves negative zero as
`{ type: "float64", bits: "8000000000000000" }`, because ordinary JSON would
serialize it as positive zero. This carrier describes evidence only; decoded
parameters and result values remain ordinary JavaScript numbers.

The mapping stores full int64 and binary64 payloads as lexical strings. Use the
integer and number order channels for exact comparisons. `nativeNumber` rejects
values that the pinned QLever arithmetic cannot represent exactly, including
negative zero. Raw native casts, arithmetic and aggregate expressions retain
QLever's native precision; a row type does not repair precision already lost in
an authored expression. Native expressions such as `CONTAINS`, `CONCAT`, grouping
and property paths remain available where the chosen RDF relations support them.

Writes continue through the Triplex transaction APIs and share the same history
and receipt store with the Datalog path. The facade exposes reads only. Builders
are trusted application code, and raw SPARQL can address relations outside the
supplied cut fragments; the helpers are not an authorization sandbox.

The fresh owned gate in `qualification/evidence/qlever-native-entry-*.json`
checks public compiled exports, exact values, native joins and history cuts.
Those are small functional fixtures. The original profile descriptions above
remain historical; current task-owned server identity and quotas are recorded
under `.runtime/engines/` and the development controller's resident receipts.

`queryLimits.aggregateAnswerPlan: "bounded"` is an explicit alternative for
Datalog aggregates whose decoded values cannot be ordered exactly by QLever's
native arithmetic. QLever performs source joins, grouping, aggregation and
supported HAVING predicates. The adapter consumes the complete final group
population, capped by `maxAggregateAnswerRows` (default1000), before applying
inner order/offset/limit and wrapper filtering/count/order/cursor/limit. The
response byte budget still applies; overflow rejects the whole answer. The
adapter work is included in execution time and debug plans. This plan never
loads source facts for host evaluation and is not a high-cardinality aggregate
solution. The default native strategy retains its explicit unsupported errors.

See [Native SPARQL reads](./NATIVE-QUERIES.md) for compiled public API examples,
literal entity carriers, shared basis/result guarantees and the optional owned
relation-maintenance path with explicit receipt and cleanup costs.

## HTTP connection mode (EXP-QNODELAY)

`makeQleverClient(url, { connectionMode: "per-request" })` and
`makeQleverRuntime({ url, connectionMode: "per-request" })` opt into a new HTTP/1.1
socket for every query, update and command. The default is `"keep-alive"`.
The lab can explicitly select either mode with `TRIPLEX_QLEVER_CONNECTION_MODE`;
an explicit factory option takes precedence, and invalid selections throw.

The fresh-socket transport uses Node HTTP/HTTPS with `agent: false`, preserves
request signals, deadlines, authentication and response byte limits, and targets
the QLever endpoint directly (redirect responses are HTTP errors). Cancellation
still uses QLever's separate WebSocket protocol. Closing a client has no pooled
fresh sockets to dispose. This option addresses the stock server's keep-alive
stall; it is not a server TCP_NODELAY patch or a P1/P4 acceptance claim.
