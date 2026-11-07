# Residual carrier/wire conversion research

**Research freeze candidate — 2026-10-31 UTC. Research only; not application acceptance.**

## Decision in brief

Recommend the coordinator consider **C1 + C2**, independently of the FP-reader leaf:
1. **C1: split carrier key admission from its existing payload leaf.** Keep the public carrier gate verbatim; call the shared after-key leaf from the private converter only after its existing exact-native key check.
2. **C2: hoist only the private root/carrier expected field-name sets into two immutable `frozenset` metadata constants.** Keep private exact-key-type screening before comparison. Do not change the public shape gate.
3. Keep the current finite-bit / canonical-zero path, domain validation, output construction, eager behavior, transaction flow, and all FP guard positions unchanged.

This is a bounded source/mechanism recommendation, **not a measured speedup, production patch, or claim that item 2 is accepted**. No native/DB execution or macro/micro timing was performed in this lane. The coordinator still owns production changes, real regressions, end-to-end performance, and publication.

### Why this target is different from reducing FP read counts

For C output cells, the current converter constructs **2C + 1** temporary expected-key sets: one root set, one private native-key set per cell, and one repeated carrier set per cell. It also creates **2C + 1** keys views for those comparisons. C1 removes C of the sets/views and their redundant equality traversals. C2 removes the remaining C + 1 *temporary private expected sets*, replacing them with two import-time immutable metadata objects. Neither change removes generators, payload tuples, domain validation, float copies, output dicts/lists, or FP reads.

On an admitted five-key cell, the removed C1 comparison visits five keys and performs five set-membership probes. The C2 change removes expected-set construction, **not** the remaining membership checks. These are per-cell operations, not fixed per-query FP-reader work. They can matter at 512 or 2,048 output cells even when FP reads already remain six/query or seven/query_json.

This operation count is a deduction from the pinned Python source and CPython implementation, not an allocation-event measurement or latency estimate.

## 1. Provenance and scope

### Exact source pins

| Component | Resolved source |
|---|---|
| Proposed typed_store.py | SHA-256 `25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc` |
| Existing fp_environment.py | SHA-256 `facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c` |
| CPython 3.12.14 | annotated tag `4b65faa0b452113bf130086fb1519be6d9cd9b06` → commit `2abcf904b8dac8c999d2b3aac76681abb333798a` |
| DuckDB 2.0.0 native pin | `d54cbbe3df17e8e5ce68312f483b4155836112aa` |
| duckdb-python v2.0.0 | `83c719961098611e769dc4bab0bda2bf149a2d1e`; its `external/duckdb` gitlink is exactly the native pin above |
| Diagnostic interpreter | CPython 3.12.14, Clang 22.1.3, build Aug 25 2026; no DuckDB import |

Fresh GitHub GET receipts, complete UTF-8 upstream source files, original Git blob IDs, calculated SHA-256 hashes, local copied profile/source input receipts, and web-reader receipts are retained under `raw/` and `notes/`. Git blob identities are verified against the exact retrieved bytes, not merely a URL or filename. `SOURCE-INDEX.json` lists every upstream source pin.

CPython's live /3.12 HTML documentation currently labels itself 3.12.16. It was used for navigation/background only; version-specific reasoning uses the frozen **3.12.14 source and rst documentation**, not that moving documentation alias. DuckDB's moving `stable` docs redirect to /2.0; source claims are separately pinned.

**DuckDB's V2 C API remains unstable and version-tied.** The pinned extension header explicitly requires the unstable build surface; the 2.0 LTS label is not a promise that this API has stabilized. No stabilization, deployment, or production-readiness claim is made. [Pinned extension header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h)

### What was and was not done

- Read source as text; parse it with `ast.parse` for alignment, never import or compile application code.
- Read and copy existing profile JSON/text; no re-profiling of the real store.
- Run isolated stdlib models under this lane's own directory.
- Invoke an actual Python GC callback in a model with **toy guard state**, not actual FP-control manipulation.
- No Codex launch, user-computer access, native/DB execution, host FP-control inspection or setter, application patch, Git/Page/PR write, or other worker.
- No timing experiment. Static removal of dead repeated work was sufficient to justify a candidate trial; numerical speed claims would be premature.

## 2. Profile-informed diagnosis

All 42 copied source profiles identify exact public results. They cover three variants × seven shapes × two public APIs, with five profiled public calls per control. They are diagnostic profiles, not the paired-process acceptance study.

| Proposed control | Cells per public call | f64 cells per call | _native_keys calls/call | _carrier_payload calls/call | FP reads/call |
|---|---:|---:|---:|---:|---:|
| empty query_json | 0 | 0 | 1 | 0 | 7 |
| tiny no-float query | 1 | 0 | 2 | 1 | 6 |
| tiny float query_json | 1 | 1 | 2 | 1 | 7 |
| no_float64 query | 64 | 0 | 65 | 64 | 6 |
| mixed64 query | 128 | 16 | 129 | 128 | 6 |
| float256 query | 512 | 256 | 513 | 512 | 6 |
| wide_float256 query_json | 2,048 | 1,024 | 2,049 | 2,048 | 7 |

For the five wide query_json calls, the proposed profile records:
- 10,245 `_native_keys` calls and 10,240 `_carrier_payload` calls.
- 20,485 `any` calls.
- 61,465 resumptions of the exact-key-type generator and 40,960 of the unused-payload generator.
- 5,120 text encodes and 5,120 float representation copies.
- Only 35 `read_controls` calls.

The generator-resumption counts are **not generator allocation counts**. One generator expression is created for each corresponding `any` invocation; its profile entry counts resumptions. C1/C2 do not remove those generators.

The wide converter's profiled cumulative time is 63.105 ms across five calls; _native_keys is 19.583 ms cumulative, _carrier_payload 17.771 ms, and _canonical_payload 12.638 ms. These numbers overlap through call nesting, include profiler perturbation, and must not be summed as disjoint costs or extrapolated into a macro speedup. The input profile files, not rounded prose, are authoritative.

The accepted-item1 and hardened profiles show a different cost distribution because they construct public Values and, for hardened float paths, repeatedly read FP controls. Their comparison supports investigating *which work remains*, not attributing the accepted→proposed regression exclusively to any single helper.

**Empty results:** C1 alone performs no cell work to remove. C2 removes only one root expected-set construction. These changes do not establish an explanation or cure for the existing empty/tiny signals. Preserve the original paired outcomes and require the original acceptance method.

A useful accounting model is:
`T = fixed query/snapshot cost + native/materialization cost + rows×row work + cells×shape/domain/wire work + floats×bit work`.
C1/C2 target part of the cells term; they leave most other terms intact.

## 3. Fresh CPython evidence

### Dict keys views, exact keys, and set/frozenset comparison

In the pinned `dictobject.c`, keys-view comparison first accepts either set kind or a dict view, checks lengths, then `all_contained_in` iterates the *keys view* and probes the other container. Thus changing only the expected private set to a same-membership frozenset does not switch traversal to expected-set order. Generic dict lookup can invoke rich comparison on custom stored keys; an exact dict alone is not a no-hook proof. That is why the current private **type(key) is str screening must remain before comparison/lookup**. [dictobject.c, lookup and view comparison](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/dictobject.c#L4616-L4697)

`PyAnySet_Check` includes both set and frozenset. Both use the set lookup machinery; that machinery has special handling for exact Unicode keys, while generic keys can invoke hash/equality protocols. The proposed metadata consists only of exact built-in strings and is compared only after the input-key exact-type screen. [setobject.h](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Include/setobject.h), [setobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/setobject.c#L56-L103)

The BUILD_SET implementation creates a set object. Constant folding of literal members does not mean a mutable set literal is an already-shared immutable schema object. C2 removes construction at the call sites rather than assuming the interpreter has eliminated it. [bytecodes.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Python/bytecodes.c#L1524-L1550)

### Generators, tuples, lists, and reference traffic

The pinned built-in `any` obtains an iterator, repeatedly calls its next function, truth-tests the yielded item, and decrements references. This is real dispatch work even when every yielded value is an exact bool. Generator creation uses GC-allocated variable-size objects. These mechanisms explain why generator-heavy validation remains worth examining, but C1/C2 deliberately do not rewrite it. [bltinmodule.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Python/bltinmodule.c#L347-L394), [genobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/genobject.c#L941-L978)

Small tuple freelists can reduce allocator calls; they do not eliminate initializing tuple slots, acquiring/releasing payload references, or executing the Python helper/return/unpack path. List append can use existing capacity, but lists still retain references and occasionally grow their backing arrays. Therefore “one Python tuple/list expression” is not synonymous with one fresh OS allocation, nor is a warm allocator proof of free conversion. [tupleobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/tupleobject.c), [listobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/listobject.c)

The current wire necessarily creates one output dict per cell and row/result containers. Replacing those with mutable reused dicts would alias public results; mutating the raw native graph in place would change ownership/failure semantics. Those are not justified by this research.

### Unicode copy costs and a deferred ASCII possibility

The UTF-8 encoder returns a bytes object even when UTF-8 data is already cached on the string. `str.isascii` reads an internal ASCII flag. For an exact built-in ASCII string, after retaining the NUL check, code-point length equals UTF-8 byte length and no surrogate can occur. This suggests an optional exact-built-in ASCII branch that avoids an encode/copy; non-ASCII and public str subtypes must retain the original path and exception precedence. It is **not part of C1/C2**, not prototyped here, and not needed for their proof. [unicodeobject.c, UTF-8 and isascii](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/unicodeobject.c#L5288-L5330), [isascii implementation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/unicodeobject.c#L11440-L11457)

Small/empty bytes may be cached, so an encode is not universally a fresh heap allocation. For ordinary multi-character payloads it still entails bytes construction and copying. A public subtype may override contains/encode; applying the ASCII shortcut indiscriminately would change observable behavior. [bytesobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/bytesobject.c)

### Float packing and buffers: preserve the tested path

The module-level struct pack function already caches compiled formats. Binding a Struct pack method would bypass a cache lookup, not magically eliminate repeated format compilation that currently occurs on every call. Its double packer performs a sentinel comparison before calling Pack8. On the recognized IEEE path, Pack8 copies representation bytes; unknown formats use arithmetic. C1/C2 retain the currently guarded exact-float bit-copy path without modifying any of this. [\_struct.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Modules/_struct.c#L1054-L1065), [format cache](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Modules/_struct.c#L2240-L2283), [floatobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/floatobject.c#L2278-L2405)

The current private path discards the identity integer returned by shared domain admission. A byte-only finite/zero classifier could theoretically avoid that integer, but would introduce another validation representation and proof burden. It is deferred, not recommended for this trial. `int.from_bytes` first obtains a bytes object and then builds a Python integer; passing a reusable bytearray does not by itself prove zero-copy conversion. [longobject.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/longobject.c#L6153-L6190)

Using pack_into with a local bytearray avoids one result-bytes construction but adds buffer/offset checking and mutable-scratch ownership requirements. Global scratch would be unsafe under reentry. A memoryview does not remove the need to prove export lifetime, format, contiguity, and absence of extra conversion copies. No buffer-based replacement is proposed. [pinned buffer protocol documentation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/c-api/buffer.rst), [\_struct.c pack_into](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Modules/_struct.c#L2064-L2154)

## 4. Boundary and compatibility proof for C1 + C2

### Intended call graph, not a production patch

Public:
`Value.from_carrier → _carrier_payload [existing gate verbatim] → shared after-key leaf → Value constructor → existing shared domain admission/public float mask guard`.

Private:
`execute + fetchone complete → _native_result_wire entry full guard → exact envelope/root/row checks → _native_keys(cell, immutable carrier metadata) → shared after-key leaf → exact selected-payload type check → existing _canonical_payload(..., _copy_float_bits) → local wire objects → exit full guard → return`.

The root expected metadata is likewise immutable, but root counter/type/range admission is unchanged.

The shared leaf contains the original **tag access and exact type/range check; selected-slot selection; selected nonnull check; unused-NULL checks in the same order; final selected-payload access and return**. It is not a trusted native-return assumption: every private cell still undergoes _native_keys, and every payload still undergoes both exact selected-type checking and the shared domain function.

The proposed leaf has no checked boolean, no public permission parameter, no token, no thread-local/global permission state, no host repair, no alternate float path, and no escape of a temporary checked capability. Two intended call sites are auditable. Its name/documentation should state its prior-key-admission precondition.

### Why deleting the second key comparison does not delete a required check

Before entering the leaf privately:
1. The cell is an exact dict; subclasses are rejected without calling their overrides.
2. Iteration screens **every key's exact built-in str type** before any view/set comparison.
3. The view equals the five expected field names; missing, extra, unknown, or differently cased keys reject.
4. Only then do fixed-field lookups and the unchanged shared leaf run.

Consequently the repeated carrier gate checks a property already established on the same owned cell by the preceding private admission. C1 removes that repetition, not the first admission. Public callers do not acquire this privilege: their wrapper still executes the original gate, including its existing custom-key equality/hash behavior.

C2 changes only the expected schema object's storage duration and mutability. Both expected containers have identical exact-string membership. The private type screen still runs first. Keys-view comparison traverses input keys in input insertion order, so expected-container hash-table order does not reorder user protocols; there are no such key protocols after exact-type admission in any case. No dict insertion order, key interning, float guard, selected-slot rule, or equality coercion is assumed.

### What this proof does not promise

“Owned exact native graph” is the existing local conversion boundary, **not** immunity to arbitrary mutation through frame inspection, malicious driver replacements retaining aliases, signal handlers, sys.settrace/profile hooks, or corrupted native memory. No arbitrary-corruption automatic cleanup or whole-command callback freedom is claimed.

Changing allocation count may change when GC runs. Removing a redundant check cannot promise observational equivalence under arbitrary hostile mutation scheduled between individual Python statements; neither the current two checks nor the proposed single admission makes a mutable graph atomically immutable. Keep the existing trusted-callee and continuously supported-controls obligations explicit. Do not strengthen them silently, and do not claim the refactor protects hostile mid-call changes.

The split adds one Python helper call to the **public** from_carrier wrapper path, though it replaces rather than adds the private carrier helper call. Public codec latency is a separate compatibility/performance risk to measure if this candidate is implemented.

### FP and GC invariants

- The successful private conversion is still bracketed by two fresh full-control reads. Existing failures may raise before the exit guard; no new finally/exception masking is proposed.
- Public constructor/from_carrier use their own current float mask preflight; from_json/to_json retain their own fresh full checks. A private region grants them no exemption.
- Value subclass setters retain the corrected behavior: no new payload rewrite for nonzero floats; actual zero canonicalization and identity-bit setting remain as before.
- No finalizer, protocol, or GC callback gets a reusable authorization token.
- The snapshot of six Query fields, readiness recheck after callback preparation, late known_at=None resolution, budgets, BEGIN/COMMIT/rollback, command evaluation and cleanup are outside these two edits and must remain unchanged.

GC allocation can schedule a later collection; dict views/generators are tracked. Decrementing an object's final reference can invoke arbitrary Python code, so exact-container fastpaths are not a general “no Python callbacks” theorem. [gcmodule.c](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Modules/gcmodule.c#L2290-L2338), [pinned refcounting warning](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/c-api/refcounting.rst)

## 5. Isolated mechanism evidence and negative fixtures

### Source alignment

`verify_prototype_alignment.py` uses AST parsing/dumping only. All six checks pass:
- Full original public carrier body matches the baseline model.
- The proposed shared leaf is exactly the existing carrier body after its original key gate.
- The public gate AST is unchanged.
- The private native-key admission AST is unchanged.
- Shared domain AST matches after documented name adaptation.
- Input source matches the pinned SHA-256.

This validates the model's transcription boundary, not a production implementation that does not yet exist.

### Correctness model results

| Test family | Cases / outcome |
|---|---|
| Valid key order/tag, root order, row arity | 512, PASS |
| All 120 carrier orders × 4 tags × 16 null masks | 7,680, PASS, including explicit expected valid-mask oracle |
| Exact string objects without identity/interner assumptions | 120, PASS |
| Public custom-key hash/equality sequence parity | 240, PASS |
| Private custom-key rejection without hash/equality/repr hooks | 480, PASS |
| Public str-subtype contains/encode sequence parity | 3, PASS; private rejects subtype before those hooks |
| UTF-8, NUL, 512-byte bounds, int64, finite bits, signed zero | 33, PASS |
| Invalid tuple/root/counter/row/tag/carrier shapes | 47, PASS |
| Late malformed value after 100 already-converted good cells | 8 baseline/split combinations, no published prefix |
| Public keys that raise or mutate during equality | 72 trigger/mutation combinations, identical result/error and hook sequence |
| Actual GC callbacks with toy unsupported guard state | Both models deny all four reentered public boundaries and final private return |

The float fixtures use representation comparison for signed zero/subnormals, never float equality. This is not a new hardware-FP corpus, and signaling-NaN hardware behavior is not tested here.

The separate immutable-metadata audit passes:
- 144 valid carrier/root permutations;
- 4,320 missing/extra/replaced-key cases;
- 1,152 custom/scalar wrong-key cases;
- 12 wrong-container cases;
- unchanged public custom-key behavior in two retained checks.

A supplementary audit mixes one hostile custom key with exact str keys in every
position and order: 2,784 rejection cases pass without key protocol calls, for
both expected-container types. The four owned model/audit scripts also pass in
16 separate processes across PYTHONHASHSEED 0, 1, 42, and 123456789; every raw
JSON/stderr output is retained. These are stdlib correctness runs, not timings.

A constructor-time hook log is cleared before private admission tests; fixture construction must not be mistaken for a hook invoked by the rejected private input.

### Required production-trial fixtures

The coordinator should retain all current acceptance/review suites and explicitly verify:
1. All 120 cell key orders and 24 root orders, dynamically equal noninterned strings, missing/extra/unknown/case-changed keys.
2. Exact dict containing custom hash/equality/repr keys and str-subclass keys: reject privately **before those protocols**.
3. Public custom-key inputs: existing success, exception type/message, lookup order, and mutation/raising behavior remain as before; do not silently enforce exact key types there.
4. Exact native tuple/list/dict shapes; tuple/list/dict subclasses with explosive methods; counters reject bool/subtypes/negative values.
5. All four tag/payload exact types; tags reject bool, unused fields strictly None, selected field nonnull, full int64 bounds, NUL/lone-surrogate/UTF-8 512-byte boundaries.
6. Existing finite-bit, subnormal, signed-zero, public subtype setter, fresh public guard, helper/canary and cleanup tests, unchanged.
7. Late invalid carrier/value in a large result: no SnapshotResult, JSON prefix, or evaluated-command commit; transaction rollback and recoverability remain validated in the real store.
8. Actual GC/public reentry and retained unsupported end-state denials using the real FP reader/test apparatus; model results do not substitute.
9. Six Query getters once before BEGIN; reentrant close readiness; known_at=None against actual later snapshot; no new 512-program cap.
10. Independent source diff/callgraph review: only two valid leaf call sites, no flag/token/cache, no alternate domain logic, no guard/readiness/transaction movement.
11. Public from_carrier performance can change through the added helper frame; disclose that risk and do not hide it behind private-query gains.
12. Original paired fresh-process query and query_json studies, including empty/tiny and accepted-item1 comparison, exact raw provenance and source/artifact pins. A codec micro-win is not item-2 acceptance.

## 6. DuckDB materialization and vectorization research

### Why one fetchone row is still a cell graph

At the pinned duckdb-python tag, Fetchone obtains/ flattens a chunk, constructs a Python tuple, and converts each selected column's Value. Named struct conversion creates a Python dict and recursively converts fields; list conversion builds a Python list recursively. The query's single SQL result column contains nested rows/cells, so row-count one is not conversion-count one. [pyresult.cpp](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/pyresult.cpp#L139-L169), [python_objects.cpp](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp#L482-L506)

The local native encoder already writes nested LIST/STRUCT children and validity masks after reserves. It sets unused payload fields NULL and preserves the established carrier shape. This establishes what is materialized, **not permission to trust malformed driver output**. Its correctness admission remains independently required.

DuckDB vectors carry homogeneous typed data; lists use offset/length entries plus a child vector, structs use child vectors, and flat/constant/dictionary representations differ. The pinned V2 vector API enforces layout restrictions and invalidation concerns around mutation/reserve. Replacing fetchone with direct buffers would require ownership, null/offset, bounds, selection, lifetime, and error-channel proofs; it is not a small Python codec optimization. [2.0 execution format](https://duckdb.org/docs/2.0/internals/vector), [pinned V2 vector implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp)

The V2 result code distinguishes pending/streaming/finished/error states and handles late errors; Python chunk fetching likewise has interruption boundaries. Changing to a lazy iterator/stream could leak a valid prefix before an error and alter transaction timing. No such change is justified here. [pinned V2 result code](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_result.cpp)

The 2.0 Python conversion documentation explicitly notes extra copying for Arrow conversion after DB-API execute. Therefore “switch to Arrow” is not automatically zero-copy, especially when the public API must still return Python dicts and lists. It would be a separate design study, not a substitute acceptance argument for C1/C2. [2.0 Python conversion](https://duckdb.org/docs/2.0/clients/python/conversion)

### What the papers do and do not support

**MonetDB/X100 (CWI, 2005).** The authors identify tuple-at-a-time interpretation costs and the memory-bandwidth cost of full-column materialization, then motivate cache-resident vector primitives. The transferable principle is to amortize dispatch and avoid unnecessary intermediates; it does not show that this bounded Python result conversion is memory-bandwidth-bound or predict its speedup. C1/C2 remove repeated schema construction without introducing another full materialized representation. [CWI primary paper](https://ir.cwi.nl/pub/16497/16497B.pdf)

**Compiled versus vectorized queries (Kersten et al., 2018).** The same-system comparison separates algorithm/layout choices from execution-model choices and finds different strengths for cache latency versus instruction count. This supports comparing candidates on the same history/native artifact/source pins, not attributing an entire wrapper regression to “Python” or assuming batching is universally faster. Its vector-size results are not a tuning recommendation for these tiny carrier graphs. [Primary paper](https://db.in.tum.de/~kersten/vectorization_vs_compilation.pdf)

**simdjson (Langdale/Lemire, arXiv v7, 2019/2024).** Structural scanning, UTF-8 validation, and tape construction are deliberately separate stages; faster parsing still validates its input. The analogy is to separate immutable shape metadata from data validation, not to omit checks. Its SIMD algorithms operate on contiguous input bytes, whereas this hot path starts from a Python object graph; importing a JSON parser would add serialization and change the problem. [Primary paper, exact v7](https://arxiv.org/html/1902.08318v7)

There is no basis in these papers for fast-math, nonfinite coercion, a trusted-result bypass, wholesale column copying, or a new dependency in this constrained trial.

## 7. Ranked candidates and stopping conditions

| Rank | Candidate | Mechanism | Decision / proof burden |
|---|---|---|---|
| 1 | C1 shared after-key leaf | Remove duplicate private schema comparison/set/view/iterator per cell | Recommended for coordinator trial; public gate and leaf AST proof supplied |
| 1b | C2 immutable private schema metadata | Remove remaining private expected-set construction per cell/root | Recommended with C1; predicate equivalence supplied, public gate unchanged |
| 2 | Exact-built-in ASCII length fastpath | Avoid bytes encode/copy on proven ASCII payloads | Deferred; maintain NUL/error precedence and public subtype fallback |
| 3 | Rewrite small generator/null checks | Reduce per-cell generator/iterator dispatch | Deferred; public field-lookup short-circuit ordering needs its own proof |
| 4 | Specialized shared domain leaf arity | Avoid unused transient payload/bits tuples | Deferred; risk duplicated admission logic and public identity/setter changes |
| 5 | Bound Struct.pack / byte classifiers / local buffers | Reduce format lookup or unused identity-integer work | Deferred; preserve existing tested float path for this trial |
| 6 | Direct native/Arrow/columnar egress | Avoid Python carrier graph and reboxing | Separate future architecture/ownership study, not this patch |

**Stopping condition for this lane:** source-aligned mechanism proof, compatibility/negative-fixture obligations, fresh primary evidence, and verified UTF-8 source-only manifest delivered. The candidate still needs real implementation/acceptance work in the coordinator's authorized lane. Do not continue inventing broader optimizations before learning whether the narrow candidate closes the existing measured blocker.

## 8. Reproducibility notes and retained failures

Run only the owned stdlib scripts, with PYTHONDONTWRITEBYTECODE=1:
- `python verify_prototype_alignment.py`
- `python prototypes/preferred_split_prototype.py`
- `python prototypes/public_protocol_audit.py`
- `python prototypes/immutable_metadata_hoist_audit.py`
- `python verify_research_bundle.py`

The first prototype result is retained separately; a second version added explicit positive/null-mask and dynamic-string oracles. It did not fix a failing production candidate. One initial large-source save exceeded the exec argv limit; the source retrieval/save path was changed and all final upstream bytes were verified by Git blob hash. A GitHub tags-list fetch was rejected by connector URL allowlisting; explicit tag-ref GET succeeded. An attempted arXiv v8 HTML lookup missed; the source actually used and retained is v7. These method failures are not hidden as successful source retrievals.

The first pre-freeze verifier invocation redirected its stdout to a JSON file
inside the directory being scanned; the shell created that empty file before
the verifier parsed JSON, so verification correctly failed. The empty stdout
is retained as FAILED-01 text, and the corrected capture uses a text staging
file that is renamed only after success. The final manifest verifier must pass.

The report does not alter, replace, reanalyze away, or invalidate the coordinator's original 168-process performance evidence or its methodology limitations.
