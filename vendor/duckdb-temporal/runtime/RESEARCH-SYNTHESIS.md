# Research synthesis and implementation decisions

Updated 6 November 2026. This is the working synthesis for the remaining
ten-goal work, alongside the [acceptance ledger](TEN-GOAL-LEDGER.md) and
[measured performance queue](SCALE-BENCHMARK.md#research-guided-performance-queue).
Research informs implementation; only actual public-entry-point qualification
closes an acceptance item.

The [revised execution plan](NATIVE-TEMPORAL-STORE-PLAN-20261106.md) follows a
new three-lane implementation-source swarm. Its [local corpus and reports]([LOCAL_PATH_0033])
contain14 pinned working checkouts plus the reused DuckDB source archive,
covering triple stores, FoundationDB/Record Layer, event/temporal stores and
incremental execution. The reports distinguish techniques already present,
isolated prototypes and untried mechanisms. Direct DuckDB controls, complete-call
attribution and distinct-entity scale move earlier. Implementation is paused
for plan review; no new cost measurement or promotion follows from this research.

## Inputs and evidence boundary

The new [issue index]([PRIVATE_REFERENCE_REMOVED])
adds four final reports to the earlier
[DuckDB, Soufflé, MeTeoR, XTDB, Differential Dataflow and DBSP research](../handoffs/research-index-20261104.md).
Use these pinned reports rather than a moving branch:

| Report | Adopted direction | Next actual-engine acceptance |
| --- | --- | --- |
| [26: recursive SQL]([PRIVATE_REFERENCE_REMOVED]) | C++ owns eligibility, SCC scheduling, bounds and cancellation; DuckDB executes relational work. | Useful linear recursion and small-frontier/large-domain cases, then a one-reader SQL-round controller. |
| [27: incremental relations]([PRIVATE_REFERENCE_REMOVED]) | Transactional support and membership tables with an exact publication identity. | Common mutation hook, same-snapshot publication and lifecycle cost on the preserved DAG experiments. |
| [28: native memory]([PRIVATE_REFERENCE_REMOVED]) | Reserve overlapping live capacities before allocation; distinguish native, engine and host owners. | Ordinary 40,000-row gate now passes; shared request/instance accounting, broader integration and denial cleanup follow. |
| [29: temporal references]([PRIVATE_REFERENCE_REMOVED]) | Preserve reference identity and add explicit immutable schema coverage policy over managed presence. | Final-state interval coverage through native transactions, followed by deletion and bounded cascades. |

Their Python models cover recursion, signed support changes, allocation
accounting and interval/cascade invariants. These are independent design
checks, not native integration, spill, concurrency or latency qualification.
Do not add their counts to the current435-check integrated receipt or close goals
from them. The reports audited an earlier 0.32 source; reconcile recommendations
with later preserved experiments before implementing them again.

## Current priority and measured decisions

The same-workload wave rejected static3, static4 and fair4 query scheduling
under unchanged broad budgets, despite faster ingestion. Their failures remain
in the [cohort log](CONCURRENT-INGESTION-COHORT.md). The dedicated C++ writer
avoids shared libuv write execution and wins the complete screen: both matched
orders27/27, both original B0 whole-runtime orders27/27, original anti16/16,
unchanged512 ACK trace and active-start recovery. This supports the C++/DuckDB
ownership change; it does not establish a need to replace TypeScript.

Source1d6378e2 now passes the fresh [full435](evidence/native-writer-integrated-full-20261106.json)
and [exact default-build/public7](evidence/native-writer-default-build-20261106.json)
gates. One automatic native writer and reader-wide ownership are promoted;
there is no public strict/fast switch. Goals2/4/5 close, seven goals remain.

Issue29 directly informed the [raw presence5](evidence/native-presence-intervals-first-20261106.json)
and [thin SDK5](evidence/native-presence-intervals-sdk-20261106.json) isolated
engine gates. Visible events are scoped before bounded materialization; latest
PUT plus later PATCH intervals coalesce using a preceding running maximum.
Prepared owner/clock guards, caller transactions, exact endpoints/UTF8 budgets,
rollback/replay/reopen pass. Logical caps do not prove physical containment.

The next [coverage4 gate](evidence/native-reference-coverage-first-20261106.json)
passes fresh paired builds/TSC and unchanged independent tests. Immutable
schema5 policy and format12 preserve legacy identity-only definitions. Native
transactions validate surviving original-policy edges and unchanged incoming
edges against one final source/target overlay. One proof CTAS replaces the
initial nine-stage proposal after source cost review. Audit remains paged and
generation-coherent, rather than a pinned MVCC transaction. Boundary/cap,
old-binary fence, large-history audit, no-policy overhead, dense-history cost
and full integration are still required. These isolated results do not close1/9
or get added to main435.

## Actual DuckDB operator diagnostics

The [three-cell profiler](evidence/presence-profile-first-success-20261106.json)
now fully fetches real rewritten PRAGMA results, copies observed JSON before
another SQL statement and associates the generated presence CTE query with149
physical operator nodes per cell. Nested, batch-reset and missing targets have
exact typed results atK18. It preserves two prior failures: enable JSON before
setting a.json output, then decode the actual pinned engine schema. DuckDB2
JSON uses `query.sql`, `operator[]`, operator `timing`/`intermediate_rows` and
`system.peak_buffer_memory`; legacy root `query_name` assumptions were wrong.
The pinned `query_profiler.cpp` and `metrics.hpp` define units; the
[official metrics guide](https://github.com/duckdb/duckdb-web/blob/main/docs/current/dev/metrics.md)
is useful background but does not override observed2.0 output.

Profile-enabled host fetches take11.28–13.02ms, engine query totals9.60–10.89ms,
with21.68–24.71MB peak buffer memory on these small fixtures. Operator CPU,
query wall time, host conversion and C++ emission are distinct measurements;
overlapping spans cannot be subtracted into exclusive attribution. These
figures are diagnostics, not unprofiled service latency or allocation bounds.

The [first paired cost screen](evidence/native-reference-coverage-cost-first-20261106/receipt.json)
now passes six small functional trials. Both zero-policy orders show a median
public ACK regression:78.924→112.168ms and77.922→110.379ms (1.421/1.417×).
Native SQL-call medians track the same increase; those spans include parsing,
binding and execution. Unrelated/incoming ACK medians are113.901/114.766ms,
while revalidation medians are0.293/2.067s. No operator trace yet identifies the
extra33ms exclusively. Root independently derives all51 path-only projected
raws,96 measured ACKs,18opens and18revalidations; bigint strings and every other
non-path byte remain unchanged. Short diagnostic tails are not SLO evidence.

The [actual public-patch profiles](evidence/coverage-command-profile-pair-20261106.json)
now associate29baseline versus31candidate expanded statements, including8versus9
CTAS. The added6,084byte reference guard has231operators,30.362ms query time,
21.769ms optimizer time,3.505ms planner time and0.908ms CPU metric. Parser metrics
are absent. Common admission statements are essentially unchanged. Root decodes
all60objects directly from native stderr and matches every extracted JSON plus
identical public request, full receipt and eight-row property history. These
native timers overlap; they are not an exclusive decomposition of public wall.

The [first capture failure](evidence/coverage-command-profile-first-failure-20261106.json)
keeps its successful actual public call and truncated pipe JSON. The working
capture changes only transport to inherited regular-file FD2, verified in the
child. No SQL splitting, native rebuild, request/config change or decoder repair
is used. Source shows separate EndStatement profiler emission while the original
public PRAGMA remains intact. The exact short-write mechanism is not proven.

The [three-overhead-spike contract](NATIVE-REFERENCE-COVERAGE-OVERHEAD-SPIKES.md)
sets budgets before implementation: no-policy median≤1.05×2f in both orders,
p95≤1.15×; policy-case write/open/revalidate medians≤1.10×qualified a562 controls.
It compares fusion into existing validation, a typed view over audited canonical
IR, and a rebuildable typed policy table with transactional registration maintenance
and startup/revalidation equivalence. All three isolated source slices are now
prepared; no speedup is claimed before their focused engine and cost gates. Preserve all public semantics/bytes and
128MB/64MB limits. The pinned PRAGMA preprocessor commits its own preprocessing
transaction before expanded command execution, so an initial cached absence
read cannot safely omit later coverage. This is a constraint on a proposed
optimization, not a defect in the current always-guarded implementation.

Covered growth still fails at128MB. [Read-only reconciliation](evidence/native-reference-coverage-growth-diagnostic-20261106.json)
proves260commits/K261 but not ACKs. The [fresh phase trace](evidence/native-reference-coverage-growth-trace-first-20261106.json)
then proves260actualACKs and three exact count routes before OOM inside
revalidate. Base integrity, uniqueness, presence, coverage pages and all-cut
proofs run there; the failing subaudit is not yet identified. The [paired same-IR4 growth diagnostic](evidence/native-reference-identity-growth-pair-first-20261106.json) now reproduces revalidateOOM in both2f and a562: each has260ACKs/K261 and three exact count routes before the failure. Both cleanly close with unchanged source/artifacts. This establishes a preexisting2f boundary without coverage, while leaving the internal subaudit and additional coverage costs unresolved. The original failure,
new1060event trace and closed fixtures remain preserved, without a cap raise.

## Goal 3: useful recursive SQL before deeper coupling

Start with an effect-free positive linear `UNION` plan only when conservative
whole-run bounds admit an intended workload. Exact full typed tuples define
novelty; path or depth payload cannot change deduplication identity. Validate
the entire program so disconnected faults remain observable.

A source-preserving `S*V` bound can reject one root with only 256 reachable
nodes in a million-node disconnected domain. Include that case before
promoting CTE-first. If it cannot be admitted usefully, bring the C++ SQL-round
controller forward rather than raising public output limits. One leased
reader and one snapshot must cover source admission, every round and output.
Per-predicate All/Delta/Next relations and simultaneous SCC publication must
cover nonlinear fresh-versus-accumulated joins; delta-versus-delta alone is
incorrect. Preserve lower-stratum completion and eager errors.

Reserve join prefixes, witness multiplicity, old/new state, novelty, sorting
and output before construction. Costing chooses among eligible admitted plans;
it is not a proof of bounds. Scalable SQL logical budgets remain distinct
from native maxRounds/maxWork counters. Existing pinned collection APIs can
stage spillable rows but do not provide a spillable novelty index. Extension
boundaries have not yet demonstrated a need for a DuckDB fork. See the
[independent source delta](RECURSIVE-SQL-RESEARCH-DELTA.md).

## Goals 6 and 8: ownership and publication before reuse

Issue 28 could not resolve its historical allocator source. We now have
stage-two source `dd86a404` and receipt checkpoint `eea9d495`: nine ordinary
public/raw methods plus standalone tests pass on the isolated runtime.
Borrowed encoding already removes the extra owning answer copy on ordinary
scalar callbacks. Requested retained capacity has a provisional 64 MiB
per-evaluator cap. The [ordinary 40,000-row gate](evidence/native-evaluator-wide-ordinary-032-review-20261105.json)
now passes first/repeat/reopen on its first attempt, each with 17,184,432
accounted retained peak bytes and exact native counters. Compiler, import
scratch, upstream DISTINCT/LIST construction, DuckDB vectors and V8 are not
all covered. No shared instance byte ledger exists. The
[independent delta](evidence/issue28-memory-independent-delta-20261105.json)
records these distinctions; its historical approval-wait and unrun-wide-gate
sentences are superseded by the approved SDK contract and new actual receipt.

Finish broader allocator integration, then extend reservation coverage, charge old/new overlap
and qualify balanced release under actual compiler/import/rehash/sort/encoding
denials and concurrent callers. Measure engine spill and host memory separately.
A pre-LIST raw-row cap may reject duplicate-heavy history previously admitted
after DISTINCT; it requires an explicit contract decision or bounded staging.
The [shared-owner comparison](SHARED-NATIVE-BUDGET-DESIGN.md) favors existing
C APIv2 function user data over a token registry alone or a new C++ hook.
The isolated [raw lifetime gate](evidence/native-memory-owner-probe-first-032-20261105.json)
and [public cancellation/reopen gate](evidence/native-memory-owner-probe-second-repaired-032-20261105.json)
now pass with the same native probe bytes. The first public setup path mismatch
is preserved and repaired only in its fixture. Partial entrypoint failure/retry,
prepared handles beyond final close and actual shared requested-capacity
reservations remain open. Source-only diagnostic `78cc4ed7` addresses those
lifetime gaps with a recorded late registration failure and one retry. Source
review suggests partial registration/replacement can retain old function owners;
the entrypoint owner must not be called a database singleton from the two passing
tests. Investigate the existing C++ companion's per-instance anchor where the
C API boundary lacks stable instance ownership. These observations do not
establish shared bytes or change the selected SDK's token-zero transport.

For maintained relations, canonical writes, support changes, membership and
publication headers belong in one DuckDB transaction. Every mutation route
must maintain or invalidate them. Match the complete database incarnation,
input epoch, schema/program/compiler/codec identity and temporal cut. Read
the header and rows in one snapshot; empty READY is valid. An ineligible
projection recomputes canonically at the same cut inside the one C++ strategy.
Scheduled valid-time changes and imported knowledge-boundary crossings must
advance or invalidate the projection even without a new command ID.

Keep physical assertion support, logical tuple membership, rule grounding and
DAG path counts distinct. A 2-to-1 support change retains membership; 1-to-0
removes it. Cyclic deletion needs affected-component recomputation or qualified
DRed. Old pinned generations, new builds, deltas, rollback and output overlap
need lifetime budgets. Both preserved DAG candidates failed unregistered
write-cost gates; neither their standalone proof nor issue 27 qualifies
production reuse. Include build, update, publication, catch-up and storage
costs in the final three-engine comparison.

## Goals 1, 9 and 10: temporal coverage on existing presence

Reuse managed presence from 0.32. Stable reference identity keeps its current
meaning. New schema coverage policy requires the complete source interval to
be covered by the union of target-presence intervals at the same committed K.
Presence does not imply arbitrary required target properties. Evaluate the
final overlay of the whole batch, including same-batch forward references,
before rejecting uncovered edges.
Unmanaged or unknown presence cannot satisfy coverage. Empty valid live
records remain present; explicit deletion clips presence and the entity's
attributes and outgoing references over the authored interval.

Latest PUT replaces authored presence; only later PATCH intervals add to it.
Unioning every historical PUT is incorrect. Half-open int64 intervals need
checked endpoints and a running maximum when coalescing nested intervals.
Begin with final-state rejection. Then specify interval-local deletion,
detach and reverse cascade separately, with deterministic receipts and bounded
newly removed endpoint cells. Cycles are legal and do not seed deletion.

Keep old schema hashes, validator origins and replay meaning immutable.
Domain-wide activation must be explicit and auditable. Native and pinned
Triplex checks have different existing existence/cardinality behavior; define
delegation in C++, with boundary tests for descriptor identity, int64 values,
required references, historical cuts, rollback and reopen. The unchanged
44-case Triplex suite alone does not close full graph delegation.

The durable sequence is SDK fairness qualification, ordinary allocator
qualification, then bounded recursion/publication/reference slices driven by
their actual acceptance gaps. Keep TypeScript through all ten goals and use
measured transfer/decoding costs for any later Rust comparison.
