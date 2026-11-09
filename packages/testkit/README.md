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
`routes` with an ID, an explicit `snapshot` or `raw-lifetime` result contract,
an eligibility predicate, declared typed refusals, `force()`
and `read(request)`. The read returns every `TripleRow` column, the route actually
observed, and optionally a basis echo. Forcing belongs to the fixture, outside
the public request. Use outage, applier pause, disabled-H1, cold cache and
current/as-of switches in adapters as appropriate.

```ts
import {
  generateRouteHistory,
  makeOfflineRouteFixture,
  makeRouteEquivalenceCases,
} from "@triplex-build/triplex-testkit/route";

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
valid-time corrections, future-valid rows and same-millisecond ties. Each generated history also records
nested callback ordinals and their receipts, claims-only and position-only
commits, CAS-conflicting aborted attempts with proposed writes, controlled
staging/decision inversion on disjoint subjects, and a backwards clock step.
At least sixteen commits are required for every history family. Basis
families cover latest, valid edges, position boundaries and gaps, timestamp
boundaries, combined cuts, history and future positions. Pass `true` as the
second argument to `generateRouteBases` for the full cross product.

The gate checks replay exactness, pairwise equality, declared typed refusals,
at least one answering route, pinned-request repetition after append and
maintenance, ineligible flags, actual route IDs and optional basis echoes
(HE-1 through HE-7). Latest and valid-only reads are compared at each new head;
only named record-time or position requests under the `snapshot` contract must
repeat unchanged. Q89i masks **all three** retirement fields when the retirement
is after either part of the named cut. Every column remains compared; incorrect
in-cut metadata still fails. `raw-lifetime` routes return the whole lifetime and
are compared with the raw reference and other raw routes, separately from snapshot
routes. They are not subject to snapshot byte immutability. Availability is
also checked per contract; raw history cannot satisfy snapshot availability. Adapters must report the request's
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

Round 2 enforces a nonempty request set and a minimum of one **distinct** request
per required shape. The default scope requires L/V/P/T/TP/H; a narrower diagnostic
must explicitly declare `scope: { shapes: [...] }` and its positive
`minimumPerShape` (default 1). Filtering a qualification run to fewer shapes
without declaring the scope is an error. `requireRouteCoverage` additionally
measures every R31 history witness and boundary cut from the row ledger and
attempt/receipt identities. The offline gate fails when any required family or
cut is missing and embeds this measured denominator plus actual per-shape
answer/refusal counts in its receipt for five seeds.

Pinned and unpinned retention horizons are planned before requests are frozen;
both h and h-1 are included, as are committed interior ordinals and proven abort
gaps. Drivers receive the exact horizon and pin mode with each purge event.
Events return evidence (`applied`, `model-applied`, or `pending`). Engine index
jobs, block flush and compaction are explicitly pending in offline models; a
no-op callback cannot qualify them. Overlay eviction, catch-up and cold-cache
transitions remain semantic model checks. The XTDB offline client driver names
its physical result as `raw-lifetime`; it does not claim the product adapter
already supplies the Q89i snapshot view.

Round 3 validates the history grammar before generation returns and before planning,
folding, basis generation or coverage measurement uses it. Integer nested members
must form a complete declared `size`, have ordinals 1..size, consecutive receipt
positions and contiguous stream membership. Attempted histories require every
committed receipt to match its unique attempt; assertion/retraction lifetimes and
CAS-abort declarations are checked as well. A requested count that truncates a
nested group (for example 25) throws instead of emitting an invalid history.

Every driver declares `retention: { kind, plan(history, extension) }`. A complete
store may declare no cuts. A `position-retired` store must declare at least one
cut with a unique ID, event (`purge` or `purge-pinned`), horizon and pin mode.
`makeRouteExecutionPlan` copies and freezes the history, append, policies and
requests and gives them a canonical SHA-256 digest. Bare appends to an attempted
history receive an explicit logical attempt/receipt in that plan; these are offline
model identities, not native engine receipts. Default request generation includes
every declared h/h-1; explicit request lists missing a boundary reject before reset.
Complete-store maintenance cuts are omitted only in explicitly narrowed diagnostic
scopes; position-retired stores' cuts remain mandatory in those scopes.

The runner executes those exact cut events with owning route IDs. An event must
confirm its actual `retirement: { horizon, pinned }`; pending or mismatched
retirement events cannot qualify. Equal declared cuts can share one event while
retaining every owner in the plan. Engine-only nonretirement events remain pending.
`requireRouteCoverage(result.plan.history, result.plan.requests, result.plan)`
checks the exact executed plan; it never reconstructs default append horizons.
Standalone `measureRouteCoverage` without a plan is structural diagnostic data and
cannot return `complete: true`.

## Datomic route fixture (EXP-DA01)

`makeRouteEquivalenceCases` compares fixture-provided routes at the same named
basis with an independent oracle, verifies declared refusals, route provenance and
basis echoes, then repeats after the fixture advances history. Fixtures supply the oracle and advance hook; `makeRouteEquivalenceScenario(seed)`
supplies a shared bounded history and named bases. The Datomic fixture exercises a
bounded six-subject, forty-position history against O-REPLAY; broader profiles can
reuse the runner. It does not replace the unchanged Triples conformance suite.
