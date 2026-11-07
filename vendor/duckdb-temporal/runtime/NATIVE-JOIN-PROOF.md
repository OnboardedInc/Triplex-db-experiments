# Native EAV join admission

Implemented in extension 0.12.0. Six real-engine test methods and the full
integration suite pass; source-bound query measurements are recorded in
`evidence/native-join-benchmark.json`. This is a bounded source-coupled proof,
not a claim about arbitrary Datalog or physical allocation containment.

The slice admits one ordinary answer rule with two to four positive
EAV atoms, no filters/negatives/aggregates/ground facts/other relations. All
inputs share the existing validated active EAV set and one temporal cut.

For each atom, SQL first derives the exact set matching its constants and
within-atom repeated variables. It measures row count and maximum multiplicity
of columns whose variable occurs in another atom. These matching statistics
bound semantic bindings, separately from native candidate scans.

For any subset S of atoms, let M(S) bound the number of satisfying assignments
to its variables. M(empty)=1. For each possible last atom i, bound its matching
branch by its matching row count and the minimum maximum-key multiplicity of
each column bound by S\i. M(S) is bounded by the minimum of those products.

Native index work uses the full relevant EAV relation instead: measure counts
for individual literal-column indexes and maximum key multiplicities for bound
variable columns. An atom's candidate bound is the minimum of those index
bounds and the full base count. This deliberately includes rows rejected by
other literal/equality checks. At state S the greedy native chooser examines
at most the minimum remaining-atom candidate bound per partial assignment.

The authoritative nonrecursive stratified evaluator executes exactly one seed
pass (`run_completed`), charging once per scanned candidate (`evaluate`). A
partial assignment for a fixed S has at most one path: greedy choices are
deterministic for its bound values, and an EAV tuple is uniquely determined by
the atom's variables/constants in a set relation. Thus summing M(S) times the
minimum remaining candidate bound over all proper subsets is conservative,
including unreachable subsets. Use an additional factor two plus one as margin.

Saturate arithmetic above the largest native work limit. Saturated bounds are
never accepted as proof. Bound facts by base count + M(all), rounds by two,
and dictionary/output with the existing native model. Also bound every subset's
logical intermediate rows, cells and carrier bytes; none is physical heap
containment. Failed proof must select native evaluation, not a new rejection.

Lowering compares all five typed slots, uses BLOB string keys, joins atom sets,
projects DISTINCT and applies native typed output ordering. It must retain all
retained-carrier/schema checks even for an empty answer. All admission values
come from the execution's database, never from the caller or cached facts.

Required checks: independent native/SQL equality across body reorderings,
repeated variables, typed constants, self joins, empty/cartesian/path joins;
low-budget and rejected-index-candidate cases; changing data/cuts/rollback and
schema versions; full output verification on real persisted multi-attribute
fixtures; fair source-bound end-to-end timings including proof/statistics cost.

## Same-entity specialization

When every atom has the same entity variable, distinct literal attributes and
distinct value variables, one SQL grouping measures each entity's full relevant
row count g and per-attribute counts r_i. For nonempty S, the satisfying binding
count is sum_entities(product_{i in S} r_i): the value variables are independent
and every source EAV tuple is unique. This supplies the same subset bounds
without repeated index-frequency grouping or a chain of bound CTEs.

At the root, the native chooser scans at most the smallest total attribute
count. After any atom matches, its entity variable is bound, so the entity index
bounds every remaining candidate list by g. Sum product(r_i for i in S)*g over
entities and all nonempty proper subsets, add the root bound, then apply the
same factor-two-plus-one margin. Missing attributes do not erase rejected-index
work: a partial match still charges its full entity candidate bound. Saturated
products and any unproved intermediate/native/output bound fall back.

SQL join inputs are separately materialized behind the final admission result.
When proof fails they are empty before any Cartesian operator can run. The
adversarial test uses a 600^4 potential product and a native work budget of one,
then verifies failure and a healthy next command.

Executed checks include 22 SQL/native identities across two-to-four-atom
programs and reorderings, a work-budget sweep, conservative fact/round fallback,
typed constants and repeated variables, duplicate atoms, empty/cartesian/path
joins, set projection and temporal/schema evolution with prepared reuse. The
large fixture is ingested through the public native appender into the shared
canonical store and closed/reopened before both query routes. Every returned
row is checked. The measured same-entity specialization reduces proof overhead;
small joins still favor native execution on the selected workloads.

## Cost preference

The default thin API asks the C++ helper `td_prefer_native_v1` about the current
retained-row ledger before dispatch. Below 16384 retained rows it selects the
smaller native-only SQL plan (`preferred_native`); otherwise it tries the proved
SQL route. `forceNative: true` selects native explicitly; `false` tries SQL first.
Raw `td_query_store` continues to try SQL first. The helper is a cost heuristic,
not admission: it includes history/unrelated rows, may be stale under another
writer and does not skip any query check or change the selected query's cut.

The threshold test checks both sides, moves a real store from small to over
16384 retained assertions through native commands, and checks default-route
refresh and unchanged work-budget errors. The end-to-end benchmark rotates
native, SQL and automatic modes with full result verification; no host-side
query compiler, cached statistics or fact/result cache is introduced.

## One-atom anti-join candidate

The candidate admits one ordinary answer rule over one positive EAV atom and
one range-restricted negated EAV atom. Both read the same audited active set
at the requested cut. The native compiler validates the whole program and
remains the evaluator for bounded queries with other rule shapes. The
scalable entrypoint admits this exact slice alongside its existing plans.

Each negative variable uses its positive binding in every occurrence.
Membership compares all five typed slots with null-safe equality. DuckDB
uses an anti join over the admitted source for a correlated negative, or
one global existence check for a ground negative. The surviving positive
bindings use the existing typed DISTINCT projection. Blocking one binding
can leave the same answer supported by another binding.

Let N be the admitted active rows and P the rows matching the positive
atom before exclusion. The shared anti-join input and the survivors each
contain at most N source rows and bytes. The typed projection constructs
at most P rows before DISTINCT and charges a conservative width bound.
The native one-pass evaluator scans at most N candidates, charges at most P
negative lookups, and derives at most P facts. The bounded route uses the
existing native fact, work, dictionary, and output gates with these bounds.
If the proof fails, that call uses the authoritative evaluator. These are
logical row and byte proofs. Engine allocator and operator timing need their
own observations.

The focused real-engine gate is `node --test build/adapter/test-native-anti-join.js`
on the paired core and owner build. It compares both SQL entrypoints to
exact typed literals and forced native evaluation across correction cuts,
alternate support, repeated variables, ground negatives, empty answers,
and admission boundaries. Operator shape and performance remain separate
gates.
