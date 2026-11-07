# Goal 3 v2/performance evidence QA

**2026-10-31 UTC · source-only continuation · no implementation acceptance**

## Disposition

The frozen `v2-performance/research.md` is a sound, carefully qualified research input. Its central API, error-semantics, and recursion distinctions survive this review. The benchmark proposal is useful **after** the coordinator selects a bounded contract; the endpoint/accounting clarifications in `benchmark-protocol-addendum.md` should travel with it. This is not approval of SQL translation, native/SCC interoperability, scalability, speed, or production readiness.

Original drafts and original worker directories were not modified. All writes by this reviewer are confined to this new directory. The coordinator remains the sole source/ref/PR/Page/private-repository integrator. No app import, FP probe, DuckDB import/open/SQL/EXPLAIN, extension execution, build, benchmark, Codex task, or user-computer access occurred.

## 1. Input integrity and independently checked anchors

Input root: `../../recovery-0359/snapshot/v2-performance`.

| Check | Actual result |
|---|---|
| Recovery manifest | SHA-256 `849c98fee64ca679ca70d6fbe1ddd133708dc8c1639d4d8d4e5fc28125f59123` |
| Frozen v2 packet | All **60 files / 137,926 bytes** match listed byte counts, modes, strict UTF-8 and SHA-256 |
| Bounded pinned source excerpts | All **16** match their original receipt hashes |
| Immutable project sources | All **12** originally receipted files match receipt and export-manifest entries; export manifest SHA-256 `cb63b5055b4e58dc9a2cfbaaf4d316a107be8c807b4cac6d387d40446151273d` |
| Split public header | Joined **in memory only**: 751,463 bytes; SHA-256 `73026a28e5b55952afb6e2e9ce80fd4f76614afedce329da895ccaf85a4a8be6`; computed Git blob `c36fe3ac3edd536aba8e79f6d7d9a81ed834c5e4` |
| Numbered header excerpts | All **209 retained lines** match the immutable header parts; part 2 follows 8,595 lines |
| Two narrow fresh pinned reads | Table-function and recursive-operator complete returned bytes/hash/computed Git blob match original receipts; only new bounded MIT excerpts retained |

Check receipts are local evidence, not runtime conformance. The executable QA helper here uses Python standard-library byte/text/JSON operations only; it does not import or run project files.

## 2. Verified claims, qualifications, and decisions they support

All pinned source links below use DuckDB **2.0.0 / `d54cbbe3df17e8e5ce68312f483b4155836112aa`**. Header availability does not establish successful LOAD or runtime behavior.

### Scan/filter ownership

`research.md:28–37` is supported. The [table-function bridge](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_table.cpp) removes accepted predicates from the remaining engine list. Accepting a predicate transfers responsibility for its exact SQL semantics, including type, NULL, collation, cast and error behavior. Decline unknown expressions. A conservative prefilter may coexist with an unaccepted residual only when it has no false negatives.

The [header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h) limits offered expressions to callback lifetime, maps their column indices through the query's scan-column mapping, and permits repeated optimizer callbacks. Do not retain borrowed expression/child pointers or assume declaration-order indices. Fresh source independently confirms `CV2TableFunctionData::Copy()` shares its user-data handle (`21–44`); idempotence and shared mutable bind-state ownership are real acceptance obligations, not hypothetical API details.

### Real optimizer-facing v2 benefits, without overclaiming hooks

`research.md:41–67` is correctly bounded. The exact header exposes projection, cardinality, insertion-order/NO_ORDER, batch/partition, vector, collection, replacement-scan and statement-collection facilities. Exact cardinality also supplies an optimizer upper bound; it is not an admission quota. Single-valued partition claims support partitioned aggregation, not arbitrary join/SCC partitioning. Batch-index contracts include nondecreasing per-thread indices, inter-thread ordering uniqueness, range validation, and changed values when partition values change.

The negative claim must remain **no general logical/physical-plan hooks found in the inspected v2 header/module surface**, not no extension capability anywhere in DuckDB. A table function over DuckDB's own persistent table hides rather than automatically improves ordinary relational planning. Direct parameterized SQL is therefore the baseline for ordinary scans/joins; that recommendation is an architectural inference, not a measured result.

### Vector/collection/replacement lifetimes

The packet correctly distinguishes vector access from eliminating all copying. Dictionary-child flattening can invalidate aliased borrowed views. Collection append copies; a collection scan can reference managed buffers only within the stated scan-state window. Managed staging is a plausible spill-capable primitive, not a whole-process bound or proof that native dictionaries/sets/Python results spill. Replacement scans resolve names; they do not intercept arbitrary existing-table plans. Their collection borrows can outlive results through prepared statements. See the pinned [vector](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp), [collection](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_column_data_collection.cpp), and [replacement-scan](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_replacement_scan.cpp) sources.

Keep the documented `statement_add_collection` tension visible: the same header mentions refill/reexecution and prohibits clear/reset while statements/prepared copies/results remain live. **Immutable per-request collections until all dependents are destroyed** are the conservative initial recommendation. Do not resolve this tension by inference or promise safe live-plan refill without a focused contract test/upstream clarification.

### Parameter safety is not automatic plan reuse

The exact [prepared-statement implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_prepared_statement.cpp) and header say base-table scans rebind/noncacheable plans. Explicit parameters still separate data from syntax; they do not guarantee amortized binding/optimization. Measure the actual route and endpoint rather than using prepared syntax as reuse evidence.

### Error semantics and the SQL gate

Local core inspection supports the report's strongest blocker: each complete relational candidate evaluates filters in source order until error; a false filter does not suppress later filters; filters precede head deduplication. Global visible EDB/fact limits and work/round failures can remain observable outside the answer cone. Correct answer rows alone are not legacy-contract equivalence.

DuckDB really has `CanThrow` and internal [ExpressionBarrier](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/planner/expression/expression_barrier.hpp) protections; the report does not falsely deny them. Their ordering model is not eager evaluation of every native filter. Do not substitute ordinary AND, TRY, CASE, materialization hints, or an unexported internal barrier for that proof. The packet also correctly avoids stale advice that integer divide/modulo by zero defaults to NULL: the [2.0 numeric reference](https://duckdb.org/docs/2.0/sql/functions/numeric) describes errors by default. IEEE floating configuration and native strict-per-node behavior remain separate concerns.

A total status/value helper remains an **option**, not a proven solution. It needs a consumed diagnostic branch over all complete candidates before false-filter selection/head dedup/reachability pruning, explicit fault precedence and budgets, and callback-wide fallibility/FP/allocation treatment.

### Recursion is not the old static-rebuild baseline

The pinned [recursive operator](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/operator/set/physical_recursive_cte.cpp) distinguishes keyed UNION/UNION ALL. Fresh pinned bytes also show a plan-owned executor pool and reuse controlled by `EnableCachingOperatorsSetting`; the reviewer did **not** establish that every candidate plan enables or uses reuse. Record relevant settings and inspect actual project plans later.

The official [2026 engine account](https://duckdb.org/2026/08/25/how-duckdb-runs-recursive-ctes-faster) independently confirms retention of proven repeatable, recursion-independent builds, executor reuse, and per-frontier execution policy. Volatile, side-effecting and unknown builds are not automatically retained. This fresh read filled missing retained support in the original title-only article receipt; no article timing was adopted as project evidence.

Preserve the 2.0 semantics: USING KEY UNION forwards new/observably changed finalized keyed rows; UNION ALL forwards candidates. Short keys can discard valid Datalog tuples. Ordinary full-typed-tuple set UNION is a conservative linear-recursion starting point. `recurring.T` is not limited to USING KEY, and mutually recursive CTEs remain unsupported in the [2.0 WITH reference](https://duckdb.org/docs/2.0/sql/query_syntax/with). Earlier papers do not override the pinned/current semantics.

## 3. Useful options, not predetermined implementation

1. **Direct SQL + whole-program native fallback:** prove a narrowly admitted whole-program subset, including tag equality, snapshots, outputs, and the approved error/budget/metrics contract. Unsupported components trigger an explained whole-program fallback while no sound arbitrary-IDB boundary exists.
2. **Additional real v2 where it solves a boundary:** projected native-result table sources; strict tagged status-returning vector helpers; or connection-owned chunk/collection staging after a separately designed seed/IR/transaction interface. Each can remove specific boxing/staging costs; none is automatically useful merely because v2 exposes it.
3. **Do not force v2 around existing persistent scans:** the current artifact already uses actual v2. Broad beneficial use does not require replacing DuckDB's SQL optimizer with an opaque reimplementation or inventing a same-snapshot callback SQL connection/IDB-seeding bridge.

The coordinator still needs to choose legacy fallback versus an explicitly versioned planned-result/metric/budget contract. Native `rounds`, `derived_facts`, and `work` cannot honestly be filled with zeros or inferred from unrelated SQL profiles.

## 4. Benchmark acceptance advice

The proposal already requires full-output oracles, matched setup/output, explicit routes, failures/atomicity, cardinality/selectivity/skew/fanout/recursion strata, all raw outcomes, and terminal outer/child status evidence. Keep those requirements; add the precise endpoint labels in the companion addendum.

Public source admits **512 retained history rows / 256 commits**. The supplied **320-input-fact/10-commit** evidence is a measured bounded stratum, not proof of capacity or scale. Source inspection also finds a larger native-carrier guard, but that is **not** permission to bypass the public cap or call native-only/raw SQL experiments public full-path scaling. Wide output is not input-cardinality scaling. Fractions/depths in the matrix must be realized and reported as actual integer fixture counts within all guards.

Accept only after all predeclared semantic fixtures and selected timing strata have terminal outcomes, actual full typed comparisons succeed where required, fallback reasons are retained, and a scoped paired analysis reaches its declared precision/regression boundary. Include setup, snapshot, staging and complete owned output equally. Retain slower/failed/timed-out/guard-exceeded strata. Require actual child **and** outer exits; an outer exit 0 or printed marker is insufficient. Profiling and latency samples must remain separate. No universal SLO, equivalence, native-only causation, or production claim follows from this packet.

## 5. Receipt, copyright, and sensitive-content QA

- Receipt JSON parses; pinned source URLs use the declared exact source commit. Official documentation receipts explicitly identify dated `duckdb-web main`, not the runtime pin. Paper/blog hashes are explicitly **tool-extraction**, not raw publisher PDF/HTML, hashes.
- All original excerpt hashes and local/header anchors were independently checked. Only the two missing-support pinned files were refetched; their complete returned bytes match original SHA-256 and computed/returned Git blob SHA-1. No claim is made that every external full-source checksum or live URL was independently refetched/recomputed.
- Links identify primary DuckDB sources/documentation and author/publisher research. No general web search or secondary-source substitution was needed. URL syntax/host audit is distinct from an HTTP reachability crawl.
- Documentation/paper/blog exact excerpts are short; the largest original `bounded_exact_excerpt` is **14 whitespace-separated words**, below the 25-word quotation ceiling. Source-code excerpts are bounded upstream MIT material, not a full third-party cache. This review adds paraphrase/citations and two small licensed code excerpts, not full sources. `LICENSE.duckdb-v2` preserves the upstream copyright/permission notice alongside them; its bytes match the immutable export.
- The frozen packet and this output received targeted token/private-key/platform-transcript scans plus manual review. This is a bounded sanitation check, not a guarantee that any automatic detector can prove absence of secrets. No credentials, sensitive raw logs, unrelated personal data, hidden platform text, or private reasoning were intentionally retained.

## 6. Actual operations and limits

The first cloud-local skill-reference read returned shell exit **1** because the prescribed path is absent. Catalog repo-work/durable-work and QA skills were read instead; no installation/loading propagation is claimed. One combined public-source hashing command was rejected **before process creation** for an overlong argument; separate per-source standard-library checks then both returned **0**. It had no child exit to invent. Operational details are in `progress.jsonl` and `source-receipt-qa.json`.

All research retrievals are terminal; pending call/session/approval: **none**. The source-only checker exit and closure manifest are recorded separately. All application/runtime/performance acceptance remains **UNRUN**. There were no remote writes by this reviewer, so local research is not represented as a confirmed durable save.

**Next gate:** the coordinator preserves the research/addendum through its existing durable workflow, selects and records a bounded goal-3 contract, and only then starts authorized implementation and the proposed acceptance work.
