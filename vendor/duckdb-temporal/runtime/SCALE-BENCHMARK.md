# Scale and concurrent-read benchmark

## Current scale qualification

The second-wave [C2 experiment](evidence/antijoin-config-c2-10m16-20261105.json)
passes its first sixteen-client eight-limit screen on the native patch
candidate: 6.408 reads/s, 2.969 s sampled p99, 420 acknowledged writes and
2.420 GB sampled RSS. Native driver pruning misses two of sixteen limits;
one DuckDB thread misses six of eight. Exact answers and lifecycle pass.
The [cohort outcome table](CONCURRENT-INGESTION-COHORT.md#second-wave-outcomes-and-selected-sdk-slice)
preserves controls and failed arms. C2 advanced to automatic SDK
admission under [query contract v2](SDK-QUERY-ADMISSION.md), with the original
invocation's writer barrier and timeout including queue time.
Its [92 focused methods](evidence/sdk-query-admission-v2-focused-20261105.json)
and [small actual-SDK one/sixteen-client profiles](evidence/antijoin-sdk-small-20261105.json)
pass, with the full 512-write trace and no outer queue. The
[first original-limit 10m SDK screen](evidence/antijoin-sdk-full-20261105.json)
passes all sixteen one/sixteen-client gates; at sixteen clients it records
6.210 reads/s, 3.022 s sampled p99 and 372 writes. The isolated candidate also
passes [422 integrated checks](evidence/sdk-integration-full-20261105.json),
[all twenty functional families](evidence/sdk-integration-functional-20-20261105.json),
both [forward](evidence/antijoin-sdk-forward-pair-20261105.json) and
[reverse](evidence/antijoin-sdk-reverse-pair-20261105.json) anti-join comparisons,
and [deterministic ten-million-fact cycle/replay checks](evidence/antijoin-sdk-cycle-20261105.json).

Its [broad eight-type comparison](evidence/sdk-broad-forward-20261105.json)
then fails six of27 predeclared checks. Static3 slows fixed medians at
four/sixteen readers and records a3.333 s mixed median versus a3.2 s cap.
Exact answers and lifecycle pass, writes rise46→1,067 and mixed p99 improves
5.417→4.240 s, but that tradeoff does not qualify promotion. The first missing
SQL-asset setup failure and the exact staging repair are preserved. No reverse
or retry follows the numerical failure. The next
[same-workload wave](CONCURRENT-INGESTION-COHORT.md#broad-regression-failure-and-next-competing-wave)
compares static4, fair read/write service and native C++ writer execution.
No candidate is promoted; full original and broad budgets remain unchanged.

The [common-workload protocol](CONCURRENT-INGESTION-COHORT.md) pins three
competing approaches to the same 10m history, typed anti-join oracle,
cyclic correction ingestion and unchanged latency/throughput/memory limits.
The [control](evidence/native-antijoin-cost-1m-10m-032-20261105.json) passes
the million-fact gate; at 10m correctness and cleanup pass but ten of sixteen
numeric checks fail. Sixteen-client mixed throughput is 3.239 queries/s,
sampled p99 is 7,998.5 ms, and fifteen writes complete.

The [native patch diagnostic](evidence/native-patch-profile-10m-032-20261105.json)
isolates full retained-history validation in patch admission: 10,000,534
rows, with 3,169.1 ms execution in the separately phased observation.
Candidate B exposes the existing entity equality as a literal in C++-generated
SQL. Candidate A explicitly changes the pending-write freshness contract;
candidate C admits three query calls for sixteen logical clients. No candidate
is promoted. [C's timed screen](evidence/native-antijoin-concurrency-c-10m-16-20261105.json)
fails five of eight numeric checks: 1.145 queries/s, 19.23 s p99 and twenty
writes; exact answers and lifecycle pass. It is rejected without further
timing. Parallel development uses isolated targets; timed comparisons receive
exclusive engine/build windows.

[A's first timed screen](evidence/cohort-a-read-scheduling-screen-20261105.json)
also fails five of eight numeric checks: 4.344 queries/s, 6.704 s p99 and
twelve writes. Exact typed cuts and all 211 measured latest-read ACK lower
bounds pass, but the candidate has a different pending-write contract and
is rejected. [B's focused gate](evidence/native-write-candidate-focused-032-20261105.json)
passes eighteen methods and both 100k/10m four-clone diagnostics. At 10m the
history scan reads 534 tail rows and validates two targets; one public patch
takes 129.0 ms. Its [first full mixed screen](evidence/native-write-cohort-10m-032-20261105.json)
passes all one-reader gates (214 reads, 428 writes, 409 ms p99), but fails five
sixteen-reader gates (280 reads, 29 writes, 4.4275 queries/s, 6.746 s p99).
All exact answers and lifecycle checks pass; no promotion follows. The
second wave compares native driver pruning, one DuckDB thread and fair
query admission on this same B0 control. The remaining global
provenance-source scan is one row on this fixture, so this does not establish
target-only I/O on arbitrary histories.

## Eight-type ten-million-fact pilot

The [frozen 0.28 pilot](evidence/mixed-eight-type-10m-028-pilot-20261105.json)
builds the exact eight-type history through native commands and passes all
nine fixed cells and the mixed final/reopen checks. Its 16-reader mixed cell
completes 176 exact reads and 22 acknowledged writes, with a write in every
complete ten-second window. It records 2.83 reads/s, p50 of 5.09 s, p99 of
11.34 s and 3.05 GB sampled during measurement. The pre-warmup RSS snapshot
is 3.31 GB. The narrow 256-row projection at sixteen readers is the slowest
fixed cell at 8.87 s p50 and 24.10 s p99 across 48 samples.

## First eight-type ten-million-fact comparison budgets

Freeze these initial engineering budgets before the first 0.29 measurement.
They apply to matched APFS clones of the closed 0.28 pilot database, with
the same native ownership, query mix, thread, memory and spill settings.
The initial closed database has the 10-million-fact base plus the pilot's
22 acknowledged additions. Each measured run uses a fresh clone.

| Cell | Candidate threshold |
| --- | --- |
| 16-reader fixed projection | p50 ≤ 4.5 s and sampled p99 ≤ 12 s |
| 16-reader sustained mixed, 60 s | ≥ 3.5 reads/s, p50 ≤ 4.5 s and sampled p99 ≤ 9 s |
| Fixed count and grouped count | p50 ≤ 115% of the paired 0.28 control at the same tier |
| Mixed resource and lifecycle | sampled RSS ≤ 3.5 GB, all 16 reader leases used and returned, no query or write acknowledgment errors, committed writes in every complete 10 s window, exact final and reopened answers |

The initial fixed and sustained tails are pilot checks. The baseline has 48
fixed samples per 16-reader cell and 176 mixed samples. Repeated samples and
longer windows remain necessary before setting a service latency objective.

### First paired result

The [0.28 to 0.29 pair](evidence/mixed-10m-028-029-first-pair-20261105.json)
passes every predeclared check. It uses two independent clones of the same
closed database at knowledge position 39087. The canonical source's SHA256
matches before and after. Both builds pass exact final and reopened answers.

| Measurement | 0.28 | 0.29 |
| --- | ---: | ---: |
| One-reader fixed projection p50 | 508 ms | 23.5 ms |
| Sixteen-reader fixed projection p50 | 18.02 s | 129 ms |
| Sixteen-reader mixed reads/s | 2.63 | 5.60 |
| Mixed p50 | 5.74 s | 2.50 s |
| Mixed sampled p99 | 11.94 s | 4.93 s |
| Mixed sampled RSS | 3.00 GB | 2.55 GB |
| Acknowledged mixed writes | 22 | 50 |

The fixed projection returns the same 256 typed rows. The broad count and
grouped-count p50s meet their regression bounds at one and sixteen readers.
Each build acknowledged a write in every complete ten-second window.

The [reverse-order pair](evidence/mixed-10m-028-029-reverse-pair-20261105.json)
also passes all eleven predeclared checks on fresh clones of the same closed
history. Both builds pass exact answers, writes in every complete ten-second
window, and reopen.

| Reverse-order measurement | 0.28 | 0.29 |
| --- | ---: | ---: |
| One-reader fixed projection p50 | 518 ms | 22.9 ms |
| Sixteen-reader fixed projection p50 | 16.86 s | 143 ms |
| Sixteen-reader mixed reads/s | 2.76 | 5.07 |
| Mixed p50 | 5.08 s | 2.80 s |
| Mixed sampled p99 | 12.26 s | 5.78 s |
| Mixed sampled RSS | 2.91 GB | 2.47 GB |
| Acknowledged mixed writes | 24 | 43 |

Sixteen-reader grouped count was 7.5% slower on 0.29 in the reverse
pair, within the 15% budget. Its median improved in the first order. The
largest fixed broad-query RSS increase in the reverse pair was 620 MB at
sixteen-reader count. The fixed 16-reader p99 is the maximum of 80 samples
in each pair. Longer
independent runs are required to set a service latency objective.

In the separate [DuckDB operator profile](evidence/duckdb-mixed-10m-plan-profile-028-029-20261105.json),
the main projection scans each emit about ten million rows on 0.28 and
256 rows on 0.29. The candidate still inspects ten million rows in a
primary scan because the entity filter compares encoded values. The
count controls emit the same broad input on both versions. The isolated
[binary predicate](evidence/native-binary-pruning-029-20261105.json)
passes twenty scoped checks and lets DuckDB skip row groups. Its largest
projection scan inspects 2.66 million rows on the same closed history
and emits the same 256 typed rows. Concurrent performance still needs
a matched run.

### Concurrent C++ and host diagnostics

The [0.29 diagnostic build](evidence/native-concurrent-public-phases-029-20261105.json)
passes 735 exact public queries across 1, 4 and 16 readers. The profiler
correlates native evaluator scopes, SDK awaits, transport and typed result
assembly using the invocation's own control token. These read-only waves
use a separate synthetic fixture with 45,000 relevant facts.

| 40,000-row projection | Public median | Explicit host scopes median |
| --- | ---: | ---: |
| Native, 1 reader | 186 ms | 115 ms |
| Scalable SQL, 1 reader | 181 ms | 145 ms |
| Native, 16 readers | 1,598 ms | 108 ms |
| Scalable SQL, 16 readers | 1,401 ms | 102 ms |

The host scope sums the synchronous transport remainder and typed result
assembly per request. The SDK await interval grows sharply at sixteen
readers and includes DuckDB, binding work and event-loop scheduling. The
four native evaluator spans are nested within that wall time. Separate
DuckDB EXPLAIN runs describe operator work. The measurements cover three
warm waves per mode at each reader tier.

## Research-guided performance queue

The [working research synthesis](RESEARCH-SYNTHESIS.md) incorporates the four
final issue 26–29 reports and reconciles them with later allocator, DAG and
concurrent-read experiments. It records the next actual-engine gates and
keeps model checks separate from runtime acceptance. Query fairness does not
close shared memory accounting; current SDK qualification remains first.

The [ten-million-fact pilot](evidence/mixed-eight-type-10m-028-pilot-20261105.json)
establishes the starting measurements. Prior design packets are indexed in
[the research handoff](../handoffs/research-index-20261104.md). The following
experiments use their constraints and need fresh qualification on the pin.

- **DuckDB scan work.** The 0.28/0.29 pair and later explicit binary predicate
  meet their paired budgets; the integrated0.31 confirmation below preserves
  the accepted result. Do not repeat those checks without new source or an
  unresolved concern. For new layouts, check scan row groups, scanned rows,
  spill and public latency together.
  Try ordering a rebuildable projection by the useful keys
  before considering an ART index, and charge the layout's build and write
  cost. [DuckDB indexing](https://duckdb.org/docs/guides/performance/indexing),
  [operator profiling](https://duckdb.org/docs/current/guides/meta/explain_analyze).
- **Soufflé search patterns.** Derive bound-column patterns from the native
  IR. Compare a small selected composite index set with the current per-column
  indexes on skewed joins, recursion and negative membership. Count index bytes
  and construction time. Keep exact answers and preserve documented eager
  errors and budget behavior. A different delta schedule needs a separately
  specified work contract. [Automatic index selection](https://psubotic.github.io/papers/p141-subotic.pdf),
  [project negation performance review](../research/roadmap/iteration-04/checkpoints/pure-performance-20261031/trace-safe-negation.md).
- **MeTeoR interval deltas.** Compare full endpoint-segment evaluation with
  an interval-local update over the affected relation, coalescing by exact
  typed tuple for value coverage. Track proof/support changes separately so
  equal value coverage can span a change in contributors. Qualify finite
  endpoints, gaps, repeated corrections and complete recomputation parity
  before broader recursion. [Seminaïve materialisation in DatalogMTL](https://arxiv.org/html/2208.07100v2),
  [project interval research](../handoffs/research-index-20261104.md).
- **XTDB bitemporal cuts.** Preserve the distinct valid and recorded coordinates
  in correlated lookups. Workload 19 must recover each prediction's captured
  feature knowledge, while label visibility follows the outer cut. Include
  restatements and predictions with different coordinates. [Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html),
  [point-in-time feature extraction](https://docs.xtdb.com/adbc/guides/point-in-time-feature-extraction.html).
- **Differential Dataflow and DBSP maintenance.** Qualify reader-visible
  publication of the fixed-cut maintained projection first. Then compare
  a signed-support update on a bounded acyclic graph with full recomputation
  after every acknowledged edit. Removing one support keeps set membership
  while removing the last support changes it. Account for build, update,
  storage and catch-up costs. Share state only within the matching audited
  database generation, schema/program identity and completed cut. Measure
  behavior on rollback, reopen and rebuild before expanding to cyclic
  deletion or negation. [Shared Arrangements](https://www.vldb.org/pvldb/vol13/p1793-mcsherry.pdf),
  [DBSP](https://www.vldb.org/pvldb/vol16/p1601-budiu.pdf),
  [project cache boundaries](../research/roadmap/iteration-08/checkpoints/current-planner-cache-split-20261103-1915/README.md).

The engine, native evaluator and public transport observations use separate
scopes. Keep the TypeScript host for all ten goals and base a later host
comparison on concurrent transfer and typed assembly measurements.

## Binary scan predicate comparison budgets

Compare the exact frozen 0.29 runtime with the isolated binary predicate
source `31db38c0`. The operator profile inspected 2.66 million rows on the
candidate and 10.00 million on 0.29 for the same 256 typed answers. The
public comparison uses fresh clones of the closed K39087 history, four
DuckDB threads, 2 GB engine memory, 4 GB temporary storage, and the same
fixed and sustained workload as the previous pair.

| Measurement | Candidate gate |
| --- | --- |
| Fixed projection at 1 and 16 readers | p50 ≤ 80% of control at each tier, with absolute limits of 19 ms and 115 ms |
| Fixed projection at 16 readers | Sampled p99 ≤ 85% of control and ≤ 185 ms |
| Fixed count and grouped count | p50 ≤ 115% of control at both tiers and sampled p99 ≤ 120% at sixteen readers |
| Mixed read throughput | ≥ 90% of control and ≥ 4.8 reads/s |
| Mixed latency | p50 and sampled p99 ≤ 115% of control, with absolute limits of 3.2 s and 6.5 s |
| Mixed ingestion and resources | Write throughput ≥ 90% of control, at least 40 acknowledged writes, and sampled RSS ≤ 3.5 GB |

Require exact typed rows and cuts in all cells, sixteen reader leases used
and returned, an acknowledged write in every complete ten-second mixed
window, exact final and reopened answers, and identical closed source
hashes before and after. Run the control first and reverse the order if
the first pair clears the screen. Both orders must pass before promotion.
The fixed p99 uses at most 80 samples per cell.

### Binary predicate results

The [control-first pair](evidence/native-binary-predicate-10m-first-pair-20261105.json)
and [candidate-first pair](evidence/native-binary-predicate-10m-reverse-pair-20261105.json)
pass all fifteen numeric gates and exact lifecycle checks on fresh clones.
Both source hashes remain unchanged. These measurements isolate the binary
predicate on 0.29 before combining it with later query changes.

| Selective projection | Control first | Candidate first |
| --- | ---: | ---: |
| One reader, control → candidate p50 | 27.3 → 13.7 ms | 41.2 → 15.4 ms |
| Sixteen readers, control → candidate p50 | 139 → 68.8 ms | 138 → 59.0 ms |
| Sixteen readers, control → candidate sampled p99 | 217 → 101 ms | 187 → 86.6 ms |
| Mixed reads/s, control → candidate | 5.27 → 5.43 | 5.77 → 5.29 |
| Mixed acknowledged writes, control → candidate | 45 → 48 | 50 → 47 |

The projection gain repeats across both orders. Mixed throughput ranges
from 2.9% higher to 8.4% lower, within its declared 10% bound. In the first
order, sixteen-reader grouped-count sampled p99 rises 11.0%, within its
20% budget. One-reader grouped-count sampled p99 rises 36.9% across five
observations and is ungated. Mixed sampled RSS falls in both pairs, while
the largest sampled RSS across all cells rises 3.0% and 16.7%. These
process samples do not establish a memory ceiling. Fixed sixteen-reader
p99 remains the maximum of eighty observations.

### Integrated 0.31 confirmation

The integrated confirmation uses the frozen 0.31 archive on another fresh
clone of the same K39087 source. Sweep one, four and sixteen readers with
five samples per reader, then sixty seconds of ingestion at sixteen.
Keep the same four threads, 2 GB engine memory, 4 GB temporary storage
and query budgets.

Apply the binary comparison's absolute projection, mixed-latency, throughput,
acknowledgment and RSS gates. Compare one- and sixteen-reader broad-query
p50 and p99 against the last frozen 0.29 reverse control under the same
15% and 20% allowances. The four-reader cells check exact answers, clean
lifecycle and sampled latency. Require the same final/reopen, every-window
write, sixteen-reader lease and unchanged closed-source checks.

The [integrated 0.31 confirmation](evidence/mixed-10m-031-integrated-20261105.json)
passes all fifteen numeric checks plus exact lifecycle checks. The fixed
projection returns the same 256 typed rows with median latency 13.9 ms,
17.3 ms and 53.5 ms at one, four and sixteen readers. Sixteen-reader
sampled p99 is 73.2 ms across eighty observations.

The mixed phase completes 362 exact queries and 52 acknowledged writes
at 5.87 reads/s, p50 of 2.54 s, sampled p99 of 4.96 s, and 2.73 GB
sampled RSS. Every complete ten-second window contains writes, all sixteen
leases return, and the final and reopened answers match. The source
database checksum is unchanged. This is one integrated confirmation.

## Eight-type million-fact qualification budget

The 100,000-fact screen sets a baseline of 153.2 complete queries/s with
sixteen readers during ingestion. The next eight-type gate measures the same
count, grouped count and typed projection rotation for sixty seconds at one
million retained facts. The gate requires 15 queries/s, p50 at most 1 s and
p99 at most 3 s. It uses the existing four-thread, 2 GB engine, 4 GB spill and
3.5 GB sampled RSS limits, with 512 MiB logical intermediate admission.
Exact fixed-cut, latest, final and reopened answers, zero errors, observed
sixteen-reader leases and writes in every complete ten-second window remain
required. This gate adds mixed-type coverage alongside the scalar gates below.

The [first million-fact run](evidence/mixed-1m-026-first-20261105.json)
passes all nine exact read cells and the exact mixed cut/reopen checks.
Sixteen readers complete 1,098 reads and 136 writes without error. Throughput
is 18.18 queries/s, p50 is 604 ms, p99 is 6.35 s and sampled RSS peaks at
2.93 GB. The p99 gate fails. The longest reads use the historical
deduplicating plans. The sufficient all-cut proof treats correction fragments
sharing transaction bounds as potential duplicates, even when their
valid-time ranges are disjoint.

The [paired repeat](evidence/mixed-1m-026-allcut-comparison-20261105.json)
uses separate verified clones of the same closed database with 1,000,136
retained facts at knowledge position 4045. The revised audit proves
valid-time disjointness inside identical transaction intervals and keeps
the conservative transaction check between distinct intervals. The only
changed core source is the audit header. Both runs pass exact fixed,
latest, final and reopened checks and acknowledge writes in all six
complete windows.

| 16 readers, 60 s plus drain | Control | Revised proof |
| --- | ---: | ---: |
| Complete reads/s | 22.04 | 36.16 |
| p50 | 536 ms | 430 ms |
| p95 | 1,554 ms | 597 ms |
| p99 | 4,080 ms | 712 ms |
| Maximum | 16,125 ms | 946 ms |
| Peak sampled RSS | 2.95 GB | 2.01 GB |
| Exact reads | 1,354 | 2,181 |
| Acknowledged writes | 162 | 269 |

All 446 candidate fixed-cut reads use the audited unique plan. All 281
control fixed-cut reads use deduplication. The candidate passes the
predeclared million-fact limits. The control misses the p99 limit. This
paired experiment uses the 0.26 proof builds.

The [combined 0.27 repeat](evidence/mixed-1m-027-integrated-20261105.json)
passes the same budget on a fresh clone. It records 2,031 exact reads and
244 acknowledged writes, 33.60 reads/s, 461 ms p50, 621 ms p95, 751 ms p99
and 1.79 GB sampled RSS. All sixteen leases return and all six complete
windows contain acknowledged writes. The exact final and reopened checks pass.

The [0.28 repeat](evidence/mixed-1m-028-integrated-20261105.json) passes
with 1,904 exact reads and 212 acknowledged writes, 31.53 reads/s,
488 ms p50, 716 ms p95, 1,029 ms p99 and 2.17 GB sampled RSS. It uses the
same closed fixture without a format-ten activation. The single-run
difference from 0.27 leaves per-change cost unresolved. The eight-type
ten-million-fact gate remains open.

Mixed runs can reuse a closed fixture with its complete passing runner
receipt. The clone includes every acknowledged write in the prior run,
preserves the original knowledge state, and uses fresh command and entity
IDs for new writes. The harness requires exact final and reopened answers
from any prior mixed cell and verifies the type rotation through the receipt.

## Eight-type 100,000-fact screen on 0.26

The [matched run](evidence/mixed-100k-026-checkpoint-fixed-20261105.json)
created all 100,000 retained facts through native commands, including a
correction and JSON values through 4 KiB. Exact count, grouped count and
typed projection checks pass with 1, 4 and 16 readers. The 15-second mixed
cell completes 2,305 exact reads and 184 acknowledged writes, with all
16 leases observed, zero query or acknowledgement errors, and exact final
and reopened answers. Throughput is 153.2 queries/s, observed p50 is
93.6 ms, observed p99 is 186.6 ms and sampled process RSS peaks at 866 MB.
This is a short screen. The paired million-fact gate is above. The
ten-million-fact mixed gate remains open.

The [first run](evidence/mixed-100k-026-checkpoint-failure-20261105.json)
stopped during setup at an automatic checkpoint. The corrected companion
keeps the audited generation across a verified engine checkpoint and revokes
it for an unknown user connection. A guard fails closed while an internal
connection is still unclassified. The focused disk test observes an exact
reader result during the checkpoint's active interval.

## C++ template calls and DuckDB operators on 0.26

The diagnostic ran one connection and one DuckDB thread on a closed APFS
clone containing 1,000,008 retained facts at valid time 0 and knowledge
position 253. The startup audit took 1.38 s and is separate from the query
measurements. Every ordinary execution verified its complete typed answer.

| Query | Answer rows | Template generation call median | Ordinary execute and extract | DuckDB reported query total in profiled rerun |
| --- | ---: | ---: | ---: | ---: |
| Tiny constant, forced native | 1 | 0.29 ms | 5.23 ms | 4.83 ms |
| Empty scan | 0 | 0.33 ms | 6.84 ms | 6.76 ms |
| Broad count | 1 | 0.40 ms | 63.83 ms | 64.33 ms |
| Projection | 40,000 | 0.38 ms | 133.41 ms | 78.84 ms |

The template column measures five prepared scalar calls per query. It includes
C++ Datalog-to-SQL generation, DuckDB dispatch, SDK result extraction and
scheduling. The other columns report one run each. `EXPLAIN ANALYZE` executes
the generated statement again and emits a profile in place of the answer.
Treat its operator timings as instrumented measurements. Operator callbacks
are included in their enclosing DuckDB operators, and timings can overlap on
multiple threads. The two execution columns have different result paths, so
their difference cannot isolate host or evaluator work.

The most expensive operator in the count and projection was the generated
carrier admission and byte-accounting projection. It processed 1,000,008 rows
in about 20 ms in both plans. The count reported 4,002,082 scan visits, including
repeated scans of the same assertions and scans of other tables. The compact
receipt includes the operator paths, row counts and exact artifact hashes.
[Diagnostic receipt](evidence/native-read-plan-phase-026-20261105.json) · [DuckDB 2.0 profiling](https://duckdb.org/docs/2.0/dev/profiling)

```sh
node adapter/profile-read-plan.mjs --runtime . \
  --database build/retained-fixtures/scale-1m-native.duckdb \
  --sourceEvidence evidence/scale-1m-native-20261105-01.json \
  --output build/read-plan-profile-fresh.json \
  --kinds tiny_constant,empty_scan,count,projection_40000 \
  --threads 1 --memoryLimit 1GiB --maxTempDirectorySize 1GiB \
  --maxIntermediateBytes 536870912
```

## C++ evaluator spans on 0.27

The diagnostic build adds invocation-owned steady-clock spans to the native
evaluator. Each result sample has a single live control token and an exact
typed oracle. Ordinary release builds compile out the capture. The SQL
answer format is unchanged.

| Median of seven profiled repetitions | Tiny constant | 64-link recursion |
| --- | ---: | ---: |
| C++ construction and fact import | 5.9 µs | 463.7 µs |
| C++ fixed point | 1.5 µs | 48.9 µs |
| C++ materialization and sort | 0.5 µs | 10.2 µs |
| C++ result vector encode | 1.0 µs | 3.8 µs |
| Prepared execute and extract | 4.40 ms | 6.50 ms |
| Independent warm public call | 5.11 ms | 7.39 ms |

The recursive fixture imports 2,112 facts and returns 64 rows. A separate
`EXPLAIN (ANALYZE, FORMAT JSON)` execution reports DuckDB query totals of
3.81 ms and 6.07 ms. Its operators include the C++ callbacks they invoke.
Public wall includes queue, routing, transport and typed decoding. These
clocks overlap or come from different invocations, so subtracting the
totals cannot isolate TypeScript or DuckDB. See the [diagnostic
receipt](evidence/native-evaluator-scope-027-20261105.json).

Build the core with `build_native.py --with-evaluator-profile`, rebuild
the matched companion and stage the adapter as for ordinary verification.
Run `node --test adapter/test-evaluator-profile.mjs`, then run the harness
with a fresh result path.

```sh
node adapter/profile-read-plan.mjs --runtime . --fixtureMode evaluator   --samples 7 --threads 1 --memoryLimit 128MB --maxTempDirectorySize 64MB   --output build/evaluator-profile-fresh.json
```

## Exact 40,000-row read diagnostics on 0.27

Both physical routes return the same ordered typed output at valid time zero
and knowledge position 76. The fresh fixture retains 47,112 facts, including
45,000 relevant int64 rows. Seven repeated calls per route, at one reader
and one DuckDB thread, produce the following medians.

| Measurement | Forced native | Scalable SQL |
| --- | ---: | ---: |
| Prepared execute and extract | 86.71 ms | 65.19 ms |
| Warm public call through typed decoding | 135.56 ms | 114.13 ms |
| DuckDB query total in the separate EXPLAIN rerun | 41.69 ms | 18.43 ms |

The per-invocation sum of the four C++ spans has a 17.33 ms median on the
native route. Individual medians are 7.13 ms for construction and fact
import, 4.72 ms for evaluation, 4.04 ms for materialization and sorting, and
1.35 ms for result-vector encoding. The EXPLAIN output replaces the answer
rows and includes the native work in its enclosing operator. The public
call measures the actual result path. Use the separate and overlapping
clocks for attribution at their named scopes.

Run the instrumented harness above with
`--kinds native_projection_40000,sql_projection_40000`. The [wide receipt](evidence/native-evaluator-wide-027-20261105.json)
contains the raw identity, both exact answer digests and per-run samples.
The fixed-order, one-thread pair is an attribution diagnostic. Concurrent
measurements and a matched host-language experiment remain future gates.

## Public read phases on 0.25

On the million-fact fixture, one reader completed 40 exact calls across four
queries, with one first call and nine warm calls per query. The warm broad
count took 58.32 ms median, with a median 0.37% of elapsed time outside SDK
awaits. A 40,000-row projection took 176.60 ms median, with a median 54.88%
outside SDK awaits and 38.45 ms median after the transport returned.
SDK awaits include native work, binding work and scheduling. Time outside
those awaits includes synchronous row extraction, copies, validation and
typed decoding. Native planning and engine execution still need separate
attribution under concurrent load. See the
[phase receipt](evidence/public-read-phase-screen-025-20261105.json) and
[raw samples](evidence/public-read-phase-screen-025-raw-20261105.json).

## Public v2 million-fact screen on 0.25

The [0.25 screen](evidence/native-v025-1m-public-smoke-20261105.json) uses the
normal six-tag public methods against the closed scalar fixture with 1,000,008
retained facts. Sixteen readers pass 96 measured count/sum/grouped-sum calls
and 32 mixed calls while eight native writes are acknowledged. The original
fixture hash remains unchanged. This is a short scalar regression screen.
The representative mixed-type and sustained 0.25 gates remain open.

## Verified single-strategy 0.24 gate

The [current ten-million-fact run](evidence/single-strategy-10m-024-20261105.json)
passes all nine short count/sum/grouped-sum cells and the three-minute mixed
gate. Sixteen readers complete 1671 exact queries during 233 acknowledged
native writes. Throughput is 9.23 queries/s, p50 is 1580 ms, p99 is 3136 ms,
maximum latency is 3505 ms and sampled mixed-query RSS peaks at 2.50 GB.
All eighteen complete ten-second windows contain an acknowledged write.
Query, write-acknowledgement and cleanup errors are zero. Final and reopened
historical/current answers pass at final knowledge position 2675.

Every native store uses mandatory audited ownership. There is no integrity
selector in the harness. The run uses four threads, a 2 GB DuckDB buffer budget
and 4 GB temporary-storage budget. Exact equality is checked by the pinned
harness before a sample is accepted. Startup peak and physical allocation
containment remain outside this measurement.

The [provenance receipt](evidence/single-strategy-10m-024-provenance-20261105.json)
pins the actual core, control bridge, companion, SDK engine, compiled adapters,
harness and immutable source database before the run. Source and artifact
hashes are rechecked after it. The independent review recomputes the absolute
gates from raw samples. The [0.24 verification receipt]([PRIVATE_REFERENCE_REMOVED])
records 298 scoped checks plus semantic TypeScript on the same build.

## Final 0.23 candidate qualification

The [exact-artifact ten-million-fact run](evidence/mixed-10m-final-023-20261105-01.json)
passes all fixed absolute gates with current and historical queries during
continuous native ingestion. All nine short reader/query cells pass first.
The sustained cell completes 1308 exact reads and 181 acknowledged writes,
reaches sixteen concurrent reader leases, and verifies both temporal cuts
after reopening.

| Measurement | Observed |
| --- | --- |
| Submission window | 180 seconds |
| Complete wall time including drain | 181.65 seconds |
| Throughput | 7.20 queries/s |
| p50 / p99 / maximum | 1933 / 4681 / 8026 ms |
| Sampled query-phase RSS | 2.15 GB |
| Complete ten-second windows with writes | 18 of 18 |
| Query, write acknowledgement or cleanup errors | 0 |

This run uses four threads, a 2 GB DuckDB buffer budget, 4 GB temporary storage
and the original logical limits. The source contains ten million facts at
knowledge position 2442. Final position is 2623. Owner activation peak RSS was
not measured separately. Sampled query-phase RSS remains distinct from
physical allocation containment.

The [matched million-fact screen](evidence/strict-optimized-1m-final-023-20261105-01.json)
passes all 630 optimized queries, with a maximum latency of 361 ms and sampled
RSS below 560 MB. The strict profile encounters nine grouped-sum deadlines,
leaving seven of nine comparison gates passing. Incomplete pairs receive no
speedup claim. This failure originally held back default promotion. Contributor then
requested the independently verified fast path as the sole store strategy. The
four qualified optimizations are enabled in the normal build. Every store open
requires the verified owner companion, currently qualified on macOS ARM64. The failed
comparison remains a failed comparison. Its strict-path stalls have no proved
root cause.

Both receipts pin the actual core, companion, engine, adapters, clone helpers
and original fixture evidence. The core hash is
`611590c36ed742648845fa5cb853368a5eb8bbf305120dc6cf1b80d08de0e87c`.
The candidate explicitly enables current-cut uniqueness, all-cut uniqueness,
injective projection and streaming source execution. Identity-count remains
disabled.

From this runtime directory, reproduce the measured core with the pinned
Python environment and rebuild its paired companion before testing. The
companion's source revision and engine-library hash are recorded in the receipt.

```sh
../../../../.venv/bin/python build_native.py
../../../../.venv/bin/python build_owner_probe.py --source-dir ../../../../dependencies/duckdb-d54cbbe3df17e8e5ce68312f483b4155836112aa --engine-library ../../../../triplex-build/node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib --compat-mutations
../../../../.venv/bin/python verify.py --with-owner --with-direct
```

Run the harness against a built runtime using a fresh evidence filename. Start with a small smoke run before requesting the staged 100k, 1m and 10m ladder.

```sh
node adapter/benchmark-scale.mjs --runtime /path/to/built/runtime --sizes 4096 --readers 1,4,16 --samples 4 --output evidence/scale-smoke.json
node adapter/benchmark-scale.mjs --runtime /path/to/built/runtime --sizes 100000,1000000,10000000 --readers 1,4,16 --samples 1000 --output evidence/scale-staged.json
```

Only run one measured benchmark at a time. Builds and unrelated performance work must wait for the benchmark lease. Dependency inputs and the imported runtime remain read-only. Owned database files and failed-run evidence are retained under `build/scale-runs`. Existing evidence files are never overwritten at startup.

Setup emits and saves progress after every 128 committed fixture commands or five seconds, plus explicit schema, audit, checkpoint and replay phase transitions. These small receipt writes occur outside query timing. Failed setup records the phase and elapsed duration. Progress counts cover acknowledged commands and do not infer durability for a command whose acknowledgment failed.

An explicitly reconciled native fixture can be continued using `--resume-database`, `--resume-commands`, `--resume-evidence` and `--resume-recovery`. The database must be inside this worktree's owned scale-run directory and match the prior evidence. Resume requires a matching recorded full retained/history recovery audit under the same native binary. Before any additional command, it verifies the declared prefix's clock/counts and the original first/last receipts. The final fixture audit verifies complete retained/history validity, exact integer domain/sums, command identities and every receipt's assertion membership in batches of 64 commands. The resumed receipt links both original failure and recovery by filename and hash and records the new resource profile. The original evidence files are preserved.

## Fixture and answer contract

The fixture contains integers from zero through `size - 1`, partitioned into native `Row` entities with up to 4096 values each by default. Independent arithmetic oracles verify global count, exact int64 sum and every grouped sum. Fixed-cut sweeps use the fixture's committed knowledge position. Mixed-read checks derive expected answers from each returned knowledge position while native commands append one integer and entity per commit.

The default setup creates every record through `NativeEntityStore.putRecord`, exercising actual native write admission and receipts. Optional `--fixture-mode expanded` creates a native schema and first entity, passes remaining records through `td_prepare_entity_v1`, then expands them with deterministic SQL into canonical assertions, owners, commands, native command metadata, receipts, clock and retained-usage tables. That experimental setup route bypasses native retained-write admission and is reported explicitly. Native write throughput is measured only for commands submitted through `putRecord`.

Before reading, setup checks every retained carrier, every native history binding, exact count/usage, command receipt totals, and native idempotent replay of the first and last entities. Setup is timed separately. Fixtures are checkpointed and closed before measured reads.

## Measurements and capacity outcomes

The harness feature-detects `queryScalable` and uses its explicit limits when present. Otherwise single-reader cells exercise the existing bounded public query API and retain its actual errors. Multi-reader claims require public pool statistics. Unsupported query shapes, capacity errors and setup failures are retained individually. A completed harness with incomplete cells is not a scale acceptance pass.

The harness explicitly requests at least 10 million input and intermediate rows, with headroom for configured writes, and 4 GiB logical intermediate bytes. `--max-intermediate-bytes` changes the latter. These query-admission values are recorded separately from the default 1 GiB DuckDB memory and 2 GiB spill configuration. They do not change public API defaults or establish physical containment.

Each cell opens a fresh store, records its first query separately, completes every reader's warmup, and then starts the measured phase. Individual durations include the public call through complete typed decoding, route/reason, knowledge position and output size. Exact oracle assertions happen after the latency timer. Quantiles use nearest ranks. Small sample sets are labeled smoke evidence. Measured wall time and throughput exclude warmup and include oracle checking overhead.

Process memory samples and available public DuckDB memory/spill counters are captured before and after each cell. These samples are not peak allocation measurements or hard containment guarantees. The configured thread, memory and temporary-storage limits are project test inputs. No machine inventory is collected.

Read-only comparisons finish before one mixed native-ingestion cell runs at the largest requested reader count. Its bounded write burst starts with the measured readers after warmup. The report records burst duration, overlap count and a final fresh-read oracle. Mixed-read acceptance requires at least one measured read to overlap a native write. This burst is not a sustained ingestion-rate test.

Overlap counts compare public call intervals, including queue waits. They demonstrate overlapping read/write requests and exact coherent results. They do not identify the engine phases during which reading and writing executed. Observed active-reader counts separately establish concurrent reader leases.

Each stage explicitly configures retained admission with `size + 100000` facts or enough for the requested writes, whichever is greater, and 4 GiB logical payload. The exact declaration is recorded. Older runtimes retain their legacy admission behavior and may reject writes above that limit. Such rejection remains a separate recorded capacity gap.

## Sustained mode

Add `--duration-seconds 60 --max-writes 100000` to opt into a bounded sustained mixed cell at the largest requested reader count. The default remains the sample-count screen and eight-write burst. In sustained mode each reader rotates count, sum and grouped sum queries until the submission deadline. Every fifth read uses the initial historical knowledge cut. Other reads use the latest committed cut. The native writer submits one fact per command until the same deadline or the declared write bound. Reaching that bound early is reported as incomplete capacity evidence.

The harness stops new submissions at the deadline and drains in-flight operations, records the drain duration, verifies the final state, closes the store, then reopens and verifies both initial and final cuts. A failed write acknowledgment triggers durable receipt lookup before any next command. The original error and reconciliation result remain in the evidence. A missing or uncertain receipt ends the writer without resubmission.

Ten-second windows retain complete-query latency quantiles, read/write completion counts, errors, sampled RSS and observed active/waiting reader counts. Raw query and write samples remain available. RSS is sampled every 25ms, and DuckDB memory/spill is sampled before and after the cell. The original kernel limits and exact answer checks continue to apply.

The harness uses mandatory audited native ownership and records the actual companion extension hash and manifest identity. To run a mixed campaign against existing data, supply `--clone-database` and `--clone-evidence` with a closed, owned source fixture and its successful receipt. Fixture cloning in the scale and A/B drivers requires macOS `clonefile(2)` through a Python 3 setup helper. It creates fresh copy-on-write destinations and preserves native error codes when cloning fails. Other platforms reject this setup with `ENOTSUP`. The scale driver checks source size/modification stability during cloning. Receipts pin the JavaScript and Python setup helpers, and query execution retains the native runtime path.

Cloned fixtures retain all previously acknowledged values and entity identities. Every new campaign has unique command/entity prefixes and continues numeric values beyond the source's existing facts. Replaying an earlier command cannot be counted as fresh ingestion. Clone time is recorded separately from query timing, and original database paths remain local CLI inputs.

## Historical paired comparison and current absolute gates

### Candidate acceptance budgets

The historical candidate protocol began with a same-artifact strict/optimized
screen. Its relative promotion gate required twice the throughput or half the
median complete-call latency with all exact answers. The current strategy is
qualified against correctness and the absolute gates below. Future native
optimization candidates use the same ownership contract in both variants.

Two longer gates follow that screen. Both use four DuckDB threads, a 2 GB engine
buffer budget, 4 GB temporary storage and sampled process RSS at most 3.5 GB.

| Gate | Duration | Minimum completed reads | p50 limit | p99 limit | Throughput floor |
| --- | --- | --- | --- | --- | --- |
| One million facts, sixteen read-only sum readers | 60 seconds | 1000 | 500 ms | 2000 ms | 20 queries/s |
| Ten million facts, sixteen mixed readers during native ingestion | 180 seconds | 1000 | 5000 ms | 15000 ms | 5 queries/s |

The mixed gate retains the historical-cut reads and count/sum/grouped rotation.
It requires exact final and reopened answers, no query/write/cleanup errors,
observed sixteen-reader leases and at least one completed native write in each
complete ten-second measurement window. Reaching the configured write bound
early leaves the sustained gate incomplete.

These budgets are fixed before the combined candidate's longer runs. They apply
to the current synthetic fixture and its public calls. Sampled RSS establishes
an observed envelope, while physical allocator containment remains separate work.

### Combined current-uniqueness and injective-projection screen

The [matched 0.21 screen](evidence/strict-combined-1m-screen-20261105.json)
uses one candidate binary for strict and optimized owned calls. It contains
1000008 facts at knowledge position 253, two alternating profile orders, five
measured calls per reader and one warmup. All 36 query-kind cells pass exact
answers and all nine reader-count/query-kind performance gates pass.

| Readers | Query | Strict p50 | Optimized p50 | Throughput ratio |
| --- | --- | --- | --- | --- |
| 1 | Count | 278.7 ms | 23.4 ms | 11.78x |
| 1 | Sum | 276.9 ms | 27.9 ms | 10.04x |
| 1 | Grouped sum | 281.9 ms | 33.0 ms | 8.37x |
| 4 | Count | 634.1 ms | 42.4 ms | 45.18x |
| 4 | Sum | 630.0 ms | 51.6 ms | 12.05x |
| 4 | Grouped sum | 637.7 ms | 61.5 ms | 23.00x |
| 16 | Count | 2302.9 ms | 161.6 ms | 17.81x |
| 16 | Sum | 2403.8 ms | 178.1 ms | 14.08x |
| 16 | Grouped sum | 2502.5 ms | 228.0 ms | 11.32x |

Medians pool both orders. Throughput divides completed queries by summed
measurement time. Large strict-path outliers contribute to the four-reader
count and grouped-sum ratios and remain in the raw samples. The maximum
optimized observation is 398.6 ms. Owned activation costs 493–567 ms, compared
with 61–167 ms for strict opening. Maximum sampled RSS is 1.47 GB for optimized
and 2.45 GB for strict. These are short-screen results, with sustained and
ten-million acceptance still pending.

The first shell wrapper used a read-only shell variable after the measurement
child had completed successfully. The complete child receipt is preserved with
that wrapper failure recorded separately. The candidate core hash is
`a9921da0eff3932dfc74682c956259d9945fe8e7a490669aa63b08dc3aed803d`.
Both optimizations remain disabled in the normal build at this checkpoint.

The [subsequent sixty-second sum run](evidence/strict-combined-1m-sum60s-20261105.json)
passes the fixed one-million-fact gate with 5260 completed optimized reads,
87.45 queries/s, 178.4 ms p50 and 275.2 ms p99. Maximum latency is 356.6 ms,
sampled RSS peaks at 1.11 GB, and the pool reaches sixteen active readers.
The same-artifact strict cell completes 317 reads at 5.11 queries/s, with
2663 ms p50 and 8376 ms p99. Both profiles return exact answers throughout.
The report validates actual core, companion, control bridge, engine, imported
adapter and benchmark-helper bytes before each cell. Ten-million sustained
mixed acceptance remains pending.

### Combined ten-million-fact mixed gate

The [combined ten-million campaign](evidence/combined-10m-gate-20261105.json)
passes all nine short read cells with exact answers. Its three-minute mixed
phase fails the fixed acceptance gate. It completes 497 successful reads and
71 acknowledged native writes, with seven query deadline errors. The final
state and both reopened historical/current answers pass. Measured wall time is
228.8 seconds, including 48.8 seconds of draining in-flight operations.
Throughput is 2.17 queries/s, p50 is 4189 ms and p99 is 62226 ms. Sampled RSS
peaks at 3.03 GB and all sixteen reader leases are observed.

Two complete ten-second windows contain no completed native write. A late
native write takes 52.5 seconds. Historical queries have higher medians, while
both historical and latest queries appear in the late latency spike. This
correlation does not identify the engine cause.

Four brief pure helper-test invocations may overlap the campaign. The separate
[annotation](evidence/combined-10m-gate-20261105.annotation.json) records their
reported durations and timestamp uncertainty. The run remains diagnostic and
does not qualify the candidate for promotion. Further work isolates historical
deduplication and memory pressure before another clean mixed campaign. The
original fixture and failed campaign clone are preserved.

The retired `adapter/benchmark-read-profiles.mjs` harness remains in Git at
`44d926653a9687fa37b4f50eb079208a9772ef44`. Its receipts below preserve the
historical comparison. Current builds have one ownership strategy, so this
harness has been removed from the maintained source.

The historical source receipt determined the latest knowledge position and
acknowledged writes. Each profile opened a fresh store, checked complete typed
answers, and recorded activation separately from query time. Small samples
remain exploratory measurements.

The first 0.20 paired campaign used the original million-fact fixture plus its eight acknowledged writes, at knowledge position 253. All 36 query/profile cells passed exact answers, latest-cut checks and route checks. Single-reader and four-reader median latency reductions ranged from 68 to 79 percent. A reported brief TypeScript check during the initial 16-reader tier is preserved in a [separate annotation](evidence/strict-owned-1m-20261105-01.annotation.json) beside the [unaltered raw campaign](evidence/strict-owned-1m-20261105-01.json).

The [clean 16-reader repeat](evidence/strict-owned-1m-16-clean-20261105-01.json) used two alternating pairs with five samples per reader, identical `2GB`/`4GB` limits and no overlapping agent builds. All 12 cells passed correctness. Its measured results were as follows.

| Query | Strict p50 | Owned p50 | Throughput ratio | Performance gate |
| --- | --- | --- | --- | --- |
| Count | 2738ms | 1437ms | 1.90x | Below target |
| Sum | 2160ms | 1277ms | 1.27x | Below target |
| Grouped sum | 2259ms | 709ms | 3.69x | Passed |

Including open, full audit, warmup, result checks and close, measured-query throughput increased from 3.22 to 6.30 queries/s for count, 5.29 to 7.34 for sum, and 4.44 to 14.89 for grouped sum. The clean run observed 16 active leases and sampled process RSS up to 3.06GB. The configured DuckDB buffer budget does not bound the complete process. The all-query performance target remains unmet at 16 readers.

## Initial native screens

The 0.19 native screens use two measured queries per reader per query kind, one warmup, 4096 values per setup command, four execution threads, `1GB` DuckDB memory and `2GB` temporary storage. Every global count, exact sum and grouped sum passed for 1, 4 and 16 independent readers. These short screens establish correctness and a performance baseline, with insufficient samples for a tail-latency commitment.

| Facts | Native setup and audit | Single-reader p50 | 16-reader p50 | 16-reader throughput |
| --- | --- | --- | --- | --- |
| 100000 | 1.78s | 62–65ms | 273–310ms | 48–50 queries/s |
| 1000000 | 24.94s | 274–280ms | 2.56–2.90s | 4.9–5.3 queries/s |

The million-fact four-reader sum cell includes a 7.39s maximum observation. The million-fact mixed cell passed with 16 active leases, eight native writes, 73 measured query/write overlaps and an exact final fresh read. Sampled post-cell RSS ranged from 0.86GB to 1.50GB. DuckDB reported roughly 44–59MB after cells and no temporary storage at the sample points. In-query spill and peak allocation are not established by these samples. Full samples and build/source identities are in [the 100k native receipt](evidence/scale-100k-native-20261105-02.json) and [the million-fact receipt](evidence/scale-1m-native-20261105-01.json).

Two prior failures remain recorded. The first 100k expanded setup exhausted the configured memory after its native seed. The first 100k native setup completed ingestion but exhausted memory during the harness's row-expanded receipt audit. The successful native retry uses grouped receipt-ID list equality, preserving complete membership validation without repeating a large receipt per assertion. The expanded setup was reduced to one entity per transaction and remains unverified at 100k. [Expanded failure](evidence/scale-100k-20261105-01.json), [native audit failure](evidence/scale-100k-native-20261105-01.json).

The earlier [32-fact smoke](evidence/scale-smoke-20261105-01.json) and first expanded failure predate the added transport artifact hash fields. Their original evidence is preserved. Later native receipts pin both imported adapter files, the corresponding source files, the native manifest, and the actual harness/fixture bytes.

The first [ten-million-fact attempt](evidence/scale-10m-native-20261105-01.json) failed during native command 1979, counting from zero, because DuckDB could not allocate memory for a checkpoint under the configured `1GB` limit. It never reached the fixture audit or a read cell. Earlier commands had acknowledged 8,105,984 input facts. The failed command's durable state needs receipt reconciliation. This is an ingestion/checkpoint capacity result, with no ten-million-fact read result established.

After separate recovery verification, the [resumed attempt](evidence/scale-10m-native-resumed-20261105-01.json) used an explicit `2GB` memory and `4GB` temporary-storage profile. It acknowledged all 10,000,000 native facts across 2442 commands, then exhausted memory in the harness's combined full-fixture audit before any read cell. Subsequent audit code runs the independent full-history checks sequentially and keeps receipt membership batches bounded. The original failed combined-audit outcome is preserved.

After the complete fixture passed a separate recovery audit, [one controlled public count](evidence/scale-10m-public-count-20261105-01.json) returned exactly 10,000,000 at knowledge position 2442 through `scalable_count` in 3691.17ms, including typed decoding. The runtime used the explicit `2GB` memory, `4GB` temporary-storage and 4 GiB logical-intermediate profile. This is a single-query proof. The later owned concurrency screen is recorded below. `--probe-only count` performs one call against a recovered complete fixture and records its full result without rerunning ingestion or the auxiliary fixture audit.

## Ten-million-fact owned clone screen

The [0.20 owned screen](evidence/owned-10m-clone-screen-20261105-01.json) copied the closed ten-million-fact source into a new owned fixture in 6.07s. It retained the `2GB` memory, `4GB` temporary-storage and 4 GiB logical-intermediate configuration, with one measured query per reader after warmup. Nine of ten cells passed exact answers and temporal cuts.

| Readers | Count p50 | Sum p50 | Grouped sum p50 |
| --- | --- | --- | --- |
| 1 | 1.11s | 1.14s | 1.33s |
| 4 | 5.08s | 8.92s | 5.00s |
| 16 | 22.20s | All 16 measured calls reached the 60s deadline | 18.94s |

The separate 16-reader mixed count cell completed eight unique native commands, then verified 10,000,008 facts at knowledge position 2450. It recorded 24.81s median read latency, 28.85s maximum and 33 overlapping public read/write call intervals. All write acknowledgments and the final fresh read passed. The source fixture remained untouched. Sampled RSS peaked at 3.02GB, with zero temporary-storage bytes at the post-cell sample points. This profile does not meet the full 16-reader aggregate acceptance target.

## Thread budget experiment on verified 0.32

Freeze the runtime to `accepted-032-runtime`, core
`dd6fe3f4e8f2531edc2805aef3670a00c09bf8a29165b9f2d575bd088ec7baf0`
and companion
`d458284b04d0adbd97562c1fac4fefa76aec4424747ed9330df6222e9867ea16`.
Each profile starts a fresh Node process with its worker-pool environment
set before imports, then creates a fresh mandatory copy-on-write clone
of the closed K39087 ten-million-fact source.

Run profiles in this order, with the same one/sixteen-reader fixed sweep,
five samples per reader, one warmup and sixty seconds of ingestion.

| Profile | DuckDB threads | UV worker pool |
| --- | ---: | ---: |
| Baseline | 4 | 4 |
| Wider native-call pool | 4 | 16 |
| More DuckDB workers | 8 | 4 |
| One DuckDB thread per query | 1 | 16 |

Retain 2 GB DuckDB memory, 4 GB temporary storage, the same logical budgets
and exact eight-type oracle. Record two process CPU snapshots per measured
phase. CPU time includes JavaScript, native calls, oracle checks, sampling
and drain. Average process cores describes CPU use during that phase.

| Promotion measurement | Gate versus fresh 4/4 baseline |
| --- | --- |
| Mixed throughput | At least 15% higher |
| Mixed and sixteen-reader fixed sampled p99 | At most 110% of baseline |
| Broad count/grouped-count p50 at one/sixteen readers | At most 110% of baseline |
| Mixed acknowledged writes per second | At least 95% of baseline |
| Mixed sampled RSS | At most 115% of baseline and at most 3.5 GB |

Also retain absolute projection p50 limits of 19 ms and 115 ms at
one/sixteen readers, projection p99 at sixteen at most 185 ms, mixed
p50/p99 at most 3.2/6.5 seconds, and at least forty acknowledged writes.
Every complete ten-second window must contain an acknowledgment. Require
exact typed answers and cuts, zero query or acknowledgment errors, all
sixteen leases used and returned, exact final/reopened answers and equal
source hashes before and after the matrix. Compare the best passing
profile with 4/4 again in reverse order before promotion. No configuration
default changes until those measurements pass.

### Thread budget results

The [four-profile audit](evidence/thread-budget-032-20261105.json) preserves all original runs. Every process passes the exact-answer and lifecycle assertions, but none meets every unchanged promotion gate.

| DuckDB / UV | Mixed reads/s | Mixed sampled p99 | Writes | Average process cores | Mixed sampled RSS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 4 / 4 | 4.903 | 5.599 s | 44 | 6.74 | 2.427 GB |
| 4 / 16 | 6.743 | 4.660 s | 334 | 10.85 | 3.225 GB |
| 8 / 4 | 6.508 | 4.401 s | 52 | 10.10 | 2.795 GB |
| 1 / 16 | 9.298 | 2.927 s | 404 | 12.12 | 2.700 GB |

The 4/16 profile improves mixed throughput 37.5% but raises mixed sampled RSS 32.90%, above the 15% allowance. The 8/4 profile improves throughput 32.7% but raises RSS 15.156%, exceeding the same limit by 3.79 MB. Both remain below the separate 3.5 GB limit. The 1/16 profile improves mixed throughput 89.6%, but one-reader count and grouped-count medians rise to 1.65 s and 1.78 s; its one-reader projection median is 23.01 ms, above the 19 ms absolute limit.

CPU accounting covers all benchmark-process threads during measurement, including native execution, JavaScript, oracle checks, sampling and drain. The 4/4 baseline averages 6.74 process cores during mixed work; four configured DuckDB threads do not impose a four-core process ceiling. Increasing the UV pool also changes the amount of acknowledged ingestion, so CPU time is not a pure per-query engine comparison. Temporary-storage snapshots are zero, without establishing peak spill or memory bounds.

Every complete ten-second window contains writes, all sixteen leases return, and final/reopened answers pass. The closed-source checksum remains unchanged. These are single-order screens; no reverse confirmation or configuration default change follows from them.

### DAG maintenance without registration

The first 0.33 DAG candidate passes 414 integrated functional checks, but
the [paired overhead screen](evidence/native-dag-unregistered-overhead-033-20261105.json)
rejects promotion. Both orders submit the same 144 commands per child,
with 128 measured calls, followed by twelve populated opens. Exact
receipts, typed answers and all canonical table cells agree; only
observational recorded/retracted timestamps are normalized.

Without any registered graph, put p50 rises 25.5% and 35.1%, and patch
p50 rises 12.7% and 19.5%. Both exceed the predeclared 10% allowances.
Eight of fourteen numeric checks fail. Populated-open medians rise 7.6%
and pass their separate 15% allowance. No registered-graph or large-history
performance claim follows. The rejected artifacts and raw results are
retained while maintenance is simplified; thresholds remain unchanged.

### Native entity-posting prefilter result

The [public prefilter comparison](evidence/native-prefilter-public-comparison-20261105.json) does not qualify the isolated native candidate. The first order passes: the 256-row skew projection median moves from 20.05 ms to 17.98 ms, a 10.34% improvement, with all control gates passing. In reverse order the same median moves from 18.79 ms to 24.44 ms, a 30.08% regression. The recursive control also fails its reverse median and p95 limits. The first-order target p95 rises 21.8%; that tail is recorded but was not a declared target gate.

Both-order acceptance fails, so four- and sixteen-reader tiers are not attempted. All four child processes preserve exact typed-answer and counter assertions, return their reader leases, and leave the closed source unchanged. The ordinary artifacts expose no evaluator timing spans. The candidate and original failed promotion evidence remain available; no native default changes follow.
