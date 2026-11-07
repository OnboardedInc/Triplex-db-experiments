# Integrated ten-goal ledger

## Completion checklist

Use the evidence and gaps below as the baseline. Close each item only after
its public behavior, failure cases and applicable scale/workload gates pass on
the same build. Keep audited native ownership mandatory throughout.

Goals **2, 4 and 5 are closed**. Seven goals and the final timed comparison
remain open. Integration source1d6378e2 passes the fresh
[435-check full verifier](evidence/native-writer-integrated-full-20261106.json)
(391methods+44Triplex), TypeScript and216 Git-matching code pins. Its matching
[default build/public7 gate](evidence/native-writer-default-build-20261106.json)
passes. The prior405 receipt, isolated422/full435 and all failed experiments
remain preserved at their original identities. Historical sections below keep
their then-current status; this checklist supersedes them.

The [research synthesis](RESEARCH-SYNTHESIS.md) maps final reports26–29 to
Goals1/3/6/8/9/10. Models do not close ledger items. Presence raw5/SDK5,
operator profiler3 and coverage4 are accepted isolated gates, not additions to
main435. Shared native accounting, recursive SQL, transactional publication,
reference/deletion semantics and Triplex delegation remain on the
[dependency graph](TASK-GRAPH.md).

- [ ] **1. Typed values and schema constraints.** Qualify datetime and distinct
  references, then JSON and blob descriptors through writes, queries and history.
  Preserve old wire bytes, IDs, receipts and schema meaning through atomic format
  activation and reopen. Qualify global uniqueness and temporal reference rules.
  - [x] Datetime and distinct references through public writes, history, native
    evaluation and scalable SQL. Actual legacy upgrades and rollback pass.
  - [x] Isolated raw JSON and blob-ID evaluator with exact byte identity and
    bounded JSON syntax. Source `ebf6f0cc`, actual engine receipt `69e573b4`.
  - [x] Persisted JSON and blob descriptors through both native query routes,
    corrections, point/history and atomic format-nine activation.
  - [x] Eight-type 100,000-fact reader sweep and short ingestion run.
  - [x] Eight-type sustained million-fact gate with sixteen readers and
    ongoing ingestion on the audited all-cut proof build. The [paired
    receipt](evidence/mixed-1m-026-allcut-comparison-20261105.json) records
    exact answers and reopen, 36.16 queries/s, p99 of 712 ms and 2.01 GB RSS.
  - [x] Repeat on the [combined 0.27 build](evidence/mixed-1m-027-integrated-20261105.json).
    Exact answers pass with sixteen concurrent readers, 244 acknowledged writes,
    33.60 queries/s, 751 ms p99 and 1.79 GB RSS.
  - [x] The [0.28 same-history repeat](evidence/mixed-1m-028-integrated-20261105.json)
    passes the same gate. It records 31.53 queries/s and 1.03 s p99.
  - [x] Global temporal uniqueness across typed domains and schema versions,
    with exact older history and replay, atomic batch swaps, revalidation,
    stale-writer rejection and the archived binary fence.
  - [x] [Eight-type ten-million-fact baseline](evidence/mixed-eight-type-10m-028-pilot-20261105.json)
    passes exact reads, sixteen active readers, ongoing commits and reopen.
  - [x] [Initial same-history ten-million-fact pair](evidence/mixed-10m-028-029-first-pair-20261105.json)
    passes the predeclared budgets. The 0.29 build records 5.60 reads/s,
    4.93 s sampled p99 and 50 writes with sixteen active readers.
  - [x] [Reverse-order ten-million-fact pair](evidence/mixed-10m-028-029-reverse-pair-20261105.json)
    passes all eleven checks on the same closed history. The 0.29 build records
    5.07 reads/s, 5.78 s sampled p99 and 43 writes with sixteen active readers.
  - [x] [Integrated 0.31 ten-million-fact confirmation](evidence/mixed-10m-031-integrated-20261105.json)
    passes all fifteen numeric checks and exact one/four/sixteen-reader
    answers, sustained ingestion and reopen. It records 5.87 reads/s,
    4.96 s sampled p99 and 52 acknowledged writes.
  - [x] [Format-eleven managed presence](evidence/native-managed-presence-032-full-20261105.json)
    preserves empty and populated live types through put, patch and same-cut
    batches, historical reads, reopen and actual predecessor upgrades.
  - [x] Isolated maximal-presence interval reconstruction at explicit K:
    [five independent native methods](evidence/native-presence-intervals-first-20261106.json)
    pass with new paired core/owner,128MB/64MB, exact endpoints, event/island/
    UTF8 budgets, prepared guards, caller rollback, replay and reopen. This is
    a primitive prerequisite. The [thin SDK5](evidence/native-presence-intervals-sdk-20261106.json) and [operator profiler3](evidence/presence-profile-first-success-20261106.json) also pass in isolation; main integration remains open.
  - [x] Isolated [coverage4 first gate](evidence/native-reference-coverage-first-20261106.json):
    schema5/format12 immutable policy, final-overlay source/target coverage,
    unchanged incoming edges, original-policy carries, replay/re-audit/reopen.
    New paired build; not main435 or complete coverage acceptance.
  - [x] Isolated [boundary3 successes](evidence/native-reference-coverage-boundaries-first-20261106.json):
    actual old2f format12 fence, legacy IR/hash/caller rollback, int64/identity
    error priority and32/33 proof scope. Fourth global-history method fails.
  - [ ] Resolve covered-growth revalidation at128MB. [Fresh trace](evidence/native-reference-coverage-growth-trace-first-20261106.json)
    proves260ACKs/K261/three exact count routes, then revalidateOOM; subaudit
    unknown. [Read-only first-fixture inspection](evidence/native-reference-coverage-growth-diagnostic-20261106.json)
    leaves DB unchanged. No healthy audit/reopen or cap raise is claimed.
  - [x] [Actual public-patch statement diagnostics](evidence/coverage-command-profile-pair-20261106.json)
    capture29/31statements, identical requests/receipts/history and an added
    231operator guard with21.769ms optimizer metric. Diagnostic, not a speedup.
  - [x] [Same-IR4 binary pair](evidence/native-reference-identity-growth-pair-first-20261106.json)
    reproduces the128MB revalidation failure in predecessor2f as well as a562
    after260ACKs/three count routes each. This localizes a preexisting boundary;
    it does not qualify successful audit/reopen or identify the internal subaudit.
  - [ ] Eliminate [measured no-policy cost regression](evidence/native-reference-coverage-cost-first-20261106/receipt.json)
    (41.7–42.1% median in both orders), finish exact caps/dense uniqueness/
    audit costs and full integration, then temporal reference/deletion behavior.
- [x] **2. Expressions.** Freeze the bound grammar and eager error order. Lower
  eligible comparisons, filters and arithmetic with native/SQL parity for empty,
  mixed-tag and overflow cases.
  - [x] Admitted single-atom comparisons and two-atom `ref_id` joins.
  - [x] Bounded numeric heads with positively bound inputs, checked arithmetic,
    eager body errors and exact legacy inspection bytes. The refund workload
    passes native signed projection and completed sum at each expected cut.
  - [x] Original comparison, parentheses, checked arithmetic and unary-minus
    contract through public queries and both raw generations, including exact
    float boundaries, eager faults and healthy reuse. Broader SQL arithmetic
    lowering remains a Goal 3 optimization.
- [ ] **3. SQL-first planning.** Extend lowering to derived joins, multi-rule
  plans and eligible recursive work. Prove fresh cost and admission decisions
  across skewed histories, attachments, budgets and concurrent readers.
  - [x] Literal entity scoping before admission retains negated and unbound
    input semantics. The [focused 0.29 gate](evidence/native-focused-planning-029-20261105.json)
    verifies both persisted physical routes.
  - [x] [Bounded typed unions](evidence/native-union-workload-029-20261105.json)
    lower two to four independent EAV answer rules with exact set identity,
    historic cuts and conservative admission before deduplication.
- [x] **4. Stratified negation.** Completed lower strata, safe binding, cycle
  rejection and correction-aware absence at one cut pass independent watermark,
  inherited-access/deny and historical absence oracles, including reopen.
  Recursive completed relations followed by two negation layers and equivalent
  rule orders pass. Native SQL lowers range-restricted positive/negative EAV
  atoms with typed identity, temporal cuts and preconstruction budgets.
  - [x] Large concurrent anti-join: [original-limit screen](evidence/native-writer-antijoin-candidate-20261106/receipt.json)
    passes16/16;16 readers,7.567reads/s,3.089s sampled p99,365ACKs on10m history.
  - [x] Same-runtime writer comparisons [forward](evidence/native-writer-broad-forward-20261106/receipt.json)
    and [reverse](evidence/native-writer-broad-reverse-20261106/receipt.json)
    pass27/27 unchanged gates each.
  - [x] Whole-runtime original B0 comparisons [forward](evidence/native-writer-b0-broad-forward-20261106/receipt.json)
    and [reverse](evidence/native-writer-b0-broad-reverse-20261106/receipt.json)
    pass27/27 each. ACK rates improve24.69×/22.15×; read throughput changes
    +1.06%/−4.25%. Original17-context/contract1 versus candidate18-context/contract2
    and forward's brief Git activity caveat are explicit. Clean reverse retained.
  - [x] Exact source1d6378e2 passes [full435](evidence/native-writer-integrated-full-20261106.json),
    TypeScript and216sourcepins. Matching default181generatedfiles plus395SDK
    dependencies pass [seven public methods](evidence/native-writer-default-build-20261106.json).
  - [x] [Unchanged full512 trace](evidence/native-writer-full512-20261106.json)
    retains512ACKs/8,202exact reads. [Active-start termination](evidence/native-writer-active-start-20261106.json)
    proves complete-old-state recovery/retry/replay/reopen, with cleanup-entry
    timing explicitly unqualified. Static3/static4/fair4 failures remain in the
    [cohort log](CONCURRENT-INGESTION-COHORT.md); no budgets were relaxed.
- [x] **5. Completed aggregates.** Qualify larger programs, full tuple support,
  typed heterogeneous groups, empty answers and exact overflow behavior. Verify
  that joins and corrections preserve contributions in the business workloads.
  - [x] Scalable complete-source aggregation over proved two-to-four-atom
    EAV joins with set identity, temporal cuts, eager error precedence and
    conservative preconstruction admission.
  - [x] Multi-rule negated producers, full-tuple contribution identity,
    sum-to-extrema-to-join chains, heterogeneous groups, empty answers,
    tag-before-range faults, correction cuts and reopened public/raw parity.
- [ ] **6. Cancellation and resources.** Account for evaluator allocations and
  DuckDB memory/spill separately. Verify admission, cancellation, deadlines,
  cleanup and reuse under adversarial workloads at the agreed scale.
  - [ ] Attribute public call time to planning, engine/SDK work, transport and
    typed decoding across tiny, aggregate and wide results under load.
    [One-reader 0.25 screen](evidence/public-read-phase-screen-025-20261105.json)
    separates SDK awaits from host phases. Native planning, execution and
    concurrent attribution remain open.
  - [ ] Pair C++ compile and evaluation spans with DuckDB operator profiling
    and full-call transport/decoding timings. Retain TypeScript through all ten
    goals, then use measured host costs to evaluate a Rust spike.
    [Operator diagnostics](evidence/native-read-plan-phase-026-20261105.json)
    separate template-call wall time from DuckDB plans. The [0.27 evaluator
    diagnostic](evidence/native-evaluator-scope-027-20261105.json) times C++
    construction/import, fixed point, answer materialization and result
    vector encoding on the same invocations as prepared execution and
    separate EXPLAIN runs. The [wide single-reader
    diagnostic](evidence/native-evaluator-wide-027-20261105.json) checks all
    40,000 typed rows on both physical routes and records the corresponding
    engine, C++ and full public spans.
  - [x] [0.29 concurrent diagnostic](evidence/native-concurrent-public-phases-029-20261105.json)
    correlates evaluator, SDK and typed assembly for 735 exact read-only
    public calls at one, four and sixteen readers.
  - [x] [Native patch statement/operator diagnostic](evidence/native-write-candidate-focused-032-20261105.json)
    preserves exact receipts and cuts across public, generated, phased and
    EXPLAIN observations. It identifies the 10m history-validation cost and
    verifies a literal-pruning candidate's physical row reduction. This is
    diagnostic evidence; full mixed qualification remains separate.
  - [ ] Attribute the concurrent phases during sustained ingestion and
    qualify the separate native allocator budget and physical spill bounds.
    The original isolated allocator proof `c6e3787e` is superseded by
    stage-two source `dd86a404` and receipt checkpoint `eea9d495`: nine
    ordinary public/raw methods qualify invocation caps and borrowed answer
    encoding. Compiler/import scratch, upstream LIST/DISTINCT, engine and
    host owners, shared instance bytes and broader integration remain open.
  - [x] [Actual-engine allocation diagnostic](evidence/native-evaluator-allocation-032-stage1-20261105.json)
    preserves exact eight-tag rows/counters, rejects low caps and permits
    reuse. Standalone exact-peak and growth checks pass, with 452,904 bytes
    retained peak and 51,848 index bytes. Ordinary invocation enforcement
    and output lifetime/accounting remain a separate source-stage tranche.
  - [x] The isolated [ordinary 40,000-row gate](evidence/native-evaluator-wide-ordinary-032-review-20261105.json)
    passes first/repeat/reopen on the first attempt with unchanged 64 MiB
    default and exact counters. Each accounts for 17,184,432 retained peak
    bytes. This is three actual public reads, not full allocator integration
    or a process memory bound.
  - [x] Isolated C APIv2 shared-owner lifetime through
    [raw signatures/connections](evidence/native-memory-owner-probe-first-032-20261105.json)
    and [public cancellation/reopen](evidence/native-memory-owner-probe-second-repaired-032-20261105.json).
    The first public setup path mismatch is retained and fixed only in the
    fixture. Partial LOAD/retry, prepared handles beyond final close and
    shared requested-capacity reservations remain open; no byte quota follows.
- [ ] **7. Recovery and evolution.** Qualify atomic fact and batch commands,
  replay, migration, conflicts, crash boundaries, disk failures and backup/restore.
  Preserve cuts, usage, provenance and receipts across each transition.
  - [x] Quiesced format-eight backup and restore of actual format-five and
    format-six predecessor stores with corrections and exact replay.
  - [x] Actual 0.25 format-eight upgrade to format nine with unchanged six-tag
    wire, history and replay. The prior binary rejects the upgraded store.
  - [x] Preserve the audited owner across automatic and explicit DuckDB
    checkpoints. An exact read completes during a paused explicit checkpoint,
    and the eight-type 16-reader ingestion run has zero ownership errors.
  - [x] Atomic schema-bound put and patch batches at one knowledge position,
    including typed cyclic declarations, exact replay, revision fencing and
    observed SIGKILL recovery. All 12 batch checks pass on 0.27, including
    4,096 submitted assertions at 128 MB and 8,192 carried fragments.
  - [x] Quiesced revision-three backup and restore, 36 temporal cuts and
    exact replay. The [isolated 0.27 recovery
    tests](evidence/native-batch-027-recovery-20261105.json) also recover and
    retry after an actual injected WAL flush failure.
  - [x] [Pinned WAL disk-full recovery](evidence/wal-enospc-029-20261105.json)
    rolls back a partially written WAL record after ENOSPC, restores the
    original bytes, reopens the prior history, and commits the same-ID retry
    with the exact staged receipt.
  - [ ] Qualify spill exhaustion and filesystem-full behavior at the
    checkpoint and appender boundaries, plus broader contention.
  - [ ] Complete the first-class assertion/retraction contract and
    cross-API receipt, journal and migration acceptance.
- [ ] **8. Reuse and maintenance.** Bound caches and maintain rebuildable derived
  relations through joins, recursion and support deletion. Compare incremental
  answers against full recomputation and account for maintenance and storage.
  - [x] [Native support-deletion prototype](evidence/native-projection-028-20261105.json)
    verifies all eight tags, scheduled knowledge boundaries, corrections and
    transactional rollback in one owned connection.
  - [x] [Bounded DAG support kernel](evidence/native-dag-support-proof-20261105.json)
    passes the standalone workload 20 diamond shape, checked rollback and
    96 independent full recomputations. Its original receipt is standalone;
    the isolated DuckDB qualification follows below.
  - [x] An isolated [transactional DAG candidate](evidence/native-dag-integrated-033-full-20261105.json)
    passes 414 integrated checks, pinned readers, support deletion,
    rollback/replay and actual archived-writer stale-result refusal/rebuild.
    This source remains unpromoted: its [unregistered write overhead](evidence/native-dag-unregistered-overhead-033-20261105.json)
    fails eight fixed checks across both orders.
  - [ ] Reduce unregistered overhead and qualify the same paired gates;
    then measure registered maintenance, reads, storage and broader limits.
  - [x] Workload 20 [canonical recomputation](evidence/workload-functional-14-families-030-20261105.json)
    returns all twelve exact answers across three engines and reopens each
    profile. Timed incremental maintenance remains a separate gate.
  - [ ] Qualify reader-visible publication, automatic refresh and support
    changes through joins and recursion under concurrent reads.
- [ ] **9. History and intervals.** Qualify native interval and multi-cut answers,
  gaps, coalescing, correction lineage and temporal references/deletion with
  endpoint oracles and replay/reopen tests.
  - [x] Historical additive lineage and unknown-output queries return exact
    answers on [all three engines](evidence/workload-lineage-16-027-20261105.json),
    including reopen and preservation of the original cut.
  - [x] Recursive containment across a diamond and an atomic interval move
    passes all 12 [engine and oracle cases](evidence/workload-functional-11-families-028-20261105.json)
    and reopen.
  - [x] [Bounded native interval queries](evidence/native-interval-query-029-20261105.json)
    return exact coalesced typed answers, gaps and clipping in one audited
    snapshot. Reopen, replay, whole-work admission and reader reuse pass.
  - [x] [Machine uptime](evidence/workload-uptime-18-029-20261105.json) passes
    all 15 exact engine checks and reopen, including duplicate, bridge,
    historical and clipped intervals.
  - [x] [Bounded multi-cut queries](evidence/native-multi-cut-029-20261105.json)
    preserve duplicate and empty cuts, a shared latest clock, exact eight-tag
    tuples, historical corrections and reader reuse after in-flight cancellation.
  - [x] The isolated [correlated lookup candidate](evidence/native-temporal-lookup-workload-19-20261105.json)
    passes 22 focused checks and workload 19 at the prediction's captured
    feature cut and the separately visible label cut.
  - [x] Integrate correlated lookups and workload 19 in 0.30, with exact
    multi-engine parity and reopen. [Functional gate](evidence/workload-functional-14-families-030-20261105.json)
  - [x] Native managed presence is integrated in 0.32, including corrections
    and the current interval, multi-cut, lookup and anti-join entry points.
  - [ ] Qualify temporal references, deletion, cascades and production scale
    beyond the bounded profiles.
  - [ ] Qualify query proof lineage independently of stored correction
    provenance and business lineage workloads.
- [ ] **10. Triplex delegation.** Route schema, query and fact commands through
  the same audited native semantics. Qualify the pinned upstream checks, public
  capabilities and typed recovery alongside the unmodified conformance suite.
  - [x] The default factory computes dependency freshness and valid-time
    scheduling in the native extension. The [isolated qualification](evidence/triplex-native-dependency-028-20261105.json)
    covers exact fractional and commit cuts, rollback, bound attribute limits,
    and all 44 unmodified Triplex conformance cases.
  - [x] [Native retained reservation](evidence/triplex-retained-reservation-028-20261105.json)
    qualifies the production typed appender's exact quota and same-transaction
    rollback, with all 44 unchanged upstream cases.
  - [ ] Qualify native schema, query and fact semantics for the pinned
    public factory, its advertised providers and the full upstream checks.
- [ ] **Final comparison.** Execute all twenty workload families through naive
  replay, tuned direct DuckDB and the temporal store with equivalent histories,
  answers and precomputation. Include storage and maintenance costs.
  - [x] [All twenty functional families](evidence/workload-functional-twenty-031-20261105.json)
    match all 71 independent packet cases on each engine, with all 60 profiles
    reopened. Duplicate command replay preserves its original receipt.
  - [ ] Run the complete timed and scaled comparison after the ten-goal
    acceptance work, including equivalent precomputation and maintenance.

The 0.25 type slice passes 315 scoped checks plus TypeScript on the pinned
macOS ARM64 runtime. The separate archived-binary upgrade and closed-backup gate
passes for both predecessor formats. See [verification](evidence/verification.json)
and the [upgrade and recovery receipt](evidence/native-expanded-upgrade-recovery-20261105.json).

The eight-tag build passes the 100,000-fact checkpoint repeat and the
million-fact sustained comparison with the all-cut proof. The combined 0.27
and the 0.28 build independently pass the same budget. The isolated
correlated lookup build passes thirteen real three-engine functional
workload families. Every one of the 71
packet cases has an independent immutable-event oracle.

## Historical 0.24 single-strategy checkpoint

Contributor requested one audited native-ownership strategy on 5 November, superseding
the earlier automatic selection and portable fallback. That tranche
removes the public integrity option, requires the matched companion, and guards
all persisted queries and native mutations. Startup and explicit revalidation
perform the full retained/history audit. macOS ARM64 is the only qualified
platform. Fresh core and companion builds pass 298 scoped checks plus semantic
TypeScript. Independent review verifies all 157 source hashes and artifact
pairing.

The same 0.24 build passes the ten-million-fact, sixteen-reader mixed gate with
1671 exact reads and 233 acknowledged writes over three minutes. Throughput is
9.23 queries/s, p50 is 1580 ms, p99 is 3136 ms and sampled mixed-query RSS is
2.50 GB. All eighteen complete write windows and final/reopened answers pass.
The startup audit also verifies managed views and exact retained usage, while
native guards enforce the audited generation and canonical comparison settings.
The four qualified read optimizations remain enabled. Identity-count stays
disabled.

At this checkpoint, datetime and distinct reference values were the next tranche,
followed by bounded JSON and blob descriptors. Existing four-tag schema bytes,
receipts and historical meaning must remain stable. Type source spikes are
preserved for rebasing onto the single-strategy runtime. Batch, scalable
comparison and allocation-budget experiments are also paused. All ten goals
remained open then. The current completion checklist above supersedes those
historical priorities.

## Exact-artifact 0.23 scale qualification, 5 November 2026

Final verification passes 284 scoped checks plus semantic TypeScript against
the same core and companion used for the scale run. An independent review
recomputes every absolute gate from the raw samples and verifies the actual
loaded artifacts. The opt-in direct C++ write transport is also covered.

The native-owned 0.23 candidate passes the fixed ten-million-fact absolute
gate. Sixteen readers complete 1308 exact count, sum and grouped-sum calls
during 181 acknowledged native writes. The three-minute run records 7.20
queries/s, 1933 ms p50, 4681 ms p99 and 2.15 GB sampled query-phase RSS.
All eighteen complete ten-second windows contain a committed write. Current
and historical answers pass again after reopening. The underlying fixture
contains ten million facts and each query reads its million-scale active set.

The same-artifact million-fact comparison
passes all 630 optimized queries, but strict grouped-sum cells encounter nine
deadline errors. Seven of nine comparison gates pass. Both reports preserve
all samples and failures. This initially blocked default promotion. Contributor's
subsequent direction promotes automatic verified owned selection based on its
successful correctness and absolute scale gates. The strict-path stall cause
is not established.

This establishes the first scale milestone for the explicitly enabled,
native-owned candidate. It does not complete any of the ten goals. Atomic
multi-entity batches and scalable single-atom comparisons are the next isolated
slices. Their full real-engine qualification remains incomplete.
See `evidence/mixed-10m-final-023-20261105-01.json` and
`evidence/strict-optimized-1m-final-023-20261105-01.json`.

## Verified qualification checkpoint, 5 November 2026

Extension 0.22 passes 259 scoped checks plus semantic TypeScript after fresh
core and companion builds. It integrates experimental write transport,
provenance checks, independent workload oracles and staged comparison plans.
The normal build keeps all read optimization flags disabled.

The clean million-fact sustained read gate passes. The ten-million mixed gate
fails on completed-read count, p99, throughput, query deadlines and write
progress windows. Successful answers and final/reopened state remain exact.
The diagnostic timing annotation preserves overlapping brief helper tests.
The first scale milestone and all ten goals remain open.

The JSON write prototype is rejected for promotion after measured regressions.
The next bounded experiments test historical-cut uniqueness and direct native
vector appends. A source audit also identifies unaccounted native relation-index
allocations, retained as a concrete resource-accounting follow-up.

## Read optimization qualification, 5 November 2026

The combined current-snapshot uniqueness and injective-projection candidate
passes its real-engine functional packet and the matched million-fact screen.
All nine reader-count/query-kind gates pass. Sixteen-reader median latency is
162 ms for count, 178 ms for sum and 228 ms for grouped sum. This candidate
remains isolated until the fixed sustained gates in `SCALE-BENCHMARK.md` pass.
The normal 0.21 build continues to disable these optimizations.

All twenty workload contracts now have independent expected-answer coverage
across 71 named cases. Sixty-six answers are derived from immutable business
events and five uptime cases use the independent assertion oracle. Eight pure
oracle tests pass. Four workload families pass 42 three-engine case executions
and 42 reopened checks. The other sixteen families and the complete performance
comparison remain open work.

## Interval-local corrections, 5 November 2026

Extension 0.21 passes 224 scoped checks plus semantic TypeScript, including eight
interval methods, three seeded independent state-oracle methods, one method
covering three observed SIGKILL phases, and three format-fence methods. Native
patches preserve outside values and historical schema meaning through explicit
fragment provenance. The first committed patch advances format 5 to 6, while
failed commands and failed migrations retain the prior state. Literal native
guards reject unsupported metadata even if a persisted view was replaced.

The current read experiments remain disabled in the normal build. Their
million-fact results are recorded independently, including tail outliers and
failed performance gates. Full scale/performance, broader transactions,
constraints, incremental execution and Triplex delegation remain open.

## Audited native-owned profile, 5 November 2026

Extension 0.20 and its paired C++ owner companion pass 209 scoped checks plus
semantic TypeScript through `verify.py --with-owner`. This adds actual native
context enrollment, full-audit activation, execution-time generation checks,
unknown-connection invalidation and host revalidation failure handling. The
eight public owned-store tests cover strict defaults, native writes and reads,
raw dispatch invalidation, drained revalidation, corruption, stale artifacts,
uncertain cleanup and failed-write reuse. Thirteen native lifecycle/activation
tests and six native owned-query tests exercise the companion directly.

Strict reads remain the default. The optional owned profile currently requires
the pinned macOS arm64 engine. It preserves active-fact DISTINCT and stage
admission. Its full audit covers retained carriers and original schema/history
bindings. It does not add receipt/clock certification or public cancellation to
open/revalidation. Performance and ten-million concurrency acceptance remain
pending. The prior 0.19 scale measurements below retain their original meaning.

The paired 0.20 million-fact screen passes correctness for all query shapes and
reader counts. A clean sixteen-reader repeat improves count/sum/grouped-sum
throughput by 1.90/1.27/3.69 times, respectively. Count and sum miss the declared
twofold-throughput or half-median-latency gate. Native-owned mode remains
experimental while a current-snapshot uniqueness optimization is evaluated.
See the raw paired receipts and comparison in `SCALE-BENCHMARK.md`.

## Latest integrated scale slice, 5 November 2026

Extension 0.19 adds a separate SQL-owned admission profile, native retained
storage budgets and an owned shared-instance reader pool. A fresh integrated
run passes 177 scoped checks plus semantic TypeScript. This includes six native
scale methods, ten reader methods, four retained-capacity methods, seven public
scalable-query methods, four benchmark-fixture methods and four fatal-instance
fencing methods alongside the
preserved baseline suites.

The first measured scale screen passes one million active scalar assertions
across 245 native entities/commands with 1, 4 and 16 readers. Exact count, sum and
grouped sum answers, temporal positions, native command replay and the final
state after an overlapping write burst agree with their independent oracles.
Single-reader medians are approximately 274–280 ms. Sixteen-reader medians are
approximately 2.56–2.90 seconds, with tail outliers retained in the raw evidence.
The screen uses short samples and a bounded write burst. Ten-million acceptance,
sustained latency objectives and broader entity/history shapes remain open.

This advances goals 3, 5, 6 and 7. All ten goals continue through the acceptance
boundaries below. Full retained-history auditing still runs on each scalable
query. The native-owned validation optimization is a separate pending slice.
See `SCALE-BENCHMARK.md`, `TAKEOVER-STATE.md` and
`evidence/scale-1m-native-20261105-01.json`.

The ten-million fixture is now complete and one controlled public count returns
the exact answer at knowledge position 2442 in approximately 3.69 seconds.
This is one full-call sample. Sixteen-reader and sustained ten-million acceptance
remain pending. The original 1 GB ingest checkpoint failure, complete recovery,
2 GB continuation and benchmark-audit allocation failure remain in the evidence.

## Baseline capability ledger

New Mac integration scope, 4 November 2026. Historical owner runs and unknown
publications were not replayed. This ledger does not rewrite their acceptance.

All ten goals serve the [required native architecture](DESIGN.md#required-architecture-target):
C++ owns semantics; a declarative schema DSL compiles to runtime catalog data;
TypeScript and SQL are thin interfaces. The compatibility adapter is transitional.
The clarified product priority is fast reads over millions of retained
facts/events and many concurrent readers; write throughput is secondary. The
large-data/read-concurrency target remains a cross-goal acceptance requirement,
especially for SQL planning, resources, reuse
and public runtime ownership; see the [full handoff](../handoffs/mac-zero-context-takeover-20261105.md).
The native DSL, atomic catalog registration, schema-bound entity commands and
temporal history now pass same-binary new-entity/reopen and SQL/TypeScript tests.
Persisted Datalog now has a native-owned SQL/TypeScript entry point without a
host fact list, with proved single-atom/two-to-four-atom EAV SQL, complete-source aggregates and bounded
native fallback. A C++ retained-row cost hint keeps small default queries native.
Native `ref(Type)` now enforces stable same-schema/type target identity and
historical first-declaration checks. The next work includes global/temporal
constraints, schema-aware planning and
moving compatible legacy adapter behavior onto the native APIs. See
[the current native schema profile](NATIVE-SCHEMA.md).

| Goal | Executed integrated evidence | Remaining boundary |
| --- | --- | --- |
| 1 Typed values | Four scalar tags and exact numeric/Unicode boundaries; native schema DSL with required/one/many rules; native ref(Type) string-ID constraints with forward/self types, atomic same-schema/type target admission, stable first-declaration identity, historical target checks and schema evolution; native full-record commands and historical schema binding; immutable runtime definitions and same-binary new entity/reopen; common v5 carrier preserves Triplex tags | Native scalar/query profile remains four-tag; global uniqueness, temporal target overlap/deletion/cascades and legacy Triplex schema/reference enforcement remain open; Triplex numbers are binary64 |
| 2 Expressions | Native filters, arithmetic, eager errors, overflow/division/type faults and healthy reuse | Documented bound-input whitelist; opaque filters retain native execution |
| 3 SQL first | Genuine v2 IR; reference API persisted SQL scans/joins/grouping; C++ single-atom, bounded two-to-four-atom EAV and complete-source count/extrema/exact-sum SQL lowering with fresh native-budget proof, 45 scan and 22 join SQL/native identities; same-entity proof specialization; cost-only C++ dispatch; persisted queries without a host fact list; complete 40000-value projection and 10000-entity multi-attribute comparisons; 20000-assertion differential/reopen gate; native vector appends | Other derived-relation joins, filters and aggregates still need native SQL lowering; generic supplied-context attachment admission, including HIDDEN, is not certified by SQL listings; broader scale gates remain; original 3.1 operation remains unreconciled |
| 4 Negation | Genuine public command/correction/shared-cut reads, clause reordering, unsafe/cyclic rejection; Triplex full suite | Does not execute the old stopped timestamp pipeline or certify its historical public48 plan |
| 5 Aggregates | Full-tuple set identity, duplicates, empty groups, extrema, sum overflow, SQL/native equality and retraction reuse; native C++ direct/projected count/extrema/exact-sum SQL with typed grouping, fresh projected-domain/source/group/range proof and gated wide intermediates | Bounded declared aggregate grammar; no legacy 1,210-attempt result claimed |
| 6 Cancellation/resources | Invocation-owned native polling/deadlines; optional AbortSignal and whole-query timeout via shared native Node control bridge; actual SQL/native cancellation with acknowledged cleanup, token retirement, healthy reuse and queued-abort isolation; output conversion polls native monotonic status; bounded native-equivalent SQL proof; logical subset row/cell/carrier limits and gated join inputs, including 600^4 unproved Cartesian case; Effect rollback; bounded output/result release; vector appends capped at 2048 rows with payload-driven splits; failed-appender cleanup and caught-error rollback | Python reference point/timeline controls now retire and join delivery before transaction cleanup, with deterministic late-notification coverage; full allocation accounting, physical containment and adversarial latency envelope remain incomplete; deadlineMs alone remains evaluator-only; optional controls have measurable planning overhead; appender flush is synchronous |
| 7 Recovery/evolution | Five Python abrupt writer exits; native appender exits after first chunk/before/after commit; observed SIGKILL inside native command assertion INSERT after header/retraction, before commit and after commit; complete history/receipt/clock/usage and temporary-plan cleanup after restart; receipt reconciliation and healthy next write; v1→v5 and legacy Triplex migration rollback; cross-language corrections; native schema-version evolution/reopen; late native-command DML failure rollback in run/stream; native two-connection conflict | Broader contention, disk failure and backup/restore gates remain open; native opener requires empty/v5 database; cross-API receipt/journal semantics are not yet identical |
| 8 Reuse/maintenance | Immutable compiler IR LRU; native SELECT/read-query-pragma LRU and C++-compiled parameterized controlled templates with fresh tokens/data/budgets, rollback, schema versions and eviction tests; oversized-template pragma fallback; callback-local compiled schema-fact checks with borrowed metadata and immutable-cell descriptor reuse; fixed-cut EAV support maintenance; external-commit refresh | SQL/wire-byte budgets are not total heap accounting; general joins/recursive incremental maintenance remain open; old goal8 publication remains unreconciled |
| 9 History/intervals | Assertion IDs, both intervals and correction provenance; native full-record replacement and interval-local patch APIs; point/history reads preserve original schema meaning through fragment provenance; seeded discrete-time oracle, schema evolution, late rollback and observed patch SIGKILL recovery; carrier/binding corruption rejection; reference targets have durable declarations no later than their original source; one-cut answer timeline with gaps/coalescing and endpoint equivalence | Temporal foreign keys and broader interval-answer execution remain open; bounded endpoint evaluation; no answer proof-lineage claim; old publishing operation remains unreconciled |
| 10 Triplex adapter | Exact-source builds/typecheck; all 44 unmodified runtimeConformance cases through the direct native factory; eleven native adapter tests; no Python subprocess in production path; one canonical v5 catalog | Capabilities.none only; full native Triplex schema semantics, upstream full pnpm check and optional providers remain open |

Actual validation and selected source hashes: evidence/verification.json.
Native schema acceptance adds seven real-engine tests and native entity commands
add ten more. The current write/read profile has explicit full-record semantics;
it is not full Triplex schema/query equivalence.
Ten native persisted-query tests now exercise exact values/cuts, recursion,
negation/aggregates/expressions, eager faults, budgets/deadlines, inactive
corruption/binding checks, profile admission and SQL parity after reopen,
SQL/native scan equality, fresh proof/fallback, prepared reuse/eviction and
late-row schema-fact validation.
Six join methods cover 22 native/SQL identities, native budget sweeps and
fallback, gated Cartesian inputs, temporal/schema evolution and cost preference
refresh after writes. Five reference methods cover C++ declarations/ID rules,
atomic target checks, replay, SQL transaction rollback, same-binary reopen and
schema evolution, graph joins, and inactive target/source binding corruption.
Seven query-control methods add shared Node/C++ registry identity, bounded live
tokens/retirement, route parity/fresh data, listener cleanup, whole-query SQL and
native cancellation, independent deadlines, queued-abort isolation, fresh
parameterized template reuse and oversized-template fallback. Six cleanup
fault methods preserve primary/cleanup errors, attempt independent releases,
fence uncertain connections and permit explicit close-only cleanup.
Four count methods add typed/set/empty/temporal identities, budget boundaries and
wide preprojection gating. Six aggregate methods add exact extrema/sums, domain/range
fallback, canonical native errors, exact work/fact/round thresholds and empty-group
accounting. One reference cancellation method injects late timer delivery during
real transaction cleanup; the previous methods fail it and the fixed lifecycle
passes. The complete current suite passes 142 checks, plus
semantic TypeScript; these checks cover the stated slices, not all ten goals.
Full paired measurements: evidence/full-path-benchmark.json,
evidence/native-hillclimb.json, evidence/native-transport-benchmark.json and
evidence/native-write-benchmark.json. Native schema-bound command timings are in
evidence/native-entity-benchmark.json, with no cross-API speedup claim. The
native persisted query packet is evidence/native-store-query-benchmark.json
(64/4096/20000 facts with complete count/projection output verification).
The paired native-scan packet adds 40000 facts and retains small-query SQL
regressions alongside large-query gains. The new native-join packet rotates
native, SQL and automatic preference at 500/2000/10000 three-attribute entities,
including fresh proof overhead and every exact output row. It retains SQL's
small-query regressions. Omitted `forceNative` uses the C++ cost hint; `true`
requests native and `false` tries proved SQL first. The
transport baseline retains the uncached native result to expose the tiny-query
regression that motivated prepared reuse. The current reference packet records
complete native reference commands and closed/reopened graph queries for 64/512
sources in evidence/native-reference-benchmark.json; these are current-path
measurements, not a cross-version speedup claim. Older packets retain their
own source/build checkpoints. No goal should be
represented as complete beyond its executed scope above.

The versioned 0.14 controlled-query packet is evidence/native-control-benchmark.json,
rotating ordinary/controlled native and proved-SQL full projections over
512/4096/20000 native schema-bound facts. It reports planning/control overhead,
including small-query regressions, with complete output and cleanup checks.
The versioned 0.15 comparison uses the same protocol in
evidence/native-control-template-benchmark.json; prior packets retain their
own source/artifact identities.

The 0.16 count comparison in evidence/native-count-benchmark.json alternates
forced native and proved SQL at 512/4096/20000/40000 facts. Every answer is
checked. The 40000-fact filtered count measures 51.66ms native / 47.87ms SQL;
small inputs favor native and grouped counts are approximately tied. See
[NATIVE-COUNT-PROOF.md](NATIVE-COUNT-PROOF.md) for exact grammar and admission.

The 0.17 metadata comparison uses the same C++ source with borrowed inputs
disabled/enabled, retaining compiled DSL reuse in both variants. At 32768 facts
and 64 attributes, complete native/SQL counts improve from 53.20/55.60ms to
47.48/49.19ms (~12–13%); the fact-validation callback with complete Boolean
output improves from 11.91ms to 5.82ms (~2x). Every fact is still checked.
Changed-DSL/fixed-descriptor and late descriptor/type/NULL faults pass across
chunks. Raw samples and source/build modes are in
evidence/native-schema-view-benchmark.json.

Extension 0.18 adds six complete-source extrema/exact-sum methods and paired
512/4096/20000/40000-fact global/grouped measurements. At 40000 facts the six SQL
ratios are 1.05–1.11x; small cases favor native and 20000 is approximately tied
or slightly slower in SQL. evidence/native-aggregate-benchmark.json retains
all samples and source/build identities. Default costing remains empirical.
