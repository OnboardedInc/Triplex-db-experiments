# Native scale takeover

## Current acceptance and execution queue

Updated 6 November 2026. Finish all ten goals and the final fair twenty-workload
comparison. **Goals 2, 4 and 5 are closed; seven goals and the final timed
comparison remain open.** The [task graph](TASK-GRAPH.md),
[acceptance ledger](TEN-GOAL-LEDGER.md) and [research synthesis](RESEARCH-SYNTHESIS.md)
retain those dependencies. This top section supersedes historical checkpoints below.

### Promoted writer and exact default build

Integration source **1d6378e2c6e9b74b024fe5ba89c6b26355990dea** combines exactly25
qualified product/test paths from46168325 and three reconciled contract docs.
Its fresh isolated [full run](evidence/native-writer-integrated-full-20261106.json)
passes **435 checks:391 methods plus44 Triplex cases**, TypeScript and216
Git-matching code pins, first attempt,396.96s. All583 selected runtime files
remain unchanged. Three existing-test generated owner outputs are classified
separately. The prior405 receipt is retained in raw evidence and Git.

The [default-build installation and public gate](evidence/native-writer-default-build-20261106.json)
install181 exact qualified generated files while preserving every replaced
file under `build/integration-native-writer-20261106-01/default-install-01/previous`.
All395 SDK dependency files remain unchanged. Seven public writer/eight-type
methods pass first attempt in12.60s through main's actual default build;
181generated/216code/395dependency hashes remain unchanged afterward.
Seven new synthetic fixtures close with no WAL. No database is removed.

The application uses one automatic C++ writer and reader-wide query ownership,
with invocation-time deadlines (query contract2). There is no public strict/fast
switch or SDK writer fallback. Native f44d116c, owner0e4ca0e3, addon02270b08 and
engine72b50268 form the qualified default pair. **macOS ARM64 is verified;
Linux is unverified.** Do not relabel timing receipts when native artifacts change.

### Performance acceptance

Matched writer-transport [forward](evidence/native-writer-broad-forward-20261106/receipt.json)
and [reverse](evidence/native-writer-broad-reverse-20261106/receipt.json)
comparisons pass27/27 each, with23.39×/23.49× ACK rate and98.70%/101.23%
retained read throughput. They hold v2 and18 contexts equal.

The original whole-runtime B0 [forward](evidence/native-writer-b0-broad-forward-20261106/receipt.json)
and [reverse](evidence/native-writer-b0-broad-reverse-20261106/receipt.json)
also pass27/27 unchanged gates. Forward:24.69× ACK rate,+1.06% read throughput;
reverse:22.15× ACK rate,−4.25% read throughput. Original B0 has17 contexts and
contract1; candidate has18 and contract2. Forward preserves two brief Git
operations with unknown exact overlap; the clean reverse remains separately
reported. Root and independent A recompute gates, cuts, progress, identities,
cleanup and immutable inputs. These are sampled engineering screens, not SLOs.

The [original-limit anti screen](evidence/native-writer-antijoin-candidate-20261106/receipt.json)
passes16/16. At16 readers:7.567 reads/s,2.060s median,3.089s sampled p99,
365 ACKs and2.868GB sampled RSS on the ten-million retained-fact history.
[Active-start Worker termination](evidence/native-writer-active-start-20261106.json)
qualifies complete-old-state reconciliation, whole-command retry, exact replay,
4,100 history rows and reopen; it does not prove activity at cleanup entry.
Static3/static4/fair4 broad failures remain preserved in the
[experiment log](CONCURRENT-INGESTION-COHORT.md), without relaxed budgets.

### Isolated next slices, not included in main435

- Presence source31cbefd8/package63941fac: [five raw native methods](evidence/native-presence-intervals-first-20261106.json)
  pass at128MB/64MB on the new2f7f6c0e/109a16b2 pair. SDK source43c82a83/package4674135b:
  [five public methods](evidence/native-presence-intervals-sdk-20261106.json) pass.
  Neither source slice is integrated into main435 yet.
- Profiler source1706d284/packagea2e4aa51: [three associated endpoint/operator cells](evidence/presence-profile-first-success-20261106.json)
  pass after two preserved setup/decoder failures. Actual DuckDB2 JSON has
  `query.sql`, `operator[]` and system metrics. Each cell has149 operator nodes.
  Profile-enabled latency11.28–13.02ms is diagnostic, not a service benchmark
  or exclusive C++ versus engine attribution.
- Coverage sourcec593a6fc/packagef12cba4b: [fresh paired builds/TSC and four independent methods](evidence/native-reference-coverage-first-20261106.json)
  pass unchanged on a562ddf6/286694a1/7c6da97f. Schema5/format12 uses immutable
  coverage policies and final-state source/target interval checks. Exact caps,
  old-binary fence, int64/global-history, full regression and cost gates remain.
  Do not add these focused counts to435 or close Goals1/9.

The [boundary gate](evidence/native-reference-coverage-boundaries-first-20261106.json)
passes3/4 selected methods: actual old2f format12 rejection/legacy IR+hash/caller
rollback, exact int64/identity priority, and32/33 proof entities. Sourcee8b395d8/
package03b12442 preserves both pre-engine fixture repairs. Its global-history
method fails at128MB; the original failure/closed fixture remain preserved.

[Read-only reconciliation](evidence/native-reference-coverage-growth-diagnostic-20261106.json)
(source97c3/package8e1e3e61) finds all260 commands committed atK261,130entities,
4290presenceevents and65facts. It leaves the original DB hash/mtime unchanged
and cannot prove JavaScript ACK delivery. The separate
[fresh phase trace](evidence/native-reference-coverage-growth-trace-first-20261106.json)
(sourced71d9958/package9a80186d) records all195batch+65put ACKs and exact native,
scalable and automatic65-count answers, then fails **inside revalidate** at the
same128MB limit. Root independently replays1060 trace events; cleanup succeeds.
The particular subaudit is unknown. No retry, cap raise or coverage promotion.

The [first cost screen](evidence/native-reference-coverage-cost-first-20261106/receipt.json)
(sourcecf7f/package9070e4c1) passes six small functional/identity/cleanup trials.
No-policy median ACK regresses **41.7–42.1% in both orders**, almost wholly in
native SQL-call time (parse/bind/execute combined). Incoming revalidation2.067s
versus unrelated-policy0.293s is separately observed. Root independently derives
all51 path-only raw projections and96 measured ACK/18open/18audit quantiles.
There is no exclusive operator attribution, large-history or promotion claim.
The [three bounded hypotheses](NATIVE-REFERENCE-COVERAGE-OVERHEAD-SPIKES.md)
compare proof fusion, a smaller typed policy view, and an execution-snapshot
native seam on this same matrix, after the exact statement trace. A policy read
at PRAGMA preprocessing is not an execution-snapshot proof.

[Actual statement attribution](evidence/coverage-command-profile-pair-20261106.json)
now captures29/31 expanded statements and8/9CTAS from unchanged public patches.
The added guard has231operators,30.362ms query time and21.769ms optimizer time;
parser fields are absent and timers overlap. Root independently verifies all60
raw JSON profiles and exact public request/receipt/history. The first pipe-capture
failure is retained; regular-file FD2 is the working capture condition.

The [same-IR4 growth pair](evidence/native-reference-identity-growth-pair-first-20261106.json)
reproduces revalidateOOM in BOTH2f and a562 after260ACKs/K261/three65count results
each. Parent exit0 means diagnostic complete; both child exit1 failures remain
failed. Thus coverage is not required for this128MB boundary; subaudit unknown.

### Ownership and next actions

**Implementation is paused for the user's new planning request.** The old goal
was paused and cleared. The [revised plan](NATIVE-TEMPORAL-STORE-PLAN-20261106.md)
was written after three source-research lanes; it is a proposal, not a resumed
implementation goal. No engine/build/performance lease is active.

Root owns integration, independent source/evidence review, ledger and draft PR25.
Three isolated source experiments now address the same six-child cost matrix:
B (`acceptance_and_benchmarks`) owns fusion source1a1e261f with first4 PASS and
sourcec7fcbb6c with an additional first admission1 PASS; C
(`orchestration_operations`) owns typed-view sourced1e5e30d with first5 PASS,
evidence checkpoint216e5d9b; A (`native_read_strategy`) owns typed projection
source88f43c8b with first7 PASS, local evidence checkpoint51d4b514. A's first
wrapper-key failure and wrapper-only repair are retained; no test retry occurred.
All branch names start `codex/temporal-coverage-`.
Qualified2f/a562/cf7 inputs remain immutable. No optimization is promoted.
All three new cost screens remain unrun. B's c7fc and A's51d4 checkpoints are
local; C's216e checkpoint was pushed. Read branch state before resuming.
Only one engine/build/performance window runs at once. Exact4096-edge cap tests
wait for a measured cost baseline. Source and small evidence work may proceed
in parallel. Use three alternatives on the same measured bottleneck when useful.

After plan acceptance, use its early comparison/diagnostic tranche to select the
next work. Before any eventual integration, combine presence plus SDK against
their own paired artifacts, then
run the expanded verifier;435+raw5+SDK5+coverage4 would be449 only after actual
registration/execution. Keep shared native budgets, useful recursive SQL,
assertion/retraction transactions, maintained publication, interval deletion/
cascades, full Triplex delegation and final timed20 comparison on the backlog.
Preserve fixtures and failed experiments. No security investigation is in scope.

## Historical checkpoint record

The following sections retain earlier sources and acceptance boundaries. Their
then-current queues and counts do not override the current section above.

## Verified 0.32 checkpoint

Source `7c33bde8a2822869cfaa1484d3f119e8a004d961` passes 405 integrated
checks, including 44 unchanged Triplex cases, plus TypeScript. The
[verification receipt](evidence/verification.json) pins 202 source hashes.
The [managed-presence gate](evidence/native-managed-presence-032-full-20261105.json)
also passes all twenty workload families, 213 exact answers and 60
reopened engine profiles. Actual archived 0.31 and 0.28 stores upgrade
while preserving old history, schema meaning and replay receipts.

Core `dd6fe3f4e8f2531edc2805aef3670a00c09bf8a29165b9f2d575bd088ec7baf0`.
Companion `d458284b04d0adbd97562c1fac4fefa76aec4424747ed9330df6222e9867ea16`.
The runnable pair is `build/retained-diagnostics-20261105/accepted-032-runtime`.

Declared `live` entity types retain their authored valid intervals even for
empty records. Native put, patch and mixed batches maintain presence at
the same knowledge position as facts and receipts. Point, interval,
multi-cut, correlated lookup and typed absence queries pass with the new
format. The [presence design](NATIVE-TEMPORAL-REFERENCES-DESIGN.md) records
the contract and remaining temporal-reference/deletion work.

The integrated 0.31 scale confirmation remains the latest promoted scale
budget confirmation. The 0.32 configuration comparison above records
process CPU time and varies DuckDB threads separately from the native-call
worker pool; its candidates remain unpromoted.

## Verified 0.31 checkpoint

Exact source `212b0907f93083f8738640c17da0168d82f54eb7` passes 394 integration
checks, including 44 unchanged Triplex cases, plus TypeScript and the
separate archived-0.27 format upgrade and fence. The [verification
receipt](evidence/verification.json) pins 199 source hashes.
Core `5191449b92d71209f9739771c8e5d03c6a5525b5e800ffdde91e28db83b4b946`.
Companion `4b872cb97f4c95536f1139e215351c717c03e557476e18fb580ffb21a1f183f4`.
The exact runnable archive is `build/retained-diagnostics-20261105/accepted-031-runtime`.

All twenty families pass [213 exact engine answers and 60 reopened
profiles](evidence/workload-functional-twenty-031-20261105.json). This includes
duplicate webhook receipt replay, corrected claim coverage, cyclic dependency
closure and ordered conversion events. The first run's extra webhook reopen
check used an unsupported aggregate form. A completed source relation fixes
the harness, and the targeted repeat and all-family repeat pass.

The binary predicate passes every [paired performance
gate](SCALE-BENCHMARK.md#binary-predicate-results) in both orders on isolated
0.29 builds. Selective sixteen-reader projection p50 improves 51–57%.
Mixed throughput varies from 2.9% higher to 8.4% lower, within the declared
10% allowance. The [integrated 0.31
confirmation](evidence/mixed-10m-031-integrated-20261105.json) also passes
all fifteen checks and exact lifecycle gates at one, four and sixteen
readers. It records 362 mixed reads, 52 writes, 5.87 reads/s, 4.96 s
sampled p99 and 2.73 GB sampled RSS. The sixteen-reader fixed projection
median is 53.5 ms and sampled p99 is 73.2 ms.

## Verified 0.30 checkpoint

Exact source `e4ccec933c3b939631eb42ed4835b8698c6334af` passes 385 integration
checks, including the 44 unchanged Triplex cases, plus TypeScript and the
separate archived-0.27 format upgrade and fence. The [verification
receipt](evidence/verification.json) pins 194 source hashes.
Core `cf4d2a3563527214df8ffefb6c0a10611ddcf86e41e48c651b1a7f688a2dce57`.
Companion `4b872cb97f4c95536f1139e215351c717c03e557476e18fb580ffb21a1f183f4`.
The runnable pair is in `build/retained-diagnostics-20261105/accepted-030-runtime`.

C++ now lowers a single positive EAV rule with a range-restricted negative
EAV atom through exact typed membership, and runs correlated temporal
lookups at each driver's own valid and knowledge cuts in one snapshot.
The [fourteen-family functional gate](evidence/workload-functional-14-families-030-20261105.json)
passes 153 exact engine answers and 42 reopened profiles. Workload 20
recomputes bounded path counts and closure with independent physical
supports. Incremental graph maintenance and timed comparison remain open.

The latest [paired scale evidence](SCALE-BENCHMARK.md#first-paired-result)
qualifies 0.29. The next matched performance comparison isolates the
binary scan predicate against frozen 0.29. Its budgets are in
[SCALE-BENCHMARK.md](SCALE-BENCHMARK.md#binary-scan-predicate-comparison-budgets).

## Verified 0.29 checkpoint

Fresh exact source `9385377dffc3b3f1fc22157cc38f60261278edc5` passes
377 integrated checks, including the 44 unchanged Triplex cases, plus
TypeScript and the separate archived-0.27 format fence. The
[verification receipt](evidence/verification.json) pins 189 source hashes.
Core `9591d0f226ad13ed26e430e82c744ca09713fd36baed82ca881f42ea1cf937e3`.
Companion `fe13a80efe5202d73e34f6a69e1452a8abee35f4e6c4b1b5459bc925e50b37e2`.
The runnable pair is in `build/retained-diagnostics-20261105/accepted-029-runtime`.

The frozen [0.28 eight-type pilot](evidence/mixed-eight-type-10m-028-pilot-20261105.json)
passes exact ten-million-fact reads, concurrent ingestion and reopen.
It leaves a closed source fixture at knowledge position 39087 for the
[controlled 0.29 comparison](evidence/mixed-10m-028-029-first-pair-20261105.json).
The pair passes the predeclared initial budget at 5.60 mixed reads/s,
4.93 s sampled p99 and 50 acknowledged writes. The 16-reader projection
p50 is 129 ms. The source fixture checksum matches before and after.
A separate [operator profile](evidence/duckdb-mixed-10m-plan-profile-028-029-20261105.json)
identifies the reduction in rows passed downstream. The [reverse-order
repeat](evidence/mixed-10m-028-029-reverse-pair-20261105.json) also passes
all eleven checks. It records 5.07 mixed reads/s, 5.78 s sampled p99 and
43 acknowledged writes, with a 143 ms fixed projection p50 at sixteen readers.
The [concurrent read diagnostic](evidence/native-concurrent-public-phases-029-20261105.json)
passes 735 exact calls across three reader tiers on the instrumented pair.

### 0.29 component qualification

The [focused combined build](evidence/native-focused-planning-029-20261105.json)
at `6bef4208` passed 27 real-engine checks, TypeScript and all 44 unchanged
Triplex cases. It combines literal-entity admission, scalable join
aggregates and native dependency summaries. The later [interval query
slice](evidence/native-interval-query-029-20261105.json) passed four tests
on its matching pair. The [uptime workload](evidence/workload-uptime-18-029-20261105.json)
adds 15 exact cross-engine answers and reopen. All 71 synthetic cases now
have an immutable-event oracle.

The [combined union candidate](evidence/native-union-workload-029-20261105.json)
at `7cec72b1` passes 13 focused cases and 129 answers across the twelve
implemented workload families, with 36 reopened engine profiles. It
includes the retained reservation and interval-query regressions. The
[multi-cut candidate](evidence/native-multi-cut-029-20261105.json) adds
six exact-cut, eight-tag, admission and cancellation cases, with eleven
adjacent regressions passing on the same pair. It bounds encoded wire
expansion before materializing JSON for interval and multi-cut answers.
The isolated format-eleven presence receipt is at `cc9bba1b`. Managed
batch presence at `54877047` passes 23 focused and five pairing checks,
TypeScript and the archived 0.28 fence. Format eleven remains separate.

The [Triplex retained reservation](evidence/triplex-retained-reservation-028-20261105.json)
passed 15 scoped cases and all 44 unchanged upstream cases on the isolated
0.28-based artifact. Its source and targeted verification are integrated.
A separate [native projection proof](evidence/native-projection-028-20261105.json)
passes four exact support tests. It uses writer-local TEMP and remains an
isolated prototype pending reader-visible publication.

The [WAL disk-full gate](evidence/wal-enospc-029-20261105.json) passes on
the paired multi-cut candidate. The pinned filesystem writes 17 bytes to a
synthetic fixture WAL and raises ENOSPC. Recovery restores all 140,496 prior
WAL bytes, drops the failed receipt, and commits the same-ID retry after a
normal reopen. This qualifies the first physical WAL commit write boundary.

The frozen scale measurement and full 0.29 verification used successive
exclusive engine windows. Focused correctness runs used separate synthetic
databases during fixture setup only.

### Isolated follow-up gates

The [research-guided queue](SCALE-BENCHMARK.md#research-guided-performance-queue)
records comparison criteria and measurements. The 0.32 managed-presence
focused gate passes on source `7723e10f`. Complete verification and
larger maintenance workloads follow.

Source checkpoints awaiting real-engine qualification are format-eleven
managed presence `d61be1bc`, the corrected narrow recursive SQL proof
`d075d4fc`, native matching prefilter `a3603795` with benchmark
harness `71588f37`, raw fact transactions `ff803a2a`, and Triplex
typed-list append `169b224c`. The bounded DAG support kernel
`4c57d9c4` passes five [standalone checks](evidence/native-dag-support-proof-20261105.json);
transactional publication and incremental workload qualification remain open.

The allocation proof `c6e3787e` currently measures relation state,
indexes, dictionaries and aggregate groups through a diagnostic scalar.
Ordinary public execution and copied result rows are the next accounting
boundaries. It establishes no process-memory ceiling.

## Current 0.28 uniqueness and computed projection checkpoint

The matched build adds cross-version temporal uniqueness and bounded native
numeric projections. The core was built at
`0453f279d245a5f2caeb2dc2b115dcc1449f1c6c`. The full suite at
`bdd4b6bef63ead76432f1b23d5c043ff69557025` passes 355 checks plus TypeScript
and a separate archived-0.27 upgrade/fence test. The first full run found a
synthetic companion fixture missing the new shared header. The corrected
fixture also verifies rejection of a stale uniqueness header. The
[verification receipt](evidence/verification.json) records 180 source hashes.

Core `0e5c2a02c15f146d9040c7f41ea21f8d6bb8080b98468cdb1d5667f24c404fa5`.
Companion `fe13a80efe5202d73e34f6a69e1452a8abee35f4e6c4b1b5459bc925e50b37e2`.
A runnable exact copy with checksums is in
`build/retained-diagnostics-20261105/accepted-028-runtime`.

The [million-fact repeat](evidence/mixed-1m-028-integrated-20261105.json)
passes the predeclared budget with sixteen readers, 1,904 exact reads and
212 writes, 31.53 queries/s, 1.03 s p99 and 2.17 GB sampled RSS. One run per
build shows lower throughput and higher tail than the 0.27 repeat. The
fixture uses all eight types without format-ten activation. Dense unique
domains and eight-type ten-million-fact qualification remain open.

The [eleven-family functional run](evidence/workload-functional-11-families-028-20261105.json)
passes 114 three-engine answers and 33 reopened profiles. Refunds use native
computed signed amounts. The containment move commits a two-member batch at
one cut. The workload source is independently pinned in that receipt.

The [isolated Triplex dependency qualification](evidence/triplex-native-dependency-028-20261105.json)
passes both focused methods and all 44 unchanged upstream conformance cases.
The default factory uses native vector classification with DuckDB reduction,
returning one freshness and boundary pair per bound attribute chunk. Its
artifact identities and transfer observations have a separate receipt.

### Next qualification

The first eight-type ten-million-fact pilot used the frozen 0.28 runtime.
The raw receipt is `build/combined-028-20261105/mixed-10m-pilot.json`.
Its owned database is
`build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb`.
The pilot built history through native commands, swept 1, 4 and 16 readers,
and measured sixty seconds with sixteen readers and ongoing ingestion. It
used four DuckDB threads, 2 GB engine memory, 4 GB spill and 4 GiB logical
intermediate admission. The published follow-up budget precedes candidate
evaluation.

The next integration and qualification gates use isolated branches.

| Work | Exact checkpoint | Remaining boundary |
| --- | --- | --- |
| Triplex native dependency summaries | `e72a6108`, source `133af320` | Both focused tests and 44 unchanged upstream cases pass. Exact combined verification and latency measurement follow. |
| Temporal presence and format eleven | `cc9bba1b`, source `a5997529` | Focused, pairing and archived 0.28 upgrade checks pass. Managed batches, temporal reference enforcement, crash recovery and scale follow. |
| Native maintained projection | `9aa3c208`, source `b271778c` | Four direct-owned support maintenance cases pass. Reader-visible publication and automatic maintenance follow. |
| Join aggregate lowering | `6bef4208` | Focused set, budget and result parity passes. Full release verification and scale follow. |
| Literal entity admission | `6bef4208` | Focused exact parity passes. Same-history scale comparison follows. |

## 0.27 batch and read proof checkpoint

The combined 0.27 build adds atomic multi-entity put and patch at one knowledge
position and the revised bitemporal all-cut uniqueness proof. Exact paired
core and owner artifacts at source `23a34b22906ae8321853ad61986b49f990b8a7fb`
pass 343 checks plus TypeScript. The [verification receipt](evidence/verification.json)
records 173 source hashes. All 44 upstream Triplex runtime conformance cases
run unchanged. The 12 batch checks include three observed SIGKILL boundaries
and the archived checkpoint-aware 0.26 binary fence.

The core hash is `47f2775c53267dc4ad4645ed03324e22d5121304f8cbd4a091dc7307814c9340`.
The companion hash is `fbb59eec7a76290a99b3fc1d48e91f9f02a86519c36361c30a7dd74372b9d10f`.
The archived pairs and manifests are in
`build/retained-diagnostics-20261105/accepted-026` and
`build/retained-diagnostics-20261105/accepted-027`.
The [isolated batch receipt](evidence/native-batch-027-qualification-20261105.json)
preserves the original 128 MB failure and the passing vector expansion rerun.

The [same-history 0.26 comparison](evidence/mixed-1m-026-allcut-comparison-20261105.json)
passes the sustained eight-type million-fact gate with sixteen readers. The
candidate completes 2,181 exact reads and 269 acknowledged writes, at
36.16 queries/s, 712 ms p99 and 2.01 GB sampled RSS. The control completes
1,354 reads and 162 writes, at 22.04 queries/s and 4.08 s p99. Its fixed-cut
plans still deduplicate. Both pass exact final and reopen checks.

The closed baseline for the repeat is
`build/scale-runs/20261105T190009774Z-db30ee04/facts-1000000.duckdb`.
It has 1,000,136 retained facts and position 4045. Its raw receipt is
`build/mixed-million-20261105/first.json`. Use the fixture-clone switches in
[the scale protocol](SCALE-BENCHMARK.md) for a fresh run. The
[exact combined 0.27 repeat](evidence/mixed-1m-027-integrated-20261105.json)
passes with 2,031 exact reads, 244 writes, 33.60 queries/s and 751 ms p99.
The eight-type ten-million-fact gate remains open.

The [isolated recovery checks](evidence/native-batch-027-recovery-20261105.json)
verify revision-three backup and injected torn-WAL recovery. The
[three-engine lineage gate](evidence/workload-lineage-16-027-20261105.json)
passes nine answers and reopen. It also preserves the original refund
expression failure so the computed projection can be retested.
The [evaluator diagnostic](evidence/native-evaluator-scope-027-20261105.json)
measures native callback scopes alongside DuckDB operator and public call
timings on a separate instrumented pair. The [wide
diagnostic](evidence/native-evaluator-wide-027-20261105.json) checks 40,000
typed rows on each route and reports a 17.33 ms median for the four native
C++ spans. Raw receipts and the instrumented artifact pair are in
`build/retained-diagnostics-20261105/evaluator-profile-027`. Keep TypeScript
through all ten goals and qualify concurrent attribution before evaluating
a host-language experiment.

## 0.26 expanded-value qualification

The eight-tag build adds byte-exact JSON and blob descriptors to native
registration, writes, interval patches, point/history reads and both persisted
query routes. Format nine activates atomically and preserves older records.
The checkpoint-aware build passes 329 scoped checks plus TypeScript at
`68fede1d2a195971af3868405308019753cd534b`, with 167 source hashes in the
[verification receipt](evidence/verification.json). A
[separate run](evidence/native-document-upgrade-026-20261105.json) with the
archived 0.25 pair verifies six-tag wire, history and replay across the
upgrade and old-binary rejection after it.
The archived binaries are in `build/retained-diagnostics-20261105/accepted-025`.

The core hash is `52a21dd374798d57521c5cb9e72da2123888c7642c84c59d8f2465ce8201039b`.
The companion hash is `5ab96770afbed986b33eaa6b75f0f64c843045a636edcb9ff5922a6498d58a68`.

The first eight-type scale setup reaches 28,417 retained facts at position 112,
then rejects the next operation because the audited ownership generation was
invalidated. An explicit checkpoint reproduces the engine-created connection
open/close and the generation change. See the
[failed run](evidence/mixed-100k-026-checkpoint-failure-20261105.json).
The checkpoint-aware companion preserves the audited generation across a
verified DuckDB checkpoint. Its focused tests cover an exact concurrent read
during explicit checkpoint, automatic checkpoints and unknown-user fencing.
The [100,000-fact repeat](evidence/mixed-100k-026-checkpoint-fixed-20261105.json)
passes nine reader-sweep cells and the mixed cell with 2,305 exact reads
and 184 writes. Larger eight-type gates remain open.

Historical entitlement absence and watermark-gated workflow status pass 21
three-engine executions and reopen checks across seven oracle cases. The
[receipt](evidence/workload-absence-09-10-026-20261105.json) is functional
workload evidence with one measured sample per case.

## 0.25 datetime and reference checkpoint

The 0.25 public store uses the six-tag v2 contract with mandatory audited
native ownership. Finite datetime values and distinct reference IDs work
through schema validation, native mutations, corrections, history, bounded
evaluation and scalable SQL. Simple comparison scans and proved `ref_id`
joins retain eager type errors and exact cut semantics. Four-tag SQL wire,
schema and command identity remain stable.

Fresh matched builds pass 315 scoped checks plus semantic TypeScript at
source `5041fd5d527b2cfbfb8e94b61cea39e8f8a98e4f`. The actual 0.23 artifact
creates format-five and format-six fixtures that both upgrade atomically to
format eight. A quiesced checkpoint, closed backup and independent restore
preserve old and new answers, receipts and history, with a healthy next write.
The old artifact rejects each upgraded fixture. The standalone gate and its
receipt pin their own source and artifact hashes.

The core hash is `652a864ec192fb2ae14ba50414ca1b477d04c3bf57d3985c19f0bd1e072cc3a3`.
The companion hash is `526f7aa483d8e90445941501f8b52f433cc0c3cbcdaf9f8bf6a32af963360c13`.
The ten-item [completion checklist](TEN-GOAL-LEDGER.md#completion-checklist)
remains active. JSON and blob storage and mixed-type scale work come next.
The 0.25 public v2 screen passes 128 exact calls at one million retained
scalar facts with sixteen readers and eight native writes. The 0.24 sustained
ten-million-fact gate retains its own artifact identity.

The isolated JSON/blob evaluator is at `ebf6f0cc` on
`codex/temporal-json-blob-query-20261105`. Its matched engine receipt `69e573b4`
records ten passing tests. Use the shared bounded JSON grammar validator for
storage and admitted query carriers. Carry blob descriptors through assertion
payload, `extra_json`, history and patch fragments, with exact usage accounting.
The public 0.25 profile still admits six tags.

## Verified 0.24 ownership and scale base

Contributor requested a single audited native-ownership strategy on 5 November.
This supersedes automatic mode selection and the portable per-query audit.
The verified 0.24 runtime requires a matched companion at startup and checks the
audited generation for every persisted read and native mutation. Missing or
invalid artifacts and unsupported platforms fail startup. Only macOS ARM64
with the pinned DuckDB 2.0.0 engine is currently qualified. Fresh core and
companion builds pass 298 scoped checks plus semantic TypeScript.

The four qualified read optimizations remain enabled. Identity-count stays
disabled. The public integrity option and automatic fallback are removed.
Full retained/history audits run at startup and explicit revalidation. Live
generation checks protect bounded/native queries, scalable SQL, schema changes,
puts, patches, receipts and point/history reads, including empty and cached calls.

The independent review reproduced and closed function-shadowing and mutable-view
bypasses. Trusted helper resolution, canonical managed views, exact retained
usage and binary comparison settings are checked. Managed configuration is
locked, and user-defined database functions are rejected before initialization.

The same 0.24 artifact passes the repeated ten-million-fact, sixteen-reader,
three-minute mixed gate with 1671 exact reads and 233 acknowledged writes.
Throughput is 9.23 queries/s, p50 is 1580 ms, p99 is 3136 ms and sampled
mixed-query RSS peaks at 2.50 GB. All eighteen write-progress windows and
final/reopened answers pass. The immutable source fixture retains its original
hash. Source and artifact provenance are recorded separately from timed work.
See `evidence/single-strategy-10m-024-20261105.json`, its provenance and
independent-review receipts, and `evidence/verification.json`.

The verified source checkpoint is `75f3aa959f8b6b67b6fa451b4b376c365f4c9694`.
The core hash is `6086cafdcb344cbfcfeb8b24b15957e34a0c65c04b0eed39819e915422371aaf`.
The companion hash is `9aea136f073be9063f95fb1808b1c6f7d99c863d6fdce4e21f6a59df12ec877a`.

## Earlier 0.23 qualification

Final 0.23 verification passes 286 scoped checks plus semantic TypeScript
through `verify.py --with-owner --with-direct`. Core and companion hashes
remain identical to the measured artifacts. The independent scale review is
`evidence/mixed-10m-final-023-independent-review-20261105.json`.

The explicitly enabled 0.23 native-owned candidate meets the first scale
milestone. Its ten-million-fact, sixteen-reader, three-minute mixed run passes
all absolute gates with 1308 exact reads and 181 committed writes. Throughput
is 7.20 queries/s, p50 is 1933 ms, p99 is 4681 ms and sampled query-phase RSS
peaks at 2.15 GB. Historical/current cuts, every write-progress window and
reopened answers pass. The exact core hash is
`611590c36ed742648845fa5cb853368a5eb8bbf305120dc6cf1b80d08de0e87c`.

The accompanying million-fact screen passes all 630 optimized queries and
fails two comparison gates because strict grouped-sum queries reach their
deadline. Its nine errors and the unsuccessful setup attempt remain recorded.
The exact cause of these intermittent strict-path stalls is unproved. Strict
reads repeat retained-history validation and active-fact deduplication, while
owned reads use the audited native-write invariant. The single-strategy decision
uses the successful fast-path correctness and absolute scale gates.

## Continuing work

| Active slice | Worker branch | Next acceptance step |
| --- | --- | --- |
| Single audited ownership strategy | Integrated at `75f3aa95` | Complete with 298 checks and the repeated ten-million-fact mixed gate. |
| Atomic multi-entity native batches | `codex/temporal-batch-recovery-20261105` | Six default-memory checks pass at `f1d53094`, with receipt `20ae2cd3`. Run the crash and limit tests at `eb00306b` on the combined checkpoint-aware build. |
| Scalable single-atom comparisons | Integrated `e3511fa0` | Admitted comparisons pass. Continue broader filters and derived joins. |
| Native evaluator allocation budget | `codex/temporal-evaluator-memory-20261105` | Paused at source-only allocator/container checkpoint `086a983e`. API wiring and verification are pending. |
| Native type coverage | Integrated eight-tag source `68fede1d` | Advance from 100,000 to one million mixed-type facts. |
| Read phase attribution | Integrated operator diagnostic at `7f884c55` | Add token-scoped C++ evaluator spans and compare under reader concurrency. Keep the C++ and TypeScript stack through all ten goals. |

Every paused slice must retain the single ownership contract when rebased.
Expanded values use format nine with catalog revision two. The isolated batch
candidate uses format nine with revision three and retains the document profile.

`NATIVE-VALUE-EXPANSION.md` records the type contract. It preserves
the original four-tag answers, schema bytes and receipt identities, uses new
typed SQL entry points through the normal latest Node API, and keeps the type
transition independent of the batch migration.

The final mixed receipt is `evidence/mixed-10m-final-023-20261105-01.json`.
The failed comparison is `evidence/strict-optimized-1m-final-023-20261105-01.json`.
Both embed raw measurements and source/build provenance.

## Authorized workspace cleanup

On 5 November, Contributor requested removal of completed worktrees and unnecessary
example data. Nine completed worktrees and 102 generated database files were
removed after preserving branch refs, raw diagnostics and binary snapshots.
This includes superseded failed-run databases whose diagnostic results are
already retained. Unmerged batch, comparison and allocator source was kept.

The canonical fixtures now live in `build/retained-fixtures/` as
`scale-1m-native.duckdb` and `scale-10m-native.duckdb`. Both retain their original
verified bytes. Archived diagnostics and exact prior binaries live in
`build/retained-diagnostics-20261105/`. The cleanup receipt records previous
paths, retained hashes, removed targets and measured free space in
`evidence/workspace-cleanup-20261105.json`. Shared dependencies were preserved.

## Accepted direction

The first scale milestone is ten million retained assertions, queries over at
least one million relevant active facts, and sixteen concurrent readers during
native ingestion. Read latency, throughput, memory ownership, exact answers and
historical correctness determine acceptance. Higher scale follows this milestone.

C++ remains authoritative for schemas, commands, temporal semantics and query
planning. TypeScript and SQL expose thin interfaces. Work starts with the pinned
extension. Internal C++ integration or a DuckDB fork requires a measured advantage
that justifies its maintenance cost.

The store requires native-owned mutations and explicit revalidation after
external writes. Activation validates retained history before publishing the
audited generation. Every persisted read and native mutation must validate
that generation inside native execution. Physical native and SQL plans share
this ownership contract.

## Reproduced baseline

Starting integration head `1f19b50ba269a9b499832c412076ae969e371eb3` contains
the handoff and extension 0.18 implementation checkpoint `c08ed2dd`.
On 5 November 2026, a fresh `build_native.py` followed by `verify.py` passed
142 scoped checks and semantic TypeScript. The extension and control-addon
hashes match the previous verified build. The regenerated receipt is
`evidence/verification.json`.

The inherited implementation has a 100000-relevant-fact query gate, one-million
retained admission, full retained-history checks, and a serialized connection.
The baseline does not establish the new scale milestone.

## Original first-wave dependency order

| Work | Owner branch | Acceptance and dependency |
| --- | --- | --- |
| Scalable SQL query profile | `codex/temporal-native-scale-20261105` | Additive C++ SQL route with explicit logical resource limits, exact output and retained integrity. Unsupported programs reject explicitly. Existing bounded route retains its contract. |
| Concurrent reader ownership | `codex/temporal-readers-20261105` | Shared instance, independent reader connections, isolated control/results/prepared statements, writer visibility and complete shutdown. Defaults preserve existing behavior. |
| Scale benchmark harness | `codex/temporal-benchmarks-20261105` | Independent synthetic oracles, source/build identity, exact samples, retained/active/output counts and explicit unsupported outcomes. Depends on integrated reader and scalable-query APIs for large runs. |
| Integration and independent review | Existing Mac integration branch | Review each slice, rebuild native code, execute complete regression suite and serial performance runs, then publish a coherent draft-PR checkpoint. |

The current agent runtime permits four simultaneous agents including the
integration owner. Workers use isolated worktrees and build/database targets.
Dependencies are shared read-only. Builds and measured benchmark campaigns run
under an explicit execution lease to keep results attributable.

## Verification gates

- Test public TypeScript and SQL entry points against exact independent answers.
- Preserve typed set identity, temporal cuts, original schema meaning, receipts,
  rollback and corruption rejection.
- Prove reader overlap, commit visibility, cancellation isolation, queue behavior,
  failure cleanup and shutdown with real connections.
- Distinguish logical admission from physical memory containment. Record resource
  limits, full-path latency, throughput, tail samples and spill behavior.
- Preserve first failures, unsuccessful experiments and unsupported cases.
- Keep project-only evidence and synthetic data. Capture no computer inventory.

## Next execution steps

1. Keep the automatic verified-owned selection checkpoint and its exact
   source/build evidence current through later type changes.
2. Implement the versioned native type expansion. Datetime and distinct
   references precede JSON and blob descriptors. Preserve existing values,
   immutable schemas, replay hashes and historical answers.
3. Qualify mixed-type retained data and concurrent historical/current reads
   before choosing further performance experiments.
4. Resume the preserved batch, comparison and allocation-budget work against
   the expanded type contract. Resolve the batch default-memory failures and
   complete its independent state and crash oracles before integration.
5. Execute the twenty workload contracts through all three engines after the
   ten-goal work. All 71 named cases now have independent expected-answer
   checks, including 66 event-derived answers and five assertion-derived uptime
   answers. The oracle tests alone do not establish database support.

Each integrated checkpoint records its source and build identities, exact checks,
measurements, limitations and next action. The existing pull request stays draft
through implementation and acceptance.

## First integrated results

### Verified 0.22 qualification checkpoint

A fresh core and companion build followed by `verify.py --with-owner` passes
259 scoped checks plus semantic TypeScript. This includes the existing native
and compatibility suites, current-uniqueness and injective-projection fallback
checks, benchmark provenance tests, six experimental compatibility methods,
eight event-oracle tests and five three-engine plan tests. All 71 workload
contracts have independent expected-answer checks. The first four workload
families pass 42 three-engine case executions and 42 reopened checks through
the verified 0.22 binary. Their single-sample timings expose native public-path
overhead and do not establish comparative performance targets.

The core extension SHA256 is
`ce27628ef67c14a758250d3eb2f1117fcb5f928a93ff9b04604e806941919649`.
The companion SHA256 is
`163554b29328eeef98dfe9ba94c2d7455fda49ce52779570f94f2ebddf9fbc09`.
The normal build keeps all read experiment flags disabled.

The combined read candidate passes its clean sixty-second million-fact gate
with 5260 reads, 87.45 queries/s, 178 ms p50 and 275 ms p99. Its ten-million
mixed campaign fails, completing 497 successful reads and 71 native writes
with seven deadline errors. Final and reopened answers pass. Four short helper
test invocations may overlap that campaign, so its timings remain diagnostic.
The first scale milestone remains incomplete.

The native JSON compatibility experiment passes physical carrier and
transaction parity, including all 44 Triplex cases, but loses to the existing
typed appender at every tested batch size. A direct same-context C++ appender
spike is being prepared. The read lane is preparing a separate all-cut
uniqueness certificate and isolating the late memory/latency spike.

### Verified 0.21 storage checkpoint

Extension 0.21 passes 224 scoped checks plus semantic TypeScript through
`verify.py --with-owner`. Interval-local `patch` and `patchRecord` preserve
outside values, original schema meaning and earlier knowledge cuts. The first
committed patch atomically advances physical format 5 to 6. Literal support
guards reject unknown formats/revisions independently of persisted views.

The core extension SHA256 is
`0dd098a1e241422b8bc1bfea3646250d56bb85d2b451e9405429037136543f20`.
The paired companion SHA256 is
`163554b29328eeef98dfe9ba94c2d7455fda49ce52779570f94f2ebddf9fbc09`.
The run includes eight interval methods, three seeded state-oracle methods,
three observed SIGKILL phases within one recovery method and three format-fence
methods. The current-uniqueness, identity-count and injective-projection
experiments remain disabled in the normal build.

Two independent native read experiments pass their focused real-engine suites
and improve million-fact medians. Their raw paired results retain sixteen-reader
sum outliers and throughput regressions. The next step is a combined candidate,
tested against the same-artifact strict path before promotion, then a fresh
ten-million/sustained-ingestion campaign. The scale milestone remains incomplete.

### Earlier 0.20 ownership checkpoint

Extension 0.20 passes 209 scoped checks plus TypeScript with
`python verify.py --with-owner`. Its optional C++ companion is paired with the
core extension and actual packaged engine. It audits retained carriers and
schema/history bindings before enabling owned scalable reads. Strict remains
the default. Unknown connections invalidate native ownership, and failed or
uncertain host revalidation keeps owned admission closed.

The core extension SHA256 is
`5e9b05f2e0ecddc12652dd7bf413c7b46fa5a85e4da8178679ea62c554ebc5b2`.
The companion SHA256 is
`54456e94476405f2a7e12a2f599ad2284f8883915f93b67b16cd3ed5d121390c`.
The current companion supports the pinned macOS arm64 engine. Open and
revalidation have no public cancellation option. Owned queries retain active
DISTINCT and all logical stage/output gates. Their performance comparison is
recorded below. Ordinary `verify.py` remains the strict verification entry point.

The benchmark now supports explicit closed-fixture clones and unique native
command IDs for new mixed campaigns. Original scale fixtures remain available
for paired reads. Separate count and injective-projection experiments test
redundant aggregate work. The later 0.21 checkpoint integrates interval-local
correction and its crash recovery evidence.

The paired million-fact campaign passes every exact-answer and temporal-cut
check. Single-reader medians fall by 68–71 percent and four-reader medians by
69–79 percent. A clean sixteen-reader repeat observes all sixteen active leases
but fails the declared twofold-throughput or half-latency gate for count and
sum. Strict versus owned medians are 2738 versus 1437 ms for count, 2160 versus
1277 ms for sum, and 2259 versus 709 ms for grouped sums. Grouped throughput
improves 3.69-fold. Sampled process RSS reaches 3.06 GB with a 2 GB engine-buffer
setting. Owned mode remains experimental. A prior run with overlapping compiler
activity is retained with an explicit annotation.

The next native experiment audits current-snapshot uniqueness, including the
knowledge frontier, and permits current-only DISTINCT elision when that native
capability is earned. Historical queries and failed capability checks keep the
existing DISTINCT path. A separate count-projection experiment remains isolated.

The owned ten-million clone screen passes nine of ten cells under the same
2 GB engine-buffer and 4 GB temporary-storage profile. Sixteen concurrent count
queries have a 22.20-second median, and grouped sums have an 18.94-second median.
All sixteen measured sum calls hit the 60-second deadline. A sixteen-reader
count burst overlaps eight new native writes and verifies 10000008 facts at
position 2450. The original fixture remains unchanged. This is partial capacity
and concurrency evidence, and does not complete the scale/performance milestone.

### Earlier 0.19 scale checkpoint

Extension 0.19 now passes 177 scoped checks plus TypeScript, including the legacy
suites, actual million-fact native queries, reader lifecycle/admission and new
public scalable entry points. Pooled queues have explicit bounded admission.

The native scale campaign passes all ten cells at 100000 and 1000000 active
assertions for 1/4/16 readers, with exact count/sum/grouped results and native
write-burst overlap. The million-fact fixture contains 245 native entity records.
Short-sample single-reader medians are approximately 274–280 ms and sixteen-reader
medians approximately 2.56–2.90 seconds. Raw receipts preserve the outliers.

Two setup experiments exhausted the configured memory during SQL-expanded
fixture generation or receipt auditing. The corrected harness uses native
commands by default and checks receipt membership through bounded grouped
comparison. Both failures remain in `evidence/` alongside the successful runs.

Next work is the ten-million screen, sustained ingestion and reader fairness,
and an isolated pinned C++ audited-ownership activation experiment.
The probe grants no validation bypass. Workload contracts are captured
separately from their future three-way execution benchmark.

The initial C++ lifecycle probe has now passed five checks against the selected
packaged Node engine. It demonstrates instance/context identity, invalidation
on unknown connection creation, prepared execution guards and transaction
callbacks. The first mangled-entrypoint failure and corrected build are kept in
`evidence/native-owner-probe.json`. A follow-up audited-activation experiment is
under development in the isolated worker branch. Production reads retain their
strict integrity path.

The twenty-workload contract packet is present under `workloads/`, with 71
named cases and 153 synthetic assertions. Structural checks cover every case
and 31 small arithmetic/temporal/support oracles have independent checks.
Execution through the three query engines remains subsequent work.

The next ownership optimization experiment must retain exact answers and
charge its initial full audit separately. Its screening gate is at least twice
the concurrent throughput or half the matched complete-call latency on the
million-fact fixture at the same declared resource settings. This gate selects
an implementation candidate. Production latency objectives require sustained
measurements and broader data shapes.

## Ten-million capacity experiment

The first 1 GB memory profile failed at native command index 1979 with a fatal
checkpoint allocation error. There were 1979 acknowledged commands and 8105984
acknowledged assertions. The read phase had not started.

A read-only reopen under a 2 GB profile found the failed command absent, all
8105984 assertions with valid retained carriers/history, matching usage and no
failed-command owner/header/orphan rows. The original database and WAL were
cloned and hashed before resuming. The recovery receipt is
`evidence/scale-10m-recovery-20261105.json`.

The same deterministic command sequence resumed from index 1979 under an
explicit 2 GB memory / 4 GB temporary-storage profile. This is a separate
capacity experiment. The original 1 GB failure remains part of the evidence.

The continuation completed all 2442 native commands and ten million assertions.
A combined benchmark-audit query then exhausted memory, and was split into
sequential checks. A subsequent read-only audit verified every retained carrier,
native history row and usage total, with values 0 through 9999999 and exact sum
49999995000000. One public `queryScalable` count returned exactly 10000000 at
position 2442 in 3691 ms. Multi-reader ten-million acceptance remains pending.

The shared port now fences every reader and writer after an actual-format fatal
DuckDB error. Subsequent calls report `RESTART_REQUIRED` with the initiating
error as cause. Four tests exercise this separately from recoverable memory
errors. The twenty-workload contract validator is part of full verification.
