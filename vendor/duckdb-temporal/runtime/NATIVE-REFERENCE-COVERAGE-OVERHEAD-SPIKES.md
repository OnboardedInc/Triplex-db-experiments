# Three bounded native write-cost hypotheses

Updated after actual public-path statement attribution. Three isolated source
implementations are now prepared; none is promoted or performance-qualified.
Their first focused engine slices precede the fixed cost comparison. These experiments address the *same* small write workload;
the separate historical audit/monotone-PATCH problem is not folded into them.

The retained first receipt is
`evidence/native-reference-coverage-cost-first-20261106/receipt.json`
(`92983779…`), harness source `cf7f0d86645383944cac77c2f49e331428c75a33`.
Both zero-policy orders show ACK p50 ratios1.421218/1.416537; native SQL-call p50
ratios1.421787/1.417611. That interval includes parse/bind/execute, not exclusive
operators. The hypothesis that the new guard's empty CTAS/planning explains the
roughly33ms difference is now supported by the [actual statement capture](evidence/coverage-command-profile-pair-20261106.json): the added guard has231operators,30.362ms query time and21.769ms optimizer time. These timers overlap; parser metrics are absent.

## Common frozen comparison

Keep SDK43c/entityJS19c2, all public methods and canonical facts/IDs/receipts/cuts
unchanged. Use the same six fresh-process matrix: zero-policy 2f→candidate and
candidate→2f; candidate-only unrelated and eight unchanged incoming edges.
Four warmups, sixteen measured patches, three populated opens/revalidations,
noise0:1, readers1, threads4,128MB memory,64MB spill, UV4, no retained-cap override.
No large profile, OOM retry, favorable numerical rerun or threshold change.
Candidate artifact/source admission must be explicit and reviewed; do not relabel
a new image as qualified a562 or loosen the original cf7f pin checks silently.
Any harness adaptation may change only the approved candidate identities/source
labels, with the measured loops/oracle/profile shown unchanged by source diff.

Budgets declared by the parent *before implementation*:

- No-policy median ACK≤1.05×2f in **both orders**, p95≤1.15×2f.
- Unrelated/incoming write, populated-open and revalidation p50≤1.10×their
  qualified a562 controls. An explicit new tradeoff must be declared and reviewed
  before a different experiment; it cannot retroactively pass these budgets.
- Preserve full typed/history/replay/old-cut/rollback/cap/cleanup correctness and
  the128MB/64MB settings. Sixteen samples are only an engineering screen.

The frozen a562 references are unrelated ACK/open/revalidate p50
113.901375/412.072875/293.251792ms and incoming
114.765916/1935.819458/2066.883500ms. Their1.10×limits are respectively
125.2915125/453.2801625/322.5769712ms and
126.2425076/2129.4014038/2273.571850ms. Keep fresh matched controls and the original
reference receipt visible; do not substitute a slower convenient control.

## 1. Fuse the proof with existing command validation

**Hypothesis:** avoid adding a separate CTAS/DROP and share materialized metadata
with `__td_native_guard`. Current put/patch append the separate guard after the
existing guard (`temporal_command.cpp:276,287`); the original validation CASE ends
at203–204. Factor coverage CTE construction and its error CASE, then feed it from
a materialized original-admission row so ownership/identity/history/retention/
uniqueness errors still precede coverage. Final references must force admission
even when policies, candidates or islands are empty.

The batch boundary needs care: `admission_sql` validates first, then inserts
carried pieces into pending (`temporal_batch.cpp:173–181`); coverage currently
runs after that (`275–280`). Do not move the check ahead of carries accidentally
or duplicate canonical fragment-ID generation. A bounded batch version can reuse
its existing guard table after carries rather than allocate/drop a second table;
if that still binds a separate equally expensive proof, report that limitation.

Owned files: coverage header, command generator, batch generator, focused tests.
No persistent state or startup maintenance. Stop if fusion changes error priority,
empty-input admission, carried original-validator policy, receipt bytes, or needs
a second production strategy. Even a correct fusion may save little if A's trace
shows view expansion rather than extra DDL dominates.

## 2. Derive a typed policy relation from audited canonical IR

**Hypothesis:** remove repeated volatile schema compilation/JSON re-encoding from
the guard's policy view. Currently `schema_reference_coverage` calls
`td_schema_references_v2(s.dsl,s.ir)` and `json_each` (`catalog.sql:27–31`). Its
scalar is volatile (`temporal_datalog.cpp:724`) and recompiles canonical DSL/IR
inside each callback batch (`585–614`), with reuse local to that callback.

First try the smallest typed **view** over canonical IR entities/attributes,
filtering schema/5 `reference_policy=coverage`, retaining exactly the existing
five policy columns. Registration already writes canonical IR from the C++
compiler and mandatory audit binds it back to DSL; preserve that proof. Old
schema/1..4 rows contribute no coverage policy, and every edge still joins its
original validator version. Keep `schema_references` and old public shapes intact.

Owned files: catalog view and focused policy/legacy tests; matching embedded
catalog/owner artifacts must be rebuilt normally. A pure view adds no data-write
maintenance or stale cache. If measured evidence later justifies a persistent
typed projection, require same-transaction registration updates, exact rebuild/
audit on reopen/revalidation, rollback/replay tests and old-writer freshness
behavior first; that is a larger second slice, not an implicit part of this one.
Stop if canonical equivalence or old IR/hash/replay changes. Reject on cost if
policy decoding is not a material contributor; it need not solve all binding.

## 3. Rebuildable typed policy storage

Test an exact typed five-column policy table against the same canonical view.
Canonical IR and the view remain authoritative; ordinary fact writes do not
maintain the projection. Schema registration updates only its immutable version
inside the same command/caller transaction. Startup reconstructs support after
literal format/revision admission, and activation/revalidation compares both
multiset directions before using it. A stale projection must refuse publication;
normal reopen/bootstrap rebuild is the repair path. Preserve old IR/hash bytes,
version/original-validator policies, delayed replay and canonical history.

Hypothesis: a typed physical relation and engine statistics reduce the large
optimizer input in the empty-policy case. This is unmeasured. Charge startup,
registration, audit and physical storage in the same matrix; do not describe the
table as free or use it as a second schema authority. Stop if this requires a
new application mode or broad mutation framework. Root's initial source review
found rebuild before literal format admission; the narrow repair must precede
its first engine attempt. Focused tests cover zero-policy IR4, version evolution,
caller rollback and missing/surplus support refusal plus rebuild.

## Rejected preprocessing specialization shortcut

The earlier native-specializer idea is retained as a constraint, not the current
third implementation. Current CAPIv2 entity_command ignores its opaque context;
never cast it. Pinned DuckDB preprocesses PRAGMA in
RunFunctionInTransactionInternal (statement_preprocessor.cpp69–77), committing
an autocommit preprocessing transaction (client_context.cpp1248–1283) before
expanded command execution (client_context_execution.cpp33–50). A cached policy
absence read at that point does not prove execution-snapshot absence. Any future
native hook needs a separately proved transaction/lifetime seam and maintenance
justification. The three current approaches remain ordinary transaction-visible
DuckDB relations and preserve one application strategy.

All three retain32 proof entities,4096 physical covered candidates/events/islands,
65536 logical comparisons and1MiB staging admission. A screen winner still needs
full canonical/type/lifecycle regressions and relevant larger-history/resource/
fair-workload gates before promotion. The separately retained growth OOM is
reproduced without coverage in2f; its internal audit stage remains open.
