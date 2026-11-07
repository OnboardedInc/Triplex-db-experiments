# Public writer ACK and visibility under native read load

Tags: `backend:xtdb`, `surface:xtdb-native`, `problem:writer-liveness`, `mechanism:separate-client-pools`, `status:observed`.

The retained [256-open diagnostic](../../.devloop/jobs/xtdb-load-256-open-v1/attempts/0001/artifacts/events.jsonl) used a5,000ms window and one planned ten-entity correction offered at0ms. Its SDK ACK was recorded at9,384.398209ms; the subsequent visibility probe completed at10,716.977584ms. The ACK was already outside the window, and ACK-to-visibility added1,332.579375ms. The [independent attribution review](../../qualification/reviews/xtdb-load-256-open-writer-attribution-v1.json) rehashes all640 actual returned bodies, the immutable terminal/output anchors and independent returned-cut catalog. It preserves exact as-run source hashes.

| Route | Client/pool construction |
| --- | --- |
|Public writer and its visibility query|One scoped `makeXtdbClient` shared by that Runtime's StorageAdapter and QueryExecutor.|
|Separate Triplex reader Runtime|Another `Effect.runPromise` root builds a fresh memo map and scoped client.|
|Native provider used by the256 logical readers|`openNative` explicitly calls `makeXtdbClient` again; those logical readers share this native-provider pool.|

`makeXtdbClient` constructs `postgres(...)` unconditionally with default maximum20 connections. Pinned PostgresJS constructs its own connection and queue arrays on every call. Pinned Effect starts each `runPromise` from an empty context, and Layer construction forks/creates its memo map. The factory, client, storage, core Runtime and relevant Effect/PostgresJS source files are byte-identical to the historical run's recorded hashes. The later runner/registry hashes are listed separately because those files changed after this run. This is a source-construction proof; actual established socket counts were not recorded.

The writer's visibility operation is `writeTriples.queryAll`. It runs outside `Dispatch.use` and uses the writer Runtime's pool, so native readers do not occupy that probe's client pool or host dispatch semaphore. They still share the commissioned XTDB server, CPU allowance and host scheduling. The observation therefore rules out that specific direct queue explanation while leaving shared-resource contention and public SDK work to be measured.

The SDK transaction performs source-cut/command-claim queries, stages retractions, submits the transaction, and resolves its durable attempt receipt before returning. For a normal attempt, each of the ten retractions calls both core `getById` and the adapter's target query:20 target reads precede submission. The client then sends `BEGIN READ WRITE`, its statements, `COMMIT SYNC` and `SHOW AWAIT_TOKEN`; persist checks the durable attempt afterward. An outcome-reconciliation branch can also precede the recorded ACK. No per-phase server or driver timings identify which costs dominated this particular return.

The old event lacks actual write-start and visibility-probe-start fields. Its offer-to-ACK interval includes any host start delay; ACK-to-visibility includes local work plus the whole subsequent public query. New diagnostic arms record those additional starts, allowing tighter end-to-end phase accounting without inventing an engine commit/index timestamp. The first returned P3 native read completed at10,277.496250ms; it does not prove an earlier engine commit time. This single short-window miss establishes a workload/cohort observation, not a universal XTDB latency defect or production SLA.

## Actual point-query text and bindings

The [independent wire-shape review](../../qualification/reviews/xtdb-load-256-open-query-shape-v1.json) verifies two templates across640 successful reads:320 current and320 historical. Their exact text SHA256 values are `4703392ff58729702b3109bada005f8e90b6615e1884cc31187326df059a28ad` and `e3a87fd3dcc1fa6ed8447fec693c57dc7a549c8b9fa0ed871ed2f507ca1f5094`. Both templates are reused at P2/P3 across32 target entities per class. Scope, P, V, optional R, entity and attribute are supplied through `triplex_param_N` and PostgreSQL `$N` bindings. The retained trace file SHA256 is `b09fcb1ea51ec9aafba951ab8b90fe2b1e2f262a8e7e41a5ad3626f86700cf25`.

`Sources.ts`, `NativeQueries.ts` and `XtdbClient.ts` match the run's exact recorded source hashes. Per-entity/cut SQL text churn is not observed. The client sets `prepare:false`; stable text therefore does not establish named prepared statements or server plan reuse. Per-request parsing/planning costs remain unmeasured until phase spans or a separately qualified experiment distinguish them from admission and execution.

## Frozen dispatch diagnostics and timed populations

All three later arms used256 logical clients,128 offered reads/s and a30s measurement window. Each received3,840 offers. Independent review recomputes every successful body from the frozen recipe and returned cut, and preserves their actual `failed_process` outcomes:

| Read dispatch | Correct through drain | Completed inside30s | In-window total RPS | Deadline errors | Writers visible inside30s / reconciled through drain |
| --- | ---: | ---: | ---: | ---: | --- |
|8 ([review](../../qualification/reviews/xtdb-writer-dispatch-8-v1-independent-v2.json))|647|571|19.03|3193|3/6; all6 reconciled|
|16 ([review](../../qualification/reviews/xtdb-writer-dispatch-16-v1-independent.json))|992|781|26.03|2848|2/6; all6 reconciled|
|32 ([review](../../qualification/reviews/xtdb-writer-dispatch-32-v1-independent.json))|974|765|25.50|2866|2/6; all6 reconciled|

These are failed read-availability/liveness diagnostics, with no qualified winner. The independent recipe checks include53/110/102 successful current hot-row reads after corrections, respectively. All successful replies match their captured cuts. The final32 arm reuses the same two bound native query texts at P2/P3/P4.

Promotion goodput counts only calls offered within the fixed window and completed by its end, divided by fixed seconds. Successful calls finishing during drain contribute to the latency distribution of the offered cohort, but never to in-window completion counts. Thus the original256-open observation has640 correct drained bodies yet only147 in-window completions (74 current/73 historical). The [independent timed-population review](../../qualification/reviews/xtdb-load-256-open-timed-population-v1.json) recomputes14.8/14.6 RPS by class. Success-only percentiles in failed arms are diagnostic; read failures prevent promotion qualification.

## Lower offered-rate control

The later256-client, dispatch16 control offered16 reads/s for30s rather than128.
It produced480 correct replies with zero read errors, all256 clients progressing,
479 completions inside the window, and six of six writers visible and reconciled.
Independent review recomputes111 current hot-row answers after corrections and
confirms zero finish-before-offer timestamps. See the [raw-result/cut review](../../qualification/reviews/xtdb-writer-rate16-control-v1-independent.json)
and [author's strong-byte receipt](../../qualification/evidence/xtdb-writer-rate16-control-v1-strong-bytes.json).

This is a successful small-fixture diagnostic at the lower offered load. It
does not rank dispatch16 over the failed128RPS arms, because their offered-load
profiles differ. A common five-surface calibration, frozen writer floor,
repeated controls and target-scale qualification remain open. The earlier ACK
and visibility misses remain observations of their actual workload/cohort.

## Later fixed-contract foundation and isolated diagnostics

These are named, separately retained windows. Each offers480 point reads over30s
at16/s to256 logical clients with16 dispatch slots, plus six ten-entity atomic
commands. The small fixture has1000 raw domain-fact subjects per scope, not1000
configured entities. Logical client count is not physical connection count.

| Actual path/window | Correct through drain | Correct inside30s | Read errors | Writers inside30s / reconciled | Outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| Original Duck Triplex |145|110|335|4/6|Strict FAIL |
| Original XTDB Triplex |480|407|0|1/6|Strict FAIL writer floor |
| Qualified-F1 QLever Triplex successor |215|130|265|0/6|Strict FAIL |
| Separate QLever native-only/planner100 |448|234|32|0/6|Strict FAIL |
| Later isolated observed XTDB Triplex |480|479|0|6/6|One instrumented diagnostic passes |

The [first two strict reviews](../../qualification/reviews/five-surface-rate16-first-loads-contract-independent.json),
[Q F1 review](../../qualification/reviews/qlever-qualified-rate16-v2-contract-independent.json),
[Q native-only review](../../qualification/reviews/qlever-native-only-rate16-contract-independent.json)
and [observed XTDB review](../../qualification/reviews/xtdb-driver-stages-observed-v1-trace-independent.json)
bind actual rows/cuts, offers, unique writers, ACK/visibility, caps, preimages and
outcomes. Q native's first SDK ACK is63,879.531ms, followed by public visibility
at65,014.377ms. Its six commands reconcile only through94.48s. The ACK itself
was late; these are not six in-window writer successes.

Original Duck's final read event is at59.94s; its75.4s report drain includes a
later final-position check. Do not call that a75.4s read-return time. The
[owner-stage and withdrawal record](duckdb-owner-audit.md) distinguishes its
subsequent narrowly qualified queue fix from the still-failed load.

The observed XTDB window has no other canonical heavy client overlap under its
declared guard, while its commissioned3GiB/2CPU XTDB and2GiB/1.5CPU QLever engines
remain charged. The20 repeated identity lookups before each write BEGIN are now
[a measured shared-foundation target](transaction-identity-read-duplication.md).
This does not causally rank the newer result against earlier co-runner windows
or establish sustainable rate/capacity. Writer floor, repeated matched cohorts,
tail sample adequacy and target entity/history scale remain open.
