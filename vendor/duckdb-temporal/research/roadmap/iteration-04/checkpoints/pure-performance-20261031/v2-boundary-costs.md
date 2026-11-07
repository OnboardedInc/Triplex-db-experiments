# Public-v2 scalar/vector boundary costs — exact-pin research

**Source-only analysis, 2026-10-31. All empirical execution: UNRUN.** No code, API, ABI, registration, counter, or legacy JSON change is proposed as accepted or implemented.

Selected public API: DuckDB host 2.0.0, source **d54cbbe3df17e8e5ce68312f483b4155836112aa**. Official documentation identifies C API v2 as unstable; exact-pinned specifications and implementation, not older v1 vector documentation, govern the claims below. [Official overview](https://duckdb.org/docs/2.0/clients/c/overview)

## Conclusions

- The published successful-query guard formula is consistent with the source.
- Its large boundary terms are repeated **output topology/pointer acquisition and long-string host operations**, not a requirement for a host call per numeric cell.
- Maximum-performance candidates should first remove unnecessary host operations while preserving every required fresh check after retained operations, plus entry, post-run, normal-return and core guards.
- Reducing calls is not a measured speedup: flattening, a metadata getter, a growth reserve and arena block growth have different costs.

## 1. Analytical model

R is the callback's SQL input rows / engine invocations, **not temporal fact rows**. I = 1 when R > 0. N counts invocations with nonempty answers; L counts emitted strings longer than the pinned 12-byte inline capacity; F/O count explicit nested-container / primitive-OTHER flattens. These definitions match the published source model.

| Successful query host operations | Count |
| --- | ---: |
| Callback row count and result vector | 2 |
| Input arguments, container kinds/children, 17 leaf preparations | 57 + F + O |
| Twenty final Readers: kind + view each | 40 |
| Top result sizing and ten child lookup/size pairs | 21 |
| Top result masks when nonempty callback | 11 I |
| Per invocation: seven nested children, seven sizes, outer-list data, nine metric-data borrows | 24 R |
| Per nonempty answer: six data + seven mask borrows | 13 N |
| Arena lookup + allocation for every long string | 2 L |

Therefore, for successful callbacks only:

    H_query = 120 + 11 I + F + O + 24 R + 13 N + 2 L
    G_binding_query = H_query + R + 2
                    = 122 + 11 I + F + O + 25 R + 13 N + 2 L

R post-run guards and two entry/normal-return guards supply the difference. IR2 is:

    H_IR2 = 9 + I + O + 2 L
    G_binding_IR2 = 11 + I + O + 2 L

Core constructor/admission/run/compiler/serializer checks remain additional. Error paths execute only their reached prefix and can add diagnostic operations; neither successful formula covers them. Local source: temporal_datalog.cpp:388–631; ITERATION-04.md:101–133.

For R > 0:

    G_query / R = 25 + 13 N/R + 2 L/R + (133 + F + O)/R

Batching amortizes setup, not the present per-invocation output slope. Large fact lists may make native admission/evaluation dominate instead. F/O are not materialization-byte bounds: dictionary views can flatten hidden children and nested flattening can recursively normalize descendants. [Dictionary view side effect](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L238-L246), [LIST flatten](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/list_vector.cpp#L204-L221), [STRUCT flatten](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp#L262-L285)

A later profile must separate SQL input materialization/dispatch, normalization, native compile/admit/run/result work, host metadata/reserve/allocation, fresh guards, byte copies, validation, hashing and masks. No timing coefficient for any term is established here.

## 2. Required contracts and important distinctions

**Borrowed batch views, not per-cell allocations.** Scalar get_arg returns an existing DataChunk column, valid for the callback. get_view provides primitive data/validity/selection/count; OTHER requires flattening. The owned get_value fallback allocates one value per call and is explicitly not the hot-loop interface. The current binding correctly uses views. [Scalar contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/scalar.yaml#L603-L651), [view contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L215-L263), [owned fallback](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L320-L336)

**Compression is not result memoization.** Both new callbacks are VOLATILE/fallible. The exact executor disables the generic all-constant single-row shortcut for VOLATILE and disqualifies volatile/fallible expressions, and STRUCT returns, from dictionary-result optimization. Do not assume one engine invocation for repeated constant SQL arguments or change registration properties to obtain that shortcut. [Executor eligibility](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/expression_executor/execute_function.cpp#L9-L18), [constant handling](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/expression_executor/execute_function.cpp#L224-L274); local temporal_datalog.cpp:710–718.

**Three different lifetimes.** Child vector handles have the owning-chunk lifetime. Mutable data must not outlive a storage-shape change. An arena handle additionally expires on vector flatten/reallocation/destruction. set_size reserves before setting size; a growth reserve can replace data and validity storage. These promises are not interchangeable. [Child handles](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L767-L795), [mutable data](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L396-L407), [arena handle](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L698-L712), [reserve implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/flat_vector.cpp#L127-L149)

**Alias preparation is real work.** DICTIONARY get_view can flatten its underlying child and invalidate earlier borrowed pointers into aliases. The prepare-all-then-refresh-all ordering cannot simply be deleted. Also preserve the explicit CONSTANT → physical zero branch: the pinned no-count zero-selection singleton has only STANDARD_VECTOR_SIZE entries, while nested child counts can exceed an ordinary batch. [get_view implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp#L144-L194), [singleton declaration](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/vector/constant_vector.hpp#L82-L90)

**String ownership is required; allocation frequency is a choice.** Output must not reference engine/std::string temporaries. The public arena API permits one arbitrary-sized byte allocation; it does not require one allocation per string. Conversely, current arena_allocate calls are not necessarily system allocations: the pinned allocator advances within blocks and links new blocks only when necessary. [Arena contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/arena/arena.yaml#L12-L39), [allocator](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/storage/arena_allocator.hpp#L38-L46)

**Success-path errors are not heap objects per call.** WithErrorHandler returns before allocating error info on success and leaves old slots untouched. A fresh null owned slot plus authoritative return-code checking is appropriate. Borrowed callback slots must not be replaced/destroyed; diagnostic text must be copied before its owner dies. [Error handler](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/capi_v2/capi_v2_internal.hpp#L756-L837), [error contracts](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/error/error.yaml)

**FP admission stays fresh.** Compatible controls and trusted callees are a continuous premise, not something samples prove. The inspected public-v2 material supplies no host-wide continuously-compatible-FP guarantee. Simple-looking getters do not justify deleting guards, caching permission, repairing controls, or exempting apparently integer-only inputs. Preserve genuinely required entry/core/post-host/post-run/normal-return checks. Local temporal_float.hpp:55–65 and temporal_datalog.cpp:388–407.

## 3. Future hypotheses — no implementation or acceptance

### A. Pool long strings within each already-sized output epoch

The existing preflight already visits output values. It could sum admitted long-string bytes with checked arithmetic, then acquire the arena once and allocate one aggregate range after all that invocation's resizes. Copy every string into a disjoint slice; retain correct length/prefix/UTF-8 and every retained post-call check.

Let K be invocations with long output. In isolation:

    2 L → 2 K; reduction = 2 (L − K) calls and binding guards

Do not retain the borrowed arena through the next invocation's possible reserve. Review allocation-error ordering and admission-before-allocation. IR2 has one stable output epoch, allowing a narrower lazy-arena reuse hypothesis: 2 L → L + 1{L > 0}. Each allocation remains freshly checked.

### B. Hoist output child handles separately from data pointers

The seven repeated nested child lookups suggest 7 (R − I) removable operations if callback-local child lifetime is proved. Nine metric pointers plus the already-sized outer-list pointer suggest a **separate** 10 (R − I), requiring exact non-alias/storage-epoch proof. Any additional metadata queries must be counted and freshly checked.

Only if both proofs hold without extra calls does the combined isolated model become:

    G = 122 + 28 I + F + O + 8 R + 13 N + 2 L

Do not hoist tuple/value/payload pointers or arena handles across reserves. Moving pointer acquisition can change failure ordering and diagnostic phase; review that explicitly.

### C. Conditional discarded-view preparation

Each prepare_leaf already queries kind. Reusing that **immediate existing result**, acquire a discarded preparatory view only for DICTIONARY, because only that branch can mutate an aliased child. OTHER still needs explicit flattening. Keep final Reader kind/view refresh and the full alias-order barrier.

If D is dictionary leaves encountered during preparation and A counts any added metadata operations, the saving is at most 17 − D − A calls/associated guards. This is not free new type metadata, nor a cached kind across later alias operations. [Pinned branch behavior](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp#L159-L188); local temporal_datalog.cpp:420–429.

### D. Preserve CONSTANT nested carriers selectively

Pinned LIST child access supports FLAT/CONSTANT and follows dictionary children; STRUCT access supports FLAT/CONSTANT but rejects dictionary STRUCT. Flattening every non-FLAT nested container is therefore conservative, not universally mandated. Retaining CONSTANT may avoid materialization while still admitting every logical fact.

Wholesale normalization removal is unsafe. Prove parent/child coordinate systems, parent dictionary preparation before descent, nested NULL/bounds/selection behavior and large constant child counts. [LIST access](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/list_vector.cpp#L265-L284), [STRUCT access](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp#L289-L304)

### E. Redundant STRUCT sizing: exact implementation only

Pinned STRUCT reserve recursively reserves children and SetVectorSize propagates size to them. Consequently, the five explicit payload-leaf sizes per invocation and ten top-level child sizes appear redundant: a potential isolated 5 R + 10 call/guard reduction. Public set_size prose does not explicitly promise that propagation, so this depends on the exact pinned implementation and separate compatibility/error-order review. Child validity initialization remains necessary. [Size propagation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp#L63-L67), [reserve propagation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp#L243-L250)

### F. Pure native work, not guard deletion

TypedDomain::intern_value(string) validates UTF-8 through validate_value, then intern_string validates the same immutable text again. This is a strong pure duplicate-work finding. But TypedDomain is shared: removing it requires future scoped compatibility review or a separately authorized isolated new path, not an automatic shared/legacy edit. Local temporal_value_domain.hpp:112–119, 139–152.

Reader text, dictionary keys, owned decoded Values and final arena copies also create distinct byte-work terms. Eliminating intermediates is a larger ownership/interface issue, not a public-v2 requirement or an approved change. Physical-index reuse for the same Reader and word-oriented mask initialization are other local hypotheses; never assume sibling selections match or omit inactive payload NULL bits.

Staging all callback results before one reserve is higher risk: it retains more owned data, changes peak memory and error ordering. The logical callback/native limits do not automatically cover all retained allocator overhead.

## 4. Separately authorized measurement protocol — UNRUN

1. Establish an unchanged semantic baseline on the final selected candidate: output rows/bytes, nine native metrics, diagnostics/phases/categories, limits, ownership and old binding-6/query-7 JSON.
2. Compare one hypothesis at a time with the same strict-FP policy and data; preserve all required guards and registration properties.
3. Separate setup, normalization, native compile/admit/run, preflight, reserve, pointer/mask and arena-copy phases. Instrument reached API/guard counts, then corroborate timing with uninstrumented builds.
4. Vary outer callback R independently from facts, answer cells, long-string count and total byte volume. Confirm actual VOLATILE callback cardinality and actual representations instead of inferring from SQL spelling.
5. Cover FLAT/CONSTANT/DICTIONARY/OTHER, nested constant/aliased children, counts above the zero singleton, empty/nonempty answers, 0/12/13-byte strings, long/multibyte/repeated/unique text, and growth boundaries.
6. Include native-heavy and boundary-heavy workloads, invalid carriers/text, caps, failure paths, mask reuse and required incompatible-FP rejection cases. Samples never prove continuous compatibility.
7. Use paired/interleaved repetitions, matched warm/cold policies, distributions/uncertainty and separately authorized allocation/cache/CPU/memory observations. Do not convert call reductions into speedups without measurements.

Retain 72 R metric precharge, 40 logical bytes per cell plus UTF-8 bytes, callback/native limits, error categories, nested NULL invariants and all input admission/counter obligations. These logical units are not host input-materialization or RSS limits.

Bulk-at-a-time operations can amortize boundary overhead, while full materialization can increase memory traffic; the appropriate epoch is a measured design choice. [MonetDB/X100](https://ir.cwi.nl/pub/16497/16497B.pdf), [DuckDB embedded analytics](https://duckdb.org/pdf/CIDR2020-raasveldt-muehleisen-duckdb.pdf) Matched implementation comparisons are needed before attributing effects to vectorization itself. [Kersten et al.](https://www.vldb.org/pvldb/vol11/p2209-kersten.pdf) Those papers do not measure this candidate.

**UNRUN:** preprocess, compile, link, build, project import, native/SQL/database execution, tests, profiling, benchmarking, legacy equivalence, lifetime/error-path execution and every timing/speedup claim.

