# Actual DuckDB C API v2: performance and dataflow investigation

Research date: 2026-10-30. Selected target: DuckDB **v2.0.0**, commit **d54cbbe3df17e8e5ce68312f483b4155836112aa**. This memo implements the user's latest architecture pivot, not the superseded stable-API preference. It is research and isolated direct-client diagnostics, **not a typed engine implementation, extension benchmark, or production-readiness certification**.

## Conclusions to carry into implementation

1. Use actual `duckdb_extension_v2.h` and an exact-version unstable artifact, retaining the pure C++ engine behind a thin adapter. The old stable-v1.2 artifact remains an unchanged control. `td_query_v2` is a SQL-feature name, not the DuckDB ABI generation.
2. The first credible performance opportunity is avoiding v1's unconditional input flattening and repeated program parsing. Neither is an automatic win: measure API-only, encoded-reader and parse-cache changes separately.
3. Keep narrow `uint32_t` tuple IDs. The API pivot does not justify replacing every tuple cell with a variant, persistent global dictionary ID or DuckDB physical dictionary index.
4. Bind data must own immutable syntax/constants; execution state must own mutable interning, snapshots, relation rows/indexes, deltas and counters. Current parsed constant IDs cannot be reused across independently populated dictionaries.
5. Table functions offer useful projection/filter/scheduling hooks, but the pinned filter-expression API has a documented strict/inclusive range ambiguity. Decline ambiguous predicates and preserve residual SQL filters. Wrong partition/order metadata is a correctness error.
6. Managed collections demonstrably spill and scan correctly in an isolated probe; they do **not** spill or account for private C++ hash tables. Their zero-copy scan and replacement-scan prepared-plan borrows require explicit owner lifetimes.
7. A new robustness probe found that **startup-only temporary quota configuration was not enforced in the tested direct-v2 instance path**. Reapplying the identical quota to the running instance produced the expected precise OOM error. Preserve the failed control; do not call the startup configuration a hard disk bound.

## 1. Exact API and artifact boundary

Official documentation explicitly calls C API v2 unstable and requires a choice between the v1 and v2 extension headers. The same page's “stable version 2.0.0” refers to the DuckDB release, not stabilization of every new v2 symbol. There is no verified stabilization deadline. [Official C API overview](https://duckdb.org/docs/2.0/clients/c/overview).

The pinned extension header defines header generation 2, defaults its family version to 2.0.0, refuses a mixed-generation include, and requires `DUCKDB_V2_API_ALLOW_UNSTABLE`. The generated entrypoint is `temporal_datalog_init_c_api_v2`, receiving the new extension/context/error interface. The exact header contains 620 function-pointer slots, not a stable prefix promise. Its family-version negotiation does not replace the unstable artifact's exact-host metadata guard. [Generated v2 extension header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h).

Pin source revision, both generated headers, host library, compiler/flags, platform metadata and footer generator together. Use the supported unstable build path or a verified equivalent; never relabel this as stable `C_STRUCT/v1.2.0` to make loading succeed. Preserve a separately identified legacy artifact if old hosts remain a requirement. The API versioning policy distinguishes stable-prefix forward loading from exact-release unstable loading. [Versioning policy](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/VERSIONING.md).

Verified local controls:

| Item | Identity |
| --- | --- |
| Installed runtime | `PRAGMA version`: v2.0.0 / d54cbbe3df / Cyanoptera |
| `duckdb_v2.h` Git blob | `c36fe3ac3edd536aba8e79f6d7d9a81ed834c5e4` |
| Same header SHA-256 | `73026a28e5b55952afb6e2e9ce80fd4f76614afedce329da895ccaf85a4a8be6` |
| `duckdb_extension_v2.h` Git blob | `b77dc115c1013e8f4db54f372cfd53d3148455ce` |
| Existing runtime `_duckdb.abi3.so` SHA-256 | `e7cda112749d860a36cb1524ff465cefecdb0acc5c4e2ff4510ecc1b6f6c061a` |
| Unmodified v1.2 extension SHA-256 | `62c9f24e3f8951771ff0f7ceae7dd255843885b203c818bb53e3c232baa45662` |

The adjacent source audit verifies 27 source files by both Git blob identity and SHA-256, all 218 frozen manifest entries, and byte identity of four inspected original source files against that frozen baseline. No original/baseline source was edited.

## 2. Present dataflow and what the pivot can actually improve

Read-only inspection of the current project found this path:

`Python transaction → SQL list(struct_pack(all retained temporal rows)) → scalar callback → per-row Engine construction/parse → temporal validation/filter → interning → bounded native fixpoint → sort/decode → nested string output → Python fetch`.

Concrete touchpoints:

| Current location | Cost or adaptation boundary |
| --- | --- |
| `storage/store.py:34–46,242–257` | Materializes the complete history into one LIST; query parameters are prepared/executed each request |
| `engine/src/temporal_datalog.cpp:17–28,40–65` | Assumes flat row indexing for all nested fields; copies every admitted text field into `std::string` |
| Same file `:51` and `temporal_core.cpp:107–117` | Constructs and parses a fresh Engine for every scalar row |
| `temporal_core.cpp:61–105,146–155,170–247` | Parsed constants already use execution interner IDs; Relation mixes immutable descriptors and mutable rows/indexes |
| `temporal_datalog.cpp:68–92` | Checks batch output caps and materializes nested output/string heaps; emission cost can dominate tiny queries |

This is not automatically an input-streaming SQL operator. A table function producing rows does not by itself consume an arbitrary upstream SQL relation. Initial v2 adoption can preserve the existing scalar SQL contract; a later measured relational interface can use host-owned staging/collections. Do not promise a new physical optimizer from table-function callbacks. The released surface lacks general custom logical/physical-operator hooks; do not cross into private C++ ABI to fill that gap silently.

Important semantic constraint: current `add_triple` validates **all** supplied rows and intervals, increments the full-history input-row counter, then filters active rows. Dropping inactive rows early would hide malformed inactive facts and change resource acceptance for the general scalar API. The store's 512-row admission bound also means a new SQL pushdown route may cost more than it saves today. Preserve legacy behavior; prove any trusted-persisted fast path separately.

The previously selected typed domain/STRUCT/storage contract stays unchanged: disjoint string/bool/int64/finite-float tags, zero normalization, exact integer transport, full historical migration and legacy strings. V2's richer UNION/vector support is not a reason to erase explicit tags at the Python/JSON boundary. See the independently preserved [typed performance study](../performance.md) and [semantic follow-up](semantics.md).

## 3. Safe parse preparation and state ownership

V2 resolve-types runs before signature-added casts; bind runs after them. Init runs once for each worker executing that expression and can own mutable local state. Constant argument inspection produces an owned value; nonconstant arguments require a carefully distinguished fallback, not swallowing arbitrary bind/OOM errors. [Scalar lifecycle specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/scalar.yaml), [shared function argument specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/function.yaml).

The implementation shares bind-data ownership when a plan is copied; the caller does not receive a deep-copy callback for each copy. It also passes encoded input into `CV2ScalarExec` without the v1 scalar wrapper's `input.Flatten()`. Therefore copying the existing Engine into bind data, or mechanically renaming its raw-vector reader, is incorrect. [V2 scalar implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_scalar.cpp), [v1 flattening control](https://github.com/duckdb/duckdb/blob/v1.5.6/src/main/capi/scalar_function-c.cpp).

Recommended future separation, not implemented here:

| Lifetime | May contain | Must not contain |
| --- | --- | --- |
| Extension/user data | Immutable grammar/contract version and fixed policy | Mutable query state or unbounded global cache |
| Bind data | Owned program bytes, immutable relation descriptors/rules, normalized typed constant pool, complete cache identity | Borrowed VARCHAR pointers, current active facts, execution dictionary IDs, snapshot-dependent answers |
| Worker init data | Bounded scratch; optionally one immutable-program cache entry for dynamic programs | Shared mutable Engine or counters carried between requests |
| Each scalar row / execution | Fresh interner ID mapping, rows, seen sets, lazy indexes, deltas, snapshot coordinates, budgets, run flag, result buffers | Mutations to bind data or another row's working state |

A compiled `Term` should name a plan-owned constant-pool index; execution then remaps/interns it into its own ID domain. Relation descriptors must be separated from `Relation.rows/seen/indexes/delta_begin`. A shared immutable dictionary prefix is another possible design, but introduces ownership/look-up complexity; benchmark before adopting it. Never compare plan equality by a short hash alone or assume assigned symbol ordinals are semantic order.

Keep special NULL handling and fallibility; choose byte-preserving collation handling deliberately. A function may be consistent only while its result depends entirely on explicit inputs. If it later reads hidden mutable store state, its declared stability must change. Property declarations can affect constant folding and error behavior, not merely scheduling. [Function properties](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/properties.yaml).

A safe cache experiment needs literal, parameter and row-varying programs; alternating programs; two call sites; changed snapshot/limits; copied/rebound prepared plans; concurrent workers; and failure cleanup. The current optional constant-probe/error-slot hazards are detailed in `semantics.md`. Runtime-only parse remains an honest control until those phases are proven.

## 4. Encoded vector reader: practical rules

Use a small API-neutral reader retaining **representation kind plus view**, not a raw pointer-only wrapper:

- FLAT: physical index = logical index, `sel == NULL`.
- CONSTANT: physical index = **0**, regardless of logical count.
- DICTIONARY: physical index = `sel[logical]`.
- Check validity at that **physical** index; NULL pointer means all valid.
- OTHER includes SEQUENCE/FSST/SHREDDED: explicitly flatten or take a documented bridge, then reacquire the view. Generic per-cell `vector_get_value` allocates an owned value and is a diagnostic/fallback, not the desired hot loop.

Views and nested children are borrowed. Reading a DICTIONARY view can flatten its underlying child in place, invalidating older aliased pointers. Refresh views after resize, flatten, reference, scan advancement or other representation mutation. Nested LIST offsets name child logical positions; apply each child's own encoding/validity, not one selection indiscriminately through every level. [Vector specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml), [view implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp).

**Large CONSTANT hazard:** the pinned implementation exposes `ConstantVector::ZeroSelectionVector()->data()` with `view.count = vec->size()`. Core's shared zero array has only `STANDARD_VECTOR_SIZE` entries; its separate count-aware overload can allocate a larger selection, but v2 does not call it. A nested child may have far more logical rows. Mapping CONSTANT directly to zero avoids indexing beyond that shared array. [Constant-vector declaration](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/vector/constant_vector.hpp), [count-aware core overload](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/constant_vector.cpp).

The local probe constructs a LIST with **8,193 CONSTANT children**, checks every value and NULL via physical index zero, and independently reads the last child with bounds-checked `vector_get_value`. It deliberately inspects only `sel[0]`, never attempting an out-of-bounds read. This verifies the safe reader strategy, not the safety of indexing every reported selection entry.

For output, write exact logical payload types and canonical active-child validity. `vector_set_value` is not strict tagged-value validation: it can cast. Use `vector_set_null` for nullable nested STRUCT/ARRAY parents so child NULL invariants hold. VARCHAR uses v2's 16-byte `bytes` layout with short inline data, not the unrelated `str` pointer/length parameter wrapper. Borrowed vector references avoid a copy only if backing storage outlives every downstream read; use owned chunk copy otherwise. The pinned v2 header has no `duckdb_v2_vector_slice` or `duckdb_v2_vector_copy_sel` function. Do not quietly call v1's slicing API from the v2 extension.

## 5. Relational interface, pushdown and parallel scheduling

Projection pruning, cardinality hints, typed filters and batch-wise output can make a future relational interface substantially more composable than a nested scalar result. Initial candidates should be separately named/explicitly versioned; retain scalar compatibility, caps and deterministic output order.

The table-function interface has global/local init, max-thread limits, output chunks, filter/projection callbacks, progress, batch claiming and partition/order metadata. Filter callbacks can run more than once; accepted predicates are removed from the residual plan. Map filter-expression column indexes through `filter_pushdown_get_column_index`, and projected columns through the init mapping. A wrong interpretation can silently return incorrect results. [Table-function specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/table.yaml).

**Range pushdown is not safe by default on this target.** Official issue #25391 reports strict and inclusive paired bounds exposed as the same `COMPARE_BETWEEN` form. The October 18 maintainer response deferred robust expression repair to 2.1; this is not evidence of a delivered fix or stabilization date. Initially decline BETWEEN-derived/ambiguous filters. Half-open valid/recorded intervals cannot be approximated by inclusive ranges. Exact explicit as-of parameters are a safer candidate than accepting an ambiguous optimizer predicate. [Issue #25391](https://github.com/duckdb/duckdb/issues/25391).

For each accepted filter, prove SQL NULL, collation, tag/type, int64 and finite-float behavior; decline all unsupported forms and leave them to SQL. Optimizer-time filter recording must become immutable before parallel execution, with a repeated-callback/copy policy. Limit first experiments to exact whitelisted leaves after a pinned reproduction; do not claim a general Datalog rewrite engine.

Keep `max_threads=1` until work can be divided without violating fixpoint dependencies. Independent scans/query contexts or proven graph partitions can be parallel; arbitrary concurrent mutation of the current global `seen`/interner/delta state is not safe. Batch claiming should reserve work quickly, with expensive work outside the critical callback. Report no partitioning until a real invariant exists. `SINGLE_VALUE_PARTITIONS` means exactly one distinct requested group-key value per partition, not merely hash partitioning. Correct order/batch metadata matters for ordered INSERT/COPY consumers. [Pinned table-function implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_table.cpp).

Bound callback work. Engine result stepping and connection interruption do not prove a long native callback observes cancellation. No released context interruption-poll or generic async table-callback wait protocol was found. Do not run nested SQL through a callback context or invent a second-connection snapshot equivalent. These limitations remain future resource/cancellation work, not completed by changing ABI.

## 6. Managed collections and replacement-scan lifetime

Collections are a promising bridge for chunked facts/derived rows, SQL joins and output streaming: construction uses the engine BufferManager, append validates exact schema and copies input, and worker scans may return zero-copy views. Appends are not concurrently safe with scans; use worker-local collections and combine where appropriate. [Collection implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_column_data_collection.cpp).

Scanned buffers are pinned by the **worker**, not merely by the output chunk handle. They expire on that worker's next scan/destruction or collection release. Deep-copy before advancing if data must survive. Clear/reset invalidate associated state; clear can retain buffers while reset releases them. Collection spill covers engine-managed chunk pages, not private interner allocations, hash/index structures or a recursive working set stored in STL containers. [Collection contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/data_chunk/column_data_collection.yaml).

A replacement scan can claim an unresolved name as a function, collection or SELECT subquery; this is an integration option, not free ingestion. Collection claims **borrow** storage. A prepared statement can retain that borrow indefinitely and reuse it without reconsulting the callback, even after all prior results are destroyed. Destroy all such statements before clearing/resetting/freeing the collection. Registrations cannot be unregistered before their connection/instance scope ends. [Replacement-scan specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/replacement_scan.yaml).

Recommended design if adopted: explicit immutable snapshot/generation owners; scoped statement/result handles retaining the owner; bounded registry entries; no silent repointing of a prepared name to another collection generation. Host-side transaction orchestration must capture logical position and data coherently before execution. Include materialization, copies, planning and teardown in its benchmark. A private C++ dictionary ID is not a DuckDB column's physical dictionary index; encoding domain identity must be explicit across chunks/operators.

## 7. Actual isolated probe results and the quota gap

All probes use the **existing** pinned wheel through direct ctypes calls, no extension callbacks, downloads, production evaluator, schema or migration. Files are restricted to this probe directory; CPU count1, managed-memory32MB smoke/8MB stress, autoextensions disabled. Timings include Python/ctypes loops and are not Datalog speed measurements.

| Probe | Actual result |
| --- | --- |
| Smoke: vectors, ownership, 6,144 collection rows | PASS, exit0; alias shares data; deep copy survives owner destruction; CONSTANT validity uses physical0; OTHER sequence rejects/zeros view then explicit flatten preserves all values |
| Large nested constant | PASS, 8,193 children; value/NULL checks and independent last-cell read; no unsafe selection access |
| Exact-schema negative control | PASS; INTEGER chunk rejected from BIGINT collection with code2001 and precise type-mismatch text; row count remains0 before good appends |
| Managed spill and complete scan | PASS, exit0; 2,097,152 BIGINT values plus exact checksum; **5,734,400 bytes observed spill files** in the final run; input mutation after append does not change stored data |
| Scan copy lifetime | PASS; copied first chunk survives further scans, worker/shared-state and collection destruction |
| Startup-only 1MB temporary quota | **FAIL, exit1**: config reads976.5KiB quota and7.6MiB memory; bounded16MiB broad-range payload appends fully and spill files reach10,223,616 bytes |
| Same quota reapplied live before allocation | PASS, exit0: precise code3002/OOM names `max_temp_directory_size`; error after495 complete2048-row batches, 786,432 bytes observed spill; failed collection is destroyed without exposing partial rows |
| Cleanup/source audit | PASS; no remaining instances or spill bytes in quota runs; 27 source identities,218 frozen entries,4 original controls and original binary identity verified |

The quota difference is reproducible with identical payload and settings except the live reapplication. Source inspection is consistent with an initialization gap: startup setting without a running database stores `config.options.maximum_swap_space`; the live setter invokes `BufferManager.SetSwapLimit`, while the inspected standard-buffer-manager constructor initializes only its temporary path. This is an **inference**, not a complete upstream root-cause proof across all entrypoints. It was demonstrated only on direct-v2 instance creation without an attached user database. [Setting implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/settings/custom_settings.cpp), [buffer manager](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/storage/standard_buffer_manager.cpp), [v2 instance creation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_instance.cpp).

Do not rely on reported startup configuration alone as enforcement. Reapply the intended bound through the running config and keep an actual spill/quota control until resolved. This tightens the same bound; it is not a bypass. Independently validate the Python-store creation path before making a broader claim. After append OOM, no transactional rollback guarantee was assumed: abandon/destroy the operation and do not expose possibly partial collection contents. Initial sequential/random failed attempts are retained, not rewritten as passes.

**Not exercised here:** DICTIONARY callbacks, scalar bind/init caches, custom table functions, replacement scans, extension loading, sanitizer coverage of a new adapter, complete private-memory accounting, migration or typed end-to-end conformance. The root owns isolated extension builds and full comparisons.

## 8. Minimally confounded performance experiments

Use the same DuckDB2.0.0 host, inputs, compiler and unchanged native algorithm first. Preserve the old binary. Proposed arms:

| Arm | One intended change | Answer/counter invariant |
| --- | --- | --- |
| A | Existing stable-v1.2 adapter on2.0.0 | Control |
| B | Actual-v2 adapter, conservatively flatten input, same core | Full legacy shape/order/diagnostics/counters |
| C | B plus encoded views and exact fallbacks | Same asB across FLAT/CONSTANT/DICTIONARY/OTHER and nested masks |
| D | C plus immutable compiled program reuse | Same asC; fresh per-execution dictionary/state |
| E | Separately measured relational/collection interface | Same mathematical answers; explicitly account any API/counter/output-order differences rather than hiding them |
| T | Typed-value implementation | Typed oracle/SQL conformance; compare equivalent all-string workloads separately from intentionally changed mixed-type semantics |

Measure both end-to-end and phase costs: prepare/bind, list/STRUCT aggregation, decode/admission, parse, interning, fixpoint, sort, typed/string output allocation, fetch/serialization and destruction. Count callback/API calls, flattened vectors/bytes, parsed-program instances, admitted/all-history rows, values/bytes emitted and native work/round counters. A no-output count query cannot substitute for fetching full results.

Dataset axes: 0/1/512/100,000 history rows as the relevant interface permits; low/high active fraction; repeated versus unique strings; long/short values; all-string/mixed tags; 1/8 output arity; empty/tiny/large answers; recursive path, star, cyclic and join-heavy graphs. Program modes: literal, parameter, repeated row-varying, alternating, every-row unique. Batch1/16/2048, nested children above2048, selective SQL predicates, one/multiple workers and prepared-statement reuse/rebinding must be explicit.

Use warmups and repeated **independent** processes, rotate candidate order, record shared-host/affinity/configuration and report distributions rather than one best run. Validate complete ordered/tagged outputs and rejection outcomes outside timing, without moving one candidate's key construction/copy work outside its timed region. Run correctness/fault/sanitizer campaigns separately from speed sampling. Negative or inconclusive results remain evidence.

Collect wall/CPU, peak RSS, managed buffer/spill size and allocation telemetry where actually available. V2 query metrics require completion and can omit operators/metrics; they are not a census of private native memory. Drain lazy results before timing completion. [Query-metrics API](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/profiling/query_metrics.yaml).

Acceptance gate: no semantic/cap/lifetime regression; stable source/provenance; measured benefit in the intended workloads without unacceptable regressions; explicit fallback/defer policy for unresolved API defects. “Use as much v2 as beneficial” does not require adding every callback now. Adopt encoded scalar/state mechanisms first, then broaden relational/managed-storage integration only where evidence supports it. Items2–10 and full production hardening remain ordered future work.

## Historical alternative

The brief stable-API research is preserved at `../stable-api-followup/performance.md`: stable v1.5.6 appends useful bind/state/vector functions while retaining v1's stable-prefix model. It is no longer the selected architecture and does not satisfy a request for actual C API v2. No existing stable binary/results were replaced.

## Reproduction and evidence

See `probes/PERFORMANCE-README.md`, raw JSON/stderr, `source-provenance.json`, `read-only-baseline-audit.json` and `PERFORMANCE-SHA256SUMS`. All generated probes are independent diagnostic clients. No migration adapter, typed v2 engine, production callbacks, Page/Git/Codex or original/frozen-source writes were performed by this worker.
