# Actual DuckDB C API v2: lifecycle, ownership and triple-store design

**Research checkpoint — 30 October 2026. Selected direction: unstable DuckDB C API v2, pinned to DuckDB 2.0.0.** This supersedes the intervening “newer stable API” direction. It is an actionable design investigation, not an implementation, throughput result, production-readiness certification or prediction of stabilization. The typed Datalog feature name **td_query_v2** is a separate version axis from DuckDB **C API v2**.

## Executive decisions

1. Adopt the real v2 extension interface, not a v1 extension with a v2-looking SQL name. Pin the release commit, generated headers, build settings, extension metadata, platform and binary hash. Fail closed on incompatible hosts.
2. Preserve the established typed semantic contract and compact uint32 tuple kernel. A more capable transport API does not justify numeric coercion, wider tuples, unbounded allocations or silently changing legacy SQL behavior.
3. Use v2 scalar lifecycle/properties and typed vector access now. Keep mutation execution-local; optional immutable parse reuse must not retain invocation-local intern IDs or borrowed callback handles.
4. Exploit managed collections, source table functions, projection/filter interfaces and SQL compilation for later SQL-first work where measured. None automatically makes the current hash engine spillable, makes an arbitrary recursive filter sound, or permits reentrant SQL through a callback context.
5. Treat borrowed data lifetimes and cancellation as explicit contracts. A collection scan's chunk object can survive while its underlying data has already expired; a bounded engine task can still call an unbounded extension callback.
6. Gate acceptance on both declared semantics and pinned implementation behavior. The inspected v2 sources contain several documentation/implementation discrepancies detailed below.

## 1. Exact versions, ABI and compatibility

Fresh primary-source reads resolve tag v2.0.0 to commit **d54cbbe3df17e8e5ce68312f483b4155836112aa**. DuckDB's documentation explicitly labels C API v2 unstable and distinguishes duckdb_v2.h / duckdb_extension_v2.h from the previous headers. “Latest stable C API version 2.0.0” on the same overview is a release-version statement, not stabilization of the new interface generation. There is no stabilization date commitment in that page. [Release tag](https://api.github.com/repos/duckdb/duckdb/git/ref/tags/v2.0.0), [official overview](https://duckdb.org/docs/2.0/clients/c/overview).

The v2 extension header rejects mixing extension-header generations, requires DUCKDB_V2_API_ALLOW_UNSTABLE, defaults the API-family string to v2.0.0, and generates the export named **temporal_datalog_init_c_api_v2**. Its entrypoint takes an extension handle, borrowed context and live error slot, rather than v1's connection/access arguments. The unstable header says only the major selects the API family; exact-release metadata controls host compatibility. Use the supported unstable build helpers or a byte-verified equivalent, not an invented stable v2 prefix. [Exact generated extension header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension_v2.h).

| Artifact/interface | Host 1.4.3 | Host 1.5.6 | Host 2.0.0 | Contract |
|---|---|---|---|---|
| Existing stable C_STRUCT / v1.2.0 artifact | Existing project evidence covers this | Verify if retained | Existing project evidence covers this | Stable v1 subset; no actual v2 functions |
| New stable v1 artifact using v1.5.6 band | Too old for that required prefix | Candidate alternative | Candidate alternative | Not the selected route |
| Actual v2 C_STRUCT_UNSTABLE artifact pinned to 2.0.0 | Incompatible | Incompatible | Selected exact target | New interface; rebuild/retest for another release |
| Future DuckDB release | — | — | — | No v2 compatibility promise; inspect new headers and rebuild |

The current stable v1 header defaults to API-prefix v1.5.6. API-spec versioning records stable bands rather than equating every DuckDB release with a new prefix. The loader says previously unstable v1 functions were stabilized in 1.5.6; C_STRUCT_UNSTABLE now targets v2. These are alternatives, not a reason to mislabel a v2 build as backward portable. [API versioning](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/VERSIONING.md), [v1 extension header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension.h), [loader](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/extension/extension_load.cpp).

Recommended packaging: one selected v2-backed extension can register both the legacy **td_query** SQL contract and new typed **td_query_v2** contract through v2 builders. Preserving a legacy SQL interface does not mean preserving its former host-version floor. If old hosts must remain supported, ship a separately identified legacy artifact and test it independently; do not silently load a weaker implementation as if it passed typed acceptance. Preserve the build provenance and DuckDB license. The existing metadata formatter only accepts C_STRUCT and requires an intentional, reviewed replacement or extension for unstable metadata.

## 2. Current code implications and unchanged semantic invariant

Read-only inspection of engine/src/temporal_datalog.cpp and temporal_core.cpp found:
- Seven fixed scalar arguments, row-indexed raw vectors, nested LIST/STRUCT readers, a new Engine for each scalar row, and manual nested output allocation.
- Stable API v1.2.0 registration; special NULL handling; no callback SQL or I/O.
- Constants parsed directly into a query-local interner; compact bounded-arity uint32 tuples; native C++ hash/index state.
- The callback copies output strings before its Engine is destroyed. That lifetime guarantee must survive a new string representation.

The semantic invariant remains **D = Str ⊔ Bool ⊔ I64 ⊔ finiteF64 / signed-zero normalization**. Interning must be injective on normalized (tag,payload), so ID equality preserves typed unification in every tuple position. Entity/attribute input identifiers remain strings; a numeric entity literal does not unify with text “1”. No generating arithmetic is added in item 1, so finite active-domain positive-Datalog termination remains unchanged. Legacy embedding s → Str(s) remains injective and schema migration must preserve historical answers under it.

Keep tags 1/2/3/4, strict one-active-payload STRUCT carrier, finite floats/subnormals and zero normalization, full int64, canonical JSON integer/clock strings, UTF-8 byte order and unsupported null/ref/date/timestamp/value families as already selected. DuckDB's API does not define those application semantics. In particular, ordinary SQL comparisons intentionally combination-cast heterogeneous values; raw scalar equality is not a substitute for Datalog equality. Canonical same-schema tagged structs can support strict identity, but their SQL comparison/collation behavior must be verified rather than inferred from heterogeneous literals. [SQL comparison rules](https://duckdb.org/docs/2.0/sql/expressions/comparison_operators), [STRUCT comparison rules](https://duckdb.org/docs/2.0/sql/data_types/struct#comparison-and-ordering).

## 3. Scalar phases: what can safely move out of the hot loop

| Phase | Relevant actual v2 APIs | Safe state / important limit |
|---|---|---|
| Build/register | scalar_function_create, get_signature, set_name, set_property, set_*_callback; extension_register_scalar_function | Builders belong to one database; don't register on another |
| Resolve types | scalar_function_set_resolve_types_callback; function_bind_get_arg_type/value; scalar_function_resolve_types_set_return_type | Before the function signature's parameter casts; cannot install bind data |
| Bind | scalar_function_set_bind_callback; scalar_function_bind_set_bind_data | After parameter casts; immutable owned parsed metadata can be shared |
| Init | scalar_function_set_init_callback; scalar_function_init_set_init_data | Per executing worker/thread, mutable scratch reused across exec batches |
| Execute | scalar_function_set_exec_callback; scalar_function_exec_get_* | Chunk input; borrowed handles scoped to callback; no automatic flatten |

The resolve-types hook can inspect the SQL argument type **before casts introduced by this function's signature**. It cannot recover a source type or precision already intentionally erased by an explicit SQL CAST or earlier expression. Keep Python/JSON validation before preparing/casting. A fixed typed SQL signature remains useful; a resolve-types check is an additional source-boundary policy only if explicitly chosen, not a retroactive promise about erased data. [Scalar lifecycle specification](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/scalar.yaml), [signature specification](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/signature.yaml).

The scalar implementation shares bind data through shared_ptr when a plan is copied; there is no user deep-copy callback for these bind objects. Worker-local init data is separately owned. Keep shared AST immutable and put mutable snapshots, interner, indexes, round/work counters and output state in the per-execution engine/local state. Never retain a borrowed callback context, factory, vector or string view as a cache entry. Destroy/equality callbacks must not unwind or reenter the operated handle. [Scalar implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_func_scalar.cpp), [opaque owner implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb/main/capi_v2/capi_v2_internal.hpp).

**Parse-cache caveat:** the current parser embeds invocation-local constant IDs. A reusable AST must own normalized typed constants and structural variable/relation metadata, then remap constants into each execution's dictionary. Sharing the current Engine/parsed ID arrays would be incorrect, not merely racy.

function_bind_get_arg_value folds a constant and returns an owned value. It fails for column references. Core GetConstant reports non-foldable input as QUERY_BINDER / “must be a constant expression”; unresolved parameters report QUERY_PARAMETER_NOT_RESOLVED. Other folding errors can be genuine failures. There is no public TryGetConstant/foldability query in the inspected v2 surface. Use a separately owned local error slot for optional cache probing; passing the live callback slot would mark the call failed even if code later attempted a runtime fallback. Handle only the recognized nonconstant case as fallback; do not swallow arbitrary binder/OOM errors or prevent parameter-resolution deferral. A simple runtime-only parser is safer than a brittle cache. [Argument inspection API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/function.yaml), [GetConstant implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/function/function.cpp).

Explicit properties:
- **NULL_HANDLING_SPECIAL**: required to reject null typed lists/required fields instead of silently obtaining NULL output.
- **FALLIBILITY_FALLIBLE**: keep this default; claiming infallibility makes reported execution errors internal errors.
- **COLLATION_HANDLING_IGNORE**: recommended for exact-byte logical semantics. Never request PUSH_COMBINABLE, which executes collation transformations on inputs.
- **STABILITY_CONSISTENT** is appropriate only while all logical data/snapshot/limits are explicit inputs and counters deterministic. Hidden database/cache reads require revisiting stability; don't allow constant folding to cache a formerly pure call across changed snapshots. [Function properties](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/properties.yaml).

## 4. Errors and acceptance tests: semantic bind failures are real failures

There are two different error ownership models:

| Boundary | Ownership / rule |
|---|---|
| Ordinary API return | Return code is authoritative. Optional detailed error handle is caller-owned; destroy once. |
| Extension callback | err points to a live borrowed stack-owned error object. Populate code and text on **\*err**; never destroy, replace, save or return ownership of it. |

The bridge maps an error code back to a DuckDB exception class. INPUT_INVALID 2001 maps to InvalidInput even if raised during bind; QUERY_BINDER 5003 maps to Binder. OUT_OF_RANGE 2003 maps separately. Not every declared v2 code maps back: INPUT_PARAMETER_INVALID 2002 has no reverse mapping and falls back to InvalidInput, so it need not survive as 2002 through a callback. Prefer codes with tested round-trips. Set both code and an owned/copied diagnostic text; text alone does not make HasError true. Catch all C++ exceptions at callback boundaries; do not throw across the C ABI. [Error codes](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/common/errors.yaml), [error conversion implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2.cpp).

Proposed project diagnostic contract (design recommendation, not an implemented promise):
- Stable marker such as **TD_E_VALUE_TAG**, **TD_E_VALUE_PAYLOAD**, **TD_E_PROGRAM_SYNTAX**, **TD_E_LIMIT_WORK**, followed by phase=resolve/bind/exec and concise contextual text.
- Marker/code category is stable; DuckDB's outer exception formatting, caret lines and wording are not.
- Do not include raw user program/data in unbounded diagnostics.
- A future rejection test may accept a semantic bind error only with the exact case-specific project marker and intended category. Merely allowing every BinderException creates a false pass. Retain a successful carrier-only SQL control, a successful real-engine control, and counterexamples for incidental SQL binder/type failures.
- If a low-memory error cannot allocate text, propagate the resource error; do not misreport an expected semantic-validation pass. The pinned set_text implementation directly assigns a std::string without WithErrorHandler; this is a source-derived allocation-failure risk, not a reproduced failure. Keep diagnostic writing inside the callback's outer catch boundary, set a nonallocating error code first, and preserve a resource failure if copying text fails.

**Observed source/spec drift:** common.yaml says success clears/replaces the detail slot; WithErrorHandler explicitly leaves a stale slot unchanged on success and reuses existing detail on failure. error.yaml promises NULL set_code/set_text is a successful no-op; capi_v2_error.cpp returns INPUT_INVALID. The safe intersection is fresh NULL owned slots, inspect detail only after a nonzero return, destroy owned detail exactly once, and always use the guaranteed nonnull callback slot. Add pinned regression tests; don't depend on either disputed convenience. [Common specification](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/common/common.yaml), [WithErrorHandler](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb/main/capi_v2/capi_v2_internal.hpp), [error setters](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_error.cpp).

## 5. Vectors: the most immediate correctness hazard

The old v1 scalar bridge calls input.Flatten(). **CV2ScalarExec does not.** Mechanically renaming the current data[row] reader therefore breaks constants/dictionary selections. vector_get_view exposes data, validity, sel and count. For logical row i, compute physical p = sel ? sel[i] : i; read data[p] and validity[p]. A null validity pointer means all valid. CONSTANT has zero selection, not one physical element per logical row. OTHER representations (FSST/SEQUENCE/SHREDDED) need explicit flatten before views. [v1 bridge](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v1/scalar_function-c.cpp), [v2 vector contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/vector/vector.yaml).

Recommended first adapter: explicitly flatten supported nested input boundaries before taking any borrowed views, reproduce existing correctness, then introduce selection-aware leaf loops under targeted tests and measurements. This preserves an optimization path without pretending flatten is free. Even get_view can flatten a dictionary's child in place; previously borrowed alias pointers can become stale. Refresh after flatten/reference/resize/append operations that may change storage. STRUCT child access currently routes through StructVector::GetEntries, which rejects dictionary STRUCT vectors; don't assume arbitrary nested parent selections are transparently navigable. [Vector implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_vector.cpp), [STRUCT implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/common/vector/struct_vector.cpp).

Nested input processing must independently validate:
1. Parent list validity and selected row; list offset and length against the logical child extent using checked arithmetic.
2. Fact STRUCT validity; e/a/clock children, then value STRUCT/tag/selected payload and all inactive NULL fields.
3. Each child vector's own representation/selection; never reuse a parent physical index as an unexamined child physical index.
4. All supplied rows, including invisible ones; temporal filtering must not hide malformed carriers.

For output, vector_set_size reserves logical elements; reacquire views after sizing/reallocation, size list element vectors separately and set all list offset/length pairs. Raw mutable access only supports FLAT/CONSTANT; writable masks are FLAT-only. A NULL STRUCT/ARRAY parent requires NULL descendants; vector_set_null maintains that invariant while changing a parent validity bit alone does not. Inactive scalar payload fields can be nulled individually while the containing TDValue remains valid.

Varchar storage is a transparent 16-byte **duckdb_v2_bytes**, not the old duckdb_string_t helper interface: up to 12 bytes inline; longer values have length, first-four-byte prefix and pointer. Use the vector's borrowed arena and arena_allocate for owned output bytes, then fill the documented layout. Do not return pointers into an Engine dictionary, temporary std::string or callback input whose lifetime ends first. Copy UTF-8, validate the project's NUL-free rule, and honor lengths rather than C terminators. The generic API permits interior NUL in length-delimited views and does not necessarily validate text UTF-8; the application must enforce its stricter contract. Arena handles expire on vector flatten/reallocation/destruction. [Common layouts](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/common/common.yaml), [arena API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/arena/arena.yaml).

vector_get_value is a useful correctness fallback but allocates an owned value per call; vector_set_value may cast. Neither is the intended per-cell hot loop for known four-tag carriers. Likewise vector_cast is not an implementation of strict Datalog equality.

## 6. Owned versus borrowed: collections are not magic zero-copy storage

| Resource | Owner / expiration | Design consequence |
|---|---|---|
| Callback context, context factory/config/filesystem | Borrowed; callback/entrypoint scope | Never retain in bind data or asynchronous work |
| Input/output vector handle, child handle, vector view | Borrowed from chunk; data can invalidate sooner after mutations | Acquire after sizing; no cross-callback raw pointers |
| Vector arena / allocated output bytes | Arena borrowed; bytes arena-owned until storage changes | Copy outgoing strings into correct owner |
| API-created chunk/type/value | Caller-owned unless getter explicitly says borrowed | RAII; error-path destruction; ownership is not a data-pin guarantee |
| Collection append/scan states | Caller-owned; collection reset/clear/combine invalidates states | Enforce explicit lifecycle/barriers |
| Collection scanned data | Worker scan state pins latest scan only | Copy before next scan/destruction if retaining |
| Replacement/statement collection reference | Borrowed collection root | Keep root alive through every plan/result borrowing it |
| Scalar shared bind data | Engine-shared opaque owner | Immutable only; correct semantic equals callback |
| Per-worker init state | Engine-owned opaque owner | Mutable local scratch, not shared snapshots |

ColumnDataCollection buffers are managed by DuckDB and may offload to disk. Appending **copies** the input; complex input vectors may flatten during that copy. Appends require exact schema, no concurrent append and no overlap with scanning. Parallel scanning uses shared scan state plus separate worker states. Per-thread collections may be combined after a barrier; combine consumes/nulls the source. Reset releases memory; clear retains buffers for reuse. Neither is a persistent table, transactionally versioned store, deduplicating relation or automatically spillable hash index. [Collection specification](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/data_chunk/column_data_collection.yaml), [implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_column_data_collection.cpp).

The subtle lifetime is explicit: scan is zero-copy, with data valid only until that worker's next scan or destruction. Keeping the chunk handle alive or calling vector_reference does not by itself extend this worker buffer pin. Deep-copy using data_chunk_copy when retaining across advancement, or retain a provably live unadvanced pin. The reference API aliases exact-type storage; it is not a general external-memory ownership transfer.

Keep uint32 tuple IDs only within a single interner namespace. Combining two workers' ID-only collections without remapping can join unrelated values that happen to share an ID. Use one synchronized execution dictionary or remap local dictionaries into a canonical execution dictionary. Persistent/cache IDs require separate explicit identity/version design; don't treat insertion-order IDs as value order.

Statement-local **statement_add_collection** is attractive: it adds a CTE with copied names and a borrowed collection, avoiding a global name registry. However its exact specification says both “prepared execution can clear/refill between runs” and later “must not clear/reset while any statement/prepared copy is live.” The implementation stores a borrowed ColumnDataRef and copies that raw borrow into copied ASTs; it does not solve this contractual contradiction. Until resolved by a pinned probe/upstream clarification, use the conservative lifetime: immutable collection for the life of statements, prepared plans and results; destroy those before clearing/refilling. [Statement binding API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/sql_statement/sql_statement.yaml), [implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_statement.cpp), [ColumnDataRef copy](https://github.com/duckdb/duckdb/blob/v2.0.0/src/parser/tableref/column_data_ref.cpp).

## 7. SQL-first planning: real leverage, but not arbitrary operator injection

### Source table functions

v2 provides bind, global-init, local-init, chunk exec, projection, filters, cardinality, partitioning and batch metadata. Bind declares concrete result columns; table/pragma arguments are constants. Exec is a row source, not an arbitrary relational-input stream interface. Global state needs synchronization; local state is per worker. Max threads defaults to one and setting a larger maximum is a scheduling hint, not a proof the engine will parallelize a recursive kernel. [Table API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/table.yaml), [table bridge](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_func_table.cpp).

Projection pushdown changes output column layout: use requested-column mappings, not declared indices as output positions. count(*) can still request row production through the first declared column. Filter pushdown may run multiple times. Its expression nodes are borrowed only for the callback; compile/copy accepted descriptors. Map bound-column references through the supplied column mapping.

**Accepting a filter removes it from DuckDB's residual plan.** Accept only when implementing exact SQL boolean/NULL/type/collation semantics. Unknown nodes/functions/casts/collations stay unaccepted. The expression API deliberately models a subset; INVALID is a reason to decline, not guess. [Expression API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/expression/expression.yaml).

Do not push arbitrary answer filters into recursive base data. Counterexample: edges a→b and b→c, recursive reachability, final destination=c. Removing a→b because its destination is not c loses the valid answer a→c. Base-scan selections or a separately proven magic-set rewrite can be sound; endpoint pushdown into closure is not automatic.

Partition/cardinality/order metadata are promises, not optimism. A false SINGLE_VALUE_PARTITIONS claim can change aggregate execution incorrectly. Batch indices must satisfy documented monotonicity/uniqueness rules. Allowing NO_ORDER can improve parallel production, but the public deterministic tuple ordering still requires the semantic comparator/final ordering step.

### Replacement scans and SQL compilation

Replacement scans intercept unresolved table names only. They can claim a table function with constant arguments, a borrowed collection, or one SELECT subquery; they do not install a general optimizer rewrite. Connection-scoped registration is consulted before instance scans and dies with the connection; extension/instance registration lives to instance teardown. **Registered scans cannot be unregistered.** Prefer a narrow namespace and connection scope over global interception of arbitrary names/files. The returned name object is owned; callback context/info and borrowed expression data are not. [Replacement scan API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/replacement_scan.yaml), [implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_replacement_scan.cpp).

A SELECT claim lets a compiler hand relational work back to DuckDB's planner without running SQL in the callback. Generate only compiler-owned, validated SQL/identifiers; parameterize values and preserve typed tags/cuts. A collection claim retains a raw borrow in a prepared plan; removing a registry name does not release old prepared borrows.

There is **no public context_execute or context_get_connection** in the inspected v2 API. A misleading extension-header comment says the context can “run queries”; actual context declarations expose only factory, config, filesystem and logging. Don't cast opaque handles to internal ClientContext, reenter an active connection, or create a second connection while claiming it shares the original transaction snapshot. For item 3, choose host-side SQL statement orchestration outside callbacks or binder-time relational compilation; keep native recursion as an explicitly bounded operator/source where beneficial. [Context/factory API](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/factory/factory.yaml).

## 8. Transactions, streaming and cancellation

Factories are scoped: an instance factory knows built-in types/casts and default settings, not catalog types. Connection factories use the active transaction or open a transaction for catalog lookup. Callback factories operate inside the transaction already supplied; they don't grant a public query-execution handle.

v2 statement_execute and prepared_statement_execute produce lazy results. DDL/DML must be drained or stepped to FINISHED to complete; merely obtaining an execute handle is not success. Destroying an undrained result aborts the statement: autocommit writes roll back; abandoning a potentially writing statement inside an explicit transaction invalidates it. Results are single-consumer. Only one running statement per connection; use separate connections for real concurrent queries, with deliberate snapshot semantics. Fetched result chunks remain owned/valid after result destruction; this is distinct from the collection worker-pin rule. [Streaming result contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/query_result/query_result.yaml), [result state machine](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_result.cpp).

result_step returns WAITING/CHUNK/FINISHED/CANCELLED, with execution errors on the error channel. Don't busy-spin WAITING; wait or yield. connection_interrupt is safe cross-thread for that connection, not another connection; result_fetch_chunk expresses cancellation as ERROR_RUNTIME_INTERRUPT. The implementation distinguishes consumer cancellation using its cancel-request counter from engine timeouts that also use interrupt exceptions; preserve both outcomes in tests. [Connection controls](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/connection/connection.yaml), [implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_connection.cpp).

**Limitation:** one “bounded task” does not preempt an extension's long inner C++ join loop. No public callback-context interruption-poll method was found. Keep the existing work/round/fact caps; item 6 must bound callback work and measure cancellation latency. A host-owned cancellation token requires a sound ownership/association design; it cannot be conjured from a borrowed context pointer. Never advertise immediate cancellation solely because connection_interrupt exists.

Streaming may publish chunks before a later error. Preserve the current all-or-error application boundary by buffering the complete bounded answer until terminal success, or by an explicitly changed stream protocol whose consumers discard tentative rows on failure. SQL rollback cannot retract rows already published outside the database. Private collections/hash maps also do not automatically roll back with a SQL transaction.

## 9. Reuse, incremental inserts and filesystem scope

For item 8, distinguish immutable parse reuse, physical plan reuse, snapshot-result reuse and incremental materialization. They have different validity keys and invalidation rules.

The actual prepared-statement API reports whether a plan is reused. **A table scan or unresolved parameter type forces rebinding on every execution** in the inspected implementation. Use prepared_statement_reuses_plan, or require_cacheable=true at creation, and report the result. Do not describe collection-backed SQL-first joins as cached physical plans without evidence. Copies can still save reparsing, but rebinding and optimizer work remain real costs. [Prepared statements](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/prepared_statement/prepared_statement.yaml), [reuse predicate](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_prepared_statement.cpp).

A safe result/materialization key includes database/store identity, schema/semantic version, normalized program, exact valid_at/known_at, admitted input identity or committed snapshot/version, and relevant configuration. Never let a future insertion revise an older known_at answer. Proving insert-only monotonic reuse still requires temporal-cut/receipt/tombstone handling; generic “positive Datalog” does not mean every historical point snapshot grows under all store operations. Incremental state must be atomically published only after successful commit and must remain evictable/bounded.

v2 filesystem access routes through DuckDB's configured filesystems/settings/secrets, a benefit for intentional import/export/checkpoint work. Context-derived handles are callback-scoped. File flags are separate enum choices, not OR-able bits; contradictory options are not safely validated in every release build. CREATE_NEW means truncate-if-existing, not fail-if-existing; exclusive creation needs the documented combination. Cursor reads/writes can be partial; *_at uses explicit offsets and concurrency requires PARALLEL_ACCESS. Raw file writes are not database transactions or receipt durability. Do not introduce callback filesystem I/O in typed item 1 solely to maximize API usage. [Filesystem specification](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/filesystem/file_system.yaml), [filesystem implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_file_system.cpp).

Managed collections cover their own buffers, not std::unordered_map/std::vector allocations, intern strings, ASTs, indices, SQL list materialization, wrapper objects or all client-side output. memory_limit is not a complete process-RSS bound. Clear-for-reuse can retain a high-water allocation. Charge numeric dictionary entries and every intermediate, not only source string bytes; item 6 still needs comprehensive accounting/admission and fault testing.

## 10. Suggested migration and measurement ratchet

**Now / item 1**
1. Build a separately pinned actual-v2 lab artifact and prove real LOAD/export dispatch; reject incompatible metadata/host tests.
2. Register legacy and typed scalar contracts through v2; add special NULL handling, fallibility and exact collation policy.
3. Introduce a narrow RAII/error adapter and conservative nested-vector normalization. Keep the typed interner, finite float checks and existing caps.
4. Prove all typed/native/browser/storage/migration answers and legacy behavior. Only then optionally enable bind-time immutable parse reuse with runtime fallback.
5. Record both raw outputs and complete invocation/fetch timings; do not use a missing-engine test as a feature pass.

**Before item 3 (SQL-first planner/selective native recursion)**
Benchmark SQL base selection/nonrecursive rule joins, then a selective native recursive kernel. Evaluate statement-local immutable collections versus a scoped table function/subquery compiler. Retain a “same answers, same limits” control. Prove every accepted filter and partition hint separately.

**Before item 6 (cancellation/full resource accounting)**
Measure cancellation inside pathological scalar and table callbacks, not just SQL scan cancellation. Establish allocation/byte accounting and output atomicity across errors; collection spill is only one component.

**Before item 8 (snapshot-safe reuse/incremental inserts)**
Separate parsed AST reuse from actual prepared-plan reuse; test interleaved historical cuts and prepared borrows; publish only commit-safe, versioned, bounded materializations.

### Benchmark plan

Use the old stable-v1 artifact on the same pinned DuckDB 2.0 runtime as a control where possible, plus v2 variants that differ by one optimization. Separate cold parse/bind/first execution from warm repeated execution. Test constants versus row-varying programs, one call versus 2051+ scalar rows, empty/small/100000 facts, repeated versus unique strings, 12/13/16384-byte strings, all four types, selective/nonselective cuts, recursive chain/tree/cycle/dense/skewed joins and negative-output cases.

Measure end-to-end: SQL list construction/scan, bind/parse, flatten, validation/interning, collection append, native/SQL join, dedup/fixpoint, sorting/encoding, result drain/fetch and migration/open. Report p50/p95, wall/CPU, rows/bytes, peak RSS, DuckDB buffer/spill metrics and query counters. Profiling snapshots require query completion, may omit metrics/operators and are not a full allocation census; disable printed profile output while collecting. [v2 query metrics](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/profiling/query_metrics.yaml).

Run low-memory/temp-disk limits and fault cases separately from speed samples. Force genuinely large collection data before claiming spill; a zero-spill smoke test proves no spilling. Compare managed staging copy costs against direct kernel admission and measure pointer/function-call overhead rather than assuming v2 is intrinsically faster. Reject improvements that violate declared resource/error/order/snapshot contracts.

## 11. Adversarial acceptance additions

These are **required future tests, not passed feature claims**:

- Genuine v2 LOAD and entrypoint; wrong release/ABI/architecture; initialization failure never uses an uninitialized vtable.
- Constant, flat, dictionary and OTHER vectors; logical/physical validity mismatch; list slices with nonzero offsets; nested constant/selected child fields; repeated resizing invalidating old views.
- Null list/fact/value/tag/selected payload/inactive payload, unknown tag and nonfinite float even in invisible facts; explicit SQL CAST policy separated from pre-CAST Python/JSON checks.
- All four tags in every derived position; I64 extrema, subnormal/max finite, ±zero normalization; UTF-8 versus UTF-16 ordering; 12/13-byte string boundary, Unicode and NUL rejection.
- Error at resolve/bind/init/exec; stable project marker; incidental binder failure cannot pass; an API failure followed by success with a stale detail slot; no double-destroy of callback slots.
- Bind/init destructor counters after failure, prepared-plan copies, concurrent call sites, cancellation and connection teardown; immutable AST IDs never leak between dictionaries.
- Append schema mismatch; append copies source; scan-data deep copy survives next worker scan; zero-copy aliases used only with valid pin; reset/clear/combine state invalidation under sanitizers, not deliberate production UB.
- Refill-after-preparation ambiguity tested in disposable lab only; selected production contract stays conservative until clarified.
- Accepted versus unaccepted filters; unknown expression/collation stays residual; recursive destination-filter counterexample; projection reordering/count(*); real partition/batch invariants.
- One active result per connection; partial consumption/destroy/drain for DDL/DML; explicit transaction invalidation; user cancellation versus timeout; old historical snapshot concurrent with committed insertion.
- All-or-error after late output/resource failure; bounded memory, denied spill directory, temp-disk exhaustion, OOM and diagnostic-allocation failure; no successful partial answer.
- prepared_statement_reuses_plan false for table scans; actual cache keys isolate program, store, semantics and temporal cuts.

## 12. Evidence status and open issues

The root's separately owned direct-C-API probe at probes/vector-collection-smoke.json reports actual constant selection, OTHER-view rejection/flatten, storage alias/deep-copy behavior and copied collection admission for 6144 rows on the pinned library. It reports **zero observed spill**, and explicitly is not an extension/Datalog performance or typed-store test. This memo's source audit does not extend that limited evidence to production callbacks.

Open decisions/evidence needed:
1. Resolve the statement_add_collection refill/lifetime contradiction before using mutable collections under prepared plans.
2. Establish tested diagnostic markers/error categories for semantic bind validation before changing rejection harness acceptance.
3. Measure nested selection/flatten correctness and costs on real v2 callbacks; don't infer them from direct flat-vector probes.
4. Design prompt cooperative cancellation/full memory accounting; neither is supplied wholesale by v2.
5. Select a SQL-first orchestration boundary that does not rely on nonexistent context query APIs.
6. Treat the three observed spec/source discrepancies as pinned regression cases and potential upstream reports, not license to call private C++ internals.

Source provenance (exact Git blob SHAs and URLs) is preserved in semantics-probes/source-provenance.json. An isolated header/static-source audit is reproducible from semantics-probes; it is not native feature conformance. The original implementation, frozen baseline, PR and Page were not changed by this investigation.
