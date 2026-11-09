# Experimental Datomic runtime

`makeDatomicRuntime({ url })` composes Triplex storage and Datalog over the lab's
Datomic Pro Peer gateway. Bind a scope and explicitly pass `Capabilities.none`:

```ts
import { makeDatomicRuntime } from "@triplex-build/triplex-datomic";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";

const runtime = makeDatomicRuntime({ url: "http://127.0.0.1:8470" });
const layer = runtime.layer({
  scope: DatabaseScope.test("isolated-fixture"),
  capabilities: Capabilities.none,
});
```

The gateway accepts the canonical identity text produced by `DatabaseScope.make`
(and `DatabaseScope.test`) for every environment. The reversible Datomic database
name is `s2-` followed by unpadded URL-safe Base64 of the scope text in UTF-8.
Decoding must reproduce the canonical tuple exactly: version `triplex-scope-v1`,
three strings nonempty under JavaScript trim, and a nonnegative safe integer.
Whitespace variants, string generations, blank identity fields and other tuple
versions are refused. Legacy hash names remain readable for retained DA00 proofs;
new create/delete operations use the reversible names. Each scope has its own database. Writes
stage in a fiber-local callback and publish through one scope-CAS transaction;
only explicitly replay-safe callbacks retry conflicts. Operation IDs resolve
lost acknowledgements. An unresolved outcome returns `TransactionOutcomeUnknown`.

Datalog patterns, predicates and existence filters execute in the Peer with an
allowlist and timeout. Fact witnesses preserve support multiplicity before the
bounded TypeScript aggregation and pagination kernel. Binary rules use bounded
frontier rounds, rather than native recursive Datomic rules. Callback reads use
held immutable databases and `d/with`; snapshot handles expire after two minutes.

Integer payloads remain canonical int64 text in TypeScript and Datomic longs in
storage. Binary64 values use doubles; sign metadata preserves negative zero when
the durable transactor normalizes it. Arithmetic never silently converts exact
integers to doubles.

This private package is a lab candidate. See `lab/experiments/EXP-DA01/REPORT.md`
for measured coverage and limitations. Native Datalog/pull, erasure, tenant
certification, production provisioning and P1-P5 performance qualification belong
to later experiments. Source and image versions must be deployed together through
`lab/bin/engine.mjs`; do not use a default Docker daemon.

The single codec definition is `src/codec-spec.json`: both runtimes load its
grammars and ranges. Shared accepted and rejected vectors in the gateway include
Java BigDecimal scale and exponent limits. Decimal text preserves coefficient
and scale; JVM output can normalize spelling (for example `-0.00` to `0.00`).

One Datalog execution holds one immutable database for all rule rounds, its final
query and optional pulls, and releases it on success or failure. Staged callbacks
reuse their held database and freeze their overlay for that execution. Named
positions above the available head wait up to 500 ms by default, then fail with
`DatomicBasisNotAvailable` (`ReadError`, code `BasisNotAvailable`). Gateway requests
may choose a bounded 1–2000 ms `basisWaitMs`; held snapshots never advance to satisfy
a future cut. Position lookups seek the AVET index, including sparse interior cuts,
and batch pulls enumerate each requested subject once.

The default read route retains full subject history and supports record-time cuts.
The gateway's qualification-only `route: "live"` pull uses the position-retired
`:f/live` index: it refuses record-time bases, history reads and interior logical
positions that are not physical transaction ends. Native EDN selecting that index
has the same basis guard. No TypeScript runtime option selects it by default.
G1 on Datomic also runs the seeded O-REPLAY route-equivalence fixture.

The native gateway fixes its input bindings to `:in $ $rules`: `$` is the held
Datomic value and `$rules` is an ordinary in-memory relation. Before execution,
it classifies every database pattern, including nested conjunctions, disjunctions
and negation. Only literal keyword attributes other than `:f/live` prove a
history-safe route. Variable, numeric, lookup-ref and omitted attributes are
conservatively subject to the same live-route guard, regardless of how they are
bound. They refuse T/TP and interior position cuts with `BasisNotAvailable`;
callers can use literal history attributes instead. This applies to vector and
map EDN queries. Allowlisted functions cannot issue queries or pulls themselves.
The required G1 fixture now also compares all query paths and basis families
with history before and after retirement, retaining exact IDs and typed refusals.

Native EDN is parsed exactly once into a canonical map; both classification and
Peer execution receive that map. Repeated `:where` sections concatenate their
clauses. Repeated `:in` and `:find` sections must agree exactly; conflicting ones
refuse with `InvalidValue`. `:with` bindings are deduplicated. Map/list section
values and supported nested logical clauses normalize recursively. Unknown
sections, trailing queries, native `%` rules/rule invocations, pull patterns and
non-variable projections cannot enter this closed gateway grammar and refuse
before execution. Triplex rules still use the bounded frontier executor, and
optional projections use pinned history pulls. Native route responses expose the
chosen `history` or `live` route for qualification assertions. The G1 fixture
also generates equivalent section layouts, clause orders and variable aliases,
then checks exact IDs and routes; nested Triplex rules run through the same gate.

The experimental native feed is `GET /v1/db/{db}/log?fromT=0&limit=1000&waitMs=0`.
`fromT` is an inclusive physical Datomic t; `nextT` is the next inclusive checkpoint.
Each response binds its database and lists every scanned transaction as `commit`
or `skipped` (`non-triplex`), including schema and excision transactions. Physical
transactions may cover several sparse Triplex positions. Report queues only wake
polls; replay always reads `tx-range`. Limits are 1–1,000 transactions and 0–30,000 ms.

`DatomicClient.log` validates response identities, order, checkpoints and feed
payloads. Connect it to the host's `datomicChangeFeed(source, { database, stream,
epoch, read: (t, n) => client.log(database, t, n, waitMs) })`. Bind `source`, `stream`
and `epoch` to the provisioned database generation; a restored/replaced database
needs a new source identity. Checkpoint consumer effects through the existing
host `SqliteConsumerStore`; the source receives no consumer writes.

The feed carries assertion identities and valid intervals, never values, envelopes
or key identifiers. Value-only excision preserves its bytes. Identity annotations
must remain available; removing them causes a typed refusal. Stamps use the
transaction's Triplex `recorded-at` annotation; fractional legacy annotations are
explicitly `pending-RT01` because the common stamp contract requires an integer.
The route refuses `:f/erased-in` events pending ER01-D's erasure-sequence annotation.
Offline qualification and the parked-peer runbook are in
`lab/experiments/EXP-DF01/`; offline results do not qualify real excision or P3 lag.
