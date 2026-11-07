# Three approaches to the same concurrent workload

Contributor requested three competing experiments on one workload on 5 November.
Keep three worker lanes active, with root owning integration and acceptance.
This replaces the previous rotating unrelated experiments for the current wave;
the remaining ten-goal work is preserved in the acceptance ledger.

## Shared case and control

Common source is `773f7746466caf0ba4eff70a741e9594d07f39cc`.
Its application/native bytes match the frozen `accepted-032-runtime`.
The cohort uses `benchmark-antijoin-cost.mjs`, its independent correction
oracle, and the predeclared 10-million-fact budget from `1dbfe137`.

Every process owns a fresh clone of the closed source at K39087:
`build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb`.
Its SHA256 is `3712516b8de8e371f71ae89aaab04f1d456da7a0fc6caa178ec0042926b0e6b3`.
Keep the original unchanged and verify its checksum before/after each run.
Use the original pilot receipt to reconstruct the baseline, then the same
eight native seed batches for 256 Probe entities and the same cyclic
two-field corrections. The query joins `probe_member` against absence of
the same entity/value in `i`; its recorded SHA begins `998e12dd`.
The control proves 1,680,202 logically admitted facts, with exact-cap
success and one-below-cap rejection. This is not a physical-scan count.

The existing 0.32 control passes exact answers and lifecycle checks but
fails ten of sixteen performance checks. At one reader, fixed p50 is
197.3 ms; mixed p50/p99 is 2,913.9/4,099.6 ms, with 21 writes. At sixteen
readers, mixed throughput is 3.239 queries/s, p50/p99 is
4,121.3/7,998.5 ms, with 15 writes. The million-fact gate passes.

## Competing lanes

| Lane | Owner | Isolated hypothesis |
| --- | --- | --- |
| A: read pipeline | native_read_strategy | Measure the submitted-write barrier, then test an explicitly versioned committed-snapshot contract for pooled readers. |
| B: native writes | acceptance_and_benchmarks | Profile the exact generated native patch statements; test C++ SQL pruning or execution changes that reduce ingestion time. |
| C: fair admission | orchestration_operations | Keep DuckDB4/UV4 and limit admitted query calls to three, reserving async execution opportunity for ingestion. |

A must explicitly identify its contract difference. Existing v1 reads wait
for writes already submitted. Candidate2 permits a pooled read to observe
a committed snapshot before an earlier unfinished write commits. A read
invoked after a write acknowledgment must include that write. Writes stay
FIFO; explicit historical cuts remain exact. No uncommitted or torn state
is allowed. Main retains v1. Candidate2 is one proposed versioned behavior,
with no public strategy toggle. Its speedup cannot be labeled an equivalent
v1 optimization or promoted without an explicit API compatibility decision.

B and C preserve the existing call-order contract. B must use real plans
and statement evidence before changing lowering. C changes admission only;
it does not also change thread budgets. It reports sixteen logical clients,
sixteen independent reader connections, and its actual admission limit
separately. Queue time remains inside full-call latency.

## Execution and evidence

Implementation, source investigation and small correctness slices can run
in parallel on isolated databases. A short 100,000-fact screen uses one
and sixteen clients, two fixed samples and two seconds of mixed work per
tier; those timings are diagnostic only. Preserve each first outcome.

Timed head-to-head runs receive exclusive CPU/build windows. Freeze the
candidate source, compiled runtime, harness and configuration first. Keep
one/sixteen clients, twenty fixed samples per client, one warmup and sixty
seconds of mixed work per tier, with the same engine/spill/logical limits.
Run a fresh control beside candidates and reverse promising pairs before
promotion. Do not combine mechanisms until their individual effects are
understood. Preserve rejected candidates and their measurements.

Candidate budget files inherit the original numerical limits and baseline
identity, and explicitly bind the candidate artifact/configuration identity.
Never rewrite the original baseline fingerprint to pretend a candidate was
the control. Changes beyond the declared mechanism require a new candidate.

For every read, verify exact typed answers at its returned K, fixed old cuts,
and post-ACK visibility. Record pending-write/freshness boundaries for A.
Verify receipts, rollback/replay, final/reopened answers, reader reuse,
queue cleanup and all source/runtime hashes. Physical connection IDs must
be distinguished from logical client IDs. CPU covers all process threads;
sampled RSS and spill observations are not physical ceilings.

## Unchanged scale gates

| 10m measurement | One reader | Sixteen readers |
| --- | ---: | ---: |
| Fixed p50 / p99 | 1,500 / 2,500 ms | 3,500 / 6,500 ms |
| Mixed throughput | At least 0.75 queries/s | At least 4.8 queries/s |
| Mixed p50 / p99 | 1,500 / 3,000 ms | 3,200 / 6,500 ms |

Each mixed tier also requires at least forty acknowledged writes, at least
0.5 writes/s, sampled RSS at most 3.5 GB, writes in every complete ten-second
window, and all correctness/lifecycle checks. Partial improvements are
useful findings but are not a full-gate pass. Broader workload regressions
and API compatibility remain separate promotion checks.

The allocator/borrowed-output checkpoint `eea9d495`, the unrun ordinary
40,000-row runner, and DAG/registered/PREPARE checkpoints remain preserved
for the ten-goal continuation after this cohort.

## First working slices

A's source `8367e0a1` passes TypeScript and four controlled actual-engine
methods on the frozen 0.32 native artifacts. The [receipt](evidence/cohort-a-read-scheduling-100k-20261105.json)
records a read at committed K585 during tentative K586, K586 after the first
acknowledgment while tentative K587 remains unfinished, and K587 after the
second acknowledgment. Rollback, retry/replay, a held old snapshot and the
no-reader FIFO case pass. This is small correctness evidence for candidate2,
not a version-one pass or a performance result.

The [subsequent A screen](evidence/cohort-a-read-scheduling-screen-20261105.json)
passes five pure methods and the short sixteen-client 100k case, then fails
five of eight unchanged 10m numeric checks on its first attempt. Mixed
throughput is 4.344 queries/s, p50/p99 is 3,640/6,704 ms, and twelve writes
complete at 0.190 writes/s. All 275 measured answers and lifecycle checks
pass. Every one of the 211 latest samples includes the ACK frontier at its
invocation; all 64 explicit historical samples retain the requested K.
Ninety-five latest reads omit a pending write at invocation, as allowed by
candidate2, and thirty are one position behind the ACK frontier at return.
Root recomputes all eight gates and checks every measured freshness cut from
the raw result. All sixteen physical ports are used and returned. A is rejected
at `e276e187`; there is no one-reader repeat or version-one promotion claim.

B's unchanged-runtime [100k](evidence/native-patch-profile-100k-032-20261105.json)
and [10m](evidence/native-patch-profile-10m-032-20261105.json) diagnostics
pass exact receipts, history, old/current cuts and reopen across four fresh
observation clones. At 10m the public patch takes 3,121.6 ms. In a separate
phased execution, patch admission takes 27.3 ms to prepare and 3,169.1 ms to
execute; EXPLAIN shows history validation over all 10,000,534 retained rows.
The already scoped old-target scan emits two rows. Operator times overlap
across threads and are not additive wall-time components. Candidate `c3ff1d73`
adds only a redundant literal entity predicate to that admission history join.
Its [focused qualification](evidence/native-write-candidate-focused-032-20261105.json)
passes TypeScript, eighteen actual-engine methods and both four-clone
diagnostics on the first attempt. At 10m the history scan reads 534 tail rows
and validates two target rows; the separate global provenance scan reads one
row on this fixture. A public patch takes 129.0 ms in one diagnostic sample.
This is not a mixed-throughput or tail result. Root matches seven logs, two
raw diagnostics and all 32 native manifest inputs to the declared source.
The [independent review](evidence/native-patch-pruning-independent-review-20261105.md)
finds no correctness blocker and records the remaining provenance-heavy I/O
boundary. Actual candidate core is `f44d116c266cbe27ef4217fef6a07550230e87b22843627e9c63ed1997139b82`.
The [first unchanged one/sixteen-reader screen](evidence/native-write-cohort-10m-032-20261105.json)
preserves all exact answers and lifecycle checks but fails five of sixteen
numeric checks. One reader passes all eight: 214 mixed reads, 428 writes,
3.563 queries/s and 270.5/409.0 ms p50/p99. Sixteen readers pass only fixed
latency and RSS: 280 mixed reads, 29 writes, 4.4275 queries/s and
3,420.7/6,745.8 ms p50/p99. All complete ten-second windows contain writes.
Root independently recomputes all sixteen gates from the pinned raw result.
B is a measured partial improvement, not a promoted build or completed scale
milestone. Its first outcome is preserved at `af5bf466`; fresh paired/reverse
timing is deferred until a candidate passes the unchanged screen.

C's source `50a5cbf9` passes six pure methods and its [short 100k screen](evidence/native-antijoin-concurrency-c-smoke-20261105.json).
The [timed sixteen-client result](evidence/native-antijoin-concurrency-c-10m-16-20261105.json)
is rejected on five of eight unchanged numeric checks. Mixed throughput is
1.145 queries/s, p50/p99 is 15,355.5/19,231.4 ms, and twenty writes complete
at 0.324 writes/s. Median admission wait is 12,263.5 ms. Fixed p50/p99 and
sampled RSS pass. All sixteen physical ports are used, with at most three
admitted/control scopes and thirteen queued calls; queues drain, exact answers,
write receipts and reopen pass. Source/runtime pins match before and after.
Root independently recomputes all eight gates from the pinned raw result.
The run uses source `31633316` and the original sixteen-client limits,
SHA256 `ec2b907922e46484c3dd7a026fb6580b7b4c1d93d54f3b9b81463f2aa3e0e2ae`.
The one-client tier is not rerun. The earlier control is a historical
comparison, not a fresh paired measurement; no reversal is warranted for this
failed screen. The candidate and raw result are preserved at `0b9bb988`.

Current isolated branches are `codex/temporal-read-scheduling-20261105`,
`codex/temporal-native-write-cohort-20261105` and
`codex/temporal-antijoin-concurrency-20261105`. Their worktrees under the task
directory are `temporal-read-scheduling-20261105`,
`temporal-native-write-cohort-20261105` and `temporal-thread-budget-20261105`.
Main only retains evidence and the protocol; none of these implementations
has been promoted.

## Second wave: the remaining concurrent cost

Hold the useful native write change fixed as experimental B0. Native source
is `c3ff1d73`, harness/binding checkpoint `fe9ca9aa`; the original version-one
read contract and compiled TypeScript remain unchanged. The immutable runtime
is in the native-write worktree at
`projects/temporal-datalog/runtime/build/native-write-frozen-032-20261105/runtime`.
Its parent `SHA256SUMS` hashes to
`b17f748f92f8fa94bd5b9218602993e8b0e5f4b9ab863b38d7941fb11769580b`.
It contains the actual selected SDK and the f44/55/af native pair/control,
with the same 72b502 engine. This is a control for further experiments, not
production acceptance.

| Arm | Owner | One declared mechanism |
| --- | --- | --- |
| D: driver pruning | native_read_strategy | C++-generated positive-driver SEMI JOIN before negative membership, preserving full logical admission. |
| B2: thread budget | acceptance_and_benchmarks | DuckDB threads four to one, UV four, no extra read cap. |
| C2: fair admission | orchestration_operations | FIFO three whole query calls, DuckDB four and UV four. |

All arms keep the same query, history, correction writer, oracle, input-cap
proof and numerical limits. D must first prove physical RHS reduction and
typed/admission equivalence on a small actual-engine plan slice; stop it if
either fails. It has one candidate implementation without a new build-mode
toggle. B2 and C2 first use the same narrow config harness and selected B0
runtime, with original 0.32 budget identities, B0 artifact identities and
actual configuration reported separately. Sixteen-only screening does not
qualify the complete milestone. A passing contender then needs the applicable
one-reader gate, fresh matched control/reverse order and broader regressions.
Main keeps the accepted 0.32 implementation while these experiments run.

The [shared configuration protocol](ANTIJOIN-CONFIG-COHORT.md) freezes source
`8651acc1` in `codex/temporal-antijoin-config-20261105`. Its
[qualification](evidence/antijoin-fixed-b-config-smokes-20261105.json) at
`67762ae4` passes two syntax checks, sixteen pure methods and all three short
100k B0/C2/B2 smokes: 646 measured exact calls and fifty acknowledged writes.
Every phase uses all sixteen physical ports; C2 admits at most three control
scopes and drains its thirteen-call queue. All 445 archived checksums pass
before and after. The [independent review](evidence/antijoin-config-independent-source-review-20261105.json)
finds no blocker. These are correctness screens, not 10m timing qualification.

D, also named A2, freezes its C++ proposal at `2bef891f` on
`codex/temporal-anti-driver-pruning-20261105`. Its first frozen-B0 100k
diagnostic observes an ANTI hash join with 256 positive and 17,075 negative
rows, supporting the pruning hypothesis. The [qualified actual-engine slice](evidence/anti-driver-pruning-qualified-20261105.json)
at `df8ad1e2` passes core/paired-owner builds, TypeScript, six focused methods
and all four matched B0/A2 100k/10m physical plans on the first attempt.
At 10m the original ANTI builds 1,679,946 negative rows for 256 positive rows.
A2 first SEMI joins against 256 positive rows, emits one negative match and
builds that one row in the final ANTI, returning the identical 255 typed answers.
The full logical admission remains 1,680,202, with exact-cap success and
one-below rejection. Historical cuts, replay, reopen and source hashes pass.
Root matches all twelve raw SQL/profile files and four source identities.
Candidate core is `000def11b9907b4733c80a399a2bbee813abf627386478d33f762035ac8b27de`,
paired owner `593315c03fc502aa7af0a9e63242d6fd5fac0da4820b52270b2da1dbf02604d4`;
the rebuilt bridge's actual identity is recorded, with unchanged source and
build options. The v1 SDK and engine remain byte-identical to B0. Full mixed
timing was subsequently rejected below. Reversed controls,
broad-positive/tiny-negative regressions and full integration are unrun.
The full admitted input still scans; reduced hash
build cardinality is not a claim that all negative input I/O disappears.

### Second-wave outcomes and selected SDK slice

All three mechanisms received their first unchanged-limit 10m screen:

| Arm | Numeric gates | Mixed reads/s | Mixed p99 | Writes | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| [Fresh B0 control](evidence/antijoin-config-b0-10m16-20261105.json), 16 clients | 7/8 | 6.782 | 4,580.8 ms | 41 | Fixed p99 misses; preserve control variance. |
| [C2 FIFO three](evidence/antijoin-config-c2-10m16-20261105.json), 16 clients | 8/8 | 6.408 | 2,968.5 ms | 420 | Advance to actual SDK integration and qualification. |
| [B2 one DuckDB thread](evidence/config-wave-b2-10m-16-20261105.json), 16 clients | 2/8 | 2.882 | 10,932.0 ms | 20 | Reject. |
| [A2 native driver pruning](evidence/anti-driver-a2-full-gate-20261105.json), 1 and 16 clients | 14/16 | 5.579 at 16 | 5,545.7 ms at 16 | 33 at 16 | Reject; fixed 16-client p99 and minimum write count miss. |

Every arm preserves exact answers, corrections, replay/reopen and resource
cleanup. Root independently recomputes the numeric gates from raw evidence.
C2 uses 2.420 GB sampled RSS, all sixteen distinct physical ports, at most
three active control scopes and thirteen queued calls; the queue drains.
Its 420 writes include restored members but do not complete the full
512-patch cycle or necessarily sample the all-removed cut. The
[deterministic cycle protocol](ANTIJOIN-C2-CYCLE-CORRECTNESS.md) and new SDK
independent oracle create those conditions explicitly. Fresh B0 differs
substantially from the earlier B run, so this single order does not establish
a repeatable causal speedup. No candidate is promoted.

The [approved SDK contract v2](SDK-QUERY-ADMISSION.md) turns the C2 hypothesis
into automatic SDK scheduling, without a public mode. Source `d024e9b8`
captures the original writer tail before the shared five-API FIFO, retains
accepted internal cleanup, and includes queue time in whole-query timeout.
The outer C2 harness captured its tail after admission; its numbers cannot
qualify these different SDK bytes. The
[production binding plan](ANTIJOIN-C2-PRODUCTION-BINDING-PLAN.md) forbids a
second outer FIFO and preserves separate old/new SDK and native identities.

The [profile frame](evidence/antijoin-c2-frame-100k-one-reader-20261105.json)
passes three syntax checks, 22 pure methods and one-reader short 100k
correctness on the old SDK; it is not a full one-reader performance gate.
The new SDK's targeted actual-engine checks, independent 512-patch trace,
one-reader screen, fresh/reverse sixteen-reader comparison, broader
workloads and full verification remain the promotion boundary. The
[research synthesis](RESEARCH-SYNTHESIS.md) informs subsequent recursion,
memory, publication and reference work without replacing this qualification.

### Actual SDK focused qualification

SDK source `2bb4ca2a`, production module source `d024e9b8`, passes
[92 targeted actual-engine methods plus TypeScript](evidence/sdk-query-admission-v2-focused-20261105.json)
at checkpoint `2ae3d850`. This covers the shared five-API FIFO, original
writer barriers, queue/lease/active cancellation and deadlines, drain on
close/revalidation, physical port reuse, all eight types, intervals, cuts,
lookup, negation, expressions and aggregates. The independent event/Map
oracle completes 512 native patch ACKs and 6,262 exact answers across sixteen
clients, including explicit empty K841 and restored K1097 cuts, replay,
revalidation and reopen. Root matches nineteen raw files through 36 receipt
references, five exact source hashes and all 92 passing TAP methods.

The first fixture failures remain in the receipt. Stream interception was
repaired, and unmanaged Probe presence correctly expects null. Holding
sixteen LIGHT results exceeds the unchanged 128 MB default on both SDKs;
the lease-cancellation fixture explicitly uses 512 MB. Heavy tests retain
the default. Cleanup completion is recorded for the 128 MB boundary;
healthy reuse after that OOM is unqualified. This is not a shared memory
budget or a production-default increase.

Selected store JS is `8240cebcb75251ac06b5c1790c8abdf95bc394d926ee93057f89959df3a82607`;
native f44/55/af and engine72 remain unchanged. The frozen 445-file inventory
is `8f1bfbcb69409f308a74a32a62f787693739798cc0c72df3710d92dba3798d71`.
The [selected binding protocol](ANTIJOIN-SDK-CONFIRMATION.md) at `6fbb3775`
passes three syntax checks, 28 pure methods and
[independent source review](evidence/selected-sdk-binding-independent-source-review-20261105.json).
The [actual small profiles](evidence/antijoin-sdk-small-20261105.json) pass
on their first attempt: one client completes 24 mixed reads/24 writes;
sixteen clients complete 219 mixed reads/19 writes. Both preserve exact
17,331 input admission and one-below rejection, source/native/package pins,
cleanup and reopen. All sixteen distinct ports are used, with three maximum
overlapping physical scopes and leases. Root matches both raw files and
those observations. Timings are explicitly unqualified.

The [first full original-limit 10m SDK screen](evidence/antijoin-sdk-full-20261105.json)
at `9ad222ed` passes all sixteen gates on its first attempt:

| SDK profile | Fixed p50/p99 | Mixed reads/s | Mixed p50/p99 | Writes | Writes/s |
| --- | --- | ---: | --- | ---: | ---: |
| One client | 246/296 ms | 3.195 | 299/648 ms | 384 | 6.390 |
| Sixteen clients | 2,321/2,526 ms | 6.210 | 2,550/3,022 ms | 372 | 6.185 |

All six complete ten-second windows per profile contain writes. At sixteen
clients all sixteen distinct ports are used, with three maximum overlapping
physical scopes and leases. Source371/recipe532, both actual SDK roles,
native/package/archive pins, exact input-cap/minus-one checks, typed cuts,
receipts, cleanup and reopen pass. Root independently recomputes all sixteen
numeric gates and matches both raw hashes, write windows and before/after
pins. Maximum sampled RSS is about 1.53 GB at one client and 2.72 GB at sixteen.
This is one absolute screen, not a repeated causal comparison or tail SLO.

### Integrated correctness and first matched pair

The isolated integration checkout now passes
[422 checks plus TypeScript](evidence/sdk-integration-full-20261105.json),
including the 44 unchanged Triplex cases, at `9261c96d`. The first full
attempt's old physical-reader waiting assertion failed because the private
FIFO correctly leaves that reader statistic at zero. The failure is
preserved; a fixture-only repair also proves only the two warmups and active
cached statement dispatched. All production and dependency bytes stayed
unchanged. The second full attempt passed, with all 216 source pins matching
tested `59d18593`.

The same checkout then passes
[all twenty functional families](evidence/sdk-integration-functional-20-20261105.json)
on its first run at `23ca13c1`: 213 typed engine-case answers and 60 fresh
profiles with reopen. Root independently matches all three engines' answers
and raw hashes. This is a functional screen, not the final timed comparison.
Main's inherited verification receipt remains405 until source promotion;
candidate422 is retained under its named evidence directory.

The [paired protocol](ANTIJOIN-SDK-PAIRED-16-PROTOCOL.md), fixed before timing
at `a8e08f88`, keeps the original eight numeric limits and actual selected
SDK as the only query admission owner. The
[forward B0→C pair](evidence/antijoin-sdk-forward-pair-20261105.json) at
`240417ea` records:

| Sixteen-reader arm | Limits | Mixed reads/s | Mixed p99 | Writes | Writes/s |
| --- | --- | ---: | ---: | ---: | ---: |
| Native B0, old SDK754 | 7/8; write count misses40 | 4.871 | 6,156.9 ms | 35 | 0.549 |
| Same native, selected SDK8240 | 8/8 | 7.479 | 2,348.7 ms | 442 | 7.362 |

Both pass exact cuts, admission boundaries, all sixteen distinct ports,
write windows, receipts, cleanup, reopen and before/after artifact pins.
Maximum overlapping physical scopes decrease16→3. Root recomputes both
limit sets and ratios: reads/s +53.5%, p99 −61.9%, write count12.63×.
The [reverse C→B0 pair](evidence/antijoin-sdk-reverse-pair-20261105.json) at
`104c0e3f` also completes under the unchanged protocol:

| Sixteen-reader arm | Limits | Mixed reads/s | Mixed p99 | Writes | Writes/s |
| --- | --- | ---: | ---: | ---: | ---: |
| Selected SDK8240 first | 8/8 | 6.786 | 2,673.2 ms | 395 | 6.574 |
| Native B0, old SDK754 second | 6/8; p99/write count miss | 5.321 | 7,371.9 ms | 33 | 0.546 |

Root independently recomputes quantiles, rates, all eight limits, writer
windows, selected source/artifact equality and drained pools from both raw
receipts. All sixteen ports are used; C remains at max3 physical scopes.
C improves mixed reads/s27.5%, p99 63.7% and write count11.97×. Its drain
rises1.643→2.185 s in this order; preserve the regression. Both orders now
pass C's original gates, but these short empirical tails are not an SLO.
The [deterministic cycle gate](evidence/antijoin-sdk-cycle-20261105.json)
then passes at `e0d9fd90`: a fresh fork finishes the exact timed442-write
prefix with seventy new native ACKs, explicitly checks all-removed/first-restored/
full-restored cuts, full delayed replay0/441/511, unchanged history and reopen.
All48 typed-cut checks and original caps/pins pass independent root review.
The timed database/raw remain untouched. This is correctness, not a new timing.

### Broad regression failure and next competing wave

The [broad protocol](SDK-BROAD-REGRESSION-PROTOCOL.md) was fixed before
execution. Its first launch stops before a database or query because the
older runner reads an omitted SQL source asset. The
[failure](evidence/sdk-broad-forward-setup-first-20261105.json) is preserved.
The [reviewed staging repair](SDK-BROAD-STAGING-ADDENDUM.md) adds only the
manifest/Git/header-pinned SQL to exact owned copies of the frozen runtimes.
The actual staged mappings and resolved SDK/engine bytes pass before/between/
after the measured arms; protected archives remain unchanged.

The [first actual broad pair](evidence/sdk-broad-forward-20261105.json),
checkpoint `b5ea1f3c`, passes exact answers, all315 fixed samples per arm,
historical/latest cuts, native receipts, write windows, drain and reopen.
It fails six of27 predeclared numerical gates:

| Measurement | B0 | SDK static3 | Disposition |
| --- | ---: | ---: | --- |
| Four-reader grouped-count median | 1,043.6 ms | 1,216.8 ms | +16.6%, exceeds15% |
| Sixteen-reader count median | 3,584.3 ms | 4,583.4 ms | +27.9%, fails |
| Sixteen-reader grouped-count median | 3,926.2 ms | 5,179.0 ms | +31.9%, fails |
| Sixteen-reader projection median | 63.2 ms | 80.1 ms | +26.9%, fails |
| Mixed median | 2,808.5 ms | 3,333.1 ms | Fails relative15% and absolute3,200 ms |
| Mixed reads/s | 5.283 | 4.884 | −7.6%, passes90%/4.8 floor |
| Mixed sampled p99 | 5,417.5 ms | 4,240.2 ms | Improves21.7%, passes |
| Native writes | 46 | 1,067 | Improves; all six complete windows have ACKs |

Root independently recomputes all27 limits, quantiles, rates, widths,
receipt positions and windows from the raw reports. Neither arm has a
correctness/lifecycle failure. The candidate remains unpromoted; no reverse
is justified after this failed forward screen. Goal4 stays open.

Three bounded source investigations now target this same anti/broad workload:

| Lane | Automatic strategy hypothesis | Source/acceptance boundary |
| --- | --- | --- |
| A | Static4 query admission | One capacity constant and dependent boundary tests; preserve the full v2 invocation contract. |
| C | Four shared slots with writer service after a bounded read-completion quantum | Reads become eligible only after their captured writer barrier; atomically acquire slot/reader and retain cleanup ownership. |
| B | Companion-owned C++ writer executor outside the shared libuv queue, with reader-wide query admission | Actual per-instance lifetime/enrollment, typed handoff, exact receipt/error transport and drained shutdown; no unverified SDK pointer casts. |

Each uses an isolated source context and retains the failed static3 bytes.
There is no application mode or public tuning switch. Source proposals and
focused real-engine slices precede fresh bindings/measurements. Keep source371,
recipe532, both existing workloads/oracles, anti original limits and broad27
limits unchanged. Every candidate needs correct barriers, post-ACK reads,
queued/active cancellation, pending bounds, cleanup/revalidation and reopen.
Timed runs remain exclusive; repeat promising candidates in reversed order.
Only one implementation can be selected and promoted.

### Static4 rejected; fair4 and C++ writer qualification

Static4's first [broad forward pair](evidence/static-four-broad-forward-20261106.json)
at `24c252af` passes all20 functional cells but23/27 numeric gates. Root
independently recomputes every original limit from the raw samples.

| Failed gate | Mapped B0 | Static4 | Original limit |
| --- | ---: | ---: | ---: |
| Four-reader count p99 | 1,345.6 ms | 1,981.4 ms | 1,614.8 ms |
| Four-reader projection p99 | 25.199 ms | 30.760 ms | 30.239 ms |
| Sixteen-reader grouped-count median | 3,725.4 ms | 4,374.1 ms | 4,284.3 ms |
| Mixed relative median | 2,622.0 ms | 3,064.0 ms | 3,015.3 ms |

Mixed read throughput is5.407 versus5.726/s, sampled p993.784 versus4.139 s,
and writes335 versus51. Canonical source/recipe, maps, typed driver assertions,
ACKs, progress windows, drain and reopen pass. These gains do not offset the
failed gates. Reject static4; preserve the pair, with no retry/reverse or
threshold relaxation. Raw stored samples support cut/cardinality/quantile
recomputation; they do not retain every tuple byte asserted by the real driver.

Fair4 now has45 scoped methods including512 ACKs and7,271 exact reads across
sixteen clients, fixed405-runtime/446-inventory maps and a first-attempt frozen
small1/16 gate. The [broad forward pair](evidence/fair-sdk-broad-forward-20261106.json)
then passes all20 functional cells but21/27 original numeric gates at
`ad4b59bf`. Four-reader projection median, all sixteen-reader medians,
sixteen-reader projection p99 and mixed relative median fail. Mixed fair4/B0
reads/s are5.261/5.733, p503.174/2.593 s, p994.054/5.009 s and writes105/50.
Root independently recomputes every limit,1,314 stored sample widths/cuts/
quantiles,155 ACKs and12 progress windows;46 raw hashes, terminal exits,
source371/recipe532 and actual runtime maps match. Reject fair4 without retry,
reverse or threshold changes. A metadata-only packaging syntax failure stays
preserved; it does not rerun an engine or change measured reports.

The C++ writer's scoped union is ten methods: initial3 plus repaired factory1
plus first-attempt controls/delivery6. Root verifies the actual companion/addon,
source and SDK closures. Active-job environment teardown, broader types/full512,
full regression and performance remain open. Independent eight-type test
authorship and lab-only matched18-context v2 SDK-control/C++-candidate preparation
continue. C prepares the complete regression fixture/environment plan; A runs
the independently reviewed values followed by a separate unchanged512 gate;
B prepares the lab wrapper and observed18-context proof. The first A staging
copy's missing immutable assets stop before compilation/engine and are repaired
only by adding the three absent exact files under a corrected map union.
The corrected type stage then passes its three first-attempt public methods
plus TypeScript; unchanged512 adds512 ACKs and8,202 exact reads across16
clients at `51d4d0f7`. All tested source/artifact maps stay equal. The writer's
current union is14 methods. The paired lab roles at `3242904e` each observe18
unique enrolled contexts and the selected single engine/native images; exact
canonical receipts agree and five cleanup counters return to zero. Root and
independent A accept both actual role proofs. B freezes the matched v2 broad
comparison next; C implements fixture-only full-regression adaptations on a
separate checkout. These tasks add no second application mode or promoted code.

### C++ writer forward passes; regression and reverse qualification continue

The frozen matched v2/18-context [forward pair](evidence/native-writer-broad-forward-20261106/receipt.json)
at `1c5117ff`, plan `9499d3b4`, passes27/27 unchanged numeric gates and all20
functional cells. Both arms use the same408-file runtime/binding8fb and differ
only in generated writer dispatch. This control is not old SDK754/owner55 B0.

| Mixed measurement | Matched SDK control | C++ writer |
| --- | ---: | ---: |
| Native writes / writes per second | 50 /0.828 | 1,163 /19.363 |
| Reads per second | 5.744 | 5.670 |
| Median / sampled p99 | 2,540.8 /4,641.0 ms | 2,769.2 /4,715.1 ms |
| Sampled RSS | 2,803,597,312 B | 2,808,201,216 B |

Root and independent A recompute all27 gates,1,335 saved measured sample
widths/cuts and1,213 consecutive unique native ACKs. All12 complete progress
windows have ACKs; every latest read respects the public ACK frontier and
every returned cut is below its issued-write frontier. Fixed cuts remain39087.
Both actual PIDs/argv/roles, exact six loaded images, five zero cleanup counters,
closed owned clones and before/between/after source371/recipe532/binding8fb
pass. The [root review](evidence/native-writer-broad-forward-root-review-20261106.json)
preserves scope: full typed answers were asserted in-flight by the unchanged
driver; stored samples retain widths, not every tuple byte. Short tails and
sampled RSS are not service or containment guarantees. The narrowest passing
gate is four-reader projection p99,28.878≤29.166 ms. No promotion follows.

C's independent fixture-only source `00074169` and staged TSC now pass their
[first14 targeted methods](evidence/native-writer435-focused-20261106.json)
at `50669821`, with exact581→583 delta,132 owned/48 native inputs and unchanged
full512 source/emitted blocks. Root verifies29 raw hashes, all terminals/TAP
counts and after-every-process maps. These methods are part of the expected
435, not added again. The [first full435 verifier](evidence/native-writer435-full-20261106.json)
then exits0 after436.8 s:391 methods plus44 unchanged Triplex cases, TSC and226
Git-matching source pins. The wrapper's original postcheck stops because three
existing-test outputs appear under the broadly inventoried owner_probe directory.
Root independently proves all583 prior files and every other map unchanged,
finds the exact DB/observation producers, and accepts a separate output partition.
The first stop remains preserved; no application/test change or rerun follows.

A prepares one actual Worker-termination recovery gate. B's revised protocol
requires reverse matched broad, candidate-only original anti1/16 and original B0
broad in both orders, each under a separate exclusive grant. Additional anti
pairs require a concrete unresolved question. All budgets remain unchanged.


### C++ writer reverse, original anti and active-start results

The [reverse matched pair](evidence/native-writer-broad-reverse-20261106/receipt.json)
at3269734a passes27/27 with the original plan/calculator, same408-file closure
and no threshold change. C++ first records1,106 ACKs at18.421/s,5.560 reads/s,
2,789.7/4,347.3 ms median/p99 and2.486 GB sampled RSS; SDK second records48 ACKs
at0.784/s,5.493 reads/s,2,579.2/5,328.3 ms and2.655 GB. Root and independent A
validate all1,323 samples/1,154 ACKs, actual role/image sets, latest/fixed cuts,
progress windows, cleanup and closure. This is a matched writer-transport result,
not the original B0 application comparison.

The first [candidate-only anti screen](evidence/native-writer-antijoin-candidate-20261106/receipt.json)
at8a8e3f56 passes all16 original one/sixteen-reader limits. No engine retry or
budget change occurs. Preserve the pre-engine fingerprint setup error and
post-engine offline serialized-BIGINT conversion error alongside their bounded
helper corrections. Root's [independent review](evidence/native-writer-antijoin-root-review-20261106.json)
recomputes1,071 saved samples/892 ACKs, the original limits, typed saved reuse/
reopen answers, cardinalities, cuts, exact six images and five zero cleanup counts.

| Readers | Queries/s | Median / p99 | ACKs / ACKs per second | Sampled RSS |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4.393 | 225.9 /267.0 ms | 527 /8.780 | 2,607,661,056 B |
| 16 | 7.567 | 2,060.0 /3,089.2 ms | 365 /6.081 | 2,868,035,584 B |

A's first [active-start engine gate](evidence/native-writer-active-start-20261106.json)
atf38f38ce passes after its preserved setup/TSC fixture errors. Captured
query_begin precedes termination request by0.734 ms. First reopen sees complete
oldK1/no receipt, then whole-command retryK2, exact replay, healthyK3,4,100 exact
history rows and reopen pass. No explicit Worker store.close occurs. This tests
started-before-termination recovery; it does not assert activity at cleanup entry
or separately measure per-worker native handle cleanup. It is not a fresh436 run.

B next prepares the original B0SDK754/owner55 runtime from its actual b17
inventory, plus only its archived/Git-pinned SQL asset, in a new405-file stage.
Original0eaf admission and current8fb workload provenance remain separate. Its
17-user-context policy differs from the matched candidate's18; disclose this in
the required whole-runtime broad comparisons, in both orders. All ten-goal and
final twenty-workload requirements remain in the task graph; only Goals2/5 close.


### Research-backed interval primitive first engine gate

[Source31cbefd8/package63941fac](evidence/native-presence-intervals-first-20261106.json)
passes first paired core/owner builds, TypeScript and5 independently authored
raw-engine methods in14.14s. Core2f7f6c0e and owner109a16b2 are a new pair;
old f44/0e4 timing receipts are not relabeled as this build. All five synthetic
128MB/64MB fixtures close/noWAL;395 SDK,38 targeted sources,9 artifacts,
128 compiled outputs and selected headers/routes remain unchanged. The initial
ad-hoc resolver bare-package failure and accidental core continuation are
preserved; correcting the resolver's duckdb.node subpath changes no source,
dependency, oracle or cap. Root/A accept22 raw captures and matching manifests.

The native read returns maximal presence intervals at explicit K using latest
put plus later patches, with scoped event/island/logical-byte admission. The
thin public SDK API/five tests and actual operator profiler are next separate
source slices. Dense-history/physical memory, reference coverage/deletion,
full integration and production performance remain open.


### Original B0 both orders and default-writer promotion

The [whole-runtime forward](evidence/native-writer-b0-broad-forward-20261106/receipt.json)
and [reverse](evidence/native-writer-b0-broad-reverse-20261106/receipt.json)
both pass27/27 frozen numeric gates, with no engine retry or threshold change.
Original B0 retains17 contexts/contract1 and the candidate18/contract2; these
are whole-application comparisons, separately from matched transport tests.

| Mixed measurement | Forward B0 | Forward C++ | Reverse C++ | Reverse B0 |
| --- | ---: | ---: | ---: | ---: |
| ACKs |49|1198|1145|53|
| ACKs/s |0.809|19.962|19.068|0.861|
| Reads/s |5.605|5.664|5.491|5.734|
| Median ms |2625.0|2767.7|2849.2|2656.7|
| Sampled p99 ms |4910.9|4165.0|4687.2|4535.3|
| Sampled RSS GB |2.722|2.647|2.556|2.730|

Root and independent A recompute all27 gates in each order,1,325/1,342 saved
measurements and1,247/1,198 ACKs, fixed/latest cuts, progress windows, actual
images/contexts and healthy cleanup. Forward preserves two brief Git operations
with unknown exact timing; reverse is clean. Neither operation is asserted to
cause a latency difference. Raw samples retain widths; typed tuple assertions
occur in-flight in the frozen driver. No service-level or physical memory bound
is inferred from sampled tails/RSS.

Source1d6378e2 then passes a fresh [full435 verifier](evidence/native-writer-integrated-full-20261106.json),
TypeScript and216 Git-matching code pins. All583 selected staged files remain
unchanged. [Exact default installation/public7](evidence/native-writer-default-build-20261106.json)
passes:181 generated files installed, prior versions retained,395 dependencies
unchanged, seven closed/no-WAL fixtures. Promote this single automatic writer
strategy and close Goal4. Prior405 and rejected approaches remain retained.

The next same-problem study measures reference-coverage no-policy and history
cost. Raw presence5, SDK5, profiler3 and coverage4 pass separately; full integration,
large-history/cap qualification, Goals1/9 and final timed20 comparison stay open.


### Coverage boundary failure retained

[Boundary sourcee8b395d8/package03b12442](evidence/native-reference-coverage-boundaries-first-20261106.json)
passes first TSC and3/4 selected methods. Actual old2f format12 fence/oldIR
bytes/transaction rollback, signed-int64/identity priority and32/33 local scope
pass. The global-history method fails at128MB after27.70s: a256KiB pin exceeds
122MiB used. No phase diagnostics identify the exact operation, so intended
130entities/4290events are not claimed committed. First Nodeexit1, allpins and
fiveclosed/no-WAL fixtures retained; no rerun or higher budget. Reserved4k-edge
case is excluded. Next: minimal paired cost screen, then read-only lastACK/clock
reconciliation and measured diagnosis. This isolated coverage is not main435.


### Coverage cost baseline and localized growth failure

The [first six-child screen](evidence/native-reference-coverage-cost-first-20261106/receipt.json)
atcf7f/907 passes all typed/history/replay/rollback/identity/image/cleanup checks.
Root independently derives51 path-only raw projections and all96measuredACK,
18populated-open and18revalidation quantiles. Zero-policy ACKmedians rise
78.924→112.168ms and77.922→110.379ms, ratios1.421218/1.416537. NativeSQL-call
medians rise equivalently; parse/bind/execute are not yet separated. Candidate
unrelated/incoming ACKmedians113.901/114.766ms are similar; incoming revalidation
2.067s versus0.293s is a separate observed lifecycle cost. No optimization wins
or production promotion follow. [Three hypotheses](NATIVE-REFERENCE-COVERAGE-OVERHEAD-SPIKES.md)
freeze the same matrix and future budgets before implementation.

[Read-only reconciliation](evidence/native-reference-coverage-growth-diagnostic-20261106.json)
finds260persisted commands/K261/130entities/4290events and keeps the first DB
unchanged; commit does not imply delivered ACK. A separate
[fresh trace](evidence/native-reference-coverage-growth-trace-first-20261106.json)
records all260actualACKs and three exact count routes before revalidateOOM
at128MB. Root independently checks1060consecutive trace events and successful
close. Which subaudit fails remains unknown. No cap raise, originalDB retry or
healthy audit/reopen is claimed. The next proposed same-IR4 growth comparison
will distinguish preexisting2f behavior from candidate-only regression.


### Actual statement attribution and parallel native alternatives

[Source200eb/packageff86](evidence/coverage-command-profile-pair-20261106.json)
retains two fresh publicpatches with identical command, receipt and full history.
Regularfile FD2 captures29baseline/31candidate profiles,8/9CTAS. The added
referenceguard has231operators,30.362ms query time,21.769ms optimizer time and
3.505ms planner time; parser absent. Root independently decodes/matches all60
nativeJSONs. Profile timers overlap; profiled publicwall92.687/125.929ms is not a
service comparison. The earlier truncatedpipe result stays failed as capture,
with its successful public semantics/cleanup retained; no EAGAIN cause is proven.

[Same-IR4 growth pair](evidence/native-reference-identity-growth-pair-first-20261106.json)
proves both2f and a562 fail inside revalidate at128MB after260ACKs/K261 and three
exact65count routes each. Parentdiagnostic exit0 does not change child1+1 failures.
All source/native/SDK/lifetime/closedfixture checks pass. Subaudit stillunknown.

Three isolated native source alternatives now compete on the unchanged six-child
costmatrix and frozen budgets: fusion1a1e, canonical typedVIEWd1e5, and typed
rebuildable policy storage48f (bootstrapguardorder repair pending). First focused
realengine slices precede cost screens; no runtimeoption or winner is promoted.
