# @triplex-build/triplex-testkit

Reusable backend fixture and capability helpers for testing Triplex adapters.

Install `@triplex-build/triplex-testkit` from npm with Node.js 22+ and the compatible Effect 4
release candidate.

`triplesConformanceCases` and `makeTriplesConformanceSuite` define the behavioral contract used by
the in-memory KV, SQLite, and opt-in PostgreSQL suites. The corpus covers atomic writes, typed
values, temporal reads, Datalog semantics, stable pagination, the transaction journal, command
receipts, checkpoints, derivations, and graph constraints. New backends should pass it before being
described as supported.

`runtimeConformance(definition, options)` builds a public `Runtime.define` or `Runtime.fromKv`
definition and runs that same corpus. Use a fresh isolated backend and choose capabilities
explicitly. This is a Triples contract check, not a guarantee of snapshot/emitter correctness,
crash durability, cross-process isolation, or migration safety.

MIT © 2026 Ben Jacobson.

## Route equivalence (EXP-RQ01 / Q89f)

`makeRouteEquivalenceCases({ fixture, history })` returns named async cases. A
fixture owns one isolated lane, loads the driver's commit log, and supplies
`routes` with an ID, an eligibility predicate, declared typed refusals, `force()`
and `read(request)`. The read returns every `TripleRow` column, the route actually
observed, and optionally a basis echo. Forcing belongs to the fixture, outside
the public request. Use outage, applier pause, disabled-H1, cold cache and
current/as-of switches in adapters as appropriate.

```ts
import {
  generateRouteHistory,
  makeOfflineRouteFixture,
  makeRouteEquivalenceCases,
} from "@triplex-build/triplex-testkit";

for (const test of makeRouteEquivalenceCases({
  history: generateRouteHistory(42),
  fixture: makeOfflineRouteFixture("qlever"),
})) {
  await test.run();
}
```

The default generator has six subjects and forty commits. Every seed includes
40-assert/10-retract groups, cardinality-many values, single retractions,
replacement in one transaction, assert/retract in one transaction, bounded
valid-time corrections, future-valid rows and same-millisecond ties. Basis
families cover latest, valid edges, position boundaries and gaps, timestamp
boundaries, combined cuts, history and future positions. Pass `true` as the
second argument to `generateRouteBases` for the full cross product.

The gate checks replay exactness, pairwise equality, declared typed refusals,
at least one answering route, pinned-request repetition after append and
maintenance, ineligible flags, actual route IDs and optional basis echoes
(HE-1 through HE-7). Latest and valid-only reads are compared at each new head;
only named record-time or position requests must repeat unchanged. Every column
is compared, including retirement metadata. Adapters must report the request's
explicit basis in `basis`; a richer resolved-basis echo should be checked and
translated by the lane driver before returning it. Results retain answer SHA-256,
count, route, request and phase, or the refusal tag. A case throws on any violation.

`runRouteEquivalence` returns violations for negative regressions. The SQL01 F1
fixture must produce 30 rows before purge and 40 afterward at the identical TP
request; it is a reproduction of the pre-fix selection algorithm, not execution
of SQL01. R31 D-C1 is explicitly **known-failing Q89a**: the test asserts HE-5
violations after a late staged commit. It is never silently skipped, and an
unexpected repair requires changing that assertion after review.

`makeOfflineRouteFixture` supplies **semantic models only** for XTDB all-valid-time
and cold/warm generations, and QLever replica, overlay, source after eviction,
outage source and H1 disabled. Their shared fold is not independent O-REPLAY and
they do not certify actual engines, cache invalidation, broker routing or storage
retention. Inject `reference: { name, answer }` to use an independent oracle.
`pendingRouteAdapters` explicitly lists SQL01 H1 and lane D's current/as-of,
held/with and multi-request adapters; unimplemented adapters are never counted as
passing routes. The XTDB lane additionally exercises its actual A0 adapter with
an offline SQL client double. Its future-position guard is a driver guard;
a separate known-failure test exposes A0's existing Q89c gap.

Run the source-bound offline gate from the checkout root through the lab wrapper:

```sh
node lab/bin/heavy.mjs --label CX-RQ01 -- node lab/experiments/EXP-RQ01/gate.mjs UNIQUE_ATTEMPT
```

The gate records source hashes, seed list, actual command exits and unchanged-source
status under `lab/experiments/EXP-RQ01/evidence/UNIQUE_ATTEMPT`. No engines are used.
